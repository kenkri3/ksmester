import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Settings, ExternalLink, ShieldCheck, Database, Zap, Building2, FileCheck, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IntegrationModal: React.FC<IntegrationModalProps> = ({ isOpen, onClose }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>(['tripletex', 'boligmappa', 'brreg']);

  const integrations = [
    { 
      id: 'nobb', 
      name: 'NOBB / Norsk Byggevarebase', 
      desc: '1M+ byggevarer, automatisk FDV, EPD og grossistpriser (BYOK)',
      lastSync: 'Klar for oppsett', 
      type: 'Varebase & FDV',
      status: 'Aktiv'
    },
    { 
      id: 'tripletex', 
      name: 'Tripletex', 
      desc: 'Automatisk overføring av fakturagrunnlag og timer',
      lastSync: 'Aktiv synk', 
      type: 'Regnskap & EHF',
      status: 'Tilkoblet'
    },
    { 
      id: 'fiken', 
      name: 'Fiken', 
      desc: 'Enkel bokføring av prosjektkostnader og bilag',
      lastSync: 'Klar for oppsett', 
      type: 'Regnskap',
      status: 'Klar'
    },
    { 
      id: 'boligmappa', 
      name: 'Boligmappa', 
      desc: '1-klikks overlevering av FDV og sluttdokumentasjon til boligeier',
      lastSync: 'Sanntidssynk aktiv', 
      type: 'Dokumentarkiv',
      status: 'Tilkoblet'
    },
    { 
      id: 'discord', 
      name: 'Discord Omnichannel', 
      desc: 'Oppgavevarsling og avvik direkte til håndverkernes mobil-app',
      lastSync: 'Feltvarsling', 
      type: 'Feltvarsling',
      status: 'Aktiv'
    },
    { 
      id: 'slack', 
      name: 'Slack Omnichannel', 
      desc: 'Sanntidsvarsler for oppgaver, SJA og avvik til håndverkere i Slack',
      lastSync: 'Feltvarsling', 
      type: 'Feltvarsling',
      status: 'Aktiv'
    },
    { 
      id: 'teams', 
      name: 'Microsoft Teams Omnichannel', 
      desc: 'Varsler og oppgaver til prosjektkanaler i Teams',
      lastSync: 'Feltvarsling', 
      type: 'Feltvarsling',
      status: 'Aktiv'
    },
    { 
      id: 'brreg', 
      name: 'Brønnøysundregistrene', 
      desc: 'Automatisk foretaksoppslag og verifisering av underentreprenører',
      lastSync: 'Aktiv sanntid', 
      type: 'Foretaksregister',
      status: 'Tilkoblet'
    },
    { 
      id: 'geonorge', 
      name: 'Geonorge & Kartverket', 
      desc: 'Automatisk oppslag av GNR, BNR og adressedata ved prosjektopprettelse',
      lastSync: 'Aktiv API', 
      type: 'Kart & Eiendom',
      status: 'Tilkoblet'
    },
    { 
      id: 'yr', 
      name: 'Yr.no / Meteorologisk Institutt', 
      desc: 'Automatisk værhistorikk (temperatur, vind, nedbør) til Byggedagbok',
      lastSync: 'Aktiv værstasjon', 
      type: 'Værsynk',
      status: 'Tilkoblet'
    }
  ];

  const handleSyncAll = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast.success('Alle integrasjoner er synkronisert!', {
        description: 'VikingMester er fullt oppdatert mot Tripletex, Boligmappa og Yr.no'
      });
    }, 1200);
  };

  const toggleIntegration = (id: string) => {
    setConnectedIntegrations(prev => {
      const isConn = prev.includes(id);
      if (isConn) {
        toast.info('Integrasjon koblet fra');
        return prev.filter(i => i !== id);
      } else {
        toast.success('Integrasjon aktivert!');
        return [...prev, id];
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-[#0B0F17] text-white w-full max-w-3xl rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Header */}
        <div className="p-5 sm:p-7 border-b border-slate-800 bg-[#131722] shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-electric-500 to-electric-600 text-white flex items-center justify-center shadow-md shadow-electric-950/50">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">Integrasjoner & Koblinger</h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-electric-950/60 text-electric-300 border border-electric-800/40">
                  VikingMester
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">Koble fagsystemer, regnskap og dokumentarkiv direkte til agenten</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Lukk" 
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 custom-scrollbar space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-800/40">
              <ShieldCheck size={14} className="text-emerald-400" />
              Sikker OAuth2 / API-synk aktiv
            </div>
            <button 
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-slate-700"
            >
              <RefreshCw className={isSyncing ? 'animate-spin text-electric-400' : ''} size={14} />
              <span>Synkroniser alle nå</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {integrations.map((int) => {
              const isConnected = connectedIntegrations.includes(int.id);
              return (
                <div 
                  key={int.id} 
                  className="bg-[#131722] p-4 sm:p-5 rounded-2xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all shadow-xs text-white"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isConnected ? 'bg-electric-950/60 text-electric-400 border border-electric-800/40' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {int.id === 'tripletex' || int.id === 'fiken' ? <Database size={20} /> : 
                       int.id === 'boligmappa' ? <FileCheck size={20} /> :
                       int.id === 'brreg' ? <Building2 size={20} /> : <Zap size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-white">{int.name}</h3>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                          {int.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5 hidden sm:block">{int.desc}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                        <span className={isConnected ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {isConnected ? 'Aktiv kobling' : 'Ikke tilkoblet'}
                        </span>
                        <span>•</span>
                        <span>{int.lastSync}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <button 
                        onClick={() => toggleIntegration(int.id)}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        Koble fra
                      </button>
                    ) : (
                      <button 
                        onClick={() => toggleIntegration(int.id)}
                        className="px-4 py-2 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-xl text-xs font-black hover:opacity-95 transition-all shadow-purple-cta cursor-pointer"
                      >
                        Koble til
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl text-white relative overflow-hidden shadow-sm">
            <h3 className="text-sm sm:text-base font-bold mb-1 text-white">Egendefinerte API-er eller hemmeligheter?</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-lg mb-4">
              Trenger din bedrift direkte overføring til et internt ERP-system eller skyarkiv? Våre autonome agenter kan kobles via sikre webhooks eller REST API.
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="mailto:hei@vikingmester.no?subject=Integrasjon%20VikingMester"
                className="px-4 py-2 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-xl text-xs font-black shadow-purple-cta inline-block"
              >
                Kontakt agent-support (hei@vikingmester.no)
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default IntegrationModal;
