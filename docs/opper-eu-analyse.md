# Opper som EU-gateway for Vikingmester — undersøkelse og anbefaling

**Dato:** 2026-10-08
**Kilde:** alle priser, oppholdssteder og ZDR-egenskaper under er hentet fra Oppers egne
API-er (`GET /v3/models`, `GET /v3/audio/models`, `GET /v3/ocr/models`) og
dokumentasjonen på docs.opper.ai. Ingen tall er anslått.
**Krav fra brukeren:** alt skal være EU-basert, null lagring der det finnes, billigste
løsning som gjør jobben, norsk språk der det er relevant, og DeepSeek V4.1 Flash skal
forbli hovedmotor for tekst.

---

## 0. Det viktigste funnet først

**All tale-til-tekst i Vikingmester i dag går til Google, utenfor EU.**
Ni komponenter bruker nettleserens `webkitSpeechRecognition`
(`MesterAIChat`, `MesterWorkstation`, `Dashboard`, `VoiceSJAModal`, `ProjectTeamChat`,
`VikingChatbot`, `ProjectDetails`, `CreateProjectModal`, `MesterAICopilot`). Den API-en
sender lyden til nettleserleverandørens taletjeneste — i praksis Google — og er ikke
konfigurerbar.

Det betyr at personvernerklæringens løfte om at «all data lagres i sikre datasentre
innenfor EØS/Norge» brytes for tale, på samme måte som DeepSeek-hullet vi lukket for
tekst. Det er ikke en kostnadsoptimalisering; det er den samme type feil.

Løsningen er å flytte transkriberingen til serveren og kjøre den i EU via Opper. Det er
implementert: `POST /api/ai/transcribe`.

---

## 1. Tale-til-tekst (STT)

### Modellene som finnes i EU

Oppers audio-katalog har 20 STT-modeller. Seks har opphold i EU/EØS:

| Modell | Opphold | Leverandør | Pris per minutt | Lagring | Streaming |
| :--- | :--- | :--- | ---: | :--- | :--- |
| `berget/NbAiLab/nb-whisper-large` | EU (Sverige) | Berget (SE) | **$0.002215** | ephemeral | nei |
| `berget/KBLab/kb-whisper-large` | EU (Sverige) | Berget (SE) | $0.002215 | ephemeral | nei |
| `berget/Systran/faster-whisper-large-v3` | EU (Sverige) | Berget (SE) | $0.002215 | ephemeral | nei |
| `evroc/openai/whisper-large-v3` | EU (Sverige) | Evroc (SE) | $0.002237 | ikke oppgitt | nei |
| `evroc/openai/whisper-large-v3-turbo` | EU (Sverige) | Evroc (SE) | $0.002237 | ikke oppgitt | nei |
| `mistral/voxtral-mini-2602` | EU | Mistral (FR) | $0.0033 | ephemeral | **ja** |

Alle seks har `zdr.logging: false` og DPA tilgjengelig.

### Svaret på spørsmål 1: hvilken er best for norske håndverkere?

**`berget/NbAiLab/nb-whisper-large`.** Grunner, i rekkefølge:

1. **Den er norsk-trent.** Nasjonalbibliotekets NB-Whisper er finjustert på norsk tale.
   Ruten oppgir `languages: ["no"]` og `default_language: "no"`.
2. **Den er billigst.** $0.002215 per minutt, lik de to andre Berget-modellene, og
   billigere enn Mistral.
3. **Den ligger i EU** (Sverige), lagrer ikke innholdet (`ephemeral`,
   `zdr.logging: false`) og har DPA.

De to andre Berget-rutene er samme infrastruktur med henholdsvis svensk-trent
(`kb-whisper`) og flerspråklig Whisper (`faster-whisper-large-v3`) vekt. Den
flerspråklige er nyttig for polsk, litauisk og engelsk tale, som er relevante
brukergrupper i norsk byggebransje — derfor er den nummer to i fallback-kjeden.

**Merk om `nb-whisper`:** den har `diarize: true` i sine params, men Opper beskriver
dette som «the strongest Swedish ASR» for KBLab-modellen. For nb-whisper er
beskrivelsen «National Library of Norway's Norwegian-tuned Whisper large, EU-hosted».
Det er den eneste modellen i katalogen som er laget for norsk.

### Svaret på spørsmål 2: hva koster 1 time tale?

