/**
 * Autonomous IndexNow and Search Engine Ping Client
 * Notifies Bing, Seznam, Naver and Google whenever new content is published.
 */

export async function pingSearchEngines(urls: string[]) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';
  const cleanHost = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const results: { provider: string; success: boolean; error?: string }[] = [];

  // 1. IndexNow API (Bing, Yandex, Seznam, Naver)
  try {
    const apiKey = process.env.INDEXNOW_KEY || 'vikingmester-auto-seo-2026';
    const payload = {
      host: cleanHost,
      key: apiKey,
      keyLocation: `${baseUrl}/${apiKey}.txt`,
      urlList: urls.map(u => u.startsWith('http') ? u : `${baseUrl}${u}`),
    };

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    results.push({
      provider: 'IndexNow',
      success: res.ok || res.status === 200 || res.status === 202,
    });
  } catch (err: any) {
    results.push({
      provider: 'IndexNow',
      success: false,
      error: err.message,
    });
  }

  // 2. Google Sitemap Ping
  try {
    const sitemapUrl = encodeURIComponent(`${baseUrl}/sitemap.xml`);
    const res = await fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    results.push({
      provider: 'GooglePing',
      success: res.ok,
    });
  } catch (err: any) {
    results.push({
      provider: 'GooglePing',
      success: false,
      error: err.message,
    });
  }

  return results;
}