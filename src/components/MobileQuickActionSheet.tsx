import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Mic, 
  Clock, 
  AlertTriangle, 
  ClipboardCheck, 
  FileText, 
  Plus, 
  X, 
  Sparkles,
  Zap,
  FolderPlus,
  ShieldAlert,
  Car,
  Package
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface MobileQuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionId: string) => void;
}

export default function MobileQuickActionSheet({
  isOpen,
  onClose,
  onAction
}: MobileQuickActionSheetProps) {
  if (!isOpen) return null;

  const quickActions = [
    {
      id: 'take_photo',
      label: 'AI Bildeanalyse',
      sublabel: 'Ta foto & finn avvik med AI',
      icon: <Camera size={22} />,
      color: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
      badge: 'Populær'
    },
    {
      id: 'voice_sja',
      label: 'Tale til SJA',
      sublabel: 'Snakk inn risikovurdering',
      icon: <Mic size={22} />,
      color: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white',
      badge: 'AI Smart'
    },
    {
      id: 'time_registration',
      label: 'Før timer',
      sublabel: 'Registrer arbeidstimer raskt',
      icon: <Clock size={22} />,
      color: 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white',
      badge: null
    },
    {
      id: 'log_deviation',
      label: 'Meld avvik',
      sublabel: 'HMS/KS avviksregistrering',
      icon: <AlertTriangle size={22} />,
      color: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
      badge: null
    },
    {
      id: 'start_checklist',
      label: 'Start sjekkliste',
      sublabel: 'TEK17 / Våtrom / Egenkontroll',
      icon: <ClipboardCheck size={22} />,
      color: 'bg-gradient-to-br from-emerald-600 to-green-700 text-white',
      badge: null
    },
    {
      id: 'offers',
      label: 'Opprett tilbud',
      sublabel: 'Kalkuler og send tilbud',
      icon: <FileText size={22} />,
      color: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white',
      badge: null
    },
    {
      id: 'vehicle',
      label: 'Kjørebok',
      sublabel: 'Registrer tur og kilometer',
      icon: <Car size={22} />,
      color: 'bg-gradient-to-br from-neutral-700 to-neutral-900 text-white',
      badge: null
    },
    {
      id: 'inventory',
      label: 'Lager & Verktøy',
      sublabel: 'Oversikt over verktøy og utstyr',
      icon: <Package size={22} />,
      color: 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white',
      badge: null
    },
    {
      id: 'new_project',
      label: 'Nytt prosjekt',
      sublabel: 'Opprett prosjektmappe',
      icon: <FolderPlus size={22} />,
      color: 'bg-gradient-to-br from-neutral-800 to-neutral-950 text-white',
      badge: null
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
        />

        {/* Bottom Sheet Modal */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full bg-white rounded-t-[2.5rem] p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl border-t border-neutral-200/90 max-h-[85vh] overflow-y-auto"
        >
          {/* Grab Handle */}
          <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-4" />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-electric-50 text-electric-600 flex items-center justify-center">
                  <Zap size={16} />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-neutral-900">
                  Hurtighandlinger
                </h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Direkte tilgang til feltverktøy for byggeplassen
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center active:scale-95 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Actions Grid */}
          <div className="grid grid-cols-1 gap-2.5">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  onAction(action.id);
                  onClose();
                }}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 hover:bg-neutral-100/80 active:scale-[0.98] transition-all text-left group"
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105 shrink-0",
                  action.color
                )}>
                  {action.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-900 group-hover:text-electric-600 transition-colors">
                      {action.label}
                    </span>
                    {action.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-electric-50 text-electric-700 border border-electric-200">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 truncate mt-0.5">
                    {action.sublabel}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-400 group-hover:text-electric-600 group-hover:border-emerald-200 transition-all shrink-0">
                  <Plus size={16} />
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
