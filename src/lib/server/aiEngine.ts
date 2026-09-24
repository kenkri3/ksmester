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
  apiKey?: string;
}

export interface AiEngineResult {
  text: string;
  source: '1min.ai' | 'gemini_backup' | 'deepseek_backup' | 'deepseek_direct' | 'openrouter';
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
  const key =
    env['1_MIN_AI'] ||
    env['ONE_MIN_AI'] ||
    env['ONE_MIN_AI_KEY'] ||
    env['ONE_MIN_AI_API_KEY'] ||
    env['1MIN_AI'] ||
    env['ONEMIN_AI'] ||
    env['ONEMIN_AI_KEY'] ||
    env['ONEMINAI_API_KEY'] ||
    env['1_min_ai'] ||
    env['one_min_ai'] ||
    null;
  return key ? key.trim() : null;
}

/**
 * Henter Google Gemini API-nøkkel (brukt som backup/sikkerhetsnett).
 */
export function getGeminiKey(): string | null {
  const env = process.env as Record<string, string | undefined>;
  const key =
    env.GEMINI_API_KEY ||
    env.GOOGLE_API_KEY ||
    env.GOOGLE_GENAI_API_KEY ||
    env.GEMINI_KEY ||
    env.GOOGLE_AI_KEY ||
    null;
  return key ? key.trim() : null;
}

/**
 * Henter eventuell lagret AI-nøkkel fra databasen (items_store / integrations)
 * dersom miljøvariabel mangler i runtime-miljøet.
 */
export async function getStoredAiKey(type: '1min.ai' | 'gemini' | 'deepseek' | 'openrouter'): Promise<string | null> {
  try {
    const { getCollectionItems } = await import('./db');
    const items = await getCollectionItems('integrations');
    if (!Array.isArray(items)) return null;

    if (type === '1min.ai') {
      const match = items.find((i: any) => 
        (i.service === '1min.ai' || i.service === '1min_ai' || i.service === '1min') && 
        (i.secretToken || i.apiKey || i.token)
      );
      if (match?.secretToken || match?.apiKey || match?.token) {
        return String(match.secretToken || match.apiKey || match.token).trim();
      }
    } else if (type === 'gemini') {
      const match = items.find((i: any) => 
        (i.service === 'gemini' || i.service === 'google_gemini') && 
        (i.secretToken || i.apiKey || i.token)
      );
      if (match?.secretToken || match?.apiKey || match?.token) {
        return String(match.secretToken || match.apiKey || match.token).trim();
      }
    } else if (type === 'deepseek') {
      const match = items.find((i: any) => 
        (i.service === 'deepseek' || i.service === 'deep_seek' || i.service === 'deepseek_api') && 
        (i.secretToken || i.apiKey || i.token)
      );
      if (match?.secretToken || match?.apiKey || match?.token) {
        return String(match.secretToken || match.apiKey || match.token).trim();
      }
    } else if (type === 'openrouter') {
      const match = items.find((i: any) => 
        (i.service === 'openrouter' || i.service === 'open_router') && 
        (i.secretToken || i.apiKey || i.token)
      );
      if (match?.secretToken || match?.apiKey || match?.token) {
        return String(match.secretToken || match.apiKey || match.token).trim();
      }
    }
  } catch {}
  return null;
}

/**
 * Henter DeepSeek API-nøkkel.
 */
export function getDeepSeekKey(): string | null {
  const env = process.env as Record<string, string | undefined>;
  const key =
    env.DEEPSEEK_API_KEY || 
    env.DEEP_SEEK_API || 
    env.DEEP_SEEK_API_KEY || 
    env.DEEPSEEK_KEY || 
    env.deepseek_api_key ||
    null;
  return key ? key.trim() : null;
}

/**
 * Henter OpenRouter API-nøkkel.
 */
export function getOpenRouterKey(): string | null {
  const env = process.env as Record<string, string | undefined>;
  const key =
    env.OPENROUTER_API_KEY ||
    env.OPENROUTER_KEY ||
    env.OPEN_ROUTER_API_KEY ||
    env.OPEN_ROUTER_KEY ||
    null;
  return key ? key.trim() : null;
}

