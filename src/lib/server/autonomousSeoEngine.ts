import { getCollectionItems, saveCollectionItem } from './db';
import { GoogleGenAI } from '@google/genai';
import { pingSearchEngines } from './indexNow';

export interface SeoArticle {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  category: 'tek17' | 'hms' | 'ns-standard' | 'byggeledelse' | 'fag';
  categoryTitle: string;
  contentMarkdown: string;
  faqs: { question: string; answer: string }[];
  targetKeywords: string[];
  readTimeMinutes: number;
  author: string;
  createdAt: string;
  updatedAt: string;
}

// ── INTERNAL LINK DICTIONARY (PageRank Sculpting) ─────────────
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
];

export function injectInternalLinks(markdown: string): string {
  let result = markdown;
  for (const { term, url } of INTERNAL_LINKS) {
    // Only replace the first occurrence that is NOT already inside a markdown link [text](url)
    const regex = new RegExp(`(?<!\\[)(?<!/)\\b(${term})\\b(?!\\])(?![^\\(]*\\))`, 'i');
    if (regex.test(result)) {
      result = result.replace(regex, `[$1](${url})`);
    }
  }
  return result;
}

// ── SEEDED EVERGREEN ARTICLES (Active from Day 1) ─────────────
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
    updatedAt: '2026-09-10T12:00:00Z',
    targetKeywords: ['TEK17 fall mot sluk', 'oppkant våtrom dørterskel', 'BVN 31.205', 'slukmansjett klemring'],
    faqs: [
      {
        question: 'Hva er preakseptert fall til sluk i dusjsonen?',
        answer: 'I en radius på minst 0,8 meter fra sluket skal fallet være minst 1:50 (20 mm per meter). For resten av gulvet er kravet minst 1:100 (10 mm per meter).'
      },
      {
        question: 'Er det lov med flatt gulv utenfor dusjsonen?',
        answer: 'Ja, forutsatt at dusjsonen er nedsenket med minst 15 mm i forhold til det øvrige gulvet, og det er fall mot sluk i nedsenkingen.'
      },
      {
        question: 'Hvorfor er oppkanten på 25 mm ved døråpning så viktig?',
        answer: 'Minst 25 mm høydeforskjell mellom slukrist og overkant av membran ved dørterskel sikrer at vann ikke renner ut i tilstøtende rom dersom sluket tilstoppes.'
      }
    ],
    contentMarkdown: `
## Innledning: Hvorfor fall på våtrom er byggebransjens største reklamasjonsfelle

Feil fall mot sluk og manglende oppkant ved døråpning er den hyppigste årsaken til tvister ved eierskifte, tilstandsrapporter og rettstvister på nyoppførte eller rehabiliterte bad i Norge.

Byggteknisk forskrift (TEK17 § 13-15) fastslår at:
> *«Våtrom skal ha gulv med tilstrekkelig fall til sluk slik at bruksvann ledes bort. Lekkasjevann skal synliggjøres og ledes til sluk.»*

---

## 1. Preaksepterte ytelser for fall mot sluk

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
    updatedAt: '2026-09-10T12:00:00Z',
    targetKeywords: ['NS 8406 endringsvarsel', 'uten ugrunnet opphold frist', 'NS 8406 pkt 19.2', 'preklusjon tilleggsarbeid'],
    faqs: [
      {
        question: 'Hvor raskt må jeg varsle etter NS 8406?',
        answer: 'Standarden krever skriftlig varsel «uten ugrunnet opphold». I praksis betyr det at varselet bør sendes innen 3–7 dager etter at behovet for tilleggsarbeid oppstod.'
      },
      {
        question: 'Holder det med en SMS eller en e-post?',
        answer: 'Ja, e-post og SMS regnes som skriftlig, men det kreves at varselet spesifiserer hva endringen går ut på og at det kreves justering av vederlag eller frist.'
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
3. **Digital signatur:** Varselet sendes direkte til kundens mobil for umiddelbar godkjenning via SMS eller BankID før arbeidet settes i gang.
`
  },
  {
    id: 'art-sja-krav',
    slug: 'sja-sikker-jobb-analyse-krav',
    title: 'Sikker Jobb Analyse (SJA): Når er det lovpålagt, og hvordan gjennomføres det?',
    metaDescription: 'Full oversikt over kravene til Sikker Jobb Analyse (SJA) i Byggherreforskriften og Internkontrollforskriften. Slik oppfyller du kravene ved tilsyn.',
    category: 'hms',
    categoryTitle: 'HMS & Sikkerhet',
    readTimeMinutes: 5,
    author: 'VikingMester HMS-sjef',
    createdAt: '2026-09-03T08:00:00Z',
    updatedAt: '2026-09-10T12:00:00Z',
    targetKeywords: ['Sikker Jobb Analyse', 'SJA byggeplass', 'lovkrav SJA Arbeidstilsynet', 'risikovurdering håndverker'],
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
        question: 'Må SJA dokumenteres skriftlig?',
        answer: 'Ja, Arbeidstilsynet krever skriftlig dokumentasjon med dato, oppgaver, identifiserte farer, risikoreduserende tiltak og signaturer fra alle deltakere.'
      }
    ],
    contentMarkdown: `
## Hva er en Sikker Jobb Analyse (SJA)?

En Sikker Jobb Analyse (SJA) er en systematisk og detaljert gjennomgang av alle faremomenter i forkant av en bestemt arbeidsoperasjon. Målet er å identifisere hva som kan gå galt, og iverksette tiltak som fjerner eller reduserer risikoen før arbeidet starter.

---

## 1. Når er en SJA lovpålagt?

I henhold til **Forskrift om utførelse av arbeid**, **Byggherreforskriften** og **Internkontrollforskriften § 5** skal SJA alltid gjennomføres ved:

1. **Arbeid i høyden:** Arbeid på tak, i personløfter eller stillas der det er fare for fall.
2. **Varme arbeider:** Sveising, skjæring, bruk av åpen flamme eller varmluftpistol.
3. **Graving og grunnarbeid:** Graving dypere enn 1,5 meter eller nær underjordiske høyspentkabler og rør.
4. **Tunge løft og kranarbeid:** Løft over mannskaper eller komplekse samløft.
5. **Arbeid i trange eller lukkede rom:** Sjakter, rør og tanker med fare for kvelning eller gass.
6. **Avvik fra vanlige rutiner:** Når en oppgave må utføres på en annen måte enn planlagt.

---

## 2. De 5 stegene i en profesjonell SJA

En godkjent SJA følger alltid denne faste rekkefølgen:

1. **Definer arbeidsoppgaven:** Beskriv nøyaktig hva som skal gjøres og hvem som deltar.
2. **Del opp i deloppgaver:** F.eks. klargjøring, rigging, selve utførelsen og opprydding.
3. **Identifiser farer for hvert trinn:** Hva kan svikte? (Fall, klemfare, elektrisk støt, støv).
4. **Vurder risiko og bestem tiltak:** Sannsynlighet $\times$ Konsekvens. Bestem PVU (hjelm, sele, maske) og tekniske barrierer (rekkverk, avsug).
5. **Gjennomgang og signering:** Alle som deltar må signere før arbeidet settes i gang.
`
  },
  {
    id: 'art-tek17-lufttetthet',
    slug: 'tek17-lufttetthet-dampsperre',
    title: 'TEK17 § 14-2: Krav til tetthet, dampsperre og klemte skjøter',
    metaDescription: 'Hvordan oppfylle TEK17-kravene til luftlekkasjetall (0,6 til 1,5 luftvekslinger per time)? Klemte skjøter, mansjetter og dokumentasjon.',
    category: 'tek17',
    categoryTitle: 'TEK17 & Forskrifter',
    readTimeMinutes: 5,
    author: 'VikingMester Byggteknisk Rådgiver',
    createdAt: '2026-09-04T08:00:00Z',
    updatedAt: '2026-09-10T12:00:00Z',
    targetKeywords: ['TEK17 lufttetthet', 'dampsperre klemte skjøter', 'trykktest bolig krav', 'lekkasjetall TEK17'],
    faqs: [
      {
        question: 'Hva er maksimalt tillatt lekkasjetall for boliger i TEK17?',
        answer: 'Kravet i TEK17 § 14-2 er maksimalt 1,5 luftvekslinger per time ved 50 Pa trykkforskjell (n50 ≤ 1,5 h⁻¹).'
      },
      {
        question: 'Hvorfor holder det ikke bare å teipe dampsperren?',
        answer: 'Tape kan over tid miste hefteevnen ved temperatur- og fuktvariasjoner. Byggforskserien og TEK17 krever klemte skjøter mot fast underlag ved overganger mot sviller, bjelkelag og rørgjennomføringer.'
      }
    ],
    contentMarkdown: `
## Bygningsfysikk og tetthet i moderne trehus

Luftlekkasjer i ytterkonstruksjoner fører til fukttransport ut i isolasjon og vindsperre. Dette er en av de største årsakene til skjult råte og muggsopp i nyere norske boliger.

TEK17 § 14-2 stiller strenge krav til bygningens luftlekkasjetall:
- Småhus og eneboliger: **Maksimalt 1,5 luftvekslinger per time (n50)**.
- Passivhus / lavenergibygg: Ofte skjerpet til **0,6**.

---

## 1. Kritiske detaljer ved dampsperremontasje

1. **Klemte skjøter:**
   - Dampsperren må klemmes mekanisk med lekt eller klemfjøl mot bunn- og toppsvill.
   - Skjøter må ha minst 100 mm overlapp og forsegles med godkjent butylfugemasse eller systemtape.

2. **Gjennomføringer for rør og ventilasjon:**
   - Bruk alltid prefabrikkerte gummimansjetter med klemring fremfor provisorisk teiping.
   - Hver mansjett må tettes og klemmes mot dampsperreduken.

3. **Fotodokumentasjon før kledning:**
   - Når elektriker og rørlegger er ferdige, og før vegger og himling kles med gips eller panel, må samtlige gjennomføringer kontrolleres og fotograferes i KS-systemet.
`
  },
  {
    id: 'art-stoffkartotek-krav',
    slug: 'stoffkartotek-lovkrav-arbeidstilsynet',
    title: 'Stoffkartotek på byggeplassen: Dette krever Arbeidstilsynet ved tilsyn',
    metaDescription: 'Alt du må vite om digitalt stoffkartotek på byggeplassen. Sikkerhetsdatablader (SDS), risikovurdering av kjemikalier og offline-tilgang for ansatte.',
    category: 'hms',
    categoryTitle: 'HMS & Sikkerhet',
    readTimeMinutes: 4,
    author: 'VikingMester HMS-sjef',
    createdAt: '2026-09-05T08:00:00Z',
    updatedAt: '2026-09-10T12:00:00Z',
    targetKeywords: ['stoffkartotek byggeplass', 'arbeidstilsynet stoffkartotek krav', 'sikkerhetsdatablader håndverker', 'kjemikalieforskriften'],
    faqs: [
      {
        question: 'Må enkeltpersonforetak (ENK) ha stoffkartotek?',
        answer: 'Ja, enhver som håndterer kjemikalier som kan utgjøre fare på en arbeidsplass er omfattet av forskrift om utførelse av arbeid, spesielt på byggeplasser under Byggherreforskriften.'
      },
      {
        question: 'Er det tilstrekkelig med papirperm på brakka?',
        answer: 'Papirperm er godkjent så lenge den er oppdatert, men Arbeidstilsynet foretrekker digitale løsninger der montørene har umiddelbar tilgang på mobilen ute på arbeidsstedet.'
      }
    ],
    contentMarkdown: `
## Hva krever forskriften om stoffkartotek?

I henhold til **Forskrift om utførelse av arbeid kapittel 2** skal alle virksomheter som håndterer, bruker eller oppbevarer helsefarlige kjemikalier opprette et stoffkartotek.

Dette gjelder i praksis nesten samtlige håndverkere:
- **Tømrere:** Lim, fugemasse, impregneringsmidler og isolasjon.
- **Rørleggere:** Avfettingsmidler, flussmidler, gasser og kjemikalier for rørrens.
- **Malere:** Maling, lakk, sparkel, tynnere og epoksyprodukter.
- **Murere:** Tørrmørtel med kvartsinnhold, avrettingsmasser og syrevask.

---

## 1. Hva må stoffkartoteket inneholde?

For hvert kjemikalie krever loven:
1. **Oppdatert sikkerhetsdatablad (SDS):** Skrevet på norsk med 16 obligatoriske punkter, inkludert førstehjelpstiltak og personlig verneutstyr.
2. **Kjemisk risikovurdering:** En vurdering av hvordan stoffet faktisk brukes på byggeplassen.
3. **Substitusjonsplikt:** Dokumentasjon på at man har vurdert om farlige stoffer kan byttes ut med mindre farlige alternativer.

---

## 2. VikingMesters offline stoffkartotek

Med VikingMester har alle håndverkere stoffkartoteket direkte i lomma:
- Søk etter produktnavn på sekunder.
- Få umiddelbar visning av påkrevde vernehansker, briller og åndedrettsvern.
- Fungerer 100 % offline når du står i en kjeller eller på et tak uten dekning.
`
  }
];

