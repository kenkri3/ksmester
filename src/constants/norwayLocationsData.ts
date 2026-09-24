/**
 * Komplett oversikt over Norges fylker, byer og store tettsteder
 * for hypermålrettet, programmatisk lokal-SEO og AEO i hele Norge.
 */

export interface LocationProfile {
  slug: string;
  name: string;
  type: 'fylke' | 'by' | 'tettsted';
  county: string; // Fylke
  region: 'Østlandet' | 'Vestlandet' | 'Midt-Norge' | 'Nord-Norge' | 'Sørlandet';
  kommune: string;
  focusClimate: string; // Byggeteknisk fokusområde basert på geografi (f.eks. slagregn, snølast, kyst, radon)
  popularTrades: string[];
}

export const NORWAY_COUNTIES = [
  { name: 'Oslo', slug: 'oslo', region: 'Østlandet' },
  { name: 'Akershus', slug: 'akershus', region: 'Østlandet' },
  { name: 'Østfold', slug: 'ostfold', region: 'Østlandet' },
  { name: 'Buskerud', slug: 'buskerud', region: 'Østlandet' },
  { name: 'Vestfold', slug: 'vestfold', region: 'Østlandet' },
  { name: 'Telemark', slug: 'telemark', region: 'Østlandet' },
  { name: 'Innlandet', slug: 'innlandet', region: 'Østlandet' },
  { name: 'Agder', slug: 'agder', region: 'Sørlandet' },
  { name: 'Rogaland', slug: 'rogaland', region: 'Vestlandet' },
  { name: 'Vestland', slug: 'vestland', region: 'Vestlandet' },
  { name: 'Møre og Romsdal', slug: 'more-og-romsdal', region: 'Vestlandet' },
  { name: 'Trøndelag', slug: 'trondelag', region: 'Midt-Norge' },
  { name: 'Nordland', slug: 'nordland', region: 'Nord-Norge' },
  { name: 'Troms', slug: 'troms', region: 'Nord-Norge' },
  { name: 'Finnmark', slug: 'finnmark', region: 'Nord-Norge' }
] as const;

