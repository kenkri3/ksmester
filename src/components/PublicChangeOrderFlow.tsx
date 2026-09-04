import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  FileText, 
  Download, 
  RotateCcw, 
  Building2, 
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Logo from './Logo';
import { ChangeOrder, Project } from '../types';
import { changeOrderService } from '../services/changeOrderService';
import { pdfService } from '../services/pdfService';
import { api } from '../services/api';
import { toast } from 'sonner';

interface PublicChangeOrderFlowProps {
  token: string;
  onNavigateToPortal?: (projectId: string) => void;
}

export default function PublicChangeOrderFlow({
  token,
  onNavigateToPortal
}: PublicChangeOrderFlowProps) {
  const [order, setOrder] = useState<ChangeOrder | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [isSigned, setIsSigned] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const foundOrder = await changeOrderService.getChangeOrderByToken(token);
      if (foundOrder) {
        setOrder(foundOrder);
        setSignerName(foundOrder.clientName || '');
        if (foundOrder.status === 'approved') {
          setIsSigned(true);
        }

        // Fetch project
        const projects = await api.getDocs<Project>('projects');
        const foundProject = projects.find(p => p.id === foundOrder.projectId);
        if (foundProject) {
          setProject(foundProject);
        }
      }
    } catch (e) {
      console.warn('Error loading change order by token:', e);
    } finally {
      setLoading(false);
    }
  };

  // Canvas signature helpers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setHasDrawn(true);
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      setHasDrawn(false);
    }
  };

  const handleApprove = async () => {
    if (!order) return;
    if (!signerName.trim()) {
      toast.error('Vennligst oppgi fullt navn for signeringen.');
      return;
    }

    let signatureUrl = '';
    if (canvasRef.current && hasDrawn) {
      signatureUrl = canvasRef.current.toDataURL('image/png');
    }

    setIsSubmitting(true);
    try {
      const updated = await changeOrderService.approveChangeOrder(
        order.id,
        signatureUrl,
        signerName
      );

      if (updated) {
        setOrder(updated);
        setIsSigned(true);
        toast.success('Tilleggsavtalen er godkjent og signert!');
      }
    } catch (e) {
      toast.error('Kunne ikke godkjenne endringen. Prøv igjen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-neutral-400">Laster tilleggsavtale...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4 text-white">
        <div className="max-w-md bg-neutral-800 rounded-3xl p-8 text-center space-y-4 border border-neutral-700">
          <AlertCircle size={40} className="text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Ugyldig eller utløpt lenke</h2>
          <p className="text-xs text-neutral-400">
            Finner ingen aktiv endringsmelding tilknyttet denne sikkerhetskoden. Kontakt din håndverker for oppdatert lenke.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center py-8 sm:py-16 px-4">
      {/* Brand Header */}
      <div className="max-w-2xl w-full mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Logo size="md" className="text-white" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
            Endringsavtale
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-800">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>NS 8406 / Håndverkertjenesteloven</span>
        </div>
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-10 shadow-2xl space-y-8"
      >
        {/* Title & Metadata */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-black rounded-lg border border-amber-500/20">
              Endringsmelding #{order.changeNumber}
            </span>
            {isSigned ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <CheckCircle2 size={13} /> Godkjent & Signert
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <Clock size={13} /> Venter på godkjenning
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{order.title}</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Prosjekt: <strong className="text-neutral-200">{project?.name || 'Byggeprosjekt'}</strong> | Lokasjon: {project?.location || 'Byggeplass'}
          </p>
        </div>

        {/* Description */}
        <div className="bg-neutral-800/60 p-6 rounded-2xl border border-neutral-700/60 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
            Beskrivelse av tilleggsarbeid
          </div>
          <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-line">
            {order.description || 'Spesifisert tilleggsarbeid utføres fagmessig iht. Norsk Standard og gjeldende TEK17 forskrifter.'}
          </p>
        </div>

        {/* Economic & Progress Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-neutral-800/40 rounded-2xl border border-neutral-800 space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Pris for tillegget
            </div>
            <div className="text-2xl font-black text-amber-400">
              {order.totalAmount.toLocaleString('no-NO')} kr
            </div>
            <div className="text-[11px] text-neutral-400">
              ({order.amountExVat.toLocaleString('no-NO')} kr eks. mva + {order.vatAmount.toLocaleString('no-NO')} kr mva)
            </div>
          </div>

          <div className="p-5 bg-neutral-800/40 rounded-2xl border border-neutral-800 space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Fremdriftskonsekvens
            </div>
            <div className="text-2xl font-black text-neutral-100">
              {order.impactDays > 0 ? `+${order.impactDays} dager` : 'Ingen forsinkelse'}
            </div>
            <div className="text-[11px] text-neutral-400">
              {order.impactDays > 0 ? 'Fristforlengelse for entreprenør' : 'Ferdigstillelsesdato uendret'}
            </div>
          </div>
        </div>

        {/* Legal terms clause */}
        <div className="text-xs text-neutral-400 bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-1">
          <div className="font-bold text-neutral-300">Juridisk grunnlag:</div>
          <p className="leading-relaxed text-[11px]">
            Ved godkjenning aksepterer byggherre at ovennevnte arbeid utføres som et bindende tillegg til opprinnelig kontrakt iht. NS 8406 pkt. 19 / Håndverkertjenesteloven § 9. Beløpet vil bli fakturert ved fullføring.
          </p>
        </div>

        {/* Signature Area */}
        {!isSigned ? (
          <div className="space-y-4 pt-4 border-t border-neutral-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              Signer og godkjenn tilleggsavtale
            </h3>

            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">
                Ditt fulle navn *
              </label>
              <input
                type="text"
                required
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="f.eks. Ola Nordmann"
                className="w-full px-4 py-3 bg-neutral-800 rounded-xl border border-neutral-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-neutral-300">
                  Tegn din signatur på skjermen
                </label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Tøm signatur
                </button>
              </div>
              <div className="bg-white rounded-xl overflow-hidden touch-none border border-neutral-700">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={140}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                  className="w-full h-[140px] cursor-crosshair block"
                />
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">
                Tegn signaturen din med musen eller fingeren på berøringsskjerm.
              </div>
            </div>

            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all cursor-pointer"
            >
              <CheckCircle2 size={18} />
              {isSubmitting ? 'Signerer og godkjenner...' : 'Godkjenn og start tilleggsarbeid'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t border-neutral-800">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-2">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Endringsavtalen er gyldig signert!</h3>
              <p className="text-xs text-neutral-300">
                Signert av {order.clientName} den {order.signedByClientAt ? new Date(order.signedByClientAt).toLocaleString('no-NO') : 'i dag'}.
              </p>
              <div className="pt-3 flex flex-col sm:flex-row justify-center gap-3">
                {project && (
                  <button
                    onClick={() => pdfService.generateChangeOrderPDF(project, order)}
                    className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all"
                  >
                    <Download size={14} /> Last ned signert avtale (PDF)
                  </button>
                )}
                {onNavigateToPortal && project && (
                  <button
                    onClick={() => onNavigateToPortal(project.id)}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 transition-all"
                  >
                    Gå til Kundeportalen <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
