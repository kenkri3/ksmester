#!/usr/bin/env node
/**
 * Bevissjekk for HOY-funnene i docs/revisjon-2026-10-05.md.
 *
 * Kjor en lokalt startet instans, aldri produksjon.
 *   npm run dev
 *   node scripts/security-check-high.mjs [base-url]
 *
 * Hver sjekk er formet som et ANGREP mot en kjorende instans og krever at det
 * feiler. Sjekker som ikke kan avgjores entydig rapporteres som MANUELL.
 */

import fs from 'fs';
import path from 'path';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '');
if (/vikingmester\.no|railway\.app/i.test(BASE)) {
  console.error('AVBRUTT: ' + BASE + ' ser ut som produksjon. Denne sjekken oppretter data og skal kun kjores lokalt.');
  process.exit(2);
}

const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let pass = 0, fail = 0, manual = 0;
const rows = [];

function r(id, name, verdict, detail) {
  rows.push({ id: id, name: name, verdict: verdict, detail: detail });
  if (verdict === 'OK') pass++;
  else if (verdict === 'FEIL') fail++;
  else manual++;
  console.log('  ' + verdict.padEnd(6) + id + '  ' + name + (detail ? '\n           ' + detail : ''));
}

async function req(method, p, body, headers) {
  const opts = { method: method, headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}) };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + p, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* ikke JSON */ }
  return { status: res.status, json: json, text: text };
}

function auth(token) { return token ? { Authorization: 'Bearer ' + token } : {}; }

async function registerUser(tag) {
  const email = 'hoy-' + tag + '-' + stamp + '@example.invalid';
  const res = await req('POST', '/api/auth/register', {
    email: email, password: 'HoyTest!2026', name: 'HOY ' + tag,
    company: 'HOY Testbedrift ' + tag + ' ' + stamp, gdprConsent: true,
  });
  return { email: email, token: res.json && res.json.token, user: res.json && res.json.user };
}

function readSrc(rel) {
  try { return fs.readFileSync(path.join(process.cwd(), rel), 'utf8'); }
  catch (e) { return ''; }
}

