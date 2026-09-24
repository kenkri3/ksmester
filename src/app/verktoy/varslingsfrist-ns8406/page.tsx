'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  Calculator, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  Clock,
  ArrowRight
} from 'lucide-react';

const standardsInfo = {
  ns8406: {
    name: 'NS 8406 (Forenklet bygg- og anleggskontrakt)',
    statutePkt: 'pkt. 19.2 & 19.3',
    ruleText: 'Entreprenøren må varsle «uten ugrunnet opphold». I rettspraksis betyr dette normalt innen få dager etter at forholdet ble oppdaget. Varselet må være skriftlig.',
    preclusionWarning: 'KRITISK: Dersom varsel ikke sendes i tide, tapes retten til vederlagsjustering eller fristforlengelse fullstendig (preklusjon).',
    recommendedDays: 7,
  },
  ns8405: {
    name: 'NS 8405 (Norsk bygge- og anleggskontrakt)',
    statutePkt: 'pkt. 23.3 & pkt. 25.2',
    ruleText: 'Entreprenøren må varsle skriftlig «uten ugrunnet opphold». Ved uenighet må det følges opp med spesifisert krav med tidsfrister.',
    preclusionWarning: 'STRENG PREKLUSJON: Både varsel om endring og varsel om fristforlengelse er gjenstand for ubetinget preklusjon.',
    recommendedDays: 5,
  },
  hvt: {
    name: 'Håndverkertjenesteloven (arbeid på forbrukerens eiendom)',
    statutePkt: '§ 9 & § 11',
    ruleText: 'Må håndverkeren utføre arbeid som ikke er omfattet av avtalen, skal forbrukeren varsles og godkjenne før arbeidet igangsettes.',
    preclusionWarning: 'Dersom forbruker ikke varsles og godkjenner skriftlig, kan håndverkeren miste retten til betaling for tilleggsarbeidet.',
    recommendedDays: 3,
  },
  bustad: {
    name: 'Bustadoppføringslova (oppføring av ny bolig for forbruker)',
    statutePkt: '§ 9, § 11 & § 42',
    ruleText: 'Entreprenøren har rett til tillegg dersom forbruker krever endring, eller ved uforutsette forhold. Varsel må fremmes skriftlig snarest.',
    preclusionWarning: 'Krav om fristforlengelse eller tilleggsbetaling må fremsettes uten ugrunnet opphold.',
    recommendedDays: 5,
  }
};

