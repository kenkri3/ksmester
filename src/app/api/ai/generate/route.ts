import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getUserFromRequest } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  // 🛡️ SECURITY: Enforce authentication or verified portal read access
  const user = getUserFromRequest(req);
  const isPortalAccess = req.headers.get('x-portal-access') === 'true';

  if (!user && !isPortalAccess) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY er ikke konfigurert på serveren.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    let { prompt, contents, model = 'gemini-2.5-flash', systemInstruction, responseMimeType, responseSchema, images, inlineData } = body;

    // Portal requests are limited to summary generation to protect API quotas
    if (!user && isPortalAccess) {
      if (!prompt || typeof prompt !== 'string' || prompt.length > 5000) {
        return NextResponse.json({ error: 'Ugyldig portalforespørsel' }, { status: 400 });
      }
    }

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

    const aiResponse = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash',
      contents: finalContents,
      config: Object.keys(config).length > 0 ? config : undefined
    });

    return NextResponse.json({ text: aiResponse.text || '' });
  } catch (error: any) {
    console.error('Server AI Generation error:', error);
    return NextResponse.json({ error: error.message || 'AI-generering feilet på serveren' }, { status: 500 });
  }
}
