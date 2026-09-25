import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Coins, 
  Send, 
  Download, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Project, FinalSettlement } from '../types';
import { finalSettlementService } from '../services/finalSettlementService';
import { pdfService } from '../services/pdfService';
import { toast } from 'sonner';

interface FinalSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export default function FinalSettlementModal({
  isOpen,
  onClose,
  project
}: FinalSettlementModalProps) {
  const [settlement, setSettlement] = useState<FinalSettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen || !project?.id) return;
    loadSettlement();
  }, [isOpen, project?.id]);

  const loadSettlement = async () => {
    setLoading(true);
    try {
      const data = await finalSettlementService.calculateFinalSettlement(project);
      setSettlement(data);
    } catch (e) {
      console.warn('Could not calculate final settlement:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToClient = async () => {
    if (!settlement) return;
    setIsSending(true);
    try {
      if (project.clientEmail) {
        await fetch('/api/notify/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: project.clientEmail,
            subject: `Sluttoppgjør for ${project.name} iht. NS 8406`,
            content: `
              Hei ${project.clientName || 'Byggherre'}!
              
              Vi oversender herved formelt sluttoppgjør for prosjektet "${project.name}".
              
              Oppsummering:
              - Opprinnelig kontraktssum: ${settlement.originalContractAmount.toLocaleString('no-NO')} kr eks. mva
              - Godkjente endringsordrer: ${settlement.approvedChangeOrdersAmount.toLocaleString('no-NO')} kr eks. mva
              - Totalt oppgjørskrav: ${settlement.totalSettlementIncVat.toLocaleString('no-NO')} kr ink. mva
              
              Forfallsdato: ${settlement.invoiceDueDate}
              Innsigelsesfrist iht. NS 8406 pkt. 26: ${settlement.objectionDeadline} (2 måneder fra mottak).
              
              Vennligst finn fullstendig oppstilling vedlagt eller i kundeportalen.
              
              Med vennlig hilsen,
              ${project.companyName || 'Entreprenøren'} / VikingMester
            `
          })
        });
      }

      await finalSettlementService.sendSettlement(settlement.id);
      toast.success('Sluttoppgjøret er sendt til byggherre!');
      loadSettlement();
    } catch (e) {
      toast.error('Kunne ikke sende sluttoppgjør.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-[#0B0F17] text-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-w-3xl w-full p-5 sm:p-8 max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-slate-800 pb-[env(safe-area-inset-bottom,1.25rem)] sm:pb-8"
        >
          {/* Mobile grab handle */}
          <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />

          {/* Header */}
          <div className="flex justify-between items-start pb-4 sm:pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
                  <Coins size={20} />
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  Norsk Standard NS 8406 pkt. 26
                </span>
              </div>
              <h2 className="text-2xl font-black text-white">Formelt Sluttoppgjør</h2>
              <p className="text-xs text-slate-400">
                Prosjekt: {project.name} | Avregning av kontrakt, godkjente tillegg og innestående
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="my-6 flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
            {loading || !settlement ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                Beregner sluttoppgjør og henter godkjente tillegg...
              </div>
            ) : (
              <>
                {/* Economic Breakdown */}
                <div className="bg-[#131722] rounded-2xl p-6 border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-400">Opprinnelig kontraktssum</span>
                    <span className="text-sm font-black text-white">
                      {settlement.originalContractAmount.toLocaleString('no-NO')} kr
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-slate-400">Godkjente endringsmeldinger / tillegg</div>
                      <div className="text-[10px] text-emerald-400">Signert skriftlig av byggherre</div>
                    </div>
                    <span className="text-sm font-black text-emerald-400">
                      +{settlement.approvedChangeOrdersAmount.toLocaleString('no-NO')} kr
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold text-white">Total justert entreprisesum (eks. mva)</span>
                    <span className="text-base font-black text-white">
                      {settlement.totalOrderAmount.toLocaleString('no-NO')} kr
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-slate-400">Tidligere a-konto fakturert</div>
                      <div className="text-[10px] text-slate-500">Innbetalt / delfakturert underveis</div>
                    </div>
                    <span className="text-sm font-black text-slate-300">
                      -{settlement.invoicedAmount.toLocaleString('no-NO')} kr
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-400">Innestående garantibeløp (5% iht. NS 8406)</span>
                    <span className="text-sm font-bold text-slate-400">
                      {(settlement.retentionGuaranteeAmount || 0).toLocaleString('no-NO')} kr
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Netto sluttkrav til utbetaling
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Inkludert 25% mva ({settlement.vatAmount.toLocaleString('no-NO')} kr)
                      </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-400">
                      {settlement.totalSettlementIncVat.toLocaleString('no-NO')} kr
                    </div>
                  </div>
                </div>

                {/* Deadlines & Preclusion Clause */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-4 bg-[#131722] rounded-xl border border-slate-800">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Forfallsdato
                    </div>
                    <div className="text-sm font-bold text-white mt-1">
                      {settlement.invoiceDueDate} (14 dager)
                    </div>
                  </div>
                  <div className="p-4 bg-amber-950/30 rounded-xl border border-amber-900/50">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                      Innsigelsesfrist byggherre
                    </div>
                    <div className="text-sm font-bold text-amber-200 mt-1">
                      {settlement.objectionDeadline} (2 måneder)
                    </div>
                  </div>
                </div>

                {/* Legal warning */}
                <div className="p-4 bg-slate-900/80 rounded-xl text-xs text-slate-300 leading-relaxed border border-slate-800">
                  <strong className="text-white">Viktig rettsvirkning etter NS 8406 pkt. 26.2:</strong>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Krav som ikke er medtatt i sluttoppgjøret tapes. Byggherren har 2 måneders frist fra mottak til å fremme eventuelle motkrav eller innsigelser. Innsigelser som ikke fremsettes innen fristen, tapes automatisk.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs text-slate-400">
              Status: {settlement?.status === 'sent' ? 'Sendt til byggherre' : 'Kladd / Utsendingsklar'}
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {settlement && (
                <button
                  onClick={() => pdfService.generateFinalSettlementPDF(project, settlement)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={14} /> Last ned PDF
                </button>
              )}

              <button
                onClick={handleSendToClient}
                disabled={isSending || !settlement}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Send size={14} />
                {isSending ? 'Sender...' : 'Send formelt sluttoppgjør'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
