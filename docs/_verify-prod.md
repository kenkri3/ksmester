# Production Verification — vikingmester.no

**Verifier:** prod-verifier (independent)
**Date of checks:** 2026-10-05, ~09:04–09:12 Europe/Oslo (07:04–07:12 UTC)
**Method:** read-only. No repo files modified, no mutating git commands, no credentials used, no state-changing requests.
**Target:** https://vikingmester.no (Railway, `Server: railway-hikari`, `x-railway-edge: osl1`)

---

## HEADLINE FINDINGS

1. **Live deployment is healthy.** `GET /api/health` → **HTTP 200** with `{"status":"ok", ... "databaseHealthy":true,"renderReady":true}`.
2. **The live commit IS repository HEAD `f21f0323eaf8a578697261b57efc00d74416ec71`.** Confirmed via the GitHub Deployments API: Railway deployment `6829604402` for that exact SHA, state `success` at `2026-10-03T15:43:14Z`; the preceding deployment (SHA `d0382eb…`) was marked `inactive` at `2026-10-03T15:43:17Z`.
3. **CI is green for the push, but the scheduled job on the same SHA fails.** `CI Test & Build` on `f21f032…` → `conclusion=success`. `Daglig KS & HMS Bakgrunnskjøring (Token-sparing)` on the same SHA → `conclusion=failure` (job `daily_audit`, step `Kjør Daglig Sammendrag og HMS-revisjon`).
4. **REFUTED — the org number displayed on the live site does not exist.** Every legal/contact page prints `Org.nr: 933 607 779 MVA`, but `https://data.brreg.no/enhetsregisteret/api/enheter/933607779` returns **HTTP 404**, and the number fails the Norwegian mod-11 checksum (computed check digit `1`, actual last digit `9`). The real entity **"AI CHAT NORGE AS" is org.nr `933 851 222`** (Brreg 200, valid checksum).
5. **The home page `/` is a client-side SPA shell.** All 8 marketing claim strings are **ABSENT from the returned HTML** (3 independent fetches, identical 22 962-byte body containing only a loading spinner). They do exist in the client JS chunks (`9747-…js`, `2226-…js`), so they render only for JS-executing clients.
6. **`https://vikingmester.no/login` returns HTTP 404** — there is no `/login` route.

---

## Q1. What is currently deployed? — `GET /api/health`

**Command**
```powershell
$r = Invoke-WebRequest -Uri "https://vikingmester.no/api/health" -Method GET -UseBasicParsing -TimeoutSec 60
"STATUS: $($r.StatusCode)"; $r.Content
```

**Raw output (status)**
```
STATUS: 200
```

**Raw output (body, verbatim)**
```json
{"status":"ok","framework":"next.js","database":"postgresql","databaseHealthy":true,"renderReady":true,"hosting":"Railway","region":"EU West (Amsterdam, Netherlands)","nobbConfigured":false,"discordConfigured":false,"slackConfigured":false,"teamsConfigured":false,"resendConfigured":true,"scraperActive":true,"firecrawlConfigured":false,"nativeScraper":true,"oneMinAiConfigured":true,"geminiConfigured":true,"aiEngine":"DeepSeek V3 (Primary)","aiModel":"deepseek-chat / deepseek-reasoner (Tekst) + gemini-2.5-flash (Vision)","timestamp":"2026-10-05T07:04:57.124Z"}
```

**Selected response headers**
```
server: railway-hikari
x-railway-request-id: 1KCsBoccRPmRw1VY8Hk9cQ
x-railway-edge: osl1
x-hikari-trace: osl1.sq22
content-type: application/json
strict-transport-security: max-age=63072000; includeSubDomains; preload
```

Note: `timestamp` is request-generated (matches the `Date` header), not a build marker. `nobbConfigured:false` while `/api/nobb/*` routes exist in the repo — flagged for the Lead, not adjudicated here.

**Verdict: VERIFIED** — HTTP 200, `status:"ok"`, `databaseHealthy:true`, `renderReady:true` returned by the live host.

---

