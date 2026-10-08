# Manuelt arbeid — alt DU ma gjore for at VikingMester skal virke og kunne lanseres

**Oppdatert:** 2026-10-05 (etter runde 2)
**Repo:** `G:\Min disk\GitHub\ksmester` · **Arbeidskopi for bygg/test:** `C:\ksmester-work` (gren `lansering/fikser`)
**Produksjon:** https://vikingmester.no
**Slik leser du tabellene:** `BLOKKERER` = systemet kan ikke lanseres trygt for dette er gjort. `bor gjores` = anbefalt, men stopper ikke lansering.

---

## 1. DET VIKTIGSTE FORST

### 1.1 Skal jeg pushe til `main`? — BLOKKERER, og nå det eneste som gjenstår
`railway.json` deployer automatisk fra `main` til produksjon. **En push er en produksjonsdeploy.**

**Status 2026-10-07:** alle 39 commits fra `lansering/fikser` er merget inn i `main` lokalt.
`main` og `origin/main` på GitHub står fortsatt på `f21f032`, og **produksjon kjører den koden**.
Det betyr at alle ti BLOKKERER-hullene fortsatt er åpne på vikingmester.no akkurat nå.

- **Hva jeg trenger:** et eksplisitt ja/nei til å pushe `main` (39 commits + merge) til `origin/main`.
- **Før du sier ja:** ta en backup av produksjonsdatabasen. Migreringen av `items_store`
  endrer primærnøkkelen og sletter eventuelle duplikatrader (beholder nyeste). Den er testet
  mot skjema og konstruerte data med 79 rader, ikke mot en kopi av produksjonsdata.
- **Etter push:** bekreft at `/api/health` fortsatt svarer 200 og `databaseStatus: "ok"`.
  Helseruten er deploy-porten (`railway.json`).
- **Hvis ikke:** rettelsene virker ikke i produksjon. Systemet er da fortsatt åpent for
  kontoovertakelse, kryss-tenant lesing og sletting, og privilegieheving.

### 1.2 Verifiseringen som manglet er nå kjørt — ikke lenger en blokker
Forrige runde kunne ikke bekrefte E-08 eller passordrotasjonen fordi det ikke fantes en
kjørende PostgreSQL. Det er løst: `@embedded-postgres/windows-x64` ble installert lokalt
(utenfor repoet), og sjekkene ble kjørt mot `next build` + `next start` med ekte Postgres.

- **Resultat:** 17/17 BLOKKERER, 31/31 HØY, 6/6 kontoovertakelse. `tsc` 0 feil, bygg exit 0.
- **E-08 var reell og er rettet** — `items_store` har nå `PRIMARY KEY (collection_name, id)`,
  med en idempotent migrering for eksisterende baser.
- **Hanteringen av passordrotasjonen (E-09 del 2)** er testet indirekte: admin-innlogging med
  `VikingMester2026!` gir 401 når `ADMIN_PASSWORD` ikke er satt.
- **Detaljer:** `docs/verifisering-2026-10-07.md`.
- **Docker er ikke lenger nødvendig** for dette.

### 1.3 Datalagring: bekreft Opper og 1min.AI skriftlig — BLOKKERER for personvernerklæringen
Koden ruter nå personopplysninger til **DeepSeek V4.1 Flash i EU via Opper**, og omgår DeepSeek
i Kina helt (verifisert: 0 treff på `api.deepseek.com` i loggen under test). Men tre ting kan
jeg ikke bekrefte fra koden:

