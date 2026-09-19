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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, projectName, userName } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mangler melding' }, { status: 400 });
    }

    const fbId = sessionId || generateSessionId();

    // Berik meldingen med prosjektkontekst dersom aktivt prosjekt er valgt
    let enrichedMessage = message;
    if (projectName && !message.toLowerCase().includes(projectName.toLowerCase())) {
      enrichedMessage = `[Aktivt prosjekt i VikingMester: ${projectName}]\n${message}`;
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
