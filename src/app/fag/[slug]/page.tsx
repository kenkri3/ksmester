import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { getAllSeoArticles, getSeoArticleBySlug } from '@/src/lib/server/autonomousSeoEngine';
import { 
  Clock, 
  Calendar, 
  User, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle,
  Share2,
  Tag
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export async function generateStaticParams() {
  const articles = await getAllSeoArticles();
  return articles.map((art) => ({
    slug: art.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getSeoArticleBySlug(slug);

  if (!article) {
    return { title: 'Artikkel ikke funnet' };
  }

  return {
    title: `${article.title} | VikingMester Fagkunnskap`,
    description: article.metaDescription,
    keywords: article.targetKeywords,
    alternates: {
      canonical: `${baseUrl}/fag/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.metaDescription,
      url: `${baseUrl}/fag/${slug}`,
      siteName: 'VikingMester',
      locale: 'nb_NO',
      type: 'article',
      publishedTime: article.createdAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.metaDescription,
    },
  };
}

export default async function FagArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getSeoArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const allArticles = await getAllSeoArticles();
  const relatedArticles = allArticles
    .filter((a) => a.slug !== slug)
    .slice(0, 3);

  const formattedDate = new Date(article.updatedAt || article.createdAt).toLocaleDateString('nb-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Fagkunnskap', path: '/fag' },
          { name: article.title, path: `/fag/${slug}` },
        ]}
        faqs={article.faqs}
        article={{
          title: article.title,
          description: article.metaDescription,
          slug: article.slug,
          author: article.author,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          category: article.categoryTitle,
        }}
      />

      {/* Artikkel Header */}
      <section className="pt-12 pb-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto space-y-4">
          <Link
            href="/fag"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-electric-600 hover:text-electric-700 transition-colors"
          >
            <ArrowLeft size={14} />
            Tilbake til alle fagartikler
          </Link>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-electric-700 bg-electric-50 border border-electric-200/60 px-3 py-1 rounded-md">
              {article.categoryTitle}
            </span>
            <span className="text-slate-500 flex items-center gap-1">
              <Calendar size={13} />
              Oppdatert: {formattedDate}
            </span>
            <span className="text-slate-500 flex items-center gap-1">
              <Clock size={13} />
              {article.readTimeMinutes} min lesetid
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-navy-900 tracking-tight leading-tight">
            {article.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
            {article.metaDescription}
          </p>

          <div className="flex items-center gap-2 pt-2 text-xs text-slate-500">
            <User size={14} className="text-electric-600" />
            <span>Faglig kvalitetssikret av: <strong>{article.author}</strong></span>
          </div>
        </div>
      </section>

      {/* Artikkel Hovedinnhold */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="prose prose-slate lg:prose-lg max-w-none prose-headings:font-black prose-headings:text-navy-900 prose-a:text-electric-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-electric-500 prose-blockquote:bg-slate-50 prose-blockquote:p-4 prose-blockquote:rounded-r-xl prose-table:text-sm">
          <ReactMarkdown>{article.contentMarkdown}</ReactMarkdown>
        </div>

        {/* Nøkkelord Tags */}
        {article.targetKeywords && article.targetKeywords.length > 0 && (
          <div className="mt-12 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-2">
            <Tag size={14} className="text-slate-400 mr-1" />
            <span className="text-xs font-bold text-slate-500">Emner:</span>
            {article.targetKeywords.map((kw, i) => (
              <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* FAQ Trekkspill */}
        {article.faqs && article.faqs.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-200 space-y-6">
            <h2 className="text-2xl font-black text-navy-900 flex items-center gap-2">
              <HelpCircle className="text-electric-600" size={24} />
              Ofte stilte spørsmål om dette temaet
            </h2>
            <div className="space-y-4">
              {article.faqs.map((faq, i) => (
                <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h3 className="font-bold text-navy-900 text-base">{faq.question}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Innebygd Konverterings-CTA */}
        <div className="mt-16 p-8 rounded-3xl bg-navy-950 text-white shadow-xl space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-electric-400 uppercase tracking-widest">
              Løs dette automatisk
            </span>
            <h3 className="text-2xl font-black text-white">
              Slipp å lure på kravene – VikingMester ordner det for deg
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              VikingMester har TEK17, Våtromsnormen, NS 8406 og Arbeidstilsynets regler innebygd. Snakk inn dagboken, knips bildene og eksporter godkjente rapporter med ett klikk.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/?action=demo"
              className="px-6 py-3.5 bg-electric-500 hover:bg-electric-600 text-white font-bold rounded-2xl text-center text-sm shadow-lg shadow-electric-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              Prøv gratis i 14 dager
            </Link>
            <Link
              href="/priser"
              className="px-6 py-3.5 bg-navy-900 border border-navy-700 hover:bg-navy-800 text-white font-bold rounded-2xl text-center text-sm transition-colors"
            >
              Se priser (fra kr 690,-)
            </Link>
          </div>
        </div>

        {/* Relaterte artikler */}
        {relatedArticles.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-200 space-y-6">
            <h2 className="text-2xl font-black text-navy-900">Relaterte fagveiledninger</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/fag/${rel.slug}`}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-electric-400 transition-all space-y-2 group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-electric-600 uppercase">
                      {rel.categoryTitle}
                    </span>
                    <h4 className="font-bold text-navy-900 text-sm mt-1 group-hover:text-electric-600 transition-colors line-clamp-2">
                      {rel.title}
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-electric-600 pt-2 block">Les mer →</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <PublicFooter />
    </div>
  );
}