| Modell | 1 time | 10 timer | 100 timer |
| :--- | ---: | ---: | ---: |
| `berget/NbAiLab/nb-whisper-large` | **$0.133** | $1.33 | $13.29 |
| `mistral/voxtral-mini-2602` | $0.198 | $1.98 | $19.80 |

Én time tale med den anbefalte modellen koster altså **13 cent**. Til sammenligning
koster `openai/gpt-4o-transcribe` $0.36 per time — nesten tre ganger så mye, og den
ligger i USA med `content_storage: retained`.

### Sanntid eller opptak?

Bare `mistral/voxtral-mini-2602` støtter `stream: true` i EU. Den er 49 % dyrere, men
gir live-transkripsjon mens håndverkeren snakker, og tar opptil 3 timer per kall.

For Vikingmester er **opptak riktig valg**, ikke streaming: håndverkeren trykker på
mikrofonen, sier det han skal (typisk 5–30 sekunder), og får teksten inn i feltet.
Streaming kompliserer klienten betydelig for en gevinst som bare merkes på
langvarig tale. Legg til streaming senere hvis behovet melder seg — modellen er
allerede i katalogen.

**Teknisk grense:** synkron transkribering tar maks 25 MB lyd. Det er ca. 25 minutter
tale i webm/opus, altså langt mer enn et vanlig innsnakk. For lengre opptak finnes
`async: true` med 100 MB grense og en `status_url` å pollе.

### Endepunktet

```
POST https://api.opper.ai/v3/audio/transcriptions
Authorization: Bearer $DEEPSEEK_EU_API
Content-Type: application/json

{
  "model": "berget/NbAiLab/nb-whisper-large",
  "audio": "data:audio/webm;base64,<...>",
  "language": "no",
  "prompt": "Ordliste: NS 8406, TEK17, BVN, SJA, RUH, FDV, slukmansjett, dampsperre"
}
```

`audio` kan være `file_id`, https-URL eller data-URI. **Vikingmester bruker data-URI
med vilje:** `file_id` krever at filen lagres hos Opper, den teller mot
lagringskvoten, og den er **avvist i prosjekter med null-lagring**. Data-URI holdes i
selve kallet og lagres ingen steder.

Svaret inneholder `text`, `language`, `duration` og `usage.cost` — altså faktisk
kostnad per kall, ikke et anslag.

---

## 2. OCR for dokumenter og kvitteringer

### Modellene som finnes

Katalogen har fem OCR-modeller. Tre er i EU:

| Modell | Opphold | Leverandør | Pris per side | Lagring |
| :--- | :--- | :--- | ---: | :--- |
| `mistral/mistral-ocr-2512` (OCR 3) | **EU** | Mistral (FR) | **$0.0022** | ephemeral |
| `opper/docling-latest` (Docling OCR) | EU (Dublin) | Opper (SE) | $0.003 | none |
| `mistral/mistral-ocr-4-1` (OCR 4.1) | EU | Mistral (FR) | $0.0044 | ephemeral |

**Felle å være klar over:** de samme modellene finnes også som `mistral:global/...` og
er da **billigere** — `mistral:global/mistral-ocr-2512` koster $0.002 per side mot
EU-rutens $0.0022. Det er 10 % å spare på å bryte EU-kravet. Bruk `mistral/...`, ikke
`mistral:global/...`. Prisforskjellen er så liten at den ikke er verdt noe.

### Svaret på spørsmål 3: kan kvitteringer digitaliseres?

**Ja.** `POST /v3/ocr` tar et dokument og returnerer markdown per side. Fire kilder
støttes:

| `document.type` | Felt | Bruk |
| :--- | :--- | :--- |
| `base64` | `content`, `document_name` | Bytes du allerede har — **dette bør Vikingmester bruke** |
| `image_url` | `image_url` | Bilde på en https-URL |
| `document_url` | `document_url` | PDF eller bilde på https-URL |
| `file` | `file_id` | Fil som allerede ligger hos Opper |

`base64` er riktig valg av samme grunn som for lyd: ingen lagring hos Opper, og det
eneste som virker i et null-lagringsprosjekt.

**Norsk tekst og tabeller:** Mistral OCR 3/4.1 er dokumentert med skjemaer, tabeller og
håndskrift, og Docling gjør layout-analyse. Ingen av dem er norsk-spesifikke, men OCR
er i praksis språkagnostisk for latinsk skrift — det er ikke samme risiko som for tale,
der uttale og faguttrykk avgjør. **Dette bør likevel testes på ekte norske kvitteringer
og håndskrevne notater før det settes i produksjon.** Jeg har ikke kunnet gjøre det
uten nøkkel.

