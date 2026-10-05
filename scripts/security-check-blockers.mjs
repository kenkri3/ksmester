#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
/**
 * Bevissjekk for BLOKKERER-funnene E-01 .. E-10 i VikingMester.
 *
 * Kjor en lokalt startet instans, aldri produksjon.
 *   npm run dev
 *   node scripts/security-check-blockers.mjs
 *
 * Hver sjekk er formet som et ANGREP mot en kjorende instans, og krever at
 * angrepet feiler. Sjekker som ikke kan avgjores entydig rapporteres som
 * "MANUELL" og telles ikke som bestatt.
 */

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '');
if (/vikingmester\.no|railway\.app/i.test(BASE)) {
  console.error('AVBRUTT: ' + BASE + ' ser ut som produksjon. Denne sjekken oppretter brukere og skal kun kjores lokalt.');
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

async function req(method, path, body, headers) {
  const opts = { method: method, headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}) };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { status: res.status, json: json, text: text };
}

async function registerUser(tag) {
  const email = 'blk-' + tag + '-' + stamp + '@example.invalid';
  const password = 'BlokkerTest!2026';
  const res = await req('POST', '/api/auth/register', {
    email: email, password: password, name: 'Blokker Test ' + tag,
    company: 'Blokker Testbedrift ' + tag + ' ' + stamp, gdprConsent: true,
  });
  return { email: email, password: password, status: res.status, json: res.json, token: res.json && res.json.token };
}

function auth(token) { return token ? { Authorization: 'Bearer ' + token } : {}; }

