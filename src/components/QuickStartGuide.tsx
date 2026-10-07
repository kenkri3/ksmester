import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Building2,
  ClipboardCheck,
  Clock,
  MessageSquare,
  Smartphone,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  Compass,
  RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';

interface QuickStartGuideProps {
  projectsCount: number;
  onOpenAction: (actionId: string) => void;
  onOpenAllModules: () => void;
  onOpenTour?: () => void;
  onOpenMobileGuide?: () => void;
}

export default function QuickStartGuide({
  projectsCount,
  onOpenAction,
  onOpenAllModules,
  onOpenTour,
  onOpenMobileGuide
}: QuickStartGuideProps) {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('viking_hide_quickstart') === 'true';
    }
    return false;
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('viking_collapse_quickstart') === 'true';
    }
    return false;
  });

  // Manuelle avhukinger
  const [manualCompleted, setManualCompleted] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('viking_quickstart_completed');
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const toggleManualStep = (stepId: string) => {
    setManualCompleted(prev => {
      const updated = { ...prev, [stepId]: !prev[stepId] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('viking_quickstart_completed', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('viking_hide_quickstart', 'true');
    }
  };

  const handleReset = () => {
    setManualCompleted({});
    setIsDismissed(false);
    setIsCollapsed(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('viking_hide_quickstart');
      localStorage.removeItem('viking_collapse_quickstart');
      localStorage.removeItem('viking_quickstart_completed');
    }
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('viking_collapse_quickstart', String(next));
      }
      return next;
    });
  };

  if (isDismissed) {
    return null;
  }

  const steps = [
    {
      id: 'step_project',
      title: '1. Opprett din første byggeplass',
      description: 'Legg inn byggeplass, adresse og kunde for å samle all dokumentasjon og bilder automatisk.',
      actionLabel: 'Opprett prosjekt',
      actionId: 'create_project',
      icon: Building2,
      color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
      isCompleted: projectsCount > 0 || !!manualCompleted['step_project']
    },
    {
      id: 'step_checklist',
      title: '2. Fyll ut en lovpålagt KS-sjekkliste',
      description: 'Faseinndelt fagkontroll for tømrer, betong, mur og våtrom iht. TEK17 med fotodokumentasjon.',
      actionLabel: 'Åpne sjekklister',
      actionId: 'checklists',
      icon: ClipboardCheck,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      isCompleted: !!manualCompleted['step_checklist']
    },
    {
      id: 'step_time',
      title: '3. Før dine første timer',
      description: 'Før timer per prosjekt og oppgave iht. Arbeidsmiljøloven § 10-7 for lønn og fakturagrunnlag.',
      actionLabel: 'Før timer',
      actionId: 'time',
      icon: Clock,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      isCompleted: !!manualCompleted['step_time']
    },
    {
      id: 'step_chat',
      title: '4. Still et faglig spørsmål til MesterAI',
      description: 'Be MesterAI om TEK17-krav, skrive en SJA, sjekke kontrakt eller dikter byggedagbok med tale.',
      actionLabel: 'Spør MesterAI',
      actionId: 'chat',
      icon: MessageSquare,
      color: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
      isCompleted: !!manualCompleted['step_chat']
    },
    {
      id: 'step_mobile',
      title: '5. Legg til på mobilen (Feltapp)',
      description: 'Bruk VikingMester rett på byggeplassen med 1 klikk for kamera, tale og hurtigrapportering.',
      actionLabel: 'Se mobilguide',
      actionId: 'mobile_guide',
      icon: Smartphone,
      color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
      isCompleted: !!manualCompleted['step_mobile']
    }
  ];

  const completedCount = steps.filter(s => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0E131F] to-slate-900 text-white rounded-3xl shadow-xl border border-slate-800 transition-all">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="p-5 sm:p-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-950/50 shrink-0">
            <Sparkles size={20} className="text-amber-200" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Kom i gang med VikingMester
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {completedCount} av {steps.length} steg fullført ({progressPercent}%)
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-1">
              Hurtigguide: Slik kommer du raskest i gang
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          {onOpenTour && (
            <button
              type="button"
              onClick={onOpenTour}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Åpne velkomstveileder"
            >
              <Compass size={14} />
              <span>Omvisning</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAllModules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Se alle fagsystem-verktøy"
          >
            <span>Alle verktøy</span>
          </button>

          <button
            type="button"
            onClick={handleToggleCollapse}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
            title={isCollapsed ? 'Vis guiden' : 'Minimer guiden'}
            aria-label={isCollapsed ? 'Vis guiden' : 'Minimer guiden'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
            title="Skjul guiden"
            aria-label="Skjul guiden"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950 h-1.5">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Collapsible Steps Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
          >
            {steps.map((step, idx) => {
              const IconComp = step.icon;
              return (
                <div
                  key={step.id}
                  className={cn(
                    'relative rounded-2xl p-4 flex flex-col justify-between border transition-all duration-200',
                    step.isCompleted
                      ? 'bg-slate-950/50 border-emerald-500/30 text-slate-300'
                      : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-white'
                  )}
                >
                  <div>
                    {/* Step Header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold flex items-center justify-center text-slate-400">
                          {idx + 1}
                        </span>
                        <div className={cn("p-1.5 rounded-lg border", step.color)}>
                          <IconComp size={16} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleManualStep(step.id)}
                        className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
                        title={step.isCompleted ? 'Merk som ufullført' : 'Merk som fullført'}
                      >
                        {step.isCompleted ? (
                          <CheckCircle2 size={18} className="text-emerald-400" />
                        ) : (
                          <Circle size={18} className="text-slate-600 hover:text-amber-400" />
                        )}
                      </button>
                    </div>

                    <h3 className={cn(
                      'font-bold text-xs sm:text-sm leading-snug',
                      step.isCompleted ? 'text-slate-300 line-through opacity-80' : 'text-white'
                    )}>
                      {step.title}
                    </h3>

                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                      {step.description}
                    </p>
                  </div>

                  {/* Step Action Button */}
                  <div className="mt-4 pt-3 border-t border-slate-850">
                    <button
                      type="button"
                      onClick={() => {
                        if (step.actionId === 'mobile_guide') {
                          onOpenMobileGuide?.();
                        } else {
                          onOpenAction(step.actionId);
                        }
                      }}
                      className={cn(
                        'w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs',
                        step.isCompleted
                          ? 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-md hover:shadow-emerald-950/40'
                      )}
                    >
                      <span>{step.actionLabel}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
