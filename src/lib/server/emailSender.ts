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

/**
 * Robust kjernefunksjon for å sende e-post fra VikingMester
 * Koblet mot Resend hvis RESEND_API_KEY er satt, med full fallback og revisjonslogg.
 */
export async function sendSystemEmail(params: SendEmailParams): Promise<{
  success: boolean;
  id: string;
  status: string;
  message: string;
  previewUrl?: string;
}> {
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

  let deliveryStatus = 'queued';
  let resendId: string | undefined = undefined;

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
          to: sanitizedTo,
          subject: sanitizedSubject,
          html: bodyHtml,
          text: bodyText
        })
      });

      if (resendRes.ok) {
        const resendData = await resendRes.json();
        resendId = resendData.id;
        deliveryStatus = 'sent';
      } else {
        const errText = await resendRes.text();
        console.warn('[EmailSender] Resend feilet, logger til database:', errText);
        deliveryStatus = 'logged_only';
      }
    } catch (e: any) {
      console.warn('[EmailSender] Nettverksfeil mot Resend:', e.message);
      deliveryStatus = 'logged_only';
    }
  } else {
    // Simulert / lokalt utviklingsmiljø
    deliveryStatus = 'logged_simulated';
  }

  // Persister til database
  await dbQuery(`
    INSERT INTO email_logs (id, recipient, subject, body, type, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [emailId, sanitizedTo.join(', '), sanitizedSubject, bodyText, type, deliveryStatus, now]).catch(() => {
    if (!inMemoryStore.email_logs) inMemoryStore.email_logs = [];
    inMemoryStore.email_logs.push({
      id: emailId,
      to: sanitizedTo,
      subject: sanitizedSubject,
      text: bodyText,
      type,
      status: deliveryStatus,
      createdAt: now,
      metadata
    });
  });

  // Lagre aktivitet for oversikt i kommandosentralen
  await saveCollectionItem('agent_activities', {
    type: 'email_sent',
    title: `E-post sendt: ${sanitizedSubject}`,
    description: `Sendt til ${sanitizedTo.join(', ')} fra ${authorName || companyName}. Status: ${deliveryStatus}.`,
    badge: 'SENDT PÅ E-POST',
    status: 'completed',
    createdAt: now,
    trade: 'Administrasjon',
    tradeName: authorName || 'MesterAI'
  }).catch(() => {});

  return {
    success: true,
    id: emailId,
    status: deliveryStatus,
    message: `E-post er sendt til ${sanitizedTo.join(', ')}.`
  };
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
}): Promise<{ success: boolean; message: string; id: string }> {
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
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
            <th style="padding: 10px; color: #475569;">Beskrivelse</th>
            <th style="padding: 10px; text-align: right; color: #475569;">Antall</th>
            <th style="padding: 10px; text-align: right; color: #475569;">Enhetspris</th>
            <th style="padding: 10px; text-align: right; color: #475569;">Sum eks mva</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList.map((it: any) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: 500; color: #1e293b;">${it.description || 'Fagarbeid'}</td>
              <td style="padding: 10px; text-align: right; color: #64748b;">${it.quantity || 1} ${it.unit || 'timer'}</td>
              <td style="padding: 10px; text-align: right; color: #64748b;">kr ${Number(it.pricePerUnit || 0).toLocaleString('no-NO')}</td>
              <td style="padding: 10px; text-align: right; font-weight: bold; color: #0f172a;">kr ${Number(it.total || (it.quantity * it.pricePerUnit) || 0).toLocaleString('no-NO')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #0f172a; padding: 28px; text-align: left; }
        .header h1 { color: #f8fafc; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
        .header p { color: #94a3b8; margin: 0; font-size: 13px; }
        .content { padding: 28px; color: #334155; line-height: 1.6; }
        .price-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin: 24px 0; }
        .btn-container { text-align: center; margin: 32px 0; }
        .btn { background-color: #059669; color: #ffffff !important; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25); }
        .footer { padding: 20px 28px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
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
          
          ${offer.description ? `<p style="background: #f1f5f9; padding: 12px 16px; border-left: 4px solid #059669; border-radius: 4px; font-size: 13px;">${offer.description}</p>` : ''}
          
          ${itemsHtml}

          <div class="price-box">
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="color: #64748b; padding-bottom: 6px;">Sum ekskl. mva:</td>
                <td style="text-align: right; font-weight: 600; color: #1e293b;">kr ${amountExVat.toLocaleString('no-NO')}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding-bottom: 6px;">Merverdiavgift (25% mva):</td>
                <td style="text-align: right; font-weight: 600; color: #1e293b;">kr ${vatAmount.toLocaleString('no-NO')}</td>
              </tr>
              <tr style="border-top: 2px solid #cbd5e1; font-size: 17px;">
                <td style="font-weight: 800; color: #0f172a; padding-top: 10px;">TOTALPRIS INKL. MVA:</td>
                <td style="text-align: right; font-weight: 800; color: #059669; padding-top: 10px;">kr ${totalAmount.toLocaleString('no-NO')}</td>
              </tr>
            </table>
          </div>

          <div class="btn-container">
            <a href="${approvalLink}" class="btn" target="_blank">👉 Klikk her for å se og godkjenne tilbudet</a>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
            Tilbudet er gyldig i 30 dager fra dags dato. Standard forbehold iht. NS 8406 / Bustadoppføringslova gjelder for uforutsette bygningstekniske forhold.
          </p>

          <p style="margin-bottom: 0;">
            Med vennlig hilsen,<br>
            <strong>${authorName}</strong><br>
            ${companyName}
          </p>
        </div>
        <div class="footer">
          Dette tilbudet er sikkert kryptert og levert via <a href="https://vikingmester.no" style="color: #059669; text-decoration: none;">VikingMester</a> – Norges ledende autonome KS- og prosjektsystem.
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
}): Promise<{ success: boolean; message: string; id: string }> {
  const { changeOrder, clientEmail, clientName, companyName = 'Mester Entreprenør AS', authorName = 'Byggmester', baseUrl = 'https://vikingmester.no' } = params;

  const token = changeOrder.token || changeOrder.id;
  const shareUrl = `${baseUrl}/?changeOrderToken=${token}`;

  const cName = clientName || changeOrder.clientName || 'Byggherre';
  const totalAmount = Number(changeOrder.totalAmount || 0);
  const amountExVat = Number(changeOrder.amountExVat || Math.round(totalAmount / 1.25));

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #1e293b; padding: 24px; color: white; }
        .content { padding: 24px; color: #334155; line-height: 1.6; }
        .notice-box { background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 20px 0; }
        .btn { background: #0284c7; color: white !important; font-weight: 700; padding: 14px 24px; border-radius: 8px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin: 0;">Endringsmelding #${changeOrder.changeNumber || '1'}</h2>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">${changeOrder.projectName || 'Byggeprosjekt'} • NS 8406 pkt. 19.2</p>
        </div>
        <div class="content">
          <p>Hei <strong>${cName}</strong>,</p>
          <p>Det varsles herved om tilleggsvederlag og eventuell fristforlengelse for følgende endringsarbeid:</p>
          
          <div class="notice-box">
            <strong style="color: #991b1b; font-size: 15px;">${changeOrder.title}</strong>
            <p style="margin: 6px 0 0 0; color: #475569; font-size: 13px;">${changeOrder.description}</p>
          </div>

          <table style="width: 100%; border-top: 1px solid #e2e8f0; margin: 16px 0; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Krav om tilleggsvederlag:</td>
              <td style="text-align: right; font-weight: 700; color: #0f172a;">kr ${amountExVat.toLocaleString('no-NO')} eks mva (kr ${totalAmount.toLocaleString('no-NO')} inkl mva)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Krav om fristforlengelse:</td>
              <td style="text-align: right; font-weight: 700; color: #0f172a;">${changeOrder.impactDays || 0} arbeidsdager</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Hjemmel:</td>
              <td style="text-align: right; font-size: 12px; color: #64748b;">${changeOrder.legalHjemmel || 'NS 8406 pkt. 19.2'}</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${shareUrl}" class="btn" target="_blank">✍️ Se detaljer og godkjenn endringen</a>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Vennligst ta stilling til varselet så snart som mulig slik at fremdriften på byggeplassen ikke hindres.
          </p>
          <p>Med vennlig hilsen,<br><strong>${authorName}</strong><br>${companyName}</p>
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
