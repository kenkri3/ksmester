import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;

// 🛡️ SECURITY FIX: Replaced hardcoded fallback password with a dynamically generated one.
// Hardcoded passwords in source code allow attackers to access the default admin account if the environment variable is missing.
export const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'kenkri3@gmail.com').toLowerCase();
export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || randomBytes(16).toString('hex');
export const DEFAULT_ADMIN_HASH = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);

export const ADMIN_EMAILS = [
  'kenkri3@gmail.com',
  'aichatnorge@gmail.com',
  'kenneth@aichatnorge.no',
  'fredrik.r.ellingsen@gmail.com',
  'fredrik@aichatnorge.no',
  'lars@nonfoodgroup.no'
];
export const INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || 'VikingMester2026!';
export const INITIAL_ADMIN_HASH = bcrypt.hashSync(INITIAL_ADMIN_PASSWORD, 10);

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
}

export const inMemoryStore: Record<string, any[]> = {
  users: [
    {
      id: 'u-admin-123',
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_HASH,
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
      password: INITIAL_ADMIN_HASH,
      displayName: 'Kenneth Kristiansen',
      role: 'admin',
      trade: 'Byggmester',
      company: 'AIChat Norge AS / Vikingnet',
      companyId: 'comp-001',
      subscriptionStatus: 'active',
      createdAt: new Date().toISOString()
    }
  ],
  projects: [
    {
      id: 'proj-101',
      name: 'Nyebakken 14 - Totalrenovering',
      projectCode: 'P-2026-01',
      description: 'Totalrenovering av einebustad inkludert bad, kjøkken og nytt tak.',
      location: 'Oslo, Nyebakken 14',
      progress: 65,
      status: 'active',
      stage: 'active',
      documentationLevel: 85,
      clientName: 'Ole Nordmann',
      clientEmail: 'ole@nordmann.no',
      clientPhone: '912 34 567',
      company: 'Mester Entreprenør AS',
      companyId: 'comp-001',
      companyName: 'Mester Entreprenør AS',
      projectManager: 'Ken (Byggmester)',
      startDate: '2026-08-01T08:00:00.000Z',
      lastUpdate: new Date().toISOString(),
      createdAt: '2026-08-01T08:00:00.000Z'
    },
    {
      id: 'proj-102',
      name: 'Storgata 8 - Våtrom & Bad',
      projectCode: 'P-2026-02',
      description: 'Rehabilitering av 2 bad iht. Våtromsnormen BVN 31.205 og TEK17.',
      location: 'Bærum, Storgata 8',
      progress: 40,
      status: 'active',
      stage: 'active',
      documentationLevel: 75,
      clientName: 'Kari Hansen',
      clientEmail: 'kari@hansen.no',
      clientPhone: '987 65 432',
      company: 'Mester Entreprenør AS',
      companyId: 'comp-001',
      companyName: 'Mester Entreprenør AS',
      projectManager: 'Ken (Byggmester)',
      startDate: '2026-08-15T08:00:00.000Z',
      lastUpdate: new Date().toISOString(),
      createdAt: '2026-08-15T08:00:00.000Z'
    },
    {
      id: 'proj-103',
      name: 'Fjordveien 22 - Tilbygg & Fasade',
      projectCode: 'P-2026-03',
      description: 'Oppføring av tilbygg 45 kvm med integrert garasje og etterisolering.',
      location: 'Asker, Fjordveien 22',
      progress: 85,
      status: 'active',
      stage: 'active',
      documentationLevel: 95,
      clientName: 'Per Fjord',
      clientEmail: 'per@fjord.no',
      clientPhone: '412 99 888',
      company: 'Mester Entreprenør AS',
      companyId: 'comp-001',
      companyName: 'Mester Entreprenør AS',
      projectManager: 'Ken (Byggmester)',
      startDate: '2026-07-01T08:00:00.000Z',
      lastUpdate: new Date().toISOString(),
      createdAt: '2026-07-01T08:00:00.000Z'
    }
  ],
  deviations: [
    {
      id: 'dev-1',
      title: 'Mangler trykktestrapport for rør-i-rør fordelerskap',
      description: 'Rørlegger har ikke dokumentert trykkprøving før tømrer kan lukke sjakt på Bad 2. etg. Tverrfaglig lukkesperre aktivert.',
      severity: 'kritisk',
      status: 'åpen',
      project: 'Storgata 8 - Våtrom & Bad',
      projectId: 'proj-102',
      location: 'Bad 2. etg sjakt',
      assignedTo: 'Rørlegger AS',
      reportedBy: 'VikingMester AI Vision',
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    },
    {
      id: 'dev-2',
      title: 'Støvflukt ved kapping av gipsplater',
      description: 'Arbeid utført uten tilkoblet punktsug. Rettet opp med montering av hepa-støvsuger.',
      severity: 'lav',
      status: 'lukket',
      project: 'Nyebakken 14 - Totalrenovering',
      projectId: 'proj-101',
      location: 'Stue 1. etg',
      assignedTo: 'Lars (Tømrer)',
      reportedBy: 'Ken (Admin)',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    }
  ],
  change_orders: [
    {
      id: 'co-101',
      projectId: 'proj-101',
      projectName: 'Nyebakken 14 - Totalrenovering',
      changeNumber: 1,
      title: '6 ekstra downlights og skjult trekkerør i stue',
      description: 'Kunde ønsker 6 stk ekstra LED downlights med dagslysstyring og DALI-dimming, samt skjult trekkerør til TV-vegg.',
      cause: 'kundetillegg',
      amountExVat: 14500,
      vatAmount: 3625,
      totalAmount: 18125,
      impactDays: 2,
      legalHjemmel: 'NS 8406 pkt. 19.2 (Krav om justering av vederlag og fristforlengelse)',
      status: 'pending_approval',
      clientName: 'Ole Nordmann',
      clientEmail: 'ole@nordmann.no',
      authorId: 'u-admin-123',
      authorName: 'Lars (Tømrer/Elektro)',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    },
    {
      id: 'co-102',
      projectId: 'proj-102',
      projectName: 'Storgata 8 - Våtrom & Bad',
      changeNumber: 1,
      title: 'Uforutsett råte i bjelkelag under gammelt sluk',
      description: 'Ved riving av eksisterende støp ble det avdekket råteskader i 2 stk bærebjelker. Krever laske-forsterkning og soppsanering før oppbygging.',
      cause: 'uforutsett_forhold',
      amountExVat: 28000,
      vatAmount: 7000,
      totalAmount: 35000,
      impactDays: 4,
      legalHjemmel: 'NS 8406 pkt. 19.3 / Håndverkertjenesteloven § 9',
      status: 'pending_approval',
      clientName: 'Kari Hansen',
      clientEmail: 'kari@hansen.no',
      authorId: 'u-admin-123',
      authorName: 'Marius (Rørlegger)',
      createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString()
    },
    {
      id: 'co-103',
      projectId: 'proj-103',
      projectName: 'Fjordveien 22 - Tilbygg & Fasade',
      changeNumber: 1,
      title: 'Oppgradering til royalimpregnert kledning på fasade',
      description: 'Endring fra standard gran til MøreRoyal dobbelfals rettkant.',
      cause: 'kundetillegg',
      amountExVat: 42000,
      vatAmount: 10500,
      totalAmount: 52500,
      impactDays: 0,
      legalHjemmel: 'NS 8406 pkt. 19.2',
      status: 'approved_by_admin',
      clientName: 'Per Fjord',
      clientEmail: 'per@fjord.no',
      authorId: 'u-admin-123',
      authorName: 'Ken (Admin)',
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    }
  ],
  agent_activities: [
    {
      id: 'act-1',
      type: 'daily_log',
      title: 'Byggedagbok ført autonomt fra tale',
      description: 'Tolket stemmenotat fra Lars (Tømrer): Lekting og vindsperre ferdigstilt på Nyebakken 14 (6 timer). Værdata automatisk innhentet fra Yr.no (14°C, 3 m/s).',
      trade: 'carpenter',
      tradeName: 'Tømrer',
      status: 'verified',
      badge: 'Yr.no synkronisert',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
    },
    {
      id: 'act-2',
      type: 'change_order',
      title: 'Tale-til-Endringsordre generert (NS 8406)',
      description: 'Uvarslet ekstraarbeid registrert: 6 ekstra downlights og trekkerør i stue (kr 14 500,- eks mva). Ligger i godkjenningskø for admin.',
      trade: 'electrician',
      tradeName: 'Elektriker',
      status: 'pending_approval',
      badge: 'NS 8406 pkt. 19.2',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    },
    {
      id: 'act-3',
      type: 'tek17_vision',
      title: 'TEK17 Bildeanalyse av sluk godkjent',
      description: 'Foto av slukmansjett og klemring på Bad 2. etg analysert mot BVN 31.205. Tilstrekkelig klemavstand og jevn membranovergang verifisert.',
      trade: 'plumber',
      tradeName: 'Rørlegger',
      status: 'approved',
      badge: 'BVN 31.205',
      createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString()
    },
    {
      id: 'act-4',
      type: 'pre_close_check',
      title: 'Tverrfaglig lukkesperre aktivert for Vaskerom',
      description: 'Vegg i Vaskerom rødmerket: Rørlegger må fullføre trykktesting av rør-i-rør fordelerskap før tømrer kan lukke veggen.',
      trade: 'general',
      tradeName: 'Byggeleder',
      status: 'blocked',
      badge: 'Lukkesperre RØD',
      createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString()
    }
  ],
  sja_reports: [],
  offers: [],
  contracts: [],
  notifications: [],
  materials: [],
  time_registrations: [],
  vehicles: [],
  invites: [],
  activity_logs: [],
  checklists: [],
  documents: []
};

