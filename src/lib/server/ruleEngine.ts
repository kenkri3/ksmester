// Deterministic Rule Engine for standard Norwegian building tasks and HSE compliance
// Resolves high-frequency construction templates with 0 token expenditure across all trades

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
  if (desc.includes('stillas') || (desc.includes('høyde') && (desc.includes('monter') || desc.includes('arbeid')))) {
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
        'Synlighetstøy klasse 2/3',
        'Vernehansker med godt grep'
      ],
      tek17Reference: 'TEK17 § 12-16 (Sikkerhet i bruk og adkomst) og Forskrift om utførelse av arbeid kapittel 17 (Arbeid i høyden)',
      weatherImpact: weatherInfo 
        ? `Værobservasjon: ${weatherInfo}. Ved vind over 10 m/s eller glatt underlag skal arbeidet umiddelbart stanses eller sikringstiltak forsterkes.`
        : 'Ved vind over 10-12 m/s, underkjølt regn eller snø skal stillasarbeid stanses inntil flatene er saltet/måket og kontrollert.'
    };
  }

  // 2. Varmt arbeid (sveising, taktekking med åpen flamme, vinkelsliper)
  if (desc.includes('varmt arbeid') || desc.includes('sveis') || desc.includes('flamme') || desc.includes('brenner') || desc.includes('vinkelsliper')) {
    return {
      title: 'SJA: Utførelse av Varmt Arbeid',
      task: taskDescription,
      risikoer: [
        {
          aktivitet: 'Bruk av åpen flamme eller gnistproduserende utstyr',
          risiko: 'Brannutvikling i brennbare bygningsmaterialer eller isolasjon',
          tiltak: 'Rydd og fei arbeidsområdet i min. 10 meters omkrets. Tildekk brennbart materiale med godkjente branntepper'
        },
        {
          aktivitet: 'Gasshåndtering og sveiseutstyr',
          risiko: 'Gasslekkasje, tilbakeslag eller eksplosjonsfare',
          tiltak: 'Plasser gassflasker stående og fastlåst. Sjekk tilbakeslagsventiler og slanger med såpevann'
        },
        {
          aktivitet: 'Etterkontroll og brannvakt',
          risiko: 'Uoppdaget ulmebrann i konstruksjonen etter arbeidsdagens slutt',
          tiltak: 'Gjennomfør obligatorisk brannvakt i minimum 60 minutter etter at arbeidet er avsluttet'
        }
      ],
      utstyr: [
        'Brannslukningsapparat (min 2x 6kg pulver eller tilsvarende)',
        'Branntepper og sveiseduk',
        'Vernebriller/Sveiseskjerm med riktig filter',
        'Brannsikre sveisehansker',
        'Førstehjelpsutstyr for brannskader'
      ],
      tek17Reference: 'TEK17 § 11-1 (Sikkerhet ved brann) og Forskrift om brannforebygging § 3',
      weatherImpact: weatherInfo
        ? `Værobservasjon: ${weatherInfo}. Ved sterk vind øker faren for gnistspredning drastisk. Sikkerhetsavstand må dobles.`
        : 'Tørt og vindfullt vær øker faren for brannspredning. Ved vindkast skal åpen flamme skjermes ekstra eller utsettes.'
    };
  }

  // 3. Våtrom, rør og membran (TEK17 § 13-15 og BVN)
  if (desc.includes('våtrom') || desc.includes('membran') || desc.includes('sluk') || desc.includes('bad') || desc.includes('rørlegger') || desc.includes('rør-i-rør')) {
    return {
      title: 'SJA & KS: Våtromsarbeid, Rør-i-rør og Membranlegging',
      task: taskDescription,
      risikoer: [
        {
          aktivitet: 'Montering og tilpasning av sluk og klemring',
          risiko: 'Utetthet rundt slukmansjett som fører til skjult vannlekkasje inn i bjelkelag/underetasje',
          tiltak: 'Monter typegodkjent slukmansjett i henhold til leverandøranvisning. Bruk klemring og kontroller overgang mekanisk før smøring'
        },
        {
          aktivitet: 'Påføring av smøremembran eller sveising av bane',
          risiko: 'For tynn sjikttykkelse, porer i overflaten eller kjemisk eksponering',
          tiltak: 'Mål forbruk per kvadratmeter nøye (min. 1,0-1,5 kg/m2 iht. godkjenning). Legg i to kryssende strøk. Sørg for god avlufting'
        },
        {
          aktivitet: 'Trykktesting av rør-i-rør fordelerskap',
          risiko: 'Rørbrudd eller lekkasje bak lukkede vegger etter innkassing',
          tiltak: 'Gjennomfør obligatorisk trykktesting med vann/luft iht. produsentforskrift, loggfør trykkfall og ta bilde av manometer'
        }
      ],
      utstyr: [
        'Støvmaske P2 / Halvmaske med gassfilter A2 ved løsemiddelmembran',
        'Kjemikaliebestandige nitrilhansker',
        'Nivelleringslaser og vater (fallkontroll min. 1:50 i dusjsone)',
        'Slukkniv og klemringverktøy',
        'Manometer for trykkprøving'
      ],
      tek17Reference: 'TEK17 § 13-15 (Våtrom og rom med vanninstallasjoner) og Byggebransjens Våtromsnorm (BVN 31.205)',
      weatherImpact: 'Innendørs arbeid. Sørg for tilstrekkelig romtemperatur (min 15°C) og god ventilasjon for herding av membran og lim.'
    };
  }

  // 4. Elektro & NEK 400 (FSE og spenningssatt arbeid)
  if (desc.includes('elektro') || desc.includes('strøm') || desc.includes('sikring') || desc.includes('tavle') || desc.includes('kabel') || desc.includes('spenning')) {
    return {
      title: 'SJA: Elektroarbeid, Frakobling og NEK 400 Samsvar',
      task: taskDescription,
      risikoer: [
        {
          aktivitet: 'Arbeid i sikringsskap og fordelingstavler',
          risiko: 'Elektrisk sjokk, lysbueulykke og kortslutningsbrann',
          tiltak: 'Følg FSE 5 sikre: Koble fra, sikre mot gjeninnkobling, verifiser spenningsløshet med to-polet spenningstester, jord og kortslutt ved behov, avskjerm mot spenningsførende deler'
        },
        {
          aktivitet: 'Trekking av kabler og rørføring i bærende stendere',
          risiko: 'Svekkelse av bæreevne eller perforering av dampsperre',
          tiltak: 'Bor kun i midt-tredjedel av stendere. Bruk tette mansjetter ved gjennomføring i dampsperre for å ivareta TEK17 lufttetthet'
        },
        {
          aktivitet: 'Sluttkontroll og isolasjonstesting',
          risiko: 'Jordfeil eller feilkobling som setter anlegget under spenning',
          tiltak: 'Gjennomfør megging (isolasjonstesting min. 1 Mohm) og test utløserstrøm/tid på jordfeilautomater før overlevering'
        }
      ],
      utstyr: [
        'To-polet godkjent spenningstester (Calibrated Duspol)',
        'Isolert verktøy 1000V (VDE)',
        'Lysbuegodkjent visir og vernebriller',
        'LOTO (Lockout/Tagout) låsebeslag og hengelås for sikringer',
        'Vernesko med isolerende såle'
      ],
      tek17Reference: 'TEK17 § 14-1 og Forskrift om elektriske lavspenningsanlegg (FEL) samt NEK 400:2022',
      weatherImpact: 'Ved utendørs elektroarbeid skal skap og koblingsbokser beskyttes mot fukt og regn (min. IP44/IP55).'
    };
  }

  // 5. Gravearbeid, Grøftesikring og VA
  if (desc.includes('grav') || desc.includes('grøft') || desc.includes('gravemaskin') || desc.includes('spunt') || desc.includes('drenering')) {
    return {
      title: 'SJA: Gravearbeid, Grøftesikring og Kabelpåvisning',
      task: taskDescription,
      risikoer: [
        {
          aktivitet: 'Graving nær ukjente kabler og rør',
          risiko: 'Avriving av høyspentkabel, gassledning eller vannhovedledning',
          tiltak: 'Innhent gravetillatelse og kabelpåvisning fra Geomatikk/nettleverandør før start. Håndgrav forsiktig innenfor 1 meter fra påviste kabler'
        },
        {
          aktivitet: 'Arbeid i grøft dypere enn 1,5 meter',
          risiko: 'Ras, utglidning av masser og begraving av arbeidere',
          tiltak: 'Etabler forskriftsmessig skråning (maks 1:1 ved faste masser) eller monter godkjente grøftekasser/stempling før personell går ned'
        },
        {
          aktivitet: 'Maskinbevegelse og personell i blindsoner',
          risiko: 'Påkjørsel eller klemfare mellom gravemaskin og grøftekant',
          tiltak: 'Etabler sikker sone. Øyekontakt med maskinfører er påbudt. Bruk synlighetstøy klasse 3'
        }
      ],
      utstyr: [
        'Godkjent grøftekasse / avstivingsutstyr for dype grøfter',
        'Kabelsøker og varselbånd',
        'Synlighetstøy klasse 3',
        'Hjelm med hakestropp',
        'Stigesett for trygg rømning fra grøft (maks 10m avstand)'
      ],
      tek17Reference: 'TEK17 § 11-1, § 13-11 og Forskrift om utførelse av arbeid § 21 (Arbeid i grøfter)',
      weatherImpact: weatherInfo 
        ? `Værobservasjon: ${weatherInfo}. Kraftig nedbør øker faren for jordras og utglidning i grøft betraktelig. Masser må sikres ekstra.`
        : 'Ved regnvær øker rasfaren vesentlig. Inspiser grøftekanter etter regnvær før arbeid gjenopptas.'
    };
  }

  // 6. Riving, Sanering og Asbest
  if (desc.includes('riv') || desc.includes('asbest') || desc.includes('saner') || desc.includes('avfall') || desc.includes('eternitt')) {
    return {
      title: 'SJA: Riving, Miljøsanering og Asbesthåndtering',
      task: taskDescription,
      risikoer: [
        {
          aktivitet: 'Riving av eldre bygningsdeler med asbest/PCB',
          risiko: 'Innånding av kreftfremkallende asbestfibre eller miljøgiftspredning',
          tiltak: 'Gjennomfør miljøkartlegging. Etabler undertrykkssone og luftsluse ved innendørs asbest. Arbeidstilsynets tillatelse er påbudt for asbestsanering'
        },
        {
          aktivitet: 'Demontering av tunge bygningskonstruksjoner',
          risiko: 'Ukontrollert kollaps, fallende bygningsdeler og klemulykker',
          tiltak: 'Riv ovenfra og ned. Sikre bærende elementer med midlertidige støtter før fjerning'
        },
        {
          aktivitet: 'Avfallshåndtering og kildesortering',
          risiko: 'Forurensning og brudd på TEK17 kildesorteringskrav (min. 70 %)',
          tiltak: 'Sorter avfallet i rene fraksjoner på plassen (trevirke, metall, gips, farlig avfall i låste containere)'
        }
      ],
      utstyr: [
        'Helmaske med P3-filter eller vifteassistert åndedrettsvern',
        'Type 5/6 engangs støvtett kjeledress med teipede overganger',
        'Spesialsekker merket ASBEST for forsegling med dobbel plast',
        'Hjelm og vernesko med spikertramp S3',
        'H14 HEPA-støvsuger godkjent for asbest'
      ],
      tek17Reference: 'TEK17 kapittel 9 (Ytre miljø, avfallsplan og miljøsanering) og Forskrift om utførelse av arbeid kap. 4 (Asbest)',
      weatherImpact: 'Ved utendørs asbestsanering (eternittak) skal arbeid stanses ved vindkast over 8 m/s for å unngå fiberflukt.'
    };
  }

  // 7. Lukking av vegg, Dampsperre og Isolering (Tømrer)
  if (desc.includes('lukke vegg') || desc.includes('gips') || desc.includes('isolering') || desc.includes('dampsperre') || desc.includes('himling')) {
    return {
      title: 'SJA & KS: Lukking av Vegger, Dampsperre og Kritiske Skjulte Grensesnitt',
      task: taskDescription,
      risikoer: [
        {
          aktivitet: 'Lukking før tverrfaglig kontroll er gjennomført',
          risiko: 'Innelukking av ikke-trykktestede rør eller udokumentert el-skjultanlegg',
          tiltak: 'VERIFISER: Rørleggerens trykktest og elektrikerens fotodokumentasjon må være godkjent i VikingMester før første plate skrus'
        },
        {
          aktivitet: 'Montering og klemming av dampsperre (plast)',
          risiko: 'Utettheter, punktering eller manglende klemming som gir kondens og råte i yttervegg',
          tiltak: 'Bruk godkjent aldringsbestandig folieteip og klemlist mot tilstøtende betong/konstruksjoner. Klem dampsperre kontinuerlig'
        },
        {
          aktivitet: 'Håndtering av isolasjon (mineralull / glassull)',
          risiko: 'Hudirritasjon, kløe og innånding av mineralullstøv',
          tiltak: 'Bruk støvmaske P2, heldekkende arbeidstøy og hansker. Unngå riving – kutt med egnet isolasjonskniv'
        }
      ],
      utstyr: [
        'Støvmaske FFP2',
        'Vernebriller',
        'Isolasjonskniv og kappebord',
        'Folieteip og klemlister for dampsperre',
        'Gipsheis ved himlingsmontasje'
      ],
      tek17Reference: 'TEK17 § 14-2 (Energieffektivitet og lufttetthet) og § 13-14 (Fuktsikring av konstruksjoner)',
      weatherImpact: 'Konstruksjonen skal være uttørket (fuktkvote i trevirke under 18 %) før isolering og dampsperre monteres.'
    };
  }

  return null;
}
