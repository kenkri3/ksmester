'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  HardHat, 
  Cloud, 
  Printer, 
  Check, 
  Calendar, 
  User, 
  Building2,
  FileCheck2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export interface SJADocument {
  id: string;
  title: string;
  task: string;
  trade: string;
  projectName: string;
  authorName: string;
  tek17Reference: string;
  weatherImpact?: string;
  createdAt: string;
  risks: Array<{
    activity: string;
    hazard: string;
    measure: string;
    riskLevel: 'Lav' | 'Middels' | 'Høy';
  }>;
  equipment: string[];
  status: 'draft' | 'approved';
}

interface SJAPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sja: SJADocument | null;
  onApprove?: (sja: SJADocument) => void;
}

export default function SJAPreviewModal({
  isOpen,
  onClose,
  sja,
  onApprove
}: SJAPreviewModalProps) {
  if (!isOpen || !sja) return null;

  const handleApprove = () => {
    onApprove?.(sja);
    toast.success(`SJA for ${sja.title} er godkjent og arkivert!`, {
      description: 'Signert iht. Byggherreforskriften § 18.'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-navy-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-navy-900 to-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-emerald-400 flex items-center justify-center shrink-0 border border-white/10">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Byggherreforskriften § 18
                </span>
                <span className="text-xs font-bold text-slate-300">• {sja.projectName}</span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                {sja.title}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Dokumentert risikovurdering for {sja.trade}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Metadata Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5 flex items-center gap-1">
                <Building2 size={12} /> Prosjekt
              </div>
              <div className="text-xs font-bold text-navy-900 truncate">{sja.projectName}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5 flex items-center gap-1">
                <User size={12} /> Ansvarlig
              </div>
              <div className="text-xs font-bold text-navy-900 truncate">{sja.authorName}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5 flex items-center gap-1">
                <Calendar size={12} /> Dato
              </div>
              <div className="text-xs font-bold text-navy-900 truncate">{sja.createdAt || 'I dag'}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5 flex items-center gap-1">
                <FileCheck2 size={12} /> Hjemmel
              </div>
              <div className="text-xs font-bold text-emerald-700 truncate">{sja.tek17Reference}</div>
            </div>
          </div>

          {/* Oppgavebeskrivelse */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
              Arbeidsoppgave & Omfang
            </h4>
            <p className="text-xs sm:text-sm font-semibold text-navy-900 leading-relaxed">
              {sja.task}
            </p>
          </div>

          {/* Varpavirkning dersom tilstede */}
          {sja.weatherImpact && (
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900">
              <Cloud size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Værforhold & Ytre Miljø: </span>
                <span>{sja.weatherImpact}</span>
              </div>
            </div>
          )}

          {/* Risikotabell */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Identifiserte Farer og Forebyggende Vernetiltak</span>
              <span className="text-[11px] font-bold text-slate-500">{sja.risks.length} risikomomenter vurdert</span>
            </h4>

            <div className="space-y-3">
              {sja.risks.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {item.activity}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      item.riskLevel === 'Høy' ? 'bg-rose-100 text-rose-800' :
                      item.riskLevel === 'Middels' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.riskLevel} risiko
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-rose-50/50 rounded-xl border border-rose-100 text-rose-950">
                      <div className="text-[10px] font-bold uppercase text-rose-700 mb-0.5 flex items-center gap-1">
                        <AlertTriangle size={12} /> Fare / Risiko
                      </div>
                      {item.hazard}
                    </div>

                    <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-emerald-950">
                      <div className="text-[10px] font-bold uppercase text-emerald-700 mb-0.5 flex items-center gap-1">
                        <ShieldCheck size={12} /> Pålagt Tiltak
                      </div>
                      {item.measure}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pabudt Verneutstyr */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <HardHat size={14} className="text-amber-500" />
              <span>Påbudt Personlig Verneutstyr (PBU)</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {sja.equipment.map((eq, i) => (
                <span 
                  key={i} 
                  className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-navy-900 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Check size={13} className="text-emerald-600" />
                  {eq}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer size={15} />
            <span>Skriv ut / PDF</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApprove}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
            >
              <Check size={15} />
              <span>Godkjenn & Lagre på Prosjekt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Lukk
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
