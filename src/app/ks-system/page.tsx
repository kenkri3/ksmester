import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Mic, 
  Camera, 
  FileText, 
  ArrowRight, 
  Award,
  Layers,
  FileCheck,
  Check,
  Building2,
  Users,
  Radio,
  Package
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'KS-system for håndverkere – Komplett kvalitetssikring i lomma',
  description: 'Norges mest brukervennlige KS-system for snekkere, tømrere, rørleggere og elektrikere. Snakk inn byggedagboken, knips TEK17-avvik og få ferdige sluttrapporter på sekunder.',
  alternates: {
    canonical: `${baseUrl}/ks-system`,
  },
  openGraph: {
    title: 'KS-system for håndverkere – Komplett kvalitetssikring i lomma | VikingMester',
    description: 'Norges råeste kvalitetssikringssystem for byggebransjen. Lagd for å oppfylle TEK17 og fjerne papirarbeid med tale og kunstig intelligens.',
    url: `${baseUrl}/ks-system`,
  },
};

const faqs = [
  {
    question: 'Hva er et KS-system, og hvorfor er det lovpålagt?',
    answer: 'Et kvalitetssikringssystem (KS-system) er bedriftens dokumenterte rutiner for å sikre at byggearbeider utføres i henhold til Byggteknisk forskrift (TEK17) og gjeldende standarder. Plan- og bygningsloven krever at alle foretak kan dokumentere at utført arbeid er i samsvar med tillatelser og forskrifter.',
  },
  {
    question: 'Hvorfor er VikingMester bedre enn tradisjonelle KS-systemer?',
    answer: 'Tradisjonelle systemer krever tung manuell skjemautfylling på PC etter endt arbeidsdag. VikingMester er bygget for mobilen ute på byggeplassen: Du snakker inn byggedagboken på 20 sekunder, tar bilder som analyseres automatisk mot TEK17, og genererer revisjonsgodkjente rapporter med ett klikk.',
  },
  {
    question: 'Oppfyller VikingMester kravene til TEK17 og Våtromsnormen (BVN)?',
    answer: 'Ja, VikingMester har innebygde sjekklister og bildeanalyse kalibrert mot TEK17 og Byggebransjens våtromsnorm (BVN 31.205). Bildene du tar merkes med tidsstempel, GPS-posisjon og faglig kontrollpunkt.',
  },
  {
    question: 'Kan jeg eksportere ferdige KS-rapporter til byggherre og Boligmappa?',
    answer: 'Ja, med ett klikk genererer VikingMester en komplett, revisjonsgodkjent PDF-rapport med bilder, sjekklister, avvik og byggedagbok som kan sendes direkte til byggherre, takstmann eller lastes opp i Boligmappa.',
  },
  {
    question: 'Kan vi koble til NOBB for automatisk FDV-dokumentasjon?',
    answer: 'Ja! VikingMester støtter direkte kobling mot Norsk Byggevarebase (NOBB). Bedriften kan legge inn sin egen API-nøkkel (BYOK) for å hente godkjente FDV-dokumenter, sikkerhetsdatablader og EPD-miljødata rett inn i prosjektets kvalitetssikringsperm.',
  },
  {
    question: 'Hvordan varsles fagarbeidere om avvik og nye oppgaver?',
    answer: 'I tillegg til varsler i appen har VikingMester full Omnichannel-støtte for Discord, Slack og MS Teams i alle pakker. Avvik og oppgaver plinger direkte inn i teamets eksisterende kommunikasjonskanaler ute i felt.',
  },
];

