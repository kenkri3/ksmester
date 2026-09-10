import { NextRequest, NextResponse } from 'next/server';
import { runDailyAudit } from '@/src/lib/server/cronScheduler';
import { verifyCronOrInternalSecret } from '@/src/lib/server/auth';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  if (!verifyCronOrInternalSecret(req)) {
    return NextResponse.json({ error: 'Uautorisert cron-tilgang' }, { status: 401 });
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
