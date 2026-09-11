#!/usr/bin/env node
/**
 * Standalone Railway Cron Worker Script
 * Usage on Railway: Start Command: "npm run cron"
 * Cron Schedule in Railway: e.g. "0 5 * * *"
 */
async function triggerCron() {
  const port = process.env.PORT || 3000;
  const appUrl = process.env.APP_URL || `http://localhost:${port}`;
  const secret = process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET || '';

  console.log('[Railway Cron] Starter daglig HMS & KS audit...');

  // Trigger both daily summary and autonomous SEO worker
  const endpoints = ['/api/cron/daily-summary', '/api/cron/seo-worker'];

  for (const endpoint of endpoints) {
    console.log(`[Railway Cron] Kjører jobb: ${endpoint}...`);
    const urlsToTry = [
      `http://localhost:${port}${endpoint}`,
      appUrl.endsWith('/') ? `${appUrl}${endpoint.slice(1)}` : `${appUrl}${endpoint}`,
      `https://vikingmester.no${endpoint}`
    ];

    let success = false;
    for (const targetUrl of Array.from(new Set(urlsToTry))) {
      try {
        console.log(`[Railway Cron] Forsøker: ${targetUrl}`);
        const headers = { 'Content-Type': 'application/json' };
        if (secret) headers['Authorization'] = `Bearer ${secret}`;

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers,
          signal: AbortSignal.timeout(45000)
        });

        if (res.ok) {
          const data = await res.json();
          console.log(`✅ [Railway Cron] Vellykket utførelse for ${endpoint}:`, JSON.stringify(data.summary || data.result || data));
          success = true;
          break;
        } else {
          console.warn(`[Railway Cron] HTTP ${res.status} fra ${targetUrl}`);
        }
      } catch (err) {
        console.warn(`[Railway Cron] Feilet mot ${targetUrl}: ${err.message}`);
      }
    }
  }

  process.exit(0);
}

triggerCron();
