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

    if (!userRecord) {
      if (userPayload.role === 'admin' || userPayload.email?.toLowerCase().includes('admin') || ['kenkri3@gmail.com', 'aichatnorge@gmail.com'].includes(userPayload.email?.toLowerCase())) {
        userRecord = {
          id: userPayload.id,
          email: userPayload.email,
          displayName: 'Ken (Admin)',
          role: 'admin',
          trade: 'Byggmester',
          company: 'AIChat Norge AS / Vikingnet',
          companyId: userPayload.companyId || 'comp-001',
          subscriptionStatus: 'active'
        };
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    const emailLower = (userRecord.email || '').toLowerCase().trim();
    const isSuper = userRecord.role === 'admin' || userRecord.role === 'superadmin' || 
      ['kenkri3@gmail.com', 'aichatnorge@gmail.com', 'kenneth@aichatnorge.no', 'fredrik.r.ellingsen@gmail.com', 'fredrik@aichatnorge.no', 'admin@vikingmester.no', 'post@vikingent.no'].includes(emailLower) ||
      (userRecord.display_name || userRecord.displayName || '').toLowerCase().includes('ken');

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
      displayName: userRecord.display_name || userRecord.displayName,
      role: isSuper ? 'admin' : userRecord.role,
      trade: userRecord.trade,
      company: userRecord.company,
      companyId: userRecord.company_id || userRecord.companyId,
      subscriptionStatus: currentStatus,
      trialDaysLeft
    };

    return NextResponse.json({ user: userObj });
  } catch (err: any) {
    console.error('Me Auth Error:', err);
    return NextResponse.json({ error: 'Kunne ikke hente bruker.' }, { status: 500 });
  }
}
