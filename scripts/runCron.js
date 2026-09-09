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

  const urlsToTry = [
    `http://localhost:${port}/api/cron/daily-summary`,
    appUrl.endsWith('/') ? `${appUrl}api/cron/daily-summary` : `${appUrl}/api/cron/daily-summary`,
    'https://ksmester.no/api/cron/daily-summary',
    'https://ksmester.no/api/cron/daily-summary'
  ];

  for (const targetUrl of Array.from(new Set(urlsToTry))) {
    try {
      console.log(`[Railway Cron] Forsøker: ${targetUrl}`);
      const headers = { 'Content-Type': 'application/json' };
      if (secret) headers['Authorization'] = `Bearer ${secret}`;

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(35000)
      });

      if (res.ok) {
        const data = await res.json();
        console.log('✅ [Railway Cron] Vellykket utførelse:', JSON.stringify(data.summary || data));
        process.exit(0);
      } else {
        console.warn(`[Railway Cron] HTTP ${res.status} fra ${targetUrl}`);
      }
    } catch (err) {
      console.warn(`[Railway Cron] Feilet mot ${targetUrl}: ${err.message}`);
    }
  }

  console.error('❌ [Railway Cron] Kunne ikke nå noe tilgjengelig cron-endepunkt.');
  process.exit(1);
}

triggerCron();
