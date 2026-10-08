#!/usr/bin/env node
/**
 * Bevissjekk for værsvaret: at MesterAI svarer for DEN dagen brukeren spurte om.
 *
 * HVA DENNE BEVISER
 * Feilen var: alle værsvørsmål fikk samme faste tekst, og den gjaldt bare «nå»
 * («Temperatur nå», «Dagens spenn», «Nedbør i dag»). «Hva blir været til
 * helgen?» fikk derfor dagens observasjon som svar, selv om Open-Meteo
 * leverte et dagsvarsel — bare dag 0 av serien ble lest.
 *
 * I tillegg glapp formuleringen «værvarselet» forbi værsjekken helt, slik at
 * spørsmålet havnet hos modellen og endte i feilmeldingen når modellen ikke
 * svarte. V-01 bruker nettopp den formuleringen.
 *
 * BRUK
 *   Start appen først:   npm run dev
 *   Kjør så:             node scripts/check-vaervarsel.mjs
 *   Annen base-URL:      node scripts/check-vaervarsel.mjs http://localhost:3001
 *   Annet sted:          node scripts/check-vaervarsel.mjs http://localhost:3000 "Nybygg Aalesund"
 *
 * Sjekken skriver ingenting og oppretter ingen data — den stiller bare
 * spørsmål til chat-ruten. Kjør den ALDRI mot produksjon.
 */

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '');
if (/vikingmester\.no|railway\.app/i.test(BASE)) {
  console.error('AVBRUTT: ' + BASE + ' ser ut som produksjon. Denne sjekken skal kun kjøres lokalt.');
  process.exit(2);
}

// Et sted weatherService kjenner, slik at svaret bygger på ekte værdata.
const PROJECT = process.argv[3] || 'Geitekleiva 4, Holmestrand';

let pass = 0;
let fail = 0;

function check(id, name, ok, detail) {
  if (ok) {
    pass++;
    console.log('  OK    ' + id + '  ' + name);
  } else {
    fail++;
    console.log('  FEIL  ' + id + '  ' + name + (detail ? '\n           ' + detail : ''));
  }
}

async function ask(message) {
  const res = await fetch(BASE + '/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, projectName: PROJECT })
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, reply: String(data.reply || data.error || '') };
}

const firstLines = (reply) => reply.split('\n').filter(l => l.trim()).slice(0, 5).join(' | ');

(async () => {
  console.log('Værsvar-sjekk mot ' + BASE + ' (sted: ' + PROJECT + ')\n');

  // V-01: formuleringen fra feilrapporten, med ordet «værvarselet».
  const helg = await ask('Men jeg lurte på til hva værvarselet er til helgen?');
  check('V-01', 'helgespørsmål gir både lørdag og søndag med dato',
    helg.status === 200 && /lørdag \d{1,2}\./.test(helg.reply) && /søndag \d{1,2}\./.test(helg.reply),
    firstLines(helg.reply));

  // V-02: «nå» skal gi dagens forhold — ikke en dagsblokk for en navngitt dag.
  // (Svaret inneholder med vilje en kompakt «Varsel framover»-linje.)
  const naa = await ask('hvordan er været nå?');
  check('V-02', '«nå»-spørsmål gir dagens forhold',
    naa.status === 200
      && /Temperatur nå/.test(naa.reply)
      && !/📅 \*\*(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)/.test(naa.reply),
    firstLines(naa.reply));

  // V-03: navngitt ukedag.
  const fredag = await ask('Hva blir været på fredag?');
  check('V-03', 'ukedagsspørsmål gir den navngitte dagen',
    fredag.status === 200 && /fredag \d{1,2}\./.test(fredag.reply),
    firstLines(fredag.reply));

  // V-04: kort datoskrivemåte.
  const dato = await ask('hva blir været 12.10?');
  check('V-04', 'datospørsmål (12.10) gir den datoen',
    dato.status === 200 && /1[12]\. oktober/.test(dato.reply),
    firstLines(dato.reply));

  // V-05: dato utenfor varselet skal ikke besvares med noe vi ikke vet.
  const fjern = await ask('vær 1.1.2027');
  check('V-05', 'dato utenfor varselet sier det ærlig i stedet for å gjette',
    fjern.status === 200 && /utenfor varselet/.test(fjern.reply) && /til og med/.test(fjern.reply),
    firstLines(fjern.reply));

  // V-06: et tilfeldig ord som inneholder «vær» skal ikke kapres («vært», «være»).
  const falskt = await ask('jeg har vært på befaring i dag og vi må være ferdig');
  check('V-06', '«vært»/«være» utløser ikke et værsvar',
    falskt.status === 200 && !/Værvarsel og HMS-arbeidsforhold/.test(falskt.reply),
    firstLines(falskt.reply));

  console.log('\n' + pass + ' OK, ' + fail + ' FEIL');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => {
  console.error('SJEKKEN KRÆSJET: ' + e.message);
  process.exit(1);
});
