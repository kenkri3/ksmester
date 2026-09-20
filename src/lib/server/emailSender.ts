import { dbQuery, inMemoryStore, saveCollectionItem } from './db';
import { sanitizeHeader } from '../sanitize';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  type?: 'offer' | 'change_order' | 'general' | 'notice';
  metadata?: Record<string, any>;
  companyName?: string;
  authorName?: string;
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
  const bodyText = text || '';
  const bodyHtml = html || `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.6;color:#1e293b;padding:20px;">${bodyText}</div>`;

  const emailId = 'email-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  let deliveryStatus: 'sent' | 'failed' | 'missing_api_key' | 'logged_only' | 'logged_simulated' = 'logged_simulated';
  let resendId: string | undefined = undefined;
  let sendError: string | undefined = undefined;

  const resendKey = getResendApiKey();
  const preferredFrom = (process.env.EMAIL_FROM || process.env.RESEND_FROM || 'VikingMester <hei@vikingmester.no>').trim();
  const replyTo = (process.env.EMAIL_REPLY_TO || 'hei@vikingmester.no').trim();
  let activeFrom = preferredFrom;

  if (resendKey) {
    try {
      let resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: activeFrom,
          reply_to: replyTo,
          to: sanitizedTo,
          subject: sanitizedSubject,
          html: bodyHtml,
          text: bodyText
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
          activeFrom = 'VikingMester <onboarding@resend.dev>';
          resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`
            },
            body: JSON.stringify({
              from: activeFrom,
              reply_to: replyTo,
              to: sanitizedTo,
              subject: sanitizedSubject,
              html: bodyHtml,
              text: bodyText
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
    await saveCollectionItem('agent_activities', {
      type: 'email_sent',
      title: `E-post sendt: ${sanitizedSubject}`,
      description: `Sendt til ${sanitizedTo.join(', ')} via Resend (ID: ${resendId}). Avsender: ${activeFrom}.`,
      badge: 'SENDT PÅ E-POST',
      status: 'completed',
      createdAt: now,
      trade: 'Administrasjon',
      tradeName: authorName || 'MesterAI'
    }).catch(() => {});
  } else if (deliveryStatus === 'missing_api_key') {
    await saveCollectionItem('agent_activities', {
      type: 'email_not_sent',
      title: `E-post ikke sendt: ${sanitizedSubject}`,
      description: `Utsendelse til ${sanitizedTo.join(', ')} ble avbrutt: RESEND_API_KEY mangler i Railway.`,
      badge: 'MANGLER API-NØKKEL',
      status: 'warning',
      createdAt: now,
      trade: 'Administrasjon',
      tradeName: authorName || companyName
    }).catch(() => {});
  } else {
    await saveCollectionItem('agent_activities', {
      type: 'email_failed',
      title: `E-post feilet: ${sanitizedSubject}`,
      description: `Forsøk på å sende til ${sanitizedTo.join(', ')} feilet via Resend: ${sendError}`,
      badge: 'SENDING FEILET',
      status: 'error',
      createdAt: now,
      trade: 'Administrasjon',
      tradeName: authorName || 'MesterAI'
    }).catch(() => {});
  }

  if (deliveryStatus === 'sent') {
    return {
      success: true,
      id: emailId,
      resendId,
      status: 'sent',
      fromUsed: activeFrom,
      message: `E-post er levert via Resend til ${sanitizedTo.join(', ')} (Meldings-ID: ${resendId}).`
    };
  } else if (deliveryStatus === 'missing_api_key') {
    return {
      success: false,
      id: emailId,
      status: 'missing_api_key',
      fromUsed: activeFrom,
      message: 'RESEND_API_KEY er ikke konfigurert i miljøvariablene (f.eks. Railway). E-posten ble ikke levert.',
      error: sendError
    };
  } else {
    return {
      success: false,
      id: emailId,
      status: 'failed',
      fromUsed: activeFrom,
      message: `Kunne ikke levere e-post via Resend: ${sendError}`,
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
  authorName?: string;
  customMessage?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const { offer, clientEmail, clientName, companyName = 'Mester Entreprenør AS', authorName = 'Byggmester', customMessage, baseUrl = 'https://vikingmester.no' } = params;

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

          <div class="btn-container">
            <a href="${approvalLink}" class="btn" target="_blank">👉 Klikk her for å se og godkjenne tilbudet</a>
          </div>

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
    subject: `Pristilbud: ${offer.title || 'Fagarbeid'} – ${companyName}`,
    html: emailHtml,
    text: `Hei ${cName}!\n\nVi har oversendt tilbudet «${offer.title}» på kr ${totalAmount.toLocaleString('no-NO')} inkl. mva.\n\nKlikk her for å se og godkjenne tilbudet: ${approvalLink}\n\nMed vennlig hilsen,\n${authorName}\n${companyName}`,
    type: 'offer',
    companyName,
    authorName,
    metadata: { offerId: offer.id, token, clientEmail }
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
  authorName?: string;
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const { changeOrder, clientEmail, clientName, companyName = 'Mester Entreprenør AS', authorName = 'Byggmester', baseUrl = 'https://vikingmester.no' } = params;

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

          <div style="text-align: center; margin: 26px 0;">
            <a href="${shareUrl}" class="btn" target="_blank">✍️ Se detaljer og godkjenn endringen</a>
          </div>

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
    subject: `Endringsvarsel #${changeOrder.changeNumber || '1'}: ${changeOrder.title} – ${companyName}`,
    html: emailHtml,
    text: `Hei ${cName}!\n\nDet er registrert et endringsvarsel for ${changeOrder.projectName}:\n${changeOrder.title} (kr ${totalAmount.toLocaleString('no-NO')} inkl. mva).\n\nGodkjenn her: ${shareUrl}\n\nMed vennlig hilsen,\n${authorName}`,
    type: 'change_order',
    companyName,
    authorName,
    metadata: { changeOrderId: changeOrder.id, token, clientEmail }
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
  baseUrl?: string;
}): Promise<SendEmailResult> {
  const {
    contract,
    clientEmail,
    clientName,
    companyName = 'Mester Entreprenør AS',
    authorName = 'Ansvarlig Byggmester',
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

          <div class="btn-container">
            <a href="${signUrl}" class="btn" target="_blank">✍️ Signer kontrakten digitalt</a>
          </div>

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
    type: 'general',
    companyName,
    authorName,
    metadata: { contractId: contract.id, token, clientEmail }
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
          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}" class="btn" target="_blank">📲 Følg fremdriften i Byggherreportalen</a>
          </div>
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

          <div style="text-align: center; margin: 28px 0;">
            <a href="${portalUrl}" class="btn" target="_blank">📄 Åpne FDV-perm & Last ned PDF</a>
          </div>

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

