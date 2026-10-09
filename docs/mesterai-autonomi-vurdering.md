# MesterAI Autonom Byggeleder — vurdering og tiltak

**Dato:** 10.10.2026
**Omfang:** den autonome agenten i `src/lib/server/autonomousAgent.ts`, dens
API-flate, dens schedulering og dens plass i UI-et.
**Spørsmålet som ble stilt:** kan systemet bli *mer* autonomt, kan agenten få
flere verktøy, og kan den bli bedre — uten å gjøre hverdagen vanskeligere?

---

## Kortversjonen

Agenten hadde en **ferdig motor som ingen så, og som nesten aldri kjørte**:

| Funn | Bevis før endring |
| :--- | :--- |
| Autonomisyklusen kjørte bare **06:00** — før noen timer var ført | `cronScheduler.ts` → `runDailyAudit()` kalte den aldri; eneste kall var `/api/cron/daily-summary` kl. 05:00 UTC |
| Syklusen hoppet over prosjekter **uten timelister** | `autonomousAgent.ts` (gammel linje 687: `if (todaysTimeEntries.length === 0) continue;`) |
| Kontrollposten var **ikke koblet inn i UI-et** | `AutonomousControlPost.tsx` ble importert av **null** komponenter |
| `pending_actions` hadde **ingen bedrift-skoling** | `getPendingActions()` filtrerte kun på `status` |
| Varselinnstillingene var **død konfigurasjon** | `notifyDiscord` / `notifySlack` / `notifyEmail` ble aldri lest noe sted |
| `maxAutoApproveAmount` var **død konfigurasjon** | Ble aldri lest; ingen beløpsgrense fantes |
| Timeprisen i tilleggsarbeid var **hardkodet 890 kr/t for alle fag** | `hours * 890 * 1.15` |
| Ukjente byggeplasser fikk **Oslo-vær** presentert som sitt eget | Egen `CITY_COORDINATES` med Oslo-fallback |

Det var altså ikke motoren det var noe galt med — den var godt skrevet, med
riktige juridiske hjemler og ærlig databehandling. Det var **koblingene rundt
den** som manglet.

---

## Hva som er gjort

### 1. Agenten kjører nå når den faktisk har noe å jobbe med

`src/lib/server/cronScheduler.ts` fikk en andre daglig jobb:

- **06:00** — daglig KS/HMS-revisjon (uendret) og autonomisyklusen (vær, tidlige varsler).
- **15:30** — den nye `runEndOfDayAutonomyCycle()`. Da er timene ført, men
  dagboken mangler fortsatt, og tilleggsarbeidet huskes ennå.

Scheduleren bruker `setTimeout` mot norsk veggklokke og re-planlegger seg selv,
slik at sommer-/vintertid ikke flytter kjøringen en time. Timene er dessuten
konfigurerbare (`endOfDayHour` / `endOfDayMinute`).

I tillegg:
- Nytt endepunkt `POST /api/cron/autonomy-cycle` (krever `CRON_SECRET`) for
  ekstern trigger.
- Ny workflow `.github/workflows/autonomy-cycle.yml` (kl. 13:30 UTC, man–fre),
  slik at syklusen også kjører hvis appen sover eller kjører i flere replikaer.
- Syklusen er **idempotent**: maks én reell kjøring per 45 minutter, sporet i
  `agent_state` → `autonomy_cycle_state`. Flere triggere lager ikke dobbeltforslag.

### 2. Fire nye oppgaver som faktisk sparer håndverkeren for arbeid

Syklusen gjorde før tre ting (vær, dagbokutkast, endringsordrer). Den gjør nå sju:

| Ny oppgave | Hvorfor den finnes | Hva håndverkeren slipper |
| :--- | :--- | :--- |
| **Manglende timeføring** | Uten timer finnes ingen byggedagbok — og ingen dokumentasjon på utført arbeid. Dette var det blinde feltet: syklusen hoppet stille over prosjekter uten timer. | Å oppdage selv at laget har glemt å føre. Ett trykk lager oppgaven «Før timer». |
| **Manglende byggedagbok** | Byggherreforskriften § 15 krever daglig føring. Timene finnes, men dagboken mangler. | Å skrive dagboken fra hånd. Agenten har allerede aggregert timer, mannskap og vær. |
| **Purring på åpne avvik** | Åpne avvik blokkerer overlevering og gir merknad i KS-permen. | Å huske på avviket fra forrige uke. Ett trykk lager utbedringsoppgave med 3 dagers frist. |
| **Selvhelbredelse** | Et forslag som ikke lenger stemmer er støy. | Å rydde i køen selv. Forslag som er løst, arkiveres automatisk med begrunnelse. |

