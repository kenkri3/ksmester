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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full p-6 sm:p-8 max-h-[90vh] flex flex-col border border-neutral-200"
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <FlaskConical size={20} />
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                  Forskrift om utførelse av arbeid kap. 2 | Arbeidstilsynet
                </span>
              </div>
              <h2 className="text-2xl font-black text-neutral-900">Digitalt Stoffkartotek</h2>
              <p className="text-xs text-neutral-500">
                Prosjekt: {project.name} | Sikkerhetsdatablader, verneutstyr og førstehjelp på byggeplassen
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => pdfService.generateStoffkartotekPDF(project, sheets)}
                disabled={sheets.length === 0}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Download size={13} /> Last ned stoffkartotek (PDF)
              </button>
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Emergency Hotline Alert */}
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl">
                <PhoneCall size={20} />
              </div>
              <div>
                <div className="text-xs font-black text-rose-900 uppercase tracking-wider">
                  Giftinformasjonen Døgnåpen Vakttelefon
                </div>
                <div className="text-lg font-black text-rose-700">22 59 13 00</div>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-[11px] font-bold text-rose-900">Medisinsk nødnummer: 113</div>
              <div className="text-[10px] text-rose-600">Ved alvorlig kjemikalieuhell eller etsing</div>
            </div>
          </div>

          {/* Search bar */}
          <div className="my-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Søk i kjemikalier, produsenter eller bruksområde (f.eks. Tec7, Casco, lim, maling)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Master Detail Split */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-1">
            {/* Left list */}
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                Kjemikalier på byggeplass ({filteredSheets.length})
              </div>
              {loading ? (
                <div className="text-xs text-neutral-400 p-4">Laster stoffkartotek...</div>
              ) : filteredSheets.length === 0 ? (
                <div className="text-xs text-neutral-400 p-4 bg-neutral-50 rounded-xl text-center">
                  Ingen kjemikalier funnet.
                </div>
              ) : (
                filteredSheets.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSheet(s)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      selectedSheet?.id === s.id
                        ? 'bg-amber-50 border-amber-300 shadow-sm'
                        : 'bg-neutral-50 border-neutral-100 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="font-bold text-xs text-neutral-900">{s.productName}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{s.usageArea}</div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {s.dangerSymbols.map((sym, i) => (
                        <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md">
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
                <div className="space-y-4 bg-neutral-50/60 p-6 rounded-3xl border border-neutral-200">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-md">
                        Sikkerhetsdatablad (SDS)
                      </span>
                      <span className="text-xs text-neutral-400">Produsent: {selectedSheet.manufacturer}</span>
                    </div>
                    <h3 className="text-xl font-black text-neutral-900 mt-1">{selectedSheet.productName}</h3>
                    <p className="text-xs text-neutral-600 mt-0.5">Bruksområde: {selectedSheet.usageArea}</p>
                  </div>

                  {/* Faresymboler & H-setninger */}
                  <div className="p-4 bg-white rounded-2xl border border-neutral-200 space-y-2">
                    <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-amber-500" />
                      GHS Faresymboler & H-setninger
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedSheet.dangerSymbols.map((sym, i) => (
                        <span key={i} className="text-xs font-bold px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                          ⚠️ {sym}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-1 pt-1">
                      {selectedSheet.hazardStatements.map((h, i) => (
                        <div key={i} className="text-xs text-neutral-600 font-medium">
                          • {h}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PPE / Verneutstyr */}
                  <div className="p-4 bg-white rounded-2xl border border-neutral-200 space-y-2">
                    <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <ShieldCheck size={15} className="text-emerald-600" />
                      Påbudt personlig verneutstyr (PPE)
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedSheet.ppe.map((p, i) => (
                        <span key={i} className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                          🛡️ {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Førstehjelp ved uhell */}
                  <div className="p-4 bg-white rounded-2xl border border-neutral-200 space-y-3">
                    <div className="text-xs font-bold text-neutral-900">Førstehjelpstiltak ved uhell</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <strong className="text-neutral-700">Øyekontakt:</strong>
                        <p className="text-neutral-500 mt-0.5">{selectedSheet.firstAid.eyes || 'Skyll med rikelig vann'}</p>
                      </div>
                      <div>
                        <strong className="text-neutral-700">Hudkontakt:</strong>
                        <p className="text-neutral-500 mt-0.5">{selectedSheet.firstAid.skin || 'Vask med mild såpe og vann'}</p>
                      </div>
                      <div>
                        <strong className="text-neutral-700">Innånding:</strong>
                        <p className="text-neutral-500 mt-0.5">{selectedSheet.firstAid.inhalation || 'Frisk luft, oppsøk lege ved ubehag'}</p>
                      </div>
                      <div>
                        <strong className="text-neutral-700">Svelging:</strong>
                        <p className="text-neutral-500 mt-0.5">{selectedSheet.firstAid.ingestion || 'Skyll munnen, fremkall IKKE brekninger'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Lagring */}
                  {selectedSheet.storageInstructions && (
                    <div className="text-xs text-neutral-500 p-3 bg-white rounded-xl border border-neutral-200">
                      <strong>Lagring og håndtering:</strong> {selectedSheet.storageInstructions}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-neutral-400 text-sm">
                  Velg et kjemikalie fra listen for å se sikkerhetsdatablad.
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-neutral-100 flex justify-between items-center">
            <span className="text-xs text-neutral-400">
              Dokumentert og ajourført iht. Arbeidstilsynets forskrifter for bygge- og anleggsplasser.
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all"
            >
              Lukk
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
