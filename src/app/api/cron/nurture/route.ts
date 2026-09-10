import { NextRequest, NextResponse } from 'next/server';
import { processAutonomousNurtureSequence } from '@/src/lib/server/nurtureEngine';
import { verifyCronOrInternalSecret } from '@/src/lib/server/auth';

export async function GET(req: NextRequest) {
  return handleNurtureCron(req);
}

export async function POST(req: NextRequest) {
  return handleNurtureCron(req);
}

async function handleNurtureCron(req: NextRequest) {
  if (!verifyCronOrInternalSecret(req)) {
    return NextResponse.json({ error: 'Uautorisert cron-tilgang' }, { status: 401 });
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
