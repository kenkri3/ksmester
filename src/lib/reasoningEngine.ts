/**
 * 🧠 MesterAI Dynamic Reasoning & Task Flow Engine
 * 
 * Genererer kontekstuelle, sanntidsbaserte resonneringstrinn tilpasset brukerens henvendelse.
 * Inspirert av verdensledende AI-systemer (OpenAI o3/ChatGPT thinking, Google Gemini, Perplexity).
 * 
 * Funksjoner:
 * - Dynamisk entitets- og emneuttrekking fra prompt (fjerner fyllord)
 * - Intelligent klassifisering av fagområde (NOBB/priser, TEK17, SJA, Byggedagbok, Vision etc.)
 * - Flerspråklig støtte (Norsk, Engelsk, Polsk, Litauisk)
 * - Tidsstyrte mikrosteg med status og levende fremdriftsindikator
 */

export interface ReasoningStep {
  id: number;
  title: string;
  time: number; // Sekunder før trinnet aktiveres
}

export interface ReasoningFlow {
  category: string;
  headline: string;
  subSummary: string;
  steps: ReasoningStep[];
}

/**
 * Renser og trekker ut kjerneemnet/entiteten fra en henvendelse.
 * F.eks: "Sjekk hva de sier om priser på nobb" -> "priser på NOBB"
 */
export function extractSubjectEntity(query: string): string {
  if (!query) return '';
  let clean = query.trim().replace(/[?!.]+$/, '');

  // Regex-mønstre for innledende fyllfraser (Norsk, Engelsk, Polsk, Litauisk)
  const prefixPatterns = [
    /^(vennligst\s+)?(kan\s+du\s+)?(sjekk|sjekke|undersøk|finn\s+ut|undersøke|finn|se\s+på|søk\s+etter|søk\s+opp|søk\s+på)\s+(hva\s+de\s+sier\s+om|hva\s+som\s+sies\s+om|hva\s+som\s+gjelder\s+for|hva|litt\s+om|rundt)?/i,
    /^(hva\s+koster|hva\s+er\s+prisen\s+på|hvor\s+mye\s+koster|hva\s+er\s+kravene\s+til|hva\s+er\s+reglene\s+for|hvordan\s+skal|hvordan\s+gjør\s+man)\s+/i,
    /^(lag\s+en|lag\s+et|opprett\s+en|opprett\s+et|generer|skriv|beregn|kalkuler)\s+/i,
    /^(please\s+)?(can\s+you\s+)?(check|find|search|look\s+up|investigate|calculate)\s+(what\s+they\s+say\s+about|the|about)?/i,
    /^(sprawdź|zbadaj|znajdź|jakie\s+są|ile\s+kosztuje|przygotuj|utwórz)\s+/i,
    /^(patikrink|surask|kokios\s+yra|kiek\s+kainuoja|paruošk|sukurk)\s+/i
  ];

  for (const rx of prefixPatterns) {
    clean = clean.replace(rx, '').trim();
  }

  // Rydd opp eventuelle gjenværende ledende småord
  clean = clean.replace(/^(om|på|for|rundt|til|angående|about|dla|apie)\s+/i, '').trim();

  // Begrens lengde slik at det passer elegant i en brikke/etikett
  if (clean.length > 45) {
    clean = clean.slice(0, 42).trim() + '...';
  }

  // Formater kjente akronymer pent
  clean = clean
    .replace(/\bnobb\b/gi, 'NOBB')
    .replace(/\btek17\b/gi, 'TEK17')
    .replace(/\btek 17\b/gi, 'TEK17')
    .replace(/\bbvn\b/gi, 'BVN')
    .replace(/\bsja\b/gi, 'SJA')
    .replace(/\bhms\b/gi, 'HMS')
    .replace(/\bns\s*8406\b/gi, 'NS 8406')
    .replace(/\bns\s*8405\b/gi, 'NS 8405')
    .replace(/\bfdv\b/gi, 'FDV');

  return clean;
}