Prisen er så lav at det ikke er noe å spare på å velge en dårligere modell:
**1000 kvitteringer koster $2.20.**

---

## 3. Embeddings for søk og anbefalinger

Katalogen har 37 embeddings-modeller, hvorav 12 i EU. De relevante:

| Modell | Opphold | Dimensjoner | Pris per 1M tokens |
| :--- | :--- | ---: | ---: |
| `berget/intfloat/multilingual-e5-large` | **EU** | — | **$0.0336** |
| `berget/intfloat/multilingual-e5-large-instruct` | **EU** | — | $0.0336 |
| `azure/text-embedding-ada-002` | EU | 1536 | $0.10 |
| `mistral/mistral-embed` | **EU** | — | $0.11 |
| `evroc/multilingual-e5-large-instruct` | EU | 1024 | $0.112 |
| `evroc/qwen3-embedding-8b` | EU | 4096 | $0.112 |
| `azure/text-embedding-3-large` | EU | 3072 | $0.13 |
| `mistral/codestral-embed` | EU | — | $0.165 |
| `vertexai/gemini-embedding-2-eu` | EU | — | $0.20 — **ZDR_log=true** |

**Anbefaling: `berget/intfloat/multilingual-e5-large`.** Den er tre ganger billigere enn
Mistral og Azure, er flerspråklig (viktig for norsk + polsk + litauisk i samme indeks),
ligger i EU og logger ikke.

**Felle:** `mistral-embed` koster $0.11 per 1M tokens, altså 3,3x Berget, for samme
oppgave. Den er ikke bedre for norsk. Og `vertexai/gemini-embedding-2-eu` har
`zdr.logging: true`, altså ett av de få EU-alternativene som **ikke** har null lagring.

### Svaret på spørsmål 4: hvordan forbedrer embeddings Vikingmester?

Tre konkrete bruksområder, i nytte-rekkefølge:

1. **Semantisk søk i tjenestekatalogen og fagstoffet.** I dag er søket i
   `SmartSearch.tsx` nøkkelordbasert. Med embeddings kan «hva gjør jeg med fukt i
   kjelleren» treffe avvikshåndtering, SJA og TEK17-artikkelen selv om ingen av dem
   inneholder ordet «fukt». Dette er den største gevinsten.
2. **Anbefaling av tjenester og moduler.** En håndverker som tidligere har opprettet
   bad-prosjekter med membranavvik kan få relevante sjekklister og verktøy foreslått
   basert på likhet i oppdragsbeskrivelser.
3. **Duplikat- og likhetssjekk på avvik.** To avvik med ulik ordlyd men samme årsak
   kan grupperes, så prosjektleder ser mønsteret i stedet for 14 enkeltavvik.

Kostnaden er neglisjerbar: å indeksere 10 000 tekstbiter på 200 tokens hver er 2M
tokens = **$0.067** engangs. Løpende søk er tusendeler av en cent.

**Fallgruve:** embeddings krever en vektorlagring. Prosjektet har Postgres — bruk
`pgvector`. Alternativet er å hente alle rader og regne likhet i minnet, som er samme
feil som `items_store` allerede lider av. Ikke gjenta den.

---

## 4. Andre endepunkter

| Behov | Endepunkt | Anbefaling |
| :--- | :--- | :--- |
| Tekst-til-tale | `POST /v3/audio/speech` | `azure-speech/neural-tts` (EU, Sverige, $15/1M tegn, `content_storage: none`) — billigst i EU og lagrer ingenting |
| Sanntid tale-tale | `wss://api.opper.ai/v3/realtime` | Ikke nå. Krever WebSocket-infrastruktur og er en ny produktflate |
| Bildegenerering | `POST /v3/images` | Ikke nå. Nettsidene bruker ikke genererte bilder i dag |
| Web-søk | `POST /v3/tools/web/search` | Ja, når MesterAI skal søke. Server-side verktøy, kjøres i EU |
| Dokumentlesing | `POST /v3/files` | Nei — filer lagres og kan ikke brukes i null-lagringsprosjekt |

