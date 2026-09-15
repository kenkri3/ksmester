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

    const userObj = {
      id: userRecord.id,
      uid: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name || userRecord.displayName,
      role: userRecord.role,
      trade: userRecord.trade,
      company: userRecord.company,
      companyId: userRecord.company_id || userRecord.companyId,
      subscriptionStatus: userRecord.subscription_status || userRecord.subscriptionStatus
    };

    return NextResponse.json({ user: userObj });
  } catch (err: any) {
    console.error('Me Auth Error:', err);
    return NextResponse.json({ error: 'Kunne ikke hente bruker.' }, { status: 500 });
  }
}