/**
 * Intelligent modellruter (Kvalitet vs. Tokenkostnad).
 * Ruter oppgaver automatisk til de nyeste 2026-flaggskipmodellene:
 * - Nettsøk: Gemini 3.8 Flash (med Google Search Grounding) / gpt-4o
 * - Tekst / Rådgivning / Kalkyle / KS: DeepSeek-Flash (deepseek-flash / deepseek-chat)
 * - Kompleks resonnering / NS 8406 tvist: DeepSeek-V4 Pro (deepseek-v4-pro / deepseek-reasoner) / Claude 3.7 Sonnet / o3-mini
 * - SEO & E-E-A-T fagartikler: Claude 3.7 Sonnet (claude-3-7-sonnet) / DeepSeek-Flash
 * - SJA: DeepSeek-Flash / Gemini 3.8 Flash
 * - Vision / Bildeanalyse: Gemini 3.8 Flash (med fallback til gemini-3.5-flash / gemini-2.5-flash)
 */
export function resolveOptimalModel(
  operation?: string,
  requestedModel?: string,
  webSearch = false
): { oneMinModel: string; geminiModel: string; deepseekModel: string } {
  const op = (operation || '').toLowerCase();

  // Hvis webSearch er aktivert:
  if (webSearch) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_SEARCH_MODEL || 'gpt-4o',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      deepseekModel: 'deepseek-flash'
    };
  }

  // Hvis eksplisitt modell er bedt om:
  if (requestedModel) {
    const reqLower = requestedModel.toLowerCase();
    if (reqLower.includes('reasoner') || reqLower.includes('r1') || reqLower.includes('pro')) {
      return {
        oneMinModel: 'claude-3-7-sonnet',
        geminiModel: 'gemini-3.1-pro-preview',
        deepseekModel: 'deepseek-v4-pro'
      };
    }
    if (reqLower.includes('deepseek')) {
      return {
        oneMinModel: 'gpt-4o',
        geminiModel: 'gemini-3.8-flash',
        deepseekModel: 'deepseek-flash'
      };
    }
    if (reqLower.startsWith('gemini')) {
      return {
        oneMinModel: 'gpt-4o',
        geminiModel: requestedModel,
        deepseekModel: 'deepseek-flash'
      };
    }
    return {
      oneMinModel: requestedModel,
      geminiModel: 'gemini-3.8-flash',
      deepseekModel: 'deepseek-flash'
    };
  }

  // 1. MesterAI Samtalepartner, Rådgivning, Tilbud & Kalkyle -> DeepSeek-Flash (med Claude 3.7 Sonnet / Gemini 3.8 Flash)
  if (op.includes('conversation') || op.includes('advisor') || op.includes('consultation') || op.includes('chat') || op.includes('offer') || op.includes('tilbud') || op.includes('kalkyle')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_CHAT_MODEL || 'claude-3-7-sonnet',
      geminiModel: 'gemini-3.8-flash',
      deepseekModel: 'deepseek-flash'
    };
  }

  // 2. Juridisk, NS 8406, Tvister, Endringsordrer, Kontrakt -> DeepSeek-V4-Pro / Claude 3.7 Sonnet / Gemini 3.1 Pro
  if (op.includes('change_order') || op.includes('contract') || op.includes('legal') || op.includes('ns8406') || op.includes('varsel') || op.includes('tvist') || op.includes('dispute')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_LEGAL_MODEL || 'claude-3-7-sonnet',
      geminiModel: 'gemini-3.1-pro-preview',
      deepseekModel: 'deepseek-v4-pro'
    };
  }

  // 3. SEO & Faglige artikler -> Claude 3.7 Sonnet / DeepSeek-Flash
  if (op.includes('seo') || op.includes('article')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_SEO_MODEL || 'claude-3-7-sonnet',
      geminiModel: 'gemini-3.8-flash',
      deepseekModel: 'deepseek-flash'
    };
  }

  // 4. SJA (Sikker Jobb Analyse) -> DeepSeek-Flash / Gemini 3.8 Flash
  if (op.includes('sja')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_SJA_MODEL || 'gemini-3.8-flash',
      geminiModel: 'gemini-3.8-flash',
      deepseekModel: 'deepseek-flash'
    };
  }

  // 5. Bildeanalyse / TEK17 Vision / Skanning -> Gemini 3.8 Flash
  if (op.includes('vision') || op.includes('image') || op.includes('bilde') || op.includes('foto') || op.includes('scan')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_VISION_MODEL || 'gemini-3.8-flash',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      deepseekModel: 'deepseek-flash'
    };
  }

  // 6. Standard / Byggedagbok / Oversettelse / Generelt -> DeepSeek-Flash / Gemini 3.8 Flash
  return {
    oneMinModel: process.env.ONE_MIN_AI_DEFAULT_MODEL || 'claude-3-7-sonnet',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    deepseekModel: 'deepseek-flash'
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
  // 1min.AI krever OpenAI-modeller for webSearchSettings
  const effectiveModel = webSearch
    ? (model.startsWith('gpt-') ? model : (process.env.ONE_MIN_AI_SEARCH_MODEL || 'gpt-4o-mini'))
    : model;

  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('no-NO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Oslo'
  }).format(now);
  const timeStr = new Intl.DateTimeFormat('no-NO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Oslo'
  }).format(now);
  const currentYear = now.getFullYear();
  const currentMonth = new Intl.DateTimeFormat('no-NO', { month: 'long', timeZone: 'Europe/Oslo' }).format(now);
  const dateContext = `Dagens reelle dato er ${dateStr} (kl. ${timeStr}, ${currentYear}). Det er ${currentMonth} (${currentYear}, høst), IKKE 17. mai.`;

  let combinedPrompt = prompt;

  if (webSearch) {
    // VIKTIG FOR NETTSØK: Brukerens konkrete spørsmål og dagens sanntidsdato må ligge øverst i prompten,
    // slik at 1min.ai sin søkemotor forstår eksakt hva den skal søke etter (f.eks. for i dag / september 2026).
    // Systeminstruksjoner og føringer legges under for ikke å forurense søkemotoren.
    combinedPrompt = `${prompt}\n\n[DATO & TID I SANNTID]: ${dateContext}\n\n[INSTRUKS FOR SVAR]: Svar utfyllende og dagsaktuelt for ${dateStr} på naturlig norsk, og referer gjerne til kildene fra nettsøket.${systemInstruction ? `\n\n[SYSTEMFØRINGER]:\n${systemInstruction}` : ''}`;
  } else if (systemInstruction) {
    combinedPrompt = `[SYSTEM INSTRUKSJON - DATO: ${dateContext}]:\n${systemInstruction}\n\n[BRUKER HENVENDELSE]:\n${prompt}`;
  } else {
    combinedPrompt = `[DATO: ${dateContext}]\n\n${prompt}`;
  }

  if (forceJson && !combinedPrompt.includes('Returner KUN et gyldig JSON-objekt') && !combinedPrompt.includes('JSON')) {
    combinedPrompt += '\n\nVennligst returner svaret som et gyldig, rent JSON-objekt uten markdown backticks.';
  }

  const promptObject: Record<string, any> = {
    prompt: combinedPrompt
  };

  if (webSearch) {
    promptObject.webSearch = true;
    promptObject.settings = {
      webSearchSettings: {
        webSearch: true,
        numOfSite: 5,
        maxWord: 1500
      }
    };
  }

  if (assetKeys.length > 0) {
    promptObject.attachments = {
      images: assetKeys
    };
  }

  const candidateModels = [
    effectiveModel,
    'claude-3-7-sonnet',
    'gemini-3.8-flash',
    'o3-mini',
    'gpt-4o',
    'gpt-4o-mini'
  ].filter(Boolean);
  const uniqueCandidateModels = Array.from(new Set(candidateModels));

  let lastError: any = null;
  let textResult = '';
  let lastDetail: any = null;
  let lastJson: any = null;

  for (const candModel of uniqueCandidateModels) {
    try {
      const payload = {
        type: 'UNIFY_CHAT_WITH_AI',
        model: candModel,
        promptObject
      };

      const res = await fetch('https://api.1min.ai/api/chat-with-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-KEY': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(35000)
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn(`[1min.AI] Modell ${candModel} feilet med HTTP ${res.status}: ${errBody.slice(0, 200)}, prøver neste modell...`);
        lastError = new Error(`1min.AI API feilet med HTTP ${res.status}: ${errBody.slice(0, 200)}`);
        continue;
      }

      const json = await res.json();
      lastJson = json;
      const detail = json.aiRecord?.aiRecordDetail;
      lastDetail = detail;

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
      } else if (json.data?.text) {
        textResult = json.data.text;
      } else if (json.message && typeof json.message === 'string') {
        textResult = json.message;
      }

      if (textResult && textResult.trim().length > 0) {
        break;
      }
    } catch (candErr: any) {
      lastError = candErr;
      console.warn(`[1min.AI] Feil under kall med ${candModel}: ${candErr.message}`);
    }
  }

  if (!textResult || textResult.trim().length === 0) {
    throw lastError || new Error('1min.AI returnerte tomt svar for alle testede modeller');
  }

  // Hent og formater kilder hvis nettsøk ble utført
  if (webSearch && textResult) {
    const searchList = lastDetail?.searchContentList || lastDetail?.linkContentList || lastJson?.searchContentList;
    if (Array.isArray(searchList) && searchList.length > 0) {
      const sourceLinks = searchList
        .map((s: any) => {
          const title = s.title || s.name || s.url;
          const url = s.url || s.link;
          return url ? `- [${title}](${url})` : null;
        })
        .filter(Boolean);
      const uniqueLinks = Array.from(new Set(sourceLinks));
      if (uniqueLinks.length > 0 && !textResult.includes(uniqueLinks[0] as string)) {
        textResult += `\n\n🌐 **Kilder fra nettsøk:**\n${uniqueLinks.slice(0, 5).join('\n')}`;
      }
    }
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
  responseSchema?: any,
  webSearch = false
): Promise<{ text: string; promptTokens: number; completionTokens: number; executedModel: string }> {
  const ai = new GoogleGenAI({ apiKey: geminiKey });

  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('no-NO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Oslo'
  }).format(now);
  const timeStr = new Intl.DateTimeFormat('no-NO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Oslo'
  }).format(now);
  const currentYear = now.getFullYear();
  const currentMonth = new Intl.DateTimeFormat('no-NO', { month: 'long', timeZone: 'Europe/Oslo' }).format(now);
  const dateContext = `Dagens reelle dato er ${dateStr} (kl. ${timeStr}, ${currentYear}). Måneden er ${currentMonth} (${currentYear}, høst), IKKE mai eller 17. mai.`;

  // Kun gyldige Gemini-modeller (prioriter nyeste Gemini 3.8 / 3.5 / 3.1 Pro)
  const candidateModels = [
    model && model.startsWith('gemini') ? model : null,
    process.env.GEMINI_MODEL,
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ].filter(Boolean) as string[];

  const uniqueModels = Array.from(new Set(candidateModels));

  let effectivePrompt = prompt;
  if (webSearch && !effectivePrompt.includes(dateStr)) {
    effectivePrompt = `${prompt}\n\n[DATO & TID I SANNTID]: ${dateContext}`;
  }

  let finalContents: any = effectivePrompt;

  if (images && images.length > 0) {
    const parts: any[] = [];
    if (effectivePrompt) parts.push({ text: effectivePrompt });

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
  const fullSystemInstruction = systemInstruction
    ? `${systemInstruction}\n\n[DATO & TID I SANNTID]: ${dateContext}`
    : `[DATO & TID I SANNTID]: ${dateContext}`;

  config.systemInstruction = fullSystemInstruction;
  if (responseMimeType) config.responseMimeType = responseMimeType;
  if (responseSchema) config.responseSchema = responseSchema;
  if (webSearch && !responseSchema) {
    config.tools = [{ googleSearch: {} }];
  }

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
        let finalText = res.text;

        // Trekk ut kilder fra Google Search grounding hvis tilgjengelig
        const metadata = res.candidates?.[0]?.groundingMetadata;
        if (metadata?.groundingChunks && Array.isArray(metadata.groundingChunks)) {
          const sources: string[] = [];
          for (const chunk of metadata.groundingChunks) {
            if (chunk.web?.title && chunk.web?.uri) {
              sources.push(`- [${chunk.web.title}](${chunk.web.uri})`);
            } else if (chunk.web?.uri) {
              sources.push(`- [${chunk.web.uri}](${chunk.web.uri})`);
            }
          }
          const uniqueSources = Array.from(new Set(sources));
          if (uniqueSources.length > 0 && !finalText.includes(uniqueSources[0])) {
            finalText += `\n\n🌐 **Kilder fra Google Search:**\n${uniqueSources.slice(0, 5).join('\n')}`;
          }
        }

        const promptTokens = res.usageMetadata?.promptTokenCount || Math.round(prompt.length / 4);
        const completionTokens = res.usageMetadata?.candidatesTokenCount || Math.round(finalText.length / 4);

        return {
          text: finalText,
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
 * Direkte anrop til DeepSeek API (deepseek-flash / deepseek-v4-pro med fallback til deepseek-chat / deepseek-reasoner).
 */
async function callDeepSeekDirect(
  deepseekKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string,
  forceJson = false
): Promise<{ text: string; promptTokens: number; completionTokens: number; executedModel: string }> {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('no-NO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Oslo'
  }).format(now);
  const timeStr = new Intl.DateTimeFormat('no-NO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Oslo'
  }).format(now);
  const currentYear = now.getFullYear();
  const currentMonth = new Intl.DateTimeFormat('no-NO', { month: 'long', timeZone: 'Europe/Oslo' }).format(now);
  const dateContext = `Dagens reelle dato er ${dateStr} (kl. ${timeStr}, ${currentYear}). Det er ${currentMonth} (${currentYear}, høst).`;

  const fullSystemInstruction = systemInstruction
    ? `${systemInstruction}\n\n[DATO & TID I SANNTID]: ${dateContext}`
    : `[DATO & TID I SANNTID]: ${dateContext}`;

  const messages: any[] = [];
  messages.push({ role: 'system', content: fullSystemInstruction });
  messages.push({ role: 'user', content: prompt });

  const isReasoner = !forceJson && (model?.includes('reasoner') || model?.includes('r1') || model?.includes('pro'));

  const candidateModels = isReasoner
    ? ['deepseek-v4-pro', 'deepseek-reasoner', 'deepseek-flash', 'deepseek-chat']
    : ['deepseek-flash', 'deepseek-chat', 'deepseek-v4-pro'];

  let lastError: any = null;
  for (const cand of candidateModels) {
    try {
      const isCandReasoner = cand.includes('reasoner') || cand.includes('pro');
      const body: any = {
        model: cand,
        messages
      };

      if (!isCandReasoner) {
        body.temperature = 0.3;
        if (forceJson) {
          body.response_format = { type: 'json_object' };
        }
      } else {
        body.thinking = { type: 'enabled' };
      }

      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000)
      });

      if (!res.ok) {
        // Hvis thinking-parameter ikke ble akseptert av en eldre gateway, prøv uten
        if (body.thinking) {
          delete body.thinking;
          const retryRes = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${deepseekKey}`
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60000)
          });
          if (retryRes.ok) {
            const data = await retryRes.json();
            const text = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';
            const promptTokens = data.usage?.prompt_tokens || Math.round(prompt.length / 4);
            const completionTokens = data.usage?.completion_tokens || Math.round(text.length / 4);
            return { text, promptTokens, completionTokens, executedModel: cand };
          }
        }
        const errText = await res.text().catch(() => '');
        lastError = new Error(`DeepSeek (${cand}) feilet med HTTP ${res.status}: ${errText.slice(0, 200)}`);
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';
      const promptTokens = data.usage?.prompt_tokens || Math.round(prompt.length / 4);
      const completionTokens = data.usage?.completion_tokens || Math.round(text.length / 4);

      return { text, promptTokens, completionTokens, executedModel: cand };
    } catch (candErr: any) {
      lastError = candErr;
    }
  }

  throw lastError || new Error('DeepSeek API feilet for alle modell-kandidater.');
}

/**
 * Anrop til OpenRouter API (støtter DeepSeek V3/V4, Claude, Llama etc.).
 */
async function callOpenRouter(
  openrouterKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string,
  forceJson = false
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const effectiveModel = model || 'deepseek/deepseek-chat';

  const body: any = {
    model: effectiveModel,
    messages,
    temperature: 0.3
  };
  if (forceJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openrouterKey}`,
      'HTTP-Referer': 'https://vikingmester.no',
      'X-Title': 'VikingMester MesterAI'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter feilet med HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const promptTokens = data.usage?.prompt_tokens || Math.round(prompt.length / 4);
  const completionTokens = data.usage?.completion_tokens || Math.round(text.length / 4);

  return { text, promptTokens, completionTokens };
}

/**
 * HOVEDFUNKSJON: generateWithAiEngine
 * Intelligent flermodell-motor:
 * 1. DeepSeek Direct (DEEPSEEK_API_KEY) er absolutt primærmotor for all tekst, rådgivning, kalkyle, KS, SJA og jus.
 * 2. Google Gemini er primærmotor for bildeanalyse (multimodal vision) og Google Search Grounding.
 * 3. 1min.AI, Gemini og OpenRouter fungerer som automatiske feiltolerante sikkerhetsnett.
 */
export async function generateWithAiEngine(options: GenerateAiOptions): Promise<AiEngineResult> {
  let oneMinKey = options.apiKey || get1MinAiKey();
  let geminiKey = getGeminiKey();
  let deepseekKey = getDeepSeekKey();
  let openrouterKey = getOpenRouterKey();

  if (!oneMinKey) {
    oneMinKey = await getStoredAiKey('1min.ai');
  }
  if (!geminiKey) {
    geminiKey = await getStoredAiKey('gemini');
  }
  if (!deepseekKey) {
    deepseekKey = await getStoredAiKey('deepseek');
  }
  if (!openrouterKey) {
    openrouterKey = await getStoredAiKey('openrouter');
  }

  if (!oneMinKey && !geminiKey && !deepseekKey && !openrouterKey) {
    throw new Error('Ingen AI-nøkkel (verken DEEPSEEK_API_KEY, 1_MIN_AI, GEMINI_API_KEY eller OPENROUTER_API_KEY) er konfigurert på serveren eller i innstillingene.');
  }

  const promptText = typeof options.prompt === 'string'
    ? options.prompt
    : (typeof options.contents === 'string' ? options.contents : JSON.stringify(options.contents || ''));

  // Samle eventuelle bilder
  const imagesToProcess: AiImageAttachment[] = [];
  if (options.images && Array.isArray(options.images)) {
    imagesToProcess.push(...options.images);
  }
  if (options.inlineData) {
    imagesToProcess.push({ inlineData: options.inlineData });
  }

  const isVisionTask = imagesToProcess.length > 0 ||
    Boolean(
      options.operation && (
        options.operation.includes('vision') ||
        options.operation.includes('image') ||
        options.operation.includes('bilde') ||
        options.operation.includes('scan') ||
        options.operation.includes('foto')
      )
    );

  const isWebSearch = Boolean(options.webSearch);
  const isJsonExpected = options.responseMimeType === 'application/json' || Boolean(options.responseSchema);

  const { oneMinModel, geminiModel, deepseekModel } = resolveOptimalModel(options.operation, options.model, isWebSearch);

  // ==========================================================================
  // CASE 1: SYN / BILDEANALYSE (Vision / TEK17 / Foto / Skanning)
  // DeepSeek er en ren tekst-LLM uten synsstøtte.
  // Gemini 2.5 Flash / 1.5 Pro er verdensledende på bildeanalyse og brukes primært her.
  // ==========================================================================
  if (isVisionTask) {
    // 1.1 Primær for bildeanalyse: Google Gemini API
    if (geminiKey) {
      try {
        const res = await callGeminiBackup(
          geminiKey,
          geminiModel,
          promptText,
          options.systemInstruction,
          imagesToProcess,
          options.responseMimeType,
          options.responseSchema,
          false
        );

        trackTokenCost({
          model: res.executedModel,
          promptTokens: res.promptTokens,
          completionTokens: res.completionTokens,
          operation: options.operation || 'ai_generate_vision_gemini',
          companyId: options.companyId,
          companyName: options.companyName,
          projectId: options.projectId,
          notes: options.notes || `Gemini Vision (${res.executedModel})`,
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
        console.warn(`[AI Engine - Vision] Gemini feilet (${gErr.message}), prøver 1min.AI...`);
      }
    }

    // 1.2 Sekundær backup for bildeanalyse: 1min.AI Asset API
    if (oneMinKey) {
      try {
        const assetKeys: string[] = [];
        for (const img of imagesToProcess) {
          const rawBase64 = img.inlineData?.data || img.data;
          const mime = img.inlineData?.mimeType || img.mimeType || 'image/jpeg';
          if (rawBase64) {
            const key = await uploadAssetTo1MinAi(oneMinKey, rawBase64, mime);
            if (key) assetKeys.push(key);
          }
        }

        const res = await call1MinAi(
          oneMinKey,
          oneMinModel,
          promptText,
          options.systemInstruction,
          assetKeys,
          false,
          isJsonExpected
        );

        if (res.text && res.text.trim().length > 0) {
          trackTokenCost({
            model: oneMinModel,
            promptTokens: res.promptTokens,
            completionTokens: res.completionTokens,
            operation: options.operation || 'ai_generate_vision_1min',
            companyId: options.companyId,
            companyName: options.companyName,
            projectId: options.projectId,
            notes: options.notes || `1min.ai Vision (${oneMinModel})`,
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
      } catch (oneMinErr: any) {
        console.warn(`[AI Engine - Vision] 1min.AI feilet (${oneMinErr.message})`);
      }
    }

    throw new Error('Bildeanalyse krever en synsstøttet modell (Google Gemini eller 1min.AI), men ingen var tilgjengelig.');
  }

  // ==========================================================================
  // CASE 2: LIVE NETTSØK (Google Search Grounding)
  // Ved eksplisitt ønske om sanntidsnettsøk brukes Gemini Google Grounding primært.
  // ==========================================================================
  if (isWebSearch) {
    if (geminiKey) {
      try {
        const res = await callGeminiBackup(
          geminiKey,
          geminiModel,
          promptText,
          options.systemInstruction,
          imagesToProcess,
          options.responseMimeType,
          options.responseSchema,
          true
        );

        trackTokenCost({
          model: res.executedModel,
          promptTokens: res.promptTokens,
          completionTokens: res.completionTokens,
          operation: options.operation || 'ai_generate_websearch_gemini',
          companyId: options.companyId,
          companyName: options.companyName,
          projectId: options.projectId,
          notes: options.notes || `Gemini Search Grounding (${res.executedModel})`,
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
        console.warn(`[AI Engine - WebSearch] Gemini Google Grounding feilet (${gErr.message}), prøver 1min/DeepSeek...`);
      }
    }

    if (oneMinKey) {
      try {
        const res = await call1MinAi(
          oneMinKey,
          oneMinModel,
          promptText,
          options.systemInstruction,
          [],
          true,
          isJsonExpected
        );

        if (res.text && res.text.trim().length > 0) {
          trackTokenCost({
            model: oneMinModel,
            promptTokens: res.promptTokens,
            completionTokens: res.completionTokens,
            operation: options.operation || 'ai_generate_websearch_1min',
            companyId: options.companyId,
            companyName: options.companyName,
            projectId: options.projectId,
            notes: options.notes || `1min.ai WebSearch (${oneMinModel})`,
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
      } catch (oneMinErr: any) {
        console.warn(`[AI Engine - WebSearch] 1min.AI feilet (${oneMinErr.message})`);
      }
    }
  }

  // ==========================================================================
  // CASE 3: ALL TEKST / CHAT / KALKYLE / JURIDISK / KS / SJA / BYGGEDAGBOK
  // DEEPSEEK_API_KEY ER NÅ ABSOLUTT PRIMÆRMOTOR
  // ==========================================================================
  if (deepseekKey) {
    try {
      const res = await callDeepSeekDirect(
        deepseekKey,
        deepseekModel,
        promptText,
        options.systemInstruction,
        isJsonExpected
      );

      if (res.text && res.text.trim().length > 0) {
        const usedModel = res.executedModel || deepseekModel;
        trackTokenCost({
          model: usedModel,
          promptTokens: res.promptTokens,
          completionTokens: res.completionTokens,
          operation: options.operation || 'ai_generate_deepseek_primary',
          companyId: options.companyId,
          companyName: options.companyName,
          projectId: options.projectId,
          notes: options.notes || `DeepSeek Primary (${usedModel})`,
          service: 'deepseek'
        }).catch(() => {});

        return {
          text: res.text,
          source: 'deepseek_direct',
          model: usedModel,
          usage: {
            promptTokens: res.promptTokens,
            completionTokens: res.completionTokens,
            totalTokens: res.promptTokens + res.completionTokens
          }
        };
      }
    } catch (dsErr: any) {
      console.warn(`[AI Engine] DeepSeek primærmotor feilet (${dsErr.message}). Kobler over til backup...`);
    }
  }

  // ==========================================================================
  // SEKUNDÆR BACKUP: 1_MIN_AI (hvis DeepSeek feilet eller mangler nøkkel)
  // ==========================================================================
  if (oneMinKey) {
    try {
      const res = await call1MinAi(
        oneMinKey,
        oneMinModel,
        promptText,
        options.systemInstruction,
        [],
        false,
        isJsonExpected
      );

      if (res.text && res.text.trim().length > 0) {
        trackTokenCost({
          model: oneMinModel,
          promptTokens: res.promptTokens,
          completionTokens: res.completionTokens,
          operation: options.operation || 'ai_generate_1min_backup',
          companyId: options.companyId,
          companyName: options.companyName,
          projectId: options.projectId,
          notes: options.notes || `1min.ai backup (${oneMinModel})`,
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
      console.warn(`[AI Engine] 1min.AI backup feilet (${err.message}). Kobler over til Gemini...`);
    }
  }

  // ==========================================================================
  // TERTIÆR BACKUP: Google Gemini API
  // ==========================================================================
  if (geminiKey) {
    try {
      const res = await callGeminiBackup(
        geminiKey,
        geminiModel,
        promptText,
        options.systemInstruction,
        [],
        options.responseMimeType,
        options.responseSchema,
        false
      );

      trackTokenCost({
        model: res.executedModel,
        promptTokens: res.promptTokens,
        completionTokens: res.completionTokens,
        operation: options.operation || 'ai_generate_gemini_backup',
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
  // KVARTER BACKUP: OpenRouter API
  // ==========================================================================
  if (openrouterKey) {
    try {
      const chosenModel = options.model || 'deepseek/deepseek-chat';
      const res = await callOpenRouter(
        openrouterKey,
        chosenModel,
        promptText,
        options.systemInstruction,
        isJsonExpected
      );

      trackTokenCost({
        model: chosenModel,
        promptTokens: res.promptTokens,
        completionTokens: res.completionTokens,
        operation: options.operation || 'ai_generate_openrouter_backup',
        companyId: options.companyId,
        companyName: options.companyName,
        projectId: options.projectId,
        notes: options.notes || `OpenRouter backup (${chosenModel})`,
        service: 'gemini'
      }).catch(() => {});

      return {
        text: res.text,
        source: 'openrouter',
        model: chosenModel,
        usage: {
          promptTokens: res.promptTokens,
          completionTokens: res.completionTokens,
          totalTokens: res.promptTokens + res.completionTokens
        }
      };
    } catch (orErr: any) {
      console.warn(`[AI Engine] OpenRouter backup feilet (${orErr.message}).`);
    }
  }

  throw new Error('Alle AI-motorer (DeepSeek, 1min.AI, Gemini og OpenRouter) feilet eller er utilgjengelige.');
}

/**
 * Hjelpefunksjon for å vaske JSON-respons fra eventuelle markdown-omslag eller ekstra tekst.
 */
export function cleanAiJson(rawText: string): string {
  let cleaned = (rawText || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  cleaned = cleaned.trim();

  // Hvis teksten har omkransende tekst, finn den ytterste JSON-blokken
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return cleaned.slice(firstBrace, lastBrace + 1);
    }
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      return cleaned.slice(firstBracket, lastBracket + 1);
    }
  }
  return cleaned;
}
