import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getUserFromRequest } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  const isPortalAccess = req.headers.get('x-portal-access') === 'true';

  if (!user && !isPortalAccess) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  const deepseekKey = process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY;

  if (!apiKey && !deepseekKey) {
    return NextResponse.json({ error: 'Ingen AI-nøkkel (GEMINI_API_KEY eller DEEP_SEEK_API) er konfigurert på serveren.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    let { prompt, contents, model = 'gemini-3.8-flash', systemInstruction, responseMimeType, responseSchema, images, inlineData } = body;

    if (!user && isPortalAccess) {
      if (!prompt || typeof prompt !== 'string' || prompt.length > 5000) {
        return NextResponse.json({ error: 'Ugyldig portalforespørsel' }, { status: 400 });
      }
    }

    if (apiKey) {
      if (!model || model.startsWith('gemini-2') || model.startsWith('gemini-1') || model === 'deepseek-chat') {
        model = 'gemini-3.8-flash';
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
        model,
        contents: finalContents,
        config: Object.keys(config).length > 0 ? config : undefined
      });

      return NextResponse.json({ text: aiResponse.text || '' });
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
      return NextResponse.json({ text: dsData.choices?.[0]?.message?.content || '' });
    }

    return NextResponse.json({ error: 'Ingen AI-tilbyder er tilgjengelig' }, { status: 500 });
  } catch (error: any) {
    console.error('Server AI Generation error:', error);
    return NextResponse.json({ error: error.message || 'AI-generering feilet på serveren' }, { status: 500 });
  }
}