## Q2. Which git commit is live? (build / commit markers)

**Commands**
```powershell
$r = Invoke-WebRequest -Uri "https://vikingmester.no/" -Method GET -UseBasicParsing -TimeoutSec 60
$r.Headers.GetEnumerator() | ForEach-Object { "$($_.Key): $($_.Value)" }
# searched for x-vercel-*, x-railway-build, NEXT_PUBLIC_*, build id, commit sha
```

**Raw output (headers, trimmed)**
```
x-nextjs-cache: HIT
x-nextjs-prerender: 1,1
x-nextjs-stale-time: 300
X-Powered-By: Next.js
Server: railway-hikari
Cache-Control: s-maxage=31536000
ETag: "r6sb6h4kpuhpu"
Date: Mon, 05 Oct 2026 07:05:01 GMT
```
There is **no** `x-vercel-*` header (the property is on Railway, not Vercel), **no** commit header, **no** build-id header, and **no** `NEXT_PUBLIC_*` value in headers.

**Only build marker in the HTML** — the Next.js build-id comment on line 1:
```html
<!DOCTYPE html><!--xnc6awgn_DaKefRDg2M6C--><html lang="nb">
```
`xnc6awgn_DaKefRDg2M6C` is a build-time random id; it cannot be mapped to a commit without the build logs.

**Build timestamp recovered indirectly (sitemap).** `src/app/sitemap.ts` computes `const now = new Date()`; the live sitemap returns a frozen value across fetches, i.e. it is the prerendered build artifact:
```powershell
1..2 | ForEach-Object { (Invoke-WebRequest "https://vikingmester.no/sitemap.xml" -UseBasicParsing).Content }
# first <lastmod> extracted from each response
```
```
2026-10-03T15:42:22.016Z
2026-10-03T15:42:22.016Z      # identical on both fetches; response header: x-nextjs-cache: HIT
```
That timestamp falls inside the f21f032 Railway deploy window (in_progress `15:41:09Z` → success `15:43:14Z`).

**Verdict: REFUTED for "a commit/build marker is exposed by the app"** (there is none), **VERIFIED for the live commit** — the SHA was established from the GitHub Deployments API (Q3), not from an app marker. Anyone relying on a response header to identify the deployed commit will find nothing.

---

## Q3. Is repository HEAD `f21f032…` live? + recent commits & CI

**Commands**
```powershell
git rev-parse HEAD
git rev-parse origin/main
git log -3 --format="%H | %ci | %s"
# GitHub REST (read-only, unauthenticated):
#   /repos/kenkri3/ksmester/commits?per_page=5
#   /repos/kenkri3/ksmester/actions/runs?per_page=5
#   /repos/kenkri3/ksmester/deployments?per_page=5
#   /repos/kenkri3/ksmester/deployments/6829604402/statuses
```

**Local git state**
```
$ git rev-parse HEAD
f21f0323eaf8a578697261b57efc00d74416ec71
$ git rev-parse --abbrev-ref HEAD
main
$ git rev-parse origin/main
f21f0323eaf8a578697261b57efc00d74416ec71
$ git status --porcelain
?? docs/            # untracked only; no tracked-file modifications
```
Local HEAD == origin/main == `f21f0323eaf8a578697261b57efc00d74416ec71`.

**5 most recent commits on main** (`/commits?per_page=5`)
```
f21f0323eaf8a578697261b57efc00d74416ec71 | 2026-10-03T15:40:44Z | fix(vaer): geokod prosjektnavn som "Nybygg Aalesund" og valider treffet
d0382eb84bf963b8305c26b616b2481f9eae611f | 2026-10-03T15:32:16Z | fix(vaer): geokod ukjente prosjektadresser i stedet for aa gjette Oslo
faf19002a79bd97fb87a19f50acf04c0a06c2b27 | 2026-10-03T15:22:43Z | fix(mesterai): reelle data i lukkesperre og dagsrapport
6485a630004a748c5790fa86becdafc3574146ae | 2026-10-03T15:06:54Z | fix(mesterai): spoersmaalsvakt, aerlig prosjektsammenslaaing og strommende svar
f5cfbb6e39bd6b6b0637dafa9b5e2aade3240725 | 2026-10-03T14:50:23Z | fix(mesterai): fyldige svar - fjern ordgrense, ekte multi-turn og aerlig feilhandtering
```

