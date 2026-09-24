import { MetadataRoute } from 'next';
import { TRADES_SEO_DATA } from '@/src/constants/tradesSeoData';
import { getAllSeoArticles } from '@/src/lib/server/autonomousSeoEngine';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';
  const now = new Date();

  const coreRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/ks-system`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/hms`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/avvikshandtering`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sja`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/stoffkartotek`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/prosjektstyring`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/priser`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/om-oss`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/kontakt`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    {
      url: `${baseUrl}/fag`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // Gratis verktøy
    {
      url: `${baseUrl}/verktoy/varslingsfrist-ns8406`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/verktoy/fall-kalkulator-tek17`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/verktoy/sja-generator`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    // Programmatiske områdesider for hele Norge
    {
      url: `${baseUrl}/omrade`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // Programmatiske bransjesider
  const tradeRoutes: MetadataRoute.Sitemap = Object.keys(TRADES_SEO_DATA).map((trade) => ({
    url: `${baseUrl}/for/${trade}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // Programmatiske stedsider for alle Norges fylker, byer og tettsteder
  const { NORWAY_LOCATIONS } = await import('@/src/constants/norwayLocationsData');
  const locationRoutes: MetadataRoute.Sitemap = Object.keys(NORWAY_LOCATIONS).map((locSlug) => ({
    url: `${baseUrl}/omrade/${locSlug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // Dynamiske fagartikler (seeded + AI generert)
  let articleRoutes: MetadataRoute.Sitemap = [];
  try {
    const articles = await getAllSeoArticles();
    articleRoutes = articles.map((art) => ({
      url: `${baseUrl}/fag/${art.slug}`,
      lastModified: new Date(art.updatedAt || art.createdAt),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch (err) {
    console.warn('Sitemap article loading warning:', err);
  }

  return [...coreRoutes, ...tradeRoutes, ...locationRoutes, ...articleRoutes];
}