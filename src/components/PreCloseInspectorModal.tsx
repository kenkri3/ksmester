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

export const DEFAULT_LUKKESPERRE_ZONES: LukkesperreZone[] = [
  {
    id: 'zone-1',
    room: 'Bad 2. etasje (Hovedbad)',
    project: 'Solsiden 12 - Tilbygg',
    status: 'RED',
    canClose: false,
    detail: 'Mangler godkjenning på tverrfaglige kontrollpunkter (dampsperre/isolasjon) før lukking.',
    checks: {
      plumbing: true,
      electric: true,
      vaporBarrier: false,
      insulation: false
    },
    lastChecked: 'I dag 08:30'
  },
  {
    id: 'zone-2',
    room: 'Teknisk rom U1',
    project: 'Solsiden 12 - Tilbygg',
    status: 'RED',
    canClose: false,
    detail: 'Rør og el-installasjoner må verifiseres før sjakter plates.',
    checks: {
      plumbing: false,
      electric: true,
      vaporBarrier: false,
      insulation: false
    },
    lastChecked: 'I går 14:15'
  }
];

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
      const safeChecks = {
        plumbing: zone.checks?.plumbing ?? false,
        electric: zone.checks?.electric ?? false,
        vaporBarrier: zone.checks?.vaporBarrier ?? false,
        insulation: zone.checks?.insulation ?? false,
      };
      setCurrentZone({
        ...zone,
        room: zone.room || (zone as any).name || 'Kontrollsone',
        project: zone.project || 'Byggeplass',
        status: zone.status === 'GREEN' ? 'GREEN' : 'RED',
        canClose: !!zone.canClose,
        detail: zone.detail || 'Kontroller at rør, elektro, dampsperre og isolasjon er godkjent før vegg lukkes.',
        checks: safeChecks
      });
    }
  }, [zone]);

  if (!isOpen || !currentZone) return null;

  const checks = currentZone.checks || { plumbing: false, electric: false, vaporBarrier: false, insulation: false };

  const toggleCheck = (key: keyof LukkesperreZone['checks']) => {
    const updatedChecks = {
      ...checks,
      [key]: !checks[key]
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
    toast.success(`Full tverrfaglig godkjenning registrert for ${currentZone.room}`);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-[#0B0F17] text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-auto"
      >
        {/* Status Header Banner */}
        <div className={cn(
          "px-6 py-5 border-b flex items-start justify-between gap-4",
          currentZone.status === 'GREEN' 
            ? "bg-emerald-950/30 border-emerald-800/40" 
            : "bg-rose-950/30 border-rose-800/40"
        )}>
          <div className="flex items-start gap-3.5">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border",
              currentZone.status === 'GREEN' ? "bg-emerald-600 text-white border-emerald-500" : "bg-rose-600 text-white border-rose-500"
            )}>
              {currentZone.status === 'GREEN' ? <Unlock size={24} /> : <Lock size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                  currentZone.status === 'GREEN' ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60" : "bg-rose-950/60 text-rose-300 border-rose-800/60"
                )}>
                  {currentZone.status === 'GREEN' ? 'GRØNT LYS – LUKKING TILLATT' : 'RØD SPERRE – LUKKING FORBUDT'}
                </span>
                <span className="text-xs font-bold text-slate-400">• {currentZone.project}</span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                {currentZone.room}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                {currentZone.detail}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-xs shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-[#0B0F17]">
          {/* TEK17 & Forskrifter Info Box */}
          <div className="p-4 rounded-2xl bg-[#131722] border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
            <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-white">Tverrfaglig lukkesperre</strong> sikrer at vegger, sjakter og bjelkelag ikke plates eller flislegges før alle fag har godkjent sine skjulte installasjoner iht. <strong className="text-white">TEK17 § 13-15</strong> og <strong className="text-white">BVN 31.205</strong>.
            </p>
          </div>

          {/* 4 Mandatory Inspection Checkpoints */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Obligatoriske Sjekkpunkter for lukking</span>
              <span className="text-[11px] font-bold text-emerald-400">
                {Object.values(checks).filter(Boolean).length} av 4 godkjent
              </span>
            </h4>

            <div className="space-y-2.5">
              {/* Check 1: Plumbing */}
              <div 
                onClick={() => toggleCheck('plumbing')}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group",
                  checks.plumbing 
                    ? "bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-700" 
                    : "bg-[#131722] border-slate-800 hover:border-slate-700"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    checks.plumbing ? "bg-emerald-600 text-white" : "border-2 border-slate-700 bg-slate-950"
                  )}>
                    {checks.plumbing && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      Rørlegger: Trykktestrapport & Rør-i-rør fordelerskap
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      TEK17 § 13-15: Lekkasjesikre installasjoner, varerør og avløp til sluk dokumentert.
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border",
                  checks.plumbing ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50" : "bg-slate-800 text-slate-400 border-slate-700"
                )}>
                  {checks.plumbing ? 'Godkjent' : 'Mangler'}
                </span>
              </div>

              {/* Check 2: Electric */}
              <div 
                onClick={() => toggleCheck('electric')}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group",
                  checks.electric 
                    ? "bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-700" 
                    : "bg-[#131722] border-slate-800 hover:border-slate-700"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    checks.electric ? "bg-emerald-600 text-white" : "border-2 border-slate-700 bg-slate-950"
                  )}>
                    {checks.electric && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      Elektriker: Skjultanlegg & Rørkurs fotografert
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      NEK 400:2022: K-rør, koblingsbokser og trekkrør verifisert uten klemfare.
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border",
                  checks.electric ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50" : "bg-slate-800 text-slate-400 border-slate-700"
                )}>
                  {checks.electric ? 'Godkjent' : 'Mangler'}
                </span>
              </div>

              {/* Check 3: Vapor Barrier */}
              <div 
                onClick={() => toggleCheck('vaporBarrier')}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group",
                  checks.vaporBarrier 
                    ? "bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-700" 
                    : "bg-[#131722] border-slate-800 hover:border-slate-700"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    checks.vaporBarrier ? "bg-emerald-600 text-white" : "border-2 border-slate-700 bg-slate-950"
                  )}>
                    {checks.vaporBarrier && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      Dampsperre: Klemte skjøter & mansjetter
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      BVN 31.205 & TEK17: Dampsperre er uavbrutt og alle rørgjennomføringer er tapet med godkjent mansjett.
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border",
                  checks.vaporBarrier ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50" : "bg-slate-800 text-slate-400 border-slate-700"
                )}>
                  {checks.vaporBarrier ? 'Godkjent' : 'Mangler'}
                </span>
              </div>

              {/* Check 4: Insulation */}
              <div 
                onClick={() => toggleCheck('insulation')}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group",
                  checks.insulation 
                    ? "bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-700" 
                    : "bg-[#131722] border-slate-800 hover:border-slate-700"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    checks.insulation ? "bg-emerald-600 text-white" : "border-2 border-slate-700 bg-slate-950"
                  )}>
                    {checks.insulation && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      Isolasjon & Lyd: Fullisolert uten kuldebroer
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      TEK17 § 11-12 & § 14-2: Mineralull fyller hulrom bak rør og kasser uten komprimering.
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border",
                  checks.insulation ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50" : "bg-slate-800 text-slate-400 border-slate-700"
                )}>
                  {checks.insulation ? 'Godkjent' : 'Mangler'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Vision & Bevisføring */}
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-300 mb-0.5">
                <Sparkles size={14} className="text-blue-400" />
                <span>AI-Fotokontroll med TEK17-sjekk</span>
              </div>
              <p className="text-[11px] text-blue-200">
                Ta bilde av veggen før kledning. AI identifiserer rør-i-rør, dampsperre og klemte skjøter.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAIVision?.(currentZone.room);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 shrink-0 cursor-pointer"
            >
              <Camera size={14} />
              <span>Ta bilde med AI</span>
            </button>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-6 bg-[#131722] border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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
                className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Lock size={14} />
                <span>Aktiver Lukkesperre</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleForceApprove}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Check size={14} />
                <span>Godkjenn & Gi Grønt Lys</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Lukk
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
