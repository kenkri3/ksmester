import { NextRequest, NextResponse } from 'next/server';
import { generateWithAiEngine } from '@/src/lib/server/aiEngine';
import { authorizeBridgeRequest } from '@/src/lib/server/bridgeAuth';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function POST(req: NextRequest) {
  try {
    // 🛡️ SIKKERHETSFIKS (P0): Endepunktet hadde tidligere ingen avvisningsgren.
    // Uten nøkkel falt kallet tilbake på serverens EGEN betalte AI-nøkkel, slik
    // at hvem som helst kunne brenne AI-kvoten vår. Nå kreves alltid en nøkkel:
    // enten plattformnøkkelen (AGENT_API) eller kundens egen (BYOK).
    const auth = authorizeBridgeRequest(req);
    if (!auth.authorized) {
      return NextResponse.json(
        {
          error: {
            message: auth.reason || 'Uautorisert. Gyldig API-nøkkel kreves.',
            type: 'invalid_request_error',
            code: 401
          }
        },
        { status: 401, headers: CORS_HEADERS }
      );
    }
    const customKey = auth.apiKey;

    const body = await req.json().catch(() => ({}));
    const { model = 'gemini-2.5-flash', messages = [] } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: 'Mangler "messages"-felt i forespørselen.',
            type: 'invalid_request_error',
            code: 400
          }
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 2. Bygg prompt og kontekst fra samtaleloggen
    const systemParts: string[] = [];
    const conversationParts: string[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push(String(msg.content || ''));
      } else {
        const roleName = msg.role === 'user' ? 'Bruker' : 'Assistent';
        conversationParts.push(`${roleName}: ${msg.content || ''}`);
      }
    }

    let prompt = '';
    if (conversationParts.length === 1 && messages[messages.length - 1].role === 'user') {
      prompt = String(messages[messages.length - 1].content || '');
    } else {
      prompt = conversationParts.join('\n\n') + '\n\nAssistent:';
    }

    const systemInstruction = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;

    // 3. Kall KS Mester sin intelligente AI-motor (DeepSeek primær / failover)
    const result = await generateWithAiEngine({
      prompt,
      model: typeof model === 'string' ? model : undefined,
      systemInstruction,
      apiKey: customKey,
      operation: 'botsify_chat_bridge'
    });

    // 4. Returner OpenAI-kompatibel respons til Botsify
    const promptTokens = result.usage?.promptTokens || Math.max(10, Math.round(prompt.length / 4));
    const completionTokens = result.usage?.completionTokens || Math.max(10, Math.round(result.text.length / 4));

    return NextResponse.json(
      {
        id: `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: result.model || model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: result.text
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens
        }
      },
      {
        headers: CORS_HEADERS
      }
    );
  } catch (err: any) {
    console.error('[OpenAI Bridge] Feil under chat completion:', err);
    return NextResponse.json(
      {
        error: {
          message: err.message || 'Intern serverfeil i OpenAI-broen for 1min.ai',
          type: 'api_error',
          code: 500
        }
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