**CI conclusion per run** (`/actions/runs?per_page=5`, `total_count: 209`)
```
Daglig KS & HMS Bakgrunnskjøring (Token-sparing) | f21f032… | completed | 2026-10-04T10:48:34Z | main | conclusion=failure | event=schedule
CI Test & Build                                   | f21f032… | completed | 2026-10-03T15:41:06Z | main | conclusion=success | event=push
CI Test & Build                                   | d0382eb… | completed | 2026-10-03T15:32:24Z | main | conclusion=success | event=push
CI Test & Build                                   | faf1900… | completed | 2026-10-03T15:23:38Z | main | conclusion=success | event=push
CI Test & Build                                   | 6485a63… | completed | 2026-10-03T15:07:36Z | main | conclusion=success | event=push
```
Failure detail for run `37196566087` (`/actions/runs/37196566087/jobs`):
```
JOB: daily_audit | status=completed | conclusion=failure
  STEP: Kjør Daglig Sammendrag og HMS-revisjon => failure
```
The scheduled job is the only red run in the 5-run window, and it is a *scheduled* (not push) workflow, so it does not block deploys. **Pushes do produce both a CI run and a Railway deployment** (below), so auto-deploy is working.

**Deploy marker vs SHA** (`/deployments?per_page=5`, creator `railway-app[bot]`, environment `Vikingmester / production`)
```
id 6829604402 | sha=f21f0323eaf8a578697261b57efc00d74416ec71 | created 2026-10-03T15:41:09Z | updated 2026-10-03T15:43:14Z | description "Deployed to Railway"
id 6829511198 | sha=d0382eb84bf963b8305c26b616b2481f9eae611f | created 2026-10-03T15:32:26Z | updated 2026-10-03T15:43:17Z
id 6829418217 | sha=faf19002a79bd97fb87a19f50acf04c0a06c2b27 | created 2026-10-03T15:23:40Z | updated 2026-10-03T15:34:23Z
id 6829245463 | sha=6485a630004a748c5790fa86becdafc3574146ae | created 2026-10-03T15:07:39Z | updated 2026-10-03T15:25:40Z
id 6829057877 | sha=f5cfbb6e39bd6b6b0637dafa9b5e2aade3240725 | created 2026-10-03T14:51:06Z | updated 2026-10-03T15:10:31Z
```

**Deployment statuses** (`/deployments/<id>/statuses`)
```
deployment 6829604402 (sha f21f032…):
  state=success      created=2026-10-03T15:43:14Z
  state=in_progress  created=2026-10-03T15:41:09Z
deployment 6829511198 (sha d0382eb…):
  state=inactive     created=2026-10-03T15:43:17Z
  state=success      created=2026-10-03T15:34:21Z
  state=in_progress  created=2026-10-03T15:32:26Z
```

**Interpretation (evidence chain, not a guess):**
- The newest Railway production deployment is for exactly `f21f0323eaf8a578697261b57efc00d74416ec71`, and it reached `success` at `15:43:14Z`.
- The previous deployment (`d0382eb…`) was flipped to `inactive` 3 seconds later (`15:43:17Z`) — Railway only retires a deployment when a newer one takes over.
- The build-time-frozen `sitemap.xml` `lastmod` (`2026-10-03T15:42:22.016Z`) sits inside that exact deploy window and after the `f21f032` push (`15:40:44Z`) — independent corroboration that the *serving* artifact was built from `f21f032`, not from an older commit.
- No commits or deployments after `2026-10-03T15:43Z` exist on main, so nothing has superseded it.

**Verdict: VERIFIED** — repository HEAD `f21f0323eaf8a578697261b57efc00d74416ec71` is the live production deployment. CI conclusion for that push: **success** (`CI Test & Build`); the *scheduled* `Daglig KS & HMS Bakgrunnskjøring` workflow on the same SHA is **failure**.

