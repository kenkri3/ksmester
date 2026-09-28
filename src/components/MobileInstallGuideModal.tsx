import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  X,
  Sparkles,
  Camera,
  Mic,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface MobileInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileInstallGuideModal({
  isOpen,
  onClose
}: MobileInstallGuideModalProps) {
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 via-[#0B0F17] to-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">VikingMester på mobilen</h3>
              <p className="text-xs text-slate-400">Ha hele fagsystemet i lomma ute på byggeplassen</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Platform Tabs */}
        <div className="p-6 pb-2">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setPlatform('ios')}
              className={cn(
                "py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
                platform === 'ios'
                  ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>🍏 iPhone / iPad (Safari)</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatform('android')}
              className={cn(
                "py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
                platform === 'android'
                  ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>🤖 Android (Chrome)</span>
            </button>
          </div>
        </div>

        {/* Step Guide */}
        <div className="p-6 pt-2 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {platform === 'ios' ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Trykk på «Del»-ikonet</span>
                    <Share size={15} className="text-blue-400" />
                  </h4>
                </div>
                <p className="text-xs text-slate-400 pl-10">
                  Åpne Safari på din iPhone/iPad og trykk på det firkantede dele-ikonet med pil opp nederst på skjermen.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Velg «Legg til på Hjem-skjerm»</span>
                    <PlusSquare size={15} className="text-emerald-400" />
                  </h4>
                </div>
                <p className="text-xs text-slate-400 pl-10">
                  Rull litt ned i listen og trykk på <strong>Legg til på Hjem-skjerm</strong>. Trykk deretter <strong>Legg til</strong> øverst til høyre.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Trykk på menyen (tre prikker)</span>
                    <MoreVertical size={15} className="text-emerald-400" />
                  </h4>
                </div>
                <p className="text-xs text-slate-400 pl-10">
                  Åpne Google Chrome på din Android-telefon og trykk på de tre prikkene øverst til høyre.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Velg «Installer app» / «Legg til på startskjerm»</span>
                  </h4>
                </div>
                <p className="text-xs text-slate-400 pl-10">
                  Trykk på <strong>Installer app</strong> (eller <strong>Legg til på startskjerm</strong>). VikingMester vil da installeres som en ekte app på telefonen din.
                </p>
              </div>
            </div>
          )}

          {/* Benefits in the field */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <h5 className="font-bold text-xs text-white uppercase tracking-wider">Hvorfor bruke den på mobilen?</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Camera size={14} className="text-blue-400 shrink-0" />
                <span>Knips bilder direkte</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Mic size={14} className="text-purple-400 shrink-0" />
                <span>Tale-til-tekst i felt</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock size={14} className="text-amber-400 shrink-0" />
                <span>Før timer med 1 klikk</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Krever ingen app-store nedlasting</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Den er grei!
          </button>
        </div>
      </motion.div>
    </div>
  );
}
