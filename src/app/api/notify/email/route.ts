import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, inMemoryStore } from '@/src/lib/server/db';
import { getUserFromRequest } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    // 🛡️ SECURITY FIX: Added authentication check to prevent unauthorized email sending (Spam/Phishing Relay)
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, html, text, type = 'general', metadata = {} } = body;

    if (!to || (!subject && !text && !html)) {
      return NextResponse.json({ error: 'Mottaker (to) og innhold (subject/body) er påkrevd.' }, { status: 400 });
    }

    const emailLog = {
      id: 'email-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      to,
      subject: subject || 'Melding fra KS MesterAI',
      text: text || '',
      type,
      status: 'sent',
      createdAt: new Date().toISOString(),
      metadata: JSON.stringify(metadata)
    };

    // If RESEND_API_KEY is configured, send real email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'KS MesterAI <varsel@ksmester.no>',
            to: Array.isArray(to) ? to : [to],
            subject: subject || 'Melding fra KS MesterAI',
            html: html || `<p>${text}</p>`
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
