import { dbQuery, inMemoryStore, saveCollectionItem } from './db';
import { sanitizeHeader } from '../sanitize';
import nodemailer from 'nodemailer';
import { getCompanyEmailConfig, getCompanyEmailConfigByName, CompanyEmailConfig } from './emailConfig';

export interface EmailAttachment {
  filename: string;
  content: string;
  path?: string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  senderEmail?: string;
  type?: 'offer' | 'change_order' | 'general' | 'notice';
  metadata?: Record<string, any>;
  companyName?: string;
  companyId?: string;
  authorName?: string;
  attachments?: EmailAttachment[];
}

/**
 * 🧼 Renser markdown og fjerner alle raw hashtags (#, ##, ###),
 * fjerner interne chat-innledninger ("Ken, jeg klargjør...", "Her er utkastet..."),
 * og konverterer til ren, profesjonell HTML og pen rentekst uten tekniske symboler.
 */
export function cleanMarkdownForEmail(rawText: string): { html: string; text: string } {
  if (!rawText) return { html: '', text: '' };

  // 1. Fjern eventuelle interne agent-preambler hvis de har lekket inn
  let cleaned = rawText
    // Fjern typiske henvendelser til håndverkeren ("Ken, jeg klargjør to test-e-poster nå.")
    .replace(/^(?:[A-ZÆØÅa-zæøå]+[,!]?\s+)?(?:jeg klargjør|jeg har klargjort|her er utkastet|her er et utkast|jeg sender|klart,?\s+jeg sender|jeg har forberedt)[\s\S]*?(?=(?:Til:|Emne:|Innhold:|Melding:|Hei|Kjære|\n\n[A-ZÆØÅ]))/i, '')
    // Fjern "Innhold:" eller "Melding:" hvis det står først
    .replace(/^[-*•]?\s*(?:Innhold|Melding|Tekst):\s*/i, '')
    .trim();

  // Fjern anførselstegn eller vinkeltegn rundt hele meldingen hvis agenten har satt det i sitat
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith('«') && cleaned.endsWith('»'))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  const lines = cleaned.split(/\r?\n/);
  const htmlParts: string[] = [];
  const textParts: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();

    // 2. Overskrifter: Gjør om ### / ## / # til pen HTML <h3> eller fet tekst, ALDRI vis #
    if (/^#{1,6}\s+/.test(trimmed)) {
      const heading = trimmed.replace(/^#{1,6}\s+/, '').replace(/[✉️📧📝📬]/g, '').trim();
      if (heading) {
        htmlParts.push(`<h3 style="color: #0f172a; margin: 18px 0 6px 0; font-size: 15px; font-weight: 700;">${heading}</h3>`);
        textParts.push(heading);
      }
      continue;
    }

    // 3. Punktlister: Gjør om til pene <li>
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '').trim();
      const formatted = formatInlineEmailStyles(itemText);
      htmlParts.push(`<li style="margin-bottom: 6px; color: #334155;">${formatted}</li>`);
      textParts.push(`• ${itemText.replace(/[*_~`#]/g, '')}`);
      continue;
    }

    // 4. Tom linje
    if (!trimmed) {
      htmlParts.push('<div style="height: 10px;"></div>');
      textParts.push('');
      continue;
    }

    // 5. Vanlig avsnitt
    const formatted = formatInlineEmailStyles(trimmed);
    htmlParts.push(`<p style="margin: 0 0 12px 0; line-height: 1.6; color: #334155;">${formatted}</p>`);
    textParts.push(trimmed.replace(/[*_~`#]/g, ''));
  }

  // Pakk sammenhengende <li> inn i <ul>
  let htmlResult = htmlParts.join('\n');
  htmlResult = htmlResult.replace(/((?:<li[\s\S]*?<\/li>\s*)+)/g, '<ul style="margin: 10px 0 16px 20px; padding: 0;">$1</ul>');

  // Sikkerhetsnett: Sørg for at ingen løse hashtags eller markdown-rester finnes i plain text
  const textResult = textParts.join('\n').replace(/#{1,6}\s*/g, '');

  return { html: htmlResult, text: textResult };
}

function formatInlineEmailStyles(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 13px;">$1</code>')
    .replace(/#{1,6}\s*/g, ''); // Garanti: fjern alle hashtags
}

/**
 * 🛡️ Bulletproof Email Button
 * Renders an email button that is 100% visible, vibrant and clickable in ALL email clients:
 * Outlook Desktop (Word engine), Outlook 365, Gmail (Light/Dark), Apple Mail, iOS, Android.
 *
 * Avoids pure CSS linear-gradient (which Outlook strips, leaving transparent background).
 * Uses explicit bgcolor + background-color + table cell structure + high-contrast text span.
 */
export function renderBulletproofButton({
  url,
  label,
  bgColor = '#059669',
  textColor = '#ffffff',
  borderColor,
  icon = '',
  width = 'auto',
}: {
  url: string;
  label: string;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  icon?: string;
  width?: string;
}): string {
  const border = borderColor || bgColor;
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 26px auto; border-collapse: separate !important; text-align: center;">
      <tr>
        <td align="center" bgcolor="${bgColor}" style="background-color: ${bgColor} !important; border-radius: 12px; border: 2px solid ${border}; text-align: center; mso-padding-alt: 15px 34px;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:50px;v-text-anchor:middle;width:${width === 'auto' ? '300px' : width};" arcsize="20%" strokecolor="${border}" fillcolor="${bgColor}">
            <w:anchorlock/>
            <center style="color:${textColor} !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">
              ${icon ? `${icon} ` : ''}${label}
            </center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${url}" target="_blank" style="display: inline-block; background-color: ${bgColor} !important; color: ${textColor} !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 34px; border-radius: 12px; border: 1px solid ${bgColor}; text-align: center; line-height: 1.2; -webkit-text-size-adjust: none; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
            <span style="color: ${textColor} !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 800; text-decoration: none; line-height: 1.2; display: inline-block;">
              ${icon ? `${icon} ` : ''}${label}
            </span>
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
  `;
}

/**
 * 👑 Branded Email Template Generator
 * Produces an ultra-professional, responsive email card with dark-mode support,
 * clean brand header, high-contrast typography, and bulletproof action buttons.
 */
export function renderBrandedEmailTemplate({
  subject,
  title,
  subtitle,
  badgeText,
  badgeColor,
  bodyHtml,
  button,
  secondaryUrl,
  secondaryText = 'Hvis knappen over ikke fungerer, kan du klikke eller lime inn denne lenken i nettleseren:',
  footerDetails,
  companyName = 'VikingMester',
  accentColor = '#059669',
  theme = 'standard', // 'standard' | 'superadmin' | 'betatester'
}: {
  subject: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeColor?: string;
  bodyHtml: string;
  button?: {
    url: string;
    label: string;
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
    icon?: string;
  };
  secondaryUrl?: string;
  secondaryText?: string;
  footerDetails?: string;
  companyName?: string;
  accentColor?: string;
  theme?: 'standard' | 'superadmin' | 'betatester';
}): string {
  let brandHeaderTitle = companyName;
  let brandBadge = badgeText || '';
  let headerBorderColor = '#e2e8f0';
  let primaryBtnColor = accentColor;
  let primaryBtnBorder = accentColor;

  if (theme === 'superadmin') {
    brandHeaderTitle = '👑 VikingMester SuperAdmin';
    brandBadge = badgeText || 'Systemeier & Plattformeier';
    headerBorderColor = '#d97706';
    primaryBtnColor = '#d97706';
    primaryBtnBorder = '#b45309';
  } else if (theme === 'betatester') {
    brandHeaderTitle = '🧪 VikingMester Betatest';
    brandBadge = badgeText || 'Betatester';
    headerBorderColor = '#0284c7';
    primaryBtnColor = '#0284c7';
    primaryBtnBorder = '#0369a1';
  }

  const buttonHtml = button ? renderBulletproofButton({
    url: button.url,
    label: button.label,
    bgColor: button.bgColor || primaryBtnColor,
    textColor: button.textColor || '#ffffff',
    borderColor: button.borderColor || primaryBtnBorder,
    icon: button.icon
  }) : '';

  const fallbackLinkHtml = secondaryUrl ? `
    <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px 16px; margin: 22px 0 10px 0; text-align: center;">
      <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0; font-weight: 600;">
        ${secondaryText}
      </p>
      <a href="${secondaryUrl}" target="_blank" style="font-size: 12px; color: #0284c7; word-break: break-all; text-decoration: underline; font-weight: 600;">
        ${secondaryUrl}
      </a>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="no" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${subject}</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    @media (prefers-color-scheme: dark) {
      body, .email-body { background-color: #0b0f17 !important; }
      .email-card { background-color: #131722 !important; border-color: #1e293b !important; }
      .email-title { color: #f8fafc !important; }
      .email-text { color: #cbd5e1 !important; }
      .email-box { background-color: #1a2234 !important; border-color: #334155 !important; }
      .email-box-text { color: #e2e8f0 !important; }
      .email-muted { color: #94a3b8 !important; }
    }
  </style>
</head>
<body class="email-body" style="background-color: #f1f5f9; margin: 0; padding: 20px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    
    <!-- Header banner -->
    <div style="background-color: #0f172a; padding: 24px 20px; border-radius: 16px 16px 0 0; text-align: center; border-bottom: 3px solid ${headerBorderColor};">
      <div style="font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 4px;">
        ${brandHeaderTitle}
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin: 0; font-weight: 500;">
        KS, HMS & Prosjektstyring for Bygg og Anlegg
      </p>
      ${brandBadge ? `
        <div style="margin-top: 10px;">
          <span style="display: inline-block; background-color: rgba(255,255,255,0.12); color: #f8fafc; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.2);">
            ${brandBadge}
          </span>
        </div>
      ` : ''}
    </div>

    <!-- Main Card Body -->
    <div class="email-card" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px; padding: 32px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      
      <h1 class="email-title" style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; line-height: 1.35;">
        ${title}
      </h1>
      
      ${subtitle ? `
        <p class="email-muted" style="font-size: 14px; color: #64748b; margin: 0 0 20px 0; line-height: 1.5;">
          ${subtitle}
        </p>
      ` : ''}

      <div class="email-text" style="font-size: 15px; color: #334155; line-height: 1.65;">
        ${bodyHtml}
      </div>

      ${buttonHtml}

      ${fallbackLinkHtml}

      ${footerDetails ? `
        <div class="email-muted" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; line-height: 1.5; text-align: center;">
          ${footerDetails}
        </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px 10px; font-size: 11px; color: #94a3b8; line-height: 1.6;">
      Denne meldingen er sendt fra <strong>${companyName}</strong> via VikingMester KS-system.<br/>
      AIChat Norge AS / Vikingnet · <a href="https://vikingmester.no" style="color: #64748b; text-decoration: underline;">vikingmester.no</a>
    </div>

  </div>
</body>
</html>`;
}

export interface SendEmailResult {
  success: boolean;
  id: string;
  resendId?: string;
  status: 'sent' | 'failed' | 'missing_api_key' | 'logged_only' | 'logged_simulated';
  message: string;
  error?: string;
  fromUsed?: string;
  previewUrl?: string;
  providerUsed?: 'smtp' | 'resend_byok' | 'system_relay';
}

/**
 * Henter gyldig Resend API-nøkkel fra miljøvariabler (inkluderer trim for å fjerne evt. utilsiktede linjeskift)
 */
export function getResendApiKey(): string | undefined {
  const key = process.env.RESEND_API_KEY || 
              process.env.RESEND_KEY || 
              process.env.RESEND_API || 
              process.env.RESEND_TOKEN;
  return key ? key.trim() : undefined;
}

/**
 * Rask helsesjekk av Resend API-tilkobling
 */
export async function testResendConnection(): Promise<{
  configured: boolean;
  apiKeyPreview?: string;
  fromEmail: string;
  status: 'connected' | 'missing_key' | 'error';
  message: string;
}> {
  const key = getResendApiKey();
  const fromEmail = (process.env.EMAIL_FROM || process.env.RESEND_FROM || 'VikingMester <hei@vikingmester.no>').trim();
  
  if (!key) {
    return {
      configured: false,
      fromEmail,
      status: 'missing_key',
      message: 'RESEND_API_KEY er ikke konfigurert i miljøvariablene.'
    };
  }

  const maskedKey = key.length > 8 ? `${key.substring(0, 5)}...${key.substring(key.length - 4)}` : '***';

  try {
    const testRes = await fetch('https://api.resend.com/api-keys', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`
      }
    });

    if (testRes.ok) {
      return {
        configured: true,
        apiKeyPreview: maskedKey,
        fromEmail,
        status: 'connected',
        message: 'Tilkobling til Resend API er aktiv og gyldig.'
      };
    } else {
      const errText = await testRes.text();
      return {
        configured: true,
        apiKeyPreview: maskedKey,
        fromEmail,
        status: 'error',
        message: `Resend svarte med status ${testRes.status}: ${errText}`
      };
    }
  } catch (err: any) {
    return {
      configured: true,
      apiKeyPreview: maskedKey,
      fromEmail,
      status: 'error',
      message: `Kunne ikke kontakte Resend: ${err.message}`
    };
  }
}

