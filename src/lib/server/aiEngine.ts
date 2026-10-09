import { GoogleGenAI } from '@google/genai';
import { trackTokenCost, checkCompanyQuota } from './costTracker';
import { containsPIIOrGdprData } from './privacyShield';

export interface AiImageAttachment {
  data?: string; // base64
  mimeType?: string;
  url?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateAiOptions {
  prompt?: string;
  /**
   * 🧠 Strukturert samtalehistorikk med ekte roller. Når denne er satt bruker
   * primærmotoren (DeepSeek) ekte multi-turn-meldinger i stedet for at hele
   * dialogen flates ut til én enkelt user-melding. `prompt` brukes fortsatt som
   * tekst-fallback for sekundærmotorene (1min.AI / Gemini / OpenRouter).
   */
  messages?: AiChatMessage[];
  /**
   * 🌊 Strømming: kalles med hver tekstbit etter hvert som modellen svarer.
   * Når denne er satt strømmes svaret fra DeepSeek i stedet for å ventes på i
   * én blokk. Reservemotorene (1min.AI / Gemini / OpenRouter) strømmer ikke og
   * leverer hele svaret til slutt – det er akseptert.
   */
  onDelta?: (chunk: string) => void;
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
  gdprProtected?: boolean; // 🛡️ Ruter til EU-driftet modell (1min.ai / Claude / Mistral / Gemini EU)
}

export interface AiEngineResult {
  text: string;
  source: '1min.ai' | 'gemini_backup' | 'deepseek_backup' | 'deepseek_direct' | 'deepseek_eu' | 'openrouter';
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
 * Henter Opper API-nøkkel (den europeiske AI-gatewayen).
 *
 * Brukes for all behandling som kan inneholde personopplysninger. Opper er
 * EU-hostet (AWS Stockholm), ISO/IEC 27001-sertifisert og oppgir selv at de ikke
 * lagrer prompt eller svar uten at en data retention-regel slår på tracing.
 *
 * I Railway heter variabelen DEEPSEEK_EU_API fordi den peker på DeepSeek V4.1
 * Flash kjørt i EU. De øvrige navnene er tatt med for lokal kjøring.
 */
export function getOpperKey(): string | null {
  const env = process.env as Record<string, string | undefined>;
  const key =
    env.DEEPSEEK_EU_API ||
    env.OPPER_API_KEY ||
    env.OPPER_KEY ||
    env.OPPER_API ||
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
 * Ruter oppgaver automatisk til de nyeste og skarpeste flaggskipmodellene:
 * - Tekst / Rådgivning / Kalkyle / KS: DeepSeek-V4.1 Flash (deepseek-v4.1-flash / deepseek-v4-flash)
 * - Bildeanalyse / Vision / TEK17 / Nettsøk: Gemini 3.8 Flash (gemini-3.8-flash)
 * - Kompleks resonnering / NS 8406 tvist: DeepSeek-V4 Pro (deepseek-v4-pro / deepseek-reasoner) / o3-mini
 * - GDPR / Personopplysninger / Bilpark: gpt-4o-mini / gemini-3.8-flash / mistral-large
 * - SEO & E-E-A-T fagartikler: gpt-4o / Claude 3.5 Sonnet / deepseek-v4.1-flash
 * - SJA: deepseek-v4.1-flash / gemini-3.8-flash
 */
export function resolveOptimalModel(
  operation?: string,
  requestedModel?: string,
  webSearch = false,
  gdprProtected = false
): { oneMinModel: string; geminiModel: string; deepseekModel: string } {
  const op = (operation || '').toLowerCase();

  // 🛡️ Hvis oppgaven er GDPR-beskyttet (personopplysninger, bilpark, ansatte):
  // Bruker superraske, presise og rimelige modeller via 1min.ai (gpt-4o-mini / mistral-large) eller Gemini 3.8 Flash EU
  if (gdprProtected || op.includes('gdpr') || op.includes('fleet') || op.includes('vehicle') || op.includes('bilpark') || op.includes('employee') || op.includes('hr')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_GDPR_MODEL || 'gpt-4o-mini',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash'
    };
  }

  // Hvis webSearch er aktivert (Gemini 3.8 Flash med Google Search Grounding eller gpt-4o-mini via 1min.ai):
  if (webSearch) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_SEARCH_MODEL || 'gpt-4o-mini',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash'
    };
  }

