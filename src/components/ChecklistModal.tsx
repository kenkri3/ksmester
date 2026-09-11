import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ListChecks, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  Hammer, 
  Droplets, 
  Zap, 
  Brush, 
  Layout, 
  Construction, 
  Camera, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Check, 
  Minus,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { Trade, ProjectChecklist, ChecklistItem, Project } from '../types';
import { TRADE_CHECKLISTS } from '@/src/constants/checklists';
import { api } from '../services/api';
import { checklistGenerator } from '../services/checklistGenerator';
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
  const [projectChecklists, setProjectChecklists] = useState<ProjectChecklist[]>([]);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isAiVisionOpen, setIsAiVisionOpen] = useState(false);
  const [activeChecklistItem, setActiveChecklistItem] = useState<{ id: string, name: string } | null>(null);

  // Redigeringstilstander for sjekkpunkter
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [newCustomItemText, setNewCustomItemText] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  useEffect(() => {
    if (initialTrade) {
      setSelectedTrade(initialTrade);
    }
  }, [initialTrade]);

  // Hent eller generer automatisk sjekklister for prosjektet
  useEffect(() => {
    if (!isOpen || !projectId) return;

    async function loadOrGenerateChecklists() {
      setLoading(true);
      try {
        const allChecklists = await api.getCollection('project_checklists');
        const existing = allChecklists.filter((c: any) => c.projectId === projectId);

        if (existing.length > 0) {
          setProjectChecklists(existing);
        } else {
          // Hent prosjektinfo for kontekstuell generering
          const allProjects = await api.getCollection('projects');
          const proj: Project | undefined = allProjects.find((p: any) => p.id === projectId);

          const generated = await checklistGenerator.generateChecklistsForScope(projectId, {
            trade: proj?.tags?.[0] || selectedTrade || 'general',
            title: proj?.name || 'Byggeprosjekt',
            description: proj?.description
          });

          for (const chk of generated) {
            await api.saveDoc('project_checklists', chk);
          }
          setProjectChecklists(generated);
          toast.success('Mesterhjernen har automatisk generert skreddersydde sjekklister for prosjektet!');
        }
      } catch (err) {
        console.error('Error loading project checklists:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOrGenerateChecklists();
  }, [isOpen, projectId, selectedTrade]);

  // Aktiv sjekkliste (enten fra dynamisk prosjekt eller fallback fra statisk liste)
  const currentChecklist = projectChecklists[activePhaseIndex];

  // Oppdater status for et sjekkpunkt (pass / fail / na)
  const handleItemStatusChange = async (itemId: string, newStatus: 'passed' | 'failed' | 'na' | 'pending') => {
    if (!currentChecklist) return;

    const updatedItems = currentChecklist.items.map(item => {
      if (item.id === itemId) {
        const nextStatus = item.status === newStatus ? 'pending' : newStatus;
        return {
          ...item,
          status: nextStatus,
          checked: nextStatus === 'passed'
        };
      }
      return item;
    });

    const isAllChecked = updatedItems.every(i => i.status === 'passed' || i.status === 'na');
    const updatedChecklist: ProjectChecklist = {
      ...currentChecklist,
      items: updatedItems,
      status: isAllChecked ? 'completed' : 'in_progress',
      updatedAt: new Date().toISOString()
    };

    const newLists = [...projectChecklists];
    newLists[activePhaseIndex] = updatedChecklist;
    setProjectChecklists(newLists);

    // Auto-lagre til database
    try {
      await api.saveDoc('project_checklists', updatedChecklist);
    } catch (err) {
      console.warn('Could not auto-save checklist item:', err);
    }
  };

  // Start redigering av sjekkpunkttekst
  const startEditing = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingText(item.text);
  };

  // Lagre redigert sjekkpunkttekst
  const saveEditedText = async (itemId: string) => {
    if (!currentChecklist || !editingText.trim()) {
      setEditingItemId(null);
      return;
    }

    const updatedItems = currentChecklist.items.map(item => 
      item.id === itemId ? { ...item, text: editingText.trim() } : item
    );

    const updatedChecklist: ProjectChecklist = {
      ...currentChecklist,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    };

    const newLists = [...projectChecklists];
    newLists[activePhaseIndex] = updatedChecklist;
    setProjectChecklists(newLists);
    setEditingItemId(null);

    await api.saveDoc('project_checklists', updatedChecklist);
    toast.success('Sjekkpunkt oppdatert');
  };

  // Legg til nytt egentilpasset kontrollpunkt
  const handleAddCustomItem = async () => {
    if (!currentChecklist || !newCustomItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: `custom-item-${Date.now()}`,
      text: newCustomItemText.trim(),
      checked: false,
      status: 'pending',
      required: false,
      category: 'Egendefinert',
      order: currentChecklist.items.length + 1
    };

    const updatedChecklist: ProjectChecklist = {
      ...currentChecklist,
      items: [...currentChecklist.items, newItem],
      updatedAt: new Date().toISOString()
    };

    const newLists = [...projectChecklists];
    newLists[activePhaseIndex] = updatedChecklist;
    setProjectChecklists(newLists);
    setNewCustomItemText('');
    setIsAddingCustom(false);

    await api.saveDoc('project_checklists', updatedChecklist);
    toast.success('Nytt kontrollpunkt lagt til');
  };

  // Slett et sjekkpunkt
  const handleDeleteItem = async (itemId: string) => {
    if (!currentChecklist) return;

    const updatedItems = currentChecklist.items.filter(i => i.id !== itemId);
    const updatedChecklist: ProjectChecklist = {
      ...currentChecklist,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    };

    const newLists = [...projectChecklists];
    newLists[activePhaseIndex] = updatedChecklist;
    setProjectChecklists(newLists);

    await api.saveDoc('project_checklists', updatedChecklist);
    toast.success('Sjekkpunkt fjernet');
  };

  const openCamera = (e: React.MouseEvent, itemId: string, itemName: string) => {
    e.stopPropagation();
    setActiveChecklistItem({ id: itemId, name: itemName });
    setIsAiVisionOpen(true);
  };

  // Beregn fremdrift
  const totalItems = currentChecklist?.items.length || 0;
  const completedItems = currentChecklist?.items.filter(i => i.status === 'passed' || i.status === 'na').length || 0;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="checklist-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          className="bg-white w-full max-w-3xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
        >
          {/* Mobile Grab Handle */}
          <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 mb-1" />

          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50 shrink-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Lovpålagt KS / TEK17
                  </span>
                  <span className="text-[10px] text-neutral-400 font-bold">100% Redigerbar</span>
                </div>
                <h2 className="text-base sm:text-xl font-bold text-neutral-900 truncate">
                  {currentChecklist?.phaseTitle || currentChecklist?.title || 'Kvalitetssikring & Sjekkliste'}
                </h2>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-500 hover:text-neutral-900"
            >
              <X size={20} />
            </button>
          </div>

          {/* Fasevelger tabs (HMS, Mottak, Fagkontroll, Sluttkontroll) */}
          {projectChecklists.length > 0 && (
            <div className="flex items-center gap-1.5 p-2 bg-neutral-100 border-b border-neutral-200 overflow-x-auto whitespace-nowrap scrollbar-none">
              {projectChecklists.map((chk, idx) => {
                const isPassed = chk.status === 'completed';
                return (
                  <button
                    key={chk.id || idx}
                    onClick={() => setActivePhaseIndex(idx)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
                      activePhaseIndex === idx 
                        ? "bg-white text-emerald-700 shadow-sm border border-neutral-200" 
                        : "text-neutral-600 hover:text-neutral-900"
                    )}
                  >
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      isPassed ? "bg-emerald-500" : "bg-neutral-300"
                    )} />
                    {chk.phaseTitle?.split(':')[0] || `Fase ${idx + 1}`}
                  </button>
                );
              })}
            </div>
          )}

          {/* Fremdriftslinje */}
          <div className="px-6 py-3 bg-white border-b border-neutral-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-2 flex-1 bg-neutral-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
              <span className="text-xs font-black text-neutral-500 whitespace-nowrap">
                {completedItems} av {totalItems} utført ({Math.round(progress)}%)
              </span>
            </div>
            <button 
              onClick={() => setIsAddingCustom(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors shrink-0"
            >
              <Plus size={14} />
              <span>Legg til punkt</span>
            </button>
          </div>

          {/* Innhold / Sjekkpunkter */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
            {/* Inputfelt for nytt sjekkpunkt */}
            {isAddingCustom && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Nytt Kontrollpunkt</span>
                <input 
                  type="text" 
                  value={newCustomItemText}
                  onChange={(e) => setNewCustomItemText(e.target.value)}
                  placeholder="F.eks. Kontroller ekstra forsterkning av bjelkelag iht. kundens ønske..."
                  className="w-full p-3 bg-white border border-emerald-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => { setIsAddingCustom(false); setNewCustomItemText(''); }}
                    className="px-3 py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-800"
                  >
                    Avbryt
                  </button>
                  <button 
                    onClick={handleAddCustomItem}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    Legg til sjekkpunkt
                  </button>
                </div>
              </div>
            )}

            {/* Sjekkpunktliste */}
            {currentChecklist?.items.map((item, idx) => (
              <div
                key={item.id || idx}
                className={cn(
                  "p-3 sm:p-4 rounded-2xl border transition-all space-y-2",
                  item.status === 'passed' 
                    ? "bg-emerald-50/50 border-emerald-200" 
                    : item.status === 'failed'
                    ? "bg-rose-50/50 border-rose-200"
                    : item.status === 'na'
                    ? "bg-neutral-100/70 border-neutral-200 opacity-70"
                    : "bg-white border-neutral-200 shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editingItemId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-xs sm:text-sm font-medium"
                          autoFocus
                        />
                        <button 
                          onClick={() => saveEditedText(item.id)}
                          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={() => setEditingItemId(null)}
                          className="p-2 bg-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-300"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 group">
                        <span className={cn(
                          "text-xs sm:text-sm font-medium leading-relaxed",
                          item.status === 'passed' ? "text-emerald-950 font-bold" : 
                          item.status === 'failed' ? "text-rose-950 font-bold" : 
                          item.status === 'na' ? "text-neutral-500 line-through" : 
                          "text-neutral-800"
                        )}>
                          {item.text}
                        </span>
                        <button 
                          onClick={() => startEditing(item)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-700 transition-opacity"
                          title="Rediger sjekkpunkt"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    )}

                    {item.category && (
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                        {item.category}
                      </span>
                    )}
                  </div>

                  {/* Handlingstaster: Godkjent, Avvik, NA, Foto */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => openCamera(e, item.id, item.text)}
                      className="p-2 bg-neutral-100 text-neutral-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl transition-colors"
                      title="Ta bilde for AI KS-verifisering (Bygningsdel)"
                    >
                      <Camera size={16} />
                    </button>

                    {/* Godkjent */}
                    <button
                      onClick={() => handleItemStatusChange(item.id, 'passed')}
                      className={cn(
                        "p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1",
                        item.status === 'passed'
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                          : "bg-neutral-100 text-neutral-500 hover:bg-emerald-50 hover:text-emerald-600"
                      )}
                      title="Godkjenn kontrollpunkt"
                    >
                      <CheckCircle2 size={16} />
                      <span className="hidden sm:inline">OK</span>
                    </button>

                    {/* Avvik */}
                    <button
                      onClick={() => handleItemStatusChange(item.id, 'failed')}
                      className={cn(
                        "p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1",
                        item.status === 'failed'
                          ? "bg-rose-600 text-white shadow-md shadow-rose-200"
                          : "bg-neutral-100 text-neutral-500 hover:bg-rose-50 hover:text-rose-600"
                      )}
                      title="Flagg som avvik"
                    >
                      <AlertTriangle size={16} />
                      <span className="hidden sm:inline">Avvik</span>
                    </button>

                    {/* Ikke relevant (NA) */}
                    <button
                      onClick={() => handleItemStatusChange(item.id, 'na')}
                      className={cn(
                        "p-2 rounded-xl text-xs font-bold transition-all",
                        item.status === 'na'
                          ? "bg-neutral-600 text-white"
                          : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                      )}
                      title="Ikke relevant (N/A)"
                    >
                      N/A
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(!currentChecklist || currentChecklist.items.length === 0) && (
              <div className="p-8 text-center text-neutral-400 text-xs">
                Ingen sjekkpunkter i denne fasen. Klikk «Legg til punkt» for å opprette.
              </div>
            )}
          </div>

          {/* Footer navigering mellom faser */}
          <div className="p-4 sm:p-6 border-t border-neutral-100 bg-neutral-50 flex justify-between items-center shrink-0">
            <button
              onClick={() => setActivePhaseIndex(prev => Math.max(0, prev - 1))}
              disabled={activePhaseIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
              <span>Forrige fase</span>
            </button>

            {activePhaseIndex < projectChecklists.length - 1 ? (
              <button
                onClick={() => setActivePhaseIndex(prev => prev + 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-100"
              >
                <span>Neste fase</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => {
                  toast.success('Alle kontrollfaser gjennomgått og lagret i prosjektet!');
                  onClose();
                }}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-100"
              >
                <CheckCircle2 size={16} />
                <span>Fullfør sjekklister</span>
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
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



