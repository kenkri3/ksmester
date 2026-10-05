import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { checkCompanyQuota, TOPUP_PACKAGES } from '@/src/lib/server/costTracker';
import { apiError } from '@/src/lib/server/apiError';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Uautorisert tilgang' }, { status: 401 });
  }

  try {
    const companyId = user.companyId || 'comp-001';
    const quota = await checkCompanyQuota(companyId);

    return NextResponse.json({
      success: true,
      quota,
      topupPackages: TOPUP_PACKAGES,
      companyId
    });
  } catch (error: any) {
    // SIKKERHETSFIKS (E-29): logg detaljene server-side, ikke til klienten.
    return apiError(error, 'Kunne ikke hente kvote.');
  }
}
