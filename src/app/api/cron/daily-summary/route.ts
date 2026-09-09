import { NextRequest, NextResponse } from 'next/server';
import { runDailyAudit } from '@/src/lib/server/cronScheduler';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET;
  const authHeader = req.headers.get('authorization');
  const querySecret = req.nextUrl.searchParams.get('secret');

  if (cronSecret) {
    const provided = authHeader?.replace('Bearer ', '') || querySecret;
    const host = req.headers.get('host') || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

    if (provided !== cronSecret && !isLocalhost) {
      return NextResponse.json({ error: 'Uautorisert cron-tilgang' }, { status: 401 });
    }
  }

  try {
    const summary = await runDailyAudit();
    return NextResponse.json({
      success: true,
      message: 'Daglig cron-kjøring fullført',
      summary
    });
  } catch (error: any) {
    console.error('Cron route error:', error);
    return NextResponse.json({ error: error.message || 'Cron feilet' }, { status: 500 });
  }
}
