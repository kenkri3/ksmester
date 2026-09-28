'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  CloudSun,
  Trash2,
  Radio,
  MessageSquare,
  Mail,
  Hash
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Project, Deviation, UserProfile, Trade } from '../types';
import { db, collection, onSnapshot, query, orderBy, where, getDocs, deleteDoc, doc, updateDoc, OperationType, handleFirestoreError } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../hooks/useAuth';
import ActivityLogModal from './ActivityLogModal';
import DailyLogModal from './DailyLogModal';
import CreateProjectModal from './CreateProjectModal';
import CreateDeviationModal from './CreateDeviationModal';
import DeviationDetailModal from './DeviationDetailModal';
import ChecklistModal from './ChecklistModal';
import AIVisionModal from './AIVisionModal';
import OfferModal from './OfferModal';
import ContractModal from './ContractModal';
import DocumentationArchive from './DocumentationArchive';
import TimeRegistrationModal from './TimeRegistrationModal';
import BuildingApplicationModal from './BuildingApplicationModal';
import IntegrationModal from './IntegrationModal';
import OmnichannelModal, { getStoredOmnichannelSettings, OmnichannelSettings } from './OmnichannelModal';
import HandoverModal from './HandoverModal';
import InventoryModal from './InventoryModal';
import VehicleModal from './VehicleModal';
import HMSModal from './HMSModal';
import ProjectDetails from './ProjectDetails';
import SmartSearch from './SmartSearch';
import ChangeOrderModal from './ChangeOrderModal';
import { changeOrderService } from '../services/changeOrderService';
import PreCloseInspectorModal, { LukkesperreZone, DEFAULT_LUKKESPERRE_ZONES } from './PreCloseInspectorModal';
import SJAPreviewModal, { SJADocument } from './SJAPreviewModal';
import VoiceSJAModal from './VoiceSJAModal';
import ProjectContactsModal from './ProjectContactsModal';
import InviteModal from './InviteModal';
import MesterAIChat from './MesterAIChat';
import MesterWorkstation from './MesterWorkstation';
import AllModulesDrawer from './AllModulesDrawer';
import QuickStartGuide from './QuickStartGuide';
import ApprenticeModal from './ApprenticeModal';

interface DashboardProps {
  initialTab?: any;
  initialWorkstationTab?: string;
  isDemo?: boolean;
  onTabChange?: (tab: string) => void;
  onOpenPortal?: (project: Project) => void;
  onOpenSuperAdmin?: () => void;
}

