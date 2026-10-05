# Plan — VikingMester (ksmester) mot produksjons- og lanseringsklar

**Opprettet:** 2026-10-05 · **Sist oppdatert:** 2026-10-05 (runde 1)
**Repo:** `G:\Min disk\GitHub\ksmester` · **Remote:** `origin` = https://github.com/kenkri3/ksmester.git
**Gren:** `main` · **HEAD ved planstart:** `f21f0323eaf8a578697261b57efc00d74416ec71`
**Basis:** `docs/revisjon-2026-10-05.md` (104 funn: 10 BLOKKERER, 28 HOY, 47 MIDDELS, 19 LAV)
**Malmljo:** https://vikingmester.no (Railway, Nixpacks, healthcheck `/api/health`)

---

## 0. Status na — hva er verifisert, og hvordan

### 0.1 Verifisert av meg ved a lese koden

| Pastand | Hvordan verifisert |
| :--- | :--- |
| Alle 10 BLOKKERER-funn er ekte | Hver fil apnet, de aktuelle linjene lest i sin helhet. Se kap. 1.1. |
| `x-portal-access` settes av **klienten** | `src/services/aiClient.ts:33` setter headeren; `src/app/api/ai/generate/route.ts:28` leser den. Ingen serverstyrke-verifisering. Bekreftet uavhengig av `funn-verifier`. |
| `x-impersonated-company-id` styres av klienten | `src/services/api.ts:6,10` leser `localStorage.getItem('impersonatedCompanyId')`; serveren leser den i `src/app/api/data/[collection]/route.ts:92`. |
| Impersonering er en **reell, onsket funksjon** | Brukes i `SuperAdmin.tsx`, `AdminSimulationBar.tsx`, `WorkstationSidebar.tsx`, `useAuth.tsx`. Rettes ved a autorisere server-side — **ikke** ved a fjerne funksjonen. |
| `.env` og `.env.local` finnes **ikke** lokalt | `Test-Path` = False for begge. |
| `node_modules` manglet | `npm ci` startet 2026-10-05 09:03. |
| CI kjorer `tsc --noEmit` + `next build` | `.github/workflows/ci.yml:27-34`. |
| `railway.json` gater deploy pa `/api/health` | `railway.json:8`, `restartPolicyMaxRetries: 10`. |
| Produksjon svarer **200** pa `/api/health` | Kall 2026-10-05: `200`, `{"status":"ok","databaseHealthy":true,"database":"postgresql"}`. |
| `plans.ts` faktiske priser | solo **690**, team **1490**, entreprenor **2990**, enterprise **2990**. |
| `.data/` er ikke i `.gitignore` og ikke sporet | `git check-ignore` og `git ls-files` ga ingen treff. |

### 0.2 To uavhengige verifiseringsagenter

- `prod-verifier`: hva er faktisk ute i produksjon na (helsestatus, live commit, pastander i servert HTML, robots/sitemap, org.nr mot Bronnoysund). Skriver `docs/_verify-prod.md`.
- `funn-verifier`: **FERDIG.** Skriver `docs/_verify-funn.md`. 12 av 12 punkter etterprovd, 9 funn bekreftet, 1 delpastand motbevist, 2 upresisheter avdekket. Se kap. 1.2 og 1.4.

---

## 1. Funn prioritert, med verifiseringsstatus

### 1.1 BLOKKERER (10) — alle verifisert av meg

