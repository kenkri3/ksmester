import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  ArrowRight,
  HardHat
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Sikker Jobb Analyse (SJA) app for byggeplass | VikingMester',
  description: 'Gjennomfør lovpålagt Sikker Jobb Analyse (SJA) på under 60 sekunder på mobilen. Ferdige risikomaler for varme arbeider, stillas, tak, graving og el-arbeid.',
  alternates: {
    canonical: `${baseUrl}/sja`,
  },
  openGraph: {
    title: 'Sikker Jobb Analyse (SJA) app for byggeplass | VikingMester',
    description: 'Rask og enkel SJA rett i lomma. Dokumenter risikovurdering og forebyggende tiltak før risikofylt arbeid starter.',
    url: `${baseUrl}/sja`,
  },
};

const faqs = [
  {
    question: 'Når er det lovpålagt å gjennomføre en Sikker Jobb Analyse (SJA)?',
    answer: 'En SJA skal gjennomføres når et arbeid avviker fra standard rutiner, eller når det utføres risikofylte oppgaver som arbeid i høyden, varme arbeider, graving dypere enn 1,5 meter, arbeid i trange rom eller ved håndtering av farlige stoffer.',
  },
  {
    question: 'Hvor lang tid tar det å fylle ut en SJA i VikingMester?',
    answer: 'Under ett minutt! Med ferdig definerte risikoscenarier og stemme-til-tekst velger du bare arbeidstype, huker av for identifiserte farer og tiltak, og signerer digitalt med fingeren.',
  },
  {
    question: 'Kan flere håndverkere signere på samme SJA?',
    answer: 'Ja, hele arbeidslaget kan signere på mobilskjermen eller bekrefte deltakelse via lenke for å dokumentere at alle har deltatt i sikkerhetsgjennomgangen.',
  },
];

export default function SjaPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'SJA', path: '/sja' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-red-50/40 to-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-red-100/80 border border-red-300/60 px-3.5 py-1.5 rounded-full text-xs font-bold text-red-800 mb-6">
            <AlertTriangle size={16} />
            <span>Risikovurdering før farlig arbeid</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-navy-900 mb-6 leading-tight">
            Gjennomfør <span className="text-red-600">SJA</span> på under 60 sekunder
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Sikker Jobb Analyse uten kjedelige papirskjemaer. Velg arbeidstype, huk av for tiltak, og signer rett på mobilskjermen ute på byggeplassen.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/?action=demo"
              className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 text-base"
            >
              <Sparkles size={18} />
              Prøv SJA-appen gratis
            </Link>
            <Link
              href="/priser"
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-navy-900 font-bold rounded-2xl transition-colors text-base"
            >
              Se priser (fra kr 990,-)
            </Link>
          </div>
        </div>
      </section>

      {/* Mal-oversikt */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <h2 className="text-3xl font-black text-center text-navy-900 mb-16">
          Ferdige risikomaler tilpasset norske forhold
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-navy-900 text-base">Arbeid i høyden & stillas</div>
            <p className="text-xs text-slate-500">Sikring mot fall, rekkverk, forankring, hjelm med hakestropp og værforhold.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-navy-900 text-base">Varme arbeider & sveising</div>
            <p className="text-xs text-slate-500">Slukkeutstyr, brannvakt, brennbart materiale og 60 min etterkontroll.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-navy-900 text-base">Graving & rørgrøfter</div>
            <p className="text-xs text-slate-500">Gravedybde over 1,5m, rasfare, kabelpåvisning og sikring av grøftekant.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-navy-900 text-base">Elektrisk spenning</div>
            <p className="text-xs text-slate-500">Frakobling, AUS (arbeid under spenning), verneutstyr og lockout/tagout.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-navy-900 text-base">Tunge løft & kraning</div>
            <p className="text-xs text-slate-500">Løfteredskap, anhuking, avsperret sikkerhetssone og kommunikasjon.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-navy-900 text-base">Asbest & miljøgifter</div>
            <p className="text-xs text-slate-500">Verneutstyr, støvavsug, forsegling og deponering iht. Arbeidstilsynets regler.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-black text-center text-navy-900 mb-12">
          Ofte stilte spørsmål om SJA
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
