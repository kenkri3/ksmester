import { NextRequest, NextResponse } from 'next/server';
import { getPartnershipAccountingSummary } from '@/src/lib/server/costTracker';
import { getUserFromRequest, isUserSuperAdmin, verifyInternalSecret } from '@/src/lib/server/auth';
import { getCollectionItems } from '@/src/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get('month') || undefined;
    const user = getUserFromRequest(req);

    // SIKKERHETSFIKS (E-23 + E-17): Grenen godtok admin-passordet som
    // QUERY-PARAMETER (?adminKey=...), som havner i access-logger, proxy-logger
    // og nettleserhistorikk, og sammenlignet det med vanlig === (ikke
    // timing-sikkert). Den godtok i tillegg role === 'admin', som er en
    // BEDRIFTSADMINISTRATOR - ikke plattform-eier - og returnerte dermed
    // partnerskapsregnskap og alle leads pa tvers av bedrifter til en
    // vanlig kundeadmin. Na: kun SuperAdmin, eller en timing-sikker
    // intern-hemmelighet i header. Query-varianten er fjernet helt.
    const isAuthorized = isUserSuperAdmin(user) || verifyInternalSecret(req);

    if (!isAuthorized) {
      return NextResponse.json({
        error: 'Uautorisert tilgang. Krever SuperAdmin-innlogging eller intern hemmelighet i header.'
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
    // SIKKERHETSFIKS (E-29): logg detaljene server-side, ikke til klienten.
    console.error('Error in GET /api/accounting/summary:', err);
    return NextResponse.json({ error: 'Kunne ikke hente regnskapssammendrag.' }, { status: 500 });
  }
}
