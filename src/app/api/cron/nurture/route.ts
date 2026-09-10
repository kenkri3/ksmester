import { NextRequest, NextResponse } from 'next/server';
import { processAutonomousNurtureSequence } from '@/src/lib/server/nurtureEngine';

export async function GET(req: NextRequest) {
  return handleNurtureCron(req);
}

export async function POST(req: NextRequest) {
  return handleNurtureCron(req);
}

async function handleNurtureCron(req: NextRequest) {
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
    const result = await processAutonomousNurtureSequence();
    return NextResponse.json({
      success: true,
      message: 'Autonom oppfølgings- og mersalgsrunde fullført',
      result
    });
  } catch (error: any) {
    console.error('Nurture cron route error:', error);
    return NextResponse.json({ error: error.message || 'Nurture feilet' }, { status: 500 });
  }
}