---

## Q4. Home page `/` — presence of the 8 exact strings

**Command**
```powershell
$h = (Invoke-WebRequest -Uri "https://vikingmester.no/" -UseBasicParsing -TimeoutSec 60).Content
foreach ($s in @('933 607 779','933851222','933 851 222','Godkjent for Arbeidstilsynet','TEK17 & BVN-verifisert','450+','12 000+','99.8%')) {
  if ($h.Contains($s)) { "PRESENT :: [$s]" } else { "ABSENT :: [$s]" } }
```

**Raw output (run 3×: plain, `?cb=1`+no-cache, and Googlebot UA — all identical, all `HTTP 200`, `LEN 22962`, `x-nextjs-cache: HIT`)**
```
ABSENT :: [933 607 779]
ABSENT :: [933851222]
ABSENT :: [933 851 222]
ABSENT :: [Godkjent for Arbeidstilsynet]
ABSENT :: [TEK17 & BVN-verifisert]
ABSENT :: [450+]
ABSENT :: [12 000+]
ABSENT :: [99.8%]
```
Pattern counts over the whole 22 962-byte document: `933`→0, `Arbeidstilsynet`→0, `BVN`→0, `450`→0, `12 000`→0, `99.8`→0, `TEK17`→12 (all in metadata/RSC, none in body copy).

**Why: the returned HTML is a loading shell, not the page.** Body region, verbatim:
```html
<body class="bg-white text-navy-900 antialiased selection:bg-electric-500/20 selection:text-electric-700 min-h-screen flex flex-col">
<div hidden=""><!--$--><!--/$--></div>
<div class="min-h-screen bg-neutral-50 flex items-center justify-center">
  <div class="w-12 h-12 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin"></div>
</div><!--$--><!--/$-->
<section aria-label="Notifications alt+T" tabindex="-1" aria-live="polite" aria-relevant="additions text" aria-atomic="false"></section>
```
Root cause confirmed in source (`src/app/page.tsx`):
```tsx
'use client';
import App from '@/src/App';
export default function Page() { return <App />; }
```
The `/` route is a client component wrapping a client-side SPA (`src/App.tsx`, `'use client'`, `Suspense fallback={<ModuleLoader />}`), so the prerendered artifact cached by the CDN (`x-nextjs-prerender: 1,1`, `Cache-Control: s-maxage=31536000`) is the spinner.

**Where the strings actually live — client JS chunks (proof they are on the site after hydration).** Fetched all 19 `/_next/static/**/*.js` files referenced by the HTML and grepped:
```
/_next/static/chunks/9747-0d8b23f0d0d00cc6.js len=7865   hits=[933 607 779; Godkjent for Arbeidstilsynet; BVN-verifisert]
/_next/static/chunks/2226-22bb25050ef0610d.js len=26180  hits=[12 000+; 99.8%; 450+]
(all other 17 chunks: no hits)
```
Surrounding snippets (max 200 chars):
```
PRESENT [933 607 779] :: ...-400",children:"AIChat Norge AS / Vikingnet"}),(0,r.jsx)("p",{children:"Org.nr: 933 607 779 MVA"})]})]})]})]}),(0,r.jsxs)("div",{className:"pt-8 border-t border-navy-900 flex flex-col sm:flex-row item
PRESENT [Godkjent for Arbeidstilsynet] :: ...,r.jsx)(n.A,{size:14,className:"text-emerald-400"}),(0,r.jsx)("span",{children:"Godkjent for Arbeidstilsynet"})]}),(0,r.jsxs)("div",{className:"flex items-center gap-1.5 bg-navy-900/80 px-3 py-1.5 rou
PRESENT [TEK17 & BVN-verifisert] :: (0,r.jsx)(c.A,{size:14,className:"text-amber-400"}),(0,r.jsx)("span",{children:"TEK17 & BVN-verifisert"})]})]})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("h4",{className:"text-xs font-bold uppercase tr
PRESENT [450+] :: ",{className:"text-3xl sm:text-4xl font-black text-electric-400 mb-1",children:"450+"}),(0,s.jsx)("div",{className:"text-xs text-slate-300 font-bold uppercase tracking-wider",children:"Aktive h\xe5ndv
PRESENT [12 000+] :: ",{className:"text-3xl sm:text-4xl font-black text-electric-400 mb-1",children:"12 000+"}),(0,s.jsx)("div",{className:"text-xs text-slate-300 font-bold uppercase tracking-wider",children:"SJA-analyser
PRESENT [99.8%] :: ",{className:"text-3xl sm:text-4xl font-black text-electric-400 mb-1",children:"99.8%"}),(0,s.jsx)("div",{className:"text-xs text-slate-300 font-bold uppercase tracking-wider",children:"Godkjent i til
```
The two alternate org forms `933851222` and `933 851 222` appear **nowhere** — not in the HTML, not in any of the 19 chunks.

