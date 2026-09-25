import { NextRequest, NextResponse } from 'next/server';
import { getActualIntegrationsStatus } from '@/src/lib/server/integrationsService';
import { getUserFromRequest } from '@/src/lib/server/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const companyId = user?.companyId || 'comp-001';
    const status = await getActualIntegrationsStatus(user?.role === 'admin' ? undefined : companyId);
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('Error fetching integration status:', err);
    return NextResponse.json({ error: err.message || 'Kunne ikke hente integrasjonsstatus' }, { status: 500 });
  }
}