export default function VarslingsfristKalkulatorPage() {
  const [standard, setStandard] = useState<'ns8406' | 'ns8405' | 'hvt' | 'bustad'>('ns8406');
  const [cause, setCause] = useState('kundeendring');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [estimatedDays, setEstimatedDays] = useState('2');
  const [estimatedAmount, setEstimatedAmount] = useState('15000');

  const currentStandard = standardsInfo[standard];

  // Calculate deadline date
  const eventDateObj = new Date(eventDate);
  const deadlineDateObj = new Date(eventDateObj);
  deadlineDateObj.setDate(deadlineDateObj.getDate() + currentStandard.recommendedDays);
  const deadlineStr = deadlineDateObj.toLocaleDateString('nb-NO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const todayObj = new Date();
  const daysLeft = Math.ceil((deadlineDateObj.getTime() - todayObj.getTime()) / (1000 * 3600 * 24));

  const faqs = [
    {
      question: 'Hva betyr «uten ugrunnet opphold» i NS 8406?',
      answer: '«Uten ugrunnet opphold» betyr at entreprenøren må varsle så raskt som det er praktisk mulig etter at forholdet ble eller burde vært oppdaget. I norsk rettspraksis regnes ofte mer enn 1-2 uker som for sent, med mindre det foreligger særlige grunner.',
    },
    {
      question: 'Hva er konsekvensen av å varsle for sent (preklusjon)?',
      answer: 'Konsekvensen er preklusjon: Entreprenøren taper rettskravet på å få betalt for ekstraarbeidet eller rett til fristforlengelse, selv om arbeidet faktisk er utført og har tilført verdi.',
    },
    {
      question: 'Kan jeg varsle muntlig på byggeplassmøte?',
      answer: 'Nei, både NS 8405, NS 8406 og god byggeskikk krever skriftlig varsel for å ha bevisverdi. Med VikingMester kan du snakke inn endringen på 15 sekunder på mobilen og sende digitalt varsel direkte til kunden.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Verktøy', path: '/verktoy/varslingsfrist-ns8406' },
          { name: 'Varslingsfrist-kalkulator', path: '/verktoy/varslingsfrist-ns8406' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-bold">
            <Clock size={16} />
            <span>Gratis Juridisk Byggverktøy</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-navy-900 tracking-tight">
            Varslingsfrist-kalkulator <span className="text-electric-600">NS 8406 & NS 8405</span>
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
            Unngå å tape penger på uvarslet ekstraarbeid. Beregn anbefalt varslingsfrist og se nøyaktig hvilken lovhjemmel du må henvise til.
          </p>
        </div>
      </section>

      {/* Kalkulatorseksjon */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Venstre side: Innstillinger */}
          <div className="lg:col-span-7 bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6">
            <h2 className="text-xl font-black text-navy-900 flex items-center gap-2">
              <Calculator className="text-electric-600" size={22} />
              1. Angi kontrakt og hendelse
            </h2>

            {/* Standard velger */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Kontraktsform
              </label>
              <select
                value={standard}
                onChange={(e) => setStandard(e.target.value as any)}
                className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-navy-900 font-semibold text-sm focus:ring-2 focus:ring-electric-500 outline-none"
              >
                <option value="ns8406">NS 8406 – Forenklet bygge- og anleggskontrakt</option>
                <option value="ns8405">NS 8405 – Norsk bygge- og anleggskontrakt</option>
                <option value="hvt">Håndverkertjenesteloven (Forbruker)</option>
                <option value="bustad">Bustadoppføringslova (Ny bolig forbruker)</option>
              </select>
            </div>

            {/* Årsak */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Type endring / avvik
              </label>
              <select
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-navy-900 font-semibold text-sm focus:ring-2 focus:ring-electric-500 outline-none"
              >
                <option value="kundeendring">Tilleggsarbeid bestilt av byggherre/kunde</option>
                <option value="uforutsett">Uforutsette forhold (f.eks. råte i bjelkelag, fjell i grunn)</option>
                <option value="forsinkelse">Fristforlengelse pga. forsinkelse fra byggherre/andre fag</option>
                <option value="prosjektering">Svikt eller endring i prosjekteringsmateriale</option>
              </select>
            </div>

            {/* Dato for hendelse */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Dato da forholdet ble oppdaget / bestilt
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-navy-900 font-semibold text-sm focus:ring-2 focus:ring-electric-500 outline-none"
              />
            </div>

            {/* Estimerte verdier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Antatt beløp (kr eks mva)
                </label>
                <input
                  type="number"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value)}
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-navy-900 font-semibold text-sm focus:ring-2 focus:ring-electric-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Fremdriftskonsekvens (dager)
                </label>
                <input
                  type="number"
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(e.target.value)}
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-navy-900 font-semibold text-sm focus:ring-2 focus:ring-electric-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Høyre side: Beregnet Frist & Juridisk Råd */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-navy-950 text-white shadow-xl space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                Anbefalt Varslingsfrist
              </span>
              
              <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800">
                <div className="text-xs text-slate-400 mb-1">Må varsles skriftlig senest innen:</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400">{deadlineStr}</div>
                <div className="text-xs font-semibold mt-2 text-slate-300 flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-400" />
                  {daysLeft > 0 ? (
                    <span>Du har <strong className="text-emerald-400">{daysLeft} dager</strong> på å sende varsel!</span>
                  ) : (
                    <span className="text-rose-400">Fristen kan allerede være utløpt! Send varsel straks!</span>
                  )}
                </div>
              </div>

              {/* Juridisk hjemmel */}
              <div className="space-y-2 text-xs">
                <div className="text-slate-400 uppercase font-bold tracking-wider">Gjeldende lovhjemmel:</div>
                <div className="p-3 rounded-xl bg-navy-900/80 border border-navy-800 text-slate-200 font-mono">
                  {currentStandard.name} {currentStandard.statutePkt}
                </div>
              </div>

              {/* Advarsel om preklusjon */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{currentStandard.preclusionWarning}</span>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4 border-t border-navy-800 space-y-3">
              <Link
                href="/?action=demo"
                className="w-full py-3.5 px-6 bg-electric-500 hover:bg-electric-600 text-white font-bold rounded-2xl text-center flex items-center justify-center gap-2 text-sm shadow-lg shadow-electric-500/25 transition-all"
              >
                <Sparkles size={16} />
                Send endringsvarsel med VikingMester
              </Link>
              <p className="text-[11px] text-slate-400 text-center">
                Snakk inn varselet på 20 sekunder ute på plassen. Kunden godkjenner direkte via e-post, Teams eller Slack.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full border-t border-slate-200">
        <h2 className="text-2xl sm:text-3xl font-black text-center text-navy-900 mb-10">
          Vanlige spørsmål om varsling av endringsordre
        </h2>
        <div className="space-y-4">
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