**Verdict: VERIFIED for the literal question — all 8 strings are ABSENT from the returned HTML of `/`.** Important caveat for the Lead: absence here is *not* "the claims were removed from the product"; 6 of the 8 strings (plus `933 607 779`) are shipped in client-side JS and only appear in a JS-executing browser. For any non-JS crawler (and for `view-source`, social/link preview cards, and text-based auditing), the home page advertises none of these claims — the entire landing page is invisible to crawlers. This is compounded by `Disallow: /_next/` in robots.txt (Q6), which prevents crawlers from even fetching the chunks that contain the content.

---

## Q5. Footer / legal pages — status, `<h1>`, org number

**Command**
```powershell
foreach ($u in @("https://vikingmester.no/kontakt","https://vikingmester.no/om-oss",
                 "https://vikingmester.no/personvern","https://vikingmester.no/vilkar")) {
  $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 60
  "STATUS: $($r.StatusCode)  LEN: $($r.Content.Length)"
  [regex]::Matches($r.Content,'<h1[^>]*>(.*?)</h1>','Singleline')
  $r.Content.Contains('933 607 779')
}
```

**Raw output**
```
=== https://vikingmester.no/kontakt ===
STATUS: 200  LEN: 78063
H1: [Snakk med oss om KS &amp; HMS]
ORG '933 607 779': PRESENT :: ...old text-sm text-white">Oslo / Fredrikstad, Norge</div><div class="text-[11px] text-slate-400">AIChat Norge AS (Org.nr: 933 607 779 MVA)</div></div></div></div></div>

=== https://vikingmester.no/om-oss ===
STATUS: 200  LEN: 81000
H1: [Vi gjør byggeplassen enkel og papirløs]
ORG '933 607 779': PRESENT :: ...IChat Norge AS | VikingMester</title><meta name="description" content="VikingMester leveres av AIChat Norge AS (Org.nr: 933 607 779 MVA). Vi bygger fremtidens enkle og intelligente KS- og HMS-system for norske håndverkere."/>

=== https://vikingmester.no/personvern ===
STATUS: 200  LEN: 54779
H1: [Personvernerklæring]
ORG '933 607 779': PRESENT :: ...v class="pt-2 text-xs text-slate-500"><p class="font-semibold text-slate-400">AIChat Norge AS / Vikingnet</p><p>Org.nr: 933 607 779 MVA</p></div></div></div></div><div class="pt-8 border-t border-navy-900 flex flex-col sm:flex-row items-center justify-between ...

=== https://vikingmester.no/vilkar ===
STATUS: 200  LEN: 52528
H1: [Vilkår og Betingelser]
ORG '933 607 779': PRESENT :: ...v class="pt-2 text-xs text-slate-500"><p class="font-semibold text-slate-400">AIChat Norge AS / Vikingnet</p><p>Org.nr: 933 607 779 MVA</p></div></div></div></div><div class="pt-8 border-t border-navy-900 flex flex-col sm:flex-row items-center justify-between ...
```
Also checked: `933607779` (unspaced) → ABSENT on all four; `933851222` and `933 851 222` → ABSENT on all four.

