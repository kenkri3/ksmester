import { NextRequest, NextResponse } from 'next/server';
import { sendSystemEmail, cleanMarkdownForEmail } from '@/src/lib/server/emailSender';
import { getUserFromRequest, verifyCronOrInternalSecret, isUserSuperAdmin } from '@/src/lib/server/auth';
import { checkRateLimit, getClientIp } from '@/src/lib/server/rateLimit';
import { timingSafeEqual } from 'crypto';

/**
 * 🛡️ SIKKERHETSFIKS (P0): Hardkodet bot-nøkkel er fjernet.
 *
 * Den gamle fallbacken ('UDuz...') lå i klartekst i kildekoden — og dermed
 * offentlig i git-historikken — og fungerte samtidig som innloggingsnøkkel
 * for dette endepunktet. Nøkkelen leses nå KUN fra AGENT_API.
 *
 * Er AGENT_API ikke satt, er bot-innlogging deaktivert (fail-closed), mens
 * innloggede brukere og cron/interne kall fortsatt slipper inn.
 *
 * ⚠️ Den gamle nøkkelen MÅ roteres i Botsify — den skal anses som kompromittert.
 */
const BOT_API_KEY = process.env.AGENT_API;

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

    // 🛡️ Hent parametere fra URL, JSON body eller form-data
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        formData.forEach((val, key) => { body[key] = typeof val === 'string' ? val : val.name; });
      }
    } else {
      body = await req.json().catch(() => ({}));
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const queryKey = req.nextUrl.searchParams.get('bot_key') || req.nextUrl.searchParams.get('apiKey') || req.nextUrl.searchParams.get('key');
    const providedKey = body.bot_key || body.apiKey || token || queryKey;

    // Autentisering: gyldig bot_key, intern hemmelighet, eller SuperAdmin.
    const user = getUserFromRequest(req);
    // SIKKERHETSFIKS (E-16): nokkelsammenligningen var vanlig ===, som lekker
    // lengde- og prefiksinformasjon gjennom tidsforskjeller. Na timing-sikker.
    const keyMatches = (candidate: string | undefined, expected: string | undefined): boolean => {
      if (!candidate || !expected) return false;
      const a = Buffer.from(candidate);
      const b = Buffer.from(expected);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    };
    const isBotAuthorized = keyMatches(providedKey, BOT_API_KEY) || keyMatches(providedKey, process.env.AGENT_API);
    // SIKKERHETSFIKS (E-16): for var `Boolean(user)` nok. Enhver innlogget bruker -
    // ogsa en selvregistrert trial-konto - kunne dermed sende vilkarlig e-post til
    // vilkarlig mottaker, med valgfritt avsendernavn og reply-to, fra plattformens
    // verifiserte domene. Ruten har ingen interne kallere, sa kravet kan strammes
    // uten a bryte noen flyt.
    const isUserAuthorized = isUserSuperAdmin(user) || verifyCronOrInternalSecret(req);

    if (!isBotAuthorized && !isUserAuthorized) {
      return NextResponse.json({
        success: false,
        error: 'Uautorisert. Vennligst oppgi gyldig bot_key eller API-nøkkel.',
        messages: [{ message: { text: '⛔ Uautorisert tilgang til e-posttjenesten. Mangler gyldig bot_key.' } }]
      }, { status: 401 });
    }

    const recipient = (
      body.to || 
      body.recipient || 
      body.email || 
      body.user_email || 
      body.client_email || 
      body.customer_email || 
      req.nextUrl.searchParams.get('to') || 
      req.nextUrl.searchParams.get('email') || 
      ''
    ).trim();

    const subject = (
      body.subject || 
      body.title || 
      body.emne || 
      req.nextUrl.searchParams.get('subject') || 
      req.nextUrl.searchParams.get('emne') || 
      'Beskjed fra håndverker'
    ).trim();

    const messageText = (
      body.text || 
      body.message || 
      body.body || 
      body.content || 
      body.tekst || 
      body.msg || 
      body.description || 
      req.nextUrl.searchParams.get('message') || 
      req.nextUrl.searchParams.get('text') || 
      ''
    ).trim();

    const company = (body.companyName || body.company || req.nextUrl.searchParams.get('company') || 'Viking Entreprenør AS').trim();
    const author = (body.authorName || body.userName || req.nextUrl.searchParams.get('author') || 'Byggmester').trim();
    const projectName = body.projectName || req.nextUrl.searchParams.get('projectName') || 'Byggeprosjekt';

    // 🛡️ Svar-til (Reply-To): Må alltid være håndverkerens eller firmaets e-post (ikke hei@vikingmester.no)
    const replyTo = (
      body.replyTo || 
      body.reply_to || 
      body.senderEmail || 
      body.sender_email || 
      body.craftsman_email || 
      body.craftsmanEmail || 
      body.author_email || 
      body.authorEmail || 
      body.company_email || 
      body.companyEmail || 
      req.nextUrl.searchParams.get('replyTo') || 
      req.nextUrl.searchParams.get('reply_to') || 
      ''
    ).trim();

    if (!recipient) {
      return NextResponse.json({
        success: false,
        error: 'Mangler mottakers e-postadresse (felt: "to", "email" eller "user_email").',
        messages: [{ message: { text: '⚠️ Kunne ikke sende: Mangler mottakers e-postadresse.' } }]
      }, { status: 400 });
    }

    const cleanedContent = cleanMarkdownForEmail(messageText);

    const sendRes = await sendSystemEmail({
      to: recipient,
      subject: subject,
      text: cleanedContent.text || messageText,
      replyTo: replyTo || undefined,
      senderEmail: replyTo || undefined,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px;">
            <h2 style="color: #0f172a; margin: 0 0 4px 0; font-size: 19px;">${subject}</h2>
            <p style="margin: 0; color: #64748b; font-size: 12px;">Gjelder: ${projectName} • Avsender: ${company}</p>
          </div>
          <div style="font-size: 14px; color: #334155; margin-bottom: 24px; line-height: 1.6;">${cleanedContent.html || messageText || 'Se oversendt henvendelse.'}</div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            Sendt via <strong>VikingMester KS</strong> på vegne av <strong>${company}</strong> (${author}).
          </p>
          ${replyTo ? `<p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0;">Svar på denne e-posten sendes direkte til: <strong>${replyTo}</strong>.</p>` : ''}
        </div>
      `,
      companyId: user?.companyId || body.companyId || body.company_id,
      companyName: company,
      authorName: author
    });

    const isSent = sendRes.success && sendRes.status === 'sent';
    const statusText = isSent
      ? `✅ E-post er sendt til ${recipient} ${sendRes.providerUsed === 'smtp' ? 'direkte via bedriftens egen e-postserver' : sendRes.providerUsed === 'resend_byok' ? 'via bedriftens domene' : 'via skyavsender'}!\nEmne: «${subject}»\nAvsender: ${sendRes.fromUsed || company}\nMeldings-ID: ${sendRes.resendId || 'ok'}`
      : `⚠️ Kunne ikke levere e-post til ${recipient}: ${sendRes.message || sendRes.error}`;

    // Returner 200 slik at Botsify JSON API plugin alltid viser meldingen til brukeren
    return NextResponse.json({
      success: isSent,
      id: sendRes.id,
      resendId: sendRes.resendId,
      status: sendRes.status,
      message: sendRes.message,
      messages: [
        {
          message: {
            text: statusText
          }
        }
      ]
    }, { status: 200 });

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