| ID | Kort | Bevis | Rettelse |
| :--- | :--- | :--- | :--- |
| **E-02** | Uautentisert kontoovertakelse via `POST /api/lead` | `lead/route.ts:164-171` overskriver passord; `:261-269` returnerer JWT. Ingen auth-gren. | Fjern passord-oppdatering + token-utstedelse for eksisterende bruker. |
| **E-01** | Kryss-tenant lesing via klientstyrt header | `data/[collection]/route.ts:92-93,123-128` — `impersonatedHeader` brukes uten `isSuper`-sjekk. | Flytt under `isSuper`; valider at SuperAdmin faktisk far impersonere. |
| **E-03** | Selvvalgt rolle -> SuperAdmin | `auth/register/route.ts:87` `inputRole \|\| ...`; `:111` `ON CONFLICT ... role = EXCLUDED.role`. `:84` slipper ogsa gjennom `companyId: 'comp-001'` (superadmin-tenanten). | Hvitlist rolle, ignorer klient-`companyId`. |
| **E-04** | Rolleepskalering via `POST /api/data/users` | `data/[collection]/route.ts:210-218` spreader `...body`; `db.ts:924-942` skriver `role = COALESCE(EXCLUDED.role, ...)`. | Strip `role`/`companyId`/`password`/`subscriptionStatus` i POST for ikke-superadmin. |
| **E-05** | `x-portal-access` opphever autentisering | `ai/generate/route.ts:28-32`; headeren settes av klienten i `aiClient.ts:33`. | Fjern header-unntaket eller gjor det til et signert token. |
| **E-06** | `authorName` fra body gir SuperAdmin + sletting | `agent/dispatch/route.ts:671-675` (`includes('admin')`, `includes('ken')`); sletting `:717-726` uten `companyId`-filter. **Presisering:** ruten er bak `isAuthorizedDispatchCaller` (`:281`), sa ikke anonym — men rollen er selvvalgt via body. | Fjern heuristikken, autoriser pa `isUserSuperAdmin`, tenant-filtrer. |
| **E-07** | `agent/chat` avviser aldri anonyme | `agent/chat/route.ts:511-515` `(!user && body.isAdmin === true)`; `:484` `body.companyId` styrer tenant; `:523` `getCollectionItems('tasks')` uten filter. `grep` finner **ingen** 401/403 i filen. | Krev autentisering; fjern `body.isAdmin`/`body.companyId` som autorisasjonsgrunnlag. |
| **E-08** | Kryss-samling-overskriving via klientstyrt `id` | `db.ts:553-558` PK er `id` alene; `db.ts:945-948` `ON CONFLICT (id) DO UPDATE`. | Sammensatt nokkel `(collection_name, id)`; nekt klientstyrt `id` ved oppretting. |
| **E-09** | Hardkodet admin-passord, nullstilles ved oppstart | `db.ts:15,27-28` fallback `'VikingMester2026!'`; `:604-614` `ON CONFLICT ... password = EXCLUDED.password`. | Fjern fallback; fjern passord fra `ON CONFLICT`; feil hardt i produksjon uten `ADMIN_PASSWORD`. |
| **E-10** | Universelt masterpassord i partnerportalen | `partner/auth/login/route.ts:23-27` `isMasterPassword`; `:62` `if (!passwordMatch && !isMasterPassword)`. | Slett `isMasterPassword`-grenen; verifiser alltid mot lagret hash. |

### 1.2 HOY (28) — status per funn

**Verifisert av meg eller `funn-verifier`:**

| ID | Kort | Bevis |
| :--- | :--- | :--- |
| **E-11** | SuperAdmin avgjores av hardkodet e-postliste | `auth.ts:80-92`. |
| **E-12** | IDOR + apen e-postutsending i `/api/documentation` | Bekreftet av `funn-verifier`: `projectDocumentationEngine.ts` har **0** `companyId`-treff; filtrerer kun pa `projectId` (`:203`, `:211`). POST-grenen er en bekreftet phishing-primitiv: innlogget bruker kan sende angriper-skreddersydd HTML/emne/vedlegg til vilkarlig mottaker fra plattformens verifiserte domene. **Alvorligheten er underdrevet i revisjonen.** |
| **E-13** | Uautentisert e-postavsending fra verifisert domene | Bekreftet av `funn-verifier`. Presisering: gar via raa `fetch('https://api.resend.com/emails')`, ikke `sendSystemEmail`. |
| **E-14** | Apen e-postrelay: `o.id === activeToken` | Bekreftet av `funn-verifier`. |
| **C-02** | DB-feil svelges -> tomme lister | `db.ts:618-620,629-633`. |
| **C-03** | Frontend skjuler serverfeil og mister skrivinger | `services/api.ts:153-361`. |
| **W-01** | Tenantisolasjon faller tilbake til `!data.company` | `Dashboard.tsx:205,280,309`. |
| **W-02** | Sletting av tilbud melder suksess i `catch` | `Dashboard.tsx:329-337`. |
| **W-03** | `loading` settes aldri false ved lytterfeil | `useDashboardData.ts:34,70-73,100-101`. |
| **W-04** | Fabrikerte prosjektdata i UI | `useDashboardData.ts:56-66`. |
| **W-05** | Oppdiktede penge- og jussfelt | `Dashboard.tsx:209-243`. |
| **R-01** | Feil organisasjonsnummer | Ekstern kilde + produksjons-HTML (se `docs/_verify-prod.md`). |
| **R-03** | Feil priser i JSON-LD | `StructuredData.tsx:83,92,101` = 1490/3490/6900 mot `plans.ts:46,85,127` = 690/1490/2990. |
| **F-01** | Personvernerklaring i strid med koden | Eksterne endepunkter i `aiEngine.ts:432,775,789`, `ai/tts/route.ts:113`. |
| **F-02** | Google Fonts for samtykke | `layout.tsx:96-101`. |
| **F-03** | Ekte kundeopplysninger i kildekoden | `db.ts:194-198` (navn, privat e-post, telefon, privatadresse), `MobileApp.tsx:76`. |
| **F-04** | Kundedata til private Gmail-kontoer | `lead/route.ts:483` m.fl. |
| **T-01** | Zoom sperret | `layout.tsx:82-83`. |
| **O-04** | Manglende `DATABASE_URL` feiler ikke lukket | `db.ts:34-53,842,892-911`. |
| **O-06** | Global canonical i root-layout | `layout.tsx:38-40`. |
| **B-01** | Udokumenterbare myndighetspastander | `PublicFooter.tsx:24,28`. |

