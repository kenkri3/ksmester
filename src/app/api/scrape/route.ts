import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  // Enforce authentication to prevent unauthorized scraping API usage
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  const { url } = await req.json();
  const apiKey = process.env.FIRECRAWL_API_KEY;
  const deepseekKey = process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY;

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
    const markdown = scrapeData.data?.markdown || '';

    if (deepseekKey && markdown) {
      // Truncate markdown to max 4000 characters to conserve DeepSeek tokens
      const truncatedMarkdown = markdown.substring(0, 4000);

      const deepSeekRes = await fetch('https://api.deepseek.com/chat/completions', {
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
              content: `Ekstraher produktinformasjon fra følgende markdown som JSON: ${truncatedMarkdown}`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1000
        })
      });

      if (deepSeekRes.ok) {
        const aiData = await deepSeekRes.json();
        let content = aiData.choices?.[0]?.message?.content || '{}';
        content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        return NextResponse.json(JSON.parse(content));
      }
    }

    return NextResponse.json({ rawMarkdown: markdown });
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json({ error: 'Kunne ikke skrape nettside' }, { status: 500 });
  }
}
