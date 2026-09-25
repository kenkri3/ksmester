import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Send, Camera, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { db, collection, addDoc, serverTimestamp, OperationType, handleFirestoreError, auth } from '../services/firebase';
import { masterAiService } from '../services/masterAiService';
import AiTextAssistant from './AiTextAssistant';
import { locationService, AddressInfo } from '../services/locationService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { cn } from '@/src/lib/utils';
import { generateAiContent } from '../services/aiClient';
import { useDebounce } from '../hooks/useDebounce';
import { api } from '../services/api';

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
  const debouncedAddressSearch = useDebounce(addressSearch, 500);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
        toast.success('Bilde lagt til avviket.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolokasjon støttes ikke av nettleseren.');
      return;
    }
    setIsLocating(true);
    toast.info('Henter din GPS-posisjon...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const addr = await locationService.getAddressFromCoords(pos.coords.latitude, pos.coords.longitude);
          if (addr) {
            selectAddress(addr);
            toast.success(`Posisjon funnet: ${addr.fullAddress}`);
          } else {
            const locStr = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
            setFormData(prev => ({ ...prev, location: locStr }));
            setAddressSearch(locStr);
            toast.success('GPS-koordinater registrert.');
          }
        } catch (e) {
          toast.error('Kunne ikke slå opp adresse for GPS-posisjon.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        toast.error('Kunne ikke hente posisjon. Sjekk at posisjonstillatelse er aktivert.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    const fetchAddresses = async () => {
      if (debouncedAddressSearch.length < 3) {
        setAddressSuggestions([]);
        setIsSearchingAddress(false);
        return;
      }
      setIsSearchingAddress(true);
      try {
        const results = await locationService.searchAddress(debouncedAddressSearch);
        setAddressSuggestions(results);
      } catch (error) {
        console.error("Address search error:", error);
      } finally {
        setIsSearchingAddress(false);
      }
    };

    fetchAddresses();
  }, [debouncedAddressSearch]);

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
    const currentUserId = user?.id || user?.uid || auth.currentUser?.uid || 'bruker';
    const currentUserName = user?.displayName || auth.currentUser?.displayName || 'Byggeplassmedarbeider';
    const userCompany = (user as any)?.company || (user as any)?.companyId || 'VikingMester';
    const companyId = (user as any)?.companyId || (user as any)?.company || 'vikingmester';

    setLoading(true);

    try {
      const selectedProject = projects.find(p => p.id === formData.projectId);
      const devItem = {
        title: formData.title,
        projectId: formData.projectId,
        project: selectedProject?.name || 'Ukjent',
        description: formData.description,
        severity: formData.severity,
        location: formData.location,
        gnr: formData.gnr,
        bnr: formData.bnr,
        status: 'open',
        authorId: currentUserId,
        reportedBy: currentUserName,
        company: userCompany,
        companyId: companyId,
        photoUrl: photoUrl || null,
        imageUrl: photoUrl || null,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await api.saveDoc('deviations', devItem);

      try {
        if (auth.currentUser) {
          await addDoc(collection(db, 'deviations'), {
            ...devItem,
            timestamp: serverTimestamp()
          });
        }
      } catch (fErr) {
        console.warn('Valgfri Firestore synkronisering hoppet over:', fErr);
      }

      toast.success('Avviksrapport er opprettet og lagret!');
      onClose();
      setFormData({ title: '', projectId: '', description: '', severity: 'medium', location: '', gnr: '', bnr: '' });
      setPhotoUrl(null);
    } catch (error) {
      console.error('Feil ved opprettelse av avvik:', error);
      toast.error('Kunne ikke opprette avvik. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="create-deviation-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            className="bg-[#0B0F17] text-white border border-slate-800 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[calc(100vh-2rem)] pb-[env(safe-area-inset-bottom,0px)]"
          >
            {/* Mobile Grab Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

            <div className="p-4 sm:p-8 border-b border-slate-800 flex justify-between items-center bg-[#131722] shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
                  <AlertTriangle size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-bold text-white">{t('log_deviation', 'Loggfør Avvik / RUH')}</h2>
                  <p className="text-[11px] sm:text-xs text-amber-400 font-medium uppercase tracking-wider">HMS & Kvalitetssikring</p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Lukk" title="Lukk" className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                <X size={20} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <form id="create-deviation-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 space-y-4 sm:space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tittel på avvik</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 outline-none transition-all text-sm sm:text-base font-medium text-white placeholder:text-slate-600"
                    placeholder="F.eks. Manglende rekkverk i 2. etasje"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Prosjekt</label>
                  <select
                    required
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 outline-none transition-all appearance-none text-sm sm:text-base font-medium text-white"
                  >
                    <option value="" className="bg-slate-950 text-slate-400">Velg prosjekt...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(['low', 'medium', 'high'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setFormData({ ...formData, severity: sev })}
                      className={cn(
                        "py-2.5 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer",
                        formData.severity === sev 
                          ? (sev === 'high' ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/50" : 
                             sev === 'medium' ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-950/50" : 
                             "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-950/50")
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                      )}
                    >
                      {t(sev)}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Beskrivelse</label>
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
                        className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isAiAnalyzing ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                        Analyser med AI
                      </button>
                    </div>
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 outline-none transition-all resize-none text-sm sm:text-base font-medium text-white placeholder:text-slate-600"
                    placeholder="Beskriv hva som har skjedd og eventuelle umiddelbare tiltak..."
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Lokasjon / Adresse</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                      type="text"
                      value={addressSearch !== '' ? addressSearch : formData.location}
                      onChange={(e) => setAddressSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl py-2.5 sm:py-3.5 pl-10 sm:pl-12 pr-4 text-sm sm:text-base focus:border-amber-500 outline-none transition-all font-medium text-white placeholder:text-slate-600"
                      placeholder="Søk adresse for GNR/BNR..."
                    />
                    {isSearchingAddress && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-slate-400" size={14} />
                      </div>
                    )}
                  </div>

                  {addressSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-[#131722] border border-slate-800 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar divide-y divide-slate-800">
                      {addressSuggestions.map((addr, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectAddress(addr)}
                          className="w-full text-left p-3 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <div className="text-xs sm:text-sm font-bold text-white">{addr.address}</div>
                          <div className="text-[10px] sm:text-xs text-slate-400">
                            {addr.postcode} {addr.city} {addr.gnr && `(GNR: ${addr.gnr}, BNR: ${addr.bnr})`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">GNR</label>
                    <input 
                      type="text"
                      value={formData.gnr}
                      onChange={(e) => setFormData({ ...formData, gnr: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 px-3.5 text-sm sm:text-base focus:border-amber-500 outline-none transition-all font-medium text-white placeholder:text-slate-600 font-mono"
                      placeholder="Gårdsnummer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">BNR</label>
                    <input 
                      type="text"
                      value={formData.bnr}
                      onChange={(e) => setFormData({ ...formData, bnr: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 px-3.5 text-sm sm:text-base focus:border-amber-500 outline-none transition-all font-medium text-white placeholder:text-slate-600 font-mono"
                      placeholder="Bruksnummer"
                    />
                  </div>
                </div>

                {/* Hidden camera / file input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoChange} 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                />

                {photoUrl && (
                  <div className="relative inline-block my-2 rounded-xl overflow-hidden border border-slate-800">
                    <img src={photoUrl} alt="Avviksbilde" className="h-32 w-full max-w-xs object-cover rounded-xl" />
                    <button 
                      type="button" 
                      onClick={() => setPhotoUrl(null)} 
                      className="absolute top-1.5 right-1.5 p-1.5 bg-black/80 text-white rounded-full hover:bg-black transition-colors"
                      title="Fjern bilde"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="flex gap-2 sm:gap-4">
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
                  >
                    <Camera size={16} className="text-amber-400" />
                    {photoUrl ? 'Endre bilde' : 'Legg til bilde'}
                  </button>
                  <button 
                    type="button" 
                    disabled={isLocating}
                    onClick={handleGetLocation}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {isLocating ? <Loader2 size={16} className="animate-spin text-amber-400" /> : <MapPin size={16} className="text-amber-400" />}
                    {isLocating ? 'Henter GPS...' : 'Posisjon'}
                  </button>
                </div>
              </div>

            </form>

            {/* FAST FOOTER */}
            <div className="px-5 sm:px-8 py-3.5 sm:py-4 bg-[#0B0F17] border-t border-slate-800 shrink-0 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Avviket loggføres og analyseres automatisk av MesterAI
              </span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  form="create-deviation-form"
                  disabled={loading}
                  type="submit"
                  className="px-5 sm:px-7 py-2.5 sm:py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-950/50 disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={15} />
                      Send inn rapport
                    </>
                  )}
                </button>
              </div>
            </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
