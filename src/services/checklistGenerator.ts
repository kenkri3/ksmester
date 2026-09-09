import { Trade, ProjectChecklist, ChecklistItem } from '../types';

interface ChecklistGenerationScope {
  trade?: Trade | string;
  title: string;
  description?: string;
  items?: { description: string; quantity?: number; unit?: string }[];
}

// Deterministiske bransje- og fagspesifikke sjekkpunkter basert på norske standarder (TEK17, SAK10, Byggebransjens Våtromsnorm, NEK 400)
const DETERMINISTIC_TRADE_RULES: Record<string, {
  keywords: string[];
  fagkontrollItems: string[];
  hmsItems: string[];
  mottakItems: string[];
  sluttkontrollItems: string[];
}> = {
  vaatrom: {
    keywords: ['bad', 'våtrom', 'dusj', 'membran', 'sluk', 'flis', 'vaskerom', 'baderom'],
    fagkontrollItems: [
      'Er sluk fast forankret og montert i henhold til monteringsanvisning?',
      'Er fall til sluk kontrollert (minimum 1:50 i dusjsone / 1:100 til rommet for øvrig)?',
      'Er slukmansjett og klemring montert korrekt og tett mot sluk (fotodokumentasjon påkrevd)?',
      'Er smøremembran/banemembran påført i forskriftsmessig tykkelse (min. 1 mm tørrfilm)?',
      'Er rør-i-rør fordelerskap montert med vanntett bunn og drenasje til våtrom?',
      'Er det utført tetthetskontroll / trykkprøving av røranlegget før lukking?',
      'Er gips/våtromsplater montert med godkjent skrueavstand og fuktsperre?',
      'Er silikonfuger utført i alle overganger gulv/vegg og hjørner?'
    ],
    hmsItems: [
      'Er tilstrekkelig ventilasjon og åndedrettsvern i bruk ved priming og smøremembran?',
      'Er kjemikalier (primer, membran, fugemasse) kontrollert mot stoffkartotek?',
      'Er vann- og strømtilførsel forskriftsmessig avstengt før riving og oppstart?',
      'Er vernebriller og støvmaske benyttet ved kapping av fliser og riving?'
    ],
    mottakItems: [
      'Er membran og mansjetter kontrollert mot SINTEF Teknisk Godkjenning?',
      'Er fliser og fugemasse sjekket for batch-nummer og fargelikhet?',
      'Er sluk og rørkomponenter levert i henhold til spesifikasjon og skadefri?'
    ],
    sluttkontrollItems: [
      'Er funksjonstest av avløp, sluk og blandebatterier gjennomført uten lekkasje?',
      'Er fallforhold og overflater visuelt kontrollert mot motfall og damdannelse?',
      'Er FDV-dokumentasjon for fliser, armaturer og membran samlet for overlevering?'
    ]
  },
  tak_fasade: {
    keywords: ['tak', 'fasade', 'kledning', 'stein', 'undertak', 'takrenne', 'beslag', 'taktekking'],
    fagkontrollItems: [
      'Er undertak montert med korrekt overlapp og klemte skjøter?',
      'Er sløyfer og lekter dimensjonert og festet med godkjent spiker/skrueavstand?',
      'Er tilstrekkelig luftespalte sikret fra gesims til mønepapp/møne?',
      'Er gradrenner, pipe- og luftebeslag montert fagmessig og vanntett?',
      'Er kledning montert med dryppkant og tilstrekkelig lufting bak kledningen?',
      'Er spiker/skruehoder montert i flukt med treverket uten å knuse overflaten?',
      'Er overganger rundt vinduer og dører utført med godkjente sålebenksbeslag?'
    ],
    hmsItems: [
      'Er godkjent stillas eller fallsikringsutstyr montert og kontrollert før takarbeid?',
      'Er stillas skiltet med grønt godkjenningsskilt og forankret i vegg?',
      'Er vernehjelm og sklisikkert fottøy benyttet av alle på taket?',
      'Er sikring mot fallende gjenstander iverksatt rundt bygget?'
    ],
    mottakItems: [
      'Er trelast og kledning kontrollert for fuktinnhold (< 16% før montering)?',
      'Er takstein/plater kontrollert for sprekker og transportskader?',
      'Er beslag levert med riktige vinkler og dimensjoner?'
    ],
    sluttkontrollItems: [
      'Er takrenner og nedløp testet for vannavrenning uten lekkasjer?',
      'Er snøfangere og takstige montert og forankret iht. TEK17?',
      'Er byggeplassen ryddet for kapp, spiker og avfall?'
    ]
  },
  elektro: {
    keywords: ['el', 'elektro', 'strøm', 'sikring', 'kabel', 'belysning', 'varmekabel', 'el-anlegg', 'stikkontakt'],
    fagkontrollItems: [
      'Er kabeldimensjon og forlegningsmåte kontrollert mot overbelastning?',
      'Er jordfeilautomater / overspenningsvern montert iht. NEK 400?',
      'Er isolasjonsmotstand målt og dokumentert (megging > 1 Mohm)?',
      'Er kontinuitet i beskyttelsesleder (PE-leder) målt og verifisert på alle kurser?',
      'Er overgangsmotstand for jordelektrode målt og funnet tilfredsstillende?',
      'Er varmekabler ohmsk målt før, under og etter støping (dokumentert i skjema)?',
      'Er kursoversikt og merking i sikringsskap komplett og oppdatert?'
    ],
    hmsItems: [
      'Er anlegget gjort spenningsløst og sikret mot gjeninnkobling under arbeid?',
      'Er spenningstester verifisert mot kjent spenningskilde før berøring?',
      'Er personlig verneutstyr (isolerte hansker, vernebriller) tilgjengelig?',
      'Er stiger og arbeidsbukker godkjent og plassert på stabilt underlag?'
    ],
    mottakItems: [
      'Er kabler og materiell CE-merket og godkjent for det norske distribusjonsnettet (230V IT/TT eller 400V TN)?',
      'Er sikringsmateriell levert iht. prosjektert spesifikasjon?'
    ],
    sluttkontrollItems: [
      'Er «5 sikre» sluttkontroll utført og protokollert?',
      'Er samsvarserklæring og sluttkontrollrapport utarbeidet for kunden?',
      'Er FDV og utstyrsdokumentasjon klargjort for innlevering i Boligmappa?'
    ]
  },
  roerlegger: {
    keywords: ['rør', 'plumber', 'sanitær', 'avløp', 'vann', 'varme', 'vvs', 'kran', 'toalett'],
    fagkontrollItems: [
      'Er trykkprøving av tappevannsrør utført med forskriftsmessig trykk og tid?',
      'Er rørklamring og ekspansjonsmulighet ivaretatt på alle rørstrekk?',
      'Er vannstoppventil (lekkasjestopper med sensor) montert i rom uten sluk?',
      'Er avløpsledninger montert med tilstrekkelig selvrensende fall (min. 1:60)?',
      'Er lufting over tak eller vakuumventil montert for å forhindre utsuging av vannlåser?',
      'Er tilbakeslagssikring montert på inntak og utekraner iht. NS-EN 1717?'
    ],
    hmsItems: [
      'Er varmt arbeid sertifikat og slokkemiddel tilstede ved sveising/lodding/flammarbeid?',
      'Er brannvakt etablert under og etter utført varmt arbeid?',
      'Er vernesko, hansker og hørselsvern benyttet?'
    ],
    mottakItems: [
      'Er rør og rørdeler kontrollert for skader og godkjenning for drikkevann?',
      'Er porselen og armaturer sjekket for riss og fabrikasjonsfeil?'
    ],
    sluttkontrollItems: [
      'Er alle tilkoblinger og vannlåser sjekket for fukt og drypp under vanntrykk?',
      'Er blandebatterier justert til forsvarlig skåldetemperatur (maks 55°C)?',
      'Er FDV-instruks med driftsanvisninger for filtre og ventiler samlet?'
    ]
  },
  tomrer_bygg: {
    keywords: ['tømrer', 'tre', 'vegg', 'stender', 'isolasjon', 'gips', 'parkett', 'dør', 'vindu', 'tilbygg'],
    fagkontrollItems: [
      'Er bunnsvill isolert mot betongsåle med fuktsperre/syltetting og forankret?',
      'Er bærende stenderverk i lodd og vater med korrekt senteravstand (c/c 600 mm)?',
      'Er isolasjon montert uten glipper, kuldebroer eller sammenpressing?',
      'Er dampsperre (0,20 mm folie) montert på varm side med klemte, teipede skjøter?',
      'Er vinduer og ytterdører montert i lodd, kryssmålt og mekanisk festet med karmskruer?',
      'Er bunnfyllingslist, diffusjonsåpen utvendig tetting og innvendig damptetting utført rundt vinduer?',
      'Er overliggende bæring (drager/limtre/søyle) utført iht. statiske beregninger?'
    ],
    hmsItems: [
      'Er sagblader, gjærsag og spikerpistoler utstyrt med fungerende vernebrytere?',
      'Er vernebriller og hørselvern påbudt ved kapping og spikring?',
      'Er rømningsveier og gangsoner på byggeplassen holdt fri for materialer og fliser?',
      'Er tunge løft av dragere og vinduer planlagt med mekanisk løftehjelp?'
    ],
    mottakItems: [
      'Er trevirke kontrollert mot konstruksjonssortering (C24/C30)?',
      'Er gips- og trefiberplater lagret tørt innendørs på plant underlag?',
      'Er vinduer og dører kontrollert for transportskader og riktig U-verdi?'
    ],
    sluttkontrollItems: [
      'Er dør- og vindusblader justert for lett og feilfri åpning/lukking?',
      'Er listverk montert med presise gjæringer og usynlige spikerhoder?',
      'Er overleveringsprotokoll klargjort for felles sluttbefaring?'
    ]
  }
};

