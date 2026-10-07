import { NextRequest, NextResponse } from 'next/server';
import { getActualIntegrationsStatus } from '@/src/lib/server/integrationsService';
import { getUserFromRequest, isUserSuperAdmin } from '@/src/lib/server/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Uautorisert tilgang' }, { status: 401 });
    }

    // SIKKERHETSFIKS (E-17 + E-28): Ruten var uautentisert, og for role 'admin'
    // sendte den `undefined` videre, som i integrationsService betyr "vis alle
    // bedrifters integrasjoner". En kundeadministrator - eller en hvilken som
    // helst uinnlogget part - fikk dermed oversikt over hvilke tjenester ALLE
    // kunder har koblet til. Na: innlogging kreves, og global oversikt er
    // forbeholdt SuperAdmin ('all'). Alle andre ser kun sin egen bedrift.
    const scope = isUserSuperAdmin(user) ? 'all' : (user.companyId || '');
    if (!scope) {
      return NextResponse.json({ error: 'Brukeren mangler bedriftstilknytning' }, { status: 403 });
    }

    const status = await getActualIntegrationsStatus(scope);
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('Error fetching integration status:', err);
    return NextResponse.json({ error: 'Kunne ikke hente integrasjonsstatus' }, { status: 500 });
  }
}