**TTS-merknad:** `mistral/voxtral-mini-tts-latest` koster $17.60 per 1M tegn mot Azures
$15, og Azures rute oppgir `content_storage: none` (altså ingenting lagret) mot
Mistrals `ephemeral`. Azure er både billigere og strengere her, og ligger i Sverige.
Dagens TTS-oppsett bruker `1min.ai` og `api.openai.com` — begge utenfor EU, sistnevnte
med `content_storage: retained`.

---

## 5. Kostnadsoptimalisering

### Service tiers (fra dokumentasjonen)

| Tier | Hva du får | Typisk pris |
| :--- | :--- | :--- |
| `flex` | Ledig kapasitet, kan stå i kø i minutter | 50–80 % av standard |
| `priority` | Prioritert kø eller raskere maskinvare | 1,5–2x standard |
| `ultrafast` | OpenAIs raskeste, utvalgte modeller | ca. 6x standard |
| `default` | Standard | standard |

To ting som er verdt å merke seg:

- **`flex` feiler aldri stille.** Ber du om flex og det ikke finnes kapasitet, feiler
  kallet (429/503). Det kjører **aldri** til full pris uten at du vet det.
- **Flex kan køe i 1–15 minutter.** Det passer for bakgrunnsjobber — SEO-artikler,
  nattlige sammendrag, berikelse — og **ikke** for noe en håndverker venter på.

For Vikingmester: bruk `flex` på `cron/seo-autopilot` og `cron/daily-summary`, aldri på
MesterAI-samtaler eller SJA-generering.

### Fallback-kjeder

Opper støtter en `models`-array på chat/completions: første modell som svarer vinner.
Det er samme mønster som allerede finnes i `aiEngine.ts`, men Opper gjør det på
gateway-nivå i stedet for i vår kode. En kjede som `tensorx/deepseek-v4.1-flash` →
`greenpt/deepseek-v4.1-flash` → `melious/deepseek-v4.1-flash` er allerede det vi har
implementert manuelt; den kan flyttes til en **dynamic route** hos Opper og endres uten
deploy.

### Rimeligere alternativer for enklere oppgaver

| Oppgave | I dag | Billigere EU-alternativ | Pris |
| :--- | :--- | :--- | :--- |
| Tale → tekst | Google (gratis, utenfor EU) | `berget/NbAiLab/nb-whisper-large` | $0.0022/min |
| Tekst → tale | 1min.AI / OpenAI (utenfor EU) | `azure-speech/neural-tts` | $15/1M tegn |
| Dokument → tekst | finnes ikke | `mistral/mistral-ocr-2512` | $0.0022/side |
| Søk | nøkkelord, i nettleseren | `berget/intfloat/multilingual-e5-large` | $0.034/1M tokens |

---

## 6. Arkitektur og integrasjon

### Er OpenAI-SDK-en gjenbrukbar?

Ja, for tekst og embeddings: pek `baseURL` på `https://api.opper.ai/v3/compat`. For
tale, OCR og bilder finnes ikke OpenAI-kompatible ruter — der bruker du Oppers egne
endepunkter. Vikingmester bruker i dag rå `fetch`, som er greit og unngår en ny
avhengighet.

Viktig nyanse: `https://api.opper.ai/v3/compat` er **grunn-URL-en** for SDK-en (den
legger selv på `/chat/completions`), mens rå fetch mot chat må gå til
`https://api.opper.ai/v3/compat/chat/completions`. Koden i `aiEngine.ts` bruker rå
fetch og den fulle stien — det er riktig.

### EU-only routing og null lagring

To separate brytere, og **begge må settes**:

1. **Model access-regel** — begrenser hvilke ruter som får kalles: EU-only, bestemte
   land, eller leverandører som oppfyller null-lagring. Alt som bryter regelen avvises
   i gatewayen **før** det når leverandøren. Dette er regelen som faktisk håndhever
   EU-kravet, og den fanger feil i koden vår.
2. **Data retention-regel** — styrer om Opper lagrer traces, og hvor lenge (0–30 dager).
   Standard er at Opper **ikke** lagrer prompt eller svar, bare bruksmetadata.

Fellen: å skru av tracing i Opper begrenser **ikke** leverandørene, og å velge en
leverandørpolitikk skrur **ikke** av tracing. De to må settes hver for seg.

**Praktisk konsekvens for oss:** med en model access-regel som låser prosjektet til
EU-only, ville `sference` (EØS) og `nebius` (GLOBAL) blitt avvist av gatewayen selv om
noen la dem inn i koden igjen. Det er et sikkerhetsnett under koden vår.

