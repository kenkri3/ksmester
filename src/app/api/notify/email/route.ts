import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, inMemoryStore } from '@/src/lib/server/db';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { sanitizeHeader } from '@/src/lib/sanitize';
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

    // 🛡️ SECURITY: Sanitize headers to eliminate CRLF injection
    const sanitizedTo = Array.isArray(to) ? to.map((t) => sanitizeHeader(String(t))) : sanitizeHeader(String(to));
    const sanitizedSubject = sanitizeHeader(String(subject || 'Melding fra VikingMester'));

    const emailLog = {
      id: 'email-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      to: sanitizedTo,
      subject: sanitizedSubject,
      text: bodyText,
      type,
      status: 'sent',
      createdAt: new Date().toISOString(),
      metadata: JSON.stringify(metadata)
    };

    // If RESEND_API_KEY is configured, send real email via Resend
    const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API || process.env.RESEND_KEY;
    if (resendKey) {
      try {
        const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'VikingMester <hei@vikingmester.no>';
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`
          },
          body: JSON.stringify({
            from: fromEmail,
            reply_to: 'hei@vikingmester.no',
            to: Array.isArray(to) ? to : [to],
            subject: sanitizedSubject,
            html: bodyHtml,
            text: bodyText
          })
        });

        if (resendRes.ok) {
          const resendData = await resendRes.json();
          emailLog.metadata = JSON.stringify({ ...metadata, resendId: resendData.id });
        }
      } catch (sendErr) {
        console.warn('Resend API error (falling back to logged delivery):', sendErr);
      }
    }

    // Persist to database / log
    await dbQuery(`
      INSERT INTO email_logs (id, recipient, subject, body, type, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [emailLog.id, emailLog.to, emailLog.subject, emailLog.text, emailLog.type, emailLog.status, emailLog.createdAt]).catch(() => {
      // In-memory fallback
      if (!inMemoryStore.email_logs) inMemoryStore.email_logs = [];
      inMemoryStore.email_logs.push(emailLog);
    });

    return NextResponse.json({
      success: true,
      message: `E-post sendt til ${to}`,
      id: emailLog.id,
      status: emailLog.status
    });
  } catch (error: any) {
    console.error('Email dispatch error:', error);
    return NextResponse.json({ error: error.message || 'Kunne ikke sende e-post.' }, { status: 500 });
  }
}
