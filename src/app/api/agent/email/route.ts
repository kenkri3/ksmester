import { NextRequest, NextResponse } from 'next/server';
import { sendSystemEmail } from '@/src/lib/server/emailSender';
import { getUserFromRequest, verifyCronOrInternalSecret } from '@/src/lib/server/auth';
import { checkRateLimit, getClientIp } from '@/src/lib/server/rateLimit';

const BOT_API_KEY = process.env.AGENT_API || 'UDuz6jJYyXeVli7LuNyWqNUJHORWZQBDZYeF3sKs';

/**
 * 📬 POST /api/agent/email
 * Direkte Webhook / JSON API endepunkt for Botsify og eksterne agenter.
 * Gjør det mulig å sende e-post via Resend ved å bruke variabler i Botsify (f.eks. {{user_email}}, {{subject}}, {{message}}).
 */
export async function POST(req: NextRequest) {
  try {
    // 🛡️ Rate limiting (maks 20 e-poster per minutt per IP)
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`agent-email:${clientIp}`, { limit: 20, windowMs: 60000 });
    if (!rateCheck.success) {
      return NextResponse.json({
        success: false,
        error: 'For mange henvendelser. Vent litt før du prøver igjen.',
        messages: [{ message: { text: '⚠️ For mange henvendelser. Vennligst vent litt.' } }]
      }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const providedKey = body.bot_key || body.apiKey || token;

    // Autentisering: Enten gyldig bot_key, intern hemmelighet, eller innlogget bruker
    const isBotAuthorized = providedKey && (providedKey === BOT_API_KEY || providedKey === process.env.AGENT_API);
    const isUserAuthorized = Boolean(getUserFromRequest(req)) || verifyCronOrInternalSecret(req);

    if (!isBotAuthorized && !isUserAuthorized) {
      return NextResponse.json({
        success: false,
        error: 'Uautorisert. Vennligst oppgi gyldig bot_key eller API-nøkkel.',
        messages: [{ message: { text: '⛔ Uautorisert tilgang til e-posttjenesten.' } }]
      }, { status: 401 });
    }

    const recipient = (body.to || body.recipient || body.email || body.user_email || '').trim();
    const subject = (body.subject || body.title || body.emne || 'Beskjed fra håndverker').trim();
    const messageText = (body.text || body.message || body.body || body.content || body.tekst || '').trim();
    const company = (body.companyName || body.company || 'Viking Entreprenør AS').trim();
    const author = (body.authorName || body.userName || 'Byggmester').trim();
    const projectName = body.projectName || 'Byggeprosjekt';

    if (!recipient) {
      return NextResponse.json({
        success: false,
        error: 'Mangler mottakers e-postadresse (felt: "to", "email" eller "user_email").',
        messages: [{ message: { text: '⚠️ Kunne ikke sende: Mangler mottakers e-postadresse.' } }]
      }, { status: 400 });
    }

    const sendRes = await sendSystemEmail({
      to: recipient,
      subject: subject,
      text: messageText,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px;">
            <h2 style="color: #0f172a; margin: 0 0 4px 0; font-size: 19px;">${subject}</h2>
            <p style="margin: 0; color: #64748b; font-size: 12px;">Gjelder: ${projectName} • Avsender: ${company}</p>
          </div>
          <div style="white-space: pre-wrap; font-size: 14px; color: #334155; margin-bottom: 24px;">${messageText || 'Se oversendt henvendelse.'}</div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            Sendt via <strong>VikingMester KS</strong> på vegne av <strong>${company}</strong> (${author}).
          </p>
        </div>
      `,
      companyName: company,
      authorName: author
    });

    const isSent = sendRes.success && sendRes.status === 'sent';
    const statusText = isSent
      ? `✅ E-post er nå sendt til ${recipient} via Resend!\nEmne: «${subject}»\nMeldings-ID: ${sendRes.resendId || 'ok'}`
      : `⚠️ Kunne ikke levere e-post til ${recipient}: ${sendRes.message || sendRes.error}`;

    return NextResponse.json({
      success: isSent,
      id: sendRes.id,
      resendId: sendRes.resendId,
      status: sendRes.status,
      message: sendRes.message,
      // Botsify JSON API plugin viser automatisk innholdet i messages-arrayet til brukeren
      messages: [
        {
          message: {
            text: statusText
          }
        }
      ]
    }, { status: isSent ? 200 : 502 });

  } catch (error: any) {
    console.error('Agent email webhook error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Serverfeil ved utsending av e-post',
      messages: [
        {
          message: {
            text: `❌ Teknisk feil ved utsendelse av e-post: ${error.message}`
          }
        }
      ]
    }, { status: 500 });
  }
}