async function main() {
  console.log('\n=== Bevissjekk: HOY-funn ===');
  console.log('Base-URL: ' + BASE + '\n');

  try {
    await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(15000) });
  } catch (e) {
    console.error('FANT IKKE APPEN pa ' + BASE + '. Start "npm run dev" forst.');
    process.exit(2);
  }

  // ---------- E-12: IDOR + phishing i /api/documentation ----------
  console.log('E-12  /api/documentation - eierskap og mottaker');
  {
    const owner = await registerUser('e12-eier');
    const other = await registerUser('e12-annen');
    if (!owner.token || !other.token) {
      r('E-12', 'to brukere kunne opprettes for testen', 'MANUELL', 'registrering feilet');
    } else {
      const projId = 'proj-e12-' + stamp;
      const made = await req('POST', '/api/data/projects', {
        id: projId, name: 'E12 Prosjekt', clientName: 'E12 Kunde',
        clientEmail: 'e12-kunde-' + stamp + '@example.invalid',
      }, auth(owner.token));

      const asOther = await req('GET', '/api/documentation?projectId=' + projId + '&projectName=E12', undefined, auth(other.token));
      r('E-12', 'annen bedrifts bruker far IKKE hentet dokumentasjonen (IDOR stengt)',
        (asOther.status === 403 || asOther.status === 404) ? 'OK' : 'FEIL',
        'prosjekt opprettet HTTP ' + made.status + ', kryss-tenant GET HTTP ' + asOther.status);

      const asOwner = await req('GET', '/api/documentation?projectId=' + projId + '&projectName=E12', undefined, auth(owner.token));
      r('E-12', 'eieren far fortsatt hentet sin egen dokumentasjon',
        asOwner.status === 200 ? 'OK' : 'FEIL',
        'HTTP ' + asOwner.status);

      const phish = await req('POST', '/api/documentation', {
        action: 'email_documentation', projectId: projId,
        projectInfo: { name: 'E12 Prosjekt', clientName: 'E12 Kunde' },
        recipientEmail: 'angriper-' + stamp + '@example.invalid',
        customSubject: 'Phishing-test', customMessage: 'Test',
      }, auth(owner.token));
      r('E-12', 'e-post til VILKARLIG mottaker avvises',
        (phish.status === 403 || phish.status === 400) ? 'OK' : 'FEIL',
        'HTTP ' + phish.status + (phish.status === 200 ? ' - utsending ble godtatt' : ''));
    }
    const src = readSrc('src/app/api/documentation/route.ts');
    r('E-12', 'ruten sjekker eierskap, ikke bare innlogging',
      /loadAuthorizedProject/.test(src) && /clientEmail/.test(src) ? 'OK' : 'FEIL',
      /loadAuthorizedProject/.test(src) ? 'autorisasjonshjelper og mottakersjekk finnes' : 'mangler');
  }

  // ---------- E-17: raa role === 'admin' brukt som GLOBAL nokkel ----------
  // Merk: role === 'admin' ER en legitim bedriftsadministrator. Det som er feil,
  // er a bruke den som plattform-global nokkel. Sjekken leter derfor etter de
  // konkrete lekkasjemonstrene som faktisk fantes i revisjonen:
  //   a) role === 'admin' ? all : all.filter(...)          (ga hele samlingen)
  //   b) user?.role === 'admin' ? undefined : companyId    (undefined = alle)
  console.log('\nE-17  raa role === "admin" brukt som global nokkel');
  {
    const files = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('route.ts')) files.push(full);
      }
    };
    try { walk(path.join(process.cwd(), 'src', 'app', 'api')); } catch (e) { /* ignore */ }
    const leaks = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      const code = src.split(/\r?\n/).filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
      const grantsAll = /role\s*===\s*'admin'\s*\?\s*all\s*:/.test(code);
      const passesUndefined = /role\s*===\s*'admin'\s*\?\s*undefined\s*:/.test(code);
      if (grantsAll || passesUndefined) leaks.push(path.relative(process.cwd(), f));
    }
    r('E-17', 'ingen API-rute gir global oversikt til en kundeadmin',
      leaks.length === 0 ? 'OK' : 'FEIL',
      leaks.length === 0
        ? 'ingen treff pa admin -> hele samlingen / admin -> undefined'
        : leaks.length + ' filer: ' + leaks.join(', '));

    const statusSrc = readSrc('src/app/api/integrations/status/route.ts');
    const statusCode = statusSrc.split(/\r?\n/).filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
    const requiresAuth = /if\s*\(!user\)/.test(statusCode) && /401/.test(statusCode);
    r('E-17', '/api/integrations/status krever innlogging',
      requiresAuth ? 'OK' : 'FEIL',
      requiresAuth ? '401 for uinnloggede, global oversikt kun for SuperAdmin' : 'ruten er fortsatt uautentisert');

    const anonStatus = await req('GET', '/api/integrations/status');
    r('E-17', 'uinnlogget kall til /api/integrations/status avvises',
      (anonStatus.status === 401 || anonStatus.status === 403) ? 'OK' : 'FEIL',
      'HTTP ' + anonStatus.status);
  }

  // ---------- E-23 + E-17: accounting/summary ----------
  console.log('\nE-23  admin-passord som query-parameter i /api/accounting/summary');
  {
    const noAuth = await req('GET', '/api/accounting/summary');
    r('E-23', 'uautentisert kall avvises',
      (noAuth.status === 401 || noAuth.status === 403) ? 'OK' : 'FEIL',
      'HTTP ' + noAuth.status);

    const plain = await registerUser('e23');
    const asUser = await req('GET', '/api/accounting/summary', undefined, auth(plain.token));
    r('E-23', 'vanlig innlogget bruker far IKKE partnerskapsregnskapet',
      (asUser.status === 401 || asUser.status === 403) ? 'OK' : 'FEIL',
      'HTTP ' + asUser.status + (asUser.status === 200 ? ' - returnerte regnskap pa tvers av bedrifter' : ''));

    const viaQuery = await req('GET', '/api/accounting/summary?adminKey=noe');
    r('E-23', '?adminKey= i URL gir IKKE tilgang',
      (viaQuery.status === 401 || viaQuery.status === 403) ? 'OK' : 'FEIL',
      'HTTP ' + viaQuery.status);

    const aSrc = readSrc('src/app/api/accounting/summary/route.ts');
    const aCode = aSrc.split(/\r?\n/).filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
    r('E-23', 'koden leser ikke lenger adminKey fra query eller header',
      !/adminKey/.test(aCode) ? 'OK' : 'FEIL',
      /adminKey/.test(aCode) ? 'adminKey leses fortsatt' : 'kun SuperAdmin eller timing-sikker intern header');
  }

  // ---------- C-06: assertTenantAccess feilet apent ----------
  console.log('\nC-06  assertTenantAccess ved manglende bedrifts-ID');
  {
    const cSrc = readSrc('src/lib/server/auth.ts');
    const cCode = cSrc.split(/\r?\n/).filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
    // Matcher KUN den faktiske kodelinjen (med semikolon), ikke omtalen i kommentaren.
    const failsOpen = /if\s*\(!targetCompanyId\)\s*return\s+true\s*;/.test(cCode);
    const failsClosed = /if\s*\(!targetCompanyId\)\s*return\s+false\s*;/.test(cCode);
    r('C-06', 'manglende targetCompanyId avvises i stedet for a slippe gjennom',
      (!failsOpen && failsClosed) ? 'OK' : 'FEIL',
      failsOpen ? 'returnerer fortsatt true nar bedrifts-ID mangler'
        : (failsClosed ? 'returnerer false (fail-closed). Merk: funksjonen hadde ingen kallsteder' : 'kunne ikke avgjore'));
  }

  // ---------- E-17: kryss-tenant i settings/integrations ----------
  console.log('\nE-17  /api/settings/integrations - kryss-tenant');
  {
    const iSrc = readSrc('src/app/api/settings/integrations/route.ts');
    const iCode = iSrc.split(/\r?\n/).filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
    const getLeaks = /role\s*===\s*'admin'\s*\?\s*all/.test(iCode);
    r('E-17', 'GET gir ikke alle bedrifters integrasjoner til en kundeadmin',
      !getLeaks ? 'OK' : 'FEIL',
      getLeaks ? 'bruker fortsatt role===admin for global visning' : 'global visning krever SuperAdmin');
    const delLeaks = /user\.role\s*===\s*'admin'\s*\|\|/.test(iCode);
    r('E-17', 'DELETE kan ikke ramme en annen bedrifts integrasjon',
      !delLeaks ? 'OK' : 'FEIL',
      delLeaks ? 'bruker fortsatt role===admin som global nokkel' : 'krever eierskap eller SuperAdmin');
  }

  // ---------- E-13: uautentisert e-postutsending fra verifisert domene ----------
  console.log('\nE-13  /api/partner/leads - apen e-postutsending');
  {
    const anon = await req('POST', '/api/partner/leads', {
      sellerName: 'Angriper', email: 'offer-' + stamp + '@example.invalid',
      name: 'Offer', company: 'Offer AS',
    });
    r('E-13', 'uautentisert POST avvises',
      (anon.status === 401 || anon.status === 403) ? 'OK' : 'FEIL',
      'HTTP ' + anon.status + (anon.status === 200 ? ' - ruten sendte e-post uten innlogging' : ''));

    const legit = await registerUser('e13-selger');
    const spoof = await req('POST', '/api/partner/leads', {
      sellerName: 'Spoofet Navn', sellerEmail: 'spoof-' + stamp + '@example.invalid',
      sellerId: 'seller-finnes-ikke',
      email: 'mottaker-' + stamp + '@example.invalid',
      name: 'Mottaker', company: 'Mottaker AS',
    }, auth(legit.token));
    const storedEmail = String((spoof.json && spoof.json.lead && spoof.json.lead.sellerEmail) || '').toLowerCase();
    r('E-13', 'selgeridentiteten kan ikke spoofes via body',
      storedEmail !== 'spoof-' + stamp + '@example.invalid' ? 'OK' : 'FEIL',
      'lagret sellerEmail: ' + JSON.stringify(storedEmail) + ' (HTTP ' + spoof.status + ')');

    const src = readSrc('src/app/api/partner/leads/route.ts');
    const code = src.split(/\r?\n/).filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
    r('E-13', 'POST henter selger fra sesjonen, ikke fra body',
      /if\s*\(!userPayload\)/.test(code) && !/body\.sellerEmail/.test(code) ? 'OK' : 'FEIL',
      /body\.sellerEmail/.test(code) ? 'body.sellerEmail brukes fortsatt' : 'sellerEmail/sellerId kommer fra JWT');
  }

  // ---------- E-14: id godtatt som capability-token ----------
  console.log('\nE-14  /api/notify/email - id som token og fri mottaker');
  {
    const owner = await registerUser('e14');
    const coId = 'co-e14-' + stamp;
    await req('POST', '/api/data/change_orders', {
      id: coId, title: 'E14 ordre', status: 'pending_approval',
      clientEmail: 'e14-kunde-' + stamp + '@example.invalid',
    }, auth(owner.token));

    const byId = await req('POST', '/api/notify/email', {
      to: 'angriper-' + stamp + '@example.invalid',
      subject: 'E14 relay-test', text: 'test',
      changeOrderToken: coId,
    });
    r('E-14', 'ordre-ID godtas IKKE som capability-token',
      (byId.status === 401 || byId.status === 403) ? 'OK' : 'FEIL',
      'HTTP ' + byId.status + (byId.status === 200 ? ' - ID-en ga tilgang' : ''));

    const src = readSrc('src/app/api/notify/email/route.ts');
    const code = src.split(/\r?\n/).filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
    r('E-14', 'koden sammenligner kun mot faktisk token, ikke id',
      !/o\.id === activeToken/.test(code) ? 'OK' : 'FEIL',
      /o\.id === activeToken/.test(code) ? 'o.id === activeToken star fortsatt' : 'kun o.token === activeToken');
  }

  // ---------- E-16: enhver innlogget bruker kunne sende vilkarlig e-post ----------
  console.log('\nE-16  /api/agent/email - vilkarlig e-post fra verifisert domene');
  {
    const plain = await registerUser('e16');
    const asUser = await req('POST', '/api/agent/email', {
      to: 'angriper-' + stamp + '@example.invalid',
      subject: 'E16 test', message: 'test',
    }, auth(plain.token));
    r('E-16', 'vanlig innlogget bruker avvises',
      (asUser.status === 401 || asUser.status === 403) ? 'OK' : 'FEIL',
      'HTTP ' + asUser.status + (asUser.status === 200 ? ' - kundekonto kunne sende vilkarlig e-post' : ''));

    const anon = await req('POST', '/api/agent/email', {
      to: 'angriper-' + stamp + '@example.invalid', subject: 'x', message: 'x',
    });
    r('E-16', 'uautentisert kall avvises',
      (anon.status === 401 || anon.status === 403) ? 'OK' : 'FEIL',
      'HTTP ' + anon.status);

    const src = readSrc('src/app/api/agent/email/route.ts');
    const code = src.split(/\r?\n/).filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
    r('E-16', 'nokkelsammenligningen er timing-sikker',
      /timingSafeEqual/.test(code) ? 'OK' : 'FEIL',
      /timingSafeEqual/.test(code) ? 'bruker timingSafeEqual' : 'bruker fortsatt ===');
  }

  // ---------- E-18: spoofbar cron-header ----------
  console.log('\nE-18  /api/cron/seo-autopilot - spoofbar cron-header');
  {
    const spoof = await req('POST', '/api/cron/seo-autopilot', undefined, { 'x-vercel-cron': '1' });
    r('E-18', 'x-vercel-cron: 1 gir IKKE tilgang',
      (spoof.status === 401 || spoof.status === 403) ? 'OK' : 'FEIL',
      'HTTP ' + spoof.status + (spoof.status === 200 ? ' - headeren startet tunge jobber' : ''));

    const src = readSrc('src/app/api/cron/seo-autopilot/route.ts');
    const code = src.split(/\r?\n/).filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
    r('E-18', 'koden leser ikke lenger den spoofbare headeren',
      !/x-vercel-cron/.test(code) ? 'OK' : 'FEIL',
      /x-vercel-cron/.test(code) ? 'headeren leses fortsatt' : 'kun CRON_SECRET / intern hemmelighet / SuperAdmin');
  }

  // ---------- T-01 / F-02 / R-01 / R-03: offentlig flate ----------
  console.log('\nT-01  zoom, tredjepartsfonter og org.nr i servert HTML');
  {
    const page = await req('GET', '/kontakt');
    const html = page.text || '';

    const viewport = (html.match(/<meta name="viewport"[^>]*>/) || [''])[0];
    const zoomBlocked = /user-scalable=no|maximum-scale=1(?!\d)/.test(viewport);
    r('T-01', 'zoom er ikke sperret for brukeren',
      !zoomBlocked ? 'OK' : 'FEIL',
      viewport ? viewport : 'fant ingen viewport-meta (HTTP ' + page.status + ')');

    r('F-02', 'ingen tredjeparts font-CDN i servert HTML',
      !/fonts\.googleapis|fonts\.gstatic/.test(html) ? 'OK' : 'FEIL',
      /fonts\.googleapis|fonts\.gstatic/.test(html) ? 'Google Fonts refereres fortsatt' : 'ingen fontforespørsel til tredjepart');

    const wrongOrgnr = /933\s*607\s*779/.test(html);
    r('R-01', 'det ugyldige org.nr vises ikke pa offentlig side',
      !wrongOrgnr ? 'OK' : 'FEIL',
      wrongOrgnr ? '933 607 779 star fortsatt i HTML' : 'kun det verifiserte nummeret');

    const sdSrc = readSrc('src/components/StructuredData.tsx');
    const sdCode = sdSrc.split(/\r?\n/).filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
    r('R-03', 'JSON-LD-prisene hentes fra PLANS, ikke som literaler',
      /PLANS\./.test(sdCode) && !/price:\s*'\d+'/.test(sdCode) ? 'OK' : 'FEIL',
      /price:\s*'\d+'/.test(sdCode) ? 'hardkodede pris-strenger star fortsatt' : 'prisene utledes fra PLANS');
  }

  console.log('\n=== OPPSUMMERING ===');
  for (const row of rows) console.log(row.verdict.padEnd(6) + '  ' + row.id + '  ' + row.name);
  console.log('\nOK: ' + pass + '   FEIL: ' + fail + '   MANUELL: ' + manual);
  if (fail > 0) { console.log('\nKONKLUSJON: ' + fail + ' HOY-sjekk(er) feiler.'); process.exit(1); }
  console.log('\nKONKLUSJON: ingen sjekk feiler' + (manual > 0 ? ', men ' + manual + ' er uavklart.' : '.'));
  process.exit(0);
}

main().catch(function (e) { console.error('\nUventet feil:', e); process.exit(1); });