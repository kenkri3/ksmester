import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { PLATFORM_ORGNUMBER } from '@/src/constants/companyDetails';

const LOCAL_STORE_DIR = path.resolve(process.cwd(), '.data');
const LOCAL_STORE_FILE = path.join(LOCAL_STORE_DIR, 'local_store.json');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

// 🛡️ SECURITY FIX: Replaced hardcoded fallback password with a dynamically generated one.
// Hardcoded passwords in source code allow attackers to access the default admin account if the environment variable is missing.
export const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'kenkri3@gmail.com').toLowerCase();
// SIKKERHETSFIKS (E-09): Tidligere sto det hardkodede passordet 'VikingMester2026!'
// som fallback her, og seedingen kjorte 'ON CONFLICT (email) DO UPDATE SET
// password = EXCLUDED.password'. Uten ADMIN_PASSWORD i miljoet ble admin-passordet
// dermed nullstilt til en offentlig kjent verdi ved HVER prosessoppstart.
// Na: ingen hardkodet fallback. Mangler variabelen i produksjon, genereres et
// tilfeldig passord per prosess - kontoen finnes, men ingen kan logge inn med et
// kjent passord. I utvikling brukes en stabil, tydelig lokal testverdi.
let cachedAdminHash: string | null = null;
function getAdminSeedHash(): string {
  if (cachedAdminHash) return cachedAdminHash;
  const configured = (process.env.ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || '').trim();
  if (configured) {
    cachedAdminHash = bcrypt.hashSync(configured, 10);
    return cachedAdminHash;
  }
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[SECURITY] ADMIN_PASSWORD er ikke satt i produksjon. ' +
      'Admin-kontoen seedes med et tilfeldig passord som ikke deles - ingen kan logge inn pa den. ' +
      'Sett ADMIN_PASSWORD i miljovariablene.'
    );
    cachedAdminHash = bcrypt.hashSync(randomBytes(32).toString('hex'), 10);
  } else {
    console.warn('[SECURITY] ADMIN_PASSWORD mangler - bruker en lokal utviklingsverdi.');
    cachedAdminHash = bcrypt.hashSync('dev-only-admin-password', 10);
  }
  return cachedAdminHash;
}
// Beholdes som navn for kompatibilitet, men er na en funksjon uten kjent fallback.
export const getDefaultAdminHash = getAdminSeedHash;

export const ADMIN_EMAILS = [
  'kenkri3@gmail.com',
  'aichatnorge@gmail.com',
  'kenneth@aichatnorge.no',
  'fredrik.r.ellingsen@gmail.com',
  'fredrik@aichatnorge.no',
  'lars@nonfoodgroup.no',
  'jm@nonfoodgroup.no'
];

export const DEMO_USER_EMAIL = 'demo@fjellheimbygg.no';
export const DEMO_USER_PASSWORD = 'Demo1234!';
export const DEMO_USER_HASH = bcrypt.hashSync(DEMO_USER_PASSWORD, 10);

let pool: Pool | null = null;
if (DATABASE_URL) {
  const isInternal = 
    DATABASE_URL.includes('.railway.internal') || 
    DATABASE_URL.includes('localhost') || 
    DATABASE_URL.includes('127.0.0.1');

  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: isInternal ? false : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false)
  });

  // 🛡️ BOMBECIKKER DRIFT: Forhindre at uventede feil på ledige databaseklienter krasjer serverprosessen
  pool.on('error', (err) => {
    console.error('⚠️ [PostgreSQL Pool Warning] Uventet feil på ledig databaseklient:', err.message);
  });
} else {
  // SIKKERHETSFIKS (O-04): uten DATABASE_URL ble `pool` null, og ALL data gikk
  // til minne eller .data/local_store.json. På Railway betyr det stille datatap
  // ved hver redeploy, mens README kaller variabelen påkrevd. Appen så dessuten
  // frisk ut hele veien - den svarte 200 og viste tomme lister.
  //
  // Vi kaster ikke her: det ville satt tjenesten i restart-løkke og tatt ned
  // også den delen som virker. I stedet sier vi det høyt, og /api/health
  // rapporterer 503 i produksjon uten DATABASE_URL - da feiler deployen
  // synlig, og den forrige, fungerende versjonen blir stående.
  console.error(
    '[DB] ADVARSEL: DATABASE_URL er ikke satt. Data går til minnelager/lokal fil ' +
    'og FORSVINNER ved neste redeploy. Sett DATABASE_URL i miljøvariablene.'
  );
}

/**
 * 💾 Sikrer at lokal in-memory-database persisteres til disk under lokal utvikling,
 * slik at tilbud, kontrakter og avvik ikke forsvinner ved Next.js hot-reload eller mellom ulike worker-prosesser.
 */