/**
 * Genererer dynamisk fremdriftsløp skreddersydd for den aktuelle henvendelsen
 */
export function getDynamicReasoningFlow(
  query: string,
  hasImage: boolean = false,
  language: string = 'no'
): ReasoningFlow {
  const lower = (query || '').toLowerCase();
  const lang = (language || 'no').slice(0, 2).toLowerCase();
  const subject = extractSubjectEntity(query);
  const displaySubject = subject ? `"${subject}"` : '';

  // 1. 📷 Multimodal Bildeanalyse / Vision QA
  if (hasImage || lower.includes('bilde') || lower.includes('foto') || lower.includes('analyser bilde') || lower.includes('se på bilde') || lower.includes('photo') || lower.includes('zdjęcie') || lower.includes('nuotrauka')) {
    if (lang === 'en') {
      return {
        category: 'vision',
        headline: 'Analyzing photo with MesterAI Vision...',
        subSummary: 'Vision & TEK17 QA',
        steps: [
          { id: 1, title: 'Decoding visual details and construction geometry', time: 0 },
          { id: 2, title: 'Identifying materials, execution and trade quality', time: 1.8 },
          { id: 3, title: 'Verifying compliance with TEK17 & building codes', time: 4.2 },
          { id: 4, title: 'Compiling condition findings and actionable advice', time: 7.2 }
        ]
      };
    }
    if (lang === 'pl') {
      return {
        category: 'vision',
        headline: 'Analiza zdjęcia przez MesterAI Vision...',
        subSummary: 'AI Vision i TEK17',
        steps: [
          { id: 1, title: 'Dekodowanie geometrii i szczegółów wizualnych', time: 0 },
          { id: 2, title: 'Identyfikacja materiałów i jakości wykonania', time: 1.8 },
          { id: 3, title: 'Weryfikacja pod kątem norweskich norm TEK17', time: 4.2 },
          { id: 4, title: 'Sporządzanie raportu z oceny i zaleceń', time: 7.2 }
        ]
      };
    }
    if (lang === 'lt') {
      return {
        category: 'vision',
        headline: 'Nuotraukos analizė su MesterAI Vision...',
        subSummary: 'AI Vizija ir TEK17',
        steps: [
          { id: 1, title: 'Vaizdo geometrijos ir detalių dekodavimas', time: 0 },
          { id: 2, title: 'Medžiagų ir atlikimo kokybės atpažinimas', time: 1.8 },
          { id: 3, title: 'Patikra pagal TEK17 ir statybos reglamentus', time: 4.2 },
          { id: 4, title: 'Būklės ataskaitos ir rekomendacijų rengimas', time: 7.2 }
        ]
      };
    }
    return {
      category: 'vision',
      headline: 'Analyserer bilde med MesterAI Vision...',
      subSummary: 'AI-Syn & Byggeplasskontroll',
      steps: [
        { id: 1, title: 'Dekoder visuelle detaljer og konstruksjonsgeometri', time: 0 },
        { id: 2, title: 'Identifiserer materialer, overganger og fagmessig utførelse', time: 1.8 },
        { id: 3, title: 'Sjekker detaljer opp mot TEK17 og håndverksnormer', time: 4.2 },
        { id: 4, title: 'Sammenstiller tilstandsvurdering og faglige tiltak', time: 7.2 }
      ]
    };
  }

  // 2. 🏷️ NOBB, Byggevarepriser, Grossistkataloger (Optimera, Byggmakker, Monter etc.)
  const isNobbPriceQuery = 
    lower.includes('nobb') || 
    lower.includes('byggtjeneste') || 
    lower.includes('grossist') || 
    lower.includes('varenummer') || 
    lower.includes('optimera') || 
    lower.includes('byggmakker') || 
    lower.includes('monter') || 
    lower.includes('montér') || 
    lower.includes('maxbo') || 
    lower.includes('ahlsell') || 
    lower.includes('elektroskandia') || 
    lower.includes('hyllepris') || 
    lower.includes('listepris') || 
    lower.includes('rabatt') ||
    lower.includes('wholesaler') ||
    lower.includes('cennik') ||
    ((lower.includes('pris') || lower.includes('price') || lower.includes('priser') || lower.includes('prices') || lower.includes('cena') || lower.includes('ceny') || lower.includes('kaina') || lower.includes('kainos') || lower.includes('kostnad') || lower.includes('hva koster') || lower.includes('how much') || lower.includes('ile kosztuje') || lower.includes('kiek kainuoja')) && 
     !lower.includes('lag tilbud') && !lower.includes('kalkyle') && !lower.includes('anbud') && !lower.includes('make quote') && !lower.includes('estimate') && !lower.includes('kosztorys'));

  if (isNobbPriceQuery) {
    if (lang === 'en') {
      return {
        category: 'nobb_pricing',
        headline: 'Checking NOBB & building material prices...',
        subSummary: 'NOBB & Wholesaler Pricing',
        steps: [
          { id: 1, title: `Identifying product inquiry: ${displaySubject || '"building materials"'}`, time: 0 },
          { id: 2, title: 'Querying NOBB commodity register & supplier catalogs', time: 1.8 },
          { id: 3, title: 'Cross-checking wholesale pricing, discounts & market rates', time: 4.2 },
          { id: 4, title: 'Compiling structured price overview & trade advice', time: 7.2 }
        ]
      };
    }
    if (lang === 'pl') {
      return {
        category: 'nobb_pricing',
        headline: 'Sprawdzanie bazy NOBB i cen materiałów...',
        subSummary: 'Cenniki Hurtowe i NOBB',
        steps: [
          { id: 1, title: `Identyfikacja zapytania: ${displaySubject || '"materiały budowlane"'}`, time: 0 },
          { id: 2, title: 'Wyszukiwanie w bazie NOBB i cennikach hurtowych', time: 1.8 },
          { id: 3, title: 'Weryfikacja cen katalogowych, rabatów i dostępności', time: 4.2 },
          { id: 4, title: 'Przygotowanie zestawienia cenowego i zaleceń', time: 7.2 }
        ]
      };
    }
    if (lang === 'lt') {
      return {
        category: 'nobb_pricing',
        headline: 'Tikrinama NOBB ir statybinių medžiagų kainos...',
        subSummary: 'NOBB ir Tiekėjų Kainos',
        steps: [
          { id: 1, title: `Užklausos analizė: ${displaySubject || '"statybinės medžiagos"'}`, time: 0 },
          { id: 2, title: 'Paieška NOBB registre ir didmeninėse sistemose', time: 1.8 },
          { id: 3, title: 'Kainų, nuolaidų matricų ir tiekėjų sąlygų patikra', time: 4.2 },
          { id: 4, title: 'Kainų suvestinės ir rekomendacijų rengimas', time: 7.2 }
        ]
      };
    }
    return {
      category: 'nobb_pricing',
      headline: 'Undersøker NOBB og byggevarepriser...',
      subSummary: 'NOBB & Grossistregister',
      steps: [
        { id: 1, title: `Identifiserer forespørsel: ${displaySubject || '"byggevarer og materiell"'}`, time: 0 },
        { id: 2, title: 'Søker i NOBB-varekatalog og grossistsystemer', time: 1.8 },
        { id: 3, title: 'Kryssjekker veiledende priser, rabattmatriser og leverandører', time: 4.2 },
        { id: 4, title: 'Sammenstiller prisoversikt og faglige anbefalinger', time: 7.2 }
      ]
    };
  }

  // 3. 🌐 Sanntidssøk på nett, nyheter, arrangementer, åpningstider
  const isWebSearchQuery = 
    lower.includes('søk') || 
    lower.includes('google') || 
    lower.includes('hva skjer') || 
    lower.includes('skjer i') || 
    lower.includes('i helgen') || 
    lower.includes('arrangement') || 
    lower.includes('konsert') || 
    lower.includes('festival') || 
    lower.includes('nyheter') || 
    lower.includes('åpningstid') || 
    lower.includes('kurs') || 
    lower.includes('nettsøk') ||
    lower.includes('search') ||
    lower.includes('szukaj') ||
    lower.includes('paieška');

  if (isWebSearchQuery) {
    if (lang === 'en') {
      return {
        category: 'web_search',
        headline: 'Searching live web sources...',
        subSummary: 'Real-time Web Search',
        steps: [
          { id: 1, title: `Formulating search intent: ${displaySubject || '"live query"'}`, time: 0 },
          { id: 2, title: 'Retrieving verified real-time sources & directories', time: 1.8 },
          { id: 3, title: 'Analyzing and cross-checking latest updates', time: 4.2 },
          { id: 4, title: 'Structuring concise response with verified facts', time: 7.2 }
        ]
      };
    }
    if (lang === 'pl') {
      return {
        category: 'web_search',
        headline: 'Wyszukiwanie w internecie w czasie rzeczywistym...',
        subSummary: 'Wyszukiwanie na żywo',
        steps: [
          { id: 1, title: `Formułowanie zapytania: ${displaySubject || '"wyszukiwanie"'}`, time: 0 },
          { id: 2, title: 'Przeszukiwanie aktualnych źródeł internetowych', time: 1.8 },
          { id: 3, title: 'Weryfikacja i porównanie najnowszych wyników', time: 4.2 },
          { id: 4, title: 'Przygotowanie zweryfikowanej odpowiedzi', time: 7.2 }
        ]
      };
    }
    if (lang === 'lt') {
      return {
        category: 'web_search',
        headline: 'Paieška internete realiu laiku...',
        subSummary: 'Paieška Realiu Laiku',
        steps: [
          { id: 1, title: `Užklausos formulavimas: ${displaySubject || '"paieška"'}`, time: 0 },
          { id: 2, title: 'Naujausios informacijos paieška šaltiniuose', time: 1.8 },
          { id: 3, title: 'Rezultatų analizė ir patikimumo patikra', time: 4.2 },
          { id: 4, title: 'Tikslus atsakymo struktūrizavimas', time: 7.2 }
        ]
      };
    }
    return {
      category: 'web_search',
      headline: 'Søker i sanntidskilder på nettet...',
      subSummary: 'Sanntidssøk & Kilder',
      steps: [
        { id: 1, title: `Definerer søkeintensjon: ${displaySubject || '"oppdaterte kilder"'}`, time: 0 },
        { id: 2, title: 'Søker i sanntidsdatabaser og offentlige registre', time: 1.8 },
        { id: 3, title: 'Analyserer og kryssjekker ferske treff', time: 4.2 },
        { id: 4, title: 'Strukturerer svar med verifiserte fakta', time: 7.2 }
      ]
    };
  }

  // 4. 📐 TEK17, Lover, Forskrifter, Våtromsnorm (BVN) & Standarder
  const isTek17Query = 
    lower.includes('tek17') || 
    lower.includes('tek 17') || 
    lower.includes('tek10') || 
    lower.includes('bvn') || 
    lower.includes('våtrom') || 
    lower.includes('forskrift') || 
    lower.includes('sak10') || 
    lower.includes('preakseptert') || 
    lower.includes('fall mot sluk') || 
    lower.includes('u-verdi') || 
    lower.includes('radon') || 
    lower.includes('brannkrav') || 
    lower.includes('rekkverk') ||
    lower.includes('building code') ||
    lower.includes('regulation') ||
    lower.includes('normy budowlane') ||
    lower.includes('statybos normos');

  if (isTek17Query) {
    if (lang === 'en') {
      return {
        category: 'tek17',
        headline: 'Consulting TEK17 & building regulations...',
        subSummary: 'Building Regulations & Standards',
        steps: [
          { id: 1, title: `Analyzing code requirements: ${displaySubject || '"building regulations"'}`, time: 0 },
          { id: 2, title: 'Checking TEK17 clauses, BVN & pre-accepted solutions', time: 1.8 },
          { id: 3, title: 'Verifying tolerances and regulatory safety limits', time: 4.2 },
          { id: 4, title: 'Formulating compliant professional guidance', time: 7.2 }
        ]
      };
    }
    if (lang === 'pl') {
      return {
        category: 'tek17',
        headline: 'Konsultacja przepisów budowlanych TEK17...',
        subSummary: 'Normy Budowlane TEK17',
        steps: [
          { id: 1, title: `Analiza wymogów: ${displaySubject || '"przepisy budowlane"'}`, time: 0 },
          { id: 2, title: 'Weryfikacja wytycznych TEK17 i normy łazienkowej BVN', time: 1.8 },
          { id: 3, title: 'Sprawdzanie dopuszczalnych tolerancji technicznych', time: 4.2 },
          { id: 4, title: 'Formułowanie profesjonalnej opinii budowlanej', time: 7.2 }
        ]
      };
    }
    if (lang === 'lt') {
      return {
        category: 'tek17',
        headline: 'Tikrinamos TEK17 statybos normos...',
        subSummary: 'TEK17 Statybos Reglamentas',
        steps: [
          { id: 1, title: `Reikalavimų analizė: ${displaySubject || '"statybos normos"'}`, time: 0 },
          { id: 2, title: 'Patikra TEK17 punktuose ir BVN reikalavimuose', time: 1.8 },
          { id: 3, title: 'Techninių tolerancijų ir saugos normų vertinimas', time: 4.2 },
          { id: 4, title: 'Teisės aktus atitinkančių išvadų formulavimas', time: 7.2 }
        ]
      };
    }
    return {
      category: 'tek17',
      headline: 'Konsulterer TEK17 og byggforskrifter...',
      subSummary: 'TEK17 & Fagstandarder',
      steps: [
        { id: 1, title: `Analyserer problemstilling: ${displaySubject || '"fagmessige krav"'}`, time: 0 },
        { id: 2, title: 'Slår opp i TEK17, veiledninger og preaksepterte ytelser', time: 1.8 },
        { id: 3, title: 'Vurderer toleransegrenser og tekniske krav', time: 4.2 },
        { id: 4, title: 'Formulerer forskriftsmessig fagvurdering', time: 7.2 }
      ]
    };
  }

  // 5. 💰 Kalkyle & Tilbud (Eksplisitte tilbudsforespørsler)
  const isEstimateOfferQuery = 
    lower.includes('tilbud') || 
    lower.includes('kalkyle') || 
    lower.includes('kalkuler') || 
    lower.includes('prisestimat') || 
    lower.includes('lag tilbud') || 
    lower.includes('anbud') ||
    lower.includes('make quote') ||
    lower.includes('estimate') ||
    lower.includes('bid') ||
    lower.includes('kosztorys') ||
    lower.includes('oferta cenowa') ||
    lower.includes('komercinis pasiūlymas') ||
    lower.includes('sąmata');

  if (isEstimateOfferQuery) {
    if (lang === 'en') {
      return {
        category: 'estimate',
        headline: 'Calculating & preparing project quote...',
        subSummary: 'Estimate & Quote Engine',
        steps: [
          { id: 1, title: `Scoping work description: ${displaySubject || '"project work"'}`, time: 0 },
          { id: 2, title: 'Calculating material quantities, waste & unit rates', time: 1.8 },
          { id: 3, title: 'Estimating labour hours per industry standards', time: 4.2 },
          { id: 4, title: 'Finalizing professional client proposal draft', time: 7.2 }
        ]
      };
    }
    if (lang === 'pl') {
      return {
        category: 'estimate',
        headline: 'Kalkulacja i przygotowanie oferty cenowej...',
        subSummary: 'Kalkulacja Kosztorysowa',
        steps: [
          { id: 1, title: `Określenie zakresu prac: ${displaySubject || '"zakres prac"'}`, time: 0 },
          { id: 2, title: 'Obliczenie zapotrzebowania na materiały i cen jednostkowych', time: 1.8 },
          { id: 3, title: 'Szacowanie roboczogodzin wg norm branżowych', time: 4.2 },
          { id: 4, title: 'Przygotowanie kompletnego projektu oferty dla klienta', time: 7.2 }
        ]
      };
    }
    if (lang === 'lt') {
      return {
        category: 'estimate',
        headline: 'Kainos kalkuliavimas ir pasiūlymo rengimas...',
        subSummary: 'Sąmata ir Pasiūlymas',
        steps: [
          { id: 1, title: `Darbų apimties nustatymas: ${displaySubject || '"darbų apimtis"'}`, time: 0 },
          { id: 2, title: 'Medžiagų poreikio ir vienetinių kainų skaičiavimas', time: 1.8 },
          { id: 3, title: 'Darbo valandų skaičiavimas pagal standartus', time: 4.2 },
          { id: 4, title: 'Komercinio pasiūlymo projekto parengimas', time: 7.2 }
        ]
      };
    }
    return {
      category: 'estimate',
      headline: 'Kalkulerer og utarbeider tilbudsutkast...',
      subSummary: 'Kalkyle & Pristilbud',
      steps: [
        { id: 1, title: `Kartlegger oppdragsomfang: ${displaySubject || '"arbeidsbeskrivelse"'}`, time: 0 },
        { id: 2, title: 'Beregner materialbehov, svinn og enhetspriser', time: 1.8 },
        { id: 3, title: 'Estimerer timeforbruk iht. bransjestandard', time: 4.2 },
        { id: 4, title: 'Utarbeider komplett kalkyle og tilbudsutkast', time: 7.2 }
      ]
    };
  }

  // 6. 🦺 Sikker Jobb Analyse (SJA) & HMS
  const isSjaQuery = 
    lower.includes('sja') || 
    lower.includes('sikkerhet') || 
    lower.includes('hms') || 
    lower.includes('risiko') || 
    lower.includes('vern') || 
    lower.includes('stillas') || 
    lower.includes('fallsikring') || 
    lower.includes('pvu') ||
    lower.includes('safety') ||
    lower.includes('risk assessment') ||
    lower.includes('hse') ||
    lower.includes('bhp') ||
    lower.includes('sauga');

  if (isSjaQuery) {
    if (lang === 'en') {
      return {
        category: 'sja',
        headline: 'Preparing Safe Job Analysis (SJA)...',
        subSummary: 'HSE & Risk Assessment',
        steps: [
          { id: 1, title: `Mapping hazards for ${displaySubject || 'operations'}`, time: 0 },
          { id: 2, title: 'Consulting Norwegian HSE regulations & safety guidelines', time: 1.8 },
          { id: 3, title: 'Defining preventive risk mitigation & PPE requirements', time: 4.2 },
          { id: 4, title: 'Finalizing approved Safe Job Analysis (SJA)', time: 7.2 }
        ]
      };
    }
    if (lang === 'pl') {
      return {
        category: 'sja',
        headline: 'Przygotowanie Analizy Bezpieczeństwa (SJA)...',
        subSummary: 'BHP i Ocena Ryzyka',
        steps: [
          { id: 1, title: `Określenie czynników ryzyka dla ${displaySubject || 'prac'}`, time: 0 },
          { id: 2, title: 'Weryfikacja norweskich przepisów BHP (HMS)', time: 1.8 },
          { id: 3, title: 'Ustalenie środków ochronnych i wyposażenia ŚOI', time: 4.2 },
          { id: 4, title: 'Fizyczna generacja zatwierdzonego raportu SJA', time: 7.2 }
        ]
      };
    }
    if (lang === 'lt') {
      return {
        category: 'sja',
        headline: 'Rengiama Saugaus darbo analizė (SJA)...',
        subSummary: 'Darbų Sauga ir Rizika',
        steps: [
          { id: 1, title: `Rizikos veiksnių vertinimas: ${displaySubject || 'darbai'}`, time: 0 },
          { id: 2, title: 'Darbų saugos reikalavimų tikrinimas', time: 1.8 },
          { id: 3, title: 'Apsaugos priemonių ir AAP parinkimas', time: 4.2 },
          { id: 4, title: 'Saugaus darbo analizės (SJA) užbaigimas', time: 7.2 }
        ]
      };
    }
    return {
      category: 'sja',
      headline: 'Utarbeider Sikker Jobb Analyse (SJA)...',
      subSummary: 'HMS & Risikovurdering',
      steps: [
        { id: 1, title: `Kartlegger risikofaktorer: ${displaySubject || '"arbeidsoperasjoner"'}`, time: 0 },
        { id: 2, title: 'Konsulterer Byggherreforskriften og HMS-krav', time: 1.8 },
        { id: 3, title: 'Definerer forebyggende sikringstiltak og PVU', time: 4.2 },
        { id: 4, title: 'Ferdigstiller godkjent Sikker Jobb Analyse (SJA)', time: 7.2 }
      ]
    };
  }

  // 7. 📄 Endringsordre & NS 8406 / NS 8405 Kontrakt
  const isChangeOrderQuery = 
    lower.includes('endring') || 
    lower.includes('ns 8406') || 
    lower.includes('ns8406') || 
    lower.includes('ns 8405') || 
    lower.includes('ns8405') || 
    lower.includes('varsel') || 
    lower.includes('tillegg') || 
    lower.includes('fristforlengelse') ||
    lower.includes('change order') ||
    lower.includes('variation order') ||
    lower.includes('roszczenie') ||
    lower.includes('pakeitimai');

  if (isChangeOrderQuery) {
    return {
      category: 'change_order',
      headline: lang === 'en' ? 'Processing contractual change order...' : 'Vurderer endring og varsling iht. NS 8406...',
      subSummary: 'NS 8406 Endringsvarsel',
      steps: [
        { id: 1, title: 'Vurderer varslingsplikt og frister iht. NS 8406', time: 0 },
        { id: 2, title: 'Beregner konsekvens for fremdrift og vederlag', time: 1.8 },
        { id: 3, title: 'Formulerer formelt endringsvarsel for oppdragsgiver', time: 4.2 },
        { id: 4, title: 'Klargjør dokumentasjon og utsendelsesgrunnlag', time: 7.2 }
      ]
    };
  }

  // 8. 📅 Byggedagbok, Vær, Timer & Fremdrift
  const isDailyLogQuery = 
    lower.includes('dagbok') || 
    lower.includes('byggedagbok') || 
    lower.includes('time') || 
    lower.includes('timer') || 
    lower.includes('vær') || 
    lower.includes('bemanningsliste') ||
    lower.includes('daily log') ||
    lower.includes('site log') ||
    lower.includes('hours') ||
    lower.includes('dziennik budowy') ||
    lower.includes('statybos žurnalas');

  if (isDailyLogQuery) {
    return {
      category: 'daily_log',
      headline: lang === 'en' ? 'Updating site log & time entries...' : 'Oppdaterer byggedagbok og timeføring...',
      subSummary: 'Byggedagbok & Timer',
      steps: [
        { id: 1, title: 'Henter gjeldende prosjektdata og sanntidsvær', time: 0 },
        { id: 2, title: 'Registrerer timefordeling og ressursbruk', time: 1.8 },
        { id: 3, title: 'Dokumenterer arbeidsforhold og fremdrift', time: 4.2 },
        { id: 4, title: 'Ferdigstiller oppføring i byggedagboken', time: 7.2 }
      ]
    };
  }

  // 9. ⚠️ Avvik & Kvalitetssikring (KS)
  const isDeviationQuery = 
    lower.includes('avvik') || 
    lower.includes('reklamasjon') || 
    lower.includes('mangel') || 
    lower.includes('feil på') ||
    lower.includes('deviation') ||
    lower.includes('non-conformance') ||
    lower.includes('odchyłka') ||
    lower.includes('usterka') ||
    lower.includes('neatitikimas');

  if (isDeviationQuery) {
    return {
      category: 'deviation',
      headline: lang === 'en' ? 'Registering QA deviation...' : 'Registrerer og analyserer KS-avvik...',
      subSummary: 'Kvalitetssikring & Avvik',
      steps: [
        { id: 1, title: `Klassifiserer avviksgrad: ${displaySubject || '"avviksforhold"'}`, time: 0 },
        { id: 2, title: 'Undersøker årsakssammenheng og regelverkskrav', time: 1.8 },
        { id: 3, title: 'Definerer strakstiltak og korrigerende handlinger', time: 4.2 },
        { id: 4, title: 'Oppretter formell avviksrapport i KS-arkivet', time: 7.2 }
      ]
    };
  }

  // 10. 🎯 Generell Henvendelse & Byggmester-rådgivning (Dynamisk Fallback)
  if (lang === 'en') {
    return {
      category: 'general',
      headline: displaySubject ? `Analyzing ${displaySubject}...` : 'MesterAI is processing your request...',
      subSummary: 'Autonomous Building Assistant',
      steps: [
        { id: 1, title: `Interpreting query: ${displaySubject || '"trade inquiry"'}`, time: 0 },
        { id: 2, title: 'Consulting Norwegian building codes & project context', time: 1.8 },
        { id: 3, title: 'Structuring professional advice and solutions', time: 4.2 },
        { id: 4, title: 'Finalizing comprehensive verified response', time: 7.2 }
      ]
    };
  }
  if (lang === 'pl') {
    return {
      category: 'general',
      headline: displaySubject ? `Analizowanie ${displaySubject}...` : 'MesterAI przetwarza Twoje zapytanie...',
      subSummary: 'Asystent Budowlany MesterAI',
      steps: [
        { id: 1, title: `Interpretacja zapytania: ${displaySubject || '"sprawa budowlana"'}`, time: 0 },
        { id: 2, title: 'Weryfikacja norweskich norm i kontekstu budowy', time: 1.8 },
        { id: 3, title: 'Opracowanie fachowych zaleceń i rozwiązań', time: 4.2 },
        { id: 4, title: 'Finalizacja rzetelnej odpowiedzi fachowca', time: 7.2 }
      ]
    };
  }
  if (lang === 'lt') {
    return {
      category: 'general',
      headline: displaySubject ? `Analizuojama ${displaySubject}...` : 'MesterAI apdoroja jūsų užklausą...',
      subSummary: 'MesterAI Statybų Asistentas',
      steps: [
        { id: 1, title: `Užklausos analizė: ${displaySubject || '"statybinis klausimas"'}`, time: 0 },
        { id: 2, title: 'Statybos reglamentų ir objekto duomenų peržiūra', time: 1.8 },
        { id: 3, title: 'Fakto analizė ir sprendimo parengimas', time: 4.2 },
        { id: 4, title: 'Galutinio išsamaus atsakymo pateikimas', time: 7.2 }
      ]
    };
  }

  return {
    category: 'general',
    headline: displaySubject ? `Analyserer ${displaySubject}...` : 'MesterAI arbeider med oppgaven...',
    subSummary: 'Autonom Fagpilot',
    steps: [
      { id: 1, title: `Tolker henvendelse: ${displaySubject || '"byggfaglig problemstilling"'}`, time: 0 },
      { id: 2, title: 'Konsulterer TEK17 og relevante bransjestandarder', time: 1.8 },
      { id: 3, title: 'Utarbeider faglig vurdering og løsningsforslag', time: 4.2 },
      { id: 4, title: 'Kvalitetssikrer og ferdigstiller komplett svar', time: 7.2 }
    ]
  };
}
