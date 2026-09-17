import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  FileText, 
  HardHat, 
  Users, 
  Flame, 
  Award,
  Check
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'HMS-system for bygg og anlegg – Lovpålagt internkontroll | VikingMester',
  description: 'Komplett HMS- og internkontrollsystem (§ 5) for håndverkere og entreprenører. Sikker Jobb Analyse (SJA), vernerunder, stoffkartotek og avvik godkjent for Arbeidstilsynet.',
  alternates: {
    canonical: `${baseUrl}/hms`,
  },
  openGraph: {
    title: 'HMS-system for bygg og anlegg – Lovpålagt internkontroll | VikingMester',
    description: 'Oppfyll alle krav i Internkontrollforskriften og Byggherreforskriften med VikingMester. Gjennomfør vernerunder og SJA rett på mobilen.',
    url: `${baseUrl}/hms`,
  },
};

const faqs = [
  {
    question: 'Hvilke krav stiller Arbeidstilsynet til HMS i byggebransjen?',
    answer: 'Alle virksomheter i bygg og anlegg er pålagt å ha et systematisk HMS-arbeid iht. Internkontrollforskriften § 5. Dette krever skriftlige rutiner for risikovurdering (SJA), vernerunder, avvikshåndtering, stoffkartotek for kjemikalier, og dokumentert sikkerhetsopplæring.',
  },
  {
    question: 'Kan jeg bruke VikingMester ved et uanmeldt tilsyn fra Arbeidstilsynet?',
    answer: 'Ja! Ved tilsyn åpner du bare VikingMester-appen på mobilen eller nettbrettet. Tilsynsinspektøren får umiddelbar innsikt i gjennomførte SJA-analyser, vernerunder, stoffkartotek med sikkerhetsdatablader og godkjente avvik.',
  },
  {
    question: 'Hvordan fungerer vernerunden i VikingMester?',
    answer: 'VikingMester har ferdige sjekklister for vernerunder tilpasset tømrere, elektrikere, rørleggere og entreprenører. Du går gjennom byggeplassen med mobilen, knipser eventuelle farer, setter tiltak og frister, og rapporten signeres digitalt.',
  },
  {
    question: 'Trenger alle ansatte egen innlogging for HMS?',
    answer: 'I VikingMester har alle fagarbeidere enkel tilgang via app eller lenke, slik at de kan registrere uønskede hendelser (RUH), sjekke stoffkartoteket og lese SJA før farlig arbeid påbegynnes.',
  },
  {
    question: 'Hvordan varsles kritiske HMS-hendelser og RUH ute på byggeplassen?',
    answer: 'VikingMester støtter Omnichannel feltvarsling (Discord, Slack, MS Teams) i samtlige abonnement (Solo, Team, Totalentreprenør). Når en alvorlig RUH eller et kritisk HMS-avvik registreres, sendes det lynraskt ut i teamets valgte chat-kanal med bilde og lokasjon.',
  },
];

export default function HmsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'HMS-system', path: '/hms' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-emerald-50/40 to-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100/80 border border-emerald-300/60 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-800 mb-6">
            <ShieldCheck size={16} />
            <span>100% Autonomt HMS-system med MesterAI • Internkontrollforskriften</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-navy-900 mb-6 leading-tight">
            Lovpålagt <span className="text-emerald-600">autonomt HMS-system</span> for bygg og anlegg
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Slipp bekymringer for Arbeidstilsynets kontroller. Få ferdig oppsatt internkontroll med SJA via tale, vernerunder, stoffkartotek og RUH samlet i én lynrask mobilapp.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/?action=demo"
              className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 text-base"
            >
              <Sparkles size={18} />
              Prøv gratis HMS i 14 dager
            </Link>
            <Link
              href="/priser"
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-navy-900 font-bold rounded-2xl transition-colors text-base"
            >
              Se HMS-priser (fra kr 1 490,-)
            </Link>
          </div>
        </div>
      </section>

      {/* 4 Pillars of HMS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-navy-900 mb-4">
            Alt du trenger for å oppfylle kravene
          </h2>
          <p className="text-slate-600">
            Arbeidstilsynet krever at internkontrollen er tilpasset din virksomhet og aktivt i bruk. VikingMester gjør det så enkelt at gutta på byggeplassen faktisk bruker det.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-navy-900">Sikker Jobb Analyse</h3>
            <p className="text-slate-600 text-sm">
              Risikovurdering på under 60 sekunder for varme arbeider, stillas, tak og graving før arbeidet starter.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <HardHat size={24} />
            </div>
            <h3 className="text-lg font-bold text-navy-900">Digitale Vernerunder</h3>
            <p className="text-slate-600 text-sm">
              Ferdige sjekklister for byggeplass. Knips avvik og tildel tiltak med frister direkte til ansvarlig person.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-bold text-navy-900">Stoffkartotek på mobil</h3>
            <p className="text-slate-600 text-sm">
              Søkbare sikkerhetsdatablader (SDS) for alle kjemikalier, fugemasser og lim, tilgjengelig offline.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-navy-900">RUH / Hendelseslogg</h3>
            <p className="text-slate-600 text-sm">
              Rapportering av uønskede hendelser og nestenulykker med bilde og forslag til forebyggende tiltak.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-black text-center text-navy-900 mb-12">
          Ofte stilte spørsmål om HMS og internkontroll
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
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-emerald-50 border-t border-emerald-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-navy-900">
            Få HMS-systemet i orden i dag
          </h2>
          <p className="text-slate-600 text-base max-w-2xl mx-auto">
            Ingen bindingstid. Ingen installasjon nødvendig. Oppfyll alle krav i Internkontrollforskriften på under 5 minutter.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link
              href="/?action=demo"
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all text-base"
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