// ── TOPICS MATRIX FOR AUTONOMOUS EXPANSION ─────────────────────
const CANDIDATE_TOPICS = [
  {
    topic: 'Krav til byggedagbok i Byggherreforskriften § 15 og NS 8405',
    category: 'byggeledelse',
    categoryTitle: 'Byggeledelse & Kontrakter'
  },
  {
    topic: 'Uavhengig kontroll våtrom og lufttetthet: Sjekkpunkter og krav',
    category: 'tek17',
    categoryTitle: 'TEK17 & Forskrifter'
  },
  {
    topic: 'Våtromsnormen BVN 31.205: Membran, klemring og slukdetaljer',
    category: 'tek17',
    categoryTitle: 'TEK17 & Forskrifter'
  },
  {
    topic: 'NEK 400:2022: Viktigste krav til sluttkontroll og 5 sikre',
    category: 'fag',
    categoryTitle: 'Fagkunnskap Elektro'
  },
  {
    topic: 'Fristforlengelse etter NS 8405: Værforhold og force majeure',
    category: 'ns-standard',
    categoryTitle: 'Kontrakter & Norsk Standard'
  },
  {
    topic: 'Fuktmåling i treverk før lukking av vegger: Toleranser og grenser',
    category: 'fag',
    categoryTitle: 'Fagkunnskap Bygg'
  },
  {
    topic: 'Kvartsstøv og asbest på byggeplassen: HMS-rutiner og Arbeidstilsynets regler',
    category: 'hms',
    categoryTitle: 'HMS & Sikkerhet'
  },
  {
    topic: 'Overflateklasser K1 til K4 iht. NS 3420: Hvordan unngå tvister i slepelys',
    category: 'fag',
    categoryTitle: 'Fagkunnskap Maler'
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

    return combined;
  } catch (err) {
    return SEEDED_ARTICLES;
  }
}

