import { getCollectionItems, saveCollectionItem } from './db';
import { generateWithAiEngine, cleanAiJson } from './aiEngine';
import { pingSearchEngines } from './indexNow';

export interface SeoArticle {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  category: 'tek17' | 'hms' | 'ns-standard' | 'byggeledelse' | 'fag' | 'regionalt';
  categoryTitle: string;
  contentMarkdown: string;
  faqs: { question: string; answer: string }[];
  targetKeywords: string[];
  readTimeMinutes: number;
  author: string;
  region?: string;
  createdAt: string;
  updatedAt: string;
}

// ── INTERNAL LINK DICTIONARY (PageRank Sculpting i Norge) ─────────────
const INTERNAL_LINKS = [
  { term: 'kvalitetssikring', url: '/ks-system' },
  { term: 'KS-system', url: '/ks-system' },
  { term: 'HMS-system', url: '/hms' },
  { term: 'avvikshåndtering', url: '/avvikshandtering' },
  { term: 'Sikker Jobb Analyse', url: '/sja' },
  { term: 'stoffkartotek', url: '/stoffkartotek' },
  { term: 'byggedagbok', url: '/ks-system' },
  { term: 'varslingsfrist-kalkulator', url: '/verktoy/varslingsfrist-ns8406' },
  { term: 'fall-kalkulator', url: '/verktoy/fall-kalkulator-tek17' },
  { term: 'SJA generator', url: '/verktoy/sja-generator' },
  { term: 'for tømrere', url: '/for/tomrer' },
  { term: 'for rørleggere', url: '/for/rorlegger' },
  { term: 'for elektrikere', url: '/for/elektriker' },
  { term: 'for murere', url: '/for/murer' },
  { term: 'for malere', url: '/for/maler' },
  { term: 'prosjektstyring', url: '/prosjektstyring' },
  { term: 'priser', url: '/priser' },
  { term: 'avvikskontroll', url: '/avvikshandtering' },
  { term: 'våtromsnormen', url: '/verktoy/fall-kalkulator-tek17' }
];

export function injectInternalLinks(markdown: string): string {
  let result = markdown;
  for (const { term, url } of INTERNAL_LINKS) {
    // Erstatt første forekomst som ikke allerede er del av en lenke
    const regex = new RegExp(`(?<!\\[)(?<!/)\\b(${term})\\b(?!\\])(?![^\\(]*\\))`, 'i');
    if (regex.test(result)) {
      result = result.replace(regex, `[$1](${url})`);
    }
  }
  return result;
}

