import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItems, updateCollectionItem } from '@/src/lib/server/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const email = searchParams.get('email');

  if (!id && !email) {
    return new NextResponse(renderHtml('Ugyldig avmeldingsforespørsel.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  try {
    const allNurtures = await getCollectionItems('customer_nurtures');
    const record = allNurtures.find(
      (n: any) => (id && n.id === id) || (email && n.email?.toLowerCase() === email.toLowerCase().trim())
    );

    if (record) {
      await updateCollectionItem('customer_nurtures', record.id, {
        status: 'unsubscribed',
        unsubscribed: true,
        unsubscribedAt: new Date().toISOString()
      });
    }

    return new NextResponse(
      renderHtml('Du er nå avmeldt oppfølgingse-poster og tips om andre tjenester fra VikingMester.', true),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  } catch (error: any) {
    console.error('Unsubscribe error:', error);
    return new NextResponse(renderHtml('Kunne ikke behandle avmeldingen akkurat nå.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

function renderHtml(message: string, isSuccess: boolean): string {
  return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Avmelding • VikingMester</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #F8FAFC;
      color: #0F172A;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: white;
      border: 1px solid #E2E8F0;
      border-radius: 20px;
      padding: 36px 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      background: ${isSuccess ? '#ECFDF5' : '#FEF2F2'};
      color: ${isSuccess ? '#10B981' : '#EF4444'};
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 12px;
      color: #0F172A;
    }
    p {
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    a.btn {
      display: inline-block;
      background: #0F172A;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      transition: background 0.2s;
    }
    a.btn:hover {
      background: #1E293B;
    }
    .subtext {
      margin-top: 20px;
      font-size: 11px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isSuccess ? '✓' : '!'}</div>
    <h1>${isSuccess ? 'Bekreftet avmeldt' : 'Noe gikk galt'}</h1>
    <p>${message}</p>
    <a href="https://vikingmester.no" class="btn">Tilbake til VikingMester</a>
    <div class="subtext">
      VikingMester • hei@vikingmester.no<br>
      Kritiske driftsmeldinger for din aktive lisens påvirkes ikke av denne avmeldingen.
    </div>
  </div>
</body>
</html>`;
}
