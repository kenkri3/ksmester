import { NextRequest, NextResponse } from 'next/server';
import { runAutonomousSeoCycle } from '@/src/lib/server/autonomousSeoEngine';
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
    const result = await runAutonomousSeoCycle();
    return NextResponse.json({
      success: true,
      message: 'Autonom SEO-arbeider fullført',
      result
    });
  } catch (error: any) {
    console.error('SEO Cron route error:', error);
    return NextResponse.json({ error: error.message || 'SEO Cron feilet' }, { status: 500 });
  }
}