  // Hvis eksplisitt modell er bedt om:
  if (requestedModel) {
    const reqLower = requestedModel.toLowerCase();
    if (reqLower.includes('reasoner') || reqLower.includes('r1') || reqLower.includes('pro') || reqLower.includes('o3') || reqLower.includes('o1')) {
      return {
        oneMinModel: 'o3-mini',
        geminiModel: 'gemini-3.8-flash',
        deepseekModel: 'deepseek-v4-pro'
      };
    }
    if (reqLower.includes('deepseek')) {
      return {
        oneMinModel: 'gpt-4o-mini',
        geminiModel: 'gemini-3.8-flash',
        deepseekModel: requestedModel
      };
    }
    if (reqLower.startsWith('gemini')) {
      return {
        oneMinModel: 'gemini-2.5-flash',
        geminiModel: requestedModel,
        deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash'
      };
    }
    return {
      oneMinModel: requestedModel,
      geminiModel: 'gemini-3.8-flash',
      deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash'
    };
  }

  // 1. MesterAI Samtalepartner, Rådgivning, Tilbud & Kalkyle -> DeepSeek-V4.1 Flash (med Gemini 3.8 Flash som backup)
  if (op.includes('conversation') || op.includes('advisor') || op.includes('consultation') || op.includes('chat') || op.includes('offer') || op.includes('tilbud') || op.includes('kalkyle')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_CHAT_MODEL || 'gpt-4o-mini',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash'
    };
  }

  // 2. Juridisk, NS 8406, Tvister, Endringsordrer, Kontrakt -> DeepSeek-V4 Pro / o3-mini / Gemini 3.8 Flash
  if (op.includes('change_order') || op.includes('contract') || op.includes('legal') || op.includes('ns8406') || op.includes('varsel') || op.includes('tvist') || op.includes('dispute')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_LEGAL_MODEL || 'o3-mini',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      deepseekModel: 'deepseek-v4-pro'
    };
  }

  // 3. SEO & Faglige artikler -> gpt-4o / Claude 3.5 Sonnet / deepseek-v4.1-flash
  if (op.includes('seo') || op.includes('article')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_SEO_MODEL || 'gpt-4o',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash'
    };
  }

  // 4. SJA (Sikker Jobb Analyse) -> DeepSeek-V4.1 Flash / Gemini 3.8 Flash
  if (op.includes('sja')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_SJA_MODEL || 'gpt-4o-mini',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash'
    };
  }

  // 5. Bildeanalyse / TEK17 Vision / Skanning -> Gemini 3.8 Flash (multimodal spissmodell)
  if (op.includes('vision') || op.includes('image') || op.includes('bilde') || op.includes('foto') || op.includes('scan')) {
    return {
      oneMinModel: process.env.ONE_MIN_AI_VISION_MODEL || 'gpt-4o',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash'
    };
  }

  // 6. Standard / Byggedagbok / Oversettelse / Generelt -> DeepSeek-V4.1 Flash / Gemini 3.8 Flash
  return {
    oneMinModel: process.env.ONE_MIN_AI_DEFAULT_MODEL || 'gpt-4o-mini',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash'
  };
}

/**
 * Laster opp et bilde til 1min.AI Asset API slik at det kan brukes i Chat with AI API.
 */