let dbInitialized = false;

export async function initDb() {
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

      ALTER TABLE users ADD COLUMN IF NOT EXISTS orgnr VARCHAR(50);
    `);

    const seedAdmins = [
      { id: 'u-admin-123', email: DEFAULT_ADMIN_EMAIL, name: 'Ken (Admin)' },
      { id: 'u-admin-aichatnorge', email: 'aichatnorge@gmail.com', name: 'Kenneth Kristiansen' }
    ];

    for (const admin of seedAdmins) {
      await client.query(`
        INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status)
        VALUES ($1, $2, $3, $4, 'admin', 'Byggmester', 'AIChat Norge AS / Vikingnet', 'comp-001', 'active')
        ON CONFLICT (email) DO UPDATE SET role = 'admin', subscription_status = 'active', display_name = EXCLUDED.display_name
      `, [admin.id, admin.email, INITIAL_ADMIN_HASH, admin.name]);
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

      const rows = await dbQuery(
        'SELECT id, data FROM items_store WHERE collection_name = $1 ORDER BY created_at DESC',
        [collectionName]
      );
      if (rows.length > 0) {
        return rows.map(r => ({ id: r.id, ...r.data }));
      }
    } catch (e) {
      console.warn('Error fetching collection from DB, fallback to memory:', e);
    }
  }
  return inMemoryStore[collectionName] || [];
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
        return { id: rows[0].id, ...rows[0].data };
      }
    } catch (e) {
      console.warn('Error fetching item by ID from DB, fallback to memory:', e);
    }
  }

  const items = inMemoryStore[collectionName] || [];
  return items.find((i: any) => i.id === id || (collectionName === 'users' && i.email?.toLowerCase() === id.toLowerCase())) || null;
}

export async function saveCollectionItem(collectionName: string, item: any): Promise<any> {
  await initDb();
  const id = item.id || 'item-' + Math.random().toString(36).substring(2, 9);
  const fullItem = { id, ...item, createdAt: item.createdAt || new Date().toISOString() };

  if (!inMemoryStore[collectionName]) inMemoryStore[collectionName] = [];
  const existingIdx = inMemoryStore[collectionName].findIndex(i => i.id === id);
  if (existingIdx !== -1) {
    inMemoryStore[collectionName][existingIdx] = { ...inMemoryStore[collectionName][existingIdx], ...fullItem };
  } else {
    inMemoryStore[collectionName].unshift(fullItem);
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
          fullItem.password || DEFAULT_ADMIN_HASH,
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
  if (!inMemoryStore[collectionName]) inMemoryStore[collectionName] = [];
  const idx = inMemoryStore[collectionName].findIndex(i => i.id === id);
  let updatedItem = { id, ...data, updatedAt: new Date().toISOString() };

  if (idx !== -1) {
    inMemoryStore[collectionName][idx] = { ...inMemoryStore[collectionName][idx], ...updatedItem };
    updatedItem = inMemoryStore[collectionName][idx];
  } else {
    inMemoryStore[collectionName].unshift(updatedItem);
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