Notes: the four pages **are** server-rendered (unlike `/`) — 52–81 KB of real HTML each, each with exactly one `<h1>`. `/om-oss` carries the wrong org number even in its meta description, i.e. it is what search engines and link previews will display.

**Verdict: VERIFIED** — all four return 200 with an `<h1>`, and all four print the org number `933 607 779`. Combined with Q8, that number is **wrong** (see Q8).

---

## Q6. robots.txt / sitemap.xml

**Command**
```powershell
(Invoke-WebRequest -Uri "https://vikingmester.no/robots.txt" -UseBasicParsing).Content
(Invoke-WebRequest -Uri "https://vikingmester.no/sitemap.xml" -UseBasicParsing).Content
```

**Raw output `robots.txt` (HTTP 200, verbatim)**
```
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /innlogget/
Disallow: /_next/
Disallow: /private/
Disallow: /partner
Disallow: /partner/

User-Agent: Googlebot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /partner
Disallow: /partner/

User-Agent: Bingbot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /partner
Disallow: /partner/

User-Agent: GPTBot
User-Agent: ChatGPT-User
User-Agent: ClaudeBot
User-Agent: PerplexityBot
User-Agent: Google-Extended
User-Agent: Applebot-Extended
User-Agent: anthropic-ai
User-Agent: cohere-ai
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /partner
Disallow: /partner/

Sitemap: https://vikingmester.no/sitemap.xml
```

Findings:
- `Disallow: /_next/` **is present under `User-Agent: *`** → VERIFIED.
- `/invite` in any `Disallow` → **ABSENT** → REFUTED (not disallowed).
- `/auth/` in any `Disallow` → **ABSENT** → REFUTED (not disallowed). Note the repo only has `src/app/auth/reset-password/page.tsx`.
- `/partner` and `/partner/` are disallowed for `*` and for every named bot; `/api/`, `/admin/`, `/dashboard/`, `/innlogget/`, `/_next/`, `/private/` are disallowed for `*` only.
- `sitemap.xml` → HTTP 200, valid XML, with core routes plus a large city/trade set (Oslo, Bærum, Asker, Bergen, Trondheim, Stavanger, Tromsø, … and `/for/tomrer`, `/for/rorlegger`, `/for/elektriker`, …) and 3 `/fag/...` articles. All `<lastmod>` = `2026-10-03T15:42:22.016Z` (build time). `/admin/`, `/dashboard/`, `/innlogget/`, `/private/`, `/partner` appear nowhere in the sitemap — consistent with intent.

**Verdict: VERIFIED for `/_next/` being disallowed; REFUTED for `/invite` and `/auth/` appearing in Disallow** (neither appears).

---

## Q7. Does the path exist? `/login`, `/invite`, `/manifest.json`

**Command**
```powershell
foreach ($u in @("https://vikingmester.no/login","https://vikingmester.no/invite","https://vikingmester.no/manifest.json")) {
  try { $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 60; "STATUS: $($r.StatusCode)"; $r.Content }
  catch { "STATUS: $([int]$_.Exception.Response.StatusCode)" } }
# also probed: /auth/login, /logg-inn
```

**Raw output**
```
=== https://vikingmester.no/login ===
STATUS: 404
=== https://vikingmester.no/auth/login ===
STATUS: 404
=== https://vikingmester.no/logg-inn ===
STATUS: 404
=== https://vikingmester.no/invite ===
STATUS: 200 LEN: 22857
BODY: <body class="..."><div hidden=""><!--$--><!--/$--></div><!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template><div class="min-h-screen flex items-center justify-center">Laster invitasjon...</div><!--/$--><!--$--><!--/$--><section aria-label="Notifications alt+T" ...>
=== https://vikingmester.no/manifest.json ===
STATUS: 200
```