// ── SEEDED EVERGREEN ARTICLES (Aktive fra dag 1) ─────────────
export const SEEDED_ARTICLES: SeoArticle[] = [
  {
    id: 'art-tek17-fall-sluk',
    slug: 'tek17-krav-sluk-vatrom-fall',
    title: 'Krav til fall mot sluk og oppkant på våtrom iht. TEK17 § 13-15',
    metaDescription: 'Lær de eksakte kravene til fall mot sluk og oppkant mot dørterskel iht. TEK17 § 13-15 og Våtromsnormen (BVN). Slik unngår du feil ved tilsyn og takst.',
    category: 'tek17',
    categoryTitle: 'TEK17 & Forskrifter',
    readTimeMinutes: 5,
    author: 'VikingMester Byggfag-redaksjon',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-24T12:00:00Z',
    targetKeywords: ['TEK17 fall mot sluk', 'oppkant våtrom dørterskel', 'BVN 31.205', 'slukmansjett klemring', 'våtrom takst feil'],
    faqs: [
      {
        question: 'Hva er preakseptert fall til sluk i dusjsonen?',
        answer: 'I en radius på minst 0,8 meter fra sluket skal fallet være minst 1:50 (20 mm per meter). For resten av gulvet er kravet minst 1:100 (10 mm per meter).'
      },
      {
        question: 'Er det lov med flatt gulv utenfor dusjsonen i Norge?',
        answer: 'Ja, forutsatt at dusjsonen er nedsenket med minst 15 mm i forhold til det øvrige gulvet, og det er fall mot sluk i nedsenkingen.'
      },
      {
        question: 'Hvorfor er oppkanten på 25 mm ved døråpning så viktig?',
        answer: 'Minst 25 mm høydeforskjell mellom slukrist og overkant av membran ved dørterskel sikrer at vann ikke renner ut i tilstøtende rom dersom sluket tilstoppes.'
      }
    ],
    contentMarkdown: `
## Innledning: Hvorfor fall på våtrom er byggebransjens største reklamasjonsfelle i Norge

Feil fall mot sluk og manglende oppkant ved døråpning er den hyppigste årsaken til tvister ved eierskifte, tilstandsrapporter og rettstvister på nyoppførte eller rehabiliterte bad i Norge.

Byggteknisk forskrift (TEK17 § 13-15) fastslår at:
> *«Våtrom skal ha gulv med tilstrekkelig fall til sluk slik at bruksvann ledes bort. Lekkasjevann skal synliggjøres og ledes til sluk.»*

---

## 1. Preaksepterte ytelser for fall mot sluk i Norge

For å oppfylle forskriften uten avansert analyse kan utførende følge Direktoratet for byggkvalitet (DiBK) sine preaksepterte ytelser:

1. **Dusjsonen (høyt vannforbruk):**
   - Minimum **1:50 fall** (2 cm per meter) i en radius på minst 0,8 meter fra slukets senter.
   - Ved flislegging med storformatfliser anbefales mosaikkfliser eller konvoluttskjæring i dusjsonen for å unngå motfall.

2. **Gulvet for øvrig:**
   - Minimum **1:100 fall** (1 cm per meter) mot sluk.
   - Gulvet under badekar og vaskemaskin må også ha fall slik at eventuelle lekkasjer renner frem til synlig område eller sluk.

3. **Alternativ løsning med nedsenket dusj:**
   - Det tillates flatt gulv i det generelle baderomsarealet dersom dusjsonen er nedsenket med **minimum 15 mm** og har tilstrekkelig fall i selve nedsenkingen.

---

## 2. Kravet til 25 mm oppkant ved døråpning

Et av de strengeste kontrollpunktene for takstmenn og uavhengig kontroll er barrieren mot tilstøtende rom:
- Høydeforskjellen mellom **overkant slukrist** og **overkant av vanntett sjikt (membran) ved døråpning** skal være **minst 25 mm**.
- Dørterskel eller oppkant må være tettet slik at vann ved oversvømmelse stues opp på badet fremfor å lekke inn i gang, stue eller etasjeskiller.

---

## 3. Slik dokumenterer du fallet vanntett med VikingMester

Når sluk, påstøp og membran er ferdig, krever Plan- og bygningsloven at utførelsen dokumenteres før flislegging:
1. **Fotografer med vater:** Legg et 1-meters vater med libelle mot sluket.
2. **Knips bilde i VikingMester:** Systemets TEK17-visjon stempler bildet automatisk med GPS-posisjon, tidspunkt og måleverdi.
3. **Automatisk sluttrapport:** Bildet legges direkte i den ferdige FDV- og KS-rapporten som overleveres byggherre og Boligmappa.
`
  },
  {
    id: 'art-ns8406-endringsvarsel',
    slug: 'ns-8406-endringsvarsel-frist',
    title: 'NS 8406: Slik varsler du endringsordre og tillegg uten å miste betaling',
    metaDescription: 'Lær hvordan du unngår preklusjon i NS 8406 pkt. 19. Hva betyr «uten ugrunnet opphold», og hvordan formulerer du et juridisk bindende varsel?',
    category: 'ns-standard',
    categoryTitle: 'Kontrakter & Norsk Standard',
    readTimeMinutes: 6,
    author: 'VikingMester Entreprise-advokat',
    createdAt: '2026-09-02T08:00:00Z',
    updatedAt: '2026-09-24T12:00:00Z',
    targetKeywords: ['NS 8406 endringsvarsel', 'uten ugrunnet opphold frist', 'NS 8406 pkt 19.2', 'preklusjon tilleggsarbeid'],
    faqs: [
      {
        question: 'Hvor raskt må jeg varsle etter NS 8406?',
        answer: 'Standarden krever skriftlig varsel «uten ugrunnet opphold». I praksis betyr det at varselet bør sendes innen 3–7 dager etter at behovet for tilleggsarbeid oppstod.'
      },
      {
        question: 'Holder det med en skriftlig melding eller e-post?',
        answer: 'Ja, e-post og digitale meldinger regnes som skriftlig, men det kreves at varselet spesifiserer hva endringen går ut på og at det kreves justering av vederlag eller frist.'
      },
      {
        question: 'Kan byggherre nekte å betale hvis varselet kom for sent?',
        answer: 'Ja, dette kalles preklusjon: Har du varslet for sent, tapes retten til tilleggsbetaling uansett hvor mye arbeid du faktisk har lagt ned.'
      }
    ],
    contentMarkdown: `
## Hvorfor norske håndverkere taper millioner på uvarslet arbeid

Hvert år taper norske entreprenører og håndverksbedrifter store summer i tvister ved sluttoppgjør. Den klassiske fellen er enkel:
Kunden ber om en endring ute på byggeplassen – for eksempel flytting av en vegg, ekstra stikkontakter eller oppgradering av materialer. Håndverkeren utfører arbeidet i god tro, men glemmer å sende skriftlig varsel før fakturaen sendes.

Når sluttoppgjøret kommer, avslår byggherren kravet under henvisning til **NS 8406 pkt. 19.2 og preklusjon**.

---

## 1. Hva krever NS 8406 pkt. 19?

I NS 8406 (Forenklet norsk bygge- og anleggskontrakt) skilles det mellom to hovedkategorier av varsler:

### A. Endringsordre fra byggherre (pkt. 19.1 og 19.2)
Dersom byggherren pålegger endringer eller ytelser som avviker fra kontrakten, må entreprenøren varsle at pålegget anses som en endring og at det vil bli krevd:
- Justering av kontraktssum (vederlag).
- Forlengelse av byggetid (fristforlengelse).

### B. Uforutsette forhold (pkt. 19.3)
Dersom entreprenøren oppdager feil i byggherrens tegninger, uforutsette grunnforhold (f.eks. fjell eller råte) eller hindringer fra andre fag, må dette varsles skriftlig straks.

---

## 2. Tolkningen av «Uten ugrunnet opphold»

Kravet til «uten ugrunnet opphold» er en rettslig standard. Det innebærer:
- Varselet må sendes så snart entreprenøren har hatt rimelig tid til å områ seg og vurdere konsekvensene.
- Høyesterett har i flere dommer slått fast at passivitet utover 1–2 uker ofte medfører preklusjon.
- Vent aldri til slutten av måneden eller til sluttoppgjøret med å fremme kravet!

---

## 3. Løsningen: Tale-til-Endringsmelding i VikingMester

VikingMester er utviklet nettopp for å eliminere denne risikoen:
1. **Snakk inn endringen:** Når kunden ber om noe ekstra, trykker du på mikrofonen på mobilen.
2. **Automatisk juridisk utforming:** Systemet genererer et formelt varsel med korrekt henvisning til NS 8406 pkt. 19.2 og beregner time- og materialpåslag.
3. **Digital signatur:** Varselet sendes direkte til kunden for umiddelbar godkjenning via e-post, Teams eller SMS før arbeidet settes i gang.
`
  },
  {
    id: 'art-sja-krav',
    slug: 'sja-sikker-jobb-analyse-krav',
    title: 'Sikker Jobb Analyse (SJA): Når er det lovpålagt i Norge, og hvordan gjennomføres det?',
    metaDescription: 'Full oversikt over kravene til Sikker Jobb Analyse (SJA) i Byggherreforskriften og Internkontrollforskriften. Slik oppfyller du kravene ved tilsyn fra Arbeidstilsynet.',
    category: 'hms',
    categoryTitle: 'HMS & Sikkerhet',
    readTimeMinutes: 5,
    author: 'VikingMester HMS-sjef',
    createdAt: '2026-09-03T08:00:00Z',
    updatedAt: '2026-09-24T12:00:00Z',
    targetKeywords: ['Sikker Jobb Analyse', 'SJA byggeplass Norge', 'lovkrav SJA Arbeidstilsynet', 'risikovurdering håndverker'],
    faqs: [
      {
        question: 'Hva er forskjellen på en generell risikovurdering og en SJA?',
        answer: 'En generell risikovurdering gjøres for hele bedriften eller byggeplassen på overordnet nivå. En SJA gjøres for en spesifikk, risikofylt eller uvanlig arbeidsoperasjon like før den gjennomføres.'
      },
      {
        question: 'Hvem skal delta i SJA-møtet?',
        answer: 'Alle som skal utføre selve arbeidet må delta, samt ansvarlig arbeidsleder eller bas.'
      },
      {
        question: 'Må SJA dokumenteres skriftlig for Arbeidstilsynet?',
        answer: 'Ja, Arbeidstilsynet krever skriftlig dokumentasjon med dato, oppgaver, identifiserte farer, risikoreduserende tiltak og signaturer fra alle deltakere.'
      }
    ],
    contentMarkdown: `
## Hva er en Sikker Jobb Analyse (SJA)?

En Sikker Jobb Analyse (SJA) er en systematisk og detaljert gjennomgang av alle faremomenter i forkant av en bestemt arbeidsoperasjon på norske byggeplasser. Målet er å identifisere hva som kan gå galt, og iverksette tiltak som fjerner eller reduserer risikoen før arbeidet starter.

---

## 1. Når er en SJA lovpålagt i Norge?

I henhold til **Forskrift om utførelse av arbeid**, **Byggherreforskriften** og **Internkontrollforskriften § 5** skal SJA alltid gjennomføres ved:

1. **Arbeid i høyden:** Arbeid på tak, i personløfter eller stillas der det er fare for fall over 2 meter.
2. **Varme arbeider:** Sveising, skjæring, bruk av åpen flamme eller varmluftpistol med sertifiseringskrav.
3. **Graving og grunnarbeid:** Graving dypere enn 1,5 meter eller nær underjordiske høyspentkabler og rør.
4. **Tunge løft og kranarbeid:** Løft over mannskaper eller samløft med flere kraner.
5. **Arbeid i trange eller lukkede rom:** Sjakter, rør og tanker med fare for oksygenmangel eller farlig gass.
6. **Avvik fra vanlige rutiner:** Når en oppgave må utføres på en annen måte enn planlagt.

---

## 2. De 5 stegene i en godkjent SJA

En godkjent SJA følger alltid denne faste rekkefølgen:

1. **Definer arbeidsoppgaven:** Beskriv nøyaktig hva som skal gjøres og hvem som deltar.
2. **Del opp i deloppgaver:** F.eks. klargjøring, rigging, selve utførelsen og opprydding.
3. **Identifiser farer for hvert trinn:** Hva kan svikte? (Fall, klemfare, elektrisk støt, støv).
4. **Vurder risiko og bestem tiltak:** Sannsynlighet $\\times$ Konsekvens. Bestem PVU (hjelm, sele, maske) og tekniske barrierer (rekkverk, avsug).
5. **Gjennomgang og digital signering:** Alle som deltar må signere før arbeidet settes i gang.
`
  }
];