async function uploadAssetTo1MinAi(apiKey: string, base64Data: string, mimeType = 'image/jpeg'): Promise<string | null> {
  try {
    const cleanBase64 = (base64Data.includes(',') ? base64Data.split(',')[1] : base64Data).replace(/\s+/g, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const ext = mimeType.split('/')[1]?.split(';')[0] || 'jpg';
    const filename = `upload-${Date.now()}.${ext}`;

    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('asset', blob, filename);

    const res = await fetch('https://api.1min.ai/api/assets', {
      method: 'POST',
      headers: {
        'API-KEY': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData,
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      console.warn(`[1min.AI Asset Upload] Feilet med HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const assetKey = data.asset?.key || data.fileContent?.path || data.data?.key || data.key || data.path;
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
    'gpt-4o-mini',
    'claude-3-5-haiku',
    'gemini-2.5-flash',
    'o3-mini',
    'gpt-4o',
    'claude-3-5-sonnet',
    'claude-3-7-sonnet'
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

  // Prioriter Gemini 3.8 Flash som primær modell for bildeanalyse og lynrask multimodal inferens
  const candidateModels = [
    model && model.startsWith('gemini') ? model : null,
    process.env.GEMINI_MODEL,
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
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
        const rawData = img.inlineData.data || '';
        const cleanData = (rawData.includes(',') ? rawData.split(',')[1] : rawData).replace(/\s+/g, '');
        parts.push({
          inlineData: {
            mimeType: img.inlineData.mimeType || 'image/jpeg',
            data: cleanData
          }
        });
      } else if (img.data && img.mimeType) {
        const rawData = img.data || '';
        const cleanData = (rawData.includes(',') ? rawData.split(',')[1] : rawData).replace(/\s+/g, '');
        parts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: cleanData
          }
        });
      } else if (typeof img === 'string') {
        const str = img as string;
        if (str.startsWith('data:')) {
          const commaIdx = str.indexOf(',');
          if (commaIdx !== -1) {
            const header = str.substring(5, commaIdx);
            const mime = header.split(';')[0] || 'image/jpeg';
            const cleanData = str.substring(commaIdx + 1).replace(/\s+/g, '');
            parts.push({
              inlineData: {
                mimeType: mime,
                data: cleanData
              }
            });
          }
        } else if (str.length > 200 && !str.startsWith('http') && !str.startsWith('/')) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: str.replace(/\s+/g, '')
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
 * Direkte anrop til DeepSeek API (deepseek-chat / deepseek-reasoner).
 */
async function callDeepSeekDirect(
  deepseekKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string,
  forceJson = false,
  chatMessages?: AiChatMessage[],
  temperature = 0.3,
  onDelta?: (chunk: string) => void
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

  // 🧠 EKTE MULTI-TURN: Bruk rollebaserte meldinger når kallet har det. Uten
  // dette flates hele dialogen ut til én user-melding, og modellen mister
  // tur/replikk-strukturen (dårligere oppfølging og svakere husk).
  const hasStructuredTurns = Array.isArray(chatMessages) && chatMessages.length > 0;
  // Ved JSON-uttrekk (forceJson) ligger skjemaet i prompten – da må prompten
  // fortsatt sendes, ellers ber vi om JSON uten å si hvilken JSON.
  if (hasStructuredTurns && !forceJson) {
    for (const turn of chatMessages!) {
      if (!turn || typeof turn.content !== 'string' || !turn.content.trim()) continue;
      if (turn.role === 'system') continue; // systemprompten er allerede lagt inn over
      messages.push({ role: turn.role === 'assistant' ? 'assistant' : 'user', content: turn.content });
    }
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const isReasoner = !forceJson && (model?.includes('reasoner') || model?.includes('r1') || model?.includes('pro'));

  const candidateModels = isReasoner
    ? ['deepseek-reasoner', 'deepseek-chat']
    : ['deepseek-chat', 'deepseek-reasoner'];

  let lastError: any = null;
  for (const cand of candidateModels) {
    // Sporer om brukeren allerede har sett deler av svaret. Da må vi IKKE
    // prøve en ny modell, for det ville sendt begynnelsen av svaret to ganger.
    let streamEmitted = false;
    try {
      const isCandReasoner = cand.includes('reasoner') || cand.includes('pro');
      const body: any = {
        model: cand,
        messages
      };

      // 🌊 Strømming støttes på den raske samtalemodellen, og aldri for
      // JSON-uttrekk (der må vi ha hele objektet før vi kan parse det).
      const useStream = Boolean(onDelta) && !isCandReasoner && !forceJson;

      if (!isCandReasoner) {
        // JSON-uttrekk skal være deterministisk; samtale skal være levende.
        body.temperature = forceJson ? 0.2 : temperature;
        // Rom for utfyllende fagsvar (DeepSeek-standarden er lavere).
        body.max_tokens = 8000;
        if (forceJson) {
          body.response_format = { type: 'json_object' };
        }
        if (useStream) {
          body.stream = true;
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

      if (useStream && res.body) {
        // Server-Sent Events fra DeepSeek: «data: {...}» med choices[0].delta.content.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        let streamedText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || '';
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed?.choices?.[0]?.delta?.content || '';
              if (delta) {
                streamEmitted = true;
                streamedText += delta;
                onDelta!(delta);
              }
            } catch {
              // Ufullstendig eller ikke-JSON linje – hopp over.
            }
          }
        }

        if (!streamedText.trim()) {
          throw new Error(`DeepSeek (${cand}) strømmet et tomt svar`);
        }

        return {
          text: streamedText,
          promptTokens: Math.round(prompt.length / 4),
          completionTokens: Math.round(streamedText.length / 4),
          executedModel: cand
        };
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';
      const promptTokens = data.usage?.prompt_tokens || Math.round(prompt.length / 4);
      const completionTokens = data.usage?.completion_tokens || Math.round(text.length / 4);

      return { text, promptTokens, completionTokens, executedModel: cand };
    } catch (candErr: any) {
      // Har brukeren alt fått deler av svaret, stopper vi her i stedet for å
      // starte på nytt med en annen modell.
      if (streamEmitted) throw candErr;
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
 * DeepSeek V4.1 Flash kjørt i EU via Opper (den europeiske AI-gatewayen).
 *
 * Dette er motoren for ALL behandling som kan inneholde personopplysninger, og
 * den erstatter både 1min.AI og Google Gemini i GDPR-stien — også for bilder,
 * siden DeepSeek V4.1 Flash er multimodal.
 *
 * Modell-id-ene er provider-kvalifiserte med vilje: hos Opper er et bart
 * modellnavn samlet på tvers av ALLE regioner som hoster modellen, mens en
 * provider-kvalifisert id pinner kallet til én rute. Bare de kvalifiserte
 * id-ene nedenfor holder kallet i EU. Rekkefølgen og utvalget er gjort etter
 * hva Oppers eget modell-API oppgir per rute:
 *
 *   1. tensorx/deepseek/deepseek-v4.1-flash   opphold EU, leverandør TensorX (IE), ephemeral
 *   2. greenpt/deepseek-v4.1-flash            opphold EU, leverandør GreenPT (NL), ephemeral
 *   3. melious/deepseek-v4.1-flash            opphold EU (DE), leverandør Melious (DE), lagring ikke oppgitt
 *
 * Kravet er EU, ikke EØS. Bevisst utelatt:
 *   - `sference/deepseek-ai/DeepSeek-V4.1-Flash` har opphold EØS, ikke EU, og
 *     leverandøren er registrert i Storbritannia (GB) — altså ikke engang EØS.
 *   - `nebius/deepseek-ai/DeepSeek-V4.1-Flash` kjører på ruten `nebius/studio-eu`,
 *     men har service scope GLOBAL og `content_storage: retained`. Ingen garanti
 *     for at inferensen blir i EU.
 *   - `arcee`, `novita`, `wafer`, `morph`, `geodd`, `fireworks`, `tencent` og
 *     `nextbit` har samme modell, men opphold US eller GLOBAL.
 *
 * Merk at de tre EU-rutene oppgir `country: "-"` og `inference_location: "EU"` —
 * altså hele unionen, ikke ett land. Melious oppgir `country: DE` med inferens i
 * Finland. Alle tre har `zdr.logging: false`, som betyr at leverandøren ikke
 * logger innholdet.
 *
 * Streaming støttes ikke her: GDPR-stien er ikke strømmet i dag, og en
 * feilkonfigurert strøm er verre enn ingen strøm. Kan legges til senere.
 */
const OPPER_EU_BASE_URL = 'https://api.opper.ai/v3/compat/chat/completions';

/** Grunn-URL for Oppers øvrige v3-endepunkter (OCR, tale, embeddings). */
export const OPPER_V3_BASE = 'https://api.opper.ai/v3';

export const OPPER_EU_MODELS = [
  'tensorx/deepseek/deepseek-v4.1-flash',
  'greenpt/deepseek-v4.1-flash',
  'melious/deepseek-v4.1-flash'
];

/**
 * TALE-TIL-TEKST I EU
 *
 * Rekkefølgen er valgt etter hva Oppers eget modell-API oppgir om opphold,
 * lagring og pris per minutt lyd:
 *
 *   1. berget/NbAiLab/nb-whisper-large          EU (Sverige), $0.002215/min
 *      Nasjonalbibliotekets norsk-trente Whisper, oppgitt med språk «no».
 *      Både den billigste og den eneste norsk-spesifikke i EU.
 *   2. berget/Systran/faster-whisper-large-v3   EU (Sverige), $0.002215/min
 *      Flerspråklig Whisper large-v3, for tale som ikke er norsk.
 *   3. mistral/voxtral-mini-2602                EU, $0.0033/min
 *      Mistral (Frankrike). Eneste EU-modell med `stream: true`, og tar opptil
 *      3 timer per kall. Sistemann fordi den er dyrere.
 *
 * Alle tre: opphold EU, `zdr.logging: false`, `content_storage: ephemeral`
 * (berget og mistral) og DPA tilgjengelig.
 *
 * Bevisst utelatt: `evroc/openai/whisper-large-v3` (EU, men lagring «unknown»),
 * `groq/whisper-large-v3*` (billigst av alle, men US), og alle
 * OpenAI/Gemini/ElevenLabs-ruter (US, `content_storage: retained`).
 */
export const OPPER_STT_MODELS = [
  'berget/NbAiLab/nb-whisper-large',
  'berget/Systran/faster-whisper-large-v3',
  'mistral/voxtral-mini-2602'
];

/** Bergets norskmodell er den foretrukne for norsk tale. */
export const OPPER_STT_NORWEGIAN_MODEL = 'berget/NbAiLab/nb-whisper-large';

/** Oppers grense for synkron transkribering er 25 MB dekodet lyd. */
export const OPPER_STT_MAX_BYTES = 25 * 1024 * 1024;

export interface OpperTranscription {
  text: string;
  model: string;
  language?: string;
  durationSeconds?: number;
  costUsd?: number;
}

/**
 * Transkriberer lyd i EU via Opper. Prøver modellene i rekkefølge og kaster hvis
 * ingen svarer — kalleren skal feile lukket, ikke sende lyden videre til en
 * tjeneste utenfor EU.
 *
 * Lyden sendes som data-URI med vilje. Opper tilbyr også `file_id`, men filer
 * teller mot lagringskvoten og kan ikke brukes i et prosjekt med null-lagring.
 * En data-URI holdes i selve kallet.
 */
export async function transcribeAudioEu(
  audioBase64: string,
  mimeType: string,
  opts?: { language?: string; prompt?: string; models?: string[] }
): Promise<OpperTranscription> {
  const key = getOpperKey();
  if (!key) {
    throw new Error('Tale-til-tekst krever DEEPSEEK_EU_API (Opper). Nøkkelen er ikke satt.');
  }

  const rene = audioBase64.includes(',') ? audioBase64.slice(audioBase64.indexOf(',') + 1) : audioBase64;
  const dataUri = `data:${mimeType || 'audio/webm'};base64,${rene}`;
  const modeller = opts?.models && opts.models.length ? opts.models : OPPER_STT_MODELS;
  const feil: string[] = [];

  for (const model of modeller) {
    try {
      const body: Record<string, unknown> = { model, audio: dataUri };
      // Norsk er standard: et språkhint hindrer at Whisper auto-detekterer feil
      // på korte klipp, som er nettopp det en håndverker sender inn.
      body.language = opts?.language || 'no';
      if (opts?.prompt) body.prompt = opts.prompt;

      const res = await fetch(`${OPPER_V3_BASE}/audio/transcriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000)
      });

      if (!res.ok) {
        const tekst = await res.text().catch(() => '');
        feil.push(`${model} -> HTTP ${res.status}: ${tekst.slice(0, 160)}`);
        console.warn(`[STT EU] ${model} feilet (HTTP ${res.status}), prøver neste EU-modell...`);
        continue;
      }

      const data = await res.json();
      const text = String(data?.text || '').trim();
      if (!text) {
        feil.push(`${model} -> tomt svar`);
        continue;
      }

      return {
        text,
        model: data?.model || model,
        language: data?.language,
        durationSeconds: typeof data?.duration === 'number' ? data.duration : undefined,
        costUsd: data?.usage && typeof data.usage.cost === 'number' ? data.usage.cost : undefined
      };
    } catch (err: any) {
      feil.push(`${model} -> ${err?.message || String(err)}`);
      console.warn(`[STT EU] ${model} feilet (${err?.message || err}), prøver neste EU-modell...`);
    }
  }

  throw new Error(`Ingen EU-modell for tale-til-tekst svarte. ${feil.join(' | ')}`);
}

/**
 * Én rutes svar. `error` er satt når kallet feilet, `text` når det lyktes.
 * Enkel returform med vilje: repoet kjører med `strict: false`, og da virker
 * ikke diskriminert union-innsnevring i TypeScript.
 */
interface OpperEuAttempt {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  error?: Error;
}

/**
 * Kaller én Opper-rute. Kaster aldri — feilen returneres, slik at kalleren kan
 * prøve neste EU-rute og til slutt feile LUKKET.
 */
async function callOpperEuModel(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string,
  images?: Array<{ inlineData?: { data?: string; mimeType?: string } }>,
  temperature = 0.3,
  forceJson = false,
  chatMessages?: AiChatMessage[]
): Promise<OpperEuAttempt> {
  try {
    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }

    const hasStructuredTurns = Array.isArray(chatMessages) && chatMessages.length > 0;
    if (hasStructuredTurns && !forceJson) {
      for (const turn of chatMessages!) {
        if (!turn || typeof turn.content !== 'string' || !turn.content.trim()) continue;
        if (turn.role === 'system') continue;
        messages.push({ role: turn.role === 'assistant' ? 'assistant' : 'user', content: turn.content });
      }
    } else if (!images || images.length === 0) {
      messages.push({ role: 'user', content: prompt });
    }

    // Bilder sendes som inline base64-data-URL. Opper avviser hostede URL-er og
    // fil-id-er på dette endepunktet, så data-URL er eneste vei.
    if (images && images.length > 0) {
      const parts: any[] = [];
      if (prompt) parts.push({ type: 'text', text: prompt });
      for (const img of images) {
        const data = img && img.inlineData && img.inlineData.data;
        if (!data) continue;
        const mimeType = (img.inlineData && img.inlineData.mimeType) || 'image/jpeg';
        parts.push({
          type: 'input_image',
          image_url: data.startsWith('data:') ? data : `data:${mimeType};base64,${data}`
        });
      }
      if (parts.length > 0) messages.push({ role: 'user', content: parts });
    }

    const body: any = { model, messages, temperature };
    if (forceJson) body.response_format = { type: 'json_object' };

    const res = await fetch(OPPER_EU_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { text: '', promptTokens: 0, completionTokens: 0, model, error: new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`) };
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return {
      text,
      promptTokens: data?.usage?.prompt_tokens || Math.round(prompt.length / 4),
      completionTokens: data?.usage?.completion_tokens || Math.round(text.length / 4),
      model: data?.model || model
    };
  } catch (err: any) {
    return { text: '', promptTokens: 0, completionTokens: 0, model, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Prøver alle EU-rutene i rekkefølge og returnerer første brukbare svar.
 * Kaster hvis ingen svarer — den som kaller skal da feile lukket, ikke falle
 * tilbake til en motor utenfor EU.
 */
async function callDeepSeekEu(
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
  images?: Array<{ inlineData?: { data?: string; mimeType?: string } }>,
  temperature = 0.3,
  forceJson = false,
  chatMessages?: AiChatMessage[]
): Promise<{ text: string; promptTokens: number; completionTokens: number; executedModel: string }> {
  const errors: string[] = [];

  for (const model of OPPER_EU_MODELS) {
    const attempt = await callOpperEuModel(apiKey, model, prompt, systemInstruction, images, temperature, forceJson, chatMessages);
    if (attempt.text && attempt.text.trim().length > 0) {
      return {
        text: attempt.text,
        promptTokens: attempt.promptTokens,
        completionTokens: attempt.completionTokens,
        executedModel: attempt.model
      };
    }
    const reason = attempt.error ? attempt.error.message : 'tomt svar';
    errors.push(`${model} -> ${reason}`);
    console.warn(`[DeepSeek EU] Ruten ${model} feilet (${reason}), prøver neste EU-rute...`);
  }

  throw new Error(`Ingen EU-rute for DeepSeek V4.1 Flash svarte. ${errors.join(' | ')}`);
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
  // 🛡️ EU-nøkkelen (Opper) er primær for alt som kan inneholde personopplysninger.
  const opperEuKey = getOpperKey();

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

  if (!oneMinKey && !geminiKey && !deepseekKey && !openrouterKey && !opperEuKey) {
    throw new Error('Ingen AI-nøkkel (verken DEEPSEEK_API_KEY, DEEPSEEK_EU_API/Opper, 1_MIN_AI, GEMINI_API_KEY eller OPENROUTER_API_KEY) er konfigurert på serveren eller i innstillingene.');
  }

  // 🛡️ UNIVERSALT MARGINVERN: Sjekk bedriftens token- og abonnementsstatus før ethvert AI-kall utføres
  if (options.companyId) {
    const isInternalCompany = 
      options.companyId.toLowerCase().includes('comp-001') ||
      options.companyId.toLowerCase().includes('internal') ||
      options.companyId.toLowerCase().includes('aichat norge') ||
      options.companyId.toLowerCase().includes('vikingmester');

    if (!isInternalCompany) {
      const quota = await checkCompanyQuota(options.companyId);
      if (!quota.allowed || quota.needsTopUp) {
        const errorMsg = (quota as any).error || 
          `Månedlig inkludert AI-kvote (${quota.plan?.toUpperCase()} - ${(quota.limitTokens / 1_000_000).toFixed(1)}M tokens) er nådd. Kjøp en Mester Top-up pakke under Innstillinger → Fakturering for å fortsette uten avbrudd.`;
        throw new Error(errorMsg);
      }
    }
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

  const isGdprSensitive = Boolean(
    options.gdprProtected ||
    (options.operation && (
      options.operation.includes('gdpr') ||
      options.operation.includes('fleet') ||
      options.operation.includes('vehicle') ||
      options.operation.includes('bilpark') ||
      options.operation.includes('employee') ||
      options.operation.includes('hr')
    )) ||
    (promptText && containsPIIOrGdprData(promptText))
  );

  const { oneMinModel, geminiModel, deepseekModel } = resolveOptimalModel(options.operation, options.model, isWebSearch, isGdprSensitive);

  // 🎛️ SAMTALETEMPERATUR: Samtale, rådgivning og mentor-svar skal ikke kjøres på
  // 0.3, som gir knappe og stakkato svar. JSON-uttrekk og deterministiske
  // oppgaver holder seg fortsatt lave. Broen (botsify_chat_bridge) beholdes
  // uendret på 0.3 siden den er verifisert god.
  const isConversational = Boolean(
    options.operation &&
    /chat|conversation|advisor|consultation|mentor|assistant/i.test(options.operation) &&
    !/bridge/i.test(options.operation)
  );
  const deepseekTemperature = isJsonExpected ? 0.2 : (isConversational ? 0.65 : 0.3);

  // 🧠 Strukturert samtale (ekte roller) sendes til primærmotoren når kallet har det.
  const structuredMessages: AiChatMessage[] | undefined =
    Array.isArray(options.messages) && options.messages.length > 0
      ? options.messages.filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
      : undefined;

  // ==========================================================================
  // CASE 1: SYN / BILDEANALYSE (Vision / TEK17 / Foto / Skanning)
  // 1min.AI er HOVEDMOTOR (støtter Gemini 3.8 Flash, GPT-4o osv. via Asset API).
  // Google Gemini API direkte fungerer som pålitelig SISTE SITE-BACKUP.
  // ==========================================================================
  if (isVisionTask) {
    // 1.1 Primær for bildeanalyse: 1min.AI Asset API (kan kalle Gemini, GPT-4o osv.)
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

        // 🛡️ SIKKERHETSVENTIL:
        // Dersom brukeren sendte med bilde(r), men opplasting til 1min.AI feilet/ikke ga nøkler:
        // IKKE send som ren tekst til 1min.AI! Det vil gi standardavslag ("Jeg kan ikke se bildet").
        // Kast feil umiddelbart for å aktivere Gemini Vision site-backup!
        if (imagesToProcess.length > 0 && assetKeys.length === 0) {
          throw new Error('1min.AI Asset Upload ga ingen asset-nøkkel, kobler over til Gemini Vision backup');
        }

        // Velg en ekte visjonsmodell for 1min.ai
        const visionOneMinModel = (oneMinModel && !oneMinModel.includes('mini') && !oneMinModel.includes('chat') && !oneMinModel.includes('reasoner'))
          ? oneMinModel
          : (process.env.ONE_MIN_AI_VISION_MODEL || 'gpt-4o');

        const res = await call1MinAi(
          oneMinKey,
          visionOneMinModel,
          promptText,
          options.systemInstruction,
          assetKeys,
          false,
          isJsonExpected
        );

        if (res.text && res.text.trim().length > 0) {
          // 🛡️ SJEKK OM MODELLEN LIKEVEL NEKTET/IKKE SÅ BILDET:
          const isRefusal = /kan (?:dessverre )?ikke se|ikke se eller analysere|kan ikke analysere innholdet|kan ikke analysere bildet|kan dessverre ikke åpne|mangler bilde|klarer ikke å se bildet|cannot see (?:the|this|any)? image|unable to (?:view|see|analyze) (?:the|this|any)? image|no image (?:was )?provided/i.test(res.text);

          if (isRefusal && imagesToProcess.length > 0) {
            throw new Error(`1min.AI modell avviste bildet ("${res.text.slice(0, 80)}..."), kobler over til Gemini Vision site-backup`);
          }

          trackTokenCost({
            model: visionOneMinModel,
            promptTokens: res.promptTokens,
            completionTokens: res.completionTokens,
            operation: options.operation || 'ai_generate_vision_1min_primary',
            companyId: options.companyId,
            companyName: options.companyName,
            projectId: options.projectId,
            notes: options.notes || `1min.ai Vision (${visionOneMinModel})`,
            service: '1min.ai'
          }).catch(() => {});

          return {
            text: res.text,
            source: '1min.ai',
            model: visionOneMinModel,
            usage: {
              promptTokens: res.promptTokens,
              completionTokens: res.completionTokens,
              totalTokens: res.promptTokens + res.completionTokens
            }
          };
        }
      } catch (oneMinErr: any) {
        console.warn(`[AI Engine - Vision] 1min.AI feilet (${oneMinErr.message}), kobler over til Gemini som site-backup...`);
      }
    }

    // 1.2 Siste site-backup for bildeanalyse: Google Gemini API direkte
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
          operation: options.operation || 'ai_generate_vision_gemini_backup',
          companyId: options.companyId,
          companyName: options.companyName,
          projectId: options.projectId,
          notes: options.notes || `Gemini Vision Site Backup (${res.executedModel})`,
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
        console.warn(`[AI Engine - Vision] Gemini site-backup feilet (${gErr.message})`);
      }
    }

    throw new Error('Bildeanalyse krever en synsstøttet modell (1min.AI eller Gemini API backup), men ingen var tilgjengelig.');
  }

  // ==========================================================================
  // CASE 2: LIVE NETTSØK
  // 1min.AI er HOVEDMOTOR for nettsøk, med Gemini Google Grounding som site-backup.
  // ==========================================================================
  if (isWebSearch) {
    // 2.1 Primær for nettsøk: 1min.AI
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
            operation: options.operation || 'ai_generate_websearch_1min_primary',
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
        console.warn(`[AI Engine - WebSearch] 1min.AI feilet (${oneMinErr.message}), prøver Gemini site-backup...`);
      }
    }

    // 2.2 Siste site-backup for nettsøk: Google Gemini Grounding
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
          operation: options.operation || 'ai_generate_websearch_gemini_backup',
          companyId: options.companyId,
          companyName: options.companyName,
          projectId: options.projectId,
          notes: options.notes || `Gemini Search Grounding Site Backup (${res.executedModel})`,
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
        console.warn(`[AI Engine - WebSearch] Gemini site-backup feilet (${gErr.message})`);
      }
    }
  }

  // ==========================================================================
  // CASE 2.5: GDPR & PERSONOPPLYSNINGER (Schrems II / EU-overholdelse)
  // Hvis oppgaven gjelder GDPR-sensitive opplysninger (kjøretøy/bilpark, ansatte,
  // telefonnummer, kontaktpersoner osv.):
  // 1. Dataene sendes ALDRI til modeller utenfor EU/EØS (DeepSeek i Kina omgås helt).
  // 2. 1min.AI med EU-godkjente modeller (Claude 3.7 Sonnet / Mistral Large / GPT-4o)
  //    eller Google Gemini EU kalles med den FULLSTENDIGE, USLADDEDE informasjonen.
  // 3. Bilens registreringsnummer, telefonnummer og navn bevares 100% uten sladding!
  // ==========================================================================
  if (isGdprSensitive) {
    // 2.5.0 PRIMÆR for GDPR: DeepSeek V4.1 Flash kjørt i EU via Opper.
    // Dette er den foretrukne motoren for alt som kan inneholde
    // personopplysninger. Den er multimodal, så den dekker også bildeanalyse —
    // tidligere måtte bilder til Gemini. Alle rutene under er EU/EØS.
    if (opperEuKey) {
      try {
        const res = await callDeepSeekEu(
          opperEuKey,
          promptText,
          options.systemInstruction,
          imagesToProcess,
          deepseekTemperature,
          isJsonExpected,
          structuredMessages
        );

        if (res.text && res.text.trim().length > 0) {
          trackTokenCost({
            model: res.executedModel,
            promptTokens: res.promptTokens,
            completionTokens: res.completionTokens,
            operation: options.operation || 'ai_generate_gdpr_eu_opper',
            companyId: options.companyId,
            companyName: options.companyName,
            projectId: options.projectId,
            notes: options.notes || `GDPR EU Engine (Opper ${res.executedModel})`,
            service: 'deepseek'
          }).catch(() => {});

          return {
            text: res.text,
            source: 'deepseek_eu',
            model: res.executedModel,
            usage: {
              promptTokens: res.promptTokens,
              completionTokens: res.completionTokens,
              totalTokens: res.promptTokens + res.completionTokens
            }
          };
        }
      } catch (opperErr: any) {
        console.warn(`[AI Engine - GDPR EU] Opper/DeepSeek EU feilet (${opperErr.message}), faller tilbake til 1min.AI...`);
      }
    }

    // 2.5.1 Sekundær for GDPR: 1min.AI med EU/rask modell (f.eks. gpt-4o-mini, Mistral Large eller Claude 3.5 Haiku)
    if (oneMinKey) {
      try {
        const gdprModel = process.env.ONE_MIN_AI_GDPR_MODEL || oneMinModel || 'gpt-4o-mini';
        const res = await call1MinAi(
          oneMinKey,
          gdprModel,
          promptText,
          options.systemInstruction,
          [],
          false,
          isJsonExpected
        );

        if (res.text && res.text.trim().length > 0) {
          trackTokenCost({
            model: gdprModel,
            promptTokens: res.promptTokens,
            completionTokens: res.completionTokens,
            operation: options.operation || 'ai_generate_gdpr_eu_1min',
            companyId: options.companyId,
            companyName: options.companyName,
            projectId: options.projectId,
            notes: options.notes || `GDPR EU Engine (1min.ai ${gdprModel})`,
            service: '1min.ai'
          }).catch(() => {});

          return {
            text: res.text,
            source: '1min.ai',
            model: gdprModel,
            usage: {
              promptTokens: res.promptTokens,
              completionTokens: res.completionTokens,
              totalTokens: res.promptTokens + res.completionTokens
            }
          };
        }
      } catch (oneMinErr: any) {
        console.warn(`[AI Engine - GDPR EU] 1min.AI feilet (${oneMinErr.message}), faller tilbake til Google Gemini EU...`);
      }
    }

    // 2.5.2 Sekundær for GDPR: Google Gemini (Google Cloud EU DPA)
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
          operation: options.operation || 'ai_generate_gdpr_eu_gemini',
          companyId: options.companyId,
          companyName: options.companyName,
          projectId: options.projectId,
          notes: options.notes || `GDPR EU Engine (Gemini ${res.executedModel})`,
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
        console.warn(`[AI Engine - GDPR EU] Gemini EU feilet (${gErr.message})`);
      }
    }

    throw new Error('GDPR-beskyttet oppgave krever en EU-godkjent modell (DeepSeek V4.1 Flash i EU via Opper, 1min.AI eller Google Gemini EU), men ingen var tilgjengelig.');
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
        isJsonExpected,
        structuredMessages,
        deepseekTemperature,
        options.onDelta
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
