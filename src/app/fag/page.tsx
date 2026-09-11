import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { getAllSeoArticles } from '@/src/lib/server/autonomousSeoEngine';
import { 
  BookOpen, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  FileText, 
  Layers, 
  Wrench,
  Search
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Fagkunnskap & Lovkrav for Byggebransjen – TEK17, HMS og Norsk Standard',
  description: 'Autoritative fagartikler og veiledninger for norske håndverkere og entreprenører. Lær kravene til TEK17, NS 8406, Våtromsnormen og Arbeidstilsynets forskrifter.',
  alternates: {
    canonical: `${baseUrl}/fag`,
  },
  openGraph: {
    title: 'Fagkunnskap & Lovkrav for Byggebransjen | VikingMester',
    description: 'Veiledninger for norske håndverkere. TEK17, NS 8406, SJA og internkontroll.',
    url: `${baseUrl}/fag`,
    siteName: 'VikingMester',
    locale: 'nb_NO',
    type: 'website',
  },
};

export default async function FagHubPage() {
  const articles = await getAllSeoArticles();

  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Fagkunnskap', path: '/fag' },
        ]}
      />

      {/* Hero */}
      <section className="pt-16 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-50/60 border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-electric-50 border border-electric-200/60 px-3.5 py-1.5 rounded-full text-xs font-bold text-electric-700">
            <BookOpen size={16} />
            <span>VikingMester Kunnskapsbase & Forskrifts-Wiki</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-navy-900 tracking-tight">
            Fagkunnskap & Lovkrav <span className="text-electric-600">for Håndverkere</span>
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
            Praktiske forklaringer av TEK17, Norsk Standard (NS 8405/8406), HMS og internkontroll skrevet for byggeplassen, ikke advokatkontoret.
          </p>
        </div>
      </section>

      {/* Raske lenker til gratis verktøy og bransjer */}
      <section className="py-8 bg-slate-50 border-b border-slate-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Wrench size={16} className="text-electric-600" />
            <span>Populære Verktøy:</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <Link 
              href="/verktoy/varslingsfrist-ns8406"
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-electric-400 hover:text-electric-600 transition-colors"
            >
              NS 8406 Fristkalkulator
            </Link>
            <Link 
              href="/verktoy/fall-kalkulator-tek17"
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-electric-400 hover:text-electric-600 transition-colors"
            >
              TEK17 Våtrom Fallkalkulator
            </Link>
            <Link 
              href="/verktoy/sja-generator"
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-electric-400 hover:text-electric-600 transition-colors"
            >
              Gratis SJA Generator
            </Link>
          </div>
        </div>
      </section>

      {/* Artikkeloversikt */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-black text-navy-900">Alle fagartikler & veiledninger</h2>
            <p className="text-xs text-slate-500 mt-1">Totalt {articles.length} autoritative artikler</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((art) => (
            <Link
              key={art.id}
              href={`/fag/${art.slug}`}
              className="group p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-electric-300 hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-electric-600 uppercase tracking-wider bg-electric-50 px-2.5 py-1 rounded-md">
                    {art.categoryTitle}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Clock size={12} />
                    {art.readTimeMinutes} min
                  </span>
                </div>

                <h3 className="font-bold text-navy-900 text-lg group-hover:text-electric-600 transition-colors line-clamp-2">
                  {art.title}
                </h3>

                <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">
                  {art.metaDescription}
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-electric-600">
                <span>Les hele veiledningen</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Fag-portaler CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-navy-900">
            Se hvordan VikingMester tilpasses ditt håndverksfag
          </h2>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[
              { name: 'Tømrer', href: '/for/tomrer' },
              { name: 'Rørlegger', href: '/for/rorlegger' },
              { name: 'Elektriker', href: '/for/elektriker' },
              { name: 'Murer', href: '/for/murer' },
              { name: 'Maler', href: '/for/maler' },
              { name: 'Grunnarbeid', href: '/for/grunnarbeid' },
              { name: 'Blikkenslager', href: '/for/blikkenslager' },
            ].map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="px-4 py-2 bg-white border border-slate-300 hover:border-electric-500 text-navy-900 font-bold rounded-xl text-xs transition-all shadow-xs"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}