import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/innlogget/',
          '/_next/',
          '/private/',
          '/partner',
          '/partner/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/partner', '/partner/'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/partner', '/partner/'],
      },
      // AI Crawlers & Answer Engines (AEO)
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'PerplexityBot',
          'Google-Extended',
          'Applebot-Extended',
          'anthropic-ai',
          'cohere-ai',
        ],
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/partner', '/partner/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
