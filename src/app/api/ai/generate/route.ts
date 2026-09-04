import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { hashAiRequest, getCachedAiResponse, setCachedAiResponse } from '@/src/lib/server/aiCache';
import { tryResolveDeterministicSja } from '@/src/lib/server/ruleEngine';

export async function POST(req: NextRequest) {
  // 1. Authenticate the request
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Uautorisert tilgang til AI-tjenesten.' }, { status: 401 });
  }

  // 2. Validate DEEP_SEEK_API key
  const apiKey = process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ 
      error: 'DEEP_SEEK_API er ikke konfigurert på serveren. Vennligst legg til DEEP_SEEK_API i miljøvariablene.' 
    }, { status: 500 });
  }

  try {
    const body = await req.json();
    let { 
      prompt = '', 
      contents = '', 
      model = 'deepseek-chat', 
      systemInstruction = '', 
      responseMimeType, 
      responseSchema, 
      images, 
      inlineData,
      forceRefresh = false
    } = body;

    const basePrompt = typeof prompt === 'string' && prompt ? prompt : (typeof contents === 'string' ? contents : JSON.stringify(contents));

    // 3. Fast-Path: Deterministic rule check for standard SJA tasks (0 tokens used!)
    if (basePrompt.includes('Sikker Jobb Analyse') || basePrompt.includes('SJA')) {
      const match = tryResolveDeterministicSja(basePrompt);
      if (match) {
        return NextResponse.json({ 
          text: JSON.stringify(match),
          cached: true,
          source: 'rule_engine',
          tokensSaved: 850
        });
      }
    }

    // 4. Token-Saver: Check AI completion cache
    const cacheKey = hashAiRequest(basePrompt, systemInstruction, model);
    if (!forceRefresh) {
      const cachedResponse = await getCachedAiResponse(cacheKey);
      if (cachedResponse) {
        return NextResponse.json({ 
          text: cachedResponse,
          cached: true,
          source: 'cache'
        });
      }
    }

    // 5. Handle image/multimodal context gracefully for DeepSeek
    let enrichedPrompt = basePrompt;
    if (images && Array.isArray(images) && images.length > 0) {
      enrichedPrompt += `\n[Bildevedlegg: Brukeren har lastet opp ${images.length} bilde(r) fra byggeplassen for kvalitetssikring og TEK17-kontroll. Vurder bygningstekniske krav og typiske feilkilder basert på oppgaven.]`;
    }

    // 6. Build messages array for DeepSeek OpenAI-compatible Chat API
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    const defaultSystem = systemInstruction || 
      'Du er KS MesterAI, en faglig assistent og ekspert på HMS, KS, SJA og TEK17 for norske håndverkere og entreprenører. Gi presise, profesjonelle og konsise svar på norsk.';
    
    messages.push({ role: 'system', content: defaultSystem });
    messages.push({ role: 'user', content: enrichedPrompt });

    const isJsonRequested = responseMimeType === 'application/json' || !!responseSchema;
    if (isJsonRequested) {
      const hasJsonMention = messages.some(m => /json/i.test(m.content));
      if (!hasJsonMention) {
        messages[messages.length - 1].content += "\nSvar kun i gyldig JSON-format.";
      }
    }

    // 7. Select DeepSeek model
    const deepSeekModel = model === 'deepseek-reasoner' || model === 'r1' 
      ? 'deepseek-reasoner' 
      : 'deepseek-chat';

    // 8. Call DeepSeek API
    const deepSeekRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: deepSeekModel,
        messages,
        temperature: deepSeekModel === 'deepseek-reasoner' ? 1.0 : 0.2,
        max_tokens: 2048,
        ...(isJsonRequested ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!deepSeekRes.ok) {
      const errBody = await deepSeekRes.text();
      console.error('DeepSeek API error status:', deepSeekRes.status, errBody);
      return NextResponse.json({ 
        error: `DeepSeek API feil (${deepSeekRes.status}): ${errBody || 'Ukjent feil'}` 
      }, { status: deepSeekRes.status });
    }

    const data = await deepSeekRes.json();
    let textResponse = data.choices?.[0]?.message?.content || '';

    // If model returned markdown code blocks for JSON, strip them for clean parsing
    if (isJsonRequested) {
      textResponse = textResponse.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    // 9. Cache successful response
    if (textResponse) {
      await setCachedAiResponse(cacheKey, textResponse, deepSeekModel);
    }

    return NextResponse.json({ 
      text: textResponse,
      model: deepSeekModel,
      usage: data.usage || null,
      cached: false
    });
  } catch (error: any) {
    console.error('Server AI Generation error:', error);
    return NextResponse.json({ error: error.message || 'AI-generering feilet på serveren' }, { status: 500 });
  }
}
