import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  Building2, 
  CheckCircle2, 
  Sparkles, 
  Mic, 
  FileText, 
  Coins, 
  Clock, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Prosjektstyring for håndverkere – Byggedagbok & Endringsordrer | VikingMester',
  description: 'Prosjektstyring uten papirkaos. Snakk inn byggedagboken, lås inn uvarslet ekstraarbeid med NS 8406 og få betalt for hver eneste time du og gutta jobber.',
  alternates: {
    canonical: `${baseUrl}/prosjektstyring`,
  },
  openGraph: {
    title: 'Prosjektstyring for håndverkere – Byggedagbok & Endringsordrer | VikingMester',
    description: 'Slutt å tape penger på uvarslet ekstraarbeid. Generer juridisk vanntette endringsmeldinger på sekundet rett fra byggeplassen.',
    url: `${baseUrl}/prosjektstyring`,
  },
};

const faqs = [
  {
    question: 'Hvorfor taper håndverkere penger på ekstraarbeid?',
    answer: 'Ifølge NS 8406 og Håndverkertjenesteloven § 9 taper entreprenøren retten til betaling dersom endringen ikke varsles skriftlig «uten ugrunnet opphold». Fordi håndverkere har hendene fulle på byggeplassen, blir varselet ofte glemt til sluttoppgjøret – da nekter kunden å betale.',
  },
  {
    question: 'Hvordan løser VikingMester endringsvarsling?',
    answer: 'Du trykker på mikrofonen og sier: «Kunden ba om 6 ekstra downlights og trekkerør i stua». VikingMester beregner påslag, formulerer endringsmeldingen iht. NS 8406 pkt. 19, og sender varselet direkte til kundens telefon for godkjenning.',
  },
  {
    question: 'Hvordan fungerer timeføringen og byggedagboken?',
    answer: 'Hver fagarbeider snakker inn dagens innsats på 20 sekunder. Systemet knytter timene til prosjektet, henter værdata fra Yr.no, og gir daglig leder full kontroll over påløpte kostnader versus tilbud.',
  },
];

export default function ProsjektstyringPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Prosjektstyring', path: '/prosjektstyring' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200/60 px-3.5 py-1.5 rounded-full text-xs font-bold text-purple-700 mb-6">
            <Coins size={16} />
            <span>Få betalt for alt ekstraarbeid (NS 8406)</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-navy-900 mb-6 leading-tight">
            Prosjektstyring som <span className="text-purple-600">tetter pengeslukene</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Håndverkere taper i snitt 120 000 kr i året på uvarslede endringer. Snakk inn ekstraarbeidet, få kundens digitale godkjenning på 30 sekunder, og lås inn overskuddet ditt.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/?action=demo"
              className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 text-base"
            >
              <Sparkles size={18} />
              Prøv prosjektstyring gratis
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Mic size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">Tale-til-Endringsordre</h3>
            <p className="text-slate-600 text-sm">
              Snakk inn endringen på byggeplassen. AI formulerer juridisk korrekt varsel iht. NS 8406 pkt. 19 og sender for aksept.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Clock size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">Autonom Byggedagbok</h3>
            <p className="text-slate-600 text-sm">
              Ferdig byggedagbok med værdata fra Yr.no, fremdriftsprosent og bemanning lagret og søkbart for all framtid.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Coins size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">100 % Sluttoppgjør</h3>
            <p className="text-slate-600 text-sm">
              Når prosjektet avsluttes, er alle timer, materialer og endringsordrer allerede forhåndsgodkjent. Ingen diskusjoner.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-black text-center text-navy-900 mb-12">
          Ofte stilte spørsmål om prosjektstyring
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
