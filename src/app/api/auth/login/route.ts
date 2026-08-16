import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { dbQuery, inMemoryStore, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_HASH } from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = (body.email || body.username || '').toLowerCase().trim();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Både e-post/brukernavn og passord må fylles ut.' }, { status: 400 });
    }

    // 1. Direct match against configured ADMIN credentials (ENV variables)
    const isAdminIdentifier =
      identifier === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
      identifier === 'admin' ||
      identifier === 'administrator' ||
      identifier === 'kenkri3@gmail.com';

    const isAdminPasswordValid =
      password === DEFAULT_ADMIN_PASSWORD ||
      (await bcrypt.compare(password, DEFAULT_ADMIN_HASH).catch(() => false));

    if (isAdminIdentifier && isAdminPasswordValid) {
      const adminObj = {
        id: 'u-admin-123',
        uid: 'u-admin-123',
        email: DEFAULT_ADMIN_EMAIL,
        displayName: 'Ken (Admin)',
        role: 'admin',
        trade: 'Byggmester',
        company: 'Mester Entreprenør AS',
        companyId: 'comp-001',
        subscriptionStatus: 'active'
      };

      dbQuery(`
        INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'admin'
      `, [adminObj.id, adminObj.email, DEFAULT_ADMIN_HASH, adminObj.displayName, adminObj.role, adminObj.trade, adminObj.company, adminObj.companyId, adminObj.subscriptionStatus]).catch(() => {});

      const token = signToken({ id: adminObj.id, email: adminObj.email, role: adminObj.role, companyId: adminObj.companyId });
      return NextResponse.json({ token, user: adminObj });
    }

    // 2. Otherwise search DB / memory store for registered users
    let userRecord: any = null;
    const rows = await dbQuery(
      'SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(id) = $1 OR LOWER(display_name) = $1',
      [identifier]
    );

    if (rows && rows.length > 0) {
      userRecord = rows[0];
    } else {
      userRecord = inMemoryStore.users.find(u =>
        u.email.toLowerCase() === identifier ||
        (u.id && u.id.toLowerCase() === identifier) ||
        (u.displayName && u.displayName.toLowerCase() === identifier)
      );
    }

    if (!userRecord) {
      return NextResponse.json({ error: 'Ugyldig e-post/brukernavn eller passord.' }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(password, userRecord.password).catch(() => false);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Ugyldig e-post/brukernavn eller passord.' }, { status: 401 });
    }

    const userObj = {
      id: userRecord.id,
      uid: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name || userRecord.displayName || userRecord.email.split('@')[0],
      role: userRecord.role || 'worker',
      trade: userRecord.trade || 'Tømrer',
      company: userRecord.company || 'Mester Entreprenør AS',
      companyId: userRecord.company_id || userRecord.companyId || 'comp-001',
      subscriptionStatus: userRecord.subscription_status || userRecord.subscriptionStatus || 'active'
    };

    const token = signToken({ id: userObj.id, email: userObj.email, role: userObj.role, companyId: userObj.companyId });
    return NextResponse.json({ token, user: userObj });
  } catch (err: any) {
    console.error('Login Error:', err);
    return NextResponse.json({ error: 'Kunne ikke logge inn.' }, { status: 500 });
  }
}
