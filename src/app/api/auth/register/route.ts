import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { dbQuery, inMemoryStore, DEFAULT_ADMIN_EMAIL } from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    // 🛡️ SECURITY FIX: Removed 'role' from destructured fields to prevent Mass Assignment/Privilege Escalation
    const { email, password, name, company, trade } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-post og passord påkrevd.' }, { status: 400 });
    }

    let existingUser: any = null;
    const rows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1', [email.toLowerCase()]);
    if (rows && rows.length > 0) {
      existingUser = rows[0];
    } else {
      existingUser = inMemoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (existingUser) {
      return NextResponse.json({ error: 'En bruker med denne e-posten finnes allerede.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'u-' + Math.random().toString(36).substring(2, 9);
    const companyId = 'comp-' + Math.random().toString(36).substring(2, 7);

    // 🛡️ SECURITY FIX: Enforce worker role unless it's the designated admin email
    const userObj = {
      id: userId,
      email: email.toLowerCase(),
      displayName: name || email.split('@')[0],
      role: email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'worker',
      trade: trade || 'Tømrer',
      company: company || 'Mester Entreprenør AS',
      companyId: companyId,
      subscriptionStatus: 'active',
      createdAt: new Date().toISOString()
    };

    await dbQuery(
      `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userObj.id, userObj.email, hashedPassword, userObj.displayName, userObj.role, userObj.trade, userObj.company, userObj.companyId, userObj.subscriptionStatus]
    );

    inMemoryStore.users.push({ ...userObj, password: hashedPassword });

    const token = signToken({ id: userObj.id, email: userObj.email, role: userObj.role, companyId: userObj.companyId });
    return NextResponse.json({ token, user: userObj });
  } catch (err: any) {
    console.error('Register Error:', err);
    return NextResponse.json({ error: 'Kunne ikke registrere bruker.' }, { status: 500 });
  }
}
