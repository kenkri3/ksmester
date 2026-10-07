import { NextRequest, NextResponse } from 'next/server';
import { runPageSpeedAudit } from '@/src/lib/server/pagespeedService';
import { runDeadPageCleanup } from '@/src/lib/server/deadPageCleaner';
import { runSeoAutoHealer } from '@/src/lib/server/autoHealer';
import { runAutonomousSeoCycle, isAutoblogDue } from '@/src/lib/server/autonomousSeoEngine';
import { saveCollectionItem, getCollectionItems } from '@/src/lib/server/db';
import { checkRateLimit } from '@/src/lib/server/rateLimiter';
import { getUserFromRequest, isUserSuperAdmin, verifyCronOrInternalSecret } from '@/src/lib/server/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 sekunder timeout

/**
 * GET/POST /api/cron/seo-autopilot
 * Hoved-endepunkt for autonom drift av SEO, PageSpeed, Auto-Healer, Autoblogg og Dead Page Cleanup.
 */
export async function GET(req: NextRequest) {
  return handleAutopilot(req);
}

export async function POST(req: NextRequest) {
  return handleAutopilot(req);
}

async function handleAutopilot(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  
  // Rate limiting (maks 10 kjøringer per time for å beskytte mot misbruk)
  const rl = checkRateLimit(`cron-autopilot-${ip}`, { limit: 10, windowMs: 3600000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'For mange forespørsler. Prøv igjen senere.' }, { status: 429 });
  }

  // 🛡️ SIKKERHETSFIKS (P0): Hardkodet cron-hemmelighet ('vikingmester-cron-secret-2026')
  // er fjernet. Den lå i klartekst i både denne ruten og i klientkomponenten,
  // og ga hvem som helst rett til å starte tunge SEO-jobber.
  //
  // Autorisasjon skjer nå via den delte, fail-closed hjelperen
  // verifyCronOrInternalSecret (CRON_SECRET / INTERNAL_API_SECRET, timing-safe),
  // eller en innlogget SuperAdmin. Den spoofbare Vercel-headeren er fjernet (E-18).
  // SIKKERHETSFIKS (E-18): her sto i tillegg `req.headers.get('x-vercel-cron') === '1'`.
  // En HTTP-header kan settes av hvem som helst, sa den var ikke en autentisering
  // i det hele tatt - enhver kunne starte tunge SEO-jobber (PageSpeed, auto-healer,
  // AI-autoblogg) mot plattformens kvoter og kostnader. Appen kjorer pa Railway,
  // ikke Vercel, sa unntaket hadde ingen legitim funksjon. Fjernet.
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === 'true';

  const cronAuthorized = verifyCronOrInternalSecret(req);

  let adminAuthorized = false;
  if (!cronAuthorized) {
    const user = getUserFromRequest(req);
    adminAuthorized = isUserSuperAdmin(user);
  }

  if (!cronAuthorized && !adminAuthorized) {
    return NextResponse.json({ error: 'Uautorisert. Gyldig CRON_SECRET eller SuperAdmin-innlogging kreves.' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('🚀 [SEO Autopilot] Kjører full autonom optimaliseringssyklus for hele Norge...');

  try {
    // 1. 🧹 Rens døde sider og sett opp 301-omdirigeringer
    const cleanupResult = await runDeadPageCleanup();

    // 2. 🩺 Kjør SEO Auto-Healer (reparerer manglende tags, ferskhet, PageRank interne lenker)
    const healerResult = await runSeoAutoHealer();

    // 3. ⚡ Mål Google PageSpeed & Core Web Vitals
    const pageSpeedResult = await runPageSpeedAudit('https://vikingmester.no', 'mobile');

    // 4. 🤖 Autoblogg: Sjekk om det er på tide med 1-2 ukentlige innlegg, eller kjør force
    const blogResult = await runAutonomousSeoCycle({ force });

    const totalDurationMs = Date.now() - startTime;

    const runRecord = {
      id: `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      durationMs: totalDurationMs,
      pageSpeed: {
        performance: pageSpeedResult.scores.performance,
        seo: pageSpeedResult.scores.seo,
        accessibility: pageSpeedResult.scores.accessibility,
        bestPractices: pageSpeedResult.scores.bestPractices,
        cwv: pageSpeedResult.coreWebVitals
      },
      cleanup: {
        cleanedCount: cleanupResult.cleanedCount,
        redirectsCreated: cleanupResult.redirectsCreated
      },
      autoHealer: {
        healedCount: healerResult.articlesHealed,
        healthScore: healerResult.overallSeoHealthScore,
        totalScanned: healerResult.totalArticlesScanned
      },
      autoblogg: {
        createdCount: blogResult.createdCount,
        articlesCreated: blogResult.articlesCreated,
        skippedReason: blogResult.skippedReason,
        nextScheduled: blogResult.nextScheduled
      }
    };

    // Lagre kjøring i historikk
    await saveCollectionItem('seo_autopilot_runs', runRecord);

    return NextResponse.json({
      success: true,
      message: 'Autopilot-syklus fullført for Norge.',
      results: runRecord
    });
  } catch (error: any) {
    // SIKKERHETSFIKS (E-29): logg hele feilen server-side, men returner ikke
    // error.message til klienten - den kan inneholde interne detaljer fra
    // PageSpeed, AI-leverandørene eller databasen.
    console.error('❌ [SEO Autopilot] Kritisk feil i autopilot-syklus:', error);
    return NextResponse.json({
      success: false,
      error: 'Autopilot-syklusen feilet. Se serverloggen for detaljer.'
    }, { status: 500 });
  }
}
