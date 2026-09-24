'use server';

import { hashAiRequest, getCachedAiResponse, setCachedAiResponse } from '@/src/lib/server/aiCache';
import { tryResolveDeterministicSja } from '@/src/lib/server/ruleEngine';
import { getCollectionItems } from '@/src/lib/server/db';
import { generateWithAiEngine, cleanAiJson } from '@/src/lib/server/aiEngine';
import { cookies } from 'next/headers';
import { verifyAuthToken } from '@/src/lib/server/auth';

export async function generateSJAAction(taskDescription: string, weatherContext?: string) {
  const trimmed = (taskDescription || '').trim();
  if (!trimmed) {
    throw new Error('Arbeidsoppgave må spesifiseres');
  }
  if (trimmed.length > 2000) {
    throw new Error('Arbeidsoppgaven er for lang (maks 2000 tegn tillatt)');
  }

  // 1. Check deterministic rule engine (0 tokens)
  const ruleMatch = tryResolveDeterministicSja(taskDescription, weatherContext);
  if (ruleMatch) {
    return {
      success: true,
      data: ruleMatch,
      source: 'rule_engine',
      tokensSaved: 850
    };
  }

  // 2. Check server-side cache (0 tokens)
  const prompt = `Generer SJA for: ${taskDescription}. Vær: ${weatherContext || 'Normalt'}.`;
  const cacheKey = hashAiRequest(prompt, 'sja_generator', 'deepseek-flash');
  const cached = await getCachedAiResponse(cacheKey);
  if (cached) {
    try {
      return {
        success: true,
        data: JSON.parse(cached),
        source: 'cache'
      };
    } catch {}
  }

  // 3. AI Generation via DeepSeek / Gemini / 1min.AI
  const result = await generateWithAiEngine({
    prompt: `Generer et SJA-utkast som JSON for følgende oppgave: ${taskDescription}. Værforhold: ${weatherContext || 'Normalt innendørs/utendørs'}.`,
    systemInstruction: 'Du er en ekspert på Sikker Jobb Analyse (SJA) i Norge. Returner KUN et gyldig JSON-objekt med feltene: title, task, risikoer (liste med aktivitet, risiko, tiltak), utstyr (liste), tek17Reference, weatherImpact.',
    operation: 'sja_generation',
    responseMimeType: 'application/json'
  });

  const rawJson = cleanAiJson(result.text);
  await setCachedAiResponse(cacheKey, rawJson, result.model);

  return {
    success: true,
    data: JSON.parse(rawJson),
    source: result.source,
    tokensUsed: result.usage.totalTokens
  };
}

export async function getLatestDailySummaryAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || cookieStore.get('auth_token')?.value;
  const user = token ? verifyAuthToken(token) : null;

  const summaries = await getCollectionItems('daily_summaries');
  if (!summaries || summaries.length === 0) return null;

  if (user?.role === 'admin') {
    return summaries[0];
  }

  if (user?.companyId) {
    return summaries.find((s: any) => !s.companyId || s.companyId === user.companyId) || null;
  }

  return null;
}
