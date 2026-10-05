import { NextRequest, NextResponse } from 'next/server';
import { processAutonomousNurtureSequence } from '@/src/lib/server/nurtureEngine';
import { verifyCronOrInternalSecret } from '@/src/lib/server/auth';
import { apiError } from '@/src/lib/server/apiError';

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
    return apiError(error, 'Oppfølgingsrunden feilet.');
  }
}
