import { Trade, ProjectChecklist, ChecklistItem } from '../types';

interface ChecklistGenerationScope {
  trade?: Trade | string;
  title: string;
  description?: string;
  items?: { description: string; quantity?: number; unit?: string }[];
}

interface TradeRuleDefinition {
  name: string;
  standard: string;
  keywords: string[];
  fagkontrollItems: string[];
  hmsItems: string[];
  mottakItems: string[];
  sluttkontrollItems: string[];
}

// Deterministiske bransje- og fagspesifikke sjekkpunkter basert på norske standarder (TEK17, SAK10, Byggebransjens Våtromsnorm, NEK 400, NS 3420)
const DETERMINISTIC_TRADE_RULES: Record<string, TradeRuleDefinition> = {
  vaatrom: {
    name: 'Våtrom & Membran',
    standard: 'Byggebransjens Våtromsnorm (BVN) / TEK17 § 13-15',
    keywords: ['bad', 'våtrom', 'dusj', 'membran', 'sluk', 'flis', 'vaskerom', 'baderom', 'slukmansjett', 'avretting'],
    fagkontrollItems: [
      'Er sluk fast forankret og montert i henhold til monteringsanvisning?',
      'Er fall til sluk kontrollert (minimum 1:50 i nedsenket dusjsone / 1:100 til rommet for øvrig)?',
      'Er slukmansjett og klemring montert korrekt og tett mot sluk (fotodokumentasjon påkrevd før tildekking)?',
      'Er smøremembran/banemembran påført i forskriftsmessig tykkelse (min. 1 mm tørrfilm, kontrollmålt)?',
      'Er rør-i-rør fordelerskap montert med vanntett bunn og drenasje med overløp til våtrom?',
      'Er det utført tetthetskontroll / trykkprøving av røranlegget før innkassing og lukking?',
      'Er gips/våtromsplater montert med godkjent skrueavstand og fuktsperre iht. platetype?',
      'Er silikonfuger utført i alle overganger gulv/vegg, hjørner og rundt gjennomføringer?'
    ],
    hmsItems: [
      'Er tilstrekkelig ventilasjon og åndedrettsvern i bruk ved priming og smøremembran?',
      'Er kjemikalier (primer, membran, fugemasse, lim) kontrollert mot stoffkartotek?',
      'Er vann- og strømtilførsel forskriftsmessig avstengt og plugget før riving og oppstart?',
      'Er vernebriller og støvmaske benyttet ved kapping av fliser og fjerning av gammel masse?'
    ],
    mottakItems: [
      'Er membran og mansjetter kontrollert mot gyldig SINTEF Teknisk Godkjenning (TG)?',
      'Er fliser og fugemasse sjekket for batch-nummer, brenningskode og fargelikhet?',
      'Er sluk, forhøyningsringer og rørkomponenter levert i henhold til spesifikasjon og uskadet?'
    ],
    sluttkontrollItems: [
      'Er funksjonstest av avløp, sluk og blandebatterier gjennomført under fullt vanntrykk uten lekkasje?',
      'Er fallforhold og overflater visuelt kontrollert mot motfall, damdannelse og svanker?',
      'Er FDV-dokumentasjon for fliser, armaturer og membran samlet for innlevering i Boligmappa?'
    ]
  },
  roerlegger: {
    name: 'VVS & Rørlegger',
    standard: 'NS-EN 1717 / TEK17 Kap. 15',
    keywords: ['rør', 'plumber', 'sanitær', 'avløp', 'vann', 'varme', 'vvs', 'kran', 'toalett', 'fordelerskap', 'bereder', 'radiator', 'rør-i-rør'],
    fagkontrollItems: [
      'Er trykkprøving av tappevannsrør utført med forskriftsmessig prøvetrykk og testprotokollert?',
      'Er rørklamring og ekspansjonsmulighet ivaretatt på alle rørstrekk og sjakter?',
      'Er automatisk vannstoppventil (lekkasjestopper med trådløs sensor) montert i alle rom uten sluk?',
      'Er avløpsledninger montert med tilstrekkelig selvrensende fall (min. 1:60 for hovedavløp)?',
      'Er lufting over tak eller godkjent vakuumventil montert for å forhindre utsuging av vannlåser?',
      'Er tilbakeslagssikring montert på inntak og utekraner iht. NS-EN 1717?'
    ],
    hmsItems: [
      'Er varmt arbeid-sertifikat og godkjent slokkemiddel tilstede ved lodding/sveising?',
      'Er brannvakt etablert under og i minimum 60 minutter etter utført varmt arbeid?',
      'Er vernesko med spikertramp, hansker og hørselsvern benyttet på rørstrekk?'
    ],
    mottakItems: [
      'Er rør og rørdeler kontrollert for transportskader og godkjenning for drikkevann?',
      'Er porselen, servant og armaturer sjekket for riss, sprekker og fabrikasjonsfeil?'
    ],
    sluttkontrollItems: [
      'Er alle tilkoblinger og vannlåser sjekket for fukt og drypp under driftstrykk?',
      'Er blandebatterier justert til forsvarlig skåldetemperatur (maks 55°C på tappevann)?',
      'Er FDV-instruks med driftsanvisninger for filtre, stoppekraner og ventiler overlevert?'
    ]
  },
  elektro: {
    name: 'Elektro & El-anlegg',
    standard: 'NEK 400:2022 / Forskrift om elektriske lavspenningsanlegg (FEL)',
    keywords: ['el', 'elektro', 'strøm', 'sikring', 'kabel', 'belysning', 'varmekabel', 'el-anlegg', 'stikkontakt', 'downlight', 'termostat', 'sikringsskap'],
    fagkontrollItems: [
      'Er kabeldimensjon og forlegningsmåte kontrollert mot overbelastning og termisk påkjenning?',
      'Er jordfeilautomater (Type A/B 30mA) og overspenningsvern montert iht. NEK 400?',
      'Er isolasjonsmotstand målt og dokumentert (megging > 1 Mohm på alle kurser)?',
      'Er kontinuitet i beskyttelsesleder (PE-leder) målt og verifisert på samtlige kurser og stikkontakter?',
      'Er overgangsmotstand for jordelektrode målt og funnet tilfredsstillende?',
      'Er varmekabler ohmsk målt før, under og etter støping/avretting (dokumentert i måleskjema)?',
      'Er kursoversikt, vernmerking og advarselskilt i sikringsskap komplett og oppdatert?'
    ],
    hmsItems: [
      'Er anlegget gjort spenningsløst og sikret mot gjeninnkobling (LOTO) før berøring?',
      'Er spenningstester (topolig) verifisert mot kjent spenningskilde før arbeid påbegynnes?',
      'Er isolert verktøy (1000V) og personlig verneutstyr (vernebriller, hansker) benyttet?'
    ],
    mottakItems: [
      'Er kabler og materiell CE-merket og godkjent for det norske distribusjonsnettet (230V IT/TT eller 400V TN)?',
      'Er sikringsmateriell, dimmere og termostater levert iht. prosjektert spesifikasjon?'
    ],
    sluttkontrollItems: [
      'Er «5 sikre» sluttkontroll utført og protokollert med måleverdier?',
      'Er samsvarserklæring og sluttkontrollrapport utarbeidet for kunden?',
      'Er FDV og utstyrsdokumentasjon for vern, varme og lys klargjort for innlevering i Boligmappa?'
    ]
  },
  tomrer_bygg: {
    name: 'Tømrer & Byggkonstruksjon',
    standard: 'TEK17 Kap. 11, 12, 13 & 14 / NS 3420',
    keywords: ['tømrer', 'snekker', 'tre', 'vegg', 'stender', 'isolasjon', 'gips', 'parkett', 'dør', 'vindu', 'tilbygg', 'bjelkelag', 'himling', 'panel'],
    fagkontrollItems: [
      'Er bunnsvill isolert mot betongsåle med fuktsperre/syltetting og forskriftsmessig forankret?',
      'Er bærende stenderverk i lodd og vater med korrekt senteravstand (c/c 600 mm)?',
      'Er isolasjon montert uten glipper, kuldebroer eller sammenpressing?',
      'Er dampsperre (0,20 mm folie) montert på varm side med klemte, teipede skjøter og mansjetter?',
      'Er vinduer og ytterdører montert i lodd, kryssmålt og mekanisk festet med godkjente karmskruer?',
      'Er bunnfyllingslist, diffusjonsåpen utvendig vindtetting og innvendig damptetting utført rundt åpninger?',
      'Er overliggende bæring (drager, limtre, stålbjelke, søyle) utført iht. statiske beregninger?'
    ],
    hmsItems: [
      'Er sagblader, gjærsag og spikerpistoler utstyrt med intakte vernebrytere og rekylsikring?',
      'Er vernebriller og hørselvern påbudt ved kapping, saging og trykkluftspikring?',
      'Er rømningsveier og gangsoner på byggeplassen holdt ryddige og fri for kapp og flis?',
      'Er tunge løft av dragere og vinduer planlagt med mekanisk løftehjelp eller to-mannsløft?'
    ],
    mottakItems: [
      'Er trevirke kontrollert mot konstruksjonssortering (C24/C30) og fuktinnhold (< 16% før innbygging)?',
      'Er gips- og trefiberplater lagret tørt innendørs på plant underlag hevet fra bakken?',
      'Er vinduer og dører kontrollert for transportskader, sprekker og riktig U-verdi?'
    ],
    sluttkontrollItems: [
      'Er dør- og vindusblader justert for lett og feilfri åpning/lukking uten subbing?',
      'Er listverk montert med presise gjæringer, tilpassede hjørner og forsenkede spikerhoder?',
      'Er overleveringsprotokoll klargjort for felles sluttbefaring med oppdragsgiver?'
    ]
  },
  tak_fasade: {
    name: 'Tak & Fasade',
    standard: 'TEK17 Kap. 13 & 14 / Byggforskserien',
    keywords: ['tak', 'fasade', 'kledning', 'stein', 'undertak', 'takrenne', 'beslag', 'taktekking', 'sløyfer', 'lekter', 'gesims', 'møne'],
    fagkontrollItems: [
      'Er undertak montert med korrekt overlapp, fall og klemte skjøter?',
      'Er sløyfer og lekter dimensjonert og festet med godkjent spiker/skrueavstand?',
      'Er tilstrekkelig luftespalte sikret fra gesims til mønepapp/møneavlufting?',
      'Er gradrenner, pipebeslag, luftebeslag og overganger montert fagmessig og vanntett?',
      'Er kledning montert med dryppkant (min. 15° skråkapp) og tilstrekkelig lufting bak kledningen?',
      'Er spiker/skruehoder montert i flukt med treverket uten å knuse fiberoverflaten?',
      'Er overganger rundt vinduer og dører utført med godkjente sålebenksbeslag og oppbrett?'
    ],
    hmsItems: [
      'Er godkjent stillas eller fallsikringsutstyr montert og kontrollert før takarbeid påbegynnes?',
      'Er stillas skiltet med grønt godkjenningsskilt og forankret i vegg i henhold til forskrift?',
      'Er vernehjelm og sklisikkert fottøy benyttet av samtlige arbeidere på taket?',
      'Er sikring mot fallende gjenstander iverksatt rundt bygget med sperrebånd/nett?'
    ],
    mottakItems: [
      'Er trelast og kledning kontrollert for fuktinnhold (< 16% før montering)?',
      'Er takstein/plater kontrollert for sprekker, transportskader og riktig fargekode?',
      'Er beslag levert med riktige vinkler, materialkvalitet og dimensjoner?'
    ],
    sluttkontrollItems: [
      'Er takrenner og nedløp testet for riktig vannavrenning uten lekkasjer eller oppstuing?',
      'Er snøfangere, takstige og feieplattform montert og forankret iht. TEK17?',
      'Er byggeplassen og bakken ryddet for kapp, spiker, emballasje og avfall?'
    ]
  },
  maling_overflate: {
    name: 'Malerarbeid & Overflater',
    standard: 'NS 3420-T / Norsk Standard for Overflatebehandling',
    keywords: ['maling', 'sparkel', 'tapet', 'male', 'maler', 'overflate', 'sparkling', 'grunning', 'akryl', 'strie'],
    fagkontrollItems: [
      'Er underlaget støvsuget, avfettet og primet før sparkling?',
      'Er armeringsstrimler lagt inn i sparkel over alle plateskjøter (gips)?',
      'Er det utført minimum 2-3 strøk sparkling med tilstrekkelig tørketid og mellompussing?',
      'Er overflaten kontrollert med slepelys for synlige ujevnheter og grader?',
      'Er grunning og to toppstrøk påført med jevn filmtykkelse uten sig eller skjolder?',
      'Er elastisk akrylfuging utført i overganger mellom listverk, tak og vegg?'
    ],
    hmsItems: [
      'Er god ventilasjon og eventuelt kullfiltermaske benyttet ved sliping og maling?',
      'Er støvavsug tilkoblet pussemaskiner for å forhindre spredning av gipsstøv?',
      'Er kjemikalier og maling lagret forskriftsmessig i frostfrie beholdere?'
    ],
    mottakItems: [
      'Er maling og sparkel levert i riktig glansgrad, fargekode og batch?',
      'Er sparkelmasse og tape lagret frostfritt og tørt?'
    ],
    sluttkontrollItems: [
      'Er ferdig malte overflater ensartede, rene og uten dekksvikt eller penselstriper?',
      'Er maskeringstape fjernet med skarpe, rene kanter?',
      'Er FDV-opplysninger for fargekoder, glansgrader og vaskbarhet arkivert?'
    ]
  },
  riving_sanering: {
    name: 'Riving & Miljøsanering',
    standard: 'TEK17 Kap. 9 Avfallshåndtering / Arbeidstilsynets forskrifter',
    keywords: ['riving', 'rive', 'asbest', 'sanering', 'kildesortering', 'avfall', 'container', 'fjerning'],
    fagkontrollItems: [
      'Er miljøkartlegging gjennomført før oppstart for å avdekke eventuell asbest eller PCB?',
      'Er vann- og strømtilførsel fysisk frakoblet og verifisert spenningsløst før riving?',
      'Er bærende konstruksjoner understøttet midlertidig med godkjente stempler/reisverk?',
      'Er støvvegger med plast og undertrykksvifter etablert mot tilstøtende beboelsesrom?',
      'Er avfall kildesortert i minimum 6 fraksjoner for å oppnå min. 60% gjenvinning iht. TEK17?'
    ],
    hmsItems: [
      'Er P3-støvmaske, vernebriller og vernesko med spikertramp påbudt under hele rivingen?',
      'Er asbestsertifikat på plass dersom asbestholdige materialer avdekkes?',
      'Er førstehjelpsutstyr lett tilgjengelig ved rivingstomten?'
    ],
    mottakItems: [
      'Er avfallscontainere og big-bags bestilt med riktig fraksjonsmerking?',
      'Er dekkepapp og støvsperreplast på plass før riving påbegynnes?'
    ],
    sluttkontrollItems: [
      'Er arealet støvsuget med HEPA-støvsuger og klargjort for gjenoppbygging?',
      'Er veiesedler og avfallsdeklarasjon fra godkjent gjenvinningsstasjon innhentet for FDV?'
    ]
  }
};

