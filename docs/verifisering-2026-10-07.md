# Verifisering i produksjonsmodus — 2026-10-07

**Utført av:** DSH-agent, på forespørsel fra brukeren («Implementer alle fikser»)
**Metode:** kjørt, ikke lest. Alle tall under er hentet fra faktisk output.
**Utgangspunkt:** grenen `lansering/fikser` (`71936b6`, 39 commits) var aldri merget. `main` og
`origin/main` sto på `f21f032`, og produksjon kjørte den koden.

---

## 1. Hva som er gjort

| Stek | Resultat |
| :--- | :--- |
| `lansering/fikser` merget inn i `main` | Ja — 135 filer, alle 10 BLOKKERER og 24 HØY fra grenen |
| `tsc --noEmit` | **0 feil** |
| `npm run build` | **exit 0**, 127/127 sider |
| `security-check-blockers.mjs` | **17/17 OK, 0 FEIL, 0 MANUELL** |
| `security-check-high.mjs` | **31/31 OK, 0 FEIL, 0 MANUELL** |
| `security-check-lead-takeover.mjs` | **6/6 OK** — E-02 lukket |
| E-08 (det ene funnet som ikke var lukket) | **Rettet og bevist** — se kap. 3 |

### Sjekkene ble kjørt mot en ekte produksjonsinstans, ikke `next dev`

Sjekkeskriptene sier selv (`src/lib/server/auth.ts:129-134`) at
`verifyCronOrInternalSecret` har et bevisst utviklerunntak på localhost. Kjørt mot
`next dev` feiler derfor **E-16 og E-18 med tre falske treff**, fordi hemmelighetene
mangler lokalt. Det er ikke kodefeil, men det betyr at «HOY-sjekkene kjørte grønt»
tidligere ikke kunne ha vært målt i produksjonsmodus.

Oppsettet som ble brukt:

- `next build` + `next start` (NODE_ENV=production), port 3112
- Ekte PostgreSQL 18.4 på port 55432 (`@embedded-postgres/windows-x64`), `DATABASE_URL` satt
- `CRON_SECRET`, `INTERNAL_API_SECRET`, `AGENT_API`, `ADMIN_PASSWORD` med vilje **ikke** satt,
  slik at fail-closed-grenene faktisk prøves

Resultat før E-08 var rettet: 16/17 BLOKKERER og 31/31 HØY.
Resultat etter: **17/17 og 31/31**.

---

## 2. E-08 var ikke lukket — og hvorfor det ikke ble oppdaget

`docs/plan-ksmester.md` førte E-08 som «miljøavhengig». Det var riktig mistanke, og
verifiseringen i produksjonsmodus bekreftet at den var åpen:

```
FEIL  E-08  samme id i to samlinger overskriver IKKE hverandre I MINNESLAGERET
```

Reprodusert direkte mot Postgres, uten appen i mellom:

```
=== constraints paa items_store ===
  items_store_pkey | PRIMARY KEY (id)
=== rader i basen etter to skrivinger med samme id ===
  id=e08-bevis-… collection=tasks data={"title":"E08 varsel"}
=== sporringen tasks-samlingen gjor ===
  {"title":"E08 varsel"}
```

Altså: en `notifications`-rad med samme `id` tok over `tasks`-raden. Oppgaven forsvant,
og `tasks`-spørringen returnerte varselets innhold. Årsaken var `ON CONFLICT (id) DO UPDATE`
mot en tabell der `id` alene var primærnøkkel (`db.ts:603-608`, `:796-797`).
Minnelageret nøkler per samling og skjulte derfor feilen i utviklingsmodus.

### Rettelsen

1. **Skjema:** `PRIMARY KEY (collection_name, id)`, i både `CREATE TABLE` og en
   eksplisitt migrering for eksisterende baser. Migreringen er idempotent, og
   rekkefølgen er kritisk: den gamle nøkkelen droppes **før** dedup. Testet mot en
   database med 79 eksisterende rader og mot en konstruert legacy-base med
   id-kollisjoner — migreringen kjørte ved oppstart og logget
   `[DB] items_store primærnokkel migrert til (collection_name, id) - E-08 lukket.`