/**
 * Robust kjernefunksjon for å sende e-post fra VikingMester
 * Koblet mot Resend via RESEND_API_KEY med intelligent domene-fallback og revisjonslogg.
 */
export async function sendSystemEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, text, type = 'general', metadata = {}, companyName = 'VikingMester', authorName } = params;

  const toList = Array.isArray(to) ? to : [to];
  const primaryRecipient = toList[0] || '';

  if (!primaryRecipient) {
    throw new Error('Mottakers e-postadresse er påkrevd.');
  }

  const sanitizedTo = toList.map(t => sanitizeHeader(String(t).trim()));
  const sanitizedSubject = sanitizeHeader(String(subject || 'Melding fra ' + companyName));
  
  // Prioriter alltid håndverkerens / firmaets egen e-post som Reply-To (aldri hei@vikingmester.no som standard)
  const replyTo = (
    params.replyTo || 
    params.senderEmail || 
    metadata.replyTo || 
    metadata.senderEmail || 
    metadata.userEmail || 
    metadata.authorEmail || 
    ''
  ).trim();

  // 🧼 Rengjør markdown og fjern alle rå hashtags (#, ##, ###)
  const cleanedContent = cleanMarkdownForEmail(text || '');
  const bodyText = cleanedContent.text || text || '';
  const bodyHtml = html || `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
      <div style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:18px;">
        <h2 style="color:#0f172a;margin:0 0 4px 0;font-size:19px;">${sanitizedSubject}</h2>
        <p style="margin:0;color:#64748b;font-size:12px;">Avsender: ${companyName}${authorName ? ` (${authorName})` : ''}</p>
      </div>
      <div style="font-size:14px;color:#334155;margin-bottom:24px;line-height:1.6;">${cleanedContent.html || bodyText}</div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
      <p style="font-size:12px;color:#64748b;margin:0;">
        Sendt via <strong>VikingMester KS</strong> på vegne av <strong>${companyName}</strong>${authorName ? ` (${authorName})` : ''}.
      </p>
      ${replyTo ? `<p style="font-size:12px;color:#64748b;margin:6px 0 0 0;">Svar på denne e-posten sendes direkte til: <strong>${replyTo}</strong>.</p>` : ''}
    </div>
  `;

  const emailId = 'email-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  let deliveryStatus: 'sent' | 'failed' | 'missing_api_key' | 'logged_only' | 'logged_simulated' = 'logged_simulated';
  let resendId: string | undefined = undefined;
  let sendError: string | undefined = undefined;
  let providerUsed: 'smtp' | 'resend_byok' | 'system_relay' = 'system_relay';
  let sentViaCustomProvider = false;

  const resendKey = getResendApiKey();
  const rawFrom = (process.env.EMAIL_FROM || process.env.RESEND_FROM || 'VikingMester <hei@vikingmester.no>').trim();
  
  // Sett avsendernavn til bedriftens navn hvis tilgjengelig, men behold validert e-postadresse
  let activeFrom = rawFrom;
  if (companyName && companyName !== 'VikingMester') {
    const emailMatch = rawFrom.match(/<([^>]+)>/) || rawFrom.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      activeFrom = `${companyName} <${emailMatch[1]}>`;
    }
  }

  // 🏢 1. Sjekk om bedriften har konfigurert sitt eget e-postoppsett (SMTP, Microsoft 365, Gmail, Domeneshop, One.com osv.)
  const targetCompanyId = params.companyId || metadata.companyId;
  let customEmailConfig: CompanyEmailConfig | null = null;
  if (targetCompanyId) {
    customEmailConfig = await getCompanyEmailConfig(targetCompanyId);
  }
  if (!customEmailConfig && companyName && companyName !== 'VikingMester') {
    customEmailConfig = await getCompanyEmailConfigByName(companyName);
  }

  if (customEmailConfig && customEmailConfig.enabled && customEmailConfig.provider !== 'system_default') {
    if (customEmailConfig.provider === 'resend_byok' && customEmailConfig.resendApiKey) {
      // Egen Resend API-nøkkel på eget registrert domene
      try {
        const byokFrom = `"${customEmailConfig.fromName || companyName}" <${customEmailConfig.fromEmail}>`;
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customEmailConfig.resendApiKey.trim()}`
          },
          body: JSON.stringify({
            from: byokFrom,
            ...(replyTo || customEmailConfig.replyTo ? { reply_to: replyTo || customEmailConfig.replyTo } : {}),
            to: sanitizedTo,
            subject: sanitizedSubject,
            html: bodyHtml,
            text: bodyText,
            ...(params.attachments && params.attachments.length > 0 ? { attachments: params.attachments } : {})
          })
        });

        if (resendRes.ok) {
          const resendData = await resendRes.json();
          resendId = resendData.id;
          deliveryStatus = 'sent';
          activeFrom = byokFrom;
          providerUsed = 'resend_byok';
          sentViaCustomProvider = true;
          console.info(`[EmailSender] E-post sendt via bedriftens egen Resend BYOK-nøkkel (${customEmailConfig.fromEmail}):`, resendId);
        } else {
          const errText = await resendRes.text();
          console.warn('[EmailSender] Bedriftens Resend BYOK feilet, forsøker system-relay fallback:', errText);
        }
      } catch (byokErr: any) {
        console.warn('[EmailSender] Feil ved utsending via bedriftens Resend BYOK:', byokErr.message);
      }
    } else if (customEmailConfig.smtpHost && customEmailConfig.smtpUser && customEmailConfig.smtpPassword) {
      // 🚀 Direkte utsending via bedriftens egen e-postserver (Microsoft 365, Gmail, Domeneshop, One.com, ProISP, Custom SMTP)
      try {
        const transporter = nodemailer.createTransport({
          host: customEmailConfig.smtpHost,
          port: Number(customEmailConfig.smtpPort || 587),
          secure: customEmailConfig.smtpSecure ?? (Number(customEmailConfig.smtpPort) === 465),
          auth: {
            user: customEmailConfig.smtpUser,
            pass: customEmailConfig.smtpPassword
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000
        });

        const fromAddress = `"${customEmailConfig.fromName || companyName}" <${customEmailConfig.fromEmail}>`;
        const mailOptions = {
          from: fromAddress,
          to: sanitizedTo,
          replyTo: replyTo || customEmailConfig.replyTo || customEmailConfig.fromEmail,
          subject: sanitizedSubject,
          text: bodyText,
          html: bodyHtml,
          attachments: params.attachments?.map(att => ({
            filename: att.filename,
            content: att.content,
            path: att.path,
            contentType: att.contentType
          }))
        };

        const info = await transporter.sendMail(mailOptions);
        if (info.messageId) {
          deliveryStatus = 'sent';
          resendId = info.messageId;
          activeFrom = fromAddress;
          providerUsed = 'smtp';
          sentViaCustomProvider = true;
          console.info(`[EmailSender] E-post sendt direkte via bedriftens egen e-postserver (${customEmailConfig.smtpHost}):`, info.messageId);
        }
      } catch (smtpErr: any) {
        console.warn(`[EmailSender] Sending via bedriftens SMTP (${customEmailConfig.smtpHost}) feilet:`, smtpErr.message);
        sendError = `Egen SMTP-server feilet: ${smtpErr.message}. Forsøkte fallback til felles skyserver.`;
      }
    }
  }

  // 2. Hvis ikke levert via bedriftens eget system, bruk VikingMester Cloud Relay (Resend)
  if (!sentViaCustomProvider && resendKey) {
    try {
      let resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: activeFrom,
          ...(replyTo ? { reply_to: replyTo } : {}),
          to: sanitizedTo,
          subject: sanitizedSubject,
          html: bodyHtml,
          text: bodyText,
          ...(params.attachments && params.attachments.length > 0 ? { attachments: params.attachments } : {})
        })
      });

      let errText = '';
      if (!resendRes.ok) {
        errText = await resendRes.text();
        const lowerErr = errText.toLowerCase();
        const isDomainError = 
          resendRes.status === 403 || 
          resendRes.status === 422 || 
          lowerErr.includes('not verified') || 
          lowerErr.includes('domain') ||
          lowerErr.includes('onboarding@resend.dev');

        // Dersom primæravsender ble avvist pga. manglende domene-verifisering i Resend,
        // forsøk automatisk fallback til Resends universelle testsender 'onboarding@resend.dev'
        if (isDomainError && !activeFrom.includes('onboarding@resend.dev')) {
          console.warn(`[EmailSender] Avsender «${activeFrom}» avvist av Resend (${errText}). Forsøker automatisk fallback med onboarding@resend.dev...`);
          activeFrom = companyName && companyName !== 'VikingMester'
            ? `${companyName} <onboarding@resend.dev>`
            : 'VikingMester <onboarding@resend.dev>';

          resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`
            },
            body: JSON.stringify({
              from: activeFrom,
              ...(replyTo ? { reply_to: replyTo } : {}),
              to: sanitizedTo,
              subject: sanitizedSubject,
              html: bodyHtml,
              text: bodyText,
              ...(params.attachments && params.attachments.length > 0 ? { attachments: params.attachments } : {})
            })
          });

          if (!resendRes.ok) {
            errText = await resendRes.text();
          }
        }
      }

      if (resendRes.ok) {
        const resendData = await resendRes.json();
        resendId = resendData.id;
        deliveryStatus = 'sent';
      } else {
        let parsedJson: any = null;
        try { parsedJson = JSON.parse(errText); } catch {}
        const cleanMsg = parsedJson?.message || errText || `HTTP ${resendRes.status}`;
        console.error('[EmailSender] Resend feilet:', resendRes.status, cleanMsg);
        deliveryStatus = 'failed';
        sendError = cleanMsg;
      }
    } catch (e: any) {
      console.error('[EmailSender] Nettverksfeil mot Resend:', e.message);
      deliveryStatus = 'failed';
      sendError = e.message || 'Nettverksfeil mot Resend API';
    }
  } else {
    // Ingen Resend API-nøkkel funnet
    console.warn('[EmailSender] Ingen RESEND_API_KEY konfigurert i miljøet.');
    deliveryStatus = 'missing_api_key';
    sendError = 'RESEND_API_KEY er ikke konfigurert i miljøvariablene.';
  }

  // Persister til database og minnestore
  await dbQuery(`
    INSERT INTO email_logs (recipient, status, error, created_at)
    VALUES ($1, $2, $3, $4)
  `, [sanitizedTo.join(', '), deliveryStatus, sendError || null, now]).catch(() => {
    if (!inMemoryStore.email_logs) inMemoryStore.email_logs = [];
    inMemoryStore.email_logs.push({
      id: emailId,
      to: sanitizedTo,
      subject: sanitizedSubject,
      text: bodyText,
      type,
      status: deliveryStatus,
      resendId,
      error: sendError,
      fromUsed: activeFrom,
      createdAt: now,
      metadata
    });
  });

  // Lagre også som strukturert samlingsobjekt for full sporbarhet
  await saveCollectionItem('email_logs', {
    id: emailId,
    recipient: sanitizedTo.join(', '),
    subject: sanitizedSubject,
    body: bodyText,
    type,
    status: deliveryStatus,
    resendId: resendId || null,
    error: sendError || null,
    fromUsed: activeFrom,
    createdAt: now,
    metadata
  }).catch(() => {});

  // Protokollfør i agent_activities
  if (deliveryStatus === 'sent') {
    const providerLabel = providerUsed === 'smtp' 
      ? 'direkte via bedriftens egen e-postserver' 
      : providerUsed === 'resend_byok' 
        ? 'via bedriftens egen Resend BYOK-nøkkel' 
        : 'via VikingMester Cloud Relay';

    await saveCollectionItem('agent_activities', {
      type: 'email_sent',
      title: `E-post sendt: ${sanitizedSubject}`,
      description: `Sendt til ${sanitizedTo.join(', ')} ${providerLabel} (Meldings-ID: ${resendId}). Avsender: ${activeFrom}.`,
      badge: providerUsed === 'smtp' ? 'EGET DOMENE (SMTP)' : providerUsed === 'resend_byok' ? 'EGET DOMENE (BYOK)' : 'SENDT PÅ E-POST',
      status: 'completed',
      createdAt: now,
      trade: 'Administrasjon',
      tradeName: authorName || 'MesterAI'
    }).catch(() => {});
  } else if (deliveryStatus === 'missing_api_key') {
    await saveCollectionItem('agent_activities', {
      type: 'email_not_sent',
      title: `E-post ikke sendt: ${sanitizedSubject}`,
      description: `Utsendelse til ${sanitizedTo.join(', ')} ble avbrutt: Hverken egen e-postserver eller RESEND_API_KEY er konfigurert.`,
      badge: 'MANGLER E-POSTOPPSETT',
      status: 'warning',
      createdAt: now,
      trade: 'Administrasjon',
      tradeName: authorName || companyName
    }).catch(() => {});
  } else {
    await saveCollectionItem('agent_activities', {
      type: 'email_failed',
      title: `E-post feilet: ${sanitizedSubject}`,
      description: `Forsøk på å sende til ${sanitizedTo.join(', ')} feilet: ${sendError}`,
      badge: 'SENDING FEILET',
      status: 'error',
      createdAt: now,
      trade: 'Administrasjon',
      tradeName: authorName || 'MesterAI'
    }).catch(() => {});
  }

  if (deliveryStatus === 'sent') {
    const deliveryMsg = providerUsed === 'smtp'
      ? `E-post er levert direkte via bedriftens egen e-postserver (${activeFrom}) til ${sanitizedTo.join(', ')}.`
      : providerUsed === 'resend_byok'
        ? `E-post er levert via bedriftens eget domene (${activeFrom}) til ${sanitizedTo.join(', ')}.`
        : `E-post er levert via VikingMester Sky-avsender til ${sanitizedTo.join(', ')} (Meldings-ID: ${resendId}).`;

    return {
      success: true,
      id: emailId,
      resendId,
      status: 'sent',
      fromUsed: activeFrom,
      providerUsed,
      message: deliveryMsg
    };
  } else if (deliveryStatus === 'missing_api_key') {
    return {
      success: false,
      id: emailId,
      status: 'missing_api_key',
      fromUsed: activeFrom,
      providerUsed,
      message: 'Hverken egen e-postleverandør (SMTP) eller RESEND_API_KEY er konfigurert. E-posten ble ikke levert.',
      error: sendError
    };
  } else {
    return {
      success: false,
      id: emailId,
      status: 'failed',
      fromUsed: activeFrom,
      providerUsed,
      message: `Kunne ikke levere e-post: ${sendError}`,
      error: sendError
    };
  }
}

