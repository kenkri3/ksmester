# VikingMester

Byggeplassens kraftverktøy for norske håndverkere og entreprenører — autonom HMS/KS,
TEK17-avvik, elektronisk byggedagbok og MesterAI-assistent.

Produksjon: **https://vikingmester.no** (Railway, EU West Amsterdam)

---

## Innhold

| Område | Beskrivelse |
| :--- | :--- |
| `src/app` | Next.js App Router — offentlige sider (SEO), API-ruter og autentisering |
| `src/components` | React-UI: arbeidsstasjon, MesterAI-chat, HMS/KS-moduler, mobilapp |
| `src/lib/server` | Servermotor: AI-ruting, e-post, database, GDPR, cron, integrasjoner |
| `src/services` | Klienttjenester mot API og lokal tilstand |
| `scripts/runCron.js` | Frittstående cron-worker (valgfri egen Railway-tjeneste) |

## Teknisk stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL (`pg`) ·
JWT (`jsonwebtoken`) + bcrypt · Resend/nodemailer · jsPDF

## Kom i gang

```bash
npm ci
cp .env.example .env      # fyll inn reelle verdier
npm run dev               # http://localhost:3000
```

### Nyttige kommandoer

```bash
npm run build      # produksjonsbygg
npm run lint       # = tsc --noEmit (typesjekk)
npm run cron       # kjør cron-jobber manuelt
```

## Miljøvariabler

Se [`.env.example`](.env.example) for full liste. De kritiske er:

| Variabel | Påkrevd | Formål |
| :--- | :--- | :--- |
| `DATABASE_URL` | Ja | PostgreSQL-tilkobling |
| `JWT_SECRET` | Ja (prod) | Signering av sesjonstokens. Uten den genereres en tilfeldig nøkkel per prosess, og alle logges ut ved omstart |
| `CRON_SECRET` | Anbefalt | Autentiserer cron-kall fra GitHub Actions og scheduleren |
| `INTERNAL_API_SECRET` | Anbefalt | Autentiserer interne systemkall |
| `AGENT_API` | Ja for bot/agent | Botsify-nøkkel. `/api/agent/*` og `/api/openai/v1/chat/completions` feiler lukket uten den |
| `AGENT_MCP_SECRET_KEY` | Ja for MCP | Uten den avvises **alle** kall til `/api/mcp` |
| `GEMINI_API_KEY` / `1_MIN_AI` / `DEEP_SEEK_API` | Ja for AI | AI-motorer med failover |
| `RESEND_API_KEY` | Ja for e-post | Utgående e-post |

> **Sikkerhetsregel:** endepunkter som koster penger eller eksponerer kundedata
> skal feile *lukket* når hemmeligheten mangler — aldri falle tilbake på en
> hardkodet verdi i kildekoden.

## Autentisering

- Brukere logger inn via `/api/auth/login` og får en JWT (7 dager) som lagres i
  `localStorage` under `token` og sendes som `Authorization: Bearer <token>`.
- Bruk `authHeaders()` fra `src/lib/clientAuth.ts` i klientkall.
- Server-side verifiseres tokens med `getUserFromRequest()` fra `src/lib/server/auth.ts`.
- Cron og systemkall bruker `verifyCronOrInternalSecret()` /
  `verifyInternalSecret()` (timing-safe, fail-closed).
- SuperAdmin-avgjørelse skjer med `isUserSuperAdmin()`.

## Drift

- **Deploy:** Railway bygger fra `main` (Nixpacks). Se [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md).
- **CI:** `.github/workflows/ci.yml` kjører `npm ci`, `tsc --noEmit` og `npm run build` på push og PR mot `main`.
- **Cron:** `.github/workflows/daily-audit.yml` kaller `/api/cron/daily-summary` hver morgen,
  i tillegg til appens innebygde scheduler (`src/instrumentation.ts`).
- **Helsesjekk:** `/api/health` (brukes av Railway healthcheck).

## Kjente oppfølgingspunkter

- Ingen automatisert testpakke ennå — CI dekker typesjekk og bygg, ikke atferd.
- `/api/mcp` verktøy har ikke per-bedrift-scoping; MCP-nøkkelen er en
  plattformnøkkel og bør behandles som admin-tilgang.
- Noen eksterne modellnavn i `src/lib/server/aiEngine.ts` (`gemini-3.8-flash`)
  bør verifiseres mot leverandørens modelliste.
