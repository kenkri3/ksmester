import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { dbQuery, inMemoryStore, saveCollectionItem, ADMIN_EMAILS } from '@/src/lib/server/db';
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

    const isSuperAdminEmail = 
      ADMIN_EMAILS.includes(emailLower) || 
      ['kenkri3@gmail.com', 'aichatnorge@gmail.com', 'kenneth@aichatnorge.no', 'fredrik.r.ellingsen@gmail.com', 'fredrik@aichatnorge.no', 'admin@vikingmester.no', 'post@vikingent.no'].includes(emailLower);

    let existingUser: any = null;
    const rows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1', [emailLower]);
    if (rows && rows.length > 0) {
      existingUser = rows[0];
    } else {
      existingUser = inMemoryStore.users?.find(u => u.email.toLowerCase() === emailLower);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Dersom en SuperAdmin (f.eks. fredrik@aichatnorge.no) oppretter eller oppdaterer passordet sitt
    if (existingUser) {
      if (isSuperAdminEmail) {
        await dbQuery(
          `UPDATE users SET password = $1, role = 'superadmin', company = 'AIChat Norge AS / Vikingnet', company_id = 'comp-001', subscription_status = 'active' WHERE LOWER(email) = $2`,
          [hashedPassword, emailLower]
        ).catch(() => {});
        if (inMemoryStore.users) {
          const mem = inMemoryStore.users.find(u => u.email.toLowerCase() === emailLower);
          if (mem) {
            mem.password = hashedPassword;
            mem.role = 'superadmin';
            mem.company = 'AIChat Norge AS / Vikingnet';
            mem.companyId = 'comp-001';
            mem.subscriptionStatus = 'active';
          }
        }
        const updatedUser = {
          id: existingUser.id,
          uid: existingUser.id,
          email: emailLower,
          displayName: name?.trim() || existingUser.display_name || existingUser.displayName || (emailLower.includes('fredrik') ? 'Fredrik R. Ellingsen' : 'Kenneth Kristiansen'),
          role: 'superadmin',
          trade: 'Byggmester',
          company: 'AIChat Norge AS / Vikingnet',
          companyId: 'comp-001',
          subscriptionStatus: 'active'
        };
        const token = signToken({ id: updatedUser.id, email: updatedUser.email, role: 'superadmin', companyId: 'comp-001', company: updatedUser.company });
        return NextResponse.json({ token, user: updatedUser, message: 'SuperAdmin-konto aktivert med full tilgang!' });
      }
      return NextResponse.json({ error: 'En bruker med denne e-posten er allerede registrert. Logg inn i stedet.' }, { status: 409 });
    }

    const userId = isSuperAdminEmail && emailLower.includes('fredrik') ? 'u-admin-fredrik' : ('u-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7));
    const companyId = isSuperAdminEmail ? 'comp-001' : ('comp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7));
    const finalRole = isSuperAdminEmail ? 'superadmin' : 'leader';
    const finalCompany = isSuperAdminEmail ? 'AIChat Norge AS / Vikingnet' : (company?.trim() || 'Ny Bedrift AS');
    const finalStatus = isSuperAdminEmail ? 'active' : 'trial';

    const userObj = {
      id: userId,
      uid: userId,
      email: emailLower,
      displayName: name?.trim() || (isSuperAdminEmail ? (emailLower.includes('fredrik') ? 'Fredrik R. Ellingsen' : 'Kenneth Kristiansen') : email.split('@')[0]),
      role: finalRole,
      trade: trade || 'Byggmester',
      company: finalCompany,
      orgnr: isSuperAdminEmail ? '933 607 779' : (cleanOrgnr || null),
      companyId: companyId,
      subscriptionStatus: finalStatus,
      gdprConsent: true,
      gdprConsentAt: new Date().toISOString(),
      gdprConsentIp: clientIp,
      createdAt: new Date().toISOString()
    };

    await dbQuery(
      `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status, orgnr)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, company = EXCLUDED.company, company_id = EXCLUDED.company_id, subscription_status = EXCLUDED.subscription_status`,
      [userObj.id, userObj.email, hashedPassword, userObj.displayName, userObj.role, userObj.trade, userObj.company, userObj.companyId, userObj.subscriptionStatus, userObj.orgnr]
    ).catch(() => {});

    if (!inMemoryStore.users) inMemoryStore.users = [];
    inMemoryStore.users.push({ ...userObj, password: hashedPassword });

    // Opprett også bedriftsoppføring i companies-samlingen så SuperAdmin har full oversikt
    const companyData = {
      id: companyId,
      name: userObj.company,
      orgnr: isSuperAdminEmail ? '933 607 779' : (cleanOrgnr || ''),
      contactName: userObj.displayName,
      email: emailLower,
      phone: '401 63 082',
      plan: isSuperAdminEmail ? 'internal' : 'pro',
      status: 'active',
      subscriptionStatus: finalStatus,
      isInternal: isSuperAdminEmail,
      monthlyPrice: isSuperAdminEmail ? 0 : 3490,
      modules: ['all_modules', 'projects', 'checklists', 'deviations', 'ai', 'economy', 'fdv', 'inventory', 'vehicle', 'time', 'apprentice', 'building_app'],
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
