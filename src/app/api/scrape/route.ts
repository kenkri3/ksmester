import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Ugyldig URL oppgitt' }, { status: 400 });
  }

  try {
    // 1. Direct Native Fetch (0 Firecrawl dependency, 0 API credit cost)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`Kunne ikke hente siden (HTTP ${response.status})`);
    }

    const html = await response.text();

    // 2. Deterministic Extraction via Schema.org JSON-LD (0 tokens spent)
    let extractedProduct: any = null;
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

    for (const match of jsonLdMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
        const prod = items.find((item: any) => item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product')));
        if (prod) {
          extractedProduct = {
            nobbNumber: String(prod.sku || prod.productID || prod.identifier || ''),
            name: String(prod.name || ''),
            description: String(prod.description || ''),
            gtin: String(prod.gtin13 || prod.gtin || prod.isbn || ''),
            supplier: typeof prod.brand === 'string' ? prod.brand : (prod.brand?.name || ''),
            category: String(prod.category || 'Byggevare'),
            fdvUrl: '',
            imageUrl: typeof prod.image === 'string' ? prod.image : (Array.isArray(prod.image) ? prod.image[0] : (prod.image?.url || ''))
          };
          break;
        }
      } catch (jsonErr) {}
    }

    if (extractedProduct && extractedProduct.name) {
      return NextResponse.json(extractedProduct);
    }

    // 3. Fallback extraction from meta tags and HTML
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
                    html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
                   html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';

    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 4000);

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    const deepseekKey = process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY;

    if (geminiKey) {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Ekstraher produktinformasjon for en norsk byggevare fra denne nettsideteksten:
Tittel: ${ogTitle}
Beskrivelse: ${ogDesc}
Innhold: ${cleanText}`,
        config: {
          systemInstruction: 'Du er en ekspert på byggevarer og FDV-dokumentasjon i Norge. Ekstraher produktinformasjon og returner som JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              nobbNumber: { type: 'STRING' },
              name: { type: 'STRING' },
              description: { type: 'STRING' },
              gtin: { type: 'STRING' },
              supplier: { type: 'STRING' },
              category: { type: 'STRING' },
              fdvUrl: { type: 'STRING' },
              imageUrl: { type: 'STRING' }
            },
            required: ['name']
          }
        }
      });

      const parsed = JSON.parse(aiResponse.text || '{}');
      if (!parsed.imageUrl && ogImage) parsed.imageUrl = ogImage;
      return NextResponse.json(parsed);
    } else if (deepseekKey) {
      const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
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
              content: 'Du er en ekspert på byggevarer og FDV-dokumentasjon i Norge. Ekstraher produktinformasjon og returner KUN et gyldig JSON-objekt med feltene: nobbNumber, name, description, gtin, supplier, category, fdvUrl, imageUrl.'
            },
            {
              role: 'user',
              content: `Ekstraher produktinformasjon fra følgende tekst som JSON:\nTittel: ${ogTitle}\nBeskrivelse: ${ogDesc}\nInnhold: ${cleanText}`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1000
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (dsRes.ok) {
        const aiData = await dsRes.json();
        let content = aiData.choices?.[0]?.message?.content || '{}';
        content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(content);
        if (!parsed.imageUrl && ogImage) parsed.imageUrl = ogImage;
        return NextResponse.json(parsed);
      }
    }

    return NextResponse.json({
      nobbNumber: '',
      name: ogTitle || 'Ukjent byggevare',
      description: ogDesc || '',
      gtin: '',
      supplier: '',
      category: 'Byggevare',
      fdvUrl: '',
      imageUrl: ogImage || ''
    });
  } catch (error: any) {
    console.error('Scrape API error:', error);
    return NextResponse.json({ error: error.message || 'Kunne ikke skrape nettside' }, { status: 500 });
  }
}
