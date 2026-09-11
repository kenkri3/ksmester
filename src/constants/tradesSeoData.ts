export interface TradeFeature {
  title: string;
  description: string;
  badge: string;
}

export interface TradeDeviation {
  title: string;
  consequence: string;
  solution: string;
}

export interface TradeChecklistBlock {
  category: string;
  items: string[];
}

export interface TradeFaq {
  question: string;
  answer: string;
}

export interface TradeSeoProfile {
  slug: string;
  tradeKey: string;
  name: string;
  title: string;
  metaDescription: string;
  heroBadge: string;
  h1: string;
  leadParagraph: string;
  standards: string[];
  features: TradeFeature[];
  deviations: TradeDeviation[];
  checklist: TradeChecklistBlock[];
  faqs: TradeFaq[];
}
export const TRADES_SEO_DATA: Record<string, TradeSeoProfile> = {
  "tomrer": {
    "slug": "tomrer",
    "tradeKey": "carpenter",
    "name": "Tømrer & Snekker",
    "title": "KS- og HMS-system for tømrere – Byggedagbok og TEK17 på sekunder",
    "metaDescription": "Norges mest brukte KS-system for tømrere og snekkere. Snakk inn byggedagboken, knips vindsperre og fuktmålinger, og sikre tilleggsarbeid iht. NS 8406.",
    "heroBadge": "TEK17 § 14-2 & Byggforsk 520.201",
    "h1": "KS- og HMS-system skreddersydd for tømrere og snekkere",
    "leadParagraph": "Slutt å bruke kveldene på permer og PC. Med VikingMester snakker du inn byggedagboken på stillaset, knipser fuktmåling og vindsperre med TEK17-visjon, og låser inn ekstraarbeider på sekunder.",
    "standards": [
      "TEK17 § 14-2 (Lufttetthet)",
      "Byggforsk 520.201",
      "NS 3420 Del K",
      "NS 8406 pkt. 19"
    ],
    "features": [
      {
        "title": "Usynlig byggedagbok med tale",
        "description": "Snakk inn dagens framdrift mens du pakker verktøyet. Systemet fører timene, dokumenterer været fra Yr.no og kobler notatet til byggetillatelsen.",
        "badge": "Sparer 45 min/dag"
      },
      {
        "title": "Foto-kontroll av vindsperre & klemte skjøter",
        "description": "Ta bilde av vindsperre, klemte overganger og mansjetter. Vår AI kontrollerer at utførelsen oppfyller TEK17 før kledning monteres.",
        "badge": "TEK17 Sikret"
      },
      {
        "title": "Ekstraarbeid låst før saging starter",
        "description": "Vil kunden endre til dobbelgips eller ekstra isolasjon? Snakk inn endringen på 15 sekunder. Kunden signerer direkte via SMS med full juridisk gyldighet.",
        "badge": "Stopp tap av penger"
      }
    ],
    "deviations": [
      {
        "title": "Gjennomføringer i dampsperre mangler klemring/mansjett",
        "consequence": "Kondens i isolasjon, råte og manglende ferdigattest.",
        "solution": "VikingMester fanger dette på bildekontroll og krever godkjent mansjett før himling lukkes."
      },
      {
        "title": "Fuktkvote i stendere over 15 % før lukking",
        "consequence": "Soppdannelse og krav om reklamasjon innen 5 år.",
        "solution": "Logg fuktmålerens tall direkte i sjekklisten med tidsstempel og bilde."
      },
      {
        "title": "Uvarslet riving av bærende vegg ved ombygging",
        "consequence": "Entreprenør bærer hele ansvaret og kostnaden uten skriftlig varsel.",
        "solution": "Automatisk varsel iht. NS 8406 pkt. 19.3 sendes på under 1 minutt."
      }
    ],
    "checklist": [
      {
        "category": "Fuktsikring & Isolering",
        "items": [
          "Fuktmåling i bærende treverk utført (< 15 % relativ fuktvekt)",
          "Isolasjon lagt i forbandt uten knusing eller glipper mot stendere",
          "Dampsperre montert på varm side med min. 100 mm overlapp og klemte skjøter"
        ]
      },
      {
        "category": "Vindtetting & Konstruksjon",
        "items": [
          "Vindsperre klemt ved sviller, raft og hjørner iht. detaljtegning",
          "Lufting bak utvendig kledning sikret (min. 23 mm luftespalte med musebånd)",
          "Bjelkelag forankret mot grunnmur med godkjente festemidler"
        ]
      }
    ],
    "faqs": [
      {
        "question": "Må jeg ha PC for å bruke VikingMester som tømrer?",
        "answer": "Nei, absolutt ikke! VikingMester er 100 % bygget for smarttelefonen. Du snakker inn notater og tar bilder rett på byggeplassen. PC er kun valgfritt for de som vil se storskjerm på kontoret."
      },
      {
        "question": "Hvordan hjelper VikingMester meg mot krav om fradrag fra byggherre?",
        "answer": "Systemet logger bilder med GPS og tidspunkt, og genererer godkjente endringsmeldinger (NS 8406) som byggherre må godkjenne digitalt. Dermed har du uomtvistelig bevis ved sluttoppgjøret."
      },
      {
        "question": "Kan jeg eksportere ferdige permer til Boligmappa?",
        "answer": "Ja, med ett trykk genereres en komplett, revisjonsgodkjent PDF-rapport med alle bilder, sjekklister og avvik for prosjektet som kan lastes opp direkte til Boligmappa."
      }
    ]
  },
  "rorlegger": {
    "slug": "rorlegger",
    "tradeKey": "plumber",
    "name": "Rørlegger",
    "title": "KS-system for rørleggere – Våtromsnormen BVN og trykktest i lomma",
    "metaDescription": "Komplett kvalitetssikring for rørleggerbedrifter. Dokumenter rør-i-rør, trykktesting og slukmansjett iht. BVN 31.205 og TEK17 § 13-15.",
    "heroBadge": "BVN 31.205 & TEK17 § 13-15",
    "h1": "KS- og HMS-system skreddersydd for rørleggere",
    "leadParagraph": "Slipp tvister om lekkasjer og manglende dokumentasjon. VikingMester sikrer at trykkprøving, rør-i-rør fordelerskap og slukdetaljer dokumenteres vanntett før snekkeren lukker sjakten.",
    "standards": [
      "TEK17 § 13-15 (Våtrom og vanninstallasjon)",
      "BVN 31.205 (Byggebransjens våtromsnorm)",
      "NS 8406",
      "Drikkevannsforskriften"
    ],
    "features": [
      {
        "title": "Tverrfaglig lukkesperre for sjakter og vegger",
        "description": "VikingMester aktiverer automatisk rød sperre mot tømrer inntil din trykktest-rapport og bilde av fordelerskap er godkjent.",
        "badge": "Ingen feilbygging"
      },
      {
        "title": "TEK17 Bildegjenkjenning av sluk og mansjett",
        "description": "Knips bilde av klemring og slukmontasje. AI bekrefter at skruer er strammet og mansjettovergang er forskriftsmessig før støp.",
        "badge": "100% Vanntett"
      },
      {
        "title": "Digital trykktestprotokoll",
        "description": "Før inn starttrykk, testtid og slutt-trykk rett på mobilen. Få ferdig signert trykktest-sertifikat til FDV-permen med ett klikk.",
        "badge": "Godkjent protokoll"
      }
    ],
    "deviations": [
      {
        "title": "Mangler dokumentert tetthetsprøving av rør-i-rør",
        "consequence": "Forsikringsselskap avkorter erstatning ved fremtidig lekkasje.",
        "solution": "VikingMester krever registrering av testtrykk (min. 10 bar) før sjakten markeres som ferdigstilt."
      },
      {
        "title": "Sluk montert for nær vegg (< 25 cm)",
        "consequence": "Umulig å klemme mansjett forskriftsmessig; brudd på BVN.",
        "solution": "Bildesjekk i appen varsler rørlegger før faststøping."
      },
      {
        "title": "Mangler overløp / drenering fra fordelerskap til rom med sluk",
        "consequence": "Vannskader i etasjeskille ved lekkasje i fordelerskap.",
        "solution": "Innebygd sjekkliste tvinger dokumentasjon av drensrør og synlig munning."
      }
    ],
    "checklist": [
      {
        "category": "Rør-i-rør & Fordelerskap",
        "items": [
          "Trykkprøving av tappevannsanlegg utført ved 10 bar i min. 30 min uten trykkfall",
          "Varerør montert med jevnt fall mot fordelerskap uten skarpe bend",
          "Dreneringsrør fra fordelerskap ført ut i rom med sluk med fall og synlig munning",
          "Vannstoppventil montert og testet i rom uten sluk"
        ]
      },
      {
        "category": "Sluk & Avløp",
        "items": [
          "Sluk faststøpt i riktig høyde tilpasset fall og overflatebelegg",
          "Klemring montert og skrudd med jevnt moment over membranmansjett",
          "Lufting over tak montert forskriftsmessig"
        ]
      }
    ],
    "faqs": [
      {
        "question": "Støtter VikingMester Byggebransjens våtromsnorm (BVN)?",
        "answer": "Ja, sjekklistene og kontrollpunktene i VikingMester er utarbeidet i tråd med BVN 31.205 og TEK17 § 13-15 for både nybygg og rehabilitering."
      },
      {
        "question": "Kan jeg bruke systemet til å kreve betaling for råte under gammelt sluk?",
        "answer": "Ja! Ved rehabilitering avdekker man ofte råte i bjelkelag. Snakk inn avviket i VikingMester, så genereres det et krav om tillegg etter Håndverkertjenesteloven § 9 og NS 8406 på under ett minutt."
      },
      {
        "question": "Har rørleggerlærlinger tilgang til stoffkartotek ute på plassen?",
        "answer": "Ja, stoffkartoteket i VikingMester fungerer offline på mobilen, slik at lærlinger og montører umiddelbart finner sikkerhetsdatablader for lim, gass og kjemikalier."
      }
    ]
  },
  "elektriker": {
    "slug": "elektriker",
    "tradeKey": "electrician",
    "name": "Elektriker",
    "title": "KS- og HMS-system for elektrikere – 5 Sikre og sluttkontroll på mobilen",
    "metaDescription": "Komplett kvalitetssikring for el-installatører. Dokumenter 5 sikre, risikovurdering elektro og sluttkontroll iht. NEK 400 og FEL.",
    "heroBadge": "NEK 400:2022 & FEL",
    "h1": "KS- og HMS-system skreddersydd for elektrikere",
    "leadParagraph": "Forenkle hverdagen for montører og saksbehandlere. Snakk inn byggedagboken, utfør risikovurdering for frakoblet spenning, og generer 5 sikre sluttkontroller direkte fra mobilen.",
    "standards": [
      "NEK 400:2022 (Lavspenning)",
      "Forskrift om elektriske lavspenningsanlegg (FEL)",
      "FSE",
      "NS 8406"
    ],
    "features": [
      {
        "title": "5 Sikre & Risikovurdering i lomma",
        "description": "Gjennomfør lovpålagt risikovurdering før arbeidet starter: Sjekk spenningsløs tilstand, sikring mot gjeninnkobling og verneutstyr med få trykk.",
        "badge": "FSE Sikret"
      },
      {
        "title": "Måleresultater & Sluttkontroll",
        "description": "Tast eller snakk inn isolasjonsresistans, overgangsmotstand og kontinuitet. Systemet flagger umiddelbart verdier utenfor NEK 400-kravene.",
        "badge": "NEK 400 Klar"
      },
      {
        "title": "Ekstra downlights & kurser på farta",
        "description": "Kunde ber om 6 ekstra punkter og DALI-styring? Snakk inn bestillingen. Kunden godkjenner pristillegget på SMS før kablene trekkes.",
        "badge": "Ingen ubetalte timer"
      }
    ],
    "deviations": [
      {
        "title": "Mangler dokumentert sluttkontroll og kontinuitetstest på jordleder",
        "consequence": "DSB-tilsyn gir pålegg; anlegget kan ikke settes i drift lovlig.",
        "solution": "VikingMester sperrer prosjektavslutning inntil kontinuitets- og isolasjonsverdier er registrert."
      },
      {
        "title": "Kabel forlagt i isolert vegg uten reduksjonsfaktor",
        "consequence": "Varmgang, fare for brann og avvik fra NEK 400 tabell 52B.",
        "solution": "Appen veileder montøren på kabeltverrsnitt og forlegningsmåte."
      },
      {
        "title": "Mangler kursfortegnelse og merking i sikringsskap",
        "consequence": "Avvik ved el-tilsyn (DLE) og manglende samsvarserklæring.",
        "solution": "Knips bilde av skapfront og kursliste for automatisk arkivering i FDV-permen."
      }
    ],
    "checklist": [
      {
        "category": "Før arbeidet starter (FSE)",
        "items": [
          "Anlegget koblet fra og spenningsløs tilstand verifisert med godkjent spenningstester",
          "Sikret mot utilsiktet gjeninnkobling (hengelås / advarselskilt påsatt)",
          "Er det nødvendig med jording og kortslutning ifm. anlegget?"
        ]
      },
      {
        "category": "Sluttkontroll iht. NEK 400",
        "items": [
          "Kontinuitet i beskyttelsesleder og utjevningsforbindelser målt (< 1 ohm)",
          "Isolasjonsresistans målt (min. 1,0 MOhm ved 500V DC)",
          "Utløsertid og utløserstrøm for jordfeilautomater verifisert",
          "Samsvarserklæring og kursfortegnelse overlevert kunde/Boligmappa"
        ]
      }
    ],
    "faqs": [
      {
        "question": "Erstatter VikingMester samsvarserklæringen?",
        "answer": "VikingMester samler all underlagsdokumentasjon, målinger, sjekklister og bilder for sluttkontrollen iht. NEK 400 Del 6, slik at installatøren kan signere samsvarserklæringen på sekunder."
      },
      {
        "question": "Hvordan varsles tømrer og maler når skjult elektroanlegg er klart for lukking?",
        "answer": "Med VikingMesters tverrfaglige samhandling får tømrer automatisk grønt lys på sin mobil i det øyeblikket elektrikeren godkjenner kabellegging og rørstrekk."
      },
      {
        "question": "Kan vi legge inn egne maler for 5 sikre?",
        "answer": "Ja, bedriften kan tilpasse og lagre egne kontrollrutiner eller bruke våre ferdige, revisjonsgodkjente NEK 400-maler."
      }
    ]
  },
  "murer": {
    "slug": "murer",
    "tradeKey": "mason",
    "name": "Murer & Flislegger",
    "title": "KS-system for murere og flisleggere – Membran og fallkontroll på mobilen",
    "metaDescription": "Kvalitetssikring for murere, flisleggere og betongarbeid. Dokumenter fall mot sluk, membrantykkelse og armeringsoverdekning iht. TEK17.",
    "heroBadge": "TEK17 & NS-EN 13813",
    "h1": "KS- og HMS-system skreddersydd for murere og flisleggere",
    "leadParagraph": "Unngå kostbare opphugginger av gulv og reklamasjoner på bom i fliser. VikingMester gir deg lynrask fotodokumentasjon av fallforhold, smøremembran og armering før støpen herder.",
    "standards": [
      "TEK17 § 13-15 (Våtrom)",
      "Byggebransjens våtromsnorm (BVN)",
      "NS-EN 13813",
      "NS 3420 Del N"
    ],
    "features": [
      {
        "title": "Fallmåling og sluk-oppkant i lomma",
        "description": "Bruk vår integrerte fallkalkulator for å verifisere 1:50 i dusjsone og min. 25 mm oppkant mot dørterskel. Ta bilde av vateret rett i rapporten.",
        "badge": "Rett fall garanti"
      },
      {
        "title": "Dokumentasjon av membrantykkelse & sjikt",
        "description": "Logg antall liter membran brukt per m² og knips bilde av påføring i hjørner og mansjetter. Gir ubestridelig bevis ved tilsyn.",
        "badge": "BVN Samsvar"
      },
      {
        "title": "Støv og ergonomi i HMS-sjekklisten",
        "description": "Arbeidstilsynet har høyt fokus på kvartsstøv ved kapping av stein og blanding av mørtel. Dokumenter punktsug og P3-masker med ett klikk.",
        "badge": "Arbeidstilsynet Klar"
      }
    ],
    "deviations": [
      {
        "title": "Motfall eller manglende fall mot sluk i dusjsone",
        "consequence": "Stående vann, soppvekst og krav om total omlegging av fliser.",
        "solution": "Foto-kontroll med vater logges som obligatorisk sjekkpunkt før flislegging."
      },
      {
        "title": "For lite membran påført (< 1 kg/m² ved smøremembran)",
        "consequence": "Fuktgjennomtrengning og skade på tilstøtende trekonstruksjoner.",
        "solution": "Forbrukskalkyle logges mot areal i kvadratmeter."
      },
      {
        "title": "Kapping av flis og betong uten vannkjøling eller støvavsug",
        "consequence": "Helserisiko (silikose/kols) og stans fra Arbeidstilsynet.",
        "solution": "HMS-sjekkliste sikrer at støvavsug er tilkoblet før oppstart."
      }
    ],
    "checklist": [
      {
        "category": "Underlag & Støping",
        "items": [
          "Underlag rengjort, støvsugd og primet for god vedheft",
          "Armeringsnett klipset og hevet for korrekt overdekning (min. 15 mm)",
          "Fall mot sluk etablert (min. 1:50 i nedsenket dusjsone, 1:100 i rommet for øvrig)"
        ]
      },
      {
        "category": "Membran & Flislegging",
        "items": [
          "Slukmansjett montert uten folder og klemring tiltrukket forskriftsmessig",
          "Membran påført i minimum 2 strøk med tørketid mellom strøkene",
          "Baksmøring benyttet på storformatfliser for å unngå hulrom"
        ]
      }
    ],
    "faqs": [
      {
        "question": "Hvordan dokumenterer jeg fall mot sluk overfor takstmann?",
        "answer": "VikingMester lar deg ta bilde med integrert målestokk eller vater, der appen stempler bilde med dato, klokkeslett og prosjektadresse. Dette inkluderes i den automatiske sluttrapporten."
      },
      {
        "question": "Kan jeg beregne materialforbruk for avrettingsmasse i appen?",
        "answer": "Ja, du kan legge inn gulvareal og gjennomsnittlig oppbyggingshøyde for å få beregnet antall sekker masse og vanndosering."
      },
      {
        "question": "Må jeg ha internettdekning i kjellere for å føre KS?",
        "answer": "Nei, VikingMester er bygget som en offline-først app (PWA). Du tar bildene og fører sjekklisten i kjelleren; alt synkroniseres automatisk så fort mobilen får dekning."
      }
    ]
  },
  "maler": {
    "slug": "maler",
    "tradeKey": "painter",
    "name": "Maler & Byggtapetserer",
    "title": "KS-system for malere – Overflatekrav og stoffkartotek i lomma",
    "metaDescription": "Kvalitetssikring og HMS for malerbedrifter. Dokumenter underlagskontroll, fuktmåling, glansgrader og lovpålagt stoffkartotek for maling og sparkel.",
    "heroBadge": "NS 3420 Del T & Kjemikalieforskriften",
    "h1": "KS- og HMS-system skreddersydd for malere",
    "leadParagraph": "Slutt å krangle om sparkelskjøter i slepelys og ubetalt ekstraarbeid. VikingMester gir malermesteren full kontroll på overflateklasser (K1-K4), tørketider, fuktmåling og stoffkartotek rett på mobilen.",
    "standards": [
      "NS 3420 Del T (Malerarbeider)",
      "Overflateklasser K1 til K4",
      "Internkontrollforskriften",
      "Forskrift om kjemikalier"
    ],
    "features": [
      {
        "title": "Dokumentasjon av overflateklasse (K1-K4)",
        "description": "Avtalte kunden K2, men forventer K4 i kveldssola? Knips overflaten og referer til avtalt standard i tilbudet for å stoppe urettmessige krav.",
        "badge": "NS 3420 Standard"
      },
      {
        "title": "Offline Stoffkartotek for maling og herdere",
        "description": "Søk opp sikkerhetsdatablader (SDS) for maling, sparkel og 2-komponent epoksy på 2 sekunder. Oppfyller Arbeidstilsynets krav til punkt og prikke.",
        "badge": "Stoffkartotek OK"
      },
      {
        "title": "Fuktmåling før maling av treverk og betong",
        "description": "Registrer treverkets fuktighet før grunning. Forhindrer blæredannelse og råte som du ellers ville fått skylden for.",
        "badge": "Sikret mot reklamasjon"
      }
    ],
    "deviations": [
      {
        "title": "Maling påført på treverk med fuktkvote over 16 %",
        "consequence": "Malingen flasser etter første vinter; entreprenør må ta ommaling for egen regning.",
        "solution": "Fuktmåling registreres som obligatorisk stopp-punkt før malerarbeid starter."
      },
      {
        "title": "Oljefiller lagret i åpen bøtte på byggeplass",
        "consequence": "Ekstrem fare for selvantennelse og bygningsbrann.",
        "solution": "HMS-sjekkliste krever verifisering av lufttett vannbeholder ved arbeidsdagens slutt."
      },
      {
        "title": "Kunde krever ekstra strøk eller fargeendring etter oppstart",
        "consequence": "Tapte timer og materialkostnader uten skriftlig godkjenning.",
        "solution": "Endringsmelding sendes og signeres via SMS på under 2 minutter."
      }
    ],
    "checklist": [
      {
        "category": "Underlagskontroll & Forarbeid",
        "items": [
          "Underlag kontrollert for støv, fett og ujevnheter",
          "Fuktmåling i treverk eller betong utført og innenfor tillatte grenseverdier",
          "Sparkelskjøter armert med papirremse for å unngå sprekkdannelse",
          "Avtalt overflatekvalitet (f.eks. K2 eller K3) bekreftet mot underlag"
        ]
      },
      {
        "category": "HMS & Kjemikalier",
        "items": [
          "Tilstrekkelig ventilasjon sikret ved bruk av løsemiddelholdige produkter",
          "Sikkerhetsdatablader (SDS) tilgjengelig for alle benyttede produkter",
          "Oljefiller og brennbart avfall lagt i brannsikker beholder fylt med vann"
        ]
      }
    ],
    "faqs": [
      {
        "question": "Hvordan håndterer VikingMester stoffkartoteket for malere?",
        "answer": "VikingMester har et innebygd digitalt stoffkartotek hvor du kan søke opp eller laste opp sikkerhetsdatablader (SDS). Alle ansatte har tilgang direkte fra mobilen, også offline."
      },
      {
        "question": "Hva gjør jeg hvis kunden klager på sparkelskjøter i slepelys?",
        "answer": "VikingMester hjelper deg å spesifisere og dokumentere avtalt overflateklasse (f.eks. K2 eller K3 iht. NS 3420). Hvis kunden krever K4 (strikte krav i slepelys), genererer appen en endringsmelding for merarbeidet."
      },
      {
        "question": "Kan jeg bruke appen på stillas uten mobildekning?",
        "answer": "Ja, appen er en Progressive Web App (PWA) og lagrer alle data lokalt inntil du er tilkoblet nett igjen."
      }
    ]
  },
  "grunnarbeid": {
    "slug": "grunnarbeid",
    "tradeKey": "general",
    "name": "Grunnarbeid & Maskin",
    "title": "KS- og HMS-system for grunnarbeid og maskinentreprenører",
    "metaDescription": "Komplett KS og HMS for graving, sprenging og grunnarbeid. Ledningspåvisning, grøftesikring og SJA rett på mobilen i gravemaskinen.",
    "heroBadge": "Forskrift om utførelse av arbeid § 21 & NS 3420 Del F",
    "h1": "KS- og HMS-system skreddersydd for grunnarbeid og maskinentreprenører",
    "leadParagraph": "Gravemaskinen er arbeidsplassen din, ikke et kontor. VikingMester gir maskinføreren rask SJA for kabler i bakken, fotodokumentasjon av grøftesikring og pukkpuddel, og automatisk registrering av uforutsette grunnforhold.",
    "standards": [
      "Forskrift om utførelse av arbeid (§ 21)",
      "NS 3420 Del F",
      "NS 8406 pkt. 19.3",
      "Byggherreforskriften"
    ],
    "features": [
      {
        "title": "SJA for graving & ledningspåvisning",
        "description": "Grav aldri i blinde. Utfør 1-klikks risikovurdering for høyspentkabler, vannledninger og grøfteras før skuffa settes i bakken.",
        "badge": "0 Kabelskader"
      },
      {
        "title": "Uforutsette grunnforhold låst som tillegg",
        "description": "Treffer du på fjell, leire eller forurenset masse? Knips bilde og snakk inn kubikkmengden. Systemet varsler byggherre iht. NS 8406 før du graver videre.",
        "badge": "Sikre inntekter"
      },
      {
        "title": "Mottakskontroll av masser & pukk",
        "description": "Ta bilde av vektseddel og komprimeringsrapport. VikingMester arkiverer det direkte på prosjektet for enkel overlevering til geotekniker.",
        "badge": "Full sporbarhet"
      }
    ],
    "deviations": [
      {
        "title": "Graving i dypere enn 2 meter uten avstivning eller skråning",
        "consequence": "Livsfare ved grøfteras; umiddelbar stans fra Arbeidstilsynet.",
        "solution": "VikingMester krever fotobevis av skråningsvinkel eller grøftekasse før rørlegging."
      },
      {
        "title": "Uvarslet graving i forurensede masser",
        "consequence": "Store miljøbøter og personlig straffeansvar for daglig leder.",
        "solution": "Varsel og jordprøve registreres i appen med GPS-koordinater."
      },
      {
        "title": "Kabelbrudd grunnet manglende kabelpåvisning",
        "consequence": "Krav om erstatning på hundretusener fra nettselskap.",
        "solution": "Geosjekk og gravetillatelse må godkjennes i SJA før oppstart."
      }
    ],
    "checklist": [
      {
        "category": "Før graving starter",
        "items": [
          "Gravemelding og kabelpåvisning gjennomført og gyldig på plassen",
          "Tilstøtende konstruksjoner og trær vurdert for setnings- og veltefare",
          "Sperringer og varselskilt satt opp for fotgjengere og trafikk"
        ]
      },
      {
        "category": "Grøftesikkerhet & Masser",
        "items": [
          "Grøftesikring etablert ved dybde > 1,5 meter",
          "Rømningsvei (stige) plassert i grøften med maks 20 meters avstand",
          "Pukkpuddel og komprimering utført og kontrollert før rørlegging"
        ]
      }
    ],
    "faqs": [
      {
        "question": "Hvordan hjelper VikingMester hvis vi treffer på fjell som må sprenges?",
        "answer": "Dette er et klassisk uforutsett forhold iht. NS 8406 pkt. 19.3. Med VikingMester snakker du inn avviket fra gravemaskinen, tar et bilde av fjellet, og systemet genererer et formelt endringsvarsel som kunden må signere før bergarbeidet igangsettes."
      },
      {
        "question": "Kan vi registrere maskintimer og drivstofforbruk?",
        "answer": "Ja, maskintimer og utstyr kan logges direkte i den daglige byggedagboken via stemmestyring."
      },
      {
        "question": "Fungerer appen på nettbrett i maskinhytta?",
        "answer": "Ja, VikingMester er responsiv og fungerer like godt på iPad/Android-nettbrett i maskinhytta som på mobil."
      }
    ]
  },
  "blikkenslager": {
    "slug": "blikkenslager",
    "tradeKey": "general",
    "name": "Blikkenslager & Taktekker",
    "title": "KS- og HMS-system for blikkenslagere og taktekkere",
    "metaDescription": "Kvalitetssikring og HMS for tak, fasade og beslag. Dokumenter fallsikring, varme arbeider og tette beslagsløsninger iht. TEK17.",
    "heroBadge": "TEK17 § 13-11 & Byggforsk 525.101",
    "h1": "KS- og HMS-system skreddersydd for blikkenslagere og taktekkere",
    "leadParagraph": "Arbeid på tak krever kompromissløs sikkerhet og millimeters nøyaktighet mot vanninntrenging. VikingMester gir blikkenslageren full kontroll på fallsikring, sertifikat for varme arbeider og fotobevis av beslag før stillaset rives.",
    "standards": [
      "TEK17 § 13-11 (Nedbør og fukt)",
      "Byggforsk 525.101",
      "Varme arbeider",
      "NS 3420 Del Q"
    ],
    "features": [
      {
        "title": "Sjekkliste for Varme Arbeider & Brannvakt",
        "description": "Sveising av takbelegg krever skriftlig arbeidstillatelse og brannvakt. Fyll ut og signer sjekklisten direkte på mobilen før gassbrenneren tennes.",
        "badge": "Brannsikret"
      },
      {
        "title": "Fotobevis av beslag & oppkant før stillasdemontering",
        "description": "Knips pipebeslag, gesims og skottrenner. Bildet tagges med dato og prosjekt, slik at du har uomtvistelig bevis på tett tak når kunden inspiserer.",
        "badge": "TEK17 Dokumentert"
      },
      {
        "title": "Fallsikring & Stillaskontroll i lomma",
        "description": "Dokumenter kontroll av sele, line og forankringspunkter før oppstigning. Beskytter deg og de ansatte mot Arbeidstilsynets strakspålegg.",
        "badge": "Trygt på taket"
      }
    ],
    "deviations": [
      {
        "title": "Arbeid i høyden utført uten tilkoblet fallsikring eller rekkverk",
        "consequence": "Livsfare og umiddelbar stans med bøter fra Arbeidstilsynet.",
        "solution": "Fotobevis av forankringspunkt og godkjent sele logges før takarbeid."
      },
      {
        "title": "Oppkant på membran mot gesims/parapet under 150 mm",
        "consequence": "Vanninntrenging ved slagregn og snøopphopning; brudd på TEK17.",
        "solution": "Bildekontroll med målebånd verifiserer minimum 150 mm oppkant."
      },
      {
        "title": "Manglende brannvakt i 60 min etter avsluttede varme arbeider",
        "consequence": "Glødebrann og totalt bortfall av forsikringsutbetaling ved skade.",
        "solution": "Digital nedtelling og bekreftelse av brannvakt i appen."
      }
    ],
    "checklist": [
      {
        "category": "Fallsikring & Rigg",
        "items": [
          "Stillas godkjent med grønt skilt og kontrollert for stabilitet",
          "Fallsikringsutstyr kontrollert for slitasje og forankret i godkjent feste",
          "Sikring mot fallende gjenstander etablert på bakkenivå"
        ]
      },
      {
        "category": "Varme Arbeider & Tekking",
        "items": [
          "Gyldig sertifikat for varme arbeider registrert på utførende montør",
          "Slokkeutstyr plassert ved arbeidsstedet",
          "Beslag og overganger utført med godkjent ekspansjonsmulighet og feste",
          "Brannvakt gjennomført i minimum 60 minutter etter at åpen flamme er slukket"
        ]
      }
    ],
    "faqs": [
      {
        "question": "Oppfyller VikingMester forsikringsselskapenes krav til varme arbeider?",
        "answer": "Ja, vår digitale sjekkliste følger Sikkerhetsforskriften for varme arbeider fra Finans Norge, inkludert krav om risikovurdering, slokkeutstyr og dokumentert brannvakt."
      },
      {
        "question": "Hvordan dokumenterer jeg at taket var tett før lekkasje fra andre fag?",
        "answer": "Ved å ta tidsstemplede bilder av beslag, sveis og undertak i VikingMester før andre håndverkere ferdes på taket, har du full dokumentasjon på at arbeidet var feilfritt levert."
      },
      {
        "question": "Kan vi lage egne sjekklister for båndtekking og sinkarbeid?",
        "answer": "Ja, du kan enkelt legge til skreddersydde kontrollpunkter for falsing, ekspansjon og festeklammere tilpasset dine prosjekter."
      }
    ]
  }
};
