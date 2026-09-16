# Deployveiledning: VikingMester.no (Next.js) på Railway

Denne guiden forklarer oppsett og drift av **VikingMester.no** på **Railway** med PostgreSQL, Gemini 3.8 Flash og bakgrunnsautomatiseringer.

---

## 🚀 1. Hovedtjeneste (Web / Next.js)
1. **Repository:** `kenkri3/VikingMester` (branch `main`).
2. **Start Command:** `npm start`
3. **Healthcheck:** `/api/health`
4. **Viktig om Cron Schedule på Web:**  
   Sett **IKKE** en Cron Schedule på selve web-tjenesten i Railway! En web-tjeneste må kjøre 24/7. Web-applikasjonen har en **innebygd bakgrunnsscheduler** (`src/instrumentation.ts` og `src/lib/server/cronScheduler.ts`) som automatisk kjører daglig status og Byggedagbok hver morgen kl. 06:00 (norsk tid, Europe/Oslo).

---

## 🤖 2. AI & Modelloppsett (1min.AI som hovedmotor, Gemini som backup)
Applikasjonen bruker nå **1min.AI** som primær AI-motor for å gi tilgang til bransjeledende modeller fra OpenAI, Anthropic og Google med minimal token- og kredittkostnad, kombinert med automatisk sanntids web-søk og sikkerhetsbackup.

| Variabel | Status | Beskrivelse / Modellvalg |
| :--- | :--- | :--- |
| `1_MIN_AI` | **Hovedmotor** | 1min.AI API-nøkkel. Ruter automatisk oppgaver:<br>• **Standard/Cockpit/Chat:** `gpt-4o-mini` (lavest tokenkost, lynrask)<br>• **Juridisk/Endringsordre (NS 8406):** `claude-3-5-sonnet` (maksimal juridisk presisjon)<br>• **SJA & FDV-analyse:** `gemini-2.5-flash` / `gpt-4o-mini`<br>• **Sanntids web-søk:** Live web search aktivert ved behov |
| `GEMINI_API_KEY` | **Sikkerhetsbackup** | Google Gemini API-nøkkel (`gemini-2.5-flash`). Trer automatisk i kraft om 1min.AI er utilgjengelig eller mangler kreditter. Sikrer også 100% uavbrutt TEK17 bildescanning. |
| `DEEP_SEEK_API` | *(Tertiær backup)* | Ekstra reservemotor (`deepseek-chat`) dersom verken 1min.AI eller Gemini svarer. |

---

## 🕸️ 3. Nettskraping & FDV (100 % Direkte, Firecrawl deaktivert)
* **Firecrawl er slått helt av:** Det kreves **ingen** `FIRECRAWL_API_KEY` og det påløper **0 kr** i tredjepartskreditter.
* **Direkte native skraping:** Systemet henter produktsider direkte og ekstraherer produktdata, GTIN, NOBB og FDV via Schema.org JSON-LD og Gemini 3.8 Flash.

---

## ⏰ 4. Valgfri dedikert Railway Cron Worker
Dersom du ønsker en separat dedikert cron-arbeider i Railway i stedet for/i tillegg til den interne scheduleren:
1. Klikk **"+ New"** -> **"Service"** i samme Railway-prosjekt.
2. Velg samme repo (`VikingMester`).
3. Sett **Start Command:** `npm run cron`
4. Sett **Cron Schedule:** `0 5 * * *` (kjører kl. 05:00 UTC / 06:00-07:00 norsk tid og avslutter prosessen pent).