**Enna ikke verifisert i runtime (ma kjores for retting):** E-16, E-17, E-18, W-06, C-04.

**AVVIST — revisjonen tok feil:**

| ID | Revisjonens pastand | Hvorfor avvist |
| :--- | :--- | :--- |
| **R-16** | «`/api/health` kan **aldri** returnere 200 nar `DATABASE_URL` er satt» -> 503 og restart-lokke | **Feil.** Produksjonskall 2026-10-05: HTTP **200**, `{"status":"ok","databaseHealthy":true,"database":"postgresql"}`. `dbQuery('SELECT 1')` lykkes fordi det er en gyldig sporring mot en levende tilkobling; `catch`-grenen i `db.ts:629` treffer bare nar sporringen faktisk feiler. Revisjonen leste `dbQuery` riktig, men trakk feil konklusjon om `SELECT 1`. **Det reelle problemet er C-02**, ikke at helsesjekken er konstant rod. |
| **R-03, delpastand** | «Prisene 3490 og 6900 finnes **ingen** steder i repoet» | **Feil.** `auth/register/route.ts:131` `monthlyPrice: ... : 3490` og `db.ts:712` `monthlyPrice: ... : 6900`. Resten av R-03 star (JSON-LD stemmer ikke med `plans.ts`), men bildet er **verre**: feil priser ligger ogsa i faktureringsrelevante `monthlyPrice`-felt. Se N-01. |
| **E-06, delpastand** | «ingen auth-gren» / implisitt anonymt tilgjengelig | **Presisert.** `dispatch/route.ts:281` `isAuthorizedDispatchCaller(req, body)` avviser med 401; `:28-34` slipper bare JWT, cron-hemmelighet, `body.userToken` eller `action === 'autofill_form'` gjennom. Hullet er rolleepskalering via `authorName`, ikke anonym tilgang. |

### 1.3 MIDDELS (47) og LAV (19)

Ikke systematisk verifisert enna. Tas etter BLOKKERER og HOY. Funn som er billige, irreversible a rette og som berorer jus eller penger (E-19..E-25, E-29, C-13, D-01, F-08, F-09, F-10, R-05, R-06, R-07, R-09, R-14, O-05, O-07, O-08) loftes til HOY-prioritet.

### 1.4 Nye funn (ikke i revisjonen)

