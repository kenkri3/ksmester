import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  const apiKey = process.env.FIRECRAWL_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Firecrawl API-nøkkel ikke konfigurert' }, { status: 403 });
  }

  try {
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, formats: ['markdown'] })
    });

    if (!scrapeResponse.ok) throw new Error('Firecrawl feilet');
    const scrapeData = await scrapeResponse.json();
    const markdown = scrapeData.data.markdown;

    if (geminiKey) {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Ekstraher produktinformasjon fra følgende markdown: ${markdown}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nobbNumber: { type: Type.STRING },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              gtin: { type: Type.STRING },
              supplier: { type: Type.STRING },
              category: { type: Type.STRING },
              fdvUrl: { type: Type.STRING },
              imageUrl: { type: Type.STRING }
            },
            required: ['name', 'supplier']
          }
        }
      });
      return NextResponse.json(JSON.parse(aiResponse.text || '{}'));
    }

    return NextResponse.json({ rawMarkdown: markdown });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Kunne ikke skrape nettside' }, { status: 500 });
  }
}