// ── NASJONAL OG REGIONAL EMNEMATRISE FOR NORGE ─────────────────────
export const CANDIDATE_TOPICS = [
  {
    topic: 'Krav til byggedagbok i Byggherreforskriften § 15 og NS 8405 i Norge',
    category: 'byggeledelse' as const,
    categoryTitle: 'Byggeledelse & Kontrakter'
  },
  {
    topic: 'Uavhengig kontroll våtrom og lufttetthet: Sjekkpunkter, krav og ansvarlig kontroller',
    category: 'tek17' as const,
    categoryTitle: 'TEK17 & Forskrifter'
  },
  {
    topic: 'Våtromsnormen BVN 31.205: Membran, klemring og slukdetaljer i norske boliger',
    category: 'tek17' as const,
    categoryTitle: 'TEK17 & Forskrifter'
  },
  {
    topic: 'NEK 400:2022: Viktigste krav til sluttkontroll, samsvarserklæring og 5 sikre for elektrikere',
    category: 'fag' as const,
    categoryTitle: 'Fagkunnskap Elektro'
  },
  {
    topic: 'Fristforlengelse etter NS 8405: Værforhold, tele, vind og force majeure i Norge',
    category: 'ns-standard' as const,
    categoryTitle: 'Kontrakter & Norsk Standard'
  },
  {
    topic: 'Fuktmåling i treverk før lukking av vegger: Kritiske grenseverdier (15 %) iht. TEK17',
    category: 'fag' as const,
    categoryTitle: 'Fagkunnskap Tømrer'
  },
  {
    topic: 'Kvartsstøv og asbest på byggeplassen: HMS-rutiner, P3-masker og Arbeidstilsynets regler',
    category: 'hms' as const,
    categoryTitle: 'HMS & Sikkerhet'
  },
  {
    topic: 'Overflateklasser K1 til K4 iht. NS 3420: Hvordan unngå tvister i slepelys for malere',
    category: 'fag' as const,
    categoryTitle: 'Fagkunnskap Maler'
  },
  {
    topic: 'Sluttoppgjør etter NS 8406 og NS 8405: Frister, innsigelser og fellen ved sluttoppgjørsavtale',
    category: 'ns-standard' as const,
    categoryTitle: 'Kontrakter & Norsk Standard'
  },
  {
    topic: 'Digitalt stoffkartotek i lomma for håndverkere: Arbeidstilsynets krav ved uanmeldt tilsyn',
    category: 'hms' as const,
    categoryTitle: 'HMS & Sikkerhet'
  },
  {
    topic: 'FDV-dokumentasjon og Boligmappa: Hva må overleveres boligeier før ferdigattest?',
    category: 'tek17' as const,
    categoryTitle: 'TEK17 & Forskrifter'
  },
  {
    topic: 'Samsvarserklæring og DOK-forskriften: Hvilke byggevarer krever CE-merking og ytelseserklæring?',
    category: 'tek17' as const,
    categoryTitle: 'TEK17 & Forskrifter'
  },
  {
    topic: 'Byggeplasskilt, SHA-plan og adgangskontroll: Krav i Byggherreforskriften for små og store prosjekter',
    category: 'hms' as const,
    categoryTitle: 'HMS & Sikkerhet'
  },
  {
    topic: 'Rør-i-rør systemer og lekkasjestoppere iht. TEK17 § 13-15: Montering og kontroll for rørleggere',
    category: 'fag' as const,
    categoryTitle: 'Fagkunnskap Rørlegger'
  },
  {
    topic: 'Trykktesting av bolig (blowerdoor): Slik oppnår du lekkasjetall n50 under 1,5 uten lekkasjepunkter',
    category: 'tek17' as const,
    categoryTitle: 'TEK17 & Forskrifter'
  },
  {
    topic: 'Lærlingoppfølging og halvårsvurderinger for lærebedrifter i byggfagene',
    category: 'byggeledelse' as const,
    categoryTitle: 'Byggeledelse & Rekruttering'
  },
  {
    topic: 'Avvikshåndtering på byggeplassen: Fra RUH (Rapport om uønsket hendelse) til lukket korrigerende tiltak',
    category: 'hms' as const,
    categoryTitle: 'HMS & Sikkerhet'
  },
  {
    topic: 'Byggmesterens guide til NS 8407 Totalentreprise: Risiko, prosjekteringsansvar og varslingsregler',
    category: 'ns-standard' as const,
    categoryTitle: 'Kontrakter & Norsk Standard'
  },
  {
    topic: 'Radonsikring og radonmembran iht. TEK17 § 13-5: Radonsperre, radonavsug og dokumentasjon',
    category: 'tek17' as const,
    categoryTitle: 'TEK17 & Forskrifter'
  },
  {
    topic: 'Brakkerigg, sanitærforhold og velferdsrom på byggeplasser: Arbeidstilsynets minstekrav',
    category: 'hms' as const,
    categoryTitle: 'HMS & Sikkerhet'
  }
];

