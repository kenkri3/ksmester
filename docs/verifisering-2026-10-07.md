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
