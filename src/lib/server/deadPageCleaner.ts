/**
 * Dead Page Cleaner & 301 Redirect Engine
 * Autosletter og rydder opp i utdaterte, duplikate eller døde sider/blogginnlegg,
 * og setter opp 301-omdirigeringer slik at nettstedet aldri har 404-feil eller tynne sider.
 */

import { getCollectionItems, saveCollectionItem, deleteCollectionItem } from './db';
import { SeoArticle, getAllSeoArticles } from './autonomousSeoEngine';
import { pingSearchEngines } from './indexNow';

export interface RedirectRule {
  id: string;
  sourceSlug: string;
  targetUrl: string;
  statusCode: 301 | 308;
  reason: string;
  createdAt: string;
}

export interface CleanupResult {
  cleanedCount: number;
  cleanedSlugs: string[];
  redirectsCreated: number;
  report: string[];
}

/**
 * Henter alle aktive 301 omdirigeringer registrert ved opprydding
 */
export async function getActiveRedirects(): Promise<RedirectRule[]> {
  try {
    const rules = await getCollectionItems('seo_redirects');
    return rules || [];
  } catch {
    return [];
  }
}

/**
 * Finn om en gitt URL-sti skal omdirigeres
 */
export async function findRedirect(path: string): Promise<RedirectRule | null> {
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  const redirects = await getActiveRedirects();
  return redirects.find(r => r.sourceSlug === cleanPath || r.sourceSlug === `/${cleanPath}`) || null;
}

/**
 * Hovedfunksjon for automatisk sletting av døde sider og generering av 301-omdirigeringer
 */
export async function runDeadPageCleanup(): Promise<CleanupResult> {
  console.log('🧹 [Dead Page Cleaner] Kjører automatisk skanning etter døde og utdaterte sider...');
  
  const report: string[] = [];
  const cleanedSlugs: string[] = [];
  let redirectsCreated = 0;

  try {
    const articles: SeoArticle[] = await getAllSeoArticles();
    const seenSlugs = new Map<string, SeoArticle>();
    const candidatesToDelete: { article: SeoArticle; reason: string; redirectTarget: string }[] = [];

    for (const article of articles) {
      // 1. Sjekk for korrupt eller tomt innhold
      const contentLen = (article.contentMarkdown || '').trim().length;
      if (!article.slug || contentLen < 150) {
        candidatesToDelete.push({
          article,
          reason: `For tynt eller ufullstendig innhold (${contentLen} tegn)`,
          redirectTarget: `/fag`
        });
        continue;
      }

      // 2. Sjekk for placeholder eller testinnhold
      const lowerContent = article.contentMarkdown.toLowerCase();
      if (
        lowerContent.includes('lorem ipsum') ||
        lowerContent.includes('testartikkel') ||
        lowerContent.includes('[under utarbeidelse]') ||
        article.title.toLowerCase().startsWith('test')
      ) {
        candidatesToDelete.push({
          article,
          reason: 'Test- eller placeholder-innhold detektert',
          redirectTarget: `/fag`
        });
        continue;
      }

      // 3. Sjekk for duplikater / kannibalisering (nesten like slugger)
      const baseSlug = article.slug.replace(/-\d+$/, '');
      if (seenSlugs.has(baseSlug)) {
        const existing = seenSlugs.get(baseSlug)!;
        // Behold den nyeste eller lengste artikkelen, slett den eldre/kortere
        const existingLen = existing.contentMarkdown.length;
        if (contentLen <= existingLen) {
          candidatesToDelete.push({
            article,
            reason: `Duplikat av eksisterende artikkel: ${existing.slug}`,
            redirectTarget: `/fag/${existing.slug}`
          });
          continue;
        } else {
          // Den nye er bedre, slett den gamle
          candidatesToDelete.push({
            article: existing,
            reason: `Erstattes av mer utfyllende artikkel: ${article.slug}`,
            redirectTarget: `/fag/${article.slug}`
          });
          seenSlugs.set(baseSlug, article);
          continue;
        }
      } else {
        seenSlugs.set(baseSlug, article);
      }
    }

    // Utfør sletting og opprett omdirigeringer
    for (const item of candidatesToDelete) {
      const art = item.article;
      console.log(`🗑️ [Dead Page Cleaner] Autosletter død side: "${art.title}" (${art.slug}). Årsak: ${item.reason}`);
      
      // Slett fra database (kun dersom den eksisterer i databasen)
      if (art.id && !art.id.startsWith('art-tek17-fall') && !art.id.startsWith('art-ns8406')) {
        await deleteCollectionItem('seo_articles', art.id);
      }

      // Opprett permanent 301-omdirigering
      const redirectRule: RedirectRule = {
        id: `redir-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sourceSlug: `fag/${art.slug}`,
        targetUrl: item.redirectTarget,
        statusCode: 301,
        reason: item.reason,
        createdAt: new Date().toISOString()
      };

      await saveCollectionItem('seo_redirects', redirectRule);
      redirectsCreated++;
      cleanedSlugs.push(art.slug);
      report.push(`Autoslettet ${art.slug} -> 301 omdirigert til ${item.redirectTarget} (${item.reason})`);
    }

    // Hvis noen sider ble slettet, varsle søkemotorer via IndexNow
    if (cleanedSlugs.length > 0) {
      await pingSearchEngines(['/sitemap.xml', '/fag']);
    }

    console.log(`✅ [Dead Page Cleaner] Fullført: ${cleanedSlugs.length} døde sider renset, ${redirectsCreated} omdirigeringer opprettet.`);

    return {
      cleanedCount: cleanedSlugs.length,
      cleanedSlugs,
      redirectsCreated,
      report
    };
  } catch (err: any) {
    console.error('⚠️ [Dead Page Cleaner] Feil under opprydding:', err.message);
    return {
      cleanedCount: 0,
      cleanedSlugs: [],
      redirectsCreated: 0,
      report: [`Feil: ${err.message}`]
    };
  }
}