### Spend limits

- Én organisasjonsbudsjett per måned, pluss valgfrie tak per prosjekt. Prosjektbruk
  teller **innenfor** organisasjonsbudsjettet, ikke i tillegg.
- Kallet som treffer grensen **fullføres**; neste kall får **HTTP 402**. Faktisk
  forbruk kan derfor bli litt høyere enn taket.
- Budsjett nullstilles ved månedsskiftet i **UTC**. Å legge inn kreditt fjerner ikke en
  budsjettblokkering — hev eller fjern budsjettet.
- **Alt teller:** LLM, embeddings, bilde, tale, video og score-checks.

### Rate limits

Opper oppgir ikke faste tall i dokumentasjonen jeg fant; grensene er per konto og
modell. Det som er verdt å vite:

- Transkribering har en **størrelsesgrense**, ikke bare en ratеgrense: 25 MB synkront,
  100 MB asynkront.
- Flex-kall kan avvises med 429/503 når kapasiteten er brukt opp.
- `402` betyr at budsjettet eller saldoen er tom — `GET /v3/me` sier hvilken i
  `block_reason`.

**Anbefaling:** sett et organisasjonsbudsjett og et prosjekt-tak før tale og OCR tas i
bruk. Lyd og bilder er de dyreste kallene, og de kommer fra brukere.

---

## 7. Anbefalt arkitektur

```
                    ┌─────────────────────────────────────────┐
   Håndverker       │  Nettleser / mobil                      │
   snakker inn  ───►│  MediaRecorder (ikke webkitSpeech)      │
                    └────────────────┬────────────────────────┘
                                     │ POST /api/ai/transcribe (base64 lyd)
                                     ▼
                    ┌─────────────────────────────────────────┐
                    │  Vikingmester (Node/Next, Railway)      │
                    │  auth → rate limit → størrelsesvakt     │
                    └────────────────┬────────────────────────┘
                                     │ DEEPSEEK_EU_API
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │  Opper — EU-gateway (AWS Stockholm)                    │
        │  Model access: EU-only   ·   Retention: 0 dager       │
        └───┬──────────────┬──────────────┬──────────────┬───────┘
            │              │              │              │
      tekst │        tale  │        OCR   │      embeddings
            ▼              ▼              ▼              ▼
    DeepSeek V4.1    nb-whisper    mistral-ocr    multilingual-e5
    Flash (EU-ruter) (Sverige)     (Frankrike)    (Sverige)
```

| Behov | Modell | Endepunkt |
| :--- | :--- | :--- |
| Tekst, rådgivning, SJA, kalkyle | `tensorx/greenpt/melious-deepseek-v4.1-flash` | `POST /v3/compat/chat/completions` |
| Bildeanalyse (TEK17/BVN) | samme, multimodal | `POST /v3/compat/chat/completions` |
| Tale → tekst | `berget/NbAiLab/nb-whisper-large` | `POST /v3/audio/transcriptions` |
| Tekst → tale | `azure-speech/neural-tts` | `POST /v3/audio/speech` |
| Dokument → tekst | `mistral/mistral-ocr-2512` | `POST /v3/ocr` |
| Semantisk søk | `berget/intfloat/multilingual-e5-large` | `POST /v3/compat/embeddings` |
| Nettsøk for agenten | — | `POST /v3/tools/web/search` |

---

## 8. Estimert kostnad per måned

Forutsetninger, satt eksplisitt så de kan justeres:

- 150 aktive håndverkere
- 20 taleinnsnakk per bruker per måned, 25 sekunder hver = 150 × 20 × 25 s = **20,8 timer lyd**
- 25 000 tekstkall per måned, 2 500 tokens inn og 600 ut
- 800 kvitteringer/bilder til OCR per måned
- 200 000 søk mot embeddings, 50 tokens per søk
- Engangs indeksering av 10 000 tekstbiter (200 tokens) = 2M tokens

| Post | Mengde | Pris | Kostnad |
| :--- | :--- | :--- | ---: |
| Tekst inn | 62,5M tokens | $0.50/1M | $31.25 |
| Tekst ut | 15M tokens | $1.50/1M | $22.50 |
| Tale → tekst | 1 248 min | $0.002215/min | **$2.76** |
| OCR | 800 sider | $0.0022/side | **$1.76** |
| Embeddings, løpende | 10M tokens | $0.0336/1M | $0.34 |
| Embeddings, engangs | 2M tokens | $0.0336/1M | $0.07 |
| Tekst → tale (1 000 opplesninger à 800 tegn) | 0,8M tegn | $15/1M | $12.00 |
| **Sum** | | | **ca. $70,68** |

