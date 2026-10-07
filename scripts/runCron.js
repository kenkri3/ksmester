#!/usr/bin/env node
/**
 * Standalone Railway Cron Worker Script
 * Usage on Railway: Start Command: "npm run cron"
 * Cron Schedule in Railway: e.g. "0 5 * * *"
 *
 * SIKKERHETSFIKS (C-04): tre problemer er rettet her.
 *
 * 1. Scriptet falt tilbake på den hardkodede produksjons-URL-en
 *    `https://vikingmester.no` dersom APP_URL manglet. En feilkonfigurert
 *    miljøvariabel kunne dermed kjøre jobber mot produksjon fra feil sted.
 *    APP_URL er nå påkrevd, og scriptet avbryter hvis den mangler.
 *
 * 2. Manglet CRON_SECRET, sendte scriptet forespørselen HELT UTEN
 *    Authorization-header. Det gjorde at kjøringen så vellykket ut lokalt
 *    (dev-unntaket i verifyCronOrInternalSecret slipper localhost gjennom),
 *    men ville feilet stille i produksjon. Nå avbryter scriptet i stedet.
 *
 * 3. Scriptet kalte alltid process.exit(0), også når alle jobbene feilet. En
 *    feilende cron-jobb så dermed vellykket ut i Railway. Det avslutter nå med
 *    kode 1 hvis noen jobb feiler, slik at feilen blir synlig.
 *
 * Hemmeligheten sendes som Authorization-header. Query-varianten (?secret=) er
 * fjernet fra verifyCronOrInternalSecret, fordi query-parametre havner i
 * access-logger, proxy-logger og nettleserhistorikk.
 */

function resolveAppUrl() {
  const configured = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  return null;
}

function resolveSecret() {
  const secret = (process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET || '').trim();
  return secret || null;
}

async function triggerCron() {
  const port = process.env.PORT || 3000;
  const secret = resolveSecret();

  if (!secret) {
    console.error(
      '[Railway Cron] AVBRUTT: verken CRON_SECRET eller INTERNAL_API_SECRET er satt. ' +
      'Uten hemmelighet ville forespørselen blitt sendt uautentisert og avvist i produksjon. ' +
      'Sett CRON_SECRET i miljøvariablene.'
    );
    process.exit(1);
  }

  // Lokal kjøring kan eksplisitt peke på localhost. Ellers kreves APP_URL.
  const isLocal = process.env.CRON_TARGET_LOCAL === '1';
  const appUrl = isLocal ? `http://localhost:${port}` : resolveAppUrl();

  if (!appUrl) {
    console.error(
      '[Railway Cron] AVBRUTT: APP_URL er ikke satt. ' +
      'Scriptet faller ikke tilbake på produksjonsadressen, fordi en feilkonfigurert ' +
      'variabel da kunne kjørt jobber mot produksjon fra feil sted. ' +
      'Sett APP_URL, eller bruk CRON_TARGET_LOCAL=1 for lokal kjøring.'
    );
    process.exit(1);
  }

  console.log(`[Railway Cron] Starter daglig HMS & KS audit mot ${appUrl} ...`);

  const endpoints = ['/api/cron/daily-summary', '/api/cron/seo-worker'];
  const failures = [];

  for (const endpoint of endpoints) {
    const targetUrl = `${appUrl}${endpoint}`;
    console.log(`[Railway Cron] Kjører jobb: ${endpoint}...`);

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`,
        },
        signal: AbortSignal.timeout(45000),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        console.log(
          `✅ [Railway Cron] Vellykket utførelse for ${endpoint}:`,
          JSON.stringify(data.summary || data.result || data)
        );
      } else {
        const body = await res.text().catch(() => '');
        const message = `HTTP ${res.status} fra ${targetUrl}${body ? ' – ' + body.slice(0, 200) : ''}`;
        console.error(`❌ [Railway Cron] ${message}`);
        failures.push({ endpoint, message });
      }
    } catch (err) {
      const message = `${targetUrl} feilet: ${err.message}`;
      console.error(`❌ [Railway Cron] ${message}`);
      failures.push({ endpoint, message });
    }
  }

  if (failures.length > 0) {
    console.error(
      `[Railway Cron] ${failures.length} av ${endpoints.length} jobb(er) feilet. ` +
      'Avslutter med feilkode slik at Railway markerer kjøringen som mislykket.'
    );
    process.exit(1);
  }

  console.log('[Railway Cron] Alle jobber fullført.');
  process.exit(0);
}

triggerCron();
