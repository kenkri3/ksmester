import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, CheckCircle2, Clock, AlertCircle, FileText, Send, Info, ChevronRight } from 'lucide-react';

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

  const handleSave = () => {
    setIsSuccess(true);
    setTimeout(() => {
      onClose();
      setIsSuccess(false);
      setSelectedProjectId('');
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-neutral-50 w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Byggesøknad</h2>
              <p className="text-neutral-500 text-sm font-medium">Administrer søknadsprosessen mot kommunen</p>
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
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Søknad Oppdatert!</h3>
                <p className="text-neutral-500">Endringene er lagret og status er oppdatert.</p>
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
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Prosjekt</label>
                    <select 
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full p-4 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold appearance-none"
                    >
                      <option value="">Velg prosjekt...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Søknadstype</label>
                    <select 
                      value={appType}
                      onChange={(e) => setAppType(e.target.value as any)}
                      className="w-full p-4 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold appearance-none"
                    >
                      <option value="ett-trinns">Ett-trinns søknad</option>
                      <option value="ramme">Rammetillatelse</option>
                      <option value="igangsetting">Igangsettingstillatelse</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">Dokumentasjonsstatus</h3>
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
                          <span className="text-sm font-bold text-neutral-700">{item.label}</span>
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
                    className="flex-1 py-4 bg-white border border-neutral-200 rounded-2xl font-bold hover:bg-neutral-50 transition-all"
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