// ── RETRIEVE ALL ARTICLES (Seeded + Database) ──────────────────
export async function getAllSeoArticles(): Promise<SeoArticle[]> {
  try {
    const dbArticles = await getCollectionItems('seo_articles');
    const combined = [...SEEDED_ARTICLES];

    for (const dba of dbArticles) {
      if (!combined.some(a => a.slug === dba.slug)) {
        combined.push(dba);
      }
    }

    // Sorter med nyeste først
    return combined.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  } catch {
    return SEEDED_ARTICLES;
  }
}

export async function getSeoArticleBySlug(slug: string): Promise<SeoArticle | null> {
  const all = await getAllSeoArticles();
  return all.find(a => a.slug === slug) || null;
}

/**
 * Sjekker om det er på tide med et nytt autoblogg-innlegg (1-2 ganger i uken = ca. hver 3.5 dag)
 */
export async function isAutoblogDue(targetIntervalDays: number = 3.5): Promise<{ due: boolean; daysSinceLast: number; latestDate: string | null }> {
  const articles = await getAllSeoArticles();
  if (articles.length === 0) return { due: true, daysSinceLast: 999, latestDate: null };

  const dates = articles.map(a => new Date(a.createdAt || a.updatedAt).getTime());
  const maxDate = Math.max(...dates);
  const daysSinceLast = (Date.now() - maxDate) / (1000 * 60 * 60 * 24);

  return {
    due: daysSinceLast >= targetIntervalDays,
    daysSinceLast: Number(daysSinceLast.toFixed(1)),
    latestDate: new Date(maxDate).toISOString()
  };
}

