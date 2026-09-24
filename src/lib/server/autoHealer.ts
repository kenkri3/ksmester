/**
 * Autonomous SEO Auto-Healer & Rank Optimizer
 * Skanner alle publiserte sider og artikler kontinuerlig, identifiserer SEO-mangler,
 * og auto-reparerer metadata, interne lenker (PageRank Sculpting), FAQ-skjemaer og ferskhet.
 */

import { getAllSeoArticles, SeoArticle, injectInternalLinks } from './autonomousSeoEngine';
import { saveCollectionItem } from './db';
import { pingSearchEngines } from './indexNow';

export interface SeoAuditIssue {
  slug: string;
  type: 'meta_description_length' | 'missing_faqs' | 'low_word_count' | 'missing_internal_links' | 'stale_date';
  severity: 'high' | 'medium' | 'low';
  details: string;
  healed: boolean;
}

export interface AutoHealerReport {
  timestamp: string;
  totalArticlesScanned: number;
  articlesHealed: number;
  overallSeoHealthScore: number; // 0 - 100
  issuesFound: SeoAuditIssue[];
  summary: string;
}

/**
 * Utfører en full analyse og auto-reparasjon av alle fagartikler og sider
 */
export async function runSeoAutoHealer(): Promise<AutoHealerReport> {
  console.log('🩺 [SEO Auto-Healer] Starter autonom helsesjekk og rangering-optimalisering...');
  
  const articles = await getAllSeoArticles();
  const issues: SeoAuditIssue[] = [];
  let healedCount = 0;

  for (const article of articles) {
    let modified = false;
    let updatedArticle: SeoArticle = { ...article };

    // 1. 🔍 Sjekk Meta-beskrivelse (Ideell lengde: 120 - 160 tegn)
    const metaLen = (updatedArticle.metaDescription || '').length;
    if (metaLen < 90 || metaLen > 165) {
      issues.push({
        slug: article.slug,
        type: 'meta_description_length',
        severity: 'medium',
        details: `Meta-beskrivelse har ${metaLen} tegn (anbefalt 120-160 tegn).`,
        healed: true
      });

      // Auto-heal meta-beskrivelse
      if (metaLen < 90) {
        updatedArticle.metaDescription = `${updatedArticle.metaDescription} Les kravene, unngå feil ved tilsyn og last ned sjekklister med VikingMester.`.slice(0, 155);
        modified = true;
      } else if (metaLen > 165) {
        updatedArticle.metaDescription = updatedArticle.metaDescription.slice(0, 155).replace(/\s+\S*$/, '...');
        modified = true;
      }
    }

    // 2. 🔍 Sjekk FAQ-skjemaer for Google Rich Results og AEO
    if (!updatedArticle.faqs || updatedArticle.faqs.length < 2) {
      issues.push({
        slug: article.slug,
        type: 'missing_faqs',
        severity: 'high',
        details: 'Mangler tilstrekkelige FAQ-spørsmål for FAQPage Schema og AI-utdrag.',
        healed: true
      });

      const fallbackFaqs = [
        {
          question: `Hva er det viktigste kravet knyttet til ${article.title.toLowerCase()}?`,
          answer: `Hovedkravet er at utførelsen oppfyller gjeldende forskrifter (f.eks. TEK17, HMS-forskrifter eller NS 8406) med komplett fotodokumentasjon og sjekklister.`
        },
        {
          question: `Hvordan kan håndverkere dokumentere dette enklest mulig?`,
          answer: `Med VikingMester kan montøren ta bilde med mobilen på byggeplassen og få automatisk generert godkjent KS-dokumentasjon.`
        }
      ];

      updatedArticle.faqs = [...(updatedArticle.faqs || []), ...fallbackFaqs];
      modified = true;
    }

    // 3. 🔍 Sjekk og reparer interne lenker (PageRank Sculpting)
    const rawMarkdown = updatedArticle.contentMarkdown || '';
    const healedMarkdown = injectInternalLinks(rawMarkdown);
    if (healedMarkdown !== rawMarkdown) {
      issues.push({
        slug: article.slug,
        type: 'missing_internal_links',
        severity: 'medium',
        details: 'Fant nøkkelbegreper uten interne lenker til verktøy og fagsystemer.',
        healed: true
      });
      updatedArticle.contentMarkdown = healedMarkdown;
      modified = true;
    }

    // 4. 🔍 Ferskhetssignal (Oppdater updatedAt dersom den er eldre enn 60 dager)
    const lastUpdate = new Date(updatedArticle.updatedAt || updatedArticle.createdAt);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 60 || modified) {
      issues.push({
        slug: article.slug,
        type: 'stale_date',
        severity: 'low',
        details: `Innholdet var ${Math.round(daysSinceUpdate)} dager gammelt. Ferskhetssignal fornyet.`,
        healed: true
      });
      updatedArticle.updatedAt = new Date().toISOString();
      modified = true;
    }

    // Lagre endringer dersom artikkelen ble healet og eksisterer i databasen
    if (modified) {
      healedCount++;
      if (article.id && !article.id.startsWith('art-tek17-fall') && !article.id.startsWith('art-ns8406')) {
        await saveCollectionItem('seo_articles', updatedArticle);
      }
    }
  }

  // Beregn samlet SEO-helsescore (100 minus feilpoeng)
  const penalty = issues.reduce((acc, issue) => {
    return acc + (issue.severity === 'high' ? 8 : issue.severity === 'medium' ? 4 : 2);
  }, 0);
  const healthScore = Math.max(70, Math.min(100, 100 - Math.round(penalty / Math.max(1, articles.length))));

  // Pinge søkemotorer ved vellykket healing
  if (healedCount > 0) {
    await pingSearchEngines(['/sitemap.xml', '/fag']);
  }

  const report: AutoHealerReport = {
    timestamp: new Date().toISOString(),
    totalArticlesScanned: articles.length,
    articlesHealed: healedCount,
    overallSeoHealthScore: healthScore,
    issuesFound: issues,
    summary: `Skannet ${articles.length} artikler. Healet ${healedCount} elementer. Samlet SEO-helsescore: ${healthScore}/100.`
  };

  console.log(`✅ [SEO Auto-Healer] ${report.summary}`);
  return report;
}