**Tale, OCR og embeddings utgjør til sammen 6,9 % av kostnaden** ($4.86 av $70.68).
Tekst er og blir den dominerende posten. Det betyr at:

- Det er **ikke** verdt å kompromisse på EU-kravet for å spare på tale eller OCR.
- Den reelle kostnadsoptimaliseringen ligger i teksten: `flex`-tier på
  bakgrunnsjobber (SEO-artikler, nattlige sammendrag) kan kutte 20–50 % av nettopp de
  kallene, og kortere systemprompter og caching sparer mer enn alle spesialmodellene
  til sammen.

---

## 9. Fallgruver

1. **Bart modellnavn hos Opper er ikke stedfestet.** `deepseek-v4.1-flash` alene er
   samlet på tvers av alle regioner og kan havne i USA. Bruk provider-kvalifisert id.
2. **`:global`-varianten er billigere og utenfor EU.** `mistral:global/mistral-ocr-2512`
   koster $0.002 mot EU-rutens $0.0022. Fristelsen er liten, men den finnes.
3. **`file_id` virker ikke i null-lagringsprosjekt.** Bruk data-URI for lyd og OCR.
4. **Tracing av og leverandørpolitikk er to brytere.** Begge må settes.
5. **Spend limit-blokkering (402) forsvinner ikke av å legge inn kreditt.** Hev taket.
6. **Flex kan køe i 15 minutter.** Aldri foran en bruker som venter.
7. **EU-ruter har ikke alltid ZDR.** `vertexai/gemini-embedding-2-eu` er i EU men har
   `zdr.logging: true`. Sjekk `compliance` per rute, ikke bare `region`.
8. **`diarize: true` avvises på modeller uten støtte** — 400, ikke stille ignorert.
9. **Oppers synkrongrense er 25 MB dekodet lyd**, og base64 gjør kroppen ~33 % større.
   Regn med grensen på den dekodede størrelsen.

---

## 10. Hva som er implementert nå

| Endring | Fil |
| :--- | :--- |
| `getOpperKey()`, menneskelig navngitt og dokumentert | `src/lib/server/aiEngine.ts` |
| `transcribeAudioEu()` med EU-fallback-kjede og fail-closed | `src/lib/server/aiEngine.ts` |
| `OPPER_STT_MODELS`, `OPPER_STT_MAX_BYTES`, `OPPER_V3_BASE` | `src/lib/server/aiEngine.ts` |
| `POST /api/ai/transcribe` — auth, rate limit, størrelses- og formatvakt | `src/app/api/ai/transcribe/route.ts` |
| `DEEPSEEK_EU_API` dokumentert for tale og OCR | `.env.example` |

**Ikke gjort, og hvorfor:**

- **Klientene er ikke flyttet.** De ni komponentene bruker fortsatt
  `webkitSpeechRecognition`. Å bytte dem til `MediaRecorder` + det nye endepunktet er
  en UI-endring i ni filer som bør gjøres og testes ett sted om gangen, ikke i samme
  runde som infrastrukturen. Endepunktet er klart til å tas i bruk.
- **OCR-ruten er ikke bygget.** Endepunktet og modellvalget er dokumentert over; ruten
  bør bygges når behovet er avklart, siden den krever en opplastingsflyt i UI-et.
- **Embeddings er ikke bygget.** Krever `pgvector` og en indekseringsjobb. Å bygge
  vektorsøk før `items_store`-skjemaet er ryddet ville gjenta samme feil.

---

## 11. Det jeg ikke kan verifisere uten nøkkelen

Den ekte `DEEPSEEK_EU_API` ligger bare i Railway. Verken Railway-CLI-en eller `gh` er
innlogget på maskinen jeg jobber fra, og nøkkelen er ikke i miljøet lokalt. Derfor:

1. At nøkkelen er gyldig og har kreditt.
2. At prosjektet bak nøkkelen har tilgang til de tre EU-rutene for DeepSeek, og til
   `berget/*`. En Model access-regel kan gi 403.
3. **Transkripsjonskvaliteten på norsk fagspråk.** At `nb-whisper-large` er norsk-trent
   er dokumentert, men hvordan den takler «slukmansjett», «dampsperre»,
   «K-block» og dialekter er ikke testet. **Dette må prøves på ekte opptak før
   klientene bygges om.**
