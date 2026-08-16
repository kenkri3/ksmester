import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY er ikke konfigurert på serveren.' }, { status: 500 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const body = await req.json();
    let { prompt, contents, model = 'gemini-2.5-flash', systemInstruction, responseMimeType, responseSchema, images, inlineData } = body;

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
