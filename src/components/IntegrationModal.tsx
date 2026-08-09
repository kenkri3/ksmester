import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, CheckCircle2, AlertCircle, Settings, ExternalLink, ShieldCheck, Database, Zap } from 'lucide-react';

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IntegrationModal: React.FC<IntegrationModalProps> = ({ isOpen, onClose }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>(['tripletex', 'nobb', 'boligmappa']);

  const integrations = [
    { id: 'tripletex', name: 'Tripletex', lastSync: '10 min siden', type: 'Regnskap' },
    { id: 'fiken', name: 'Fiken', lastSync: '-', type: 'Regnskap' },
    { id: 'nobb', name: 'NOBB', lastSync: '1 time siden', type: 'Varedatabase' },
    { id: 'boligmappa', name: 'Boligmappa', lastSync: 'I går', type: 'Dokumentasjon' },
  ];

  const handleSyncAll = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const toggleIntegration = (id: string) => {
    setConnectedIntegrations(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-lg shadow-neutral-200">
              <RefreshCw size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Integrasjonssenter</h2>
              <p className="text-neutral-500 text-sm font-medium">Koble KS MesterAI til dine favorittverktøy</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              <ShieldCheck size={14} />
              Sikker API-tilkobling aktiv
            </div>
            <button 
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="flex items-center gap-2 text-sm font-bold text-neutral-900 hover:bg-neutral-100 px-4 py-2 rounded-xl transition-all"
            >
              <RefreshCw className={isSyncing ? 'animate-spin' : ''} size={16} />
              Synkroniser alle nå
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {integrations.map((int) => {
              const isConnected = connectedIntegrations.includes(int.id);
              return (
                <div key={int.id} className="bg-white p-6 rounded-3xl border border-neutral-200 flex items-center justify-between group hover:border-neutral-900 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-50 text-neutral-400'
                    }`}>
                      {int.id === 'tripletex' || int.id === 'fiken' ? <Database size={24} /> : <Zap size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-neutral-900">{int.name}</h3>
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-full">{int.type}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${isConnected ? 'text-emerald-600' : 'text-neutral-400'}`}>
                            {isConnected ? 'Tilkoblet' : 'Ikke tilkoblet'}
                          </span>
                        </div>
                        <span className="w-1 h-1 rounded-full bg-neutral-200" />
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Sist synket: {int.lastSync}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <button className="p-3 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-all">
                          <Settings size={20} />
                        </button>
                        <button 
                          onClick={() => toggleIntegration(int.id)}
                          className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <X size={20} />
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => toggleIntegration(int.id)}
                        className="px-6 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200"
                      >
                        Koble til
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 p-8 bg-neutral-900 rounded-[2.5rem] text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Trenger du en ny integrasjon?</h3>
              <p className="text-neutral-400 text-sm mb-6 max-w-md">
                Vår AI kan hjelpe deg med å koble til over 5000+ apper via Zapier eller direkte API-koblinger.
              </p>
              <button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20">
                Kontakt AI-support
              </button>
            </div>
            <RefreshCw className="absolute -right-12 -bottom-12 text-white/5 w-64 h-64 rotate-12" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default IntegrationModal;
