'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  Calculator, 
  Droplets, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function FallKalkulatorTek17Page() {
  const [distanceToDoor, setDistanceToDoor] = useState(250); // cm
  const [showerZoneDistance, setShowerZoneDistance] = useState(100); // cm
  const [hasDropShower, setHasDropShower] = useState(true); // nedsenket dusj
  const [roomArea, setRoomArea] = useState(6.5); // kvm

  // Calculations
  // Shower zone fall (1:50 = 2 cm per 100 cm)
  const showerFallMm = Math.round((showerZoneDistance / 50) * 10);
  // Rest of room fall (1:100 = 1 cm per 100 cm)
  const remainingDistance = Math.max(0, distanceToDoor - (hasDropShower ? showerZoneDistance : 0));
  const generalFallMm = Math.round((remainingDistance / 100) * 10);
  const totalFallMm = (hasDropShower ? 15 : 0) + generalFallMm;

  // TEK17 threshold requirement: Min 25 mm from top of drain strainer to threshold barrier
  const isTek17Compliant = totalFallMm >= 25 || hasDropShower;

  // Mass estimation (assuming 1.7 kg per mm per m2)
  const avgThicknessMm = Math.round(15 + totalFallMm / 2);
  const totalMassKg = Math.round(roomArea * avgThicknessMm * 1.7);
  const bagsCount = Math.ceil(totalMassKg / 20);

  const faqs = [
    {
      question: 'Hva er minimumskravet til fall på våtrom iht. TEK17?',
      answer: 'Byggteknisk forskrift (TEK17 § 13-15) krever at gulv på våtrom skal ha fall til sluk slik at bruksvann ledes bort. Preakseptert ytelse er enten fall på minimum 1:50 i en radius på 0,8 m rundt sluket (dusjsone) og fall på minimum 1:100 for gulvet for øvrig, eller flatt gulv med 15 mm nedsenk i dusjsone.',
    },
    {
      question: 'Hvor høy må oppkanten være mot dørterskelen?',
      answer: 'Høydeforskjellen mellom overkant slukrist og overkant av membran ved døråpning skal være minst 25 mm for å hindre at vann renner ut i tilstøtende rom ved eventuell tilstopping av sluk.',
    },
    {
      question: 'Hvordan kan jeg dokumentere fallet overfor takstmann og kommune?',
      answer: 'Med VikingMester tar du bilde av vateret eller målestokken på gulvet. Appen stempler bildet automatisk med TEK17-kontrollpunkt, dato, klokkeslett og prosjektadresse for FDV-sluttrapporten.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Verktøy', path: '/verktoy/fall-kalkulator-tek17' },
          { name: 'Fall-kalkulator TEK17', path: '/verktoy/fall-kalkulator-tek17' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-bold">
            <Droplets size={16} />
            <span>TEK17 § 13-15 & BVN 31.205</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-navy-900 tracking-tight">
            Fall- og Høydekalkulator <span className="text-electric-600">for Våtrom</span>
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
            Sjekk at fallet mot sluk og oppkant mot dørterskel oppfyller minstekravene i TEK17 og Byggebransjens Våtromsnorm (BVN).
          </p>
        </div>
      </section>

      {/* Kalkulator */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Venstre side: Mål og innstillinger */}
          <div className="lg:col-span-7 bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6">
            <h2 className="text-xl font-black text-navy-900 flex items-center gap-2">
              <Calculator className="text-electric-600" size={22} />
              1. Angi rommets mål
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Avstand fra sluk til døråpning / terskel (cm)
              </label>
              <input
                type="number"
                value={distanceToDoor}
                onChange={(e) => setDistanceToDoor(Number(e.target.value) || 0)}
                className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-navy-900 font-semibold text-sm focus:ring-2 focus:ring-electric-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Dusjsonens utstrekning (cm)
                </label>
                <input
                  type="number"
                  value={showerZoneDistance}
                  onChange={(e) => setShowerZoneDistance(Number(e.target.value) || 0)}
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-navy-900 font-semibold text-sm focus:ring-2 focus:ring-electric-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Totalt gulvareal (kvm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={roomArea}
                  onChange={(e) => setRoomArea(Number(e.target.value) || 0)}
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-navy-900 font-semibold text-sm focus:ring-2 focus:ring-electric-500 outline-none"
                />
              </div>
            </div>

            {/* Valg for nedsenket dusjsone */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-navy-900 text-sm">Nedsenket dusjsone (min. 15 mm)</div>
                <div className="text-xs text-slate-500">Gir godkjent vanntetthet selv med flatt gulv for øvrig</div>
              </div>
              <input
                type="checkbox"
                checked={hasDropShower}
                onChange={(e) => setHasDropShower(e.target.checked)}
                className="w-5 h-5 text-electric-600 rounded focus:ring-electric-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Høyre side: Beregnet resultat og TEK17 status */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-navy-950 text-white shadow-xl space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-electric-400 uppercase tracking-widest">
                Beregnet Fall iht. TEK17
              </span>

              {/* Hovedresultat */}
              <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total oppkant ved dør:</span>
                  <span className="text-2xl font-black text-emerald-400">{totalFallMm} mm</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-navy-800">
                  <span>Fall i dusjsone (1:50):</span>
                  <span className="font-mono font-bold text-slate-100">{showerFallMm} mm</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Fall i resten av rommet (1:100):</span>
                  <span className="font-mono font-bold text-slate-100">{generalFallMm} mm</span>
                </div>
                {hasDropShower && (
                  <div className="flex items-center justify-between text-xs text-emerald-400">
                    <span>Nedsenk dusj:</span>
                    <span className="font-mono font-bold">+15 mm</span>
                  </div>
                )}
              </div>

              {/* Status boks */}
              <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                isTek17Compliant 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {isTek17Compliant ? (
                  <>
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-400" />
                    <div>
                      <strong className="block font-bold mb-0.5">Godkjent iht. TEK17 § 13-15</strong>
                      Oppkant mot dør er tilstrekkelig for å hindre oversvømmelse.
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-400" />
                    <div>
                      <strong className="block font-bold mb-0.5">For lav oppkant (&lt; 25 mm)</strong>
                      Øk fallet eller etabler 15 mm nedsenk i dusjsonen for å tilfredsstille forskriften.
                    </div>
                  </>
                )}
              </div>

              {/* Materialberegning */}
              <div className="p-4 rounded-xl bg-navy-900/80 border border-navy-800 space-y-1 text-xs">
                <div className="text-slate-400 font-bold uppercase tracking-wider">Avrettingsmasse:</div>
                <div className="text-slate-200">
                  Ca. <strong className="text-amber-400 font-mono text-sm">{totalMassKg} kg</strong> ({bagsCount} stk 20 kg sekker)
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4 border-t border-navy-800 space-y-3">
              <Link
                href="/?action=demo"
                className="w-full py-3.5 px-6 bg-electric-500 hover:bg-electric-600 text-white font-bold rounded-2xl text-center flex items-center justify-center gap-2 text-sm shadow-lg shadow-electric-500/25 transition-all"
              >
                <Sparkles size={16} />
                Dokumenter våtrommet med VikingMester
              </Link>
              <p className="text-[11px] text-slate-400 text-center">
                Knips bilde av sluk og membran. Vår AI verifiserer klemring og mansjett automatisk.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full border-t border-slate-200">
        <h2 className="text-2xl sm:text-3xl font-black text-center text-navy-900 mb-10">
          Ofte stilte spørsmål om fall på bad og våtrom
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