Alle fire er **dagsnøklet per prosjekt**: ett forslag per prosjekt per dag, og et
avvist forslag kommer ikke tilbake på en uke. En agent som maser blir slått av.

### 3. Aldri finn opp dokumentasjon (dette var nesten en feil)

Den gamle koden hoppet over prosjekter uten timelister. Det var riktig — men det
betydde at agenten *aldri* laget dagbok, siden den bare kjørte kl. 06:00.
Fristelsen ville være å «fikse» det ved å lage dagboken likevel. Det er ikke
gjort, og skal ikke gjøres: en byggedagbok er et juridisk dokument, og oppdiktet
bemanning, timer eller vær i den er verre enn ingen dagbok.

I stedet:
- Dagbok lages **kun** fra reelle timeregistreringer.
- Mangler timene, lages en **påminnelse** — ikke et dokument.
- Autopilot auto-arkiverer **kun** rutinedagbøker **uten** åpne avvik.

### 4. Varsling virker nå — og lyver ikke

`notifyDiscord`, `notifySlack` og `notifyEmail` ble aldri lest. Nå sendes ett
sammendrag til de kanalene bedriften faktisk har koblet til (`integrations`-rad
med `status: 'active'` og `webhookUrl`), pluss e-post til ledelsen i bedriften.

`notificationsSent` rapporterer **hvilke kanaler som faktisk fikk meldingen**.
Er Discord ikke konfigurert, sier vi ingenting om Discord. Er leveransen
avvist, logges statuskoden — vi påstår aldri at noe er sendt.

### 5. Bedriftsisolering (dette var et reelt personvernproblem)

`pending_actions` hadde ingen `companyId`, og `getPendingActions()` returnerte
**alle** bedrifters kø. Enhver innlogget bruker kunne se — og med
`approve_action` godkjenne og sende — en annen bedrifts endringsordre.

Nå:
- Alle forslag stemples med `companyId`.
- `getPendingActions(companyId)` og `runAutonomousAuditCycle({ companyId })` er
  scopet. Uten `companyId` returneres **ingen** bedriftsrader — aldri «vis alt».
- `GET /api/agent/autonomous` isolerer også aktivitetsloggen.
- `approveAction` avviser en handling som tilhører en annen bedrift.

### 6. Prisen på tilleggsarbeid er nå etterprøvbar

`hours * 890 * 1.15` for alle fag er byttet mot `estimateHourlyRate()`:

1. **Median av bedriftens egne timepriser** fra tidligere tilbud (robust mot én
   feilskrevet pris).
2. Fagpris (`tømrer 890`, `rørlegger 980`, `elektriker 950`, …) kun når
   bedriften ikke har historikk — og da **sier vi det**.

Utkastet lagrer `rateBasis` (f.eks. «7,5 t × kr 940 (egne tidligere tilbud
(median), 12 observasjoner) + 15 % rigg/materiell»), og UI-et viser det som
«Grunnlag:». Et beløp håndverkeren ikke kan forklare for kunden, er et beløp
håndverkeren ikke kan forsvare.

### 7. Beløpsgrense som faktisk håndheves

`approvalThresholdAmount` (standard 25 000 kr eks. mva) erstatter den døde
`maxAutoApproveAmount`-innstillingen. Forslag over grensen merkes
`requiresManualReview`, vises med eget varsel og er **bevisst utenfor**
bulkgodkjenning. Endringsordrer og tilbud kan aldri bulkgodkjennes uansett.

### 8. Ærlig vær

Agenten hadde sin egen koordinattabell med Oslo-fallback, så «Nybygg Ålesund»
fikk Oslo-vær presentert som sitt eget. Den bruker nå
`resolveLocationCoords()` fra `weatherService`, og returnerer
`isLive: false` når stedet er ukjent. UI-et viser da «Mangler adresse» med
oppfordring om å legge inn gateadresse — i stedet for et tall som ser ut som en
måling.

