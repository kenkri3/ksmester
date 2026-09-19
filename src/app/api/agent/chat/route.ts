import { NextRequest, NextResponse } from 'next/server';

/**
 * 🤖 MesterAI Headless Agent Proxy
 * Kommuniserer direkte med agenten via REST API med AGENT_API-nøkkelen.
 * 100% White-label: Ingen tredjeparts iframe, ingen eksterne URLs synlige for brukeren.
 */

const BOT_API_KEY = process.env.AGENT_API || 'UDuz6jJYyXeVli7LuNyWqNUJHORWZQBDZYeF3sKs';
const CONVERSE_ENDPOINT = 'https://agentic.botsify.com/api/v1/converse';

// Hjelpefunksjon for å generere stabil 13-tegns bruker-ID for samtalekontekst
function generateSessionId(input?: string): string {
  if (input && input.length >= 13) {
    const clean = input.replace(/[^a-zA-Z0-9]/g, '');
    if (clean.length >= 13) return clean.slice(0, 13);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 13; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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
    const body = await req.json();
    const { message, sessionId, projectName, userName, userTrade, companyName, userId, imageUrl } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mangler melding' }, { status: 400 });
    }

    // Stabil 13-tegns bruker-ID basert på userId dersom tilgjengelig, ellers sessionId
    let fbId = sessionId;
    if (userId && typeof userId === 'string') {
      const cleanUid = userId.replace(/[^a-zA-Z0-9]/g, '');
      fbId = `vm${cleanUid}`.padEnd(13, '0').slice(0, 13);
    } else if (!fbId) {
      fbId = generateSessionId();
    }

    const tradeTitle = (userTrade && TRADE_NAMES[userTrade.toLowerCase()]) || userTrade || 'Byggmester';
    const effectiveCompany = companyName || 'VikingMester';
    
    // Berik meldingen med full fagkontekst slik at agenten opererer ut fra brukerens yrkeskrav
    let contextHeader = `[Fagkontekst: ${userName || 'Håndverker'} (${tradeTitle}) hos ${effectiveCompany}`;
    if (projectName) {
      contextHeader += ` | Aktivt prosjekt: ${projectName}`;
    }
    contextHeader += `]`;

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
