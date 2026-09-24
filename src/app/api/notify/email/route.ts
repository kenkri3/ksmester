import { NextRequest, NextResponse } from 'next/server';
import { sendSystemEmail } from '@/src/lib/server/emailSender';
import { getUserFromRequest } from '@/src/lib/server/auth';
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

    // 🛡️ SECURITY FIX: Added authentication check to prevent unauthorized email sending (Spam/Phishing Relay)
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, html, text, content, type = 'general', metadata = {} } = body;
    const bodyText = text || content || '';
    const bodyHtml = html || (bodyText ? `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; white-space: pre-wrap; line-height: 1.6; color: #1e293b;">${bodyText}</div>` : '');

    if (!to || (!subject && !bodyText && !bodyHtml)) {
      return NextResponse.json({ error: 'Mottaker (to) og innhold (subject/body) er påkrevd.' }, { status: 400 });
    }

    const sendRes = await sendSystemEmail({
      to,
      subject,
      html: bodyHtml,
      text: bodyText,
      type,
      metadata: { ...metadata, companyId: user.companyId },
      companyId: user.companyId,
      companyName: (user as any)?.company || 'VikingMester',
      authorName: user?.displayName || 'Bruker'
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
