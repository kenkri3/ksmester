'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Printer,
  Copy,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  Building2,
  Mail,
  User,
  Calendar,
  Sparkles,
  Calculator,
  ShieldCheck,
  Check,
  Edit3,
  Plus,
  Save,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { pdfService } from '../services/pdfService';
import { Project } from '../types';
import { cn } from '../lib/utils';
import { db, doc, updateDoc } from '../services/firebase';

interface OfferDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: any;
  project?: Project | null;
  onDelete?: (offerId: string, title: string) => void;
  onEditInBuilder?: (offer: any) => void;
  onSave?: (updatedOffer: any) => void;
}

export interface OfferDetailItem {
  description: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  total?: number;
}

export default function OfferDetailModal({
  isOpen,
  onClose,
  offer,
  project,
  onDelete,
  onEditInBuilder,
  onSave
}: OfferDetailModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(offer?.status || 'Sendt til kunde');
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [isSavingItems, setIsSavingItems] = useState(false);

  // Initialiser poster fra tilbudet eller opprett basert på arbeidstimer og materiell
  const [items, setItems] = useState<OfferDetailItem[]>(() => {
    if (Array.isArray(offer?.items) && offer.items.length > 0) {
      return offer.items.map((it: any) => ({
        description: it.description || '',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'timer',
        pricePerUnit: Number(it.pricePerUnit) || 0,
        total: Number(it.total) || Math.round((Number(it.quantity) || 1) * (Number(it.pricePerUnit) || 0))
      }));
    }
    const h = Number(offer?.hours) || 0;
    const m = Number(offer?.materials) || 0;
    const fallbackList: OfferDetailItem[] = [];
    if (h > 0) {
      fallbackList.push({
        description: `Tømrer- og fagmessig byggearbeid`,
        quantity: h,
        unit: 'timer',
        pricePerUnit: 890,
        total: h * 890
      });
    }
    if (m > 0) {
      fallbackList.push({
        description: 'Byggematerialer og forbruksmateriell m/påslag',
        quantity: 1,
        unit: 'stk',
        pricePerUnit: m,
        total: m
      });
    }
    if (fallbackList.length === 0) {
      const fallbackAmount = Number(offer?.totalPrice || offer?.amount || offer?.totalAmount || 0);
      fallbackList.push({
        description: offer?.title || 'Fagmessig utførelse iht. avtale',
        quantity: 1,
        unit: 'stk',
        pricePerUnit: fallbackAmount || 15000,
        total: fallbackAmount || 15000
      });
    }
    return fallbackList;
  });

  // Synkroniser når tilbudsobjektet endrer seg
  React.useEffect(() => {
    if (Array.isArray(offer?.items) && offer.items.length > 0) {
      setItems(offer.items.map((it: any) => ({
        description: it.description || '',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'timer',
        pricePerUnit: Number(it.pricePerUnit) || 0,
        total: Number(it.total) || Math.round((Number(it.quantity) || 1) * (Number(it.pricePerUnit) || 0))
      })));
    }
  }, [offer?.id, offer?.items]);

  if (!isOpen || !offer) return null;

  // Håndter tilføyelse, sletting og redigering av poster
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { description: 'Ny tilbudspost / arbeid', quantity: 1, unit: 'timer', pricePerUnit: 890, total: 890 }
    ]);
    setIsEditingItems(true);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.warning('Tilbudet må inneholde minst én kalkylepost.');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof OfferDetailItem, value: any) => {
    setItems(prev => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };
      if (field === 'quantity' || field === 'pricePerUnit') {
        const q = field === 'quantity' ? (Number(value) || 0) : (Number(target.quantity) || 0);
        const p = field === 'pricePerUnit' ? (Number(value) || 0) : (Number(target.pricePerUnit) || 0);
        target.total = Math.round(q * p);
      }
      copy[index] = target;
      return copy;
    });
  };

  // Dynamiske beregninger
  const totalExMva = items.reduce((sum, it) => sum + (Number(it.total) || (Number(it.quantity) * Number(it.pricePerUnit)) || 0), 0);
  const mvaAmount = Math.round(totalExMva * 0.25);
  const totalIncMva = totalExMva + mvaAmount;

  const client = offer.clientName || project?.clientName || 'Privatkunde';
  const projectName = offer.projectName || project?.name || 'Byggeoppdrag';
  const createdDate = offer.createdAt 
    ? new Date(offer.createdAt).toLocaleDateString('no-NO', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('no-NO', { day: '2-digit', month: 'long', year: 'numeric' });

  // Lagre endrede poster tilbake til databasen
  const handleSaveItems = async () => {
    setIsSavingItems(true);
    const updatedOffer = {
      ...offer,
      items,
      amount: totalExMva,
      totalPrice: totalExMva,
      totalAmount: totalExMva,
      updatedAt: new Date().toISOString()
    };

    try {
      if (offer.id) {
        await updateDoc(doc(db, 'offers', offer.id), {
          items,
          amount: totalExMva,
          totalPrice: totalExMva,
          totalAmount: totalExMva,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Kunne ikke oppdatere tilbud i Firestore:', e);
    }

    try {
      if (offer.id) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        await fetch(`/api/data/offers/${offer.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {})
          },
          body: JSON.stringify({
            items,
            amount: totalExMva,
            totalPrice: totalExMva,
            totalAmount: totalExMva
          })
        });
      }
    } catch (e) {
      console.warn('Kunne ikke oppdatere tilbud på server:', e);
    }

    if (onSave) {
      onSave(updatedOffer);
    }

    setIsSavingItems(false);
    setIsEditingItems(false);
    toast.success(`Tilbudsposter er lagret! Totalsum: kr ${totalExMva.toLocaleString('no-NO')} eks. mva`);
  };

  // PDF-generering
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Genererer PDF-tilbud...');
    try {
      const offerForPdf: any = {
        id: offer.id,
        title: offer.title || `Tilbud: ${projectName}`,
        description: offer.description || `Pristilbud for utførelse av arbeid på ${projectName}. Omfatter faglige leveranser, materiell og KS-dokumentasjon.`,
        clientName: client,
        clientEmail: offer.clientEmail || '',
        clientPhone: offer.clientPhone || '',
        clientType: offer.clientType || (offer.orgNumber ? 'company' : 'private'),
        orgNumber: offer.orgNumber || '',
        contactPerson: offer.contactPerson || '',
        address: offer.address || '',
        postalCode: offer.postalCode || '',
        city: offer.city || '',
        municipality: offer.municipality || '',
        gnr: offer.gnr || '',
        bnr: offer.bnr || '',
        contractStandard: offer.contractStandard || (offer.clientType === 'company' || offer.orgNumber ? 'NS8406' : 'haandverker'),
        createdAt: offer.createdAt || new Date().toISOString(),
        status: currentStatus === 'Akseptert av kunde' ? 'accepted' : 'sent',
        items: items
      };

      await pdfService.generateOfferPDF(offerForPdf, {
        name: 'Vikingmester Entreprenør AS',
        email: 'post@vikingmester.no'
      });
      toast.success('Pristilbud lastet ned som PDF!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Kunne ikke generere PDF: ' + (err.message || 'Ukjent feil'), { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Kopier sammendrag
  const handleCopySummary = () => {
    const itemsText = items.map((it, idx) => 
      `• Post ${idx + 1}: ${it.description || 'Fagarbeid'} - ${it.quantity} ${it.unit} á kr ${Number(it.pricePerUnit).toLocaleString('no-NO')},- = kr ${Number(it.total).toLocaleString('no-NO')},-`
    ).join('\n');

    const customerLine = (offer.clientType === 'company' || offer.orgNumber)
      ? `Oppdragsgiver (Firma): ${client}${offer.orgNumber ? ` (Org.nr: ${offer.orgNumber})` : ''}${offer.contactPerson ? ` - Attn: ${offer.contactPerson}` : ''}`
      : `Oppdragsgiver (Forbruker): ${client}`;

    const propParts = [
      offer.address ? `Adresse: ${offer.address}${offer.postalCode ? `, ${offer.postalCode} ${offer.city || ''}` : ''}` : '',
      (offer.gnr && offer.bnr) ? `Matrikkel: Gnr ${offer.gnr} / Bnr ${offer.bnr}${offer.municipality ? ` (${offer.municipality})` : ''}` : ''
    ].filter(Boolean);

    const standardText = offer.contractStandard === 'NS8406'
      ? 'NS 8406 (Forenklet norsk bygge- og anleggskontrakt)'
      : offer.contractStandard === 'NS8405'
      ? 'NS 8405 (Norsk bygge- og anleggskontrakt)'
      : offer.contractStandard === 'bustadoppforing'
      ? 'Bustadoppføringslova'
      : 'Håndverkertjenesteloven';

    const summary = `📄 PRISTILBUD: ${offer.title || projectName}\n` +
      `${customerLine}\n` +
      (propParts.length > 0 ? `${propParts.join('\n')}\n` : '') +
      `Prosjekt: ${projectName}\n` +
      `Dato: ${createdDate}\n` +
      `-----------------------------------------\n` +
      `${itemsText}\n` +
      `-----------------------------------------\n` +
      `Sum eks. mva: kr ${totalExMva.toLocaleString('no-NO')},-\n` +
      `MVA (25 %): kr ${mvaAmount.toLocaleString('no-NO')},-\n` +
      `TOTALSUM INKL. MVA: kr ${totalIncMva.toLocaleString('no-NO')},-\n\n` +
      `Gyldighet: 30 dager fra tilbudsdato.\n` +
      `Avtaleramme: ${standardText}.`;

    navigator.clipboard.writeText(summary);
    setIsCopied(true);
    toast.success('Tilbudskalkyle kopiert til utklippstavlen!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Aksepter tilbud
  const handleAcceptOffer = async () => {
    setIsAccepting(true);
    try {
      try {
        await updateDoc(doc(db, 'offers', offer.id), {
          status: 'Akseptert av kunde',
          acceptedAt: new Date().toISOString()
        });
      } catch {}

      setCurrentStatus('Akseptert av kunde');
      if (onSave) {
        onSave({ ...offer, status: 'Akseptert av kunde', items });
      }
      toast.success('✓ Tilbud markert som Akseptert! Prosjektet og KS-sjekkliste aktiveres.');
    } catch (err: any) {
      toast.error('Kunne ikke oppdatere status: ' + err.message);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/50 shrink-0">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                  <FileText size={13} />
                  <span>Pristilbud</span>
                </span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold",
                  currentStatus.includes('Akseptert') 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                )}>
                  {currentStatus}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {offer.title || `Tilbud: ${projectName}`}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1"><User size={12} /> {client}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Building2 size={12} /> {projectName}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Calendar size={12} /> {createdDate}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Lukk"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body (Scrollable) */}
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            {/* Kundetype og Eiendomsidentifikator (Kartverket) */}
            {(offer.clientType || offer.orgNumber || offer.address || offer.gnr) && (
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {offer.clientType === 'company' || offer.orgNumber ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                        <Building2 size={12} />
                        <span>Firma (B2B)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                        <User size={12} />
                        <span>Privatperson (Forbruker)</span>
                      </span>
                    )}

                    {offer.orgNumber && (
                      <span className="text-xs text-slate-300 font-mono font-bold">
                        Org.nr: {offer.orgNumber}
                      </span>
                    )}
                    {offer.contactPerson && (
                      <span className="text-xs text-slate-400">
                        • Attn: <strong className="text-slate-200">{offer.contactPerson}</strong>
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                    {offer.contractStandard === 'NS8406'
                      ? 'NS 8406 Forenklet'
                      : offer.contractStandard === 'NS8405'
                      ? 'NS 8405 Byggekontrakt'
                      : offer.contractStandard === 'bustadoppforing'
                      ? 'Bustadoppføringslova'
                      : 'Håndverkertjenesteloven'}
                  </span>
                </div>

                {(offer.address || offer.gnr) && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <MapPin size={14} className="text-emerald-400 shrink-0" />
                      <span>{offer.address || 'Prosjektadresse'}{offer.postalCode ? `, ${offer.postalCode} ${offer.city || ''}` : ''}</span>
                    </div>

                    {(offer.gnr || offer.bnr) && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
                        Gnr: {offer.gnr || '-'} / Bnr: {offer.bnr || '-'}{offer.municipality ? ` (${offer.municipality})` : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Nøkkeltall Oppsummering */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Sum eks. mva
                </span>
                <span className="text-xl font-black text-white">
                  kr {totalExMva.toLocaleString('no-NO')}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  MVA (25%)
                </span>
                <span className="text-xl font-black text-slate-300">
                  kr {mvaAmount.toLocaleString('no-NO')}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block mb-1">
                  Totalsum inkl. mva
                </span>
                <span className="text-xl font-black text-purple-200">
                  kr {totalIncMva.toLocaleString('no-NO')}
                </span>
              </div>
            </div>

            {/* Spesifiserte poster / Kalkylegrunnlag */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calculator size={14} className="text-purple-400" />
                  <span>Kalkyle og tilbudsposter ({items.length})</span>
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingItems(!isEditingItems)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                      isEditingItems 
                        ? "bg-purple-600 text-white border-purple-500 shadow-xs" 
                        : "bg-slate-800 text-slate-300 hover:text-white border-slate-700"
                    )}
                  >
                    <Edit3 size={12} />
                    <span>{isEditingItems ? 'Avslutt redigering' : 'Rediger poster'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Legg til post</span>
                  </button>
                </div>
              </div>

              {/* Interaktiv tabell over tilbudsposter */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
                {isEditingItems ? (
                  /* Redigeringsmodus */
                  <div className="p-3 space-y-3">
                    {items.map((it, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                            Post {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                            title="Slett post"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          placeholder="Beskrivelse av arbeidet eller materialer..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Antall</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Enhet</label>
                            <select
                              value={it.unit}
                              onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                            >
                              <option value="timer">timer</option>
                              <option value="stk">stk</option>
                              <option value="m2">m²</option>
                              <option value="lm">lm</option>
                              <option value="kg">kg</option>
                              <option value="pakke">pk</option>
                              <option value="sett">sett</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Pris / enhet</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.pricePerUnit}
                              onChange={(e) => handleUpdateItem(idx, 'pricePerUnit', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/60">
                          <span className="text-slate-400 text-[11px]">Delsum eks. mva:</span>
                          <span className="font-bold text-white font-mono">kr {Number(it.total || 0).toLocaleString('no-NO')}</span>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Legg til en post til</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSavingItems}
                        onClick={handleSaveItems}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Save size={14} />
                        <span>{isSavingItems ? 'Lagrer...' : 'Lagre endringer i tilbud'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Visningsmodus */
                  items.map((it, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-900/40 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-purple-400">Post {idx + 1}:</span>
                          <p className="font-bold text-white">{it.description || `Tilbudspost ${idx + 1}`}</p>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {it.quantity} {it.unit} á kr {Number(it.pricePerUnit || 0).toLocaleString('no-NO')} eks. mva
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-200 block font-mono">
                          kr {Number(it.total || (it.quantity * it.pricePerUnit)).toLocaleString('no-NO')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Beskrivelse / Merknader */}
            {offer.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Beskrivelse og leveringsvilkår
                </h4>
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {offer.description}
                </div>
              </div>
            )}

            {/* Autonom Kontrakt- og KS-garanti */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-blue-950/30 to-slate-900 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-3">
              <ShieldCheck size={20} className="text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-white font-bold block">
                  Autonom avtaleramme (NS 8406 / Håndverkertjenesteloven)
                </strong>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Tilbudet er utformet i tråd med standardkontrakter for bygg- og anleggstjenester. 
                  Ved kundens aksept opprettes prosjektet formelt, elektronisk byggedagbok etableres, 
                  og tilpassede sjekklister for fagkontroll (TEK17 og våtrom) genereres automatisk.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Venstre: Slett knapp */}
            <div>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Er du sikker på at du vil slette «${offer.title || projectName}»?`)) {
                      onDelete(offer.id, offer.title);
                      onClose();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Slett tilbud</span>
                </button>
              )}
            </div>

            {/* Høyre: Handlingsknapper */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{isCopied ? 'Kopiert!' : 'Kopier'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Printer size={14} />
                <span>{isGeneratingPdf ? 'Lager PDF...' : 'Last ned PDF'}</span>
              </button>

              {onEditInBuilder && (
                <button
                  type="button"
                  onClick={() => onEditInBuilder(offer)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Edit3 size={14} />
                  <span>Rediger</span>
                </button>
              )}

              {currentStatus !== 'Akseptert av kunde' && (
                <button
                  type="button"
                  onClick={handleAcceptOffer}
                  disabled={isAccepting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>{isAccepting ? 'Oppdaterer...' : 'Marker som akseptert'}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