export const NORWAY_LOCATIONS: Record<string, LocationProfile> = {
  // ── OSLO & AKERSHUS ──────────────────────────────────────────
  'oslo': {
    slug: 'oslo',
    name: 'Oslo',
    type: 'by',
    county: 'Oslo',
    region: 'Østlandet',
    kommune: 'Oslo',
    focusClimate: 'Rehabilitering av eldre bygårder, strenge støykrav, Plan- og bygningsetaten i Oslo (PBE) og TEK17 energikrav.',
    popularTrades: ['Tømrer', 'Rørlegger', 'Elektriker', 'Maler', 'Murer', 'Totalentreprenør']
  },
  'baerum': {
    slug: 'baerum',
    name: 'Bærum',
    type: 'by',
    county: 'Akershus',
    region: 'Østlandet',
    kommune: 'Bærum',
    focusClimate: 'Eksklusive nybygg, tilbygg, strenge reguleringsplaner og høye krav til dokumentert KS og uavhengig kontroll.',
    popularTrades: ['Tømrer', 'Elektriker', 'Murer', 'Rørlegger', 'Taktekker']
  },
  'asker': {
    slug: 'asker',
    name: 'Asker',
    type: 'by',
    county: 'Akershus',
    region: 'Østlandet',
    kommune: 'Asker',
    focusClimate: 'Eneboliger, radonsikring iht. TEK17 § 13-5 og våtromsdokumentasjon.',
    popularTrades: ['Tømrer', 'Rørlegger', 'Elektriker', 'Grunnentreprenør']
  },
  'lillestrom': {
    slug: 'lillestrom',
    name: 'Lillestrøm',
    type: 'by',
    county: 'Akershus',
    region: 'Østlandet',
    kommune: 'Lillestrøm',
    focusClimate: 'Rask vekst, kvikkleire og krevende grunnforhold, NS 8406 varslingsrutiner ved grunnarbeid.',
    popularTrades: ['Grunnentreprenør', 'Tømrer', 'Elektriker', 'Maler']
  },
  'nordre-follo': {
    slug: 'nordre-follo',
    name: 'Nordre Follo',
    type: 'by',
    county: 'Akershus',
    region: 'Østlandet',
    kommune: 'Nordre Follo',
    focusClimate: 'Ski og Kolbotn, boligfortetting, HMS og byggeplassikkerhet nær naboer.',
    popularTrades: ['Tømrer', 'Rørlegger', 'Maler', 'Elektriker']
  },
  'jessheim': {
    slug: 'jessheim',
    name: 'Jessheim',
    type: 'by',
    county: 'Akershus',
    region: 'Østlandet',
    kommune: 'Ullensaker',
    focusClimate: 'Gardermoregionen, logistikkbygg, næringsbygg og ekspanderende boligfelt.',
    popularTrades: ['Totalentreprenør', 'Tømrer', 'Elektriker', 'Blikkenslager']
  },

  // ── BERGEN & VESTLAND ────────────────────────────────────────
  'bergen': {
    slug: 'bergen',
    name: 'Bergen',
    type: 'by',
    county: 'Vestland',
    region: 'Vestlandet',
    kommune: 'Bergen',
    focusClimate: 'Kraftig vestlandskystklima, slagregn, krevende fuktsikring av vindsperre, tak og klemte skjøter.',
    popularTrades: ['Tømrer', 'Taktekker', 'Blikkenslager', 'Maler', 'Rørlegger']
  },
  'askoy': {
    slug: 'askoy',
    name: 'Askøy',
    type: 'tettsted',
    county: 'Vestland',
    region: 'Vestlandet',
    kommune: 'Askøy',
    focusClimate: 'Kystmiljø, fukt og saltpåvirkning, korrosjonsbestandige festemidler iht. NS 3420.',
    popularTrades: ['Tømrer', 'Maler', 'Rørlegger']
  },
  'forus-leirvik': {
    slug: 'stord-leirvik',
    name: 'Stord / Leirvik',
    type: 'by',
    county: 'Vestland',
    region: 'Vestlandet',
    kommune: 'Stord',
    focusClimate: 'Industri- og verftsrelatert byggevirksomhet, strenge HMS-krav og SHA-planer.',
    popularTrades: ['Tømrer', 'Elektriker', 'Murer']
  },
  'forde': {
    slug: 'forde',
    name: 'Førde',
    type: 'by',
    county: 'Vestland',
    region: 'Vestlandet',
    kommune: 'Sunnfjord',
    focusClimate: 'Inlandsklima og snølast i kombinasjon med vestlandsnedbør.',
    popularTrades: ['Tømrer', 'Grunnentreprenør', 'Rørlegger']
  },

  // ── TRONDHEIM & TRØNDELAG ────────────────────────────────────
  'trondheim': {
    slug: 'trondheim',
    name: 'Trondheim',
    type: 'by',
    county: 'Trøndelag',
    region: 'Midt-Norge',
    kommune: 'Trondheim',
    focusClimate: 'Trønderklima med temperatursvingninger, trehusbebyggelse, Byggforsk-detaljer og tele i grunn.',
    popularTrades: ['Tømrer', 'Elektriker', 'Murer', 'Rørlegger', 'Maler']
  },
  'stjordal': {
    slug: 'stjordal',
    name: 'Stjørdal',
    type: 'by',
    county: 'Trøndelag',
    region: 'Midt-Norge',
    kommune: 'Stjørdal',
    focusClimate: 'Boligfelt og samferdselsknutepunkt, krav til koordinering og byggedagbok.',
    popularTrades: ['Tømrer', 'Grunnentreprenør', 'Elektriker']
  },
  'steinkjer': {
    slug: 'steinkjer',
    name: 'Steinkjer',
    type: 'by',
    county: 'Trøndelag',
    region: 'Midt-Norge',
    kommune: 'Steinkjer',
    focusClimate: 'Landbruksbygg, trekonstruksjoner og lokal entreprenørvirksomhet.',
    popularTrades: ['Tømrer', 'Murer', 'Rørlegger']
  },

  // ── STAVANGER, SANDNES & ROGALAND ────────────────────────────
  'stavanger': {
    slug: 'stavanger',
    name: 'Stavanger',
    type: 'by',
    county: 'Rogaland',
    region: 'Vestlandet',
    kommune: 'Stavanger',
    focusClimate: 'Sterk vind, kystklima, trehusbyen Stavanger, strenge antikvariske krav og TEK17.',
    popularTrades: ['Tømrer', 'Maler', 'Elektriker', 'Rørlegger', 'Taktekker']
  },
  'sandnes': {
    slug: 'sandnes',
    name: 'Sandnes',
    type: 'by',
    county: 'Rogaland',
    region: 'Vestlandet',
    kommune: 'Sandnes',
    focusClimate: 'Stor boligbygging, leilighetskomplekser, tverrfaglig koordinering og NS 8405/8406 kontrakter.',
    popularTrades: ['Tømrer', 'Murer', 'Elektriker', 'Rørlegger']
  },
  'haugesund': {
    slug: 'haugesund',
    name: 'Haugesund',
    type: 'by',
    county: 'Rogaland',
    region: 'Vestlandet',
    kommune: 'Haugesund',
    focusClimate: 'Maritimt kystmiljø på Haugalandet, vindbelastning på taktekking og fasade.',
    popularTrades: ['Tømrer', 'Taktekker', 'Blikkenslager', 'Elektriker']
  },
  'bryne': {
    slug: 'bryne',
    name: 'Bryne',
    type: 'by',
    county: 'Rogaland',
    region: 'Vestlandet',
    kommune: 'Time',
    focusClimate: 'Jæren med flatt landskap og kraftig vind, forankring av takstoler og vindsperrer.',
    popularTrades: ['Tømrer', 'Grunnentreprenør', 'Murer']
  },

  // ── KRISTIANSAND & AGDER ─────────────────────────────────────
  'kristiansand': {
    slug: 'kristiansand',
    name: 'Kristiansand',
    type: 'by',
    county: 'Agder',
    region: 'Sørlandet',
    kommune: 'Kristiansand',
    focusClimate: 'Sørlandskyst, hyttebygging i skjærgården, sesongvariasjoner og våtromskrav.',
    popularTrades: ['Tømrer', 'Maler', 'Rørlegger', 'Elektriker']
  },
  'arendal': {
    slug: 'arendal',
    name: 'Arendal',
    type: 'by',
    county: 'Agder',
    region: 'Sørlandet',
    kommune: 'Arendal',
    focusClimate: 'Sørlandshus, renovering og nyetablering av industri og boliger.',
    popularTrades: ['Tømrer', 'Elektriker', 'Rørlegger']
  },
  'grimstad': {
    slug: 'grimstad',
    name: 'Grimstad',
    type: 'by',
    county: 'Agder',
    region: 'Sørlandet',
    kommune: 'Grimstad',
    focusClimate: 'Trehusbebyggelse, hytteprosjekter og strenge krav til fuktsikring.',
    popularTrades: ['Tømrer', 'Maler', 'Elektriker']
  },

  // ── DRAMMEN, BUSKERUD & VESTFOLD ─────────────────────────────
  'drammen': {
    slug: 'drammen',
    name: 'Drammen',
    type: 'by',
    county: 'Buskerud',
    region: 'Østlandet',
    kommune: 'Drammen',
    focusClimate: 'Elveby, flomfare ved Drammenselva, drenering og fuktsikring av kjellere iht. TEK17.',
    popularTrades: ['Tømrer', 'Grunnentreprenør', 'Rørlegger', 'Murer']
  },
  'kongsberg': {
    slug: 'kongsberg',
    name: 'Kongsberg',
    type: 'by',
    county: 'Buskerud',
    region: 'Østlandet',
    kommune: 'Kongsberg',
    focusClimate: 'Inlandsklima, snølast på tak og hyttebygging mot Blefjell og Numedal.',
    popularTrades: ['Tømrer', 'Taktekker', 'Elektriker']
  },
  'honefoss': {
    slug: 'honefoss',
    name: 'Hønefoss',
    type: 'by',
    county: 'Buskerud',
    region: 'Østlandet',
    kommune: 'Ringerike',
    focusClimate: 'Ringeriksregionen, grunnforhold, flomsikring og hytteprosjekter.',
    popularTrades: ['Tømrer', 'Grunnentreprenør', 'Rørlegger']
  },
  'tonsberg': {
    slug: 'tonsberg',
    name: 'Tønsberg',
    type: 'by',
    county: 'Vestfold',
    region: 'Østlandet',
    kommune: 'Tønsberg',
    focusClimate: 'Kystmiljø, Norges eldste by, vernede fasader og krevende rehabilitering.',
    popularTrades: ['Tømrer', 'Maler', 'Murer', 'Elektriker']
  },
  'sandefjord': {
    slug: 'sandefjord',
    name: 'Sandefjord',
    type: 'by',
    county: 'Vestfold',
    region: 'Østlandet',
    kommune: 'Sandefjord',
    focusClimate: 'Kystklima, hytte- og fritidseiendommer, våtromsnormen og TEK17.',
    popularTrades: ['Tømrer', 'Rørlegger', 'Elektriker']
  },
  'larvik': {
    slug: 'larvik',
    name: 'Larvik',
    type: 'by',
    county: 'Vestfold',
    region: 'Østlandet',
    kommune: 'Larvik',
    focusClimate: 'Larvikitt, sprengningsarbeid og krevende grunnforhold for grunnentreprenører.',
    popularTrades: ['Grunnentreprenør', 'Tømrer', 'Murer']
  },

  // ── ØSTFOLD ──────────────────────────────────────────────────
  'fredrikstad': {
    slug: 'fredrikstad',
    name: 'Fredrikstad',
    type: 'by',
    county: 'Østfold',
    region: 'Østlandet',
    kommune: 'Fredrikstad',
    focusClimate: 'Glomma-deltaet, fuktpåvirkning, teglsteinsbygg, Gamlebyen og moderne boligfelt.',
    popularTrades: ['Tømrer', 'Murer', 'Maler', 'Rørlegger']
  },
  'sarpsborg': {
    slug: 'sarpsborg',
    name: 'Sarpsborg',
    type: 'by',
    county: 'Østfold',
    region: 'Østlandet',
    kommune: 'Sarpsborg',
    focusClimate: 'Industriby med store byggeprosjekter, SHA-planer og koordinering av underentreprenører.',
    popularTrades: ['Tømrer', 'Elektriker', 'Grunnentreprenør']
  },
  'moss': {
    slug: 'moss',
    name: 'Moss',
    type: 'by',
    county: 'Østfold',
    region: 'Østlandet',
    kommune: 'Moss',
    focusClimate: 'Jernbaneutbygging, byfortetting og krevende grunnforhold med leire.',
    popularTrades: ['Tømrer', 'Rørlegger', 'Maler']
  },
  'halden': {
    slug: 'halden',
    name: 'Halden',
    type: 'by',
    county: 'Østfold',
    region: 'Østlandet',
    kommune: 'Halden',
    focusClimate: 'Grenseregion mot Sverige, tømmerkonstruksjoner og lokal næringsbygging.',
    popularTrades: ['Tømrer', 'Elektriker', 'Taktekker']
  },

  // ── INNLANDET ────────────────────────────────────────────────
  'hamar': {
    slug: 'hamar',
    name: 'Hamar',
    type: 'by',
    county: 'Innlandet',
    region: 'Østlandet',
    kommune: 'Hamar',
    focusClimate: 'Mjøsregionen, store temperatursvingninger, vinterkulde (-20 °C) og telehiv.',
    popularTrades: ['Tømrer', 'Grunnentreprenør', 'Rørlegger', 'Elektriker']
  },
  'lillehammer': {
    slug: 'lillehammer',
    name: 'Lillehammer',
    type: 'by',
    county: 'Innlandet',
    region: 'Østlandet',
    kommune: 'Lillehammer',
    focusClimate: 'Vinterby, store snømengder, hyttebygging i Hafjell, Sjusjøen og Kvitfjell.',
    popularTrades: ['Tømrer', 'Taktekker', 'Rørlegger', 'Elektriker']
  },
  'gjovik': {
    slug: 'gjovik',
    name: 'Gjøvik',
    type: 'by',
    county: 'Innlandet',
    region: 'Østlandet',
    kommune: 'Gjøvik',
    focusClimate: 'Trehusbyggeri, industri og strenge krav til lufttetthet i vinterkulde.',
    popularTrades: ['Tømrer', 'Maler', 'Elektriker']
  },
  'kongsvinger': {
    slug: 'kongsvinger',
    name: 'Kongsvinger',
    type: 'by',
    county: 'Innlandet',
    region: 'Østlandet',
    kommune: 'Kongsvinger',
    focusClimate: 'Skogbruksregion, massivtre, radonsikring og vinterbygging.',
    popularTrades: ['Tømrer', 'Rørlegger', 'Grunnentreprenør']
  },

  // ── TELEMARK ─────────────────────────────────────────────────
  'skien': {
    slug: 'skien',
    name: 'Skien',
    type: 'by',
    county: 'Telemark',
    region: 'Østlandet',
    kommune: 'Skien',
    focusClimate: 'Grenlandsregionen, rehabilitering, TEK17 våtrom og internkontroll.',
    popularTrades: ['Tømrer', 'Rørlegger', 'Elektriker', 'Maler']
  },
  'porsgrunn': {
    slug: 'porsgrunn',
    name: 'Porsgrunn',
    type: 'by',
    county: 'Telemark',
    region: 'Østlandet',
    kommune: 'Porsgrunn',
    focusClimate: 'Industrielt fokus, krevende kjemikaliehåndtering (stoffkartotek) og HMS.',
    popularTrades: ['Tømrer', 'Elektriker', 'Rørlegger']
  },
  'notodden': {
    slug: 'notodden',
    name: 'Notodden',
    type: 'by',
    county: 'Telemark',
    region: 'Østlandet',
    kommune: 'Notodden',
    focusClimate: 'Telemarksvinter, hyttebygging mot Lifjell og Gaustablikk.',
    popularTrades: ['Tømrer', 'Taktekker', 'Elektriker']
  },

  // ── MØRE OG ROMSDAL ──────────────────────────────────────────
  'alesund': {
    slug: 'alesund',
    name: 'Ålesund',
    type: 'by',
    county: 'Møre og Romsdal',
    region: 'Vestlandet',
    kommune: 'Ålesund',
    focusClimate: 'Ekstremt værutsatt kyst, Jugendbyen, mur- og pussfasader, slagregntetting.',
    popularTrades: ['Murer', 'Tømrer', 'Blikkenslager', 'Taktekker', 'Maler']
  },
  'molde': {
    slug: 'molde',
    name: 'Molde',
    type: 'by',
    county: 'Møre og Romsdal',
    region: 'Vestlandet',
    kommune: 'Molde',
    focusClimate: 'Romsdalsfjorden, vind og fukt, bolig- og næringsbygging.',
    popularTrades: ['Tømrer', 'Rørlegger', 'Elektriker']
  },
  'kristiansund': {
    slug: 'kristiansund',
    name: 'Kristiansund',
    type: 'by',
    county: 'Møre og Romsdal',
    region: 'Vestlandet',
    kommune: 'Kristiansund',
    focusClimate: 'Atlanterhavskyst, saltkorrosjon og strenge krav til utvendige beslag og taktekking.',
    popularTrades: ['Blikkenslager', 'Tømrer', 'Maler']
  },

  // ── NORD-NORGE (Nordland, Troms, Finnmark) ───────────────────
  'bodo': {
    slug: 'bodo',
    name: 'Bodø',
    type: 'by',
    county: 'Nordland',
    region: 'Nord-Norge',
    kommune: 'Bodø',
    focusClimate: 'Ny by – ny flyplass, kuling og storm, forankring av tak og fasadeelementer.',
    popularTrades: ['Totalentreprenør', 'Tømrer', 'Taktekker', 'Elektriker']
  },
  'tromso': {
    slug: 'tromso',
    name: 'Tromsø',
    type: 'by',
    county: 'Troms',
    region: 'Nord-Norge',
    kommune: 'Tromsø',
    focusClimate: 'Arktisk klima, mørketid, permafrost/tele, store snømengder og strenge isolasjonskrav.',
    popularTrades: ['Tømrer', 'Rørlegger', 'Elektriker', 'Taktekker']
  },
  'harstad': {
    slug: 'harstad',
    name: 'Harstad',
    type: 'by',
    county: 'Troms',
    region: 'Nord-Norge',
    kommune: 'Harstad',
    focusClimate: 'Kystmiljø i Sør-Troms, fuktsikring og TEK17 lufttetthet.',
    popularTrades: ['Tømrer', 'Rørlegger', 'Elektriker']
  },
  'narvik': {
    slug: 'narvik',
    name: 'Narvik',
    type: 'by',
    county: 'Nordland',
    region: 'Nord-Norge',
    kommune: 'Narvik',
    focusClimate: 'Fjell- og malmby, krevende skråtomter, fjellsikring og store snømengder.',
    popularTrades: ['Grunnentreprenør', 'Tømrer', 'Murer']
  },
  'alta': {
    slug: 'alta',
    name: 'Alta',
    type: 'by',
    county: 'Finnmark',
    region: 'Nord-Norge',
    kommune: 'Alta',
    focusClimate: 'Finnmarksvidda, ekstrem kulde ned mot -35 °C, strenge dampsperrekrav og frostsikring.',
    popularTrades: ['Tømrer', 'Rørlegger', 'Elektriker', 'Grunnentreprenør']
  },
  'mo-i-rana': {
    slug: 'mo-i-rana',
    name: 'Mo i Rana',
    type: 'by',
    county: 'Nordland',
    region: 'Nord-Norge',
    kommune: 'Rana',
    focusClimate: 'Polarsirkelby, industribygging og tøffe vinterforhold.',
    popularTrades: ['Tømrer', 'Elektriker', 'Grunnentreprenør']
  }
};
