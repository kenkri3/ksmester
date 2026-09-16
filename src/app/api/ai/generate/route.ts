import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isUserAdmin } from '@/src/lib/server/auth';
import { checkCompanyQuota } from '@/src/lib/server/costTracker';
import { getCachedAiResponse, setCachedAiResponse } from '@/src/lib/server/aiCache';
import { tryResolveDeterministicSja } from '@/src/lib/server/ruleEngine';
import { generateWithAiEngine, get1MinAiKey, getGeminiKey, getDeepSeekKey } from '@/src/lib/server/aiEngine';
import { createHash } from 'crypto';

function computeCacheKey(promptOrContents: any, systemInstruction?: string, model = 'default', images?: any[], inlineData?: any): string {
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

  const oneMinKey = get1MinAiKey();
  const geminiKey = getGeminiKey();
  const deepseekKey = getDeepSeekKey();

  if (!oneMinKey && !geminiKey && !deepseekKey) {
    return NextResponse.json({ error: 'Ingen AI-nøkkel (verken 1_MIN_AI eller GEMINI_API_KEY) er konfigurert på serveren.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    let { prompt, contents, model = process.env.GEMINI_MODEL || 'gemini-2.5-flash', systemInstruction, responseMimeType, responseSchema, images, inlineData, operation = 'ai_generate' } = body;

    if (!user && isPortalAccess) {
      if (!prompt || typeof prompt !== 'string' || prompt.length > 5000) {
        return NextResponse.json({ error: 'Ugyldig portalforespørsel' }, { status: 400 });
      }
    }

    const isAdmin = isUserAdmin(user);

    // 🛡️ Sjekk bedriftens faktiske tokenkvote og abonnementsplan (100% marginvern for vanlige brukere)
    if (user?.companyId && !isAdmin) {
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

    const aiResult = await generateWithAiEngine({
      prompt,
      contents,
      model,
      systemInstruction,
      responseMimeType,
      responseSchema,
      images,
      inlineData,
      operation,
      webSearch: body.webSearch,
      companyId: user?.companyId,
      companyName: (user as any)?.company,
      projectId: body.projectId,
      notes: `AI request by ${user?.email || 'portal'}`
    });

    // ⚡ Lagre i server-cache for fremtidige identiske henvendelser (0 kr)
    if (aiResult.text) {
      setCachedAiResponse(cacheKey, aiResult.text, aiResult.model).catch(err => 
        console.warn('[AI Cache] Feil ved lagring:', err)
      );
    }

    return NextResponse.json({ 
      text: aiResult.text,
      source: aiResult.source,
      model: aiResult.model,
      usage: aiResult.usage
    });
  } catch (error: any) {
    console.error('Server AI Generation error:', error);
    return NextResponse.json({ error: error.message || 'AI-generering feilet på serveren' }, { status: 500 });
  }
}
