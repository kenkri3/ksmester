import { createHash } from 'crypto';
import { dbQuery, isDbConnected } from './db';

interface CacheEntry {
  text: string;
  createdAt: number;
  model: string;
  hits: number;
}

// Fast in-memory cache for warm process requests
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let totalTokenSavings = 0;

export function hashAiRequest(prompt: string, systemInstruction?: string, model: string = 'deepseek-chat'): string {
  const content = `${model}:::${systemInstruction || ''}:::${prompt.trim().toLowerCase()}`;
  return createHash('sha256').update(content).digest('hex');
}

export async function getCachedAiResponse(hash: string): Promise<string | null> {
  const now = Date.now();

  // 1. Check in-memory cache first
  const entry = memoryCache.get(hash);
  if (entry) {
    if (now - entry.createdAt < CACHE_TTL_MS) {
      entry.hits += 1;
      totalTokenSavings += Math.round(entry.text.length / 4);
      return entry.text;
    } else {
      memoryCache.delete(hash);
    }
  }

  // 2. Check PostgreSQL cache if connected
  if (isDbConnected()) {
    try {
      const rows = await dbQuery(
        `SELECT data FROM items_store WHERE id = $1 AND collection_name = 'ai_cache'`,
        [hash]
      );
      if (rows && rows.length > 0) {
        const stored = rows[0].data;
        if (now - (stored.createdAt || 0) < CACHE_TTL_MS) {
          memoryCache.set(hash, {
            text: stored.text,
            createdAt: stored.createdAt,
            model: stored.model || 'deepseek-chat',
            hits: (stored.hits || 0) + 1
          });
          totalTokenSavings += Math.round(stored.text.length / 4);
          return stored.text;
        }
      }
    } catch (e) {
      console.warn('AI Cache read notice:', e);
    }
  }

  return null;
}

export async function setCachedAiResponse(
  hash: string,
  text: string,
  model: string = 'deepseek-chat'
): Promise<void> {
  const now = Date.now();
  memoryCache.set(hash, {
    text,
    createdAt: now,
    model,
    hits: 0
  });

  if (isDbConnected()) {
    try {
      await dbQuery(
        `INSERT INTO items_store (id, collection_name, data) VALUES ($1, 'ai_cache', $2)
         ON CONFLICT (id) DO UPDATE SET data = $2`,
        [hash, JSON.stringify({ text, createdAt: now, model, hits: 0 })]
      );
    } catch (e) {
      console.warn('AI Cache persist notice:', e);
    }
  }
}

export function getAiCacheStats() {
  return {
    cachedEntries: memoryCache.size,
    estimatedTokensSaved: totalTokenSavings
  };
}
