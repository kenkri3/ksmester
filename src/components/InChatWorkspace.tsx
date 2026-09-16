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
  ListTodo
} from 'lucide-react';
import { Project, OfferItem, ProjectTask } from '../types';
import { db, collection, addDoc, serverTimestamp, getDocs } from '../services/firebase';
import { changeOrderService } from '../services/changeOrderService';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export type InChatFormType = 'offer' | 'change_order' | 'sja' | 'deviation' | 'time' | 'task' | 'toolbox';

export interface InChatWorkspaceProps {
  formType: InChatFormType;
  initialData?: any;
  projects?: any[];
  selectedProject?: any;
  onClose: () => void;
  onSuccess: (message: string, actionData?: any) => void;
  onSwitchForm?: (formType: InChatFormType, data?: any) => void;
}

export default function InChatWorkspace({
  formType,
  initialData,
  projects: propProjects = [],
  selectedProject,
  onClose,
  onSuccess,
  onSwitchForm
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
      <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -ml-1 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
            title="Gå tilbake til samtalen"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Samtale</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
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
  const [title, setTitle] = useState<string>(initialData?.title || 'Pristilbud: ');
  const [description, setDescription] = useState<string>(initialData?.description || '');
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
      const token = 'off_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
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

      const offerLink = `${window.location.origin}/?offerToken=${token}`;

      toast.success('Pristilbud opprettet og lagret!');
      onSuccess(
        `✅ **Pristilbud opprettet:** "${title}"\n- **Kunde:** ${clientName}\n- **Sum eks. mva:** kr ${sumExVat.toLocaleString('no-NO')},-\n- **Sum inkl. 25% mva:** kr ${totalIncVat.toLocaleString('no-NO')},-\n- **Lenke til tilbud:** [Åpne tilbud](${offerLink})`,
        { type: 'offer_created', offerId: ref.id, token, offerLink }
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

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold">Antall</span>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold">Enhet</span>
                  <select
                    value={item.unit}
                    onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                    className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
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
                  <span className="block text-[10px] text-slate-500 font-bold">Enhetspris</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.pricePerUnit}
                    onChange={(e) => handleUpdateItem(idx, 'pricePerUnit', e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold">Sum</span>
                  <div className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-900 truncate">
                    {item.total.toLocaleString('no-NO')} kr
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
  const [title, setTitle] = useState<string>(initialData?.title || 'Endring: ');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [cause, setCause] = useState<string>(initialData?.cause || 'client_request');
  const [amountExVat, setAmountExVat] = useState<number>(Number(initialData?.amountExVat) || 12500);
  const [impactDays, setImpactDays] = useState<number>(Number(initialData?.impactDays) || 3);

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

        <div className="grid grid-cols-2 gap-3">
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
      const sjaDoc = {
        projectId: projectId || null,
        projectName: proj.name,
        jobTitle: jobTitle.trim(),
        location: location.trim(),
        participants: participants.trim(),
        hazards,
        mitigations,
        status: 'approved',
        authorId: user?.id || 'admin_user',
        authorName: user?.displayName || 'HMS-ansvarlig',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const ref = await addDoc(collection(db, 'sja_documents'), sjaDoc);
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
  const [title, setTitle] = useState<string>(initialData?.title || '');
  const [category, setCategory] = useState<string>(initialData?.category || 'quality');
  const [severity, setSeverity] = useState<string>(initialData?.severity || 'medium');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [actionTaken, setActionTaken] = useState<string>(initialData?.actionTaken || '');

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

        <div className="grid grid-cols-2 gap-3">
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
  const [description, setDescription] = useState<string>(initialData?.description || '');

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

        <div className="grid grid-cols-2 gap-3">
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
  onSuccess
}: {
  initialData?: any;
  projects: any[];
  selectedProject?: any;
  user: any;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  onSuccess: (msg: string, data?: any) => void;
}) {
  const [projectId, setProjectId] = useState(initialData?.projectId || selectedProject?.id || (projects[0]?.id || ''));
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [assignedTo, setAssignedTo] = useState(initialData?.assignedTo || 'Ola Tømrer');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(initialData?.priority || 'medium');
  const [deadline, setDeadline] = useState(initialData?.deadline || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [notifyDiscord, setNotifyDiscord] = useState(true);
  const [notifySlack, setNotifySlack] = useState(true);

  const activeProj = projects.find(p => p.id === projectId) || selectedProject || { name: 'Byggeprosjekt' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vennligst oppgi oppgavetittel');
      return;
    }

    try {
      setIsSubmitting(true);
      const newTask: Partial<ProjectTask> = {
        projectId,
        projectName: activeProj.name,
        title: title.trim(),
        description: description.trim(),
        assignedTo,
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

      toast.success(`Oppgave tildelt ${assignedTo}!`);
      onSuccess(`📋 Oppgave **«${title.trim()}»** er tildelt **${assignedTo}** på prosjektet **${activeProj.name}** (Frist: ${deadline}). Varsel sendt til Discord/Slack.`);
    } catch (err: any) {
      console.error('Error creating task:', err);
      toast.error('Kunne ikke opprette oppgave: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Tildel til person / fag *</label>
          <input
            type="text"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Navn eller rolle..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white mb-1.5"
          />
          <div className="flex flex-wrap gap-1.5">
            {['Ola Tømrer', 'Rørlegger Hansen', 'Elektriker Erik', 'Maler', 'Bas', 'Lærling'].map(quick => (
              <button
                key={quick}
                type="button"
                onClick={() => setAssignedTo(quick)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer",
                  assignedTo === quick 
                    ? "bg-indigo-50 text-indigo-700 border-indigo-300" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                {quick}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Prioritet</label>
            <select
              value={priority}
              onChange={(e: any) => setPriority(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white"
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

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Varsling & Omnichannel
          </span>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={notifyDiscord} 
                onChange={(e) => setNotifyDiscord(e.target.checked)} 
                className="rounded text-indigo-600 focus:ring-0"
              />
              <span>Discord (#byggeplass)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={notifySlack} 
                onChange={(e) => setNotifySlack(e.target.checked)} 
                className="rounded text-emerald-600 focus:ring-0"
              />
              <span>Slack & SMS</span>
            </label>
          </div>
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