2. **Skriveveien:** `ON CONFLICT (collection_name, id)` i alle tre lagringsfunksjoner.
3. **Inngangsveien:** klientens `id` beholdes uendret — UI-et bruker den til å hente og
   oppdatere raden — men gjøres unik hvis den allerede er opptatt i samme samling.
   Klienten får den lagrede id-en tilbake i svaret.

Etter rettelsen, i samme database:

```
=== id-er som na finnes i flere samlinger samtidig ===
  id=blk-e08-…  ->  2 rader: tasks, notifications
      notifications: {"title":"E08 varsel", …}
      tasks: {"title":"E08 oppgave", …}
```

Begge radene finnes. Det er selve beviset på at kryss-samling-overskriving er umulig.

---

## 3. Forbehold

1. **E-08-sjekken i `security-check-blockers.mjs` sier fortsatt «I MINNESLAGERET».**
   Denne kjøringen beviser Postgres-veien; sjekkens egen tekst bør oppdateres.
2. **Alle sjekker er kjørt mot en lokal instans**, ikke mot produksjon. Ingenting er pushet.
3. **Databasen i testen var tom for kundedata.** Migreringen er testet mot skjema og
   konstruerte rader, ikke mot en kopi av produksjonsdata. Ta backup før deploy.
4. **`JWT_SECRET` og `ADMIN_PASSWORD` ble ikke satt** i testoppsettet. Det er med vilje
   (for å trene fail-closed-grenene), men det betyr at innloggingsflyter med reelle
   hemmeligheter ikke er testet her.
5. **E-11 (hardkodet SuperAdmin-epostliste) er ikke rettet.** Den står fortsatt i
   `src/lib/server/auth.ts` og i `db.ts:47-56`. Se `docs/manuelt-arbeid.md` — det er en
   beslutning om hvem som skal være SuperAdmin, ikke en kodeoppgave alene.
6. **`main` er merget lokalt, men ikke pushet.** Produksjon kjører fortsatt `f21f032`.

---

## 4. Andre runde, samme dag: personopplysninger til DeepSeek, og B-01

Brukeren motsatte seg at B-01 ble kalt en juridisk risiko uten at Arbeidstilsynets krav var
sjekket, og viste til at det er lagt inn EU-ruting via 1min.AI. Begge innvendingene ble
etterprøvd. Brukeren hadde rett på begge, med én viktig nyanse.

### 4.1 Det brukeren hadde rett i

**EU-stien finnes og er godt bygget.** `aiEngine.ts:1251-1337` ruter GDPR-flaggede oppgaver
til 1min.AI og deretter Google Gemini EU, returnerer **før** DeepSeek-grenen på `:1343`, og
kaster i stedet for å falle tilbake til en motor utenfor EU (`:1336`). Det er fail-closed,
og det er sterkere enn revisjonen ga inntrykk av.

