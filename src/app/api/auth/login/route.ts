import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { dbQuery, inMemoryStore, ADMIN_EMAILS } from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = (body.email || body.username || '').toLowerCase().trim();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Både e-post/brukernavn og passord må fylles ut.' }, { status: 400 });
    }

    // Search DB / memory store for registered users
    let userRecord: any = null;
    const rows = await dbQuery(
      'SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(id) = $1 OR LOWER(display_name) = $1',
      [identifier]
    );

    if (rows && rows.length > 0) {
      userRecord = rows[0];
    } else {
      userRecord = inMemoryStore.users?.find(u =>
        u.email.toLowerCase() === identifier ||
        (u.id && u.id.toLowerCase() === identifier) ||
        (u.displayName && u.displayName.toLowerCase() === identifier)
      );
    }

    if (!userRecord) {
      return NextResponse.json({ error: 'Ugyldig e-post/brukernavn eller passord.' }, { status: 401 });
    }

    // Verify password strictly against hashed value in DB
    const passwordValid = await bcrypt.compare(password, userRecord.password).catch(() => false);
    
    if (!passwordValid) {
      return NextResponse.json({ error: 'Ugyldig e-post/brukernavn eller passord.' }, { status: 401 });
    }

    const isSystemAdmin = ADMIN_EMAILS.includes(userRecord.email.toLowerCase().trim()) || userRecord.role === 'admin';

    const userObj = {
      id: userRecord.id,
      uid: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name || userRecord.displayName || userRecord.email.split('@')[0],
      role: isSystemAdmin ? 'admin' : (userRecord.role || 'worker'),
      trade: userRecord.trade || 'Byggmester',
      company: isSystemAdmin ? 'AIChat Norge AS / Vikingnet' : (userRecord.company || 'Mester Entreprenør AS'),
      companyId: userRecord.company_id || userRecord.companyId || 'comp-001',
      subscriptionStatus: isSystemAdmin ? 'active' : (userRecord.subscription_status || userRecord.subscriptionStatus || 'active')
    };

    const token = signToken({ id: userObj.id, email: userObj.email, role: userObj.role, companyId: userObj.companyId });
    return NextResponse.json({ token, user: userObj });
  } catch (err: any) {
    console.error('Login Error:', err);
    return NextResponse.json({ error: 'Kunne ikke logge inn.' }, { status: 500 });
  }
}
