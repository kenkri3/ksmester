import { GoogleGenAI } from '@google/genai';
import { trackTokenCost } from './costTracker';

export interface AiImageAttachment {
  data?: string; // base64
  mimeType?: string;
  url?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

export interface GenerateAiOptions {
  prompt?: string;
  contents?: any;
  model?: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  images?: AiImageAttachment[];
  inlineData?: { data: string; mimeType: string };
  operation?: string;
  webSearch?: boolean;
  companyId?: string;
  companyName?: string;
  projectId?: string;
  notes?: string;
}

export interface AiEngineResult {
  text: string;
  source: '1min.ai' | 'gemini_backup' | 'deepseek_backup';
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Henter 1min.AI API-nøkkel fra Railway eller lokale miljøvariabler.
 * Håndterer syntaksen '1_MIN_AI' (starter med siffer) samt vanlige aliaser.
 */
export function get1MinAiKey(): string | null {
  const env = process.env as Record<string, string | undefined>;
  return (
    env['1_MIN_AI'] ||
    env['ONE_MIN_AI'] ||
    env['ONE_MIN_AI_KEY'] ||
    env['1MIN_AI'] ||
    null
  );
}

/**
 * Henter Google Gemini API-nøkkel (brukt som backup/sikkerhetsnett).
 */
export function getGeminiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    null
  );
}

/**
 * Henter DeepSeek API-nøkkel (tertiær backup).
 */
export function getDeepSeekKey(): string | null {
  return process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY || null;
}

/**
 * Intelligent modellruter (Kvalitet vs. Tokenkostnad).
 * Ruter oppgaver automatisk til den mest kostnadseffektive modellen uten kvalitetstap:
 * - Rutine/Byggedagbok: gpt-4o-mini (ekstremt billig, lynrask)
 * - NS 8406 / Juridisk: claude-3-5-sonnet (norgesledende presisjon på entrepriserett)
 * - SEO: claude-3-5-sonnet / gpt-4o-mini (høy E-E-A-T faglig autoritet)
 * - SJA: gemini-2.5-flash / gpt-4o-mini (strukturert JSON)
 * - Vision: gemini-2.5-flash / gpt-4o-mini
 */
export function resolveOptimalModel(operation?: string, requestedModel?: string): { oneMinModel: string; geminiModel: string } {
  const op = (operation || '').toLowerCase();

  // Hvis eksplisitt modell er bedt om og ikke er ren gemini-intern streng:
  if (requestedModel && !requestedModel.startsWith('gemini')) {
    return {
      oneMinModel: requestedModel,
      geminiModel: 'gemini-2.5-flash'
    };
  }

  // 1. MesterAI Samtalepartner, Rådgivning, Tilbud & Kalkyle -> Claude 3.5 Sonnet / GPT-4o
  if (op.includes('conversation') || op.includes('advisor') || op.includes('consultation') || op.includes('chat') || op.includes('offer') || op.includes('tilbud') || op.includes('kalkyle')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_CHAT_MODEL || 'claude-3-5-sonnet',
      geminiModel: 'gemini-2.5-flash'
    };
  }

  // 2. Juridisk, NS 8406, Endringsordrer, Kontrakt -> Claude 3.5 Sonnet
  if (op.includes('change_order') || op.includes('contract') || op.includes('legal') || op.includes('ns8406') || op.includes('varsel')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_LEGAL_MODEL || 'claude-3-5-sonnet',
      geminiModel: 'gemini-2.5-flash'
    };
  }

  // 2. SEO & Faglige artikler -> Claude 3.5 Sonnet
  if (op.includes('seo') || op.includes('article')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_SEO_MODEL || 'claude-3-5-sonnet',
      geminiModel: 'gemini-2.5-flash'
    };
  }

  // 3. SJA (Sikker Jobb Analyse) -> Gemini 2.5 Flash eller GPT-4o-mini
  if (op.includes('sja')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_SJA_MODEL || 'gemini-2.5-flash',
      geminiModel: 'gemini-2.5-flash'
    };
  }

  // 4. Bildeanalyse / TEK17 Vision -> Gemini 2.5 Flash
  if (op.includes('vision') || op.includes('image')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_VISION_MODEL || 'gemini-2.5-flash',
      geminiModel: 'gemini-2.5-flash'
    };
  }

  // 5. Standard / Byggedagbok / Oversettelse / Generelt -> GPT-4o-mini (minimal creditkostnad)
  return {
    oneMinModel: process.env.ONE_MIN_AI_DEFAULT_MODEL || 'gpt-4o-mini',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  };
}

