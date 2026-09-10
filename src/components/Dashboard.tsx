'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Users, 
  ClipboardCheck, 
  AlertTriangle, 
  Plus, 
  Zap,
  Smartphone,
  Search, 
  Command,
  Filter,
  MoreVertical,
  ChevronRight,
  MapPin,
  Clock,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  FileText,
  HardHat,
  Camera,
  Languages,
  ListChecks,
  Package,
  Library,
  Shield,
  Calculator,
  GraduationCap,
  Car,
  FileSignature,
  Timer,
  Brain,
  Calendar,
  Building2,
  Copy,
  Mic,
  MicOff,
  Send,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Lock,
  Unlock,
  ExternalLink,
  Layers,
  ThumbsUp,
  ThumbsDown,
  CloudSun
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Project, Deviation, UserProfile } from '../types';
import { db, collection, onSnapshot, query, orderBy, where, getDocs, OperationType, handleFirestoreError } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../hooks/useAuth';
import ActivityLogModal from './ActivityLogModal';
import CreateProjectModal from './CreateProjectModal';
import CreateDeviationModal from './CreateDeviationModal';
import ChecklistModal from './ChecklistModal';
import AIVisionModal from './AIVisionModal';
import OfferModal from './OfferModal';
import ContractModal from './ContractModal';
import DocumentationArchive from './DocumentationArchive';
import TimeRegistrationModal from './TimeRegistrationModal';
import BuildingApplicationModal from './BuildingApplicationModal';
import IntegrationModal from './IntegrationModal';
import HandoverModal from './HandoverModal';
import InventoryModal from './InventoryModal';
import VehicleModal from './VehicleModal';
import HMSModal from './HMSModal';
import ProjectDetails from './ProjectDetails';
import SmartSearch from './SmartSearch';

interface DashboardProps {
  initialTab?: any;
  isDemo?: boolean;
  onTabChange?: (tab: string) => void;
  onOpenPortal?: (project: Project) => void;
}

