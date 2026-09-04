# Deployveiledning: KS Mester AI Elite (Next.js) på Railway / Render / Vercel

Denne guiden forklarer steg-for-steg hvordan du deployer **KS Mester AI Elite** bygget med **Next.js (App Router)** til **Railway** (eller Vercel/Render) med sky-PostgreSQL.

---

## 🚀 Steg 1: Push koden til GitHub

```bash
git add .
git commit -m "Migrert til Next.js 15 App Router med fullstack API-ruter"
git push origin main
```

---

## 🛤️ Steg 2: Opprett nytt prosjekt på Railway

1. Gå til [Railway Dashboard](https://railway.com/dashboard).
2. Klikk på **"New Project"**.
3. Velg **"Deploy from GitHub repo"** og velg `ksmester` repositoryet.
4. Klikk **"Deploy Now"**. Railway gjenkjenner automatisk Next.js og bygger prosjektet med `npm run build` og starter med `npm start`.

---

## 🗄️ Steg 3: Legg til PostgreSQL Database på Railway

1. I Railway-prosjektet, klikk **"+ New"** ➔ **"Database"** ➔ **"Add PostgreSQL"**.
2. Railway oppretter automatisk PostgreSQL og kobler `DATABASE_URL` direkte til web-tjenesten din.

---

## 🔑 Steg 4: Konfigurer Miljøvariabler (Environment Variables)

I Railway under **"Variables"**:

| Variabelnavn | Eksempelverdi / Forklaring |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Generer en sikker nøkkel (min 32 tegn) |
| `ADMIN_EMAIL` | `kenkri3@gmail.com` |
| `ADMIN_PASSWORD` | `Admin2026!SecurePassword` |
| `DEEP_SEEK_API` | Din DeepSeek API-nøkkel (fra platform.deepseek.com) |
| `CRON_SECRET` | Valgfri nøkkel for GitHub Actions daglig bakgrunnsrevisjon |
| `RESEND_API_KEY` | *(Valgfritt)* For sending av ekte e-poster via Resend |
| `NOBB_API_KEY` | *(Valgfritt)* For byggevareoppslag |
| `FIRECRAWL_API_KEY` | *(Valgfritt)* For nettskraping |

---

## 🌐 Steg 5: Generer Domene

Under **Settings** ➔ **Networking** ➔ **Generate Domain**, får du din live URL (f.eks. `https://ks-mester-ai.up.railway.app`).