/**
 * Sender et formelt tilbud på e-post til kunde med 1-klikks digital godkjenningsknapp
 */
export async function sendOfferByEmail(params: {
  offer: any;
  clientEmail: string;
  clientName?: string;
  companyName?: string;
  companyId?: string;
  authorName?: string;
  replyTo?: string;
  senderEmail?: string;
  customMessage?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const { offer, clientEmail, clientName, companyName = 'Mester Entreprenør AS', companyId, authorName = 'Byggmester', replyTo, senderEmail, customMessage, baseUrl = 'https://vikingmester.no' } = params;

  const token = offer.token || offer.id;
  const approvalLink = `${baseUrl}/?offerToken=${token}`;

  const cName = clientName || offer.clientName || 'Kjære kunde';
  const totalAmount = Number(offer.totalAmount || offer.total || 0);
  const amountExVat = Number(offer.amountExVat || Math.round(totalAmount / 1.25));
  const vatAmount = totalAmount - amountExVat;

  const itemsList = Array.isArray(offer.items) ? offer.items : [];
  const itemsHtml = itemsList.length > 0
    ? `
      <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left;">
            <th style="padding: 10px 8px; color: #475569; font-weight: 700;">Beskrivelse & omfang</th>
            <th style="padding: 10px 8px; text-align: right; color: #475569; font-weight: 700; white-space: nowrap;">Sum eks mva</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList.map((it: any) => {
            const itQty = it.quantity || 1;
            const itUnit = it.unit || 'timer';
            const itPrice = Number(it.pricePerUnit || 0);
            const itTotal = Number(it.total || (itQty * itPrice) || 0);
            return `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 8px; vertical-align: top;">
                  <div style="font-weight: 600; color: #0f172a; font-size: 14px; margin-bottom: 3px;">${it.description || 'Fagarbeid'}</div>
                  <div style="color: #64748b; font-size: 12px;">${itQty} ${itUnit} × kr ${itPrice.toLocaleString('no-NO')}</div>
                </td>
                <td style="padding: 12px 8px; text-align: right; vertical-align: top; font-weight: 700; color: #0f172a; font-size: 14px; white-space: nowrap;">
                  kr ${itTotal.toLocaleString('no-NO')}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `
    : '';

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 12px 8px; color: #1e293b; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        .card { width: 100%; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #0f172a; padding: 22px 18px; text-align: left; }
        .header h1 { color: #f8fafc; margin: 0 0 4px 0; font-size: 19px; font-weight: 700; line-height: 1.3; }
        .header p { color: #94a3b8; margin: 0; font-size: 12px; }
        .content { padding: 20px 16px; color: #334155; line-height: 1.55; }
        .price-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin: 20px 0; }
        .btn-container { text-align: center; margin: 26px 0; }
        .btn { background-color: #059669; color: #ffffff !important; font-weight: 700; padding: 15px 24px; border-radius: 10px; text-decoration: none; display: block; max-width: 360px; margin: 0 auto; font-size: 15px; text-align: center; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25); }
        .footer { padding: 16px 18px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.4; }
        @media only screen and (min-width: 601px) {
          body { padding: 24px; }
          .card { border-radius: 16px; }
          .header { padding: 28px; }
          .header h1 { font-size: 20px; }
          .content { padding: 28px; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>${companyName}</h1>
          <p>Offisielt pristilbud utstedt via VikingMester KS-system</p>
        </div>
        <div class="content">
          <p style="font-size: 16px; margin-top: 0;">Hei <strong>${cName}</strong>,</p>
          <p>${customMessage || `Vi har herved gleden av å oversende vårt tilbud på <strong>${offer.title || 'avtalt fagarbeid'}</strong>.`}</p>
          
          ${offer.description ? `<p style="background: #f1f5f9; padding: 12px 14px; border-left: 4px solid #059669; border-radius: 4px; font-size: 13px; line-height: 1.5;">${offer.description}</p>` : ''}
          
          ${itemsHtml}

          <div class="price-box">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="color: #64748b; padding-bottom: 6px;">Sum ekskl. mva:</td>
                <td style="text-align: right; font-weight: 600; color: #1e293b; padding-bottom: 6px; white-space: nowrap;">kr ${amountExVat.toLocaleString('no-NO')}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding-bottom: 6px;">Merverdiavgift (25% mva):</td>
                <td style="text-align: right; font-weight: 600; color: #1e293b; padding-bottom: 6px; white-space: nowrap;">kr ${vatAmount.toLocaleString('no-NO')}</td>
              </tr>
              <tr style="border-top: 2px solid #cbd5e1; font-size: 16px;">
                <td style="font-weight: 800; color: #0f172a; padding-top: 10px;">TOTALPRIS INKL. MVA:</td>
                <td style="text-align: right; font-weight: 800; color: #059669; padding-top: 10px; white-space: nowrap; font-size: 17px;">kr ${totalAmount.toLocaleString('no-NO')}</td>
              </tr>
            </table>
          </div>

          ${renderBulletproofButton({
            url: approvalLink,
            label: 'Se og godkjenn tilbudet',
            icon: '👉',
            bgColor: '#059669',
            borderColor: '#047857'
          })}

          <p style="font-size: 12px; color: #64748b; margin-top: 20px; line-height: 1.5;">
            Tilbudet er gyldig i 30 dager fra dags dato. Standard forbehold iht. NS 8406 / Bustadoppføringslova gjelder for uforutsette bygningstekniske forhold.
          </p>

          <p style="margin-bottom: 0;">
            Med vennlig hilsen,<br>
            <strong>${authorName}</strong><br>
            ${companyName}
          </p>
        </div>
        <div class="footer">
          Dette tilbudet er sikkert levert via <a href="https://vikingmester.no" style="color: #059669; text-decoration: none;">VikingMester</a> – Norges ledende autonome KS- og prosjektsystem.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: clientEmail,
    companyId: companyId || offer.companyId || offer.metadata?.companyId,
    subject: `Pristilbud: ${offer.title || 'Fagarbeid'} – ${companyName}`,
    html: emailHtml,
    text: `Hei ${cName}!\n\nVi har oversendt tilbudet «${offer.title}» på kr ${totalAmount.toLocaleString('no-NO')} inkl. mva.\n\nKlikk her for å se og godkjenne tilbudet: ${approvalLink}\n\nMed vennlig hilsen,\n${authorName}\n${companyName}`,
    replyTo: replyTo || senderEmail || undefined,
    senderEmail: replyTo || senderEmail || undefined,
    type: 'offer',
    companyName,
    authorName,
    metadata: { offerId: offer.id, token, clientEmail, replyTo: replyTo || senderEmail, companyId: companyId || offer.companyId }
  });
}

/**
 * Sender formell endringsordre iht. NS 8406 til kunde med godkjenningslenke
 */
export async function sendChangeOrderByEmail(params: {
  changeOrder: any;
  clientEmail: string;
  clientName?: string;
  companyName?: string;
  companyId?: string;
  authorName?: string;
  replyTo?: string;
  senderEmail?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const { changeOrder, clientEmail, clientName, companyName = 'Mester Entreprenør AS', companyId, authorName = 'Byggmester', replyTo, senderEmail, baseUrl = 'https://vikingmester.no' } = params;

  const token = changeOrder.token || changeOrder.id;
  const shareUrl = `${baseUrl}/?changeOrderToken=${token}`;

  const cName = clientName || changeOrder.clientName || 'Byggherre';
  const totalAmount = Number(changeOrder.totalAmount || 0);
  const amountExVat = Number(changeOrder.amountExVat || Math.round(totalAmount / 1.25));

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 12px 8px; color: #1e293b; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        .card { width: 100%; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #1e293b; padding: 22px 18px; color: white; }
        .content { padding: 20px 16px; color: #334155; line-height: 1.55; }
        .notice-box { background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 14px; border-radius: 8px; margin: 18px 0; }
        .btn { background: #0284c7; color: white !important; font-weight: 700; padding: 15px 24px; border-radius: 10px; text-decoration: none; display: block; max-width: 360px; margin: 0 auto; font-size: 15px; text-align: center; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25); }
        @media only screen and (min-width: 601px) {
          body { padding: 24px; }
          .card { border-radius: 16px; }
          .header { padding: 24px; }
          .content { padding: 24px; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin: 0; font-size: 18px;">Endringsmelding #${changeOrder.changeNumber || '1'}</h2>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">${changeOrder.projectName || 'Byggeprosjekt'} • NS 8406 pkt. 19.2</p>
        </div>
        <div class="content">
          <p style="margin-top: 0;">Hei <strong>${cName}</strong>,</p>
          <p>Det varsles herved om tilleggsvederlag og eventuell fristforlengelse for følgende endringsarbeid:</p>
          
          <div class="notice-box">
            <strong style="color: #991b1b; font-size: 15px;">${changeOrder.title}</strong>
            <p style="margin: 6px 0 0 0; color: #475569; font-size: 13px; line-height: 1.4;">${changeOrder.description}</p>
          </div>

          <table style="width: 100%; border-top: 1px solid #e2e8f0; margin: 16px 0; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Krav om tillegg:</td>
              <td style="text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap;">kr ${totalAmount.toLocaleString('no-NO')} inkl mva</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Fristforlengelse:</td>
              <td style="text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap;">${changeOrder.impactDays || 0} arbeidsdager</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Hjemmel:</td>
              <td style="text-align: right; font-size: 12px; color: #64748b;">${changeOrder.legalHjemmel || 'NS 8406 pkt. 19.2'}</td>
            </tr>
          </table>

          ${renderBulletproofButton({
            url: shareUrl,
            label: 'Se detaljer og godkjenn endringen',
            icon: '✍️',
            bgColor: '#059669',
            borderColor: '#047857'
          })}

          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
            Vennligst ta stilling til varselet så snart som mulig slik at fremdriften på byggeplassen ikke hindres.
          </p>
          <p style="margin-bottom: 0;">Med vennlig hilsen,<br><strong>${authorName}</strong><br>${companyName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: clientEmail,
    companyId: companyId || changeOrder.companyId || changeOrder.metadata?.companyId,
    subject: `Endringsvarsel #${changeOrder.changeNumber || '1'}: ${changeOrder.title} – ${companyName}`,
    html: emailHtml,
    text: `Hei ${cName}!\n\nDet er registrert et endringsvarsel for ${changeOrder.projectName}:\n${changeOrder.title} (kr ${totalAmount.toLocaleString('no-NO')} inkl. mva).\n\nGodkjenn her: ${shareUrl}\n\nMed vennlig hilsen,\n${authorName}`,
    replyTo: replyTo || senderEmail || undefined,
    senderEmail: replyTo || senderEmail || undefined,
    type: 'change_order',
    companyName,
    authorName,
    metadata: { changeOrderId: changeOrder.id, token, clientEmail, replyTo: replyTo || senderEmail, companyId: companyId || changeOrder.companyId }
  });
}

