import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;

// 🛡️ SECURITY FIX: Replaced hardcoded fallback password with a dynamically generated one.
// Hardcoded passwords in source code allow attackers to access the default admin account if the environment variable is missing.
export const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'kenkri3@gmail.com').toLowerCase();
export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || randomBytes(16).toString('hex');
export const DEFAULT_ADMIN_HASH = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);

let pool: Pool | null = null;
if (DATABASE_URL) {
  const isInternal = 
    DATABASE_URL.includes('.railway.internal') || 
    DATABASE_URL.includes('localhost') || 
    DATABASE_URL.includes('127.0.0.1');

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isInternal ? false : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false)
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
    }
  ],
  projects: [
    {
      id: 'proj-101',
      name: 'Nyebakken 14 - Totalrenovering',
      projectCode: 'P-2026-01',
      description: 'Totalrenovering av einebustad inkludert bad og nytt tak.',
      location: 'Oslo, Nyebakken 14',
      progress: 65,
      status: 'active',
      stage: 'active',
      documentationLevel: 80,
      clientName: 'Ole Nordmann',
      clientEmail: 'ole@nordmann.no',
      company: 'Mester Entreprenør AS',
      companyId: 'comp-001',
      companyName: 'Mester Entreprenør AS',
      startDate: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ],
  deviations: [],
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
    `);

    await client.query(`
      INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'admin', display_name = EXCLUDED.display_name
    `, [
      'u-admin-123',
      DEFAULT_ADMIN_EMAIL,
      DEFAULT_ADMIN_HASH,
      'Ken (Admin)',
      'admin',
      'Byggmester',
      'Mester Entreprenør AS',
      'comp-001',
      'active'
    ]);

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
      await dbQuery('DELETE FROM items_store WHERE id = $1 AND collection_name = $2', [id, collectionName]);
    } catch (e) {
      console.warn('Store delete error:', e);
    }
  }

  return true;
}
