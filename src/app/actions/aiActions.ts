'use server';

import { hashAiRequest, getCachedAiResponse, setCachedAiResponse } from '@/src/lib/server/aiCache';
import { tryResolveDeterministicSja } from '@/src/lib/server/ruleEngine';
import { getCollectionItems } from '@/src/lib/server/db';

/**
 * Server Action for SJA generation with deterministic rule check and cache
 * Saves tokens by avoiding DeepSeek API calls whenever possible.
 */
export async function generateSJAAction(taskDescription: string, weatherContext?: string) {
  if (!taskDescription || taskDescription.trim().length === 0) {
    throw new Error('Arbeidsoppgave må spesifiseres');
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
  const cacheKey = hashAiRequest(prompt, 'sja_generator', 'deepseek-chat');
  const cached = await getCachedAiResponse(cacheKey);
  if (cached) {
    try {
      return {
        success: true,
        data: JSON.parse(cached),
        source: 'cache'
      };
    } catch {
      // If parsing failed, proceed to generate
    }
  }

  // 3. Invoke DeepSeek API only if needed
  const apiKey = process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEP_SEEK_API er ikke konfigurert');
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Du er en ekspert på Sikker Jobb Analyse (SJA) i Norge. Returner KUN et gyldig JSON-objekt med feltene: title, task, risikoer (liste med aktivitet, risiko, tiltak), utstyr (liste), tek17Reference, weatherImpact.'
        },
        {
          role: 'user',
          content: `Generer et SJA-utkast som JSON for følgende oppgave: ${taskDescription}. Værforhold: ${weatherContext || 'Normalt innendørs/utendørs'}.`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.2
    })
  });

  if (!res.ok) {
    throw new Error(`DeepSeek API feil: ${res.statusText}`);
  }

  const json = await res.json();
  let content = json.choices?.[0]?.message?.content || '{}';
  content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

  await setCachedAiResponse(cacheKey, content, 'deepseek-chat');

  return {
    success: true,
    data: JSON.parse(content),
    source: 'deepseek_api',
    tokensUsed: json.usage?.total_tokens || null
  };
}

/**
 * Server Action to fetch pre-computed daily summary with 0 token expenditure
 */
export async function getLatestDailySummaryAction() {
  const summaries = await getCollectionItems('daily_summaries');
  if (summaries && summaries.length > 0) {
    return summaries[0];
  }
  return null;
}
