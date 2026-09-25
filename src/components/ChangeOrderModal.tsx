import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FileEdit, 
  Send, 
  Share2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Download, 
  Copy, 
  Calendar,
  ExternalLink,
  Plus,
  Coins,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Project, ChangeOrder } from '../types';
import { changeOrderService } from '../services/changeOrderService';
import { pdfService } from '../services/pdfService';
import { toast } from 'sonner';

interface ChangeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentUserId?: string;
  currentUserName?: string;
}

export default function ChangeOrderModal({
  isOpen,
  onClose,
  project,
  currentUserId = 'system',
  currentUserName = 'Byggeleder'
}: ChangeOrderModalProps) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cause, setCause] = useState<ChangeOrder['cause']>('kundetillegg');
  const [amountExVat, setAmountExVat] = useState<number>(0);
  const [impactDays, setImpactDays] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !project?.id) return;
    loadOrders();
  }, [isOpen, project?.id]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await changeOrderService.getProjectChangeOrders(project.id);
      setOrders(data);
    } catch (e) {
      console.warn('Could not load change orders:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (order: ChangeOrder) => {
    if (!window.confirm(`Er du sikker på at du vil slette endringsordre #${order.changeNumber} "${order.title}"?`)) {
      return;
    }
    try {
      await changeOrderService.deleteChangeOrder(order.id);
      setOrders(prev => prev.filter(o => o.id !== order.id));
      toast.success(`Endringsordre #${order.changeNumber} er slettet.`);
    } catch (e) {
      toast.error('Kunne ikke slette endringsordre.');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amountExVat <= 0) {
      toast.error('Vennligst oppgi tittel og gyldig beløp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await changeOrderService.createChangeOrder({
        project,
        title,
        description,
        cause,
        amountExVat,
        impactDays,
        authorId: currentUserId,
        authorName: currentUserName
      });

      toast.success(`Endringsmelding #${created.changeNumber} er opprettet!`);
      setTitle('');
      setDescription('');
      setAmountExVat(0);
      setImpactDays(0);
      setIsCreating(false);
      loadOrders();
    } catch (err) {
      toast.error('Kunne ikke opprette endringsmelding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyShareLink = (url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success('Delingslenke kopiert til utklippstavlen!');
  };

  const totalApproved = orders
    .filter(o => o.status === 'approved')
    .reduce((sum, o) => sum + (Number(o.amountExVat ?? (o as any).amount) || 0), 0);

  const totalPending = orders
    .filter(o => o.status === 'pending_customer')
    .reduce((sum, o) => sum + (Number(o.amountExVat ?? (o as any).amount) || 0), 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0B0F17] text-white rounded-3xl shadow-2xl max-w-4xl w-full p-4 sm:p-8 max-h-[90vh] flex flex-col border border-slate-800"
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
                  <FileEdit size={20} />
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                  NS 8406 / Håndverkertjenesteloven § 9
                </span>
              </div>
              <h2 className="text-2xl font-black text-white">{t('change_orders_modal_title', 'Endringsmeldinger & Tilleggsarbeid')}</h2>
              <p className="text-xs text-slate-400">
                {t('project', 'Prosjekt')}: {project.name} | {t('change_order_agreement_guarantee', 'Sikrer skriftlig avtale før arbeid starter')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 my-4 sm:my-6">
            <div className="p-4 bg-[#131722] rounded-2xl border border-slate-800">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('approved_addition', 'Godkjent tillegg')}</div>
              <div className="text-xl font-black text-emerald-400">
                {totalApproved.toLocaleString('no-NO')} kr
              </div>
              <div className="text-[10px] text-slate-500">eks. mva (+25% mva lagt til på sluttfaktura)</div>
            </div>
            <div className="p-4 bg-[#131722] rounded-2xl border border-slate-800">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('waiting_for_customer', 'Venter på kunde')}</div>
              <div className="text-xl font-black text-amber-400">
                {totalPending.toLocaleString('no-NO')} kr
              </div>
              <div className="text-[10px] text-slate-500">{t('must_approve_before_start', 'Kunden må godkjenne før start')}</div>
            </div>
            <div className="p-4 bg-[#131722] rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('total_cases', 'Totalt antall')}</div>
                <div className="text-xl font-black text-white">{orders.length} {t('cases_suffix', 'saker')}</div>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/50 cursor-pointer"
              >
                <Plus size={14} /> {t('btn_new_change_short', 'Ny endring')}
              </button>
            </div>
          </div>

          {/* Create Form Modal / Accordion */}
          {isCreating && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreateOrder}
              className="bg-[#131722] p-6 rounded-2xl border border-slate-800 mb-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Coins size={16} className="text-amber-400" />
                  {t('create_new_order_title', 'Opprett ny endringsordre (Tar under 1 minutt)')}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  {t('cancel', 'Avbryt')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('change_scope_label', 'Hva gjelder tillegget? *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="f.eks. Ekstra downlights i stue eller utskifting av bunnsvill"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('change_cause_label', 'Årsak til endringen')}
                  </label>
                  <select
                    value={cause}
                    onChange={(e) => setCause(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="kundetillegg" className="bg-slate-950 text-white">{t('change_cause_client', 'Kundeønske / Tilleggsbestilling')}</option>
                    <option value="uforutsett_forhold" className="bg-slate-950 text-white">{t('change_cause_unforeseen', 'Uforutsett bygningsmessig forhold (f.eks. råte/skade)')}</option>
                    <option value="prosjektering" className="bg-slate-950 text-white">{t('change_cause_engineering', 'Endring i prosjektering / arkitekt')}</option>
                    <option value="myndighetskrav" className="bg-slate-950 text-white">{t('change_cause_authority', 'Pålegg fra kommune / brann / el-tilsyn')}</option>
                    <option value="annet" className="bg-slate-950 text-white">{t('other', 'Annet')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {t('work_materials_desc', 'Beskrivelse av arbeidet og materialer')}
                </label>
                <textarea
                  rows={2}
                  placeholder="Spesifiser hva som skal gjøres, materialer som inngår og forutsetninger..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('price_ex_vat_label', 'Pris eks. mva (kr) *')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={amountExVat || ''}
                    onChange={(e) => setAmountExVat(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    Ink. mva: {Math.round(amountExVat * 1.25).toLocaleString('no-NO')} kr
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('progress_consequence_days', 'Fremdriftskonsekvens (+ dager)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={impactDays}
                    onChange={(e) => setImpactDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">{t('extension_contractor', 'Fristforlengelse for entreprenør')}</div>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-950/50 transition-all cursor-pointer"
                  >
                    <Send size={14} />
                    {isSubmitting ? 'Sender...' : t('btn_create_prepare', 'Opprett & Klargjør')}
                  </button>
                </div>
              </div>
            </motion.form>
          )}

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">{t('loading_change_orders', 'Laster endringsmeldinger...')}</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 bg-[#131722] rounded-2xl border border-dashed border-slate-800">
                <FileEdit size={32} className="mx-auto text-slate-500 mb-2" />
                <p className="text-sm font-bold text-slate-200">{t('no_orders_yet', 'Ingen tilleggsordrer registrert ennå')}</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                  {t('no_orders_guidance', 'Registrer alltid tilleggsarbeid skriftlig før arbeidet starter for å sikre full betaling og unngå tvister.')}
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/50"
                >
                  <Plus size={14} /> {t('btn_create_first_order', 'Opprett første endringsavtale')}
                </button>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 bg-[#131722] rounded-2xl border border-slate-800 hover:border-slate-700 shadow-sm transition-all"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-black rounded-md">
                          #{order.changeNumber}
                        </span>
                        <h4 className="font-bold text-white text-sm">{order.title}</h4>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            order.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : order.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {order.status === 'approved'
                            ? t('approved_by_client', 'Godkjent av kunde')
                            : order.status === 'rejected'
                            ? t('rejected', 'Avvist')
                            : t('waiting_approval', 'Venter på godkjenning')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{order.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                        <span>{t('created_date_prefix', 'Opprettet:')} {new Date(order.createdAt).toLocaleDateString('no-NO')}</span>
                        {order.impactDays > 0 && (
                          <span className="flex items-center gap-1 text-amber-400 font-semibold">
                            <Clock size={12} /> +{order.impactDays} {t('days_extension', 'dager fristforlengelse')}
                          </span>
                        )}
                        {order.signedByClientAt && (
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 size={12} /> {t('signed_prefix', 'Signert')} {new Date(order.signedByClientAt).toLocaleDateString('no-NO')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-base font-black text-white">
                          {(Number(order.amountExVat ?? (order as any).amount) || 0).toLocaleString('no-NO')} kr
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ({(Number(order.totalAmount ?? (order as any).total ?? ((Number(order.amountExVat ?? (order as any).amount) || 0) * 1.25)) || 0).toLocaleString('no-NO')} kr {t('inc_vat', 'ink. mva')})
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {order.shareUrl && (
                          <button
                            onClick={() => copyShareLink(order.shareUrl)}
                            title={t('copy_share_link_title', 'Kopier godkjenningslenke for kunde')}
                            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => pdfService.generateChangeOrderPDF(project, order)}
                          title={t('download_pdf_title', 'Last ned juridisk endringsavtale (PDF)')}
                          className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order)}
                          title={t('delete_order_title', 'Slett endringsordre')}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-500">
              {t('legal_binding_notice', 'Juridisk bindende iht. NS 8406 / Håndverkertjenesteloven')}
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {t('close', 'Lukk')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
