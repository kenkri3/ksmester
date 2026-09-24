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
  Edit3
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

  if (!isOpen || !offer) return null;

  // Beregninger
  const hours = Number(offer.hours) || 0;
  const standardHourlyRate = 890;
  const laborAmount = hours > 0 ? hours * standardHourlyRate : 0;
  const materialsAmount = Number(offer.materials) || 0;

  const totalExMva = Number(offer.totalPrice || offer.amount || offer.totalAmount || (laborAmount + materialsAmount) || 0);
  const mvaAmount = Math.round(totalExMva * 0.25);
  const totalIncMva = totalExMva + mvaAmount;

  const client = offer.clientName || project?.clientName || 'Privatkunde';
  const projectName = offer.projectName || project?.name || 'Byggeoppdrag';
  const createdDate = offer.createdAt 
    ? new Date(offer.createdAt).toLocaleDateString('no-NO', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('no-NO', { day: '2-digit', month: 'long', year: 'numeric' });

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
        createdAt: offer.createdAt || new Date().toISOString(),
        status: currentStatus === 'Akseptert av kunde' ? 'accepted' : 'sent',
        items: Array.isArray(offer.items) && offer.items.length > 0
          ? offer.items
          : [
              ...(hours > 0 ? [{ description: `Tømrer- og byggearbeid (${hours} timer)`, quantity: hours, unit: 'timer', pricePerUnit: standardHourlyRate, total: laborAmount }] : []),
              ...(materialsAmount > 0 ? [{ description: 'Byggematerialer og forbruksmateriell m/påslag', quantity: 1, unit: 'stk', pricePerUnit: materialsAmount, total: materialsAmount }] : [])
            ]
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
    const summary = `📄 PRISTILBUD: ${offer.title || projectName}\n` +
      `Kunde: ${client}\n` +
      `Prosjekt: ${projectName}\n` +
      `Dato: ${createdDate}\n` +
      `-----------------------------------------\n` +
      (hours > 0 ? `• Arbeid: ${hours} timer @ kr ${standardHourlyRate},- = kr ${laborAmount.toLocaleString('no-NO')},-\n` : '') +
      (materialsAmount > 0 ? `• Materiell: kr ${materialsAmount.toLocaleString('no-NO')},-\n` : '') +
      `-----------------------------------------\n` +
      `Sum eks. mva: kr ${totalExMva.toLocaleString('no-NO')},-\n` +
      `MVA (25 %): kr ${mvaAmount.toLocaleString('no-NO')},-\n` +
      `TOTALSUM INKL. MVA: kr ${totalIncMva.toLocaleString('no-NO')},-\n\n` +
      `Gyldighet: 30 dager fra tilbudsdato.\n` +
      `Avtaleramme: Håndverkertjenesteloven / NS 8406.`;

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
        onSave({ ...offer, status: 'Akseptert av kunde' });
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
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calculator size={14} className="text-purple-400" />
                <span>Kalkyle og leveringsomfang</span>
              </h4>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
                {Array.isArray(offer.items) && offer.items.length > 0 ? (
                  offer.items.map((it: any, idx: number) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-white">{it.description || `Post ${idx + 1}`}</p>
                        <p className="text-[11px] text-slate-400">
                          {it.quantity} {it.unit || 'stk'} á kr {Number(it.pricePerUnit || 0).toLocaleString('no-NO')}
                        </p>
                      </div>
                      <span className="font-black text-slate-200">
                        kr {Number(it.total || 0).toLocaleString('no-NO')}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    {hours > 0 && (
                      <div className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-white">Fagmessig utførelse & tømrerarbeid</p>
                          <p className="text-[11px] text-slate-400">
                            {hours} arbeidstimer á kr {standardHourlyRate},- eks. mva
                          </p>
                        </div>
                        <span className="font-black text-slate-200">
                          kr {laborAmount.toLocaleString('no-NO')}
                        </span>
                      </div>
                    )}
                    {materialsAmount > 0 && (
                      <div className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-white">Materiell og festemidler</p>
                          <p className="text-[11px] text-slate-400">
                            Innkjøp hos grossist inkl. standard påslag og svinn
                          </p>
                        </div>
                        <span className="font-black text-slate-200">
                          kr {materialsAmount.toLocaleString('no-NO')}
                        </span>
                      </div>
                    )}
                    {hours === 0 && materialsAmount === 0 && (
                      <div className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-white">Avtalt fastprisleveranse</p>
                          <p className="text-[11px] text-slate-400">Komplett leveranse iht. tilbudsbeskrivelse</p>
                        </div>
                        <span className="font-black text-slate-200">
                          kr {totalExMva.toLocaleString('no-NO')}
                        </span>
                      </div>
                    )}
                  </>
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
