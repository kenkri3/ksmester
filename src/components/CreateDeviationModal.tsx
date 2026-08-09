import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Send, Camera, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { db, collection, addDoc, serverTimestamp, OperationType, handleFirestoreError, auth } from '../services/firebase';
import { masterAiService } from '../services/masterAiService';
import AiTextAssistant from './AiTextAssistant';
import { locationService, AddressInfo } from '../services/locationService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { cn } from '@/src/lib/utils';
import { generateAiContent } from '../services/aiClient';

interface CreateDeviationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: { id: string; name: string }[];
}

export default function CreateDeviationModal({ isOpen, onClose, projects }: CreateDeviationModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    projectId: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high',
    location: '',
    gnr: '',
    bnr: '',
  });

  const [addressSearch, setAddressSearch] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressInfo[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  const handleAddressSearch = async (query: string) => {
    setAddressSearch(query);
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    setIsSearchingAddress(true);
    try {
      const results = await locationService.searchAddress(query);
      setAddressSuggestions(results);
    } catch (error) {
      console.error("Address search error:", error);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const selectAddress = (addr: AddressInfo) => {
    setFormData(prev => ({
      ...prev,
      location: addr.fullAddress,
      gnr: addr.gnr || '',
      bnr: addr.bnr || ''
    }));
    setAddressSearch(addr.fullAddress);
    setAddressSuggestions([]);
  };

  const analyzeDeviationWithAi = async () => {
    if (!formData.description) return;
    setIsAiAnalyzing(true);
    try {
      const response = await generateAiContent({
        prompt: `Analyser dette avviket fra en byggeplass: "${formData.description}". 
        Vurder alvorlighetsgrad (low, medium, high) og gi en mer profesjonell beskrivelse og tittel.
        Svar i JSON-format.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            description: { type: "STRING" },
            severity: { type: "STRING", enum: ["low", "medium", "high"] }
          },
          required: ["title", "description", "severity"]
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      if (result.title) {
        setFormData(prev => ({
          ...prev,
          title: result.title,
          description: result.description,
          severity: result.severity as any
        }));
      }
    } catch (error) {
      console.error("AI Analysis error:", error);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      const selectedProject = projects.find(p => p.id === formData.projectId);
      const userCompany = (user as any)?.company || '';
      await addDoc(collection(db, 'deviations'), {
        title: formData.title,
        projectId: formData.projectId,
        project: selectedProject?.name || 'Ukjent',
        description: formData.description,
        severity: formData.severity,
        location: formData.location,
        gnr: formData.gnr,
        bnr: formData.bnr,
        status: 'open',
        authorId: auth.currentUser.uid,
        reportedBy: auth.currentUser.displayName || 'System',
        company: userCompany,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });
      onClose();
      setFormData({ title: '', projectId: '', description: '', severity: 'medium', location: '', gnr: '', bnr: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deviations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-lg rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]"
          >
            <div className="p-3 sm:p-8 border-b border-neutral-100 flex justify-between items-center bg-orange-50 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-orange-100 text-orange-600 rounded-lg sm:rounded-xl">
                  <AlertTriangle size={16} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-xl font-bold text-orange-900">{t('log_deviation', 'Loggfør Avvik / RUH')}</h2>
                  <p className="text-[6px] sm:text-[10px] text-orange-700 font-medium uppercase tracking-wider">HMS & Kvalitetssikring</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-orange-100 rounded-full transition-colors text-orange-900">
                <X size={16} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="p-3 sm:p-8 space-y-3 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-[6px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Tittel på avvik</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-[9px] sm:text-sm"
                    placeholder="F.eks. Manglende rekkverk i 2. etasje"
                  />
                </div>

                <div>
                  <label className="block text-[6px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Prosjekt</label>
                  <select
                    required
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none text-[9px] sm:text-sm"
                  >
                    <option value="">Velg prosjekt...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-1 sm:gap-3">
                  {(['low', 'medium', 'high'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setFormData({ ...formData, severity: sev })}
                      className={cn(
                        "py-1 sm:py-3 rounded-lg sm:rounded-xl text-[6px] sm:text-xs font-bold uppercase tracking-widest border transition-all",
                        formData.severity === sev 
                          ? (sev === 'high' ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100" : 
                             sev === 'medium' ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100" : 
                             "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100")
                          : "bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300"
                      )}
                    >
                      {t(sev)}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <label className="block text-[6px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest">Beskrivelse</label>
                    <div className="flex items-center gap-2">
                      <AiTextAssistant 
                        currentText={formData.description} 
                        onApply={(text) => setFormData({...formData, description: text})}
                        placeholder="Beskriv avviket..."
                      />
                      <button 
                        type="button"
                        onClick={analyzeDeviationWithAi}
                        disabled={isAiAnalyzing || !formData.description}
                        className="flex items-center gap-1 text-[6px] sm:text-[10px] font-bold text-orange-600 hover:text-orange-500 transition-colors disabled:opacity-50"
                      >
                        {isAiAnalyzing ? <Loader2 className="animate-spin sm:w-2.5 sm:h-2.5" size={8} /> : <Sparkles className="sm:w-2.5 sm:h-2.5" size={8} />}
                        Analyser med AI
                      </button>
                    </div>
                  </div>
                  <textarea
                    required
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none text-[9px] sm:text-sm"
                    placeholder="Beskriv hva som har skjedd og eventuelle umiddelbare tiltak..."
                  />
                </div>

                <div className="relative">
                  <label className="block text-[6px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Lokasjon / Adresse</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-neutral-400 sm:w-[18px] sm:h-[18px]" size={12} />
                    <input 
                      type="text"
                      value={addressSearch || formData.location}
                      onChange={(e) => handleAddressSearch(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-1.5 sm:py-4 pl-8 sm:pl-12 pr-3 sm:pr-4 text-[9px] sm:text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-bold"
                      placeholder="Søk adresse for GNR/BNR..."
                    />
                    {isSearchingAddress && (
                      <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-neutral-400 sm:w-4 sm:h-4" size={10} />
                      </div>
                    )}
                  </div>

                  {addressSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg sm:rounded-2xl shadow-xl overflow-hidden max-h-32 sm:max-h-60 overflow-y-auto custom-scrollbar">
                      {addressSuggestions.map((addr, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectAddress(addr)}
                          className="w-full text-left p-2 sm:p-4 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0"
                        >
                          <div className="text-[9px] sm:text-sm font-bold">{addr.address}</div>
                          <div className="text-[6px] sm:text-[10px] text-neutral-500">
                            {addr.postcode} {addr.city} {addr.gnr && `(GNR: ${addr.gnr}, BNR: ${addr.bnr})`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-[6px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">GNR</label>
                    <input 
                      type="text"
                      value={formData.gnr}
                      onChange={(e) => setFormData({ ...formData, gnr: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-1.5 sm:py-4 px-3 sm:px-4 text-[9px] sm:text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-rose-500 outline-none transition-all font-bold"
                      placeholder="Gårdsnummer"
                    />
                  </div>
                  <div>
                    <label className="block text-[6px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">BNR</label>
                    <input 
                      type="text"
                      value={formData.bnr}
                      onChange={(e) => setFormData({ ...formData, bnr: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-1.5 sm:py-4 px-3 sm:px-4 text-[9px] sm:text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-rose-500 outline-none transition-all font-bold"
                      placeholder="Bruksnummer"
                    />
                  </div>
                </div>

                <div className="flex gap-2 sm:gap-4">
                  <button type="button" className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-3 bg-neutral-100 text-neutral-600 rounded-lg sm:rounded-xl text-[6px] sm:text-xs font-bold hover:bg-neutral-200 transition-colors">
                    <Camera size={10} className="sm:w-4 sm:h-4" />
                    Legg til bilde
                  </button>
                  <button type="button" className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-3 bg-neutral-100 text-neutral-600 rounded-lg sm:rounded-xl text-[6px] sm:text-xs font-bold hover:bg-neutral-200 transition-colors">
                    <MapPin size={10} className="sm:w-4 sm:h-4" />
                    Posisjon
                  </button>
                </div>
              </div>

              <div className="pt-2 sticky bottom-0 bg-white pb-2 sm:pb-0">
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full py-2 sm:py-4 bg-orange-600 text-white rounded-lg sm:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-500 transition-all shadow-xl shadow-orange-100 disabled:opacity-50 text-[9px] sm:text-base"
                >
                  {loading ? (
                    <div className="w-3 h-3 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={12} className="sm:w-[18px] sm:h-[18px]" />
                      Send inn rapport
                    </>
                  )}
                </button>
              </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