### 9. Kontrollposten er endelig synlig for håndverkeren

`AutonomousControlPost.tsx` var ferdig bygget — med godkjenningskø,
autopilot-bryter, værradar og aktivitetslogg — men **ingen komponent importerte
den**. Den er nå montert i arbeidsstasjonen under «Alle byggeplasser»
(`MesterWorkstation.tsx`), med en `variant="dark"` som matcher arbeidsflaten, og
koblinger til prosjektdetaljer og endringsordre-utkast.

Nye UI-evner:
- **«Godkjenn alt rutinearbeid (N)»** — ett trykk for dagbøker, timepåminnelser
  og avviksoppgaver.
- **«Vurder manuelt»**-merke og eget varsel når beløpet er over grensen.
- **«Grunnlag:»** under hvert forslag, så brukeren kan etterprøve hvorfor
  agenten foreslår det den gjør.
- Innstillinger for digest, e-postvarsel, beløpsgrense og purredager.

### 10. Tryggere godkjenning

Et forslag kan ha ligget i køen i dager. `buildApprovalCaveat()` sjekker før
godkjenning om prosjektet er avsluttet, om avviket er lukket, eller om timene
faktisk er ført — og sier tydelig ifra i svaret. Brukeren har trykket, så
handlingen utføres, men den utføres ikke i det stille på et foreldet grunnlag.

---

## Hva som bevisst **ikke** er gjort

Dette er like viktig som det som er gjort. Mer autonomi er ikke alltid bedre.

| Ikke gjort | Hvorfor |
| :--- | :--- |
| **Automatisk utsending av endringsordre/tilbud uten godkjenning** | NS 8406-varsel og tilbud er bindende kommunikasjon utad i bedriftens navn. Et feil beløp eller en feil mottaker koster penger og omdømme. Ett trykk er lav nok friksjon. |
| **Auto-arkivering av byggedagbok med åpne avvik** | Dagboken er juridisk bevis. Å «rydde» et avvik inn i en auto-godkjent dagbok er å skjule det. |
| **Fabrikerte timelister / bemanning for å fylle dagboken** | Se punkt 3. Verre enn ingen dokumentasjon. |
| **Purring på avvik uten dato** | Da vet vi ikke at avviket er gammelt. Vi påstår ikke noe vi ikke kan belegge. |
| **Varsling til kanaler som ikke er konfigurert** | Å rapportere «varsel sendt til Discord/Slack» uten webhook er en løgn som koster tillit (se punkt 41 i revisjonsnotatet under). |
| **Automatisk lukking av avvik** | Lukking er en faglig vurdering. Agenten lager oppgaven — håndverkeren lukker. |

---

## Gjenstår — anbefalt neste runde

Rangert etter verdi for håndverkeren.

### Høy verdi

1. **Fristvakt for NS 8406 / NS 8405-varsler.**
   Et krav om tilleggsvederlag kan falle bort hvis det ikke varsles innen
   rimelig tid. Agenten klargjør varselet, men følger ikke opp at det faktisk
   ble *sendt* — eller at byggherren svarer. En fristvakt som purrer på
   ubesvarte varsler er den mest verdifulle gjenværende oppgaven. Krever et
   `ns8406VarselFristDager`-felt i innstillingene og en kontroll av
   `change_orders` eldre enn N dager med `status: 'approved'` og ingen
   `clientRespondedAt`.

2. **Ressurs- og leveringspåminnelse.**
   Prosjektet har `endDate`. En agent som ser at en milepæl passerer uten
   registrert fremdrift bør lage «Hva skjer her?»-oppgaven *før* kunden ringer.

3. **MCP: `readOnlyHint` på verktøyene.**
   `/api/mcp` eksponerer 23 verktøy over `AGENT_MCP_SECRET_KEY`, men ingen av
   dem sier om de er lesende eller skrivende. `slett_oppforing` (permanent
   sletting), `godkjenn_endringsordre` og `lukk_avvik` er i samme liste som
   `hent_prosjekter`, uten noe skille for en kallende agent. MCP-protokollen
   støtter `annotations: { readOnlyHint, destructiveHint, idempotentHint }` —
   det bør settes per verktøy. (Lav innsats, høy verdi for enhver agent som
   kobles på.)

