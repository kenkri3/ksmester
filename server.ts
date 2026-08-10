import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import jwtPkg from "jsonwebtoken";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const { sign, verify } = jwtPkg;

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || "bygg-master-render-secret-key-2026";
const DATABASE_URL = process.env.DATABASE_URL;

const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "kenkri3@gmail.com").toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin2026!Secure";
const DEFAULT_ADMIN_HASH = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);

// Initialize PostgreSQL Pool if DATABASE_URL is available
let pool: Pool | null = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });
}

// In-Memory Fallback Storage (if PostgreSQL DB is not yet attached)
const inMemoryStore: Record<string, any[]> = {
  users: [
    {
      id: "u-admin-123",
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_HASH,
      displayName: "Ken (Admin)",
      role: "admin",
      trade: "Byggmester",
      company: "Mester Entreprenør AS",
      companyId: "comp-001",
      subscriptionStatus: "active",
      createdAt: new Date().toISOString()
    }
  ],
  projects: [
    {
      id: "proj-101",
      name: "Nyebakken 14 - Totalrenovering",
      projectCode: "P-2026-01",
      description: "Totalrenovering av einebustad inkludert bad og nytt tak.",
      location: "Oslo, Nyebakken 14",
      progress: 65,
      status: "active",
      stage: "active",
      documentationLevel: 80,
      clientName: "Ole Nordmann",
      clientEmail: "ole@nordmann.no",
      companyId: "comp-001",
      companyName: "Mester Entreprenør AS",
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

// Database Initialization Helper
async function initDb() {
  if (!pool) {
    console.log("PostgreSQL DATABASE_URL not set. Running in resilient memory mode.");
    return;
  }
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL database on Render!");

    // Create Tables if not exist
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

    // Seed initial admin user if not exists or update password if changed in env vars
    await client.query(`
      INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'admin', display_name = EXCLUDED.display_name
    `, [
      "u-admin-123",
      DEFAULT_ADMIN_EMAIL,
      DEFAULT_ADMIN_HASH,
      "Ken (Admin)",
      "admin",
      "Byggmester",
      "Mester Entreprenør AS",
      "comp-001",
      "active"
    ]);

    client.release();
    console.log("PostgreSQL database tables initialized successfully.");
  } catch (err) {
    console.warn("PostgreSQL initialization warning:", err);
  }
}

// Auth Middleware
export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    // Guest or anonymous proceed with demo access
    return next();
  }

  try {
    const decoded = verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// Database Query Abstraction
async function dbQuery(sql: string, params: any[] = []): Promise<any[]> {
  if (pool) {
    try {
      const res = await pool.query(sql, params);
      return res.rows;
    } catch (err) {
      console.warn("PG Query failed, falling back to memory store:", err);
    }
  }
  return [];
}

// Start Express Server
async function startServer() {
  await initDb();

  const app = express();

  app.use(cors({
    origin: process.env.APP_URL || "http://localhost:3000",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json({ limit: "20mb" }));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // --- HEALTH CHECK ---
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      database: pool ? "postgresql" : "in-memory",
      renderReady: true,
      nobbConfigured: !!process.env.NOBB_API_KEY,
      firecrawlConfigured: !!process.env.FIRECRAWL_API_KEY
    });
  });

  // --- AUTH ENDPOINTS ---

  // POST /api/auth/register
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name, company, role, trade } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-post og passord påkrevd." });
    }

    try {
      // Check existing
      let existingUser: any = null;
      if (pool) {
        const rows = await dbQuery("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
        existingUser = rows[0];
      } else {
        existingUser = inMemoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      }

      if (existingUser) {
        return res.status(400).json({ error: "En bruker med denne e-posten finnes allerede." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = "u-" + Math.random().toString(36).substring(2, 9);
      const userObj = {
        id: userId,
        email: email.toLowerCase(),
        displayName: name || email.split("@")[0],
        role: role || (email.toLowerCase() === "kenkri3@gmail.com" ? "admin" : "worker"),
        trade: trade || "Tømrer",
        company: company || "Mester Entreprenør AS",
        companyId: "comp-001",
        subscriptionStatus: "active",
        createdAt: new Date().toISOString()
      };

      if (pool) {
        await dbQuery(
          `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [userObj.id, userObj.email, hashedPassword, userObj.displayName, userObj.role, userObj.trade, userObj.company, userObj.companyId, userObj.subscriptionStatus]
        );
      } else {
        inMemoryStore.users.push({ ...userObj, password: hashedPassword });
      }

      const token = sign({ id: userObj.id, email: userObj.email, role: userObj.role }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: userObj });
    } catch (err: any) {
      console.error("Register Error:", err);
      res.status(500).json({ error: "Kunne ikke registrere bruker." });
    }
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    const identifier = (req.body.email || req.body.username || "").toLowerCase().trim();
    const password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Både e-post/brukernavn og passord må fylles ut." });
    }

    try {
      // 1. Direct match against configured ADMIN credentials (ENV variables)
      const isAdminIdentifier = 
        identifier === DEFAULT_ADMIN_EMAIL.toLowerCase() || 
        identifier === "admin" || 
        identifier === "administrator" ||
        identifier === "kenkri3@gmail.com";

      const isAdminPasswordValid = 
        password === DEFAULT_ADMIN_PASSWORD || 
        (await bcrypt.compare(password, DEFAULT_ADMIN_HASH).catch(() => false));

      if (isAdminIdentifier && isAdminPasswordValid) {
        const adminObj = {
          id: "u-admin-123",
          uid: "u-admin-123",
          email: DEFAULT_ADMIN_EMAIL,
          displayName: "Ken (Admin)",
          role: "admin",
          trade: "Byggmester",
          company: "Mester Entreprenør AS",
          companyId: "comp-001",
          subscriptionStatus: "active"
        };

        if (pool) {
          dbQuery(`
            INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'admin'
          `, [adminObj.id, adminObj.email, DEFAULT_ADMIN_HASH, adminObj.displayName, adminObj.role, adminObj.trade, adminObj.company, adminObj.companyId, adminObj.subscriptionStatus]).catch(() => {});
        }

        const token = sign({ id: adminObj.id, email: adminObj.email, role: adminObj.role }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({ token, user: adminObj });
      }

      // 2. Otherwise search DB / memory store for registered users
      let userRecord: any = null;
      if (pool) {
        const rows = await dbQuery(
          "SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(id) = $1 OR LOWER(display_name) = $1",
          [identifier]
        );
        userRecord = rows[0];
      } else {
        userRecord = inMemoryStore.users.find(u => 
          u.email.toLowerCase() === identifier || 
          (u.id && u.id.toLowerCase() === identifier) ||
          (u.displayName && u.displayName.toLowerCase() === identifier)
        );
      }

      if (!userRecord) {
        return res.status(401).json({ error: "Ugyldig e-post/brukernavn eller passord." });
      }

      // Validate password strictly using bcrypt hash
      const passwordValid = await bcrypt.compare(password, userRecord.password).catch(() => false);

      if (!passwordValid) {
        return res.status(401).json({ error: "Ugyldig e-post/brukernavn eller passord." });
      }

      const userObj = {
        id: userRecord.id,
        uid: userRecord.id,
        email: userRecord.email,
        displayName: userRecord.display_name || userRecord.displayName || userRecord.email.split("@")[0],
        role: userRecord.role || "worker",
        trade: userRecord.trade || "Tømrer",
        company: userRecord.company || "Mester Entreprenør AS",
        companyId: userRecord.company_id || userRecord.companyId || "comp-001",
        subscriptionStatus: userRecord.subscription_status || userRecord.subscriptionStatus || "active"
      };

      const token = sign({ id: userObj.id, email: userObj.email, role: userObj.role }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: userObj });
    } catch (err: any) {
      console.error("Login Error:", err);
      res.status(500).json({ error: "Kunne ikke logge inn." });
    }
  });

  // GET /api/auth/me
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let userRecord: any = null;
    if (pool) {
      const rows = await dbQuery("SELECT * FROM users WHERE id = $1 OR email = $2", [req.user.id, req.user.email]);
      userRecord = rows[0];
    } else {
      userRecord = inMemoryStore.users.find(u => u.id === req.user?.id || u.email === req.user?.email);
    }

    if (!userRecord) {
      return res.status(404).json({ error: "User not found" });
    }

    const userObj = {
      id: userRecord.id,
      uid: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name || userRecord.displayName,
      role: userRecord.role,
      trade: userRecord.trade,
      company: userRecord.company,
      companyId: userRecord.company_id || userRecord.companyId,
      subscriptionStatus: userRecord.subscription_status || userRecord.subscriptionStatus
    };

    res.json({ user: userObj });
  });

  // --- GENERIC COLLECTION API (REPLACES FIRESTORE) ---

  // GET /api/data/:collection
  app.get("/api/data/:collection", async (req, res) => {
    const colName = req.params.collection;

    if (pool) {
      try {
        const rows = await dbQuery("SELECT id, data FROM items_store WHERE collection_name = $1 ORDER BY created_at DESC", [colName]);
        if (rows.length > 0) {
          return res.json(rows.map(r => ({ id: r.id, ...r.data })));
        }
      } catch (e) {
        // Fallback below
      }
    }

    const items = inMemoryStore[colName] || [];
    res.json(items);
  });

  // POST /api/data/:collection
  app.post("/api/data/:collection", async (req, res) => {
    const colName = req.params.collection;
    const body = req.body;
    const id = body.id || "item-" + Math.random().toString(36).substring(2, 9);
    const item = { id, ...body, createdAt: new Date().toISOString() };

    if (!inMemoryStore[colName]) inMemoryStore[colName] = [];
    inMemoryStore[colName].unshift(item);

    if (pool) {
      try {
        await dbQuery(
          `INSERT INTO items_store (id, collection_name, data) VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET data = $3`,
          [id, colName, JSON.stringify(item)]
        );
      } catch (e) {
        console.warn("Store save warning:", e);
      }
    }

    res.json(item);
  });

  // PUT /api/data/:collection/:id
  app.put("/api/data/:collection/:id", async (req, res) => {
    const { collection: colName, id } = req.params;
    const body = req.body;

    if (!inMemoryStore[colName]) inMemoryStore[colName] = [];
    const idx = inMemoryStore[colName].findIndex(i => i.id === id);
    let updatedItem = { id, ...body, updatedAt: new Date().toISOString() };

    if (idx !== -1) {
      inMemoryStore[colName][idx] = { ...inMemoryStore[colName][idx], ...updatedItem };
      updatedItem = inMemoryStore[colName][idx];
    } else {
      inMemoryStore[colName].unshift(updatedItem);
    }

    if (pool) {
      try {
        await dbQuery(
          `INSERT INTO items_store (id, collection_name, data) VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET data = $3`,
          [id, colName, JSON.stringify(updatedItem)]
        );
      } catch (e) {
        console.warn("Store update warning:", e);
      }
    }

    res.json(updatedItem);
  });

  // DELETE /api/data/:collection/:id
  app.delete("/api/data/:collection/:id", async (req, res) => {
    const { collection: colName, id } = req.params;

    if (inMemoryStore[colName]) {
      inMemoryStore[colName] = inMemoryStore[colName].filter(i => i.id !== id);
    }

    if (pool) {
      try {
        await dbQuery("DELETE FROM items_store WHERE id = $1 AND collection_name = $2", [id, colName]);
      } catch (e) {
        console.warn("Store delete warning:", e);
      }
    }

    res.json({ success: true, id });
  });

  // --- INTEGRATION PROXIES (NOBB & FIRECRAWL) ---

  app.get("/api/nobb/search", async (req, res) => {
    const { q } = req.query;
    const apiKey = process.env.NOBB_API_KEY;
    if (!apiKey) return res.status(403).json({ error: "NOBB API-nøkkel ikke konfigurert" });

    try {
      const response = await fetch(`https://export.byggtjeneste.no/api/v1/items?q=${encodeURIComponent(q as string)}`, {
        headers: { "Ocp-Apim-Subscription-Key": apiKey, Accept: "application/json" }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Kunne ikke søke i NOBB" });
    }
  });

  app.get("/api/nobb/item/:id", async (req, res) => {
    const { id } = req.params;
    const apiKey = process.env.NOBB_API_KEY;
    if (!apiKey) return res.status(403).json({ error: "NOBB API-nøkkel ikke konfigurert" });

    try {
      const response = await fetch(`https://export.byggtjeneste.no/api/v1/items/${id}`, {
        headers: { "Ocp-Apim-Subscription-Key": apiKey, Accept: "application/json" }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Kunne ikke hente NOBB-vare" });
    }
  });

  app.post("/api/scrape", async (req, res) => {
    const { url } = req.body;
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) return res.status(403).json({ error: "Firecrawl API-nøkkel ikke konfigurert" });

    try {
      const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url, formats: ["markdown"] })
      });

      if (!scrapeResponse.ok) throw new Error("Firecrawl feilet");
      const scrapeData = await scrapeResponse.json();
      const markdown = scrapeData.data.markdown;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Ekstraher produktinformasjon fra følgende markdown: ${markdown}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nobbNumber: { type: Type.STRING },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              gtin: { type: Type.STRING },
              supplier: { type: Type.STRING },
              category: { type: Type.STRING },
              fdvUrl: { type: Type.STRING },
              imageUrl: { type: Type.STRING }
            },
            required: ["name", "supplier"]
          }
        }
      });

      res.json(JSON.parse(aiResponse.text || "{}"));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Kunne ikke skrape nettside" });
    }
  });

  // --- CENTRALIZED SERVER-SIDE AI API (GEMINI) ---
  app.post("/api/ai/generate", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY er ikke konfigurert på serveren." });
    }

    try {
      let { prompt, contents, model = "gemini-2.5-flash", systemInstruction, responseMimeType, responseSchema, images, inlineData } = req.body;

      if (inlineData && (!images || images.length === 0)) {
        images = [{ inlineData }];
      }

      let finalContents: any = prompt || contents || "";

      if (images && Array.isArray(images) && images.length > 0) {
        const parts: any[] = [];
        if (typeof prompt === "string" && prompt) {
          parts.push({ text: prompt });
        }
        for (const img of images) {
          if (img.inlineData) {
            parts.push(img);
          } else if (typeof img === "string" && img.startsWith("data:")) {
            const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              parts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2]
                }
              });
            }
          }
        }
        finalContents = parts;
      }

      const config: any = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (responseMimeType) config.responseMimeType = responseMimeType;
      if (responseSchema) config.responseSchema = responseSchema;

      const aiResponse = await ai.models.generateContent({
        model: model || "gemini-2.5-flash",
        contents: finalContents,
        config: Object.keys(config).length > 0 ? config : undefined
      });

      res.json({ text: aiResponse.text || "" });
    } catch (error: any) {
      console.error("Server AI Generation error:", error);
      res.status(500).json({ error: error.message || "AI-generering feilet på serveren" });
    }
  });

  // --- VITE / STATIC SERVING FOR RENDER & PREVIEW ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT} (0.0.0.0)`);
  });
}

startServer();
