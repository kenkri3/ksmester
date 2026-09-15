import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, HardHat, Loader2, Sparkles, Users, Clock, Package, TrendingUp, Mic, MicOff, Brain, Wand2, Check, Navigation, Building2 } from 'lucide-react';
import { db, collection, setDoc, doc, OperationType, handleFirestoreError, Timestamp, auth } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { generateAiContent } from '../services/aiClient';
import { resourceService, ResourceEstimation } from '../services/resourceService';
import { locationService, AddressInfo } from '../services/locationService';
import { companyService, CompanyInfo } from '../services/companyService';
import { cn } from '@/src/lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import { toast } from 'sonner';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimation, setEstimation] = useState<ResourceEstimation | null>(null);

  // MesterAI prompt state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isListeningMic, setIsListeningMic] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    projectCode: `P${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    description: '',
    location: '',
    gnr: '',
    bnr: '',
    clientName: '',
    clientEmail: '',
    projectManager: user?.displayName || 'Byggmester / Prosjektleder',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    tags: '',
    status: 'active' as 'active' | 'completed' | 'on-hold',
    stage: 'active' as 'offer' | 'contract' | 'active' | 'handover' | 'archived',
  });

  const [addressSearch, setAddressSearch] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressInfo[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const debouncedAddressSearch = useDebounce(addressSearch, 400);

  // Brønnøysundregistrene company lookup
  const [companySuggestions, setCompanySuggestions] = useState<CompanyInfo[]>([]);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const debouncedClientSearch = useDebounce(formData.clientName, 400);

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
        console.error('Address search error:', error);
      } finally {
        setIsSearchingAddress(false);
      }
    };

    fetchAddresses();
  }, [debouncedAddressSearch]);

  useEffect(() => {
    const fetchCompanies = async () => {
      const q = debouncedClientSearch.trim();
      if (q.length < 2 || q.includes('(Org:')) {
        setCompanySuggestions([]);
        setIsSearchingCompany(false);
        return;
      }
      setIsSearchingCompany(true);
      try {
        const results = await companyService.searchCompany(q);
        setCompanySuggestions(results);
      } catch (error) {
        console.error('Company search error:', error);
      } finally {
        setIsSearchingCompany(false);
      }
    };

    fetchCompanies();
  }, [debouncedClientSearch]);

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

  const selectCompany = (company: CompanyInfo) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        clientName: `${company.name} (Org: ${company.orgnr})`
      };
      if (!prev.location && company.address) {
        const compLoc = `${company.address}, ${company.postcode} ${company.city}`.trim();
        updated.location = compLoc;
        setAddressSearch(compLoc);
      }
      return updated;
    });
    setCompanySuggestions([]);
    if (company.isBankrupt) {
      toast.error(`OBS: ${company.name} er registrert som KONKURS i Brønnøysundregistrene!`);
    } else if (company.isUnderLiquidation) {
      toast.warning(`OBS: ${company.name} er under avvikling.`);
    } else {
      toast.success(`Hentet ${company.name} fra Brønnøysundregistrene`);
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
          toast.error('Kunne ikke hente adresse fra GPS-posisjon.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        toast.error('Kunne ikke hente posisjon. Sjekk tillatelser for stedstjenester.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // 1-Click quick templates
  const applyQuickTemplate = (templateName: string) => {
    if (templateName === 'enebolig') {
      setAiPrompt('Oppføring av ny enebolig i trekonstruksjon, 180 kvm over to plan. Totalentreprise iht. TEK17.');
      setFormData(prev => ({
        ...prev,
        name: 'Ny Enebolig Bjørklund',
        description: 'Oppføring av moderne enebolig i bindingsverk over 2 plan iht. TEK17. Inkluderer grunnarbeid, tømrer, elektro, VVS og våtrom.',
        tags: 'nybygg, enebolig, tek17, trekonstruksjon',
        stage: 'active'
      }));
    } else if (templateName === 'bad') {
      setAiPrompt('Totalrenovering av hovedbad 10 kvm. Ny membran, sluk, fliser og rør-i-rør iht. Våtromsnormen BVN.');
      setFormData(prev => ({
        ...prev,
        name: 'Totalrehabilitering Bad',
        description: 'Full renovering av bad iht. Byggebransjens Våtromsnorm (BVN). Riving til stender, ny klemring på sluk, smøremembran og flislegging.',
        tags: 'bad, våtrom, bvn, tek17, rør-i-rør',
        stage: 'active'
      }));
    } else if (templateName === 'tilbygg') {
      setAiPrompt('Tilbygg på 45 kvm med integrert garasje og etterisolering av fasade.');
      setFormData(prev => ({
        ...prev,
        name: 'Tilbygg & Fasaderehabilitering',
        description: 'Oppføring av tilbygg på 45 kvm med ny garasje samt etterisolering av eksisterende fasade og nye 3-lags vinduer.',
        tags: 'tilbygg, fasade, etterisolering, garasje',
        stage: 'active'
      }));
    } else if (templateName === 'naering') {
      setAiPrompt('Innvendig ombygging av kontorlokaler 250 kvm. Systemvegger, lydkrav og elektrooppgradering iht. NS 8406.');
      setFormData(prev => ({
        ...prev,
        name: 'Rehab Kontorlokaler',
        description: 'Ombygging av næringslokaler med nye systemvegger, lyddemping Rw 48dB og tilpasning av ventilasjon og el-skjultanlegg.',
        tags: 'næring, kontor, ns8406, systemvegg',
        stage: 'active'
      }));
    }
    toast.success('Mal lagt inn! Du kan justere feltene nedenfor.');
  };

  // Magic AI Parse from Prompt
  const handleMagicAiFill = async () => {
    if (!aiPrompt.trim()) {
      toast.info('Skriv eller dikter inn en setning om prosjektet først.');
      return;
    }
    setIsAiGenerating(true);
    try {
      const response = await generateAiContent({
        prompt: `Du er MesterAI i VikingMester. Brukeren ønsker å opprette et byggeprosjekt og skriver:
"${aiPrompt}"

Tolk dette og returner KUN gyldig JSON i følgende format (uten markdown-formatering):
{
  "name": "Kort og profesjonelt prosjektnavn",
  "description": "Fyldig og profesjonell beskrivelse med faglige krav iht. TEK17 / NS standarder",
  "location": "Adresse eller sted dersom nevnt, ellers la stå tom",
  "clientName": "Kundenavn dersom nevnt, ellers la stå tom",
  "tags": "kommaseparerte nøkkelord f.eks: tømrer, våtrom, rehab"
}`
      });

      if (response.text) {
        try {
          const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          setFormData(prev => ({
            ...prev,
            name: parsed.name || prev.name,
            description: parsed.description || prev.description,
            location: parsed.location || prev.location,
            clientName: parsed.clientName || prev.clientName,
            tags: parsed.tags || prev.tags
          }));
          if (parsed.location) {
            setAddressSearch(parsed.location);
          }
          toast.success('MesterAI har analysert og fylt ut prosjektet!');
        } catch (parseErr) {
          // Fallback if not pure JSON
          setFormData(prev => ({
            ...prev,
            description: response.text || prev.description
          }));
          toast.success('Prosjektbeskrivelse generert med MesterAI!');
        }
      }
    } catch (error: any) {
      console.error('Magic AI error:', error);
      toast.error('Kunne ikke nå MesterAI: ' + error.message);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Voice recording
  const toggleMic = () => {
    if (isListeningMic) {
      setIsListeningMic(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.info('Tale-til-tekst er aktivert via tastatur. Dikter direkte i feltet.');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'nb-NO';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningMic(true);
        toast.info('Lytter... Snakk nå.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAiPrompt(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListeningMic(false);
        toast.success('Tale oppfattet!');
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  const generateEstimation = async () => {
    if (!formData.name || !formData.description) return;
    setIsEstimating(true);
    try {
      const data = await resourceService.estimateResources({
        id: 'temp',
        name: formData.name,
        description: formData.description,
        location: formData.location,
        tags: formData.tags.split(',').map(t => t.trim()),
        progress: 0,
        status: 'active',
        stage: 'active',
        documentationLevel: 0,
        lastUpdate: new Date().toISOString()
      });
      setEstimation(data);
    } catch (error) {
      console.error('Estimation error:', error);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Prosjektet må ha et navn.');
      return;
    }
    setLoading(true);
    const projectId = `proj-${Date.now().toString(36)}`;
    const path = `projects/${projectId}`;

    try {
      const userCompany = (user as any)?.company || 'Byggmester AS';
      await setDoc(doc(db, 'projects', projectId), {
        id: projectId,
        name: formData.name,
        projectCode: formData.projectCode,
        description: formData.description,
        location: formData.location,
        gnr: formData.gnr,
        bnr: formData.bnr,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        projectManager: formData.projectManager,
        managerId: auth.currentUser?.uid || 'admin',
        company: userCompany,
        startDate: formData.startDate,
        endDate: formData.endDate,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        status: formData.status,
        stage: formData.stage,
        progress: 10,
        documentationLevel: 25,
        lastUpdate: new Date().toLocaleDateString('no-NO'),
        imageUrl: ''
      });

      // Logg autonom agent-aktivitet slik at Mesterhjerne fanger opp prosjektet med en gang
      try {
        await setDoc(doc(db, 'agent_activities', `act-${Date.now()}`), {
          type: 'project_created',
          title: `Nytt prosjekt overvåkes: ${formData.name}`,
          description: `Prosjektkode ${formData.projectCode || ''} opprettet på ${formData.location || 'Norge'}. Autonom MesterAI aktivert for TEK17, Yr-værsynk og elektronisk byggedagbok.`,
          projectId,
          projectName: formData.name,
          createdAt: new Date().toISOString(),
          status: 'verified',
          badge: 'MesterAI Aktiv'
        });
      } catch (actErr) {
        console.warn('Agent activity notice:', actErr);
      }

      toast.success('Prosjekt opprettet!', {
        description: 'MesterAI overvåker nå fremdrift og sjekklister automatisk.'
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="create-project-backdrop" className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[calc(100vh-3rem)] pb-[env(safe-area-inset-bottom,0px)]"
          >
            {/* Mobile Grab Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1" />

            {/* 1. FAST HEADER I VIKINGMESTER-STIL */}
            <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-electric-500 to-electric-600 text-white flex items-center justify-center font-bold shadow-md shadow-electric-500/20">
                  <Brain size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-xl font-black text-navy-900 tracking-tight leading-tight">
                      Opprett prosjekt med MesterAI
                    </h2>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-electric-50 text-electric-600 border border-electric-200">
                      Autonom agent
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    TEK17-regler, byggedagbok og værsynk aktiveres automatisk
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={onClose} 
                aria-label="Lukk" 
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* 2. RULLBAR SKJEMA-KROPP (Med god luft i bunnen så ingenting kuttes) */}
            <form id="create-project-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 space-y-6 pb-12">
              
              {/* AUTONOM AGENT-PROMPT BOKS */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-electric-50/70 via-slate-50 to-white border border-electric-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-electric-700 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-electric-500" />
                    Fortell MesterAI hva du skal bygge (eller dikter)
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">1-klikk utfylling</span>
                </div>

                <div className="relative">
                  <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="f.eks: Totalrenovering av bad og rør-i-rør i Storgata 14 for Per Hansen. Start 1. oktober..."
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 pr-24 text-xs sm:text-sm font-medium text-navy-900 focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none resize-none transition-all placeholder:text-slate-400"
                  />
                  <div className="absolute right-2 bottom-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        isListeningMic 
                          ? "bg-rose-500 text-white animate-pulse" 
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      )}
                      title="Dikter med stemme"
                    >
                      {isListeningMic ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={handleMagicAiFill}
                      disabled={isAiGenerating || !aiPrompt.trim()}
                      className="px-3 py-1.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-lg text-xs font-black hover:opacity-95 transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      {isAiGenerating ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                      <span>Fyll ut</span>
                    </button>
                  </div>
                </div>

                {/* 1-Klikks hurtigmaler */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Maler:</span>
                  <button
                    type="button"
                    onClick={() => applyQuickTemplate('enebolig')}
                    className="px-2.5 py-1 bg-white hover:bg-electric-50 hover:text-electric-700 hover:border-electric-200 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition-all cursor-pointer shadow-xs"
                  >
                    🏠 Enebolig Nybygg
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickTemplate('bad')}
                    className="px-2.5 py-1 bg-white hover:bg-electric-50 hover:text-electric-700 hover:border-electric-200 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition-all cursor-pointer shadow-xs"
                  >
                    🚿 Bad & Våtrom (BVN)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickTemplate('tilbygg')}
                    className="px-2.5 py-1 bg-white hover:bg-electric-50 hover:text-electric-700 hover:border-electric-200 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition-all cursor-pointer shadow-xs"
                  >
                    🔨 Tilbygg & Fasade
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickTemplate('naering')}
                    className="px-2.5 py-1 bg-white hover:bg-electric-50 hover:text-electric-700 hover:border-electric-200 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition-all cursor-pointer shadow-xs"
                  >
                    ⚡ Næring / Kontor
                  </button>
                </div>
              </div>

              {/* DETALJERTE PROSJEKTFELTER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                
                {/* Prosjektnavn */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Prosjektnavn *
                  </label>
                  <div className="relative">
                    <HardHat className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all"
                      placeholder="f.eks. Enebolig Bjørklund"
                    />
                  </div>
                </div>

                {/* Prosjektkode */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Prosjektkode
                  </label>
                  <input 
                    type="text"
                    value={formData.projectCode}
                    onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all"
                    placeholder="P2026-001"
                  />
                </div>

                {/* Prosjektfase */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Prosjektfase
                  </label>
                  <select 
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="active">Gjennomføring (Aktiv)</option>
                    <option value="offer">Tilbud / Befaring</option>
                    <option value="contract">Kontrakt inngått</option>
                    <option value="handover">Overlevering / Sluttbefaring</option>
                    <option value="archived">Arkivert</option>
                  </select>
                </div>

                {/* Beskrivelse */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Beskrivelse & Omfang
                  </label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all min-h-[85px] resize-none"
                    placeholder="Kort beskrivelse av arbeidet som skal utføres..."
                  />
                </div>

                {/* Lokasjon / Adresse */}
                <div className="md:col-span-2 relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Lokasjon / Adresse (Kartverket & Geonorge)
                    </label>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className="text-[11px] font-bold text-electric-600 hover:text-electric-700 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Hent nåværende GPS-posisjon og finn adresse med GNR/BNR"
                    >
                      {isLocating ? <Loader2 size={12} className="animate-spin text-electric-600" /> : <Navigation size={12} />}
                      <span>{isLocating ? 'Henter GPS...' : 'Bruk min posisjon'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      value={addressSearch !== '' ? addressSearch : formData.location}
                      onChange={(e) => setAddressSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all"
                      placeholder="Søk gateadresse for å hente GNR/BNR automatisk..."
                    />
                    {isSearchingAddress && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-electric-500" size={16} />
                      </div>
                    )}
                  </div>

                  {addressSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto custom-scrollbar">
                      {addressSuggestions.map((addr, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectAddress(addr)}
                          className="w-full text-left p-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 cursor-pointer"
                        >
                          <div className="text-xs sm:text-sm font-bold text-navy-900">{addr.address}</div>
                          <div className="text-[10px] text-slate-500">
                            {addr.postcode} {addr.city} {addr.gnr && `(GNR: ${addr.gnr}, BNR: ${addr.bnr})`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* GNR & BNR */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    GNR (Gårdsnummer)
                  </label>
                  <input 
                    type="text"
                    value={formData.gnr}
                    onChange={(e) => setFormData({ ...formData, gnr: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all"
                    placeholder="Gårdsnummer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    BNR (Bruksnummer)
                  </label>
                  <input 
                    type="text"
                    value={formData.bnr}
                    onChange={(e) => setFormData({ ...formData, bnr: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all"
                    placeholder="Bruksnummer"
                  />
                </div>

                {/* Kunde & E-post */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Kunde (Byggherre / Bedrift)
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Building2 size={11} className="text-slate-400" />
                      Brønnøysund-oppslag
                    </span>
                  </div>
                  <div className="relative">
                    <input 
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all"
                      placeholder="Kundenavn eller søk firma / org.nr..."
                    />
                    {isSearchingCompany && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-electric-500" size={16} />
                      </div>
                    )}

                    {companySuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto custom-scrollbar">
                        {companySuggestions.map((c) => (
                          <button
                            key={c.orgnr}
                            type="button"
                            onClick={() => selectCompany(c)}
                            className="w-full text-left p-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs sm:text-sm font-bold text-navy-900">{c.name}</div>
                              {c.isBankrupt ? (
                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">KONKURS</span>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-400">{c.orgType}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Org.nr: {c.orgnr} {c.city && `• ${c.city}`} {c.isMvaRegistered && '• MVA'}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Kunde E-post (for portal & varsling)
                  </label>
                  <input 
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all"
                    placeholder="kunde@eksempel.no"
                  />
                </div>

                {/* Startdato & Sluttdato */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Startdato
                  </label>
                  <input 
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Estimert ferdigstillelse
                  </label>
                  <input 
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all"
                  />
                </div>

                {/* Tagger */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Faggrupper & Nøkkelord (kommaseparert)
                  </label>
                  <input 
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-navy-900 focus:bg-white focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 outline-none transition-all"
                    placeholder="f.eks. tømrer, våtrom, elektro, rørlegger, tek17"
                  />
                </div>
              </div>

            </form>

            {/* 3. FAST BUNN-FOOTER (Ligger rent og pent under rullefeltet) */}
            <div className="px-5 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 hidden sm:inline-flex items-center gap-1.5">
                <Brain size={14} className="text-electric-500" />
                Yr.no værsynk og TEK17-kontroll aktiveres ved opprettelse
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Avbryt
                </button>
                <button 
                  form="create-project-form"
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 hover:opacity-95 text-white rounded-xl font-black text-xs sm:text-sm transition-all shadow-purple-cta flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Oppretter prosjekt...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Opprett prosjekt</span>
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

