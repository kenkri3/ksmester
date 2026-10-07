import { NextRequest, NextResponse } from 'next/server';
import { runPageSpeedAudit } from '@/src/lib/server/pagespeedService';
import { checkRateLimit } from '@/src/lib/server/rateLimiter';
import { getUserFromRequest, isUserSuperAdmin } from '@/src/lib/server/auth';
import { apiError } from '@/src/lib/server/apiError';

export const dynamic = 'force-dynamic';

/**
 * SIKKERHETSFIKS (E-27): ruten var helt uautentisert og sendte `url=`-parameteren
 * rett til Google PageSpeed med plattformens nøkkel. Hvem som helst kunne dermed
 * bruke opp kvoten vår og la oss betale for sine egne målinger. Ruten krever nå
 * innlogging, og målet må være vårt eget domene med mindre brukeren er SuperAdmin.
 */
function isAllowedTarget(targetUrl: string, isSuper: boolean): boolean {
  if (isSuper) return true;
  try {
    const host = new URL(targetUrl).hostname.toLowerCase();
    return host === 'vikingmester.no' || host.endsWith('.vikingmester.no');
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Uautorisert tilgang. Vennligst logg inn.' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(`pagespeed-${ip}`, { limit: 20, windowMs: 60000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'For mange PageSpeed-forespørsler. Vent litt.' }, { status: 429 });
  }

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url') || 'https://vikingmester.no';
  const strategy = (url.searchParams.get('strategy') as 'mobile' | 'desktop') || 'mobile';

  if (!isAllowedTarget(targetUrl, isUserSuperAdmin(user))) {
    return NextResponse.json(
      { error: 'PageSpeed-måling er bare tillatt for vikingmester.no.' },
      { status: 403 }
    );
  }

  try {
    const audit = await runPageSpeedAudit(targetUrl, strategy);
    return NextResponse.json({ success: true, data: audit });
  } catch (error: any) {
    return apiError(error, 'Kunne ikke kjøre PageSpeed-målingen.');
  }
}
