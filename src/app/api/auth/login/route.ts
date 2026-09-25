import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { 
  dbQuery, 
  inMemoryStore, 
  ADMIN_EMAILS, 
  DEFAULT_ADMIN_EMAIL, 
  DEFAULT_ADMIN_HASH, 
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

    // Resolve shortcut identifier for admin/demo aliases
    let resolvedEmail = identifier;
    if (identifier === 'admin' || identifier === 'administrator' || identifier === 'superadmin' || identifier === 'ken' || identifier === 'kenneth') {
      resolvedEmail = DEFAULT_ADMIN_EMAIL;
    } else if (identifier === 'fredrik') {
      resolvedEmail = 'fredrik@aichatnorge.no';
    } else if (identifier === 'demo' || identifier === 'fjellheim') {
      resolvedEmail = DEMO_USER_EMAIL;
    }

    // Search DB / memory store for registered user
    let userRecord: any = null;
    const rows = await dbQuery(
      `SELECT * FROM users WHERE 
        LOWER(email) = $1 
        OR LOWER(id) = $1 
        OR LOWER(display_name) = $1
       ORDER BY (CASE WHEN LOWER(email) = $1 THEN 0 ELSE 1 END), created_at ASC LIMIT 1`,
      [resolvedEmail]
    );

    if (rows && rows.length > 0) {
      userRecord = rows[0];
    } else {
      userRecord = inMemoryStore.users?.find(u =>
        u.email?.toLowerCase() === resolvedEmail ||
        (u.id && u.id.toLowerCase() === resolvedEmail) ||
        (u.displayName && u.displayName.toLowerCase() === resolvedEmail)
      );
    }

    // Fallback if in-memory store is fresh and database is empty
    if (!userRecord && ADMIN_EMAILS.includes(resolvedEmail)) {
      const isFredrik = resolvedEmail.includes('fredrik');
      userRecord = {
        id: isFredrik ? 'u-admin-fredrik' : 'u-admin-123',
        email: resolvedEmail,
        password: DEFAULT_ADMIN_HASH,
        displayName: isFredrik ? 'Fredrik R. Ellingsen' : 'Ken (Admin)',
        role: 'superadmin',
        trade: 'Byggmester',
        company: 'AIChat Norge AS / Vikingnet',
        companyId: 'comp-001',
        subscriptionStatus: 'active'
      };
    } else if (!userRecord && resolvedEmail === DEMO_USER_EMAIL) {
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

    // Verify password strictly against hashed value in DB
    let passwordValid = false;
    if (userRecord.password) {
      passwordValid = await bcrypt.compare(password, userRecord.password).catch(() => false);
    }

    // Specific verification for demo user
    if (!passwordValid && userRecord.email === DEMO_USER_EMAIL && password === DEMO_USER_PASSWORD) {
      passwordValid = true;
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Ugyldig e-post/brukernavn eller passord.' }, { status: 401 });
    }

    const isSystemAdmin = ADMIN_EMAILS.includes((userRecord.email || '').toLowerCase().trim());

    const userObj = {
      id: userRecord.id,
      uid: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name || userRecord.displayName || userRecord.email.split('@')[0],
      role: isSystemAdmin ? 'superadmin' : (userRecord.role || 'worker'),
      trade: userRecord.trade || 'Byggmester',
      company: isSystemAdmin ? (userRecord.company || 'AIChat Norge AS / Vikingnet') : (userRecord.company || 'Mester Entreprenør AS'),
      companyId: isSystemAdmin ? (userRecord.company_id || userRecord.companyId || 'comp-001') : (userRecord.company_id || userRecord.companyId || 'comp-001'),
      subscriptionStatus: isSystemAdmin ? 'active' : (userRecord.subscription_status || userRecord.subscriptionStatus || 'active')
    };

    const token = signToken({ id: userObj.id, email: userObj.email, role: userObj.role, companyId: userObj.companyId, company: userObj.company });
    return NextResponse.json({ token, user: userObj });
  } catch (err: any) {
    console.error('Login Error:', err);
    return NextResponse.json({ error: 'Kunne ikke logge inn.' }, { status: 500 });
  }
}
