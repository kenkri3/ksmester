import { NextRequest, NextResponse } from 'next/server';
import { runPageSpeedAudit } from '@/src/lib/server/pagespeedService';
import { checkRateLimit } from '@/src/lib/server/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(`pagespeed-${ip}`, { limit: 20, windowMs: 60000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'For mange PageSpeed-forespørsler. Vent litt.' }, { status: 429 });
  }

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url') || 'https://vikingmester.no';
  const strategy = (url.searchParams.get('strategy') as 'mobile' | 'desktop') || 'mobile';

  try {
    const audit = await runPageSpeedAudit(targetUrl, strategy);
    return NextResponse.json({ success: true, data: audit });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
