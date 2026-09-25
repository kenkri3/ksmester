import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FlaskConical, 
  ShieldAlert, 
  Download, 
  PhoneCall, 
  QrCode, 
  Search, 
  Plus, 
  Sparkles,
  ShieldCheck,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Project, SafetyDataSheet } from '../types';
import { stoffkartotekService } from '../services/stoffkartotekService';
import { pdfService } from '../services/pdfService';
import { toast } from 'sonner';

interface StoffkartotekModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export default function StoffkartotekModal({
  isOpen,
  onClose,
  project
}: StoffkartotekModalProps) {
  const [sheets, setSheets] = useState<SafetyDataSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSheet, setSelectedSheet] = useState<SafetyDataSheet | null>(null);

  useEffect(() => {
    if (!isOpen || !project?.id) return;
    loadSheets();
  }, [isOpen, project?.id]);

  const loadSheets = async () => {
    setLoading(true);
    try {
      // Auto-scan and populate
      const data = await stoffkartotekService.autoScanAndPopulate(project);
      setSheets(data);
      if (data.length > 0) {
        setSelectedSheet(data[0]);
      }
    } catch (e) {
      console.warn('Could not load safety data sheets:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredSheets = sheets.filter(s =>
    s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.usageArea.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-[#0B0F17] text-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-w-5xl w-full p-4 sm:p-8 max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-slate-800 pb-[env(safe-area-inset-bottom,1rem)] sm:pb-8"
        >
          {/* Mobile grab handle */}
          <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />

          {/* Header */}
          <div className="flex justify-between items-start pb-4 sm:pb-6 border-b border-slate-800 gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 sm:p-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl shrink-0">
                  <FlaskConical size={18} className="sm:w-5 sm:h-5" />
                </span>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400 truncate">
                  Forskrift om utførelse av arbeid | Arbeidstilsynet
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white truncate">Digitalt Stoffkartotek</h2>
              <p className="text-xs text-slate-400 truncate">
                Prosjekt: {project.name}
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => pdfService.generateStoffkartotekPDF(project, sheets)}
                disabled={sheets.length === 0}
                className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow-sm transition-all cursor-pointer"
                title="Last ned PDF"
              >
                <Download size={13} /> <span className="hidden xs:inline">PDF</span>
              </button>
              <button
                onClick={onClose}
                aria-label="Lukk"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Emergency Hotline Alert */}
          <div className="mt-4 p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl flex items-center justify-between text-rose-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-950/50">
                <PhoneCall size={20} />
              </div>
              <div>
                <div className="text-xs font-black text-rose-300 uppercase tracking-wider">
                  Giftinformasjonen Døgnåpen Vakttelefon
                </div>
                <div className="text-lg font-black text-rose-400">22 59 13 00</div>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-[11px] font-bold text-rose-300">Medisinsk nødnummer: 113</div>
              <div className="text-[10px] text-rose-400/80">Ved alvorlig kjemikalieuhell eller etsing</div>
            </div>
          </div>

          {/* Search bar */}
          <div className="my-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Søk i kjemikalier, produsenter eller bruksområde (f.eks. Tec7, Casco, lim, maling)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 rounded-xl border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          {/* Master Detail Split */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-1">
            {/* Left list */}
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Kjemikalier på byggeplass ({filteredSheets.length})
              </div>
              {loading ? (
                <div className="text-xs text-slate-400 p-4">Laster stoffkartotek...</div>
              ) : filteredSheets.length === 0 ? (
                <div className="text-xs text-slate-400 p-4 bg-[#131722] border border-slate-800 rounded-xl text-center">
                  Ingen kjemikalier funnet.
                </div>
              ) : (
                filteredSheets.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSheet(s)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedSheet?.id === s.id
                        ? 'bg-amber-950/40 border-amber-500/40 shadow-sm text-amber-200'
                        : 'bg-[#131722] border-slate-800 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">{s.productName}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{s.usageArea}</div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {s.dangerSymbols.map((sym, i) => (
                        <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-950/60 text-rose-300 border border-rose-800/40 rounded-md">
                          {sym}
                        </span>
                      ))}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Right Sheet Details */}
            <div className="md:col-span-2 space-y-4">
              {selectedSheet ? (
                <div className="space-y-4 bg-[#131722] p-6 rounded-3xl border border-slate-800 text-white">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                        Sikkerhetsdatablad (SDS)
                      </span>
                      <span className="text-xs text-slate-400">Produsent: {selectedSheet.manufacturer}</span>
                    </div>
                    <h3 className="text-xl font-black text-white mt-1">{selectedSheet.productName}</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Bruksområde: {selectedSheet.usageArea}</p>
                  </div>

                  {/* Faresymboler & H-setninger */}
                  <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-amber-400" />
                      GHS Faresymboler & H-setninger
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedSheet.dangerSymbols.map((sym, i) => (
                        <span key={i} className="text-xs font-bold px-2 py-1 bg-rose-950/60 text-rose-300 border border-rose-800/40 rounded-lg">
                          ⚠️ {sym}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-1 pt-1">
                      {selectedSheet.hazardStatements.map((h, i) => (
                        <div key={i} className="text-xs text-slate-300 font-medium">
                          • {h}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PPE / Verneutstyr */}
                  <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck size={15} className="text-emerald-400" />
                      Påbudt personlig verneutstyr (PPE)
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedSheet.ppe.map((p, i) => (
                        <span key={i} className="text-xs font-bold px-2.5 py-1 bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 rounded-lg">
                          🛡️ {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Førstehjelp ved uhell */}
                  <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-white">Førstehjelpstiltak ved uhell</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <strong className="text-slate-300">Øyekontakt:</strong>
                        <p className="text-slate-400 mt-0.5">{selectedSheet.firstAid.eyes || 'Skyll med rikelig vann'}</p>
                      </div>
                      <div>
                        <strong className="text-slate-300">Hudkontakt:</strong>
                        <p className="text-slate-400 mt-0.5">{selectedSheet.firstAid.skin || 'Vask med mild såpe og vann'}</p>
                      </div>
                      <div>
                        <strong className="text-slate-300">Innånding:</strong>
                        <p className="text-slate-400 mt-0.5">{selectedSheet.firstAid.inhalation || 'Frisk luft, oppsøk lege ved ubehag'}</p>
                      </div>
                      <div>
                        <strong className="text-slate-300">Svelging:</strong>
                        <p className="text-slate-400 mt-0.5">{selectedSheet.firstAid.ingestion || 'Skyll munnen, fremkall IKKE brekninger'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Lagring */}
                  {selectedSheet.storageInstructions && (
                    <div className="text-xs text-slate-400 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <strong className="text-slate-300">Lagring og håndtering:</strong> {selectedSheet.storageInstructions}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-sm">
                  Velg et kjemikalie fra listen for å se sikkerhetsdatablad.
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Dokumentert og ajourført iht. Arbeidstilsynets forskrifter for bygge- og anleggsplasser.
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Lukk
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
