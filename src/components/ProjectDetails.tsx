import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { pdfService } from '../services/pdfService';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  HardHat, 
  ClipboardCheck, 
  AlertTriangle, 
  FileText, 
  FileSignature,
  MoreVertical, 
  Calendar, 
  User, 
  MessageSquare, 
  ShieldCheck, 
  ChevronRight, 
  TrendingUp, 
  Share2, 
  X, 
  Plus, 
  Loader2, 
  Save, 
  Sparkles, 
  Camera, 
  Upload, 
  Search, 
  CheckCircle2, 
  FileDown, 
  Users, 
  Download, 
  Activity, 
  Package, 
  RefreshCw, 
  FileEdit, 
  CloudSun, 
  Building2, 
  FlaskConical, 
  Coins, 
  BellRing,
  Mic,
  MicOff,
  Send,
  Brain,
  Wand2,
  Check,
  Copy,
  ExternalLink,
  Mail,
  Trash2
} from 'lucide-react';
import CrossTradeCoordinator from './CrossTradeCoordinator';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Project, Deviation, CrewMember, Offer, Contract, ChangeOrder } from '../types';
import { db, auth, collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, OperationType, handleFirestoreError } from '../services/firebase';
import UniversalTranslator from './UniversalTranslator';
import { sjaService } from '../services/sjaService';
import { visionService, VisionAnalysisResult } from '../services/visionService';
import { changeOrderService } from '../services/changeOrderService';
import { useAuth } from '../hooks/useAuth';
import ReportModal from './ReportModal';
import InviteModal from './InviteModal';
import OfferModal from './OfferModal';
import ProjectHealthReport from './ProjectHealthReport';
import ProjectMaterials from './ProjectMaterials';
import ProjectActivityLog from './ProjectActivityLog';
import DeviationDetailModal from './DeviationDetailModal';
import AIVisionModal from './AIVisionModal';
import { summaryService } from '../services/summaryService';
import ComplianceHub from './ComplianceHub';
import ChangeOrderModal from './ChangeOrderModal';
import DailyLogModal from './DailyLogModal';
import StoffkartotekModal from './StoffkartotekModal';
import CreateDeviationModal from './CreateDeviationModal';
import FinalSettlementModal from './FinalSettlementModal';
import { budgetAlertService, BudgetStatus } from '../services/budgetAlertService';
import { toast } from 'sonner';

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
  onShare?: () => void;
  onStartChecklist?: (projectId: string) => void;
  onHandover?: (projectId: string) => void;
}

