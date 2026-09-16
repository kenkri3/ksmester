import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { generateWithAiEngine, cleanAiJson } from '@/src/lib/server/aiEngine';

function isBlockedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname === '169.254.169.254' ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== 'string' || isBlockedUrl(url)) {
    return NextResponse.json({ error: 'Ugyldig eller blokkert URL oppgitt' }, { status: 400 });
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

    try {
      const prompt = `Ekstraher produktinformasjon for en norsk byggevare fra denne nettsideteksten:\nTittel: ${ogTitle}\nBeskrivelse: ${ogDesc}\nInnhold: ${cleanText}`;
      const aiRes = await generateWithAiEngine({
        prompt,
        systemInstruction: 'Du er en ekspert på byggevarer og FDV-dokumentasjon i Norge. Ekstraher produktinformasjon og returner KUN et gyldig JSON-objekt med feltene: nobbNumber, name, description, gtin, supplier, category, fdvUrl, imageUrl.',
        operation: 'scrape_fdv',
        responseMimeType: 'application/json'
      });

      const parsed = JSON.parse(cleanAiJson(aiRes.text));
      if (!parsed.imageUrl && ogImage) parsed.imageUrl = ogImage;
      return NextResponse.json(parsed);
    } catch (aiErr: any) {
      console.warn('[Scrape] AI ekstraksjon feilet, bruker metadata fallback:', aiErr.message);
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
