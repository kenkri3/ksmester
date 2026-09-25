import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, FileText, Send, Sparkles, AlertTriangle, ClipboardCheck, Download, Mail, RefreshCw } from 'lucide-react';
import { Project, ProjectMaterial } from '../types';
import { db, collection, query, where, getDocs, handleFirestoreError, OperationType, updateDoc, doc, serverTimestamp } from '../services/firebase';
import { fdvService, FDVDocument } from '../services/fdvService';
import { pdfService } from '../services/pdfService';
import { projectService } from '../services/projectService';
import { toast } from 'sonner';

interface HandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  initialProjectId?: string;
}

const HandoverModal: React.FC<HandoverModalProps> = ({ isOpen, onClose, projects, initialProjectId }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fdvDocs, setFdvDocs] = useState<FDVDocument[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);

  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

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
        onClose();
        setIsSuccess(false);
        setStep(1);
        setSelectedProjectId('');
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0B0F17] text-white border border-slate-800 w-full max-w-4xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-[#131722]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Overlevering & FDV</h2>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">Ferdigstill prosjektet og lever dokumentasjon til kunden</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Lukk" title="Lukk" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#0B0F17]">
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
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-white text-sm"
                  >
                    <option value="" className="bg-slate-900 text-white">Velg prosjekt...</option>
                    {completionProjects.map(p => (
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
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                                item.status === 'completed' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50' : 'bg-slate-800 text-slate-500 border-slate-700'
                              }`}>
                                <CheckCircle2 size={14} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-rose-950/30 rounded-[2rem] p-6 border border-rose-800/40">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-rose-900/50 text-rose-400 flex items-center justify-center border border-rose-800/50">
                            <AlertTriangle size={20} />
                          </div>
                          <h4 className="font-bold text-rose-200">Utestående punkter</h4>
                        </div>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-xs text-rose-300 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Mangler FDV for varmekabler på bad
                          </li>
                          <li className="flex items-center gap-2 text-xs text-rose-300 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Sluttfaktura er ikke generert i Tripletex
                          </li>
                        </ul>
                        <button 
                          type="button"
                          onClick={handleCloseAllDeviations}
                          className="w-full mt-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                        >
                          Lukk alle avvik nå
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#131722] border border-slate-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                          <Sparkles size={28} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white">AI FDV-Generator</h4>
                          <p className="text-slate-400 text-xs">Samle alle bilder, logger og FDV automatisk.</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleGenerateFDV}
                        disabled={isGenerating}
                        className="w-full md:w-auto px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <FileText size={18} />}
                        Generer FDV-pakke
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
                className="space-y-8"
              >
                <div className="bg-[#131722] border border-slate-800 rounded-[2.5rem] p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h3 className="text-xl font-bold text-white">Forhåndsvisning: FDV-Pakke</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={handleDownloadFDVPDF}
                        title="Last ned FDV PDF"
                        className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                      >
                        <Download size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {fdvDocs.map((doc, i) => (
                      <div key={i} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className={doc.source === 'nobb' ? "text-blue-400" : "text-emerald-400"} size={20} />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{doc.section}</span>
                            <span className="text-[10px] text-slate-400">{doc.maintenanceInterval}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase">{doc.source === 'nobb' ? 'NOBB' : 'AI'}</span>
                          {doc.url && (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                              <Download size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 p-6 bg-emerald-950/20 rounded-2xl border border-emerald-800/40">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                      <CheckCircle2 size={18} />
                      AI-Kontroll Fullført
                    </div>
                    <p className="text-xs text-emerald-300 leading-relaxed">
                      Alle bilder fra AI Vision-kontroller er inkludert som dokumentasjon på utførelse bak vegger. 
                      Dette gir kunden ekstra trygghet og reduserer reklamasjonsrisiko.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-5 bg-slate-800 border border-slate-700 text-slate-200 rounded-3xl font-bold hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    Tilbake
                  </button>
                  <button 
                    onClick={handleFinalize}
                    className="flex-[2] flex items-center justify-center gap-3 py-5 bg-rose-600 text-white rounded-3xl font-bold hover:bg-rose-500 transition-all shadow-xl shadow-rose-900/30 cursor-pointer"
                  >
                    <Mail size={20} />
                    Send til Kunde & Arkiver
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default HandoverModal;