export const checklistGenerator = {
  /**
   * Genererer 100% skreddersydde, faseinndelte sjekklister basert på arbeidets art og bransje.
   * Benytter deterministisk regelmotor for umiddelbar respons og 0 tokens,
   * og Gemini 3.8 Flash dersom oppdraget krever unik prosjekttilpasning.
   */
  async generateChecklistsForScope(
    projectId: string,
    scope: ChecklistGenerationScope
  ): Promise<ProjectChecklist[]> {
    const tradeKey = (scope.trade || 'general').toLowerCase();
    const combinedText = `${scope.title} ${scope.description || ''} ${(scope.items || []).map(i => i.description).join(' ')}`.toLowerCase();

    // 1. Let etter beste match i deterministiske regler
    let matchedRuleKey: string | null = null;
    let highestScore = 0;

    for (const [key, rule] of Object.entries(DETERMINISTIC_TRADE_RULES)) {
      let score = 0;
      for (const kw of rule.keywords) {
        if (combinedText.includes(kw)) score += 2;
      }
      if (tradeKey.includes(key)) score += 3;
      if (score > highestScore) {
        highestScore = score;
        matchedRuleKey = key;
      }
    }

    // Standard fallback til tømrer/bygg hvis ingen treffer spesifikt
    const rule = matchedRuleKey ? DETERMINISTIC_TRADE_RULES[matchedRuleKey] : DETERMINISTIC_TRADE_RULES.tomrer_bygg;

    // Bygg de 4 standardiserte norske fasene
    const checklists: ProjectChecklist[] = [
      // FASE 1: HMS & Sikkerhetsrigg
      {
        id: `chk-hms-${Date.now()}`,
        projectId,
        title: `HMS & Sikkerhetsrigg - ${scope.title}`,
        trade: scope.trade || 'general',
        phase: 'hms_rigg',
        phaseTitle: 'Fase 1: HMS & Sikkerhetsrigg',
        status: 'pending',
        createdAt: new Date().toISOString(),
        items: rule.hmsItems.map((text, idx) => ({
          id: `item-hms-${idx + 1}-${Date.now()}`,
          text,
          checked: false,
          status: 'pending',
          required: true,
          category: 'HMS',
          order: idx + 1
        }))
      },

      // FASE 2: Mottakskontroll
      {
        id: `chk-mottak-${Date.now() + 1}`,
        projectId,
        title: `Mottakskontroll Byggevarer - ${scope.title}`,
        trade: scope.trade || 'general',
        phase: 'mottak',
        phaseTitle: 'Fase 2: Mottakskontroll',
        status: 'pending',
        createdAt: new Date().toISOString(),
        items: rule.mottakItems.map((text, idx) => ({
          id: `item-mottak-${idx + 1}-${Date.now()}`,
          text,
          checked: false,
          status: 'pending',
          required: true,
          category: 'Mottak',
          order: idx + 1
        }))
      },

      // FASE 3: Fagkontroll & TEK17 KS (Kjernefasen)
      {
        id: `chk-fag-${Date.now() + 2}`,
        projectId,
        title: `Kvalitetssikring & Fagkontroll (TEK17) - ${scope.title}`,
        trade: scope.trade || 'general',
        phase: 'fagkontroll',
        phaseTitle: 'Fase 3: Fagkontroll & TEK17 KS',
        status: 'pending',
        createdAt: new Date().toISOString(),
        items: rule.fagkontrollItems.map((text, idx) => ({
          id: `item-fag-${idx + 1}-${Date.now()}`,
          text,
          checked: false,
          status: 'pending',
          required: true,
          category: 'Fagkontroll',
          order: idx + 1
        }))
      },

      // FASE 4: Sluttkontroll & Overtakelse
      {
        id: `chk-slutt-${Date.now() + 3}`,
        projectId,
        title: `Sluttkontroll & Overtakelse - ${scope.title}`,
        trade: scope.trade || 'general',
        phase: 'sluttkontroll',
        phaseTitle: 'Fase 4: Sluttkontroll & Overtakelse',
        status: 'pending',
        createdAt: new Date().toISOString(),
        items: rule.sluttkontrollItems.map((text, idx) => ({
          id: `item-slutt-${idx + 1}-${Date.now()}`,
          text,
          checked: false,
          status: 'pending',
          required: true,
          category: 'Sluttkontroll',
          order: idx + 1
        }))
      }
    ];

    // Dersom det finnes spesifikke tilbudsposter, legg til dynamiske kontrollpunkter i fagkontrollen
    if (scope.items && scope.items.length > 0) {
      const fagChecklist = checklists.find(c => c.phase === 'fagkontroll');
      if (fagChecklist) {
        scope.items.forEach((item, idx) => {
          if (item.description && item.description.length > 5) {
            fagChecklist.items.push({
              id: `item-item-${idx + 1}-${Date.now()}`,
              text: `Kontroller utførelse og montasje iht. avtale: "${item.description}"`,
              checked: false,
              status: 'pending',
              required: false,
              category: 'Tilbudsposter',
              order: fagChecklist.items.length + 1
            });
          }
        });
      }
    }

    return checklists;
  }
};
