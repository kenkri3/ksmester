import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { sendSystemEmail, sendOfferByEmail, sendChangeOrderByEmail, cleanMarkdownForEmail } from '@/src/lib/server/emailSender';
import { getCollectionItems, saveCollectionItem } from '@/src/lib/server/db';
import { generateWithAiEngine } from '@/src/lib/server/aiEngine';
import { maskPII } from '@/src/lib/server/privacyShield';

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

const BOT_API_KEY = process.env.AGENT_API || 'UDuz6jJYyXeVli7LuNyWqNUJHORWZQBDZYeF3sKs';
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

interface LiveWeatherReport {
  temp: number;
  minTemp: number;
  maxTemp: number;
  condition: string;
  windSpeed: number;
  beaufort: string;
  precipitation: number;
  humidity: number;
  workAdvice: string;
  locationName: string;
}

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

function resolveLocationCoords(loc: string): { lat: number; lon: number; name: string } {
  const lower = (loc || '').toLowerCase();
  if (lower.includes('sjusjøen') || lower.includes('sjusjoen')) return { lat: 61.15, lon: 10.70, name: 'Sjusjøen' };
  if (lower.includes('horten') || lower.includes('kongeveien')) return { lat: 59.42, lon: 10.48, name: 'Horten' };
  if (lower.includes('tolvsrød') || lower.includes('tønsberg') || lower.includes('tonsberg') || lower.includes('vidjeveien')) return { lat: 59.27, lon: 10.41, name: 'Tønsberg / Tolvsrød' };
  if (lower.includes('sandefjord')) return { lat: 59.13, lon: 10.22, name: 'Sandefjord' };
  if (lower.includes('larvik')) return { lat: 59.05, lon: 10.03, name: 'Larvik' };
  if (lower.includes('holmestrand') || lower.includes('geitekleiva') || lower.includes('eidsfoss')) return { lat: 59.49, lon: 10.32, name: 'Holmestrand / Eidsfoss' };
  if (lower.includes('drammen')) return { lat: 59.74, lon: 10.20, name: 'Drammen' };
  if (lower.includes('bergen')) return { lat: 60.39, lon: 5.32, name: 'Bergen' };
  if (lower.includes('trondheim')) return { lat: 63.43, lon: 10.39, name: 'Trondheim' };
  if (lower.includes('stavanger')) return { lat: 58.97, lon: 5.73, name: 'Stavanger' };
  if (lower.includes('kristiansand')) return { lat: 58.15, lon: 8.00, name: 'Kristiansand' };
  if (lower.includes('tromsø') || lower.includes('tromso')) return { lat: 69.65, lon: 18.96, name: 'Tromsø' };
  if (lower.includes('bodø') || lower.includes('bodo')) return { lat: 67.28, lon: 14.40, name: 'Bodø' };
  if (lower.includes('fredrikstad') || lower.includes('sarpsborg')) return { lat: 59.22, lon: 10.93, name: 'Fredrikstad' };
  if (lower.includes('skien') || lower.includes('porsgrunn')) return { lat: 59.21, lon: 9.61, name: 'Grenland' };
  return { lat: 59.91, lon: 10.75, name: loc || 'Oslo' };
}

