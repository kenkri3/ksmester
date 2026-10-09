import { NextRequest, NextResponse } from 'next/server';
import { verifyCronOrInternalSecret } from '@/src/lib/server/auth';
import { runEndOfDayAutonomyCycle } from '@/src/lib/server/cronScheduler';
import { apiError } from '@/src/lib/server/apiError';

/**
 * 🌇 Autonom byggeleder-syklus (ettermiddag).
 *
 * Kalles av den innebygde scheduleren kl. 15:30 norsk tid, og kan i tillegg
 * trigges eksternt (GitHub Actions / Railway cron) med CRON_SECRET — nyttig hvis
 * appen kjører med flere replikaer eller sover.
 *
 * `?force=1` hopper over idempotenssperren. Uten den kjører syklusen maks én
 * reell gang per 45 minutter, slik at flere triggere ikke lager dobbeltforslag.
 */
export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  if (!verifyCronOrInternalSecret(req)) {
    return NextResponse.json({ error: 'Uautorisert cron-tilgang' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const force = ['1', 'true', 'yes'].includes((url.searchParams.get('force') || '').toLowerCase());
    const companyId = url.searchParams.get('companyId') || undefined;

    const result = await runEndOfDayAutonomyCycle({ companyId, force });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Syklusen feilet. Se serverloggen for detaljer.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.skippedReason
        ? `Hoppet over: ${result.skippedReason}`
        : 'Autonom byggeleder-syklus fullført',
      result
    });
  } catch (error: any) {
    return apiError(error, 'Autonom byggeleder-syklus feilet.');
  }
}
