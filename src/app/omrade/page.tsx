import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { NORWAY_LOCATIONS, NORWAY_COUNTIES } from '@/src/constants/norwayLocationsData';
import { MapPin, ArrowRight, Building2, HardHat, ShieldCheck, CheckCircle2 } from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'KS- og HMS-system for håndverkere i hele Norge – Alle fylker og byer | VikingMester',
  description: 'Oversikt over VikingMester KS- og HMS-system for byggmestre og entreprenører i alle Norges fylker, byer og tettsteder. TEK17, byggedagbok og NS 8406 i lomma.',
  alternates: {
    canonical: `${baseUrl}/omrade`,
  },
  openGraph: {
    title: 'KS- og HMS-system for håndverkere i hele Norge | VikingMester',
    description: 'Norges mest komplette KS- og HMS-system tilpasset lokale byggeforskrifter og entreprenører i alle fylker og byer.',
    url: `${baseUrl}/omrade`,
    siteName: 'VikingMester',
    locale: 'nb_NO',
    type: 'website',
  },
};

export default function OmradeHubPage() {
  const locations = Object.values(NORWAY_LOCATIONS);

  // Grupper steder etter fylke
  const groupedByCounty: Record<string, typeof locations> = {};
  for (const loc of locations) {
    if (!groupedByCounty[loc.county]) {
      groupedByCounty[loc.county] = [];
    }
    groupedByCounty[loc.county].push(loc);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Områder i Norge', path: '/omrade' },
        ]}
      />

      {/* Hero */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-electric-500/20 border border-electric-400/30 text-electric-300 text-xs sm:text-sm font-bold">
            <MapPin size={15} className="text-electric-400" />
            <span>Landsdekkende KS- & HMS-system</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            KS- og HMS-system for håndverkere i{' '}
            <span className="text-gradient-purple">hele Norge</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal">
            Fra Kristiansand i sør til Alta i nord. VikingMester hjelper byggmestre og entreprenører med TEK17, byggedagbok, avvik og NS 8406 på byggeplasser over hele landet.
          </p>
        </div>
      </section>

      {/* Rask oversikt over alle fylker */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-navy-900 mb-6 text-center">
            Norges fylker – Velg ditt distrikt
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {NORWAY_COUNTIES.map((county) => (
              <a
                key={county.slug}
                href={`#${county.slug}`}
                className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:text-purple-600 font-bold text-sm text-center shadow-2xs transition-colors"
              >
                {county.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Detaljert fylkes- og byoversikt */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-16">
        {NORWAY_COUNTIES.map((county) => {
          const countyLocations = groupedByCounty[county.name] || [];
          if (countyLocations.length === 0) return null;

          return (
            <div key={county.slug} id={county.slug} className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <Building2 size={24} className="text-electric-600" />
                <div>
                  <h2 className="text-2xl font-black text-navy-900">{county.name}</h2>
                  <p className="text-xs text-slate-500 font-medium">{county.region} · Byer og tettsteder</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                {countyLocations.map((loc) => (
                  <Link
                    key={loc.slug}
                    href={`/omrade/${loc.slug}`}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-electric-500 shadow-card-soft transition-all hover:translate-y-[-2px] group block"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base text-navy-900 group-hover:text-electric-600">
                        {loc.name}
                      </span>
                      <ArrowRight size={16} className="text-slate-400 group-hover:text-electric-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {loc.focusClimate}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {loc.popularTrades.slice(0, 3).map((trade, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          {trade}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-navy-950 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-5">
          <h2 className="text-3xl sm:text-4xl font-black">
            Bli en del av Norges ledende håndverker-nettverk
          </h2>
          <p className="text-slate-300">
            Spar tid hver eneste dag med talebyggedagbok, automatisk avvikskontroll og juridisk vanntette endringsvarsler.
          </p>
          <div className="pt-2">
            <Link
              href="/priser"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-bold text-base shadow-purple-cta transition-all hover:scale-105"
            >
              Start gratis prøveperiode i dag
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