4. **`resolveProject()` i MCP faller tilbake til `projects[0]`.**
   Et skrivekall med et prosjektnavn som ikke matcher, skriver til det første
   prosjektet i **hele databasen**. Det bør feile lukket med en liste over
   gyldige prosjekter i stedet.

### Middels verdi

5. **Deadline og oppgavestyring inn i den autonome køen.**
   `tasks` har `deadline`, men ingen sjekker den. Utgåtte oppgaver bør bli
   forslag på samme måte som åpne avvik.

6. **Material- og leveransevarsel fra timebeskrivelser.**
   Timelister inneholder ofte «hentet gips», «ventet på levering». Det er
   reelle signaler om forsinkelse, men krever språkforståelse — hører hjemme
   som et AI-kall, ikke som et nøkkelord-søk.

7. **Kostnadstak per bedrift.**
   Ingen av `/api/agent/dispatch`, `/api/agent/chat`, `/api/agent/autonomous`
   eller `/api/mcp` har hastighetsbegrensning. `costTracker` finnes, men
   `checkCompanyQuota` omgås for bedrifter med bestemte ord i `companyId`
   (`aiEngine.ts`: `includes('comp-001')`, `includes('vikingmester')`, …).

### Lav verdi / kosmetisk

8. **`autofill_form` krever ingen autentisering** og utfører et betalt AI-kall.
9. **Blandet vokabular for avviksstatus** (`'åpen'` vs `'open'`, `'kritisk'` vs
   `'critical'`) i eldre kodeveier.
10. **`scripts/check-vaervarsel.mjs`** kunne utvides til å dekke
    påminnelses-id-ene, slik at regresjoner i dagsnøklingen fanges.

---

## Revisjonsnotat: det som allerede var bra

Det er verdt å si høyt, for det er uvanlig: kodebasen har gjennomgående
kommentarer som forklarer *hvorfor* noe er fjernet, ikke bare hva som er endret.
For eksempel står det i `cronScheduler.ts` hvorfor den AI-genererte
morgenbriefen ble gjort deterministisk, og hvorfor den fabrikkerte
byggedagbok-generatoren ble fjernet helt. Flere P0-hull var allerede lukket før
denne runden — hardkodet JWT-hemmelighet, hardkodet admin-passord, `?secret=`-
autentisering, åpen MCP-tjener og `body.isAdmin`-privilegieheving. Det
arbeidet er ikke gjort om.

---

## Filer som er endret

| Fil | Endring |
| :--- | :--- |
| `src/lib/server/autonomousAgent.ts` | Skrevet om: fire nye oppgavetyper, bedriftsskoling, ærlig vær, timepris fra egne data, beløpsgrense, varsling, selvhelbredelse, idempotens |
| `src/lib/server/cronScheduler.ts` | Ny ettermiddagssyklus kl. 15:30, norsk-tid-schedulering, `runEndOfDayAutonomyCycle()` |
| `src/app/api/agent/autonomous/route.ts` | Bedriftsskoling, `approve_batch`, nye nøkkeltall, `force` på manuell kjøring |
| `src/app/api/cron/autonomy-cycle/route.ts` | **Ny** — ekstern trigger for ettermiddagssyklusen |
| `.github/workflows/autonomy-cycle.yml` | **Ny** — planlagt kjøring man–fre |
| `src/instrumentation.ts` | Uendret innhold (verifisert at scheduleren registreres) |
| `src/components/AutonomousControlPost.tsx` | Mørk variant, bulkgodkjenning, «Vurder manuelt», «Grunnlag:», innstillinger |
| `src/components/MesterWorkstation.tsx` | Kontrollposten montert i «Alle byggeplasser» — den var tidligere ikke koblet inn i det hele tatt |

## Verifisering

- `npm run lint` (`tsc --noEmit`) kjøres i CI (`.github/workflows/ci.yml`) sammen
  med `npm run build` på hver push mot `main`.
- **Ikke kjørt lokalt i denne runden:** `node_modules` på arbeidsstasjonen er
  delvis ødelagt (npm-utpakking feiler med `EBADF`/`UNKNOWN write` på denne
  stasjonen, og `next` mangler). Endringene er derfor verifisert ved å lese
  hver importert symbol-definisjon mot kilden, ikke ved å kompilere. CI er
  fasiten.
