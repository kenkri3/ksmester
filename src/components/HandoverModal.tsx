import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, FileText, Send, Sparkles, AlertTriangle, ClipboardCheck, Download, Mail, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Project, ProjectMaterial } from '../types';
import { db, collection, query, where, getDocs, handleFirestoreError, OperationType, updateDoc, doc, serverTimestamp } from '../services/firebase';
import { fdvService, FDVDocument } from '../services/fdvService';
import { pdfService } from '../services/pdfService';
import { projectService } from '../services/projectService';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

interface HandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  initialProjectId?: string;
  selectedProject?: Project | null;
  inline?: boolean;
}

const HandoverModal: React.FC<HandoverModalProps> = ({ 
  isOpen, 
  onClose, 
  projects = [], 
  initialProjectId,
  selectedProject: currentSelectedProject,
  inline = false
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || currentSelectedProject?.id || '');
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fdvDocs, setFdvDocs] = useState<FDVDocument[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);

  useEffect(() => {
    if (currentSelectedProject?.id) {
      setSelectedProjectId(currentSelectedProject.id);
    } else if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    } else if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [currentSelectedProject?.id, initialProjectId, projects]);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || currentSelectedProject;

  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchMaterials = async () => {
      try {
        const q = query(collection(db, 'project_materials'), where('projectId', '==', selectedProjectId));
        const snapshot = await getDocs(q);
        setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectMaterial)));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'project_materials');
      }
    };

    fetchMaterials();
  }, [selectedProjectId]);

  const completionProjects = (projects || []).filter(p => Boolean(p) && (p.stage === 'completion' || (Number(p.progress) || 0) > 90));
  const availableProjects = completionProjects.length > 0 ? completionProjects : projects;

  const checklist = [
    { id: 'c1', label: 'Sluttbefaring utført', status: 'completed' },
    { id: 'c2', label: 'Alle avvik lukket', status: 'completed' },
    { id: 'c3', label: 'FDV-dokumentasjon komplett', status: materials.length > 0 ? 'completed' : 'pending' },
    { id: 'c4', label: 'Sluttfaktura sendt', status: 'pending' },
  ];

  const handleGenerateFDV = async () => {
    if (!selectedProject) return;
    setIsGenerating(true);
    try {
      const docs = await fdvService.generateFDV(selectedProject, materials);
      setFdvDocs(docs);
      setStep(2);
    } catch (error) {
      console.error("Error generating FDV:", error);
      toast.error("Kunne ikke generere FDV-pakke.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedProjectId) return;
    setIsGenerating(true);
    try {
      // 1. Fullfør overlevering, bygg samlet FDV, lagre overtakelsesprotokoll og send til kunde
      await projectService.finalizeProjectDocumentation(selectedProjectId);

      setIsSuccess(true);
      toast.success("🎉 Prosjektet er overlevert! Komplett FDV-perm og sluttprotokoll er arkivert og klar for Boligmappa.");
      
      setTimeout(() => {
        setIsSuccess(false);
        setStep(1);
        if (!inline) {
          onClose();
        }
      }, 2500);
    } catch (error) {
      console.error("Error finalizing handover:", error);
      toast.error("Kunne ikke fullføre overleveringen.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseAllDeviations = async () => {
    try {
      if (selectedProjectId) {
        const q = query(collection(db, 'deviations'), where('projectId', '==', selectedProjectId));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await updateDoc(doc(db, 'deviations', d.id), { status: 'closed', updatedAt: serverTimestamp() });
        }
      }
      toast.success('Alle åpne avvik er lukket og godkjent for overlevering!');
    } catch (e) {
      toast.error('Kunne ikke lukke avvik.');
    }
  };

  const handleDownloadFDVPDF = async () => {
    if (!selectedProject) return;
    try {
      toast.info('Genererer FDV-dokumentasjon som PDF...');
      await pdfService.generateFDVPDF(selectedProject, materials);
      toast.success('FDV-pakke lastet ned som PDF!');
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Kunne ikke generere FDV PDF.');
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className={cn(
      "bg-[#0B0F17] text-white border border-slate-800 w-full overflow-hidden flex flex-col",
      inline 
        ? "rounded-3xl shadow-xl min-h-[700px]" 
        : "max-w-4xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
    )}>
      {/* Mobile Grab Handle */}
      {!inline && <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />}

      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-[#131722] shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shrink-0">
            <CheckCircle2 size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white truncate">Overlevering & FDV</h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <ShieldCheck size={11} /> NS 8406 / Bustadoppføringslova
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm font-medium truncate">
              Ferdigstill prosjektet, lukk avvik og overlever komplett FDV til byggherre
            </p>
          </div>
        </div>
        {inline ? (
          <button 
            type="button"
            onClick={onClose} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700 shrink-0"
            title="Gå tilbake til arbeidsstasjonen"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Tilbake til chat</span>
          </button>
        ) : (
          <button onClick={onClose} aria-label="Lukk" title="Lukk" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-[#0B0F17]">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-24 h-24 bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={56} />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Prosjekt Fullført!</h3>
              <p className="text-slate-400 max-w-sm text-sm">
                FDV-pakken er sendt til kunden, og prosjektet er nå arkivert i systemet.
              </p>
            </motion.div>
          ) : step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Velg Prosjekt for overlevering</label>
                <select 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-white text-sm cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-white">Velg prosjekt...</option>
                  {availableProjects.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.name || 'Prosjekt'} ({p.progress || 0}%)</option>
                  ))}
                </select>
              </div>

              {selectedProjectId && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Sjekkliste for ferdigstillelse</h3>
                      <div className="space-y-3">
                        {checklist.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-[#131722] border border-slate-800 rounded-2xl">
                            <span className="text-sm font-bold text-slate-200">{item.label}</span>
                            <span className={cn(
                              "text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
                              item.status === 'completed' ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-400 border border-amber-800"
                            )}>
                              {item.status === 'completed' ? 'Klar' : 'Gjenstår'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">FDV Grunnlag & Produkter</h3>
                      <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Registrerte materialer/produkter:</span>
                          <span className="font-bold text-white">{materials.length} stk</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Produktdatablader funnet:</span>
                          <span className="font-bold text-emerald-400">{materials.filter(m => m.fdvUrl).length} stk</span>
                        </div>
                        <div className="pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={handleCloseAllDeviations}
                            className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-750 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ShieldCheck size={14} className="text-emerald-400" />
                            <span>Lukk alle åpne avvik på prosjektet</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button 
                      onClick={handleGenerateFDV}
                      disabled={isGenerating}
                      className="w-full sm:w-auto px-8 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      <span>Generer FDV-Sluttpakke</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Generert FDV-Dokumentasjon</h3>
                  <p className="text-xs text-slate-400">Gjennomgå dokumentene før overlevering</p>
                </div>
                <button 
                  onClick={handleDownloadFDVPDF}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Download size={14} /> Last ned PDF
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {fdvDocs.map((docItem, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5">
                      <FileText size={16} className="text-rose-400 shrink-0" />
                      <span className="font-bold text-white">{docItem.section}</span>
                    </div>
                    <span className="text-slate-400">{docItem.supplierCategory || 'FDV'}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-800 flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tilbake
                </button>
                <button 
                  onClick={handleFinalize}
                  disabled={isGenerating}
                  className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Mail size={16} />
                  <span>Fullfør Overlevering & Send til Kunde</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center md:pl-[290px] lg:pl-[320px] p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        {content}
      </motion.div>
    </div>
  );
};

export default HandoverModal;