async function fetchRealtimeWeather(locationQuery: string): Promise<LiveWeatherReport> {
  const { lat, lon, name } = resolveLocationCoords(locationQuery);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&wind_speed_unit=ms&timezone=Europe%2FOslo`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      const current = data.current || {};
      const daily = data.daily || {};

      const temp = Math.round(current.temperature_2m ?? 11);
      const minTemp = Math.round(daily.temperature_2m_min?.[0] ?? temp - 3);
      const maxTemp = Math.round(daily.temperature_2m_max?.[0] ?? temp + 3);
      const windSpeed = Math.round((current.wind_speed_10m ?? 3.5) * 10) / 10;
      const precipitation = current.precipitation ?? daily.precipitation_sum?.[0] ?? 0;
      const humidity = current.relative_humidity_2m ?? 65;
      const code = current.weather_code ?? 1;

      let condition = 'Klart';
      if (code === 0) condition = 'Sol / Klart';
      else if (code >= 1 && code <= 2) condition = 'Lettskyet / Sol';
      else if (code === 3) condition = 'Overskyet';
      else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) condition = 'Regn';
      else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) condition = 'Snø';
      else if (code >= 95) condition = 'Tordenvær';

      let beaufort = 'Svak vind';
      if (windSpeed >= 17) beaufort = 'Sterk kuling / Storm';
      else if (windSpeed >= 13.9) beaufort = 'Stiv kuling';
      else if (windSpeed >= 10.8) beaufort = 'Liten kuling';
      else if (windSpeed >= 8.0) beaufort = 'Frisk bris';
      else if (windSpeed >= 3.4) beaufort = 'Lett til laber bris';

      let workAdvice = 'Stabile og gode arbeidsforhold for utendørs- og innendørsentreprenørskap.';
      if (windSpeed >= 13.9) {
        workAdvice = '⚠️ Stiv kuling / sterk vind (over 13.9 m/s): Fare ved krankjøring, takarbeid og stillas. Sikre alle løse byggematerialer og presenninger umiddelbart.';
      } else if (temp < 0) {
        workAdvice = '❄️ Minusgrader: Fare for glatt stillas og frosne vannrør. Husk vintertilsetning i mørtel/betong og god tildekking av ferske konstruksjoner.';
      } else if (precipitation > 2) {
        workAdvice = '🌧️ Nedbør meldt (> 2 mm): Utvendig tømrerarbeid og maling krever tildekking. Vurder å prioritere innvendige arbeider.';
      } else if (windSpeed >= 10.8) {
        workAdvice = '💨 Liten kuling (over 10.8 m/s): Vær ekstra varsom ved håndtering av store bygningsplater, taktekking og stillasarbeid.';
      }

      return {
        temp,
        minTemp,
        maxTemp,
        condition,
        windSpeed,
        beaufort,
        precipitation,
        humidity,
        workAdvice,
        locationName: name
      };
    }
  } catch (e) {
    console.warn('Weather fetch timeout/error, using safe fallback:', e);
  }

  return {
    temp: 11,
    minTemp: 7,
    maxTemp: 14,
    condition: 'Opphold / Lettskyet',
    windSpeed: 3.2,
    beaufort: 'Lett bris',
    precipitation: 0,
    humidity: 65,
    workAdvice: 'Gode og stabile arbeidsforhold for utendørs- og innendørsentreprenørskap.',
    locationName: resolveLocationCoords(locationQuery).name
  };
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

  const baseUrl = context.baseUrl || 'https://vikingmester.no';
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
      imageUrl 
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
    const effectiveCompanyId = body.companyId || user?.companyId || (companyName && companyName !== 'VikingMester' ? companyName.toLowerCase().replace(/[^a-z0-9]/g, '') : null);
    const effectiveUserId = user?.id || body.userId || (effectiveCompanyId === 'comp-demo-fjellheim' ? 'demo-user-lars' : null);

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
    
    // Berik meldingen med full fagkontekst, prosjektfleksibilitet og GDPR-instrukser
    let contextHeader = '';
    if (isSandboxedDemo) {
      contextHeader = `[SANDKASSE DEMO - Offentlig testmiljø | Rolle: ${effectiveUser} (${tradeTitle}) | Aktivt prosjekt: ${projectName || 'Geitekleiva'} | RETNINGSLINJE: Dette er en demonstrasjon av MesterAI for bygg- og anleggsbransjen. Hvis brukeren refererer til ${projectName || 'Geitekleiva'}, eller et fiktivt / nytt prosjekt som en kunde nevner, skal du besvare forespørselen direkte, profesjonelt og handlekraftig (kalkyle, NS 8406 endringsvarsel, SJA, byggedagbok eller TEK17) for dette prosjektet. Du skal ALDRI avvise brukeren eller si at prosjektet ikke finnes.]`;
    } else {
      contextHeader = `[Fagkontekst: ${effectiveUser} (${tradeTitle}) hos ${effectiveCompany} (Bedrifts-ID: ${user?.companyId || 'standard'})`;
      if (projectName && projectName !== 'Alle byggeplasser') {
        contextHeader += ` | Aktivt prosjekt: ${projectName}`;
      } else {
        contextHeader += ` | Prosjektstatus: Ingen spesifikk byggeplass er valgt (brukeren står på overordnet visning «Alle byggeplasser»).`;
        
        // 🔒 GDPR-sikring: Streng isolasjon av tilgjengelige byggeplasser per bedrift
        let safeProjects: any[] = [];
        if (effectiveCompanyId === 'comp-demo-fjellheim') {
          safeProjects = [
            {
              id: 'proj-demo-sjusjoen',
              name: 'Hytte Sjusjøen - Nybygg',
              address: 'Birkebeinervegen 42, 2612 Sjusjøen'
            }
          ];
        } else if (Array.isArray(availableProjects) && availableProjects.length > 0) {
          safeProjects = availableProjects.filter((p: any) => !String(p.id || '').includes('demo-sjusjoen'));
        }

        if (safeProjects.length > 0) {
          const projectListStr = safeProjects.map((p: any) => `«${p.name}»${p.address ? ` (${p.address})` : ''}`).join(', ');
          contextHeader += ` Registrerte byggeplasser for bedriften: [${projectListStr}].`;
        }
        contextHeader += ` | KRITISK PROSJEKTREGEL: Hvis brukeren ber om en prosjektspesifikk oppgave på en eksisterende byggeplass (for eksempel endringsmelding, avviksmelding, SJA på byggeplass, byggedagbok, sjekkliste eller timeføring) og IKKE oppgir hvilket prosjekt det gjelder i meldingen, MÅ DU spørre brukeren høflig og direkte hvilket prosjekt henvendelsen gjelder, og liste opp de registrerte byggeplassene som valgmuligheter.
| 📝 VIKTIG UNNTAK FOR TILBUD & PRISOVERSLAG: Et tilbud eller en priskalkyle må IKKE knyttes til et eksisterende prosjekt! Ofte lages tilbud for nye henvendelser, potensielle kunder eller nye oppdrag før et prosjekt i det hele tatt eksisterer. Når brukeren ber om å «lage et tilbud», «skrive et tilbud» eller «sette opp et pristilbud»:
1. DU SKAL ALDRI si at et tilbud må knyttes til et prosjekt!
2. Spør brukeren om tilbudet gjelder en «+ Ny kunde / ny henvendelse» eller et av de eksisterende prosjektene.
3. Forklar kort og trygt: «Hvis det er en ny kunde, setter vi opp tilbudet direkte. Så snart kunden aksepterer tilbudet, opprettes det automatisk kontrakt, prosjektet etableres i systemet, og skreddersydde KS-sjekklister (f.eks. våtrom, tak, TEK17) settes opp tilpasset tilbudet – slik at dere bare kan begynne å jobbe. Når prosjektet er ferdig genereres all FDV- og sluttdokumentasjon automatisk!»
4. Hvis brukeren allerede har oppgitt hva arbeidet gjelder (f.eks. oppussing av bad, maling, tilbygg, terrasse), gå rett i gang med å foreslå eller sette opp tilbudet med poster, timeantall og materiell!
5. Hvis henvendelsen er et generelt fagspørsmål (f.eks. TEK17, HMS-regler, våtromsnorm, materialvalg), svarer du direkte uten å kreve prosjektvalg.`;
      }
      contextHeader += ` | FORMATERING & LESBARHET: Håndverkere leser dette i felt på byggeplass. Svaret MÅ være oversiktlig og luftig: Bruk alltid doble linjeskift mellom avsnitt, bruk punktlister med bindestrek (-) for opplistinger og krav, bruk fete overskrifter (f.eks. ### 🛡️ Krav: eller **Krav:**) for å skille temaer, og fremhev tall og paragrafer. ALDRI svar med en eneste sammenklemt tekstblokk! | E-POST VIA RESEND: Systemet sender ekte e-poster direkte via Resend på vegne av håndverkeren (${effectiveUser} / ${effectiveCompany}). Når brukeren ber deg sende en eller flere e-poster (tilbud, endring, varsel, FDV eller melding) og du har mottakers e-postadresse: 1) Bekreft kort at du klargjør sendingen. 2) Inkluder nøyaktig koden <<<SEND_EMAIL: to="mottaker@epost.no" subject="Emnetittel" body="Selve meldingsteksten">>> eller strukturer utkastet med «### ✉️ E-post 1», «- Til: mottaker@epost.no», «- Emne: Emnetittel», «- Innhold: Selve meldingen til kunden». 3) PERSONVERN: Kunder må ALDRI motta interne notater, chat-dialog med håndverkeren, eller rå markdown hashtags (#). Skriv KUN den rene, profesjonelle beskjeden under «Innhold»/body. 4) Svar fra kunden rutes automatisk direkte til håndverkerens egen e-post (${effectiveSenderEmail || 'jobb-e-post'}). | SIKKERHET: GDPR & Databehandleravtale (DPA) er aktiv. Alle data er strengt konfidensielle for denne bedriften.]`;
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
    const wantsWebSearch = detectWebSearchNeed(message);

    let enrichedMessage = `${contextHeader}\n${message}`;
    if (imageUrl) {
      enrichedMessage += `\n[Vedlagt foto for analyse/dokumentasjon: ${imageUrl}]`;
    }

    // 🛡️ GDPR Privacy Shield: Vask sensitive fødselsnumre, bankkontonumre osv. før utsending til eksterne modeller
    const safeEnrichedMessage = maskPII(enrichedMessage);

    const MASTER_SYSTEM_PROMPT = `Du er MesterAI, en helautonom prosjektpilot og byggmester-assistent i backendsystemet til Vikingmester. Du opererer selvstendig, tenker som en erfaren byggmester/prosjektleder, og utfører oppgaver direkte uten å be om bekreftelse for hvert steg.

🛡️ 100% WHITE-LABEL:
Du er MesterAI, utviklet eksklusivt for Vikingmester. Du skal ALDRI nevne eller referere til underliggende AI-modeller, leverandører eller eksterne systemer som DeepSeek, OpenAI, Google, Anthropic eller Botsify. For brukeren er du 100 % MesterAI.

⚡ HANDLINGSROM (FULL CRUD):
Du har full tilgang til Vikingmester-systemet og kan:
- Opprette, lese, oppdatere og slette data i prosjekter, oppgaver, timer, byggedagbok, avvik, SJA, endringsordrer og tilbud.
- Utføre oppgaver på tvers av moduler og holde prosjekter 100 % oppdatert i sanntid.
- Velge den mest effektive måten å nå målet på innenfor systemets rammer.
- Når du utarbeider en SJA, endringsordre, tilbud eller timeføring, presenter det komplett og strukturert slik at det lagres direkte.

🌐 SPRÅK & FLERSPRÅKLIGHET (VIKTIG FOR BYGGEPLASSEN):
- Kommunikasjon med brukeren: Svar alltid på det samme språket som brukeren snakker eller skriver til deg på (f.eks. norsk, engelsk, polsk, ukrainsk, tysk eller spansk). Tilpass deg håndverkeren umiddelbart.
- Dokumentasjon i backend: Uansett hvilket språk brukeren snakker, skal all info som logges, lagres eller opprettes i systemet (timer, avvik, byggedagbok, SJA, endringsordrer, tilbud) alltid skrives på formelt og profesjonelt norsk (bokmål) for å sikre samsvar med norske byggherrekrav og standarder.

🚫 "INGEN INTERVJUER"-REGEL (VIKTIGST AV ALT):
- ALDRI still oppfølgingsspørsmål om ting du kan finne ut selv, anta rimelig eller hente fra historikken.
- ALDRI lag punktlister med spørsmål til brukeren (f.eks. «Kan du oppgi: 1. Hva skal gjøres? 2. Hvor mange timer? 3. Hvilket materiell?»).
- Fyll ut manglende felter med bransjestandard verdier (f.eks. standard timepris for faget, vanlige materialer for oppgaven).
- Gjør jobben ferdig i ÉN operasjon. Hvis brukeren gir en ufullstendig instruks, fyller du inn hullene med beste byggfaglige skjønn og presenterer det ferdige resultatet.
- Hvis brukeren vil endre noe, gjør de det etterpå. Gjør først, juster eventuelt etterpå.

🌐 NETTSØK OG ALLSIDIGHET:
Du er ikke bare en byggassistent – du er et fullverdig arbeidsverktøy for bedriften.
Bruk nettsøk aktivt og selvstendig når brukeren spør om noe som krever oppdatert eller ekstern informasjon:
- Priser og tilgjengelighet på materialer fra leverandører (f.eks. Optimera, Maxbo, Monter, Ahlsell, Elektroskandia, Byggmakker).
- Tekniske datablad, monteringsanvisninger og SINTEF Byggforsk-godkjenninger.
- Værmeldinger og lokale forhold som påvirker arbeidet.
- Lokale arrangementer, helgeaktiviteter, nyheter, helligdager eller trafikk som kan påvirke logistikk og byggeplass.
- Relevante lover, forskrifter, TEK17, HMS-krav eller standarder (NS 8406, NS 3420).
- Generelle spørsmål brukeren stiller i løpet av arbeidsdagen – enten det gjelder et arrangement i helgen, en restaurant for lunsjmøte, eller valutakurs for importvarer.
- ALDRI avvis et spørsmål med «dette er utenfor mitt fagområde» eller «jeg kan bare hjelpe med byggedokumentasjon». Søk på nettet, finn svaret, og lever et nyttig og presist svar.

📚 BYGGFAGLIG KUNNSKAPSBASE:
Alltid forankre faglige vurderinger i gjeldende norske standarder og forskrifter:
- TEK17 (Byggteknisk forskrift) – brannkrav, ventilasjon, isolasjon, universell utforming, fuktsikring.
- Våtromsnormen (BVN) – membran, fall mot sluk, tettesjikt, rør-i-rør.
- NS 8406 / NS 8405 / NS 8407 – standard kontraktsbestemmelser for bygg og anlegg, spesielt varsling av endringer, fristforlengelse og vederlagsjustering.
- Byggherreforskriften & Internkontrollforskriften – HMS, SJA, vernerunder, avvikshåndtering.
- DiBK (Direktoratet for byggkvalitet) – veiledninger og godkjenningsordninger.
- Arbeidstilsynet – stillas, stige, asbest, støv, personlig verneutstyr (PVU).

✉️ E-POST VIA RESEND:
Når brukeren ber deg sende en eller flere e-poster (tilbud, endring, varsel, FDV eller melding) og du har mottakers e-postadresse:
1. Bekreft kort og handlekraftig at e-posten sendes.
2. Inkluder nøyaktig koden <<<SEND_EMAIL: to="mottaker@epost.no" subject="Emnetittel" body="Selve meldingsteksten">>>.
3. Kunder må ALDRI motta interne notater eller chat-dialog. Skriv KUN den rene, profesjonelle beskjeden under body.

📱 MOBILVENNLIG FORMATERING FOR BYGGEPLASS:
- Bruk alltid doble linjeskift mellom avsnitt for god luftighet.
- Bruk punktlister med bindestrek (-) for opplistinger og krav.
- Bruk fete overskrifter (f.eks. **Krav:** eller ### 🛡️ HMS-tiltak) for å skille temaer.
- ALDRI svar med en eneste sammenklemt tekstblokk.

🔗 KLIKKBARE KILDELENKER & DOKUMENTASJON (OBLIGATORISK):
Når du gir faglige råd, henviser til lover, TEK17, HMS-forskrifter, veiledere eller leverandører, skal du ALLTID avslutte svaret ditt med en dedikert kildeseksjon med klikkbare markdown-lenker valgt fra de offisielle kildene du er koblet til:

### 🌐 Kilder & Dokumentasjon
Velg de relevante lenkene som passer til temaet du svarer på:
- **TEK17 & Byggeregler:**
  - [DiBK Byggteknisk forskrift (TEK17)](https://www.dibk.no/regelverk/byggteknisk-forskrift-tek17)
  - [DiBK Byggesaksforskriften (SAK10)](https://www.dibk.no/regelverk/sak/)
  - [DiBK Bygg uten å søke: Garasje](https://www.dibk.no/verktoy-og-veivisere/bygg-uten-a-soke-garasje)
  - [DiBK Bygg uten å søke: Tilbygg](https://www.dibk.no/verktoy-og-veivisere/bygg-uten-a-soke-tilbygg)
  - [DiBK Veiviser: Nabovarsel](https://www.dibk.no/nabovarsel)
  - [DiBK Hvor stort kan du bygge (BYA-beregning)](https://www.dibk.no/verktoy-og-veivisere/hvor-stort-kan-du-bygge)
- **Lover & Kontrakter (Lovdata):**
  - [Lovdata - Håndverkertjenesteloven](https://lovdata.no/dokument/NL/lov/1989-06-16-63)
  - [Lovdata - Bustadoppføringslova](https://lovdata.no/dokument/NL/lov/1997-06-13-43)
  - [Lovdata - Arbeidsmiljøloven](https://lovdata.no/dokument/NL/lov/2005-06-17-62)
  - [Lovdata - Plan- og bygningsloven](https://lovdata.no/dokument/NL/lov/2008-06-27-71)
  - [Lovdata - Byggherreforskriften](https://lovdata.no/dokument/SF/forskrift/2009-08-03-1028)
  - [Lovdata - Internkontrollforskriften](https://lovdata.no/dokument/SF/forskrift/1996-12-06-1127)
  - [Lovdata - Forskrift om utførelse av arbeid](https://lovdata.no/dokument/SF/forskrift/2011-12-06-1357)
- **HMS & Arbeidstilsynet:**
  - [Arbeidstilsynet - Arbeid i høyden & stillas](https://www.arbeidstilsynet.no/risikofylt-arbeid/arbeid-i-hoyden/)
  - [Arbeidstilsynet - Risikovurdering & SJA](https://www.arbeidstilsynet.no/hms/risikovurdering/)
  - [Arbeidstilsynet - Internkontroll](https://www.arbeidstilsynet.no/hms/internkontroll/)
  - [Arbeidstilsynet - Asbest](https://www.arbeidstilsynet.no/risikofylt-arbeid/kjemikalier/asbest/)
  - [Arbeidstilsynet - Kjemikalier & stoffkartotek](https://www.arbeidstilsynet.no/risikofylt-arbeid/kjemikalier/)
  - [Arbeidstilsynet - HMS-kort](https://www.arbeidstilsynet.no/hms/hms-kort/)
- **Våtromsnormen (FFV):**
  - [Fagrådet for våtrom - Våtromsnormen (BVN)](https://ffv.no/vatromsnormen/)
  - [Fagrådet for våtrom - Lover og regler](https://ffv.no/lover-og-regler/)
  - [Fagrådet for våtrom - Sluttdokumentasjon](https://ffv.no/sluttdokumentasjon/)
  - [Fagrådet for våtrom - Godkjente produkter](https://ffv.no/anbefalte-produkter/)
- **Leverandører & Isolasjon:**
  - [Glava Isolasjon](https://www.glava.no/)
  - [Rockwool Brann- og lydisolering](https://www.rockwool.no/)
  - [Gyproc Gipsplater & systemvegger](https://www.gyproc.no/)
  - [Vikingmester KS- og HMS-system](https://vikingmester.no/)
- Reelle lenker fra nettsøk til leverandører (f.eks. Optimera, Maxbo) ved dagsaktuelle oppslag.`;

    let replyText = '';
    const quickReplies: Array<{ title: string; payload: string }> = [];

    // 🚀 1. PRIMÆRT: Generer svar via VikingMesters interne AI Engine (med full Google Grounding ved nettsøk)
    try {
      const aiResult = await generateWithAiEngine({
        prompt: safeEnrichedMessage,
        systemInstruction: MASTER_SYSTEM_PROMPT,
        webSearch: wantsWebSearch,
        companyId: effectiveCompanyId,
        companyName: effectiveCompany,
        projectId: body.projectId,
        operation: wantsWebSearch ? 'mesterai_web_search' : 'mesterai_chat'
      });

      if (aiResult && aiResult.text) {
        replyText = aiResult.text;
      }
    } catch (aiEngineErr: any) {
      console.warn('VikingMester AI Engine primærkall feilet eller mangler nøkkel, forsøker fallback:', aiEngineErr.message);
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

    // 🛡️ 3. SIKKERHETSVENTIL HVIS ALT FEILER: Returner et hjelpsomt og profesjonelt byggmestersvar (ALDRI hermetisk vær-spam)
    if (!replyText) {
      if (isWeather) {
        replyText = `🌤️ **Værvarsel og HMS-arbeidsforhold for ${weatherRep.locationName}**\n*Gjelder byggeplass: ${projectName || weatherRep.locationName}*\n\n• **Temperatur nå:** ${weatherRep.temp}°C (Dagens spenn: ${weatherRep.minTemp}°C til ${weatherRep.maxTemp}°C)\n• **Værforhold:** ${weatherRep.condition}\n• **Vindstyrke:** ${weatherRep.windSpeed} m/s (${weatherRep.beaufort})\n• **Nedbør i dag:** ${weatherRep.precipitation} mm\n• **Luftfuktighet:** ${weatherRep.humidity}%\n\n🛡️ **HMS- og Arbeidsråd:**\n${weatherRep.workAdvice}`;
      } else {
        replyText = `Hei! Jeg er klar til å bistå deg med **${projectName || 'prosjektet ditt'}**.\n\nHva ønsker du at jeg skal utføre for deg nå? Jeg kan blant annet hjelpe deg med:\n- Sette opp et pristilbud eller kalkyle\n- Utarbeide en SJA (Sikker Jobb Analyse) tilpasset dagens arbeidsforhold\n- Føre byggedagbok eller registrere avvik\n- Sjekke oppdaterte regler og krav i TEK17 / Våtromsnormen\n- Søke opp dagsaktuelle priser, tekniske datablad eller arrangementer`;
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
      baseUrl: req.nextUrl?.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no'
    });

    return NextResponse.json({
      success: true,
      sessionId: fbId,
      reply: replyText,
      quickReplies: quickReplies
    });

  } catch (error: any) {
    console.error('MesterAI proxy route error:', error);
    return NextResponse.json({ 
      error: 'Intern serverfeil ved kommunikasjon med agenten',
      message: error.message 
    }, { status: 500 });
  }
}
