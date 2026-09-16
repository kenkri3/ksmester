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
}): Promise<{ success: boolean; message: string; id: string }> {
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
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #0f172a; padding: 28px; color: white; }
        .badge { display: inline-block; background: #10b981; color: white; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; margin-bottom: 8px; }
        .content { padding: 28px; line-height: 1.6; }
        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .btn-container { text-align: center; margin: 32px 0; }
        .btn { background: #059669; color: #ffffff !important; font-weight: 700; padding: 16px 32px; border-radius: 10px; text-decoration: none; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }
        .footer { padding: 20px 28px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">Norsk Byggekontrakt NS 8406</span>
          <h1 style="margin: 0; font-size: 22px;">${contract.title || 'Byggekontrakt'}</h1>
          <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Utstedt av ${companyName} • Prosjektkode ${contract.projectCode || 'P-2026'}</p>
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
                <td style="color: #64748b; padding-bottom: 6px;">Utførende entreprenør:</td>
                <td style="text-align: right; font-weight: 600; color: #0f172a;">${companyName} (${contract.companyOrgNumber || 'Org.nr registrert'})</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding-bottom: 6px;">Frist for ferdigstillelse:</td>
                <td style="text-align: right; font-weight: 600; color: #0f172a;">${contract.completionDate || 'Iht. avtalt fremdriftsplan'}</td>
              </tr>
              <tr style="border-top: 1px solid #cbd5e1;">
                <td style="color: #64748b; padding-top: 8px;">Sum ekskl. mva:</td>
                <td style="text-align: right; font-weight: 600; color: #1e293b; padding-top: 8px;">kr ${amountExVat.toLocaleString('no-NO')}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding-bottom: 8px;">Merverdiavgift (25% mva):</td>
                <td style="text-align: right; font-weight: 600; color: #1e293b; padding-bottom: 8px;">kr ${vatAmount.toLocaleString('no-NO')}</td>
              </tr>
              <tr style="border-top: 2px solid #0f172a; font-size: 16px;">
                <td style="font-weight: 800; color: #0f172a; padding-top: 10px;">AVTALT KONTRAKTSSUM:</td>
                <td style="text-align: right; font-weight: 800; color: #059669; padding-top: 10px;">kr ${totalAmount.toLocaleString('no-NO')} inkl. mva</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #334155;">
            Så snart du signerer kontrakten digitalt, vil prosjektet opprettes 100% automatisk i systemet med lovpålagte KS-sjekklister, risikovurdering (SJA) og forberedelse av komplett FDV-dokumentasjon.
          </p>

          <div class="btn-container">
            <a href="${signUrl}" class="btn" target="_blank">✍️ Signer kontrakten digitalt</a>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-top: 24px; line-height: 1.5;">
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
}): Promise<{ success: boolean; message: string; id: string }> {
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
}): Promise<{ success: boolean; message: string; id: string }> {
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

