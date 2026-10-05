# Manuelt arbeid — alt DU ma gjore for at VikingMester skal virke og kunne lanseres

**Oppdatert:** 2026-10-05 (runde 1)
**Repo:** `G:\Min disk\GitHub\ksmester` · **Produksjon:** https://vikingmester.no
**Slik leser du tabellene:** `BLOKKERER` = systemet kan ikke lanseres trygt for dette er gjort. `bor gjores` = anbefalt, men stopper ikke lansering.
**Etter hvert punkt star det hva som skjer hvis det ikke blir gjort.**

Alle funn er etterprovd mot kilden eller mot produksjon. Hvor jeg har hentet et faktum eksternt, star kilden.

---

## 1. BESLUTNINGER JEG TRENGER FRA DEG

### 1.1 Skal jeg pushe til `main`? — BLOKKERER
`railway.json` deployer automatisk fra `main` til produksjon. **En push er en produksjonsdeploy.** Jeg har derfor ikke pushet noe. Alt jeg retter ligger lokalt til du sier ja.
- **Hva jeg trenger:** et eksplisitt ja/nei til a pushe til `main`.
- **Hvis ikke:** rettelsene virker ikke i produksjon. Nettsiden fortsetter a ha de hullene som er beskrevet under.

### 1.2 Riktig organisasjonsnummer — BLOKKERER
Nettstedet oppgir `933 607 779` pa `/kontakt`, `/om-oss` (ogsa i meta-beskrivelsen), `/personvern` og `/vilkar`. **Det nummeret finnes ikke.**
- **Bevis:** `https://data.brreg.no/enhetsregisteret/api/enheter/933607779` svarer **HTTP 404**, og nummeret stryker den norske mod-11-kontrollen (vekter 3,2,7,6,5,4,3,2 -> sum 153, forventet kontrollsiffer 1, faktisk 9).
- **Det riktige nummeret er `933 851 222`:** Brreg svarer 200, gyldig kontrollsiffer, `"navn":"AI CHAT NORGE AS"`, org.form AS, stiftet 2024-06-20, forretningsadresse Vidjeveien 21, 3151 Tolvsrod, registrert i Foretaksregisteret og MVA.
- **Hva jeg trenger:** bekreft at `933 851 222` skal sta, og at juridisk navn skal være «AI CHAT NORGE AS».
- **Hvis ikke:** feil org.nr star pa fire offentlige sider, i strukturerte data og skrives inn i FDV-sluttdokumentasjon som leveres til kunder. Det er etterprovbart galt av enhver kunde.

### 1.3 Hvilke priser er de riktige? — BLOKKERER
Tre ulike kilder i systemet oppgir tre ulike priser:

| Plan | `plans.ts` (det `/priser` viser) | JSON-LD (`StructuredData.tsx`) | Koden fakturerer (`register/route.ts:131`, `db.ts:712`) |
| :--- | ---: | ---: | ---: |
| Solo | 690 | 1490 | — |
| Team | 1490 | 3490 | 3490 |
| Totalentreprenor | 2990 | 6900 | 6900 |

- **Hva jeg trenger:** hvilken kolonne er sann? `plans.ts` er den jeg tror er riktig, fordi `/priser` viser den.
- **Hvis ikke:** Google kan vise feil pris i sokeresultatet, og nye kunder kan bli registrert med et belop ingen har godkjent.

### 1.4 Telefonnummer og forretningsadresse — BLOKKERER
`src/components/StructuredData.tsx:29-34` oppgir telefon `+47 401 63 082` og sted `Oslo` i strukturerte data. Samme nummer hardkodes som kontakttelefon for **alle** nye bedrifter (`auth/register/route.ts:126`).
- **Hva jeg trenger:** riktig kundetelefon og riktig sted. Hvis `+47 401 63 082` er Kenneths private nummer, skal det ikke sta som bedriftens kontaktpunkt.
- **Hvis ikke:** feil kontaktinfo i Google, og alle nye kundebedrifter far et fremmed telefonnummer i sin bedriftsprofil.

