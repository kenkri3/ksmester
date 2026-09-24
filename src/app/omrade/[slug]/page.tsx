import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { NORWAY_LOCATIONS, LocationProfile } from '@/src/constants/norwayLocationsData';
import { 
  MapPin, 
  ShieldCheck, 
  Mic, 
  Camera, 
  FileCheck2, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Building2,
  HardHat,
  HelpCircle
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export async function generateStaticParams() {
  return Object.keys(NORWAY_LOCATIONS).map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loc = NORWAY_LOCATIONS[slug];

  if (!loc) {
    return { title: 'Område ikke funnet' };
  }

  const title = `KS- og HMS-system for håndverkere i ${loc.name} (${loc.county}) | VikingMester`;
  const description = `Norges ledende KS- og HMS-system for byggmestre og håndverkere i ${loc.name}. TEK17, byggedagbok med tale, avvikskontroll og NS 8406 rett fra mobilen.`;

  return {
    title,
    description,
    keywords: [
      `KS-system ${loc.name}`,
      `HMS-system ${loc.name}`,
      `byggeledelse ${loc.name}`,
      `håndverker ${loc.name}`,
      `TEK17 ${loc.name}`,
      `byggmester ${loc.name}`,
      loc.county,
      loc.kommune,
      loc.region
    ],
    alternates: {
      canonical: `${baseUrl}/omrade/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/omrade/${slug}`,
      siteName: 'VikingMester',
      locale: 'nb_NO',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const loc = NORWAY_LOCATIONS[slug];

  if (!loc) {
    notFound();
  }

  // Finn andre byer/steder i samme fylke eller region for krysslenking
  const nearbyLocations = Object.values(NORWAY_LOCATIONS)
    .filter((l) => l.slug !== slug && (l.county === loc.county || l.region === loc.region))
    .slice(0, 6);

  const localFaqs = [
    {
      question: `Hvorfor velger håndverkere i ${loc.name} VikingMester?`,
      answer: `Håndverkere i ${loc.name} og ${loc.county} sparer i snitt 45 minutter per dag ved å snakke inn byggedagboken rett fra byggeplassen, ta TEK17-bildekontroll og sende godkjente endringsvarsler iht. NS 8406 før ekstraarbeid påbegynnes.`
    },
    {
      question: `Oppfyller VikingMester kravene til Arbeidstilsynet og Byggherreforskriften i ${loc.kommune} kommune?`,
      answer: `Ja, VikingMester er 100 % tilpasset norske lover: Internkontrollforskriften, Forskrift om utførelse av arbeid, TEK17 og Byggherreforskriften. Stoffkartotek, SJA og vernerunder fungerer også offline i kjellere og heissjakter.`
    },
    {
      question: `Kan vi prøve VikingMester gratis i ${loc.name}?`,
      answer: `Ja! Du kan starte en uforpliktende 14-dagers prøveperiode uten binding på under 60 sekunder. MesterAI hjelper deg å sette opp prosjektene automatisk.`
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Områder i Norge', path: '/omrade' },
          { name: `${loc.name} (${loc.county})`, path: `/omrade/${slug}` },
        ]}
        faqs={localFaqs}
      />

      {/* Hero-seksjon med lokal forankring */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-purple opacity-30 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-electric-500/20 border border-electric-400/40 text-electric-300 text-xs sm:text-sm font-bold">
            <MapPin size={15} className="text-electric-400" />
            <span>Skreddersydd for håndverkere i {loc.name}, {loc.county}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Norges raskeste KS- og HMS-system for håndverkere i{' '}
            <span className="text-gradient-purple">{loc.name}</span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
            Byggmestre og entreprenører i {loc.name} snakker inn byggedagboken på sekunder, knipser TEK17-kontroll med mobilen og sikrer betaling for tilleggsarbeid iht. NS 8406.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/priser"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-bold text-base shadow-purple-cta transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              Start gratis prøveperiode i {loc.name}
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/ks-system"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-base transition-colors border border-white/20"
            >
              Se hvordan KS fungerer
            </Link>
          </div>
        </div>
      </section>

      {/* Geografisk & Byggeteknisk Innsikt */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-6 items-start">
            <div className="p-3.5 rounded-xl bg-electric-50 text-electric-600 border border-electric-200/60 shrink-0">
              <Building2 size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-navy-900">
                Lokal byggepraksis og myndighetskrav i {loc.kommune} kommune
              </h2>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                {loc.focusClimate} VikingMester er forhåndskonfigurert med sjekklister som møter kravene fra lokale byggesaksmyndigheter i {loc.county} og nasjonale krav i TEK17 og DiBK.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                {loc.popularTrades.map((trade, idx) => (
                  <span key={idx} className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-md">
                    {trade} i {loc.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Hovedsøyler for Håndverkere */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black text-navy-900">
            Alt du trenger for byggeplassen i {loc.name} – rett i lomma
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Gjør unna KS og HMS mens du står på stillaset eller i varebilen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 shadow-card-soft transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Mic size={20} />
            </div>
            <h3 className="text-lg font-bold text-navy-900">Usynlig byggedagbok med tale</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Snakk inn dagens framdrift på vei til brakka. Systemet henter værdata for {loc.name} automatisk fra Yr.no og kobler notatene direkte til prosjektet.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 shadow-card-soft transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Camera size={20} />
            </div>
            <h3 className="text-lg font-bold text-navy-900">TEK17 Bildekontroll & Uavhengig kontroll</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ta bilde av sluk, membran, vindsperre og klemte skjøter. AI-visjon stempler dato, klokkeslett og GPS-posisjon i {loc.name} automatisk.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 shadow-card-soft transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-lg font-bold text-navy-900">HMS, SJA & Digitalt Stoffkartotek</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Full oversikt over vernerunder, RUH-avvik og sikkerhetsdatablader (SDS). 100 % godkjent ved uanmeldt tilsyn fra Arbeidstilsynet i {loc.county}.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 shadow-card-soft transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileCheck2 size={20} />
            </div>
            <h3 className="text-lg font-bold text-navy-900">NS 8406 Endringsordre på 15 sekunder</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kunden ber om noe ekstra? Snakk inn instruksen, og kunden godkjenner varselet digitalt før arbeidet starter. Unngå preklusjon og tapte penger.
            </p>
          </div>
        </div>
      </section>

      {/* Gratis Verktøy for Lokale Byggmestre */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-navy-900">Gratis byggefaglige verktøy for {loc.name}</h2>
            <p className="text-sm text-slate-600">Beregninger og kalkulatorer iht. gjeldende norske standarder.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/verktoy/fall-kalkulator-tek17"
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-electric-500 shadow-xs transition-all text-left group"
            >
              <p className="font-bold text-sm text-navy-900 group-hover:text-electric-600">Fall-kalkulator TEK17</p>
              <p className="text-xs text-slate-500 mt-1">Beregn fall mot sluk og 25 mm oppkant iht. § 13-15.</p>
            </Link>

            <Link
              href="/verktoy/varslingsfrist-ns8406"
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-electric-500 shadow-xs transition-all text-left group"
            >
              <p className="font-bold text-sm text-navy-900 group-hover:text-electric-600">Varslingsfrist NS 8406</p>
              <p className="text-xs text-slate-500 mt-1">Beregn «uten ugrunnet opphold» og unngå preklusjon.</p>
            </Link>

            <Link
              href="/verktoy/sja-generator"
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-electric-500 shadow-xs transition-all text-left group"
            >
              <p className="font-bold text-sm text-navy-900 group-hover:text-electric-600">SJA Generator</p>
              <p className="text-xs text-slate-500 mt-1">Opprett Sikker Jobb Analyse på 60 sekunder.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Ofte Stilte Spørsmål (FAQ) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-navy-900">
            Ofte stilte spørsmål om KS og HMS i {loc.name}
          </h2>
          <p className="text-sm text-slate-600">Hva håndverkere i {loc.county} lurer på før de bytter system.</p>
        </div>

        <div className="space-y-4">
          {localFaqs.map((faq, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
              <h3 className="font-bold text-base text-navy-900 flex items-start gap-2.5">
                <HelpCircle size={18} className="text-electric-600 shrink-0 mt-0.5" />
                {faq.question}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed pl-7">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Krysslenking til nærliggende byer og tettsteder */}
      {nearbyLocations.length > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 border-t border-slate-200">
          <div className="max-w-5xl mx-auto space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              KS- og HMS-system i andre områder i {loc.county} og {loc.region}:
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {nearbyLocations.map((nearby) => (
                <Link
                  key={nearby.slug}
                  href={`/omrade/${nearby.slug}`}
                  className="text-xs font-semibold bg-white border border-slate-200 hover:border-electric-500 text-slate-700 hover:text-electric-600 px-3.5 py-1.5 rounded-lg transition-colors shadow-2xs"
                >
                  {nearby.name} ({nearby.county})
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA-bånd */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-navy-950 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black">
            Klar for en enklere arbeidsdag på byggeplassen i {loc.name}?
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            Bli med hundrevis av norske håndverkere som bruker VikingMester til å spare tid, unngå reklamasjoner og sikre betaling.
          </p>
          <div className="pt-2">
            <Link
              href="/priser"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-bold text-base shadow-purple-cta transition-all hover:scale-105"
            >
              Start 14 dagers gratis prøveperiode
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