/**
 * Laster opp et bilde til 1min.AI Asset API slik at det kan brukes i Chat with AI API.
 */
async function uploadAssetTo1MinAi(apiKey: string, base64Data: string, mimeType = 'image/jpeg'): Promise<string | null> {
  try {
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const ext = mimeType.split('/')[1] || 'jpg';
    const filename = `upload-${Date.now()}.${ext}`;

    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('asset', blob, filename);

    const res = await fetch('https://api.1min.ai/api/assets', {
      method: 'POST',
      headers: {
        'API-KEY': apiKey
      },
      body: formData,
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      console.warn(`[1min.AI Asset Upload] Feilet med HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const assetKey = data.asset?.key || data.fileContent?.path;
    return assetKey || null;
  } catch (err: any) {
    console.warn('[1min.AI Asset Upload] Feil ved opplasting:', err.message);
    return null;
  }
}

/**
 * Kaller 1min.AI Unified Chat API.
 */
async function call1MinAi(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string,
  assetKeys: string[] = [],
  webSearch = false,
  forceJson = false
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  let combinedPrompt = prompt;

  if (systemInstruction) {
    combinedPrompt = `[SYSTEM INSTRUKSJON]:\n${systemInstruction}\n\n[BRUKER HENVENDELSE]:\n${prompt}`;
  }

  if (forceJson && !combinedPrompt.includes('Returner KUN et gyldig JSON-objekt') && !combinedPrompt.includes('JSON')) {
    combinedPrompt += '\n\nVennligst returner svaret som et gyldig, rent JSON-objekt uten markdown backticks.';
  }

  const promptObject: Record<string, any> = {
    prompt: combinedPrompt
  };

  if (webSearch) {
    promptObject.settings = {
      webSearchSettings: {
        webSearch: true,
        numOfSite: 3,
        maxWord: 1000
      }
    };
  }

  if (assetKeys.length > 0) {
    promptObject.attachments = {
      images: assetKeys
    };
  }

  const payload = {
    type: 'UNIFY_CHAT_WITH_AI',
    model,
    promptObject
  };

  const res = await fetch('https://api.1min.ai/api/chat-with-ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-KEY': apiKey
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000)
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`1min.AI API feilet med HTTP ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const json = await res.json();
  const detail = json.aiRecord?.aiRecordDetail;
  let textResult = '';

  if (detail?.resultObject) {
    if (Array.isArray(detail.resultObject)) {
      textResult = detail.resultObject.join('');
    } else if (typeof detail.resultObject === 'string') {
      textResult = detail.resultObject;
    } else {
      textResult = JSON.stringify(detail.resultObject);
    }
  } else if (typeof json.text === 'string') {
    textResult = json.text;
  } else if (typeof json.result === 'string') {
    textResult = json.result;
  }

  const promptTokens = Math.round(combinedPrompt.length / 4);
  const completionTokens = Math.round((textResult || '').length / 4);

  return {
    text: textResult,
    promptTokens: Math.max(promptTokens, 50),
    completionTokens: Math.max(completionTokens, 20)
  };
}

/**
 * Backup-kall direkte til Google Gemini API (@google/genai).
 */
async function callGeminiBackup(
  geminiKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string,
  images?: AiImageAttachment[],
  responseMimeType?: string,
  responseSchema?: any
): Promise<{ text: string; promptTokens: number; completionTokens: number; executedModel: string }> {
  const ai = new GoogleGenAI({ apiKey: geminiKey });

  const candidateModels = [
    model,
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ].filter(Boolean) as string[];

  const uniqueModels = Array.from(new Set(candidateModels));

  let finalContents: any = prompt;

  if (images && images.length > 0) {
    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });

    for (const img of images) {
      if (img.inlineData) {
        parts.push(img);
      } else if (img.data && img.mimeType) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data.includes(',') ? img.data.split(',')[1] : img.data
          }
        });
      } else if (typeof img === 'string' && (img as string).startsWith('data:')) {
        const match = (img as string).match(/^data:(image\/\w+);base64,(.+)$/);
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

  let lastError: any = null;
  for (const cand of uniqueModels) {
    try {
      const generatePromise = ai.models.generateContent({
        model: cand,
        contents: finalContents,
        config: Object.keys(config).length > 0 ? config : undefined
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout på ${cand} etter 25s`)), 25000)
      );

      const res: any = await Promise.race([generatePromise, timeoutPromise]);

      if (res && res.text) {
        const promptTokens = res.usageMetadata?.promptTokenCount || Math.round(prompt.length / 4);
        const completionTokens = res.usageMetadata?.candidatesTokenCount || Math.round(res.text.length / 4);

        return {
          text: res.text,
          promptTokens,
          completionTokens,
          executedModel: cand
        };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Backup] Modell ${cand} feilet (${err.message}), prøver neste...`);
    }
  }

  throw new Error(`Gemini backup feilet for alle modeller: ${lastError?.message || 'Ukjent feil'}`);
}

/**
 * Tertiær backup til DeepSeek API.
 */
async function callDeepSeekBackup(
  deepseekKey: string,
  prompt: string,
  systemInstruction?: string,
  forceJson = false
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const body: any = {
    model: 'deepseek-chat',
    messages,
    temperature: 0.2
  };
  if (forceJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekKey}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) {
    throw new Error(`DeepSeek feilet med HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const promptTokens = data.usage?.prompt_tokens || Math.round(prompt.length / 4);
  const completionTokens = data.usage?.completion_tokens || Math.round(text.length / 4);

  return { text, promptTokens, completionTokens };
}

/**
 * HOVEDFUNKSJON: generateWithAiEngine
 * Prioriterer 1_MIN_AI som hovedmotor med automatisk failover til Gemini API backup.
 */
export async function generateWithAiEngine(options: GenerateAiOptions): Promise<AiEngineResult> {
  const oneMinKey = get1MinAiKey();
  const geminiKey = getGeminiKey();
  const deepseekKey = getDeepSeekKey();

  if (!oneMinKey && !geminiKey && !deepseekKey) {
    throw new Error('Ingen AI-nøkkel (verken 1_MIN_AI eller GEMINI_API_KEY) er konfigurert på serveren.');
  }

  const promptText = typeof options.prompt === 'string'
    ? options.prompt
    : (typeof options.contents === 'string' ? options.contents : JSON.stringify(options.contents || ''));

  const { oneMinModel, geminiModel } = resolveOptimalModel(options.operation, options.model);
  const isJsonExpected = options.responseMimeType === 'application/json' || !!options.responseSchema;

  // Samle eventuelle bilder
  const imagesToProcess: AiImageAttachment[] = [];
  if (options.images && Array.isArray(options.images)) {
    imagesToProcess.push(...options.images);
  }
  if (options.inlineData) {
    imagesToProcess.push({ inlineData: options.inlineData });
  }

  // ==========================================================================
  // 1. PRIMÆRMOTOR: 1_MIN_AI
  // ==========================================================================
  if (oneMinKey) {
    try {
      const assetKeys: string[] = [];

      // Hvis forespørselen har bilder, last opp til 1min.AI Asset API
      if (imagesToProcess.length > 0) {
        for (const img of imagesToProcess) {
          const rawBase64 = img.inlineData?.data || img.data;
          const mime = img.inlineData?.mimeType || img.mimeType || 'image/jpeg';
          if (rawBase64) {
            const key = await uploadAssetTo1MinAi(oneMinKey, rawBase64, mime);
            if (key) assetKeys.push(key);
          }
        }
      }

      const res = await call1MinAi(
        oneMinKey,
        oneMinModel,
        promptText,
        options.systemInstruction,
        assetKeys,
        options.webSearch || false,
        isJsonExpected
      );

      if (res.text && res.text.trim().length > 0) {
        trackTokenCost({
          model: oneMinModel,
          promptTokens: res.promptTokens,
          completionTokens: res.completionTokens,
          operation: options.operation || 'ai_generate',
          companyId: options.companyId,
          companyName: options.companyName,
          projectId: options.projectId,
          notes: options.notes || `1min.ai request (${oneMinModel})`,
          service: '1min.ai'
        }).catch(() => {});

        return {
          text: res.text,
          source: '1min.ai',
          model: oneMinModel,
          usage: {
            promptTokens: res.promptTokens,
            completionTokens: res.completionTokens,
            totalTokens: res.promptTokens + res.completionTokens
          }
        };
      }
    } catch (err: any) {
      console.warn(`[AI Engine] 1min.AI feilet eller utilgjengelig (${err.message}). Kobler over til Gemini backup...`);
    }
  }

  // ==========================================================================
  // 2. SIKKERHETSNETT / BACKUP: Google Gemini API
  // ==========================================================================
  if (geminiKey) {
    try {
      const res = await callGeminiBackup(
        geminiKey,
        geminiModel,
        promptText,
        options.systemInstruction,
        imagesToProcess,
        options.responseMimeType,
        options.responseSchema
      );

      trackTokenCost({
        model: res.executedModel,
        promptTokens: res.promptTokens,
        completionTokens: res.completionTokens,
        operation: options.operation || 'ai_generate_backup',
        companyId: options.companyId,
        companyName: options.companyName,
        projectId: options.projectId,
        notes: options.notes || `Gemini backup request (${res.executedModel})`,
        service: 'gemini'
      }).catch(() => {});

      return {
        text: res.text,
        source: 'gemini_backup',
        model: res.executedModel,
        usage: {
          promptTokens: res.promptTokens,
          completionTokens: res.completionTokens,
          totalTokens: res.promptTokens + res.completionTokens
        }
      };
    } catch (gErr: any) {
      console.warn(`[AI Engine] Gemini backup feilet (${gErr.message}).`);
    }
  }

  // ==========================================================================
  // 3. TERTIÆR BACKUP: DeepSeek API
  // ==========================================================================
  if (deepseekKey) {
    try {
      const res = await callDeepSeekBackup(
        deepseekKey,
        promptText,
        options.systemInstruction,
        isJsonExpected
      );

      trackTokenCost({
        model: 'deepseek-chat',
        promptTokens: res.promptTokens,
        completionTokens: res.completionTokens,
        operation: options.operation || 'ai_generate_deepseek',
        companyId: options.companyId,
        companyName: options.companyName,
        projectId: options.projectId,
        notes: options.notes || `DeepSeek tertiary backup`,
        service: 'gemini'
      }).catch(() => {});

      return {
        text: res.text,
        source: 'deepseek_backup',
        model: 'deepseek-chat',
        usage: {
          promptTokens: res.promptTokens,
          completionTokens: res.completionTokens,
          totalTokens: res.promptTokens + res.completionTokens
        }
      };
    } catch (dErr: any) {
      console.warn(`[AI Engine] DeepSeek backup feilet (${dErr.message}).`);
    }
  }

  throw new Error('Alle AI-motorer (1min.AI, Gemini backup og DeepSeek) feilet eller er utilgjengelige.');
}

/**
 * Hjelpefunksjon for å vaske JSON-respons fra eventuelle markdown-omslag.
 */
export function cleanAiJson(rawText: string): string {
  let cleaned = (rawText || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}
