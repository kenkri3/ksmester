import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { 
  dbQuery, 
  inMemoryStore, 
  ADMIN_EMAILS, 
  DEFAULT_ADMIN_EMAIL, 
  DEFAULT_ADMIN_PASSWORD, 
  DEFAULT_ADMIN_HASH, 
  INITIAL_ADMIN_PASSWORD,
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  DEMO_USER_HASH
} from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = (body.email || body.username || '').toLowerCase().trim();
    const password = body.password || '';

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Både e-post/brukernavn og passord må fylles ut.' }, { status: 400 });
    }

    const isAdminIdentifier = 
      ADMIN_EMAILS.includes(identifier) || 
      identifier === 'admin' || 
      identifier === 'administrator' || 
      identifier === 'superadmin' ||
      identifier === 'ken' ||
      identifier === 'kenneth' ||
      identifier === 'fredrik';

    // Search DB / memory store for registered users
    let userRecord: any = null;
    const rows = await dbQuery(
      `SELECT * FROM users WHERE 
        LOWER(email) = $1 
        OR LOWER(id) = $1 
        OR LOWER(display_name) = $1
        OR ($2 = true AND (role = 'admin' OR role = 'superadmin'))
       ORDER BY (CASE WHEN LOWER(email) = $3 THEN 0 ELSE 1 END), created_at ASC LIMIT 1`,
      [identifier, isAdminIdentifier, DEFAULT_ADMIN_EMAIL]
    );

    if (rows && rows.length > 0) {
      userRecord = rows[0];
    } else {
      userRecord = inMemoryStore.users?.find(u =>
        u.email?.toLowerCase() === identifier ||
        (u.id && u.id.toLowerCase() === identifier) ||
        (u.displayName && u.displayName.toLowerCase() === identifier) ||
        (isAdminIdentifier && (u.role === 'admin' || u.role === 'superadmin'))
      );
    }

    // Fallback if user table / memory is fresh
    if (!userRecord && isAdminIdentifier) {
      const fallbackEmail = ADMIN_EMAILS.includes(identifier) ? identifier : (identifier === 'fredrik' ? 'fredrik@aichatnorge.no' : DEFAULT_ADMIN_EMAIL);
      const isFredrik = fallbackEmail.includes('fredrik');
      userRecord = {
        id: isFredrik ? 'u-admin-fredrik' : 'u-admin-123',
        email: fallbackEmail,
        password: DEFAULT_ADMIN_HASH,
        displayName: isFredrik ? 'Fredrik R. Ellingsen' : 'Ken (Admin)',
        role: 'superadmin',
        trade: 'Byggmester',
        company: 'AIChat Norge AS / Vikingnet',
        companyId: 'comp-001',
        subscriptionStatus: 'active'
      };
    }

    // Fallback for separat demokunde (Fjellheim Bygg & Tømrer AS)
    if (!userRecord && (identifier === 'demo' || identifier === DEMO_USER_EMAIL || identifier === 'fjellheim')) {
      userRecord = {
        id: 'u-demo-lars-fjellheim',
        email: DEMO_USER_EMAIL,
        password: DEMO_USER_HASH,
        displayName: 'Lars Fjellheim (Demokunde)',
        role: 'admin',
        trade: 'Tømrer / Byggmester',
        company: 'Fjellheim Bygg & Tømrer AS',
        companyId: 'comp-demo-fjellheim',
        subscriptionStatus: 'active'
      };
    }

    if (!userRecord) {
      return NextResponse.json({ error: 'Ugyldig e-post/brukernavn eller passord.' }, { status: 401 });
    }

    // Verify password strictly against hashed value in DB or master password
    let passwordValid = false;
    if (userRecord.password) {
      passwordValid = await bcrypt.compare(password, userRecord.password).catch(() => false);
    }

    // Spesifikk verifisering for demokunde
    if (!passwordValid && (identifier === 'demo' || userRecord.email === DEMO_USER_EMAIL) && password === DEMO_USER_PASSWORD) {
      passwordValid = true;
    }

    const isSystemAdmin = 
      isAdminIdentifier ||
      ADMIN_EMAILS.includes((userRecord.email || '').toLowerCase().trim()) || 
      userRecord.role === 'admin' ||
      userRecord.role === 'superadmin';

    const isMasterPassword = 
      password === 'VikingMester2026!' || 
      password.toLowerCase() === 'vikingmester2026!' ||
      password === DEFAULT_ADMIN_PASSWORD ||
      password === INITIAL_ADMIN_PASSWORD ||
      (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) ||
      (process.env.INITIAL_ADMIN_PASSWORD && password === process.env.INITIAL_ADMIN_PASSWORD);

    if (!passwordValid && isSystemAdmin && isMasterPassword) {
      passwordValid = true;
      try {
        const newHash = bcrypt.hashSync(password, 10);
        userRecord.password = newHash;
        await dbQuery(
          `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status)
           VALUES ($1, $2, $3, $4, 'superadmin', 'Byggmester', 'AIChat Norge AS / Vikingnet', 'comp-001', 'active')
           ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'superadmin', subscription_status = 'active', company = 'AIChat Norge AS / Vikingnet', company_id = 'comp-001'`,
          [userRecord.id || 'u-admin-123', userRecord.email, newHash, userRecord.displayName || (userRecord.email?.includes('fredrik') ? 'Fredrik R. Ellingsen' : 'Ken (Admin)')]
        );
        if (inMemoryStore.users) {
          const memUser = inMemoryStore.users.find(u => u.id === userRecord.id || u.email?.toLowerCase() === userRecord.email?.toLowerCase());
          if (memUser) {
            memUser.password = newHash;
            memUser.role = 'superadmin';
            memUser.company = 'AIChat Norge AS / Vikingnet';
            memUser.companyId = 'comp-001';
          }
        }
      } catch (syncErr) {
        console.warn('Failed to update admin password hash:', syncErr);
      }
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Ugyldig e-post/brukernavn eller passord.' }, { status: 401 });
    }

    const userObj = {
      id: userRecord.id,
      uid: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name || userRecord.displayName || userRecord.email.split('@')[0],
      role: isSystemAdmin ? 'superadmin' : (userRecord.role || 'worker'),
      trade: userRecord.trade || 'Byggmester',
      company: isSystemAdmin ? 'AIChat Norge AS / Vikingnet' : (userRecord.company || 'Mester Entreprenør AS'),
      companyId: isSystemAdmin ? 'comp-001' : (userRecord.company_id || userRecord.companyId || 'comp-001'),
      subscriptionStatus: isSystemAdmin ? 'active' : (userRecord.subscription_status || userRecord.subscriptionStatus || 'active')
    };

    const token = signToken({ id: userObj.id, email: userObj.email, role: userObj.role, companyId: userObj.companyId, company: userObj.company });
    return NextResponse.json({ token, user: userObj });
  } catch (err: any) {
    console.error('Login Error:', err);
    return NextResponse.json({ error: 'Kunne ikke logge inn.' }, { status: 500 });
  }
}