export const checklistGenerator = {
  /**
   * Genererer 100% skreddersydde, faseinndelte og FLERFAGLIGE sjekklister basert på samtlige fag i oppdraget.
   * Dersom et tilbud inneholder både Våtrom, VVS, Elektro og Tømrer, genereres dedikerte fagsjekklister for samtlige.
   */
  async generateChecklistsForScope(
    projectId: string,
    scope: ChecklistGenerationScope
  ): Promise<ProjectChecklist[]> {
    const tradeKey = (scope.trade || 'general').toLowerCase();
    const combinedText = `${scope.title} ${scope.description || ''} ${(scope.items || []).map(i => i.description).join(' ')}`.toLowerCase();

    // 1. Flerfaglig deteksjon: Finn ALLE fag som inngår i prosjektet
    const detectedTrades: string[] = [];

    for (const [key, rule] of Object.entries(DETERMINISTIC_TRADE_RULES)) {
      let score = 0;
      for (const kw of rule.keywords) {
        if (combinedText.includes(kw)) score += 2;
      }
      if (tradeKey.includes(key)) score += 4;
      
      // Hvis tilbudsposter eksplisitt nevner stikkord for faget
      if (scope.items && scope.items.length > 0) {
        for (const it of scope.items) {
          const itemText = (it.description || '').toLowerCase();
          for (const kw of rule.keywords) {
            if (itemText.includes(kw)) score += 1;
          }
        }
      }

      if (score >= 2) {
        detectedTrades.push(key);
      }
    }

    // Standard fallback dersom ingen spesifikke regler traff
    if (detectedTrades.length === 0) {
      detectedTrades.push('tomrer_bygg');
    }

    const baseTimestamp = Date.now();
    const checklists: ProjectChecklist[] = [];

    // FASE 1: Felles HMS & Sikkerhetsrigg (Samler HMS-punkter fra alle involverte fag)
    const combinedHmsItems: string[] = [];
    for (const t of detectedTrades) {
      const rule = DETERMINISTIC_TRADE_RULES[t];
      if (rule) {
        for (const item of rule.hmsItems) {
          if (!combinedHmsItems.includes(item)) combinedHmsItems.push(item);
        }
      }
    }

    checklists.push({
      id: `chk-hms-${baseTimestamp}`,
      projectId,
      title: `HMS & Sikkerhetsrigg - ${scope.title}`,
      trade: detectedTrades[0] || 'general',
      phase: 'hms_rigg',
      phaseTitle: 'Fase 1: HMS & Sikkerhetsrigg',
      status: 'pending',
      createdAt: new Date().toISOString(),
      items: combinedHmsItems.slice(0, 7).map((text, idx) => ({
        id: `item-hms-${idx + 1}-${baseTimestamp}`,
        text,
        checked: false,
        status: 'pending',
        required: true,
        category: 'HMS & Sikkerhet',
        order: idx + 1
      }))
    });

    // FASE 2: Mottakskontroll Byggevarer (Samler varemottak for alle involverte fag)
    const combinedMottakItems: string[] = [];
    for (const t of detectedTrades) {
      const rule = DETERMINISTIC_TRADE_RULES[t];
      if (rule) {
        for (const item of rule.mottakItems) {
          if (!combinedMottakItems.includes(item)) combinedMottakItems.push(item);
        }
      }
    }

    checklists.push({
      id: `chk-mottak-${baseTimestamp + 1}`,
      projectId,
      title: `Mottakskontroll Byggevarer - ${scope.title}`,
      trade: detectedTrades[0] || 'general',
      phase: 'mottak',
      phaseTitle: 'Fase 2: Mottakskontroll Byggevarer',
      status: 'pending',
      createdAt: new Date().toISOString(),
      items: combinedMottakItems.slice(0, 6).map((text, idx) => ({
        id: `item-mottak-${idx + 1}-${baseTimestamp + 1}`,
        text,
        checked: false,
        status: 'pending',
        required: true,
        category: 'Varemottak',
        order: idx + 1
      }))
    });

    // FASE 3: DEDIKERT FAGKONTROLL & TEK17 KS FOR HVERT IDENTIFISERT FAG
    // Dette sikrer at hvis prosjektet har våtrom, VVS, elektro og tømrer, får hvert fag sin egen profesjonelle sjekkliste!
    detectedTrades.forEach((tKey, tradeIdx) => {
      const rule = DETERMINISTIC_TRADE_RULES[tKey];
      if (!rule) return;

      const phaseLetter = String.fromCharCode(65 + tradeIdx); // 3A, 3B, 3C...
      const fagChecklistId = `chk-fag-${tKey}-${baseTimestamp + 10 + tradeIdx}`;
      
      const fagItems: ChecklistItem[] = rule.fagkontrollItems.map((text, itemIdx) => ({
        id: `item-fag-${tKey}-${itemIdx + 1}-${baseTimestamp}`,
        text,
        checked: false,
        status: 'pending',
        required: true,
        category: rule.name,
        order: itemIdx + 1
      }));

      // Koble inn spesifikke tilbudsposter som matcher dette faget
      if (scope.items && scope.items.length > 0) {
        scope.items.forEach((item, itIdx) => {
          const itemDesc = (item.description || '').toLowerCase();
          const matchesThisTrade = rule.keywords.some(kw => itemDesc.includes(kw));
          if (matchesThisTrade && item.description.length > 5) {
            fagItems.push({
              id: `item-offer-${tKey}-${itIdx + 1}-${baseTimestamp}`,
              text: `Kontroll iht. avtalt leveranse: "${item.description}"`,
              checked: false,
              status: 'pending',
              required: false,
              category: `Tilbudspost: ${rule.name}`,
              order: fagItems.length + 1
            });
          }
        });
      }

      checklists.push({
        id: fagChecklistId,
        projectId,
        title: `Fagkontroll ${rule.name} (${rule.standard}) - ${scope.title}`,
        trade: tKey,
        phase: 'fagkontroll',
        phaseTitle: `Fase 3${phaseLetter}: Fagkontroll - ${rule.name}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        items: fagItems
      });
    });

    // FASE 4: Sluttkontroll & Overtakelse (Felles sluttkontroll, funksjonstesting og FDV-samling)
    const combinedSluttItems: string[] = [];
    for (const t of detectedTrades) {
      const rule = DETERMINISTIC_TRADE_RULES[t];
      if (rule) {
        for (const item of rule.sluttkontrollItems) {
          if (!combinedSluttItems.includes(item)) combinedSluttItems.push(item);
        }
      }
    }
    // Alltid sikre felles overleveringselementer
    combinedSluttItems.push('Er overtakelsesprotokoll (NS 8406) gjennomgått og signert av begge parter?');
    combinedSluttItems.push('Er all FDV-dokumentasjon og samsvarserklæringer klargjort for Boligmappa?');

    checklists.push({
      id: `chk-slutt-${baseTimestamp + 99}`,
      projectId,
      title: `Sluttkontroll & Overtakelse - ${scope.title}`,
      trade: detectedTrades[0] || 'general',
      phase: 'sluttkontroll',
      phaseTitle: 'Fase 4: Sluttkontroll & Overtakelse',
      status: 'pending',
      createdAt: new Date().toISOString(),
      items: Array.from(new Set(combinedSluttItems)).map((text, idx) => ({
        id: `item-slutt-${idx + 1}-${baseTimestamp + 99}`,
        text,
        checked: false,
        status: 'pending',
        required: true,
        category: 'Sluttkontroll',
        order: idx + 1
      }))
    });

    return checklists;
  }
};
