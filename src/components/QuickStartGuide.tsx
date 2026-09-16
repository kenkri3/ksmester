import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Building2,
  Mic,
  Camera,
  FileSignature,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  HelpCircle,
  Grid
} from 'lucide-react';
import { cn } from '../lib/utils';

interface QuickStartGuideProps {
  projectsCount: number;
  hasDeviations?: boolean;
  hasChangeOrders?: boolean;
  onOpenAction: (actionId: string) => void;
  onOpenAllModules: () => void;
}

export default function QuickStartGuide({
  projectsCount,
  hasDeviations = false,
  hasChangeOrders = false,
  onOpenAction,
  onOpenAllModules
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

  // Track manual step completions in addition to auto-detections
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
      title: 'Opprett ditt første prosjekt',
      description: 'Legg inn byggeplass, adresse og kunde for å samle all dokumentasjon automatisk.',
      actionLabel: 'Opprett prosjekt',
      actionId: 'new_project',
      icon: <Building2 className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      isCompleted: projectsCount > 0 || !!manualCompleted['step_project']
    },
    {
      id: 'step_voice',
      title: 'Prøv tale-assistenten (Dagbok & SJA)',
      description: 'Snakk inn dagens arbeid eller en Sikker Jobb Analyse på 10 sekunder – AI gjør resten.',
      actionLabel: 'Prøv tale-dagbok',
      actionId: 'daily_log',
      secondaryActionLabel: 'Tale til SJA',
      secondaryActionId: 'voice_sja',
      icon: <Mic className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      isCompleted: !!manualCompleted['step_voice']
    },
    {
      id: 'step_tek17',
      title: 'Test TEK17 AI Bildekontroll',
      description: 'Ta eller last opp foto av sluk, mansjett eller kledning for umiddelbar kontroll mot norske krav.',
      actionLabel: 'Åpne bildekontroll',
      actionId: 'ai_vision',
      icon: <Camera className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50 border-amber-200 text-amber-700',
      isCompleted: hasDeviations || !!manualCompleted['step_tek17']
    },
    {
      id: 'step_co',
      title: 'Sikre betaling med Endringsordre (NS 8406)',
      description: 'Unngå uenighet ved sluttoppgjør. Send digital endringsmelding til kunde på under 1 minutt.',
      actionLabel: 'Opprett endringsordre',
      actionId: 'change_order',
      icon: <FileSignature className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      isCompleted: hasChangeOrders || !!manualCompleted['step_co']
    }
  ];

  const completedCount = steps.filter(s => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl shadow-xl border border-white/10 mb-8 transition-all">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="p-5 md:p-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10">
        <div className="flex items-start md:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                Kom i gang
              </span>
              <span className="text-xs text-slate-300">
                {completedCount} av {steps.length} steg fullført ({progressPercent}%)
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight mt-1">
              Velkommen til VikingMester – hurtigguide for mestere og håndverkere
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={onOpenAllModules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 hover:text-white border border-white/15 transition-all shadow-sm"
            title="Se alle 20 moduler"
          >
            <Grid className="w-3.5 h-3.5 text-amber-400" />
            <span>Alle 20 verktøy</span>
          </button>

          <button
            onClick={handleToggleCollapse}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title={isCollapsed ? 'Vis guiden' : 'Minimer guiden'}
            aria-label={isCollapsed ? 'Vis guiden' : 'Minimer guiden'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Lukk veileder permanent"
            aria-label="Lukk veileder permanent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800/80 h-1.5">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 transition-all duration-500 ease-out"
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
            className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={cn(
                  'relative rounded-xl p-4 flex flex-col justify-between border transition-all duration-200',
                  step.isCompleted
                    ? 'bg-slate-800/40 border-emerald-500/30 text-slate-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                )}
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white/10 text-xs font-bold flex items-center justify-center text-slate-300">
                        {idx + 1}
                      </span>
                      <div className="p-1.5 rounded-lg bg-white/10">
                        {step.icon}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleManualStep(step.id)}
                      className="group flex items-center gap-1 text-xs"
                      title={step.isCompleted ? 'Merk som ufullført' : 'Merk som fullført'}
                    >
                      {step.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                      )}
                    </button>
                  </div>

                  <h3 className={cn(
                    'font-semibold text-sm leading-snug',
                    step.isCompleted ? 'text-slate-300 line-through opacity-80' : 'text-white'
                  )}>
                    {step.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Step Action Button */}
                <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-1.5">
                  <button
                    onClick={() => onOpenAction(step.actionId)}
                    className={cn(
                      'w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm',
                      step.isCompleted
                        ? 'bg-white/10 hover:bg-white/15 text-slate-200'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold hover:shadow-md hover:shadow-amber-500/20'
                    )}
                  >
                    <span>{step.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {step.secondaryActionLabel && step.secondaryActionId && (
                    <button
                      onClick={() => onOpenAction(step.secondaryActionId!)}
                      className="w-full py-1 text-[11px] font-medium text-slate-400 hover:text-amber-300 text-center transition-colors"
                    >
                      {step.secondaryActionLabel} ↗
                    </button>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
