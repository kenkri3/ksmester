import { NextRequest, NextResponse } from 'next/server';
import { getPartnershipAccountingSummary } from '@/src/lib/server/costTracker';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { getCollectionItems } from '@/src/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get('month') || undefined;
    const adminKey = url.searchParams.get('adminKey') || req.headers.get('x-admin-key');
    const user = getUserFromRequest(req);

    // 🛡️ Sikker tilgangskontroll: Kun autorisert admin (JWT eller hemmelig adminnøkkel/intern hemmelighet)
    const isAuthorized = 
      (user && user.role === 'admin') ||
      (adminKey && Boolean(process.env.ADMIN_PASSWORD) && adminKey === process.env.ADMIN_PASSWORD) ||
      (adminKey && Boolean(process.env.INTERNAL_API_SECRET) && adminKey === process.env.INTERNAL_API_SECRET);

    if (!isAuthorized) {
      return NextResponse.json({ 
        error: 'Uautorisert tilgang. Krever gyldig admin-innlogging eller administrativ nøkkel.' 
      }, { status: 401 });
    }

    const summary = await getPartnershipAccountingSummary(month);

    // Hent også alle leads for full åpenhet
    const allLeads = await getCollectionItems('leads');
    const larsLead = allLeads.find((l: any) => 
      (l.name && l.name.toLowerCase().includes('lars')) ||
      (l.email && l.email.toLowerCase().includes('lars')) ||
      (l.plan && l.plan.toLowerCase().includes('entreprenor'))
    );

    return NextResponse.json({
      success: true,
      data: summary,
      registeredLeadsCount: allLeads.length,
      searchedLeadLars: larsLead || null,
      generatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
