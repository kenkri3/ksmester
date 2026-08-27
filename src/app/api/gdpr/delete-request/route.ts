import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { dbQuery, inMemoryStore, saveCollectionItem } from '@/src/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Uautorisert. Vennligst logg inn.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Brukerforespørsel om sletting iht. GDPR artikkel 17';

    const deleteRequest = {
      id: 'gdpr-del-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      userId: user.id,
      userEmail: user.email,
      companyId: user.companyId,
      reason,
      status: 'pending_review',
      legalNotice: 'Prosjekter, fakturagrunnlag og FDV-dokumentasjon oppbevares iht. lovpålagte krav i Bokføringsloven (§ 13) og Plan- og bygningsloven.',
      requestedAt: new Date().toISOString()
    };

    await saveCollectionItem('gdpr_delete_requests', deleteRequest);

    return NextResponse.json({
      success: true,
      message: 'Din sletteforespørsel er registrert og behandles iht. GDPR artikkel 17 og norske særregler for regnskaps- og byggdokumentasjon.',
      requestId: deleteRequest.id
    });
  } catch (err: any) {
    console.error('GDPR Delete Request Error:', err);
    return NextResponse.json({ error: 'Kunne ikke registrere sletteforespørsel.' }, { status: 500 });
  }
}
