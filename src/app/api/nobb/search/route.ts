import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const apiKey = process.env.NOBB_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'NOBB API-nøkkel ikke konfigurert' }, { status: 403 });
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