export function ensureLocalStoreLoaded() {
  if (pool) return;
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        for (const key of Object.keys(parsed)) {
          if (Array.isArray(parsed[key])) {
            if (!inMemoryStore[key] || inMemoryStore[key].length === 0) {
              inMemoryStore[key] = parsed[key];
            } else {
              const existingIds = new Set(inMemoryStore[key].map((x: any) => x.id));
              for (const item of parsed[key]) {
                if (!existingIds.has(item.id)) {
                  inMemoryStore[key].push(item);
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[DB] Kunne ikke laste lokal store fil:', err);
  }
}

export function persistLocalStore() {
  if (pool) return;
  try {
    if (!fs.existsSync(LOCAL_STORE_DIR)) {
      fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[DB] Kunne ikke lagre lokal store fil:', err);
  }
}

export const inMemoryStore: Record<string, any[]> = {
  users: [
    {
      id: 'u-admin-123',
      email: DEFAULT_ADMIN_EMAIL,
      password: getAdminSeedHash(),
      displayName: 'Ken (Admin)',
      role: 'admin',
      trade: 'Byggmester',
      company: 'Mester Entreprenør AS',
      companyId: 'comp-001',
      subscriptionStatus: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'u-admin-aichatnorge',
      email: 'aichatnorge@gmail.com',
      password: getAdminSeedHash(),
      displayName: 'Kenneth Kristiansen',
      role: 'admin',
      trade: 'Byggmester',
      company: 'AIChat Norge AS / Vikingnet',
      companyId: 'comp-001',
      subscriptionStatus: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'u-demo-lars-fjellheim',
      email: DEMO_USER_EMAIL,
      password: DEMO_USER_HASH,
      displayName: 'Lars Fjellheim (Demokunde)',
      role: 'admin',
      trade: 'Tømrer / Byggmester',
      company: 'Fjellheim Bygg & Tømrer AS',
      companyId: 'comp-demo-fjellheim',
      subscriptionStatus: 'active',
      createdAt: new Date().toISOString()
    }
  ],
  companies: [
    {
      id: 'comp-001',
      name: 'Mester Entreprenør AS',
      // SIKKERHETSFIKS (R-01): dette var det feilaktige '933 607 779', som ikke
      // finnes i Enhetsregisteret. Rettet til plattformens verifiserte nummer via
      // én sannhetskilde, se src/constants/companyDetails.ts.
      orgnr: PLATFORM_ORGNUMBER,
      contactName: 'Ken (Admin)',
      email: 'kenkri3@gmail.com',
      phone: '401 63 082',
      plan: 'enterprise',
      status: 'active',
      subscriptionStatus: 'active',
      modules: ['projects', 'checklists', 'deviations', 'ai', 'economy', 'fdv', 'inventory', 'vehicle', 'time', 'apprentice', 'building_app'],
      createdAt: new Date().toISOString()
    },
    {
        id: 'comp-demo-fjellheim',
        name: 'Fjellheim Bygg & Tømrer AS (Demokunde)',
        orgnr: '928 374 651',
        contactName: 'Lars Fjellheim',
        email: DEMO_USER_EMAIL,
        phone: '000 00 001',
        plan: 'demo',
        isDemo: true,
        monthlyPrice: 0,
        status: 'active',
        subscriptionStatus: 'active',
        modules: ['projects', 'checklists', 'deviations', 'ai', 'economy', 'fdv', 'inventory', 'vehicle', 'time', 'apprentice'],
        createdAt: new Date().toISOString()
    }
  ],
  projects: [
    {
      id: 'proj-bad-vidjeveien',
      companyId: 'comp-001',
      company: 'Mester Entreprenør AS',
      name: 'Renovering Bad Vidjeveien 21',
      aliases: ['Totalrenovering Bad - Våtromsnormen', 'Vidjeveien 21', 'Renovering Bad Vidjeveien 21', 'BAD-2101'],
      projectCode: 'BAD-2101',
      address: 'Demo-veien 1, 0001 Demo-by',
      location: 'Demo-veien 1, 0001 Demo-by',
      clientName: 'Demo Kunde',
      clientEmail: 'demo.kunde@example.invalid',
      clientPhone: '000 00 001',
      status: 'active',
      stage: 'Pågående',
      category: 'Bad / Våtrom BVN',
      progress: 45,
      createdAt: new Date().toISOString()
    },
    {
      id: 'proj-kongeveien-93a',
      companyId: 'comp-001',
      company: 'Mester Entreprenør AS',
      name: 'Demo-prosjekt enebolig',
      aliases: ['Demo-prosjekt', 'DEMO-93'],
      projectCode: 'KON-93',
      // SIKKERHETSFIKS (F-03): her sto ekte kundeopplysninger hardkodet i
      // kildekoden - et fullt navn, en privat e-postadresse, et privat
      // telefonnummer og en privat hjemadresse - og dette ble seedet til
      // databasen. Det er andres personopplysninger i et offentlig repo.
      // Erstattet med tydelige demodata. Bruk alltid .invalid (reservert for
      // test) og fiktive navn i seed-data.
      address: 'Demo-veien 2, 0002 Demo-by',
      location: 'Demo-veien 2, 0002 Demo-by',
      clientName: 'Demo Kunde To',
      clientEmail: 'demo.kunde.to@example.invalid',
      clientPhone: '000 00 002',
      status: 'active',
      stage: 'Sluttfase / Montasje',
      category: 'Totalrenovering enebolig',
      progress: 85,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'proj-demo-sjusjoen',
      companyId: 'comp-demo-fjellheim',
      company: 'comp-demo-fjellheim',
      name: 'Hytte Sjusjøen - Nybygg',
      projectCode: 'P-2026-FJELL',
      address: 'Birkebeinervegen 42, 2612 Sjusjøen',
      location: 'Birkebeinervegen 42, 2612 Sjusjøen',
      clientName: 'Ola Nordmann (Privatkunde)',
      clientEmail: 'ola.nordmann.demo@gmail.com',
      clientPhone: '98765432',
      status: 'active',
      stage: 'Pågående',
      category: 'Hytte / Fritidsbolig',
      progress: 35,
      createdAt: new Date().toISOString()
    }
  ],
  deviations: [
    {
      id: 'dev-bad-vidjeveien-1',
      companyId: 'comp-001',
      company: 'Mester Entreprenør AS',
      projectId: 'proj-bad-vidjeveien',
      projectName: 'Renovering Bad Vidjeveien 21',
      title: 'Mangler mansjett ved rør-i-rør fordelerskap',
      description: 'Under kontroll før plating ble det avdekket at tetningsmansjett rundt varerør manglet forskriftsmessig klemming iht. BVN 42.100.',
      severity: 'medium',
      trade: 'Rørlegger',
      status: 'open',
      category: 'Kvalitet / Våtrom',
      correctiveAction: 'Montere godkjent butylmansjett og forsegle med smøremembran før lukking.',
      reportedBy: 'Ken (Admin)',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'dev-demo-sjusjoen-1',
      companyId: 'comp-demo-fjellheim',
      company: 'comp-demo-fjellheim',
      projectId: 'proj-demo-sjusjoen',
      projectName: 'Hytte Sjusjøen - Nybygg',
      title: 'Mangler sikringsrekkverk ved stillas østvegg',
      description: 'Under morgenkontroll ble det oppdaget at øverste stillasbom manglet rekkverk mot øst. Utbedret umiddelbart.',
      severity: 'medium',
      status: 'closed',
      category: 'HMS',
      reportedBy: 'Lars Fjellheim',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ],
  change_orders: [
    {
      id: 'co-demo-sjusjoen-1',
      companyId: 'comp-demo-fjellheim',
      company: 'comp-demo-fjellheim',
      projectId: 'proj-demo-sjusjoen',
      projectName: 'Hytte Sjusjøen - Nybygg',
      changeNumber: 1,
      title: 'Tilvalg: Ekstra takisolering (350mm til 400mm)',
      description: 'Kunde har bestilt oppgradering til 400 mm innblåst trefiberisolasjon i tak for bedre vinterkomfort.',
      amountExVat: 24500,
      totalAmount: 30625,
      vatAmount: 6125,
      impactDays: 1,
      status: 'approved',
      legalHjemmel: 'NS 8406 pkt. 19.2',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    }
  ],
  agent_activities: [],
  sja_reports: [
    {
      id: 'sja-demo-sjusjoen-1',
      companyId: 'comp-demo-fjellheim',
      company: 'comp-demo-fjellheim',
      projectId: 'proj-demo-sjusjoen',
      projectName: 'Hytte Sjusjøen - Nybygg',
      title: 'Sikker Jobb Analyse: Takstolmontasje med mobilkran',
      status: 'completed',
      conductedBy: 'Lars Fjellheim',
      participants: ['Lars Fjellheim (Bas)', 'Ole Tømrer', 'Kranfører Jon'],
      measures: [
        'Avsperring av faresone under løft',
        'Bruk av godkjent fallsikringssele på takverk',
        'Vindmåling før løft (maks 10 m/s)'
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  tasks: [
    {
      id: 'task-v21-1',
      projectId: 'proj-bad-vidjeveien',
      projectName: 'Renovering Bad Vidjeveien 21',
      companyId: 'comp-001',
      title: 'Slukmontering og falloppbygging mot sluk (BVN)',
      description: 'Støping av fall 1:50 i dusjsone og 1:100 i rommet, samt montering av klemring.',
      assignedTo: 'Ken (Byggmester)',
      dueDate: '2026-09-28',
      priority: 'high',
      status: 'in_progress',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task-v21-2',
      projectId: 'proj-bad-vidjeveien',
      projectName: 'Renovering Bad Vidjeveien 21',
      companyId: 'comp-001',
      title: 'Membranarbeid og mansjetter ved rørgjennomføringer',
      description: 'Påføring av smøremembran med armeringsduk i hjørner og tettesjikt iht. TEK17 § 13-15.',
      assignedTo: 'Ken (Byggmester)',
      dueDate: '2026-09-30',
      priority: 'urgent',
      status: 'pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task-v21-3',
      projectId: 'proj-bad-vidjeveien',
      projectName: 'Renovering Bad Vidjeveien 21',
      companyId: 'comp-001',
      title: 'Riving og sanering av eksisterende fliser og baderomsinnredning',
      description: 'Fjerning av gammelt belegg, transport til godkjent avfallsmottak med deklarering.',
      assignedTo: 'Lærling / Håndverker',
      dueDate: '2026-09-22',
      priority: 'medium',
      status: 'completed',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task-kon-1',
      projectId: 'proj-kongeveien-93a',
      projectName: 'Totalrenovering Kongeveien 93A',
      companyId: 'comp-001',
      title: 'Montering av listverk og foringer i 2. etasje',
      description: 'Montering av gerikter rundt dører og vinduer før sluttvask og overlevering.',
      assignedTo: 'Ken (Byggmester)',
      dueDate: '2026-09-29',
      priority: 'high',
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  ],
  time_entries: [
    {
      id: 'time-v21-1',
      projectId: 'proj-bad-vidjeveien',
      projectName: 'Renovering Bad Vidjeveien 21',
      companyId: 'comp-001',
      userId: 'u-admin-123',
      userName: 'Ken (Admin)',
      workerName: 'Ken (Admin)',
      date: '2026-09-24',
      hours: 7.5,
      task: 'Rørleggerkoordinering, fallstøp og klargjøring for membran',
      description: 'Rørleggerkoordinering, fallstøp og klargjøring for membran',
      category: 'arbeid',
      status: 'approved',
      createdAt: new Date().toISOString()
    },
    {
      id: 'time-v21-2',
      projectId: 'proj-bad-vidjeveien',
      projectName: 'Renovering Bad Vidjeveien 21',
      companyId: 'comp-001',
      userId: 'u-admin-123',
      userName: 'Ken (Admin)',
      workerName: 'Ken (Admin)',
      date: '2026-09-23',
      hours: 8.0,
      task: 'Pigging, riving av gammelt gulv og utlekting for rør-i-rør skap',
      description: 'Pigging, riving av gammelt gulv og utlekting for rør-i-rør skap',
      category: 'arbeid',
      status: 'approved',
      createdAt: new Date().toISOString()
    },
    {
      id: 'time-kon-1',
      projectId: 'proj-kongeveien-93a',
      projectName: 'Totalrenovering Kongeveien 93A',
      companyId: 'comp-001',
      userId: 'u-admin-123',
      userName: 'Ken (Admin)',
      workerName: 'Ken (Admin)',
      date: '2026-09-24',
      hours: 42.0,
      task: 'Platekledning, listing og klargjøring for overlevering',
      description: 'Platekledning, listing og klargjøring for overlevering',
      category: 'arbeid',
      status: 'approved',
      createdAt: new Date().toISOString()
    }
  ],
  daily_logs: [
    {
      id: 'log-v21-1',
      projectId: 'proj-bad-vidjeveien',
      projectName: 'Renovering Bad Vidjeveien 21',
      companyId: 'comp-001',
      date: '2026-09-24',
      crewCount: 1,
      crewMembers: ['Ken (Admin)'],
      totalHoursWorked: 7.5,
      generalNotes: '• Ken: 7.5t – Rørleggerkoordinering, fallstøp og klargjøring for membran. Fall mot sluk kontrollert med vater iht. BVN.',
      weatherCondition: 'Overskyet, 16°C, vind 3,3 m/s, 0 mm nedbør',
      inspectedBy: 'Ken (Admin)',
      createdAt: new Date().toISOString()
    }
  ],
  offers: [],
  contracts: [],
  notifications: [],
  materials: [],
  time_registrations: [],
  vehicles: [],
  invites: [],
  activity_logs: [],
  checklists: [],
  documents: [],
  hms_documents: [
    {
      id: 'hms-doc-1',
      title: 'HMS-erklæring og målsetting for byggeplassen',
      category: 'general',
      version: '1.0',
      companyId: 'system',
      updatedAt: '2026-08-01T10:00:00.000Z',
      content: '# HMS-erklæring og Målsetting\n\nVår bedrift har som overordnet mål at alt arbeid skal utføres uten personskader, helseplager eller skade på miljø og materiell (Null-visjon).\n\n### 1. Hovedprinsipper\n- Sikkerhet og helse har alltid førsteprioritet foran fremdrift og økonomi.\n- Enhver ansatt har rett og plikt til å stanse uforsvarlig arbeid (AML § 2-3).\n- Ryddighet på byggeplass er grunnlaget for et sikkert arbeidsmiljø.\n\n### 2. Ansvar og medvirkning\n- **Ledelsen** sørger for opplæring, nødvendig verneutstyr og risikovurderinger.\n- **Verneombudet** påser at arbeidsmiljøloven følges og deltar på vernerunder.\n- **Ansatte** er forpliktet til å bruke påbudt verneutstyr og rapportere avvik og nestenulykker.'
    },
    {
      id: 'hms-doc-2',
      title: 'Personlig verneutstyr (PVU) – Krav og bruk',
      category: 'safety',
      version: '1.2',
      companyId: 'system',
      updatedAt: '2026-08-15T09:00:00.000Z',
      content: '# Krav til Personlig Verneutstyr (PVU)\n\nPå alle våre bygge- og anleggsplasser gjelder strenge krav til PVU.\n\n### Obligatorisk grunnutrustning:\n1. **Vernehjelm** med hakestropp (EN 397).\n2. **Vernetøy / Synlighetstøy** klasse 2 eller 3 (EN ISO 20471).\n3. **Vernesko / vernestøvler** med spikertramp og tåhette (S3 / EN ISO 20345).\n4. **Vernebriller / ansiktsskjerm** ved kapping, meisling, boring og støvende arbeid.\n5. **Hørselsvern** ved støy over 80 dB(A).\n\n### Spesialutstyr ved behov:\n- **Fallsele og fangline** ved arbeid over 2 meter uten tilstrekkelig rekkverk.\n- **Åndedrettsvern** (P3-filter / motordrevet vifte) ved asbestsanering, isolering, mineralull og kvartsstøv.'
    },
    {
      id: 'hms-doc-3',
      title: 'Førstehjelp, akuttberedskap og varslingsplan',
      category: 'first_aid',
      version: '1.0',
      companyId: 'system',
      updatedAt: '2026-08-10T08:00:00.000Z',
      content: '# Førstehjelp og Nødprosedyrer\n\nVed akutt personskade eller alvorlig hendelse på byggeplass gjelder følgende instruks:\n\n### 1. Nødnumre:\n- **Brann:** 110\n- **Politi:** 112\n- **Ambulanse / Medisinsk nød:** 113\n- **Legevakt:** 116 117\n- **Giftinformasjonen:** 22 59 13 00\n\n### 2. Handlingsrekkefølge (STANS - TENK - HANDLE):\n1. **Sikre skadestedet:** Koble fra strøm, stans maskiner, sikre mot ras eller fall.\n2. **Gi livreddende førstehjelp:** Frie luftveier, sideleie, stans blødninger, hjerte-lunge-redning (30:2).\n3. **Varsle 113:** Oppgi nøyaktig adresse, adkomst for ambulanse og skadeomfang.\n4. **Møte ambulansen:** Send en person ut til innkjøringen for å veilede nødetatene.'
    },
    {
      id: 'hms-doc-4',
      title: 'Brannvern og varme arbeider',
      category: 'fire',
      version: '1.1',
      companyId: 'system',
      updatedAt: '2026-08-20T11:00:00.000Z',
      content: '# Brannvern og Varme Arbeider\n\nVarme arbeider (sveising, skjærebrenning, taktekking med åpen flamme, bruk av vinkelsliper) medfører stor brannrisiko.\n\n### Krav før oppstart:\n- Gyldig sertifikat for Varme Arbeider fra Norsk Brannvernforening.\n- Skriftlig arbeidstillatelse signert av byggeleder.\n- Rydding av brennbart materiale innenfor 10 meters radius.\n\n### Krav under og etter arbeid:\n- Minst 2 stk godkjente 6 kg pulverapparater (eller tilkoblet brannslange) lett tilgjengelig.\n- Kontinuerlig brannvakt under arbeidet.\n- **Obligatorisk brannvakt i minst 60 minutter etter at arbeidet er avsluttet.**'
    },
    {
      id: 'hms-doc-5',
      title: 'Stillas, stiger og arbeid i høyden',
      category: 'equipment',
      version: '1.0',
      companyId: 'system',
      updatedAt: '2026-08-05T12:00:00.000Z',
      content: '# Stillas, Stiger og Arbeid i Høyden\n\nFall fra høyde er den vanligste årsaken til alvorlige ulykker i bygg- og anleggsbransjen.\n\n### Stillas:\n- Skal være montert av kvalifisert personell iht. Forskrift om utførelse av arbeid.\n- **Grønt stillasskilt** skal være utfylt og synlig ved adkomst før stillaset tas i bruk.\n- Rekkverk (topplist 1,0 m, mellomlist 0,5 m og fotlist 0,15 m) er obligatorisk på alle stillasgulv.\n\n### Stiger:\n- Stiger skal primært brukes som adkomstvei, aldri som permanent arbeidsplattform.\n- Ved lett arbeid fra stige skal stigen være sikret mot utglidning i topp og bunn, og stikke minst 1 meter over adkomstnivå.'
    }
  ],
  hms_signatures: [],
  crew: [],
  safety_inspections: []
};

let dbInitialized = false;

export async function initDb() {
  if (!pool) {
    ensureLocalStoreLoaded();
  }
  if (dbInitialized) return;
  if (!pool) {
    dbInitialized = true;
    return;
  }

  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'worker',
        trade VARCHAR(100),
        company VARCHAR(255),
        company_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'active',
        trial_start_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        project_code VARCHAR(100),
        description TEXT,
        location VARCHAR(255),
        progress INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        stage VARCHAR(50) DEFAULT 'active',
        documentation_level INTEGER DEFAULT 0,
        client_name VARCHAR(255),
        client_email VARCHAR(255),
        company_id VARCHAR(255),
        company_name VARCHAR(255),
        start_date TIMESTAMP,
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS deviations (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        severity VARCHAR(50) DEFAULT 'lav',
        status VARCHAR(50) DEFAULT 'åpen',
        project VARCHAR(255),
        project_id VARCHAR(255),
        photo_url TEXT,
        assigned_to VARCHAR(255),
        reported_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sja_reports (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        task TEXT,
        risikoer JSONB,
        utstyr JSONB,
        tek17_reference TEXT,
        weather_impact TEXT,
        status VARCHAR(50) DEFAULT 'godkjent',
        project_id VARCHAR(255),
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS items_store (
        id VARCHAR(255) PRIMARY KEY,
        collection_name VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_items_store_collection ON items_store (collection_name);
      CREATE INDEX IF NOT EXISTS idx_items_store_data ON items_store USING gin (data);
      CREATE TABLE IF NOT EXISTS ai_cache (
        hash VARCHAR(64) PRIMARY KEY,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        company_id VARCHAR(255),
        recipient VARCHAR(255) NOT NULL,
        template_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'sent',
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_email_logs_company ON email_logs (company_id);

      CREATE TABLE IF NOT EXISTS project_health_reports (
        id VARCHAR(255) PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL,
        company_id VARCHAR(255),
        score INTEGER,
        summary TEXT,
        risks JSONB,
        recommendations JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_health_reports_project ON project_health_reports (project_id);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS orgnr VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_days INT DEFAULT 14;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT FALSE;
    `);

    // SIKKERHETSFIKS (E-09): 'password = EXCLUDED.password' er fjernet. Uten den
    // beholder en eksisterende admin sitt passord ved omstart, i stedet for a bli
    // nullstilt til en verdi fra kildekoden.
    const seedAdmins = [
      { id: 'u-admin-123', email: DEFAULT_ADMIN_EMAIL, name: 'Ken (Admin)' },
      { id: 'u-admin-aichatnorge', email: 'aichatnorge@gmail.com', name: 'Kenneth Kristiansen' }
    ];

    for (const admin of seedAdmins) {
      await client.query(
        'INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status) ' +
          "VALUES ($1, $2, $3, $4, 'admin', 'Byggmester', 'AIChat Norge AS / Vikingnet', 'comp-001', 'active') " +
        'ON CONFLICT (email) DO NOTHING',
        [admin.id, admin.email, getAdminSeedHash(), admin.name]
      );
    }

    // SIKKERHETSFIKS (E-09), del 2 - roter en allerede kompromittert admin-hash.
    // Produksjonsdatabasen kan inneholde hashen av det gamle hardkodede passordet
    // fra for denne rettelsen. 'DO NOTHING' over lar den sta, sa vi ma rydde den
    // eksplisitt: hvis ADMIN_PASSWORD ikke er satt, og en admin-rad sin hash
    // matcher det gamle kjente passordet, erstattes den med et tilfeldig passord.
    // Da finnes ingen kjent legitimasjonsvei inn i en admin-konto.
    const adminPasswordConfigured = Boolean((process.env.ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || '').trim());
    if (!adminPasswordConfigured) {
      for (const admin of seedAdmins) {
        try {
          const existing = await client.query('SELECT password FROM users WHERE LOWER(email) = $1', [admin.email]);
          const row = existing.rows && existing.rows[0];
          if (row && row.password && bcrypt.compareSync('VikingMester2026!', row.password)) {
            await client.query('UPDATE users SET password = $1, updated_at = NOW() WHERE LOWER(email) = $2', [bcrypt.hashSync(randomBytes(32).toString('hex'), 10), admin.email]);
            console.error('[SECURITY] Admin-kontoen ' + admin.email + ' brukte det gamle hardkodede passordet. Passordet er na tilfeldig - sett ADMIN_PASSWORD og deploy pa nytt for a fa tilgang.');
          }
        } catch (rotateErr) {
          console.warn('Kunne ikke rotere admin-hash:', rotateErr);
        }
      }
    }

    client.release();
    dbInitialized = true;
  } catch (err) {
    console.warn('PostgreSQL initialization warning:', err);
  }
}

export async function dbQuery(sql: string, params: any[] = []): Promise<any[]> {
  await initDb();
  if (pool) {
    try {
      const res = await pool.query(sql, params);
      return res.rows;
    } catch (err) {
      console.warn('PG Query error:', err);
    }
  }
  return [];
}

export function isDbConnected(): boolean {
  return !!pool;
}

export async function getCollectionItems(collectionName: string): Promise<any[]> {
  await initDb();
  if (collectionName === 'users' && pool) {
    try {
      const rows = await dbQuery(
        'SELECT id, email, display_name as "displayName", role, trade, company, company_id as "companyId", subscription_status as "subscriptionStatus", created_at as "createdAt" FROM users ORDER BY created_at DESC'
      );
      if (rows && rows.length > 0) {
        return rows;
      }
    } catch (e) {
      console.warn('Error fetching users from users table, fallback to store:', e);
    }
  }

  if (pool) {
    try {
      if (collectionName === 'users') {
        const rows = await dbQuery('SELECT id, email, display_name, role, trade, company, company_id, subscription_status, created_at, updated_at FROM users ORDER BY created_at DESC');
        if (rows.length > 0) {
          return rows.map(r => ({
            id: r.id,
            uid: r.id,
            email: r.email,
            displayName: r.display_name || r.email.split('@')[0],
            role: r.role || 'worker',
            trade: r.trade || 'Tømrer',
            company: r.company || 'Mester Entreprenør AS',
            companyId: r.company_id || 'comp-001',
            subscriptionStatus: r.subscription_status || 'active',
            createdAt: r.created_at,
            updatedAt: r.updated_at
          }));
        }
      }

      if (collectionName === 'companies') {
        const rows = await dbQuery(
          'SELECT id, data FROM items_store WHERE collection_name = $1 ORDER BY created_at DESC',
          ['companies']
        );
        const existing: any[] = rows.map(r => ({ id: r.id, ...r.data }));

        try {
          const userRows = await dbQuery('SELECT DISTINCT company_id, company, orgnr, display_name, email, created_at FROM users WHERE company_id IS NOT NULL');
          for (const u of userRows) {
            const compId = u.company_id || 'comp-001';
            const compName = u.company || 'Mester Entreprenør AS';
            const emailLower = (u.email || '').toLowerCase();
            const nameLower = compName.toLowerCase();
            const isInternalAdmin = 
              emailLower === 'kenkri3@gmail.com' ||
              emailLower === 'aichatnorge@gmail.com' ||
              emailLower === 'kenneth@aichatnorge.no' ||
              emailLower === 'fredrik@aichatnorge.no' ||
              emailLower === 'fredrik.r.ellingsen@gmail.com' ||
              emailLower === 'admin@vikingmester.no' ||
              emailLower === 'post@vikingent.no' ||
              nameLower.includes('aichat norge') ||
              nameLower.includes('vikingnet') ||
              nameLower.includes('vikingmester');

            if (!existing.some(c => c.id === compId || c.name === compName)) {
              const synthCompany = {
                id: compId,
                name: compName,
                // SIKKERHETSFIKS (R-02): dette var en fallback til plattformens
                // gamle, ugyldige org.nr. En syntetisk bedriftsrad skal ikke
                // tilskrives en organisasjon den ikke er - bruk brukerens eget
                // nummer, eller ingenting.
                orgnr: u.orgnr || '',
                contactName: u.display_name || u.email,
                email: u.email,
                phone: '401 63 082',
                plan: isInternalAdmin ? 'internal' : 'enterprise',
                isInternal: isInternalAdmin,
                monthlyPrice: isInternalAdmin ? 0 : 6900,
                status: 'active',
                subscriptionStatus: 'active',
                modules: ['projects', 'checklists', 'deviations', 'ai', 'economy', 'fdv', 'inventory', 'vehicle', 'time', 'apprentice', 'building_app'],
                createdAt: u.created_at || new Date().toISOString()
              };
              existing.push(synthCompany);
              await dbQuery(
                `INSERT INTO items_store (id, collection_name, data) VALUES ($1, $2, $3)
                 ON CONFLICT (id) DO UPDATE SET data = $3`,
                [compId, 'companies', JSON.stringify(synthCompany)]
              ).catch(() => {});
            }
          }

          // Auto-heal internal admin companies in existing list
          for (let i = 0; i < existing.length; i++) {
            const c = existing[i];
            const nameLower = (c.name || '').toLowerCase();
            const emailLower = (c.email || '').toLowerCase();
            const isInternalAdmin = 
              c.isInternal === true ||
              c.plan === 'internal' ||
              c.plan === 'admin' ||
              nameLower.includes('aichat norge') ||
              nameLower.includes('vikingnet') ||
              nameLower.includes('vikingmester') ||
              emailLower === 'kenkri3@gmail.com' ||
              emailLower === 'aichatnorge@gmail.com' ||
              emailLower === 'kenneth@aichatnorge.no' ||
              emailLower === 'fredrik@aichatnorge.no' ||
              emailLower === 'fredrik.r.ellingsen@gmail.com' ||
              emailLower === 'admin@vikingmester.no' ||
              emailLower === 'post@vikingent.no';

            if (isInternalAdmin && (c.plan !== 'internal' || !c.isInternal || c.monthlyPrice !== 0)) {
              existing[i] = {
                ...c,
                plan: 'internal',
                isInternal: true,
                monthlyPrice: 0,
                status: 'active',
                subscriptionStatus: 'active'
              };
              await dbQuery(
                `UPDATE items_store SET data = $1 WHERE id = $2 AND collection_name = 'companies'`,
                [JSON.stringify(existing[i]), c.id]
              ).catch(() => {});
            }
          }
        } catch (uErr) {
          console.warn('Error syncing companies from users:', uErr);
        }

        if (existing.length > 0) {
          return existing;
        }
      }

      const rows = await dbQuery(
        'SELECT id, data FROM items_store WHERE collection_name = $1 ORDER BY created_at DESC',
        [collectionName]
      );
      if (rows.length > 0) {
        return rows.map(r => {
          let d = r.data || {};
          if (typeof d === 'string') {
            try { d = JSON.parse(d); } catch {}
          }
          // 🛡️ Auto-heal projects with missing or corrupted fields to prevent client-side render crashes
          if (collectionName === 'projects') {
            const isKongeveien = r.id.toLowerCase().includes('kongeveien') || 
                                 String(d.location || '').toLowerCase().includes('kongeveien') ||
                                 String(d.id || '').toLowerCase().includes('kongeveien');
            const healedName = d.name || (isKongeveien ? 'Totalrenovering Kongeveien 93A' : (d.location ? `Prosjekt ${d.location}` : `Prosjekt ${r.id}`));
            const healedLocation = d.location || (isKongeveien ? 'Kongeveien 93A, Horten' : 'Norge');
            const healedClient = d.clientName || 'Privatkunde';
            const healedProgress = typeof d.progress === 'number' ? d.progress : 15;
            
            // If data in DB was missing name, heal and persist it back asynchronously
            if (!d.name && pool) {
              const healedData = {
                ...d,
                id: r.id,
                name: healedName,
                location: healedLocation,
                clientName: healedClient,
                progress: healedProgress,
                status: d.status || 'active',
                stage: d.stage || 'active',
                companyId: d.companyId || 'comp-001',
                company: d.company || 'Mester Entreprenør AS',
                updatedAt: new Date().toISOString()
              };
              dbQuery(
                `UPDATE items_store SET data = $1 WHERE id = $2 AND collection_name = 'projects'`,
                [JSON.stringify(healedData), r.id]
              ).catch(() => {});
            }

            return {
              id: r.id,
              ...d,
              name: healedName,
              location: healedLocation,
              clientName: healedClient,
              progress: healedProgress,
              status: d.status || 'active',
              stage: d.stage || 'active',
              companyId: d.companyId || 'comp-001',
              company: d.company || 'Mester Entreprenør AS',
              lastUpdate: d.lastUpdate || d.updatedAt || new Date().toISOString()
            };
          }
          return { id: r.id, ...d };
        });
      }
    } catch (e) {
      console.warn('Error fetching collection from DB, fallback to memory:', e);
    }
  }
  // FIX (11.09.2026): Returner et ærlig tomt resultat når en database faktisk er tilkoblet.
  // Tidligere falt koden her tilbake til hardkodede eksempeldata (Nyebakken 14, Storgata 8,
  // Fjordveien 22, falske avvik/endringsordrer/agent-aktiviteter) hver gang en ekte samling var
  // tom – og disse ble deretter vist/rapportert som om de var ekte, gjeldende produksjonsdata
  // (dashboard, daglig KS/HMS-revisjon, /api/agent/dispatch). Eksempeldata skal kun brukes når
  // INGEN database i det hele tatt er konfigurert (lokal utvikling uten DATABASE_URL).
  if (!pool) {
    ensureLocalStoreLoaded();
  }
  return pool ? [] : (inMemoryStore[collectionName] || []);
}

export async function getCollectionItemById(collectionName: string, id: string): Promise<any | null> {
  await initDb();
  if (pool) {
    try {
      if (collectionName === 'users') {
        const users = await dbQuery(
          `SELECT id, email, password, display_name, role, trade, company, company_id, subscription_status, created_at, updated_at
           FROM users WHERE id = $1 OR LOWER(email) = LOWER($1) LIMIT 1`,
          [id]
        );
        if (users.length > 0) {
          const r = users[0];
          return {
            id: r.id,
            email: r.email,
            password: r.password,
            displayName: r.display_name || r.email.split('@')[0],
            role: r.role || 'worker',
            trade: r.trade || 'Tømrer',
            company: r.company || 'Mester Entreprenør AS',
            companyId: r.company_id || 'comp-001',
            subscriptionStatus: r.subscription_status || 'active',
            createdAt: r.created_at,
            updatedAt: r.updated_at
          };
        }
      }

      const rows = await dbQuery(
        'SELECT id, data FROM items_store WHERE collection_name = $1 AND id = $2 LIMIT 1',
        [collectionName, id]
      );
      if (rows.length > 0) {
        let d = rows[0].data || {};
        if (typeof d === 'string') {
          try { d = JSON.parse(d); } catch {}
        }
        return { id: rows[0].id, ...d };
      }
    } catch (e) {
      console.warn('Error fetching item by ID from DB, fallback to memory:', e);
    }
  }

  // FIX (11.09.2026): Se tilsvarende fiks i getCollectionItems() over – ikke server falske
  // eksempeldata når en database faktisk er tilkoblet, men fikk null/tomt treff.
  if (!pool) {
    ensureLocalStoreLoaded();
  }
  const items = pool ? [] : (inMemoryStore[collectionName] || []);
  return items.find((i: any) => i.id === id || (collectionName === 'users' && i.email?.toLowerCase() === id.toLowerCase())) || null;
}

export async function saveCollectionItem(collectionName: string, item: any): Promise<any> {
  await initDb();
  if (!pool) {
    ensureLocalStoreLoaded();
  }
  const id = item.id || 'item-' + Math.random().toString(36).substring(2, 9);
  const fullItem = { id, ...item, createdAt: item.createdAt || new Date().toISOString() };

  if (!inMemoryStore[collectionName]) inMemoryStore[collectionName] = [];
  const existingIdx = inMemoryStore[collectionName].findIndex(i => i.id === id);
  if (existingIdx !== -1) {
    inMemoryStore[collectionName][existingIdx] = { ...inMemoryStore[collectionName][existingIdx], ...fullItem };
  } else {
    inMemoryStore[collectionName].unshift(fullItem);
  }

  if (!pool) {
    persistLocalStore();
  }

  if (pool) {
    try {
      if (collectionName === 'users' && fullItem.email) {
        await dbQuery(`
          INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (email) DO UPDATE SET
            display_name = COALESCE(EXCLUDED.display_name, users.display_name),
            role = COALESCE(EXCLUDED.role, users.role),
            trade = COALESCE(EXCLUDED.trade, users.trade),
            company = COALESCE(EXCLUDED.company, users.company),
            company_id = COALESCE(EXCLUDED.company_id, users.company_id),
            subscription_status = COALESCE(EXCLUDED.subscription_status, users.subscription_status),
            updated_at = CURRENT_TIMESTAMP
        `, [
          fullItem.id,
          fullItem.email.toLowerCase().trim(),
          fullItem.password || getAdminSeedHash(),
          fullItem.displayName || fullItem.name || fullItem.email.split('@')[0],
          fullItem.role || 'worker',
          fullItem.trade || 'Tømrer',
          fullItem.company || 'Mester Entreprenør AS',
          fullItem.companyId || 'comp-001',
          fullItem.subscriptionStatus || 'active'
        ]);
      }

      await dbQuery(
        `INSERT INTO items_store (id, collection_name, data) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET data = $3`,
        [id, collectionName, JSON.stringify(fullItem)]
      );
    } catch (e) {
      console.warn('Store save error:', e);
    }
  }

  return fullItem;
}

export async function updateCollectionItem(collectionName: string, id: string, data: any): Promise<any> {
  await initDb();
  if (!pool) {
    ensureLocalStoreLoaded();
  }

  // 🛡️ Load existing item from DB or in-memory store so no fields are lost
  let existingItem: any = null;
  if (pool) {
    try {
      const existingRows = await dbQuery(
        'SELECT data FROM items_store WHERE collection_name = $1 AND id = $2 LIMIT 1',
        [collectionName, id]
      );
      if (existingRows.length > 0) {
        let raw = existingRows[0].data;
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch {}
        }
        existingItem = raw;
      }
    } catch (err) {
      console.warn('Could not read existing item from items_store before update:', err);
    }
  }

  if (!inMemoryStore[collectionName]) inMemoryStore[collectionName] = [];
  const idx = inMemoryStore[collectionName].findIndex(i => i.id === id);
  if (idx !== -1 && !existingItem) {
    existingItem = inMemoryStore[collectionName][idx];
  }

  // Preserve all existing fields and overwrite only the provided fields
  const updatedItem = {
    ...(existingItem || {}),
    ...data,
    id,
    updatedAt: new Date().toISOString()
  };

  // If this is a project and name was somehow missing, ensure it has a valid title
  if (collectionName === 'projects' && !updatedItem.name) {
    const isKongeveien = id.toLowerCase().includes('kongeveien') || String(updatedItem.location || '').toLowerCase().includes('kongeveien');
    updatedItem.name = isKongeveien ? 'Totalrenovering Kongeveien 93A' : (updatedItem.location ? `Prosjekt ${updatedItem.location}` : `Prosjekt ${id}`);
    updatedItem.location = updatedItem.location || (isKongeveien ? 'Kongeveien 93A, Horten' : 'Norge');
    updatedItem.clientName = updatedItem.clientName || 'Privatkunde';
  }

  if (idx !== -1) {
    inMemoryStore[collectionName][idx] = updatedItem;
  } else {
    inMemoryStore[collectionName].unshift(updatedItem);
  }

  if (!pool) {
    persistLocalStore();
  }

  if (pool) {
    try {
      if (collectionName === 'users') {
        await dbQuery(`
          UPDATE users SET
            display_name = COALESCE($2, display_name),
            role = COALESCE($3, role),
            trade = COALESCE($4, trade),
            company = COALESCE($5, company),
            company_id = COALESCE($6, company_id),
            subscription_status = COALESCE($7, subscription_status),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 OR LOWER(email) = LOWER($1)
        `, [
          id,
          data.displayName || data.name || null,
          data.role || null,
          data.trade || null,
          data.company || null,
          data.companyId || null,
          data.subscriptionStatus || null
        ]);
      }

      await dbQuery(
        `INSERT INTO items_store (id, collection_name, data) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET data = $3`,
        [id, collectionName, JSON.stringify(updatedItem)]
      );

      // Also keep users table updated if updating user collection
      if (collectionName === 'users') {
        await dbQuery(
          `UPDATE users SET 
             display_name = COALESCE($2, display_name),
             role = COALESCE($3, role),
             trade = COALESCE($4, trade),
             company = COALESCE($5, company),
             company_id = COALESCE($6, company_id),
             subscription_status = COALESCE($7, subscription_status),
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id, data.displayName || null, data.role || null, data.trade || null, data.company || null, data.companyId || null, data.subscriptionStatus || null]
        ).catch(() => {});
      }
    } catch (e) {
      console.warn('Store update error:', e);
    }
  }

  return updatedItem;
}

export async function deleteCollectionItem(collectionName: string, id: string): Promise<boolean> {
  await initDb();
  if (inMemoryStore[collectionName]) {
    inMemoryStore[collectionName] = inMemoryStore[collectionName].filter(i => i.id !== id);
  }
  if (!pool) {
    persistLocalStore();
  }

  if (pool) {
    try {
      if (collectionName === 'users') {
        await dbQuery('DELETE FROM users WHERE id = $1 OR LOWER(email) = LOWER($1)', [id]);
      }
      await dbQuery('DELETE FROM items_store WHERE id = $1 AND collection_name = $2', [id, collectionName]);
    } catch (e) {
      console.warn('Store delete error:', e);
    }
  }

  return true;
}
