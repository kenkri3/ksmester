import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  FileText, 
  ArrowRight, 
  Download, 
  ShieldCheck, 
  PenTool, 
  RotateCcw, 
  Building2, 
  Calendar, 
  User, 
  Clock, 
  AlertCircle,
  FileSignature,
  Mail,
  Check,
  ChevronLeft
} from 'lucide-react';
import { Offer, Contract, Project } from '../types';
import { api } from '../services/api';
import { pdfService } from '../services/pdfService';
import { mesterhjerneService } from '../services/mesterhjerneService';
import { toast } from 'sonner';

interface PublicOfferFlowProps {
  token?: string;
  offerId?: string;
  onNavigateToPortal?: (projectId: string) => void;
  onBackToApp?: () => void;
}

export default function PublicOfferFlow({ 
  token, 
  offerId, 
  onNavigateToPortal,
  onBackToApp 
}: PublicOfferFlowProps) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [activeScreen, setActiveScreen] = useState<'offer' | 'contract' | 'success'>('offer');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signatur-tilstander
  const [signerName, setSignerName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);

  // Canvas for digital signatur
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignatureDrawing, setHasSignatureDrawing] = useState(false);

  useEffect(() => {
    async function loadOfferData() {
      setLoading(true);
      try {
        const offers = await api.getCollection('offers');
        let matched: Offer | undefined;

        if (token) {
          matched = offers.find((o: any) => o.token === token || o.id === token);
        } else if (offerId) {
          matched = offers.find((o: any) => o.id === offerId);
        }

        // Fallback demo-tilbud dersom ingenting ble funnet
        if (!matched) {
          if (offers.length > 0) {
            matched = offers[0];
          } else {
            matched = {
              id: 'demo-offer-1',
              title: 'Totalrenovering av baderom og rør-i-rør system',
              projectCode: 'P-2026-BAD01',
              clientName: 'Ola Nordmann',
              clientEmail: 'ola.nordmann@example.com',
              company: 'Mester Entreprenør AS',
              companyName: 'Mester Entreprenør AS',
              companyOrgNumber: '998 877 665 MVA',
              description: 'Komplett oppgradering av baderom iht. TEK17 og Byggebransjens Våtromsnorm. Inkluderer riving, fuktsikring, smøremembran med mansjetter, rør-i-rør fordelerskap, varmekabler, flislegging og sanitærmontasje.',
              totalAmount: 185000,
              status: 'sent',
              createdAt: new Date().toISOString(),
              validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
              authorId: 'u-admin-123',
              authorName: 'Ken (Ansvarlig Byggmester)',
              items: [
                { description: 'Riving av eksisterende bad, kildesortering og bortkjøring av avfall', quantity: 1, unit: 'fastpris', pricePerUnit: 18000, total: 18000 },
                { description: 'Rørleggerarbeid: Nytt rør-i-rør fordelerskap, avløp og montering av armaturer', quantity: 32, unit: 'timer', pricePerUnit: 1150, total: 36800 },
                { description: 'Elektrikerarbeid: Varmekabel, ny kurs, LED-downlights og stikkontakter', quantity: 1, unit: 'pakke', pricePerUnit: 28500, total: 28500 },
                { description: 'Murer/membranarbeid: Avretting, slukmansjett, 2-lags smøremembran og flislegging', quantity: 45, unit: 'timer', pricePerUnit: 980, total: 44100 },
                { description: 'Tømrerarbeid: Forsterkning av stenderverk, våtromsplater og himling', quantity: 38, unit: 'timer', pricePerUnit: 950, total: 36100 },
                { description: 'Sluttkontroll, trykkprøving og komplett FDV-dokumentasjon', quantity: 1, unit: 'fastpris', pricePerUnit: 21500, total: 21500 }
              ]
            };
          }
        }

        setOffer(matched);
        setSignerName(matched.clientName || '');

        // Generer kontraktsobjektet klart basert på tilbudet
        const generatedContract = mesterhjerneService.generateContractFromOffer(matched);
        setContract(generatedContract);

        // Hvis tilbudet allerede er akseptert, sjekk om prosjektet finnes
        if (matched.status === 'accepted') {
          const projects = await api.getCollection('projects');
          const foundProj = projects.find((p: any) => p.clientName === matched?.clientName || p.name.includes(matched?.title || ''));
          if (foundProj) {
            setCreatedProject(foundProj);
            setActiveScreen('success');
          }
        }
      } catch (err) {
        console.error('Error loading offer:', err);
        setError('Kunne ikke laste inn tilbudet.');
      } finally {
        setLoading(false);
      }
    }

    loadOfferData();
  }, [token, offerId]);

  // Canvas tegnelogikk
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignatureDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignatureDrawing(false);
  };

  // 1. Kunde godkjenner tilbud ➔ Sømløs overgang til Kontrakt PÅ SAMME SKJERM
  const handleApproveOffer = () => {
    if (!contract && offer) {
      const gen = mesterhjerneService.generateContractFromOffer(offer);
      setContract(gen);
    }
    setActiveScreen('contract');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Tilbud bekreftet! Kontrakten er generert og ligger klar nedenfor.');
  };

  // 2. Kunde signerer kontrakt ➔ Mesterhjernen aktiverer prosjektet 100% automatisk
  const handleSignContract = async () => {
    if (!termsAccepted) {
      toast.error('Vennligst huk av for at du har lest og akseptert avtalevilkårene.');
      return;
    }
    if (!signerName.trim()) {
      toast.error('Vennligst oppgi fullt navn for digital signatur.');
      return;
    }
    if (!contract) return;

    setIsProcessing(true);
    try {
      let signatureData = 'DIGITAL_E_SIGN_' + Date.now();
      if (canvasRef.current && hasSignatureDrawing) {
        signatureData = canvasRef.current.toDataURL('image/png');
      }

      // Aktiver Mesterhjernen
      const result = await mesterhjerneService.executeFullProjectInitialization(
        contract,
        offer || undefined,
        {
          signatureData,
          signerName,
          signerIp: 'Klient-IP (Kryptert)'
        }
      );

      setCreatedProject(result.project);
      setActiveScreen('success');
      toast.success('🎉 Kontrakt er signert og prosjektet er nå aktivert!');
    } catch (err) {
      console.error('Error in project activation:', err);
      toast.error('Det oppsto en feil under signering. Vennligst prøv igjen.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-neutral-400 font-medium">Laster tilbudsportal...</p>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="bg-neutral-800 border border-neutral-700 rounded-3xl p-8 max-w-md text-center text-white space-y-4">
          <AlertCircle size={48} className="text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold">Fant ikke tilbudet</h2>
          <p className="text-neutral-400 text-sm">{error || 'Tilbudslenken kan være utgått eller ugyldig.'}</p>
          {onBackToApp && (
            <button onClick={onBackToApp} className="px-6 py-2.5 bg-neutral-700 hover:bg-neutral-600 rounded-xl text-sm font-bold transition-all">
              Tilbake til startsiden
            </button>
          )}
        </div>
      </div>
    );
  }

  const subtotal = offer.totalAmount || 0;
  const mva = subtotal * 0.25;
  const grandTotal = subtotal + mva;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-6 sm:py-12 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Topp-header med bedriftsinfo */}
        <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Building2 size={28} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Offisielt Dokument</div>
              <h1 className="text-xl sm:text-2xl font-bold">{offer.companyName || offer.company || 'Mester Entreprenør AS'}</h1>
              <p className="text-xs text-neutral-400">Org.nr: {offer.companyOrgNumber || '998 877 665 MVA'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => pdfService.generateOfferPDF(offer)}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-xs font-bold text-neutral-200 transition-all"
            >
              <Download size={16} /> Last ned PDF
            </button>
            {onBackToApp && (
              <button 
                onClick={onBackToApp}
                className="p-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-neutral-400 hover:text-white transition-all"
                title="Lukk visning"
              >
                <ChevronLeft size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Steg-indikator (Tilbud ➔ Kontrakt ➔ Prosjekt) */}
        <div className="flex items-center justify-between px-4">
          <div className={`flex items-center gap-2 text-xs font-bold ${activeScreen === 'offer' ? 'text-emerald-400' : 'text-neutral-500'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeScreen === 'offer' ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}>1</div>
            <span>Gjennomgå tilbud</span>
          </div>
          <div className="flex-1 h-0.5 bg-neutral-800 mx-4" />
          <div className={`flex items-center gap-2 text-xs font-bold ${activeScreen === 'contract' ? 'text-indigo-400' : activeScreen === 'success' ? 'text-emerald-400' : 'text-neutral-500'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeScreen === 'contract' ? 'bg-indigo-500 text-white' : activeScreen === 'success' ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}>2</div>
            <span>Signer kontrakt</span>
          </div>
          <div className="flex-1 h-0.5 bg-neutral-800 mx-4" />
          <div className={`flex items-center gap-2 text-xs font-bold ${activeScreen === 'success' ? 'text-emerald-400' : 'text-neutral-500'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeScreen === 'success' ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}>3</div>
            <span>Kundeportal & KS</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ========================================================= */}
          {/* STEG 1: TILBUDSPRESENTASJON                                */}
          {/* ========================================================= */}
          {activeScreen === 'offer' && (
            <motion.div 
              key="offer-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Tilbudskort */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
                  <div>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">
                      {offer.projectCode || 'P-2026'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold mt-2">{offer.title}</h2>
                    <p className="text-neutral-400 text-sm mt-1">
                      Tilbud til: <strong className="text-neutral-200">{offer.clientName}</strong> {offer.clientEmail && `(${offer.clientEmail})`}
                    </p>
                  </div>
                  <div className="text-left sm:text-right space-y-1 text-xs text-neutral-400">
                    <div className="flex items-center sm:justify-end gap-1">
                      <Calendar size={14} /> Dato: {new Date(offer.createdAt || Date.now()).toLocaleDateString('no-NO')}
                    </div>
                    <div className="flex items-center sm:justify-end gap-1 text-amber-400">
                      <Clock size={14} /> Gyldig til: {offer.validUntil || '30 dager'}
                    </div>
                  </div>
                </div>

                {/* Beskrivelse */}
                {offer.description && (
                  <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800/80 space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Beskrivelse av leveransen</h3>
                    <p className="text-sm text-neutral-300 leading-relaxed">{offer.description}</p>
                  </div>
                )}

                {/* Spesifiserte poster */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Spesifiserte tilbudsposter</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                          <th className="pb-3 font-semibold">Beskrivelse</th>
                          <th className="pb-3 font-semibold text-right">Antall</th>
                          <th className="pb-3 font-semibold text-right">Enh.pris</th>
                          <th className="pb-3 font-semibold text-right">Sum eks. mva</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {offer.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-neutral-800/30 transition-colors">
                            <td className="py-4 pr-4 font-medium text-neutral-200">{item.description}</td>
                            <td className="py-4 px-2 text-right text-neutral-400">{item.quantity} {item.unit}</td>
                            <td className="py-4 px-2 text-right text-neutral-400">{item.pricePerUnit?.toLocaleString('no-NO')} kr</td>
                            <td className="py-4 pl-4 text-right font-bold text-neutral-100">{item.total?.toLocaleString('no-NO')} kr</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totaler */}
                <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <ShieldCheck size={16} className="text-emerald-400" />
                      Inkluderer lovpålagt TEK17 kvalitetssikring, SJA og FDV
                    </div>
                    <div className="text-xs text-neutral-500">5 års reklamasjonsrett iht. Håndverkertjenesteloven</div>
                  </div>
                  <div className="text-right space-y-1 w-full sm:w-auto">
                    <div className="flex justify-between sm:justify-end gap-6 text-xs text-neutral-400">
                      <span>Sum eks. MVA:</span>
                      <span>{subtotal.toLocaleString('no-NO')} kr</span>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-6 text-xs text-neutral-400">
                      <span>MVA (25%):</span>
                      <span>{Math.round(mva).toLocaleString('no-NO')} kr</span>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-6 text-lg font-black text-emerald-400 border-t border-neutral-800 pt-2">
                      <span>Total inkl. MVA:</span>
                      <span>{Math.round(grandTotal).toLocaleString('no-NO')} kr</span>
                    </div>
                  </div>
                </div>

                {/* Handling: Godkjenn tilbud og generer kontrakt på SAMME SKJERM */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-800">
                  <p className="text-xs text-neutral-400">
                    Ved å klikke godkjenn genereres byggekontrakten automatisk og presenteres umiddelbart nedenfor.
                  </p>
                  <button 
                    onClick={handleApproveOffer}
                    className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 cursor-pointer group"
                  >
                    <span>Godkjenn tilbud & gå til kontrakt</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEG 2: KONTRAKTSPRESENTASJON & DIGITAL SIGNERING (SAMME SKJERM) */}
          {/* ========================================================= */}
          {activeScreen === 'contract' && contract && (
            <motion.div 
              key="contract-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 flex items-center gap-3 text-indigo-300 text-xs sm:text-sm">
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                <span>
                  <strong>Tilbudet er bekreftet!</strong> Nedenfor finner du den juridiske byggekontrakten ferdig utfylt. Signer med mus/finger eller navnetrekk for å iverksette prosjektet.
                </span>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
                <div className="border-b border-neutral-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-widest">
                      <FileSignature size={16} /> Juridisk Byggekontrakt (NS 8406)
                    </div>
                    <h2 className="text-2xl font-bold mt-1">{contract.title}</h2>
                    <p className="text-neutral-400 text-xs mt-1">Avtalenummer: {contract.projectCode}</p>
                  </div>
                  <button 
                    onClick={() => setActiveScreen('offer')}
                    className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 underline"
                  >
                    ← Se opprinnelig tilbud
                  </button>
                </div>

                {/* Kontraktsparter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Oppdragstaker (Entreprenør)</span>
                    <p className="text-sm font-bold text-neutral-200">{contract.companyName || 'Mester Entreprenør AS'}</p>
                    <p className="text-xs text-neutral-400">Org.nr: {contract.companyOrgNumber || '998 877 665 MVA'}</p>
                  </div>
                  <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Oppdragsgiver (Kunde)</span>
                    <p className="text-sm font-bold text-neutral-200">{contract.clientName}</p>
                    <p className="text-xs text-neutral-400">E-post: {contract.clientEmail || '-'}</p>
                  </div>
                </div>

                {/* Kontraktsvilkår */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Avtalte Vilkår & Forpliktelser</h3>
                  <div className="p-6 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs text-neutral-300 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto">
                    {contract.terms}
                  </div>
                </div>

                {/* Signatur-seksjon */}
                <div className="space-y-6 pt-4 border-t border-neutral-800">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <PenTool size={16} className="text-emerald-400" /> Digital Signatur
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-2">Fullt navn på signatør (Byggherre / Oppdragsgiver)</label>
                      <input 
                        type="text" 
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="F.eks. Ola Nordmann"
                        className="w-full p-4 bg-neutral-950 border border-neutral-800 rounded-2xl text-neutral-100 font-bold outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-neutral-300">Tegn din signatur nedenfor (valgfritt):</label>
                        <button 
                          onClick={clearSignature}
                          className="text-[10px] text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw size={12} /> Nullstill signatur
                        </button>
                      </div>
                      <div className="bg-white rounded-2xl overflow-hidden border border-neutral-700 shadow-inner">
                        <canvas 
                          ref={canvasRef}
                          width={600}
                          height={140}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-32 touch-none cursor-crosshair"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-3 p-4 bg-neutral-950 rounded-2xl border border-neutral-800 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-neutral-700 text-emerald-500 focus:ring-emerald-400"
                      />
                      <span className="text-xs text-neutral-300 leading-relaxed">
                        Jeg bekrefter at jeg har fullmakt til å inngå denne avtalen, og godtar kontraktsvilkårene, betalingsplan og 5 års reklamasjonsrett iht. norsk lov.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Handling: Signer og aktiver Mesterhjernen */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-800">
                  <button 
                    onClick={() => setActiveScreen('offer')}
                    className="w-full sm:w-auto px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs transition-all"
                  >
                    Tilbake til tilbud
                  </button>
                  <button 
                    onClick={handleSignContract}
                    disabled={isProcessing || !termsAccepted}
                    className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                        <span>Mesterhjernen etablerer prosjektet...</span>
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        <span>Signer kontrakt og iverksett prosjekt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEG 3: SUKSESS & DIREKTE OVERGANG TIL KUNDEPORTAL          */}
          {/* ========================================================= */}
          {activeScreen === 'success' && (
            <motion.div 
              key="success-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 sm:p-14 text-center space-y-8 shadow-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={48} />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h2 className="text-3xl font-black">Gratulerer! Avtalen er i boks.</h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Kontrakten er signert og trygt arkivert. <strong>Mesterhjernen</strong> har automatisk etablert prosjektet, opprettet lovpålagte sjekklister for fagkontroll og klargjort din kundeportal.
                </p>
              </div>

              {/* Oppsummeringsboks */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 max-w-md mx-auto text-left space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Prosjekt:</span>
                  <span className="font-bold text-neutral-200">{createdProject?.name || offer.title}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Prosjektkode:</span>
                  <span className="font-bold text-emerald-400">{createdProject?.projectCode || contract?.projectCode || 'P-2026'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Signert av:</span>
                  <span className="font-bold text-neutral-200">{signerName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Tidspunkt:</span>
                  <span className="font-bold text-neutral-200">{new Date().toLocaleString('no-NO')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button 
                  onClick={() => contract && pdfService.generateContractPDF(contract)}
                  className="w-full sm:w-auto px-6 py-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Last ned signert kontrakt
                </button>
                <button 
                  onClick={() => {
                    if (onNavigateToPortal && createdProject) {
                      onNavigateToPortal(createdProject.id);
                    } else if (typeof window !== 'undefined') {
                      window.location.href = `/?portal=${createdProject?.id || 'demo'}`;
                    }
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-xl text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Åpne Kundeportalen</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
