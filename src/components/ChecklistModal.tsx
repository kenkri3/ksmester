import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ListChecks, CheckCircle2, ChevronRight, ChevronLeft, Save, Hammer, Droplets, Zap, Brush, Layout, Construction, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { Trade } from '../types';
import { TRADE_CHECKLISTS } from '@/src/constants/checklists';
import { projectService } from '../services/projectService';
import { toast } from 'sonner';
import AIVisionModal from './AIVisionModal';
import { db, collection, addDoc, serverTimestamp } from '../services/firebase';

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  initialTrade?: Trade;
}

const TRADE_ICONS: Record<Trade, any> = {
  carpenter: Hammer,
  plumber: Droplets,
  electrician: Zap,
  mason: Construction,
  painter: Brush,
  general: Layout
};

export default function ChecklistModal({ isOpen, onClose, projectId, initialTrade }: ChecklistModalProps) {
  const { t } = useTranslation();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(initialTrade || null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [isAiVisionOpen, setIsAiVisionOpen] = useState(false);
  const [activeChecklistItem, setActiveChecklistItem] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    if (initialTrade) {
      setSelectedTrade(initialTrade);
    }
  }, [initialTrade]);

  const handleToggle = (itemId: string) => {
    setAnswers(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const openCamera = (e: React.MouseEvent, itemId: string, itemName: string) => {
    e.stopPropagation();
    setActiveChecklistItem({ id: itemId, name: itemName });
    setIsAiVisionOpen(true);
  };

  const checklistData = selectedTrade ? TRADE_CHECKLISTS[selectedTrade] : null;
  const currentStepData = checklistData ? checklistData.categories[currentStep] : null;
  const totalSteps = checklistData ? checklistData.categories.length : 0;
  const progress = checklistData ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const handleSave = async () => {
    setLoading(true);
    try {
      if (projectId) {
        await addDoc(collection(db, 'project_checklists'), {
          projectId,
          trade: selectedTrade,
          answers,
          progress: Math.round(progress),
          status: progress >= 100 ? 'completed' : 'in_progress',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await projectService.finalizeProjectDocumentation(projectId);
        toast.success("Sjekkliste lagret og dokumentasjon er oppdatert.");
      } else {
        await addDoc(collection(db, 'checklists'), {
          trade: selectedTrade,
          answers,
          progress: Math.round(progress),
          status: 'completed',
          createdAt: serverTimestamp()
        });
        toast.success("Sjekkliste lagret.");
      }
      
      onClose();
      resetModal();
    } catch (error) {
      console.error("Error saving checklist:", error);
      toast.error("Kunne ikke lagre sjekkliste.");
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setCurrentStep(0);
    setAnswers({});
    if (!initialTrade) setSelectedTrade(null);
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            className="bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[calc(100vh-2rem)] pb-[env(safe-area-inset-bottom,0px)]"
          >
            {/* Mobile Grab Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="p-4 sm:p-8 border-b border-neutral-100 flex justify-between items-center bg-emerald-50 shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-emerald-100 text-emerald-600 rounded-xl sm:rounded-2xl">
                  <ListChecks size={20} className="sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-2xl font-bold text-emerald-900 truncate">
                    {!selectedTrade ? "Velg ditt fagfelt" : `Sjekkliste: ${currentStepData?.title}`}
                  </h2>
                  {selectedTrade && (
                    <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                      <div className="h-1 sm:h-1.5 w-12 sm:w-32 bg-emerald-200 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-emerald-600"
                        />
                      </div>
                      <span className="text-[6px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-widest whitespace-nowrap">
                        Steg {currentStep + 1} av {totalSteps}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleClose} className="p-1.5 sm:p-2 hover:bg-emerald-100 rounded-full transition-colors text-emerald-900 shrink-0">
                <X size={18} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
              {!selectedTrade ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  {(Object.keys(TRADE_CHECKLISTS) as Trade[]).map((trade) => {
                    const Icon = TRADE_ICONS[trade];
                    return (
                      <button
                        key={trade}
                        onClick={() => setSelectedTrade(trade)}
                        className="flex flex-row sm:flex-col items-center gap-3 sm:gap-4 p-3 sm:p-8 rounded-xl sm:rounded-[2rem] border border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left sm:text-center"
                      >
                        <div className="p-2 sm:p-4 bg-neutral-100 text-neutral-500 rounded-lg sm:rounded-2xl group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors shrink-0">
                          <Icon size={18} className="sm:w-8 sm:h-8" />
                        </div>
                        <span className="font-bold text-neutral-900 text-[10px] sm:text-base">{TRADE_CHECKLISTS[trade].title}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-4">
                  {currentStepData?.items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleToggle(`${selectedTrade}-${currentStep}-${i}`)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 sm:p-6 rounded-xl sm:rounded-2xl border transition-all text-left group",
                        answers[`${selectedTrade}-${currentStep}-${i}`]
                          ? "bg-emerald-50 border-emerald-200 shadow-sm"
                          : "bg-white border-neutral-200 hover:border-emerald-200"
                      )}
                    >
                      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <span className={cn(
                          "text-[10px] sm:text-base font-medium transition-colors line-clamp-2",
                          answers[`${selectedTrade}-${currentStep}-${i}`] ? "text-emerald-900" : "text-neutral-600"
                        )}>
                          {item}
                        </span>
                        <button
                          onClick={(e) => openCamera(e, `${selectedTrade}-${currentStep}-${i}`, item)}
                          className="p-1.5 sm:p-2 bg-neutral-100 text-neutral-500 rounded-lg sm:rounded-xl hover:bg-emerald-100 hover:text-emerald-600 transition-all shrink-0"
                          title="Ta bilde for dokumentasjon"
                        >
                          <Camera size={14} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      </div>
                      <div className={cn(
                        "w-5 h-5 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-2",
                        answers[`${selectedTrade}-${currentStep}-${i}`]
                          ? "bg-emerald-600 border-emerald-600 text-white scale-110"
                          : "border-neutral-200 group-hover:border-emerald-300"
                      )}>
                        {answers[`${selectedTrade}-${currentStep}-${i}`] && <CheckCircle2 size={12} className="sm:w-[18px] sm:h-[18px]" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {selectedTrade && (
              <div className="p-3 sm:p-8 border-t border-neutral-100 bg-neutral-50 flex justify-between items-center shrink-0">
                <button
                  onClick={() => {
                    if (currentStep === 0) {
                      if (!initialTrade) setSelectedTrade(null);
                    } else {
                      setCurrentStep(prev => prev - 1);
                    }
                  }}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-sm font-bold text-neutral-500 hover:text-neutral-900 transition-all"
                >
                  <ChevronLeft size={14} className="sm:w-5 sm:h-5" />
                  {currentStep === 0 ? "Bytt fagfelt" : "Forrige"}
                </button>

                {currentStep < totalSteps - 1 ? (
                  <button
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-8 py-2 sm:py-3 bg-emerald-600 text-white rounded-lg sm:rounded-xl text-[9px] sm:text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
                  >
                    Neste steg
                    <ChevronRight size={14} className="sm:w-5 sm:h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-8 py-2 sm:py-3 bg-emerald-600 text-white rounded-lg sm:rounded-xl text-[9px] sm:text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-3 h-3 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={14} className="sm:w-5 sm:h-5" />
                        Fullfør
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      <AIVisionModal 
        isOpen={isAiVisionOpen}
        onClose={() => setIsAiVisionOpen(false)}
        projectId={projectId}
        checklistItemId={activeChecklistItem?.id}
        checklistItemName={activeChecklistItem?.name}
      />
    </AnimatePresence>
  );
}
