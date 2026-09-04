// Deterministic Rule Engine for standard Norwegian building tasks and HSE compliance
// Resolves high-frequency construction templates with 0 token expenditure

export interface SjaRuleResult {
  title: string;
  task: string;
  risikoer: { aktivitet: string; risiko: string; tiltak: string }[];
  utstyr: string[];
  tek17Reference: string;
  weatherImpact: string;
}

export function tryResolveDeterministicSja(taskDescription: string, weatherInfo?: string): SjaRuleResult | null {
  const desc = taskDescription.toLowerCase();

  // 1. Stillas og arbeid i høyden
  if (desc.includes('stillas') || (desc.includes('høyde') && desc.includes('monter'))) {
    return {
      title: 'SJA: Montering og bruk av stillas',
      task: taskDescription,
      risikoer: [
        {
          aktivitet: 'Bæring og oppsetting av stillaselementer',
          risiko: 'Fall fra høyde, klemfare og fallende gjenstander under montasje',
          tiltak: 'Bruk fallsikringssele, sperr av bakkenivå, sikre alle bolter og rekkverk før oppstigning'
        },
        {
          aktivitet: 'Forankring i vegg',
          risiko: 'Velt eller ustabilitet ved belastning eller vind',
          tiltak: 'Monter godkjente veggfester i henhold til stillasprodusentens anvisning for hver 4. meter'
        },
        {
          aktivitet: 'Adkomst og daglig bruk',
          risiko: 'Sklifare og fall gjennom åpne luker',
          tiltak: 'Lukk alltid stillasluker etter passering. Gjennomfør daglig visuell kontroll og før godkjenningsskilt'
        }
      ],
      utstyr: [
        'Hjelm med hakestropp',
        'Vernesko S3',
        'Fallsikringssele med falldemper',
        'Synlighetstøy',
        'Vernehansker med godt grep'
      ],
      tek17Reference: 'TEK17 § 12-16 (Sikkerhet i bruk og adkomst) og Forskrift om utførelse av arbeid kapittel 17 (Arbeid i høyden)',
      weatherImpact: weatherInfo 
        ? `Værobservasjon: ${weatherInfo}. Ved vind over 10 m/s eller glatt underlag skal arbeidet umiddelbart stanses eller sikringstiltak forsterkes.`
        : 'Ved vind over 10-12 m/s, underkjølt regn eller snø skal stillasarbeid stanses inntil flatene er saltet/måket og kontrollert.'
    };
  }

  // 2. Varmt arbeid (sveising, taktekking med åpen flamme, vinkelsliper)
  if (desc.includes('varmt arbeid') || desc.includes('sveis') || desc.includes('flamme') || desc.includes('brenner')) {
    return {
      title: 'SJA: Utførelse av Varmt Arbeid',
      task: taskDescription,
      risikoer: [
        {
          aktivitet: 'Bruk av åpen flamme eller gnistproduserende utstyr',
          risiko: 'Brannutvikling i brennbare bygningsmaterialer eller isolasjon',
          tiltak: 'Rydd og fei arbeidsområdet i min. 10 meters omkrets. Tildekk brennbart materiale med branntepper'
        },
        {
          aktivitet: 'Gasshåndtering og sveiseutstyr',
          risiko: 'Gasslekkasje, tilbakeslag eller eksplosjonsfare',
          tiltak: 'Plasser gassflasker stående og fastlåst. Sjekk tilbakeslagsventiler og slanger med såpevann'
        },
        {
          aktivitet: 'Etterkontroll',
          risiko: 'Uoppdaget ulmebrann i konstruksjonen etter arbeidsdagens slutt',
          tiltak: 'Gjennomfør obligatorisk brannvakt i minimum 60 minutter etter at arbeidet er avsluttet'
        }
      ],
      utstyr: [
        'Brannslukningsapparat (min 2x 6kg pulver eller tilsvarende)',
        'Branntepper og sveiseduk',
        'Vernebriller/Sveiseskjerm',
        'Brannsikre arbeidshansker',
        'Førstehjelpsutstyr for brannskader'
      ],
      tek17Reference: 'TEK17 § 11-1 (Sikkerhet ved brann) og Forskrift om brannforebygging § 3',
      weatherImpact: weatherInfo
        ? `Værobservasjon: ${weatherInfo}. Ved sterk vind øker faren for gnistspredning drastisk. Sikkerhetsavstand må dobles.`
        : 'Tørt og vindfullt vær øker faren for brannspredning. Ved vindkast skal åpen flamme skjermes ekstra eller utsettes.'
    };
  }

  // 3. Våtrom og membran
  if (desc.includes('våtrom') || desc.includes('membran') || desc.includes('sluk') || desc.includes('bad')) {
    return {
      title: 'SJA & KS: Våtromsarbeid og Membranlegging',
      task: taskDescription,
      risikoer: [
        {
          aktivitet: 'Montering og tilpasning av sluk og mansjett',
          risiko: 'Utetthet rundt slukmansjett som fører til skjult vannlekkasje',
          tiltak: 'Monter typegodkjent slukmansjett i henhold til leverandøranvisning. Bruk klemring og kontroller overgang'
        },
        {
          aktivitet: 'Påføring av smøremembran / sveising av bane',
          risiko: 'For tynn sjikttykkelse eller porer i overflaten',
          tiltak: 'Mål forbruk per kvadratmeter nøye. Legg i to kryssende strøk med anbefalt tørketid mellom lagene'
        },
        {
          aktivitet: 'Oppretting av fall mot sluk',
          risiko: 'Motfall eller vannansamling utenfor dusjsone',
          tiltak: 'Kontroller fall med vater: Minimum 1:50 i dusjsone og fall til sluk på hele gulvet'
        }
      ],
      utstyr: [
        'Støvmaske P2 ved puss og avretting',
        'Kjemikaliebestandige hansker',
        'Nivelleringslaser og vater',
        'Mykmalerull og presisjonskniv',
        'Vernetøy'
      ],
      tek17Reference: 'TEK17 § 13-15 (Våtrom og rom med vanninstallasjoner) og Byggebransjens Våtromsnorm (BVN)',
      weatherImpact: 'Innendørs arbeid. Sørg for tilstrekkelig romtemperatur (min 15°C) og god ventilasjon for optimal herding av membran.'
    };
  }

  return null;
}
