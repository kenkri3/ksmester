import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  Camera, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight,
  FileCheck,
  Check
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Avvikshåndtering for håndverkere – TEK17-visjon på 5 sekunder | VikingMester',
  description: 'Knips et bilde av avviket, og la AI formulere korrekt lovhjemmel iht. TEK17 og Våtromsnormen BVN. Tildel tiltak og lukk avvik på rekordtid.',
  alternates: {
    canonical: `${baseUrl}/avvikshandtering`,
  },
  openGraph: {
    title: 'Avvikshåndtering for håndverkere – TEK17-visjon på 5 sekunder | VikingMester',
    description: 'Norges råeste verktøy for avvikshåndtering på byggeplassen. AI bildeanalyse verifiserer utførelsen mot TEK17 og sender rapporten direkte.',
    url: `${baseUrl}/avvikshandtering`,
  },
};

const faqs = [
  {
    question: 'Hvordan fungerer TEK17-bildevisjon i VikingMester?',
    answer: 'Du tar et bilde med mobilkameraet av konstruksjonen eller monteringen (f.eks. klemring i sluk, rør-i-rør, dampsperre eller armering). VikingMesters AI analyserer bildet mot TEK17 og Våtromsnormen, oppdager feil eller mangler, og formulerer en ferdig avviksmelding med forslag til utbedring.',
  },
  {
    question: 'Hvorfor er det viktig å dokumentere avvik med bilder?',
    answer: 'Skjulte feil som oppdages etter at vegger er lukket eller gulv er støpt, fører til kostbare rettssaker og erstatningsansvar. Bildedokumentasjon med GPS og tidsstempel gir ubestridelig bevis på når og hvordan arbeidet ble utført.',
  },
  {
    question: 'Kan jeg tildele avvik direkte til underentreprenører?',
    answer: 'Ja, du kan tildele avviket direkte til rørlegger, elektriker eller maler med en frist for utbedring. De mottar et varsel og kan laste opp bilde av utført retting for umiddelbar godkjenning.',
  },
];

export default function AvvikshandteringPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Avvikshåndtering', path: '/avvikshandtering' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-50/40 to-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-100/80 border border-amber-300/60 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-800 mb-6">
            <Camera size={16} />
            <span>AI Bildekontroll iht. TEK17 & BVN</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-navy-900 mb-6 leading-tight">
            Avvikshåndtering med <span className="text-amber-600">TEK17-visjon</span> på 5 sekunder
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Knips bilde av feilen eller konstruksjonen på byggeplassen. VikingMester finner lovhjemmelen, oppretter avviket og varsler underentreprenøren automatisk.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/?action=demo"
              className="w-full sm:w-auto px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-600/25 transition-all flex items-center justify-center gap-2 text-base"
            >
              <Sparkles size={18} />
              Prøv avviksappen gratis
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

      {/* Steps */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <h2 className="text-3xl font-black text-center text-navy-900 mb-16">
          Slik fungerer avvikshåndtering i VikingMester
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500 text-white font-black text-lg flex items-center justify-center mx-auto">
              1
            </div>
            <h3 className="text-xl font-bold text-navy-900">1. Knips bilde</h3>
            <p className="text-slate-600 text-sm">
              Åpne appen og ta et bilde av situasjonen. Bildet geokodes og tidsstemples automatisk for rettslig holdbarhet.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500 text-white font-black text-lg flex items-center justify-center mx-auto">
              2
            </div>
            <h3 className="text-xl font-bold text-navy-900">2. AI tolker TEK17</h3>
            <p className="text-slate-600 text-sm">
              AI-modellen gjenkjenner komponenter og sjekker mot TEK17 og Våtromsnormen. Du får ferdig forslag til tittel, alvorlighetsgrad og tiltak.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500 text-white font-black text-lg flex items-center justify-center mx-auto">
              3
            </div>
            <h3 className="text-xl font-bold text-navy-900">3. Lukk med kvittering</h3>
            <p className="text-slate-600 text-sm">
              Når utbedringen er utført, knipses et etter-bilde. Avviket lukkes og legges automatisk inn i prosjektets KS-sluttrapport.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-black text-center text-navy-900 mb-12">
          Ofte stilte spørsmål om avvik
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
