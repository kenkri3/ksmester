# Deployveiledning: KS Mester / Kamerater.no (Next.js) på Railway

Denne guiden forklarer oppsett og drift av **KS Mester / Kamerater.no** på **Railway** med PostgreSQL, Gemini 3.8 Flash og bakgrunnsautomatiseringer.

---

## 🚀 1. Hovedtjeneste (Web / Next.js)
1. **Repository:** `kenkri3/ksmester` (branch `main`).
2. **Start Command:** `npm start`
3. **Healthcheck:** `/api/health`
4. **Viktig om Cron Schedule på Web:**  
   Sett **IKKE** en Cron Schedule på selve web-tjenesten i Railway! En web-tjeneste må kjøre 24/7. Web-applikasjonen har en **innebygd bakgrunnsscheduler** (`src/instrumentation.ts` og `src/lib/server/cronScheduler.ts`) som automatisk kjører daglig status og Byggedagbok hver morgen kl. 06:00 (norsk tid, Europe/Oslo).

---

## 🤖 2. AI & Modelloppsett (Gemini 3.8 Flash)
Applikasjonen er oppgradert til Googles nyeste modell: **Gemini 3.8 Flash** (`gemini-3.8-flash`).

| Variabel | Verdi / Beskrivelse |
| :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API-nøkkel (bruker `gemini-3.8-flash` for lynrask generering og multimodal bildeanalyse) |
| `DEEP_SEEK_API` | *(Valgfri fallback)* Dersom Gemini-nøkkel ikke er satt, faller systemet automatisk tilbake på DeepSeek |

---

## 🕸️ 3. Nettskraping & FDV (100 % Direkte, Firecrawl deaktivert)
* **Firecrawl er slått helt av:** Det kreves **ingen** `FIRECRAWL_API_KEY` og det påløper **0 kr** i tredjepartskreditter.
* **Direkte native skraping:** Systemet henter produktsider direkte og ekstraherer produktdata, GTIN, NOBB og FDV via Schema.org JSON-LD og Gemini 3.8 Flash.

---

## ⏰ 4. Valgfri dedikert Railway Cron Worker
Dersom du ønsker en separat dedikert cron-arbeider i Railway i stedet for/i tillegg til den interne scheduleren:
1. Klikk **"+ New"** -> **"Service"** i samme Railway-prosjekt.
2. Velg samme repo (`ksmester`).
3. Sett **Start Command:** `npm run cron`
4. Sett **Cron Schedule:** `0 5 * * *` (kjører kl. 05:00 UTC / 06:00-07:00 norsk tid og avslutter prosessen pent).