export default function KsSystemPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'KS-system', path: '/ks-system' },
        ]}
        faqs={faqs}
      />

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-electric-50 border border-electric-200/60 px-3.5 py-1.5 rounded-full text-xs font-bold text-electric-700 mb-6">
            <ShieldCheck size={16} />
            <span>100% Autonomt KS-system med MesterAI • TEK17 & NS 8406</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-navy-900 mb-6 leading-tight">
            Norges råeste <span className="text-electric-600">autonome KS-system</span> for håndverkere
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Fjern papirarbeidet og kveldsjobbingen. Snakk inn dagboken, knips bildene med automatisk TEK17-sjekk, og la MesterAI overlevere fiks ferdige sluttrapporter til kunden på sekunder.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/?action=demo"
              className="w-full sm:w-auto px-8 py-4 bg-electric-500 hover:bg-electric-600 text-white font-bold rounded-2xl shadow-lg shadow-electric-500/25 transition-all flex items-center justify-center gap-2 text-base"
            >
              <Sparkles size={18} />
              Prøv gratis i 14 dager
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

      {/* 3 Core Value Props */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-navy-900 mb-4">
            Bygget for hverdagen ute på byggeplassen
          </h2>
          <p className="text-slate-600">
            Tradisjonelle KS-programmer ble lagd for kontorister på 90-tallet. VikingMester er bygget med moderne AI for håndverkere med støv på fingrene.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-lg transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-electric-100 text-electric-600 flex items-center justify-center">
              <Mic size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">Snakk inn byggedagboken</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Trykk på mikrofonen og fortell hva du har gjort i dag. VikingMester strukturerer notatet, fører timene, og henter automatisk inn temperatur og værforhold fra Yr.no.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-lg transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Camera size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">TEK17 Bildevisjon</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Knips slukmansjett, klemring, dampsperre eller armering. Vår AI-bildekontroll sjekker utførelsen mot TEK17 og Våtromsnormen før du lukker veggen eller støper gulvet.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-lg transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Radio size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">Omnichannel Feltvarsling</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Koble opp Discord, Slack eller MS Teams. Varsler om avvik, kontroller og nye oppgaver sendes rett til håndverkernes eksisterende mobilapper.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-lg transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <Package size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">NOBB Varebase & FDV</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Koble til bedriftens egen NOBB API-nøkkel (BYOK). Søk blant over 1 million byggevarer og importer godkjente FDV-dokumenter direkte.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-lg transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileCheck size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">1-Klikks Sluttrapport</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Når prosjektet er ferdig, trykker du på én knapp. Systemet setter sammen alle sjekklister, bilder, avvik og dagbøker til en ferdig PDF som kunden og banken elsker.
            </p>
          </div>
        </div>
      </section>

      {/* Lovkrav og samsvar */}
      <section className="py-16 bg-navy-950 text-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-mono font-bold text-electric-400 uppercase tracking-widest">
              Full trygghet ved tilsyn
            </span>
            <h2 className="text-3xl font-black mt-2">
              All dokumentasjon lovpålagt i Norge
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 flex items-start gap-4">
              <CheckCircle2 className="text-emerald-400 shrink-0 mt-1" size={20} />
              <div>
                <h4 className="font-bold text-base mb-1">Byggteknisk forskrift (TEK17)</h4>
                <p className="text-slate-400 text-sm">Dokumenterer at alle konstruksjoner, våtrom, brannskiller og isolasjon oppfyller lovens minstekrav.</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 flex items-start gap-4">
              <CheckCircle2 className="text-emerald-400 shrink-0 mt-1" size={20} />
              <div>
                <h4 className="font-bold text-base mb-1">Byggebransjens Våtromsnorm (BVN)</h4>
                <p className="text-slate-400 text-sm">Spesifikke sjekkpunkter for membran, sluk, mansjett og rør-i-rør iht. BVN 31.205.</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 flex items-start gap-4">
              <CheckCircle2 className="text-emerald-400 shrink-0 mt-1" size={20} />
              <div>
                <h4 className="font-bold text-base mb-1">Norsk Standard NS 8406 & NS 8405</h4>
                <p className="text-slate-400 text-sm">Rettidig varsling av endringer, fristforlengelser og uforutsette grunnforhold.</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 flex items-start gap-4">
              <CheckCircle2 className="text-emerald-400 shrink-0 mt-1" size={20} />
              <div>
                <h4 className="font-bold text-base mb-1">Håndverkertjenesteloven § 9</h4>
                <p className="text-slate-400 text-sm">Plikt til å varsle forbruker før ekstraarbeid settes i gang for å sikre rett til betaling.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-black text-center text-navy-900 mb-12">
          Ofte stilte spørsmål om KS-system
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

      {/* CTA Box */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-electric-50 border-t border-electric-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-navy-900">
            Klar for å spare 5-10 timer i uka på papirarbeid?
          </h2>
          <p className="text-slate-600 text-base max-w-2xl mx-auto">
            Bli med over 500 norske håndverkere som har gått over til VikingMester. Kom i gang på under 2 minutter.
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