export default function Dashboard({ 
  initialTab = 'cockpit', 
  initialWorkstationTab = 'all_projects',
  isDemo = false,
  onTabChange,
  onOpenPortal,
  onOpenSuperAdmin
}: DashboardProps) {
  const { t } = useTranslation();
  const { user, isSuperAdmin, impersonatedCompanyId } = useAuth();
  const effectiveCompany = impersonatedCompanyId || user?.company;
  const { projects, deviations, stats, loading: dataLoading, dataUnavailable } = useDashboardData();

  // Primary active tab
  const [activeTab, setActiveTab] = useState<'cockpit' | 'prosjekter' | 'endringsordrer' | 'kvalitet' | 'agent' | 'chat'>(
    'cockpit'
  );

  const handleTabSelect = (tab: 'cockpit' | 'prosjekter' | 'endringsordrer' | 'kvalitet' | 'agent' | 'chat') => {
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
  const [isViewingProjectDetails, setIsViewingProjectDetails] = useState(false);
  const hasAutoSelectedRef = useRef(false);

  // 🔄 Hold selectedProject synkronisert med tilgjengelige prosjekter for aktiv kunde (ingen lekkasje mellom bedrifter)
  useEffect(() => {
    if (projects && projects.length > 0) {
      if (!hasAutoSelectedRef.current) {
        hasAutoSelectedRef.current = true;
        // Bruker ønsker å starte på "Alle byggeplasser" som standard, så selectedProject forblir null ved oppstart
      } else if (selectedProject && !projects.some(p => p.id === selectedProject.id)) {
        // Valgt prosjekt finnes ikke lenger (f.eks. slettet eller byttet bedrift)
        setSelectedProject(null);
      }
    } else if (projects && projects.length === 0) {
      setSelectedProject(null);
    }
  }, [projects, selectedProject]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeviationModalOpen, setIsDeviationModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [checklistProjectId, setChecklistProjectId] = useState<string | undefined>();
  const [checklistTrade, setChecklistTrade] = useState<Trade | undefined>();
  const [selectedDeviation, setSelectedDeviation] = useState<Deviation | null>(null);
  const [isDeviationDetailOpen, setIsDeviationDetailOpen] = useState(false);
  const [isAIVisionModalOpen, setIsAIVisionModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isApprenticeModalOpen, setIsApprenticeModalOpen] = useState(false);
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
  const [isDailyLogModalOpen, setIsDailyLogModalOpen] = useState(false);
  const [isChangeOrderModalOpen, setIsChangeOrderModalOpen] = useState(false);
  const [isAllModulesOpen, setIsAllModulesOpen] = useState(false);

  // Live Endringsordrer state with deletion capability & tenant scoping
  const [dashboardChangeOrders, setDashboardChangeOrders] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'change_orders'), (snapshot) => {
      if (snapshot.docs && snapshot.docs.length > 0) {
        let docs = snapshot.docs;
        // 🔒 GDPR & Tenant Isolation: Kun vis ordre som tilhører denne bedriften dersom ikke uinnskrenket SuperAdmin
        if ((!isSuperAdmin || impersonatedCompanyId) && effectiveCompany) {
          docs = docs.filter(d => {
            const data = d.data();
            return (
              data.company === effectiveCompany ||
              data.companyId === effectiveCompany ||
              data.companyName === effectiveCompany ||
              data.tenantId === effectiveCompany ||
              !data.company // fallback for demo if newly created
            );
          });
        }
        const liveOrders = docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            number: data.changeNumber || 1,
            title: data.title || 'Endringsordre',
            project: data.projectName || data.projectCode || 'Prosjekt',
            projectId: data.projectId,
            amount: data.amountExVat || data.totalAmount || 0,
            amountExVat: data.amountExVat || data.totalAmount || 0,
            totalAmount: data.totalAmount || Math.round((data.amountExVat || 0) * 1.25),
            vatAmount: data.vatAmount || Math.round((data.amountExVat || 0) * 0.25),
            days: data.impactDays || 0,
            impactDays: data.impactDays || 0,
            status: (() => {
              const s = (data.status || '').toLowerCase();
              if (s === 'approved' || s === 'godkjent av kunde' || s === 'approved_by_admin' || s === 'godkjent' || s === 'accepted') {
                return 'Godkjent av kunde';
              }
              if (s === 'rejected' || s === 'avvist' || s === 'avslått') {
                return 'Avvist';
              }
              return 'Sendt til kunde';
            })(),
            legal: data.legalHjemmel || 'NS 8406 pkt. 19.2',
            legalHjemmel: data.legalHjemmel || 'NS 8406 pkt. 19.2',
            description: data.description || '',
            cause: data.cause || 'kundetillegg',
            clientName: data.clientName || '',
            clientEmail: data.clientEmail || '',
            createdAt: data.createdAt || new Date().toISOString(),
            shareUrl: data.shareUrl,
            raw: data
          };
        });
        setDashboardChangeOrders(liveOrders);
      } else {
        setDashboardChangeOrders([]);
      }
    });
    return () => unsub();
  }, [isSuperAdmin, impersonatedCompanyId, effectiveCompany]);

  const handleDeleteDashboardOrder = async (orderId: string, orderTitle: string) => {
    if (!window.confirm(`Er du sikker på at du vil slette endringsordren "${orderTitle}"?`)) {
      return;
    }
    try {
      await changeOrderService.deleteChangeOrder(orderId);
      setDashboardChangeOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success(`Endringsordre "${orderTitle}" er slettet.`);
    } catch (e) {
      console.error('Error deleting change order:', e);
      toast.error('Kunne ikke slette endringsordre.');
    }
  };

  // Live Offers (Pristilbud) state with real-time sync, tenant isolation, and deletion
  const [dashboardOffers, setDashboardOffers] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'offers'), (snapshot) => {
      if (snapshot.docs && snapshot.docs.length > 0) {
        let docs = snapshot.docs;
        if ((!isSuperAdmin || impersonatedCompanyId) && effectiveCompany) {
          docs = docs.filter(d => {
            const data = d.data();
            return (
              data.company === effectiveCompany ||
              data.companyId === effectiveCompany ||
              data.companyName === effectiveCompany ||
              !data.company
            );
          });
        }
        const live = docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setDashboardOffers(live);
      } else {
        setDashboardOffers([]);
      }
    });
    return () => unsub();
  }, [isSuperAdmin, impersonatedCompanyId, effectiveCompany]);

  // Live Tasks listener with tenant isolation
  const [dashboardTasks, setDashboardTasks] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      if (snapshot.docs) {
        let docs = snapshot.docs;
        if ((!isSuperAdmin || impersonatedCompanyId) && effectiveCompany) {
          docs = docs.filter(d => {
            const data = d.data();
            return (
              data.company === effectiveCompany ||
              data.companyId === effectiveCompany ||
              !data.company
            );
          });
        }
        const live = docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setDashboardTasks(live);
      }
    }, (err) => {
      console.warn('Firestore tasks listener notice:', err);
    });
    return () => unsub();
  }, [isSuperAdmin, impersonatedCompanyId, effectiveCompany]);

  const handleDeleteDashboardOffer = async (offerId: string, offerTitle: string) => {
    if (!window.confirm(`Er du sikker på at du vil slette tilbudet "${offerTitle}"?`)) {
      return;
    }
    try {
      await deleteDoc({ collectionName: 'offers', id: offerId });
      setDashboardOffers(prev => prev.filter(o => o.id !== offerId));
      toast.success(`Tilbud "${offerTitle}" er slettet.`);
    } catch (e) {
      console.warn('Error deleting offer from DB, updating local state:', e);
      setDashboardOffers(prev => prev.filter(o => o.id !== offerId));
      toast.success(`Tilbud "${offerTitle}" er fjernet.`);
    }
  };

  // Omnichannel (Discord, Slack, MS Teams, E-post) settings state
  const [isOmnichannelModalOpen, setIsOmnichannelModalOpen] = useState(false);
  const [omnichannelSettings, setOmnichannelSettings] = useState<OmnichannelSettings>(getStoredOmnichannelSettings);

  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e.detail) setOmnichannelSettings(e.detail);
    };
    const handleOpenOmniModal = () => setIsOmnichannelModalOpen(true);
    window.addEventListener('omnichannel_settings_updated', handleSettingsUpdate);
    window.addEventListener('open_omnichannel_modal', handleOpenOmniModal);
    return () => {
      window.removeEventListener('omnichannel_settings_updated', handleSettingsUpdate);
      window.removeEventListener('open_omnichannel_modal', handleOpenOmniModal);
    };
  }, []);

  // Lukkesperre & Pre-close state
  const [lukkesperreZones, setLukkesperreZones] = useState<LukkesperreZone[]>(DEFAULT_LUKKESPERRE_ZONES);
  const [selectedLukkesperreZone, setSelectedLukkesperreZone] = useState<LukkesperreZone | null>(DEFAULT_LUKKESPERRE_ZONES[0]);
  const [isPreCloseModalOpen, setIsPreCloseModalOpen] = useState(false);

  // SJA Document preview state
  const [activeSJADoc, setActiveSJADoc] = useState<SJADocument | null>(null);
  const [isSJAPreviewOpen, setIsSJAPreviewOpen] = useState(false);
  const [isVoiceSJAOpen, setIsVoiceSJAOpen] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);

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
    todayActionsCount: 0,
    pendingApprovalsCount: 0,
    activeBlockersCount: 0,
    securedRevenue: 0
  });

  const [isLoadingAgent, setIsLoadingAgent] = useState(true);

  // Command prompt state
  const [commandText, setCommandText] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [lastAgentReply, setLastAgentReply] = useState<string | null>(null);
  const [isListeningMic, setIsListeningMic] = useState(false);

  // MesterAI Conversational Partner state
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);
  const [offerInitialData, setOfferInitialData] = useState<any>(undefined);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [changeOrdersViewTab, setChangeOrdersViewTab] = useState<'changes' | 'offers'>('changes');

  // Fetch live agent state from backend
  const fetchAgentState = async () => {
    try {
      setIsLoadingAgent(true);
      // FIX (11.09.2026): /api/agent/dispatch krever nå gyldig pålogging (se sikkerhetsfiks i
      // route.ts) – send med brukerens token slik at det faktisk fungerer for innloggede brukere.
      const dispatchToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/agent/dispatch', {
        headers: dispatchToken ? { 'Authorization': `Bearer ${dispatchToken}` } : {}
      });
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

  // 🧹 Lukk alle åpne dialoger/modaler når brukeren navigerer i arbeidsstasjonen eller sidemenyen
  const closeAllDashboardModals = useCallback(() => {
    setIsChecklistModalOpen(false);
    setIsBuildingAppModalOpen(false);
    setIsInventoryModalOpen(false);
    setIsHandoverModalOpen(false);
    setIsVehicleModalOpen(false);
    setIsHMSModalOpen(false);
    setIsActivityLogModalOpen(false);
    setIsDailyLogModalOpen(false);
    setIsOfferModalOpen(false);
    setIsChangeOrderModalOpen(false);
    setIsVoiceSJAOpen(false);
    setIsAIVisionModalOpen(false);
    setIsTimeModalOpen(false);
    setIsArchiveModalOpen(false);
    setIsContactsModalOpen(false);
    setIsContractModalOpen(false);
    setIsApprenticeModalOpen(false);
    setIsIntegrationModalOpen(false);
    setIsPreCloseModalOpen(false);
    setIsOmnichannelModalOpen(false);
    setIsSmartSearchOpen(false);
    setIsAllModulesOpen(false);
    setIsCreateModalOpen(false);
    setIsDeviationModalOpen(false);
    setIsDeviationDetailOpen(false);
    setIsSJAPreviewOpen(false);
    setIsInviteModalOpen(false);
  }, []);

  useEffect(() => {
    const handleCloseAll = () => closeAllDashboardModals();
    window.addEventListener('close_all_modals', handleCloseAll);
    window.addEventListener('close_all_dashboard_modals', handleCloseAll);
    return () => {
      window.removeEventListener('close_all_modals', handleCloseAll);
      window.removeEventListener('close_all_dashboard_modals', handleCloseAll);
    };
  }, [closeAllDashboardModals]);

  useEffect(() => {
    fetchAgentState();

    const handleAction = (e: any) => {
      const actionId = e.detail?.actionId;
      if (!actionId) return;

      // 🧹 Lukk alle popup-modaler så brukeren aldri får popup-vinduer som blokkerer
      closeAllDashboardModals();

      // Videresend til MesterWorkstation for direkte inline visning
      window.dispatchEvent(new CustomEvent('open_workstation_module', {
        detail: {
          actionId,
          projectId: e.detail?.projectId || e.detail?.id,
          data: e.detail?.data
        }
      }));
    };

    window.addEventListener('trigger_dashboard_action', handleAction as EventListener);
    return () => window.removeEventListener('trigger_dashboard_action', handleAction as EventListener);
  }, [closeAllDashboardModals]);

  // Global ⌘K / Ctrl+K keyboard shortcut for SmartSearch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSmartSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Comprehensive SmartSearch Action Dispatcher (Guarantees working navigation)
  const handleSmartSearchNavigate = (actionType: string, id?: string, extra?: any) => {
    setIsSmartSearchOpen(false);
    switch (actionType) {
      case 'nav_project':
      case 'project':
        if (id) {
          const found = projects.find(p => p.id === id || p.projectCode === id) || extra?.project;
          if (found) {
            setSelectedProject(found);
            return;
          }
        }
        setSelectedProject(null);
        setActiveTab('prosjekter');
        onTabChange?.('prosjekter');
        window.dispatchEvent(new CustomEvent('switch_mester_tab', { detail: { tab: 'projects' } }));
        break;

      case 'prosjekter':
      case 'projects':
        setSelectedProject(null);
        setActiveTab('prosjekter');
        onTabChange?.('prosjekter');
        window.dispatchEvent(new CustomEvent('switch_mester_tab', { detail: { tab: 'projects' } }));
        break;

      case 'ask_ai':
        if (extra?.prompt) {
          setChatInitialPrompt(extra.prompt);
          setSelectedProject(null);
          setActiveTab('cockpit');
          window.dispatchEvent(new CustomEvent('switch_mester_tab', { detail: { tab: 'chat' } }));
        }
        break;

      case 'create_project':
      case 'new_project':
        setIsCreateModalOpen(true);
        break;

      case 'create_deviation':
      case 'log_deviation':
        setIsDeviationModalOpen(true);
        break;

      case 'deviation':
        if (extra?.deviation) {
          setSelectedDeviation(extra.deviation);
          setIsDeviationDetailOpen(true);
          return;
        }
        if (id) {
          const foundDev = deviations.find(d => d.id === id);
          if (foundDev) {
            setSelectedDeviation(foundDev);
            setIsDeviationDetailOpen(true);
            return;
          }
        }
        setSelectedProject(null);
        setActiveTab('kvalitet');
        break;

      case 'deviations':
        setSelectedProject(null);
        setActiveTab('kvalitet');
        break;

      case 'start_checklist':
      case 'checklist':
      case 'checklists':
      case 'daily_log':
      case 'byggedagbok':
      case 'activity_log':
      case 'aktivitetslogg':
      case 'time_registration':
      case 'time':
      case 'timer':
      case 'time_tracking':
      case 'change_order':
      case 'change_orders':
      case 'endringsordre':
      case 'endringsordrer':
      case 'offer':
      case 'offers':
      case 'tilbud':
      case 'contract':
      case 'contracts':
      case 'kontrakt':
      case 'kontrakter':
      case 'hms':
      case 'hms_handbook':
      case 'voice_sja':
      case 'sja':
      case 'safe_job_analysis':
      case 'contacts':
      case 'telefonliste':
      case 'weather':
      case 'yr':
      case 'apprentice':
      case 'laerling':
      case 'tek17_vision':
      case 'ai_vision':
      case 'camera':
      case 'pre_close':
      case 'lukkesperre':
      case 'handover':
      case 'overlevering':
      case 'archive':
      case 'dokumentarkiv':
      case 'documentation':
      case 'fdv':
      case 'inventory':
      case 'lager':
      case 'vehicle':
      case 'bilpark':
      case 'kjørebok':
      case 'building_app':
      case 'byggesoknad':
        closeAllDashboardModals();
        if (id) {
          const found = projects.find(p => p.id === id);
          if (found) setSelectedProject(found);
        }
        window.dispatchEvent(new CustomEvent('open_workstation_module', {
          detail: {
            actionId: actionType,
            projectId: id,
            extra
          }
        }));
        break;

      case 'integrations':
        setIsIntegrationModalOpen(true);
        break;

      case 'mobile':
      case 'feltapp':
        window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "mobile" } }));
        break;

      case 'cockpit':
      case 'control_center':
      case 'oversikt':
        setSelectedProject(null);
        setActiveTab('cockpit');
        onTabChange?.('oversikt');
        window.dispatchEvent(new CustomEvent('switch_mester_tab', { detail: { tab: 'control_center' } }));
        break;

      case 'chat':
      case 'samtale':
        setSelectedProject(null);
        window.dispatchEvent(new CustomEvent('switch_mester_tab', { detail: { tab: 'chat' } }));
        break;

      case 'team':
        setSelectedProject(null);
        window.dispatchEvent(new CustomEvent('switch_mester_tab', { detail: { tab: 'team' } }));
        break;

      case 'route':
        if (id && typeof window !== 'undefined') {
          window.location.href = id;
        }
        break;

      default:
        if (['cockpit', 'prosjekter', 'endringsordrer', 'kvalitet', 'agent'].includes(actionType)) {
          setSelectedProject(null);
          setActiveTab(actionType as any);
        }
        break;
    }
  };

  // Handlers for Lukkesperre (TEK17)
  const handleOpenPreClose = (zone: LukkesperreZone) => {
    setSelectedLukkesperreZone(zone);
    setIsPreCloseModalOpen(true);
  };

  const handleUpdateZone = (updated: LukkesperreZone) => {
    setLukkesperreZones(prev => prev.map(z => z.id === updated.id ? updated : z));
    setSelectedLukkesperreZone(updated);
  };

  const handleAddZone = () => {
    const newZone: LukkesperreZone = {
      id: `z-${Date.now()}`,
      room: `Ny Sone / Rom ${lukkesperreZones.length + 1}`,
      project: selectedProject?.name || projects[0]?.name || 'Byggeplass',
      status: 'RED',
      canClose: false,
      detail: 'Ny kontrollsone under oppføring. Påkrevet 4 tverrfaglige kontroller.',
      checks: {
        plumbing: false,
        electric: false,
        vaporBarrier: false,
        insulation: false
      },
      lastChecked: 'Akkurat nå',
      inspector: user?.displayName || 'Byggmester'
    };
    setLukkesperreZones(prev => [newZone, ...prev]);
    setSelectedLukkesperreZone(newZone);
    setIsPreCloseModalOpen(true);
    toast.success('Ny kontrollsone opprettet for TEK17 lukkesjekk');
  };

  // Handler for SJA Modal
  const handleOpenSJAForTrade = (tradeName: string) => {
    const activeProj = selectedProject || projects[0] || { name: 'Byggeplass' };
    let sja: SJADocument;

    if (tradeName.includes('Tømrer') || tradeName.includes('Stillas') || tradeName.includes('tak')) {
      sja = {
        id: `sja-${Date.now()}`,
        title: 'SJA for Fasade-, Tak- og Stillasarbeid',
        task: 'Montering av vindsperre, lekting og utvendig kledning i høyden.',
        trade: 'Tømrer / Stillasmontør',
        projectName: activeProj.name,
        authorName: user?.displayName || 'Byggmester Ken',
        tek17Reference: 'Byggherreforskriften § 18 & Forskrift om utførelse av arbeid kap. 17',
        weatherImpact: 'Yr.no: 12°C, lett bris (3,4 m/s), opphold. Værforhold vurdert som trygge for arbeid i stillas.',
        createdAt: new Date().toLocaleDateString('no-NO'),
        status: 'approved',
        risks: [
          {
            activity: 'Arbeid på stillas over 2 meter',
            hazard: 'Fall fra stillas eller åpen gavl under montasje',
            measure: 'Stillas kontrollert med grønt skilt. Dobbelt rekkverk, fotlist og godkjent fallsikringssele ved arbeid utenfor rekkverk.',
            riskLevel: 'Høy'
          },
          {
            activity: 'Håndtering av tunge kledningsbord og kappsag',
            hazard: 'Mistet verktøy/materiale treffer personer under, eller kuttskade ved kapp',
            measure: 'Avsperret sikkerhetssone under stillas med sperrebånd. Verktøysikring/fangline på elektroverktøy. Sagbord stabilt plassert.',
            riskLevel: 'Middels'
          },
          {
            activity: 'Ferdsel i stillastrapp med materialbæring',
            hazard: 'Snubling i trapp eller stillasgulv',
            measure: 'Ryddet gangbane på stillasgulv til enhver tid. Ingen løse ledninger i trappeløp.',
            riskLevel: 'Lav'
          }
        ],
        equipment: [
          'Hjelm med hakestropp (EN 397)',
          'Vernesko S3 med spikertramp',
          'Fallsikringssele og fangline (EN 361)',
          'Synlighetstøy klasse 2 (EN ISO 20471)',
          'Vernebriller og hørselvern'
        ]
      };
    } else if (tradeName.includes('Rørlegger') || tradeName.includes('Trykk') || tradeName.includes('Varmt')) {
      sja = {
        id: `sja-${Date.now()}`,
        title: 'SJA for Trykkprøving og Varme Arbeider (Rør)',
        task: 'Trykktesting av rør-i-rør fordelerskap og lodding/pressing av vannledninger.',
        trade: 'Rørlegger (VVS)',
        projectName: activeProj.name,
        authorName: 'Rørleggermester Hansen',
        tek17Reference: 'Byggherreforskriften § 18, TEK17 § 13-15 & Sikkerhetsforskrift for Varme Arbeider',
        weatherImpact: 'Innendørs våtrom. Normal romtemperatur og god belysning.',
        createdAt: new Date().toLocaleDateString('no-NO'),
        status: 'approved',
        risks: [
          {
            activity: 'Bruk av åpen flamme og gassbrenner ved lodding',
            hazard: 'Antennelse av brennbart materiale i veggkonstruksjon',
            measure: 'Gyldig sertifikat for varme arbeider. Minst 2 stk 6kg pulverapparater + brannteppe på arbeidsstedet. Brannvakt i 60 minutter etter arbeid.',
            riskLevel: 'Høy'
          },
          {
            activity: 'Vanntrykkprøving med 10 bar testtrykk',
            hazard: 'Slangebrudd eller utblåsning av plugg under høyt trykk',
            measure: 'Kun godkjente trykkpropper og kalibrert manometer. Ingen personer foran propper under oppfylling. Gradvis trykkøkning.',
            riskLevel: 'Middels'
          }
        ],
        equipment: [
          'Vernebriller (EN 166)',
          'Varmebestandige hansker',
          'Vernesko S3',
          'Brannslukningsapparat 2x6kg ABC'
        ]
      };
    } else if (tradeName.includes('Elektriker') || tradeName.includes('Spenningssatt')) {
      sja = {
        id: `sja-${Date.now()}`,
        title: 'SJA for Skjultanlegg og Arbeid i Hovedtavle',
        task: 'Trekking av rørkurs, montering av fordelerskap og kobling av inntak.',
        trade: 'Elektroinstallatør (NEK 400)',
        projectName: activeProj.name,
        authorName: 'Installatør Erik',
        tek17Reference: 'FSE (Forskrift om sikkerhet ved arbeid i elektriske anlegg) & Byggherreforskriften § 18',
        weatherImpact: 'Innendørs tørt miljø.',
        createdAt: new Date().toLocaleDateString('no-NO'),
        status: 'approved',
        risks: [
          {
            activity: 'Tilkobling mot spenningssatt fordelingstavle',
            hazard: 'Elektrisk lysbue eller utilsiktet strømgjennomgang',
            measure: 'Frakoblet spenning, låst og merket (LOTO). Kontrollmåling med topolet spenningsprøver før berøring.',
            riskLevel: 'Høy'
          },
          {
            activity: 'Boring og fresing av spor i bindingsverk for k-rør',
            hazard: 'Støvinhalasjon og treff på skjulte installasjoner',
            measure: 'Støvavsug på fres. Multidetektor brukt før boring.',
            riskLevel: 'Lav'
          }
        ],
        equipment: [
          'Isolert verktøy 1000V (EN 60900)',
          'Topolet spenningstester med egensjekk',
          'Vernesko med isolerende såle',
          'Kuttsikre montørhansker (EN 388)'
        ]
      };
    } else {
      sja = {
        id: `sja-${Date.now()}`,
        title: 'SJA for Grøftegraving og Kabelpåvisning',
        task: 'Graving av tilførselsgrøft for vann og overvann med gravemaskin.',
        trade: 'Maskinentreprenør & Graver',
        projectName: activeProj.name,
        authorName: 'Gunnar Graver',
        tek17Reference: 'Forskrift om utførelse av arbeid kap. 21 & Byggherreforskriften § 18',
        weatherImpact: 'Overskyet, +8°C. Jordbunn fuktig, krever ekstra oppmerksomhet på grøftekantstabilitet.',
        createdAt: new Date().toLocaleDateString('no-NO'),
        status: 'approved',
        risks: [
          {
            activity: 'Graving i bakke med uavklarte kabler/ledninger',
            hazard: 'Grave av høyspentkabel, gass eller fiber',
            measure: 'Gjennomført kabelpåvisning via Ledningsportalen/Geomatikk. Kabler merket på bakken. Håndgraving 1 meter inntil påvist kabel.',
            riskLevel: 'Høy'
          },
          {
            activity: 'Graving av grøft dypere enn 1,25 meter',
            hazard: 'Rasing av grøftevegg og begraving av personell',
            measure: 'Sikring med forskriftsmessig skråning eller godkjent grøftekasse. Ingen i grøft mens maskin graver.',
            riskLevel: 'Høy'
          }
        ],
        equipment: [
          'Hjelm med hakestropp',
          'Vernesko S5',
          'Synlighetstøy klasse 3',
          'Kabeldetektor og plastspade'
        ]
      };
    }

    setActiveSJADoc(sja);
    setIsSJAPreviewOpen(true);
  };

  // Handle Quick Command / Conversational AI prompt
  const handleSendCommand = (customPrompt?: string) => {
    const textToSend = customPrompt || commandText;
    if (!textToSend.trim()) return;

    setChatInitialPrompt(textToSend.trim());
    setIsAIChatOpen(true);
    setCommandText('');
  };

  // 1-Click Approve Change Order (Registrer godkjenning / aksept fra kunde)
  const handleApproveChangeOrder = async (changeOrderId: string) => {
    try {
      // Optimistisk oppdatering i UI umiddelbart
      setDashboardChangeOrders(prev => prev.map(item => item.id === changeOrderId ? { ...item, status: 'Godkjent av kunde' } : item));
      setPendingApprovals(prev => prev.filter(item => item.id !== changeOrderId));
      setAgentMetrics((prev: any) => ({
        ...prev,
        pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1)
      }));

      // Oppdater Firestore direkte slik at det persisteres umiddelbart
      try {
        await updateDoc(doc(db, 'change_orders', changeOrderId), {
          status: 'Godkjent av kunde',
          approvedAt: new Date().toISOString(),
          approvedBy: user?.displayName || 'Byggmester / Admin'
        });
      } catch (fsErr) {
        console.warn('Firestore update fallback:', fsErr);
      }

      const res = await fetch('/api/agent/dispatch', {
        method: 'POST',
        // FIX (11.09.2026): Send med Authorization-token – /api/agent/dispatch krever nå pålogging.
        headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) },
        body: JSON.stringify({
          action: 'approve_change_order',
          changeOrderId,
          authorName: user?.displayName || 'Byggmester / Admin'
        })
      });

      if (res.ok) {
        toast.success('Endringsordre markert som godkjent av kunde!', {
          description: 'Varsel og godkjenningsdokument (NS 8406) er oppdatert og arkivert.'
        });
        fetchAgentState();
      }
    } catch (err: any) {
      toast.error('Feil ved godkjenning: ' + err.message);
    }
  };

  // 1-Click Reject Change Order
  const handleRejectChangeOrder = async (changeOrderId: string) => {
    try {
      setDashboardChangeOrders(prev => prev.map(item => item.id === changeOrderId ? { ...item, status: 'Avvist' } : item));
      setPendingApprovals(prev => prev.filter(item => item.id !== changeOrderId));

      try {
        await updateDoc(doc(db, 'change_orders', changeOrderId), {
          status: 'rejected',
          rejectedAt: new Date().toISOString()
        });
      } catch (fsErr) {
        console.warn('Firestore reject fallback:', fsErr);
      }

      const res = await fetch('/api/agent/dispatch', {
        method: 'POST',
        // FIX (11.09.2026): Send med Authorization-token – /api/agent/dispatch krever nå pålogging.
        headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) },
        body: JSON.stringify({
          action: 'reject_change_order',
          changeOrderId
        })
      });

      if (res.ok) {
        toast.info('Endringsordre er markert som avvist.');
        fetchAgentState();
      }
    } catch (err: any) {
      toast.error('Feil: ' + err.message);
    }
  };

  // 1-Click Delete Change Order (Superbruker / Admin)
  const handleDeleteChangeOrder = async (changeOrderId: string) => {
    try {
      const res = await fetch('/api/agent/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) },
        body: JSON.stringify({
          action: 'delete_change_order',
          changeOrderId,
          authorName: user?.displayName || 'Ken (Admin)'
        })
      });

      if (res.ok) {
        toast.success('Endringsordre permanent slettet!');
        setPendingApprovals(prev => prev.filter(item => item.id !== changeOrderId));
        setAgentMetrics((prev: any) => ({
          ...prev,
          pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1)
        }));
        fetchAgentState();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Kunne ikke slette endringsordren');
      }
    } catch (err: any) {
      toast.error('Feil ved sletting: ' + err.message);
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
    <div className="h-full w-full overflow-hidden bg-[#0A101D] text-slate-100 pb-0">
      {/* Modals retained for full compatibility */}
      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); fetchAgentState(); }} />
      <CreateDeviationModal 
        isOpen={isDeviationModalOpen} 
        onClose={() => { setIsDeviationModalOpen(false); fetchAgentState(); }} 
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
      />
      <ChecklistModal 
        isOpen={isChecklistModalOpen} 
        onClose={() => {
          setIsChecklistModalOpen(false);
          setChecklistTrade(undefined);
        }} 
        projectId={checklistProjectId || projects[0]?.id}
        initialTrade={checklistTrade}
      />
      <AIVisionModal 
        isOpen={isAIVisionModalOpen} 
        onClose={() => { setIsAIVisionModalOpen(false); fetchAgentState(); }} 
        projectId={selectedProject?.id || projects[0]?.id}
        projectName={selectedProject?.name || projects[0]?.name}
      />
      <OfferModal 
        isOpen={isOfferModalOpen} 
        onClose={() => {
          setIsOfferModalOpen(false);
          setOfferInitialData(undefined);
        }} 
        initialData={offerInitialData}
      />
      <ContractModal isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} />
      <DocumentationArchive 
        isOpen={isArchiveModalOpen} 
        onClose={() => setIsArchiveModalOpen(false)} 
        projectId={selectedProject?.id}
        projects={projects}
        onSelectProject={setSelectedProject}
      />
      <ApprenticeModal 
        isOpen={isApprenticeModalOpen} 
        onClose={() => setIsApprenticeModalOpen(false)} 
      />
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
      <DailyLogModal
        isOpen={isDailyLogModalOpen}
        onClose={() => setIsDailyLogModalOpen(false)}
        project={selectedProject || projects[0] || ({
          id: 'proj-default',
          name: 'Hovedprosjekt',
          projectCode: 'P-01',
          description: 'Hovedprosjekt',
          location: 'Byggeplass',
          progress: 0,
          status: 'active',
          stage: 'active',
          documentationLevel: 0,
          clientName: 'Oppdragsgiver',
          clientEmail: '',
          clientPhone: '',
          company: user?.company || 'Bedrift',
          companyId: user?.companyId || 'comp',
          companyName: user?.company || 'Bedrift',
          projectManager: user?.displayName || 'Byggeleder',
          startDate: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as unknown as Project)}
        currentUserName={user?.displayName || 'Byggeleder'}
      />
      <DeviationDetailModal
        isOpen={isDeviationDetailOpen}
        onClose={() => {
          setIsDeviationDetailOpen(false);
          setSelectedDeviation(null);
        }}
        deviation={selectedDeviation}
        project={selectedDeviation ? (projects.find(p => p.id === selectedDeviation.projectId) || { id: selectedDeviation.projectId || 'p-1', name: 'Prosjekt' }) : undefined}
        onUpdated={() => {
          setIsDeviationDetailOpen(false);
          setSelectedDeviation(null);
          fetchAgentState();
        }}
      />
      <ChangeOrderModal
        isOpen={isChangeOrderModalOpen}
        onClose={() => {
          setIsChangeOrderModalOpen(false);
          fetchAgentState();
        }}
        project={(selectedProject || projects[0] || {
          id: 'proj-default',
          name: 'Nytt Prosjekt',
          projectCode: 'P-01',
          description: 'Hovedprosjekt',
          location: 'Byggeplass',
          progress: 0,
          status: 'active',
          stage: 'active',
          documentationLevel: 0,
          clientName: 'Oppdragsgiver',
          clientEmail: '',
          clientPhone: '',
          company: user?.company || 'Bedrift',
          companyId: user?.companyId || 'comp',
          companyName: user?.company || 'Bedrift',
          projectManager: user?.displayName || 'Byggeleder',
          startDate: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }) as unknown as Project}
        currentUserId={user?.id || 'admin_user'}
        currentUserName={user?.displayName || 'Byggeleder'}
      />
      <SmartSearch 
        isOpen={isSmartSearchOpen} 
        onClose={() => setIsSmartSearchOpen(false)} 
        onNavigate={handleSmartSearchNavigate}
        projects={projects}
        deviations={deviations}
        changeOrders={dashboardChangeOrders}
        recentActivities={recentActivities}
      />
      <PreCloseInspectorModal
        isOpen={isPreCloseModalOpen}
        onClose={() => setIsPreCloseModalOpen(false)}
        zone={selectedLukkesperreZone || lukkesperreZones[0] || DEFAULT_LUKKESPERRE_ZONES[0]}
        onUpdateZone={handleUpdateZone}
        onOpenAIVision={(_roomName) => {
          setIsPreCloseModalOpen(false);
          setIsAIVisionModalOpen(true);
        }}
      />
      <SJAPreviewModal
        isOpen={isSJAPreviewOpen}
        onClose={() => setIsSJAPreviewOpen(false)}
        sja={activeSJADoc}
        onApprove={(sja) => {
          setActiveSJADoc({ ...sja, status: 'approved' });
          fetchAgentState();
        }}
      />
      <VoiceSJAModal
        isOpen={isVoiceSJAOpen}
        onClose={() => setIsVoiceSJAOpen(false)}
        projects={projects}
        initialProjectId={selectedProject?.id || projects[0]?.id}
        onOpenPreview={(sja) => {
          setActiveSJADoc(sja);
          setIsSJAPreviewOpen(true);
        }}
      />
      <ProjectContactsModal
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
        project={selectedProject || projects[0]}
      />
      <AllModulesDrawer
        isOpen={isAllModulesOpen}
        onClose={() => setIsAllModulesOpen(false)}
        onOpenAction={(actionId) => {
          setIsAllModulesOpen(false);
          handleSmartSearchNavigate(actionId);
        }}
        isSuperAdmin={isSuperAdmin}
      />
      <OmnichannelModal
        isOpen={isOmnichannelModalOpen}
        onClose={() => setIsOmnichannelModalOpen(false)}
      />
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* 🌟 MesterAI Control Center Workstation (Gemini / ChatGPT / Antigravity AI-First Layout) */}
      <AnimatePresence mode="wait">
        {Boolean(selectedProject && isViewingProjectDetails) ? (
          <div key="project_details_container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
            <ProjectDetails 
              key="project_details"
              project={selectedProject!} 
              onBack={() => setIsViewingProjectDetails(false)} 
              onShare={() => onOpenPortal?.(selectedProject!)}
              onStartChecklist={(projectId) => {
                setChecklistProjectId(projectId);
                setIsChecklistModalOpen(true);
              }}
              onHandover={(projectId) => {
                setHandoverProjectId(projectId);
                setIsHandoverModalOpen(true);
              }}
            />
          </div>
        ) : (
          <MesterWorkstation
            key="mester_workstation_root"
            initialModuleTab={initialWorkstationTab}
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={(proj) => {
              setSelectedProject(proj);
            }}
            changeOrders={dashboardChangeOrders}
            offers={dashboardOffers}
            deviations={deviations}
            lukkesperreZones={lukkesperreZones}
            recentActivities={recentActivities}
            tasks={dashboardTasks}
            initialPrompt={chatInitialPrompt}
            onPromptHandled={() => setChatInitialPrompt(undefined)}
            onOpenCreateProject={() => {}}
            onOpenSmartSearch={() => setIsSmartSearchOpen(true)}
            onOpenAllModules={() => {
              closeAllDashboardModals();
              window.dispatchEvent(new CustomEvent('open_workstation_module', { detail: { actionId: 'all_modules' } }));
            }}
            onApproveChangeOrder={handleApproveChangeOrder}
            onRejectChangeOrder={handleRejectChangeOrder}
            onDeleteChangeOrder={handleDeleteDashboardOrder}
            onDeleteOffer={handleDeleteDashboardOffer}
            onOpenPreClose={handleOpenPreClose}
            onOpenOmnichannelModal={() => setIsOmnichannelModalOpen(true)}
            onOpenSettings={() => {}}
            onOpenSuperAdmin={onOpenSuperAdmin}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
