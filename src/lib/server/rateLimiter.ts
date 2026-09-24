/**
 * In-Memory Sliding Window Rate Limiter
 * Inspirert av The Lazy Developer Security Guide:
 * "Rate-limit every public mutating endpoint, fail closed on error, and keep limiter state in a shared store."
 */

interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

// Rens opp gamle oppføringer hvert 10. minutt for å unngå minnelekkasje
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      record.timestamps = record.timestamps.filter(ts => now - ts < 3600000); // Behold kun siste time
      if (record.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 600000);
}

export interface RateLimitOptions {
  limit: number; // Maks antall forespørsler
  windowMs: number; // Tidsvindu i millisekunder
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 10, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - options.windowMs;

  let record = memoryStore.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(identifier, record);
  }

  // Filtrer bort forespørsler utenfor gjeldende tidsvindu
  record.timestamps = record.timestamps.filter(ts => ts > windowStart);

  if (record.timestamps.length >= options.limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetMs = Math.max(0, oldestTimestamp + options.windowMs - now);
    return {
      allowed: false,
      remaining: 0,
      resetMs
    };
  }

  // Registrer den nye forespørselen
  record.timestamps.push(now);

  return {
    allowed: true,
    remaining: options.limit - record.timestamps.length,
    resetMs: options.windowMs
  };
}
