import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, FileText, Send, Sparkles, AlertTriangle, ClipboardCheck, Download, Mail, RefreshCw } from 'lucide-react';
import { Project, ProjectMaterial } from '../types';
import { db, collection, query, where, getDocs, handleFirestoreError, OperationType, updateDoc, doc, serverTimestamp } from '../services/firebase';
import { fdvService, FDVDocument } from '../services/fdvService';
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

  const completionProjects = projects.filter(p => p.stage === 'completion' || p.progress > 90);

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
      alert("Kunne ikke generere FDV-pakke.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedProjectId) return;
    setIsGenerating(true);
    try {
      // 1. Update project status to archived/completed
      await updateDoc(doc(db, 'projects', selectedProjectId), {
        stage: 'archived',
        status: 'completed',
        progress: 100,
        updatedAt: serverTimestamp()
      });

      // 2. Mark FDV documents as sent (simulated)
      // In a real app, we might trigger an email here.

      setIsSuccess(true);
      toast.success("Prosjektet er overlevert og arkivert!");
      
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-neutral-50 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-100">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Overlevering & FDV</h2>
              <p className="text-neutral-500 text-sm font-medium">Ferdigstill prosjektet og lever dokumentasjon til kunden</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={56} />
                </div>
                <h3 className="text-3xl font-bold mb-2">Prosjekt Fullført!</h3>
                <p className="text-neutral-500 max-w-sm">
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
                  <label className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Velg Prosjekt for overlevering</label>
                  <select 
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-4 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none font-bold appearance-none"
                  >
                    <option value="">Velg prosjekt...</option>
                    {completionProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.progress}%)</option>
                    ))}
                  </select>
                </div>

                {selectedProjectId && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Sjekkliste for ferdigstillelse</h3>
                        <div className="space-y-3">
                          {checklist.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl">
                              <span className="text-sm font-bold text-neutral-700">{item.label}</span>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                item.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-400'
                              }`}>
                                <CheckCircle2 size={14} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-rose-50 rounded-[2rem] p-6 border border-rose-100">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                            <AlertTriangle size={20} />
                          </div>
                          <h4 className="font-bold text-rose-900">Utestående punkter</h4>
                        </div>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-xs text-rose-700 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Mangler FDV for varmekabler på bad
                          </li>
                          <li className="flex items-center gap-2 text-xs text-rose-700 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Sluttfaktura er ikke generert i Tripletex
                          </li>
                        </ul>
                        <button className="w-full mt-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-500 transition-all">
                          Lukk alle avvik nå
                        </button>
                      </div>
                    </div>

                    <div className="bg-neutral-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                          <Sparkles className="text-rose-400" size={28} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold">AI FDV-Generator</h4>
                          <p className="text-neutral-400 text-xs">Samle alle bilder, logger og FDV automatisk.</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleGenerateFDV}
                        disabled={isGenerating}
                        className="w-full md:w-auto px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
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
                <div className="bg-white border border-neutral-200 rounded-[2.5rem] p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold">Forhåndsvisning: FDV-Pakke</h3>
                    <div className="flex items-center gap-2">
                      <button className="p-3 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-all">
                        <Download size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {fdvDocs.map((doc, i) => (
                      <div key={i} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className={doc.source === 'nobb' ? "text-blue-500" : "text-emerald-500"} size={20} />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{doc.section}</span>
                            <span className="text-[10px] text-neutral-400">{doc.maintenanceInterval}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-neutral-400 uppercase">{doc.source === 'nobb' ? 'NOBB' : 'AI'}</span>
                          {doc.url && (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-neutral-200 rounded">
                              <Download size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                      <CheckCircle2 size={18} />
                      AI-Kontroll Fullført
                    </div>
                    <p className="text-xs text-emerald-600 leading-relaxed">
                      Alle bilder fra AI Vision-kontroller er inkludert som dokumentasjon på utførelse bak vegger. 
                      Dette gir kunden ekstra trygghet og reduserer reklamasjonsrisiko.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-5 bg-white border border-neutral-200 rounded-3xl font-bold hover:bg-neutral-50 transition-all"
                  >
                    Tilbake
                  </button>
                  <button 
                    onClick={handleFinalize}
                    className="flex-[2] flex items-center justify-center gap-3 py-5 bg-rose-600 text-white rounded-3xl font-bold hover:bg-rose-500 transition-all shadow-xl shadow-rose-500/20"
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
