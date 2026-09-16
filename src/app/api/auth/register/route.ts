import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { dbQuery, inMemoryStore, saveCollectionItem } from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, company, orgnr, trade, gdprConsent } = await req.json();
    const cleanOrgnr = (orgnr || '').toString().replace(/\s+/g, '').trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'Både e-post og passord må fylles ut.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Passordet må være på minst 8 tegn av sikkerhetshensyn.' }, { status: 400 });
    }

    if (!gdprConsent) {
      return NextResponse.json({ error: 'Du må godta personvernerklæringen og brukervilkårene iht. GDPR for å opprette konto.' }, { status: 400 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const emailLower = email.toLowerCase().trim();

    let existingUser: any = null;
    const rows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1', [emailLower]);
    if (rows && rows.length > 0) {
      existingUser = rows[0];
    } else {
      existingUser = inMemoryStore.users?.find(u => u.email.toLowerCase() === emailLower);
    }

    if (existingUser) {
      return NextResponse.json({ error: 'En bruker med denne e-posten er allerede registrert. Logg inn i stedet.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    const companyId = 'comp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);

    const userObj = {
      id: userId,
      uid: userId,
      email: emailLower,
      displayName: name?.trim() || email.split('@')[0],
      role: 'leader',
      trade: trade || 'Byggmester',
      company: company?.trim() || 'Ny Bedrift AS',
      orgnr: cleanOrgnr || null,
      companyId: companyId,
      subscriptionStatus: 'trial',
      gdprConsent: true,
      gdprConsentAt: new Date().toISOString(),
      gdprConsentIp: clientIp,
      createdAt: new Date().toISOString()
    };

    await dbQuery(
      `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status, orgnr)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userObj.id, userObj.email, hashedPassword, userObj.displayName, userObj.role, userObj.trade, userObj.company, userObj.companyId, userObj.subscriptionStatus, userObj.orgnr]
    ).catch(() => {});

    if (!inMemoryStore.users) inMemoryStore.users = [];
    inMemoryStore.users.push({ ...userObj, password: hashedPassword });

    // Opprett også bedriftsoppføring i companies-samlingen så SuperAdmin har full oversikt
    const companyData = {
      id: companyId,
      name: userObj.company,
      orgnr: cleanOrgnr || '',
      contactName: userObj.displayName,
      email: emailLower,
      phone: '',
      plan: 'pro',
      status: 'active',
      subscriptionStatus: 'trial',
      modules: ['projects', 'checklists', 'deviations', 'ai', 'economy', 'fdv', 'inventory', 'vehicle', 'time', 'apprentice', 'building_app'],
      createdAt: new Date().toISOString()
    };
    await saveCollectionItem('companies', companyData).catch(() => {});

    const token = signToken({ id: userObj.id, email: userObj.email, role: userObj.role, companyId: userObj.companyId, company: userObj.company });
    return NextResponse.json({ token, user: userObj });
  } catch (err: any) {
    console.error('Register Error:', err);
    return NextResponse.json({ error: 'Kunne ikke fullføre registreringen.' }, { status: 500 });
  }
}
