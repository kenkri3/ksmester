import { NextRequest, NextResponse } from 'next/server';
import { runDailyAudit } from '@/src/lib/server/cronScheduler';
import { runAutonomousAuditCycle } from '@/src/lib/server/autonomousAgent';
import { verifyCronOrInternalSecret } from '@/src/lib/server/auth';
import { apiError } from '@/src/lib/server/apiError';

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
    const [summary, autonomyCycle] = await Promise.all([
      runDailyAudit(),
      runAutonomousAuditCycle().catch(err => {
        console.warn('Autonomy cycle warning in cron:', err.message);
        return null;
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Daglig cron- og autonomisyklus fullført',
      summary,
      autonomyCycle
    });
  } catch (error: any) {
    return apiError(error, 'Cron-jobben feilet.');
  }
}
