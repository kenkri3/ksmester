import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  WifiOff, 
  Search, 
  ArrowRight,
  Download,
  Package
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Stoffkartotek for håndverkere – Sikkerhetsdatablader offline | VikingMester',
  description: 'Lovpålagt elektronisk stoffkartotek for bygg og anlegg. Søk i tusenvis av sikkerhetsdatablader (SDS), se førstehjelpstiltak og personlig verneutstyr rett på mobilen, også offline.',
  alternates: {
    canonical: `${baseUrl}/stoffkartotek`,
  },
  openGraph: {
    title: 'Stoffkartotek for håndverkere – Sikkerhetsdatablader offline | VikingMester',
    description: 'Oppfyll forskrift om utførelse av arbeid kapittel 2. Ha sikkerhetsdatabladene for lim, fugemasse og kjemikalier tilgjengelig for alle ansatte.',
    url: `${baseUrl}/stoffkartotek`,
  },
};

const faqs = [
  {
    question: 'Hva krever loven om stoffkartotek for håndverksbedrifter?',
    answer: 'I henhold til Forskrift om utførelse av arbeid § 2-1 er alle arbeidsgivere som oppbevarer eller håndterer farlige kjemikalier pålagt å opprette et stoffkartotek. Kartoteket skal være lett tilgjengelig for alle arbeidstakere på det språket de forstår.',
  },
  {
    question: 'Fungerer stoffkartoteket offline uten mobildekning?',
    answer: 'Ja, VikingMester bufrer automatisk prosjektets sikkerhetsdatablader og førstehjelpsinstrukser på telefonen, slik at du har full tilgang i kjellere, heissjakter og i distrikter uten 4G/5G-dekning.',
  },
  {
    question: 'Hvor oppdaterte er sikkerhetsdatabladene (SDS)?',
    answer: 'VikingMester er integrert med nasjonale databaser og produsenters oppdaterte SDS. Når en leverandør oppdaterer et datablad, synkroniseres det automatisk til ditt stoffkartotek.',
  },
];

export default function StoffkartotekPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Stoffkartotek', path: '/stoffkartotek' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50/40 to-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100/80 border border-blue-300/60 px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-800 mb-6">
            <FileText size={16} />
            <span>Forskrift om utførelse av arbeid kap. 2</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-navy-900 mb-6 leading-tight">
            Lovpålagt <span className="text-blue-600">stoffkartotek</span> i lomma på hele laget
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Få full kontroll på kjemikalier, lim, fugemasser og maling. Søk opp sikkerhetsdatablader og se påkrevd verneutstyr på sekundet, også offline.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/?action=demo"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-base"
            >
              <Sparkles size={18} />
              Prøv stoffkartoteket gratis
            </Link>
            <Link
              href="/priser"
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-navy-900 font-bold rounded-2xl transition-colors text-base"
            >
              Se priser (fra kr 1 490,-)
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Search size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">Lynraskt produktsøk</h3>
            <p className="text-slate-600 text-sm">
              Søk etter produktnavn eller strekkode. Finn databladet for Sikaflex, Tec7, Casco eller Jotun på to sekunder.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <WifiOff size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">100 % Offline-modus</h3>
            <p className="text-slate-600 text-sm">
              VikingMester laster ned sikkerhetsdatabladene lokalt, slik at du har umiddelbar tilgang ved uhell selv i betongkjellere uten dekning.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">Førstehjelp & Farepiktogrammer</h3>
            <p className="text-slate-600 text-sm">
              Tydelige faremerker, påkrevd åndedrettsvern/hansker og nøyaktig førstehjelpsveiledning ved hudkontakt eller øyeskader.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Package size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">NOBB Varebase & SDS</h3>
            <p className="text-slate-600 text-sm">
              Koble til bedriftens egen NOBB API-nøkkel (BYOK) for automatisk innhenting av offisielle sikkerhetsdatablader direkte fra Norsk Byggevarebase.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-black text-center text-navy-900 mb-12">
          Ofte stilte spørsmål om stoffkartotek
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-navy-900 text-base mb-2">{faq.question}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
