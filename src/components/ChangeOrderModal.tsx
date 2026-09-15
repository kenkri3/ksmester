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
    .reduce((sum, o) => sum + o.amountExVat, 0);

  const totalPending = orders
    .filter(o => o.status === 'pending_customer')
    .reduce((sum, o) => sum + o.amountExVat, 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-6 sm:p-8 max-h-[90vh] flex flex-col border border-neutral-200"
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <FileEdit size={20} />
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                  NS 8406 / Håndverkertjenesteloven § 9
                </span>
              </div>
              <h2 className="text-2xl font-black text-neutral-900">Endringsmeldinger & Tilleggsarbeid</h2>
              <p className="text-xs text-neutral-500">
                Prosjekt: {project.name} | Sikrer skriftlig avtale før arbeid starter
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-4 my-6">
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Godkjent tillegg</div>
              <div className="text-xl font-black text-emerald-600">
                {totalApproved.toLocaleString('no-NO')} kr
              </div>
              <div className="text-[10px] text-neutral-400">eks. mva (+25% mva lagt til på sluttfaktura)</div>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Venter på kunde</div>
              <div className="text-xl font-black text-amber-600">
                {totalPending.toLocaleString('no-NO')} kr
              </div>
              <div className="text-[10px] text-neutral-400">Kunden må godkjenne før start</div>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Totalt antall</div>
                <div className="text-xl font-black text-neutral-900">{orders.length} saker</div>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="px-3 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-800 transition-all"
              >
                <Plus size={14} /> Ny endring
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
              className="bg-amber-500/5 p-6 rounded-2xl border border-amber-500/20 mb-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <Coins size={16} className="text-amber-600" />
                  Opprett ny endringsordre (Tar under 1 minutt)
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-neutral-400 hover:text-neutral-700 text-xs"
                >
                  Avbryt
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Hva gjelder tillegget? *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="f.eks. Ekstra downlights i stue eller utskifting av bunnsvill"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Årsak til endringen
                  </label>
                  <select
                    value={cause}
                    onChange={(e) => setCause(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="kundetillegg">Kundeønske / Tilleggsbestilling</option>
                    <option value="uforutsett_forhold">Uforutsett bygningsmessig forhold (f.eks. råte/skade)</option>
                    <option value="prosjektering">Endring i prosjektering / arkitekt</option>
                    <option value="myndighetskrav">Pålegg fra kommune / brann / el-tilsyn</option>
                    <option value="annet">Annet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Beskrivelse av arbeidet og materialer
                </label>
                <textarea
                  rows={2}
                  placeholder="Spesifiser hva som skal gjøres, materialer som inngår og forutsetninger..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Pris eks. mva (kr) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={amountExVat || ''}
                    onChange={(e) => setAmountExVat(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-neutral-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="text-[10px] text-neutral-400 mt-1">
                    Ink. mva: {Math.round(amountExVat * 1.25).toLocaleString('no-NO')} kr
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Fremdriftskonsekvens (+ dager)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={impactDays}
                    onChange={(e) => setImpactDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="text-[10px] text-neutral-400 mt-1">Fristforlengelse for entreprenør</div>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Send size={14} />
                    {isSubmitting ? 'Sender...' : 'Opprett & Klargjør'}
                  </button>
                </div>
              </div>
            </motion.form>
          )}

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className="text-center py-12 text-neutral-400 text-sm">Laster endringsmeldinger...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                <FileEdit size={32} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-sm font-bold text-neutral-700">Ingen tilleggsordrer registrert ennå</p>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 mb-4">
                  Registrer alltid tilleggsarbeid skriftlig før arbeidet starter for å sikre full betaling og unngå tvister.
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Opprett første endringsavtale
                </button>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 bg-white rounded-2xl border border-neutral-200 hover:border-neutral-300 shadow-sm transition-all"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-xs font-black rounded-md">
                          #{order.changeNumber}
                        </span>
                        <h4 className="font-bold text-neutral-900 text-sm">{order.title}</h4>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            order.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : order.status === 'rejected'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {order.status === 'approved'
                            ? 'Godkjent av kunde'
                            : order.status === 'rejected'
                            ? 'Avvist'
                            : 'Venter på godkjenning'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{order.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-neutral-400">
                        <span>Opprettet: {new Date(order.createdAt).toLocaleDateString('no-NO')}</span>
                        {order.impactDays > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 font-semibold">
                            <Clock size={12} /> +{order.impactDays} dager fristforlengelse
                          </span>
                        )}
                        {order.signedByClientAt && (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 size={12} /> Signert {new Date(order.signedByClientAt).toLocaleDateString('no-NO')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-base font-black text-neutral-900">
                          {order.amountExVat.toLocaleString('no-NO')} kr
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          ({order.totalAmount.toLocaleString('no-NO')} kr ink. mva)
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {order.shareUrl && (
                          <button
                            onClick={() => copyShareLink(order.shareUrl)}
                            title="Kopier godkjenningslenke for kunde"
                            className="p-2 text-neutral-500 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-lg text-xs font-bold transition-all"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => pdfService.generateChangeOrderPDF(project, order)}
                          title="Last ned juridisk endringsavtale (PDF)"
                          className="p-2 text-neutral-500 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order)}
                          title="Slett endringsordre"
                          className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
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
          <div className="pt-6 border-t border-neutral-100 flex justify-between items-center">
            <span className="text-xs text-neutral-400">
              Juridisk bindende iht. NS 8406 / Håndverkertjenesteloven
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all"
            >
              Lukk
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
