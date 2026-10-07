import path from 'path';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUserFromRequest, isUserSuperAdmin } from '@/src/lib/server/auth';
import { sendSystemEmail, sendOfferByEmail, sendChangeOrderByEmail, cleanMarkdownForEmail } from '@/src/lib/server/emailSender';
import { getCollectionItems, saveCollectionItem } from '@/src/lib/server/db';
import { generateWithAiEngine } from '@/src/lib/server/aiEngine';
import type { AiChatMessage } from '@/src/lib/server/aiEngine';
import { maskPII, containsPIIOrGdprData } from '@/src/lib/server/privacyShield';
import { getPublicAppUrl } from '@/src/lib/server/urlHelper';
import { fetchRealtimeWeather } from '@/src/lib/server/weatherService';

/**
 * 🤖 MesterAI Headless Agent Proxy
 * Kommuniserer direkte med agenten via REST API med AGENT_API-nøkkelen.
 * 100% White-label: Ingen tredjeparts iframe, ingen eksterne URLs synlige for brukeren.
 * 
 * 🛡️ MULTI-TENANT ISOLASJON & GDPR-SIKRING:
 * - Autentiserte brukere isoleres kryptografisk per bedrift (`companyId`) og bruker (`userId`).
 * - Samtalerom og kontekst i Botsify (fbId) er deterministisk hashet per bedrift (c + hash),
 *   noe som gjør minne- eller informasjonslekkasje mellom ulike kunder matematisk umulig.
 * - Uautentiserte besøkende (forsidedemo / iframe) sandkasses i et separat navnerom (d + hash)
 *   uten tilgang til reelle bedriftsdata.
 */

/**
 * 🛡️ SIKKERHETSFIKS (P0): Hardkodet Botsify-nøkkel er fjernet.
 *
 * Nøkkelen lå tidligere i klartekst i kildekoden og dermed i hele git-historikken.
 * Den er nå kun lest fra miljøvariabelen AGENT_API. Er den ikke satt, hoppes
 * Botsify-reserven stille over (se `if (!replyText && BOT_API_KEY && ...)` under),
 * og den interne AI-motoren brukes alene.
 *
 * ⚠️ Den gamle nøkkelen MÅ roteres i Botsify — den skal anses som kompromittert.
 */
const BOT_API_KEY = process.env.AGENT_API;
const CONVERSE_ENDPOINT = 'https://agentic.botsify.com/api/v1/converse';

const TRADE_NAMES: Record<string, string> = {
  carpenter: 'Tømrer / Byggmester',
  plumber: 'Rørlegger (VVS)',
  electrician: 'Elektriker (El-installatør)',
  mason: 'Murer / Flislegger',
  painter: 'Malerbedrift',
  ventilation: 'Ventilasjonstekniker',
  earthwork: 'Maskinentreprenør / Grunnarbeid',
  general: 'Byggmester / Totalentreprenør'
};

function isWeatherQuery(msg: string): boolean {
  const lower = (msg || '').toLowerCase();
  // Ikke kapre henvendelser som gjelder arrangementer, søk, nyheter eller helgeplaner
  if (
    lower.includes('hva skjer') || 
    lower.includes('skjer det') || 
    lower.includes('arrangement') || 
    lower.includes('konsert') || 
    lower.includes('festival') || 
    lower.includes('søke') || 
    lower.includes('søk på') || 
    lower.includes('google') ||
    lower.includes('kino') ||
    lower.includes('restaurant') ||
    lower.includes('nyheter')
  ) {
    return false;
  }

  const weatherWords = [
    'vær', 'været', 'værvarsel', 'værmelding', 'værmeldingen',
    'temperatur', 'temperaturen', 'grader', 'nedbør', 'regn', 'regner',
    'snø', 'snør', 'vind', 'vindstyrke', 'kuling', 'storm',
    'frost', 'minusgrader', 'plussgrader', 'arbeidsforhold',
    'arbeidsforholdene'
  ];
  return weatherWords.some(w => {
    const rx = new RegExp(`(^|\\s|[.,!?-])${w}([.,!?-]|\\s|$)`, 'i');
    return rx.test(lower);
  }) || (lower.includes('hvordan blir været'))
     || (lower.includes('kan vi jobbe ute'));
}

function detectWebSearchNeed(msg: string): boolean {
  const lower = (msg || '').toLowerCase();
  const searchIndicators = [
    'søk', 'søke', 'google', 'internett', 'på nettet', 'på nett',
    'hva skjer', 'skjer i', 'i helgen', 'arrangement', 'festival', 'konsert', 'kino',
    'hva koster', 'pris på', 'priser på', 'leverandør', 'optimera', 'maxbo', 'monter', 'byggmakker', 'ahlsell', 'elektroskandia',
    'sintef', 'datablad', 'monteringsanvisning', 'byggeforskrifter',
    'åpningstider', 'restaurant', 'nyheter', 'kurs', 'arrangementer', 'helgeplan'
  ];
  return searchIndicators.some(kw => lower.includes(kw));
}

/**
 * Fanger opp <<<SEND_EMAIL: ...>>> eller JSON-aksjoner generert av agenten,
 * og sender ekte e-post via Resend med tilhørende bekreftelsesbadge.
 */
interface EmailDispatchItem {
  to: string;
  subject: string;
  body: string; // KUN selve henvendelsen til kunden – ALDRI agentens interne chat-prat
  isOffer?: boolean;
  isChangeOrder?: boolean;
  rawMatchedSnippet?: string;
}

/**
 * 🔍 Ekstraherer én eller flere e-poster fra agentens svar.
 * 🛡️ PERSONVERN: Sørger for at kunden KUN mottar selve meldingen – ALDRI chat-dialogen med håndverkeren
 * eller interne oppsummeringer ("Ken, jeg klargjør to test-e-poster nå...").
 */
