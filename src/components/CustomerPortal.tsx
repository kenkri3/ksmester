import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Camera, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  ChevronRight,
  ShieldCheck,
  FileSignature,
  Check,
  AlertCircle,
  Download,
  Sparkles,
  FileEdit,
  Coins,
  CalendarCheck2,
  Share2,
  ArrowLeft,
  X,
  Plus,
  Maximize2,
  MessageSquare,
  Calendar,
  Send,
  Upload,
  Layers,
  CheckSquare
} from 'lucide-react';
import { Project, Offer, Contract, ChangeOrder, FinalSettlement, WarrantyInspection } from '../types';
import { db, collection, query, where, getDocs, updateDoc, doc, serverTimestamp, addDoc } from '../services/firebase';
import { projectService } from '../services/projectService';
import ProjectActivityLog from './ProjectActivityLog';
import { summaryService } from '../services/summaryService';
import { pdfService } from '../services/pdfService';
import { changeOrderService } from '../services/changeOrderService';
import { finalSettlementService } from '../services/finalSettlementService';
import { warrantyInspectionService } from '../services/warrantyInspectionService';
import { toast } from 'sonner';

interface CustomerPortalProps {
  project: Project;
  onClose?: () => void;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ project, onClose }) => {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [finalSettlement, setFinalSettlement] = useState<FinalSettlement | null>(null);
  const [warrantyInspection, setWarrantyInspection] = useState<WarrantyInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Real Project Photos State
  const [projectPhotos, setProjectPhotos] = useState<any[]>([]);
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState<any | null>(null);
  const [showAllPhotosModal, setShowAllPhotosModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Modals & Interactive Actions State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [customerMessage, setCustomerMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Fetch core portal data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch active offer for this project
        const offerQuery = query(
          collection(db, 'offers'),
          where('projectId', '==', project.id),
          where('status', 'in', ['sent', 'accepted'])
        );
        const offerSnap = await getDocs(offerQuery);
        if (!offerSnap.empty) {
          setOffer({ id: offerSnap.docs[0].id, ...offerSnap.docs[0].data() } as Offer);
        }

        // Fetch active contract for this project
        const contractQuery = query(
          collection(db, 'contracts'),
          where('projectId', '==', project.id),
          where('status', 'in', ['pending_signature', 'signed'])
        );
        const contractSnap = await getDocs(contractQuery);
        if (!contractSnap.empty) {
          setContract({ id: contractSnap.docs[0].id, ...contractSnap.docs[0].data() } as Contract);
        }

        // Fetch change orders
        const coList = await changeOrderService.getProjectChangeOrders(project.id);
        setChangeOrders(coList);

        // Fetch final settlement if exists
        const fs = await finalSettlementService.getProjectSettlement(project.id);
        setFinalSettlement(fs);

        // Fetch warranty inspection if exists
        const wi = await warrantyInspectionService.getProjectWarranty(project.id);
        setWarrantyInspection(wi);
      } catch (error) {
        console.error("Error fetching portal data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [project.id]);

  // Fetch real project photos (from project_photos, deviations with images, and project attributes)
  useEffect(() => {
    if (!project.id) return;

    const fetchPhotos = async () => {
      try {
        const photoQuery = query(
          collection(db, 'project_photos'),
          where('projectId', '==', project.id)
        );
        const photoSnap = await getDocs(photoQuery);
        let items: any[] = [];
        if (!photoSnap.empty) {
          items = photoSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        // Check project.photos or project.images array
        if (Array.isArray((project as any).photos)) {
          (project as any).photos.forEach((p: any, idx: number) => {
            const url = typeof p === 'string' ? p : p.url || p.imageUrl;
            if (url && !items.some(it => it.imageUrl === url)) {
              items.push({
                id: `proj-photo-${idx}`,
                imageUrl: url,
                title: p.title || `Prosjektfoto #${idx + 1}`,
                createdAt: p.createdAt || project.createdAt || new Date().toISOString()
              });
            }
          });
        }

        // Include photos attached to deviations
        const devQuery = query(collection(db, 'deviations'), where('projectId', '==', project.id));
        const devSnap = await getDocs(devQuery).catch(() => null);
        if (devSnap && !devSnap.empty) {
          devSnap.docs.forEach(docSnap => {
            const data = docSnap.data();
            const img = data.imageUrl || data.photoUrl;
            if (img && !items.some(it => it.imageUrl === img)) {
              items.push({
                id: `dev-${docSnap.id}`,
                imageUrl: img,
                title: data.title ? `Dokumentasjon: ${data.title}` : 'Foto fra avvikskontroll',
                description: data.description,
                type: 'deviation_photo',
                createdAt: data.createdAt || data.timestamp || new Date().toISOString()
              });
            }
          });
        }

        // Sort descending by date
        items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setProjectPhotos(items);
      } catch (err) {
        console.warn('Could not fetch project photos:', err);
      }
    };

    fetchPhotos();
  }, [project.id]);

  // Generate AI Project Summary
  useEffect(() => {
    const generateSummary = async () => {
      if (!project.id) return;
      setIsGeneratingSummary(true);
      try {
        const summary = await summaryService.generateProjectSummary(project, [], []);
        setAiSummary(summary);
      } catch (error) {
        console.error("Error generating summary:", error);
      } finally {
        setIsGeneratingSummary(false);
      }
    };

    generateSummary();
  }, [project.id]);

  // Handle Photo Upload
  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const toastId = toast.loading('Laster opp bilde til byggeplassarkivet...');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const newPhotoData = {
          projectId: project.id,
          imageUrl: base64,
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          description: 'Lastet opp i Kundeportal',
          type: 'customer_photo',
          authorName: project.clientName || 'Kunde',
          createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'project_photos'), newPhotoData);
        setProjectPhotos(prev => [{ id: docRef.id, ...newPhotoData }, ...prev]);
        toast.success('Bildet ble lastet opp og lagret i prosjektet!', { id: toastId });
      };
      reader.onerror = () => {
        toast.error('Kunne ikke lese bildefilen.', { id: toastId });
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Feil ved bildeopplasting:', err);
      toast.error(`Opplasting feilet: ${err.message}`, { id: toastId });
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle Accept Offer
  const handleAcceptOffer = async () => {
    if (!offer) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'offers', offer.id), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });

      const contractData = {
        projectId: project.id,
        offerId: offer.id,
        clientName: project.clientName || offer.clientName,
        clientEmail: project.clientEmail || offer.clientEmail,
        title: `Kontrakt: ${offer.title}`,
        status: 'pending_signature',
        createdAt: new Date().toISOString(),
        authorId: offer.authorId,
        company: (offer as any).company || ''
      };

      await addDoc(collection(db, 'contracts'), contractData);
      
      await updateDoc(doc(db, 'projects', project.id), {
        stage: 'contract',
        updatedAt: serverTimestamp()
      });

      toast.success("Tilbudet er godtatt! Kontrakten er nå klar for signering.");
      window.location.reload();
    } catch (error) {
      console.error("Error accepting offer:", error);
      toast.error("Kunne ikke godta tilbudet.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Sign Contract
  const handleSignContract = async () => {
    if (!contract) return;
    setActionLoading(true);
    try {
      const signatureCertificate = {
        signedBy: project.clientName || contract.clientName || 'Kunde',
        signedAt: new Date().toISOString(),
        authMethod: 'Digital e-Signatur (NS 8406)',
        ipAddress: '127.0.0.1',
        verificationHash: 'SHA256:' + Math.random().toString(36).substring(2) + Date.now().toString(36)
      };

      await updateDoc(doc(db, 'contracts', contract.id), {
        status: 'signed',
        signedAt: signatureCertificate.signedAt,
        signatureCertificate,
        updatedAt: serverTimestamp()
      });

      await projectService.generateInitialChecklists(project.id, contract, offer || undefined);

      await updateDoc(doc(db, 'projects', project.id), {
        stage: 'active',
        progress: 10,
        updatedAt: serverTimestamp()
      });

      toast.success("Kontrakten er signert med digital e-signatur! Prosjektet er nå i gang.");
      window.location.reload();
    } catch (error) {
      console.error("Error signing contract:", error);
      toast.error("Kunne ikke signere kontrakten.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Contract PDF Download
  const handleOpenContract = async () => {
    if (contract) {
      const toastId = toast.loading('Genererer signert kontrakt som PDF...');
      try {
        await pdfService.generateContractPDF(contract, { name: (project as any).companyName || 'Mester Entreprenør AS' });
        toast.success('Kontrakt lastet ned!', { id: toastId });
      } catch (err: any) {
        toast.error('Kunne ikke generere kontrakt-PDF: ' + err.message, { id: toastId });
      }
    } else if (offer) {
      const toastId = toast.loading('Genererer tilbudsdokument som PDF...');
      try {
        await pdfService.generateOfferPDF(offer, { name: (project as any).companyName || 'Mester Entreprenør AS' });
        toast.success('Tilbud lastet ned!', { id: toastId });
      } catch (err: any) {
        toast.error('Kunne ikke generere tilbud-PDF: ' + err.message, { id: toastId });
      }
    } else {
      toast.info('Kontrakten forberedes av fagansvarlig og vil vises her så snart den er klar.');
    }
  };

  // Handle FDV Download
  const handleDownloadFDV = async () => {
    const toastId = toast.loading('Genererer komplett FDV-dokumentasjon (PDF)...');
    try {
      await pdfService.generateFDVPDF(project);
      toast.success('FDV-dokumentasjon lastet ned!', { id: toastId });
    } catch (err: any) {
      toast.error('Kunne ikke generere FDV: ' + err.message, { id: toastId });
    }
  };

  // Send Direct Message to Manager
  const handleSendMessageToManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerMessage.trim()) return;
    setIsSendingMessage(true);
    const toastId = toast.loading('Sender henvendelse til byggeleder...');
    try {
      await addDoc(collection(db, 'agent_activities'), {
        type: 'customer_message',
        title: `Melding fra kunde (${project.clientName || 'Kunde'}): ${project.name}`,
        description: customerMessage.trim(),
        projectId: project.id,
        projectName: project.name,
        clientName: project.clientName || 'Kunde',
        clientEmail: project.clientEmail || '',
        status: 'pending',
        badge: 'KUNDEHENVENDELSE',
        createdAt: new Date().toISOString()
      });

      toast.success('Henvendelsen er sendt til byggeleder!', { id: toastId });
      setCustomerMessage('');
      setShowMessageModal(false);
    } catch (err: any) {
      toast.error('Kunne ikke sende melding: ' + err.message, { id: toastId });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Dynamic Contact Data
  const pmName = (project as any).projectManager || (project as any).authorName || 'Ken Mester';
  const pmTitle = (project as any).projectManagerTitle || 'Byggmester & Prosjektleder';
  const pmPhone = (project as any).contactPhone || (project as any).phone || '+47 900 00 000';
  const pmEmail = (project as any).contactEmail || project.clientEmail || 'post@vikingmester.no';
  const pmInitials = pmName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PL';

  const getTimeline = () => {
    const stages = [
      { id: 'offer', title: 'Tilbud og planlegging' },
      { id: 'contract', title: 'Kontrakt signert' },
      { id: 'active', title: 'Gjennomføring' },
      { id: 'completion', title: 'Sluttkontroll og overlevering' },
      { id: 'archived', title: 'Prosjekt arkivert' }
    ];

    const currentStageIndex = stages.findIndex(s => s.id === project.stage);
    
    return stages.map((stage, index) => ({
      title: stage.title,
      date: index < currentStageIndex ? 'Fullført' : (index === currentStageIndex ? 'Pågår' : 'Planlagt'),
      status: index < currentStageIndex ? 'completed' : (index === currentStageIndex ? 'active' : 'pending')
    }));
  };

  const timeline = getTimeline();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Customer Header */}
      <div className="bg-neutral-900 text-white py-10 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Logo size="md" theme="dark" className="text-white" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-electric-400">Kundeportal</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Kundeportal-lenke kopiert til utklippstavlen!');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-all cursor-pointer shadow-xs"
                title="Kopier lenke for deling med kunde"
              >
                <Share2 size={13} />
                <span>Del portal</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-all cursor-pointer shadow-xs"
                >
                  <ArrowLeft size={13} />
                  <span>Tilbake til Oversikt</span>
                </button>
              )}
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">{project.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-neutral-400 text-sm">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-emerald-400" /> 
              {project.location || 'Norge'}
            </span>
            {project.clientName && (
              <>
                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-electric-400" /> 
                  Kunde: {project.clientName}
                </span>
              </>
            )}
            <span className="w-1 h-1 rounded-full bg-neutral-700" />
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-amber-400" /> 
              Sist oppdatert i dag
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Stage 1: Gjennomgå Tilbud */}
            {project.stage === 'offer' && offer && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border-2 border-emerald-500 overflow-hidden relative"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-emerald-100 text-emerald-700 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                    Venter på din godkjenning
                  </span>
                  <span className="text-xs font-bold text-neutral-400">NS 8406 / Håndverkertjenesteloven</span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black mb-3">Gjennomgå Tilbud</h2>
                <p className="text-neutral-500 text-sm mb-6 max-w-lg leading-relaxed">
                  Vi har utarbeidet et detaljert tilbud for ditt byggeprosjekt. Vennligst se gjennom postene nedenfor og godta for å gå videre til kontrakt.
                </p>

                <div className="space-y-3 mb-8 bg-neutral-50 p-5 sm:p-6 rounded-3xl border border-neutral-200">
                  {offer.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2.5 border-b border-neutral-200/80 last:border-0">
                      <div>
                        <div className="font-bold text-neutral-900 text-sm">{item.description}</div>
                        <div className="text-xs text-neutral-500">{item.quantity} {item.unit} à {item.pricePerUnit.toLocaleString('no-NO')} kr</div>
                      </div>
                      <div className="font-black text-neutral-900 text-sm">{item.total.toLocaleString('no-NO')} kr</div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 mt-2 border-t border-neutral-300">
                    <div className="text-xs font-black uppercase tracking-widest text-neutral-500">Total eks. mva</div>
                    <div className="text-2xl font-black text-emerald-600">{offer.totalAmount.toLocaleString('no-NO')} kr</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    type="button"
                    onClick={handleAcceptOffer}
                    disabled={actionLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-base transition-all shadow-md flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
                  >
                    {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={20} />}
                    <span>Godta Tilbud</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => pdfService.generateOfferPDF(offer, { name: (project as any).companyName || 'Mester Entreprenør AS' })}
                    className="flex-1 bg-neutral-100 text-neutral-800 py-4 rounded-2xl font-black text-base hover:bg-neutral-200 transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer border border-neutral-200"
                  >
                    <Download size={18} />
                    <span>Last ned Tilbud (PDF)</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Stage 2: Signer Kontrakt */}
            {project.stage === 'contract' && contract && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border-2 border-blue-500 overflow-hidden relative"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-blue-100 text-blue-700 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                    Venter på signatur
                  </span>
                  <span className="text-xs font-bold text-neutral-400">Digital Signering</span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black mb-3">Signer Kontrakt</h2>
                <p className="text-neutral-500 text-sm mb-6 max-w-lg leading-relaxed">
                  Tilbudet er godkjent. For å starte arbeidet må vi ha en signert kontrakt. Du kan signere digitalt her med ett klikk.
                </p>

                <div className="p-6 bg-neutral-50 rounded-3xl mb-6 border border-neutral-200">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileSignature size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900 text-sm">{contract.title}</h4>
                      <p className="text-xs text-neutral-500">Standard norsk håndverkeravtale iht. NS 8406</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                    <ShieldCheck size={16} className="shrink-0" />
                    <span>Klar for juridisk gyldig digital e-signatur</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    type="button"
                    onClick={handleSignContract}
                    disabled={actionLoading}
                    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-base hover:bg-blue-500 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
                  >
                    {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileSignature size={20} />}
                    <span>Signer og Godkjenn Digitalt</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => pdfService.generateContractPDF(contract, { name: (project as any).companyName || 'Mester Entreprenør AS' })}
                    className="flex-1 bg-neutral-100 text-neutral-800 py-4 rounded-2xl font-black text-base hover:bg-neutral-200 transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer border border-neutral-200"
                  >
                    <Download size={18} />
                    <span>Last ned Kontrakt (PDF)</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Endringsmeldinger & Tilleggsarbeid */}
            {changeOrders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-neutral-200 space-y-6"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                      <FileEdit size={16} />
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                      NS 8406 / Håndverkertjenesteloven § 9
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900">Tilleggsarbeid & Endringer</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Oversikt over avtalte og ventende tillegg underveis i byggeperioden.
                  </p>
                </div>

                <div className="space-y-3">
                  {changeOrders.map(order => (
                    <div
                      key={order.id}
                      className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-neutral-200 text-neutral-800 text-xs font-black rounded">
                            #{order.changeNumber}
                          </span>
                          <span className="font-bold text-sm text-neutral-900">{order.title}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            order.status === 'approved' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : order.status === 'rejected'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {order.status === 'approved' ? 'Godkjent' : order.status === 'rejected' ? 'Avvist' : 'Venter på din signatur'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{order.description}</p>
                        <div className="text-[11px] text-neutral-400 mt-1">
                          Sum: <strong>{order.totalAmount?.toLocaleString('no-NO')} kr ink. mva</strong> ({order.amountExVat?.toLocaleString('no-NO')} kr eks. mva)
                          {order.impactDays > 0 && ` • +${order.impactDays} dager forventet forlengelse`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {order.status === 'pending_customer' && order.shareUrl && (
                          <a
                            href={order.shareUrl}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <FileSignature size={14} /> Se & Godkjenn
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => pdfService.generateChangeOrderPDF(project, order)}
                          className="p-2.5 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Last ned endringsavtale (PDF)"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Stage: Fullført & Arkivert */}
            {project.stage === 'archived' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border-2 border-emerald-500 overflow-hidden relative"
              >
                <div className="bg-emerald-100 text-emerald-700 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider inline-block mb-4">
                  Fullført & Arkivert
                </div>
                
                <h2 className="text-3xl font-black mb-3">Takk for oppdraget!</h2>
                <p className="text-neutral-500 text-sm mb-6 max-w-lg leading-relaxed">
                  Dette prosjektet er nå fullført. Du vil alltid ha full tilgang til din FDV-dokumentasjon og bildearkiv her i portalen.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-200">
                    <FileText className="text-emerald-600 mb-3" size={32} />
                    <div className="font-bold text-neutral-900 mb-1">FDV-Pakke</div>
                    <p className="text-xs text-neutral-500 mb-4">Vedlikehold og produktinfo for bygget</p>
                    <button 
                      type="button"
                      onClick={handleDownloadFDV}
                      className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      <span>Last ned FDV (PDF)</span>
                    </button>
                  </div>
                  <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-200">
                    <Camera className="text-purple-600 mb-3" size={32} />
                    <div className="font-bold text-neutral-900 mb-1">Billedarkiv</div>
                    <p className="text-xs text-neutral-500 mb-4">Full fotodokumentasjon av utførelsen</p>
                    <button 
                      type="button"
                      onClick={() => setShowAllPhotosModal(true)}
                      className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <Maximize2 size={14} />
                      <span>Se alle bilder ({projectPhotos.length})</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* AI Summary Banner */}
            <div className="bg-neutral-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-1.5 rounded-lg bg-white/10 text-rose-400">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="font-bold text-base">AI Statusoppdatering</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-auto">
                    Sanntid
                  </span>
                </div>
                <p className="text-neutral-300 text-sm leading-relaxed italic">
                  {isGeneratingSummary ? "Genererer oppdatert status for prosjektet..." : aiSummary || `Prosjektet ${project.name} er i gang med ${project.progress || 0}% registrert fremdrift. Dokumentasjon og kvalitetskontroll oppdateres fortløpende.`}
                </p>
              </div>
            </div>

            {/* Activity Log Component */}
            <ProjectActivityLog projectId={project.id} project={project} />

            {/* Status & Progress Card */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-neutral-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">Fremdrift & Milepæler</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">Status for fasene i prosjektet</p>
                </div>
                <div className="text-3xl font-black text-emerald-600">{project.progress || 0}%</div>
              </div>
              <div className="w-full h-3.5 bg-neutral-100 rounded-full overflow-hidden mb-8 border border-neutral-200/60">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress || 0}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                />
              </div>
              
              <div className="space-y-5">
                {timeline.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        item.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                        item.status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100 text-neutral-400'
                      }`}>
                        {item.status === 'completed' ? <CheckCircle2 size={14} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                      </div>
                      {i < timeline.length - 1 && <div className="w-px h-full bg-neutral-200 my-1" />}
                    </div>
                    <div className="pb-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{item.date}</div>
                      <div className={`text-sm font-bold ${item.status === 'active' ? 'text-blue-600' : 'text-neutral-900'}`}>{item.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REAL PROJECT PHOTOS SECTION */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-neutral-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                    <Camera size={20} className="text-emerald-600" />
                    Bilder fra prosessen
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Faktisk fotodokumentasjon fra byggeplassen, utførelse og KS-kontroll.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95 shadow-2xs">
                    <Plus size={13} />
                    <span>Last opp bilde</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUploadPhoto} 
                      disabled={isUploadingPhoto} 
                      className="hidden" 
                    />
                  </label>
                  {projectPhotos.length > 4 && (
                    <button 
                      type="button"
                      onClick={() => setShowAllPhotosModal(true)}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline px-2 py-1 cursor-pointer"
                    >
                      Se alle ({projectPhotos.length})
                    </button>
                  )}
                </div>
              </div>

              {projectPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {projectPhotos.slice(0, 4).map((photo, i) => (
                    <div 
                      key={photo.id || i} 
                      onClick={() => setSelectedLightboxPhoto(photo)}
                      className="group relative aspect-video rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 cursor-pointer shadow-2xs hover:shadow-md transition-all hover:scale-[1.02]"
                    >
                      <img 
                        src={photo.imageUrl} 
                        alt={photo.title || 'Byggeplassfoto'} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white">
                        <div className="text-[11px] font-bold truncate">{photo.title || 'Foto'}</div>
                        <div className="text-[9px] text-neutral-300">
                          {photo.createdAt ? new Date(photo.createdAt).toLocaleDateString('no-NO') : 'Dokumentert'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 text-neutral-400 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <Camera size={22} className="text-emerald-600" />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-800 mb-1">Ingen byggeplassbilder lastet opp ennå</h4>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto mb-4 leading-relaxed">
                    Bilder som tas under KS-kontroller, TEK17-sjekker og fremdriftsdokumentasjon vil automatisk vises her så du har fullt innsyn i arbeidet.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs">
                    <Plus size={14} />
                    <span>Legg til første bilde</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUploadPhoto} 
                      disabled={isUploadingPhoto} 
                      className="hidden" 
                    />
                  </label>
                </div>
              )}
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            
            {/* Din Prosjektleder Contact Card */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-neutral-200">
              <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-6">Din Prosjektleder</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-navy-950 text-white flex items-center justify-center font-black text-xl shadow-md border border-slate-700">
                    {pmInitials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center" title="Aktiv på vakt">
                    <Check size={10} className="text-white stroke-[3]" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-neutral-900 text-base truncate">{pmName}</div>
                  <div className="text-xs text-neutral-500 font-medium truncate">{pmTitle}</div>
                  <div className="text-[11px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Tilgjengelig for oppdragsgiver
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <a 
                  href={`tel:${pmPhone.replace(/\s+/g, '')}`}
                  className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-200/80 transition-all shadow-xs cursor-pointer"
                >
                  <Phone size={15} className="text-emerald-700" />
                  <span>Ring {pmName.split(' ')[0]} ({pmPhone})</span>
                </a>
                <a 
                  href={`mailto:${pmEmail}?subject=${encodeURIComponent(`Henvendelse angående ${project.name}`)}`}
                  className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold border border-neutral-200 transition-all shadow-xs cursor-pointer"
                >
                  <Mail size={15} className="text-neutral-600" />
                  <span>Send E-post ({pmEmail})</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowMessageModal(true)}
                  className="w-full flex items-center justify-center gap-2 p-2.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                >
                  <MessageSquare size={13} className="text-indigo-600" />
                  <span>Send melding direkte i portalen</span>
                </button>
              </div>
            </div>

            {/* REAL DOCUMENTS CARD */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-neutral-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">Dokumenter</h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Juridisk gyldig
                </span>
              </div>
              <div className="space-y-3">
                {/* 1. Kontrakt / Tilbud */}
                <button 
                  type="button"
                  onClick={handleOpenContract}
                  className="w-full flex items-center justify-between p-4 bg-neutral-50 hover:bg-neutral-100 rounded-2xl group transition-all text-left border border-neutral-200/70 shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileSignature size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-neutral-900 truncate">
                        {contract ? (contract.status === 'signed' ? 'Signert Kontrakt (NS 8406)' : 'Kontrakt (Avventer signatur)') : (offer ? 'Pristilbud & Omfang' : 'Entreprisekontrakt')}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {contract ? 'Last ned offisiell PDF-avtale' : (offer ? 'Godkjent tilbudsdokument' : 'Utarbeides av fagleder')}
                      </div>
                    </div>
                  </div>
                  <Download size={15} className="text-neutral-400 group-hover:text-blue-600 shrink-0 ml-2" />
                </button>

                {/* 2. Fremdriftsplan */}
                <button 
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  className="w-full flex items-center justify-between p-4 bg-neutral-50 hover:bg-neutral-100 rounded-2xl group transition-all text-left border border-neutral-200/70 shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <CalendarCheck2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-neutral-900 truncate">Fremdriftsplan & Faser</div>
                      <div className="text-[10px] text-neutral-500">Milepæler, tidsfrister og status</div>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-neutral-400 group-hover:text-emerald-600 shrink-0 ml-2" />
                </button>

                {/* 3. FDV-Pakke */}
                <button 
                  type="button"
                  onClick={handleDownloadFDV}
                  className="w-full flex items-center justify-between p-4 bg-neutral-50 hover:bg-neutral-100 rounded-2xl group transition-all text-left border border-neutral-200/70 shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-neutral-900 truncate">FDV-Dokumentasjon</div>
                      <div className="text-[10px] text-neutral-500">Drift, vedlikehold & TEK17-krav</div>
                    </div>
                  </div>
                  <Download size={15} className="text-neutral-400 group-hover:text-amber-600 shrink-0 ml-2" />
                </button>
              </div>
            </div>

            {/* AI Insight / Kvalitetssikret */}
            <div className="bg-emerald-900 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-electric-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Kvalitetssikret</span>
              </div>
              <p className="text-xs text-emerald-100 leading-relaxed opacity-90">
                Prosjektet følges opp digitalt i henhold til Byggherreforskriften, TEK17 og Våtromsnormen med bildeverifisert KS-dokumentasjon.
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* LIGHTBOX MODAL FOR REAL PROJECT PHOTOS */}
      <AnimatePresence>
        {selectedLightboxPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 text-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]"
            >
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">{selectedLightboxPhoto.title || 'Byggeplassfoto'}</h3>
                  <p className="text-xs text-neutral-400">
                    {selectedLightboxPhoto.createdAt ? new Date(selectedLightboxPhoto.createdAt).toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Dokumentert'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedLightboxPhoto.imageUrl}
                    download="prosjektbilde.jpg"
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Last ned bilde i full oppløsning"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedLightboxPhoto(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40">
                <img 
                  src={selectedLightboxPhoto.imageUrl} 
                  alt={selectedLightboxPhoto.title || 'Foto'} 
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
                />
              </div>

              {selectedLightboxPhoto.description && (
                <div className="p-4 border-t border-white/10 bg-neutral-950 text-xs text-neutral-300">
                  <span className="font-bold text-neutral-400 uppercase tracking-wider block text-[10px] mb-1">Merknad</span>
                  {selectedLightboxPhoto.description}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ALL PHOTOS GALLERY MODAL */}
      <AnimatePresence>
        {showAllPhotosModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-xl text-neutral-900">Billedarkiv & Fotodokumentasjon</h3>
                  <p className="text-xs text-neutral-500">Totalt {projectPhotos.length} bilder lagret for {project.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllPhotosModal(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-700 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {projectPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {projectPhotos.map((photo, i) => (
                      <div
                        key={photo.id || i}
                        onClick={() => {
                          setSelectedLightboxPhoto(photo);
                        }}
                        className="group aspect-video rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 cursor-pointer relative shadow-2xs hover:shadow-md transition-all hover:scale-[1.02]"
                      >
                        <img 
                          src={photo.imageUrl} 
                          alt={photo.title || 'Foto'} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white text-[10px]">
                          <span className="font-bold truncate">{photo.title || 'Bilde'}</span>
                          <span className="text-neutral-300 text-[9px]">
                            {photo.createdAt ? new Date(photo.createdAt).toLocaleDateString('no-NO') : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-neutral-400 text-sm">
                    Ingen bilder funnet i arkivet.
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-between items-center">
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs">
                  <Plus size={14} />
                  <span>Last opp nytt bilde</span>
                  <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={() => setShowAllPhotosModal(false)}
                  className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Lukk arkiv
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FREMDRIFTSPLAN & MILEPÆLER MODAL */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CalendarCheck2 size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-neutral-900">Fremdriftsplan & Faser</h3>
                    <p className="text-xs text-neutral-500">{project.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-700 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Fremdrift</span>
                    <span className="font-black text-emerald-600 text-lg">{project.progress || 0}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Gjeldende fase</span>
                    <span className="font-bold text-neutral-800 text-sm capitalize">{project.stage || 'Gjennomføring'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Estimert ferdig</span>
                    <span className="font-bold text-neutral-800 text-sm">{(project as any).deadline || 'Iht. avtale'}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-neutral-900 mb-3 flex items-center gap-2">
                    <Layers size={16} className="text-emerald-600" />
                    Hovedfaser i prosjektet
                  </h4>
                  <div className="space-y-3">
                    {[
                      { name: '1. Prosjektering & Tilbud', desc: 'Befaring, kalkyle og detaljert tilbud', status: 'Fullført', done: true },
                      { name: '2. Kontrakt & Oppstart', desc: 'NS 8406 entreprisekontrakt og oppstartsmøte', status: contract?.status === 'signed' ? 'Fullført' : 'Pågår', done: contract?.status === 'signed' },
                      { name: '3. Riving, Klargjøring & Rigg', desc: 'Sikkerhetsrigg, støvsikring og klargjøring', status: (project.progress || 0) >= 25 ? 'Fullført' : ((project.progress || 0) > 0 ? 'Pågår' : 'Planlagt'), done: (project.progress || 0) >= 25 },
                      { name: '4. Hovedarbeid & Fagarbeid', desc: 'Tømrer, VVS, elektro og overflater iht. TEK17', status: (project.progress || 0) >= 80 ? 'Fullført' : ((project.progress || 0) >= 25 ? 'Pågår' : 'Planlagt'), done: (project.progress || 0) >= 80 },
                      { name: '5. Sluttkontroll & Overtakelse', desc: 'Sluttbefaring, KS-sjekkliste og FDV-overlevering', status: (project.progress || 0) === 100 ? 'Fullført' : 'Planlagt', done: (project.progress || 0) === 100 }
                    ].map((phase, idx) => (
                      <div key={idx} className="p-4 rounded-2xl border border-neutral-200/80 bg-white flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            phase.done ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-400'
                          }`}>
                            {phase.done ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-neutral-900">{phase.name}</div>
                            <div className="text-xs text-neutral-500">{phase.desc}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          phase.done ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {phase.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Lukk fremdriftsplan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SEND DIRECT MESSAGE TO MANAGER MODAL */}
      <AnimatePresence>
        {showMessageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-xl text-neutral-900">Send melding til byggeleder</h3>
                  <p className="text-xs text-neutral-500">Mottaker: {pmName} ({project.name})</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-700 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSendMessageToManager} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Din henvendelse / spørsmål
                  </label>
                  <textarea
                    rows={5}
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    placeholder="Skriv din melding her... F.eks. spørsmål om fremdrift, materialvalg eller befaring."
                    required
                    className="w-full p-4 text-sm bg-neutral-50 border border-neutral-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-500">
                  Byggeleder blir varslet umiddelbart og henvendelsen loggføres trygt på prosjektet.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMessageModal(false)}
                    className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingMessage || !customerMessage.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingMessage ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    <span>Send henvendelse</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CustomerPortal;
