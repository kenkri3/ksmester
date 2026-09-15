'use server';

import { hashAiRequest, getCachedAiResponse, setCachedAiResponse } from '@/src/lib/server/aiCache';
import { tryResolveDeterministicSja } from '@/src/lib/server/ruleEngine';
import { getCollectionItems } from '@/src/lib/server/db';
import { GoogleGenAI } from '@google/genai';
import { trackTokenCost } from '@/src/lib/server/costTracker';
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
  const cacheKey = hashAiRequest(prompt, 'sja_generator', 'gemini-2.5-flash');
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

  // 3. AI Generation: Prefer Gemini 3.6 Flash
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  const deepseekKey = process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY;

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const aiResponse = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Generer et SJA-utkast som JSON for følgende oppgave: ${taskDescription}. Værforhold: ${weatherContext || 'Normalt innendørs/utendørs'}.`,
          config: {
            systemInstruction: 'Du er en ekspert på Sikker Jobb Analyse (SJA) i Norge. Returner KUN et gyldig JSON-objekt med feltene: title, task, risikoer (liste med aktivitet, risiko, tiltak), utstyr (liste), tek17Reference, weatherImpact.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                task: { type: 'STRING' },
                risikoer: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      aktivitet: { type: 'STRING' },
                      risiko: { type: 'STRING' },
                      tiltak: { type: 'STRING' }
                    },
                    required: ['aktivitet', 'risiko', 'tiltak']
                  }
                },
                utstyr: { type: 'ARRAY', items: { type: 'STRING' } },
                tek17Reference: { type: 'STRING' },
                weatherImpact: { type: 'STRING' }
              },
              required: ['title', 'task', 'risikoer', 'utstyr', 'tek17Reference', 'weatherImpact']
            }
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI Request timed out')), 10000))
      ]) as any;

      const promptTokens = aiResponse.usageMetadata?.promptTokenCount || 350;
      const completionTokens = aiResponse.usageMetadata?.candidatesTokenCount || 250;
      trackTokenCost({
        model: 'gemini-2.5-flash',
        promptTokens,
        completionTokens,
        operation: 'sja_generation',
        notes: `SJA generated for task: ${taskDescription.slice(0, 50)}`
      }).catch(() => {});

      const text = aiResponse.text || '{}';
      await setCachedAiResponse(cacheKey, text, 'gemini-2.5-flash');
      return {
        success: true,
        data: JSON.parse(text),
        source: 'gemini_2.5_flash',
        tokensUsed: null
      };
    } catch (gErr: any) {
      console.warn('Gemini SJA generation error, trying fallback:', gErr.message);
    }
  }

  // 4. Fallback to DeepSeek
  if (deepseekKey) {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`
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
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (res.ok) {
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
  }

  throw new Error('Ingen AI-nøkkel konfigurert for SJA-generering.');
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
