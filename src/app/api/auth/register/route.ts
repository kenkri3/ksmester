import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { dbQuery, inMemoryStore, DEFAULT_ADMIN_EMAIL, ADMIN_EMAILS } from '@/src/lib/server/db';
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
    const isAdmin = ADMIN_EMAILS.includes(emailLower) || emailLower === DEFAULT_ADMIN_EMAIL.toLowerCase();

    let existingUser: any = null;
    const rows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1', [emailLower]);
    if (rows && rows.length > 0) {
      existingUser = rows[0];
    } else {
      existingUser = inMemoryStore.users.find(u => u.email.toLowerCase() === emailLower);
    }

    if (existingUser) {
      if (isAdmin) {
        // Admin user updating password or re-registering
        const hashedPassword = await bcrypt.hash(password, 10);
        await dbQuery('UPDATE users SET password = $1, role = $2, subscription_status = $3 WHERE LOWER(email) = $4', [hashedPassword, 'admin', 'active', emailLower]).catch(() => {});
        const userObj = {
          id: existingUser.id,
          uid: existingUser.id,
          email: emailLower,
          displayName: name?.trim() || existingUser.display_name || existingUser.displayName || 'Kenneth Kristiansen',
          role: 'admin',
          trade: trade || 'Byggmester',
          company: company?.trim() || 'AIChat Norge AS / Vikingnet',
          orgnr: '933 630 395',
          companyId: existingUser.company_id || existingUser.companyId || 'comp-001',
          subscriptionStatus: 'active'
        };
        const token = signToken({ id: userObj.id, email: userObj.email, role: userObj.role, companyId: userObj.companyId });
        return NextResponse.json({ token, user: userObj, message: 'Passord oppdatert og logget inn.' });
      }
      return NextResponse.json({ error: 'En bruker med denne e-posten er allerede registrert.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    const companyId = 'comp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);

    const userObj = {
      id: userId,
      uid: userId,
      email: emailLower,
      displayName: name?.trim() || (isAdmin ? 'Kenneth Kristiansen' : email.split('@')[0]),
      role: isAdmin ? 'admin' : 'leader',
      trade: trade || 'Byggmester',
      company: company?.trim() || (isAdmin ? 'AIChat Norge AS / Vikingnet' : 'Ny Bedrift AS'),
      orgnr: cleanOrgnr || (isAdmin ? '933 630 395' : null),
      companyId: companyId,
      subscriptionStatus: isAdmin ? 'active' : 'trial',
      gdprConsent: true,
      gdprConsentAt: new Date().toISOString(),
      gdprConsentIp: clientIp,
      createdAt: new Date().toISOString()
    };

    await dbQuery(
      `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status, orgnr)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, subscription_status = EXCLUDED.subscription_status`,
      [userObj.id, userObj.email, hashedPassword, userObj.displayName, userObj.role, userObj.trade, userObj.company, userObj.companyId, userObj.subscriptionStatus, userObj.orgnr]
    ).catch(() => {});

    inMemoryStore.users.push({ ...userObj, password: hashedPassword });

    const token = signToken({ id: userObj.id, email: userObj.email, role: userObj.role, companyId: userObj.companyId });
    return NextResponse.json({ token, user: userObj });
  } catch (err: any) {
    console.error('Register Error:', err);
    return NextResponse.json({ error: 'Kunne ikke fullføre registreringen.' }, { status: 500 });
  }
}
