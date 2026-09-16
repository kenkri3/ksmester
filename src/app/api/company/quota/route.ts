import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { checkCompanyQuota, TOPUP_PACKAGES } from '@/src/lib/server/costTracker';

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
    console.error('Company quota error:', error);
    return NextResponse.json({ error: error.message || 'Kunne ikke hente kvote' }, { status: 500 });
  }
}
