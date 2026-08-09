# Deployveiledning: KS Mester AI Elite på Railway

Denne guiden forklarer steg-for-steg hvordan du deployer KS Mester AI Elite fra GitHub direkte til **Railway** (https://railway.com / https://railway.app) med automatisk PostgreSQL-database.

---

## 🚀 Steg 1: Push koden til GitHub

Dersom prosjektet ikke allerede ligger på GitHub:
1. Opprett et nytt repository på GitHub (f.eks. `ks-mester-ai`).
2. Push kildekoden til GitHub:
   ```bash
   git init
   git add .
   git commit -m "Klar for Railway produksjonsdeployment"
   git branch -M main
   git remote add origin https://github.com/DITT_BRUKERNAVN/ks-mester-ai.git
   git push -u origin main
   ```

---

## 🛤️ Steg 2: Opprett nytt prosjekt på Railway

1. Gå til [Railway Dashboard](https://railway.com/dashboard).
2. Klikk på **"New Project"**.
3. Velg **"Deploy from GitHub repo"**.
4. Velg ditt repository (`ks-mester-ai`).
5. Klikk **"Deploy Now"**.

---

## 🗄️ Steg 3: Legg til PostgreSQL Database på Railway

1. Inne i ditt Railway-prosjekt dashboard, klikk **"+ New"** (eller trykk `Cmd+K` / `Ctrl+K`).
2. Velg **"Database"** ➔ **"Add PostgreSQL"**.
3. Railway oppretter automatisk en sky-PostgreSQL database for deg.
4. Railway kobler automatisk miljøvariabelen `DATABASE_URL` til web-tjenesten din!

---

## 🔑 Steg 4: Konfigurer Miljøvariabler (Environment Variables)

I Railway dashboardet, klikk på din web-tjeneste ➔ **"Variables"** fanen.

Legg til følgende variabler:

| Variabelnavn | Eksempelverdi / Forklaring |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` *(Railway setter vanligvis denne automatisk)* |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` *(Automatisk koblet fra PostgreSQL)* |
| `JWT_SECRET` | Generer en sikker nøkkel (f.eks. `fe89a12c8e90f23d8c471a2b34...`) |
| `GEMINI_API_KEY` | Din Google Gemini API-nøkkel |
| `NOBB_API_KEY` | *(Valgfritt)* For oppslag av byggevarer |
| `FIRECRAWL_API_KEY` | *(Valgfritt)* For nettskraping |

---

## 🌐 Steg 5: Generer Offentlig Domene (Public URL)

1. Gå til web-tjenesten din i Railway.
2. Klikk på **"Settings"** ➔ **"Networking"** ➔ **"Generate Domain"**.
3. Railway tildeler en URL som f.eks. `https://ks-mester-ai-production.up.railway.app`.

---

## ✨ Ferdig!

Hver gang du pusher nye endringer til `main`-bransjen på GitHub, vil Railway automatisk bygge og deploye den oppdaterte versjonen uten nedetid.