export default function Dashboard({ 
  initialTab = 'cockpit', 
  isDemo = false,
  onTabChange,
  onOpenPortal 
}: DashboardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { projects, deviations, stats, loading: dataLoading } = useDashboardData();

  // Primary active tab
  const [activeTab, setActiveTab] = useState<'cockpit' | 'prosjekter' | 'endringsordrer' | 'kvalitet' | 'agent'>(
    'cockpit'
  );

  const handleTabSelect = (tab: 'cockpit' | 'prosjekter' | 'endringsordrer' | 'kvalitet' | 'agent') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    if (!initialTab) return;
    if (initialTab === 'prosjekter') setActiveTab('prosjekter');
    else if (initialTab === 'finans' || initialTab === 'tilbud' || initialTab === 'endringsordrer') setActiveTab('endringsordrer');
    else if (initialTab === 'avvik' || initialTab === 'hms' || initialTab === 'kvalitet') setActiveTab('kvalitet');
    else if (initialTab === 'ai' || initialTab === 'agent') setActiveTab('agent');
    else setActiveTab('cockpit');
  }, [initialTab]);

  // Selected project for details view
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeviationModalOpen, setIsDeviationModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [checklistProjectId, setChecklistProjectId] = useState<string | undefined>();
  const [isAIVisionModalOpen, setIsAIVisionModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isBuildingAppModalOpen, setIsBuildingAppModalOpen] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverProjectId, setHandoverProjectId] = useState<string | undefined>();
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isHMSModalOpen, setIsHMSModalOpen] = useState(false);
  const [isSmartSearchOpen, setIsSmartSearchOpen] = useState(false);
  const [isActivityLogModalOpen, setIsActivityLogModalOpen] = useState(false);

  // Agent State & Live Dispatch
  const [agentStatus, setAgentStatus] = useState<any>({
    name: 'VikingMester Autonom Agent',
    status: 'online',
    email: 'hei@vikingmester.no',
    channels: ['E-post lytter (hei@vikingmester.no)', 'Tale & Diktering i felt', 'TEK17 Vision-skanner'],
    lastPing: new Date().toISOString()
  });

  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<any>({
    todayActionsCount: 14,
    pendingApprovalsCount: 2,
    activeBlockersCount: 1,
    securedRevenue: 42500
  });

  const [isLoadingAgent, setIsLoadingAgent] = useState(true);

  // Command prompt state
  const [commandText, setCommandText] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [lastAgentReply, setLastAgentReply] = useState<string | null>(null);
  const [isListeningMic, setIsListeningMic] = useState(false);

  // Fetch live agent state from backend
  const fetchAgentState = async () => {
    try {
      setIsLoadingAgent(true);
      const res = await fetch('/api/agent/dispatch');
      if (res.ok) {
        const data = await res.json();
        if (data.agentStatus) setAgentStatus(data.agentStatus);
        if (data.pendingApprovals) setPendingApprovals(data.pendingApprovals);
        if (data.recentActivities) setRecentActivities(data.recentActivities);
        if (data.metrics) setAgentMetrics(data.metrics);
      }
    } catch (err) {
      console.warn('Could not fetch agent state:', err);
    } finally {
      setIsLoadingAgent(false);
    }
  };

  useEffect(() => {
    fetchAgentState();
  }, []);

  // Handle Quick Command / Voice prompt
  const handleSendCommand = async (customPrompt?: string) => {
    const textToSend = customPrompt || commandText;
    if (!textToSend.trim()) return;

    try {
      setIsDispatching(true);
      setLastAgentReply(null);

      const res = await fetch('/api/agent/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quick_command',
          text: textToSend,
          projectId: projects[0]?.id || 'proj-101',
          projectName: projects[0]?.name || 'Nyebakken 14 - Totalrenovering',
          authorName: user?.displayName || 'Admin / Byggmester'
        })
      });

      const data = await res.json();
      if (data.reply) {
        setLastAgentReply(data.reply);
        toast.success('Agent utførte oppgaven!', {
          description: data.reply
        });
      } else if (data.error) {
        toast.error('Feil fra agent:', { description: data.error });
      }

      setCommandText('');
      // Refresh state to reflect new activity / approvals
      fetchAgentState();
    } catch (err: any) {
      toast.error('Kunne ikke nå agenten: ' + err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  // 1-Click Approve Change Order
  const handleApproveChangeOrder = async (changeOrderId: string) => {
    try {
      const res = await fetch('/api/agent/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_change_order',
          changeOrderId,
          authorName: user?.displayName || 'Byggmester / Admin'
        })
      });

      if (res.ok) {
        toast.success('Endringsordre godkjent!', {
          description: 'Varsel og godkjenningsdokument (NS 8406) er klargjort for kunden.'
        });
        // Remove from pending
        setPendingApprovals(prev => prev.filter(item => item.id !== changeOrderId));
        setAgentMetrics((prev: any) => ({
          ...prev,
          pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1)
        }));
        fetchAgentState();
      }
    } catch (err: any) {
      toast.error('Feil ved godkjenning: ' + err.message);
    }
  };

  // 1-Click Reject Change Order
  const handleRejectChangeOrder = async (changeOrderId: string) => {
    try {
      const res = await fetch('/api/agent/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_change_order',
          changeOrderId
        })
      });

      if (res.ok) {
        toast.info('Endringsordre avvist / satt på vent');
        setPendingApprovals(prev => prev.filter(item => item.id !== changeOrderId));
        fetchAgentState();
      }
    } catch (err: any) {
      toast.error('Feil: ' + err.message);
    }
  };

  // Voice recording mock / speech recognition
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
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningMic(true);
        toast.info('Lytter... Snakk inn dagbok eller endring nå.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCommandText(transcript);
        setIsListeningMic(false);
        toast.success('Tale oppfattet!');
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-16">
      {/* Modals retained for full compatibility */}
      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); fetchAgentState(); }} />
      <CreateDeviationModal 
        isOpen={isDeviationModalOpen} 
        onClose={() => { setIsDeviationModalOpen(false); fetchAgentState(); }} 
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
      />
      <ChecklistModal 
        isOpen={isChecklistModalOpen} 
        onClose={() => setIsChecklistModalOpen(false)} 
        projectId={checklistProjectId || projects[0]?.id}
      />
      <AIVisionModal 
        isOpen={isAIVisionModalOpen} 
        onClose={() => { setIsAIVisionModalOpen(false); fetchAgentState(); }} 
        projectId={selectedProject?.id || projects[0]?.id}
        projectName={selectedProject?.name || projects[0]?.name}
      />
      <OfferModal isOpen={isOfferModalOpen} onClose={() => setIsOfferModalOpen(false)} />
      <ContractModal isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} />
      <DocumentationArchive isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} />
      <TimeRegistrationModal 
        isOpen={isTimeModalOpen} 
        onClose={() => setIsTimeModalOpen(false)} 
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
      />
      <BuildingApplicationModal 
        isOpen={isBuildingAppModalOpen} 
        onClose={() => setIsBuildingAppModalOpen(false)} 
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
      />
      <IntegrationModal isOpen={isIntegrationModalOpen} onClose={() => setIsIntegrationModalOpen(false)} />
      <HandoverModal 
        isOpen={isHandoverModalOpen} 
        onClose={() => setIsHandoverModalOpen(false)} 
        projects={projects}
        initialProjectId={handoverProjectId}
      />
      <InventoryModal isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} />
      <VehicleModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} projects={projects} />
      <HMSModal isOpen={isHMSModalOpen} onClose={() => setIsHMSModalOpen(false)} projects={projects} />
      <ActivityLogModal isOpen={isActivityLogModalOpen} onClose={() => setIsActivityLogModalOpen(false)} projectId={projects[0]?.id} />
      <SmartSearch isOpen={isSmartSearchOpen} onClose={() => setIsSmartSearchOpen(false)} onNavigate={(v) => setActiveTab(v as any)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Selected Project Full Details View */}
        <AnimatePresence mode="wait">
          {selectedProject ? (
            <ProjectDetails 
              key="project_details"
              project={selectedProject} 
              onBack={() => setSelectedProject(null)} 
              onShare={() => onOpenPortal?.(selectedProject)}
              onStartChecklist={(projectId) => {
                setChecklistProjectId(projectId);
                setIsChecklistModalOpen(true);
              }}
              onHandover={(projectId) => {
                setHandoverProjectId(projectId);
                setIsHandoverModalOpen(true);
              }}
            />
          ) : (
            <motion.div
              key="dashboard_main"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* 🌟 NATIVE APP HEADER & WELCOME CARD */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-gradient-to-r from-navy-950 via-slate-900 to-navy-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-electric-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-electric-600 to-electric-400 flex items-center justify-center text-white shadow-purple-cta font-black text-xl shrink-0">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "K"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                        Hei, {user?.displayName ? user.displayName.split(" ")[0] : "Kenneth"}! 👋
                      </h2>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Aktiv bedrift
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                      {user?.company || "AIChat Norge AS / Vikingnet"} • {projects.length || 3} aktive prosjekter i dag
                    </p>
                  </div>
                </div>
                
                {/* App View Quick Switcher Pill */}
                <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md self-start sm:self-auto relative z-10">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "mobile" } }))}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all bg-electric-500 text-white shadow-purple-cta hover:bg-electric-400 active:scale-95 cursor-pointer"
                    title="Åpne ren feltapp tilpasset 1-hånds mobilbruk"
                  >
                    <Smartphone size={15} />
                    <span>📱 Åpne Feltapp</span>
                  </button>
                  <button
                    onClick={() => setIsSmartSearchOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                  >
                    <Search size={14} />
                    <span>Søk</span>
                  </button>
                </div>
              </div>

              {/* 🚀 APP QUICK LAUNCHER GRID (iOS / Native App Fliser) */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-electric-500" />
                    Hurtighandlinger & App-moduler
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">1-klikk tilgang i felt og på kontor</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-3.5">
                  {/* 1. Tale til SJA */}
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "mobile" } }));
                      setTimeout(() => window.dispatchEvent(new CustomEvent("trigger_voice_sja")), 150);
                    }}
                    className="flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-electric-300 active:scale-95 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                      <Mic size={22} />
                    </div>
                    <span className="text-xs font-bold text-navy-900 group-hover:text-electric-600 transition-colors">Tale til SJA</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Snakk inn risiko</span>
                  </button>

                  {/* 2. AI Bildekontroll */}
                  <button
                    type="button"
                    onClick={() => setIsAIVisionModalOpen(true)}
                    className="flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 active:scale-95 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                      <Camera size={22} />
                    </div>
                    <span className="text-xs font-bold text-navy-900 group-hover:text-blue-600 transition-colors">Bildekontroll</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">TEK17 AI-sjekk</span>
                  </button>

                  {/* 3. Registrer Timer */}
                  <button
                    type="button"
                    onClick={() => setIsTimeModalOpen(true)}
                    className="flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300 active:scale-95 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                      <Clock size={22} />
                    </div>
                    <span className="text-xs font-bold text-navy-900 group-hover:text-emerald-600 transition-colors">Før Timer</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Dagens arbeid</span>
                  </button>

                  {/* 4. Sjekklister */}
                  <button
                    type="button"
                    onClick={() => setIsChecklistModalOpen(true)}
                    className="flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-amber-300 active:scale-95 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                      <ClipboardCheck size={22} />
                    </div>
                    <span className="text-xs font-bold text-navy-900 group-hover:text-amber-600 transition-colors">Sjekkliste</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">HMS & Fag</span>
                  </button>

                  {/* 5. Telefonliste / Kolleger */}
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "mobile" } }));
                      setTimeout(() => window.dispatchEvent(new CustomEvent("open_mobile_contacts")), 150);
                    }}
                    className="flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-cyan-300 active:scale-95 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                      <Users size={22} />
                    </div>
                    <span className="text-xs font-bold text-navy-900 group-hover:text-cyan-600 transition-colors">Telefonliste</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Ring & SMS</span>
                  </button>

                  {/* 6. Byggedagbok */}
                  <button
                    type="button"
                    onClick={() => setIsActivityLogModalOpen(true)}
                    className="flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-violet-300 active:scale-95 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-500 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                      <FileText size={22} />
                    </div>
                    <span className="text-xs font-bold text-navy-900 group-hover:text-violet-600 transition-colors">Byggedagbok</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Dagsrapport</span>
                  </button>

                  {/* 7. Endringsordre (NS 8406) */}
                  <button
                    type="button"
                    onClick={() => handleTabSelect("endringsordrer")}
                    className="flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-rose-300 active:scale-95 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                      <FileSignature size={22} />
                    </div>
                    <span className="text-xs font-bold text-navy-900 group-hover:text-rose-600 transition-colors">Endring (8406)</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Tilleggsarbeid</span>
                  </button>

                  {/* 8. Nytt Prosjekt */}
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-400 active:scale-95 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                      <Plus size={22} />
                    </div>
                    <span className="text-xs font-bold text-navy-900 group-hover:text-slate-800 transition-colors">Nytt Prosjekt</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Opprett på 1 min</span>
                  </button>
                </div>
              </div>
              {/* 1. AGENT STATUS & COCKPIT HEADER */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-electric-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-electric-50 text-electric-600 border border-electric-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Autonom Agent 100% Operativ
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        Lytter på: <strong className="text-navy-900">{agentStatus.email || 'hei@vikingmester.no'}</strong>
                      </span>
                      <span className="hidden sm:inline-block text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        TEK17 & NS 8406 Aktiv
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 tracking-tight">
                      Mester-Cockpit & Lederoversikt
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 mt-1">
                      Agenten fører byggedagbok, kontrollerer TEK17 og fanger opp uvarslet ekstraarbeid. Du beholder 100% kontroll.
                    </p>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <button 
                      onClick={() => setIsSmartSearchOpen(true)}
                      className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:border-electric-400 hover:text-navy-900 transition-all shadow-sm"
                    >
                      <Search size={15} />
                      <span>Søk i systemet...</span>
                      <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-400">⌘K</kbd>
                    </button>

                    <button 
                      onClick={() => setIsAIVisionModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-navy-900 border border-slate-200 rounded-2xl text-xs font-black transition-all"
                    >
                      <Camera size={16} className="text-electric-600" />
                      <span>TEK17 Visjon</span>
                    </button>

                    <button 
                      onClick={() => setIsCreateModalOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-2xl text-xs font-black hover:opacity-95 transition-all shadow-purple-cta"
                    >
                      <Plus size={16} />
                      <span>Nytt Prosjekt</span>
                    </button>
                  </div>
                </div>

                {/* Quick Command Prompt (Snakk / Skriv til agenten) */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendCommand(); }}
                    className="flex flex-col sm:flex-row items-stretch gap-3"
                  >
                    <div className="relative flex-1">
                      <input 
                        type="text"
                        value={commandText}
                        onChange={(e) => setCommandText(e.target.value)}
                        placeholder="Gi en instruks til agenten (f.eks: 'Registrer 4 timer ekstraarbeid på bad', 'Opprett SJA for stillas')..."
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all"
                      />
                      <button 
                        type="button"
                        onClick={toggleMic}
                        className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all",
                          isListeningMic ? "bg-rose-500 text-white animate-pulse" : "text-slate-400 hover:text-electric-600"
                        )}
                        title="Snakk inn instruks"
                      >
                        {isListeningMic ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                    </div>

                    <button 
                      type="submit"
                      disabled={isDispatching || !commandText.trim()}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-navy-900 hover:bg-navy-800 text-white rounded-2xl text-xs font-black disabled:opacity-50 transition-all shrink-0 shadow-sm"
                    >
                      {isDispatching ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Analyserer...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Send Instruks</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">Hurtig:</span>
                    {[
                      'Lag SJA for tak- og stillasarbeid',
                      'Registrer endringsordre: Ekstra downlights i stue kr 14500',
                      'Sjekk om bad 2. etg kan lukkes (pre-close check)',
                      'Byggedagbok: Lekting og vindsperre ferdig 6 timer'
                    ].map((chip, i) => (
                      <button 
                        key={i}
                        type="button"
                        onClick={() => handleSendCommand(chip)}
                        className="px-3 py-1.5 bg-slate-100/90 hover:bg-electric-50 hover:text-electric-700 hover:border-electric-300 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-700 transition-all text-left shadow-xs"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Agent Response Box */}
                  <AnimatePresence>
                    {lastAgentReply && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-4 bg-electric-50/70 border border-electric-200 rounded-2xl flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-xl bg-electric-500 text-white flex items-center justify-center shrink-0">
                          <Brain size={16} />
                        </div>
                        <div className="flex-1 text-xs text-navy-900 leading-relaxed font-medium">
                          <strong className="font-black text-electric-700 block mb-0.5">Svar fra VikingMester:</strong>
                          {lastAgentReply}
                        </div>
                        <button 
                          onClick={() => setLastAgentReply(null)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 2. FOUR KEY METRICS CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                {/* 1. Aktive Prosjekter */}
                <div 
                  onClick={() => setActiveTab('prosjekter')}
                  className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <HardHat size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors">
                      Se alle &rarr;
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-navy-900 tracking-tight">
                    {projects.length || 3}
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">
                    Aktive Prosjekter i drift
                  </div>
                </div>

                {/* 2. Autonome Handlinger i dag */}
                <div 
                  onClick={() => setActiveTab('cockpit')}
                  className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-electric-50 text-electric-600 flex items-center justify-center">
                      <Zap size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      I dag
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-navy-900 tracking-tight">
                    {agentMetrics.todayActionsCount || 14}
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">
                    Autonome agent-handlinger
                  </div>
                </div>

                {/* 3. Trenger din godkjenning (Human-in-the-loop) */}
                <div 
                  onClick={() => setActiveTab('cockpit')}
                  className={cn(
                    "p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all cursor-pointer group",
                    (pendingApprovals.length > 0) 
                      ? "bg-amber-50/50 border-amber-200" 
                      : "bg-white border-slate-200/90"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center",
                      pendingApprovals.length > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                    )}>
                      <AlertTriangle size={20} />
                    </div>
                    {pendingApprovals.length > 0 && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                        Handling kreves
                      </span>
                    )}
                  </div>
                  <div className={cn(
                    "text-3xl font-extrabold tracking-tight",
                    pendingApprovals.length > 0 ? "text-amber-900" : "text-navy-900"
                  )}>
                    {pendingApprovals.length || 0}
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">
                    Venter på din godkjenning
                  </div>
                </div>

                {/* 4. Tilleggsinntekt Sikret (NS 8406) */}
                <div 
                  onClick={() => setActiveTab('endringsordrer')}
                  className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TrendingUp size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 transition-colors">
                      NS 8406 &rarr;
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
                    kr {((agentMetrics.securedRevenue || 42500) / 1000).toFixed(0)}k
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">
                    Sikret i tilleggsarbeider
                  </div>
                </div>
              </div>

              {/* 3. TABS NAVIGATION */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 border-b border-slate-200 mb-8 pb-3">
                {[
                  { id: 'cockpit', label: 'Agent-Cockpit & Godkjenning', icon: <Zap size={16} />, badge: pendingApprovals.length > 0 ? pendingApprovals.length : undefined },
                  { id: 'prosjekter', label: 'Prosjekter & Vær', icon: <Building2 size={16} /> },
                  { id: 'endringsordrer', label: 'Endringsordrer (NS 8406)', icon: <FileSignature size={16} /> },
                  { id: 'kvalitet', label: 'Kvalitet & Lukkesperre (TEK17)', icon: <ShieldCheck size={16} /> },
                  { id: 'agent', label: 'Agent-Kanaler & Regler', icon: <Brain size={16} /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSelect(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap",
                      activeTab === tab.id 
                        ? "bg-navy-900 text-white shadow-sm" 
                        : "bg-white text-slate-600 hover:text-navy-900 border border-slate-200/80 hover:border-slate-300"
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* 4. TAB CONTENT */}

              {/* TAB 1: AGENT-COCKPIT & GODKJENNING (Hovedvisning) */}
              {activeTab === 'cockpit' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Human-in-the-loop Pending Approvals (7 cols) */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-extrabold text-navy-900 tracking-tight flex items-center gap-2">
                          <span>Krever Din Godkjenning</span>
                          {pendingApprovals.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                              {pendingApprovals.length} venter
                            </span>
                          )}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Talebeskjeder og ekstraarbeider fra byggeplassen ferdig tolket og kalkulert av agenten.
                        </p>
                      </div>

                      <button 
                        onClick={fetchAgentState}
                        className="p-2 text-slate-400 hover:text-navy-900 transition-colors"
                        title="Oppdater"
                      >
                        <RefreshCw size={15} />
                      </button>
                    </div>

                    {pendingApprovals.length === 0 ? (
                      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                          <CheckCircle2 size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-navy-900">Ingen ventende godkjenninger</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          Alle endringsordrer, byggedagbøker og varsler er godkjent og synkronisert med kunden og VikingCRM.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingApprovals.map((item) => (
                          <div 
                            key={item.id}
                            className="bg-white rounded-3xl border-2 border-amber-200/80 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                          >
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                    Endringsordre (NS 8406)
                                  </span>
                                  <span className="text-xs font-bold text-slate-500">
                                    {item.projectName || 'Nyebakken 14'}
                                  </span>
                                </div>
                                <h3 className="text-base font-extrabold text-navy-900">
                                  {item.title}
                                </h3>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-lg font-black text-navy-900">
                                  kr {(item.amountExVat || 14500).toLocaleString('no-NO')}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400">eks mva ({item.impactDays || 0} dgr)</div>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                              «{item.description}»
                            </p>

                            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-400">
                                Registrert fra tale av: <strong className="text-slate-700">{item.authorName || 'Håndverker'}</strong>
                              </span>

                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleRejectChangeOrder(item.id)}
                                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                >
                                  Avvis / Utsett
                                </button>
                                <button 
                                  onClick={() => handleApproveChangeOrder(item.id)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-xl text-xs font-black hover:opacity-95 transition-all shadow-purple-cta"
                                >
                                  <Check size={14} />
                                  <span>Godkjenn & Send Kunde</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Craft Tools Row */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
                        Hurtigverktøy for Byggeleder
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button 
                          onClick={() => setIsChecklistModalOpen(true)}
                          className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50 hover:bg-electric-50 hover:border-electric-200 border border-slate-200/70 transition-all group"
                        >
                          <ClipboardCheck size={20} className="text-electric-600 mb-1.5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-navy-900">Sjekkliste</span>
                        </button>

                        <button 
                          onClick={() => setIsDeviationModalOpen(true)}
                          className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200/70 transition-all group"
                        >
                          <AlertTriangle size={20} className="text-orange-600 mb-1.5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-navy-900">Registrer Avvik</span>
                        </button>

                        <button 
                          onClick={() => setIsTimeModalOpen(true)}
                          className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/70 transition-all group"
                        >
                          <Timer size={20} className="text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-navy-900">Timeføring</span>
                        </button>

                        <button 
                          onClick={() => setIsArchiveModalOpen(true)}
                          className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200/70 transition-all group"
                        >
                          <Library size={20} className="text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-navy-900">Dokumentarkiv</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Autonomous Activity Stream (5 cols) */}
                  <div className="lg:col-span-5 space-y-6">
                    <div>
                      <h2 className="text-lg font-extrabold text-navy-900 tracking-tight flex items-center gap-2">
                        <span>Sanntids Agent-Logg</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Løpende handlinger utført autonomt av VikingMester.
                      </p>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                      {recentActivities.map((act, i) => (
                        <div 
                          key={act.id || i}
                          className="flex items-start gap-3.5 pb-4 border-b border-slate-100 last:border-b-0 last:pb-0"
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                            act.type === 'change_order' ? "bg-amber-100 text-amber-700" :
                            act.type === 'tek17_vision' ? "bg-emerald-100 text-emerald-700" :
                            act.type === 'pre_close_check' ? "bg-rose-100 text-rose-700" :
                            "bg-electric-50 text-electric-600"
                          )}>
                            {act.type === 'change_order' ? <FileSignature size={18} /> :
                             act.type === 'tek17_vision' ? <Camera size={18} /> :
                             act.type === 'pre_close_check' ? <Lock size={18} /> :
                             <Zap size={18} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-xs font-extrabold text-navy-900 truncate">
                                {act.title}
                              </h4>
                              {act.badge && (
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0",
                                  act.status === 'blocked' ? "bg-rose-100 text-rose-800" :
                                  act.status === 'pending_approval' ? "bg-amber-100 text-amber-800" :
                                  "bg-slate-100 text-slate-700"
                                )}>
                                  {act.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                              {act.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-bold">
                              <span>Fag: {act.tradeName || act.trade || 'Byggmester'}</span>
                              <span>•</span>
                              <span>{act.timestamp ? new Date(act.timestamp).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }) : 'Nylig'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pre-close wall security alert */}
                    <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                          <Lock size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-rose-950">
                            1 Tverrfaglig Lukkesperre Aktiv
                          </h4>
                          <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                            <strong>Storgata 8 (Vaskerom):</strong> Rørleggerens trykktestrapport mangler. Veggen er rødmerket mot kledning for å hindre reklamasjoner og erstatningsansvar.
                          </p>
                          <button 
                            onClick={() => setActiveTab('kvalitet')}
                            className="mt-3 text-xs font-bold text-rose-700 hover:text-rose-950 flex items-center gap-1"
                          >
                            <span>Inspiser lukkesperrematrise</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PROSJEKTER */}
              {activeTab === 'prosjekter' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-extrabold text-navy-900 tracking-tight">
                        Aktive Byggeprosjekter
                      </h2>
                      <p className="text-xs text-slate-500">
                        Oversikt over fremdrift, værforhold fra Yr.no og kvalitetssikring.
                      </p>
                    </div>

                    <button 
                      onClick={() => setIsCreateModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-2xl text-xs font-black shadow-purple-cta"
                    >
                      <Plus size={16} />
                      <span>Opprett Prosjekt</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((proj) => (
                      <div 
                        key={proj.id}
                        className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-electric-50 text-electric-600 border border-electric-200">
                              {proj.status === 'active' ? 'I drift' : 'Planlagt'}
                            </span>
                            <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                              <CloudSun size={14} className="text-amber-500" />
                              <span>14°C Oslo</span>
                            </div>
                          </div>

                          <h3 className="text-base font-extrabold text-navy-900 mb-1">
                            {proj.name}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mb-4">
                            <MapPin size={13} />
                            <span>{proj.location || 'Norge'}</span>
                          </p>

                          {/* Progress bar */}
                          <div className="space-y-1.5 mb-5">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-500">Fremdrift</span>
                              <span className="text-navy-900">{proj.progress || 65}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-electric-500 to-electric-400 rounded-full"
                                style={{ width: `${proj.progress || 65}%` }}
                              />
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 mb-4">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Kunde</div>
                            <div className="font-bold text-navy-900">{proj.clientName || 'Privat byggherre'}</div>
                            <div className="text-[11px] text-slate-500">{proj.clientEmail || 'kunde@vikingmester.no'}</div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button 
                            onClick={() => onOpenPortal?.(proj)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <ExternalLink size={13} />
                            <span>Kundeportal</span>
                          </button>

                          <button 
                            onClick={() => setSelectedProject(proj)}
                            className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1"
                          >
                            <span>Åpne Prosjekt</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ENDRINGSORDER (NS 8406) */}
              {activeTab === 'endringsordrer' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-navy-900 tracking-tight">
                        Endringsordrer & Varslingsplikt (NS 8406 / Håndverkertjenesteloven)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Agenten forvandler muntlige beskjeder fra byggeplass til juridisk bindende tilleggskrav.
                      </p>
                    </div>

                    <button 
                      onClick={() => handleSendCommand('Registrer endringsordre: ')}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-2xl text-xs font-black shadow-purple-cta"
                    >
                      <Plus size={16} />
                      <span>Ny Endringsordre</span>
                    </button>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-black text-navy-900">
                          kr {(agentMetrics.securedRevenue || 84500).toLocaleString('no-NO')}
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          Totalt sikret i tilleggsarbeid
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        0 tapte krav på grunn av sen varsling
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {[
                        { id: '1', number: 1, title: '6 ekstra downlights og trekkerør i stue', project: 'Nyebakken 14', amount: 14500, days: 2, status: 'Venter på bas', legal: 'NS 8406 pkt. 19.2' },
                        { id: '2', number: 2, title: 'Uforutsett råte i bjelkelag under sluk', project: 'Storgata 8', amount: 28000, days: 4, status: 'Venter på bas', legal: 'NS 8406 pkt. 19.3' },
                        { id: '3', number: 3, title: 'Oppgradering til royalimpregnert kledning', project: 'Fjordveien 22', amount: 42000, days: 0, status: 'Godkjent av kunde', legal: 'NS 8406 pkt. 19.2' }
                      ].map((co) => (
                        <div key={co.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-extrabold text-navy-900">#{co.number}</span>
                              <span className="text-xs font-bold text-slate-400">•</span>
                              <span className="text-xs font-bold text-slate-600">{co.project}</span>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                co.status.includes('Venter') ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                              )}>
                                {co.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-navy-900">{co.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">{co.legal}</p>
                          </div>

                          <div className="flex items-center gap-4 sm:text-right shrink-0">
                            <div>
                              <div className="text-sm font-black text-navy-900">kr {co.amount.toLocaleString('no-NO')}</div>
                              <div className="text-[10px] text-slate-400 font-bold">eks mva (+{co.days} dgr)</div>
                            </div>

                            <button 
                              onClick={() => toast.success('Godkjenningslenke kopiert til utklippstavlen!')}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-navy-900 rounded-xl text-xs font-bold transition-all"
                            >
                              Kopier lenke
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: KVALITET & LUKKESPERRE (TEK17) */}
              {activeTab === 'kvalitet' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-navy-900 tracking-tight">
                      Tverrfaglig Lukkesperre & TEK17 Kontroll
                    </h2>
                    <p className="text-xs text-slate-500">
                      Sperrer rom og vegger mot lukking/flislegging før skjultanlegg og trykktester er verifisert.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Zone Matrix */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
                      <h3 className="text-sm font-extrabold text-navy-900 mb-4 flex items-center justify-between">
                        <span>Status per Rom & Sone</span>
                        <span className="text-xs font-bold text-slate-400">TEK17 § 13-15</span>
                      </h3>

                      <div className="space-y-3">
                        {[
                          { room: 'Bad 2. etg (Nyebakken)', status: 'GREEN', canClose: true, detail: 'Rør-i-rør trykktest og dampsperre godkjent.' },
                          { room: 'Vaskerom 1. etg (Storgata 8)', status: 'RED', canClose: false, detail: 'Rørlegger mangler trykktestrapport for fordelerskap.' },
                          { room: 'Kjøkken (Fjordveien 22)', status: 'GREEN', canClose: true, detail: 'El-skjultanlegg og rørkurs verifisert.' }
                        ].map((z, i) => (
                          <div 
                            key={i}
                            className={cn(
                              "p-4 rounded-2xl border flex items-start justify-between gap-3",
                              z.status === 'GREEN' ? "bg-emerald-50/60 border-emerald-200" : "bg-rose-50/70 border-rose-200"
                            )}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                {z.status === 'GREEN' ? (
                                  <Unlock size={16} className="text-emerald-600" />
                                ) : (
                                  <Lock size={16} className="text-rose-600" />
                                )}
                                <h4 className="text-xs font-bold text-navy-900">{z.room}</h4>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-1">{z.detail}</p>
                            </div>

                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0",
                              z.status === 'GREEN' ? "bg-emerald-200 text-emerald-900" : "bg-rose-200 text-rose-900"
                            )}>
                              {z.status === 'GREEN' ? 'GRØNT LYS' : 'RØD SPERRE'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SJA Generator Card */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-navy-900 mb-2">
                          Sikker Jobb Analyse (SJA) på 1-2-3
                        </h3>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                          Byggherreforskriften krever dokumentert risikovurdering ved risikofylt arbeid. Agenten genererer ferdig SJA for 7 håndverkerfag.
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          {['Tømrer (Høyde/Stillas)', 'Rørlegger (Trykk/Varmt)', 'Elektriker (Spenningssatt)', 'Graver (Grøft/Kabler)'].map((trade, i) => (
                            <button
                              key={i}
                              onClick={() => handleSendCommand(`Opprett SJA for ${trade}`)}
                              className="p-2.5 bg-slate-50 hover:bg-electric-50 hover:text-electric-700 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 text-left transition-all"
                            >
                              + SJA for {trade}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-bold">AML § 4-1 & Byggherreforskriften</span>
                        <button 
                          onClick={() => setIsHMSModalOpen(true)}
                          className="px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-bold hover:bg-navy-800 transition-all"
                        >
                          Åpne HMS-Håndbok
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: AGENT-KANALER & REGLER */}
              {activeTab === 'agent' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Inboxes & Channels */}
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-extrabold text-navy-900">
                      Tilknyttede Kommunikasjonskanaler
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Håndverkerne kan sende inn byggedagbok, bilder og spørsmål rett fra lomma uten å installere apper.
                    </p>

                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-navy-900">Offisiell e-postlytter</div>
                          <div className="text-xs text-electric-600 font-mono font-bold mt-0.5">hei@vikingmester.no</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          100% Aktiv
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-navy-900">Tale & Diktat i felt</div>
                          <div className="text-xs text-slate-500 mt-0.5">Støtter alle språk (norsk, polsk, litauisk, ukrainsk, rumensk, engelsk, spansk, tysk + over 50 til) – oversetter og strukturerer automatisk til TEK17-fagterminologi</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          Operativ
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-navy-900">Yr.no Værsynkronisering</div>
                          <div className="text-xs text-slate-500 mt-0.5">Henter automatisk temperatur, nedbør og vind</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          Tilkoblet
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active Regulatory Engines */}
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-extrabold text-navy-900">
                      Aktive Regelmotorer & Norske Standarder
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Deterministisk validering som sikrer at alle rapporter holder juridisk mål ved tilsyn og overtakelse.
                    </p>

                    <ul className="space-y-2.5">
                      {[
                        'TEK17 § 13-15: Lekkasjesikre vanninstallasjoner & sluk',
                        'Byggherreforskriften § 15: Elektronisk byggedagbok',
                        'Byggherreforskriften § 18: Sikker Jobb Analyse (SJA)',
                        'NS 8406: Forenklet norsk byggekontrakt & endringsvarsel',
                        'BVN 31.205: Membran og slukmansjett i våtrom',
                        'NEK 400:2022: Skjultanlegg før lukking av vegger'
                      ].map((rule, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
