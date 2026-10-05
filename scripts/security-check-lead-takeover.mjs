#!/usr/bin/env node
/**
 * Bevissjekk for E-02 - uautentisert kontoovertakelse via POST /api/lead.
 *
 * HVA DENNE BEVISER
 * Hullet var: en uautentisert POST til /api/lead med en e-postadresse som allerede
 * hadde en konto, overskrev passordet til den kontoen og returnerte en gyldig JWT.
 * Det er full kontoovertakelse uten innlogging.
 *
 * Sjekken gjor angrepet og krever at ALLE disse holder:
 *   1. Den nye brukeren kan logge inn med passordet sitt (kontroll: flyten virker).
 *   2. POST /api/lead med SAMME e-post og et ANNET passord returnerer IKKE en token.
 *   3. Innlogging med angriperens passord FEILER (passordet ble ikke overskrevet).
 *   4. Innlogging med det opprinnelige passordet VIRKER fortsatt (kontoen er intakt).
 *
 * PUNKT 3 ER SELVE BEVISET. Uten det sier testen ingenting.
 *
 * BRUK
 *   Start appen forst:   npm run dev
 *   Kjor sa:             node scripts/security-check-lead-takeover.mjs
 *   Annen base-URL:      node scripts/security-check-lead-takeover.mjs http://localhost:3001
 *
 * MERK: sjekken krever en kjorende instans og oppretter en ekte bruker i den
 * instansen den peker pa. Kjør den derfor ALDRI mot produksjon.
 */

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '');

if (/vikingmester\.no|railway\.app/i.test(BASE)) {
  console.error('AVBRUTT: ' + BASE + ' ser ut som et produksjonsmiljo. Denne sjekken oppretter brukere og skal kun kjores lokalt.');
  process.exit(2);
}

const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const VICTIM_EMAIL = process.argv[3] || ('e02-offer-' + stamp + '@example.invalid');
const VICTIM_PASSWORD = 'OfferOpprinnelig!2026';
const ATTACKER_PASSWORD = 'AngriperNyttPassord!2026';

let failures = 0;
const results = [];

function record(name, ok, detail) {
  results.push({ name: name, ok: ok, detail: detail });
  if (!ok) failures++;
  console.log((ok ? '  OK   ' : '  FEIL ') + name + (detail ? '\n         ' + detail : ''));
}

async function post(path, body, headers) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: JSON.stringify(body),
  });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch (e) { /* ikke JSON */ }
  return { status: res.status, json: json, text: text };
}

async function main() {
  console.log('\n=== E-02: kontoovertakelse via /api/lead ===');
  console.log('Base-URL:        ' + BASE);
  console.log('Offerets e-post: ' + VICTIM_EMAIL + '\n');

  try {
    const r = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(15000) });
    console.log('Forhandsjekk: /api/health svarte HTTP ' + r.status + '\n');
  } catch (e) {
    console.error('FANT IKKE APPEN pa ' + BASE + '. Start den med "npm run dev" og kjor sjekken pa nytt.');
    console.error('Teknisk: ' + e.message);
    process.exit(2);
  }

  console.log('1) Oppretter offerets konto via /api/auth/register ...');
  const reg = await post('/api/auth/register', {
    email: VICTIM_EMAIL,
    password: VICTIM_PASSWORD,
    name: 'E-02 Testoffer',
    company: 'E-02 Testbedrift ' + stamp,
    gdprConsent: true,
  });
  record(
    'offerets konto ble opprettet',
    reg.status === 200 && Boolean(reg.json && reg.json.token),
    'HTTP ' + reg.status + (reg.json && reg.json.error ? ' - ' + reg.json.error : '')
  );
  if (reg.status !== 200 || !(reg.json && reg.json.token)) {
    console.error('\nKan ikke fortsette uten en opprettet konto. Avbryter.');
    process.exit(1);
  }

  console.log('\n2) Kontroll: offeret kan logge inn med sitt opprinnelige passord ...');
  const loginBefore = await post('/api/auth/login', { email: VICTIM_EMAIL, password: VICTIM_PASSWORD });
  record(
    'kontroll - innlogging med opprinnelig passord virker FOR angrepet',
    loginBefore.status === 200 && Boolean(loginBefore.json && loginBefore.json.token),
    'HTTP ' + loginBefore.status + (loginBefore.json && loginBefore.json.error ? ' - ' + loginBefore.json.error : '')
  );

  console.log('\n3) ANGREPET: uautentisert POST /api/lead med samme e-post og nytt passord ...');
  const attack = await post('/api/lead', {
    email: VICTIM_EMAIL,
    password: ATTACKER_PASSWORD,
    name: 'Angriper',
    companyName: 'Angriper AS',
    acceptedTerms: true,
    plan: 'solo',
  });
  const attackToken = attack.json && attack.json.token;
  record(
    'angrepet returnerte IKKE en sesjonstoken',
    !attackToken,
    'HTTP ' + attack.status + ' - token: ' + (attackToken ? 'JA (hull!)' : 'nei')
  );
  record(
    'angrepet returnerte IKKE en bruker med rolle',
    !(attack.json && attack.json.user),
    'user-objekt: ' + (attack.json && attack.json.user ? JSON.stringify(attack.json.user).slice(0, 120) : 'nei')
  );

  console.log('\n4) HOVEDBEVIS: kan man logge inn med angriperens passord?');
  const loginAfter = await post('/api/auth/login', { email: VICTIM_EMAIL, password: ATTACKER_PASSWORD });
  const gotToken = Boolean(loginAfter.json && loginAfter.json.token);
  record(
    'BEVIS - innlogging med ANGRIperens passord FEILER (passordet ble ikke overskrevet)',
    loginAfter.status !== 200 || !gotToken,
    'HTTP ' + loginAfter.status + (loginAfter.json && loginAfter.json.error ? ' - ' + loginAfter.json.error : '') + (gotToken ? ' - FIKK TOKEN: HULLET ER APENT' : '')
  );

  console.log('\n5) Kontoen skal fortsatt virke for eieren ...');
  const loginOwner = await post('/api/auth/login', { email: VICTIM_EMAIL, password: VICTIM_PASSWORD });
  record(
    'eierens opprinnelige passord virker fortsatt ETTER angrepet',
    loginOwner.status === 200 && Boolean(loginOwner.json && loginOwner.json.token),
    'HTTP ' + loginOwner.status + (loginOwner.json && loginOwner.json.error ? ' - ' + loginOwner.json.error : '')
  );

  console.log('\n=== OPPSUMMERING ===');
  for (const r of results) console.log((r.ok ? 'OK  ' : 'FEIL') + '  ' + r.name);
  console.log('\n' + (results.length - failures) + '/' + results.length + ' sjekker besto.');
  if (failures > 0) {
    console.log('\nKONKLUSJON: E-02 er IKKE lukket. Se de feilede sjekkene over.');
    process.exit(1);
  }
  console.log('\nKONKLUSJON: E-02 er lukket. Uautentisert POST til /api/lead kan ikke lenger');
  console.log('overskrive passordet til en eksisterende konto eller utstede en sesjon.');
  process.exit(0);
}

main().catch(function (err) {
  console.error('\nUventet feil under sjekken:', err);
  process.exit(1);
});