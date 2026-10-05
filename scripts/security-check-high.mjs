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

  console.log('\n=== OPPSUMMERING ===');
  for (const row of rows) console.log(row.verdict.padEnd(6) + '  ' + row.id + '  ' + row.name);
  console.log('\nOK: ' + pass + '   FEIL: ' + fail + '   MANUELL: ' + manual);
  if (fail > 0) { console.log('\nKONKLUSJON: ' + fail + ' HOY-sjekk(er) feiler.'); process.exit(1); }
  console.log('\nKONKLUSJON: ingen sjekk feiler' + (manual > 0 ? ', men ' + manual + ' er uavklart.' : '.'));
  process.exit(0);
}

main().catch(function (e) { console.error('\nUventet feil:', e); process.exit(1); });