4. OCR-presisjon på norske kvitteringer og håndskrift.

Slik lukkes det: `railway login` lokalt, så kan jeg kalle endepunktene med ekte nøkkel
og måle. Alternativt: ta ett opptak i produksjon etter at `/api/ai/transcribe` er
deployet og se hva som kommer tilbake.

---

## 12. Rutingen etter brukerens presisering: 1min.AI for alt utenom GDPR

Brukeren presiserte: **1min.AI skal være leverandør for alt som ikke er
GDPR-flagget**, og DeepSeek direkte skal være reserve — ikke primær. Rekkefølgen i
`aiEngine.ts` er derfor snudd i CASE 3 (all tekst, chat, kalkyle, SJA, byggdagbok):

| Sti | Før | Nå |
| :--- | :--- | :--- |
| GDPR-flagget | Opper EU → 1min → Gemini EU | Uendret |
| Nettsøk | 1min → Gemini Grounding | Uendret |
| **All annen tekst** | **DeepSeek direkte → 1min → Gemini** | **1min.AI → DeepSeek direkte → Gemini** |
| Bildeanalyse | 1min → Gemini | Uendret |

GDPR-grenen er bevisst **ikke** rørt. Personopplysninger skal fortsatt til Opper EU
først, og en statisk sjekk (`RUTING` i `security-check-high.mjs`) feiler hvis noen
bytter om den.

**Modellvalget på 1min.AI:** deres kompatible katalog har ikke `deepseek-v4.1-flash`.
Den har `deepseek-flash` og `deepseek-v4-pro`. Koden bruker derfor den eksisterende
`ONE_MIN_AI_*`-rutingen (gpt-4o-mini for samtale, o3-mini for juridisk, gpt-4o for
SEO) og faller tilbake til 1min.AIs egen modelliste ved behov. Det er **uverifisert**
om `deepseek-flash` er samme modell som V4.1 Flash — det må bekreftes mot
`GET https://api.1min.ai/openai/v1/models`.

**OpenAI-moderering:** 1min.AIs dokumentasjon sier at teksten sendes til OpenAI for
moderering uansett hvilken modell som velges. Brukeren har akseptert dette for
ikke-GDPR-innhold.

### 12.1 Feilen som ble funnet underveis, og som rammet hver eneste chat

Da rutingen skulle bevises, viste loggen at **et helt vanlig spørsmål uten
personopplysninger** («Hva sier NS 8406 om fristforlengelse ved varsling?») likevel
gikk til GDPR-stien. Diagnose i `agent/chat` ga svaret:

```
containsPII=true  nokkel=null  contextPii=false
[DIAG2] treff: epost="mottaker@epost.no"
```

`mottaker@epost.no` er en **plassholder i systemprompten**, ikke en kundeadresse.
`containsPIIOrGdprData` regnet enhver e-post som personopplysning, og unntaket dekket
bare `hei@vikingmester.no`. Konsekvensen var at **hver enkelt chat-melding ble flagget
som GDPR-sensitiv** og rutet til EU-kjeden med Opper og 1min/Gemini — også de helt
vanlige fagspørsmålene. Det er dyrere, tregere og feil.

Rettet i `privacyShield.ts`: e-postunntaket er nå en liste over plattformens egne
adresser og domener (`vikingmester.no`, `vikingnet.no`, `aichatnorge.no`, `example.*`,
`epost.no`), og bare adresser **utenfor** den listen flagger. En ekte kundeadresse
skrevet av brukeren flagger fortsatt, for den står ikke i listen.

**Verifisert ende-til-ende etter rettelsen:**

| Test | Resultat |
| :--- | :--- |
| Vanlig spørsmål, ingen PII | Gikk til 1min.AI. **Null** `GDPR EU]`-linjer, null Opper-kall |
| Spørsmål mot prosjekt med kundenavn og adresse | Gikk til Opper EU-rutene (tensorx → greenpt → melious), deretter 1min og Gemini EU |
| `api.deepseek.com` i begge testene | **0 treff** |

Det siste er verdt å merke: **DeepSeek i Kina ble ikke kontaktet i noen av testene.**
Med 1min.AI først i CASE 3 er `DEEPSEEK_API_KEY` nå bare et reserveben som ikke brukes
så lenge 1min.AI svarer.
