import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, inMemoryStore } from '@/src/lib/server/db';
import { getUserFromRequest } from '@/src/lib/server/auth';

export async function GET(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let userRecord: any = null;
    const rows = await dbQuery('SELECT * FROM users WHERE id = $1 OR LOWER(email) = LOWER($2)', [userPayload.id, userPayload.email]);
    if (rows && rows.length > 0) {
      userRecord = rows[0];
    } else {
      userRecord = inMemoryStore.users?.find(u => u.id === userPayload.id || u.email?.toLowerCase() === userPayload.email?.toLowerCase());
    }

    const emailLower = (userRecord?.email || userPayload.email || '').toLowerCase().trim();
    const defaultAdmin = (process.env.ADMIN_EMAIL || 'kenkri3@gmail.com').toLowerCase();
    const isSuper = userRecord?.role === 'superadmin' || 
      [defaultAdmin, 'kenkri3@gmail.com', 'aichatnorge@gmail.com', 'kenneth@aichatnorge.no', 'fredrik.r.ellingsen@gmail.com', 'fredrik@aichatnorge.no', 'admin@vikingmester.no', 'post@vikingent.no'].includes(emailLower);

    if (!userRecord) {
      if (isSuper) {
        userRecord = {
          id: userPayload.id,
          email: userPayload.email,
          displayName: emailLower.includes('fredrik') ? 'Fredrik R. Ellingsen' : 'Ken (Admin)',
          role: 'superadmin',
          trade: 'Byggmester',
          company: 'AIChat Norge AS / Vikingnet',
          companyId: 'comp-001',
          subscriptionStatus: 'active'
        };
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    let currentStatus = isSuper ? 'active' : (userRecord.subscription_status || userRecord.subscriptionStatus || 'trial');
    let trialDaysLeft: number | null = null;

    if (!isSuper && currentStatus === 'trial') {
      const rawStart = userRecord.trial_start_date || userRecord.trialStartDate || userRecord.created_at || userRecord.createdAt;
      const startDate = rawStart ? new Date(rawStart) : new Date();
      const diffMs = Date.now() - startDate.getTime();
      const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      trialDaysLeft = Math.max(0, 14 - daysPassed);

      if (trialDaysLeft <= 0) {
        currentStatus = 'expired';
        trialDaysLeft = 0;
        await dbQuery('UPDATE users SET subscription_status = $1 WHERE id = $2', ['expired', userRecord.id]).catch(() => {});
        if (inMemoryStore.users) {
          const mem = inMemoryStore.users.find(u => u.id === userRecord.id);
          if (mem) mem.subscriptionStatus = 'expired';
        }
      }
    }

    const userObj = {
      id: userRecord.id,
      uid: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name || userRecord.displayName || (emailLower.includes('fredrik') ? 'Fredrik R. Ellingsen' : userRecord.email.split('@')[0]),
      role: isSuper ? 'superadmin' : (userRecord.role || 'worker'),
      trade: userRecord.trade || 'Byggmester',
      company: isSuper ? 'AIChat Norge AS / Vikingnet' : (userRecord.company || 'Min Bedrift'),
      companyId: isSuper ? 'comp-001' : (userRecord.company_id || userRecord.companyId || 'comp-default'),
      subscriptionStatus: currentStatus,
      trialDaysLeft
    };

    return NextResponse.json({ user: userObj });
  } catch (err: any) {
    console.error('Me Auth Error:', err);
    return NextResponse.json({ error: 'Kunne ikke hente bruker.' }, { status: 500 });
  }
}