// ── AUTONOMOUS EXPANSION CYCLE (Autoblogg på autopilot) ─────────────────
export async function runAutonomousSeoCycle(options?: { force?: boolean }): Promise<{
  createdCount: number;
  articlesCreated: string[];
  skippedReason?: string;
  nextScheduled?: string;
}> {
  console.log('🤖 [Autoblogg Autopilot] Kjører autonom blogg- og SEO-syklus for Norge...');
  
  const scheduleCheck = await isAutoblogDue(3.5);
  if (!options?.force && !scheduleCheck.due) {
    const nextDate = new Date(Date.now() + (3.5 - scheduleCheck.daysSinceLast) * 86400000).toLocaleDateString('nb-NO');
    console.log(`⏳ [Autoblogg Autopilot] Sist publisert for ${scheduleCheck.daysSinceLast} dager siden. Neste publisering planlagt ca. ${nextDate}.`);
    return {
      createdCount: 0,
      articlesCreated: [],
      skippedReason: `Ikke forfalt ennå (sist publisert for ${scheduleCheck.daysSinceLast} dager siden. Mål: 1-2 artikler/uke).`,
      nextScheduled: nextDate
    };
  }

  const existingArticles = await getAllSeoArticles();
  const existingSlugs = new Set(existingArticles.map(a => a.slug));

  // Finn neste emne fra matrisen som ikke er skrevet ennå
  let nextCandidate = CANDIDATE_TOPICS.find(t => {
    const estimatedSlug = t.topic.toLowerCase()
      .replace(/[^a-z0-9æøå]+/g, '-')
      .replace(/^[-\s]+|[-\s]+$/g, '')
      .slice(0, 40);
    return !Array.from(existingSlugs).some(s => s.includes(estimatedSlug.slice(0, 15)));
  });

  // Hvis alle pre-definerte emner er dekket, generer et nytt hyper-relevant norsk emne
  if (!nextCandidate) {
    console.log('[Autoblogg Autopilot] Alle faste emner er dekket! Genererer nytt friskt emne...');
    nextCandidate = {
      topic: `Digital byggeledelse og KS for håndverkere i Norge 2026: Nyeste krav og standarder`,
      category: 'byggeledelse',
      categoryTitle: 'Byggeledelse & Digitalisering'
    };
  }

  console.log(`[Autoblogg Autopilot] Forfatter ny dyptgående fagartikkel for Norge: "${nextCandidate.topic}"...`);

  // Prompt optimalisert for AEO (Answer Engine Optimization) & norsk søkeintensjon
  const prompt = `Du er Norges fremste byggesak- og entrepriseretts-ekspert, sivilingeniør og sjefsredaktør i VikingMester (vikingmester.no).
Skriv en autoritativ, dyptgående og faglig uangripelig artikkel for norske byggmestre, entreprenører og håndverkere i hele Norge om temaet:
"${nextCandidate.topic}"

Krav til innhold (Bygget på Google Search og AI Answer Engine prinsipper):
1. BLUF-format (Bottom Line Up Front): Start med en konsis, direkte oppsummering av reglene og hva håndverkeren må gjøre.
2. Juridisk og faglig forankring i Norge: Sitér spesifikke paragrafer i TEK17, Plan- og bygningsloven (PBL), Byggherreforskriften, Arbeidstilsynets forskrifter eller relevante Norsk Standard (NS 8405, NS 8406, NS 8407, NS 3420).
3. Struktur: Bruk H2 (##), H3 (###), nummererte lister, sammenligningstabeller i Markdown og sitatblokker (>).
4. FAQ-seksjon: Minimum 3 konkrete, realistiske spørsmål og svar som norske håndverkere søker etter på Google eller spør ChatGPT om.
5. Praksis: Avslutt med et konkret avsnitt om hvordan VikingMester løser dette rett fra mobilen på byggeplassen.
6. Språk: Flytende, profesjonelt norsk fagspråk (bokmål).

Returner svaret som et gyldig JSON-objekt med nøyaktig denne strukturen:
{
  "slug": "kort-norsk-url-slug-uten-spesialtegn",
  "title": "Fengende, autoritativ tittel (f.eks: 'TEK17 krav til...')",
  "metaDescription": "Nøyaktig 130-155 tegn engasjerende meta-beskrivelse som rangerer på Google",
  "targetKeywords": ["nøkkelord 1 Norge", "nøkkelord 2", "nøkkelord 3", "fagbegrep"],
  "contentMarkdown": "Hele artikkelen i rik Markdown med tabeller, overskrifter og lister",
  "faqs": [
    { "question": "Ofte stilt spørsmål 1?", "answer": "Konkret svar 1" },
    { "question": "Ofte stilt spørsmål 2?", "answer": "Konkret svar 2" },
    { "question": "Ofte stilt spørsmål 3?", "answer": "Konkret svar 3" }
  ]
}`;

  try {
    const aiRes = await generateWithAiEngine({
      prompt,
      operation: 'seo_generation',
      responseMimeType: 'application/json',
      notes: `Autoblogg post: ${nextCandidate.topic}`
    });

    const cleaned = cleanAiJson(aiRes.text);
    const data = JSON.parse(cleaned);

    // Apply PageRank Sculpting / Interne lenker
    const linkedMarkdown = injectInternalLinks(data.contentMarkdown || '');

    const newArticle: SeoArticle = {
      id: `art-${Date.now()}`,
      slug: data.slug || `fag-${Date.now()}`,
      title: data.title,
      metaDescription: data.metaDescription,
      category: nextCandidate.category,
      categoryTitle: nextCandidate.categoryTitle,
      contentMarkdown: linkedMarkdown,
      faqs: data.faqs || [],
      targetKeywords: data.targetKeywords || [],
      readTimeMinutes: Math.max(4, Math.round((linkedMarkdown.length / 900))),
      author: 'VikingMester Fagredaksjon',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveCollectionItem('seo_articles', newArticle);
    console.log(`✅ [Autoblogg Autopilot] Publiserte ny artikkel: "${newArticle.title}" (/fag/${newArticle.slug})`);

    // Pinge IndexNow (Bing, Yahoo, Seznam) og Google
    await pingSearchEngines([`/fag/${newArticle.slug}`, '/sitemap.xml', '/fag']);

    return {
      createdCount: 1,
      articlesCreated: [newArticle.slug]
    };
  } catch (err: any) {
    console.error('⚠️ [Autoblogg Autopilot] Feil ved artikkelskaping:', err.message);
    return { createdCount: 0, articlesCreated: [], skippedReason: err.message };
  }
}