| ID | Funn | Bevis |
| :--- | :--- | :--- |
| **N-01** | `auth/register/route.ts:131` setter `monthlyPrice: 3490` og `db.ts:712` `6900` for nye kunder — belop som ikke finnes i `plans.ts`. Faktureringsrelevant. | Lest begge linjer; bekreftet av `funn-verifier`. |
| **N-02** | `auth/register/route.ts:126` hardkoder `phone: '401 63 082'` pa **alle** nye bedrifter. | Lest linjen. |
| **N-03** | `.data/` (lokal JSON-lagring med kundedata) er ikke i `.gitignore`. | `git check-ignore` ga ingen treff. |
| **N-04** | `data/[collection]/route.ts:41-47` returnerer fullstendige tilbud/kontrakter/endringsordrer til den som oppgir `?token=<id>`, fordi ogsa `i.id === cleanToken` godtas. En ID er ikke en hemmelighet. | Lest `:38-73`. |
| **N-05** | `funn-verifier` fant en **andre** slettevei i `agent/dispatch/route.ts:3600-3610` (sletting pa `changeOrderId`) med samme `authorName`-heuristikk og uten `companyId`-filter, i tillegg til avvikssletting `:764-767`. Revisjonen nevner bare én. | `funn-verifier`-rapport. |

---

## 2. Faser med oppgaver og verifiseringsport per fase

### Fase 1 — Verifiser og planlegg
- [x] Les revisjonsrapporten i sin helhet.
- [x] Verifiser alle 10 BLOKKERER mot kilden.
- [x] Verifiser de mest konsekvensrike HOY-funnene.
- [x] Skriv denne planen **for** noe kode skrives.
- [x] `funn-verifier` har levert `docs/_verify-funn.md`.
- [ ] `prod-verifier` leverer `docs/_verify-prod.md`.
- **PORT 1:** Planen finnes i repoet, alle BLOKKERER har verifisert status, minst to funn er avvist med begrunnelse, og to uavhengige agenter har rapportert.

### Fase 2 — Autonomi
- [ ] Vedvarende mal med objektiv og rundetak.
- [ ] Tilbakevendende paminning hvert 30. minutt.
- [ ] Dokumenter for brukeren hvordan det stoppes.
- **PORT 2:** Malet og paminnelsen er opprettet og bekreftet med id-er.

### Fase 3 — Rett BLOKKERER, en per runde
Rekkefolge (mest skadelig forst): 1. E-02 · 2. E-03 · 3. E-04 · 4. E-09 · 5. E-10 · 6. E-01 · 7. E-06 · 8. E-07 · 9. E-05 · 10. E-08.
- **PORT 3:** For hver rettelse: typecheck gront, en kjort sjekk som **beviser** at hullet er lukket, og en commit som kan rulles tilbake alene.

### Fase 4 — Rett HOY
C-02/C-03 (aerlige feil i stedet for tomme lister) · W-01..W-06 (fabrikkerte data) · R-01/R-02/N-01/N-02 (org.nr og priser) · F-01..F-04 (personvern og ekte persondata) · T-01 · O-04/O-06 · B-01 · E-11, E-12, E-15..E-18 · N-04, N-05.
- **PORT 4:** Ingen HOY-funn star igjen uten at de er rettet eller bevisst utsatt med begrunnelse her.

### Fase 5 — Verifiser det som faktisk vises
- [ ] `tsc --noEmit` og `next build` gronne pa siste commit.
- [ ] Appen kjores lokalt. Konkrete strenger sjekkes i faktisk output — bade de som skal sta der og de som skal være borte (`933 607 779`, `Godkjent for Arbeidstilsynet`, `450+`, `VikingMester2026!`, `per.hansen.horten@gmail.com`).
- [ ] Hver side foran og bak apnes, skrolles og brukes pa PC og mobil, med skjermbilde.
- [ ] Endepunkter kalles med gyldig input, ugyldig input, uten innlogging og med feil rolle.
- **PORT 5:** Alle fire punktene har ra output eller skjermbilde som bevis i `docs/`.

### Fase 6 — Push og uavhengig etterkontroll
- [ ] Push til `main` **kun** med gront bygg.
- [ ] `prod-verifier` (ikke jeg) bekrefter at endringen er ute i malmljoet.
- **PORT 6:** En annen agent enn den som pushet har bekreftet malmljoet mot den nye commiten.

---

## 3. Stoppkriterier

