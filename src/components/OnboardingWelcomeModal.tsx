import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Building2,
  ClipboardCheck,
  Clock,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  X,
  HardHat,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Play
} from 'lucide-react';
import { cn } from '../lib/utils';

interface OnboardingWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  companyName?: string;
  onStartProject: () => void;
  onStartChat: (initialPrompt?: string) => void;
  onOpenChecklists: () => void;
  onOpenMobileGuide: () => void;
}

export default function OnboardingWelcomeModal({
  isOpen,
  onClose,
  userName,
  companyName,
  onStartProject,
  onStartChat,
  onOpenChecklists,
  onOpenMobileGuide
}: OnboardingWelcomeModalProps) {
  const [activeTab, setActiveTab] = useState<'welcome' | 'tour'>('welcome');

  if (!isOpen) return null;

  const firstName = userName ? userName.split(' ')[0] : 'Mester';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-gradient-to-br from-slate-900 via-[#0B0F17] to-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 sm:p-8 pb-4 flex items-start justify-between border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-950/60 shrink-0">
              <Sparkles size={24} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Ny bruker
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {companyName || 'VikingMester Fagsystem'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Velkommen, {firstName}! 👋
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Lukk veileder"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-1.5">
            <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
              VikingMester er din komplette digitale plattform for byggeplassen. Her har du samlet <strong className="text-white">prosjekter</strong>, <strong className="text-emerald-400">KS-sjekklister</strong>, <strong className="text-amber-400">timeføring</strong> og <strong className="text-purple-400">MesterAI</strong> på ett sted.
            </p>
            <p className="text-xs text-slate-400">
              Hvordan vil du starte i dag? Velg et av alternativene under for å komme raskt i gang:
            </p>
          </div>

          {/* 3 Quick Start Cards */}
          <div className="grid grid-cols-1 gap-3">
            {/* 1. Opprett byggeplass */}
            <div
              onClick={() => {
                onClose();
                onStartProject();
              }}
              className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 hover:bg-slate-850/90 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-sm flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Building2 size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                      1. Opprett din første byggeplass
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Anbefalt
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    Legg inn navn, adresse og oppdrag på under 1 minutt med AI-maler.
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            {/* 2. Prøv KS-sjekklister & TEK17 */}
            <div
              onClick={() => {
                onClose();
                onOpenChecklists();
              }}
              className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 hover:bg-slate-850/90 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group shadow-sm flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                  <ClipboardCheck size={22} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                    2. Utforsk lovpålagte KS-sjekklister
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    Kvalitetssikring for tømrer, betong, mur og våtrom iht. TEK17.
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            {/* 3. MesterAI Chat & Rådgiver */}
            <div
              onClick={() => {
                onClose();
                onStartChat('Hei MesterAI! Jeg er ny i VikingMester. Kan du gi meg en kort introduksjon til hvordan systemet hjelper meg i hverdagen som håndverker?');
              }}
              className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 hover:bg-slate-850/90 border border-slate-800 hover:border-purple-500/40 transition-all cursor-pointer group shadow-sm flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquare size={22} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                    3. Ta en prat med MesterAI
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    Still et faglig spørsmål om TEK17, NS 8406, eller dikter med stemmen.
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </div>

          {/* Mobile App Promotion banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Smartphone size={18} />
              </div>
              <div>
                <h5 className="font-bold text-xs sm:text-sm text-white">Bruk feltappen rett på mobilskjermen</h5>
                <p className="text-[11px] text-slate-400">Gutta i felt kan føre timer, knipse bilder og sjekklister fra mobilen.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMobileGuide();
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              <span>Se hvordan</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-6 pt-3 border-t border-slate-800/80 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 text-center sm:text-left">
            Du kan alltid gjenåpne denne veilederen via <strong className="text-white">🚀 Kom i gang</strong> i topplinjen.
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Utforsk byggeplassene selv
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
