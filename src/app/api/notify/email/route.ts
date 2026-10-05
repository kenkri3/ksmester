import { NextRequest, NextResponse } from 'next/server';
import { sendSystemEmail } from '@/src/lib/server/emailSender';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { getCollectionItems } from '@/src/lib/server/db';
import { checkRateLimit, getClientIp } from '@/src/lib/server/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // 🛡️ SECURITY: Rate limiting per IP (maks 15 e-poster per minutt)
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`email:${clientIp}`, { limit: 15, windowMs: 60000 });
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'For mange henvendelser. Vennligst vent litt før du prøver igjen.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.reset) } }
      );
    }

    const body = await req.json();
    const { to, subject, html, text, content, type = 'general', metadata = {}, token: tokenParam, changeOrderToken } = body;
    const bodyText = text || content || '';
    const bodyHtml = html || (bodyText ? `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; white-space: pre-wrap; line-height: 1.6; color: #1e293b;">${bodyText}</div>` : '');

    const user = getUserFromRequest(req);
    let companyId = user?.companyId || 'comp-001';
    let companyName = (user as any)?.company || 'VikingMester';
    let authorName = user?.displayName || 'Bruker';
    let recipientEmail = to;

    // If unauthenticated, allow only if valid capability token is provided (e.g. customer signed change order or accepted offer)
    if (!user) {
      const activeToken = tokenParam || changeOrderToken || metadata?.token || metadata?.changeOrderToken;
      if (!activeToken) {
        return NextResponse.json({ error: 'Uautorisert tilgang.' }, { status: 401 });
      }

      const [changeOrders, offers] = await Promise.all([
        getCollectionItems('change_orders').catch(() => []),
        getCollectionItems('offers').catch(() => [])
      ]);

      // SIKKERHETSFIKS (E-14): her ble `o.id === activeToken` godtatt som gyldig
      // capability-token. En ID er ikke en hemmelighet — den er synlig i lister,
      // logger og delte lenker — sa hvem som helst som kjente en ordre-ID kunne
      // bruke ruten som e-postrelay. Na kreves det faktiske tokenet.
      const foundOrder = changeOrders.find((o: any) => o.token === activeToken);
      const foundOffer = !foundOrder ? offers.find((o: any) => o.token === activeToken) : null;

      if (foundOrder) {
        companyId = foundOrder.companyId || 'comp-001';
        companyName = foundOrder.company || 'VikingMester';
        authorName = foundOrder.clientName || 'Kunde';
        // SIKKERHETSFIKS (E-14): mottakeren ble tatt fra body nar den var oppgitt,
        // sa en uinnlogget part kunne sende til vilkarlig adresse. Uten sesjon
        // sendes det na kun til ordrens registrerte kunde.
        recipientEmail = foundOrder.clientEmail || foundOrder.authorEmail || foundOrder.companyEmail || recipientEmail;
      } else if (foundOffer) {
        companyId = foundOffer.companyId || 'comp-001';
        companyName = foundOffer.company || 'VikingMester';
        authorName = foundOffer.clientName || 'Kunde';
        recipientEmail = foundOffer.clientEmail || foundOffer.authorEmail || foundOffer.companyEmail || recipientEmail;
      } else {
        return NextResponse.json({ error: 'Ugyldig eller utløpt sikkerhetstoken.' }, { status: 403 });
      }
    }

    if (!recipientEmail || (!subject && !bodyText && !bodyHtml)) {
      return NextResponse.json({ error: 'Mottaker (to) og innhold (subject/body) er påkrevd.' }, { status: 400 });
    }

    const sendRes = await sendSystemEmail({
      to: recipientEmail,
      subject,
      html: bodyHtml,
      text: bodyText,
      type,
      metadata: { ...metadata, companyId },
      companyId,
      companyName,
      authorName
    });

    const isSent = sendRes.success && sendRes.status === 'sent';
    return NextResponse.json({
      success: isSent,
      message: sendRes.message,
      id: sendRes.id,
      resendId: sendRes.resendId,
      status: sendRes.status,
      fromUsed: sendRes.fromUsed
    }, { status: isSent ? 200 : 502 });
  } catch (error: any) {
    console.error('Email dispatch error:', error);
    return NextResponse.json({ error: error.message || 'Kunne ikke sende e-post.' }, { status: 500 });
  }
}