`/manifest.json` body (HTTP 200, verbatim), `icons` array as requested:
```json
{
  "id": "/?source=pwa",
  "name": "VikingMester Pro",
  "short_name": "VikingMester",
  "description": "Byggeplassens råeste kraftverktøy. Autonom HMS/KS, TEK17 og byggedagbok. En del av Vikingnet.",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#0A192F",
  "theme_color": "#0A192F",
  "categories": ["business", "productivity", "utilities"],
  "icons": [
    { "src": "/icon.svg",     "sizes": "192x192 512x512", "type": "image/svg+xml", "purpose": "any maskable" },
    { "src": "/icon-192.png", "sizes": "192x192",         "type": "image/png",     "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512",         "type": "image/png",     "purpose": "any" }
  ]
}
```
Repository check: `src/app` has no `login` directory (`auth/` contains only `reset-password/`), which matches the 404s; `src/app/invite/` contains `page.tsx` and `[token]/page.tsx`, matching the 200.

**Verdict: VERIFIED** — `/login` = 404 (route does not exist), `/invite` = 200 (client-rendered "Laster invitasjon…" shell, not disallowed in robots.txt and not in the sitemap), `/manifest.json` = 200 with the exact `icons` array above (3 icons: `/icon.svg` maskable, `/icon-192.png`, `/icon-512.png`).

---

## Q8. External fact check — Enhetsregisteret (Brønnøysund)

**Command**
```powershell
Invoke-WebRequest "https://data.brreg.no/enhetsregisteret/api/enheter/933607779" -UseBasicParsing -Headers @{Accept='application/json'}
Invoke-WebRequest "https://data.brreg.no/enhetsregisteret/api/enheter/933851222" -UseBasicParsing -Headers @{Accept='application/json'}
Invoke-WebRequest "https://data.brreg.no/enhetsregisteret/api/enheter?navn=AIChat%20Norge&size=3" -UseBasicParsing -Headers @{Accept='application/json'}
```

**Raw output 1 — `enheter/933607779`**
```
STATUS: 404
(empty body)
```

