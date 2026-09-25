import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Trash2, Calculator, Sparkles, Send, FileText, CheckCircle2, 
  Copy, Building2, Mail, User, MapPin, Search, Check, ShieldCheck, 
  Phone, Hash, AlertCircle, Loader2, Info 
} from 'lucide-react';
import { Offer, OfferItem, Project } from '../types';
import { offerAiService } from '../services/offerAiService';
import { masterAiService } from '../services/masterAiService';
import { locationService, AddressInfo } from '../services/locationService';
import { companyService, CompanyInfo } from '../services/companyService';
import AiTextAssistant from './AiTextAssistant';
import { db, auth, handleFirestoreError, OperationType, collection, addDoc, getDocs, serverTimestamp, query, orderBy } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id?: string;
    projectId?: string;
    projectCode?: string;
    title?: string;
    description?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientType?: 'private' | 'company';
    orgNumber?: string;
    contactPerson?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    municipality?: string;
    gnr?: string;
    bnr?: string;
    fnr?: string;
    contractStandard?: string;
    items?: any[];
  };
}

const OfferModal: React.FC<OfferModalProps> = ({ isOpen, onClose, initialData }) => {
  const { user, trade } = useAuth();
  const [step, setStep] = useState(1);

  // Kundetype og kontaktinfo
  const [clientType, setClientType] = useState<'private' | 'company'>('private');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  // Eiendom / Matrikkel (Kartverket)
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [gnr, setGnr] = useState('');
  const [bnr, setBnr] = useState('');
  const [fnr, setFnr] = useState('');
  const [contractStandard, setContractStandard] = useState('haandverker');

  // Adressesøk i Kartverket
  const [addressSearchInput, setAddressSearchInput] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressInfo[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isAddressVerified, setIsAddressVerified] = useState(false);

  // Firmasøk i Brønnøysundregistrene (Enhetsregisteret)
  const [companySearchInput, setCompanySearchInput] = useState('');
  const [companySuggestions, setCompanySuggestions] = useState<CompanyInfo[]>([]);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);

  // Prosjekt og tilbud
  const [projectCode, setProjectCode] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<OfferItem[]>([
    { description: '', quantity: 1, unit: 'timer', pricePerUnit: 0, total: 0 }
  ]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createdOfferId, setCreatedOfferId] = useState<string | null>(null);
  const [createdOfferToken, setCreatedOfferToken] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch available projects for dropdown selection
      getDocs(collection(db, 'projects')).then((snapshot) => {
        const projs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
        setProjectsList(projs);
      }).catch(err => console.error("Error loading projects:", err));

      if (initialData) {
        const initialType = initialData.clientType || (initialData.orgNumber ? 'company' : 'private');
        setClientType(initialType);
        setClientName(initialData.clientName || '');
        setClientEmail(initialData.clientEmail || '');
        setClientPhone(initialData.clientPhone || '');
        setOrgNumber(initialData.orgNumber || '');
        setContactPerson(initialData.contactPerson || '');
        setAddress(initialData.address || '');
        setPostalCode(initialData.postalCode || '');
        setCity(initialData.city || '');
        setMunicipality(initialData.municipality || '');
        setGnr(initialData.gnr || '');
        setBnr(initialData.bnr || '');
        setFnr(initialData.fnr || '');
        setContractStandard(initialData.contractStandard || (initialType === 'company' ? 'NS8406' : 'haandverker'));
        
        if (initialData.address) {
          setAddressSearchInput(initialData.address);
          if (initialData.gnr && initialData.bnr) {
            setIsAddressVerified(true);
          }
        }
        if (initialData.orgNumber) {
          setCompanySearchInput(initialData.clientName || '');
        }

        setProjectCode(initialData.projectCode || '');
        setProjectId(initialData.projectId || '');
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        if (initialData.items && Array.isArray(initialData.items) && initialData.items.length > 0) {
          setItems(initialData.items.map((it: any) => ({
            description: it.description || '',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'timer',
            pricePerUnit: Number(it.pricePerUnit) || 0,
            total: Math.round((Number(it.quantity) || 1) * (Number(it.pricePerUnit) || 0))
          })));
          setStep(2);
        } else {
          setStep(1);
        }
      }
    }
  }, [isOpen, initialData]);

  // Live address search in Kartverket Geonorge (100% gratis API)
  useEffect(() => {
    if (!addressSearchInput || addressSearchInput.trim().length < 2) {
      setAddressSuggestions([]);
      setIsSearchingAddress(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const results = await locationService.searchAddress(addressSearchInput);
        setAddressSuggestions(results);
      } catch (err) {
        console.error("Address search error:", err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [addressSearchInput]);

  // Live company search in Brønnøysundregistrene (Enhetsregisteret)
  useEffect(() => {
    if (clientType !== 'company' || !companySearchInput || companySearchInput.trim().length < 2) {
      setCompanySuggestions([]);
      setIsSearchingCompany(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCompany(true);
      try {
        const results = await companyService.searchCompany(companySearchInput);
        setCompanySuggestions(results);
      } catch (err) {
        console.error("Company search error:", err);
      } finally {
        setIsSearchingCompany(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [companySearchInput, clientType]);

  const handleSelectAddress = (item: AddressInfo) => {
    setAddress(item.address);
    setPostalCode(item.postcode);
    setCity(item.city);
    setMunicipality(item.municipality || '');
    if (item.gnr) setGnr(item.gnr);
    if (item.bnr) setBnr(item.bnr);
    if (item.fnr) setFnr(item.fnr);
    setAddressSearchInput(item.fullAddress);
    setShowAddressSuggestions(false);
    setIsAddressVerified(true);
    toast.success(`Hentet eiendom: ${item.address} (Gnr ${item.gnr || '-'} / Bnr ${item.bnr || '-'})`);
  };

  const handleSelectCompany = async (comp: CompanyInfo) => {
    setClientName(comp.name);
    setOrgNumber(comp.orgnr);
    setCompanySearchInput(comp.name);
    setShowCompanySuggestions(false);
    
    // Auto-fill address if not already filled
    if (comp.address) {
      setAddress(comp.address);
      setPostalCode(comp.postcode);
      setCity(comp.city);
      setMunicipality(comp.municipality || '');
      setAddressSearchInput(`${comp.address}, ${comp.postcode} ${comp.city}`);
      
      // Auto-lookup Gnr/Bnr from Kartverket for the company address
      try {
        const addrResults = await locationService.searchAddress(`${comp.address} ${comp.city}`);
        if (addrResults.length > 0) {
          const match = addrResults[0];
          if (match.gnr) setGnr(match.gnr);
          if (match.bnr) setBnr(match.bnr);
          if (match.municipality) setMunicipality(match.municipality);
          setIsAddressVerified(true);
        }
      } catch {}
    }
    toast.success(`Hentet ${comp.name} (${comp.orgnr}) fra Enhetsregisteret`);
  };

  const handleSelectProject = (projId: string) => {
    setProjectId(projId);
    const selected = projectsList.find(p => p.id === projId);
    if (selected) {
      setClientName(selected.clientName || '');
      setClientEmail(selected.clientEmail || '');
      setProjectCode(selected.projectCode || '');
      if (selected.address) {
        setAddress(selected.address);
        setAddressSearchInput(selected.address);
      }
      if (selected.gnr) setGnr(selected.gnr);
      if (selected.bnr) setBnr(selected.bnr);
      if (selected.gnr && selected.bnr) setIsAddressVerified(true);
      if (!title) setTitle(`Tilbud: ${selected.name}`);
      if (!description) setDescription(selected.description || '');
    }
  };

  const handleTranslateOffer = async (lang: string) => {
    setIsTranslating(true);
    try {
      const offerData = { title, description, items };
      const translated = await masterAiService.translateDocument(offerData, lang);
      setTitle(translated.title);
      setDescription(translated.description);
      setItems(translated.items);
      toast.success(`Tilbud oversatt til ${lang}`);
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Kunne ikke oversette tilbudet.");
    } finally {
      setIsTranslating(false);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit: 'timer', pricePerUnit: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OfferItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'pricePerUnit') {
      item.total = Math.round((Number(item.quantity) || 0) * (Number(item.pricePerUnit) || 0));
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);

  const generateOfferItems = async () => {
    if (!description && !title) {
      toast.error("Vennligst oppgi tittel eller beskrivelse før du genererer poster.");
      return;
    }
    
    if (items.length > 0 && items[0].description !== '') {
      if (!window.confirm('Dette vil erstatte dine nåværende tilbudsposter. Vil du fortsette?')) {
        return;
      }
    }
    
    setIsGenerating(true);
    try {
      const generatedItems = await offerAiService.generateOfferItems(description || title, title, trade || undefined);
      
      if (Array.isArray(generatedItems) && generatedItems.length > 0) {
        const formattedItems = generatedItems.map(item => ({
          ...item,
          total: Math.round(item.quantity * item.pricePerUnit)
        }));
        setItems(formattedItems);
        toast.success(`Genererte ${formattedItems.length} tilbudsposter med AI!`);
      } else {
        toast.error("Ingen poster ble generert. Vennligst legg til flere detaljer i beskrivelsen.");
      }
    } catch (error) {
      console.error('AI Generation error:', error);
      toast.error("Feil under generering av poster.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
    if (!auth.currentUser) {
      toast.error("Du må være innlogget for å lagre tilbud.");
      return;
    }
    if (!clientName || !title) {
      toast.error("Vennligst fyll ut kundenavn og tittel.");
      return;
    }
    
    setIsSaving(true);
    try {
      const userCompany = (user as any)?.companyName || (user as any)?.company || 'Firma';
      const authorName = (user as any)?.name || auth.currentUser.email || 'Saksbehandler';
      const validUntilDate = new Date();
      validUntilDate.setDate(validUntilDate.getDate() + 30);
      const token = 'o-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

      const offerData = {
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || '',
        clientPhone: clientPhone.trim() || '',
        clientType,
        orgNumber: orgNumber.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        address: address.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        city: city.trim() || undefined,
        municipality: municipality.trim() || undefined,
        gnr: gnr.trim() || undefined,
        bnr: bnr.trim() || undefined,
        fnr: fnr.trim() || undefined,
        contractStandard: contractStandard || (clientType === 'company' ? 'NS8406' : 'haandverker'),
        projectCode: projectCode.trim() || '',
        projectId: projectId || null,
        title: title.trim(),
        description: description.trim() || '',
        items,
        totalAmount,
        status,
        createdBy: auth.currentUser.uid,
        authorId: auth.currentUser.uid,
        authorName,
        company: userCompany,
        companyName: userCompany,
        token,
        shareUrl: typeof window !== 'undefined' ? `${window.location.origin}/?offerToken=${token}` : `/?offerToken=${token}`,
        validUntil: validUntilDate.toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'offers'), offerData);
      setCreatedOfferId(docRef.id);
      setCreatedOfferToken(token);
      
      setIsSuccess(true);
      toast.success(status === 'sent' ? 'Tilbud lagret og merket som sendt!' : 'Tilbudsutkast lagret!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'offers');
      toast.error("Kunne ikke lagre tilbudet.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyOfferLink = () => {
    const tokenOrId = createdOfferToken || createdOfferId;
    if (tokenOrId) {
      const link = `${window.location.origin}/?offerToken=${tokenOrId}`;
      navigator.clipboard.writeText(link);
      toast.success("Tilbudslenke kopiert til utklippstavlen!");
    }
  };

  const handleSendEmail = async () => {
    if (!clientEmail) {
      toast.error("Ingen e-postadresse registrert på kunden.");
      return;
    }
    const tokenOrId = createdOfferToken || createdOfferId;
    const link = `${window.location.origin}/?offerToken=${tokenOrId}`;
    setIsSendingEmail(true);
    try {
      const totalIncMva = Math.round(totalAmount * 1.25);
      const priceText = clientType === 'private' 
        ? `kr ${totalIncMva.toLocaleString('no-NO')} inkl. 25% mva` 
        : `kr ${totalAmount.toLocaleString('no-NO')} eks. mva (kr ${totalIncMva.toLocaleString('no-NO')} inkl. mva)`;

      const propInfo = [
        address ? `${address}${postalCode ? `, ${postalCode}` : ''}${city ? ` ${city}` : ''}` : '',
        gnr && bnr ? `Gnr ${gnr} / Bnr ${bnr}` : ''
      ].filter(Boolean).join(' • ');

      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clientEmail,
          subject: `Pristilbud: ${title}`,
          html: `
            <h2>Pristilbud fra ${user?.company || 'Mester Entreprenør AS'}</h2>
            <p>Hei ${clientName},</p>
            <p>Vi har utarbeidet et tilbud til deg: <strong>${title}</strong> pålydende <strong>${priceText}</strong>.</p>
            ${propInfo ? `<p><strong>Byggeplass / Eiendom:</strong> ${propInfo}</p>` : ''}
            <p>Klikk på lenken under for å gjennomgå tilbudet og godkjenne det direkte på skjermen:</p>
            <p><a href="${link}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Gjennomgå og godkjenn tilbud</a></p>
            <p>Med vennlig hilsen,<br>${user?.displayName || 'Byggmester'}</p>
          `
        })
      });
      if (res.ok) {
        toast.success(`Tilbud sendt på e-post til ${clientEmail}!`);
      } else {
        toast.info("E-posttjenesten simulerte utsendelse (sett RESEND_API_KEY for live sending).");
      }
    } catch (e) {
      toast.info("Tilbudslenke er generert og klar til deling.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCloseAndReset = () => {
    onClose();
    setIsSuccess(false);
    setStep(1);
    setCreatedOfferId(null);
    setCreatedOfferToken(null);
    setClientType('private');
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setOrgNumber('');
    setContactPerson('');
    setAddress('');
    setPostalCode('');
    setCity('');
    setMunicipality('');
    setGnr('');
    setBnr('');
    setFnr('');
    setContractStandard('haandverker');
    setAddressSearchInput('');
    setAddressSuggestions([]);
    setIsAddressVerified(false);
    setCompanySearchInput('');
    setCompanySuggestions([]);
    setProjectCode('');
    setProjectId('');
    setTitle('');
    setDescription('');
    setItems([{ description: '', quantity: 1, unit: 'timer', pricePerUnit: 0, total: 0 }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0B0F17] text-white border border-slate-800 w-full max-w-4xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

        <div className="p-4 sm:p-8 border-b border-slate-800 flex items-center justify-between bg-[#131722] shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <Calculator size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white">Opprett Pristilbud</h2>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">Lag et profesjonelt tilbud og del direkte med kunden</p>
            </div>
          </div>
          <button onClick={handleCloseAndReset} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-6 sm:py-10 text-center space-y-6"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-lg shadow-emerald-950/50">
                  <CheckCircle2 size={40} className="sm:w-12 sm:h-12" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Tilbud Vellykket Opprettet!</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Tilbudet er lagret i systemet. Kunden kan nå godkjenne tilbudet og signere kontrakten på samme skjerm.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-lg">
                  <button 
                    onClick={handleCopyOfferLink}
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all"
                  >
                    <Copy size={16} />
                    Kopiér Kundelenke
                  </button>
                  {clientEmail && (
                    <button 
                      onClick={handleSendEmail}
                      disabled={isSendingEmail}
                      className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
                    >
                      <Mail size={16} />
                      {isSendingEmail ? 'Sender...' : 'Send på e-post'}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      const tokenOrId = createdOfferToken || createdOfferId;
                      window.open(`/?offerToken=${tokenOrId}`, '_blank');
                    }}
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/50 transition-all"
                  >
                    <Sparkles size={16} />
                    Forhåndsvis Flyt
                  </button>
                </div>

                <button 
                  onClick={handleCloseAndReset}
                  className="text-xs text-slate-400 hover:text-white font-bold underline pt-2"
                >
                  Lukk vindu og gå tilbake
                </button>
              </motion.div>
            ) : step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 sm:space-y-6"
              >
                {/* 1. Valgfritt: Knytt til eksisterende prosjekt */}
                {projectsList.length > 0 && (
                  <div className="p-3.5 sm:p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 mb-1.5">
                      <Building2 size={14} />
                      Knytt til eksisterende prosjekt (Valgfritt)
                    </label>
                    <select 
                      value={projectId}
                      onChange={(e) => handleSelectProject(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs sm:text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="" className="bg-slate-950 text-slate-400">-- Nytt frittstående tilbud (Prosjekt opprettes automatisk ved aksept) --</option>
                      {projectsList.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-950 text-white">
                          {p.projectCode ? `[${p.projectCode}] ` : ''}{p.name} ({p.clientName || 'Ingen kunde'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-emerald-400/90 mt-1.5">
                      💡 Et tilbud må ikke knyttes til et prosjekt. Ved aksept genereres kontrakt, prosjekt og skreddersydde KS-sjekklister automatisk!
                    </p>
                  </div>
                )}

                {/* 2. Kundetype Velger: Privatperson vs. Firma */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                    Kundetype *
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setClientType('private');
                        if (contractStandard === 'NS8406' || contractStandard === 'NS8405') {
                          setContractStandard('haandverker');
                        }
                      }}
                      className={cn(
                        "flex items-center justify-center gap-2.5 py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer text-left",
                        clientType === 'private'
                          ? "bg-[#131722] text-emerald-400 shadow-md border border-emerald-500/30"
                          : "text-slate-400 hover:text-white hover:bg-slate-900"
                      )}
                    >
                      <User size={18} className={clientType === 'private' ? "text-emerald-400 shrink-0" : "text-slate-500 shrink-0"} />
                      <div>
                        <div className="font-extrabold leading-tight">Privatperson</div>
                        <div className="text-[10px] text-slate-400 font-medium hidden sm:block">Forbruker • Inkl. MVA</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setClientType('company');
                        if (contractStandard === 'haandverker') {
                          setContractStandard('NS8406');
                        }
                      }}
                      className={cn(
                        "flex items-center justify-center gap-2.5 py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer text-left",
                        clientType === 'company'
                          ? "bg-[#131722] text-emerald-400 shadow-md border border-emerald-500/30"
                          : "text-slate-400 hover:text-white hover:bg-slate-900"
                      )}
                    >
                      <Building2 size={18} className={clientType === 'company' ? "text-emerald-400 shrink-0" : "text-slate-500 shrink-0"} />
                      <div>
                        <div className="font-extrabold leading-tight">Firma / Bedrift</div>
                        <div className="text-[10px] text-slate-400 font-medium hidden sm:block">B2B • Org.nr oppslag • NS 8406</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. Hvis Firma: Brønnøysundregistrene (Enhetsregisteret) live søk */}
                {clientType === 'company' && (
                  <div className="relative p-3.5 sm:p-4 bg-blue-950/30 border border-blue-500/30 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-blue-300 flex items-center gap-1.5">
                        <Building2 size={14} className="text-blue-400" />
                        Søk i Brønnøysundregistrene (Enhetsregisteret)
                      </label>
                      <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full">
                        100% gratis API
                      </span>
                    </div>

                    <div className="relative">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
                      <input
                        type="text"
                        value={companySearchInput}
                        onChange={(e) => {
                          setCompanySearchInput(e.target.value);
                          setShowCompanySuggestions(true);
                        }}
                        onFocus={() => {
                          if (companySuggestions.length > 0) setShowCompanySuggestions(true);
                        }}
                        placeholder="Tast firmanavn eller 9-sifret org.nr..."
                        className="w-full pl-10 pr-9 py-2.5 sm:py-3 bg-slate-950 border border-blue-500/30 rounded-xl font-bold text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                      {isSearchingCompany && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Dropdown for Brreg results */}
                    {showCompanySuggestions && companySuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#131722] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800">
                        {companySuggestions.map((comp) => (
                          <button
                            key={comp.orgnr}
                            type="button"
                            onClick={() => handleSelectCompany(comp)}
                            className="w-full p-3 text-left hover:bg-slate-800/80 transition-colors flex items-start justify-between gap-3 cursor-pointer"
                          >
                            <div className="space-y-0.5">
                              <div className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5 flex-wrap">
                                <span>{comp.name}</span>
                                <span className="text-[10px] font-extrabold text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded">
                                  {comp.orgTypeCode}
                                </span>
                                {comp.isMvaRegistered && (
                                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <Check size={10} /> MVA
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                                <span>Org.nr: <strong className="font-mono text-slate-300">{comp.orgnr}</strong></span>
                                {comp.address && <span>• {comp.address}, {comp.postcode} {comp.city}</span>}
                              </div>
                            </div>
                            <span className="text-xs font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 rounded-lg shrink-0">
                              Bruk firma
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Kunde- og kontaktfelter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                      {clientType === 'company' ? 'Firmanavn / Oppdragsgiver *' : 'Kundenavn (Forbruker) *'}
                    </label>
                    <input 
                      type="text" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder={clientType === 'company' ? "F.eks. Mesterbygg AS eller Sameiet" : "F.eks. Kari Nordmann"}
                      className="w-full p-2.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-emerald-500 outline-none font-bold text-xs sm:text-base text-white placeholder:text-slate-600"
                    />
                  </div>

                  {clientType === 'company' ? (
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                        Organisasjonsnummer (9 siffer)
                      </label>
                      <input 
                        type="text" 
                        value={orgNumber}
                        onChange={(e) => setOrgNumber(e.target.value)}
                        placeholder="f.eks. 977 467 411"
                        className="w-full p-2.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-emerald-500 outline-none font-bold text-xs sm:text-base text-white placeholder:text-slate-600 font-mono"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                        Telefonnummer
                      </label>
                      <input 
                        type="tel" 
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="f.eks. 900 00 000"
                        className="w-full p-2.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-emerald-500 outline-none font-bold text-xs sm:text-base text-white placeholder:text-slate-600"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                      E-post for tilbud sendt til kunde
                    </label>
                    <input 
                      type="email" 
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="kunde@eksempel.no"
                      className="w-full p-2.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-emerald-500 outline-none font-bold text-xs sm:text-base text-white placeholder:text-slate-600"
                    />
                  </div>

                  {clientType === 'company' ? (
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                        Kontaktperson / Attn (vår referanse)
                      </label>
                      <input 
                        type="text" 
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="f.eks. Petter Olsen (Prosjektleder)"
                        className="w-full p-2.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-emerald-500 outline-none font-bold text-xs sm:text-base text-white placeholder:text-slate-600"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                        Prosjektkode (Valgfritt)
                      </label>
                      <input 
                        type="text" 
                        value={projectCode}
                        onChange={(e) => setProjectCode(e.target.value)}
                        placeholder="f.eks. P2026-001"
                        className="w-full p-2.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-emerald-500 outline-none font-bold text-xs sm:text-base text-white placeholder:text-slate-600"
                      />
                    </div>
                  )}
                </div>

                {/* 5. Eiendom og Byggeplassadresse (Kartverket Matrikkel - 100% gratis API) */}
                <div className="p-4 sm:p-5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl sm:rounded-3xl space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-xs">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-emerald-300">
                          Eiendom og Byggeplassadresse
                        </h4>
                        <p className="text-[11px] text-emerald-400/80">
                          Automatisk henting av adresse, Gnr og Bnr fra Kartverket (100% gratis API)
                        </p>
                      </div>
                    </div>
                    {isAddressVerified && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs">
                        <Check size={12} />
                        <span>Matrikkel verifisert</span>
                      </div>
                    )}
                  </div>

                  {/* Search input with live autocomplete */}
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                    <input
                      type="text"
                      value={addressSearchInput}
                      onChange={(e) => {
                        setAddressSearchInput(e.target.value);
                        setShowAddressSuggestions(true);
                        setIsAddressVerified(false);
                      }}
                      onFocus={() => {
                        if (addressSuggestions.length > 0) setShowAddressSuggestions(true);
                      }}
                      placeholder="Søk gateadresse eller Gnr/Bnr (f.eks. Vidjeveien 21 eller 146/309)..."
                      className="w-full pl-10 pr-9 py-2.5 sm:py-3 bg-slate-950 border border-emerald-500/30 rounded-xl font-bold text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    />
                    {isSearchingAddress && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Dropdown suggestions */}
                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#131722] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-800">
                        {addressSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectAddress(item)}
                            className="w-full p-3 text-left hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="space-y-0.5">
                              <div className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                                <MapPin size={13} className="text-emerald-400 shrink-0" />
                                <span>{item.address}</span>
                                <span className="text-slate-400 font-semibold">• {item.postcode} {item.city}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 pl-4">
                                <span className="text-emerald-400 font-semibold">{item.municipality || 'Norge'}</span>
                                {(item.gnr || item.bnr) && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-500/30">
                                    Gnr: {item.gnr || '-'} / Bnr: {item.bnr || '-'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg shrink-0">
                              Bruk adresse
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Detail fields for manual fine-tuning */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 ml-1">Gateadresse</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="f.eks. Vidjeveien 21"
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white outline-none focus:border-emerald-500 placeholder:text-slate-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 ml-1">Postnr & Sted</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="Postnr"
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white outline-none focus:border-emerald-500 font-mono placeholder:text-slate-600"
                        />
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Sted"
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white outline-none focus:border-emerald-500 placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 ml-1 flex items-center justify-between">
                        <span>Matrikkel (Gnr / Bnr)</span>
                        {municipality && <span className="text-[10px] font-semibold text-emerald-300">{municipality}</span>}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={gnr}
                          onChange={(e) => setGnr(e.target.value)}
                          placeholder="Gnr"
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white outline-none focus:border-emerald-500 font-mono placeholder:text-slate-600"
                        />
                        <input
                          type="text"
                          value={bnr}
                          onChange={(e) => setBnr(e.target.value)}
                          placeholder="Bnr"
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white outline-none focus:border-emerald-500 font-mono placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Matrikkel info confirmation chip */}
                  {(gnr || bnr || address) && (
                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-200 flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 font-bold">
                        <ShieldCheck size={15} className="text-emerald-400" />
                        Offisiell eiendomsidentifikator:
                        <span className="font-mono text-emerald-300">
                          {gnr ? `Gnr ${gnr}` : ''} {bnr ? `/ Bnr ${bnr}` : ''} {municipality ? `(${municipality})` : ''}
                        </span>
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        Føres automatisk i kontrakt og byggedagbok
                      </span>
                    </div>
                  )}
                </div>

                {/* 6. Kontraktsstandard */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Avtale- og kontraktsramme *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clientType === 'private' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setContractStandard('haandverker')}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all cursor-pointer",
                            contractStandard === 'haandverker'
                              ? "bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-xs"
                              : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white"
                          )}
                        >
                          <div className="font-bold text-xs sm:text-sm flex items-center justify-between">
                            <span>Håndverkertjenesteloven</span>
                            {contractStandard === 'haandverker' && <Check size={14} className="text-emerald-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Lov om håndverkertjenester for forbrukere (standard ved renovering/rehab)
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setContractStandard('bustadoppforing')}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all cursor-pointer",
                            contractStandard === 'bustadoppforing'
                              ? "bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-xs"
                              : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white"
                          )}
                        >
                          <div className="font-bold text-xs sm:text-sm flex items-center justify-between">
                            <span>Bustadoppføringslova</span>
                            {contractStandard === 'bustadoppforing' && <Check size={14} className="text-emerald-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Ved oppføring av ny bolig eller fritidsbolig for forbruker
                          </p>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setContractStandard('NS8406')}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all cursor-pointer",
                            contractStandard === 'NS8406'
                              ? "bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-xs"
                              : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white"
                          )}
                        >
                          <div className="font-bold text-xs sm:text-sm flex items-center justify-between">
                            <span>NS 8406 (Forenklet kontrakt)</span>
                            {contractStandard === 'NS8406' && <Check size={14} className="text-emerald-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Forenklet norsk bygge- og anleggskontrakt for utførelsesentrepriser (B2B standard)
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setContractStandard('NS8405')}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all cursor-pointer",
                            contractStandard === 'NS8405'
                              ? "bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-xs"
                              : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white"
                          )}
                        >
                          <div className="font-bold text-xs sm:text-sm flex items-center justify-between">
                            <span>NS 8405 (Norsk byggekontrakt)</span>
                            {contractStandard === 'NS8405' && <Check size={14} className="text-emerald-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Norsk bygge- og anleggskontrakt med krav til formelle varsler og sikkerhetsstillelse
                          </p>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 7. Tilbudstittel og Prosjektkode (hvis firma) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {clientType === 'company' && (
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                        Prosjektkode (Valgfritt)
                      </label>
                      <input 
                        type="text" 
                        value={projectCode}
                        onChange={(e) => setProjectCode(e.target.value)}
                        placeholder="f.eks. P2026-001"
                        className="w-full p-2.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-emerald-500 outline-none font-bold text-xs sm:text-base text-white placeholder:text-slate-600"
                      />
                    </div>
                  )}

                  <div className={cn("space-y-1.5 sm:space-y-2", clientType !== 'company' ? "md:col-span-2" : "")}>
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                      Tittel på tilbud *
                    </label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="F.eks. Totalrenovering av bad og våtrom"
                      className="w-full p-2.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-emerald-500 outline-none font-bold text-xs sm:text-base text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* 8. Prosjektbeskrivelse og AI-kalkulering */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                      Prosjektbeskrivelse (for AI-kalkulering)
                    </label>
                    <div className="flex items-center gap-2">
                      <AiTextAssistant 
                        currentText={description} 
                        onApply={(text) => setDescription(text)}
                        placeholder="Hva skal gjøres? AI kan utfylle detaljer..."
                      />
                      <button 
                        type="button"
                        onClick={generateOfferItems}
                        disabled={(!description && !title) || isGenerating}
                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold hover:bg-emerald-500 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {isGenerating ? <Sparkles className="animate-spin sm:w-3.5 sm:h-3.5" size={12} /> : <Sparkles size={12} className="sm:w-3.5 sm:h-3.5" />}
                        {isGenerating ? 'Genererer...' : 'Generer AI-poster'}
                      </button>
                    </div>
                  </div>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Beskriv arbeidet som skal utføres, dimensjoner, materialønsker, oppstart osv..."
                    rows={3}
                    className="w-full p-2.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-emerald-500 outline-none font-bold resize-none text-xs sm:text-base text-white placeholder:text-slate-600"
                  />
                </div>

                <div className="flex justify-end pt-4 pb-2 border-t border-slate-800 mt-4 bg-[#0B0F17]">
                  <button 
                    type="button"
                    onClick={() => {
                      if (!clientName || !title) {
                        toast.error("Vennligst fyll ut kundenavn og tittel for å fortsette.");
                        return;
                      }
                      setStep(2);
                    }}
                    disabled={!clientName || !title}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 text-xs sm:text-base cursor-pointer"
                  >
                    Neste: Spesifiser Poster & Priser →
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 sm:space-y-6"
              >
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-400">Tilbudsposter</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 bg-indigo-950/40 p-1 rounded-lg sm:rounded-xl border border-indigo-500/30">
                        <span className="text-[10px] font-bold text-indigo-300 px-1 sm:px-2">Oversett:</span>
                        {['Engelsk', 'Polsk', 'Litauisk'].map(lang => (
                          <button 
                            key={lang}
                            onClick={() => handleTranslateOffer(lang)}
                            disabled={isTranslating}
                            className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-900 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 rounded-md sm:rounded-lg hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={addItem}
                        className="flex items-center gap-1 sm:gap-2 text-xs font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        Legg til post
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 sm:gap-3 items-end bg-[#131722] p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 shadow-sm">
                        <div className="col-span-12 md:col-span-5 space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Beskrivelse</label>
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="f.eks. Riverarbeid og avfallshåndtering"
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg outline-none text-xs sm:text-sm font-bold text-white focus:border-emerald-500"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-4 md:col-span-2 space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Antall</label>
                          <input 
                            type="number" 
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg outline-none text-xs sm:text-sm font-bold text-white focus:border-emerald-500"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-4 md:col-span-2 space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Enhet</label>
                          <input 
                            type="text" 
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg outline-none text-xs sm:text-sm font-bold text-white focus:border-emerald-500"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-4 md:col-span-2 space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pris/Enh (NOK)</label>
                          <input 
                            type="number" 
                            value={item.pricePerUnit}
                            onChange={(e) => updateItem(index, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg outline-none text-xs sm:text-sm font-bold text-white focus:border-emerald-500"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-1 flex items-center justify-between md:justify-end pb-1 sm:pb-2">
                          <span className="md:hidden text-xs font-bold text-slate-400">Sum: {item.total?.toLocaleString()} kr</span>
                          <button 
                            onClick={() => removeItem(index)}
                            className="p-1.5 sm:p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Slett post"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0A101D] border border-slate-800 rounded-xl sm:rounded-3xl p-4 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 shadow-xl mt-4 sm:mt-6 z-20">
                  <div className="text-center md:text-left space-y-1">
                    {clientType === 'private' ? (
                      <>
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                          <span className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">
                            Totalsum inkl. 25% mva (Forbruker)
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            Privat
                          </span>
                        </div>
                        <div className="text-2xl sm:text-4xl font-black text-emerald-400 font-mono">
                          {Math.round(totalAmount * 1.25).toLocaleString('no-NO')} kr
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 justify-center md:justify-start flex-wrap">
                          <span>Eks. mva: kr {totalAmount.toLocaleString('no-NO')}</span>
                          <span>•</span>
                          <span>MVA (25%): kr {Math.round(totalAmount * 0.25).toLocaleString('no-NO')}</span>
                          {(gnr || bnr || address) && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-300 font-semibold">
                                {address || ''} {gnr && bnr ? `(Gnr ${gnr}/${bnr})` : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                          <span className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">
                            Total sum eks. mva (B2B)
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                            NS 8406
                          </span>
                        </div>
                        <div className="text-2xl sm:text-4xl font-black text-emerald-400 font-mono">
                          {totalAmount.toLocaleString('no-NO')} kr
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 justify-center md:justify-start flex-wrap">
                          <span>MVA (25%): kr {Math.round(totalAmount * 0.25).toLocaleString('no-NO')}</span>
                          <span>•</span>
                          <span>Inkl. mva: kr {Math.round(totalAmount * 1.25).toLocaleString('no-NO')}</span>
                          {orgNumber && (
                            <>
                              <span>•</span>
                              <span className="text-blue-300 font-mono">Org: {orgNumber}</span>
                            </>
                          )}
                          {(gnr || bnr) && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-300 font-semibold">Gnr {gnr}/Bnr {bnr}</span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap md:flex-nowrap gap-2 sm:gap-4 w-full md:w-auto">
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 md:flex-none px-3 sm:px-6 py-2.5 sm:py-4 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-2xl font-bold transition-all text-xs sm:text-sm cursor-pointer"
                    >
                      ← Tilbake
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSave('draft')}
                      disabled={isSaving}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-4 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-2xl font-bold transition-all disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FileText size={16} />
                      )}
                      {isSaving ? 'Lagrer...' : 'Lagre Utkast'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSave('sent')}
                      disabled={isSaving}
                      className="w-full md:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-5 sm:px-8 py-2.5 sm:py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg sm:rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      {isSaving ? 'Sender...' : 'Lagre & Send til Kunde'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default OfferModal;
