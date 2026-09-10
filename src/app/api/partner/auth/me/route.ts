import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { getCollectionItems } from '@/src/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload || !userPayload.email) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const email = userPayload.email.toLowerCase().trim();
    const sellers = await getCollectionItems('partner_sellers');
    const seller = (sellers || []).find((s: any) => s.email?.toLowerCase() === email);

    if (seller) {
      return NextResponse.json({
        authenticated: true,
        seller: {
          id: seller.id,
          name: seller.name,
          email: seller.email,
          phone: seller.phone || '',
          firm: seller.firm || '50% Partner (VikingMester)',
          role: seller.role || 'partner_seller'
        }
      });
    }

    // Fallback hvis admin eller registrert via auth/login
    return NextResponse.json({
      authenticated: true,
      seller: {
        id: userPayload.id,
        name: email.split('@')[0],
        email,
        phone: '',
        firm: 'Partner (VikingMester)',
        role: userPayload.role || 'partner_seller'
      }
    });
  } catch (err: any) {
    console.error('Partner auth me error:', err);
    return NextResponse.json({ authenticated: false, error: 'Kunne ikke verifisere sesjon.' }, { status: 500 });
  }
}