- **Opper er nå den viktigste databehandleren for personopplysninger.** De oppgir selv EU-hosting
  (AWS Stockholm), ISO/IEC 27001:2022 og at de ikke lagrer prompt eller svar uten en
  data retention-regel. Hent **databehandleravtalen** deres fra [trust.opper.ai](https://trust.opper.ai)
  og arkiver den. Det er den avtalen som dekker personopplysningene våre nå.
- **Tilgangen til rutene er ikke bekreftet.** Hos Opper kan en Model access-regel blokkere
  modeller og steder. Er de tre EU-rutene ikke tillatt for prosjektet, svarer kallet 403 i
  produksjon. Sjekk under **Model access** i [platform.opper.ai](https://platform.opper.ai), og
  bekreft at `tensorx`, `greenpt` og `melious` er tillatt.
- **1min.AI er nå bare reserve**, men den brukes fortsatt hvis Opper feiler. Endepunktet deres er
  hardkodet til `https://api.1min.ai/api/chat-with-ai` (`src/lib/server/aiEngine.ts`), og deres
  egen dokumentasjon sier at innhold modereres av OpenAI for alle leverandører: «OpenAI content
  moderation applies to all providers, so text is sent to OpenAI for moderation as well as to
  the selected generation provider.» Setningen gjelder deres OpenAI-kompatible endepunkt, og
  koden bruker det eldre `/api/chat-with-ai` — men det bør avklares, ikke antas.

- **Hva jeg trenger:** (a) Oppers databehandleravtale, (b) bekreftelse på at de fem EU-rutene er
  tillatt for prosjektet, (c) skriftlig svar fra 1min.AI på hvor de behandler data og om
  modereringssetningen gjelder endepunktet vi bruker.
- **Hvorfor:** `src/components/StaticPages.tsx:602` sier i dag «All data lagres i sikre
  datasentre innenfor EØS/Norge» og lover daglige sikkerhetskopier. Erklæringen kan ikke
  oppdateres til å bli sann før svarene over foreligger — og det finnes fortsatt ingen
  backup-jobb i repoet.
- **Hvis ikke:** erklæringen lover noe vi ikke kan dokumentere, og overføringsgrunnlaget til
  tredjeland er udokumentert.

### 1.4 Roter `AGENT_API` i Botsify — BLOKKERER
Den tidligere botnokkelen la hardkodet i kildekoden, og repoet har vært offentlig. `.env.example:23-24` sier det selv.
- **Hva du ma gjore:** generer en ny nokkel i Botsify og sett `AGENT_API` i Railway.
- **Hvordan du sjekker:** `POST /api/openai/v1/models` uten nokkel skal gi 401.
- **Hvis ikke:** hvem som helst med repo-historikken kan bruke boten.

### 1.5 Sett `ADMIN_PASSWORD` — BLOKKERER, og haster
Produksjonsdatabasen inneholder sannsynligvis fortsatt hashen av det gamle hardkodede passordet `VikingMester2026!`.
- **Hva jeg har gjort:** koden har ikke lenger en hardkodet fallback, og den roterer en admin-hash som matcher det gamle passordet til en tilfeldig verdi ved oppstart nar `ADMIN_PASSWORD` ikke er satt. Da finnes ingen kjent vei inn.
- **Hva du ma gjore:** sett `ADMIN_PASSWORD` til en sterk, unik verdi i Railway -> Variables, og deploy. Deretter kan du logge inn.
- **Hvordan du sjekker:** prov a logge inn med `VikingMester2026!` — det skal gi 401. Prov med den nye verdien — det skal virke.
- **Hvis ikke:** ingen kan logge inn pa admin-kontoen (sikkert, men ubrukelig), eller — for rettelsen — hvem som helst kunne.

---

## 2. BESLUTNINGER JEG TRENGER FRA DEG

### 2.1 Riktig organisasjonsnummer — BLOKKERER
Nettstedet oppgir `933 607 779` pa `/kontakt`, `/om-oss` (ogsa i meta-beskrivelsen), `/personvern` og `/vilkar`. **Det nummeret finnes ikke.**
- **Bevis:** `https://data.brreg.no/enhetsregisteret/api/enheter/933607779` svarer **HTTP 404**, og nummeret stryker den norske mod-11-kontrollen.
- **Det riktige er `933 851 222`:** Brreg svarer 200, gyldig kontrollsiffer, `"navn":"AI CHAT NORGE AS"`, stiftet 2024-06-20, Vidjeveien 21, 3151 Tolvsrod.
- **Hva jeg trenger:** bekreft at `933 851 222` skal sta. Merk: koden inneholder allerede `933 851 222` i velkomst-e-posten (`register/route.ts:180` og `lead/route.ts:392`) — det er de offentlige sidene som er feil.
- **Hvis ikke:** feil org.nr pa fire offentlige sider og i FDV-sluttdokumentasjon som leveres til kunder.

### 2.2 Hvilke priser er riktige? — BLOKKERER
| Plan | `plans.ts` (det `/priser` viser) | JSON-LD (`StructuredData.tsx`) | Koden fakturerer |
| :--- | ---: | ---: | ---: |
| Solo | 690 | 1490 | — |
| Team | 1490 | 3490 | 3490 (`register/route.ts:131`) |
| Totalentreprenor | 2990 | 6900 | 6900 (`db.ts:712`) |
- **Hva jeg trenger:** hvilken kolonne er sann? Jeg tror `plans.ts`, fordi `/priser` viser den.
- **Hvis ikke:** Google kan vise feil pris, og nye kunder registreres med et belop ingen har godkjent.

### 2.3 Telefonnummer og adresse — BLOKKERER
`StructuredData.tsx:29-34` oppgir `+47 401 63 082` og `Oslo`. Samme nummer hardkodes som kontakttelefon for **alle** nye bedrifter (`register/route.ts:126`).
- **Hva jeg trenger:** riktig kundetelefon og sted. Er dette Kenneths private nummer, skal det ikke sta som bedriftens kontaktpunkt.
- **Hvis ikke:** feil kontaktinfo i Google, og alle nye kundebedrifter far et fremmed telefonnummer.

### 2.4 Myndighetspastandene i footeren — BLOKKERER
`PublicFooter.tsx:24,28` pastar «Godkjent for Arbeidstilsynet» og «TEK17 & BVN-verifisert». Jeg finner ingen godkjenning eller kilde i repoet.
- **Hva jeg trenger:** finnes godkjenningen? Ja -> send referansen. Nei -> jeg fjerner eller omformulerer.
- **Hvis ikke:** udokumenterbare myndighetspastander i markedsforing er brudd pa markedsforingsloven.

### 2.5 Markedstallene — BLOKKERER
`StaticPages.tsx:345-358`: «450+ aktive handtverkerbedrifter», «12 000+ SJA-analyser», «99.8% Godkjent i tilsyn», «4.5 timer spart». Ingen kilde finnes.
- **Hva jeg trenger:** tallene med kilde og periode, eller beskjed om a fjerne dem.

### 2.6 Samtykke til markedsforing — BLOKKERER
Skjemaet innhenter samtykke til vilkar og personvern, men ved innsending starter en mersalgssekvens (dag 3/7/14/21) via `nurtureEngine.ts`. Det er markedsforing og krever eget opt-in (markedsforingsloven § 15).
- **Hva jeg trenger:** skal jeg stoppe sekvensen til et eget samtykkefelt finnes?

### 2.7 Underleverandorer i personvernerklaringen — BLOKKERER
Erklaringen (`StaticPages.tsx:602`) sier all data lagres i EOS/Norge. Koden sender prosjekt-, avviks- og bildedata til `api.deepseek.com`, `api.1min.ai` og `api.openai.com`.
- **Hva jeg trenger:** (a) er det inngatt databehandleravtaler, (b) hva er overforingsgrunnlaget til tredjeland, (c) skal erklaringen oppdateres eller overforingen stoppes?

### 2.8 Hvem varsles hvis en deploy gar galt? — BLOKKERER
Ingen varslingsvei finnes. GitHub Actions-jobben «Daglig KS & HMS Bakgrunnskjoring» **feilet** 2026-10-04 pa samme commit som ellers er grønn.
- **Hva jeg trenger:** navn og kanal til den som skal varsles.

### 2.9 Rettigheter til bildet — bor gjores
`public/images/vikingmester-workstation-preview.png` (149 KB) refereres ingen steder. Ingen rettighetssporing finnes.
- **Hva jeg trenger:** hvem eier det, eller skal jeg slette det?

### 2.10 Rollemodell — BLOKKERER for videre arbeid
I dag avgjores SuperAdmin av en hardkodet e-postliste (`auth.ts:80-92`). Jeg har fjernet de verste bakveiene, men **hvem skal egentlig være SuperAdmin?**
- **Hva jeg trenger:** listen over personer som skal ha global tilgang, og om det skal styres av en `role` i databasen i stedet for e-post.
- **Hvis ikke:** feil personer far global tilgang, eller rettigheter forsvinner for noen som trenger dem.

---

## 3. HEMMELIGHETER OG NOKKER

**Ingen hemmeligheter er skrevet ut her eller i repoet.** `.env` og `.env.local` finnes ikke lokalt, og `.env*` er i `.gitignore`. Alle variabler settes i Railway -> prosjektet -> Variables.

### 3.1 Variabler som MA være satt i produksjon — BLOKKERER
Produksjon svarte 2026-10-05 200 pa `/api/health` med `database: postgresql`, `resendConfigured: true`, `oneMinAiConfigured: true`, `geminiConfigured: true`.

| Variabel | Hva den gjor | Hvor den hentes | Hvordan du sjekker |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL. Uten den faller appen tilbake til minne og **all data forsvinner ved redeploy**. | Railway -> PostgreSQL-plugin setter den automatisk. | `/api/health` viser `"database":"postgresql"`. |
| `JWT_SECRET` | Signerer innlogging. Uten den genereres en tilfeldig nokkel per prosess og **alle logges ut ved omstart**. | `openssl rand -hex 32` | Logg inn, restart tjenesten, sjekk at du fortsatt er innlogget. |
| `ADMIN_PASSWORD` | Se 1.4. | Velg en sterk verdi selv. | Se 1.4. |
| `INTERNAL_API_SECRET` | Interne systemkall. | `openssl rand -hex 32` | Kall en intern rute uten header -> 401. |
| `CRON_SECRET` | Autentiserer cron-jobbene. | `openssl rand -hex 32` | Kall `/api/cron/daily-summary` uten secret -> avvises. |
| `AGENT_API` | Botsify-botnokkel. **Ma roteres, se 1.3.** | Botsify-panelet. | `/api/openai/v1/models` uten nokkel -> 401. |
| `AGENT_MCP_SECRET_KEY` | MCP-tjeneren, som kan slette data. Fail-closed uten den. | `openssl rand -hex 32` | `/api/mcp` uten nokkel -> 401. |
| `RESEND_API_KEY` | Utgående e-post. | https://resend.com/api-keys | Se 3.3. |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Absolutte lenker i e-post og canonical-URL-er. | `https://vikingmester.no` | Lenker i velkomst-e-post peker riktig. |
| `UPLOADS_PATH` | **Uten et persistent volum forsvinner kundebilder ved redeploy.** | `/app/uploads` + Railway-volum montert der. | Last opp bilde, redeploy, sjekk at det vises. |

### 3.2 Valgfrie variabler koden leser men som ikke er dokumentert — bor gjores
`DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `GEMINI_MODEL`, `GOOGLE_API_KEY`, `GOOGLE_GENAI_API_KEY`, `OPENAI_API_KEY`, `PAGESPEED_API_KEY`, `NEXTAUTH_URL`, `LEAD_WEBHOOK_URL`, `INTERNAL_WEBHOOK_URL`, `TASKLET_WEBHOOK_URL`, `FIKEN_*`, `TRIPLETEX_*`, `INITIAL_ADMIN_PASSWORD`, `RESEND_FROM`, `RESEND_KEY`, `RESEND_API`, `RESEND_TOKEN`, `RESEND_APIKEY`, `RESEND`, 8 stk `ONE_MIN_AI_*_MODEL`, og 6 aliaser for 1min.AI-nokkelen.
- **Merk:** `1_MIN_AI` er den dokumenterte varianten, men koden godtar seks navn for samme nokkel. Setter du feil variant, feiler AI-en uten tydelig arsak.

### 3.3 E-post: domenet ma være verifisert — BLOKKERER
All utgående e-post gar via Resend fra `hei@vikingmester.no`.
- **Hva du ma gjore:** verifiser `vikingmester.no` hos Resend (SPF, DKIM, gjeme DMARC).
- **Hvordan du sjekker:** send en test til en ekstern Gmail og se at den lander i innboksen.
- **Hvis ikke:** kunder far ikke velkomst-e-post eller varsler, og «glemt passord» virker ikke.

---

## 4. KONTOER, DOMENER OG ABONNEMENTER

| Tjeneste | Status | Hva som trengs | Hvis ikke |
| :--- | :--- | :--- | :--- |
| **Domene `vikingmester.no`** | Virker | Bekreft DNS-kontroll og at fornyelsen er betalt. | Siden forsvinner nar domenet utloper. |
| **Railway** | Virker (deploy 6829604402, success) | Bekreft fakturering og region (EU West / Amsterdam). | Tjenesten stoppes ved betalingssvikt. |
| **Resend** | Satt opp | Se 3.3. | Se 3.3. |
| **1min.AI** | Satt opp | Bekreft at kontoen har kreditter. | AI-svar feiler (fallback finnes). |
| **DeepSeek + Google AI Studio** | Satt opp | Bekreft at noklene er gyldige og modellene tilgjengelige. | AI-svar feiler. |
| **Google Search Console** | **Ikke verifisert** | Verifiser domenet og send inn sitemap. | Du ser ikke om siden indekseres. |
| **PostgreSQL-backup** | **Mangler** | Personvernerklaringen lover **daglige sikkerhetskopier**, men ingen backup-jobb finnes. Sett opp en. | Lover noe vi ikke gjor. Et datatap er permanent. |
| **Docker Desktop** | **Kjorer ikke** | Se 1.2. | E-08 og passordrotasjonen forblir uverifisert. |

---

## 5. TILGANGER OG ROLLER SOM MA GIS

| Hva | Hvem | Hvorfor | Hvis ikke |
| :--- | :--- | :--- | :--- |
| **Ja til a pushe til `main`** | deg | Se 1.1. | Ingen rettelser nar produksjon. |
| **Railway-variabler (lesetilgang)** | deg | Jeg trenger a vite hvilke variabler som er satt for a skille «nokkel mangler» fra «kode feiler». Jeg trenger **ikke** verdiene. | Jeg ma gjette i feilsoking. |
| **Docker Desktop startet** | deg | Se 1.2. | E-08 uverifisert. |
| **Rollemodell** | deg | Se 2.10. | Feil personer far global tilgang. |
| **Tilgang til a lese den feilende Actions-loggen** | deg | Jobben feilet 2026-10-04. Loggen krever innlogging. | Vi vet ikke hvorfor den feiler. |

---

## 6. INNHOLD OG BILDER BARE DU ELLER KUNDEN KAN SKAFFE

| Hva | Hvor | Hvorfor | Hvis ikke |
| :--- | :--- | :--- | :--- |
| **Delingsbilde 1200x630 px** | `public/` + `images` i metadata | `twitter:card = summary_large_image` er satt (`StructuredData.tsx:49-53`) men det finnes **ingen** delingsbilde-fil. | Deling pa Facebook/LinkedIn gir tomt eller tilfeldig bilde. |
| **Rettighetsklarerte bilder** | `public/` | Repoet har 12 eiendeler, ingen CREDITS-fil. | Se 2.9. |

---

## 7. ENGANGSHANDLINGER ETTER LANSERING

1. **Bekreft at migreringen kjorte.** Railway -> Logs. Se etter `PostgreSQL initialization warning`. Star den der, feilet skjemaoppsettet.
2. **Bekreft at passordrotasjonen skjedde.** Se etter `[SECURITY] Admin-kontoen ... brukte det gamle hardkodede passordet` i loggen. Da er den gamle veien lukket, og du ma sette `ADMIN_PASSWORD` (1.4).
3. **Send en test gjennom hele flyten.** Registrer deg med en ekte e-post, bekreft velkomst-e-posten, logg inn, opprett prosjekt, last opp bilde, logg ut, logg inn igjen.
4. **Se i loggen etter personopplysninger.** Sok etter `password`, `Authorization` og e-postadresser.
5. **Bekreft at `/api/health` fortsatt svarer 200.** Den er deploy-porten. Svarer den ikke 200, blokkeres **neste** deploy.
6. **Test at en ny konto ikke kan gjore noe den ikke skal.** Prov a sette `role:"superadmin"` i registreringen, send `x-impersonated-company-id`, og prov `x-portal-access: true`. Alle skal avvises.
7. **Roter `AGENT_API`** hvis ikke allerede gjort (1.3).

---

## 8. Hva som IKKE er sjekket, og hvorfor

Dette er med vilje, ikke en forglemmelse. Jeg sier ikke at disse er i orden.

1. **Ingenting er pushet.** Alle rettelser ligger i `C:\ksmester-work` pa grenen `lansering/fikser`.
2. **E-08 er ikke verifisert** — krever Postgres (1.2).
3. **Passordrotasjonen er ikke verifisert mot en ekte database** (1.2).
4. **Sidene er ikke apnet i nettleser med skjermbilde enna.** Det er fase 5 og gjenstar.
5. **Rettelsene er ikke sett i produksjon.** Ingen push.
6. **Jeg har ikke gjort ondsinnede kall mot produksjon.** Hullene er bevist ved kodelesting og ufarlige kall mot en lokal instans.
7. **Arbeidsstasjonen er bare delvis gjennomgatt.** `MesterWorkstation.tsx` (7 846 linjer), `SuperAdmin.tsx` (7 325) og `MesterAIChat.tsx` (3 758) er ikke lest i sin helhet.
8. **De 47 MIDDELS- og 19 LAV-funnene er ikke systematisk verifisert** — unntatt de jeg traff underveis (N-06, N-07, N-08, N-01, N-02, N-03).
9. **Git-historikken er ikke gjennomsøkt** etter hemmeligheter fjernet fra HEAD. Repoet har vært offentlig.
10. **Den daglige GitHub Actions-jobben feiler** og jeg har ikke lest loggen.

---

## 9. VIKTIG OM ARBEIDSKOPIEN PA C:

`G:` er et **Google Drive-volum**. `npm ci` feiler der med `EBADF: bad file descriptor` og `EPERM` pa hver fil, og filer kan ikke skrives atomisk. Jeg opprettet derfor en lokal git-worktree:

- **`C:\ksmester-work`** — gren `lansering/fikser`, deler samme `.git` som `G:\Min disk\GitHub\ksmester`. All bygging, typekontroll og testing skjer her.
- **Dine originalfiler i `G:` er ikke rort.** Kildekoden ligger urort pa `main` med mine endringer kun i worktree-en, fram til du sier ja til a slå dem sammen.
- **Slik slar du dem sammen selv senere:** `git -C "G:\Min disk\GitHub\ksmester" merge --ff-only lansering/fikser`
- **Slik rydder du bort arbeidskopien:** `git -C "G:\Min disk\GitHub\ksmester" worktree remove C:\ksmester-work`
---

## 10. TILFØYET ETTER RUNDE 5

### 10.1 Bekreft organisasjonsnummeret — BLOKKERER (men rettelsen er teknisk verifisert)
Jeg har rettet `933 607 779` → `933 851 222` i 16 filer og samlet det i én fil: `src/constants/companyDetails.ts`.

**Slik sjekker du selv at det er riktig** (tar 10 sekunder): åpne
`https://data.brreg.no/enhetsregisteret/api/enheter/933851222` i nettleseren. Du skal få `"navn":"AI CHAT NORGE AS"`.
Prøv deretter `https://data.brreg.no/enhetsregisteret/api/enheter/933607779` — den gir 404, altså fantes det gamle nummeret ikke.

- **Hvis riktig:** ingen handling nødvendig.
- **Hvis det juridiske ansvarlige selskapet er et annet:** endre verdien i `src/constants/companyDetails.ts` — det er det eneste stedet. Ikke i de 16 andre filene.
- **Hvis ikke:** feil org.nr står på kontakt, om-oss (også i Googles beskrivelse), personvern, vilkår, footer, og i FDV-dokumenter kunden mottar.

### 10.2 Plattformens org.nr skrives ikke lenger i kundens dokumenter
FDV-sluttdokumentasjonen skrev tidligere inn et hardkodet org.nr som om det var entreprenørens. Nå vises prosjektets eget nummer, eller «Ikke registrert».
- **Hva du bør gjøre:** sørg for at prosjektene har `companyOrgnr` satt der det er relevant. Ellers står det «Ikke registrert» i dokumentet — som er ærlig, men mindre komplett.
- **Hvis ikke:** dokumenter uten org.nr. Bedre enn dokumenter med feil org.nr.

### 10.3 Poster uten bedriftstilhørighet vises ikke lenger
Tre lister i dashboardet godtok tidligere poster som manglet `company`-felt, og viste dem til alle bedrifter. Det er lukket.
- **Hva du bør gjøre:** hvis en kunde sier at noe er «forsvunnet» etter denne endringen, mangler posten bedriftstilhørighet i databasen. Den må da få `companyId` eller `company` satt. Dette er en bevisst atferdsendring for å lukke en lekkasje.
- **Hvis ikke:** vi har en åpen tenantisolasjon der én kundes poster vises hos en annen.
### 10.4 Ny miljøvariabel: `ADMIN_NOTIFY_EMAILS` — bør gjøres
Interne varsler (nye leads, registreringer, integrasjoner, Ragnar-leads) inneholder kundens navn, e-post, telefon og org.nr. Mottakerne lå tidligere hardkodet til private Gmail-adresser. De leses nå fra miljøet.
- **Hva du må gjøre:** sett `ADMIN_NOTIFY_EMAILS=post@dittfirma.no` (komma-separert for flere) i Railway.
- **Hvordan du sjekker:** send inn kontaktskjemaet på `/kontakt` og se at varselet kommer til den adressen, ikke til en privat konto.
- **Hvis ikke:** varslene går til `hei@vikingmester.no`. Ingen kundedata lekker til private kontoer, men ingen får kanskje sett dem.

### 10.5 Ekte persondata lå i repoet — BLOKKERER for vurdering
Koden seedet databasen med en ekte persons navn, private e-post, private telefon og private hjemadresse, pluss to andre private e-postadresser og telefonnumre. Alt er nå erstattet med demodata.
- **Hva jeg trenger:** en avgjørelse på om dette skal håndteres videre.
- **Hva du bør vite:** opplysningene er fjernet fra koden, men **ligger fortsatt i git-historikken**, og repoet har vært offentlig. Jeg har ikke omskrevet historikken — det er en destruktiv operasjon som krever din godkjenning og koordinering med alle som har en klone.
- **Hva som bør vurderes:** om de berørte personene skal varsles, og om historikken skal renses (`git filter-repo` eller BFG) før repoet eventuelt gjøres offentlig igjen.
- **Hvis ikke:** personopplysningene er tilgjengelige for alle som kloner repoet og ser på historikken.

### 10.6 Historikken er ikke gjennomsøkt etter hemmeligheter
Repoet har vært offentlig, og `.env.example` nevner selv at en botnøkkel lå hardkodet og er kompromittert. Jeg har ikke gjennomsøkt historikken.
- **Hva du bør gjøre:** la meg eller noen andre kjøre en gjennomsøking (`git log -p` etter nøkkelmønstre) før repoet eventuelt åpnes igjen.

### 10.7 Innstillinger-knappen i dashboardet
Jeg koblet `onOpenSettings` til en ny `settings`-gren i arbeidsflaten, fordi knappen tidligere var koblet til en tom funksjon.
- **Hva du bør gjøre:** klikk «Innstillinger» i dashboardet og bekreft at den åpner den innstillingene du forventer. Jeg har verifisert at grenen finnes og at modalen åpnes, men ikke at det er den *riktige* modalen for din arbeidsflyt.
### 10.8 Forsiden er usynlig for søkemotorer — BLOKKERER for din beslutning
Forsiden (`/`) er bygget slik at all tekst kommer fra JavaScript. Uten JS viser den bare en spinner. Samtidig blokkerer `robots.txt` `/_next/` for alle robots (R-07).
- **Konsekvens:** Google og Bing ser i praksis ingen av markedsføringstekstene, prisen eller påstandene deres på forsiden. Søketrafikk er en vesentlig del av hvordan denne siden skal skaffes kunder.
- **Hva jeg trenger:** en beslutning. Enten (a) server-rendrer jeg landingssiden, som er et større arbeid jeg ikke bør gjøre rett før lansering, eller (b) du aksepterer at bare crawlere som kjører JavaScript indekserer den.
- **Hva jeg kan gjøre nå uansett:** fjerne `/_next/` fra `robots.txt` slik at JS/cSS kan hentes (R-07), og legge `/invite` og `/auth/` i disallow. Si fra, så gjør jeg det.
- **Merk:** tilgang til Google Search Console (10.3) vil vise deg den faktiske situasjonen før du bestemmer deg.

### 10.9 Prisene bør bekreftes — BLOKKERER
Jeg har rettet prisene slik at de er konsistente overalt: 690 / 1 490 / 2 990 per måned, med 550 / 1 190 / 2 390 ved årlig avtale. Verdiene kommer fra `src/config/plans.ts`, som er det `/priser` viser.
- **Hva jeg trenger:** bekreft at dette er de riktige prisene.
- **Hvis ikke:** både nettsiden, JSON-LD-en Google leser, og `llms.txt` som AI-modeller leser, oppgir feil pris samtidig. Det var nettopp derfor de spriket før: tre kilder, tre svar.