1. Typekontroll og bygg er gronne pa siste commit.
2. Malmljoet er bekreftet oppdatert til siste commit — av noen andre enn den som pushet.
3. Hver side foran og bak er apnet, skrollet gjennom og brukt pa PC og mobil, med skjermbilde. Ingen flate viser tomme, odelagte eller fabrikerte data, og ingen knapp eller skjema gjor ingenting.
4. Ingen pastand i brukervendt tekst som ikke kan belegges med kilde.
5. Juridiske og formelle sider (personvern, vilkar, kontakt, footer) inneholder korrekte, etterprovbare fakta.
6. En tredjepart kan folge dokumentasjonen og komme til samme resultat.
7. Det finnes en vei tilbake hvis en deploy gar galt, og noen vet hvem som varsles.
8. Ingen gjenstaende funn av alvor BLOKKERER eller HOY, uten at de er rettet eller bevisst utsatt med begrunnelse.

**Stopp ogsa, og spor i stedet for a gjette, hvis:** noe krever en beslutning bare brukeren kan ta (rettigheter, domene, penger, hva som skal sies til en kunde), eller jeg har gjort alt som er mulig uten tilgang jeg ikke har.

---

## 4. Hva jeg bevisst IKKE gjor

1. **Ingen omskriving av arkitekturen.** Tenantisolasjon, impersonering og offline-koen blir vaerende; de rettes der de er utette.
2. **Ingen oppgradering av avhengigheter** rett for lansering. `package.json` rores ikke.
3. **Ingen omdoping av noe kunden ser**, ingen URL-endring uten redirect.
4. **Ingen redesign** av arbeidsstasjonen eller de offentlige sidene.
5. **Ingen caching** jeg ikke kan invalidere. Y-01/Y-02 utsettes: ytelsesarbeid, ikke lanseringskritisk, og krever maling forst.
6. **Ingen sletting av filer** (D-02, O-07, O-08) uten at jeg forst har vist at ingenting refererer til dem.
7. **Ingen migrering som rorer produksjonsdata** uten backup og torrkjoring.
8. **Ingen mork modus** (T-04) — ny funksjonalitet, ikke en rettelse.
9. **Jeg dikter ikke opp** org.nr, telefonnummer, tall eller rettigheter.

---

## 5. Hindre som krever brukeren

Gar i `docs/manuelt-arbeid.md` med BLOKKERER-merking. Jeg stopper og spor fremfor a gjette:

1. **Skal jeg pushe til `main`?** `railway.json` deployer automatisk fra `main` til produksjon. En push er en produksjonsdeploy.
2. **Riktig organisasjonsnummer.** Nettstedet oppgir `933 607 779`; revisjonen hevder `933 851 222`. Avklares mot Enhetsregisteret.
3. **Telefonnummer og forretningsadresse.** `+47 401 63 082` og `Oslo` i `StructuredData.tsx:29-34`, og hardkodet telefon i koden.
4. **Myndighetspastandene** «Godkjent for Arbeidstilsynet» og «TEK17 & BVN-verifisert» (`PublicFooter.tsx:24,28`).
5. **Markedstallene** «450+», «12 000+», «99.8%», «4.5 timer spart».
6. **Prisene.** `plans.ts` sier 690/1490/2990. StructuredData sier 1490/3490/6900. Koden fakturerer 3490/6900 (N-01). Hvilke er riktige?
7. **Samtykke til markedsforing.** Nurture-sekvensen (dag 3/7/14/21) er markedsforing og krever eget opt-in.
8. **Underleverandorer i personvernerklaringen.** DeepSeek, 1min.AI, OpenAI — databehandleravtaler og overforingsgrunnlag.
9. **Rettigheter til bildet** `public/images/vikingmester-workstation-preview.png` (149 KB, ubrukt).

---

## 6. Vei tilbake hvis en deploy gar galt

- **Kode:** hver rettelse committes isolert, sa `git revert <sha>` ruller den tilbake alene.
- **Deploy:** Railway beholder forrige vellykkede deploy og kan re-deployes fra panelet.
- **Helsesjekk — kjent felle:** `/api/health` er deploy-porten (`railway.json:8`). Nar jeg retter C-02 (la DB-feil kaste), kan helseruten begynne a svare 503 og dermed **blokkere fremtidige deploys**. Helseruten ma derfor skille «DB nede» fra «app nede» med vilje, og jeg ma verifisere 200 lokalt for push.
- **Varsling:** hvem som varsles ved feil er **ikke avklart** og star i `docs/manuelt-arbeid.md`.