/**
 * Sender formell byggekontrakt (NS 8406 / Håndverkertjenesteloven) til kunde for digital e-signering
 */
export async function sendContractByEmail(params: {
  contract: any;
  clientEmail: string;
  clientName?: string;
  companyName?: string;
  authorName?: string;
  replyTo?: string;
  senderEmail?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    contract,
    clientEmail,
    clientName,
    companyName = 'Mester Entreprenør AS',
    authorName = 'Ansvarlig Byggmester',
    replyTo,
    senderEmail,
    baseUrl = 'https://vikingmester.no'
  } = params;

  const token = contract.token || contract.id;
  const signUrl = `${baseUrl}/?contractToken=${token}`;
  const cName = clientName || contract.clientName || 'Kjære kunde';
  const totalAmount = Number(contract.totalAmount || 0);
  const amountExVat = Math.round(totalAmount / 1.25);
  const vatAmount = totalAmount - amountExVat;

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 12px 8px; color: #1e293b; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        .card { width: 100%; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #0f172a; padding: 22px 18px; color: white; text-align: left; }
        .badge { display: inline-block; background: #10b981; color: white; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; margin-bottom: 8px; }
        .content { padding: 20px 16px; line-height: 1.55; }
        .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin: 18px 0; }
        .btn-container { text-align: center; margin: 26px 0; }
        .btn { background: #059669; color: #ffffff !important; font-weight: 700; padding: 15px 24px; border-radius: 10px; text-decoration: none; display: block; max-width: 360px; margin: 0 auto; font-size: 15px; text-align: center; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25); }
        .footer { padding: 16px 18px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.4; }
        @media only screen and (min-width: 601px) {
          body { padding: 24px; }
          .card { border-radius: 16px; }
          .header { padding: 28px; }
          .content { padding: 28px; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">Norsk Byggekontrakt NS 8406</span>
          <h1 style="margin: 0; font-size: 20px; line-height: 1.3;">${contract.title || 'Byggekontrakt'}</h1>
          <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 12px;">Utstedt av ${companyName} • Prosjektkode ${contract.projectCode || 'P-2026'}</p>
        </div>
        <div class="content">
          <p style="font-size: 16px; margin-top: 0;">Hei <strong>${cName}</strong>,</p>
          <p>
            Ditt aksepterte tilbud er nå omgjort til en formell, juridisk gyldig byggekontrakt i henhold til <strong>NS 8406</strong> og <strong>Håndverkertjenesteloven</strong>.
          </p>

          <div class="meta-box">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="color: #64748b; padding-bottom: 6px;">Oppdragsgiver:</td>
                <td style="text-align: right; font-weight: 600; color: #0f172a;">${cName}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding-bottom: 6px;">Entreprenør:</td>
                <td style="text-align: right; font-weight: 600; color: #0f172a;">${companyName}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding-bottom: 6px;">Ferdigstillelse:</td>
                <td style="text-align: right; font-weight: 600; color: #0f172a;">${contract.completionDate || 'Iht. avtale'}</td>
              </tr>
              <tr style="border-top: 1px solid #cbd5e1;">
                <td style="color: #64748b; padding-top: 8px;">Sum ekskl. mva:</td>
                <td style="text-align: right; font-weight: 600; color: #1e293b; padding-top: 8px; white-space: nowrap;">kr ${amountExVat.toLocaleString('no-NO')}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding-bottom: 8px;">Merverdiavgift (25% mva):</td>
                <td style="text-align: right; font-weight: 600; color: #1e293b; padding-bottom: 8px; white-space: nowrap;">kr ${vatAmount.toLocaleString('no-NO')}</td>
              </tr>
              <tr style="border-top: 2px solid #0f172a; font-size: 16px;">
                <td style="font-weight: 800; color: #0f172a; padding-top: 10px;">AVTALT KONTRAKTSSUM:</td>
                <td style="text-align: right; font-weight: 800; color: #059669; padding-top: 10px; white-space: nowrap; font-size: 17px;">kr ${totalAmount.toLocaleString('no-NO')} inkl. mva</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #334155;">
            Så snart du signerer kontrakten digitalt, vil prosjektet opprettes 100% automatisk i systemet med lovpålagte KS-sjekklister, risikovurdering (SJA) og forberedelse av komplett FDV-dokumentasjon.
          </p>

          ${renderBulletproofButton({
            url: signUrl,
            label: 'Signer kontrakten digitalt',
            icon: '✍️',
            bgColor: '#059669',
            borderColor: '#047857'
          })}

          <p style="font-size: 12px; color: #64748b; margin-top: 20px; line-height: 1.5;">
            🔒 <strong>Juridisk gyldighet:</strong> Digital signatur oppfyller kravene i eIDAS og norsk avtalerett med full loggføring av signaturbilde, tidsstempel og IP-adresse.
          </p>

          <p style="margin-bottom: 0;">
            Med vennlig hilsen,<br>
            <strong>${authorName}</strong><br>
            ${companyName}
          </p>
        </div>
        <div class="footer">
          Levert via <a href="https://vikingmester.no" style="color: #059669; text-decoration: none;">VikingMester</a> – Norges ledende autonome KS- og prosjektsystem for håndverkere.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: clientEmail,
    subject: `Byggekontrakt for digital signering: ${contract.title || 'Byggeprosjekt'} – ${companyName}`,
    html: emailHtml,
    text: `Hei ${cName}!\n\nDitt tilbud er godkjent og kontrakten «${contract.title}» på kr ${totalAmount.toLocaleString('no-NO')} ligger klar for signering.\n\nKlikk her for å signere digitalt: ${signUrl}\n\nMed vennlig hilsen,\n${authorName}\n${companyName}`,
    replyTo: replyTo || senderEmail || undefined,
    senderEmail: replyTo || senderEmail || undefined,
    type: 'general',
    companyName,
    authorName,
    metadata: { contractId: contract.id, token, clientEmail, replyTo: replyTo || senderEmail }
  });
}

/**
 * Sender bekreftelse på at kontrakt er signert og prosjektet er igangsatt
 */
export async function sendProjectStartedEmail(params: {
  project: any;
  clientEmail: string;
  clientName?: string;
  companyName?: string;
  authorName?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    project,
    clientEmail,
    clientName,
    companyName = 'Mester Entreprenør AS',
    authorName = 'Ansvarlig Byggmester',
    baseUrl = 'https://vikingmester.no'
  } = params;

  const portalUrl = `${baseUrl}/?portal=${project.id}`;
  const cName = clientName || project.clientName || 'Kjære kunde';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #059669; padding: 28px; color: white; text-align: center; }
        .content { padding: 28px; line-height: 1.6; }
        .btn { background: #0f172a; color: #ffffff !important; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🎉 Prosjektet er igangsatt!</h1>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Kontrakten er signert og arbeidene er planlagt</p>
        </div>
        <div class="content">
          <p style="font-size: 16px; margin-top: 0;">Hei <strong>${cName}</strong>,</p>
          <p>
            Takk for din signatur! Kontrakten for <strong>${project.name}</strong> (Prosjektkode: <code>${project.projectCode}</code>) er nå arkivert.
          </p>
          <p>
            Mesterhjernen har automatisk etablert prosjektet med alle lovpålagte HMS-rutiner, faseinndelte KS-sjekklister for fagene og påbegynt FDV-dokumentasjonspermen.
          </p>
          ${renderBulletproofButton({
            url: portalUrl,
            label: 'Følg fremdriften i Byggherreportalen',
            icon: '📲',
            bgColor: '#0f172a',
            borderColor: '#1e293b'
          })}
          <p style="font-size: 13px; color: #64748b;">
            Du vil motta løpende oppdateringer og fotodokumentasjon underveis i byggeperioden.
          </p>
          <p>Med vennlig hilsen,<br><strong>${authorName}</strong><br>${companyName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: clientEmail,
    subject: `🎉 Kontrakt signert & Prosjekt igangsatt: ${project.name} – ${companyName}`,
    html: emailHtml,
    text: `Hei ${cName}!\n\nTakk for din signatur! Prosjektet ${project.name} (${project.projectCode}) er nå igangsatt.\n\nFølg prosjektet i byggherreportalen her: ${portalUrl}\n\nMed vennlig hilsen,\n${authorName}\n${companyName}`,
    type: 'general',
    companyName,
    authorName,
    metadata: { projectId: project.id, clientEmail }
  });
}

/**
 * Sender komplett overlevert FDV-perm og sluttprotokoll ved prosjektets ferdigstillelse
 */
export async function sendHandoverDocumentationEmail(params: {
  project: any;
  clientEmail: string;
  clientName?: string;
  companyName?: string;
  authorName?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    project,
    clientEmail,
    clientName,
    companyName = 'Mester Entreprenør AS',
    authorName = 'Ansvarlig Byggmester',
    baseUrl = 'https://vikingmester.no'
  } = params;

  const portalUrl = `${baseUrl}/?portal=${project.id}`;
  const cName = clientName || project.clientName || 'Kjære kunde';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #0f172a; padding: 28px; color: white; }
        .badge { background: #10b981; color: white; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .content { padding: 28px; line-height: 1.6; }
        .doc-list { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; }
        .btn { background: #059669; color: #ffffff !important; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">Overlevering & Sluttdokumentasjon</span>
          <h1 style="margin: 8px 0 0 0; font-size: 22px;">📁 ${project.name} er ferdigstilt!</h1>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Offisiell overlevering fra ${companyName}</p>
        </div>
        <div class="content">
          <p style="font-size: 16px; margin-top: 0;">Hei <strong>${cName}</strong>,</p>
          <p>
            Arbeidene på <strong>${project.name}</strong> er nå ferdigstilt, kontrollert og godkjent iht. TEK17 og NS 8406.
          </p>

          <div class="doc-list">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #0f172a;">Innhold i overlevert dokumentasjonspakke:</p>
            <ul style="margin: 0; padding-left: 20px; color: #475569;">
              <li>✓ Komplett samlet FDV-perm med drifts- og vedlikeholdsinstrukser</li>
              <li>✓ Formell TEK17 Samsvarserklæring og sluttkontroll</li>
              <li>✓ Signert Overtakelsesprotokoll med 5 års reklamasjonsgaranti</li>
              <li>✓ Produktdatablader med NOBB-numre og SINTEF-godkjenninger</li>
              <li>✓ Klargjort overføring til Boligmappa (skjulte konstruksjoner og fotobevis)</li>
            </ul>
          </div>

          ${renderBulletproofButton({
            url: portalUrl,
            label: 'Åpne FDV-perm & Last ned PDF',
            icon: '📄',
            bgColor: '#059669',
            borderColor: '#047857'
          })}

          <p style="font-size: 12px; color: #64748b;">
            Dersom du har spørsmål til vedlikehold eller garantier, finner du full kontaktinformasjon i overleveringsprotokollen.
          </p>
          <p>Med vennlig hilsen,<br><strong>${authorName}</strong><br>${companyName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: clientEmail,
    subject: `📁 FDV-perm & Sluttdokumentasjon overlevert: ${project.name} – ${companyName}`,
    html: emailHtml,
    text: `Hei ${cName}!\n\nArbeidene på ${project.name} er ferdigstilt og komplett FDV-perm er klar.\n\nÅpne og last ned dokumentasjonen her: ${portalUrl}\n\nMed vennlig hilsen,\n${authorName}\n${companyName}`,
    type: 'general',
    companyName,
    authorName,
    metadata: { projectId: project.id, clientEmail }
  });
}

// ============================================================================
// 🌟 TILLEGG AV E-POSTMALER FOR ALLE BRUKER- OG PROSJEKTSITUASJONER MED ASSISTANSE
// ============================================================================

/**
 * 1. MULIGE KUNDER: Bekreftelse på mottatt henvendelse / tilbudsforespørsel med assistanse
 */
export async function sendLeadInquiryReceivedEmail(params: {
  leadEmail: string;
  leadName?: string;
  projectDescription?: string;
  companyName?: string;
  authorName?: string;
  contactPhone?: string;
  contactEmail?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    leadEmail,
    leadName = 'Kjære kunde',
    projectDescription = 'Ditt forespurte bygge- eller oppussingsprosjekt',
    companyName = 'Mester Entreprenør AS',
    authorName = 'Kundeservice & Befaring',
    contactPhone,
    contactEmail,
    baseUrl = 'https://vikingmester.no'
  } = params;

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 26px 20px; color: #ffffff; text-align: left; }
        .content { padding: 24px 20px; line-height: 1.6; color: #334155; }
        .step-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; }
        .contact-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span style="background: #10b981; color: white; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Forespørsel mottatt</span>
          <h2 style="margin: 8px 0 0 0; font-size: 20px;">Takk for din henvendelse til ${companyName}</h2>
        </div>
        <div class="content">
          <p style="margin-top: 0; font-size: 15px;">Hei <strong>${leadName}</strong>,</p>
          <p>Vi bekrefter med dette at vi har mottatt din henvendelse vedrørende:</p>
          <blockquote style="margin: 12px 0; padding: 10px 14px; background: #f1f5f9; border-left: 4px solid #0284c7; font-size: 13px; color: #475569; font-style: italic;">
            ${projectDescription}
          </blockquote>
          
          <div class="step-box">
            <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 14px;">Hva skjer nå?</h4>
            <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
              <li><strong>Gjennomgang:</strong> Vår fagansvarlige går gjennom omfang og tilgjengelige tegninger.</li>
              <li><strong>Befaring / Avklaring:</strong> Vi kontakter deg normalt innen 1–2 virkedager for å avtale befaring eller hente supplerende detaljer.</li>
              <li><strong>Pristilbud:</strong> Du mottar et uforpliktende og spesifisert pristilbud med 1-klikks digital godkjenning.</li>
            </ol>
          </div>

          ${(contactPhone || contactEmail) ? `
          <div class="contact-box">
            <p style="margin: 0; font-size: 13px; color: #166534;">
              <strong>Trenger du rask avklaring?</strong><br>
              ${contactPhone ? `📞 Telefon: <strong>${contactPhone}</strong><br>` : ''}
              ${contactEmail ? `✉️ E-post: <strong>${contactEmail}</strong>` : ''}
            </p>
          </div>
          ` : ''}

          <p style="margin-top: 24px; margin-bottom: 0; font-size: 14px;">
            Med vennlig hilsen,<br>
            <strong>${authorName}</strong><br>
            ${companyName}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: leadEmail,
    subject: `Bekreftelse på mottatt henvendelse: ${companyName}`,
    html: emailHtml,
    text: `Hei ${leadName}!\n\nTakk for din henvendelse til ${companyName}. Vi har mottatt din forespørsel og går gjennom detaljene nå. Vi tar kontakt innen 1–2 virkedager.\n\nMed vennlig hilsen,\n${authorName}\n${companyName}`,
    companyName,
    authorName,
    type: 'general',
    metadata: { leadEmail, type: 'lead_inquiry' }
  });
}