### 1.5 Myndighetspastandene i footeren — BLOKKERER
`src/components/PublicFooter.tsx:24,28` pastar «Godkjent for Arbeidstilsynet» og «TEK17 & BVN-verifisert». Jeg finner ingen godkjenning, avtale eller kilde i repoet.
- **Hva jeg trenger:** finnes det en godkjenning, en avtale eller en sertifisering a vise til? Ja -> send meg referansen. Nei -> jeg fjerner eller omformulerer pastandene.
- **Hvis ikke:** udokumenterbare myndighetspastander i markedsforing er brudd pa markedsforingsloven og kan gi bot. Det er ogsa den typen pastand en kunde eller tilsyn kan be om dokumentasjon for.

### 1.6 Markedstallene — BLOKKERER
`src/components/StaticPages.tsx:345-358` oppgir «450+ aktive handtverkerbedrifter», «12 000+ SJA-analyser», «99.8% Godkjent i tilsyn» og «4.5 timer spart». Ingen kilde finnes i repoet.
- **Hva jeg trenger:** tallene med kilde og periode, eller beskjed om a fjerne dem.
- **Hvis ikke:** samme lovbrudd som over. Tallene er ogsa usannsynlige for et produkt i denne fasen, som gjor dem ekstra utsatte.

### 1.7 Samtykke til markedsforing — BLOKKERER
Skjemaet innhenter samtykke til vilkar og personvern, men ved innsending starter en automatisk mersalgssekvens (dag 3, 7, 14, 21) via `nurtureEngine.ts`. Det er markedsforing og krever **eget** opt-in etter markedsforingsloven § 15.
- **Hva jeg trenger:** skal jeg stoppe nurture-sekvensen til et eget samtykkefelt er pa plass, eller har dere et annet rettslig grunnlag?
- **Hvis ikke:** uanmodet markedsforing til alle som sender inn skjemaet.

### 1.8 Underleverandorer i personvernerklaringen — BLOKKERER
Erklaringen (`StaticPages.tsx:602`) sier at all data lagres i EOS/Norge. Koden sender prosjekt-, avviks- og bildedata til `api.deepseek.com` (`aiEngine.ts:775,789`), `api.1min.ai` (`aiEngine.ts:432`) og `api.openai.com` (`ai/tts/route.ts:113`).
- **Hva jeg trenger:** (a) er det inngatt databehandleravtaler med DeepSeek, 1min.AI og OpenAI, (b) hva er overforingsgrunnlaget til tredjeland, (c) skal erklaringen oppdateres eller overforingen stoppes?
- **Hvis ikke:** personvernerklaringen er i strid med faktisk behandling. Det er dokumenterbart feil og kan klages inn til Datatilsynet.

### 1.9 Rettigheter til bildet — bor gjores
`public/images/vikingmester-workstation-preview.png` (149 KB) ligger i repoet men refereres ingen steder. Det finnes ingen kilde- eller rettighetssporing.
- **Hva jeg trenger:** hvem eier bildet, eller skal jeg slette det?
- **Hvis ikke:** et bilde uten rettighetssporing i et offentlig repo.

### 1.10 Hvem varsles hvis en deploy gar galt? — BLOKKERER
Det finnes ingen varslingsvei. GitHub Actions-jobben «Daglig KS & HMS Bakgrunnskjoring» **feilet** 2026-10-04 pa samme commit som ellers er grønn. Ingen ble varslet.
- **Hva jeg trenger:** navn og kanal (e-post/telefon/Slack) til den som skal varsles ved feil deploy eller feilende jobb.
- **Hvis ikke:** en feilende jobb eller deploy kan sta i dagevis uten at noen vet det.

---

## 2. HEMMELIGHETER OG NOKKER