export async function getSeoArticleBySlug(slug: string): Promise<SeoArticle | null> {
  const all = await getAllSeoArticles();
  return all.find(a => a.slug === slug) || null;
}

// ── AUTONOMOUS EXPANSION CYCLE ─────────────────────────────────
export async function runAutonomousSeoCycle(): Promise<{ createdCount: number; articlesCreated: string[] }> {
  console.log('🤖 [Autonomous SEO Engine] Starter autonom analyse og utvidelsessyklus...');
  const existingArticles = await getAllSeoArticles();
  const existingSlugs = new Set(existingArticles.map(a => a.slug));

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!geminiKey) {
    console.warn('[Autonomous SEO Engine] Ingen GEMINI_API_KEY funnet. Hopper over AI-artikkelgenerering.');
    return { createdCount: 0, articlesCreated: [] };
  }

  // Find the next topic that hasn't been written about yet
  const nextCandidate = CANDIDATE_TOPICS.find(t => {
    const estimatedSlug = t.topic.toLowerCase()
      .replace(/[^a-z0-9æøå]+/g, '-')
      .replace(/^[-\s]+|[-\s]+$/g, '')
      .slice(0, 40);
    return !Array.from(existingSlugs).some(s => s.includes(estimatedSlug.slice(0, 15)));
  });

  if (!nextCandidate) {
    console.log('[Autonomous SEO Engine] Alle emner i kandidatmatrisen er allerede dekket!');
    return { createdCount: 0, articlesCreated: [] };
  }

  console.log(`[Autonomous SEO Engine] Genererer ny fagartikkel for: "${nextCandidate.topic}"...`);

  const prompt = `Du er Norges fremste byggesak- og entrepriseretts-ekspert, sivilingeniør og fagsjef i VikingMester (vikingmester.no).
Skriv en dyptgående, autoritativ og svært nyttig fagartikkel for norske byggmestre, tømrere og håndverkere om temaet:
"${nextCandidate.topic}"

Krav til innhold:
1. Juridisk og faglig presist: Henvis til spesifikke paragrafer i TEK17, Plan- og bygningsloven, Byggherreforskriften eller relevante Norsk Standard (f.eks. NS 8405, NS 8406, NS 3420).
2. Formatert i ren GitHub-stil Markdown med h2 (##), h3 (###), punktlister, sitatblokker (>) og fet skrift.
3. Ingen introduksjonsprat eller hilsen. Start rett på saken med en fengende introduksjon.
4. Avslutt med 3 relevante, realistiske "Ofte stilte spørsmål" (FAQ) med korte, klare svar.
5. Inkluder en kort henvisning til hvordan VikingMester forenkler dette i praksis med mobilen.

Returner svaret som et gyldig JSON-objekt med følgende struktur:
{
  "slug": "kort-norsk-url-slug",
  "title": "Tittel på artikkelen",
  "metaDescription": "Maks 155 tegn engasjerende meta-beskrivelse for Google",
  "targetKeywords": ["nøkkelord 1", "nøkkelord 2", "nøkkelord 3"],
  "contentMarkdown": "Hele artikkelteksten i Markdown",
  "faqs": [
    { "question": "Spørsmål 1?", "answer": "Svar 1" },
    { "question": "Spørsmål 2?", "answer": "Svar 2" },
    { "question": "Spørsmål 3?", "answer": "Svar 3" }
  ]
}`;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const candidateModels = [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'].filter(Boolean) as string[];
    let aiResponse: any = null;

    for (const m of candidateModels) {
      try {
        aiResponse = await ai.models.generateContent({
          model: m,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        if (aiResponse && aiResponse.text) break;
      } catch (err) {}
    }

    if (!aiResponse || !aiResponse.text) {
      throw new Error('Gemini leverte ingen respons.');
    }

    const data = JSON.parse(aiResponse.text);

    // Apply PageRank Sculpting / Internal link injection
    const linkedMarkdown = injectInternalLinks(data.contentMarkdown || '');

    const newArticle: SeoArticle = {
      id: `art-${Date.now()}`,
      slug: data.slug || `fag-${Date.now()}`,
      title: data.title,
      metaDescription: data.metaDescription,
      category: nextCandidate.category as any,
      categoryTitle: nextCandidate.categoryTitle,
      contentMarkdown: linkedMarkdown,
      faqs: data.faqs || [],
      targetKeywords: data.targetKeywords || [],
      readTimeMinutes: Math.max(3, Math.round((linkedMarkdown.length / 1000))),
      author: 'VikingMester Fagredaksjon',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveCollectionItem('seo_articles', newArticle);
    console.log(`✅ [Autonomous SEO Engine] Publiserte ny artikkel: "${newArticle.title}" (/fag/${newArticle.slug})`);

    // Pinge IndexNow og Google for umiddelbar indeksering
    await pingSearchEngines([`/fag/${newArticle.slug}`, '/sitemap.xml']);

    return {
      createdCount: 1,
      articlesCreated: [newArticle.slug]
    };
  } catch (err: any) {
    console.error('[Autonomous SEO Engine] Feil ved autonom artikkelskaping:', err.message);
    return { createdCount: 0, articlesCreated: [] };
  }
}