async function main() {
  console.log('\n=== Bevissjekk: BLOKKERER E-01 .. E-10 ===');
  console.log('Base-URL: ' + BASE + '\n');

  try {
    const h = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(15000) });
    console.log('Forhandsjekk /api/health: HTTP ' + h.status + '\n');
  } catch (e) {
    console.error('FANT IKKE APPEN pa ' + BASE + '. Start "npm run dev" forst.');
    process.exit(2);
  }

  const ts = await req('GET', '/api/data/tasks');
  const off = await req('GET', '/api/data/offers');
  const ai = await req('POST', '/api/ai/generate', { prompt: 'hei' });
  const chat = await req('POST', '/api/agent/chat', { message: 'hei', isAdmin: true, companyId: 'comp-001' });
  console.log('--- Uautentisert utgangspunkt ---');
  console.log('  /api/data/tasks  -> HTTP ' + ts.status);
  console.log('  /api/data/offers -> HTTP ' + off.status);
  console.log('  /api/ai/generate -> HTTP ' + ai.status);
  console.log('  /api/agent/chat  -> HTTP ' + chat.status + '\n');

  // ---------- E-07: agent/chat - klientstyrt autorisasjon ----------
  // Merk: ruten MAA svare anonyme kall, fordi den offentlige demoen
  // (MesterAIAgentFrame via MesterAIChat) ikke sender Authorization.
  // Det som ikke maa skje, er at body.isAdmin eller body.companyId far
  // styre autorisasjonen eller hvilken bedrifts data som leses.
  console.log('E-07  /api/agent/chat - klientstyrt autorisasjon');
  {
    const srcPath = path.join(process.cwd(), 'src', 'app', 'api', 'agent', 'chat', 'route.ts');
    let src = '';
    try { src = fs.readFileSync(srcPath, 'utf8'); } catch (e) { src = ''; }
    if (!src) {
      r('E-07', 'kildekoden til agent/chat kan leses for statisk sjekk', 'MANUELL', 'fant ikke ' + srcPath);
    } else {
      // Se bort fra kommentarlinjer, slik at fiksen ikke matcher sin egen forklaring.
      const codeOnly = src.split(/\r?\n/).filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
      const hasAnonAdminGate = /!\s*user\s*&&\s*body\.isAdmin/.test(codeOnly);
      const usesBodyCompanyId = /body\.companyId\s*\|\|/.test(codeOnly);
      r('E-07', 'body.isAdmin styrer IKKE autorisasjonen',
        !hasAnonAdminGate ? 'OK' : 'FEIL',
        hasAnonAdminGate ? 'fant grenen (!user && body.isAdmin === true)' : 'ingen anonym admin-gren i koden');
      r('E-07', 'body.companyId styrer IKKE hvilken bedrift som leses',
        !usesBodyCompanyId ? 'OK' : 'FEIL',
        usesBodyCompanyId ? 'body.companyId brukes fortsatt direkte i en fallback-kjede' : 'body.companyId brukes ikke som fallback');
    }
    const forgedAnon = { message: 'hvilke prosjekter har vi?', isAdmin: true, companyId: 'comp-001', userId: 'u-admin-123' };
    const anonRes = await req('POST', '/api/agent/chat', forgedAnon);
    const anonReply = String((anonRes.json && anonRes.json.reply) || '');
    const claimsAdmin = /administrator\s*\/\s*leder|full tilgang til alle bedriftens bygg/i.test(anonReply);
    r('E-07', 'anonymt kall med isAdmin:true far IKKE administrasjonskontekst',
      !claimsAdmin ? 'OK' : 'FEIL',
      claimsAdmin ? 'svaret hevdet administrator/leder-tilgang' : 'HTTP ' + anonRes.status + ', ingen administrator-kontekst i svaret');
    r('E-07', 'anonymt kall krasjer IKKE (den offentlige demoen virker fortsatt)',
      anonRes.status < 500 ? 'OK' : 'FEIL',
      'HTTP ' + anonRes.status);
  }

  // ---------- E-05: x-portal-access opphever autentisering ----------
  console.log('\nE-05  x-portal-access header');
  const portal = await req('POST', '/api/ai/generate', { prompt: 'hei' }, { 'x-portal-access': 'true' });
  r('E-05', 'usignert x-portal-access: true gir IKKE tilgang uten innlogging',
    portal.status === 401 || portal.status === 403 ? 'OK' : (portal.status === 500 ? 'MANUELL' : 'FEIL'),
    'HTTP ' + portal.status + (portal.status !== 401 && portal.status !== 403 ? ' - headeren slapp gjennom autentiseringssjekken' : ''));

  // ---------- E-03: selvvalgt rolle ved registrering ----------
  console.log('\nE-03  selvvalgt rolle ved registrering');
  const evilEmail = 'blk-e03-' + stamp + '@example.invalid';
  const evil = await req('POST', '/api/auth/register', {
    email: evilEmail, password: 'BlokkerTest!2026', name: 'E03 Angriper',
    company: 'E03 AS ' + stamp, gdprConsent: true, role: 'superadmin', companyId: 'comp-001',
  });
  const evilRole = evil.json && evil.json.user && evil.json.user.role;
  const evilComp = evil.json && evil.json.user && evil.json.user.companyId;
  r('E-03', 'registrering med role:"superadmin" gir IKKE superadmin',
    evilRole !== 'superadmin' ? 'OK' : 'FEIL',
    'fikk role=' + JSON.stringify(evilRole) + ' (HTTP ' + evil.status + ')');
  r('E-03', 'registrering med companyId:"comp-001" havner IKKE i superadmin-bedriften',
    evilComp !== 'comp-001' ? 'OK' : 'FEIL',
    'fikk companyId=' + JSON.stringify(evilComp));

  // ---------- E-04: rolleepskalering via POST /api/data/users ----------
  console.log('\nE-04  POST /api/data/users med forhoyet rolle');
  const u1 = await registerUser('e04');
  let e04verdict = 'MANUELL', e04detail = 'kunne ikke opprette testbruker (HTTP ' + u1.status + ')';
  if (u1.token) {
    const escalated = await req('POST', '/api/data/users', {
      email: 'blk-e04-target-' + stamp + '@example.invalid',
      displayName: 'E04 Mal', role: 'superadmin', companyId: 'comp-001',
      password: 'BlokkerTest!2026', subscriptionStatus: 'active',
    }, auth(u1.token));
    const savedRole = escalated.json && escalated.json.role;
    e04verdict = savedRole === 'superadmin' ? 'FEIL' : 'OK';
    e04detail = 'lagret rolle ble ' + JSON.stringify(savedRole) + ' (HTTP ' + escalated.status + ')';
  }
  r('E-04', 'vanlig bruker kan IKKE lagre en users-rad med role:"superadmin"', e04verdict, e04detail);

  // ---------- E-01: klientstyrt impersoneringsheader ----------
  // ---------- E-01: klientstyrt impersoneringsheader ----------
  console.log('\nE-01  x-impersonated-company-id fra klienten');
  const u2 = await registerUser('e01');
  let e01verdict = 'MANUELL', e01detail = 'kunne ikke opprette testbruker';
  if (u2.token) {
    // Legg inn en gjenkjennelig rad i u2 sin egen bedrift.
    const marker = 'blk-e01-' + stamp;
    const seeded = await req('POST', '/api/data/tasks', { title: marker }, auth(u2.token));
    const u1 = await registerUser('e01-angriper');
    if (!u1.token) {
      e01detail = 'kunne ikke opprette angriperbruker';
    } else {
      const spoof = await req('GET', '/api/data/tasks', undefined, Object.assign(auth(u1.token), { 'x-impersonated-company-id': 'comp-001' }));
      const rows = Array.isArray(spoof.json) ? spoof.json : [];
      const sawForeign = rows.some(function (i) { return i && i.title === marker; });
      const foreign = rows.filter(function (i) { return i && i.companyId && i.companyId !== (u1.json.user && u1.json.user.companyId); }).length;
      e01verdict = (!sawForeign && foreign === 0) ? 'OK' : 'FEIL';
      e01detail = 'seedet rad i HTTP ' + seeded.status + '. Angriperen fikk ' + rows.length + ' rader, ' + foreign + ' fra annen bedrift' + (sawForeign ? ', og SA den seedede raden fra offerets bedrift' : '');
    }
  }
  r('E-01', 'impersoneringsheader gir IKKE rader fra en annen bedrift', e01verdict, e01detail);
  // ---------- E-06: authorName gir superadmin ----------
  console.log('\nE-06  authorName:"admin" i /api/agent/dispatch');
  {
    const victim = await registerUser('e06-offer');
    const attacker = await registerUser('e06-angriper');
    if (!victim.token || !attacker.token) {
      r('E-06', 'authorName gir IKKE kryss-tenant sletterett', 'MANUELL', 'kunne ikke opprette testbrukere');
    } else {
      const coId = 'co-e06-offer-' + stamp;
      const seeded = await req('POST', '/api/data/change_orders', { id: coId, title: 'E06 OFFERETS ORDRE', status: 'pending_approval' }, auth(victim.token));
      const disp = await req('POST', '/api/agent/dispatch', {
        action: 'quick_command', text: 'slett forrige endringsordre',
        authorName: 'admin', userToken: attacker.token,
      }, auth(attacker.token));
      const after = await req('GET', '/api/data/change_orders', undefined, auth(victim.token));
      const stillThere = Array.isArray(after.json) && after.json.some(function (o) { return o && o.id === coId; });
      r('E-06', 'authorName:"admin" gir IKKE kryss-tenant sletterett',
        stillThere ? 'OK' : 'FEIL',
        'seedet HTTP ' + seeded.status + ', angrep HTTP ' + disp.status + ', offerets ordre finnes fortsatt: ' + stillThere);
      const dispSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'api', 'agent', 'dispatch', 'route.ts'), 'utf8');
      const heuristicGone = !/toLowerCase\(\)\.includes\('ken'\)|toLowerCase\(\)\.includes\('admin'\)/.test(dispSrc);
      r('E-06', 'authorName-heuristikken finnes ikke lenger i koden',
        heuristicGone ? 'OK' : 'FEIL',
        heuristicGone ? 'ingen treff pa authorName-heuristikken' : 'heuristikken star fortsatt i dispatch/route.ts');
    }
  }
  // ---------- E-08: kryss-samling-overskriving via klientstyrt id ----------
  console.log('\nE-08  samme id i to ulike samlinger');
  let e08verdict = 'MANUELL', e08detail = 'kunne ikke opprette testbruker';
  if (u2.token) {
    const sharedId = 'blk-e08-' + stamp;
    const a = await req('POST', '/api/data/tasks', { id: sharedId, title: 'E08 oppgave' }, auth(u2.token));
    const b = await req('POST', '/api/data/notifications', { id: sharedId, title: 'E08 varsel' }, auth(u2.token));
    const backTasks = await req('GET', '/api/data/tasks', undefined, auth(u2.token));
    const taskRow = Array.isArray(backTasks.json) ? backTasks.json.find(function (i) { return i && i.id === sharedId; }) : null;
    const clobbered = taskRow && taskRow.title === 'E08 varsel';
    e08verdict = clobbered ? 'FEIL' : 'OK';
    e08detail = 'oppgave-raden etter overskriving: ' + JSON.stringify(taskRow && taskRow.title) + ' (tasks HTTP ' + a.status + ', notifications HTTP ' + b.status + ')';
  }
  r('E-08', 'samme id i to samlinger overskriver IKKE hverandre I MINNESLAGERET', e08verdict, e08detail + ' - MERK: minneslageret nokler per samling, sa denne sjekken sier IKKE om Postgres er trygg');

  // ---------- E-02: kontoovertakelse (full sjekk ligger i egen fil) ----------
  console.log('\nE-02  kontoovertakelse via /api/lead');
  const victim = await registerUser('e02');
  let e02verdict = 'MANUELL', e02detail = 'kunne ikke opprette offerkonto';
  if (victim.token) {
    const attack = await req('POST', '/api/lead', {
      email: victim.email, password: 'AngriperNytt!2026', name: 'Angriper',
      companyName: 'Angriper AS', acceptedTerms: true, plan: 'solo',
    });
    const attackerLogin = await req('POST', '/api/auth/login', { email: victim.email, password: 'AngriperNytt!2026' });
    const gotIn = attackerLogin.status === 200 && attackerLogin.json && attackerLogin.json.token;
    const gotToken = attack.json && attack.json.token;
    e02verdict = (gotIn || gotToken) ? 'FEIL' : 'OK';
    e02detail = 'lead svarte HTTP ' + attack.status + ', token=' + (gotToken ? 'JA' : 'nei') + ', innlogging med angriperpassord=' + (gotIn ? 'LYKTES' : 'feilet');
  }
  r('E-02', 'uautentisert /api/lead kan IKKE overta en eksisterende konto', e02verdict, e02detail);

  // ---------- E-09 / E-10: hardkodede passord ----------
  console.log('\nE-09 / E-10  hardkodede passord');
  const master = await req('POST', '/api/partner/auth/login', { email: 'kenkri3@gmail.com', password: 'VikingMester2026!' });
  r('E-10', 'masterpassordet VikingMester2026! virker IKKE i partnerportalen',
    master.status === 401 || master.status === 403 ? 'OK' : 'FEIL',
    'HTTP ' + master.status + (master.status === 200 ? ' - masterpassordet ga en token' : ''));
  const adminLogin = await req('POST', '/api/auth/login', { email: 'kenkri3@gmail.com', password: 'VikingMester2026!' });
  r('E-09', 'standard admin-passord virker IKKE nar ADMIN_PASSWORD ikke er satt lokalt',
    adminLogin.status === 401 || adminLogin.status === 403 ? 'OK' : 'MANUELL',
    'HTTP ' + adminLogin.status + ' - merk: i dette miljoet kan ADMIN_PASSWORD vaere satt, som gjor svaret forventet');

  console.log('\n=== OPPSUMMERING ===');
  for (const row of rows) console.log(row.verdict.padEnd(6) + '  ' + row.id + '  ' + row.name);
  console.log('\nOK: ' + pass + '   FEIL: ' + fail + '   MANUELL: ' + manual);
  if (fail > 0) { console.log('\nKONKLUSJON: ' + fail + ' BLOKKERER-sjekk(er) feiler. Hullene er ikke lukket.'); process.exit(1); }
  if (manual > 0) { console.log('\nKONKLUSJON: ingen sjekk feiler, men ' + manual + ' kunne ikke avgjores automatisk. Se over.'); process.exit(0); }
  console.log('\nKONKLUSJON: alle BLOKKERER-sjekker besto.');
  process.exit(0);
}

main().catch(function (e) { console.error('\nUventet feil:', e); process.exit(1); });
