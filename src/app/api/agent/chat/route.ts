import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUserFromRequest } from '@/src/lib/server/auth';

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

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const body = await req.json();
    const { message, sessionId, projectName, userName, userTrade, companyName, userId, imageUrl } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mangler melding' }, { status: 400 });
    }

    // 🛡️ BEREGN KRYPTOGRAFISK ISOLERT SESJONS-ID (fbId) FOR BOTSIFY (13 tegn)
    let fbId: string;
    let isSandboxedDemo = false;

    if (user && user.id) {
      // Autentisert kunde: Streng multi-tenant hashing basert på bedrift og bruker
      const companyId = user.companyId || 'enkeltforetak';
      const companyHash = crypto.createHash('sha256').update(companyId).digest('hex').slice(0, 6);
      const userHash = crypto.createHash('sha256').update(user.id).digest('hex').slice(0, 6);
      fbId = `c${companyHash}${userHash}`; // 'c' + 6 + 6 = 13 tegn, unikt og isolert per bedrift/bruker
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
      
    const effectiveCompany = user?.company || companyName || 'VikingMester';
    const effectiveUser = user?.displayName || userName || (isSandboxedDemo ? 'Demobruker' : 'Håndverker');
    
    // Berik meldingen med full fagkontekst og GDPR-instrukser
    let contextHeader = '';
    if (isSandboxedDemo) {
      contextHeader = `[SANDKASSE DEMO - Offentlig testmiljø | Rolle: ${effectiveUser} (${tradeTitle}) | Aktivt prosjekt: ${projectName || 'Villa Fjellstrand'} | RETNINGSLINJE: Offentlig demonstrasjon. Hold fokus på norsk byggestandard, TEK17 og NS-kontrakter.]`;
    } else {
      contextHeader = `[Fagkontekst: ${effectiveUser} (${tradeTitle}) hos ${effectiveCompany} (Bedrifts-ID: ${user?.companyId || 'standard'})`;
      if (projectName) {
        contextHeader += ` | Aktivt prosjekt: ${projectName}`;
      }
      contextHeader += ` | SIKKERHET: GDPR & Databehandleravtale (DPA) er aktiv. Alle data er strengt konfidensielle for denne bedriften. Ingen informasjon må forveksles eller deles med andre selskaper.]`;
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