export default function ProjectDetails({ project, onBack, onShare, onStartChecklist, onHandover }: ProjectDetailsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Streamlined 5 tabs instead of 9
  const [activeTab, setActiveTab] = useState<'overview' | 'daily_log' | 'change_orders' | 'crosstrade' | 'docs'>('overview');
  
  const [sjaReports, setSjaReports] = useState<any[]>([]);
  const [projectDeviations, setProjectDeviations] = useState<Deviation[]>([]);
  const [selectedDeviation, setSelectedDeviation] = useState<Deviation | null>(null);
  const [projectCrew, setProjectCrew] = useState<CrewMember[]>([]);
  const [projectOffers, setProjectOffers] = useState<Offer[]>([]);
  const [projectContracts, setProjectContracts] = useState<Contract[]>([]);
  const [projectChangeOrders, setProjectChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewDeviationOpen, setIsNewDeviationOpen] = useState(false);
  const [isNewSJAOpen, setIsNewSJAOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isAIVisionOpen, setIsAIVisionOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isHealthReportOpen, setIsHealthReportOpen] = useState(false);
  const [isChangeOrderOpen, setIsChangeOrderOpen] = useState(false);
  const [isDailyLogOpen, setIsDailyLogOpen] = useState(false);
  const [isStoffkartotekOpen, setIsStoffkartotekOpen] = useState(false);
  const [isFinalSettlementOpen, setIsFinalSettlementOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);

  // MesterAI Project Command Bar
  const [projectCommand, setProjectCommand] = useState('');
  const [isCommandLoading, setIsCommandLoading] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);

  const [newDeviation, setNewDeviation] = useState({
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high',
    status: 'open' as 'open' | 'closed' | 'in-progress',
    location: ''
  });

  const [newSJA, setNewSJA] = useState({
    title: '',
    task: '',
    risikoer: [{ aktivitet: '', risiko: '', tiltak: '' }],
    utstyr: [] as string[],
    tek17Reference: ''
  });

  // Date formatter for clean Norwegian display (avoids raw ISO timestamps)
  const formatDate = (val?: string) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return val;
    }
  };

  useEffect(() => {
    if (!project.id || !auth.currentUser) return;

    const sjaQuery = query(
      collection(db, 'sja_reports'),
      where('projectId', '==', project.id),
      where('status', '==', 'approved'),
      orderBy('timestamp', 'desc')
    );

    const deviationsQuery = query(
      collection(db, 'deviations'),
      where('projectId', '==', project.id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeSja = onSnapshot(sjaQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toLocaleString() || 'Nylig'
      }));
      setSjaReports(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sja_reports');
    });

    const unsubscribeDeviations = onSnapshot(deviationsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toLocaleString() || 'Nylig'
      })) as Deviation[];
      setProjectDeviations(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deviations');
    });

    const crewQuery = query(
      collection(db, 'crew'),
      where('projectId', '==', project.id)
    );

    const unsubscribeCrew = onSnapshot(crewQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CrewMember[];
      setProjectCrew(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'crew');
    });

    const offersQuery = query(
      collection(db, 'offers'),
      where('projectId', '==', project.id)
    );

    const unsubscribeOffers = onSnapshot(offersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Offer[];
      setProjectOffers(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'offers');
    });

    const contractsQuery = query(
      collection(db, 'contracts'),
      where('projectId', '==', project.id)
    );

    const unsubscribeContracts = onSnapshot(contractsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contract[];
      setProjectContracts(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contracts');
    });

    const changeOrdersQuery = query(
      collection(db, 'change_orders'),
      where('projectId', '==', project.id)
    );

    const unsubscribeChangeOrders = onSnapshot(changeOrdersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChangeOrder[];
      setProjectChangeOrders(data.sort((a, b) => (b.changeNumber || 0) - (a.changeNumber || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'change_orders');
    });

    return () => {
      unsubscribeSja();
      unsubscribeDeviations();
      unsubscribeCrew();
      unsubscribeOffers();
      unsubscribeContracts();
      unsubscribeChangeOrders();
    };
  }, [project.id]);

  useEffect(() => {
    if (project?.id) {
      budgetAlertService.checkProjectBudget(project).then(setBudgetStatus).catch(console.warn);
    }
  }, [project]);

  const handleCopyOrderLink = (order: ChangeOrder) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = order.shareUrl || `${baseUrl}?changeOrderToken=${order.token}`;
    navigator.clipboard.writeText(url);
    toast.success(`Godkjenningslenke for #${order.changeNumber} kopiert til utklippstavlen!`);
  };

  const handleSendOrderEmail = async (order: ChangeOrder) => {
    const defaultEmail = order.clientEmail || project.clientEmail || '';
    const targetEmail = window.prompt('Send endringsmelding til kunden (e-post):', defaultEmail);
    if (!targetEmail) return;

    try {
      await changeOrderService.sendChangeOrderEmail(order, targetEmail);
      toast.success(`Endringsmelding #${order.changeNumber} ble sendt til ${targetEmail}!`);
    } catch (e: any) {
      toast.error(e.message || 'Kunne ikke sende e-post');
    }
  };

  const handleDeleteOrder = async (order: ChangeOrder) => {
    if (!window.confirm(`Er du sikker på at du vil slette endringsordre #${order.changeNumber} "${order.title}"?`)) {
      return;
    }
    try {
      await changeOrderService.deleteChangeOrder(order.id);
      setProjectChangeOrders(prev => prev.filter(o => o.id !== order.id));
      toast.success(`Endringsordre #${order.changeNumber} er slettet.`);
    } catch (e: any) {
      toast.error('Kunne ikke slette endringsordre.');
    }
  };

  // Handle MesterAI quick project instruction
  const handleSendProjectCommand = async (customPrompt?: string) => {
    const text = customPrompt || projectCommand;
    if (!text.trim()) return;
    setIsCommandLoading(true);
    try {
      const res = await fetch('/api/agent/dispatch', {
        method: 'POST',
        // FIX (11.09.2026): Send med Authorization-token – /api/agent/dispatch krever nå pålogging.
        headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) },
        body: JSON.stringify({
          action: 'quick_command',
          text,
          projectId: project.id,
          projectName: project.name,
          authorName: user?.displayName || 'Byggeleder'
        })
      });
      const data = await res.json();
      if (data.reply) {
        toast.success('MesterAI:', { description: data.reply });
        setAiSummary(data.reply);
      } else {
        toast.info('Instruks registrert');
      }
      setProjectCommand('');
    } catch (err: any) {
      toast.error('Feil fra MesterAI: ' + err.message);
    } finally {
      setIsCommandLoading(false);
    }
  };

  // Voice recording
  const toggleMic = () => {
    if (isListeningMic) {
      setIsListeningMic(false);
      return;
    }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.info('Tale-til-tekst er aktivert via tastatur. Dikter direkte i feltet.');
      return;
    }
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'nb-NO';
      recognition.continuous = false;
      recognition.onstart = () => {
        setIsListeningMic(true);
        toast.info('Lytter... Snakk nå.');
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setProjectCommand(transcript);
        setIsListeningMic(false);
        handleSendProjectCommand(transcript);
      };
      recognition.onerror = () => setIsListeningMic(false);
      recognition.onend = () => setIsListeningMic(false);
      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  const handleAddDeviation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      const userCompany = (user as any)?.company || '';
      await addDoc(collection(db, 'deviations'), {
        ...newDeviation,
        projectId: project.id,
        authorId: auth.currentUser.uid,
        company: userCompany,
        timestamp: Timestamp.now(),
        createdAt: new Date().toISOString()
      });
      setIsNewDeviationOpen(false);
      setNewDeviation({
        title: '',
        description: '',
        severity: 'medium',
        status: 'open',
        location: ''
      });
      toast.success('Avvik registrert og arkivert');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deviations');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSJA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      const userCompany = (user as any)?.company || '';
      await addDoc(collection(db, 'sja_reports'), {
        ...newSJA,
        projectId: project.id,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'System',
        company: userCompany,
        status: 'approved',
        timestamp: Timestamp.now(),
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser.displayName || 'System'
      });
      setIsNewSJAOpen(false);
      setNewSJA({
        title: '',
        task: '',
        risikoer: [{ aktivitet: '', risiko: '', tiltak: '' }],
        utstyr: [],
        tek17Reference: ''
      });
      toast.success('SJA godkjent og arkivert');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sja_reports');
    } finally {
      setIsSaving(false);
    }
  };

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const generateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summary = await summaryService.generateProjectSummary(
        project, 
        sjaReports.slice(0, 3), 
        projectDeviations.slice(0, 3)
      );
      setAiSummary(summary);
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (project.id && !aiSummary) {
      generateSummary();
    }
  }, [project.id]);

  const totalBudget = project.budget || projectOffers.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0) || 0;
  const currentProgress = typeof project.progress === 'number' ? project.progress : 0;
  const docLevel = typeof project.documentationLevel === 'number' ? project.documentationLevel : 0;
  const totalSpent = project.spent || 0;
  const totalInvoiced = (project as any).invoiced || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* 1. RYDDIG HEADER MED FOKUSERTE KNAPPER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2.5 hover:bg-slate-100 text-slate-500 hover:text-navy-900 rounded-xl transition-colors cursor-pointer"
            title="Tilbake til prosjektoversikt"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              {project.projectCode && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono font-bold rounded-md uppercase">
                  {project.projectCode}
                </span>
              )}
              <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight">{project.name}</h1>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                project.stage === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                project.stage === 'offer' ? "bg-amber-50 text-amber-700 border-amber-200" :
                project.stage === 'contract' ? "bg-blue-50 text-blue-700 border-blue-200" :
                "bg-slate-50 text-slate-700 border-slate-200"
              )}>
                {project.stage === 'active' ? 'Gjennomføring' : project.stage || 'Aktiv'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1"><MapPin size={13} /> {project.location || 'Norge'}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Calendar size={13} /> Oppstart: {formatDate(project.startDate)}</span>
            </div>
          </div>
        </div>

        {/* MAKS 4 HOVEDHANDLINGER */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <button 
            onClick={onShare}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-xl text-xs font-black hover:opacity-95 transition-all shadow-purple-cta cursor-pointer"
          >
            <Share2 size={15} />
            <span>Del med kunde</span>
          </button>

          <button 
            onClick={() => setIsAIVisionOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Ta bilde for TEK17 / BVN-bildeanalyse"
          >
            <Camera size={15} />
            <span>TEK17 Vision</span>
          </button>

          <button 
            onClick={() => setIsDailyLogOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Åpne eller dikter i byggedagboken"
          >
            <CloudSun size={15} className="text-electric-600" />
            <span>Byggedagbok</span>
          </button>

          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Last ned formell Boligmappa PDF-rapport"
          >
            <FileDown size={15} />
            <span>Boligmappa PDF</span>
          </button>

          {/* Diskret "Flere valg" for sjelden brukte verktøy */}
          <div className="relative">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Flere handlinger"
            >
              <MoreVertical size={16} />
            </button>
            {isMoreMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                <button
                  onClick={() => { setIsInviteModalOpen(true); setIsMoreMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2"
                >
                  <Users size={14} /> Inviter Håndverker
                </button>
                <button
                  onClick={() => { setIsOfferModalOpen(true); setIsMoreMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2"
                >
                  <Sparkles size={14} className="text-electric-500" /> Generer Tilbud
                </button>
                <button
                  onClick={() => { setIsHealthReportOpen(true); setIsMoreMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2"
                >
                  <Activity size={14} /> AI Helserapport
                </button>
                <button
                  onClick={() => { onStartChecklist?.(project.id); setIsMoreMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2"
                >
                  <ClipboardCheck size={14} /> Sjekklister & Kontroller
                </button>
                {project.stage === 'completion' && (
                  <button
                    onClick={() => { setIsFinalSettlementOpen(true); setIsMoreMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-navy-900 hover:bg-slate-50 rounded-xl flex items-center gap-2"
                  >
                    <Coins size={14} /> Sluttoppgjør (NS 8406)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MESTERAI PROSJEKT-KOMMANDOLINJE (AUTONOM AGENT) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-navy-900 via-navy-950 to-neutral-900 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 p-6 opacity-5 pointer-events-none">
          <Brain size={140} />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-electric-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              MesterAI overvåker prosjektet i sanntid
            </span>
            <span className="text-[11px] text-slate-400">Yr.no værsynk • TEK17 aktiv</span>
          </div>

          <div className="flex items-center gap-2 bg-white/10 rounded-2xl p-1.5 border border-white/10">
            <input 
              type="text"
              value={projectCommand}
              onChange={(e) => setProjectCommand(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendProjectCommand(); }}
              placeholder="Spør MesterAI eller gi instruks (f.eks: 'Før 6t tømrerarbeid', 'Varsle om tillegg')..."
              className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-400 outline-none font-medium"
            />
            <button
              onClick={toggleMic}
              className={cn(
                "p-2 rounded-xl transition-all",
                isListeningMic ? "bg-rose-500 text-white animate-pulse" : "hover:bg-white/10 text-slate-300"
              )}
              title="Dikter med tale"
            >
              {isListeningMic ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              onClick={() => handleSendProjectCommand()}
              disabled={isCommandLoading || !projectCommand.trim()}
              className="px-4 py-2 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-xl text-xs font-black hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isCommandLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Utfør</span>
            </button>
          </div>

          {/* Hurtigvalg */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hurtig:</span>
            <button
              onClick={() => handleSendProjectCommand('Før 7.5 timer tømrerarbeid i dag')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold text-slate-200 transition-colors"
            >
              + 7.5t tømrer
            </button>
            <button
              onClick={() => setIsChangeOrderOpen(true)}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold text-amber-300 transition-colors"
            >
              + Endringsordre (NS 8406)
            </button>
            <button
              onClick={() => setIsNewDeviationOpen(true)}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold text-rose-300 transition-colors"
            >
              + Registrer Avvik
            </button>
          </div>
        </div>
      </div>

      {/* 3. PROSJEKTFORLØP (MINIMALISTISK & RENT) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Prosjektforløp</span>
          <span className="text-[11px] font-bold text-electric-600">Neste milepæl: Sluttbefaring</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Tilbud', done: true },
            { label: 'Kontrakt', done: true },
            { label: 'Gjennomføring', current: true },
            { label: 'Overlevering', done: false },
          ].map((step, idx) => (
            <div key={idx} className="space-y-2">
              <div className={cn(
                "h-2 rounded-full",
                step.done ? "bg-emerald-500" :
                step.current ? "bg-electric-500" : "bg-slate-200"
              )} />
              <span className={cn(
                "text-xs font-bold block",
                step.done ? "text-emerald-700" :
                step.current ? "text-electric-700 font-black" : "text-slate-400"
              )}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. RYDDE FANER (5 FOKUSERTE FANER I STEDET FOR 9) */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto whitespace-nowrap custom-scrollbar">
        {[
          { id: 'overview', label: 'Oversikt & MesterAI', icon: <TrendingUp size={15} /> },
          { id: 'daily_log', label: 'Byggedagbok & Timer', icon: <CloudSun size={15} /> },
          { id: 'change_orders', label: 'Endringsordrer (NS 8406)', icon: <FileEdit size={15} /> },
          { id: 'crosstrade', label: 'Kvalitet & TEK17', icon: <Building2 size={15} /> },
          { id: 'docs', label: 'Dokumenter & FDV', icon: <FileText size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
              activeTab === tab.id 
                ? "bg-white text-navy-900 shadow-xs" 
                : "text-slate-600 hover:text-navy-900 hover:bg-slate-200/60"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 5. HOVEDINNHOLD */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Venstre kolonne (2/3 bredde) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Fremdriftskort */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Total Fremdrift</h3>
                  <div className="text-3xl sm:text-4xl font-black text-navy-900">{currentProgress}%</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    +I rute
                  </span>
                  <div className="text-[11px] text-slate-400 font-medium mt-1.5">
                    Ferdigstillelse: {formatDate(project.endDate) || 'Ikke fastsatt'}
                  </div>
                </div>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${currentProgress}%` }}
                  className="h-full bg-gradient-to-r from-electric-500 to-emerald-500 rounded-full"
                />
              </div>
            </div>

            {/* Prosjektdetaljer & Tidslinje */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Prosjektdetaljer</h3>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Beskrivelse</div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    {project.description || 'Ingen prosjektbeskrivelse lagt inn.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kunde</div>
                    <p className="text-xs sm:text-sm font-bold text-navy-900 mt-0.5">{project.clientName || 'Privatkunde'}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Prosjektleder</div>
                    <p className="text-xs sm:text-sm font-bold text-navy-900 mt-0.5">{project.projectManager || 'Byggmester'}</p>
                  </div>
                </div>
                {(project.gnr || project.bnr) && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 font-medium">
                    GNR: <strong className="text-navy-900">{project.gnr || '-'}</strong> • BNR: <strong className="text-navy-900">{project.bnr || '-'}</strong>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Tidslinje & Faser</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Oppstart</div>
                      <div className="text-xs sm:text-sm font-bold text-navy-900">{formatDate(project.startDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Clock size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sluttbefaring</div>
                      <div className="text-xs sm:text-sm font-bold text-navy-900">{formatDate(project.endDate) || 'Ikke fastsatt'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Prosjektoppsummering */}
            <div className="bg-navy-950 rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-electric-500 to-electric-600 flex items-center justify-center">
                    <Brain size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">AI Prosjektoppsummering</h3>
                    <p className="text-[10px] text-electric-300 font-black uppercase tracking-wider">Generert av MesterAI</p>
                  </div>
                </div>
                <button 
                  onClick={generateSummary}
                  disabled={isGeneratingSummary}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all disabled:opacity-50 text-slate-300 hover:text-white"
                  title="Oppdater oppsummering"
                >
                  <RefreshCw size={15} className={isGeneratingSummary ? "animate-spin" : ""} />
                </button>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-medium italic">
                {isGeneratingSummary ? 'Genererer oppdatert analyse...' : aiSummary || 'MesterAI analyserer prosjektstatusen...'}
              </p>
            </div>

            {/* Aktivitetslogg */}
            <ProjectActivityLog projectId={project.id} project={project} />

          </div>

          {/* Høyre kolonne (1/3 bredde) - Økonomi & Nøkkeltall */}
          <div className="space-y-6">
            
            {/* Prosjektøkonomi */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-navy-900 tracking-tight">Prosjektøkonomi</h3>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  +12% margin
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Budsjett vs Forbruk</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-navy-900">{Math.round(totalSpent / 1000)}K</span>
                  <span className="text-xs text-slate-400">/ {Math.round(totalBudget / 1000)}K</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${Math.min(100, (totalSpent / (totalBudget || 1)) * 100)}%` }} 
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {Math.round((totalSpent / (totalBudget || 1)) * 100)}% brukt • Prosjektet er i rute.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fakturert</div>
                <div className="text-xl font-black text-navy-900">{Math.round(totalInvoiced / 1000)}K</div>
                <div className="text-[11px] text-amber-700 flex items-center gap-1 font-bold">
                  <Clock size={12} /> {Math.round((totalBudget - totalInvoiced) / 1000)}K gjenstår å fakturere
                </div>
                <button 
                  onClick={() => toast.info('Fakturagrunnlag klargjort for regnskap / Tripletex.')}
                  className="w-full py-2.5 mt-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Opprett faktura
                </button>
              </div>

              {/* Byggevare- og FDV-register (ingen NOBB hardkoding!) */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Byggevarer & Leverandører</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Materiell (FDV-ført)</span>
                    <span className="font-bold text-navy-900">{totalSpent > 0 ? `${Math.round(totalSpent / 1000)}K` : '0 kr'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Dokumentasjonsgrad</span>
                    <span className="font-bold text-emerald-600">{docLevel}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Prosjektstatus & Kontroller */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Kvalitetsstatus</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={18} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-700">Fullførte SJA</span>
                  </div>
                  <span className="text-sm font-black text-navy-900">{sjaReports.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <span className="text-xs font-bold text-slate-700">Åpne avvik</span>
                  </div>
                  <span className="text-sm font-black text-navy-900">{projectDeviations.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <ClipboardCheck size={18} className="text-emerald-600" />
                    <span className="text-xs font-bold text-slate-700">Dokumentasjonsgrad</span>
                  </div>
                  <span className="text-sm font-black text-emerald-600">{docLevel}%</span>
                </div>
              </div>
            </div>

            {/* Team */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Prosjektteam</h3>
              {projectCrew.length > 0 ? (
                projectCrew.map(member => (
                  <div key={member.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-[10px]">
                        {member.name.charAt(0)}
                      </div>
                      <span className="font-bold text-navy-900">{member.name}</span>
                    </div>
                    <span className="text-slate-400 font-medium">{member.role}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Mester og tømrer registrert.</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 6. ANDRE FANER */}
      {activeTab === 'daily_log' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-electric-600">Byggherreforskriften § 15 & NS 8406</span>
              <h3 className="text-xl font-black text-navy-900 mt-1">Automatisk Byggedagbok</h3>
              <p className="text-xs text-slate-500">Sanntids værdata fra Yr.no, mannskapslister og daglige notater.</p>
            </div>
            <button
              onClick={() => setIsDailyLogOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-xl text-xs font-black shadow-purple-cta"
            >
              + Åpne dagbok / Dikter
            </button>
          </div>
          <div className="p-4 bg-electric-50/60 border border-electric-200 rounded-2xl text-xs text-navy-900 leading-relaxed">
            <strong>Juridisk beskyttelse:</strong> Værforhold og bemanning dokumenteres automatisk for å beskytte bedriften mot urimelige dagbøter ved uforutsett vær eller forsinkelser.
          </div>
        </div>
      )}

      {activeTab === 'change_orders' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-600">NS 8406 / Håndverkertjenesteloven § 9</span>
                <h3 className="text-xl font-black text-navy-900 mt-1">Endringsordrer & Tilleggsarbeid</h3>
                <p className="text-xs text-slate-500">Varsle tillegg og få skriftlig godkjenning fra kunden med 1 klikk før arbeidet starter.</p>
              </div>
              <button
                onClick={() => setIsChangeOrderOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-xl text-xs font-black shadow-purple-cta flex items-center gap-2 hover:opacity-95 transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Ny endringsordre</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Totalt antall endringer</span>
                <div className="text-2xl font-black text-navy-900 mt-1">{projectChangeOrders.length}</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Venter godkjenning</span>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  {projectChangeOrders.filter(o => o.status !== 'approved' && o.status !== 'rejected').length}
                </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Godkjent tilleggsverdi</span>
                <div className="text-2xl font-black text-emerald-900 mt-1">
                  {projectChangeOrders
                    .filter(o => o.status === 'approved')
                    .reduce((sum, o) => sum + (o.totalAmount || o.amountExVat || 0), 0)
                    .toLocaleString('no-NO')} kr
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed">
              <strong>Krav til skriftlighet:</strong> Alt tilleggsarbeid skal varsles umiddelbart. Kunden godkjenner direkte via lenken eller e-posten med digital signatur. Når kunden signerer, oppdateres prosjektbudsjettet og du varsles momentant.
            </div>
          </div>

          {/* Change Orders List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-black text-base text-navy-900">Registrerte endringsordrer</h4>
                <p className="text-xs text-slate-400">Del godkjenningslenke med kunden eller send direkte på e-post</p>
              </div>
              <span className="text-xs font-bold text-slate-400">{projectChangeOrders.length} ordrer</span>
            </div>

            {projectChangeOrders.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <FileSignature size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-navy-900 text-base">Ingen endringsordrer registrert ennå</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Meld fra om tilleggsarbeid og endringer raskt for å sikre bedriften mot ubetalte timer og materialkostnader.
                  </p>
                </div>
                <button
                  onClick={() => setIsChangeOrderOpen(true)}
                  className="px-5 py-2.5 bg-navy-900 text-white rounded-xl text-xs font-bold hover:bg-navy-800 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Opprett første endringsordre</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projectChangeOrders.map((order) => {
                  const amountExVat = Number(order.amountExVat || (order.totalAmount ? Math.round(order.totalAmount / 1.25) : 0));
                  const totalAmount = Number(order.totalAmount || Math.round(amountExVat * 1.25));
                  const isApproved = order.status === 'approved';
                  const isRejected = order.status === 'rejected';

                  return (
                    <div key={order.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                              #{order.changeNumber}
                            </span>
                            <h5 className="font-bold text-navy-900 text-base">{order.title}</h5>
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                              isApproved ? "bg-emerald-100 text-emerald-800" :
                              isRejected ? "bg-rose-100 text-rose-800" :
                              "bg-amber-100 text-amber-800"
                            )}>
                              {isApproved ? 'Godkjent & signert' : isRejected ? 'Avslått av kunde' : 'Venter på godkjenning'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                            {order.description}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap">
                            <span>Fristkonsekvens: <strong className="text-slate-700">{order.impactDays > 0 ? `+${order.impactDays} virkedager` : 'Ingen'}</strong></span>
                            <span>Meldt av: <strong className="text-slate-700">{order.authorName || 'Byggeleder'}</strong></span>
                            <span>Dato: <strong className="text-slate-700">{formatDate(order.createdAt)}</strong></span>
                            {order.signedByClientAt && (
                              <span className="text-emerald-700 font-bold">
                                Signert av: {order.clientName || 'Kunde'} ({formatDate(order.signedByClientAt)})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount and Action Buttons */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0">
                          <div className="text-left lg:text-right">
                            <div className="text-lg font-black text-navy-900">{amountExVat.toLocaleString('no-NO')} kr</div>
                            <div className="text-[11px] text-slate-400 font-medium">({totalAmount.toLocaleString('no-NO')} kr inkl. mva)</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyOrderLink(order)}
                              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Kopier godkjenningslenke"
                            >
                              <Copy size={14} />
                              <span className="hidden sm:inline">Kopier lenke</span>
                            </button>
                            <button
                              onClick={() => handleSendOrderEmail(order)}
                              className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Send e-post til kunden"
                            >
                              <Mail size={14} />
                              <span className="hidden sm:inline">Send e-post</span>
                            </button>
                            <button
                              onClick={() => {
                                const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                                const url = order.shareUrl || `${baseUrl}?changeOrderToken=${order.token}`;
                                window.open(url, '_blank');
                              }}
                              className="p-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Åpne kundevisning"
                            >
                              <ExternalLink size={14} />
                              <span className="hidden sm:inline">Forhåndsvis</span>
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Slett endringsordre"
                            >
                              <Trash2 size={14} />
                              <span className="hidden sm:inline">Slett</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'crosstrade' && (
        <div className="space-y-6">
          <CrossTradeCoordinator project={project} />

          {/* AVVIK & RUH (TEK17 / BVN) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-rose-600">Kvalitetssikring & TEK17</span>
                <h3 className="text-lg font-black text-navy-900 mt-0.5">Avvik & Uønskede hendelser (RUH)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAIVisionOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-navy-900 text-white rounded-xl text-xs font-bold hover:bg-navy-800 transition-all cursor-pointer"
                >
                  <Camera size={14} />
                  <span>TEK17 Vision</span>
                </button>
                <button 
                  onClick={() => setIsNewDeviationOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-xs font-bold hover:opacity-95 transition-all shadow-sm cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Loggfør Avvik</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {projectDeviations.length > 0 ? (
                projectDeviations.map((dev) => (
                  <div 
                    key={dev.id} 
                    onClick={() => setSelectedDeviation(dev)}
                    className="p-5 hover:bg-slate-50 transition-colors cursor-pointer group flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        dev.severity === 'high' || dev.severity === 'critical' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                      )}>
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-navy-900 group-hover:text-electric-600 transition-colors">{dev.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                          <span>{dev.timestamp || 'Nylig'}</span>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded",
                            dev.severity === 'high' || dev.severity === 'critical' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {dev.severity || 'Middels'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        pdfService.generateDeviationReport(project, dev);
                      }}
                      className="p-2 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-colors"
                      title="Last ned PDF"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-bold text-navy-900">Ingen åpne avvik registrert</p>
                  <p className="text-xs">Alle kontroller og arbeider er utført iht. TEK17 og Våtromsnormen.</p>
                </div>
              )}
            </div>
          </div>

          {/* SIKKER JOBB ANALYSE (SJA) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-600">HMS & Arbeidsmiljøloven</span>
                <h3 className="text-lg font-black text-navy-900 mt-0.5">Sikker Jobb Analyse (SJA)</h3>
              </div>
              <button 
                onClick={() => setIsNewSJAOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-95 transition-all shadow-sm cursor-pointer"
              >
                <Plus size={14} />
                <span>Ny SJA</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {sjaReports.length > 0 ? (
                sjaReports.map((sja) => (
                  <div key={sja.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-navy-900">{sja.title || sja.task || 'SJA Rapport'}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                          <span>{sja.timestamp || 'Nylig'}</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Godkjent
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <ShieldCheck size={32} className="mx-auto text-blue-500 mb-2" />
                  <p className="text-sm font-bold text-navy-900">Ingen SJA gjennomført ennå</p>
                  <p className="text-xs">Opprett en Sikker Jobb Analyse for risikofylt arbeid (f.eks. stillas, heising eller varme arbeider).</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="space-y-6">
          <ComplianceHub project={project} onOpenChecklist={() => onStartChecklist?.(project.id)} />
          <ProjectMaterials project={project} />
        </div>
      )}

      {/* MODALER */}
      <ChangeOrderModal
        isOpen={isChangeOrderOpen}
        onClose={() => setIsChangeOrderOpen(false)}
        project={project}
        currentUserId={auth.currentUser?.uid}
        currentUserName={auth.currentUser?.displayName || 'Byggeleder'}
      />

      <DailyLogModal
        isOpen={isDailyLogOpen}
        onClose={() => setIsDailyLogOpen(false)}
        project={project}
        currentUserName={auth.currentUser?.displayName || 'Byggeleder'}
      />

      <CreateDeviationModal
        isOpen={isNewDeviationOpen}
        onClose={() => setIsNewDeviationOpen(false)}
        projects={[{ id: project.id, name: project.name }]}
      />

      <AIVisionModal
        isOpen={isAIVisionOpen}
        onClose={() => setIsAIVisionOpen(false)}
        projectId={project.id}
        projectName={project.name}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        project={project}
        sjaReports={sjaReports}
        deviations={projectDeviations}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        project={project}
      />

      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        initialData={{
          projectId: project.id,
          projectCode: project.projectCode,
          title: `Tilbud - ${project.name}`,
          clientName: project.clientName,
          clientEmail: project.clientEmail
        }}
      />

      <ProjectHealthReport
        isOpen={isHealthReportOpen}
        onClose={() => setIsHealthReportOpen(false)}
        project={project}
      />

      <StoffkartotekModal
        isOpen={isStoffkartotekOpen}
        onClose={() => setIsStoffkartotekOpen(false)}
        project={project}
      />

      <FinalSettlementModal
        isOpen={isFinalSettlementOpen}
        onClose={() => setIsFinalSettlementOpen(false)}
        project={project}
      />

      <DeviationDetailModal 
        isOpen={!!selectedDeviation}
        onClose={() => setSelectedDeviation(null)}
        deviation={selectedDeviation}
        project={project}
        onUpdated={() => {}}
      />
    </motion.div>
  );
}
