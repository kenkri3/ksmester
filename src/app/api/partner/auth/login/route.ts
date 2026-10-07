import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getCollectionItems } from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || body.username || '').toLowerCase().trim();
    const password = (body.password || '').trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'Både e-post og passord må oppgis.' }, { status: 400 });
    }

    // SIKKERHETSFIKS (E-10): Her la en universal masterpassord-gren som godtok
    // 'VikingMester2026!' (og andre varianter) for en hardkodet liste av e-postadresser,
    // og utstedte en admin-token uten a sjekke lagret passordhash. Passordet la i
    // klartekst i et offentlig repo. Grenen er fjernet helt.
    // All paalogging verifiseres na mot lagret passwordHash for selgerkontoen.

    // Finn selgerkontoen.
    const sellers = await getCollectionItems('partner_sellers');
    const seller = (sellers || []).find((s: any) => s.email?.toLowerCase() === email);

    if (!seller) {
      return NextResponse.json({ error: 'Ingen selgerkonto funnet med denne e-postadressen. Vennligst registrer deg først.' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, seller.passwordHash || '').catch(() => false);
    if (!passwordMatch || !seller.passwordHash) {
      return NextResponse.json({ error: 'Feil passord.' }, { status: 401 });
    }

    const safeSeller = {
      id: seller.id,
      name: seller.name,
      email: seller.email,
      phone: seller.phone || '',
      firm: seller.firm || 'NonFoodGroup AS (50% Partner)',
      role: seller.role || 'partner_seller'
    };

    const token = signToken({
      id: safeSeller.id,
      email: safeSeller.email,
      role: safeSeller.role,
      companyId: 'comp-nonfood'
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
