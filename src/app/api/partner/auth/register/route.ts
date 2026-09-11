import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getCollectionItems, saveCollectionItem } from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';

// 🔒 SIKKERHETSSPERRE: Kun autoriserte adresser fra samarbeidspartner NonFoodGroup AS har adgang til å registrere seg
const ALLOWED_PARTNER_EMAILS = [
  'jm@nonfoodgroup.no',
  'lars@nonfoodgroup.no'
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || '').trim();
    const email = (body.email || '').toLowerCase().trim();
    const password = (body.password || '').trim();
    const phone = (body.phone || '').trim();
    const firm = 'NonFoodGroup AS';

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Navn, e-post og passord er påkrevd.' }, { status: 400 });
    }

    if (!ALLOWED_PARTNER_EMAILS.includes(email)) {
      return NextResponse.json({ 
        error: 'Registrering i partnerportalen er strengt forbeholdt NonFoodGroup AS (kun jm@nonfoodgroup.no og lars@nonfoodgroup.no).' 
      }, { status: 403 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Passordet må være på minst 6 tegn.' }, { status: 400 });
    }

    const existingSellers = await getCollectionItems('partner_sellers');
    const alreadyExists = (existingSellers || []).find((s: any) => s.email?.toLowerCase() === email);
    if (alreadyExists) {
      return NextResponse.json({ error: 'Denne e-postadressen er allerede registrert. Vennligst logg inn.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const sellerId = `seller-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const sellerRecord = {
      id: sellerId,
      name,
      email,
      phone,
      firm,
      passwordHash,
      role: 'partner_seller',
      createdAt: new Date().toISOString()
    };

    await saveCollectionItem('partner_sellers', sellerRecord);

    const token = signToken({
      id: sellerRecord.id,
      email: sellerRecord.email,
      role: 'partner_seller',
      companyId: 'comp-nonfood'
    });

    const safeSeller = {
      id: sellerRecord.id,
      name: sellerRecord.name,
      email: sellerRecord.email,
      phone: sellerRecord.phone,
      firm: sellerRecord.firm,
      role: sellerRecord.role
    };

    return NextResponse.json({
      success: true,
      message: `Velkommen som partner for VikingMester, ${name} (NonFoodGroup AS)!`,
      token,
      seller: safeSeller
    });
  } catch (err: any) {
    console.error('Partner seller registration error:', err);
    return NextResponse.json({ error: 'Kunne ikke registrere selger.' }, { status: 500 });
  }
}
