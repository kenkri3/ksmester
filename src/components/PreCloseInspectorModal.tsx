'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Lock, 
  Unlock, 
  Camera, 
  Check, 
  Printer, 
  Info,
  Sparkles
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

export interface LukkesperreZone {
  id: string;
  room: string;
  project: string;
  status: 'GREEN' | 'RED';
  canClose: boolean;
  detail: string;
  checks: {
    plumbing: boolean;      // Rør-i-rør trykktest & fordelerskap (TEK17 § 13-15)
    electric: boolean;      // El-skjultanlegg & rørkurs (NEK 400:2022)
    vaporBarrier: boolean;  // Dampsperre, klemte skjøter & mansjetter (BVN 31.205)
    insulation: boolean;    // Lyd- og brannisolasjon uten kuldebroer (TEK17 § 11-12)
  };
  lastChecked?: string;
  inspector?: string;
  evidencePhotoUrl?: string;
}

interface PreCloseInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: LukkesperreZone | null;
  onUpdateZone: (updated: LukkesperreZone) => void;
  onOpenAIVision?: (roomName: string) => void;
}

export default function PreCloseInspectorModal({
  isOpen,
  onClose,
  zone,
  onUpdateZone,
  onOpenAIVision
}: PreCloseInspectorModalProps) {
  const [currentZone, setCurrentZone] = useState<LukkesperreZone | null>(null);

  useEffect(() => {
    if (zone) {
      setCurrentZone({ ...zone });
    }
  }, [zone]);

  if (!isOpen || !currentZone) return null;

  const toggleCheck = (key: keyof LukkesperreZone['checks']) => {
    const updatedChecks = {
      ...currentZone.checks,
      [key]: !currentZone.checks[key]
    };

    const allPassed = Object.values(updatedChecks).every(Boolean);

    const updated: LukkesperreZone = {
      ...currentZone,
      checks: updatedChecks,
      canClose: allPassed,
      status: allPassed ? 'GREEN' : 'RED',
      detail: allPassed 
        ? 'Alle tverrfaglige forutsetninger (rør, el, dampsperre, isolasjon) er godkjent.' 
        : 'Mangler godkjenning på 1 eller flere tverrfaglige kontrollpunkter.',
      lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setCurrentZone(updated);
    onUpdateZone(updated);

    if (allPassed) {
      toast.success(`GRØNT LYS aktivert for ${currentZone.room}! Vegg kan lukkes.`, {
        description: 'Alle sjekkpunkter for TEK17 § 13-15 og BVN 31.205 er oppfylt.'
      });
    } else {
      toast.info(`Lukkesperre oppdatert for ${currentZone.room}`);
    }
  };

  const handleForceApprove = () => {
    const allChecked: LukkesperreZone['checks'] = {
      plumbing: true,
      electric: true,
      vaporBarrier: true,
      insulation: true
    };
    const updated: LukkesperreZone = {
      ...currentZone,
      checks: allChecked,
      canClose: true,
      status: 'GREEN',
      detail: 'Manuelt verifisert og godkjent av faglig leder for lukking.',
      lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setCurrentZone(updated);
    onUpdateZone(updated);
    toast.success(`Grønt lys godkjent for ${currentZone.room}!`, {
      description: 'Lukkesperren er opphevet. Tømrer/montør kan nå plate veggen.'
    });
  };

  const handleForceLock = () => {
    const updated: LukkesperreZone = {
      ...currentZone,
      canClose: false,
      status: 'RED',
      detail: 'Lukkesperre aktivert av byggeleder. Lukking er strengt forbudt før feil er utbedret.',
      lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setCurrentZone(updated);
    onUpdateZone(updated);
    toast.error(`RØD SPERRE satt på ${currentZone.room}!`, {
      description: 'Vegg og sjakt må ikke lukkes før ny kontroll er gjennomført.'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-navy-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Status Header Banner */}
        <div className={cn(
          "px-6 py-5 border-b flex items-start justify-between gap-4",
          currentZone.status === 'GREEN' 
            ? "bg-emerald-50/80 border-emerald-100" 
            : "bg-rose-50/80 border-rose-100"
        )}>
          <div className="flex items-start gap-3.5">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
              currentZone.status === 'GREEN' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            )}>
              {currentZone.status === 'GREEN' ? <Unlock size={24} /> : <Lock size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                  currentZone.status === 'GREEN' ? "bg-emerald-200 text-emerald-950" : "bg-rose-200 text-rose-950"
                )}>
                  {currentZone.status === 'GREEN' ? 'GRØNT LYS – LUKKING TILLATT' : 'RØD SPERRE – LUKKING FORBUDT'}
                </span>
                <span className="text-xs font-bold text-slate-500">• {currentZone.project}</span>
              </div>
              <h3 className="text-lg font-black text-navy-900 mt-1">
                {currentZone.room}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {currentZone.detail}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-navy-900 flex items-center justify-center transition-all shadow-xs shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* TEK17 & Forskrifter Info Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
            <Info size={18} className="text-electric-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Tverrfaglig lukkesperre</strong> sikrer at vegger, sjakter og bjelkelag ikke plates eller flislegges før alle fag har godkjent sine skjulte installasjoner iht. <strong>TEK17 § 13-15</strong> og <strong>BVN 31.205</strong>.
            </p>
          </div>

          {/* 4 Mandatory Inspection Checkpoints */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Obligatoriske Sjekkpunkter for lukking</span>
              <span className="text-[11px] font-bold text-electric-600">
                {Object.values(currentZone.checks).filter(Boolean).length} av 4 godkjent
              </span>
            </h4>

            <div className="space-y-2.5">
              {/* Check 1: Plumbing */}
              <div 
                onClick={() => toggleCheck('plumbing')}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group",
                  currentZone.checks.plumbing 
                    ? "bg-emerald-50/50 border-emerald-200 hover:border-emerald-300" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    currentZone.checks.plumbing ? "bg-emerald-600 text-white" : "border-2 border-slate-300 bg-white"
                  )}>
                    {currentZone.checks.plumbing && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-navy-900 group-hover:text-electric-600 transition-colors">
                      Rørlegger: Trykktestrapport & Rør-i-rør fordelerskap
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      TEK17 § 13-15: Lekkasjesikre installasjoner, varerør og avløp til sluk dokumentert.
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0",
                  currentZone.checks.plumbing ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                )}>
                  {currentZone.checks.plumbing ? 'Godkjent' : 'Mangler'}
                </span>
              </div>

              {/* Check 2: Electric */}
              <div 
                onClick={() => toggleCheck('electric')}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group",
                  currentZone.checks.electric 
                    ? "bg-emerald-50/50 border-emerald-200 hover:border-emerald-300" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    currentZone.checks.electric ? "bg-emerald-600 text-white" : "border-2 border-slate-300 bg-white"
                  )}>
                    {currentZone.checks.electric && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-navy-900 group-hover:text-electric-600 transition-colors">
                      Elektriker: Skjultanlegg & Rørkurs fotografert
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      NEK 400:2022: K-rør, koblingsbokser og trekkrør verifisert uten klemfare.
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0",
                  currentZone.checks.electric ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                )}>
                  {currentZone.checks.electric ? 'Godkjent' : 'Mangler'}
                </span>
              </div>

              {/* Check 3: Vapor Barrier */}
              <div 
                onClick={() => toggleCheck('vaporBarrier')}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group",
                  currentZone.checks.vaporBarrier 
                    ? "bg-emerald-50/50 border-emerald-200 hover:border-emerald-300" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    currentZone.checks.vaporBarrier ? "bg-emerald-600 text-white" : "border-2 border-slate-300 bg-white"
                  )}>
                    {currentZone.checks.vaporBarrier && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-navy-900 group-hover:text-electric-600 transition-colors">
                      Dampsperre: Klemte skjøter & mansjetter
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      BVN 31.205 & TEK17: Dampsperre er uavbrutt og alle rørgjennomføringer er tapet med godkjent mansjett.
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0",
                  currentZone.checks.vaporBarrier ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                )}>
                  {currentZone.checks.vaporBarrier ? 'Godkjent' : 'Mangler'}
                </span>
              </div>

              {/* Check 4: Insulation */}
              <div 
                onClick={() => toggleCheck('insulation')}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group",
                  currentZone.checks.insulation 
                    ? "bg-emerald-50/50 border-emerald-200 hover:border-emerald-300" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    currentZone.checks.insulation ? "bg-emerald-600 text-white" : "border-2 border-slate-300 bg-white"
                  )}>
                    {currentZone.checks.insulation && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-navy-900 group-hover:text-electric-600 transition-colors">
                      Isolasjon & Lyd: Fullisolert uten kuldebroer
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      TEK17 § 11-12 & § 14-2: Mineralull fyller hulrom bak rør og kasser uten komprimering.
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0",
                  currentZone.checks.insulation ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                )}>
                  {currentZone.checks.insulation ? 'Godkjent' : 'Mangler'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Vision & Bevisføring */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-900 mb-0.5">
                <Sparkles size={14} className="text-blue-600" />
                <span>AI-Fotokontroll med TEK17-sjekk</span>
              </div>
              <p className="text-[11px] text-blue-700">
                Ta bilde av veggen før kledning. AI identifiserer rør-i-rør, dampsperre og klemte skjøter.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAIVision?.(currentZone.room);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 shrink-0 cursor-pointer"
            >
              <Camera size={14} />
              <span>Ta bilde med AI</span>
            </button>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Skriv ut kontrollseddel"
            >
              <Printer size={14} />
              <span>Utskrift</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Sist endret: {currentZone.lastChecked || 'I dag'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentZone.status === 'GREEN' ? (
              <button
                type="button"
                onClick={handleForceLock}
                className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Lock size={14} />
                <span>Aktiver Lukkesperre</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleForceApprove}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Check size={14} />
                <span>Godkjenn & Gi Grønt Lys</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Lukk
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
