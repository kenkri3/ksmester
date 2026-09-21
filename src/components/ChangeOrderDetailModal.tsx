import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileSignature,
  Edit3,
  Eye,
  Printer,
  Copy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Save,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Building2,
  Mail,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { pdfService } from '../services/pdfService';
import { api } from '../services/api';
import { db, doc, updateDoc } from '../services/firebase';
import { Project } from '../types';
import { cn } from '../lib/utils';

interface ChangeOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  changeOrder: any;
  project?: Project | null;
  onSave?: (updatedOrder: any) => Promise<void> | void;
  onApprove?: (orderId: string) => Promise<void> | void;
  onDelete?: (orderId: string, title: string) => Promise<void> | void;
}

export default function ChangeOrderDetailModal({
  isOpen,
  onClose,
  changeOrder,
  project,
  onSave,
  onApprove,
  onDelete
}: ChangeOrderDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Form states for editing
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cause, setCause] = useState('kundetillegg');
  const [amountExVat, setAmountExVat] = useState<number>(0);
  const [impactDays, setImpactDays] = useState<number>(0);
  const [legalHjemmel, setLegalHjemmel] = useState('NS 8406 pkt. 19.2 (Krav om vederlagsjustering og fristforlengelse)');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [status, setStatus] = useState('pending_customer');

  // Synchronize state when changeOrder changes
  useEffect(() => {
    if (changeOrder) {
      setTitle(changeOrder.title || 'Endringsordre');
      setDescription(changeOrder.description || '');
      setCause(changeOrder.cause || 'kundetillegg');
      const amt = Number(changeOrder.amountExVat || changeOrder.amount || 0);
      setAmountExVat(amt);
      setImpactDays(Number(changeOrder.impactDays || changeOrder.days || 0));
      setLegalHjemmel(
        changeOrder.legalHjemmel || 
        changeOrder.legal || 
        'NS 8406 pkt. 19.2 (Krav om vederlagsjustering og fristforlengelse)'
      );
      setClientName(changeOrder.clientName || project?.clientName || '');
      setClientEmail(changeOrder.clientEmail || project?.clientEmail || '');
      setStatus(changeOrder.status || 'pending_customer');
      setActiveTab('preview');
    }
  }, [changeOrder, project]);

  if (!isOpen || !changeOrder) return null;

  const vatAmount = Math.round(amountExVat * 0.25);
  const totalAmount = amountExVat + vatAmount;
  const isApproved = status === 'Godkjent av kunde' || status === 'approved';
  const orderNumber = changeOrder.number || changeOrder.changeNumber || 1;
  const projectName = changeOrder.project || changeOrder.projectName || project?.name || 'Prosjekt';
  const projectAddress = project?.address || changeOrder.address || 'Byggeplass';

  const handleSave = async (andApprove: boolean = false) => {
    if (!title.trim()) {
      toast.error('Vennligst oppgi en tittel for endringsordren.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedFields: any = {
        title: title.trim(),
        description: description.trim(),
        cause,
        amountExVat,
        vatAmount,
        totalAmount,
        amount: amountExVat,
        impactDays,
        days: impactDays,
        legalHjemmel,
        legal: legalHjemmel,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        updatedAt: new Date().toISOString()
      };

      if (andApprove) {
        updatedFields.status = 'approved';
        updatedFields.signedByClientAt = new Date().toISOString();
        setStatus('Godkjent av kunde');
      }

      // Update via Firestore adapter
      try {
        await updateDoc(doc(db, 'change_orders', changeOrder.id), updatedFields);
      } catch (dbErr) {
        await api.saveDoc('change_orders', {
          id: changeOrder.id,
          ...changeOrder,
          ...updatedFields
        });
      }

      if (onSave) {
        await onSave({
          ...changeOrder,
          ...updatedFields
        });
      }

      toast.success(andApprove ? 'Endringsordre oppdatert og godkjent!' : 'Endringer er lagret!');
      setActiveTab('preview');
    } catch (err) {
      console.error('Feil ved lagring av endringsordre:', err);
      toast.error('Kunne ikke lagre endringene.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDirectApprove = async () => {
    if (!onApprove) return;
    setIsApproving(true);
    try {
      await onApprove(changeOrder.id);
      setStatus('Godkjent av kunde');
      toast.success(`Endringsordre #${orderNumber} er godkjent!`);
    } catch (err) {
      console.error(err);
      toast.error('Kunne ikke godkjenne endringsordre.');
    } finally {
      setIsApproving(false);
    }
  };

  const handlePrint = () => {
    try {
      // Create high-res A4 printable document
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Utskriftsvindu ble blokkert av nettleseren. Tillat popups for KS Mester.');
        return;
      }

      const formattedHtml = `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <title>Endringsordre #${orderNumber} - ${title}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 3px solid #7c3aed;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .logo {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .badge {
      background: #7c3aed;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-title {
      font-size: 22px;
      font-weight: 900;
      margin: 12px 0 4px 0;
      color: #0f172a;
    }
    .doc-sub {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 20px;
    }
    .grid-meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .meta-field label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      display: block;
      margin-bottom: 2px;
    }
    .meta-field div {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 20px 0 8px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .content-box {
      font-size: 13px;
      color: #334155;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 13px;
    }
    th, td {
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f1f5f9;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      color: #475569;
    }
    .total-row td {
      font-weight: 900;
      font-size: 15px;
      background: #faf5ff;
      color: #6b21a8;
      border-top: 2px solid #7c3aed;
    }
    .clause-box {
      background: #fdf4ff;
      border: 1px solid #f5d0fe;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 11px;
      color: #701a75;
      line-height: 1.5;
      margin-top: 20px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 36px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-line {
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      font-size: 11px;
      color: #64748b;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">VIKINGMESTER KS & PROSJEKTSTYRING</div>
      <div class="doc-title">VARSEL OM ENDRING #${orderNumber}</div>
      <div class="doc-sub">${legalHjemmel}</div>
    </div>
    <div>
      <span class="badge">${isApproved ? 'GODKJENT AV KUNDE' : 'VENTER PÅ GODKJENNING'}</span>
    </div>
  </div>

  <div class="grid-meta">
    <div class="meta-field">
      <label>Prosjekt</label>
      <div>${projectName}</div>
      <div style="font-size: 11px; color: #64748b; font-weight: normal;">${projectAddress}</div>
    </div>
    <div class="meta-field">
      <label>Byggherre / Oppdragsgiver</label>
      <div>${clientName || 'Kunde'}</div>
      <div style="font-size: 11px; color: #64748b; font-weight: normal;">${clientEmail || '-'}</div>
    </div>
    <div class="meta-field">
      <label>Dato registrert</label>
      <div>${new Date().toLocaleDateString('no-NO')}</div>
    </div>
    <div class="meta-field">
      <label>Årsak / Kategori</label>
      <div style="text-transform: capitalize;">${cause}</div>
    </div>
  </div>

  <div class="section-title">Beskrivelse av tilleggsarbeid & endring</div>
  <div class="content-box">
    <strong>${title}</strong>
    <p style="margin: 6px 0 0 0;">${description || 'Arbeidet er avtalt eller påkrevet som tillegg til opprinnelig kontrakt.'}</p>
  </div>

  <div class="section-title">Økonomisk oppstilling & fremdrift</div>
  <table>
    <thead>
      <tr>
        <th>Post</th>
        <th style="text-align: right;">Beløp</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Netto tilleggskrav eks. mva</td>
        <td style="text-align: right; font-weight: 700;">kr ${amountExVat.toLocaleString('no-NO')}</td>
      </tr>
      <tr>
        <td>Merverdiavgift (25% mva)</td>
        <td style="text-align: right; font-weight: 700;">kr ${vatAmount.toLocaleString('no-NO')}</td>
      </tr>
      <tr class="total-row">
        <td>Total vederlagsjustering inkl. mva</td>
        <td style="text-align: right;">kr ${totalAmount.toLocaleString('no-NO')}</td>
      </tr>
      <tr>
        <td>Fremdriftskonsekvens (fristforlengelse)</td>
        <td style="text-align: right; font-weight: 700; color: #b45309;">
          ${impactDays > 0 ? `+${impactDays} virkedager` : 'Ingen forsinkelse'}
        </td>
      </tr>
    </tbody>
  </table>

  <div class="clause-box">
    <strong>Standardvilkår:</strong> Dette varselet er fremmet i samsvar med Norsk Standard (NS 8406 pkt. 19.2 / Håndverkertjenesteloven § 9). 
    Eventuelle innsigelser mot grunnlag eller vederlag må fremmes uten ugrunnet opphold. 
    Arbeidet faktureres etter avtalt framdrift eller på sluttfaktura.
  </div>

  <div class="signatures">
    <div>
      <div style="height: 35px;"></div>
      <div class="sig-line">
        <strong>Utarbeidet for entreprenør:</strong><br>
        VikingMester Byggeledelse
      </div>
    </div>
    <div>
      <div style="height: 35px;">
        ${isApproved ? '<span style="color: #16a34a; font-weight: bold; font-size: 13px;">✓ Digitalt signert og godkjent</span>' : ''}
      </div>
      <div class="sig-line">
        <strong>Byggherres aksept / signatur:</strong><br>
        ${clientName || 'Kunde'} (${isApproved ? 'Signert' : 'Venter på signatur'})
      </div>
    </div>
  </div>
</body>
</html>
      `;

      printWindow.document.write(formattedHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 400);
    } catch (e) {
      console.error(e);
      // Fallback to pdfService
      const fakeProject: Project = project || {
        id: changeOrder.projectId || 'gen',
        name: projectName,
        clientName,
        clientEmail
      } as any;
      pdfService.generateChangeOrderPDF(fakeProject, {
        ...changeOrder,
        title,
        description,
        cause: cause as any,
        amountExVat,
        vatAmount,
        totalAmount,
        impactDays,
        changeNumber: orderNumber,
        status: isApproved ? 'approved' : 'pending_customer',
        createdAt: changeOrder.createdAt || new Date().toISOString()
      });
      toast.success('Genererte endringsordre som PDF!');
    }
  };

  const handleCopyShareLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = changeOrder.shareUrl || `${baseUrl}?changeOrderToken=${changeOrder.token || changeOrder.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Kundeportal-lenke er kopiert til utklippstavlen!');
  };

  const handleSendEmail = async () => {
    if (!clientEmail.trim()) {
      toast.error('Mangler kundens e-postadresse. Fyll den inn i Rediger-fanen.');
      return;
    }

    setIsSendingEmail(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const shareUrl = changeOrder.shareUrl || `${baseUrl}?changeOrderToken=${changeOrder.token || changeOrder.id}`;

      await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clientEmail.trim(),
          subject: `Endringsmelding #${orderNumber}: ${title} - ${projectName}`,
          content: `
            Hei ${clientName || 'Kunde'}!

            Det er utstedt et formelt varsel om tilleggsarbeid / endringsordre på prosjektet "${projectName}":

            • Arbeid: ${title}
            • Beskrivelse: ${description || 'Tilleggsarbeid'}
            • Beløp: kr ${amountExVat.toLocaleString('no-NO')} eks. mva (kr ${totalAmount.toLocaleString('no-NO')} inkl. mva)
            • Fristforlengelse: ${impactDays > 0 ? `+${impactDays} virkedager` : 'Ingen forsinkelse'}

            Vennligst gå gjennom spesifikasjonen og signer digitalt her:
            ${shareUrl}

            Med vennlig hilsen,
            VikingMester Byggeledelse
          `
        })
      });
      toast.success(`Endringsordre #${orderNumber} ble sendt til ${clientEmail}!`);
    } catch (e) {
      console.error(e);
      toast.error('Kunne ikke sende e-post.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden text-slate-100"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                <FileSignature size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Endringsordre #{orderNumber}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                    isApproved 
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  )}>
                    {isApproved ? '✓ Godkjent av kunde' : '⏳ Venter på godkjenning'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white truncate mt-1">
                  {title}
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  {projectName} {clientName ? `• Byggherre: ${clientName}` : ''}
                </p>
              </div>
            </div>

            {/* Tab Switcher & Close */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    activeTab === 'preview'
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Eye size={14} />
                  <span>Forhåndsvisning</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    activeTab === 'edit'
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Edit3 size={14} />
                  <span>Rediger før godkjenning</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Lukk"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60">
            {activeTab === 'preview' ? (
              /* TAB 1: ELEGANT A4 PREVIEW */
              <div className="max-w-3xl mx-auto bg-white text-slate-900 rounded-2xl shadow-xl p-6 sm:p-10 border border-slate-200">
                {/* Brevhode */}
                <div className="border-b-2 border-slate-900 pb-5 mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <div className="text-xs font-black tracking-wider uppercase text-purple-700 flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      <span>VikingMester KS & Byggeledelse</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                      VARSEL OM ENDRINGSORDRE
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {legalHjemmel}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-900 text-white">
                      Endringsordre #{orderNumber}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-medium">
                      Dato: {new Date().toLocaleDateString('no-NO')}
                    </div>
                  </div>
                </div>

                {/* Prosjekt & Partinfo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 text-xs">
                  <div>
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                      Byggeplass / Prosjekt:
                    </span>
                    <div className="font-bold text-slate-900 text-sm">{projectName}</div>
                    <div className="text-slate-600 mt-0.5">{projectAddress}</div>
                  </div>
                  <div>
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                      Byggherre / Oppdragsgiver:
                    </span>
                    <div className="font-bold text-slate-900 text-sm">{clientName || 'Kunde'}</div>
                    <div className="text-slate-600 mt-0.5">{clientEmail || 'Ingen e-post oppgitt'}</div>
                  </div>
                </div>

                {/* Beskrivelse */}
                <div className="mb-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1.5 mb-2">
                    Beskrivelse av endring og tilleggsarbeid
                  </h3>
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed">
                    <div className="font-bold text-slate-950 text-base mb-1">{title}</div>
                    <p className="whitespace-pre-wrap text-slate-700">
                      {description || 'Arbeidet er avtalt eller krevet utført som tillegg til opprinnelig kontrakt.'}
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                      <span className="font-bold text-slate-700">Årsak til kravet:</span>
                      <span className="capitalize">{cause}</span>
                    </div>
                  </div>
                </div>

                {/* Økonomisk tabell */}
                <div className="mb-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1.5 mb-2">
                    Økonomisk oppstilling & fremdriftskonsekvens
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs sm:text-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-extrabold">
                        <tr>
                          <th className="p-3">Beskrivelse</th>
                          <th className="p-3 text-right">Beløp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-3 font-medium text-slate-800">Netto tilleggssum eks. mva</td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            kr {amountExVat.toLocaleString('no-NO')}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium text-slate-800">Merverdiavgift (25% mva)</td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            kr {vatAmount.toLocaleString('no-NO')}
                          </td>
                        </tr>
                        <tr className="bg-purple-50/80 font-black text-purple-950 text-sm sm:text-base">
                          <td className="p-3">Total sum inkl. 25% mva</td>
                          <td className="p-3 text-right text-purple-700">
                            kr {totalAmount.toLocaleString('no-NO')}
                          </td>
                        </tr>
                        <tr className="bg-amber-50/50">
                          <td className="p-3 text-amber-900 font-bold">Fremdriftskonsekvens (fristforlengelse)</td>
                          <td className="p-3 text-right font-extrabold text-amber-800">
                            {impactDays > 0 ? `+${impactDays} virkedager` : 'Ingen forsinkelse'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Juridisk klausul */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed mb-6">
                  <strong>Juridisk merknad (NS 8406 pkt. 19.2):</strong> Entreprenøren varsler med dette formelt om krav på vederlagsjustering og eventuell fristforlengelse. Eventuelle innsigelser mot grunnlag eller vederlag må fremsettes uten ugrunnet opphold. Arbeidet igangsettes når skriftlig godkjenning eller bestilling foreligger.
                </div>

                {/* Signaturblokk */}
                <div className="pt-4 border-t-2 border-dashed border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-black tracking-wider mb-1">Utarbeidet av entreprenør</div>
                    <div className="font-bold text-slate-900">VikingMester Byggeledelse</div>
                    <div className="text-[11px] text-slate-500">Dato: {new Date().toLocaleDateString('no-NO')}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-black tracking-wider mb-1">Byggherres godkjenning</div>
                    {isApproved ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-black">
                        <CheckCircle2 size={16} />
                        <span>Godkjent og attestert</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                        <Clock size={16} />
                        <span>Avventer digital signatur</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 mt-0.5">{clientName || 'Kunde'}</div>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: LIVE EDIT FORM */
              <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Edit3 className="text-purple-400" size={16} />
                    <span>Rediger endringsordre før godkjenning</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gjør korrigeringer på beløp, tittel, dager eller beskrivelse før varselet oversendes eller godkjennes.
                  </p>
                </div>

                {/* Tittel */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tittel på tilleggsarbeid / endring *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="f.eks. Ekstra bæring for utvendig kledning"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                </div>

                {/* Beløp & Dager */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Beløp eks. mva (NOK) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={amountExVat}
                      onChange={(e) => setAmountExVat(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
                    />
                    <div className="mt-1 text-[11px] text-slate-400 flex justify-between">
                      <span>Inkl. 25% mva:</span>
                      <strong className="text-emerald-400 font-bold">kr {totalAmount.toLocaleString('no-NO')}</strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Fremdriftskonsekvens (+ virkedager)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={impactDays}
                      onChange={(e) => setImpactDays(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
                    />
                    <div className="mt-1 text-[11px] text-slate-400">
                      Fristforlengelse for ferdigstillelse
                    </div>
                  </div>
                </div>

                {/* Årsak & Hjemmel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Årsak til endring
                    </label>
                    <select
                      value={cause}
                      onChange={(e) => setCause(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-purple-500 outline-none"
                    >
                      <option value="kundetillegg">Kundetillegg / Bestilling fra byggherre</option>
                      <option value="prosjektering">Prosjekteringsendring / Tegningsavvik</option>
                      <option value="uforutsett">Uforutsette forhold på byggeplass</option>
                      <option value="myndighetskrav">Pålegg fra TEK17 / Myndigheter</option>
                      <option value="annet">Annet tilleggsarbeid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Juridisk hjemmel
                    </label>
                    <input
                      type="text"
                      value={legalHjemmel}
                      onChange={(e) => setLegalHjemmel(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                {/* Beskrivelse */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Utfyllende beskrivelse av arbeidet
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Beskriv arbeidet nøyaktig, materialer som inngår og eventuelle forutsetninger..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-purple-500 outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Byggherre Detaljer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Byggherre / Kundens navn
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ola Nordmann"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Kundens e-postadresse
                    </label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="kunde@eksempel.no"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              {activeTab === 'preview' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>Rediger detaljer</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Skriv ut eller lagre som PDF"
                  >
                    <Printer size={14} />
                    <span>Skriv ut / PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Kopier kundeportal-lenke"
                  >
                    <Copy size={14} />
                    <span className="hidden sm:inline">Kopier lenke</span>
                  </button>
                  {clientEmail && (
                    <button
                      type="button"
                      disabled={isSendingEmail}
                      onClick={handleSendEmail}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Send på e-post til byggherre"
                    >
                      <Mail size={14} />
                      <span className="hidden sm:inline">{isSendingEmail ? 'Sender...' : 'Send e-post'}</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Avbryt
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'edit' ? (
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSave(false)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{isSaving ? 'Lagrer...' : 'Lagre endringer'}</span>
                  </button>
                  {!isApproved && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSave(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>Lagre og godkjenn</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  {!isApproved && (
                    <button
                      type="button"
                      disabled={isApproving}
                      onClick={handleDirectApprove}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>{isApproving ? 'Godkjenner...' : 'Godkjenn nå'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Lukk
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
