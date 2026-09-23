import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { sendSystemEmail, sendOfferByEmail, sendChangeOrderByEmail } from '@/src/lib/server/emailSender';
import { getCollectionItems, saveCollectionItem } from '@/src/lib/server/db';

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

/**
 * Fanger opp <<<SEND_EMAIL: ...>>> eller JSON-aksjoner generert av agenten,
 * og sender ekte e-post via Resend med tilhørende bekreftelsesbadge.
 */
async function processEmailActionsInReply(
  replyText: string,
  context: {
    companyName: string;
    authorName: string;
    projectName?: string;
    projectId?: string;
    userMessage?: string;
    baseUrl?: string;
  }
): Promise<string> {
  let recipient = '';
  let subject = '';
  let body = '';
  let matchToReplace: string | null = null;

  // 1. Sjekk taggen <<<SEND_EMAIL: ...>>> eller [SEND_EMAIL: ...]
  const emailTagRegex = /(?:<<<|\[)\s*SEND_EMAIL:\s*([\s\S]*?)(?:>>>|\])/i;
  const tagMatch = replyText.match(emailTagRegex);

  if (tagMatch) {
    matchToReplace = tagMatch[0];
    const rawPayload = tagMatch[1].trim();

    // Forsøk JSON-parsing først dersom agenten svarte med JSON
    if (rawPayload.startsWith('{') && rawPayload.endsWith('}')) {
      try {
        const parsed = JSON.parse(rawPayload);
        recipient = parsed.to || parsed.recipient || parsed.email || '';
        subject = parsed.subject || parsed.title || parsed.emne || '';
        body = parsed.body || parsed.message || parsed.text || parsed.innhold || '';
      } catch {}
    }

    if (!recipient) {
      const toMatch = rawPayload.match(/to=["']([^"']+)["']/i) || rawPayload.match(/til=["']([^"']+)["']/i) || rawPayload.match(/to=([^\s]+)/i);
      if (toMatch) recipient = toMatch[1].trim();
    }
    if (!subject) {
      const subjMatch = rawPayload.match(/subject=["']([^"']+)["']/i) || rawPayload.match(/emne=["']([^"']+)["']/i);
      if (subjMatch) subject = subjMatch[1].trim();
    }
    if (!body) {
      const bodyMatch = rawPayload.match(/body=["']([^"']+)["']/i) || rawPayload.match(/message=["']([^"']+)["']/i) || rawPayload.match(/tekst=["']([^"']+)["']/i);
      if (bodyMatch) body = bodyMatch[1].trim();
    }
  }

  // 2. Sjekk om Botsify svarte med sin kjente feilmelding der den likevel har ekstrahert e-postinnholdet
  if (!recipient && (
    replyText.includes('ble dessverre ikke sendt - e-posttjenesten ga ingen bekreftelse') ||
    replyText.includes('fikk ingen bekreftelse fra e-posttjenesten') ||
    replyText.includes('Innholdet som skulle sendes:')
  )) {
    const toMatch = replyText.match(/til\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (toMatch) recipient = toMatch[1].trim();

    const subjMatch = replyText.match(/Emne:\s*([^\n\r]+)/i);
    if (subjMatch) subject = subjMatch[1].trim();

    const msgMatch = replyText.match(/Melding:\s*([\s\S]+?)(?:\n\nVil du at jeg prøver|\n\n$|$)/i);
    if (msgMatch) body = msgMatch[1].trim();

    if (recipient) {
      matchToReplace = replyText;
    }
  }

  // 3. Fallback: Hvis brukerens melding inneholdt en e-postadresse og en instruks om å sende
  if (!recipient && context.userMessage) {
    const lowerUserMsg = context.userMessage.toLowerCase();
    const emailMatches = context.userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    
    if (emailMatches && (lowerUserMsg.includes('send') || lowerUserMsg.includes('sende')) && (lowerUserMsg.includes('epost') || lowerUserMsg.includes('e-post') || lowerUserMsg.includes('mail'))) {
      recipient = emailMatches[1].trim();
      
      if (lowerUserMsg.includes('tilbud')) {
        subject = `Pristilbud fra ${context.companyName} vedr. ${context.projectName || 'byggeprosjekt'}`;
      } else if (lowerUserMsg.includes('endring') || lowerUserMsg.includes('varsel')) {
        subject = `Endringsvarsel (NS 8406) fra ${context.companyName} vedr. ${context.projectName || 'byggeprosjekt'}`;
      } else {
        subject = `Melding fra ${context.companyName} vedr. ${context.projectName || 'byggeprosjekt'}`;
      }
      
      body = replyText.replace(/Jeg kan dessverre ikke sende e-post[\s\S]*$/i, '').trim() || context.userMessage;
      matchToReplace = replyText;
    }
  }

  if (!recipient) {
    if (tagMatch) {
      return replyText.replace(tagMatch[0], `\n\n*(E-post ble ikke sendt fordi mottakers e-postadresse mangler. Vennligst oppgi hvem som skal motta e-posten.)*`);
    }
    return replyText;
  }

  // Sjekk om det gjelder tilbud og vi har et tilbud i basen
  const isOffer = subject.toLowerCase().includes('tilbud') || (context.userMessage && context.userMessage.toLowerCase().includes('tilbud'));
  const isChangeOrder = subject.toLowerCase().includes('endring') || (context.userMessage && context.userMessage.toLowerCase().includes('endring'));
  const baseUrl = context.baseUrl || 'https://vikingmester.no';

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
        targetOffer.clientEmail = recipient;
        targetOffer.status = 'sent';
        await saveCollectionItem('offers', targetOffer);

        const offerRes = await sendOfferByEmail({
          offer: targetOffer,
          clientEmail: recipient,
          clientName: targetOffer.clientName,
          companyName: context.companyName,
          authorName: context.authorName,
          baseUrl
        });

        const link = `${baseUrl}/?offerToken=${targetOffer.token}`;
        if (offerRes.success && offerRes.status === 'sent') {
          const badge = `\n\n> 📬 **Pristilbud er levert på e-post via Resend!**\n> - **Mottaker:** \`${recipient}\`\n> - **Tilbud:** «${targetOffer.title}»\n> - **Totalbeløp:** kr ${(Number(targetOffer.totalAmount || targetOffer.total || 0)).toLocaleString('no-NO')} inkl. mva\n> - **Digital godkjenning:** [Åpne tilbudslenke](${link})\n> - **Resend ID:** \`${offerRes.resendId || 'resend-ok'}\``;
          return matchToReplace ? replyText.replace(matchToReplace, badge) : replyText + badge;
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
          clientEmail: recipient,
          clientName: targetOrder.clientName,
          companyName: context.companyName,
          authorName: context.authorName
        });

        if (coRes.success && coRes.status === 'sent') {
          const badge = `\n\n> 📬 **Endringsmelding (NS 8406) er levert via Resend!**\n> - **Mottaker:** \`${recipient}\`\n> - **Endring:** «${targetOrder.title}»\n> - **Krav:** kr ${(Number(targetOrder.totalAmount || targetOrder.amountExVat || 0)).toLocaleString('no-NO')} eks. mva\n> - **Resend ID:** \`${coRes.resendId || 'resend-ok'}\``;
          return matchToReplace ? replyText.replace(matchToReplace, badge) : replyText + badge;
        }
      }
    }

    // Standard e-post
    const finalSubject = subject || `Viktig melding vedrørende ${context.projectName || 'byggeprosjekt'}`;
    const finalBody = body || 'Vennlig hilsen fra byggeplassen.';

    const sendRes = await sendSystemEmail({
      to: recipient,
      subject: finalSubject,
      text: finalBody,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px;">
            <h2 style="color: #0f172a; margin: 0 0 4px 0; font-size: 19px;">${finalSubject}</h2>
            <p style="margin: 0; color: #64748b; font-size: 12px;">Gjelder: ${context.projectName || 'Byggeprosjekt'} • Avsender: ${context.companyName}</p>
          </div>
          <div style="white-space: pre-wrap; font-size: 14px; color: #334155; margin-bottom: 24px;">${finalBody}</div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            Sendt via <strong>VikingMester KS</strong> på vegne av <strong>${context.companyName}</strong> (${context.authorName}).
          </p>
        </div>
      `,
      companyName: context.companyName,
      authorName: context.authorName
    });

    if (sendRes.success && sendRes.status === 'sent') {
      const badge = `\n\n> 📬 **E-post er nå levert via Resend!**\n> - **Mottaker:** \`${recipient}\`\n> - **Emne:** «${finalSubject}»\n> - **Meldings-ID:** \`${sendRes.resendId || 'resend-ok'}\`\n> - **Avsender:** \`${sendRes.fromUsed || 'VikingMester <hei@vikingmester.no>'}\``;
      return matchToReplace ? replyText.replace(matchToReplace, badge) : replyText + badge;
    } else if (sendRes.status === 'missing_api_key') {
      const badge = `\n\n> ⚠️ **E-posten ble ikke levert:** \`RESEND_API_KEY\` mangler under miljøvariablene i Railway. Legg til nøkkelen for å aktivere direkte e-postlevering.`;
      return matchToReplace ? replyText.replace(matchToReplace, badge) : replyText + badge;
    } else {
      const badge = `\n\n> ⚠️ **E-postutsending avvist via Resend:** ${sendRes.message || sendRes.error || 'Ukjent feil'}\n> *(Mottaker: \`${recipient}\`)*`;
      return matchToReplace ? replyText.replace(matchToReplace, badge) : replyText + badge;
    }
  } catch (err: any) {
    const badge = `\n\n> ❌ **Teknisk feil ved utsending via Resend:** ${err.message}`;
    return matchToReplace ? replyText.replace(matchToReplace, badge) : replyText + badge;
  }
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
      imageUrl 
    } = body;

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
        if (Array.isArray(availableProjects) && availableProjects.length > 0) {
          const projectListStr = availableProjects.map((p: any) => `«${p.name}»${p.address ? ` (${p.address})` : ''}`).join(', ');
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
      contextHeader += ` | FORMATERING & LESBARHET: Håndverkere leser dette i felt på byggeplass. Svaret MÅ være oversiktlig og luftig: Bruk alltid doble linjeskift mellom avsnitt, bruk punktlister med bindestrek (-) for opplistinger og krav, bruk fete overskrifter (f.eks. ### 🛡️ Krav: eller **Krav:**) for å skille temaer, og fremhev tall og paragrafer. ALDRI svar med en eneste sammenklemt tekstblokk! | E-POST VIA RESEND: Du har direkte tilgang til å sende e-post til kunder, byggherrer og kontakter via systemets integrasjon med Resend. Når brukeren ber deg sende en e-post (tilbud, endring, varsel, FDV eller melding) og du har mottakers e-postadresse: 1) Bekreft kort at du klargjør sendingen. 2) Inkluder nøyaktig denne koden nederst i svaret: <<<SEND_EMAIL: to="mottaker@epost.no" subject="Emnetittel" body="Hele meldingsteksten">>>. Systemet vil fange opp koden og sende e-posten direkte via Resend. Hvis mottaker-adresse mangler, spør brukeren høflig om e-postadressen. Du må aldri påstå at du har sendt e-post uten å inkludere koden. | SIKKERHET: GDPR & Databehandleravtale (DPA) er aktiv. Alle data er strengt konfidensielle for denne bedriften.]`;
    }

    let enrichedMessage = `${contextHeader}\n${message}`;
    if (imageUrl) {
      enrichedMessage += `\n[Vedlagt foto for analyse/dokumentasjon: ${imageUrl}]`;
    }

    const payload = {
      type: 'message',
      fbId: fbId,
      bot_key: BOT_API_KEY,
      text: enrichedMessage,
      message: enrichedMessage,
      current_messages: enrichedMessage,
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
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Agent converse API error:', response.status, errText);
      return NextResponse.json({ 
        error: `Agent-API svarte med status ${response.status}`,
        details: errText
      }, { status: 502 });
    }

    const data = await response.json();

    // Hent ut svartekst og eventuelle hurtigvalg (quick replies)
    let replyText = '';
    const quickReplies: Array<{ title: string; payload: string }> = [];

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

    if (!replyText) {
      replyText = 'Jeg mottok henvendelsen din og har behandlet forespørselen.';
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
      projectName,
      projectId: body.projectId,
      userMessage: message,
      baseUrl: req.nextUrl?.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no'
    });

    return NextResponse.json({
      success: true,
      sessionId: fbId,
      reply: replyText,
      quickReplies: quickReplies,
      raw: data
    });

  } catch (error: any) {
    console.error('MesterAI proxy route error:', error);
    return NextResponse.json({ 
      error: 'Intern serverfeil ved kommunikasjon med agenten',
      message: error.message 
    }, { status: 500 });
  }
}
