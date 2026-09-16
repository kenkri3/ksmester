import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Building2, CheckCircle2, Clock, AlertCircle, FileText, Send, Info, ChevronRight } from 'lucide-react';

import { db, collection, addDoc, serverTimestamp } from '../services/firebase';
import { toast } from 'sonner';

interface BuildingApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: { id: string, name: string }[];
}

const BuildingApplicationModal: React.FC<BuildingApplicationModalProps> = ({ isOpen, onClose, projects }) => {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [appType, setAppType] = useState<'ett-trinns' | 'ramme' | 'igangsetting'>('ett-trinns');
  const [isSuccess, setIsSuccess] = useState(false);
  const [checklist, setChecklist] = useState([
    { id: 'c1', label: 'Tegninger (Plan, Snitt, Fasade)', status: 'completed' },
    { id: 'c2', label: 'Nabovarsel (Kvittering for utsendelse)', status: 'completed' },
    { id: 'c3', label: 'Situasjonsplan', status: 'pending' },
    { id: 'c4', label: 'Ansvarsretter', status: 'pending' },
  ]);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed' } : item
    ));
  };

  const handleSave = async () => {
    try {
      if (selectedProjectId) {
        await addDoc(collection(db, 'building_applications'), {
          projectId: selectedProjectId,
          appType,
          checklist,
          status: 'submitted',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      }
      setIsSuccess(true);
      toast.success('Byggesøknad oppdatert og lagret!');
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setSelectedProjectId('');
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error('Kunne ikke lagre byggesøknad.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-neutral-50 text-neutral-900 w-full max-w-3xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100 shrink-0">
              <Building2 size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-neutral-900 truncate">Byggesøknad</h2>
              <p className="text-neutral-500 text-xs sm:text-sm font-medium truncate">Administrer søknadsprosessen mot kommunen</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Lukk" title="Lukk" className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors shrink-0">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">Søknad Oppdatert!</h3>
                <p className="text-neutral-600">Endringene er lagret og status er oppdatert.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-500 ml-1">Prosjekt</label>
                    <select 
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full p-4 bg-white text-neutral-900 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    >
                      <option value="" className="text-neutral-500 bg-white">Velg prosjekt...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id} className="text-neutral-900 bg-white">{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-500 ml-1">Søknadstype</label>
                    <select 
                      value={appType}
                      onChange={(e) => setAppType(e.target.value as any)}
                      className="w-full p-4 bg-white text-neutral-900 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    >
                      <option value="ett-trinns" className="text-neutral-900 bg-white">Ett-trinns søknad</option>
                      <option value="ramme" className="text-neutral-900 bg-white">Rammetillatelse</option>
                      <option value="igangsetting" className="text-neutral-900 bg-white">Igangsettingstillatelse</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-600">Dokumentasjonsstatus</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleChecklistItem(item.id)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              item.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-400'
                            }`}
                          >
                            {item.status === 'completed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                          </button>
                          <span className="text-sm font-bold text-neutral-800">{item.label}</span>
                        </div>
                        <button className="text-xs font-bold text-blue-600 hover:underline">Se dokument</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Info size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-1">AI-Tips for søknaden</h4>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Basert på prosjektbeskrivelsen mangler det en redegjørelse for universell utforming. 
                      Vi anbefaler å legge ved dette for å unngå forsinkelser i saksbehandlingen.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={onClose}
                    className="flex-1 py-4 bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-900 rounded-2xl font-bold hover:bg-neutral-50 transition-all"
                  >
                    Avbryt
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={!selectedProjectId}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                  >
                    <Send size={18} />
                    Send til Kommunen
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

export default BuildingApplicationModal;