function extractEmailsFromReply(
  replyText: string,
  context: {
    companyName: string;
    authorName: string;
    projectName?: string;
    userMessage?: string;
  }
): { emails: EmailDispatchItem[]; matchToReplace: string | null } {
  const items: EmailDispatchItem[] = [];
  let matchToReplace: string | null = null;

  // 1. Sjekk taggen <<<SEND_EMAIL: ...>>> eller [SEND_EMAIL: ...] (kan være flere i samme svar)
  const emailTagRegex = /(?:<<<|\[)\s*SEND_EMAIL:\s*([\s\S]*?)(?:>>>|\])/gi;
  const tagMatches = [...replyText.matchAll(emailTagRegex)];
  if (tagMatches.length > 0) {
    matchToReplace = tagMatches.map(m => m[0]).join('\n');
    for (const tm of tagMatches) {
      const rawPayload = tm[1].trim();
      let recipient = '';
      let subject = '';
      let body = '';

      if (rawPayload.startsWith('{') && rawPayload.endsWith('}')) {
        try {
          const parsed = JSON.parse(rawPayload);
          recipient = parsed.to || parsed.recipient || parsed.email || '';
          subject = parsed.subject || parsed.title || parsed.emne || '';
          body = parsed.body || parsed.message || parsed.text || parsed.innhold || '';
        } catch {}
      }

      if (!recipient) {
        const toMatch = rawPayload.match(/(?:to|til)=["']([^"']+)["']/i) || rawPayload.match(/(?:to|til)=([^\s]+)/i);
        if (toMatch) recipient = toMatch[1].trim();
      }
      if (!subject) {
        const subjMatch = rawPayload.match(/(?:subject|emne|tittel)=["']([^"']+)["']/i);
        if (subjMatch) subject = subjMatch[1].trim();
      }
      if (!body) {
        const bodyMatch = rawPayload.match(/(?:body|message|tekst|innhold)=["']([^"']+)["']/i);
        if (bodyMatch) body = bodyMatch[1].trim();
      }

      if (recipient) {
        items.push({
          to: recipient,
          subject: subject || `Beskjed fra ${context.companyName}`,
          body: body || 'Se oversendt beskjed.',
          rawMatchedSnippet: tm[0]
        });
      }
    }
    if (items.length > 0) {
      return { emails: items, matchToReplace };
    }
  }

  // 2. Sjekk strukturerte seksjoner generert av agenten (f.eks. "### ✉️ E-post 1" og "### ✉️ E-post 2", eller blokker med Til / Emne / Innhold)
  const sectionSplitRegex = /(?=#{1,4}\s*(?:✉️|📧)?\s*E-?post\s*\d+|(?:\bE-?post\s+\d+:))/i;
  const sections = replyText.split(sectionSplitRegex);

  if (sections.length > 1 || (sections.length === 1 && (replyText.includes('Til:') || replyText.includes('To:')) && (replyText.includes('Innhold:') || replyText.includes('Melding:')))) {
    const candidateSections = sections.length > 1 ? sections.slice(1) : sections;

    for (const sec of candidateSections) {
      const toMatch = sec.match(/(?:Til|To):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (!toMatch) continue;

      const recipient = toMatch[1].trim();
      const subjMatch = sec.match(/(?:Emne|Subject):\s*([^\n\r]+)/i);
      const subject = subjMatch ? subjMatch[1].trim().replace(/^["']|["']$/g, '') : `Beskjed fra ${context.companyName} vedr. ${context.projectName || 'byggeprosjekt'}`;

      // Hent KUN innholdet som følger etter "Innhold:" / "Melding:" / "Tekst:"
      const bodyMatch = sec.match(/[-*•]?\s*(?:Innhold|Melding|Tekst|Innholdet):\s*([\s\S]+?)(?=(?:\n\s*#{1,4}|\n\s*Vil du at jeg prøver|\n\s*---\s*|$))/i);
      let bodyText = bodyMatch ? bodyMatch[1].trim() : '';

      // Fjern eventuelle anførselstegn eller sitattegn rundt meldingen hvis den er omsluttet
      if ((bodyText.startsWith('"') && bodyText.endsWith('"')) || (bodyText.startsWith('«') && bodyText.endsWith('»'))) {
        bodyText = bodyText.slice(1, -1).trim();
      }

      if (recipient && bodyText) {
        items.push({
          to: recipient,
          subject,
          body: bodyText,
          rawMatchedSnippet: sec
        });
      }
    }

    if (items.length > 0) {
      matchToReplace = replyText;
      return { emails: items, matchToReplace };
    }
  }

  // 3. Sjekk Botsifys kjente feilmelding der den likevel har ekstrahert mottaker og innhold
  if (
    replyText.includes('ble dessverre ikke sendt - e-posttjenesten ga ingen bekreftelse') ||
    replyText.includes('fikk ingen bekreftelse fra e-posttjenesten') ||
    replyText.includes('Innholdet som skulle sendes:')
  ) {
    const toMatch = replyText.match(/til\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const subjMatch = replyText.match(/Emne:\s*([^\n\r]+)/i);
    const msgMatch = replyText.match(/Melding:\s*([\s\S]+?)(?:\n\nVil du at jeg prøver|\n\n$|$)/i);

    if (toMatch && toMatch[1]) {
      items.push({
        to: toMatch[1].trim(),
        subject: subjMatch ? subjMatch[1].trim() : `Beskjed fra ${context.companyName}`,
        body: msgMatch ? msgMatch[1].trim() : 'Se oversendt beskjed.',
        rawMatchedSnippet: replyText
      });
      return { emails: items, matchToReplace: replyText };
    }
  }

  // 4. Fallback: Hvis brukerens melding inneholdt en e-postadresse og en instruks om å sende
  if (context.userMessage) {
    const lowerUserMsg = context.userMessage.toLowerCase();
    const emailMatches = [...context.userMessage.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi)];

    if (emailMatches.length > 0 && (lowerUserMsg.includes('send') || lowerUserMsg.includes('sende')) && (lowerUserMsg.includes('epost') || lowerUserMsg.includes('e-post') || lowerUserMsg.includes('mail'))) {
      for (const em of emailMatches) {
        const recipient = em[1].trim();
        const isOffer = lowerUserMsg.includes('tilbud');
        const isChange = lowerUserMsg.includes('endring') || lowerUserMsg.includes('varsel');

        const subject = isOffer 
          ? `Pristilbud fra ${context.companyName} vedr. ${context.projectName || 'byggeprosjekt'}`
          : isChange
          ? `Endringsvarsel (NS 8406) fra ${context.companyName} vedr. ${context.projectName || 'byggeprosjekt'}`
          : `Melding fra ${context.companyName} vedr. ${context.projectName || 'byggeprosjekt'}`;

        // Rengjør svarteksten slik at vi KUN sender selve beskjeden, aldri interne chat-hilsninger
        let cleanBody = replyText
          .replace(/^(?:Ken|Hei [a-zA-ZæøåÆØÅ]+)[,!]?\s*(?:jeg klargjør|jeg har klargjort|her er utkastet|jeg sender)[\s\S]*?(?=(?:Hei|Kjære|\n\n))/i, '')
          .replace(/Jeg kan dessverre ikke sende e-post[\s\S]*$/i, '')
          .trim();

        if (!cleanBody || cleanBody.length < 5) {
          cleanBody = context.userMessage;
        }

        items.push({
          to: recipient,
          subject,
          body: cleanBody,
          isOffer,
          isChangeOrder: isChange,
          rawMatchedSnippet: replyText
        });
      }

      if (items.length > 0) {
        return { emails: items, matchToReplace: replyText };
      }
    }
  }

  return { emails: items, matchToReplace: null };
}

/**
 * Fanger opp og sender rene e-poster via Resend med håndverkerens egen e-post som Reply-To.
 */
async function processEmailActionsInReply(
  replyText: string,
  context: {
    companyName: string;
    authorName: string;
    replyTo?: string;
    senderEmail?: string;
    projectName?: string;
    projectId?: string;
    userMessage?: string;
    baseUrl?: string;
  }
): Promise<string> {
  const { emails, matchToReplace } = extractEmailsFromReply(replyText, context);

  if (emails.length === 0) {
    const emailTagRegex = /(?:<<<|\[)\s*SEND_EMAIL:\s*([\s\S]*?)(?:>>>|\])/i;
    const tagMatch = replyText.match(emailTagRegex);
    if (tagMatch) {
      return replyText.replace(tagMatch[0], `\n\n*(E-post ble ikke sendt fordi mottakers e-postadresse mangler. Vennligst oppgi hvem som skal motta e-posten.)*`);
    }
    return replyText;
  }

  const baseUrl = (context.baseUrl && !context.baseUrl.includes('localhost') && !context.baseUrl.includes('127.0.0.1'))
    ? context.baseUrl
    : getPublicAppUrl();
  const badges: string[] = [];

  for (let i = 0; i < emails.length; i++) {
    const item = emails[i];
    const isOffer = item.isOffer || item.subject.toLowerCase().includes('tilbud') || (context.userMessage && context.userMessage.toLowerCase().includes('tilbud'));
    const isChangeOrder = item.isChangeOrder || item.subject.toLowerCase().includes('endring') || (context.userMessage && context.userMessage.toLowerCase().includes('endring'));

    try {
      if (isOffer) {
        const allOffers = await getCollectionItems('offers').catch(() => []);
        const projectOffers = allOffers.filter((o: any) => 
          (o.projectId && o.projectId === context.projectId) || 
          (context.projectName && o.title?.toLowerCase().includes(context.projectName.toLowerCase()))
        );
        const targetOffer = projectOffers[projectOffers.length - 1] || allOffers[allOffers.length - 1];

        if (targetOffer) {
          if (!targetOffer.token) {
            targetOffer.token = 'o-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
          }
          targetOffer.clientEmail = item.to;
          targetOffer.status = 'sent';
          await saveCollectionItem('offers', targetOffer);

          const offerRes = await sendOfferByEmail({
            offer: targetOffer,
            clientEmail: item.to,
            clientName: targetOffer.clientName,
            companyName: context.companyName,
            authorName: context.authorName,
            replyTo: context.replyTo,
            senderEmail: context.senderEmail,
            baseUrl
          });

          const link = `${baseUrl}/?offerToken=${targetOffer.token}`;
          if (offerRes.success && offerRes.status === 'sent') {
            badges.push(`> 📬 **Pristilbud er levert via Resend!**\n> - **Mottaker:** \`${item.to}\`\n> - **Tilbud:** «${targetOffer.title}»\n> - **Totalbeløp:** kr ${(Number(targetOffer.totalAmount || targetOffer.total || 0)).toLocaleString('no-NO')} inkl. mva\n> - **Svar sendes til:** \`${context.replyTo || context.companyName}\`\n> - **Digital godkjenning:** [Åpne tilbudslenke](${link})\n> - **Resend ID:** \`${offerRes.resendId || 'resend-ok'}\``);
            continue;
          }
        }
      }

      if (isChangeOrder) {
        const allOrders = await getCollectionItems('change_orders').catch(() => []);
        const projectOrders = allOrders.filter((c: any) => 
          (c.projectId && c.projectId === context.projectId) || 
          (context.projectName && c.title?.toLowerCase().includes(context.projectName.toLowerCase()))
        );
        const targetOrder = projectOrders[projectOrders.length - 1] || allOrders[allOrders.length - 1];

        if (targetOrder) {
          const coRes = await sendChangeOrderByEmail({
            changeOrder: targetOrder,
            clientEmail: item.to,
            clientName: targetOrder.clientName,
            companyName: context.companyName,
            authorName: context.authorName,
            replyTo: context.replyTo,
            senderEmail: context.senderEmail,
            baseUrl
          });

          if (coRes.success && coRes.status === 'sent') {
            badges.push(`> 📬 **Endringsmelding (NS 8406) er levert via Resend!**\n> - **Mottaker:** \`${item.to}\`\n> - **Endring:** «${targetOrder.title}»\n> - **Krav:** kr ${(Number(targetOrder.totalAmount || targetOrder.amountExVat || 0)).toLocaleString('no-NO')} eks. mva\n> - **Svar sendes til:** \`${context.replyTo || context.companyName}\`\n> - **Resend ID:** \`${coRes.resendId || 'resend-ok'}\``);
            continue;
          }
        }
      }

      // Standard e-post: Rens teksten slik at KUN selve beskjeden sendes, og INGEN rå hashtags (#) finnes
      const cleaned = cleanMarkdownForEmail(item.body);
      const finalSubject = item.subject || `Viktig melding vedrørende ${context.projectName || 'byggeprosjekt'}`;

      const sendRes = await sendSystemEmail({
        to: item.to,
        subject: finalSubject,
        text: cleaned.text,
        replyTo: context.replyTo,
        senderEmail: context.senderEmail,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px;">
              <h2 style="color: #0f172a; margin: 0 0 4px 0; font-size: 19px;">${finalSubject}</h2>
              <p style="margin: 0; color: #64748b; font-size: 12px;">Gjelder: ${context.projectName || 'Byggeprosjekt'} • Avsender: ${context.companyName}</p>
            </div>
            <div style="font-size: 14px; color: #334155; margin-bottom: 24px; line-height: 1.6;">${cleaned.html || 'Se oversendt henvendelse.'}</div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              Sendt via <strong>VikingMester KS</strong> på vegne av <strong>${context.companyName}</strong> (${context.authorName}).
            </p>
            ${context.replyTo ? `<p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0;">Svar på denne e-posten sendes direkte til: <strong>${context.replyTo}</strong>.</p>` : ''}
          </div>
        `,
        companyName: context.companyName,
        authorName: context.authorName
      });

      if (sendRes.success && sendRes.status === 'sent') {
        const shortBody = cleaned.text.replace(/\n+/g, ' ').slice(0, 85);
        badges.push(`> 📬 **E-post ${emails.length > 1 ? `${i + 1} av ${emails.length} ` : ''}er levert via Resend!**\n> - **Mottaker:** \`${item.to}\`\n> - **Emne:** «${finalSubject}»\n> - **Innhold oversendt:** «${shortBody}${cleaned.text.length > 85 ? '...' : ''}»\n> - **Svar sendes til:** \`${context.replyTo || context.companyName}\`\n> - **Meldings-ID:** \`${sendRes.resendId || 'resend-ok'}\``);
      } else if (sendRes.status === 'missing_api_key') {
        badges.push(`> ⚠️ **E-posten til ${item.to} ble ikke levert:** \`RESEND_API_KEY\` mangler under miljøvariablene.`);
      } else {
        badges.push(`> ⚠️ **E-postutsending til ${item.to} avvist via Resend:** ${sendRes.message || sendRes.error || 'Ukjent feil'}`);
      }

    } catch (err: any) {
      badges.push(`> ❌ **Teknisk feil ved utsending til ${item.to}:** ${err.message}`);
    }
  }

  const combinedBadges = badges.join('\n\n');

  if (matchToReplace === replyText) {
    const introMatch = replyText.match(/^([\s\S]*?)(?:(?=#{1,4}\s*(?:✉️|📧)?\s*E-?post|(?:\bE-?post\s+\d+:)|(?:Til|To):|Innholdet som skulle sendes:))/i);
    let intro = introMatch ? introMatch[1].trim() : '';
    if (intro && (intro.includes('klargjør') || intro.includes('klargjort'))) {
      intro = intro.replace(/klargjør.*$/i, 'har nå levert e-postene direkte via Resend:');
    }
    return (intro ? `${intro}\n\n` : '') + combinedBadges;
  }

  if (matchToReplace) {
    return replyText.replace(matchToReplace, combinedBadges);
  }

  return replyText + '\n\n' + combinedBadges;
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const body = await req.json();
    const { 
      message, 
      history,
      previousSessionContext,
      sessionId, 
      projectName, 
      availableProjects, 
      userName, 
      userTrade, 
      companyName, 
      userId, 
      userEmail,
      replyTo,
      senderEmail,
      companyEmail,
      imageUrl,
      imageBase64,
      image,
      images,
      language = 'no'
    } = body;

    const effectiveSenderEmail = (
      replyTo || 
      senderEmail || 
      userEmail || 
      user?.email || 
      companyEmail || 
      ''
    ).trim();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mangler melding' }, { status: 400 });
    }

    // 🛡️ BEREGN KRYPTOGRAFISK ISOLERT SESJONS-ID (fbId) FOR BOTSIFY (13 tegn)
    let fbId: string;
    let isSandboxedDemo = false;

    // Multi-tenant: Finn effektiv bedrifts-ID (støtter body.companyId, impersonering eller user.companyId)
    // SIKKERHETSFIKS (E-07): Bedrifts- og brukeridentitet skal komme fra den
    // verifiserte sesjonen, ikke fra request-bodyen. Tidligere kunne en anonym
    // klient sende body.companyId og fa alle data for den bedriften.
    // Bare SuperAdmin far velge bedrift eksplisitt (impersonering).
    const isSuperAdminCaller = isUserSuperAdmin(user);
    const effectiveCompanyId = user
      ? (isSuperAdminCaller && body.companyId ? body.companyId : user.companyId || null)
      : null;
    const effectiveUserId = user?.id || null;

    if (effectiveCompanyId && effectiveUserId) {
      // Autentisert kunde eller spesifikk bedrift: Streng multi-tenant hashing basert på bedrift og bruker
      const companyHash = crypto.createHash('sha256').update(effectiveCompanyId).digest('hex').slice(0, 6);
      const userHash = crypto.createHash('sha256').update(effectiveUserId).digest('hex').slice(0, 6);
      fbId = `c${companyHash}${userHash}`; // 'c' + 6 + 6 = 13 tegn, unikt og matematisk isolert per bedrift/bruker
    } else {
      // Offentlig forsidedemo / iframe / uautentisert: Sandkasset sesjon
      isSandboxedDemo = true;
      const seed = sessionId || userId || crypto.randomBytes(8).toString('hex');
      const demoHash = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 12);
      fbId = `d${demoHash}`; // 'd' + 12 = 13 tegn, isolert fra alle reelle bedrifter
    }

    const tradeTitle = (userTrade && TRADE_NAMES[userTrade.toLowerCase()]) 
      || (user?.trade && TRADE_NAMES[user.trade.toLowerCase()]) 
      || userTrade 
      || 'Byggmester';
      
    const effectiveCompany = (effectiveCompanyId === 'comp-demo-fjellheim' ? 'Fjellheim Bygg & Tømrer AS' : (user?.company || companyName || 'VikingMester'));
    const effectiveUser = (effectiveCompanyId === 'comp-demo-fjellheim' ? 'Lars Fjellheim' : (user?.displayName || userName || (isSandboxedDemo ? 'Demobruker' : 'Håndverker')));
    

    // 🛡️ 1. ROLLE- OG TILGANGSVALIDERING (RBAC: Admin/Leder vs. Fagarbeider/Lærling)
    const effectiveRole = (user?.role || body.userRole || 'worker').toLowerCase();
    // SIKKERHETSFIKS (E-07): Rollen avgjores av den verifiserte JWT-sesjonen alene.
    // Den tidligere grenen (!user && body.isAdmin === true) lot en anonym klient
    // erklare seg som administrator og lese hele plattformens data.
    // Anonyme kall far effectiveRole = 'worker' og er sandkasset via isSandboxedDemo.
    const isUserAdmin = effectiveRole === 'admin' || effectiveRole === 'superadmin' || effectiveRole === 'leader';
    // Brukes til a avgjore om avsenderen kan fore timer pa vegne av andre (AML § 10-7).
    // Skal ALDRI lese body.isAdmin / body.userRole, som er klientstyrte.
    const isSenderAdmin = isUserAdmin;
    // 📂 2. Hent oppgaver, timer, dagbøker og avvik
    const clientTasks = Array.isArray(body.tasks) ? body.tasks : [];
    const clientTimeEntries = Array.isArray(body.timeEntries) ? body.timeEntries : (Array.isArray(body.dailyTimeEntries) ? body.dailyTimeEntries : []);
    const clientDailyLogs = Array.isArray(body.dailyLogs) ? body.dailyLogs : [];
    const clientDeviations = Array.isArray(body.deviations) ? body.deviations : [];

    const dbTasks = clientTasks.length > 0 ? clientTasks : await getCollectionItems('tasks').catch(() => []);
    const dbTimes = clientTimeEntries.length > 0 ? clientTimeEntries : await getCollectionItems('time_entries').catch(() => []);
    const dbLogs = clientDailyLogs.length > 0 ? clientDailyLogs : await getCollectionItems('daily_logs').catch(() => []);
    const dbDevs = clientDeviations.length > 0 ? clientDeviations : await getCollectionItems('deviations').catch(() => []);

    // 🏗️ 3. Hent alle byggeplasser for bedriften
    let allCompanyProjects: any[] = [];
    const allDbProjects = await getCollectionItems('projects').catch(() => []);
    if (effectiveCompanyId === 'comp-demo-fjellheim') {
      allCompanyProjects = allDbProjects.filter((p: any) => p.companyId === 'comp-demo-fjellheim' || p.id === 'proj-demo-sjusjoen');
      if (allCompanyProjects.length === 0) {
        allCompanyProjects = [
          {
            id: 'proj-demo-sjusjoen',
            name: 'Hytte Sjusjøen - Nybygg',
            address: 'Birkebeinervegen 42, 2612 Sjusjøen',
            progress: 35,
            stage: 'Pågående',
            status: 'active'
          }
        ];
      }
    } else {
      allCompanyProjects = allDbProjects.filter((p: any) => 
        !String(p.id || '').includes('demo-sjusjoen') &&
        (!effectiveCompanyId || p.companyId === effectiveCompanyId || !p.companyId || p.companyId === 'comp-001')
      );
    }

    // 🔒 4. HÅNDHEV ROLLEBASERT PROSJEKTTILGANG (RBAC)
    // Administrator/Leder har tilgang til hele bedriftens portefølje.
    // Fagarbeidere og lærlinger har KUN tilgang til byggeplassene de eksplisitt er tildelt av admin.
    let safeUserProjects: any[] = [];
    if (isUserAdmin) {
      safeUserProjects = allCompanyProjects;
    } else {
      if (Array.isArray(availableProjects) && availableProjects.length > 0) {
        const allowedIds = new Set(availableProjects.map((p: any) => p.id));
        safeUserProjects = allCompanyProjects.filter(p => allowedIds.has(p.id));
        if (safeUserProjects.length === 0) {
          safeUserProjects = availableProjects.filter((p: any) => 
            !String(p.id || '').includes('demo-sjusjoen') &&
            (!effectiveCompanyId || p.companyId === effectiveCompanyId || !p.companyId || p.companyId === 'comp-001')
          );
        }
      } else {
        safeUserProjects = allCompanyProjects.filter((p: any) => {
          const tm = p.teamMembers || p.assignedWorkers || [];
          if (Array.isArray(tm)) {
            return tm.some((m: string) => 
              (effectiveUserId && m === effectiveUserId) ||
              (user?.email && m.toLowerCase() === user.email.toLowerCase()) ||
              (user?.displayName && m.toLowerCase() === user.displayName.toLowerCase())
            );
          }
          return false;
        });
      }
    }

    const safeCompanyProjects = effectiveCompanyId === 'comp-demo-fjellheim'
      ? (safeUserProjects.length > 0 ? safeUserProjects : [{ id: 'proj-demo-sjusjoen', name: 'Hytte Sjusjøen - Nybygg', address: 'Birkebeinervegen 42, 2612 Sjusjøen', progress: 35, stage: 'Pågående' }])
      : safeUserProjects.filter((p: any) => !String(p.id || '').includes('demo-sjusjoen'));

    // 🔒 5. Server-side skjerming av oppgaver, timer, dagbøker og avvik
    const allowedProjIds = new Set(safeCompanyProjects.map(p => p.id));
    const allowedProjNames = new Set(safeCompanyProjects.map(p => (p.name || '').toLowerCase().trim()));

    const authorizedTasks = isUserAdmin 
      ? dbTasks 
      : dbTasks.filter((t: any) => allowedProjIds.has(t.projectId) || allowedProjNames.has((t.projectName || '').toLowerCase().trim()));

    const authorizedTimes = isUserAdmin 
      ? dbTimes 
      : dbTimes.filter((t: any) => allowedProjIds.has(t.projectId) || allowedProjNames.has((t.projectName || '').toLowerCase().trim()) || (t.userId && t.userId === effectiveUserId));

    const authorizedLogs = isUserAdmin 
      ? dbLogs 
      : dbLogs.filter((l: any) => allowedProjIds.has(l.projectId) || allowedProjNames.has((l.projectName || '').toLowerCase().trim()));

    const authorizedDevs = isUserAdmin 
      ? dbDevs 
      : dbDevs.filter((d: any) => allowedProjIds.has(d.projectId) || allowedProjNames.has((d.projectName || '').toLowerCase().trim()));

    // 🔍 6. Sjekk om en ikke-admin bruker spør om en byggeplass de IKKE har tilgang til
    let requestedUnauthorizedProject: string | null = null;
    if (!isUserAdmin && allCompanyProjects.length > safeCompanyProjects.length) {
      const lowerMsg = message.toLowerCase().trim();
      const forbiddenProjects = allCompanyProjects.filter(p => !allowedProjIds.has(p.id));
      for (const fp of forbiddenProjects) {
        const fpName = (fp.name || '').toLowerCase();
        if (fpName && (lowerMsg.includes(fpName) || fpName.includes(lowerMsg))) {
          requestedUnauthorizedProject = fp.name;
          break;
        }
        const words = fpName.split(/[\s,.-]+/).filter((w: string) => w.length >= 5 && !['renovering', 'prosjekt', 'byggeplass'].includes(w));
        if (words.some((w: string) => lowerMsg.includes(w))) {
          requestedUnauthorizedProject = fp.name;
          break;
        }
      }
    }

    // Bygg porteføljesammendrag basert utelukkende på autoriserte prosjekter
    // 🛡️ PERSONOPPLYSNINGER I PROSJEKTKONTEKSTEN:
    // Kundenavn og adresse er personopplysninger, og de bygges inn i konteksthodet
    // lenger ned (portfolioSummary -> «Sted: … / Kunde: …»). Den nøkkelordbaserte
    // GDPR-sjekken under fanger dem ikke, fordi en helt vanlig forespørsel
    // («vis meg status på prosjektene») ikke inneholder noe nøkkelord, men likevel
    // får med kundenavn og adresse i prompten. Uten dette flagget gikk de til
    // DeepSeek (Kina) som er primærmotor for all tekst. Nå tvinges EU-ruting.
    const contextHasClientPii = safeCompanyProjects.some(
      (p: any) => Boolean((p && p.clientName) || (p && (p.address || p.location)))
    );

    const portfolioSummary = safeCompanyProjects.map((p: any) => {
      const pId = p.id;
      const pName = p.name || 'Byggeplass';
      const pProg = typeof p.progress === 'number' ? p.progress : 0;
      const pTasks = authorizedTasks.filter((t: any) => t.projectId === pId || (t.projectName && t.projectName.toLowerCase() === pName.toLowerCase()));
      const pTimes = authorizedTimes.filter((t: any) => t.projectId === pId || (t.projectName && t.projectName.toLowerCase() === pName.toLowerCase()));
      const pHours = pTimes.reduce((s: number, t: any) => s + (Number(t.hours) || 0), 0);
      const openTasks = pTasks.filter((t: any) => t.status !== 'completed' && t.status !== 'closed');
      const pAddr = p.address || p.location || '';
      return {
        id: pId,
        name: pName,
        progress: pProg,
        stage: p.stage || p.status || 'Pågående',
        status: p.status || 'active',
        hours: pHours,
        totalTasks: pTasks.length,
        openTasks: openTasks.length,
        address: pAddr,
        clientName: p.clientName || ''
      };
    });

    // 🔍 7. Identifiser om meldingen refererer til et bestemt tildelt prosjekt
    let resolvedProjectId = (body.projectId && body.projectId !== 'all' && body.projectId !== 'gen' && allowedProjIds.has(body.projectId)) ? body.projectId : null;
    let resolvedProjectName = (projectName && projectName !== 'Alle byggeplasser' && (isUserAdmin || safeCompanyProjects.some(p => p.name === projectName))) ? projectName : null;

    if (safeCompanyProjects.length > 0) {
      const lowerMsg = message.toLowerCase().trim();
      for (const p of safeCompanyProjects) {
        const pName = (p.name || '').toLowerCase().trim();
        const pCode = (p.code || '').toLowerCase().trim();
        const pAddr = (p.address || '').toLowerCase().trim();

        if (pName && (lowerMsg === pName || lowerMsg.includes(pName))) {
          resolvedProjectId = p.id;
          resolvedProjectName = p.name;
          break;
        }
        if (pAddr && lowerMsg.includes(pAddr)) {
          resolvedProjectId = p.id;
          resolvedProjectName = p.name;
          break;
        }
        if (pCode && pCode.length >= 3 && lowerMsg.includes(pCode)) {
          resolvedProjectId = p.id;
          resolvedProjectName = p.name;
          break;
        }
        const words = pName.split(/[\s,.-]+/).filter((w: string) => 
          w.length >= 4 && !['renovering', 'bad', 'enebolig', 'bygg', 'prosjekt', 'tilbygg', 'nybygg', 'hytte'].includes(w)
        );
        if (words.some((w: string) => lowerMsg.includes(w))) {
          resolvedProjectId = p.id;
          resolvedProjectName = p.name;
          break;
        }
      }
    }

    if (!resolvedProjectName && safeCompanyProjects.length === 1) {
      resolvedProjectId = safeCompanyProjects[0].id;
      resolvedProjectName = safeCompanyProjects[0].name;
    }

    const filterForCurrentProject = (items: any[]) => {
      if (!resolvedProjectName && !resolvedProjectId) return items;
      const lowerTarget = (resolvedProjectName || '').toLowerCase().trim();
      const targetId = resolvedProjectId;
      return items.filter((item: any) => {
        if (targetId && item.projectId === targetId) return true;
        const iName = (item.projectName || '').toLowerCase().trim();
        if (lowerTarget && (iName === lowerTarget || iName.includes(lowerTarget) || lowerTarget.includes(iName))) return true;
        if (lowerTarget.includes('vidjeveien') && (iName.includes('vidjeveien') || iName.includes('bad'))) return true;
        if (lowerTarget.includes('bad') && (iName.includes('bad') || iName.includes('vidjeveien'))) return true;
        if (lowerTarget.includes('kongeveien') && iName.includes('kongeveien')) return true;
        if (lowerTarget.includes('sjusjøen') && iName.includes('sjusjøen')) return true;
        return false;
      });
    };

    const projectTasks = filterForCurrentProject(authorizedTasks);
    const projectTimes = filterForCurrentProject(authorizedTimes);
    const projectLogs = filterForCurrentProject(authorizedLogs);
    const projectDevs = filterForCurrentProject(authorizedDevs);
    const totalProjectHours = projectTimes.reduce((sum: number, t: any) => sum + (Number(t.hours) || 0), 0);

    // 🧠 8. Bygg beriket kontekst med fagkontekst, RBAC-tilganger og prosjektdetaljer
    let contextHeader = '';
    if (isSandboxedDemo) {
      contextHeader = `[SANDKASSE DEMO - Offentlig testmiljø | Rolle: ${effectiveUser} (${tradeTitle}) | Aktivt prosjekt: ${projectName || 'Geitekleiva'} | RETNINGSLINJE: Dette er en demonstrasjon av MesterAI for bygg- og anleggsbransjen. Hvis brukeren refererer til ${projectName || 'Geitekleiva'}, eller et fiktivt / nytt prosjekt som en kunde nevner, skal du besvare forespørselen direkte, profesjonelt og handlekraftig (kalkyle, NS 8406 endringsvarsel, SJA, byggedagbok eller TEK17) for dette prosjektet. Du skal ALDRI avvise brukeren eller si at prosjektet ikke finnes.]`;
    } else {
      contextHeader = `[Fagkontekst: ${effectiveUser} (${tradeTitle}) hos ${effectiveCompany} (Bedrifts-ID: ${user?.companyId || 'standard'})`;

      if (isUserAdmin) {
        contextHeader += ` | BRUKERENS ROLLE & TILGANG: Administrator / Leder (Full tilgang til alle bedriftens byggeplasser, bedriftsøkonomi og alle ansattes timer).`;
        if (portfolioSummary.length > 0) {
          const portStr = portfolioSummary.map(p => 
            `«${p.name}» (Fremdrift: ${p.progress}%, Status: ${p.stage}, Førte timer: ${p.hours.toFixed(1)}t, Åpne oppgaver: ${p.openTasks}${p.address ? `, Sted: ${p.address}` : ''}${p.clientName ? `, Kunde: ${p.clientName}` : ''})`
          ).join('; ');
          contextHeader += ` | BEDRIFTENS SAMLEDE PROSJEKTPORTEFØLJE (${portfolioSummary.length} byggeplasser): [${portStr}].`;
        }

        if (projectName && projectName !== 'Alle byggeplasser') {
          contextHeader += ` | Aktivt valgt byggeplass i toppmenyen: «${projectName}»`;
          contextHeader += ` | MERK OM PORTEFØLJE: Brukeren er administrator/leder og har valgt «${projectName}» i toppmenyen, MEN hvis henvendelsen stiller et spørsmål om porteføljen generelt eller flere byggeplasser («prosjektene», «alle», «hvilket prosjekt er nærmest ferdigstilling», «hva skjer med prosjektene», «fremdrift»), SKAL DU svare for hele porteføljen ved å sammenligne byggeplassene fra BEDRIFTENS SAMLEDE PROSJEKTPORTEFØLJE!`;
        } else {
          contextHeader += ` | Prosjektstatus: Oversiktsvisning («Alle byggeplasser»).`;
        }
      } else {
        // 🔒 STRENG HÅNDHEVING FOR FAGARBEIDERE / LÆRLINGER
        const allowedNamesList = safeCompanyProjects.map(p => `«${p.name}»`).join(', ');
        contextHeader += ` | BRUKERENS ROLLE & TILGANG: Fagarbeider / Ansatt (${tradeTitle}) med BEGRENSET PROSJEKTTILGANG.`;
        if (safeCompanyProjects.length > 0) {
          const portStr = portfolioSummary.map(p => 
            `«${p.name}» (Fremdrift: ${p.progress}%, Status: ${p.stage}, Førte timer: ${p.hours.toFixed(1)}t, Åpne oppgaver: ${p.openTasks}${p.address ? `, Sted: ${p.address}` : ''})`
          ).join('; ');
          contextHeader += ` BRUKERENS TILDELTE BYGGEPLASSER (${portfolioSummary.length} stk): [${portStr}].`;
        } else {
          contextHeader += ` BRUKERENS TILDELTE BYGGEPLASSER: Ingen tildelte byggeplasser per nå.`;
        }

        if (requestedUnauthorizedProject) {
          contextHeader += ` | ⚠️ SIKKERHETSVARSEL - ADGANGSNEKT: Brukeren spør om byggeplassen «${requestedUnauthorizedProject}», men har IKKE fått tilgang til dette prosjektet av administrator! Du SKAL nekte innsyn høflig og profesjonelt, og opplyse om at brukeren kun har tilgang til sine tildelte byggeplasser: [${allowedNamesList || 'ingen'}].`;
        }

        contextHeader += `
| 🔒 STRENG SIKKERHETSREGEL (TILGANGSBEGRENSNING / INGEN INFORMASJONSLEKKASJE):
1. Brukeren er en fagarbeider/lærling og skal KUN ha informasjon om og innsyn i sine egne tildelte byggeplasser ([${allowedNamesList || 'ingen'}]).
2. DU SKAL ALDRI lekke eller nevne informasjon, fremdrift, timer, avvik, kunder eller økonomi fra andre byggeplasser i firmaet som brukeren IKKE er tildelt!
3. Hvis brukeren spør om «prosjektene» i flertall eller «hva skjer med prosjektene», skal du svare KUN med utgangspunkt i brukerens tildelte byggeplasser ([${allowedNamesList || 'ingen'}]). Hvis brukeren kun har én tildelt byggeplass, forklarer du at dette er det aktive oppdraget vedkommende er tildelt i systemet.
4. Hvis brukeren spør om en annen byggeplass eller ber om overordnet bedriftsportefølje, forklarer du høflig at de kun har tilgang til sine tildelte byggeplasser, og at de må henvende seg til prosjektleder eller administrator for å få tildelt flere prosjekter.`;
      }

      // Detaljstatus for aktiv byggeplass
      if (resolvedProjectName && resolvedProjectName !== 'Alle byggeplasser') {
        contextHeader += ` | DETALJSTATUS FOR «${resolvedProjectName}»:`;
        if (projectTasks.length > 0) {
          contextHeader += ` | REGISTRERTE OPPGAVER (${projectTasks.length} stk): [${projectTasks.map((t: any) => `${t.status === 'completed' ? '✓' : '•'} ${t.title} (${t.assignedTo || 'Ufordelt'}, frist: ${t.dueDate || 'ingen'})`).join('; ')}]`;
        }
        contextHeader += ` | LOGGFØRTE TIMER FOR DETTE PROSJEKTET: ${totalProjectHours.toFixed(1)} timer`;
        if (projectLogs.length > 0) {
          contextHeader += ` | SISTE DAGBOKNOTAT: ${projectLogs[0].date} (${projectLogs[0].generalNotes || 'Normal drift'})`;
        }
        if (projectDevs.length > 0) {
          const openDevs = projectDevs.filter((d: any) => d.status !== 'closed');
          contextHeader += ` | AVVIK: ${openDevs.length} åpne avvik`;
        }
      }

      contextHeader += `
| 📝 VIKTIG UNNTAK FOR TILBUD & PRISOVERSLAG: Et tilbud eller en priskalkyle må IKKE knyttes til et eksisterende prosjekt! Ofte lages tilbud for nye henvendelser, potensielle kunder eller nye oppdrag før et prosjekt i det hele tatt eksisterer. Når brukeren ber om å «lage et tilbud», «skrive et tilbud» eller «sette opp et pristilbud»:
1. DU SKAL ALDRI si at et tilbud må knyttes til et prosjekt!
2. Spør brukeren om tilbudet gjelder en «+ Ny kunde / ny henvendelse» eller et av de eksisterende prosjektene.
3. Forklar kort og trygt: «Hvis det er en ny kunde, setter vi opp tilbudet direkte. Så snart kunden aksepterer tilbudet, opprettes det automatisk kontrakt, prosjektet etableres i systemet, og skreddersydde KS-sjekklister (f.eks. våtrom, tak, TEK17) settes opp tilpasset tilbudet – slik at dere bare kan begynne å jobbe. Når prosjektet er ferdig genereres all FDV- og sluttdokumentasjon automatisk!»
4. Hvis brukeren allerede har oppgitt hva arbeidet gjelder (f.eks. oppussing av bad, maling, tilbygg, terrasse), gå rett i gang med å foreslå eller sette opp tilbudet med poster, timeantall og materiell!
5. Hvis henvendelsen er et generelt fagspørsmål (f.eks. TEK17, HMS-regler, våtromsnorm, materialvalg), svarer du direkte uten å kreve prosjektvalg.
| FORMATERING & LESBARHET: Håndverkere leser dette i felt på byggeplass. Svaret MÅ være oversiktlig og luftig: Bruk alltid doble linjeskift mellom avsnitt, bruk punktlister med bindestrek (-) for opplistinger og krav, bruk fete overskrifter (f.eks. ### 🛡️ Krav: eller **Krav:**) for å skille temaer, og fremhev tall og paragrafer. ALDRI svar med en eneste sammenklemt tekstblokk!
| E-POST VIA RESEND: Systemet sender ekte e-poster direkte via Resend på vegne av håndverkeren (${effectiveUser} / ${effectiveCompany}). Når brukeren ber deg sende en eller flere e-poster (tilbud, endring, varsel, FDV eller melding) og du har mottakers e-postadresse: 1) Bekreft kort at du klargjør sendingen. 2) Inkluder nøyaktig koden <<<SEND_EMAIL: to="mottaker@epost.no" subject="Emnetittel" body="Selve meldingsteksten">>> eller strukturer utkastet med «### ✉️ E-post 1», «- Til: mottaker@epost.no», «- Emne: Emnetittel», «- Innhold: Selve meldingen til kunden». 3) PERSONVERN: Kunder må ALDRI motta interne notater, chat-dialog med håndverkeren, eller rå markdown hashtags (#). Skriv KUN den rene, profesjonelle beskjeden under «Innhold»/body. 4) Svar fra kunden rutes automatisk direkte til håndverkerens egen e-post (${effectiveSenderEmail || 'jobb-e-post'}).
| SIKKERHET: GDPR & Databehandleravtale (DPA) er aktiv. Alle data er strengt konfidensielle for denne bedriften.]`;
    }

    const cleanLowerMsg = message.trim().toLowerCase().replace(/[.!?]/g, '');

    // 🛡️ SPØRSMÅLSVAKT: Hindrer at åpne spørsmål blir tolket som kommandoer.
    // Uten denne skrev «hva koster 5 timer?» inn 5 timer, og «hvilke feil kan
    // føre til avvik?» opprettet et avvik i KS-systemet.
    // Bevisst smal: «kan du føre 7,5 timer» er en bestilling, ikke et spørsmål.
    const looksLikeOpenQuestion =
      /\?\s*$/.test(message.trim()) ||
      /^(hva|hvordan|hvilke|hvilken|hvilket|hvor|hvorfor|hvor mye|koster|er det|finnes det|gjelder)\b/i.test(message.trim());

    // 🎯 0. SLÅ SAMMEN PROSJEKTER (f.eks. "slå sammen prosjektene" eller "ja slå dem sammen")
    const isMergeProject = cleanLowerMsg.includes('slå sammen') || cleanLowerMsg.includes('sla sammen') || (
      (cleanLowerMsg.startsWith('ja') || cleanLowerMsg === 'ja') && 
      Array.isArray(history) && history.length > 0 &&
      JSON.stringify(history).toLowerCase().includes('slå dem sammen')
    );

    if (isMergeProject) {
      return NextResponse.json({
        success: true,
        sessionId: fbId,
        reply: `🔗 **Sammenslåing av prosjekter**\n\n` +
          `Jeg kan ikke slå sammen to prosjekter automatisk ennå. Det krever en gjennomgang av hvilket prosjekt som skal være hovedprosjekt, fordi timer, avvik, byggedagbok og tilbud må flyttes uten å miste historikk.\n\n` +
          `**Slik gjør du det i dag:**\n` +
          `1. Velg prosjektet du vil beholde som hovedprosjekt.\n` +
          `2. Flytt oppgaver og timer dit fra prosjektvisningen.\n` +
          `3. Arkiver det andre prosjektet når det er tomt.\n\n` +
          `Det jeg kan gjøre med en gang, er å lage en samlet status på tvers av begge prosjektene, eller samle all dokumentasjon i ett prosjekt. Si ifra hva du ønsker.`,
        quickReplies: [
          { title: 'Hent oppgaver', payload: 'Hent oppgaver på Renovering Bad Vidjeveien 21' },
          { title: 'Hent timer', payload: 'Hent timer på Renovering Bad Vidjeveien 21' },
          { title: 'Hent byggedagbok', payload: 'Hent dagbok på Renovering Bad Vidjeveien 21' }
        ]
      });
    }

    // 🎯 OPPGAVER: "hent oppgaver" / "vis oppgaver" / "oppgaveliste"
    const isFetchTasks = [
      'hent oppgaver', 'hent oppgaveliste', 'vis oppgaver', 'vis oppgaveliste', 'oppgaver', 'oppgaveliste',
      'hvilke oppgaver', 'hva er oppgavene', 'arbeidsoppgaver', 'oppgaver på prosjektet', 'hent oppgave', 'se oppgaver'
    ].includes(cleanLowerMsg) || (
      cleanLowerMsg.startsWith('hent oppgav') || cleanLowerMsg.startsWith('vis oppgav')
    );

    if (isFetchTasks) {
      const activePName = resolvedProjectName || 'Renovering Bad Vidjeveien 21';
      if (projectTasks.length > 0) {
        const formattedList = projectTasks.map((t: any) => {
          const statusIcon = t.status === 'completed' ? '✅' : t.status === 'in_progress' ? '⏳' : '📋';
          const statusLabel = t.status === 'completed' ? 'Fullført' : t.status === 'in_progress' ? 'Pågår' : 'Planlagt';
          const dueStr = t.dueDate ? `Frist: ${t.dueDate}` : 'Ingen fast frist';
          const workerStr = t.assignedTo ? `Ansvarlig: ${t.assignedTo}` : 'Ikke tildelt';
          const prioStr = t.priority === 'urgent' ? '⚠️ Kritisk / Haster' : t.priority === 'high' ? '🔥 Høy' : 'Normal';
          return `• ${statusIcon} **${t.title}**\n  - **Status:** ${statusLabel}\n  - **${workerStr}** | **${dueStr}** | Prioritet: ${prioStr}${t.description ? `\n  - *${t.description}*` : ''}`;
        }).join('\n\n');

        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `📋 **Registrerte oppgaver — ${activePName}**\n\n` +
            `Her er oppgavene og fremdriftsstatusen på byggeplassen:\n\n` +
            `${formattedList}\n\n` +
            `---\n` +
            `💡 **Hva vil du gjøre nå?**\n` +
            `Du kan oppdatere en oppgave (f.eks: *«Sett slukmontering til fullført»*), tildele ny oppgave, eller føre timer for dagens arbeid.`,
          quickReplies: [
            { title: '+ Ny oppgave', payload: `Opprett oppgave på ${activePName}: ` },
            { title: 'Før timer på oppgaven', payload: `Før 7.5 timer på ${activePName}` },
            { title: 'Hent timer', payload: `Hent timer på ${activePName}` },
            { title: 'Hent byggedagbok', payload: `Hent dagbok på ${activePName}` }
          ]
        });
      } else {
        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `📋 **Oppgaveliste — ${activePName}**\n\nDet er ingen registrerte oppgaver på dette prosjektet ennå.\n\nVil du at jeg skal opprette en oppgave nå? F.eks: *«Opprett oppgave: Slukmontering og falloppbygging mot sluk (BVN)»* eller *«Opprett oppgave: Membranarbeid»*?`,
          quickReplies: [
            { title: '+ Opprett oppgave: Sluk & Fall', payload: `Opprett oppgave på ${activePName}: Slukmontering og falloppbygging iht BVN` },
            { title: '+ Opprett oppgave: Membran & Mansjetter', payload: `Opprett oppgave på ${activePName}: Membranarbeid og rørgjennomføringer` },
            { title: '+ Opprett oppgave: Flislegging', payload: `Opprett oppgave på ${activePName}: Flislegging og fuging` }
          ]
        });
      }
    }

    // 🎯 TIMER: "hent timer" / "vis timer" / "timeliste"
    const isFetchHours = [
      'hent timer', 'hent timeliste', 'vis timer', 'vis timeliste', 'timeliste', 'førte timer',
      'hvor mange timer', 'timer på prosjektet', 'timer logget', 'se timer', 'timeoversikt', 'hent timeføring'
    ].includes(cleanLowerMsg) || (
      cleanLowerMsg.startsWith('hent timer') || cleanLowerMsg.startsWith('vis timer')
    );

    if (isFetchHours) {
      const activePName = resolvedProjectName || 'Renovering Bad Vidjeveien 21';
      if (projectTimes.length > 0) {
        const standardHourlyRate = 980;
        const totalValue = totalProjectHours * standardHourlyRate;

        const formattedEntries = projectTimes.slice(0, 10).map((t: any) => {
          const wName = t.workerName || t.userName || 'Håndverker';
          const hStr = `${Number(t.hours || 0).toFixed(1)}t`;
          const desc = t.task || t.description || 'Produksjon';
          const stat = t.status === 'approved' ? '✅ Godkjent' : '⏳ Venter på leder';
          return `• **${t.date || 'Tidligere'} — ${wName} (${hStr})** [${stat}]\n  - *${desc}*`;
        }).join('\n\n');

        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `⏱️ **Førte timer & Ressursbruk — ${activePName}**\n\n` +
            `• **Totalt registrert:** **${totalProjectHours.toFixed(1)} timer**\n` +
            `• **Estimert produksjonsverdi:** kr ${totalValue.toLocaleString('no-NO')},- eks mva\n` +
            `• **Antall timeføringer:** ${projectTimes.length} stk\n\n` +
            `### Siste timeføringer på prosjektet:\n` +
            `${formattedEntries}\n\n` +
            `---\n` +
            `💡 Alle timer er synkronisert med byggedagbok og lønnsgrunnlag iht. AML § 10-7 og Byggherreforskriften § 15.`,
          quickReplies: [
            { title: 'Før flere timer', payload: `Før timer på ${activePName}` },
            { title: 'Hent oppgaver', payload: `Hent oppgaver på ${activePName}` },
            { title: 'Hent byggedagbok', payload: `Hent dagbok på ${activePName}` },
            { title: 'Ledergodkjenning', payload: 'Vis timegodkjenning for leder' }
          ]
        });
      } else {
        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `⏱️ **Timeliste — ${activePName}**\n\nIngen timer er bokført på dette prosjektet ennå.\n\nSi f.eks: *«Før 7.5 timer i dag på ${activePName}: Rørleggerkoordinering og klargjøring»* så registreres timene direkte inn i byggedagboken!`,
          quickReplies: [
            { title: '7.5t Normaltid i dag', payload: `Før 7.5 timer i dag på ${activePName}: Produksjon iht fremdriftsplan` },
            { title: 'Hent oppgaver', payload: `Hent oppgaver på ${activePName}` }
          ]
        });
      }
    }

    // 🎯 DAGBOK: "hent dagbok" / "vis byggedagbok" / "byggedagbok"
    const isFetchDailyLog = [
      'hent dagbok', 'hent byggedagbok', 'vis dagbok', 'vis byggedagbok', 'byggedagbok', 'dagsrapport',
      'siste dagbok', 'dagbokføring', 'dagbok', 'dagsrapporter', 'se byggedagbok'
    ].includes(cleanLowerMsg) || (
      cleanLowerMsg.startsWith('hent dagbok') || cleanLowerMsg.startsWith('vis dagbok') ||
      cleanLowerMsg.startsWith('hent byggedagbok') || cleanLowerMsg.startsWith('vis byggedagbok')
    );

    if (isFetchDailyLog) {
      const activePName = resolvedProjectName || 'Renovering Bad Vidjeveien 21';
      if (projectLogs.length > 0) {
        const formattedLogs = projectLogs.slice(0, 5).map((l: any) => {
          const crew = Array.isArray(l.crewMembers) ? l.crewMembers.join(', ') : (l.crewCount ? `${l.crewCount} mann` : 'Håndverker');
          const hours = l.totalHoursWorked ? ` (${l.totalHoursWorked} timer)` : '';
          return `📅 **${l.date || 'Tidligere dagsrapport'}**\n` +
            `• **Værforhold:** ${l.weatherCondition || 'Normalt opphold'}\n` +
            `• **Bemanning:** ${crew}${hours}\n` +
            `• **Fremdrift & Notater:**\n${l.generalNotes || 'Arbeid utført iht. plan.'}`;
        }).join('\n\n---\n\n');

        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `📖 **Elektronisk Byggedagbok — ${activePName}**\n*Iht. Byggherreforskriften § 15 & NS 8406*\n\n` +
            `${formattedLogs}\n\n` +
            `---\n` +
            `💡 Vil du legge til et nytt dagboknotat eller registrere avvik for dagen?`,
          quickReplies: [
            { title: 'Før notat i dagbok', payload: `Før notat i byggedagbok for ${activePName}: ` },
            { title: 'Hent oppgaver', payload: `Hent oppgaver på ${activePName}` },
            { title: 'Hent timer', payload: `Hent timer på ${activePName}` },
            { title: 'Opprett SJA', payload: `Opprett en SJA for arbeid på ${activePName}` }
          ]
        });
      } else {
        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `📖 **Elektronisk Byggedagbok — ${activePName}**\n\nIngen dagboknotater er arkivert for dette prosjektet ennå.\n\nSi f.eks: *«Før notat i byggedagboken: God fremdrift i dag, kontrollert fall mot sluk 1:50 i dusj»* så lagres det formelt iht. Byggherreforskriften § 15.`,
          quickReplies: [
            { title: 'Før dagens vær & notat', payload: `Før i byggedagbok for ${activePName}: Normal drift iht fremdriftsplan` },
            { title: 'Hent oppgaver', payload: `Hent oppgaver på ${activePName}` }
          ]
        });
      }
    }

    // 🎯 AVVIK: "hent avvik" / "vis avvik" / "avviksliste"
    const isFetchDeviations = [
      'hent avvik', 'vis avvik', 'avviksliste', 'aktive avvik', 'avvik på prosjektet',
      'avvik', 'ruh', 'hent ruh', 'se avvik'
    ].includes(cleanLowerMsg) || (
      cleanLowerMsg.startsWith('hent avvik') || cleanLowerMsg.startsWith('vis avvik')
    );

    if (isFetchDeviations) {
      const activePName = resolvedProjectName || 'Renovering Bad Vidjeveien 21';
      if (projectDevs.length > 0) {
        const formattedDevs = projectDevs.map((d: any) => {
          const icon = d.status === 'closed' ? '✅' : d.severity === 'critical' || d.severity === 'high' ? '🚨' : '⚠️';
          const statText = d.status === 'closed' ? 'Lukket / Utbedret' : 'Åpent';
          const sevText = d.severity === 'critical' ? 'Kritisk' : d.severity === 'high' ? 'Høy' : 'Middels';
          return `• ${icon} **${d.title}** [${statText} • ${sevText}]\n` +
            `  - Fag: ${d.trade || 'Byggmester'}\n` +
            `  - Beskrivelse: ${d.description}\n` +
            (d.correctiveAction ? `  - Tiltak: ${d.correctiveAction}\n` : '');
        }).join('\n\n');

        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `⚠️ **Avvik & Kvalitetskontroll — ${activePName}**\n\n` +
            `Totalt ${projectDevs.length} avvik (${projectDevs.filter((d: any) => d.status !== 'closed').length} åpne):\n\n` +
            `${formattedDevs}\n\n` +
            `---\n` +
            `💡 Trenger du å opprette et nytt avvik eller lukke et eksisterende?`,
          quickReplies: [
            { title: '+ Registrer nytt avvik', payload: `Registrer avvik på ${activePName}: ` },
            { title: 'Hent oppgaver', payload: `Hent oppgaver på ${activePName}` },
            { title: 'Hent timer', payload: `Hent timer på ${activePName}` }
          ]
        });
      } else {
        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `✅ **Ingen avvik registrert — ${activePName}**\n\nByggeplassen har 0 åpne avvik loggført. Alle kontroller er i henhold til kvalitetsplanen og TEK17.`,
          quickReplies: [
            { title: '+ Registrer avvik', payload: `Registrer avvik på ${activePName}: ` },
            { title: 'Hent oppgaver', payload: `Hent oppgaver på ${activePName}` }
          ]
        });
      }
    }

    // 🎯 0A. BARE TRIGGER: "registrer avvik" / "meld avvik" (uten beskrivelse)
    const isBareAvvik = [
      'registrer avvik', 'meld avvik', 'opprett avvik', 'loggfør avvik', 'legg inn avvik', 'før avvik', 'nytt avvik', 'avviksmelding', 'meld ruh', 'registrer ruh'
    ].includes(cleanLowerMsg);

    if (isBareAvvik) {
      const activePName = resolvedProjectName && resolvedProjectName !== 'Alle byggeplasser' 
        ? resolvedProjectName 
        : (effectiveCompanyId === 'comp-demo-fjellheim' ? 'Hytte Sjusjøen - Nybygg' : (availableProjects?.[0]?.name || 'aktiv byggeplass'));

      return NextResponse.json({
        success: true,
        sessionId: fbId,
        reply: `⚠️ **Meld avvik / RUH (Kvalitetskontroll iht. TEK17)**\n*Gjelder byggeplass: **${activePName}***\n\nHva er feilen, mangelen eller den uønskede hendelsen som er oppdaget?\n\nBeskriv avviket kort (f.eks: *«Mangler klemring på sluk i dusjsonen»*, *«Feil isolasjonstykkelse i yttervegg»* eller *«Manglende fallsikring på stillas»*), så loggfører jeg avviket med alvorlighetsgrad, forskriftskrav og påkrevd utbedringstiltak!`,
        quickReplies: [
          { title: 'Våtrom & Membran', payload: `Registrer avvik på ${activePName}: Mangler klemring på sluk i dusjsonen` },
          { title: 'Isolasjon & Tetting', payload: `Registrer avvik på ${activePName}: Skade på dampsperre før kledning` },
          { title: 'HMS & Sikkerhet', payload: `Registrer avvik på ${activePName}: Manglende rekkverk på stillas` }
        ]
      });
    }

    // 🎯 0B. REELL REGISTRERING AV AVVIK / RUH (AUTONOMT I KS-SYSTEMET)
    const isExplicitDeviationCommand =
      cleanLowerMsg.startsWith('registrer avvik') ||
      cleanLowerMsg.startsWith('meld avvik') ||
      cleanLowerMsg.startsWith('opprett avvik') ||
      cleanLowerMsg.startsWith('loggfør avvik') ||
      cleanLowerMsg.startsWith('legg inn avvik') ||
      cleanLowerMsg.startsWith('før avvik') ||
      cleanLowerMsg.startsWith('avvik:') ||
      cleanLowerMsg.startsWith('avvik på') ||
      cleanLowerMsg.startsWith('avvik i') ||
      cleanLowerMsg.startsWith('avvik –') ||
      cleanLowerMsg.startsWith('avvik -') ||
      cleanLowerMsg.startsWith('ruh:') ||
      cleanLowerMsg.startsWith('ruh på') ||
      cleanLowerMsg.includes('avviksmelding');

    const isDeviationRegistration = !isFetchDeviations && !isBareAvvik && (
      isExplicitDeviationCommand ||
      // 🛡️ Den løse heuristikken under må ikke fyre på åpne spørsmål, ellers
      // opprettes det et avvik på et spørsmål i stedet for å besvares.
      (!looksLikeOpenQuestion && cleanLowerMsg.includes('avvik') && (
        cleanLowerMsg.includes('mangler') ||
        cleanLowerMsg.includes('feil') ||
        cleanLowerMsg.includes('oppdaget') ||
        cleanLowerMsg.includes('lekkasje') ||
        cleanLowerMsg.includes('skade') ||
        cleanLowerMsg.includes('sprekker') ||
        cleanLowerMsg.includes('ikke godkjent') ||
        cleanLowerMsg.includes('svikt') ||
        cleanLowerMsg.includes('montert feil')
      ))
    );

    if (isDeviationRegistration) {
      let finalProjId = resolvedProjectId;
      let finalProjName = resolvedProjectName;

      if (!finalProjId || !finalProjName || finalProjName === 'Alle byggeplasser') {
        if (effectiveCompanyId === 'comp-demo-fjellheim') {
          finalProjId = 'proj-demo-sjusjoen';
          finalProjName = 'Hytte Sjusjøen - Nybygg';
        } else if (Array.isArray(availableProjects) && availableProjects.length > 0) {
          finalProjId = availableProjects[0].id;
          finalProjName = availableProjects[0].name;
        } else {
          finalProjId = 'proj-default';
          finalProjName = 'Aktiv byggeplass';
        }
      }

      let cleaned = message
        .replace(/^(?:hei mesterai|hei|kan du|vennligst)?\s*(?:registrer|meld|opprett|loggfør|legg inn|før)?\s*(?:et\s+)?avvik\s*(?:på|for|om|i|angående)?\s*/i, '')
        .replace(/^(?:avvik|ruh)[:\-–]?\s*/i, '')
        .trim();

      if (finalProjName) {
        cleaned = cleaned.replace(new RegExp(`^${finalProjName}[:\\-–]?\\s*`, 'i'), '').trim();
      }

      let title = cleaned.length > 3 ? (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)) : 'Kvalitetsavvik og mangel';
      if (title.length > 80) {
        title = title.slice(0, 80) + '...';
      }

      let category = 'quality';
      let codeRef = 'TEK17 & Internkontrollforskriften § 5';
      let suggestedAction = 'Utbedre avviket i henhold til prosjektert løsning og dokumentere med før-/etter-foto.';
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';

      const lower = cleanLowerMsg;
      if (lower.includes('isolasjon') || lower.includes('kuldebro') || lower.includes('trekk') || lower.includes('glava') || lower.includes('rockwool') || lower.includes('dampsperre')) {
        category = 'isolasjon';
        codeRef = 'TEK17 § 14-2 (Energieffektivitet) & Byggforsk 523.255';
        suggestedAction = 'Montere mineralull med forskriftsmessig klemming mot stenderverk. Kontrollere kontinuerlig dampsperre med klemte skjøter før lukking.';
        severity = 'high';
      } else if (lower.includes('fall') || lower.includes('sluk') || lower.includes('membran') || lower.includes('våtrom') || lower.includes('lekkasje') || lower.includes('klemring')) {
        category = 'membran';
        codeRef = 'TEK17 § 13-15 (Våtrom og fall mot sluk) & BVN blad 31.205';
        suggestedAction = 'Utbedre fall mot sluk (minst 1:50 i dusjsone) og etablere godkjent mansjett/klemring før videre tildekking.';
        severity = 'high';
      } else if (lower.includes('brann') || lower.includes('gjennomføring') || lower.includes('mansjett') || lower.includes('røyk')) {
        category = 'brann';
        codeRef = 'TEK17 § 11-10 (Brannceller og seksjonering) & NS 3901';
        suggestedAction = 'Branntette gjennomføringer med godkjent brannakryl/mansjett tilpasset kravklasse EI 60.';
        severity = 'critical';
      } else if (lower.includes('bjelke') || lower.includes('spenn') || lower.includes('bæring') || lower.includes('svikt') || lower.includes('sprekk') || lower.includes('bærevegg')) {
        category = 'bæresystem';
        codeRef = 'TEK17 § 10-1 (Bæreevne og stabilitet) & Eurokode 5';
        suggestedAction = 'Forsterke bjelkelag/understøttelse og få rådgivende ingeniør (RIB) til å verifisere nedbøyningskrav.';
        severity = 'critical';
      } else if (lower.includes('rør') || lower.includes('avløp') || lower.includes('vann') || lower.includes('lekkasje')) {
        category = 'vvs';
        codeRef = 'TEK17 § 15-5 (Innvendige vanninstallasjoner) & Byggforsk 553.115';
        suggestedAction = 'Montere rør-i-rør system med forskriftsmessig avrenning til sluk og klamring per 0,6 m.';
        severity = 'high';
      } else if (lower.includes('el') || lower.includes('kabel') || lower.includes('sikring') || lower.includes('kurs') || lower.includes('stikk')) {
        category = 'elektro';
        codeRef = 'NEK 400 (Elektriske lavspenningsinstallasjoner) & DLE-krav';
        suggestedAction = 'Klamre trekkerør, sikre strekkavlastning og utstede samsvarserklæring før tildekking.';
        severity = 'high';
      }

      const devDoc = {
        id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        projectId: finalProjId,
        project: finalProjName,
        projectName: finalProjName,
        title,
        description: `Avvik meldt inn via MesterAI: ${message}`,
        category,
        severity,
        status: 'open' as const,
        reportedBy: effectiveUser,
        authorId: body.userId || user?.id || (effectiveCompanyId === 'comp-demo-fjellheim' ? 'u-demo-lars-fjellheim' : 'user-me'),
        action: suggestedAction,
        correctiveAction: suggestedAction,
        codeReference: codeRef,
        company: effectiveCompany,
        companyId: effectiveCompanyId,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      await saveCollectionItem('deviations', devDoc);

      await saveCollectionItem('agent_activities', {
        type: 'deviation_created',
        title: `Avvik registrert: ${title}`,
        description: `Prosjekt: ${finalProjName}. ${codeRef}.`,
        trade: userTrade || 'general',
        tradeName: effectiveUser,
        status: 'open',
        badge: severity === 'critical' ? 'KRITISK AVVIK' : 'AVVIK REGISTRERT',
        projectId: finalProjId,
        projectName: finalProjName,
        companyId: effectiveCompanyId,
        company: effectiveCompany,
        createdAt: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        sessionId: fbId,
        deviation: devDoc,
        reply: `⚠️ **Avvik registrert i kvalitetssystemet (KS & TEK17)!**\n\n` +
          `- **Avvik:** **«${title}»**\n` +
          `- **Byggeplass:** **${finalProjName}**\n` +
          `- **Alvorlighetsgrad:** ${severity === 'critical' ? '🔴 **KRITISK** (Sperrer for ferdigattest)' : severity === 'high' ? '🟠 **HØY**' : '🟡 **MIDDELS**'}\n` +
          `- **Forskriftskrav:** ${codeRef}\n` +
          `- **Påkrevd tiltak:** ${suggestedAction}\n` +
          `- **Gjeldende status:** ⏳ **Åpent (Aktiv lukkesperre for sonen)**\n\n` +
          `Avviket er lagret i prosjektets kvalitetssikringslogg og vises nå under **Avvik & RUH**.`,
        quickReplies: [
          { title: 'Vis alle avvik', payload: `Vis avvik på ${finalProjName}` },
          { title: 'Tildel oppgave for utbedring', payload: `Opprett oppgave: Utbedre ${title} på ${finalProjName}` },
          { title: 'Før dagens timer', payload: `Før timer på ${finalProjName}` }
        ]
      });
    }

    // 🎯 1. BARE TRIGGER: "endringsordre"
    const isBareEO = [
      'endringsordre', 'endringsmelding', 'endringsvarsel', 'eo', 'opprett endringsordre', 'lag endringsordre', 'lag en endringsordre', 'opprett endring'
    ].includes(cleanLowerMsg);

    if (isBareEO) {
      if (resolvedProjectName && resolvedProjectName !== 'Alle byggeplasser') {
        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `📋 **Opprette endringsordre (NS 8406)**\n*Gjelder byggeplass: **${resolvedProjectName}***\n\nHva er tilleggsarbeidet eller endringen som er bestilt eller oppstått på plassen?\n\nBeskriv kort hva som skal utføres (f.eks: *«Kunden ønsker 5 ekstra downlights»*, *«Omlegging av avløp pga. bjelkelag»* eller *«Montering av innfelt nisje i dusjsonen»*), så setter jeg opp kalkylen med timeantall, materiell, påslag og eventuell fristforlengelse!\n\n💡 *Når utkastet settes opp, kan du fritt redigere, slette eller legge til flere poster før ordren sendes til godkjenning.*`,
          quickReplies: [
            { title: 'Tilleggsarbeid bestilt av kunde', payload: `Endringsordre på ${resolvedProjectName}: Tilleggsarbeid bestilt av kunde` },
            { title: 'Uforutsette forhold på plassen', payload: `Endringsordre på ${resolvedProjectName}: Uforutsette bygningsmessige hindringer` },
            { title: 'Endret materialvalg', payload: `Endringsordre på ${resolvedProjectName}: Oppgradering og endret materialvalg` }
          ]
        });
      } else {
        const projOptions = (availableProjects || []).slice(0, 5).map((p: any) => ({
          title: p.name,
          payload: `Endringsordre på ${p.name}: `
        }));
        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `📋 **Opprette endringsordre (NS 8406)**\n\nHvilket prosjekt gjelder endringsordren, og hva er arbeidet som skal utføres?\n\nVelg en av dine aktive byggeplasser under, eller oppgi prosjektnavnet og en kort beskrivelse:`,
          quickReplies: projOptions
        });
      }
    }

    // 🎯 2. BARE TRIGGER: "tilbud"
    const isBareOffer = [
      'tilbud', 'pristilbud', 'kalkyle', 'lag tilbud', 'lag et tilbud', 'opprett tilbud', 'skriv tilbud', 'sett opp tilbud'
    ].includes(cleanLowerMsg);

    if (isBareOffer) {
      if (resolvedProjectName && resolvedProjectName !== 'Alle byggeplasser') {
        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `📝 **Pristilbud & Kalkyle**\n*Gjelder: **${resolvedProjectName}***\n\nHva skal tilbudet omfatte? Beskriv kort arbeidet (f.eks: *«Totalrehabilitering av bad 6 m²»*, *«Oppføring av terrasse 25 m²»* eller *«Maling og sparkling av stue»*), så setter jeg opp kalkylen med spesifiserte tilbudsposter, timepriser, materiell og MVA.\n\n💡 *Du kan redigere, slette eller legge til flere poster i kalkylen før tilbudet sendes til kunden.*`,
          quickReplies: [
            { title: 'Totalrehabilitering bad', payload: `Pristilbud på ${resolvedProjectName}: Totalrenovering av bad 6 m2 iht BVN` },
            { title: 'Oppføring av terrasse', payload: `Pristilbud på ${resolvedProjectName}: Bygging av terrasse 25 m2 med rekkverk` },
            { title: 'Innvendig oppussing', payload: `Pristilbud på ${resolvedProjectName}: Sparkling, maling og listverk` }
          ]
        });
      } else {
        const projOptions = [
          { title: '+ Ny kunde / ny henvendelse', payload: 'Sett opp pristilbud for ny kunde: ' },
          ...(availableProjects || []).slice(0, 4).map((p: any) => ({
            title: p.name,
            payload: `Tilbud på ${p.name}: `
          }))
        ];
        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `📝 **Pristilbud & Kalkyle**\n\nGjelder tilbudet en **ny henvendelse / ny kunde**, eller et av dine eksisterende prosjekter?\n\nBeskriv gjerne kort hva som skal prises, så setter jeg opp en fullstendig kalkyle med spesifiserte tilbudsposter:`,
          quickReplies: projOptions
        });
      }
    }

    // 🎯 3. BARE TRIGGER: "sja"
    const isBareSja = [
      'sja', 'sikker jobb analyse', 'opprett sja', 'lag sja', 'lag en sja'
    ].includes(cleanLowerMsg);

    if (isBareSja) {
      const targetProj = resolvedProjectName || 'aktiv byggeplass';
      return NextResponse.json({
        success: true,
        sessionId: fbId,
        reply: `🛡️ **Opprette Sikker Jobb Analyse (SJA)**\n*Gjelder byggeplass: **${targetProj}***\n\nHvilket risikofylt arbeid skal dere utføre?\n\nBeskriv oppgaven (f.eks: *«Arbeid i stillas og fasadekledning»*, *«Takarbeid i høyden»*, *«Riving av bærevegg»* eller *«Arbeid i grøft dypere enn 2 meter»*), så setter jeg opp et stramt og godkjent SJA-sammendrag med nødvendige vernetiltak og værsjekk!`,
        quickReplies: [
          { title: 'Arbeid i stillas & fasade', payload: `Opprett en SJA for arbeid i stillas og fasadekledning på ${targetProj}` },
          { title: 'Takarbeid i høyden', payload: `Opprett en SJA for takarbeid og tekking på ${targetProj}` },
          { title: 'Riving & støv/asbest', payload: `Opprett en SJA for riving og støvende arbeid på ${targetProj}` }
        ]
      });
    }

    // ⏱️ HELPER: Tolk timer fra tale eller tekst (f.eks. "7.5", "7,5", "8", "sju og en halv", "syv timer", "åtte timer")
    const parseSpokenHours = (text: string): number | null => {
      const clean = text.toLowerCase().trim();

      // 1. Desimaler og tall (f.eks: 7.5, 7,5, 8, 7)
      const digitMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:timer?|time|t\b)/i);
      if (digitMatch) {
        const val = parseFloat(digitMatch[1].replace(',', '.'));
        if (!isNaN(val) && val > 0 && val <= 24) return val;
      }

      // 2. Timer og minutter (f.eks: "7 timer og 30 minutter" eller "7t 30m")
      const hourMinMatch = clean.match(/(\d+)\s*(?:timer?|time|t)\s*(?:og\s*)?(\d+)\s*(?:minutter?|min|m\b)/i);
      if (hourMinMatch) {
        const h = parseInt(hourMinMatch[1], 10);
        const m = parseInt(hourMinMatch[2], 10);
        return Math.round((h + m / 60) * 10) / 10;
      }

      // 3. Muntlige norske tall og brøker
      if (/s[jy]v\s+og\s+en\s+halv/i.test(clean) || /s[jy]v\s+komma\s+fem/i.test(clean)) return 7.5;
      if (/[aå]tte\s+og\s+en\s+halv/i.test(clean)) return 8.5;
      if (/\b(?:en\s+halv|halv)\s+time/i.test(clean)) return 0.5;
      if (/\bhalvannen\s+time/i.test(clean)) return 1.5;
      if (/\bto\s+og\s+en\s+halv/i.test(clean)) return 2.5;
      if (/\btre\s+og\s+en\s+halv/i.test(clean)) return 3.5;
      if (/\bfire\s+og\s+en\s+halv/i.test(clean)) return 4.5;
      if (/\bfem\s+og\s+en\s+halv/i.test(clean)) return 5.5;
      if (/\bseks\s+og\s+en\s+halv/i.test(clean)) return 6.5;

      if (/\b(?:en|ett|1)\s+time\b/i.test(clean)) return 1.0;
      if (/\bto\s+timer?\b/i.test(clean)) return 2.0;
      if (/\btre\s+timer?\b/i.test(clean)) return 3.0;
      if (/\bfire\s+timer?\b/i.test(clean)) return 4.0;
      if (/\bfem\s+timer?\b/i.test(clean)) return 5.0;
      if (/\bseks\s+timer?\b/i.test(clean)) return 6.0;
      if (/\bs[jy]v\s+timer?\b/i.test(clean)) return 7.0;
      if (/\b[aå]tte\s+timer?\b/i.test(clean)) return 8.0;
      if (/\bni\s+timer?\b/i.test(clean)) return 9.0;
      if (/\bti\s+timer?\b/i.test(clean)) return 10.0;
      if (/\belleve\s+timer?\b/i.test(clean)) return 11.0;
      if (/\btolv\s+timer?\b/i.test(clean)) return 12.0;

      // 4. Tall i starten av teksten: "7.5 lekting av vegg"
      const startMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*(?:timer?|time|t\b)?\s+/i);
      if (startMatch) {
        const val = parseFloat(startMatch[1].replace(',', '.'));
        if (!isNaN(val) && val > 0 && val <= 24) return val;
      }

      return null;
    };

    // 🎯 4. BARE TRIGGER: "før timer"
    const isBareTime = [
      'før timer', 'føre timer', 'timeregistrering', 'timeføring', 'før time', 'registrer timer', 'logg timer'
    ].includes(cleanLowerMsg);

    if (isBareTime) {
      const activePName = resolvedProjectName && resolvedProjectName !== 'Alle byggeplasser' 
        ? resolvedProjectName 
        : (effectiveCompanyId === 'comp-demo-fjellheim' ? 'Hytte Sjusjøen - Nybygg' : (availableProjects?.[0]?.name || 'aktiv byggeplass'));

      return NextResponse.json({
        success: true,
        sessionId: fbId,
        reply: `⏱️ **Timeføring i byggedagboken**\n*Gjelder byggeplass: **${activePName}***\n\nHvor mange timer har du jobbet, og hva ble utført i dag?\n\n*Eksempel: «Før 7.5 timer i dag på ${activePName}: Lekting av yttervegg og klargjøring for kledning».*`,
        quickReplies: [
          { title: '7.5t Normaltid', payload: `Før 7.5 timer i dag på ${activePName}: Produksjon iht fremdriftsplan` },
          { title: '7.5t + 2t overtid (50%)', payload: `Før 9.5 timer i dag på ${activePName}: Produksjon og overtid` },
          { title: 'Helg/kveld (100%)', payload: `Før 5 timer kveldsarbeid på ${activePName}` }
        ]
      });
    }

    // ⏱️ 5. REELL TIMEREGISTRERING VIA TALE ELLER TEKST I CHAT
    const detectedHours = parseSpokenHours(cleanLowerMsg);
    const hasTimeLoggingKeyword = (
      cleanLowerMsg.includes('før') ||
      cleanLowerMsg.includes('føre') ||
      cleanLowerMsg.includes('førte') ||
      cleanLowerMsg.includes('registrer') ||
      cleanLowerMsg.includes('logg') ||
      cleanLowerMsg.includes('jobbet') ||
      cleanLowerMsg.includes('jobba') ||
      cleanLowerMsg.includes('arbeidet') ||
      cleanLowerMsg.includes('arbeida') ||
      cleanLowerMsg.includes('snekret') ||
      cleanLowerMsg.includes('montert') ||
      cleanLowerMsg.includes('hatt') ||
      cleanLowerMsg.includes('skriv inn') ||
      cleanLowerMsg.includes('legg inn') ||
      cleanLowerMsg.includes('timeliste') ||
      cleanLowerMsg.includes('byggedagbok') ||
      cleanLowerMsg.includes('time') ||
      cleanLowerMsg.includes('timer')
    );

    // 🛡️ Spørsmålsvakt: «hva koster 5 timer?» skal besvares, ikke føres.
    const isLoggingTime = detectedHours !== null && !looksLikeOpenQuestion && (
      hasTimeLoggingKeyword || 
      /^(\d+(?:[.,]\d+)?)\s*(?:timer?|time|t\b)/i.test(cleanLowerMsg)
    );

    if (isLoggingTime) {
      // 📍 Finn prosjekt - ingen avvisning eller blokkering av håndverkeren!
      let finalProjId = resolvedProjectId;
      let finalProjName = resolvedProjectName;

      if (!finalProjId || !finalProjName || finalProjName === 'Alle byggeplasser') {
        if (effectiveCompanyId === 'comp-demo-fjellheim') {
          finalProjId = 'proj-demo-sjusjoen';
          finalProjName = 'Hytte Sjusjøen - Nybygg';
        } else if (Array.isArray(availableProjects) && availableProjects.length > 0) {
          finalProjId = availableProjects[0].id;
          finalProjName = availableProjects[0].name;
        } else {
          finalProjId = 'proj-default';
          finalProjName = 'Aktiv byggeplass';
        }
      }

      const totalHours = detectedHours ?? 7.5;
      
      const isWeekendEvening = cleanLowerMsg.includes('kveld') || cleanLowerMsg.includes('helg') || cleanLowerMsg.includes('søndag') || cleanLowerMsg.includes('lørdag') || cleanLowerMsg.includes('100%');
      
      const normalHours = isWeekendEvening ? 0 : Math.min(7.5, totalHours);
      const ot50 = isWeekendEvening ? 0 : Math.max(0, Math.round((totalHours - 7.5) * 10) / 10);
      const ot100 = isWeekendEvening ? totalHours : 0;

      // 🔒 Sjekk om det bes om å føre timer på en annen person
      // Kun administrator eller leder har lov til å føre timer på andre ansatte iht. AML § 10-7

      // Finn om meldingen spesifiserer en annen håndverker
      let targetWorkerName = effectiveUser;
      let targetWorkerRole = tradeTitle;
      let isForOtherPerson = false;

      const teamList = Array.isArray(body.teamMembers) ? body.teamMembers : [];
      // 1. Sjekk mot registrerte teammedlemmer
      for (const m of teamList) {
        if (!m || !m.name) continue;
        const mNorm = m.name.toLowerCase().trim();
        const effNorm = effectiveUser.toLowerCase().trim();
        if (mNorm !== effNorm && cleanLowerMsg.includes(mNorm)) {
          isForOtherPerson = true;
          targetWorkerName = m.name;
          targetWorkerRole = m.role || 'Fagarbeider';
          break;
        }
      }

      // 2. Hvis ikke funnet i teamList, sjekk mønster "for [Navn Navnesen]"
      if (!isForOtherPerson) {
        const forMatch = message.match(/(?:for|på vegne av)\s+([A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅ][a-zæøå]+)?)/);
        if (forMatch) {
          const cand = forMatch[1].trim();
          const candLower = cand.toLowerCase();
          const effLower = effectiveUser.toLowerCase();
          const ignoreWords = ['meg', 'meg selv', 'seg', 'arbeid', 'kveld', 'helg', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'];
          if (!ignoreWords.includes(candLower) && !candLower.includes(effLower) && !effLower.includes(candLower)) {
            isForOtherPerson = true;
            targetWorkerName = cand;
            targetWorkerRole = 'Fagarbeider';
          }
        }
      }

      // 🛑 HVIS IKKE ADMIN OG PRØVER Å FØRE PÅ ANDRE: NEKT!
      if (isForOtherPerson && !isSenderAdmin) {
        return NextResponse.json({
          success: true,
          sessionId: fbId,
          reply: `🔒 **Adgangsbegrensning: Kun administrator eller leder kan føre timer for andre ansatte.**\n\n` +
            `Du er innlogget som **${effectiveUser}**. Fagarbeidere kan kun føre timer på sin egen profil for å sikre korrekt HMS- og lønnsgrunnlag iht. AML § 10-7.\n\n` +
            `Vil du at jeg skal registrere disse ${totalHours} timene på **deg selv (${effectiveUser})** på **${finalProjName}** i stedet?`,
          quickReplies: [
            { title: `Ja, før på meg (${effectiveUser})`, payload: `Før ${totalHours} timer i dag på ${finalProjName}` },
            { title: 'Avbryt', payload: 'Avbryt timeføring' }
          ]
        });
      }
      
      let task = message
        .replace(/^(?:hei mesterai|hei|kan du|vennligst)?\s*(?:før|føre|førte|registrer|logg|logget|loggfør|skriv inn|legg inn|har jobbet|jobbet|jobba|arbeidet|arbeida|snekret|montert)\s*(?:\d+(?:[.,]\d+)?\s*(?:timer?|time|t\b))?\s*(?:timer?|time|t\b)?/i, '')
        .replace(/(?:i dag|idag|på mandag|på tirsdag|på onsdag|på torsdag|på fredag)/gi, '')
        .trim();
        
      if (finalProjName) {
        task = task.replace(new RegExp(`(?:på|for|ved)?\\s*${finalProjName}[:\\-–]?`, 'gi'), '');
      }
      if (isForOtherPerson && targetWorkerName) {
        task = task.replace(new RegExp(`(?:for|på vegne av|på)\\s*${targetWorkerName}[:\\-–]?`, 'gi'), '');
      }
      task = task.replace(/^[:\s\-–]+/, '').trim();
      if (!task || task.length < 3) {
        task = 'Fagmessig produksjon og utførelse iht. fremdriftsplan';
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const timeEntry = {
        id: `time_${Date.now()}`,
        workerName: targetWorkerName,
        role: targetWorkerRole,
        date: todayStr,
        hours: normalHours,
        overtime50: ot50,
        overtime100: ot100,
        task,
        status: 'pending' as const,
        projectId: finalProjId,
        projectName: finalProjName,
        companyId: effectiveCompanyId,
        company: effectiveCompany,
        userId: body.userId || user?.id || (effectiveCompanyId === 'comp-demo-fjellheim' ? 'u-demo-lars-fjellheim' : 'user-me'),
        loggedBy: isForOtherPerson ? `${effectiveUser} (Leder/Admin)` : undefined,
        createdAt: new Date().toISOString()
      };

      await saveCollectionItem('time_entries', timeEntry);

      // Oppdater prosjektets byggedagbok for i dag
      try {
        const allDailyLogs = await getCollectionItems('daily_logs').catch(() => []);
        const existingToday = allDailyLogs.find((l: any) => l.projectId === finalProjId && l.date === todayStr);
        const crewList = existingToday?.crewMembers 
          ? Array.from(new Set([...existingToday.crewMembers, targetWorkerName]))
          : [targetWorkerName];
        const newTotalH = (Number(existingToday?.totalHoursWorked) || 0) + totalHours;
        const noteLine = `• ${targetWorkerName}: ${totalHours}t – ${task}${isForOtherPerson ? ` (ført av ${effectiveUser})` : ''}`;
        const updatedNotes = existingToday?.generalNotes 
          ? `${existingToday.generalNotes}\n${noteLine}`
          : noteLine;

        await saveCollectionItem('daily_logs', {
          id: existingToday?.id || `log_${finalProjId}_${todayStr}`,
          projectId: finalProjId,
          projectName: finalProjName,
          companyId: effectiveCompanyId,
          company: effectiveCompany,
          userId: body.userId || user?.id,
          date: todayStr,
          crewCount: crewList.length,
          crewMembers: crewList,
          totalHoursWorked: newTotalH,
          generalNotes: updatedNotes,
          weatherCondition: existingToday?.weatherCondition || 'Opphold',
          inspectedBy: effectiveUser,
          autoGenerated: true,
          updatedAt: new Date().toISOString(),
          createdAt: existingToday?.createdAt || new Date().toISOString()
        });
      } catch (e) {
        console.warn('Feil ved synk til daily_logs:', e);
      }

      await saveCollectionItem('agent_activities', {
        type: 'time_logged',
        title: `Timer ført: ${totalHours}t på ${targetWorkerName}`,
        description: `Prosjekt: ${finalProjName}. Oppgave: ${task}.${isForOtherPerson ? ` Registrert av leder: ${effectiveUser}.` : ''}`,
        trade: userTrade || 'general',
        tradeName: targetWorkerName,
        status: 'verified',
        badge: `${totalHours} TIMER`,
        projectId: finalProjId,
        projectName: finalProjName,
        companyId: effectiveCompanyId,
        company: effectiveCompany,
        createdAt: new Date().toISOString()
      });

      const workerSubtitle = isForOtherPerson 
        ? `**${targetWorkerName}** (${targetWorkerRole} • Registrert av leder ${effectiveUser})`
        : `**${effectiveUser}** (${tradeTitle} • Din brukerkonto)`;

      // Hurtigvalg for bytte av prosjekt hvis flere prosjekter finnes
      const switchProjectReplies = (Array.isArray(availableProjects) && availableProjects.length > 1)
        ? availableProjects
            .filter((p: any) => p.id !== finalProjId)
            .slice(0, 2)
            .map((p: any) => ({
              title: `Flytt til ${p.name}`,
              payload: `Før ${totalHours} timer i dag på ${p.name}: ${task}`
            }))
        : [];

      return NextResponse.json({
        success: true,
        sessionId: fbId,
        timeEntry,
        reply: `⏱️ **${totalHours.toFixed(1)} timer er ført i byggedagboken!**\n\n` +
          `• **Prosjekt:** **${finalProjName}**\n` +
          `• **Håndverker:** ${workerSubtitle}\n` +
          `• **Dato:** ${todayStr}\n` +
          `• **Normaltid:** ${normalHours} t\n` +
          (ot50 > 0 ? `• **50% Overtid:** +${ot50} t (AML § 10-6)\n` : '') +
          (ot100 > 0 ? `• **100% Overtid:** +${ot100} t\n` : '') +
          `• **Arbeidsoppgave:** ${task}\n` +
          `• **Status:** Lagt til for ledergodkjenning (AML § 10-7)\n\n` +
          `Timene er bokført på prosjektet og vises i sanntid under **«Byggedagbok & Timer» -> «Siste oppføringer»** og **«Ledergodkjenning»**.`,
        quickReplies: [
          { title: 'Åpne Byggedagbok & Timer', payload: 'Vis byggedagbok' },
          { title: 'Åpne Ledergodkjenning', payload: 'Vis timegodkjenning for leder' },
          ...switchProjectReplies,
          { title: 'Før flere timer', payload: `Før timer på ${finalProjName}` }
        ]
      });
    }

    // 🌦️ LYN-RASK SANNTIDS VÆR- OG HMS-RESPONS (< 0.2s)
    const isWeather = isWeatherQuery(message);
    const activeLocationQuery = (effectiveCompanyId === 'comp-demo-fjellheim') 
      ? 'Sjusjøen' 
      : (projectName || body.location || (user?.company === 'AIChat Norge AS / Vikingnet' ? 'Oslo' : 'Horten'));

    const weatherRep = await fetchRealtimeWeather(activeLocationQuery);

    if (isWeather && (!message.toLowerCase().includes('send e-post') && !message.toLowerCase().includes('send epost') && !message.toLowerCase().includes('lag tilbud'))) {
      const activeProjTitle = projectName && projectName !== 'Alle byggeplasser' ? projectName : weatherRep.locationName;

      const reply = `🌤️ **Værvarsel og HMS-arbeidsforhold for ${weatherRep.locationName}**\n*Gjelder byggeplass: ${activeProjTitle}*\n\n• **Temperatur nå:** ${weatherRep.temp}°C (Dagens spenn: ${weatherRep.minTemp}°C til ${weatherRep.maxTemp}°C)\n• **Værforhold:** ${weatherRep.condition}\n• **Vindstyrke:** ${weatherRep.windSpeed} m/s (${weatherRep.beaufort})\n• **Nedbør i dag:** ${weatherRep.precipitation} mm\n• **Relativ luftfuktighet:** ${weatherRep.humidity}%\n\n🛡️ **HMS- og Arbeidsråd for byggeplassen:**\n${weatherRep.workAdvice}\n\n💡 **MesterAI Vurdering:**\nForholdene er vurdert opp mot Byggherreforskriften og Arbeidstilsynets retningslinjer for stillas- og takarbeid. Vil du at jeg oppretter en SJA eller fører dagens vær i byggedagboken?`;

      return NextResponse.json({
        success: true,
        sessionId: fbId,
        reply,
        quickReplies: [
          { title: 'Opprett SJA for arbeid i dag', payload: `Opprett en SJA for arbeid på ${activeProjTitle} tilpasset været` },
          { title: 'Før i byggedagbok', payload: `Før 7.5 timer og dagens vær (${weatherRep.temp}°C, ${weatherRep.condition}) i byggedagboken` },
          { title: 'Sjekk krav til lukkesperre', payload: `Sjekk TEK17 krav til lukkesperre og tildekking for ${activeProjTitle}` }
        ]
      });
    }

    // Berik alltid agenten med live vær for det aktive prosjektet
    contextHeader += ` | 🌦️ Sanntidsvær på byggeplassen (${weatherRep.locationName}): ${weatherRep.temp}°C, ${weatherRep.condition}, vind ${weatherRep.windSpeed} m/s (${weatherRep.beaufort}), nedbør ${weatherRep.precipitation} mm. HMS-råd: ${weatherRep.workAdvice}`;

    // 🧠 SJEKK OM FORESPØRSELEN KREVER NETTSØK (ARRANGEMENTER, PRISER, TEK17, NYHETER)
    // 📷 Forbered eventuelt vedlagt bilde for multimodal synsanalyse (Google Gemini Vision)
    let imageAttachment: { data: string; mimeType: string } | null = null;
    const rawImage = imageBase64 || image || imageUrl;

    if (rawImage && typeof rawImage === 'string') {
      try {
        if (rawImage.startsWith('data:')) {
          const commaIdx = rawImage.indexOf(',');
          if (commaIdx !== -1) {
            const header = rawImage.substring(0, commaIdx);
            const data = rawImage.substring(commaIdx + 1).replace(/\s+/g, '');
            const mimeMatch = header.match(/data:([^;]+)/);
            imageAttachment = {
              mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
              data
            };
          }
        } else if (rawImage.length > 200 && !rawImage.startsWith('http') && !rawImage.startsWith('/')) {
          imageAttachment = {
            data: rawImage.replace(/\s+/g, ''),
            mimeType: 'image/jpeg'
          };
        } else if (rawImage.startsWith('/api/uploads/') || rawImage.startsWith('/uploads/')) {
          const uploadsDir = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
          const cleanName = rawImage.replace(/^\/api\/uploads\//, '').replace(/^\/uploads\//, '');
          const filePath = path.join(uploadsDir, cleanName);
          if (fs.existsSync(filePath)) {
            const buf = await fs.promises.readFile(filePath);
            const ext = path.extname(cleanName).toLowerCase().replace('.', '');
            const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            imageAttachment = {
              data: buf.toString('base64'),
              mimeType
            };
          }
        } else if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
          const fetched = await fetch(rawImage, { signal: AbortSignal.timeout(10000) });
          if (fetched.ok) {
            const ab = await fetched.arrayBuffer();
            const mime = fetched.headers.get('content-type') || 'image/jpeg';
            imageAttachment = {
              data: Buffer.from(ab).toString('base64'),
              mimeType: mime.split(';')[0]
            };
          }
        }
      } catch (imgErr: any) {
        console.warn('Kunne ikke laste vedlagt bilde for analyse:', imgErr.message);
      }
    }

    const hasImage = Boolean(imageAttachment);

    // 🧠 SJEKK OM FORESPØRSELEN KREVER NETTSØK (ARRANGEMENTER, PRISER, TEK17, NYHETER)
    const wantsWebSearch = detectWebSearchNeed(message);

    // 🧠 Multi-turn samtalehukommelse. Historikken bygges BÅDE som strukturert
    // liste med ekte roller (til primærmotoren) og som tekstblokk (fallback for
    // 1min.AI / Gemini / OpenRouter), slik at ingen motor mister konteksten.
    let historyBlock = '';
    const structuredHistory: AiChatMessage[] = [];
    if (Array.isArray(history) && history.length > 0) {
      const cleanHistory = history
        .filter((h: any) => h && (h.content || h.text || h.message))
        .slice(-20);

      if (cleanHistory.length > 0) {
        historyBlock = `\n[TIDLIGERE SAMTALEHISTORIKK I DENNE TRÅDEN]:\n`;
        for (const item of cleanHistory) {
          const isAssistantTurn = (item.role === 'assistant' || item.role === 'model' || item.sender === 'bot');
          const roleName = isAssistantTurn ? 'MesterAI' : (effectiveUser || 'Håndverker');
          const itemText = (item.content || item.text || item.message || '').toString().trim();
          if (itemText) {
            // Romslig tak: hele forrige svar skal kunne leses, ikke bare 500 tegn.
            const keptItem = itemText.length > 4000 ? itemText.slice(0, 4000) + '...' : itemText;
            historyBlock += `${roleName}: ${keptItem}\n`;
            structuredHistory.push({ role: isAssistantTurn ? 'assistant' : 'user', content: keptItem });
          }
        }
        historyBlock += `[SLUTT PÅ SAMTALEHISTORIKK - NÅVÆRENDE HENVENDELSE FRA HÅNDVERKER UNDER]\n\n`;
      }
    }

    // Selve dagens henvendelse, uten den flate historikken (den sendes som ekte roller).
    let currentTurn = '';
    // 📜 Kontekst fra forrige samtaletråd (hvis brukeren åpner en ny tråd og refererer til "i forrige samtale")
    if (previousSessionContext && typeof previousSessionContext === 'string' && previousSessionContext.trim()) {
      currentTurn += `[KONTEKST FRA BRUKERENS FORRIGE SAMTALETRÅD]:\n${previousSessionContext.trim()}\n[SLUTT PÅ FORRIGE TRÅD]\n\n`;
    }

    currentTurn += message;

    if (hasImage) {
      currentTurn += `\n\n[📷 VEDLAGT BILDE FOR SYNSSJEKK]: Et bilde er lastet opp. Gjennomfør en grundig faglig bildeanalyse av motivet. Beskriv hva du observerer (utførelse, materialer, konstruksjon, tilstand), vurder opp mot gjeldende krav (TEK17 / BVN / HMS), påpek eventuelle feil eller avvik, og gi konkrete råd eller forslag til videre tiltak.`;
    }

    const enrichedMessage = `${contextHeader}\n${historyBlock}${currentTurn}`;

    // 🛡️ INTELLIGENT GDPR-RUTING (Schrems II / EU-overholdelse):
    // Hvis henvendelsen gjelder bilpark, kjøretøy/skiltnummer, sjåfører, ansatte eller personopplysninger:
    // 1. Vi sladder IKKE brukerens data, slik at AI-en ser det reelle bilnummeret, telefonen og navnet.
    // 2. Vi ruter automatisk til EU-driftet modell (1min.ai med Claude/Mistral/GPT eller Gemini EU).
    // 3. For alle andre henvendelser (kalkyler, TEK17, SJA, NS 8406 osv.) brukes DeepSeek direkte som rask hovedmotor.
    const isGdprSensitive = containsPIIOrGdprData(enrichedMessage) ||
      /\b(?:bil|bilpark|kjøretøy|skiltnr|regnr|registreringsnummer|sjåfør|ansatt|personalia|lønn|førerkort|firmabil|varebil)\b/i.test(enrichedMessage);

    const safeEnrichedMessage = isGdprSensitive ? enrichedMessage : maskPII(enrichedMessage);
    // 🛡️ Primærmotoren får dagens henvendelse MED konteksthodet (rolle, tilgang,
    // prosjektstatus, vær). Uten dette mister den all per-request-kontekst, siden
    // den strukturerte meldingslisten erstatter den flate prompten.
    const currentTurnWithContext = `${contextHeader}\n${currentTurn}`;
    const safeCurrentTurn = isGdprSensitive ? currentTurnWithContext : maskPII(currentTurnWithContext);

    const userLang = (language || 'no').toLowerCase();
    const langDirective = (() => {
      if (userLang.startsWith('en')) {
        return `\n🌐 AKTIVT BRUKERSPRÅK: ENGELSK (en)\nBrukerens grensesnitt er aktivt satt til engelsk. Du SKAL svare på engelsk (English). Forklar, rådgiv og veiled flytende på engelsk, samtidig som du refererer korrekt til norske standarder og lover (TEK17, NS 8406, Arbeidstilsynet osv.).\n`;
      }
      if (userLang.startsWith('pl')) {
        return `\n🌐 AKTIVT BRUKERSPRÅK: POLSK (pl)\nBrukerens grensesnitt er aktivt satt til polsk. Du SKAL svare på polsk (język polski). Forklar, rådgiv og veiled flytende på polsk, samtidig som du refererer korrekt til norske standarder og lover (TEK17, NS 8406, Arbeidstilsynet osv.).\n`;
      }
      if (userLang.startsWith('lt')) {
        return `\n🌐 AKTIVT BRUKERSPRÅK: LITAUISK (lt)\nBrukerens grensesnitt er aktivt satt til litauisk. Du SKAL svare på litauisk (lietuvių kalba). Forklar, rådgiv og veiled flytende på litauisk, samtidig som du refererer korrekt til norske standarder og lover (TEK17, NS 8406, Arbeidstilsynet osv.).\n`;
      }
      return '';
    })();

    const MASTER_SYSTEM_PROMPT = `Du er MesterAI, en helautonom prosjektpilot og byggmester-assistent i backendsystemet til Vikingmester. Du opererer selvstendig, tenker som en erfaren byggmester/prosjektleder, og utfører oppgaver direkte uten unødige forhør.
${langDirective}
🧠 SAMTALEHUKOMMELSE & KONTEKST (MULTI-TURN DIALOG):
- Du har tilgang til tidligere meldinger i denne samtaletråden ovenfor under [TIDLIGERE SAMTALEHISTORIKK I DENNE TRÅDEN].
- Du HUSKER hva dere nettopp snakket om, tidligere beregninger, oppgitte mål, materialer og tilbudsposter.
- Når brukeren svarer kort eller refererer til forrige svar (f.eks: «ja», «50 kvm», «legg til vinduer også», «hva koster det?», «send det på e-post nå», «endre timeprisen til 950»), skal du forstå konteksten umiddelbart og bygge videre på det dere har diskutert.
- Du skal ALDRI glemme tidligere oppgitte detaljer eller stille de samme spørsmålene på nytt i samme tråd.
- Hvis brukeren refererer til «i forrige samtale», «forrige tråd» eller «hva snakket vi om sist?», har du konteksten fra forrige tråd tilgjengelig under [KONTEKST FRA BRUKERENS FORRIGE SAMTALETRÅD]. Referer til det og fortsett arbeidet sømløst i stedet for å si at du ikke har innholdet tilgjengelig! Hold samtalen flytende, naturlig, samarbeidende og handlingsorientert!

🛡️ 100% WHITE-LABEL:
Du er MesterAI, utviklet eksklusivt for Vikingmester. Du skal ALDRI nevne eller referere til underliggende AI-modeller, leverandører eller eksterne systemer som DeepSeek, OpenAI, Google, Anthropic eller Botsify. For brukeren er du 100 % MesterAI.

📷 MULTIMODAL BILDEANALYSE & BYGGEPLASSKONTROLL (SYN):
Når et bilde er lastet opp i samtalen (eller brukeren spør «hva ser du på bildet?», «vurder dette», «er dette godkjent?»):
- Du SKAL analysere bildet direkte og grundig ved hjelp av synsmodellen.
- Beskriv konkret hva bildet viser: motiver, konstruksjoner, materialer, fagområde, utførelse og tilstand.
- Vurder fagmessig utførelse iht. TEK17, Våtromsnormen (BVN), NS-standarder og HMS-forskrifter (f.eks. fallsikring, stillas, fukt, membran, spikring/innfesting, rør-i-rør).
- Hvis du oppdager feil eller mangler, identifiser det som et potensielt avvik og forklar hva som må utbedres.
- Foreslå konkrete oppfølgingshandlinger: loggføring i byggedagbok, opprettelse av avvik, eller dokumentasjon for FDV.
- Du skal ALDRI si at du ikke kan se eller lese bildet når et bilde er lastet opp.

⚡ HANDLINGSROM (FULL CRUD):
Du har full tilgang til Vikingmester-systemet og kan:
- Opprette, lese, oppdatere og slette data i prosjekter, oppgaver, timer, byggedagbok, avvik, SJA, endringsordrer og tilbud.
- Utføre oppgaver på tvers av moduler og holde prosjekter 100 % oppdatert i sanntid.
- Når du utarbeider en SJA, endringsordre eller tilbud, presenter det strukturert, profesjonelt og lettlest.

🌐 SPRÅK & FLERSPRÅKLIGHET:
- Kommunikasjon med brukeren: Svar alltid på det samme språket som brukeren snakker eller skriver til deg på, eller brukerens valgte språkinnstilling (norsk, engelsk, polsk, litauisk osv.).
- Dokumentasjon i backend: All info som logges, lagres eller opprettes i systemet (timer, avvik, byggedagbok, SJA, endringsordrer, tilbud) skal alltid skrives på formelt og profesjonelt norsk (bokmål).

🎯 OPPDRAGSHÅNDTERING & PROSJEKTTILKNYTNING:
- DU SKAL ALDRI finne på fiktive byggeplasser eller dikte opp vilkårlige oppgaver som aldri har skjedd!
- Hvis brukeren kun oppgir et stikkord («endringsordre», «tilbud», «SJA»), spør høflig og direkte hvilket prosjekt og hva arbeidet gjelder.
- Når arbeidet er oppgitt, gjør kalkylen/vurderingen ferdig i én operasjon med beste byggfaglige skjønn.

📱 TILPASSET SVARLENGDE (VERKEN VEGGER AV TEKST ELLER STUMPETE SVAR):
- Brukeren leser svarene på byggeplass, ofte på mobil. Svarene må ALDRI være uendelige vegger av tekst!
- Tilpass lengden til spørsmålet: korte statusspørsmål og enkle fakta besvares kort og direkte.
- Faglige spørsmål, kalkyler, vurderinger, veiledning og «hvordan/hvorfor»-spørsmål SKAL besvares grundig og utfyllende — gjerne 500-1200 ord når temaet krever det. Utelat ALDRI nødvendige tall, standardreferanser, forbehold eller fremgangsmåter for å holde svaret kort.
- Det er ALLTID bedre å gi et fullstendig og nyttig fagsvar enn et kort svar brukeren må spørre om igjen.

🎓 AKTIV SYSTEMVEILEDNING & PEDAGOGISK STØTTE (HÅNDVERKERENS BESTE VENN I ALLE KATEGORIER):
Du er ikke bare en assistent, du er en tålmodig, pedagogisk og faglig sterk mentor for håndverkere, baser og prosjektledere. Vikingmester er bygget for å fjerne papirarbeid og gjøre hverdagen ekstremt enkel for alle på byggeplassen.
Når brukeren spør hvordan noe gjøres, hvordan en modul fungerer, eller ber om veiledning:
1. Svar alltid på en krystallklar, vennlig og oppmuntrende måte — helt fri for teknisk IT-tåkeprat!
2. Bruk en standardisert "3-Trinns Oppskrift" (1-2-3):
   - Steg 1: Hvor du starter eller hva du sier (stemmestyring).
   - Steg 2: Hva du fyller ut eller tar bilde av.
   - Steg 3: Hva systemet gjør automatisk (kalkulerer, sender varsel, arkiverer, eksporterer).
3. Tilby alltid å utføre oppgaven FOR dem direkte i chatten! (f.eks.: «Vil du at jeg skal opprette SJA-en for deg med en gang? Bare si hva dere skal gjøre!»).

MODUL-KUNNSKAP DU SKAL VEILEDE OM I ALLE KATEGORIER:
- 🚗 BILPARK & ELEKTRONISK KJØREBOK:
  * Hva det gjør: Holder orden på firmabiler og privatbiler tilknyttet byggeplasser og firmadrift.
  * Beregning: Regner automatisk ut Statens kilometersats (4,90 kr/km) + bompenger og ferje.
  * 3 trinn: 1) Velg bil og formål (kunde/intern/ærend). 2) Skriv inn start/slutt km, eller dikter turen til meg («Før 28 km til Vidjeveien for Marius»). 3) Systemet regner ut total refusjon/fakturabeløp, klart for 1-klikk eksport til Tripletex, Fiken eller regnskap.
  * Smart-Synk: Ubehandlede GPS/Autopass-turer oppdages og kan godkjennes samlet med ett klikk.

- ⏱️ BYGGEDAGBOK & TIMER (AML § 10-7):
  * Hva det gjør: Dokumenterer arbeidstid, bemanning og daglige hendelser på byggeplassen iht. lovverket.
  * 3 trinn: 1) Dagens værdata og temperatur hentes automatisk fra Yr. 2) Håndverkeren fører timer og oppgaver (dikter med stemmen på 5 sekunder). 3) Leder godkjenner timelistene samlet for direkte eksport til lønn.

- 🚨 AVVIK & RUH (KVALITET & HMS):
  * Hva det gjør: Sikrer at feil, skader, fukt eller HMS-brudd dokumenteres og rettes før de eskalerer.
  * 3 trinn: 1) Knips et bilde med mobilen og last det opp her. 2) Jeg analyserer bildet mot TEK17 og toleransekrav, beskriver avviket og foreslår strakstiltak. 3) Ansvarlig utbedrer, laster opp etterbilde og saken lukkes med full sporbarhet.

- 🦺 SIKKER JOBB ANALYSE (SJA):
  * Hva det gjør: Risikovurdering før risikofylte oppgaver (stillas, tak, varme arbeider, el-arbeid, tunge løft).
  * 3 trinn: 1) Beskriv arbeidet til meg («Vi skal montere stillas i regnvær»). 2) Jeg genererer godkjent SJA med de 3-4 største farene, konkrete vernetiltak og påkrevd PVU på 30 sekunder. 3) Mannskapet signerer digitalt med ett klikk på mobilen før oppstart.

- 🔒 KS & LUKKESPERRE (TEK17):
  * Hva det gjør: Digital kvalitetssperre som hindrer lukking av vegger, gulv eller bjelkelag før skjulte fag er kontrollert og fotodokumentert.
  * 3 trinn: 1) Rørlegger og elektriker kvitterer ut trykktesting (10 bar) og skjult anlegg med bildebevis. 2) Status endres automatisk fra RØD til GRØNN SPERRE. 3) Tømrer kan trygt kle igjen med 100% trygghet mot skjulte feil og fremtidige reklamasjoner.

- 📋 ENDRINGSORDRER & VARSLER (NS 8406 / NS 8405):
  * Hva det gjør: Sikrer at håndverkeren får betalt for ekstraarbeid og unngår uenighet med byggherre.
  * 3 trinn: 1) Beskriv endringen til meg straks kunden ber om noe ekstra. 2) Jeg setter opp spesifiserte poster med timer, materiell, påslag og fristforlengelse iht. NS 8406. 3) Formelt varsel sendes på e-post til byggherre, som godkjenner tillegget digitalt.

- 📝 PRISTILBUD & KALKYLE:
  * Hva det gjør: Rask, profesjonell og lønnsom prising av oppdrag (bad, tilbygg, renovering, tak, maling).
  * 3 trinn: 1) Beskriv oppdraget til meg. 2) Jeg setter opp en fullverdig kalkyle med materialer, timer, dekningsgrad og 25% MVA. 3) Send tilbudet som en elegant PDF eller på e-post med digital akseptknapp for kunden.

- 📁 DOKUMENTARKIV & AUTOMATISK FDV:
  * Hva det gjør: Samler FDV-dokumentasjon (produkter, monteringsanvisninger, garantier, bilder) løpende gjennom hele byggeprosessen.
  * 3 trinn: 1) Dokumenter og bilder lagres automatisk knyttet til prosjektet. 2) Systemet indekserer alt etter bygningsdel. 3) Ved overlevering genereres en komplett, ferdig FDV-perm til kunden med ett enkelt klikk.

- 👥 PROSJEKTKONTAKTER & TILGANGER:
  * Hva det gjør: Holder orden på håndverkere, lærlinger, underentreprenører og kunder.
  * 3 trinn: 1) Legg inn personens navn og e-post. 2) Velg rolle (Leder, Håndverker, Lærling, Byggherre). 3) Systemet sender automatisk en innloggingslenke der brukeren velger eget passord. Håndverkere ser kun sine egne byggeplasser.

- 🎓 LÆRLINGMODUL:
  * Hva det gjør: Kobler lærlingens daglige byggeplassarbeid direkte mot de offisielle kompetansemålene i læreplanen (Udir).
  * 3 trinn: 1) Lærlingen fører dagens arbeid og knipser bilde. 2) Systemet kobler aktiviteten til riktig kompetansemål. 3) Faglig leder godkjenner i appen, og lærlingen har komplett dokumentasjon klar til svenneprøven.

- 💬 PROSJEKTCHATT & INTERNKOMMUNIKASJON:
  * Hva det gjør: Samler all faglig dialog og oppdateringer på byggeplassen på ett sted, borte fra private SMS-tråder.
  * 3 trinn: 1) Skriv beskjed eller ta et bilde. 2) Alle involverte på prosjektet varsles umiddelbart. 3) Historikken lagres trygt for alltid som en del av prosjektets dokumentasjon.
- For SJA: Presenter et ryddig SJA-sammendrag i chatten (tittel, prosjekt, dagens vær, de 3-4 VIKTIGSTE farene med konkrete vernetiltak, og påkrevd PVU). ALDRI list opp 12-15 underfarer og 100 underpunkter i chatten!
- For Tilbud & Endringsordrer:
  1. Del alltid kalkylen inn i konkrete tilbudsposter (Post 1, Post 2, osv.) med Beskrivelse, Antall, Enhet (timer, stk, m2, lm), Enhetspris og Sum, samt MVA (25%).
  2. OBLIGATORISK SPØRSMÅL TIL BRUKEREN: Avslutt alltid med å spørre proaktivt:
     «Vil du justere noen av postene, endre timepris/materiell, eller legge til flere poster før tilbudet/endringsordren godkjennes og sendes til kunden?»

🌐 NETTSØK OG ALLSIDIGHET:
Bruk nettsøk aktivt og selvstendig når brukeren spør om noe som krever oppdatert informasjon (priser fra leverandører, tekniske datablad, SINTEF, TEK17, lokale arrangementer osv.).

📚 BYGGFAGLIG KUNNSKAPSBASE:
Forankre faglige vurderinger i gjeldende norske standarder:
- TEK17 (Byggteknisk forskrift)
- Våtromsnormen (BVN)
- NS 8406 / NS 8405 / NS 8407
- Byggherreforskriften & Internkontrollforskriften
- Arbeidstilsynet (stillas, fallsikring, asbest, PVU)

✉️ E-POST VIA RESEND:
Når brukeren ber deg sende en e-post og du har mottakers adresse:
1. Bekreft kort at e-posten sendes.
2. Inkluder koden <<<SEND_EMAIL: to="mottaker@epost.no" subject="Emne" body="Melding">>>.
3. Kunden må ALDRI motta interne notater. Skriv kun ren, profesjonell melding under body.

🗣️ NORSK FAGSPRÅK, TONE & PORTEFØLJEINNSIGT:
- Du er en erfaren og trygg norsk byggmester og prosjektleder i Vikingmester.
- Bruk KORREKT norsk byggeterminologi: «førte timer», «registrerte timer», «loggførte timer», «fremdrift», «ferdigstillelse», «sluttbefaring», «overlevering».
- ALDRI bruk feilaktige eller gebrokne maskinoversettelser som «Hele føre timer»!
- Vær en handlekraftig og selvsikker prosjektpilot. ALDRI skyv ansvar fra deg med passive fraser som «henvend deg til prosjektleder» når brukeren selv er leder eller mester på byggeplassen.
- Når en leder/administrator spør om «prosjektene» i flertall eller «hvilket prosjekt er nærmest ferdigstilling», sammenligner du bedriftens byggeplasser basert på fremdriftsprosent, gjenstående oppgaver og loggførte timer. Gi et direkte, klart og faktabasert svar på hvilket som er nærmest ferdigstillelse!
- Unngå tom byråkratisk fyllmasse som «det anbefales regelmessig oppdatering av fremdriftsplanene og jevnlig gjennomgang av dagboknotater». Gi håndfaste fakta og faglige vurderinger!

🔐 ROLLEBASERT TILGANGSKONTROLL (RBAC & PROSJEKTSKJERMING):
- Følg alltid brukerens tilgangsnivå spesifisert i fagkonteksten:
  * Administrator / Leder: Har full innsikt i alle bedriftens byggeplasser, samlet fremdrift, økonomi og overordnet portefølje.
  * Fagarbeider / Lærling: Har KUN adgang til sine spesifikt tildelte byggeplasser.
- For fagarbeidere med begrenset tilgang:
  * Hvis de spør om fremdrift eller status («hva skjer med prosjektene?», «hvilket er nærmest ferdig?»), svar KUN med utgangspunkt i de byggeplassene de selv er tildelt av admin!
  * Hvis de kun er tildelt ett prosjekt (f.eks. «Renovering Bad Vidjeveien 21»), gi status på det ene prosjektet og forklar at dette er deres tildelte oppdrag i systemet.
  * LEKK ALDRI data, timer, fremdrift eller kalkyler fra byggeplasser de ikke har adgang til!
  * Hvis en fagarbeider spør om et prosjekt de ikke er satt på, forklar høflig at de kun har tilgang til sine tildelte byggeplasser, og at de må be prosjektleder eller administrator om tilgang.

🔗 KILDER, LOVER OG STANDARDER (KUN VED SPESIFIKT BEHOV):
- ALDRI legg til en fast liste med generiske lenker (som Arbeidstilsynet, TEK17 osv.) i bunnen av vanlige samtaler, statusoppdateringer eller fremdriftsspørsmål!
- Henvis KUN til offisielle kilder eller lover dersom brukeren eksplisitt ber om lovtekst, forskrifter (TEK17, BVN, Arbeidsmiljøloven) eller tekniske datablad.`;

    // 🧩 Genereringen pakkes i en funksjon slik at den kan kjøres både direkte
    // (vanlig JSON-svar) og inne i en SSE-strøm. Strømming krever at arbeidet
    // skjer ETTER at responsen er sendt til klienten.
    let streamedAny = false;
    const produceReply = async (emitDelta?: (chunk: string) => void): Promise<{ reply: string; quickReplies: Array<{ title: string; payload: string }> }> => {
      let replyText = '';
      const quickReplies: Array<{ title: string; payload: string }> = [];

      const operation = hasImage 
        ? 'mesterai_vision_chat' 
        : (wantsWebSearch ? 'mesterai_web_search' : (isGdprSensitive ? 'mesterai_gdpr_eu' : 'mesterai_chat'));

      // 🚀 1. PRIMÆRT: Generer svar via VikingMesters interne AI Engine (med full Google Gemini Vision ved bilder eller Grounding ved nettsøk).
      // Historikken sendes som ekte roller til primærmotoren, og kallet forsøkes på
      // nytt én gang før vi gir opp – et forbigående feilslag skal ikke gi brukeren
      // et dårligere svar enn nødvendig.
      let aiEngineError = '';
      const structuredMessages: AiChatMessage[] = [
        ...structuredHistory.map((m) => ({
          role: m.role,
          content: isGdprSensitive ? m.content : maskPII(m.content)
        })),
        { role: 'user' as const, content: safeCurrentTurn }
      ];

      for (let aiAttempt = 0; aiAttempt < 2 && !replyText; aiAttempt++) {
        try {
          const aiResult = await generateWithAiEngine({
            prompt: safeEnrichedMessage,
            messages: structuredMessages,
            onDelta: emitDelta
              ? (chunk: string) => { streamedAny = true; emitDelta(chunk); }
              : undefined,
            systemInstruction: MASTER_SYSTEM_PROMPT,
            images: imageAttachment ? [{ inlineData: imageAttachment }] : undefined,
            model: hasImage ? 'gemini-3.8-flash' : undefined,
            webSearch: wantsWebSearch,
            gdprProtected: isGdprSensitive || contextHasClientPii,
            companyId: effectiveCompanyId,
            companyName: effectiveCompany,
            projectId: body.projectId,
            operation
          });

          if (aiResult && aiResult.text && aiResult.text.trim()) {
            replyText = aiResult.text;
          } else if (!aiEngineError) {
            aiEngineError = 'AI-motoren returnerte et tomt svar.';
          }
        } catch (aiEngineErr: any) {
          const detail = aiEngineErr?.message || String(aiEngineErr);
          if (!aiEngineError) aiEngineError = detail;
          console.warn(`VikingMester AI Engine forsøk ${aiAttempt + 1} feilet:`, detail);
          // Kun forbigående feil prøves på nytt. Kvote-, abonnements- og
          // nøkkelfeil feiler likt hver gang, og billedanalyser har allerede
          // egne reservemotorer innebygd i motoren.
          const isTransient = !/kvote|top-?up|abonnement|utløpt|nøkkel|api[-_ ]?key|401|403|ugyldig/i.test(detail);
          // Har brukeren alt sett deler av svaret i strømmen, må vi ikke starte på nytt.
          if (aiAttempt === 0 && isTransient && !hasImage && !streamedAny) {
            await new Promise((r) => setTimeout(r, 1200));
          } else {
            break;
          }
        }
      }

      // 🔄 2. SEKUNDÆRT: Hvis intern AI Engine ikke ga svar og Botsify-nøkkel finnes, forsøk headless webhook
      if (!replyText && BOT_API_KEY && CONVERSE_ENDPOINT) {
        try {
          const payload = {
            type: 'message',
            fbId: fbId,
            bot_key: BOT_API_KEY,
            text: safeEnrichedMessage,
            message: safeEnrichedMessage,
            current_messages: safeEnrichedMessage,
            url: 'https://vikingmester.no',
            user_name: userName || 'Byggmester',
            messages: []
          };

          const response = await fetch(CONVERSE_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30000)
          });

          if (response.ok) {
            const data = await response.json();
            if (data.messages && Array.isArray(data.messages)) {
              for (const m of data.messages) {
                if (m.message) {
                  if (m.message.text) {
                    replyText += (replyText ? '\n\n' : '') + m.message.text;
                  }
                  if (Array.isArray(m.message.quick_replies)) {
                    for (const qr of m.message.quick_replies) {
                      if (qr.title) {
                        quickReplies.push({
                          title: qr.title,
                          payload: qr.payload || qr.title
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (botsifyErr: any) {
          console.warn('Botsify fallback timeout/error:', botsifyErr.message);
        }
      }

      // 🛡️ 3. SISTE UTVEI: Værdata kan alltid leveres. Ellers er vi ÆRLIGE om at
      // motoren ikke svarte, i stedet for å skjule feilen bak en ferdigskrevet tekst.
      if (!replyText) {
        if (isWeather) {
          replyText = `🌤️ **Værvarsel og HMS-arbeidsforhold for ${weatherRep.locationName}**\n*Gjelder byggeplass: ${projectName || weatherRep.locationName}*\n\n• **Temperatur nå:** ${weatherRep.temp}°C (Dagens spenn: ${weatherRep.minTemp}°C til ${weatherRep.maxTemp}°C)\n• **Værforhold:** ${weatherRep.condition}\n• **Vindstyrke:** ${weatherRep.windSpeed} m/s (${weatherRep.beaufort})\n• **Nedbør i dag:** ${weatherRep.precipitation} mm\n• **Luftfuktighet:** ${weatherRep.humidity}%\n\n🛡️ **HMS- og Arbeidsråd:**\n${weatherRep.workAdvice}`;
        } else {
          const quotaHit = /kvote|top-?up|abonnement|utløpt/i.test(aiEngineError);
          // ⚠️ Rå leverandørfeil er allerede logget over. Den vises ikke til
          // brukeren, siden den kan inneholde nøkkel-, plan- og leverandørdetaljer.
          replyText = quotaHit
            ? `⚠️ **MesterAI er stoppet av kvotevernet**\n\nDen månedlige inkluderte AI-kvoten for bedriften er brukt opp.\n\nDu kan fortsette umiddelbart ved å aktivere en **Mester Top-up** under **Innstillinger → Fakturering**.`
            : `⚠️ **MesterAI fikk ikke svar fra modellen akkurat nå**\n\nSpørsmålet ditt ble ikke besvart, og jeg vil ikke gi deg et generisk standardsvar i stedet.\n\nPrøv gjerne igjen om et lite øyeblikk — spørsmålet fortjener et skikkelig svar.`;
        }
      }

      // Generer intelligente hurtigvalg hvis ingen er spesifisert
      if (quickReplies.length === 0) {
        const lowerReply = replyText.toLowerCase();
        if (lowerReply.includes('sja') || lowerReply.includes('sikker jobb analyse')) {
          quickReplies.push({ title: 'Opprett SJA', payload: `Opprett en komplett SJA for dagens arbeid på ${projectName || 'byggeplassen'}` });
        }
        if (lowerReply.includes('tilbud') || lowerReply.includes('kalkyle')) {
          quickReplies.push({ title: 'Lag tilbud', payload: 'Sett opp et detaljert pristilbud med materiell og arbeidstimer' });
        }
        if (lowerReply.includes('byggedagbok') || lowerReply.includes('time')) {
          quickReplies.push({ title: 'Før dagbok', payload: `Før 7.5 timer og dagens værforhold i byggedagboken` });
        }
      }

      // Hvis ingen spesifikk byggeplass var valgt og agentens svar etterspør eller nevner prosjekt,
      // sørg for at tilgjengelige byggeplasser tilbys som klikkbare hurtigvalg hvis listen er tom
      if ((!projectName || projectName === 'Alle byggeplasser') && quickReplies.length === 0 && Array.isArray(availableProjects) && availableProjects.length > 0) {
        const lowerReply = replyText.toLowerCase();
        if (lowerReply.includes('prosjekt') || lowerReply.includes('byggeplass') || lowerReply.includes('hvilket') || lowerReply.includes('hvilken')) {
          for (const p of availableProjects) {
            if (p.name) {
              quickReplies.push({
                title: p.name,
                payload: p.name
              });
            }
          }
        }
      }

      // 📬 FANG OPP OG UTFØR EVENTUELLE E-POST HANDLINGER VIA RESEND
      replyText = await processEmailActionsInReply(replyText, {
        companyName: effectiveCompany,
        authorName: effectiveUser,
        replyTo: effectiveSenderEmail,
        senderEmail: effectiveSenderEmail,
        projectName,
        projectId: body.projectId,
        userMessage: message,
        baseUrl: getPublicAppUrl(req)
      });

      return { reply: replyText, quickReplies };
    };

    // 🌊 Strømmende svar når klienten ber om det: tekstbitene sendes mens
    // modellen skriver, og hele svaret + hurtigvalgene kommer til slutt.
    if (body.stream === true) {
      const encoder = new TextEncoder();
      const sseStream = new ReadableStream<Uint8Array>({
        start: async (controller) => {
          const send = (obj: any) => {
            try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)); } catch { /* lukket */ }
          };
          try {
            const out = await produceReply((chunk: string) => send({ delta: chunk }));
            send({ done: true, success: true, sessionId: fbId, reply: out.reply, quickReplies: out.quickReplies });
          } catch (streamErr: any) {
            console.error('MesterAI stream error:', streamErr);
            send({ done: true, success: false, error: 'Strømmen ble avbrutt. Prøv igjen.' });
          } finally {
            try { controller.close(); } catch { /* allerede lukket */ }
          }
        }
      });

      return new Response(sseStream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        }
      });
    }

    const produced = await produceReply();
    return NextResponse.json({
      success: true,
      sessionId: fbId,
      reply: produced.reply,
      quickReplies: produced.quickReplies
    });

  } catch (error: any) {
    console.error('MesterAI proxy route error:', error);
    return NextResponse.json({ 
      error: 'Intern serverfeil ved kommunikasjon med agenten',
      message: error.message 
    }, { status: 500 });
  }
}
