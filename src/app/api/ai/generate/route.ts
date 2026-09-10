import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { trackTokenCost, checkCompanyQuota } from '@/src/lib/server/costTracker';
import { getCachedAiResponse, setCachedAiResponse } from '@/src/lib/server/aiCache';
import { tryResolveDeterministicSja } from '@/src/lib/server/ruleEngine';
import { createHash } from 'crypto';

function computeCacheKey(promptOrContents: any, systemInstruction?: string, model = 'gemini-3.8-flash', images?: any[], inlineData?: any): string {
  const textPart = typeof promptOrContents === 'string' ? promptOrContents.trim().toLowerCase() : JSON.stringify(promptOrContents || '');
  let imageParts = '';
  if (inlineData?.data) {
    imageParts += createHash('sha256').update(String(inlineData.data).slice(0, 500) + String(inlineData.data).length).digest('hex');
  }
  if (images && Array.isArray(images) && images.length > 0) {
    imageParts += ':' + images.map(img => {
      const data = img?.inlineData?.data || img?.data || (typeof img === 'string' ? img : '');
      return createHash('sha256').update(String(data).slice(0, 500) + String(data).length).digest('hex');
    }).join(':');
  }
  const payload = `${model}:::${systemInstruction || ''}:::${textPart}:::${imageParts}`;
  return createHash('sha256').update(payload).digest('hex');
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  const isPortalAccess = req.headers.get('x-portal-access') === 'true';

  if (!user && !isPortalAccess) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  const deepseekKey = process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY;

  if (!apiKey && !deepseekKey) {
    return NextResponse.json({ error: 'Ingen AI-nøkkel (GEMINI_API_KEY) er konfigurert på serveren.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    let { prompt, contents, model = 'gemini-3.8-flash', systemInstruction, responseMimeType, responseSchema, images, inlineData, operation = 'ai_generate' } = body;

    if (!user && isPortalAccess) {
      if (!prompt || typeof prompt !== 'string' || prompt.length > 5000) {
        return NextResponse.json({ error: 'Ugyldig portalforespørsel' }, { status: 400 });
      }
    }

    // 🛡️ Sjekk bedriftens faktiske tokenkvote og abonnementsplan (100% marginvern)
    if (user?.companyId) {
      const quota = await checkCompanyQuota(user.companyId);
      if (quota.needsTopUp) {
        return NextResponse.json({
          error: `Månedlig inkludert AI-kvote (${quota.plan?.toUpperCase()} - ${(quota.limitTokens / 1_000_000).toFixed(1)}M tokens) er nådd. Kjøp en Mester Top-up pakke under Innstillinger → Fakturering for å fortsette uten avbrudd.`,
          needsTopUp: true,
          quota
        }, { status: 429 });
      }
    }

    // ⚡ 1. SJA Regelmotor (0 kr, 0 ms for standard byggeoppgaver)
    if (operation === 'sja_generation' || operation === 'sja') {
      const taskText = body.taskDescription || body.task || (typeof prompt === 'string' ? prompt : '');
      const ruleMatch = tryResolveDeterministicSja(taskText, body.weatherContext);
      if (ruleMatch) {
        const formatted = {
          title: ruleMatch.title,
          tittel: ruleMatch.title,
          task: ruleMatch.task,
          arbeidsoppgave: ruleMatch.task,
          risikoer: ruleMatch.risikoer,
          utstyr: ruleMatch.utstyr,
          tek17Reference: ruleMatch.tek17Reference,
          tek17_referanse: ruleMatch.tek17Reference,
          weatherImpact: ruleMatch.weatherImpact,
          weather_impact: ruleMatch.weatherImpact,
          user_feedback: {
            tittel: ruleMatch.title,
            hovedrisiko: ruleMatch.risikoer[0]?.risiko || 'Følg standard sikkerhetsrutiner'
          }
        };
        return NextResponse.json({
          text: JSON.stringify(formatted),
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          source: 'rule_engine',
          cached: false
        });
      }
    }

    // ⚡ 2. Server-side AI Cache (0 kr for gjentatte oppgaver, bilder og oversettelser)
    const cacheKey = computeCacheKey(prompt || contents, systemInstruction, model, images, inlineData);
    const cachedText = await getCachedAiResponse(cacheKey);
    if (cachedText) {
      return NextResponse.json({
        text: cachedText,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        source: 'ai_cache',
        cached: true
      });
    }

    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });

      if (inlineData && (!images || images.length === 0)) {
        images = [{ inlineData }];
      }

      let finalContents: any = prompt || contents || '';

      if (images && Array.isArray(images) && images.length > 0) {
        const parts: any[] = [];
        if (typeof prompt === 'string' && prompt) {
          parts.push({ text: prompt });
        }
        for (const img of images) {
          if (img.inlineData) {
            parts.push(img);
          } else if (img.data && img.mimeType) {
            parts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.data
              }
            });
          } else if (typeof img === 'string' && img.startsWith('data:')) {
            const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              parts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2]
                }
              });
            }
          }
        }
        finalContents = parts;
      }

      const config: any = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (responseMimeType) config.responseMimeType = responseMimeType;
      if (responseSchema) config.responseSchema = responseSchema;

      const candidateModels = [
        model || 'gemini-3.8-flash',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash'
      ];

      const uniqueModels = Array.from(new Set(candidateModels));

      let aiResponse: any = null;
      let lastError: any = null;
      let executedModel = 'gemini-3.8-flash';

      for (const cand of uniqueModels) {
        try {
          aiResponse = await ai.models.generateContent({
            model: cand,
            contents: finalContents,
            config: Object.keys(config).length > 0 ? config : undefined
          });
          if (aiResponse && aiResponse.text) {
            executedModel = cand;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[AI Generation] Modell ${cand} feilet (${err.message}), forsøker neste kandidat...`);
        }
      }

      if (!aiResponse) {
        throw lastError || new Error('Gemini generering feilet for alle modeller');
      }

      // 📊 Presis registrering av tokenforbruk for 50/50 partnerskapsregnskap
      const promptTokens = aiResponse.usageMetadata?.promptTokenCount || 
        (typeof prompt === 'string' ? Math.round(prompt.length / 4) : 250);
      const completionTokens = aiResponse.usageMetadata?.candidatesTokenCount || 
        (aiResponse.text ? Math.round(aiResponse.text.length / 4) : 100);

      // Asynkron logging (blokkerer ikke klientens respons)
      trackTokenCost({
        model: executedModel,
        promptTokens,
        completionTokens,
        operation: operation || 'ai_generate',
        companyId: user?.companyId,
        companyName: (user as any)?.company,
        notes: `AI request by ${user?.email || 'portal'}`
      }).catch(err => console.warn('trackTokenCost error:', err));

      const resultText = aiResponse.text || '';

      // ⚡ Lagre i server-cache for fremtidige identiske henvendelser (0 kr)
      if (resultText) {
        setCachedAiResponse(cacheKey, resultText, executedModel).catch(err => 
          console.warn('[AI Cache] Feil ved lagring:', err)
        );
      }

      return NextResponse.json({ 
        text: resultText,
        usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens }
      });
    } else if (deepseekKey) {
      const userPrompt = typeof prompt === 'string' ? prompt : (typeof contents === 'string' ? contents : JSON.stringify(contents));
      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: userPrompt });

      const dsBody: any = {
        model: 'deepseek-chat',
        messages,
        temperature: 0.2
      };
      if (responseMimeType === 'application/json') {
        dsBody.response_format = { type: 'json_object' };
      }

      const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`
        },
        body: JSON.stringify(dsBody),
        signal: AbortSignal.timeout(15000)
      });

      if (!dsRes.ok) {
        throw new Error(`DeepSeek feilet (HTTP ${dsRes.status})`);
      }

      const dsData = await dsRes.json();
      const promptTokens = dsData.usage?.prompt_tokens || 200;
      const completionTokens = dsData.usage?.completion_tokens || 100;
      const resultText = dsData.choices?.[0]?.message?.content || '';

      trackTokenCost({
        model: 'deepseek-chat',
        promptTokens,
        completionTokens,
        operation: operation || 'ai_generate_deepseek',
        companyId: user?.companyId,
        companyName: (user as any)?.company,
        notes: `DeepSeek request by ${user?.email || 'portal'}`
      }).catch(err => console.warn('trackTokenCost error:', err));

      if (resultText) {
        setCachedAiResponse(cacheKey, resultText, 'deepseek-chat').catch(err => 
          console.warn('[AI Cache] Feil ved lagring:', err)
        );
      }

      return NextResponse.json({ 
        text: resultText,
        usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens }
      });
    }

    return NextResponse.json({ error: 'Ingen AI-tilbyder er tilgjengelig' }, { status: 500 });
  } catch (error: any) {
    console.error('Server AI Generation error:', error);
    return NextResponse.json({ error: error.message || 'AI-generering feilet på serveren' }, { status: 500 });
  }
}