**Ingen hemmeligheter er skrevet ut i dette dokumentet eller i repoet.** `.env` og `.env.local` finnes ikke lokalt, og `.env*` er i `.gitignore`. Alle variabler settes i Railway -> prosjektet -> Variables.

### 2.1 Variabler som MA være satt i produksjon — BLOKKERER
Produksjon svarer i dag 200 pa `/api/health` med `database: postgresql`, `resendConfigured: true`, `oneMinAiConfigured: true`, `geminiConfigured: true`. Det bekrefter at disse er satt.

| Variabel | Hva den gjor | Hvor den hentes | Hvordan du sjekker at den virket |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL. Uten den faller appen tilbake til minne og **all data forsvinner ved redeploy**. | Railway -> PostgreSQL-plugin setter den automatisk. | `/api/health` viser `"database":"postgresql"`. |
| `JWT_SECRET` | Signerer innlogging. Uten den genereres en tilfeldig nokkel per prosess og **alle brukere logges ut ved hver omstart**. | `openssl rand -hex 32` | Logg inn, restart tjenesten, sjekk at du fortsatt er innlogget. |
| `ADMIN_PASSWORD` | Passordet til standard admin-konto. **Koden har i dag en hardkodet fallback `VikingMester2026!`** som jeg retter (E-09). | Velg en sterk verdi selv. | Etter min rettelse: fjern variabelen midlertidig og bekreft at appen **nekter a starte** i produksjon. Det er den onskede oppforselen. |
| `INTERNAL_API_SECRET` | Interne systemkall. | `openssl rand -hex 32` | Kall en intern rute uten header -> 401/403. |
| `CRON_SECRET` | Autentiserer cron-jobbene. | `openssl rand -hex 32` | Kall `/api/cron/daily-summary` uten secret -> avvises. |
| `AGENT_API` | Botsify-botnokkel. **Den tidligere nokkelen la hardkodet i kildekoden og er kompromittert fordi repoet har vært offentlig.** | Botsify-panelet. **Ma roteres.** | `/api/openai/v1/models` uten nokkel -> 401. |
| `AGENT_MCP_SECRET_KEY` | MCP-tjeneren, som kan slette data. Fail-closed uten den. | `openssl rand -hex 32` | `/api/mcp` uten nokkel -> 401. |
| `RESEND_API_KEY` | Utgående e-post. | https://resend.com/api-keys | Se 2.3. |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Absolutte lenker i e-post og canonical-URL-er. | `https://vikingmester.no` | Lenker i velkomst-e-post peker pa riktig domene. |
| `UPLOADS_PATH` | Hvor opplastede bilder lagres. **Uten et persistent volum forsvinner kundebilder ved redeploy.** | `/app/uploads` + et Railway-volum montert der. | Last opp et bilde, redeploy, sjekk at bildet fortsatt vises. |

