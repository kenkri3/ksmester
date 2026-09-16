import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Calculator, Sparkles, Send, FileText, CheckCircle2, Copy, Building2, Mail } from 'lucide-react';
import { Offer, OfferItem, Project } from '../types';
import { offerAiService } from '../services/offerAiService';
import { masterAiService } from '../services/masterAiService';
import AiTextAssistant from './AiTextAssistant';
import { db, auth, handleFirestoreError, OperationType, collection, addDoc, getDocs, serverTimestamp, query, orderBy } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    projectId?: string;
    projectCode?: string;
    title?: string;
    description?: string;
    clientName?: string;
    clientEmail?: string;
    items?: any[];
  };
}

const OfferModal: React.FC<OfferModalProps> = ({ isOpen, onClose, initialData }) => {
  const { user, trade } = useAuth();
  const [step, setStep] = useState(1);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
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
        setClientName(initialData.clientName || '');
        setClientEmail(initialData.clientEmail || '');
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

  const handleSelectProject = (projId: string) => {
    setProjectId(projId);
    const selected = projectsList.find(p => p.id === projId);
    if (selected) {
      setClientName(selected.clientName || '');
      setClientEmail(selected.clientEmail || '');
      setProjectCode(selected.projectCode || '');
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
        clientName,
        clientEmail: clientEmail || '',
        projectCode: projectCode || '',
        projectId: projectId || null,
        title,
        description: description || '',
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
      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clientEmail,
          subject: `Pristilbud: ${title}`,
          html: `
            <h2>Pristilbud fra ${user?.company || 'Mester Entreprenør AS'}</h2>
            <p>Hei ${clientName},</p>
            <p>Vi har utarbeidet et tilbud til deg: <strong>${title}</strong> pålydende kr ${totalAmount.toLocaleString('no-NO')} eks. mva.</p>
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
    setClientName('');
    setClientEmail('');
    setProjectCode('');
    setProjectId('');
    setTitle('');
    setDescription('');
    setItems([{ description: '', quantity: 1, unit: 'timer', pricePerUnit: 0, total: 0 }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-neutral-50 w-full max-w-4xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 mb-1" />

        <div className="p-4 sm:p-8 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <Calculator size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Opprett Pristilbud</h2>
              <p className="text-neutral-500 text-xs sm:text-sm font-medium">Lag et profesjonelt tilbud og del direkte med kunden</p>
            </div>
          </div>
          <button onClick={handleCloseAndReset} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
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
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100">
                  <CheckCircle2 size={40} className="sm:w-12 sm:h-12" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-xl sm:text-2xl font-bold text-neutral-900">Tilbud Vellykket Opprettet!</h3>
                  <p className="text-xs sm:text-sm text-neutral-500">
                    Tilbudet er lagret i systemet. Kunden kan nå godkjenne tilbudet og signere kontrakten på samme skjerm.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-lg">
                  <button 
                    onClick={handleCopyOfferLink}
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all"
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
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-200 transition-all"
                  >
                    <Sparkles size={16} />
                    Forhåndsvis Flyt
                  </button>
                </div>

                <button 
                  onClick={handleCloseAndReset}
                  className="text-xs text-neutral-400 hover:text-neutral-700 font-bold underline pt-2"
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
                {projectsList.length > 0 && (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1.5 mb-1.5">
                      <Building2 size={14} />
                      Knytt til eksisterende prosjekt (Valgfritt)
                    </label>
                    <select 
                      value={projectId}
                      onChange={(e) => handleSelectProject(e.target.value)}
                      className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl font-bold text-xs sm:text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Nytt frittstående tilbud --</option>
                      {projectsList.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.projectCode ? `[${p.projectCode}] ` : ''}{p.name} ({p.clientName || 'Ingen kunde'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-neutral-500 ml-1">Kundenavn *</label>
                    <input 
                      type="text" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="F.eks. Ola Nordmann eller Byggpartner AS"
                      className="w-full p-2.5 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-xs sm:text-base text-neutral-900"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-neutral-500 ml-1">E-post for tilbud sendt til kunde</label>
                    <input 
                      type="email" 
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="ola@eksempel.no"
                      className="w-full p-2.5 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-xs sm:text-base text-neutral-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-neutral-500 ml-1">Prosjektkode (Valgfritt)</label>
                    <input 
                      type="text" 
                      value={projectCode}
                      onChange={(e) => setProjectCode(e.target.value)}
                      placeholder="f.eks. P2026-001"
                      className="w-full p-2.5 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-xs sm:text-base text-neutral-900"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-neutral-500 ml-1">Tittel på tilbud *</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="F.eks. Totalrenovering av bad og våtrom"
                      className="w-full p-2.5 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-xs sm:text-base text-neutral-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-neutral-500 ml-1">Prosjektbeskrivelse (for AI-kalkulering)</label>
                    <div className="flex items-center gap-2">
                      <AiTextAssistant 
                        currentText={description} 
                        onApply={(text) => setDescription(text)}
                        placeholder="Hva skal gjøres? AI kan utfylle detaljer..."
                      />
                      <button 
                        onClick={generateOfferItems}
                        disabled={(!description && !title) || isGenerating}
                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold hover:bg-emerald-500 transition-all shadow-sm disabled:opacity-50"
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
                    className="w-full p-2.5 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold resize-none text-xs sm:text-base text-neutral-900"
                  />
                </div>

                <div className="flex justify-end pt-4 pb-2 border-t border-neutral-200 mt-4 bg-neutral-50">
                  <button 
                    onClick={() => {
                      if (!clientName || !title) {
                        toast.error("Vennligst fyll ut kundenavn og tittel for å fortsette.");
                        return;
                      }
                      setStep(2);
                    }}
                    disabled={!clientName || !title}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 text-xs sm:text-base"
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
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-neutral-500">Tilbudsposter</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 bg-indigo-50 p-1 rounded-lg sm:rounded-xl border border-indigo-100">
                        <span className="text-[10px] font-bold text-indigo-700 px-1 sm:px-2">Oversett:</span>
                        {['Engelsk', 'Polsk', 'Litauisk'].map(lang => (
                          <button 
                            key={lang}
                            onClick={() => handleTranslateOffer(lang)}
                            disabled={isTranslating}
                            className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white text-[10px] font-bold text-indigo-600 rounded-md sm:rounded-lg hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={addItem}
                        className="flex items-center gap-1 sm:gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all"
                      >
                        <Plus size={14} />
                        Legg til post
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 sm:gap-3 items-end bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-neutral-200 shadow-sm">
                        <div className="col-span-12 md:col-span-5 space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Beskrivelse</label>
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="f.eks. Riverarbeid og avfallshåndtering"
                            className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none text-xs sm:text-sm font-bold text-neutral-900"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Antall</label>
                          <input 
                            type="number" 
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none text-xs sm:text-sm font-bold text-neutral-900"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Enhet</label>
                          <input 
                            type="text" 
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none text-xs sm:text-sm font-bold text-neutral-900"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Pris/Enh (NOK)</label>
                          <input 
                            type="number" 
                            value={item.pricePerUnit}
                            onChange={(e) => updateItem(index, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none text-xs sm:text-sm font-bold text-neutral-900"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-1 flex items-center justify-between md:justify-end pb-1 sm:pb-2">
                          <span className="md:hidden text-xs font-bold text-neutral-500">Sum: {item.total?.toLocaleString()} kr</span>
                          <button 
                            onClick={() => removeItem(index)}
                            className="p-1.5 sm:p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Slett post"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-neutral-900 rounded-xl sm:rounded-3xl p-4 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 shadow-xl mt-4 sm:mt-6 z-20">
                  <div className="text-center md:text-left">
                    <div className="text-neutral-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-0.5 sm:mb-1">Total sum eks. mva</div>
                    <div className="text-xl sm:text-4xl font-black text-emerald-400">{totalAmount.toLocaleString()} kr</div>
                  </div>
                  <div className="flex flex-wrap md:flex-nowrap gap-2 sm:gap-4 w-full md:w-auto">
                    <button 
                      onClick={() => setStep(1)}
                      className="flex-1 md:flex-none px-3 sm:px-6 py-2.5 sm:py-4 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-2xl font-bold transition-all text-xs sm:text-sm"
                    >
                      ← Tilbake
                    </button>
                    <button 
                      onClick={() => handleSave('draft')}
                      disabled={isSaving}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-4 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-2xl font-bold transition-all disabled:opacity-50 text-xs sm:text-sm"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FileText size={16} />
                      )}
                      {isSaving ? 'Lagrer...' : 'Lagre Utkast'}
                    </button>
                    <button 
                      onClick={() => handleSave('sent')}
                      disabled={isSaving}
                      className="w-full md:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-5 sm:px-8 py-2.5 sm:py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg sm:rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-xs sm:text-sm"
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
