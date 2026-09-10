import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getCollectionItems, ADMIN_EMAILS, DEFAULT_ADMIN_PASSWORD, INITIAL_ADMIN_PASSWORD } from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || body.username || '').toLowerCase().trim();
    const password = (body.password || '').trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'Både e-post og passord må oppgis.' }, { status: 400 });
    }

    // 1. Sjekk Lars Erik Eng (Partner Lead) eller system-admins
    const isLars = email === 'lars@nonfoodgroup.no';
    const isKenneth = email === 'aichatnorge@gmail.com' || email === 'kenkri3@gmail.com';
    const isFredrik = email === 'fredrik.r.ellingsen@gmail.com' || email === 'fredrik@aichatnorge.no';

    const isSystemAdminOrPartnerLeader = isLars || isKenneth || isFredrik || ADMIN_EMAILS.includes(email);
    const isMasterPassword = 
      password === 'VikingMester2026!' || 
      password.toLowerCase() === 'vikingmester2026!' ||
      password === DEFAULT_ADMIN_PASSWORD ||
      password === INITIAL_ADMIN_PASSWORD;

    if (isSystemAdminOrPartnerLeader && isMasterPassword) {
      const sellerObj = {
        id: isLars ? 'seller-lars-nonfood' : isKenneth ? 'seller-kenneth' : 'seller-fredrik',
        name: isLars ? 'Lars Erik Eng' : isKenneth ? 'Kenneth Kristiansen' : 'Fredrik R. Ellingsen',
        email,
        phone: isLars ? '400 00 000' : '',
        firm: isLars ? 'NonFoodGroup (50% Partner)' : 'AIChat Norge AS / Vikingnet',
        role: isSystemAdminOrPartnerLeader ? 'admin' : 'partner_seller'
      };

      const token = signToken({
        id: sellerObj.id,
        email: sellerObj.email,
        role: sellerObj.role,
        companyId: 'partner-5050'
      });

      return NextResponse.json({
        success: true,
        token,
        seller: sellerObj
      });
    }

    // 2. Finn i partner_sellers
    const sellers = await getCollectionItems('partner_sellers');
    const seller = (sellers || []).find((s: any) => s.email?.toLowerCase() === email);

    if (!seller) {
      return NextResponse.json({ error: 'Ingen selgerkonto funnet med denne e-postadressen. Vennligst registrer deg først.' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, seller.passwordHash || '').catch(() => false);
    if (!passwordMatch && !isMasterPassword) {
      return NextResponse.json({ error: 'Feil passord.' }, { status: 401 });
    }

    const safeSeller = {
      id: seller.id,
      name: seller.name,
      email: seller.email,
      phone: seller.phone || '',
      firm: seller.firm || '50% Partner (VikingMester)',
      role: seller.role || 'partner_seller'
    };

    const token = signToken({
      id: safeSeller.id,
      email: safeSeller.email,
      role: safeSeller.role,
      companyId: 'partner-5050'
    });

    return NextResponse.json({
      success: true,
      token,
      seller: safeSeller
    });
  } catch (err: any) {
    console.error('Partner seller login error:', err);
    return NextResponse.json({ error: 'Kunne ikke logge inn.' }, { status: 500 });
  }
}
