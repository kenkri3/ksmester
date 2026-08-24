import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, HardHat, Loader2, Sparkles, Users, Clock, Package, TrendingUp } from 'lucide-react';
import { db, collection, setDoc, doc, OperationType, handleFirestoreError, Timestamp, auth } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { generateAiContent } from '../services/aiClient';
import { resourceService, ResourceEstimation } from '../services/resourceService';
import { locationService, AddressInfo } from '../services/locationService';
import { cn } from '@/src/lib/utils';

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
  const [formData, setFormData] = useState({
    name: '',
    projectCode: '',
    description: '',
    location: '',
    gnr: '',
    bnr: '',
    clientName: '',
    clientEmail: '',
    projectManager: '',
    startDate: '',
    endDate: '',
    tags: '',
    status: 'active' as 'active' | 'completed' | 'on-hold',
    stage: 'offer' as 'offer' | 'contract' | 'active' | 'handover' | 'archived',
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

  const generateAiDescription = async () => {
    if (!formData.name) return;
    setIsAiGenerating(true);
    try {
      const response = await generateAiContent({
        prompt: `Som en profesjonell prosjektleder i byggebransjen, skriv en kort og profesjonell prosjektbeskrivelse for et prosjekt med navn: "${formData.name}". 
        Inkluder typiske faser og fokusområder for et slikt prosjekt i Norge. Svar på norsk.`,
      });
      if (response.text) {
        setFormData(prev => ({ ...prev, description: response.text || '' }));
      }
    } catch (error) {
      console.error("AI Generation error:", error);
    } finally {
      setIsAiGenerating(false);
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
        stage: 'offer',
        documentationLevel: 0,
        lastUpdate: new Date().toISOString()
      });
      setEstimation(data);
    } catch (error) {
      console.error("Estimation error:", error);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    const projectId = Math.random().toString(36).substring(2, 15);
    const path = `projects/${projectId}`;

    try {
      const userCompany = (user as any)?.company || '';
      await setDoc(doc(db, 'projects', projectId), {
        name: formData.name,
        projectCode: formData.projectCode,
        description: formData.description,
        location: formData.location,
        gnr: formData.gnr,
        bnr: formData.bnr,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        projectManager: formData.projectManager,
        managerId: auth.currentUser.uid,
        company: userCompany,
        startDate: formData.startDate,
        endDate: formData.endDate,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        status: formData.status,
        stage: formData.stage,
        progress: 0,
        documentationLevel: 0,
        lastUpdate: Timestamp.now(),
        imageUrl: ""
      });
      onClose();
      setFormData({ 
        name: '', 
        projectCode: '',
        description: '', 
        location: '', 
        gnr: '',
        bnr: '',
        clientName: '', 
        clientEmail: '',
        projectManager: '', 
        startDate: '', 
        endDate: '', 
        tags: '', 
        status: 'active',
        stage: 'offer'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]"
          >
            <div className="p-4 sm:p-8 lg:p-10 flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-4 sm:mb-8 sticky top-0 bg-white z-10 pb-2">
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight">{t('new_project_title', 'Opprett nytt prosjekt')}</h2>
                <button onClick={onClose} aria-label="Lukk" className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-full transition-colors">
                  <X size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                      {t('project_name', 'Prosjektnavn')}
                    </label>
                    <div className="relative">
                      <HardHat className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-neutral-400 sm:w-[18px] sm:h-[18px]" size={16} />
                      <input 
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 pl-10 sm:pl-12 pr-3 sm:pr-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder={t('project_name_placeholder', 'f.eks. Enebolig Bjørklund')}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                      Prosjektkode
                    </label>
                    <input 
                      type="text"
                      value={formData.projectCode}
                      onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="f.eks. P2024-001"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-1 sm:mb-2">
                      <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400">
                        {t('description', 'Beskrivelse')}
                      </label>
                      <button 
                        type="button"
                        onClick={generateAiDescription}
                        disabled={isAiGenerating || !formData.name}
                        className="flex items-center gap-1 text-[7px] sm:text-[10px] font-bold text-emerald-600 hover:text-emerald-500 transition-colors disabled:opacity-50"
                      >
                        {isAiGenerating ? <Loader2 className="animate-spin sm:w-3 sm:h-3" size={10} /> : <Sparkles size={10} className="sm:w-3 sm:h-3" />}
                        Generer med AI
                      </button>
                    </div>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all min-h-[80px] sm:min-h-[100px]"
                      placeholder={t('description_placeholder', 'Kort beskrivelse av prosjektet...')}
                    />
                  </div>

                  <div className="md:col-span-2 relative">
                    <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                      {t('location', 'Lokasjon / Adresse')}
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-neutral-400 sm:w-[18px] sm:h-[18px]" size={16} />
                      <input 
                        required
                        type="text"
                        value={addressSearch || formData.location}
                        onChange={(e) => handleAddressSearch(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 pl-10 sm:pl-12 pr-3 sm:pr-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder={t('location_placeholder', 'Søk adresse for å hente GNR/BNR...')}
                      />
                      {isSearchingAddress && (
                        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                          <Loader2 className="animate-spin text-neutral-400 sm:w-4 sm:h-4" size={14} />
                        </div>
                      )}
                    </div>

                    {addressSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg sm:rounded-2xl shadow-xl overflow-hidden max-h-48 sm:max-h-60 overflow-y-auto custom-scrollbar">
                        {addressSuggestions.map((addr, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => selectAddress(addr)}
                            className="w-full text-left p-2.5 sm:p-4 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0"
                          >
                            <div className="text-[10px] sm:text-sm font-bold">{addr.address}</div>
                            <div className="text-[7px] sm:text-[10px] text-neutral-500">
                              {addr.postcode} {addr.city} {addr.gnr && `(GNR: ${addr.gnr}, BNR: ${addr.bnr})`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                        GNR
                      </label>
                      <input 
                        type="text"
                        value={formData.gnr}
                        onChange={(e) => setFormData({ ...formData, gnr: e.target.value })}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="Gårdsnummer"
                      />
                    </div>
                    <div>
                      <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                        BNR
                      </label>
                      <input 
                        type="text"
                        value={formData.bnr}
                        onChange={(e) => setFormData({ ...formData, bnr: e.target.value })}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="Bruksnummer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                      {t('client_name', 'Kunde')}
                    </label>
                    <input 
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder={t('client_placeholder', 'Kundenavn')}
                    />
                  </div>

                  <div>
                    <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                      Kunde-E-post
                    </label>
                    <input 
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="kunde@eksempel.no"
                    />
                  </div>

                  <div>
                    <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                      {t('project_manager', 'Prosjektleder')}
                    </label>
                    <input 
                      type="text"
                      value={formData.projectManager}
                      onChange={(e) => setFormData({ ...formData, projectManager: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder={t('manager_placeholder', 'Navn på leder')}
                    />
                  </div>

                  <div>
                    <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                      {t('status', 'Status')}
                    </label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none"
                    >
                      <option value="active">{t('active', 'Aktiv')}</option>
                      <option value="completed">{t('completed', 'Fullført')}</option>
                      <option value="on-hold">{t('on-hold', 'På vent')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                      Prosjektfase
                    </label>
                    <select 
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none"
                    >
                      <option value="offer">Tilbud</option>
                      <option value="contract">Kontrakt</option>
                      <option value="active">Gjennomføring</option>
                      <option value="handover">Overlevering</option>
                      <option value="archived">Arkiv</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                      {t('start_date', 'Startdato')}
                    </label>
                    <input 
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                      {t('end_date', 'Sluttdato')}
                    </label>
                    <input 
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[7px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1 sm:mb-2">
                      {t('tags', 'Tagger (kommaseparert)')}
                    </label>
                    <input 
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg sm:rounded-2xl py-2.5 sm:py-4 px-3 sm:px-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="f.eks. nybygg, enebolig, oslo"
                    />
                  </div>

                  {/* AI Estimation Section */}
                  <div className="md:col-span-2">
                    <button 
                      type="button"
                      onClick={generateEstimation}
                      disabled={isEstimating || !formData.description}
                      className="w-full py-2.5 sm:py-4 bg-blue-50 text-blue-600 rounded-lg sm:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-all disabled:opacity-50 border border-blue-100 text-[10px] sm:text-sm"
                    >
                      {isEstimating ? <Loader2 className="animate-spin sm:w-4.5 sm:h-4.5" size={14} /> : <TrendingUp size={14} className="sm:w-4.5 sm:h-4.5" />}
                      Smart Ressursestimering (AI)
                    </button>

                    {estimation && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 sm:mt-4 p-3 sm:p-6 bg-neutral-900 text-white rounded-xl sm:rounded-3xl space-y-4 sm:space-y-6"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2">
                            <Sparkles size={12} className="text-emerald-400 sm:w-4 sm:h-4" />
                            AI Estimat
                          </h3>
                          <div className="flex gap-2 sm:gap-4">
                            <div className="text-center">
                              <div className="text-[8px] sm:text-[10px] text-neutral-400 uppercase">Timer</div>
                              <div className="text-[10px] sm:text-sm font-bold">{estimation.estimatedHours}t</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[8px] sm:text-[10px] text-neutral-400 uppercase">Team</div>
                              <div className="text-[10px] sm:text-sm font-bold">{estimation.teamSize} pers</div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5 sm:space-y-2">
                            <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-500">Faggrupper</div>
                            {estimation.roles.map((role, i) => (
                              <div key={i} className="flex items-center justify-between text-[8px] sm:text-xs bg-white/5 p-1.5 sm:p-2 rounded-lg">
                                <span>{role.role}</span>
                                <span className="font-bold text-emerald-400">x{role.count}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1.5 sm:space-y-2">
                            <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-500">Hovedmaterialer</div>
                            {estimation.materials.slice(0, 3).map((mat, i) => (
                              <div key={i} className="text-[8px] sm:text-[10px] bg-white/5 p-1.5 sm:p-2 rounded-lg">
                                <div className="font-bold">{mat.item}</div>
                                <div className="text-neutral-400">{mat.quantity}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white pt-2 pb-2 sm:pb-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 text-white py-2.5 sm:py-4 rounded-lg sm:rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50 text-[10px] sm:text-base"
                  >
                    {loading ? <Loader2 className="animate-spin sm:w-5 sm:h-5" size={16} /> : t('create_project', 'Opprett prosjekt')}
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
