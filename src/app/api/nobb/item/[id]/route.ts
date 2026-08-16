import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const apiKey = process.env.NOBB_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'NOBB API-nøkkel ikke konfigurert' }, { status: 403 });
  }

  try {
    const response = await fetch(`https://export.byggtjeneste.no/api/v1/items/${id}`, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey, Accept: 'application/json' }
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Kunne ikke hente NOBB-vare' }, { status: 500 });
  }
}
