import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { getCollectionItems } from '@/src/lib/server/db';

export async function GET(req: NextRequest) {
  // 🛡️ SECURITY FIX: Enforce authentication to prevent unauthorized API credit usage
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  // 1. Sjekk om bedriften har lagt inn egen NOBB API-nøkkel i innstillinger (BYOK)
  let apiKey = process.env.NOBB_API_KEY;
  try {
    const integrations = await getCollectionItems('integrations');
    const companyNobb = integrations.find((i: any) => 
      (i.service?.toUpperCase() === 'NOBB') && 
      (user.role === 'admin' || i.companyId === user.companyId) && 
      i.status === 'active' &&
      i.secretToken?.trim()
    );
    if (companyNobb?.secretToken?.trim()) {
      apiKey = companyNobb.secretToken.trim();
    }
  } catch (dbErr) {
    console.warn('[NOBB Search] Feil ved oppslag av bedriftsintegrasjon:', dbErr);
  }

  if (!apiKey) {
    return NextResponse.json({ 
      error: 'NOBB API-nøkkel ikke konfigurert',
      hint: 'Bedriften kan legge inn sin egen NOBB API-nøkkel under Innstillinger -> Integrasjoner'
    }, { status: 403 });
  }

  try {
    const response = await fetch(`https://export.byggtjeneste.no/api/v1/items?q=${encodeURIComponent(q)}`, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey, Accept: 'application/json' }
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Kunne ikke søke i NOBB' }, { status: 500 });
  }
}