**Arbeidstilsynet har godkjenningsordninger.** [arbeidstilsynet.no/godkjenninger](https://www.arbeidstilsynet.no/godkjenninger/)
lister seks: bilvask/dekk, bedriftshelsetjenester, renhold, asbestarbeid, bemanningsforetak
og stansede virksomheter. Poenget står likevel: **ingen av dem gjelder programvare.**

### 4.2 Hullet som gjensto, og som nå er lukket

GDPR-flagget settes av nøkkelord i **brukerens melding** (`agent/chat:1747-1748`) og av
operasjonsnavn. Prosjektkonteksten bygges separat og inneholder kundenavn og adresse:

```
636:  clientName: p.clientName || ''
644:  address: p.address || p.location || ''
```

Et helt vanlig spørsmål — «hvordan ligger prosjektene an?» — har ingen nøkkelord, men fikk
likevel med kundenavn og adresse i prompten, og gikk dermed til DeepSeek, som er
primærmotor for all tekst (`:1343`, og `/api/health` melder `DeepSeek V3 (Primary)`).
Det var i strid med personvernerklæringen, som sier at all data lagres innenfor EØS/Norge.

**Rettet i tre ruter:**

| Sted | Endring |
| :--- | :--- |
| `api/agent/chat` | `contextHasClientPii` settes når et prosjekt har `clientName` eller `address`, og sendes som `gdprProtected: isGdprSensitive \|\| contextHasClientPii` |
| `api/agent/dispatch` (samtale) | `dispatchPromptHasClientPii` beregnes på den ferdigbygde prompten — dekker `Oppdragsgiver`, `Kunde` og `Adresse` i prosjekt- og tilbudslistene |
| `api/agent/dispatch` (tilbudsutkast og oversettelse) | `containsPIIOrGdprData` på brukerens instruks og på svaret som skal oversettes |

**Bevis for at rutingen virker** (kjørt med dummy-nøkler, slik at motorene faktisk prøves):

```
[1min.AI] Modell mistral-large-latest feilet med HTTP 401 ... prøver neste modell
[AI Engine - GDPR EU] 1min.AI feilet, faller tilbake til Google Gemini EU...
[Gemini Backup] Modell gemini-3.8-flash feilet ... prøver neste
VikingMester AI Engine forsøket feilet: GDPR-beskyttet oppgave krever en
EU-godkjent modell (1min.AI eller Google Gemini EU), men ingen var tilgjengelig.

treff i loggen:  api.deepseek.com = 0    api.openai.com = 0
```

DeepSeek ble aldri kontaktet, selv om `DEEPSEEK_API_KEY` var satt. Det er beviset.

### 4.3 B-01 — formuleringene er endret

`PublicFooter.tsx` viste «Godkjent for Arbeidstilsynet» og «TEK17 & BVN-verifisert». Ifølge
[BVN 12.100 pkt. 8](https://byggforsk.no/dokument/2696) er GVB-ordningen en sertifisering av
**bedrifter som utfører våtromsarbeid**, administrert av Fagrådet for våtrom — ikke av
verktøy. Brukeren har bekreftet at AI CHAT NORGE AS ikke er registrert som godkjent
våtromsbedrift. Merkene er derfor omformulert til:

- «Bygget for kravene i internkontrollforskriften § 5»
- «Sjekkliste og kontroller iht. TEK17 og BVN 31.205»

Samme formuleringer sto på tre steder til og er rettet der: `app/hms/page.tsx` (meta),
`app/verktoy/sja-generator/VerktoyClient.tsx` og `public/llms.txt` / `llms-full.txt`.

### 4.4 Det som gjenstår, og som brukeren må avklare

1. **Personvernerklæringen er ikke oppdatert.** `StaticPages.tsx:602` sier fortsatt «All data
   lagres i sikre datasentre innenfor EØS/Norge» og lover daglige sikkerhetskopier, mens
   ikke-GDPR-flagget tekst fortsatt går til DeepSeek. Med rettelsen over er det *mindre* galt,
   men påstanden er ikke blitt sann av den grunn.
2. **1min.AI-endepunktet er hardkodet** til `https://api.1min.ai/api/chat-with-ai`
   (`aiEngine.ts:432`). Det finnes ingen EU-region-URL å konfigurere. Påstanden «EU-driftet»
   i kodekommentaren kan ikke bekreftes fra koden, og 1min.AIs egen dokumentasjon oppgir bare
   `api.1min.ai`. **Be om skriftlig bekreftelse fra 1min.AI** på hvor data behandles.
3. **1min.AIs egen dokumentasjon sier at innhold modereres av OpenAI for alle leverandører:**
   «OpenAI content moderation applies to all providers, so text is sent to OpenAI for
   moderation as well as to the selected generation provider.» Det gjelder deres
   OpenAI-kompatible endepunkt; koden bruker det eldre `/api/chat-with-ai`, og dokumentasjonen
   sier ikke om setningen gjelder der. **Også dette bør bekreftes skriftlig.**