**Raw output 2 — `enheter/933851222` (HTTP 200, one JSON object, trimmed to material fields; the API's UTF-8 bytes were mis-decoded as Latin-1 by PowerShell, shown here decoded)**
```json
{"_links":{"self":{"href":"https://data.brreg.no/enhetsregisteret/api/enheter/933851222"}},
 "aktivitet":["Markedsføring og reklame."],
 "forretningsadresse":{"adresse":["Vidjeveien 21"],"kommune":"TØNSBERG","kommunenummer":"3905","land":"Norge","landkode":"NO","postnummer":"3151","poststed":"TOLVSRØD"},
 "institusjonellSektorkode":{"beskrivelse":"Private aksjeselskaper mv.","kode":"2100"},
 "kapital":{"antallAksjer":300,"belop":30000.00,"innfortDato":"2024-07-31","type":"Aksjekapital","valuta":"NOK"},
 "konkurs":false,
 "naeringskode1":{"beskrivelse":"Reklamebyråvirksomhet","kode":"73.110"},
 "navn":"AI CHAT NORGE AS",
 "organisasjonsform":{"beskrivelse":"Aksjeselskap","kode":"AS"},
 "organisasjonsnummer":"933851222",
 "registreringsdatoEnhetsregisteret":"2024-07-31",
 "registreringsdatoForetaksregisteret":"2024-07-31",
 "registreringsdatoMerverdiavgiftsregisteret":"2024-12-20",
 "registrertIForetaksregisteret":true,
 "registrertIMvaregisteret":true,
 "sisteInnsendteAarsregnskap":"2025",
 "stiftelsesdato":"2024-06-20",
 "underAvvikling":false,"underTvangsavviklingEllerTvangsopplosning":false,
 "vedtektsfestetFormaal":["Markedsføring og annet som naturlig faller sammen med dette."]}
```

**Raw output 3 — free-text search `?navn=AIChat%20Norge&size=3` (HTTP 200, trimmed)**
```json
{"_embedded":{"enheter":[
  {"organisasjonsnummer":"925586102","navn":"VI FOR NORGE","forretningsadresse":{"kommune":"ASKER","poststed":"NESBRU"}},
  {"organisasjonsnummer":"986909389","navn":"NORGES HANDIKAPFORBUND NORD-NORGE","forretningsadresse":{"kommune":"TROMSØ","poststed":"TROMSØ"}},
  {"organisasjonsnummer":"824585792","navn":"NORGES MILJØVERNFORBUND MIDT-NORGE","forretningsadresse":{"kommune":"TRONDHEIM","poststed":"TRONDHEIM"}}]},
 "page":{"number":0,"size":3,"totalElements":8038,"totalPages":2680}}
```
**Caveat about that endpoint:** `?navn=` is a fuzzy/contains search, not an exact-name match — `AIChat Norge` returned 8038 unrelated hits ranked by loose token overlap, and none of the top 3 is the company. It is **not usable** as identity evidence. A near-exact query `?navn=AI%20CHAT%20NORGE&size=5` does rank the right entity first:
```
totalElements: 8464
  933851222 | AI CHAT NORGE AS | TOLVSRØD
  917260389 | CHRISTIAN CHAT     | KRISTIANSAND S
  933272184 | AI AI AI AS       | OSLO
  937381220 | FRONT AI NORGE AS | MOSS
  975965961 | CHAT NOIR AS      | OSLO
```

**Independent checksum check (Norwegian org.nr mod-11, weights 3,2,7,6,5,4,3,2)**
```
933607779: sum=153 rest=10 computed_check_digit=1 actual_last_digit=9 valid=False
933851222: sum=141 rest=9  computed_check_digit=2 actual_last_digit=2 valid=True
```

**Conclusion — which org number is real**
- **`933 851 222` is the real org number for "AI CHAT NORGE AS"** (AS, stiftet 2024-06-20, org.form AS, næringskode 73.110 Reklamebyråvirksomhet, forretningsadresse Vidjeveien 21, 3151 Tolvsrød / Tønsberg, registered in Foretaksregisteret and MVA-registeret, not bankrupt, valid mod-11 checksum).
- **`933 607 779` is nothing.** It resolves to 404 in Enhetsregisteret and fails the mod-11 checksum, so it is not merely unregistered — it is not a structurally valid Norwegian organisasjonsnummer. It is the number printed as the company's own org.nr on `/kontakt`, `/om-oss` (including its meta description), `/personvern`, `/vilkar`, and in the client-side landing footer chunk `9747-…js`.

**Verdict: VERIFIED** — real org.nr is `933 851 222`; `933 607 779` does not exist in Enhetsregisteret and is an invalid number. The live site's displayed org.nr is **REFUTED**.

---

## What I could NOT determine (stated plainly)

- **No app-level commit marker exists.** Railway/Next expose no commit SHA header, so the live SHA rests entirely on the GitHub Deployments API + the deploy-status transition + the frozen sitemap build timestamp. That is a 3-way consistent chain, but it is metadata about the deployment, not a marker read out of the running artifact. A Railway build-log check would close the last gap.
- **I did not execute client-side JS.** No headless browser was used, so "the 6 strings render correctly for a real browser" is inferred from the chunk contents, not observed. Conversely, "the site is broken for users" is NOT claimed — only that the SSR/HTML output contains none of the content.
- **The failing scheduled workflow's cause was not investigated** (only its name/step: `daily_audit` → `Kjør Daglig Sammendrag og HMS-revisjon`). Fetching its logs requires authentication, which I deliberately did not use.
- **Unauthenticated GitHub API.** The 5-run window is what the API returned (`total_count: 209`); older runs were not examined.
- **No CI run exists for any commit after `f21f032`** — consistent with main not having moved since 2026-10-03.

---

## Repo hygiene note (not a finding about production)

This report could not be written with the harness's atomic write path: `G:\` is a **Google Drive** volume, which does not support the hardlink/rename step that path uses (it failed with `EISDIR`). The file was therefore written by a direct byte write to the allowed path, `docs/_verify-prod.md`. No other repo file was created, modified, or deleted.
