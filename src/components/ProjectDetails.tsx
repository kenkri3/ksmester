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
  FlaskConical,
  Coins,
  BellRing
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Project, Deviation, CrewMember, Offer, Contract } from '../types';
import { db, auth, collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, OperationType, handleFirestoreError } from '../services/firebase';
import UniversalTranslator from './UniversalTranslator';
import { sjaService } from '../services/sjaService';
import { visionService, VisionAnalysisResult } from '../services/visionService';
import { useAuth } from '../hooks/useAuth';
import ReportModal from './ReportModal';
import InviteModal from './InviteModal';
import OfferModal from './OfferModal';
import ProjectHealthReport from './ProjectHealthReport';
import ProjectMaterials from './ProjectMaterials';
import ProjectActivityLog from './ProjectActivityLog';
import AIVisionModal from './AIVisionModal';
import { summaryService } from '../services/summaryService';
import ComplianceHub from './ComplianceHub';
import ChangeOrderModal from './ChangeOrderModal';
import DailyLogModal from './DailyLogModal';
import StoffkartotekModal from './StoffkartotekModal';
import FinalSettlementModal from './FinalSettlementModal';
import { budgetAlertService, BudgetStatus } from '../services/budgetAlertService';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'sja' | 'deviations' | 'docs' | 'materials' | 'change_orders' | 'daily_log' | 'stoffkartotek'>('overview');
  const [sjaReports, setSjaReports] = useState<any[]>([]);
  const [projectDeviations, setProjectDeviations] = useState<Deviation[]>([]);
  const [projectCrew, setProjectCrew] = useState<CrewMember[]>([]);
  const [projectOffers, setProjectOffers] = useState<Offer[]>([]);
  const [projectContracts, setProjectContracts] = useState<Contract[]>([]);
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
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);

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

    return () => {
      unsubscribeSja();
      unsubscribeDeviations();
      unsubscribeCrew();
      unsubscribeOffers();
      unsubscribeContracts();
    };
  }, [project.id]);

  useEffect(() => {
    if (project?.id) {
      budgetAlertService.checkProjectBudget(project).then(setBudgetStatus).catch(console.warn);
    }
  }, [project]);

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
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sja_reports');
    } finally {
      setIsSaving(false);
    }
  };

  const addRisk = () => {
    setNewSJA({
      ...newSJA,
      risikoer: [...newSJA.risikoer, { aktivitet: '', risiko: '', tiltak: '' }]
    });
  };

  const removeRisk = (index: number) => {
    setNewSJA({
      ...newSJA,
      risikoer: newSJA.risikoer.filter((_, i) => i !== index)
    });
  };

  const handleAIGenerate = async () => {
    if (!newSJA.task.trim()) {
      alert('Vennligst skriv inn en arbeidsoppgave først for å generere et utkast.');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const draft = await sjaService.generateDraft(
        { name: project.name, description: project.description, location: project.location },
        newSJA.task
      );
      
      setNewSJA({
        title: draft.title,
        task: draft.task,
        risikoer: draft.risikoer,
        utstyr: draft.utstyr,
        tek17Reference: draft.tek17Reference
      });
    } catch (error) {
      console.error("AI Generation failed:", error);
      alert('Kunne ikke generere SJA-utkast. Vennligst prøv igjen senere.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const generateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      // For simplicity, we'll pass simplified data
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

  const totalBudget = project.budget || projectOffers.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalSpent = project.spent || 0;
  const totalInvoiced = (project as any).invoiced || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              {project.projectCode && (
                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-xs font-bold rounded uppercase">
                  {project.projectCode}
                </span>
              )}
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                project.stage === 'active' ? "bg-emerald-100 text-emerald-700" : 
                project.stage === 'offer' ? "bg-amber-100 text-amber-700" :
                project.stage === 'contract' ? "bg-blue-100 text-blue-700" :
                "bg-neutral-100 text-neutral-700"
              )}>
                {project.stage || 'Aktiv'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-400">
              <span className="flex items-center gap-1"><MapPin size={12} /> {project.location}</span>
              <span className="flex items-center gap-1"><Calendar size={12} /> {t('started')}: {project.lastUpdate}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button 
            onClick={onShare}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
          >
            <Share2 size={16} />
            Del med kunde
          </button>
          <button 
            onClick={() => setIsAIVisionOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-rose-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-rose-500 transition-all shadow-lg shadow-rose-100"
            title="Ta bilde for AI KS-kontroll"
          >
            <Camera size={16} />
            AI KS-kontroll
          </button>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-neutral-50 transition-colors"
          >
            <Users size={16} />
            Inviter Håndverker
          </button>
          <button 
            onClick={() => onStartChecklist?.(project.id)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-neutral-50 transition-colors"
          >
            <ClipboardCheck size={16} className="text-emerald-600" />
            Sjekkliste
          </button>
          <button 
            onClick={() => setIsOfferModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-neutral-50 transition-colors"
          >
            <Sparkles size={16} className="text-emerald-600" />
            Generer Tilbud
          </button>
          <button 
            onClick={() => setIsHealthReportOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-neutral-50 transition-colors"
          >
            <Activity size={16} className="text-emerald-600" />
            AI Helserapport
          </button>
          <button 
            onClick={() => setIsChangeOrderOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-xl text-xs sm:text-sm font-bold hover:bg-amber-500/20 transition-all"
            title="Opprett eller se endringsmeldinger / tilleggsarbeid"
          >
            <FileEdit size={16} />
            Tilleggsarbeid
          </button>
          <button 
            onClick={() => setIsDailyLogOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-sky-500/10 text-sky-700 border border-sky-500/20 rounded-xl text-xs sm:text-sm font-bold hover:bg-sky-500/20 transition-all"
            title="Automatisk byggedagbok med værdata fra Yr"
          >
            <CloudSun size={16} />
            Byggedagbok
          </button>
          <button 
            onClick={() => setIsStoffkartotekOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-xl text-xs sm:text-sm font-bold hover:bg-amber-500/20 transition-all"
            title="Kjemisk stoffkartotek for byggeplass"
          >
            <FlaskConical size={16} />
            Stoffkartotek
          </button>
          {project.stage === 'completion' && (
            <button 
              onClick={() => setIsFinalSettlementOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-all shadow-md"
              title="Formelt sluttoppgjør iht. NS 8406"
            >
              <Coins size={16} />
              Sluttoppgjør
            </button>
          )}
          {project.stage === 'completion' && (
            <button 
              onClick={() => onHandover?.(project.id)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-rose-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-rose-500 transition-all shadow-lg shadow-rose-100"
            >
              <CheckCircle2 size={16} />
              Overlevering
            </button>
          )}
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
          >
            {t('generate_report')}
          </button>
        </div>
      </div>

      {/* Modals */}
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
          title: `Tilbud: ${project.name}`,
          description: project.description,
          clientName: project.clientName,
          clientEmail: project.clientEmail
        }}
      />

      <ProjectHealthReport 
        project={project}
        isOpen={isHealthReportOpen}
        onClose={() => setIsHealthReportOpen(false)}
      />

      <AIVisionModal 
        isOpen={isAIVisionOpen}
        onClose={() => setIsAIVisionOpen(false)}
        projectId={project.id}
        projectName={project.name}
      />

      {/* Project Stage Progress */}
      <div className="bg-white rounded-[2rem] border border-neutral-200 p-8 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold">Prosjektforløp</h3>
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
            Neste steg: {project.stage === 'offer' ? 'Kontraktsignering' : project.stage === 'contract' ? 'Oppstartsmøte' : 'Sluttbefaring'}
          </div>
        </div>
        <div className="relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-neutral-100 -translate-y-1/2" />
          <div className="relative flex justify-between">
            {[
              { id: 'offer', label: 'Tilbud', icon: <FileText size={16} /> },
              { id: 'contract', label: 'Kontrakt', icon: <FileSignature size={16} /> },
              { id: 'active', label: 'Gjennomføring', icon: <HardHat size={16} /> },
              { id: 'completion', label: 'Overlevering', icon: <CheckCircle2 size={16} /> }
            ].map((s, i, arr) => {
              const stages = ['offer', 'contract', 'active', 'completion', 'archived'];
              const currentIdx = stages.indexOf(project.stage || 'active');
              const stageIdx = stages.indexOf(s.id);
              const isPast = stageIdx < currentIdx;
              const isCurrent = stageIdx === currentIdx;

              return (
                <div key={s.id} className="flex flex-col items-center gap-3 relative z-10">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                    isPast ? "bg-emerald-500 text-white" : 
                    isCurrent ? "bg-white border-2 border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-100" : 
                    "bg-white border-2 border-neutral-100 text-neutral-300"
                  )}>
                    {isPast ? <CheckCircle2 size={20} /> : s.icon}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    isCurrent ? "text-emerald-600" : "text-neutral-400"
                  )}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-2xl max-w-full overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { id: 'overview', label: t('overview'), icon: <TrendingUp size={16} /> },
          { id: 'change_orders', label: 'Tillegg & Endringer', icon: <FileEdit size={16} /> },
          { id: 'daily_log', label: 'Byggedagbok', icon: <CloudSun size={16} /> },
          { id: 'stoffkartotek', label: 'Stoffkartotek', icon: <FlaskConical size={16} /> },
          { id: 'sja', label: 'SJA', icon: <ShieldCheck size={16} /> },
          { id: 'deviations', label: t('deviations'), icon: <AlertTriangle size={16} /> },
          { id: 'docs', label: t('documentation'), icon: <FileText size={16} /> },
          { id: 'materials', label: 'Materiell', icon: <Package size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === tab.id 
                ? "bg-white text-emerald-600 shadow-sm" 
                : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Budsjettadvarsel ved 80% / 100% overforbruk */}
              {budgetStatus && (budgetStatus.isWarning80 || budgetStatus.isOverBudget100) && (
                <div className={cn(
                  "p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm",
                  budgetStatus.isOverBudget100 
                    ? "bg-rose-50 border-rose-200 text-rose-950" 
                    : "bg-amber-50 border-amber-200 text-amber-950"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-3 rounded-2xl text-white shrink-0",
                      budgetStatus.isOverBudget100 ? "bg-rose-600" : "bg-amber-600"
                    )}>
                      <BellRing size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider">
                        {budgetStatus.isOverBudget100 ? 'Kritisk budsjettavvik (>100%)' : 'Budsjettadvarsel (>80%)'}
                      </div>
                      <p className="text-xs mt-0.5 max-w-xl text-neutral-700">
                        {budgetStatus.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsChangeOrderOpen(true)}
                      className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all"
                    >
                      + Ny endringsmelding
                    </button>
                    <button
                      onClick={() => pdfService.generateExtensionOfTimeClaimPDF(project, {
                        id: 'claim_quick',
                        projectId: project.id,
                        claimNumber: 1,
                        cause: 'uforutsett_grunnforhold',
                        description: `Fristforlengelse kreves pga. uforutsette bygningsmessige forhold som har oversteget opprinnelige budsjettrammer (${budgetStatus.percentUsed}% medgått).`,
                        daysClaimed: 5,
                        costImpactClaimed: budgetStatus.spent - budgetStatus.budget,
                        status: 'submitted',
                        submittedDate: new Date().toISOString().split('T')[0],
                        createdAt: new Date().toISOString()
                      })}
                      className="px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-bold hover:bg-neutral-50 transition-all text-neutral-800"
                    >
                      Krav om fristforlengelse
                    </button>
                  </div>
                </div>
              )}

              {/* Progress Card */}
              <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-1">{t('total_progress')}</h3>
                    <div className="text-4xl font-bold">{project.progress}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-600 mb-1">+{t('on_track')}</div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">
                      {project.endDate ? `${t('est_completion')}: ${project.endDate}` : `${t('est_completion')}: 12. Mai`}
                    </div>
                  </div>
                </div>
                <div className="h-4 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>

              {/* Project Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-4">{t('project_details', 'Prosjektdetaljer')}</h3>
                  <div className="space-y-4">
                    {project.description && (
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{t('description')}</div>
                        <p className="text-sm text-neutral-600">{project.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{t('client')}</div>
                        <p className="text-sm font-bold">{project.clientName || '-'}</p>
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{t('manager')}</div>
                        <p className="text-sm font-bold">{project.projectManager || '-'}</p>
                      </div>
                    </div>
                    {(project.gnr || project.bnr) && (
                      <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">GNR</div>
                          <p className="text-sm font-bold">{project.gnr || '-'}</p>
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">BNR</div>
                          <p className="text-sm font-bold">{project.bnr || '-'}</p>
                        </div>
                      </div>
                    )}
                    {project.tags && project.tags.length > 0 && (
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{t('tags')}</div>
                        <div className="flex flex-wrap gap-2">
                          {project.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-neutral-100 text-neutral-600 text-[10px] font-bold rounded-lg">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-4">{t('timeline', 'Tidslinje')}</h3>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">{t('start_date')}</div>
                        <div className="text-sm font-bold">{project.startDate || project.lastUpdate}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Clock size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">{t('end_date')}</div>
                        <div className="text-sm font-bold">{project.endDate || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Summary Card */}
              <div className="bg-neutral-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles size={120} />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">AI Prosjektoppsummering</h3>
                        <p className="text-[10px] text-rose-300 font-black uppercase tracking-widest">Generert av MesterAI</p>
                      </div>
                    </div>
                    <button 
                      onClick={generateSummary}
                      disabled={isGeneratingSummary}
                      className="p-2 hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
                    >
                      <RefreshCw size={18} className={isGeneratingSummary ? "animate-spin" : ""} />
                    </button>
                  </div>
                  
                  <div className="text-neutral-300 text-sm leading-relaxed font-medium italic">
                    {isGeneratingSummary ? (
                      <div className="flex items-center gap-3 animate-pulse">
                        <div className="h-4 w-full bg-white/10 rounded" />
                      </div>
                    ) : (
                      aiSummary || "Ingen oppsummering tilgjengelig ennå."
                    )}
                  </div>
                </div>
              </div>

              {/* Project Activity Log */}
              <ProjectActivityLog projectId={project.id} />
            </div>
          )}

          {activeTab === 'sja' && (
            <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
                <h3 className="font-bold">{t('sja_reports')}</h3>
                <button 
                  onClick={() => setIsNewSJAOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
                >
                  <Plus size={16} />
                  {t('new_sja')}
                </button>
              </div>
              <div className="divide-y divide-neutral-100">
                {sjaReports.map((report) => (
                  <div key={report.id} className="p-6 hover:bg-neutral-50 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold group-hover:text-blue-600 transition-colors">{report.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                            <span className="flex items-center gap-1"><User size={12} /> {report.authorName || 'System'}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> {report.timestamp}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            pdfService.generateSJAReport(project, report);
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                          title="Last ned PDF"
                        >
                          <Download size={20} />
                        </button>
                        <button className="p-2 text-neutral-400 hover:text-neutral-900">
                          <MoreVertical size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{t('risks')}</div>
                        <div className="flex flex-wrap gap-1">
                          {report.risikoer?.slice(0, 3).map((risk: any, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-bold">{risk.risiko}</span>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{t('measures')}</div>
                        <div className="flex flex-wrap gap-1">
                          {report.risikoer?.slice(0, 3).map((risk: any, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-bold">{risk.tiltak}</span>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{t('equipment')}</div>
                        <div className="flex flex-wrap gap-1">
                          {report.utstyr?.slice(0, 3).map((u: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-bold">{u}</span>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">TEK17 / SAK10</div>
                        <div className="text-[10px] font-bold text-neutral-600 truncate">{report.tek17Reference || '-'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'deviations' && (
            <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
                <h3 className="font-bold">{t('deviations')}</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsAIVisionOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-100 cursor-pointer"
                  >
                    <Camera size={16} />
                    {t('ai_vision', 'AI Vision')}
                  </button>
                  <button 
                    onClick={() => setIsNewDeviationOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
                  >
                    <Plus size={16} />
                    {t('log_deviation')}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-neutral-100">
                {projectDeviations.map((dev) => (
                  <div key={dev.id} className="p-6 hover:bg-neutral-50 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          dev.severity === 'high' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                        )}>
                          <AlertTriangle size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold group-hover:text-amber-600 transition-colors">{dev.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                            <span className="flex items-center gap-1"><Clock size={12} /> {dev.timestamp}</span>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                              dev.severity === 'high' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {dev.severity === 'high' ? t('critical') : t('moderate')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            pdfService.generateDeviationReport(project, dev);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Last ned PDF"
                        >
                          <Download size={20} />
                        </button>
                        <button className="p-2 text-neutral-400 hover:text-neutral-900">
                          <MoreVertical size={20} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-600 mb-4">{dev.description}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-xs font-bold text-neutral-400">
                        <MessageSquare size={14} />
                        3 {t('comments')}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-neutral-400">
                        <FileText size={14} />
                        2 {t('attachments')}
                      </div>
                    </div>
                  </div>
                ))}
                {projectDeviations.length === 0 && (
                  <div className="p-12 text-center text-neutral-400 text-sm">
                    {t('no_deviations_found', 'Ingen avvik funnet for dette prosjektet.')}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'docs' && (
            <ComplianceHub 
              project={project} 
              onOpenChecklist={() => onStartChecklist?.(project.id)} 
            />
          )}


          {activeTab === 'materials' && (
            <ProjectMaterials project={project} />
          )}

          {activeTab === 'change_orders' && (
            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                      <FileEdit size={16} />
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                      NS 8406 / Håndverkertjenesteloven § 9
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900">Endringsmeldinger & Tilleggsarbeid</h3>
                  <p className="text-xs text-neutral-500">
                    Sikrer skriftlig avtale, digital signatur og automatisk budsjettsynk.
                  </p>
                </div>
                <button
                  onClick={() => setIsChangeOrderOpen(true)}
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
                >
                  <Plus size={14} /> Opprett / Behandle endring
                </button>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-900 leading-relaxed">
                <strong>Lovkrav i Norge:</strong> Håndverkertjenesteloven § 9 og NS 8406 pkt. 19 krever at tilleggsarbeid varsles og godkjennes skriftlig for å ha rettmessig krav på vederlag. Ved å bruke digital endringsmelding unngår bedriften tvister og tapte penger.
              </div>

              <div className="flex justify-center py-6">
                <button
                  onClick={() => setIsChangeOrderOpen(true)}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
                >
                  <FileEdit size={16} /> Åpne oversikt over tilleggsavtaler
                </button>
              </div>
            </div>
          )}

          {activeTab === 'daily_log' && (
            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 bg-sky-500/10 text-sky-600 rounded-lg">
                      <CloudSun size={16} />
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-sky-600">
                      Byggherreforskriften § 15 & NS 8405/8406
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900">Automatisk Byggedagbok</h3>
                  <p className="text-xs text-neutral-500">
                    Sanntids værdata fra Yr/Open-Meteo, mannskapsliste og daglig produksjonslogg.
                  </p>
                </div>
                <button
                  onClick={() => setIsDailyLogOpen(true)}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
                >
                  <CloudSun size={14} /> Se & Kompiler dagbok
                </button>
              </div>

              <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-950 leading-relaxed">
                <strong>Hvorfor byggedagbok?</strong> Dokumenterer værforhold, temperatur, vind og nedbør samt hvem som er på byggeplassen. Dette gir entreprenøren juridisk bevis ved krav om fristforlengelse og beskytter mot dagbøter.
              </div>

              <div className="flex justify-center py-6">
                <button
                  onClick={() => setIsDailyLogOpen(true)}
                  className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
                >
                  <CloudSun size={16} /> Åpne Byggedagbok-modulen
                </button>
              </div>
            </div>
          )}

          {activeTab === 'stoffkartotek' && (
            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                      <FlaskConical size={16} />
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                      Forskrift om utførelse av arbeid kap. 2 | Arbeidstilsynet
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900">Kjemisk Stoffkartotek</h3>
                  <p className="text-xs text-neutral-500">
                    Sikkerhetsdatablader, verneutstyr og førstehjelp for byggeplassen.
                  </p>
                </div>
                <button
                  onClick={() => setIsStoffkartotekOpen(true)}
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
                >
                  <FlaskConical size={14} /> Åpne stoffkartotek
                </button>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed">
                <strong>Arbeidstilsynets pålegg:</strong> Alle kjemikalier (fugemasse, lim, membran, lakk, sparkel) må ha oppdatert sikkerhetsdatablad på plassen. KS Mester forhåndsutfyller dette automatisk.
              </div>

              <div className="flex justify-center py-6">
                <button
                  onClick={() => setIsStoffkartotekOpen(true)}
                  className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <FlaskConical size={16} /> Vis kjemikalier & Sikkerhetsdatablader
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Project Economy */}
        <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold tracking-tight">Prosjektøkonomi</h3>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold">
              <TrendingUp size={16} /> +12% margin
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Budsjett vs Forbruk</div>
              <div className="flex items-end gap-2">
                <div className="text-2xl font-black text-neutral-900">{Math.round(totalSpent / 1000)}K</div>
                <div className="text-sm text-neutral-400 mb-1">/ {Math.round(totalBudget / 1000)}K</div>
              </div>
              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${Math.min(100, (totalSpent / (totalBudget || 1)) * 100)}%` }} 
                />
              </div>
              <p className="text-[10px] text-neutral-500">
                {Math.round((totalSpent / (totalBudget || 1)) * 100)}% av budsjett er brukt. 
                {totalSpent > totalBudget ? ' Prosjektet overskrider budsjett!' : ' Prosjektet er i rute.'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Fakturert</div>
              <div className="text-2xl font-black text-neutral-900">{Math.round(totalInvoiced / 1000)}K</div>
              <div className="flex items-center gap-2 text-[10px] text-amber-600 font-bold">
                <Clock size={12} /> {Math.round((totalBudget - totalInvoiced) / 1000)}K gjenstår å fakturere
              </div>
              <button className="w-full py-3 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all">
                Opprett faktura
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Materiell & Underentreprenør</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Materiell (NOBB)</span>
                  <span className="font-bold">185K</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Elektriker AS</span>
                  <span className="font-bold">45K</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Gravemaskin utleie</span>
                  <span className="font-bold">12K</span>
                </div>
              </div>
              <button className="w-full py-3 border border-neutral-200 text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-50 transition-all">
                Se alle kostnader
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <UniversalTranslator projectId={project.id} className="h-[500px]" />
          
          {/* Project Stats */}
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
            <h3 className="font-bold mb-6">{t('project_stats')}</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="text-sm font-medium text-neutral-600">{t('sja_completed')}</span>
                </div>
                <span className="font-bold">{sjaReports.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                    <AlertTriangle size={16} />
                  </div>
                  <span className="text-sm font-medium text-neutral-600">{t('open_deviations')}</span>
                </div>
                <span className="font-bold">{projectDeviations.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                    <ClipboardCheck size={16} />
                  </div>
                  <span className="text-sm font-medium text-neutral-600">{t('doc_level')}</span>
                </div>
                <span className="font-bold">{project.documentationLevel}%</span>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
            <h3 className="font-bold mb-6">{t('project_team')}</h3>
            <div className="space-y-4">
              {projectCrew.length > 0 ? (
                projectCrew.map(member => (
                  <div key={member.id} className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 overflow-hidden border border-neutral-200 shrink-0 aspect-square">
                        <img 
                          src={`https://picsum.photos/seed/${member.id}/40/40`} 
                          alt={member.name} 
                          referrerPolicy="no-referrer" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-bold group-hover:text-emerald-600 transition-colors">{member.name}</div>
                        <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">{member.role}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-400 italic text-center py-4">Ingen mannskap registrert på dette prosjektet.</p>
              )}
            </div>
            <button className="w-full mt-6 py-3 rounded-xl border border-neutral-200 text-sm font-bold hover:bg-neutral-50 transition-colors">
              {t('manage_team')}
            </button>
          </div>
        </div>
      </div>

      {/* New SJA Modal */}
      <AnimatePresence>
        {isNewSJAOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col"
            >
              <div className="p-4 sm:p-8 border-b border-neutral-100 flex items-center justify-between shrink-0">
                <h3 className="text-base sm:text-xl font-bold">{t('new_sja')}</h3>
                <button onClick={() => setIsNewSJAOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddSJA} className="p-4 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-[8px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Tittel</label>
                    <input 
                      required
                      type="text" 
                      value={newSJA.title}
                      onChange={(e) => setNewSJA({...newSJA, title: e.target.value})}
                      className="w-full bg-neutral-50 border-none rounded-xl sm:rounded-2xl px-4 py-2.5 sm:py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="F.eks. Montering av sikringsskap"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[8px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2 flex items-center justify-between">
                      Oppgave
                      <button 
                        type="button"
                        onClick={handleAIGenerate}
                        disabled={isGeneratingAI || !newSJA.task.trim()}
                        className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {isGeneratingAI ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Generer med AI</span>
                      </button>
                    </label>
                    <input 
                      required
                      type="text" 
                      value={newSJA.task}
                      onChange={(e) => setNewSJA({...newSJA, task: e.target.value})}
                      className="w-full bg-neutral-50 border-none rounded-xl sm:rounded-2xl px-4 py-2.5 sm:py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="Spesifiser oppgaven (f.eks. Arbeid i høyden med lift)..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">TEK17 / SAK10 Referanser</label>
                  <input 
                    type="text" 
                    value={newSJA.tek17Reference}
                    onChange={(e) => setNewSJA({...newSJA, tek17Reference: e.target.value})}
                    className="w-full bg-neutral-50 border-none rounded-xl sm:rounded-2xl px-4 py-2.5 sm:py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    placeholder="F.eks. TEK17 § 11-1, SAK10 § 12-1..."
                  />
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[8px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest">Risikoanalyse</label>
                    <button 
                      type="button"
                      onClick={addRisk}
                      className="text-[8px] sm:text-[10px] font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                    >
                      <Plus size={10} /> Legg til rad
                    </button>
                  </div>
                  <div className="space-y-2">
                    {newSJA.risikoer.map((risk, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start bg-neutral-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-neutral-100">
                        <div className="col-span-11 sm:col-span-4">
                          <input 
                            placeholder="Aktivitet"
                            value={risk.aktivitet}
                            onChange={(e) => {
                              const newRisks = [...newSJA.risikoer];
                              newRisks[index].aktivitet = e.target.value;
                              setNewSJA({...newSJA, risikoer: newRisks});
                            }}
                            className="w-full bg-white border-none rounded-lg sm:rounded-xl px-3 py-2 text-[10px] sm:text-xs font-medium"
                          />
                        </div>
                        <div className="col-span-11 sm:col-span-3">
                          <input 
                            placeholder="Risiko"
                            value={risk.risiko}
                            onChange={(e) => {
                              const newRisks = [...newSJA.risikoer];
                              newRisks[index].risiko = e.target.value;
                              setNewSJA({...newSJA, risikoer: newRisks});
                            }}
                            className="w-full bg-white border-none rounded-lg sm:rounded-xl px-3 py-2 text-[10px] sm:text-xs font-medium"
                          />
                        </div>
                        <div className="col-span-11 sm:col-span-4">
                          <input 
                            placeholder="Tiltak"
                            value={risk.tiltak}
                            onChange={(e) => {
                              const newRisks = [...newSJA.risikoer];
                              newRisks[index].tiltak = e.target.value;
                              setNewSJA({...newSJA, risikoer: newRisks});
                            }}
                            className="w-full bg-white border-none rounded-lg sm:rounded-xl px-3 py-2 text-[10px] sm:text-xs font-medium"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end pt-1">
                          <button 
                            type="button"
                            onClick={() => removeRisk(index)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Nødvendig utstyr</label>
                  <input 
                    type="text" 
                    placeholder="F.eks. Hjelm, Hansker (separer med komma)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          setNewSJA({...newSJA, utstyr: [...newSJA.utstyr, ...val.split(',').map(s => s.trim())]});
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    className="w-full bg-neutral-50 border-none rounded-xl sm:rounded-2xl px-4 py-2.5 sm:py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                    {newSJA.utstyr.map((u, i) => (
                      <span key={i} className="px-2 py-1 bg-neutral-100 text-neutral-600 text-[9px] sm:text-[10px] font-bold rounded-lg flex items-center gap-1">
                        {u}
                        <button type="button" onClick={() => setNewSJA({...newSJA, utstyr: newSJA.utstyr.filter((_, idx) => idx !== i)})}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white pt-2 pb-2 sm:pb-0">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    <span className="text-sm sm:text-base">{t('save_sja')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* New Deviation Modal */}
      <AnimatePresence>
        {isNewDeviationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col"
            >
              <div className="p-4 sm:p-8 border-b border-neutral-100 flex items-center justify-between shrink-0">
                <h3 className="text-base sm:text-xl font-bold">{t('log_deviation')}</h3>
                <button onClick={() => setIsNewDeviationOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddDeviation} className="p-4 sm:p-8 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Tittel</label>
                  <input 
                    required
                    type="text" 
                    value={newDeviation.title}
                    onChange={(e) => setNewDeviation({...newDeviation, title: e.target.value})}
                    className="w-full bg-neutral-50 border-none rounded-xl sm:rounded-2xl px-4 py-2.5 sm:py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    placeholder="F.eks. Manglende rekkverk"
                  />
                </div>
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Beskrivelse</label>
                  <textarea 
                    required
                    value={newDeviation.description}
                    onChange={(e) => setNewDeviation({...newDeviation, description: e.target.value})}
                    className="w-full bg-neutral-50 border-none rounded-xl sm:rounded-2xl px-4 py-2.5 sm:py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all min-h-[80px] sm:min-h-[100px]"
                    placeholder="Beskriv avviket i detalj..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Alvorlighetsgrad</label>
                    <select 
                      value={newDeviation.severity}
                      onChange={(e) => setNewDeviation({...newDeviation, severity: e.target.value as any})}
                      className="w-full bg-neutral-50 border-none rounded-xl sm:rounded-2xl px-4 py-2.5 sm:py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option value="low">Lav</option>
                      <option value="medium">Middels</option>
                      <option value="high">Høy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Lokasjon</label>
                    <input 
                      type="text" 
                      value={newDeviation.location}
                      onChange={(e) => setNewDeviation({...newDeviation, location: e.target.value})}
                      className="w-full bg-neutral-50 border-none rounded-xl sm:rounded-2xl px-4 py-2.5 sm:py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="F.eks. Plan 2, Sone B"
                    />
                  </div>
                </div>
                <div className="sticky bottom-0 bg-white pt-2 pb-2 sm:pb-0">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    <span className="text-sm sm:text-base">{t('save_deviation')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
