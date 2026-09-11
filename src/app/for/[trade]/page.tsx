import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { TRADES_SEO_DATA } from '@/src/constants/tradesSeoData';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  FileCheck, 
  AlertTriangle, 
  Check
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export async function generateStaticParams() {
  return Object.keys(TRADES_SEO_DATA).map((trade) => ({
    trade,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ trade: string }>;
}): Promise<Metadata> {
  const { trade } = await params;
  const profile = TRADES_SEO_DATA[trade];
  if (!profile) return { title: 'Faggruppe ikke funnet' };

  return {
    title: `${profile.title} | VikingMester`,
    description: profile.metaDescription,
    alternates: {
      canonical: `${baseUrl}/for/${trade}`,
    },
    openGraph: {
      title: profile.title,
      description: profile.metaDescription,
      url: `${baseUrl}/for/${trade}`,
      siteName: 'VikingMester',
      locale: 'nb_NO',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: profile.title,
      description: profile.metaDescription,
    },
  };
}

export default async function TradePage({
  params,
}: {
  params: Promise<{ trade: string }>;
}) {
  const { trade } = await params;
  const profile = TRADES_SEO_DATA[trade];

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Bransjer', path: '/for/' + trade },
          { name: profile.name, path: `/for/${trade}` },
        ]}
        faqs={profile.faqs}
      />

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-50/50 border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-electric-50 border border-electric-200/60 px-3.5 py-1.5 rounded-full text-xs font-bold text-electric-700 mb-6">
            <ShieldCheck size={16} />
            <span>{profile.heroBadge}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-navy-900 mb-6 leading-tight">
            {profile.h1}
          </h1>
          <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            {profile.leadParagraph}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/?action=demo"
              className="w-full sm:w-auto px-8 py-4 bg-electric-500 hover:bg-electric-600 text-white font-bold rounded-2xl shadow-lg shadow-electric-500/25 transition-all flex items-center justify-center gap-2 text-base"
            >
              <Sparkles size={18} />
              Prøv gratis for {profile.name} i 14 dager
            </Link>
            <Link
              href="/priser"
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-navy-900 font-bold rounded-2xl transition-colors text-base"
            >
              Se priser (fra kr 990,-)
            </Link>
          </div>

          {/* Standarder og sertifiseringer tags */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-2">Støtter og dokumenterer:</span>
            {profile.standards.map((std, idx) => (
              <span key={idx} className="text-xs font-medium bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200/60">
                {std}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 3 Skreddersydde Funksjoner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold text-electric-600 uppercase tracking-widest">
            Fagtilpasset effektivitet
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-navy-900 mt-2 mb-4">
            Laget for hverdagen til en {profile.name.toLowerCase()}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Vi har fjernet alt overflødig byråkrati. Appen forstår dine faguttrykk, verneutstyr og sjekkpunkter.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {profile.features.map((feat, idx) => (
            <div key={idx} className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-lg transition-all space-y-4 flex flex-col justify-between">
              <div>
                <div className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-electric-100 text-electric-700 mb-4">
                  {feat.badge}
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-2">{feat.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typiske avvik vi forhindrer */}
      <section className="py-16 bg-navy-950 text-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
              Risikoreduksjon
            </span>
            <h2 className="text-3xl font-black mt-2">
              Vanlige fallgruver for {profile.name.toLowerCase()} som VikingMester fanger opp
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {profile.deviations.map((dev, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                  <AlertTriangle size={18} className="shrink-0" />
                  <h4>{dev.title}</h4>
                </div>
                <p className="text-slate-400 text-sm pl-6">
                  <strong className="text-slate-300">Konsekvens:</strong> {dev.consequence}
                </p>
                <p className="text-emerald-400 text-sm pl-6 flex items-center gap-1.5">
                  <Check size={16} className="shrink-0" />
                  <span><strong>Løsning i appen:</strong> {dev.solution}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Eksempel på sjekkliste */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-black text-navy-900 mb-3">
            Ferdige sjekklister rett på mobilen
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Ingen grunn til å finne opp kruttet på nytt. Du får ferdige kontrollpunkter kalibrert mot TEK17 og norske standarder.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profile.checklist.map((block, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 font-bold text-navy-900 text-lg border-b border-slate-200 pb-3">
                <FileCheck className="text-electric-600" size={20} />
                <h3>{block.category}</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-700">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Ofte stilte spørsmål */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full border-t border-slate-200">
        <h2 className="text-3xl font-black text-center text-navy-900 mb-12">
          Ofte stilte spørsmål for {profile.name.toLowerCase()}
        </h2>
        <div className="space-y-6">
          {profile.faqs.map((faq, i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-navy-900 text-base mb-2">{faq.question}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Konvertering CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-electric-50 border-t border-electric-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-navy-900">
            Klar for å fjerne papirarbeidet i bedriften din?
          </h2>
          <p className="text-slate-600 text-base max-w-2xl mx-auto">
            Prøv VikingMester gratis i 14 dager. Ingen kredittkort, ingen bindingstid. Klar til bruk på 2 minutter.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link
              href="/?action=demo"
              className="px-8 py-4 bg-electric-500 hover:bg-electric-600 text-white font-bold rounded-2xl shadow-lg shadow-electric-500/25 transition-all text-base"
            >
              Start 14 dagers gratis prøveperiode
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}