/**
 * 2. KUNDE: Vennlig påminnelse og assistanse for ubesvart pristilbud
 */
export async function sendOfferReminderEmail(params: {
  offer: any;
  clientEmail: string;
  clientName?: string;
  companyName?: string;
  authorName?: string;
  replyTo?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    offer,
    clientEmail,
    clientName,
    companyName = 'Mester Entreprenør AS',
    authorName = 'Byggmester',
    replyTo,
    baseUrl = 'https://vikingmester.no'
  } = params;

  const token = offer.token || offer.id;
  const approvalLink = `${baseUrl}/?offerToken=${token}`;
  const cName = clientName || offer.clientName || 'Kjære kunde';
  const totalAmount = Number(offer.totalAmount || offer.total || 0);

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #0284c7; padding: 24px 20px; color: #ffffff; }
        .content { padding: 24px 20px; line-height: 1.6; color: #334155; }
        .btn { background-color: #059669; color: #ffffff !important; font-weight: 700; padding: 14px 26px; border-radius: 10px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin: 0; font-size: 20px;">Lurer du på noe rundt tilbudet ditt?</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">${companyName} følger opp «${offer.title || 'Pristilbud'}»</p>
        </div>
        <div class="content">
          <p style="margin-top: 0;">Hei <strong>${cName}</strong>,</p>
          <p>
            Vi sendte deg nylig et spesifisert pristilbud på <strong>${offer.title || 'avtalt arbeid'}</strong> 
            med totalsum <strong>kr ${totalAmount.toLocaleString('no-NO')} inkl. mva</strong>.
          </p>
          <p>
            Vi ønsker bare å høre om du har hatt anledning til å se over det, eller om det er spørsmål, tilpasninger eller detaljer du gjerne vil gå gjennom med oss.
          </p>
          ${renderBulletproofButton({
            url: approvalLink,
            label: 'Se tilbudet og godkjenn her',
            icon: '👉',
            bgColor: '#059669',
            borderColor: '#047857'
          })}
          <p style="font-size: 13px; color: #64748b;">
            Dersom du ønsker justeringer i materialvalg, tidsplan eller omfang, er det bare å svare direkte på denne e-posten, så hjelper vi deg med det samme!
          </p>
          <p style="margin-bottom: 0;">Med vennlig hilsen,<br><strong>${authorName}</strong><br>${companyName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: clientEmail,
    subject: `Oppfølging: Pristilbud på ${offer.title || 'arbeid'} – ${companyName}`,
    html: emailHtml,
    text: `Hei ${cName}!\n\nVi følger opp tilbudet på ${offer.title} (kr ${totalAmount.toLocaleString('no-NO')} inkl. mva). Lurer du på noe eller ønsker justeringer?\n\nSe tilbudet her: ${approvalLink}\n\nMed vennlig hilsen,\n${authorName}\n${companyName}`,
    companyName,
    authorName,
    replyTo,
    type: 'offer',
    metadata: { offerId: offer.id, type: 'offer_reminder' }
  });
}

/**
 * 3. KUNDE: Informasjon om avvik / uforutsette forhold på byggeplass med assistanse og tiltak
 */
export async function sendCustomerDeviationNoticeEmail(params: {
  clientEmail: string;
  clientName?: string;
  projectName: string;
  deviationTitle: string;
  deviationDescription: string;
  proposedAction: string;
  impactOnTimelineOrCost?: string;
  companyName?: string;
  authorName?: string;
  replyTo?: string;
  portalUrl?: string;
}): Promise<SendEmailResult> {
  const {
    clientEmail,
    clientName = 'Kjære kunde',
    projectName,
    deviationTitle,
    deviationDescription,
    proposedAction,
    impactOnTimelineOrCost,
    companyName = 'Mester Entreprenør AS',
    authorName = 'Prosjektleder',
    replyTo,
    portalUrl
  } = params;

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #d97706; padding: 24px 20px; color: #ffffff; }
        .content { padding: 24px 20px; line-height: 1.6; color: #334155; }
        .info-box { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 8px; margin: 18px 0; }
        .action-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #10b981; padding: 14px; border-radius: 8px; margin: 18px 0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span style="background: rgba(255,255,255,0.25); color: white; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Statusoppdatering Byggeplass</span>
          <h2 style="margin: 8px 0 0 0; font-size: 20px;">Uforutsett forhold avdekket på ${projectName}</h2>
        </div>
        <div class="content">
          <p style="margin-top: 0;">Hei <strong>${clientName}</strong>,</p>
          <p>
            Som ledd i vår løpende kvalitetssikring og åpne dialog under byggeprosjektet, vil vi informere om at vi har registrert et forhold som krever tiltak:
          </p>

          <div class="info-box">
            <strong style="color: #92400e; font-size: 14px;">${deviationTitle}</strong>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #78350f;">${deviationDescription}</p>
          </div>

          <div class="action-box">
            <strong style="color: #166534; font-size: 14px;">🛠️ Vår anbefalte løsning / strakstiltak:</strong>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #14532d;">${proposedAction}</p>
          </div>

          ${impactOnTimelineOrCost ? `
          <p style="font-size: 13px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
            ⏱️ <strong>Konsekvens for fremdrift/budsjett:</strong> ${impactOnTimelineOrCost}
          </p>
          ` : ''}

          ${portalUrl ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" style="background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">📸 Se bilder og detaljer i Byggherreportalen</a>
          </div>
          ` : ''}

          <p style="font-size: 13px; color: #64748b;">
            Våre håndverkere sørger for at alt dokumenteres i tråd med TEK17 og NS 8406. Svar gjerne på denne e-posten dersom du har spørsmål.
          </p>
          <p style="margin-bottom: 0;">Med vennlig hilsen,<br><strong>${authorName}</strong><br>${companyName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: clientEmail,
    subject: `Statusoppdatering & Avvik: ${deviationTitle} – ${projectName}`,
    html: emailHtml,
    text: `Hei ${clientName}!\n\nVi har registrert et uforutsett forhold på ${projectName}: ${deviationTitle}.\n\nTiltak: ${proposedAction}\n\nMed vennlig hilsen,\n${authorName}\n${companyName}`,
    companyName,
    authorName,
    replyTo,
    type: 'notice',
    metadata: { projectName, deviationTitle, type: 'deviation_notice' }
  });
}

/**
 * 4. ADMIN: Varsel om at kunde har signert byggekontrakt
 */
export async function sendAdminContractSignedAlertEmail(params: {
  adminEmail: string;
  adminName?: string;
  clientName: string;
  projectName: string;
  totalAmount: number;
  projectId: string;
  companyName?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    adminEmail,
    adminName = 'Leder',
    clientName,
    projectName,
    totalAmount,
    projectId,
    companyName = 'VikingMester',
    baseUrl = 'https://vikingmester.no'
  } = params;

  const projectUrl = `${baseUrl}/?project=${projectId}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #059669; padding: 24px 20px; color: #ffffff; }
        .content { padding: 24px 20px; line-height: 1.6; color: #334155; }
        .btn { background: #0f172a; color: white !important; font-weight: 700; padding: 14px 24px; border-radius: 10px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span style="background: rgba(255,255,255,0.25); color: white; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Kontrakt I Boks</span>
          <h2 style="margin: 8px 0 0 0; font-size: 20px;">🎉 Kontrakt signert for ${projectName}!</h2>
        </div>
        <div class="content">
          <p style="margin-top: 0;">Hei <strong>${adminName}</strong>,</p>
          <p>
            Gode nyheter! <strong>${clientName}</strong> har nettopp signert byggekontrakten for <strong>${projectName}</strong> digitalt.
          </p>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin: 18px 0; font-size: 14px;">
            <div>Avtalt kontraktssum: <strong style="color: #059669; font-size: 16px;">kr ${totalAmount.toLocaleString('no-NO')} inkl. mva</strong></div>
            <div style="color: #64748b; font-size: 12px; margin-top: 4px;">Juridisk bindende signatur med tidsstempel og IP-logg er arkivert.</div>
          </div>
          ${renderBulletproofButton({
            url: projectUrl,
            label: 'Åpne prosjekt & Tildel håndverkere',
            icon: '🚀',
            bgColor: '#059669',
            borderColor: '#047857'
          })}
          <p style="font-size: 13px; color: #64748b;">
            Mesterhjernen har automatisk forberedt KS-sjekklister, vernerunde-maler og FDV-perm for prosjektet.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: adminEmail,
    subject: `🎉 Kontrakt signert av ${clientName}: ${projectName} (kr ${totalAmount.toLocaleString('no-NO')})`,
    html: emailHtml,
    text: `Hei ${adminName}!\n\n${clientName} har signert byggekontrakten for ${projectName} (kr ${totalAmount.toLocaleString('no-NO')} inkl. mva).\n\nÅpne prosjektet her: ${projectUrl}`,
    companyName,
    authorName: 'VikingMester Systemvarsel',
    type: 'general',
    metadata: { projectId, clientName, totalAmount, type: 'contract_signed_alert' }
  });
}

/**
 * 5. ADMIN: Kritisk avviksvarsel fra byggeplass som krever ledergodkjenning
 */
export async function sendAdminNewDeviationAlertEmail(params: {
  adminEmail: string;
  adminName?: string;
  craftsmanName: string;
  projectName: string;
  deviationTitle: string;
  severity: 'lav' | 'middels' | 'høy' | 'kritisk';
  description: string;
  deviationId: string;
  companyName?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    adminEmail,
    adminName = 'Leder',
    craftsmanName,
    projectName,
    deviationTitle,
    severity,
    description,
    deviationId,
    companyName = 'VikingMester',
    baseUrl = 'https://vikingmester.no'
  } = params;

  const deviationUrl = `${baseUrl}/?deviation=${deviationId}`;
  const isHighOrCritical = severity === 'høy' || severity === 'kritisk';

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: ${isHighOrCritical ? '#dc2626' : '#ea580c'}; padding: 24px 20px; color: #ffffff; }
        .content { padding: 24px 20px; line-height: 1.6; color: #334155; }
        .btn { background: #0f172a; color: white !important; font-weight: 700; padding: 14px 24px; border-radius: 10px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span style="background: rgba(255,255,255,0.25); color: white; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
            Avvik Registrert • ${severity.toUpperCase()} ALVORLIGHET
          </span>
          <h2 style="margin: 8px 0 0 0; font-size: 20px;">Nytt avvik på ${projectName}</h2>
        </div>
        <div class="content">
          <p style="margin-top: 0;">Hei <strong>${adminName}</strong>,</p>
          <p>
            Fagarbeider <strong>${craftsmanName}</strong> har registrert et avvik som krever din vurdering og godkjenning av tiltak:
          </p>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 14px; border-radius: 8px; margin: 18px 0;">
            <strong style="color: #991b1b; font-size: 15px;">${deviationTitle}</strong>
            <p style="margin: 6px 0 0 0; color: #7f1d1d; font-size: 13px;">${description}</p>
          </div>

          ${renderBulletproofButton({
            url: deviationUrl,
            label: 'Se avvik & Iverksett tiltak',
            icon: '🔍',
            bgColor: '#dc2626',
            borderColor: '#b91c1c'
          })}

          <p style="font-size: 12px; color: #64748b;">
            Husk: Rask lukking av avvik sikrer overholdelse av TEK17 og forhindrer unødige forsinkelser og ekstrakostnader.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: adminEmail,
    subject: `⚠️ Avviksvarsel (${severity.toUpperCase()}): ${deviationTitle} – ${projectName}`,
    html: emailHtml,
    text: `Hei ${adminName}!\n\n${craftsmanName} har registrert et avvik med ${severity} alvorlighet på ${projectName}: ${deviationTitle}.\n\nSe detaljer her: ${deviationUrl}`,
    companyName,
    authorName: 'VikingMester Avvikskontroll',
    type: 'notice',
    metadata: { deviationId, projectName, severity, type: 'admin_deviation_alert' }
  });
}

/**
 * 6. ADMIN: Velkomst og 3-trinns onboarding-assistanse for ny lederbruker
 */
export async function sendAdminOnboardingAssistanceEmail(params: {
  adminEmail: string;
  adminName: string;
  companyName: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    adminEmail,
    adminName,
    companyName,
    baseUrl = 'https://vikingmester.no'
  } = params;

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #0f172a; padding: 28px 20px; color: #ffffff; text-align: left; }
        .content { padding: 26px 20px; line-height: 1.6; color: #334155; }
        .step-item { display: flex; margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
        .step-num { width: 32px; height: 32px; background: #0284c7; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 14px; flex-shrink: 0; }
        .btn { background: #059669; color: white !important; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span style="background: #10b981; color: white; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Velkommen til VikingMester</span>
          <h2 style="margin: 8px 0 0 0; font-size: 22px;">Gratulerer med ny lederkonto, ${adminName}!</h2>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Oppsett for <strong>${companyName}</strong></p>
        </div>
        <div class="content">
          <p style="margin-top: 0; font-size: 15px;">
            VikingMester er laget for å fjerne 90% av papirarbeidet i byggeprosjektene dine. Her er 3 enkle steg for å komme i gang:
          </p>

          <div style="margin: 22px 0;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px;">
              <strong style="color: #0f172a; font-size: 14px;">1. Sett opp firmaprofil & logo</strong>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Legg inn logo, org.nr og bankdetaljer så alle tilbud, kontrakter og FDV-permer blir proffe med én gang.</p>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px;">
              <strong style="color: #0f172a; font-size: 14px;">2. Inviter fagarbeiderne dine</strong>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Håndverkerne logger inn på mobil uten passord-stress, fyller ut sjekklister med tale-til-tekst og tar fotobevis direkte.</p>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
              <strong style="color: #0f172a; font-size: 14px;">3. Opprett ditt første prosjekt eller tilbud</strong>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Skriv noen stikkord, så bygger Mesterhjernen komplett tilbud, NS 8406-kontrakt og fagspesifikke sjekklister automatisk.</p>
            </div>
          </div>

          ${renderBulletproofButton({
            url: baseUrl,
            label: 'Logg inn på kontrollpanelet ditt',
            icon: '🚀',
            bgColor: '#059669',
            borderColor: '#047857'
          })}

          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Trenger du hjelp eller tips? Vår integrerte AI-assistent er tilgjengelig døgnet rundt direkte i chatten nederst i appen.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: adminEmail,
    subject: `Velkommen til VikingMester – 3 enkle steg for å komme i gang for ${companyName}`,
    html: emailHtml,
    text: `Hei ${adminName}!\n\nVelkommen til VikingMester for ${companyName}.\n\nLogg inn her for å sette opp firmaprofil, invitere ansatte og opprette ditt første prosjekt:\n${baseUrl}`,
    companyName: 'VikingMester',
    authorName: 'Onboarding Team',
    type: 'general',
    metadata: { adminEmail, type: 'admin_onboarding' }
  });
}

/**
 * 7. HÅNDVERKER: Tildeling av nytt prosjekt / oppgave med direkte mobil-knapp
 */
export async function sendCraftsmanTaskAssignedEmail(params: {
  craftsmanEmail: string;
  craftsmanName: string;
  projectName: string;
  taskTitle: string;
  taskDescription?: string;
  projectAddress?: string;
  deadline?: string;
  companyName?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    craftsmanEmail,
    craftsmanName,
    projectName,
    taskTitle,
    taskDescription,
    projectAddress,
    deadline,
    companyName = 'Mester Entreprenør AS',
    baseUrl = 'https://vikingmester.no'
  } = params;

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #0f172a; padding: 24px 20px; color: #ffffff; }
        .content { padding: 24px 20px; line-height: 1.6; color: #334155; }
        .task-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin: 18px 0; }
        .btn { background: #0284c7; color: white !important; font-weight: 700; padding: 14px 24px; border-radius: 10px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span style="background: #0284c7; color: white; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Nytt Oppdrag</span>
          <h2 style="margin: 8px 0 0 0; font-size: 20px;">Du er tildelt oppgave på ${projectName}</h2>
        </div>
        <div class="content">
          <p style="margin-top: 0;">Hei <strong>${craftsmanName}</strong>,</p>
          <p>Du har fått tildelt et nytt arbeidsoppdrag fra <strong>${companyName}</strong>:</p>

          <div class="task-box">
            <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #0f172a;">${taskTitle}</h3>
            ${taskDescription ? `<p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">${taskDescription}</p>` : ''}
            <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
              ${projectAddress ? `📍 <strong>Adresse:</strong> ${projectAddress}<br>` : ''}
              ${deadline ? `📅 <strong>Frist / Tidsramme:</strong> ${deadline}<br>` : ''}
              📋 <strong>Krav:</strong> Sjekklister og fotodokumentasjon fylles ut direkte på mobil underveis.
            </div>
          </div>

          ${renderBulletproofButton({
            url: baseUrl,
            label: 'Åpne oppgave & Sjekkliste på mobil',
            icon: '📱',
            bgColor: '#0284c7',
            borderColor: '#0369a1'
          })}

          <p style="font-size: 12px; color: #64748b;">
            💡 <em>Husk at du kan bruke mikrofon-ikonet i appen for å snakke inn notater mens du jobber med verneutstyr!</em>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: craftsmanEmail,
    subject: `📋 Ny oppgave tildelt: ${taskTitle} – ${projectName}`,
    html: emailHtml,
    text: `Hei ${craftsmanName}!\n\nDu er tildelt oppgaven «${taskTitle}» på ${projectName}.\n\nÅpne på mobil her: ${baseUrl}`,
    companyName,
    authorName: 'Oppdragsledelse',
    type: 'general',
    metadata: { craftsmanEmail, projectName, taskTitle, type: 'craftsman_task_assigned' }
  });
}

/**
 * 8. HÅNDVERKER: Tildeling av avvik som må utbedres med fotokrav
 */
export async function sendCraftsmanDeviationAssignedEmail(params: {
  craftsmanEmail: string;
  craftsmanName: string;
  projectName: string;
  deviationTitle: string;
  actionRequired: string;
  deadline?: string;
  deviationId: string;
  companyName?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    craftsmanEmail,
    craftsmanName,
    projectName,
    deviationTitle,
    actionRequired,
    deadline,
    deviationId,
    companyName = 'Mester Entreprenør AS',
    baseUrl = 'https://vikingmester.no'
  } = params;

  const deviationUrl = `${baseUrl}/?deviation=${deviationId}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #ea580c; padding: 24px 20px; color: #ffffff; }
        .content { padding: 24px 20px; line-height: 1.6; color: #334155; }
        .action-box { background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; padding: 14px; border-radius: 8px; margin: 18px 0; }
        .btn { background: #0f172a; color: white !important; font-weight: 700; padding: 14px 24px; border-radius: 10px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span style="background: rgba(255,255,255,0.25); color: white; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Utbedringspålegg</span>
          <h2 style="margin: 8px 0 0 0; font-size: 20px;">Avvik tildelt for utbedring</h2>
        </div>
        <div class="content">
          <p style="margin-top: 0;">Hei <strong>${craftsmanName}</strong>,</p>
          <p>Følgende avvik på <strong>${projectName}</strong> er tildelt deg for retting:</p>

          <div class="action-box">
            <h3 style="margin: 0 0 6px 0; font-size: 15px; color: #9a3412;">${deviationTitle}</h3>
            <p style="margin: 0; font-size: 13px; color: #7c2d12;"><strong>Påkrevd tiltak:</strong> ${actionRequired}</p>
            ${deadline ? `<div style="margin-top: 8px; font-size: 12px; color: #9a3412;">📅 <strong>Utbedringsfrist:</strong> ${deadline}</div>` : ''}
          </div>

          <p style="font-size: 13px; color: #334155;">
            📸 <strong>Viktig:</strong> Når du har rettet avviket, må du ta etter-bilde med mobilen og markere avviket som utbedret. Bildet overføres automatisk til FDV-permen.
          </p>

          <div style="text-align: center; margin: 26px 0;">
            <a href="${deviationUrl}" class="btn" target="_blank">📲 Åpne avviket & Last opp etter-bilde</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: craftsmanEmail,
    subject: `🛠️ Utbedring kreves: ${deviationTitle} – ${projectName}`,
    html: emailHtml,
    text: `Hei ${craftsmanName}!\n\nDu er tildelt utbedring av avviket «${deviationTitle}» på ${projectName}.\nTiltak: ${actionRequired}\n\nÅpne og last opp etter-bilde her: ${deviationUrl}`,
    companyName,
    authorName: 'KS-Ansvarlig',
    type: 'notice',
    metadata: { deviationId, craftsmanEmail, projectName, type: 'craftsman_deviation_assigned' }
  });
}

/**
 * 9. HÅNDVERKER: Påminnelse om ufullstendige sjekklister før helg/milepæl
 */
export async function sendCraftsmanChecklistReminderEmail(params: {
  craftsmanEmail: string;
  craftsmanName: string;
  projectName: string;
  pendingCount: number;
  companyName?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    craftsmanEmail,
    craftsmanName,
    projectName,
    pendingCount,
    companyName = 'Mester Entreprenør AS',
    baseUrl = 'https://vikingmester.no'
  } = params;

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #3b82f6; padding: 22px 20px; color: #ffffff; }
        .content { padding: 24px 20px; line-height: 1.6; color: #334155; }
        .btn { background: #0f172a; color: white !important; font-weight: 700; padding: 14px 24px; border-radius: 10px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin: 0; font-size: 20px;">📋 Påminnelse: ${pendingCount} sjekkpunkter gjenstår</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">${projectName}</p>
        </div>
        <div class="content">
          <p style="margin-top: 0;">Hei <strong>${craftsmanName}</strong>,</p>
          <p>
            For å sikre at vi er i rute med KS-dokumentasjonen og godkjenning for fakturering, minner vi om at du har <strong>${pendingCount} ubesvarte sjekkpunkter</strong> på <strong>${projectName}</strong>.
          </p>
          <div style="text-align: center; margin: 26px 0;">
            <a href="${baseUrl}" class="btn" target="_blank">📱 Fullfør sjekkliste på mobil</a>
          </div>
          <p style="font-size: 12px; color: #64748b;">
            Det tar bare 2 minutter med mobil-knappene. Takk for innsatsen!
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSystemEmail({
    to: craftsmanEmail,
    subject: `📋 KS-påminnelse: ${pendingCount} sjekkpunkter på ${projectName}`,
    html: emailHtml,
    text: `Hei ${craftsmanName}!\n\nDu har ${pendingCount} ubesvarte sjekkpunkter på ${projectName}.\n\nFullfør på mobil her: ${baseUrl}`,
    companyName,
    authorName: 'KS-Kvalitetssikring',
    type: 'general',
    metadata: { craftsmanEmail, projectName, pendingCount, type: 'craftsman_checklist_reminder' }
  });
}


