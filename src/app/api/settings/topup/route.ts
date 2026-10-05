import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { saveCollectionItem } from '@/src/lib/server/db';
import { TOPUP_PACKAGES } from '@/src/lib/server/costTracker';
import { apiError } from '@/src/lib/server/apiError';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Uautorisert tilgang' }, { status: 401 });
  }

  try {
    const body = await req.json();
    let packageKey = body.packageKey;
    if (!packageKey && body.packageType) {
      packageKey = body.packageType === 'large' ? 'topup-20m' : 'topup-5m';
    }

    const pkg = TOPUP_PACKAGES[packageKey];
    if (!pkg) {
      return NextResponse.json({ error: 'Ugyldig top-up pakke' }, { status: 400 });
    }

    const companyId = user.companyId || 'comp-001';
    const topupRecord = {
      id: `topup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId,
      packageKey,
      packageName: pkg.name,
      tokensGranted: pkg.tokens,
      imagesGranted: pkg.images,
      priceNok: pkg.priceNok,
      purchasedBy: user.email,
      purchasedAt: new Date().toISOString(),
      status: 'active',
      invoiceStatus: 'pending_ehf'
    };

    await saveCollectionItem('token_topups', topupRecord);

    await saveCollectionItem('agent_activities', {
      type: 'topup',
      title: `Top-up pakke aktivert: ${pkg.name}`,
      description: `Lagt til ${pkg.tokens.toLocaleString('no-NO')} tokens for bedriften (${user.email}). Faktureres kr ${pkg.priceNok},- eks mva på neste EHF.`,
      trade: 'general',
      tradeName: 'System / Faktura',
      status: 'verified',
      badge: 'TOP-UP',
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `${pkg.name} er aktivert! Ekstra kvote er umiddelbart tilgjengelig.`,
      topup: topupRecord
    });
  } catch (error: any) {
    // SIKKERHETSFIKS (E-29): logg detaljene server-side, ikke til klienten.
    return apiError(error, 'Kunne ikke aktivere pakken.');
  }
}
