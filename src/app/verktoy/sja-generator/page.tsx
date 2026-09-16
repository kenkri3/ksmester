'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  FileText, 
  HardHat, 
  Eye, 
  ArrowRight,
  Download,
  Share2
} from 'lucide-react';

const SJA_TEMPLATES: Record<string, {
  title: string;
  task: string;
  tek17: string;
  risks: { hazard: string; prob: number; cons: number; measure: string }[];
  ppe: string[];
}> = {
  hoyde: {
    title: 'Arbeid i høyden og montasje på stillas',
    task: 'Montering av fasadekledning og takrenner fra stillas over 2 meter',
    tek17: 'Forskrift om utførelse av arbeid § 17 & TEK17 § 14-2',
    ppe: ['Hjelm med hakestropp', 'Fallsikringssele & line', 'Vernesko S3', 'Hansker'],
    risks: [
      {
        hazard: 'Fall fra høyde ved arbeid utenfor rekkverk',
        prob: 3,
        cons: 5,
        measure: 'Tilkobling til godkjent forankringspunkt med falldemper før rekkverk åpnes.'
      },
      {
        hazard: 'Fallende verktøy eller materialer mot personer på bakken',
        prob: 3,
        cons: 4,
        measure: 'Avsperring av bakkeareal under stillas og sikring av håndverktøy med fangline.'
      },
      {
        hazard: 'Velt eller ustabilt stillas pga. vindlast',
        prob: 2,
        cons: 5,
        measure: 'Verifisering av grønt stillasskilt og forankring i vegg før bruk.'
      }
    ]
  },
  graving: {
    title: 'Graving av grøft nær kabler og rør',
    task: 'Graving for ny vannledning og drensrør inntil bolig',
    tek17: 'Forskrift om utførelse av arbeid § 21',
    ppe: ['Hjelm', 'Vernesko', 'Varselvest klasse 3', 'Hørselvern'],
    risks: [
      {
        hazard: 'Graving inn i umerket høyspentkabel eller gassrør',
        prob: 3,
        cons: 5,
        measure: 'Kabelpåvisning utført på plassen. Håndgraving 1 meter på hver side av påvist trasé.'
      },
      {
        hazard: 'Grøfteras og klemfare ved dybde over 1,5 meter',
        prob: 3,
        cons: 5,
        measure: 'Etablering av forskriftsmessig skråning (1:1) eller bruk av godkjent grøftekasse.'
      },
      {
        hazard: 'Maskinvelt ved kanten av grøft',
        prob: 2,
        cons: 4,
        measure: 'Holde sikkerhetsavstand til grøftekant tilsvarende grøftens dybde.'
      }
    ]
  },
  varme: {
    title: 'Varme arbeider og sveising av takbelegg',
    task: 'Tekking av flatt tak med åpen propanbrenner',
    tek17: 'Sikkerhetsforskrift for varme arbeider & TEK17 § 11-1',
    ppe: ['Brannsikre hansker', 'Øyevern', 'Vernesko uten lisser', 'Ullklær'],
    risks: [
      {
        hazard: 'Antennelse av underliggende treverk eller isolasjon',
        prob: 3,
        cons: 5,
        measure: 'Rydding av brennbart materiale i 10 m radius. Tildekking med brannsikre duker.'
      },
      {
        hazard: 'Gasslekkasje fra flaske eller slange',
        prob: 2,
        cons: 5,
        measure: 'Lekkasjespraykontroll av kuplinger. Gassflaske sikret stående.'
      },
      {
        hazard: 'Glødebrann etter endt arbeidsdag',
        prob: 3,
        cons: 5,
        measure: 'Obligatorisk kontinuerlig brannvakt i minimum 60 minutter etter at flammen er slukket.'
      }
    ]
  },
  elektro: {
    title: 'Arbeid på eller nær elektriske anlegg (FSE)',
    task: 'Ombygging av hovedtavle og tilkobling av elbillader',
    tek17: 'FSE § 10 & NEK 400',
    ppe: ['Lysbuevisir', 'Isolerende hansker (1000V)', 'Flammehemmende arbeidstøy'],
    risks: [
      {
        hazard: 'Elektrisk støt og strømgjennomgang',
        prob: 3,
        cons: 5,
        measure: 'Frakobling, låsing med hengelås, og verifisering av spenningsløshet med godkjent tester.'
      },
      {
        hazard: 'Lysbue ved utilsiktet kortslutning',
        prob: 2,
        cons: 5,
        measure: 'Bruk av isolerte verktøy og lysbuesikkert visir under testing.'
      },
      {
        hazard: 'Feilkobling av jordleder (PE)',
        prob: 2,
        cons: 4,
        measure: 'Kontinuitetsmåling med kalibrert installasjonstester før spenningssetting.'
      }
    ]
  }
};

