import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

  // SIKKERHETSFIKS (R-07): `/_next/` sto i disallow for userAgent '*'. Det
  // blokkerer henting av JavaScript og CSS for alle andre enn Googlebot og
  // Bingbot (som hadde egne regler). Siden forsiden er klient-rendret og
  // innholdet kommer fra JavaScript, gjorde det at crawlere som respekterer
  // standardregelen ikke kunne rendre siden i det hele tatt - de sa bare en
  // tom beholder. `/_next/` er fjernet.
  //
  // La ogsaa til de token-baserte sidene i disallow, slik at personlige
  // invitasjons- og passordlenker ikke indekseres:
  //   /invite, /invite/<token>, /auth/reset-password
  const privatePaths = [
    '/api/',
    '/admin/',
    '/dashboard/',
    '/innlogget/',
    '/private/',
    '/partner',
    '/partner/',
    '/invite',
    '/invite/',
    '/auth/',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: privatePaths,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: privatePaths,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: privatePaths,
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
        disallow: privatePaths,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