### 2.2 Valgfrie variabler som koden leser men som ikke er dokumentert — bor gjores
`DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `GEMINI_MODEL`, `GOOGLE_API_KEY`, `GOOGLE_GENAI_API_KEY`, `OPENAI_API_KEY`, `PAGESPEED_API_KEY`, `NEXTAUTH_URL`, `LEAD_WEBHOOK_URL`, `INTERNAL_WEBHOOK_URL`, `TASKLET_WEBHOOK_URL`, `FIKEN_*`, `TRIPLETEX_*`, `INITIAL_ADMIN_PASSWORD`, `RESEND_FROM`, `RESEND_KEY`, `RESEND_API`, `RESEND_TOKEN`, `RESEND_APIKEY`, `RESEND`, 8 stk `ONE_MIN_AI_*_MODEL`, og 6 aliaser for 1min.AI-nokkelen.
- **Merk:** `1_MIN_AI` er den dokumenterte varianten, men koden godtar seks ulike navn for samme nokkel. Setter du feil variant, feiler AI-en uten tydelig arsak. Jeg rydder dette til ett navn.
- **Hvis ikke:** vanskelig a feilsoke, og risiko for a sette en nokkel som aldri leses.

### 2.3 E-post: domenet ma være verifisert — BLOKKERER
All utgående e-post gar via Resend fra `hei@vikingmester.no`. Hvis domenet ikke er verifisert hos Resend, havner e-post til kunder i spam eller avvises.
- **Hva du ma gjore:** verifiser `vikingmester.no` hos Resend (DNS-oppføringer: SPF, DKIM, og gjeme DMARC).
- **Hvordan du sjekker:** send en test til en ekstern Gmail-adresse og se at den lander i innboksen, ikke i spam. Sjekk ogsa at `reply-to` virker.
- **Hvis ikke:** kunder far ikke velkomst-e-post eller varsler, og «glemt passord» virker ikke.

---

## 3. KONTOER, DOMENER OG ABONNEMENTER

| Tjeneste | Status | Hva som trengs | Hvis ikke |
| :--- | :--- | :--- | :--- |
| **Domene `vikingmester.no`** | Virker | Bekreft at du kontrollerer DNS og at fornyelsen er betalt. | Siden forsvinner nar domenet utloper. Alle lenker i e-post bryter. |
| **Railway** | Virker (deploy 6829604402, success) | Bekreft at fakturering og region (EU West / Amsterdam) er som forutsatt. | Tjenesten stoppes ved betalingssvikt. |
| **Resend** | Satt opp | Se 2.3. | Se 2.3. |
| **1min.AI** | Satt opp | Bekreft at kontoen har kreditter. | AI-svar feiler. Koden har fallback til Gemini/DeepSeek. |
| **DeepSeek + Google AI Studio** | Satt opp | Bekreft at noklene er gyldige og at modellene `deepseek-v4.1-flash` og `gemini-3.8-flash` er tilgjengelige pa kontoen. | AI-svar feiler. |
| **Google Search Console** | **Ikke verifisert** | Verifiser domenet og send inn sitemap. | Du ser ikke om siden indekseres, og vet ikke om den er borte fra Google. |
| **PostgreSQL-backup** | **Mangler** | Personvernerklaringen lover **daglige sikkerhetskopier**, men ingen backup-jobb finnes i repoet. Sett opp en. | Lover noe vi ikke gjor. Et datatap er permanent. |
| **GitHub Actions-varsling** | **Mangler** | Se 1.10. | Feilende jobber oppdages ikke. |

---

## 4. TILGANGER OG ROLLER SOM MA GIS

| Hva | Hvem | Hvorfor | Hvis ikke |
| :--- | :--- | :--- | :--- |
| **Railway-variabler (lese/skrive)** | deg | Jeg trenger a vite hvilke variabler som faktisk er satt for a kunne skille «nokkel mangler» fra «kode feiler». Jeg trenger **ikke** verdiene. | Jeg ma gjette, og feilsoking tar lengre tid. |
| **Bekreftet eierskap til `main`** | deg | Se 1.1. | Ingen rettelser nar produksjon. |
| **Admin-tilgang til produksjonsdatabasen** | deg | For a bekrefte om `ADMIN_PASSWORD` er satt, og for backup for en eventuell migrering. | Jeg kan ikke bekrefte om E-09 er aktiv eller latent i produksjon. |
| **Rollemodell** | deg | I dag avgjores SuperAdmin av en **hardkodet e-postliste** (`auth.ts:80-92`) og rollen `'admin'` kan settes av brukeren selv ved registrering. Jeg retter det tekniske, men **hvem skal egentlig være SuperAdmin?** | Feil personer far global tilgang, eller rettigheter forsvinner for noen som trenger dem. |

---

## 5. INNHOLD OG BILDER BARE DU ELLER KUNDEN KAN SKAFFE

| Hva | Hvor det skal ligge | Hvorfor | Hvis ikke |
| :--- | :--- | :--- | :--- |
| **Delingsbilde 1200x630 px** | `public/` + `images` i metadata | `twitter:card = summary_large_image` er satt (`StructuredData.tsx:49-53`) men det finnes **ingen** delingsbilde-fil. Deling pa Facebook/LinkedIn gir tomt eller tilfeldig bilde. | Lenker ser ødelagte ut nar noen deler dem. |
| **Rettighetsklarerte bilder** | `public/` | Reproet har 12 eiendeler. Ingen CREDITS-fil finnes. | Se 1.9. |
| **Ekte kundelogoer / referanser** | offentlige sider | Hvis «450+ kunder» skal sta, bor det ogsa kunne vises. | Se 1.6. |

---

## 6. ENGANGSHANDLINGER ETTER LANSERING

1. **Bekreft at migreringen kjorte.** Fane: Railway -> Logs. Se etter `PostgreSQL initialization warning` — hvis den star der, feilet skjemaoppsettet og appen viser tomme lister i stedet for a si fra (funn C-02). **Hvis ikke sjekket:** du vet ikke om databasen er satt opp.
2. **Send en test gjennom hele flyten.** Registrer deg med en ekte e-post du eier, bekreft at velkomst-e-posten kommer, logg inn, opprett et prosjekt, last opp et bilde, logg ut, logg inn igjen. **Hvis ikke:** feil i kundens forste mote med produktet oppdages av kunden, ikke av deg.
3. **Se i loggen etter personopplysninger.** Sok i Railway-loggene etter `password`, `Authorization`, e-postadresser og `ADMIN_PASSWORD`. **Hvis ikke:** du vet ikke om vi lekker data til loggen (funn E-29, regel 12).
4. **Bekreft at `/api/health` fortsatt svarer 200.** Den er deploy-porten. Svarer den ikke 200, blokkeres **neste** deploy helt. **Hvis ikke:** neste gang du vil deploye en rettelse, gar den ikke gjennom, og det ser ut som en kodefeil.
5. **Test at en helt ny konto ikke kan gjore noe den ikke skal.** Opprett en konto, prov a hente en annen bedrifts data, prov a sette `role: "superadmin"` i registreringen, prov `x-impersonated-company-id`. **Hvis ikke:** du vet ikke om hullene faktisk er lukket i produksjon, bare at de er lukket lokalt.
6. **Roter `AGENT_API`-nokkelen i Botsify** hvis den ikke allerede er rotert. Den gamle la hardkodet i et offentlig repo. **Hvis ikke:** hvem som helst med repo-historikken kan bruke boten.

---

## 7. Hva som IKKE er sjekket, og hvorfor

Dette er med vilje, ikke en forglemmelse. Jeg sier ikke at disse er i orden.

1. **Jeg har ikke pushet noe,** sa ingen rettelse er ute i produksjon.
2. **Ingen kjørende instans var tilgjengelig for meg ved planstart** (`node_modules` manglet; `npm ci` kjorer). Alle funn er derfor statisk verifisert ved kodelesting, ikke ved a kjore appen. Det endres i fase 5.
3. **Jeg har ikke gjort ondsinnede kall mot produksjon.** Ingen konto er forsokt overtatt, ingen data er forsokt endret. Hullene er bevist ved a lese koden og ved ufarlige kall.
4. **Arbeidsstasjonen er bare delvis gjennomgatt.** `MesterWorkstation.tsx` (7 846 linjer), `SuperAdmin.tsx` (7 325) og `MesterAIChat.tsx` (3 758) er ikke lest i sin helhet av revisjonen, og ikke av meg.
5. **De 47 MIDDELS- og 19 LAV-funnene er ikke systematisk verifisert enna.**
6. **Git-historikken er ikke gjennomsøkt** etter hemmeligheter som er fjernet fra HEAD men fortsatt ligger i historikken. Repoet har vært offentlig. Dette bor gjores for lansering.
7. **Google Search Console og faktisk indeksering** er ikke sjekket.
8. **Den daglige GitHub Actions-jobben feiler** (2026-10-04) og jeg har ikke lest loggen — den krever innlogging jeg ikke har.