export default function SjaGeneratorPage() {
  const [selectedKey, setSelectedKey] = useState('hoyde');
  const [projectTitle, setProjectTitle] = useState('');
  const [leaderName, setLeaderName] = useState('');

  const currentTemplate = SJA_TEMPLATES[selectedKey];

  const faqs = [
    {
      question: 'Når er det lovpålagt å gjennomføre en Sikker Jobb Analyse (SJA)?',
      answer: 'En SJA skal alltid gjennomføres ved oppgaver som avviker fra vanlige rutiner, ved arbeid med høy risiko (f.eks. over 2 meter, varme arbeider, graving nær høyspent), eller når det ikke finnes etablerte sikkerhetsinstrukser for den spesifikke operasjonen (Byggherreforskriften & Internkontrollforskriften).',
    },
    {
      question: 'Hvem må signere en SJA?',
      answer: 'SJA-en skal gjennomgås med og signeres av alle som skal delta i arbeidsoperasjonen før arbeidet starter, samt ansvarlig arbeidsleder.',
    },
    {
      question: 'Kan jeg bruke VikingMester for å utføre SJA på tale?',
      answer: 'Ja! I VikingMester-appen trykker du på mikrofonen og sier hva du skal gjøre. Systemet genererer automatisk risikotiltak, henter værforhold fra Yr.no, og lar teamet signere digitalt på mobilskjermen.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Verktøy', path: '/verktoy/sja-generator' },
          { name: 'SJA Generator', path: '/verktoy/sja-generator' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-800 border border-rose-200 px-3.5 py-1.5 rounded-full text-xs font-bold">
            <ShieldAlert size={16} />
            <span>Arbeidstilsynet Godkjent Mal</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-navy-900 tracking-tight">
            Gratis <span className="text-electric-600">SJA Generator</span> (Sikker Jobb Analyse)
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
            Lag en komplett, profesjonell risikovurdering for risikofylt arbeid på 30 sekunder. Godkjent for tilsyn fra Arbeidstilsynet.
          </p>
        </div>
      </section>

      {/* Generator Interface */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Venstre side: Innstillinger */}
          <div className="lg:col-span-5 bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-5 h-fit">
            <h2 className="text-lg font-black text-navy-900 flex items-center gap-2">
              <HardHat className="text-electric-600" size={20} />
              1. Velg risikoområde
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Type arbeid
              </label>
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-navy-900 font-semibold text-sm focus:ring-2 focus:ring-electric-500 outline-none"
              >
                <option value="hoyde">Arbeid i høyden & stillas</option>
                <option value="graving">Graving nær kabler & rør</option>
                <option value="varme">Varme arbeider & taktekking</option>
                <option value="elektro">Arbeid i el-anlegg (FSE)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Prosjektnavn / Byggeplass
              </label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="F.eks. Enebolig Bjerkelundveien 4"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-navy-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-electric-500 placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Ansvarlig arbeidsleder
              </label>
              <input
                type="text"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                placeholder="F.eks. Ola Nordmann (Bas)"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-navy-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-electric-500 placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            <div className="p-4 rounded-2xl bg-electric-50 border border-electric-200 text-xs text-electric-900 space-y-2">
              <strong className="block font-bold">💡 Vil du tilpasse sjekkpunkter på farta?</strong>
              <p>I VikingMester snakker du bare inn avvikene. Systemet oppdaterer risikomatrisen autonomt og sender SMS-varsel.</p>
              <Link
                href="/?action=demo"
                className="inline-flex items-center gap-1 font-bold text-electric-600 hover:text-electric-700 pt-1"
              >
                Prøv VikingMester gratis <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Høyre side: Forhåndsvisning av SJA-rapport */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-xl space-y-6">
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold">
                  Sikker Jobb Analyse (SJA)
                </span>
                <h3 className="text-xl font-black text-navy-900 mt-2">{currentTemplate.title}</h3>
                <p className="text-xs text-slate-500 mt-1">Prosjekt: {projectTitle || 'Ikke oppgitt'} • Leder: {leaderName || 'Ikke oppgitt'}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Download size={14} />
                Skriv ut / PDF
              </button>
            </div>

            {/* Arbeidsoppgave & Lovhjemmel */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div><strong className="text-slate-900">Arbeidsoppgave:</strong> {currentTemplate.task}</div>
              <div><strong className="text-slate-900">Forskrift:</strong> <span className="font-mono text-electric-700">{currentTemplate.tek17}</span></div>
            </div>

            {/* Påkrevd Verneutstyr (PPE) */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Påkrevd personlig verneutstyr (PVU):</div>
              <div className="flex flex-wrap gap-2">
                {currentTemplate.ppe.map((item, idx) => (
                  <span key={idx} className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-lg flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Risikomatrise Tabell */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Identifiserte Farer & Risikoreduserende Tiltak:</div>
              <div className="space-y-3">
                {currentTemplate.risks.map((r, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-navy-900 flex items-center gap-1.5">
                        <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                        <span>{r.hazard}</span>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        Risiko: {r.prob * r.cons}/25
                      </span>
                    </div>
                    <div className="pl-5 text-slate-600">
                      <strong className="text-slate-900">Tiltak:</strong> {r.measure}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Signaturblokk */}
            <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4 text-[11px] text-slate-500">
              <div className="border-b border-dotted border-slate-300 pb-8">
                Dato & Signatur arbeidsleder
              </div>
              <div className="border-b border-dotted border-slate-300 pb-8">
                Signatur deltakende mannskap
              </div>
            </div>

            {/* Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-navy-950 to-navy-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="font-bold text-sm text-white">Vil du ha SJA automatisk på mobilen?</div>
                <div className="text-xs text-slate-300">Med VikingMester snakker du inn SJA-en på 20 sekunder.</div>
              </div>
              <Link
                href="/?action=demo"
                className="shrink-0 px-5 py-2.5 bg-electric-500 hover:bg-electric-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-electric-500/25"
              >
                <Sparkles size={14} />
                Start gratis prøve
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full border-t border-slate-200">
        <h2 className="text-2xl sm:text-3xl font-black text-center text-navy-900 mb-10">
          Ofte stilte spørsmål om Sikker Jobb Analyse
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