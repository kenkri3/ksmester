import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  X, 
  Calculator, 
  FileSignature, 
  ShieldAlert, 
  AlertTriangle, 
  Timer, 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  Building2, 
  Calendar,
  Send,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  ListTodo,
  Star,
  User,
  Users
} from 'lucide-react';
import { Project, OfferItem, ProjectTask } from '../types';
import { db, collection, addDoc, serverTimestamp, getDocs } from '../services/firebase';
import { changeOrderService } from '../services/changeOrderService';
import { useAuth } from '../hooks/useAuth';
import { cn, sanitizePlainText } from '../lib/utils';
import { toast } from 'sonner';
import { getStoredOmnichannelSettings, OmnichannelSettings } from './OmnichannelModal';

export type InChatFormType = 'offer' | 'change_order' | 'sja' | 'deviation' | 'time' | 'task' | 'toolbox';

export interface InChatWorkspaceProps {
  formType: InChatFormType;
  initialData?: any;
  projects?: any[];
  selectedProject?: any;
  onClose: () => void;
  onSuccess: (message: string, actionData?: any) => void;
  onSwitchForm?: (formType: InChatFormType, data?: any) => void;
  onOpenOmnichannelModal?: () => void;
}

export default function InChatWorkspace({
  formType,
  initialData,
  projects: propProjects = [],
  selectedProject,
  onClose,
  onSuccess,
  onSwitchForm,
  onOpenOmnichannelModal
}: InChatWorkspaceProps) {
  const { user } = useAuth();
  const [projectsList, setProjectsList] = useState<any[]>(propProjects);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load projects if not passed in
  useEffect(() => {
    if (propProjects && propProjects.length > 0) {
      setProjectsList(propProjects);
    } else {
      getDocs(collection(db, 'projects'))
        .then((snap) => {
          const projs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (projs.length > 0) setProjectsList(projs);
        })
        .catch(() => {});
    }
  }, [propProjects]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Form Header */}
      <div className="px-3 sm:px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -ml-1 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
            title="Gå tilbake til samtalen"
          >
            <ArrowLeft size={16} />
            <span className="text-xs">Tilbake</span>
          </button>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            {formType === 'offer' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                  <Calculator size={15} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-navy-900">Tilbudsbygger & Kalkyle</h4>
                  <p className="text-[10px] text-slate-500 hidden sm:block">Opprett profesjonelt tilbud med kalkyle</p>
                </div>
              </>
            )}
            {formType === 'change_order' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center">
                  <FileSignature size={15} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-navy-900">Endringsordre (NS 8406)</h4>
                  <p className="text-[10px] text-slate-500 hidden sm:block">Varsle tillegg og fristforlengelse formelt</p>
                </div>
              </>
            )}
            {formType === 'sja' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <ShieldAlert size={15} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-navy-900">Sikker Jobb Analyse (SJA)</h4>
                  <p className="text-[10px] text-slate-500 hidden sm:block">Risikovurdering før risikofylt arbeid</p>
                </div>
              </>
            )}
            {formType === 'deviation' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center">
                  <AlertTriangle size={15} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-navy-900">Registrer Avvik / RUH</h4>
                  <p className="text-[10px] text-slate-500 hidden sm:block">Kvalitets- eller HMS-avvik</p>
                </div>
              </>
            )}
            {formType === 'time' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Timer size={15} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-navy-900">Timeføring</h4>
                  <p className="text-[10px] text-slate-500 hidden sm:block">Registrer timer på prosjekt</p>
                </div>
              </>
            )}
            {formType === 'task' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <ListTodo size={15} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-navy-900">Tildel Oppgave / Arbeidsordre</h4>
                  <p className="text-[10px] text-slate-500 hidden sm:block">Deleger oppgave med frist og varsel</p>
                </div>
              </>
            )}
            {formType === 'toolbox' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Sparkles size={15} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-navy-900">Skjemaer & Verktøy</h4>
                  <p className="text-[10px] text-slate-500 hidden sm:block">Velg funksjon du ønsker å åpne i chatten</p>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          title="Lukk skjema og gå tilbake"
        >
          <X size={17} />
        </button>
      </div>

      {/* Form Body */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 sm:p-6 custom-scrollbar pb-32 sm:pb-8">
        {formType === 'offer' && (
          <InChatOfferForm
            initialData={initialData}
            projects={projectsList}
            selectedProject={selectedProject}
            user={user}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={onSuccess}
          />
        )}

        {formType === 'change_order' && (
          <InChatChangeOrderForm
            initialData={initialData}
            projects={projectsList}
            selectedProject={selectedProject}
            user={user}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={onSuccess}
          />
        )}

        {formType === 'sja' && (
          <InChatSJAForm
            initialData={initialData}
            projects={projectsList}
            selectedProject={selectedProject}
            user={user}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={onSuccess}
          />
        )}

        {formType === 'deviation' && (
          <InChatDeviationForm
            initialData={initialData}
            projects={projectsList}
            selectedProject={selectedProject}
            user={user}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={onSuccess}
          />
        )}

        {formType === 'time' && (
          <InChatTimeForm
            initialData={initialData}
            projects={projectsList}
            selectedProject={selectedProject}
            user={user}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={onSuccess}
          />
        )}

        {formType === 'task' && (
          <InChatTaskForm
            initialData={initialData}
            projects={projectsList}
            selectedProject={selectedProject}
            user={user}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={onSuccess}
            onOpenOmnichannelModal={onOpenOmnichannelModal}
          />
        )}

        {formType === 'toolbox' && (
          <InChatToolboxMenu
            onSelect={(type, data) => onSwitchForm?.(type, data)}
          />
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 0. MESTERAI AUTOFILL & HISTORIKK ASSISTENT
// --------------------------------------------------------------------------------------
interface AIFormAutofillAssistantProps {
  formType: InChatFormType;
  projectId?: string;
  onApply: (data: any) => void;
}

function AIFormAutofillAssistant({ formType, projectId, onApply }: AIFormAutofillAssistantProps) {
  const [promptText, setPromptText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickTemplates: Record<string, Array<{ label: string; prompt: string; icon: string }>> = {
    offer: [
      { label: 'Totalrenovering Bad (6 m²)', prompt: 'Totalrenovering bad 6m2 med våtromsplater, rør-i-rør, membran, flis og elektro', icon: '🛀' },
      { label: 'Etterisolering & Kledning (80 m²)', prompt: 'Etterisolering 80m2 med 50mm isolasjon, vindsperre og ny dobbelfals kledning', icon: '🏡' },
      { label: '6 stk 3-lags Lavenergivinduer', prompt: 'Utskifting av 6 stk 3-lags vinduer inkludert foring og listing', icon: '🪟' },
      { label: 'Sikringsskap & El-anlegg', prompt: 'Oppgradering av sikringsskap til 12 kurser og nye kurser', icon: '⚡' }
    ],
    change_order: [
      { label: '6 ekstra downlights (Kunde)', prompt: '6 ekstra downlights og dimmer i stue bestilt av byggherre', icon: '💡' },
      { label: 'Skjult råteskade i bjelkelag', prompt: 'Skjult råteskade i bjelkelag under gammelt sluk', icon: '🪵' },
      { label: 'Ekstra avretting av gulv', prompt: 'Ekstra avretting av skjevt undergulv med 25 sekker masse', icon: '🧱' }
    ],
    sja: [
      { label: 'Stillas & Takarbeid (> 2m)', prompt: 'Arbeid i stillas og på tak over 2 meter', icon: '🧗' },
      { label: 'Varme arbeider & Taktekking', prompt: 'Varme arbeider med gassbrenner og takbelegg', icon: '🔥' },
      { label: 'Rivearbeid & Støv/Asbest', prompt: 'Rivearbeid av bærende konstruksjon og støvhåndtering', icon: '🏗️' }
    ],
    deviation: [
      { label: 'Mangler trykktest (Lukkesperre)', prompt: 'Mangler trykktest for rør-i-rør før lukking av sjakt', icon: '💧' },
      { label: 'Støvflukt ved gipskapping', prompt: 'Støvflukt ved gipskapping innendørs uten avsug', icon: '🧹' },
      { label: 'Fall mot sluk < 1:100 (TEK17)', prompt: 'Fall mot sluk utilstrekkelig iht TEK17', icon: '📐' }
    ],
    time: [
      { label: 'Ordinær dag (7.5 t)', prompt: 'Ordinært tømrer- og fagarbeid utført på byggeplass', icon: '🔨' },
      { label: 'Overtid ferdigstillelse (3.5 t)', prompt: 'Overtidsarbeid for å nå lukkedato', icon: '⏱️' },
      { label: 'Befaring & oppmåling (2.0 t)', prompt: 'Befaring, kontrollmåling og materialbestilling', icon: '🚗' }
    ],
    task: [
      { label: 'Trekke rørkurs til kjøkken', prompt: 'Trekke rørkurs til kjøkken og fordelerskap', icon: '⚡' },
      { label: 'Montere dampsperre & klemring', prompt: 'Montere dampsperre og klemring på sluk i bad', icon: '🔨' },
      { label: 'Fuktmåling før lukking', prompt: 'Fuktmåling og tverrfaglig kontroll før lukking', icon: '🔍' }
    ]
  };

  const currentTemplates = quickTemplates[formType] || [];

  const handleRunAutofill = async (customPrompt?: string) => {
    const textToRun = (customPrompt || promptText).trim();
    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null;
      const res = await fetch('/api/agent/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'autofill_form',
          formType,
          prompt: textToRun,
          projectId,
          userToken: token
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Status ${res.status}`);
      }
      const json = await res.json();
      if (json.data) {
        onApply(json.data);
        if (!customPrompt) setPromptText('');
      } else {
        toast.error('Kunne ikke autofylle skjemaet');
      }
    } catch (e: any) {
      console.error('Autofill error:', e);
      toast.error(e.message || 'Autofyll feilet. Vennligst prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const placeholderText = {
    offer: 'Hva skal kalkylen inneholde? (f.eks: Totalrenovere bad 6m², eller etterisolere 80m²)...',
    change_order: 'Hva er endringen? (f.eks: 8 ekstra downlights i stue eller råteskade under sluk)...',
    sja: 'Hvilken arbeidsoperasjon skal analyseres? (f.eks: Stillasarbeid eller varme arbeider)...',
    deviation: 'Beskriv avviket (f.eks: Mangler trykktest for rør-i-rør eller feil fall mot sluk)...',
    time: 'Beskriv arbeidet (f.eks: Lekting og gipsing i 2. etasje)...',
    task: 'Beskriv oppgaven (f.eks: Montere dampsperre og klemring før kl. 14)...',
    toolbox: ''
  }[formType] || 'Beskriv hva AI skal fylle ut...';

  return (
    <div className="p-3.5 sm:p-4 bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 rounded-2xl text-white shadow-sm border border-indigo-500/20 space-y-3 mb-3 max-w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-electric-500/20 text-electric-300 border border-electric-500/30 flex items-center justify-center shrink-0">
            <Sparkles size={14} className="text-electric-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h5 className="text-xs font-black tracking-tight text-white flex flex-wrap items-center gap-1.5">
              <span>MesterAI Autofyll & Historikk</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                100% Autonom
              </span>
            </h5>
            <p className="text-[10px] text-slate-300 leading-tight mt-0.5">
              Beregner timer, priser og standardtekst basert på historiske kalkyler og NS 8406.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
        <input 
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleRunAutofill();
            }
          }}
          placeholder={placeholderText}
          className="w-full sm:flex-1 min-w-0 px-3 py-2.5 bg-white/10 border border-white/15 rounded-xl text-xs text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-electric-400 outline-none transition-all"
        />
        <button
          type="button"
          onClick={() => handleRunAutofill()}
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2.5 bg-electric-500 hover:bg-electric-400 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles size={13} />
          )}
          <span>{isLoading ? 'Beregner...' : '✨ AI Fyll Ut'}</span>
        </button>
      </div>

      {currentTemplates.length > 0 && (
        <div className="pt-2 border-t border-white/10 space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Ofte brukt fra historikk:
          </span>
          <div className="flex flex-wrap gap-1.5 max-w-full">
            {currentTemplates.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRunAutofill(t.prompt)}
                disabled={isLoading}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer disabled:opacity-50 active:scale-98 max-w-full"
              >
                <span className="shrink-0">{t.icon}</span>
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 1. IN-CHAT TILBUDSBYGGER & KALKYLE
// --------------------------------------------------------------------------------------
function InChatOfferForm({
  initialData,
  projects,
  selectedProject,
  user,
  isSubmitting,
  setIsSubmitting,
  onSuccess
}: {
  initialData?: any;
  projects: any[];
  selectedProject?: any;
  user: any;
  isSubmitting: boolean;
  setIsSubmitting: (b: boolean) => void;
  onSuccess: (msg: string, actionData?: any) => void;
}) {
  const [projectId, setProjectId] = useState<string>(initialData?.projectId || selectedProject?.id || '');
  const [clientName, setClientName] = useState<string>(initialData?.clientName || selectedProject?.clientName || '');
  const [clientEmail, setClientEmail] = useState<string>(initialData?.clientEmail || selectedProject?.clientEmail || '');
  const [title, setTitle] = useState<string>(() => sanitizePlainText(initialData?.title || 'Pristilbud: '));
  const [description, setDescription] = useState<string>(() => sanitizePlainText(initialData?.description || ''));
  const [items, setItems] = useState<OfferItem[]>(() => {
    if (initialData?.items && Array.isArray(initialData.items) && initialData.items.length > 0) {
      return initialData.items.map((it: any) => ({
        description: it.description || '',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'timer',
        pricePerUnit: Number(it.pricePerUnit) || 0,
        total: Math.round((Number(it.quantity) || 1) * (Number(it.pricePerUnit) || 0))
      }));
    }
    return [
      { description: 'Fagarbeid og utførelse', quantity: 16, unit: 'timer', pricePerUnit: 890, total: 14240 },
      { description: 'Materiell og forbruksmateriell', quantity: 1, unit: 'stk', pricePerUnit: 8500, total: 8500 }
    ];
  });

  const handleApplyAutofill = (data: any) => {
    if (data.title) setTitle(sanitizePlainText(data.title));
    if (data.description) setDescription(sanitizePlainText(data.description));
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      setItems(data.items.map((it: any) => ({
        description: it.description || 'Fagarbeid',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'timer',
        pricePerUnit: Number(it.pricePerUnit) || 0,
        total: Math.round((Number(it.quantity) || 1) * (Number(it.pricePerUnit) || 0))
      })));
    }
    if (data.clientName && !clientName) setClientName(data.clientName);
    if (data.clientEmail && !clientEmail) setClientEmail(data.clientEmail);
    if (data.projectId && !projectId) setProjectId(data.projectId);
    toast.success('Kalkyle autofylt fra MesterAI og historikk!');
  };

  const handleProjectChange = (pId: string) => {
    setProjectId(pId);
    const p = projects.find(x => x.id === pId);
    if (p) {
      if (p.clientName) setClientName(p.clientName);
      if (p.clientEmail) setClientEmail(p.clientEmail);
      if (!title || title === 'Pristilbud: ') setTitle(`Pristilbud: ${p.name}`);
    }
  };

  const handleUpdateItem = (index: number, field: keyof OfferItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'pricePerUnit') {
      const q = field === 'quantity' ? Number(value) : current.quantity;
      const p = field === 'pricePerUnit' ? Number(value) : current.pricePerUnit;
      current.total = Math.round((q || 0) * (p || 0));
    }
    updated[index] = current;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { description: 'Ny post', quantity: 1, unit: 'timer', pricePerUnit: 890, total: 890 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('Tilbudet må inneholde minst én linjepost.');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const sumExVat = items.reduce((acc, it) => acc + (it.total || 0), 0);
  const vatAmount = Math.round(sumExVat * 0.25);
  const totalIncVat = sumExVat + vatAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) {
      toast.error('Vennligst fyll ut kundenavn og tittel på tilbudet.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = initialData?.token || 'off_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      const offerDoc = {
        projectId: projectId || null,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        title: title.trim(),
        description: description.trim(),
        items,
        totalAmount: sumExVat,
        totalIncVat,
        status: 'draft',
        token,
        companyId: user?.companyId || 'comp-001',
        companyName: user?.company || 'Mester Entreprenør AS',
        createdBy: user?.id || 'admin_user',
        authorName: user?.displayName || 'Byggmester',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const ref = await addDoc(collection(db, 'offers'), offerDoc);

      try {
        await addDoc(collection(db, 'system_offers'), {
          recipientName: clientName.trim(),
          recipientEmail: clientEmail.trim(),
          companyName: user?.company || 'Mester Entreprenør AS',
          customPrice: sumExVat,
          totalIncVat,
          title: title.trim(),
          token,
          status: 'pending',
          modules: ['ks_system', 'hms_module', 'offers'],
          createdAt: serverTimestamp()
        });
      } catch (syncErr) {
        console.warn('Sync to system_offers skipped:', syncErr);
      }

      const offerLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/?offerToken=${token}`;

      toast.success('Pristilbud opprettet og lagret!');
      onSuccess(
        `✅ **Pristilbud opprettet:** "${title}"\n- **Kunde:** ${clientName}\n- **Sum eks. mva:** kr ${sumExVat.toLocaleString('no-NO')},-\n- **Sum inkl. 25% mva:** kr ${totalIncVat.toLocaleString('no-NO')},-\n- **Lenke til tilbud:** [Åpne tilbud](${offerLink})`,
        { 
          type: 'offer_created', 
          offerId: ref.id, 
          token, 
          offerLink,
          offerData: { ...offerDoc, id: ref.id }
        }
      );
    } catch (err) {
      console.error('Error creating offer:', err);
      toast.error('Kunne ikke lagre tilbudet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* AI Autofill Assistant with Historical Presets */}
      <AIFormAutofillAssistant
        formType="offer"
        projectId={projectId}
        onApply={handleApplyAutofill}
      />

      {/* Project & Client Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">1. Prosjekt & Oppdragsgiver</h5>

        {projects.length > 0 && (
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Knytt til eksisterende prosjekt</label>
            <select
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">-- Nytt frittstående tilbud --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.clientName ? `(${p.clientName})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Kundenavn *</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="F.eks. Ola Nordmann"
              required
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Kunde e-post</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="kunde@eksempel.no"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Tittel på tilbud *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="F.eks. Totalrenovering av bad og våtrom"
            required
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Kort beskrivelse / forbehold</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Beskriv omfanget eller standard forbehold iht. NS 8406..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-500 resize-none"
          />
        </div>
      </div>

      {/* Line Items & Calculations Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">2. Kalkyleposter & Priser</h5>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus size={13} />
            <span>Legg til post</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {items.map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                  placeholder="Postbeskrivelse..."
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Slett post"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-2 pt-1">
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold mb-0.5">Antall</span>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold mb-0.5">Enhet</span>
                  <select
                    value={item.unit}
                    onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                  >
                    <option value="timer">timer</option>
                    <option value="stk">stk</option>
                    <option value="m2">m²</option>
                    <option value="lm">lm</option>
                    <option value="kg">kg</option>
                    <option value="fastpris">fast</option>
                  </select>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold mb-0.5">Enhetspris (kr)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.pricePerUnit}
                    onChange={(e) => handleUpdateItem(idx, 'pricePerUnit', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold mb-0.5">Sum</span>
                  <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-200/80 rounded-lg text-xs font-black text-slate-900 flex items-center justify-between">
                    <span>{item.total.toLocaleString('no-NO')} kr</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Calculation Summary Footer */}
        <div className="pt-3 border-t border-slate-200 space-y-1 text-right">
          <div className="text-xs text-slate-600">
            Sum eks. mva: <strong className="text-navy-900 font-black">{sumExVat.toLocaleString('no-NO')} kr</strong>
          </div>
          <div className="text-xs text-slate-500">
            MVA (25%): <span className="font-bold">{vatAmount.toLocaleString('no-NO')} kr</span>
          </div>
          <div className="text-sm font-black text-emerald-700 pt-1">
            Totalbeløp inkl. mva: {totalIncVat.toLocaleString('no-NO')} kr
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Calculator size={16} />
        <span>{isSubmitting ? 'Oppretter tilbud...' : 'Opprett & Lagre Tilbud'}</span>
      </button>
    </form>
  );
}

// --------------------------------------------------------------------------------------
// 2. IN-CHAT ENDRINGSORDRE (NS 8406)
// --------------------------------------------------------------------------------------
function InChatChangeOrderForm({
  initialData,
  projects,
  selectedProject,
  user,
  isSubmitting,
  setIsSubmitting,
  onSuccess
}: {
  initialData?: any;
  projects: any[];
  selectedProject?: any;
  user: any;
  isSubmitting: boolean;
  setIsSubmitting: (b: boolean) => void;
  onSuccess: (msg: string, actionData?: any) => void;
}) {
  const [projectId, setProjectId] = useState<string>(initialData?.projectId || selectedProject?.id || projects[0]?.id || '');
  const [title, setTitle] = useState<string>(() => sanitizePlainText(initialData?.title || 'Endring: '));
  const [description, setDescription] = useState<string>(() => sanitizePlainText(initialData?.description || ''));
  const [cause, setCause] = useState<string>(initialData?.cause || 'client_request');
  const [amountExVat, setAmountExVat] = useState<number>(Number(initialData?.amountExVat) || 12500);
  const [impactDays, setImpactDays] = useState<number>(Number(initialData?.impactDays) || 3);

  const handleApplyAutofill = (data: any) => {
    if (data.title) setTitle(sanitizePlainText(data.title));
    if (data.description) setDescription(sanitizePlainText(data.description));
    if (data.cause) setCause(data.cause);
    if (data.amountExVat !== undefined) setAmountExVat(Number(data.amountExVat));
    if (data.impactDays !== undefined) setImpactDays(Number(data.impactDays));
    if (data.projectId && !projectId) setProjectId(data.projectId);
    toast.success('Endringsordre autofylt iht. NS 8406!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vennligst oppgi en tittel på endringen.');
      return;
    }

    const proj = projects.find(p => p.id === projectId) || selectedProject || {
      id: projectId || 'proj-gen',
      name: 'Gjeldende prosjekt'
    };

    setIsSubmitting(true);
    try {
      const created = await changeOrderService.createChangeOrder({
        project: proj as Project,
        title: title.trim(),
        description: description.trim(),
        cause: cause as any,
        amountExVat: Number(amountExVat) || 0,
        impactDays: Number(impactDays) || 0,
        authorId: user?.id || 'admin_user',
        authorName: user?.displayName || 'Byggmester'
      });

      toast.success(`Endringsordre #${created.changeNumber} er opprettet!`);
      onSuccess(
        `✅ **Endringsordre #${created.changeNumber} opprettet:** "${title}"\n- **Prosjekt:** ${proj.name}\n- **Vederlagskonsekvens:** kr ${amountExVat.toLocaleString('no-NO')},- eks. mva.\n- **Fristkonsekvens:** +${impactDays} virkedager\n- **Hjemmel:** NS 8406 varslet uten ugrunnet opphold`,
        { type: 'change_order_created', changeOrder: created }
      );
    } catch (err) {
      console.error('Error creating change order:', err);
      toast.error('Kunne ikke opprette endringsordre.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* AI Autofill Assistant with Historical Presets */}
      <AIFormAutofillAssistant
        formType="change_order"
        projectId={projectId}
        onApply={handleApplyAutofill}
      />

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">Endringsopplysninger iht. NS 8406</h5>

        {projects.length > 0 && (
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Prosjekt *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-rose-500"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Tittel på endring *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="F.eks. Tillegg for ekstra membran og avretting"
            required
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-rose-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Årsak / hjemmel</label>
          <select
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-rose-500"
          >
            <option value="client_request">Byggherreendring / bestilling</option>
            <option value="unforeseen_conditions">Uforutsette grunn- eller bygningsforhold (NS 8406 § 23)</option>
            <option value="design_defect">Prosjekteringssvikt / feil i tegningsgrunnlag</option>
            <option value="delay_other_contractor">Hindring fra sideentreprenør</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Tilleggsvederlag (kr eks. mva)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={amountExVat}
              onChange={(e) => setAmountExVat(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Fristforlengelse (dager)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={impactDays}
              onChange={(e) => setImpactDays(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-rose-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Begrunnelse & beskrivelse</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Beskriv hvorfor endringen oppsto og hvilke konsekvenser det har for fremdriften..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-rose-500 resize-none"
          />
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed font-medium">
          ⚖️ <strong>Varsling iht. NS 8406:</strong> Entreprenøren må varsle uten ugrunnet opphold for å unngå preklusjon (tap av rett til vederlagsjustering og fristforlengelse).
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <FileSignature size={16} />
        <span>{isSubmitting ? 'Varsler endring...' : 'Opprett & Varsle Endringsordre'}</span>
      </button>
    </form>
  );
}

// --------------------------------------------------------------------------------------
// 3. IN-CHAT SIKKER JOBB ANALYSE (SJA)
// --------------------------------------------------------------------------------------
function InChatSJAForm({
  initialData,
  projects,
  selectedProject,
  user,
  isSubmitting,
  setIsSubmitting,
  onSuccess
}: {
  initialData?: any;
  projects: any[];
  selectedProject?: any;
  user: any;
  isSubmitting: boolean;
  setIsSubmitting: (b: boolean) => void;
  onSuccess: (msg: string, actionData?: any) => void;
}) {
  const [projectId, setProjectId] = useState<string>(initialData?.projectId || selectedProject?.id || projects[0]?.id || '');
  const [jobTitle, setJobTitle] = useState<string>(initialData?.jobTitle || 'SJA: Takarbeid og stillas');
  const [location, setLocation] = useState<string>(initialData?.location || selectedProject?.location || 'Byggeplass');
  const [participants, setParticipants] = useState<string>(initialData?.participants || user?.displayName || 'Tømrerteam');
  const [hazards, setHazards] = useState<string[]>(initialData?.hazards || ['Fall fra høyde (> 2m)', 'Kapp- og gjerdesag skader']);
  const [mitigations, setMitigations] = useState<string[]>(initialData?.mitigations || ['Godkjent stillas med grønt skilt', 'Bruk av fallsikringssele ved montering', 'Briller og hørselvern ved kapping']);

  const handleApplyAutofill = (data: any) => {
    if (data.jobTitle) setJobTitle(data.jobTitle);
    if (data.location && (!location || location === 'Byggeplass')) setLocation(data.location);
    if (data.hazards && Array.isArray(data.hazards)) setHazards(data.hazards);
    if (data.mitigations && Array.isArray(data.mitigations)) setMitigations(data.mitigations);
    if (data.projectId && !projectId) setProjectId(data.projectId);
    toast.success('SJA autofylt med risikovurdering og vernetiltak!');
  };

  const commonHazards = [
    'Fall fra høyde (> 2 meter)',
    'Gjenstander som faller ned',
    'Kutt- og klemskader (sag/verktøy)',
    'Støv- og asbesteksponering',
    'Elektrisk spenning / ledninger',
    'Tunge løft og ergonomisk risiko'
  ];

  const toggleHazard = (h: string) => {
    if (hazards.includes(h)) setHazards(hazards.filter(x => x !== h));
    else setHazards([...hazards, h]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) {
      toast.error('Oppgi tittel på arbeidsoperasjonen.');
      return;
    }

    setIsSubmitting(true);
    try {
      const proj = projects.find(p => p.id === projectId) || selectedProject || { name: 'Byggeplass' };
      const risikoer = hazards.map((h, idx) => ({
        aktivitet: jobTitle.trim(),
        risiko: h,
        tiltak: mitigations[idx] || mitigations[0] || 'Følg gjeldende sikkerhetsinstruks'
      }));

      const sjaDoc = {
        projectId: projectId || null,
        projectName: proj.name,
        title: jobTitle.trim(),
        jobTitle: jobTitle.trim(),
        task: jobTitle.trim(),
        location: location.trim(),
        participants: participants.trim(),
        hazards,
        mitigations,
        risikoer,
        utstyr: ['Vernehjelm m/hakestropp', 'Vernetøy kl. 2', 'Vernesko S3', 'Vernebriller / Øyevern', 'Hørselvern'],
        tek17Reference: 'Byggherreforskriften § 18 / TEK17',
        status: 'approved',
        authorId: user?.id || 'admin_user',
        authorName: user?.displayName || 'HMS-ansvarlig',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const [ref] = await Promise.all([
        addDoc(collection(db, 'sja_documents'), sjaDoc),
        addDoc(collection(db, 'sja_reports'), sjaDoc)
      ]);
      toast.success('SJA er godkjent og lagret!');
      onSuccess(
        `🛡️ **Sikker Jobb Analyse (SJA) godkjent:** "${jobTitle}"\n- **Prosjekt:** ${proj.name}\n- **Farer identifisert:** ${hazards.length} stk\n- **Vernetiltak iverksatt:** ${mitigations.length} stk\n- **Deltakere:** ${participants}\n- **Status:** Lovkrav iht. Byggherreforskriften § 18 oppfylt.`,
        { type: 'sja_created', sjaId: ref.id }
      );
    } catch (err) {
      console.error('Error saving SJA:', err);
      toast.error('Kunne ikke lagre SJA.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* AI Autofill Assistant with Historical Presets */}
      <AIFormAutofillAssistant
        formType="sja"
        projectId={projectId}
        onApply={handleApplyAutofill}
      />

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">Sikker Jobb Analyse (SJA)</h5>

        {projects.length > 0 && (
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Prosjekt</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Arbeidsoperasjon som skal utføres *</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="F.eks. Rivearbeid bærekonstruksjon / Taktekking"
            required
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Arbeidssted / lokasjon</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="F.eks. Takplan nord / Stillas 3. etg"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Deltakere / håndverkere</label>
            <input
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Navn på de som skal utføre arbeidet"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Identifiserte risikofaktorer (klikk for å velge)</label>
          <div className="flex flex-wrap gap-1.5">
            {commonHazards.map((h, i) => {
              const isChecked = hazards.includes(h);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleHazard(h)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                    isChecked
                      ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  <Check size={12} className={isChecked ? "opacity-100" : "opacity-0"} />
                  <span>{h}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Vernetiltak og sikring</label>
          <textarea
            value={mitigations.join('\n')}
            onChange={(e) => setMitigations(e.target.value.split('\n').filter(Boolean))}
            rows={3}
            placeholder="Skriv ett tiltak per linje (f.eks. sperreområde på bakkeplan, vernebriller)..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <ShieldAlert size={16} />
        <span>{isSubmitting ? 'Lagrer SJA...' : 'Godkjenn & Lagre SJA'}</span>
      </button>
    </form>
  );
}

// --------------------------------------------------------------------------------------
// 4. IN-CHAT REGISTRER AVVIK / RUH
// --------------------------------------------------------------------------------------
function InChatDeviationForm({
  initialData,
  projects,
  selectedProject,
  user,
  isSubmitting,
  setIsSubmitting,
  onSuccess
}: {
  initialData?: any;
  projects: any[];
  selectedProject?: any;
  user: any;
  isSubmitting: boolean;
  setIsSubmitting: (b: boolean) => void;
  onSuccess: (msg: string, actionData?: any) => void;
}) {
  const [projectId, setProjectId] = useState<string>(initialData?.projectId || selectedProject?.id || projects[0]?.id || '');
  const [title, setTitle] = useState<string>(() => sanitizePlainText(initialData?.title || ''));
  const [category, setCategory] = useState<string>(initialData?.category || 'quality');
  const [severity, setSeverity] = useState<string>(initialData?.severity || 'medium');
  const [description, setDescription] = useState<string>(() => sanitizePlainText(initialData?.description || ''));
  const [actionTaken, setActionTaken] = useState<string>(() => sanitizePlainText(initialData?.actionTaken || ''));

  const handleApplyAutofill = (data: any) => {
    if (data.title) setTitle(sanitizePlainText(data.title));
    if (data.description) setDescription(sanitizePlainText(data.description));
    if (data.category) setCategory(data.category);
    if (data.severity) setSeverity(data.severity);
    if (data.actionTaken) setActionTaken(sanitizePlainText(data.actionTaken));
    if (data.projectId && !projectId) setProjectId(data.projectId);
    toast.success('Avvik autofylt!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Oppgi tittel og beskrivelse av avviket.');
      return;
    }

    setIsSubmitting(true);
    try {
      const proj = projects.find(p => p.id === projectId) || selectedProject || { name: 'Generelt' };
      const devDoc = {
        projectId: projectId || null,
        projectName: proj.name,
        title: title.trim(),
        category,
        severity,
        description: description.trim(),
        actionTaken: actionTaken.trim(),
        status: 'open',
        authorId: user?.id || 'admin_user',
        authorName: user?.displayName || 'Håndverker',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const ref = await addDoc(collection(db, 'deviations'), devDoc);
      toast.success('Avvik registrert!');
      onSuccess(
        `⚠️ **Avvik registrert:** "${title}"\n- **Prosjekt:** ${proj.name}\n- **Alvorlighetsgrad:** ${severity.toUpperCase()}\n- **Kategori:** ${category}\n- **Strakstiltak:** ${actionTaken || 'Vurderes av byggeleder'}\n- **Status:** Åpent (registrert i KS-systemet)`,
        { type: 'deviation_created', deviationId: ref.id }
      );
    } catch (err) {
      console.error('Error recording deviation:', err);
      toast.error('Kunne ikke registrere avvik.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* AI Autofill Assistant with Historical Presets */}
      <AIFormAutofillAssistant
        formType="deviation"
        projectId={projectId}
        onApply={handleApplyAutofill}
      />

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">Avviksregistrering (KS & HMS)</h5>

        {projects.length > 0 && (
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Prosjekt *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Kort tittel på avviket *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="F.eks. Skade på dampsperre ved rørgjennomføring"
            required
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-red-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
            >
              <option value="quality">Kvalitet / Faglig utførelse</option>
              <option value="hms">HMS / Farlig forhold (RUH)</option>
              <option value="material">Materialfeil / feilleveranse</option>
              <option value="drawing">Tegningsavvik</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Alvorlighetsgrad</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
            >
              <option value="low">Lav (Mindre betydning)</option>
              <option value="medium">Middels (Må utbedres)</option>
              <option value="high">Høy (Stanser arbeidet)</option>
              <option value="critical">Kritisk (Lukkesperre)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Beskrivelse av hva som hendte *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            required
            placeholder="Beskriv avviket, årsak og hvilken konsekvens det medfører..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white resize-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Strakstiltak utført</label>
          <input
            type="text"
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            placeholder="F.eks. Tettet midlertidig med tape, sperret av området"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <AlertTriangle size={16} />
        <span>{isSubmitting ? 'Registrerer avvik...' : 'Registrer Avvik'}</span>
      </button>
    </form>
  );
}

// --------------------------------------------------------------------------------------
// 5. IN-CHAT TIMEFØRING
// --------------------------------------------------------------------------------------
function InChatTimeForm({
  initialData,
  projects,
  selectedProject,
  user,
  isSubmitting,
  setIsSubmitting,
  onSuccess
}: {
  initialData?: any;
  projects: any[];
  selectedProject?: any;
  user: any;
  isSubmitting: boolean;
  setIsSubmitting: (b: boolean) => void;
  onSuccess: (msg: string, actionData?: any) => void;
}) {
  const [projectId, setProjectId] = useState<string>(initialData?.projectId || selectedProject?.id || projects[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState<number>(Number(initialData?.hours) || 7.5);
  const [category, setCategory] = useState<string>('arbeid');
  const [description, setDescription] = useState<string>(() => sanitizePlainText(initialData?.description || ''));

  const handleApplyAutofill = (data: any) => {
    if (data.hours !== undefined) setHours(Number(data.hours));
    if (data.category) setCategory(data.category);
    if (data.description) setDescription(sanitizePlainText(data.description));
    if (data.projectId && !projectId) setProjectId(data.projectId);
    toast.success('Timeføring autofylt!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || hours <= 0) {
      toast.error('Velg prosjekt og oppgi gyldig antall timer.');
      return;
    }

    setIsSubmitting(true);
    try {
      const proj = projects.find(p => p.id === projectId) || selectedProject || { name: 'Prosjekt' };
      const timeDoc = {
        projectId,
        projectName: proj.name,
        date,
        hours: Number(hours),
        category,
        description: description.trim(),
        userId: user?.id || 'user_admin',
        userName: user?.displayName || 'Håndverker',
        company: user?.company || 'Mester Entreprenør AS',
        status: 'approved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const ref = await addDoc(collection(db, 'time_entries'), timeDoc);
      toast.success(`${hours} timer ført på ${proj.name}!`);
      onSuccess(
        `⏱️ **Timer registrert:** ${hours} timer ført på **${proj.name}**\n- **Dato:** ${date}\n- **Kategori:** ${category === 'overtid' ? 'Overtid' : category === 'reise' ? 'Reisetid' : 'Ordinært arbeid'}\n- **Beskrivelse:** ${description || 'Fagarbeid utført'}\n- **Status:** Godkjent i timeliste`,
        { type: 'time_registered', timeId: ref.id }
      );
    } catch (err) {
      console.error('Error recording time:', err);
      toast.error('Kunne ikke føre timer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* AI Autofill Assistant with Historical Presets */}
      <AIFormAutofillAssistant
        formType="time"
        projectId={projectId}
        onApply={handleApplyAutofill}
      />

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">Timeføring</h5>

        {projects.length > 0 && (
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Prosjekt *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Dato *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Antall timer *</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Type timer</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
          >
            <option value="arbeid">Ordinært arbeid</option>
            <option value="overtid">Overtid 50%</option>
            <option value="overtid_100">Overtid 100%</option>
            <option value="reise">Reise / kjøring</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Arbeidsbeskrivelse</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Hva har du jobbet med i dag? F.eks. Montering av gipsvegger og isolering..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Timer size={16} />
        <span>{isSubmitting ? 'Fører timer...' : 'Før Timer'}</span>
      </button>
    </form>
  );
}

// --------------------------------------------------------------------------------------
// 6. TOOLBOX QUICK MENU
// --------------------------------------------------------------------------------------
function InChatToolboxMenu({
  onSelect
}: {
  onSelect: (type: InChatFormType, data?: any) => void;
}) {
  const tools = [
    {
      id: 'offer',
      title: 'Tilbudsbygger & Kalkyle',
      desc: 'Beregne timer, materialpriser, påslag og lagre profesjonelt tilbud',
      icon: Calculator,
      color: 'bg-emerald-500 text-white'
    },
    {
      id: 'change_order',
      title: 'Endringsordre (NS 8406)',
      desc: 'Formell varsling av tilleggsvederlag og fristforlengelse',
      icon: FileSignature,
      color: 'bg-rose-500 text-white'
    },
    {
      id: 'sja',
      title: 'Sikker Jobb Analyse (SJA)',
      desc: 'Risikovurdering og vernetiltak før farlig arbeid',
      icon: ShieldAlert,
      color: 'bg-amber-500 text-white'
    },
    {
      id: 'deviation',
      title: 'Registrer Avvik / RUH',
      desc: 'Dokumenter feil, kvalitetsavvik eller uønskede hendelser',
      icon: AlertTriangle,
      color: 'bg-red-600 text-white'
    },
    {
      id: 'time',
      title: 'Timeføring',
      desc: 'Registrer timer og overtid rett på prosjektet',
      icon: Timer,
      color: 'bg-blue-600 text-white'
    },
    {
      id: 'task',
      title: 'Tildel Oppgave / Arbeidsordre',
      desc: 'Deleger oppgave til fagarbeider med tidsfrist og kanalvarsling',
      icon: ListTodo,
      color: 'bg-indigo-600 text-white'
    }
  ];

  return (
    <div className="space-y-3">
      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <h5 className="text-xs font-black text-navy-900 mb-1">Systemets Verktøykasse i Chatten</h5>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Velg en funksjon under for å fylle ut skjemaet direkte inne i chatvinduet:
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id as InChatFormType)}
              className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 rounded-2xl text-left transition-all flex items-center gap-3.5 group cursor-pointer shadow-2xs active:scale-98"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs", t.color)}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-navy-900 group-hover:text-electric-700 transition-colors">
                  {t.title}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1">
                  {t.desc}
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-navy-900 transition-colors shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 7. IN-CHAT TILDEL OPPGAVE & ARBEIDSORDRE
// --------------------------------------------------------------------------------------
function InChatTaskForm({
  initialData,
  projects,
  selectedProject,
  user,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onOpenOmnichannelModal
}: {
  initialData?: any;
  projects: any[];
  selectedProject?: any;
  user: any;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  onSuccess: (msg: string, data?: any) => void;
  onOpenOmnichannelModal?: () => void;
}) {
  const [projectId, setProjectId] = useState(initialData?.projectId || selectedProject?.id || (projects[0]?.id || ''));
  const [title, setTitle] = useState(() => sanitizePlainText(initialData?.title || ''));
  const [description, setDescription] = useState(() => sanitizePlainText(initialData?.description || ''));
  const [assignedTo, setAssignedTo] = useState(initialData?.assignedTo || '');
  const [isCustomPerson, setIsCustomPerson] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<Array<{ id: string; name: string; role?: string; trade?: string }>>([]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(initialData?.priority || 'medium');
  const [deadline, setDeadline] = useState(initialData?.deadline || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);

  // Omnichannel integration settings
  const [omniSettings, setOmniSettings] = useState<OmnichannelSettings>(getStoredOmnichannelSettings);

  // Favoritter lagres i localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ks_task_favorite_assignees');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setOmniSettings(getStoredOmnichannelSettings());
    };
    window.addEventListener('omnichannel_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('omnichannel_settings_updated', handleSettingsUpdate);
  }, []);

  const hasDiscord = Boolean(omniSettings.discordEnabled && omniSettings.discordWebhook?.trim());
  const hasSlack = Boolean(omniSettings.slackEnabled && omniSettings.slackWebhook?.trim());
  const hasTeams = Boolean(omniSettings.teamsEnabled && omniSettings.teamsWebhook?.trim());

  const [notifyDiscord, setNotifyDiscord] = useState(hasDiscord);
  const [notifySlack, setNotifySlack] = useState(hasSlack);
  const [notifyTeams, setNotifyTeams] = useState(hasTeams);

  useEffect(() => {
    setNotifyDiscord(hasDiscord);
    setNotifySlack(hasSlack);
    setNotifyTeams(hasTeams);
  }, [hasDiscord, hasSlack, hasTeams]);

  const activeProj = projects.find(p => p.id === projectId) || selectedProject || { name: 'Byggeprosjekt' };

  // Last inn faktisk registrerte personer fra bedrift, prosjekt, brukere og mannskap
  useEffect(() => {
    let isMounted = true;
    async function loadPersonnel() {
      try {
        const [usersSnap, crewSnap] = await Promise.all([
          getDocs(collection(db, 'users')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'crew')).catch(() => ({ docs: [] }))
        ]);

        const map = new Map<string, { id: string; name: string; role?: string; trade?: string }>();

        // 1. Innlogget bruker
        const currentName = user?.displayName || user?.name || (user?.email ? user.email.split('@')[0] : '');
        if (currentName) {
          map.set(currentName.toLowerCase(), {
            id: user?.id || user?.uid || 'current_user',
            name: currentName,
            role: user?.role === 'admin' ? 'Leder / Byggmester' : user?.role === 'manager' ? 'Byggeplassleder' : 'Meg selv',
            trade: user?.trade
          });
        }

        // 2. Prosjektleder & teammedlemmer på aktivt prosjekt
        if (activeProj?.projectManager) {
          const pm = String(activeProj.projectManager).trim();
          if (pm && !map.has(pm.toLowerCase())) {
            map.set(pm.toLowerCase(), {
              id: 'pm-' + pm,
              name: pm,
              role: 'Prosjektleder'
            });
          }
        }
        if (Array.isArray(activeProj?.teamMembers)) {
          activeProj.teamMembers.forEach((m: any) => {
            const mStr = typeof m === 'string' ? m.trim() : (m?.name || '').trim();
            if (mStr && !map.has(mStr.toLowerCase())) {
              map.set(mStr.toLowerCase(), {
                id: 'member-' + mStr,
                name: mStr,
                role: 'Prosjektteam'
              });
            }
          });
        }

        // 3. Registrerte brukere fra `users`
        usersSnap.docs.forEach((doc: any) => {
          const d = doc.data();
          const name = (d.displayName || d.name || (d.email ? d.email.split('@')[0] : '')).trim();
          if (name && !map.has(name.toLowerCase())) {
            map.set(name.toLowerCase(), {
              id: doc.id,
              name,
              role: d.role === 'admin' ? 'Leder / Admin' : d.role === 'manager' ? 'Byggeplassleder' : (d.trade || 'Håndverker'),
              trade: d.trade
            });
          }
        });

        // 4. Mannskap fra `crew`
        crewSnap.docs.forEach((doc: any) => {
          const d = doc.data();
          const name = (d.name || '').trim();
          if (name && !map.has(name.toLowerCase())) {
            map.set(name.toLowerCase(), {
              id: doc.id,
              name,
              role: d.role || d.trade || 'Mannskap',
              trade: d.trade
            });
          }
        });

        if (isMounted) {
          const list = Array.from(map.values());
          setRegisteredUsers(list);

          // Forhåndsvelg første person (f.eks. innlogget bruker) hvis feltet er tomt
          setAssignedTo(prev => {
            if (prev) return prev;
            return list[0]?.name || '';
          });

          // Initialiser standardfavoritter hvis brukeren ikke har valgt noen ennå
          setFavorites(prevFavs => {
            if (prevFavs.length === 0 && list.length > 0) {
              const seedFavs = list.slice(0, 4).map(p => p.name);
              try {
                localStorage.setItem('ks_task_favorite_assignees', JSON.stringify(seedFavs));
              } catch {}
              return seedFavs;
            }
            return prevFavs;
          });
        }
      } catch (err) {
        console.warn('Kunne ikke hente registrerte personer:', err);
      }
    }

    loadPersonnel();
    return () => { isMounted = false; };
  }, [user, activeProj]);

  const handleToggleFavorite = () => {
    const targetName = assignedTo.trim();
    if (!targetName) return;

    setFavorites(prev => {
      let next: string[];
      if (prev.includes(targetName)) {
        next = prev.filter(f => f !== targetName);
        toast.info(`«${targetName}» fjernet fra hurtigfavoritter.`);
      } else {
        next = [...prev, targetName];
        toast.success(`«${targetName}» lagret som hurtigfavoritt! ⭐`);
      }
      try {
        localStorage.setItem('ks_task_favorite_assignees', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isCurrentFavorite = Boolean(assignedTo.trim() && favorites.includes(assignedTo.trim()));

  const handleApplyAutofill = (data: any) => {
    if (data.title) setTitle(sanitizePlainText(data.title));
    if (data.description) setDescription(sanitizePlainText(data.description));
    if (data.assignedTo) {
      setAssignedTo(data.assignedTo);
      setIsCustomPerson(false);
    }
    if (data.priority) setPriority(data.priority);
    if (data.deadline) setDeadline(data.deadline);
    if (data.projectId && projects.some(p => p.id === data.projectId)) {
      setProjectId(data.projectId);
    }
    toast.success('Oppgave utfylt av AI basert på historikk!');
  };

  const handleOpenConfig = () => {
    if (onOpenOmnichannelModal) {
      onOpenOmnichannelModal();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open_omnichannel_modal'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vennligst oppgi oppgavetittel');
      return;
    }
    if (!assignedTo.trim()) {
      toast.error('Vennligst velg eller oppgi hvem oppgaven skal tildeles til');
      return;
    }

    try {
      setIsSubmitting(true);
      const matchedUser = registeredUsers.find(u => u.name.toLowerCase() === assignedTo.trim().toLowerCase());

      const newTask: Partial<ProjectTask> = {
        projectId,
        projectName: activeProj.name,
        title: title.trim(),
        description: description.trim(),
        assignedTo: assignedTo.trim(),
        assignedToId: matchedUser?.id,
        priority,
        status: 'pending',
        deadline,
        createdAt: new Date().toISOString(),
        createdBy: user?.displayName || user?.email || 'Byggeleder'
      };

      const docRef = await addDoc(collection(db, 'tasks'), {
        ...newTask,
        createdAtServer: serverTimestamp()
      });

      await addDoc(collection(db, 'agent_activities'), {
        type: 'task_assigned',
        title: `Oppgave tildelt: ${title.trim()}`,
        description: `Tildelt ${assignedTo} på ${activeProj.name}. Frist: ${deadline}. Prioritet: ${priority.toUpperCase()}.`,
        trade: assignedTo,
        tradeName: assignedTo,
        status: 'pending',
        badge: priority === 'urgent' ? 'KRITISK FRIST' : 'TILDELT',
        projectId,
        projectName: activeProj.name,
        createdAt: new Date().toISOString()
      }).catch(() => {});

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('task_assigned_event', { detail: { ...newTask, id: docRef.id } }));
      }

      // Send notifications to connected webhooks
      const notifiedChannels: string[] = [];
      if (notifyDiscord && omniSettings.discordWebhook) {
        notifiedChannels.push('Discord');
        fetch(omniSettings.discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `📋 **Ny oppgave tildelt**: **${title.trim()}**\n• **Prosjekt**: ${activeProj.name}\n• **Tildelt**: ${assignedTo}\n• **Frist**: ${deadline}\n• **Prioritet**: ${priority.toUpperCase()}\n${description ? `• **Beskrivelse**: ${description}` : ''}`
          })
        }).catch(err => console.warn('Discord notification error:', err));
      }

      if (notifySlack && omniSettings.slackWebhook) {
        notifiedChannels.push('Slack');
        fetch(omniSettings.slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `📋 *Ny oppgave tildelt*: *${title.trim()}*\n• *Prosjekt*: ${activeProj.name}\n• *Tildelt*: ${assignedTo}\n• *Frist*: ${deadline}\n• *Prioritet*: ${priority.toUpperCase()}`
          })
        }).catch(err => console.warn('Slack notification error:', err));
      }

      if (notifyTeams && omniSettings.teamsWebhook) {
        notifiedChannels.push('MS Teams');
        fetch(omniSettings.teamsWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Ny oppgave: ${title.trim()}`,
            text: `Prosjekt: ${activeProj.name} | Tildelt: ${assignedTo} | Frist: ${deadline} | Prioritet: ${priority.toUpperCase()}`
          })
        }).catch(err => console.warn('Teams notification error:', err));
      }

      toast.success(`Oppgave tildelt ${assignedTo}!`);
      const notifyMessage = notifiedChannels.length > 0 
        ? `Varsel sendt direkte til ${notifiedChannels.join(', ')}.` 
        : `(Ingen eksterne varslingskanaler er tilkoblet ennå. Klikk 'Konfigurer kanaler' for å koble til Discord, Slack eller Teams).`;

      onSuccess(`📋 Oppgave **«${title.trim()}»** er tildelt **${assignedTo}** på prosjektet **${activeProj.name}** (Frist: ${deadline}). ${notifyMessage}`);
    } catch (err: any) {
      console.error('Error creating task:', err);
      toast.error('Kunne ikke opprette oppgave: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* AI Autofill Assistant with Historical Presets */}
      <AIFormAutofillAssistant
        formType="task"
        projectId={projectId}
        onApply={handleApplyAutofill}
      />

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">Tildel Oppgave & Arbeidsordre</h5>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Prosjekt *</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Hva skal gjøres? (Oppgavetittel) *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="F.eks: Trekke kurser til kjøkken og montere stikk..."
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold text-slate-700">Tildel til person / fag *</label>
            {assignedTo.trim() && (
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={cn(
                  "text-[10px] font-bold flex items-center gap-1 transition-all px-2 py-0.5 rounded-lg border cursor-pointer",
                  isCurrentFavorite 
                    ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100" 
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                )}
                title={isCurrentFavorite ? "Fjern fra hurtigfavoritter" : "Lagre som hurtigfavoritt"}
              >
                <Star size={11} className={isCurrentFavorite ? "fill-amber-400 text-amber-500" : "text-slate-400"} />
                <span>{isCurrentFavorite ? 'I favoritter' : 'Gjør til favoritt'}</span>
              </button>
            )}
          </div>

          {/* 1. Nedtrekksmeny med faktisk registrerte personer */}
          <div className="space-y-1.5 mb-2">
            <select
              value={registeredUsers.some(u => u.name.toLowerCase() === assignedTo.trim().toLowerCase()) ? assignedTo : (isCustomPerson ? '__custom__' : (assignedTo || ''))}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__custom__') {
                  setIsCustomPerson(true);
                  setAssignedTo('');
                } else {
                  setIsCustomPerson(false);
                  setAssignedTo(val);
                }
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-400 transition-all cursor-pointer"
            >
              {registeredUsers.length === 0 ? (
                <option value="" disabled>Laster registrerte personer...</option>
              ) : (
                <>
                  <option value="" disabled>-- Velg registrert person / team --</option>
                  {registeredUsers.map(person => (
                    <option key={person.id} value={person.name}>
                      👤 {person.name} {person.role ? `· ${person.role}` : ''}
                    </option>
                  ))}
                  <option value="__custom__">✏️ Annen person / Ekstern håndverker (Fritekst)...</option>
                </>
              )}
            </select>

            {/* Fritekstfelt for ekstern eller manuell inntasting */}
            {(isCustomPerson || (!registeredUsers.some(u => u.name.toLowerCase() === assignedTo.trim().toLowerCase()) && assignedTo)) && (
              <div className="relative animate-in fade-in slide-in-from-top-1 duration-150">
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Skriv inn navn på håndverker eller ekstern UE..."
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100"
                  autoFocus={isCustomPerson}
                />
              </div>
            )}
          </div>

          {/* 2. Hurtigalternativer: Faktiske favoritter */}
          {favorites.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Star size={10} className="fill-amber-400 text-amber-500" />
                Hurtigfavoritter
              </span>
              <div className="flex flex-wrap gap-1.5">
                {favorites.map(quick => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => {
                      setAssignedTo(quick);
                      setIsCustomPerson(false);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer flex items-center gap-1",
                      assignedTo === quick 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs" 
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span>{quick}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Prioritet</label>
            <select
              value={priority}
              onChange={(e: any) => setPriority(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white"
            >
              <option value="low">Lav</option>
              <option value="medium">Normal</option>
              <option value="high">Høy</option>
              <option value="urgent">Kritisk / Haster</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Frist *</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Detaljert arbeidsinstruks / Merknad</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Spesifiser plassering, materialer, forbehold eller sjekkpunkter..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white resize-none"
          />
        </div>

        {/* Omnichannel Section */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Varsling & Omnichannel (Håndverkere i felt)
            </span>
            <button
              type="button"
              onClick={handleOpenConfig}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>⚙️ Konfigurer kanaler</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-medium text-slate-700">
            {/* Discord */}
            <label className={cn(
              "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer",
              hasDiscord 
                ? (notifyDiscord ? "bg-indigo-50/70 border-indigo-200 text-indigo-950" : "bg-white border-slate-200") 
                : "bg-slate-100/70 border-dashed border-slate-200 text-slate-400 cursor-not-allowed opacity-80"
            )}>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  disabled={!hasDiscord}
                  checked={notifyDiscord} 
                  onChange={(e) => setNotifyDiscord(e.target.checked)} 
                  className="rounded text-indigo-600 focus:ring-0 disabled:opacity-50"
                />
                <span className="font-bold">Discord</span>
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md",
                hasDiscord ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
              )}>
                {hasDiscord ? 'Tilkoblet' : 'Ikke tilkoblet'}
              </span>
            </label>

            {/* Slack */}
            <label className={cn(
              "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer",
              hasSlack 
                ? (notifySlack ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" : "bg-white border-slate-200") 
                : "bg-slate-100/70 border-dashed border-slate-200 text-slate-400 cursor-not-allowed opacity-80"
            )}>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  disabled={!hasSlack}
                  checked={notifySlack} 
                  onChange={(e) => setNotifySlack(e.target.checked)} 
                  className="rounded text-emerald-600 focus:ring-0 disabled:opacity-50"
                />
                <span className="font-bold">Slack</span>
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md",
                hasSlack ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
              )}>
                {hasSlack ? 'Tilkoblet' : 'Ikke tilkoblet'}
              </span>
            </label>

            {/* MS Teams */}
            <label className={cn(
              "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer",
              hasTeams 
                ? (notifyTeams ? "bg-blue-50/70 border-blue-200 text-blue-950" : "bg-white border-slate-200") 
                : "bg-slate-100/70 border-dashed border-slate-200 text-slate-400 cursor-not-allowed opacity-80"
            )}>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  disabled={!hasTeams}
                  checked={notifyTeams} 
                  onChange={(e) => setNotifyTeams(e.target.checked)} 
                  className="rounded text-blue-600 focus:ring-0 disabled:opacity-50"
                />
                <span className="font-bold">MS Teams</span>
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md",
                hasTeams ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
              )}>
                {hasTeams ? 'Tilkoblet' : 'Ikke tilkoblet'}
              </span>
            </label>
          </div>
          
          {!hasDiscord && !hasSlack && !hasTeams && (
            <p className="text-[11px] text-slate-500 bg-amber-50/80 border border-amber-200/60 p-2 rounded-xl flex items-center justify-between">
              <span>💡 Ingen kanaler er koblet til. Håndverkere kan få oppgaver rett i sin kanal!</span>
              <button
                type="button"
                onClick={handleOpenConfig}
                className="font-black text-amber-900 underline ml-2 cursor-pointer shrink-0"
              >
                Koble til nå
              </button>
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <ListTodo size={16} />
        <span>{isSubmitting ? 'Tildeler oppgave...' : 'Tildel Oppgave Nå'}</span>
      </button>
    </form>
  );
}
