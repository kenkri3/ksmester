import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  HelpCircle,
  Clock,
  Coins
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Priser på KS- og HMS-system | Forutsigbart, ingen binding | VikingMester',
  description: 'Gjennomsiktige priser på Norges råeste KS- og HMS-system. Solo kr 990,- eks mva/mnd for én håndverker. Team kr 3 490,- eks mva/mnd for inntil 5 brukere. 14 dager gratis prøve.',
  alternates: {
    canonical: `${baseUrl}/priser`,
  },
  openGraph: {
    title: 'Priser på KS- og HMS-system | VikingMester',
    description: 'Ingen bindingstid, ingen etableringsgebyrer. Komplett KS, HMS, SJA og byggedagbok tilpasset din håndverksbedrift.',
    url: `${baseUrl}/priser`,
  },
};

const faqs = [
  {
    question: 'Er det bindingstid på abonnementet?',
    answer: 'Nei, hos VikingMester har vi ingen bindingstid. Du kan oppgradere, nedgradere eller si opp abonnementet ditt når som helst med virkning fra neste måned.',
  },
  {
    question: 'Er det noen oppstartskostnader eller etableringsgebyr?',
    answer: 'Nei, kr 0,- i etableringsgebyr. Vi hjelper deg i gang gratis, og du kan teste systemet med alle funksjoner i 14 dager uten å legge inn betalingskort.',
  },
  {
    question: 'Hva koster ekstra brukere utover Team-pakken?',
    answer: 'I Team-pakken er 5 aktive fagarbeidere inkludert. Ekstra brukere koster kun kr 390,- eks mva per måned per bruker.',
  },
  {
    question: 'Får vi fri support inkludert i prisen?',
    answer: 'Ja, fri norsk support på e-post, chat og telefon er inkludert for alle kunder, uansett abonnement.',
  },
];

export default function PriserPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Priser', path: '/priser' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs font-mono font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1.5 rounded-full border border-electric-300/40 inline-block mb-6">
            Forutsigbare priser for norske håndverkere
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-navy-900 mb-6">
            Enkle priser. <span className="text-electric-600">Ingen bindingstid.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Velg pakken som passer din bedrift. Start gratis i 14 dager – ingen kredittkort kreves.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Solo Card */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Enkeltpersonforetak
              </span>
              <h3 className="text-2xl font-bold text-navy-900 mt-1 mb-2">VikingMester Solo</h3>
              <p className="text-slate-600 text-sm mb-6">
                For deg som driver alene og vil ha full kontroll på byggeplassen.
              </p>
              <div className="mb-8">
                <span className="text-4xl font-black text-navy-900">990 kr</span>
                <span className="text-slate-500 text-sm font-medium"> / mnd eks mva</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-700 mb-8">
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>1 aktiv bruker</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Ubegrenset byggedagbok fra tale</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>TEK17 AI-bildekontroll & avvik</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Sikker Jobb Analyse (SJA)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Yr.no automatisk værdata</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>PDF-sluttrapport til kunde</span>
                </li>
              </ul>
            </div>
            <Link
              href="/?action=demo&plan=solo"
              className="w-full py-3 text-center text-sm font-bold text-navy-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Start 14 dagers prøve
            </Link>
          </div>

          {/* Team Card (Featured) */}
          <div className="p-8 rounded-3xl bg-white border-2 border-electric-500 shadow-xl ring-4 ring-electric-500/10 flex flex-col justify-between relative">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-electric-500 text-white font-black text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md">
              Mest populær for bedrifter
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-electric-600">
                Små & mellomstore bedrifter
              </span>
              <h3 className="text-2xl font-bold text-navy-900 mt-1 mb-2">VikingMester Team</h3>
              <p className="text-slate-600 text-sm mb-6">
                For voksende lag som vil ha full samhandling, timer og endringsvarsler.
              </p>
              <div className="mb-8">
                <span className="text-4xl font-black text-navy-900">3 490 kr</span>
                <span className="text-slate-500 text-sm font-medium"> / mnd eks mva</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-700 mb-8">
                <li className="flex items-center gap-2 font-semibold text-navy-900">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Inntil 5 aktive fagarbeidere inkludert</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Alt i Solo-pakken</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Tverrfaglig samhandling (tømrer, el, rør)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Endringsordrer & fristvarsel (NS 8406)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Digitalt stoffkartotek offline</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Flerspråklig støtte (Polsk/Ukrainsk)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Prioritert telefonsupport</span>
                </li>
              </ul>
            </div>
            <Link
              href="/?action=demo&plan=team"
              className="w-full py-3.5 text-center text-sm font-bold text-white bg-electric-500 hover:bg-electric-600 rounded-xl transition-all shadow-md shadow-electric-500/25"
            >
              Start gratis prøveperiode
            </Link>
          </div>

          {/* Entreprenør Card */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Større entreprenører
              </span>
              <h3 className="text-2xl font-bold text-navy-900 mt-1 mb-2">Entreprenør</h3>
              <p className="text-slate-600 text-sm mb-6">
                For konsern med behov for skreddersydde integrasjoner og API-er.
              </p>
              <div className="mb-8">
                <span className="text-3xl font-black text-navy-900">Tilpasset</span>
                <span className="text-slate-500 text-sm font-medium"> / etter avtale</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-700 mb-8">
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Ubegrenset antall fagarbeidere</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Underentreprenør-portal</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>ERP/Økonomi API-bro (Tripletex/PowerOffice)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Dedikert kontaktperson & opplæring</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Garantert oppetid (SLA 99.9%)</span>
                </li>
              </ul>
            </div>
            <Link
              href="/kontakt"
              className="w-full py-3 text-center text-sm font-bold text-navy-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Ta kontakt for tilbud
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-black text-center text-navy-900 mb-12">
          Ofte stilte spørsmål om priser
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
