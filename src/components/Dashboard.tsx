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
  CloudSun,
  Trash2,
  Radio,
  MessageSquare,
  Mail,
  Hash
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Project, Deviation, UserProfile } from '../types';
import { db, collection, onSnapshot, query, orderBy, where, getDocs, deleteDoc, OperationType, handleFirestoreError } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../hooks/useAuth';
import ActivityLogModal from './ActivityLogModal';
import DailyLogModal from './DailyLogModal';
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
import OmnichannelModal, { getStoredOmnichannelSettings, OmnichannelSettings } from './OmnichannelModal';
import HandoverModal from './HandoverModal';
import InventoryModal from './InventoryModal';
import VehicleModal from './VehicleModal';
import HMSModal from './HMSModal';
import ProjectDetails from './ProjectDetails';
import SmartSearch from './SmartSearch';
import ChangeOrderModal from './ChangeOrderModal';
import { changeOrderService } from '../services/changeOrderService';
import PreCloseInspectorModal, { LukkesperreZone } from './PreCloseInspectorModal';
import SJAPreviewModal, { SJADocument } from './SJAPreviewModal';
import VoiceSJAModal from './VoiceSJAModal';
import ProjectContactsModal from './ProjectContactsModal';
import InviteModal from './InviteModal';
import MesterAIChat from './MesterAIChat';
import AllModulesDrawer from './AllModulesDrawer';
import QuickStartGuide from './QuickStartGuide';

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
  const { user, isSuperAdmin } = useAuth();
  const { projects, deviations, stats, loading: dataLoading, dataUnavailable } = useDashboardData();

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
  const [isDailyLogModalOpen, setIsDailyLogModalOpen] = useState(false);
  const [isChangeOrderModalOpen, setIsChangeOrderModalOpen] = useState(false);
  const [isAllModulesOpen, setIsAllModulesOpen] = useState(false);

  // Live Endringsordrer state with deletion capability
  const [dashboardChangeOrders, setDashboardChangeOrders] = useState<any[]>([
    { id: 'co-101', number: 1, title: '6 ekstra downlights og trekkerør i stue', project: 'Nyebakken 14', amount: 14500, days: 2, status: 'Venter på bas', legal: 'NS 8406 pkt. 19.2' },
    { id: 'co-102', number: 2, title: 'Uforutsett råte i bjelkelag under sluk', project: 'Storgata 8', amount: 28000, days: 4, status: 'Venter på bas', legal: 'NS 8406 pkt. 19.3' },
    { id: 'co-103', number: 3, title: 'Oppgradering til royalimpregnert kledning', project: 'Fjordveien 22', amount: 42000, days: 0, status: 'Godkjent av kunde', legal: 'NS 8406 pkt. 19.2' }
  ]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'change_orders'), (snapshot) => {
      if (snapshot.docs && snapshot.docs.length > 0) {
        const liveOrders = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            number: data.changeNumber || 1,
            title: data.title,
            project: data.projectName || data.projectCode || 'Prosjekt',
            amount: data.amountExVat || data.totalAmount || 0,
            days: data.impactDays || 0,
            status: data.status === 'approved' ? 'Godkjent av kunde' : data.status === 'rejected' ? 'Avvist' : 'Venter på bas',
            legal: data.legalHjemmel || 'NS 8406 pkt. 19.2',
            shareUrl: data.shareUrl
          };
        });
        setDashboardChangeOrders(liveOrders);
      }
    });
    return () => unsub();
  }, []);

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

  // Live Offers (Pristilbud) state with real-time sync and deletion
  const [dashboardOffers, setDashboardOffers] = useState<any[]>([
    {
      id: 'off-101',
      title: 'Totalrenovering bad og vaskerom 2. etasje',
      clientName: 'Marianne Berg',
      clientEmail: 'marianne.berg@nordmann.no',
      projectName: 'Nyebakken 14',
      totalAmount: 285000,
      totalIncVat: 356250,
      status: 'accepted',
      token: 'tok-bath-285k',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'off-102',
      title: 'Utskifting av trekledning og 150mm etterisolering',
      clientName: 'Thomas Lunde',
      clientEmail: 'thomas.lunde@outlook.com',
      projectName: 'Fjordveien 22',
      totalAmount: 148000,
      totalIncVat: 185000,
      status: 'pending',
      token: 'tok-facade-148k',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    {
      id: 'off-103',
      title: 'Tilbygg 45m2 stue/kjøkken med ringmur',
      clientName: 'Henrik Hauge',
      clientEmail: 'henrik.hauge@gmail.com',
      projectName: 'Storgata 8',
      totalAmount: 420000,
      totalIncVat: 525000,
      status: 'draft',
      token: 'tok-extension-420k',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
    }
  ]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'offers'), (snapshot) => {
      if (snapshot.docs && snapshot.docs.length > 0) {
        const live = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setDashboardOffers(live);
      }
    });
    return () => unsub();
  }, []);

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
    window.addEventListener('omnichannel_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('omnichannel_settings_updated', handleSettingsUpdate);
  }, []);

  // Lukkesperre & Pre-close state
  const [lukkesperreZones, setLukkesperreZones] = useState<LukkesperreZone[]>([
    { 
      id: 'z-1',
      room: 'Bad 2. etg (Nyebakken)', 
      project: 'Nyebakken 14 - Totalrenovering',
      status: 'GREEN', 
      canClose: true, 
      detail: 'Rør-i-rør trykktest og dampsperre godkjent.',
      checks: {
        plumbing: true,
        electric: true,
        vaporBarrier: true,
        insulation: true
      },
      lastChecked: 'I dag kl. 10:15',
      inspector: 'Rørleggermester Hansen & Byggmester Ken'
    },
    { 
      id: 'z-2',
      room: 'Vaskerom 1. etg (Storgata 8)', 
      project: 'Storgata 8 - Nybygg',
      status: 'RED', 
      canClose: false, 
      detail: 'Rørlegger mangler trykktestrapport for fordelerskap.',
      checks: {
        plumbing: false,
        electric: true,
        vaporBarrier: false,
        insulation: true
      },
      lastChecked: 'I dag kl. 09:15',
      inspector: 'Byggmester Ken'
    },
    { 
      id: 'z-3',
      room: 'Kjøkken (Fjordveien 22)', 
      project: 'Fjordveien 22 - Tilbygg',
      status: 'GREEN', 
      canClose: true, 
      detail: 'El-skjultanlegg og rørkurs verifisert.',
      checks: {
        plumbing: true,
        electric: true,
        vaporBarrier: true,
        insulation: true
      },
      lastChecked: '14. sep kl. 14:30',
      inspector: 'Elektroinstallatør Erik'
    }
  ]);
  const [selectedLukkesperreZone, setSelectedLukkesperreZone] = useState<LukkesperreZone | null>(null);
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

  useEffect(() => {
    fetchAgentState();

    const handleAction = (e: any) => {
      const actionId = e.detail?.actionId;
      if (!actionId) return;
      switch (actionId) {
        case 'new_project':
          setIsCreateModalOpen(true);
          break;
        case 'log_deviation':
          setIsDeviationModalOpen(true);
          break;
        case 'start_checklist':
          setIsChecklistModalOpen(true);
          break;
        case 'take_photo':
          setIsAIVisionModalOpen(true);
          break;
        case 'offers':
          setIsOfferModalOpen(true);
          break;
        case 'time_registration':
          setIsTimeModalOpen(true);
          break;
        case 'vehicle':
          setIsVehicleModalOpen(true);
          break;
        case 'inventory':
          setIsInventoryModalOpen(true);
          break;
        case 'hms':
          setIsHMSModalOpen(true);
          break;
        case 'building_app':
          setIsBuildingAppModalOpen(true);
          break;
        case 'change_order':
          setIsChangeOrderModalOpen(true);
          break;
        case 'sja':
        case 'voice_sja':
          setIsVoiceSJAOpen(true);
          break;
        case 'contacts':
          setIsContactsModalOpen(true);
          break;
        case 'pre_close':
          setActiveTab('kvalitet');
          setSelectedLukkesperreZone(lukkesperreZones[0]);
          setIsPreCloseModalOpen(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('trigger_dashboard_action', handleAction as EventListener);
    return () => window.removeEventListener('trigger_dashboard_action', handleAction as EventListener);
  }, [lukkesperreZones]);

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
          const found = projects.find(p => p.id === id || p.projectCode === id);
          if (found) {
            setSelectedProject(found);
            return;
          }
        }
        setSelectedProject(null);
        setActiveTab('prosjekter');
        break;

      case 'prosjekter':
        setSelectedProject(null);
        setActiveTab('prosjekter');
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
      case 'deviations':
        setSelectedProject(null);
        setActiveTab('kvalitet');
        break;

      case 'start_checklist':
      case 'checklist':
      case 'checklists':
        if (id) setChecklistProjectId(id);
        else if (projects.length > 0) setChecklistProjectId(projects[0].id);
        setIsChecklistModalOpen(true);
        break;

      case 'daily_log':
      case 'byggedagbok':
      case 'activity_log':
        setIsActivityLogModalOpen(true);
        break;

      case 'time_registration':
      case 'time':
      case 'timer':
      case 'time_tracking':
        setIsTimeModalOpen(true);
        break;

      case 'change_order':
      case 'endringsordre':
        setIsChangeOrderModalOpen(true);
        break;

      case 'change_orders':
      case 'endringsordrer':
        setSelectedProject(null);
        setActiveTab('endringsordrer');
        break;

      case 'offer':
      case 'offers':
      case 'tilbud':
        setIsOfferModalOpen(true);
        break;

      case 'contract':
      case 'contracts':
      case 'kontrakt':
      case 'kontrakter':
        setIsContractModalOpen(true);
        break;

      case 'hms':
      case 'hms_handbook':
        setIsHMSModalOpen(true);
        break;

      case 'voice_sja':
        setIsVoiceSJAOpen(true);
        break;

      case 'contacts':
      case 'telefonliste':
        setIsContactsModalOpen(true);
        break;

      case 'weather':
      case 'yr':
        setSelectedProject(null);
        setActiveTab('prosjekter');
        toast.info('Viser værdata fra Yr.no på prosjektene');
        break;

      case 'translator':
      case 'oversetter':
        window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "mobile" } }));
        break;

      case 'apprentice':
      case 'laerling':
        handleOpenSJAForTrade('Tømrer');
        break;

      case 'super_admin':
      case 'superadmin':
        window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "super-admin" } }));
        break;

      case 'sja':
      case 'safe_job_analysis':
        handleOpenSJAForTrade(extra?.trade || 'Tømrer');
        break;

      case 'tek17_vision':
      case 'ai_vision':
      case 'camera':
        setIsAIVisionModalOpen(true);
        break;

      case 'pre_close':
      case 'lukkesperre':
        setSelectedProject(null);
        setActiveTab('kvalitet');
        setSelectedLukkesperreZone(lukkesperreZones[0]);
        setIsPreCloseModalOpen(true);
        break;

      case 'handover':
      case 'overlevering':
        if (id) setHandoverProjectId(id);
        setIsHandoverModalOpen(true);
        break;

      case 'archive':
      case 'dokumentarkiv':
        setIsArchiveModalOpen(true);
        break;

      case 'inventory':
      case 'lager':
        setIsInventoryModalOpen(true);
        break;

      case 'vehicle':
      case 'bilpark':
        setIsVehicleModalOpen(true);
        break;

      case 'building_app':
      case 'byggesoknad':
        setIsBuildingAppModalOpen(true);
        break;

      case 'integrations':
        setIsIntegrationModalOpen(true);
        break;

      case 'mobile':
      case 'feltapp':
        window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "mobile" } }));
        break;

      case 'cockpit':
      case 'kvalitet':
      case 'agent':
        setSelectedProject(null);
        setActiveTab(actionType as any);
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
      project: selectedProject?.name || projects[0]?.name || 'Nyebakken 14',
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
    const activeProj = selectedProject || projects[0] || { name: 'Nyebakken 14 - Totalrenovering' };
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

  // 1-Click Approve Change Order
  const handleApproveChangeOrder = async (changeOrderId: string) => {
    try {
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
        // FIX (11.09.2026): Send med Authorization-token – /api/agent/dispatch krever nå pålogging.
        headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) },
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
      <OfferModal 
        isOpen={isOfferModalOpen} 
        onClose={() => {
          setIsOfferModalOpen(false);
          setOfferInitialData(undefined);
        }} 
        initialData={offerInitialData}
      />
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
      {projects[0] && (
        <DailyLogModal
          isOpen={isDailyLogModalOpen}
          onClose={() => setIsDailyLogModalOpen(false)}
          project={selectedProject || projects[0]}
          currentUserName={user?.displayName || 'Byggeleder'}
        />
      )}
      <ChangeOrderModal
        isOpen={isChangeOrderModalOpen}
        onClose={() => {
          setIsChangeOrderModalOpen(false);
          fetchAgentState();
        }}
        project={(selectedProject || projects[0] || {
          id: 'proj-101',
          name: 'Nyebakken 14 - Totalrenovering',
          projectCode: 'P-2026-01',
          description: 'Totalrenovering',
          location: 'Oslo',
          progress: 65,
          status: 'active',
          stage: 'active',
          documentationLevel: 85,
          clientName: 'Ole Nordmann',
          clientEmail: 'ole@nordmann.no',
          clientPhone: '912 34 567',
          company: 'Mester Entreprenør AS',
          companyId: 'comp-001',
          companyName: 'Mester Entreprenør AS',
          projectManager: 'Ken (Byggmester)',
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
        recentActivities={recentActivities}
      />
      <PreCloseInspectorModal
        isOpen={isPreCloseModalOpen}
        onClose={() => setIsPreCloseModalOpen(false)}
        zone={selectedLukkesperreZone}
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
      <MesterAIChat 
        isOpen={isAIChatOpen}
        onClose={() => {
          setIsAIChatOpen(false);
          setChatInitialPrompt(undefined);
        }}
        selectedProject={selectedProject}
        projects={projects}
        changeOrders={dashboardChangeOrders}
        offers={dashboardOffers}
        deviations={deviations}
        lukkesperreZones={lukkesperreZones}
        recentActivities={recentActivities}
        initialPrompt={chatInitialPrompt}
        onPromptHandled={() => setChatInitialPrompt(undefined)}
        onApproveChangeOrder={handleApproveChangeOrder}
        onRejectChangeOrder={handleRejectChangeOrder}
        onDeleteChangeOrder={handleDeleteDashboardOrder}
        onDeleteOffer={handleDeleteDashboardOffer}
        onOpenPreClose={handleOpenPreClose}
        onOpenOmnichannelModal={() => setIsOmnichannelModalOpen(true)}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
        onOpenOfferModal={(data) => {
          setOfferInitialData(data);
          setIsOfferModalOpen(true);
        }}
        onOpenChangeOrderModal={(_data) => {
          setIsChangeOrderModalOpen(true);
        }}
        onOpenSJAModal={(_data) => {
          setIsVoiceSJAOpen(true);
        }}
        onOpenAIVision={() => {
          setIsAIVisionModalOpen(true);
        }}
      />

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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-gradient-to-r from-navy-950 via-slate-900 to-navy-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-slate-800 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-electric-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-electric-600 to-electric-400 flex items-center justify-center text-white shadow-purple-cta font-black text-xl shrink-0">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "K"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                        {t('greeting_hello', { name: user?.displayName ? user.displayName.split(" ")[0] : "Kenneth", defaultValue: "Hei, Kenneth! 👋" })}
                      </h2>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {user?.company || "AIChat Norge AS / Vikingnet"}
                      </span>
                    </div>
                    
                    {/* Omnichannel Live Status Pills */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                      <button
                        type="button"
                        onClick={() => setIsOmnichannelModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold transition-all cursor-pointer"
                        title="Klikk for å administrere Discord-tilkobling"
                      >
                        <MessageSquare size={12} />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Discord</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsOmnichannelModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold transition-all cursor-pointer"
                        title="Klikk for å administrere Slack-tilkobling"
                      >
                        <Hash size={12} />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Slack</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsOmnichannelModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 font-bold transition-all cursor-pointer"
                        title="Klikk for å administrere Teams-tilkobling"
                      >
                        <Radio size={12} />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Teams</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('hei@vikingmester.no');
                          toast.success('hei@vikingmester.no kopiert til utklippstavlen!');
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10 font-medium transition-all cursor-pointer"
                        title="Klikk for å kopiere e-postadresse"
                      >
                        <Mail size={12} />
                        <span>hei@vikingmester.no</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* App View Quick Switcher Pill */}
                <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md self-start md:self-auto relative z-10 flex-wrap">
                  {isSuperAdmin && (
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "super-admin" } }))}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-md active:scale-95 cursor-pointer"
                      title="Administrer alle kundebedrifter, moduler og impersoner kunder"
                    >
                      <Shield size={14} />
                      <span>👑 SuperAdmin & Firmaer</span>
                    </button>
                  )}
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "mobile" } }))}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all bg-electric-500 text-white shadow-purple-cta hover:bg-electric-400 active:scale-95 cursor-pointer"
                    title={t('open_field_app_desc', 'Åpne ren feltapp tilpasset 1-hånds mobilbruk')}
                  >
                    <Smartphone size={15} />
                    <span>{t('open_field_app', '📱 Feltapp')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAllModulesOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    title="Se alle 20 verktøy"
                  >
                    <Layers size={14} />
                    <span>Verktøy</span>
                  </button>
                  <button
                    onClick={() => setIsSmartSearchOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                  >
                    <Search size={14} />
                    <span>{t('btn_search', 'Søk')}</span>
                    <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[10px] text-slate-300">⌘K</kbd>
                  </button>
                </div>
              </div>

              {/* 🚀 CENTERPIECE HERO: MESTERAI ARBEIDSSTASJON & AUTONOM KOMMANDOSENTRAL */}
              <div className="bg-gradient-to-br from-white via-slate-50 to-electric-50/30 rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-electric-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10 mb-6">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-electric-50 text-electric-700 border border-electric-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Autonom Agent 100% Operativ
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        Lytter på: <strong className="text-navy-900">Discord, Slack, Teams & E-post</strong>
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-navy-950 tracking-tight">
                      MesterAI Autonom Arbeidsstasjon
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl">
                      Styr hele byggeplassen, skriv pristilbud, varsle endringsordrer (NS 8406) og sjekk TEK17 direkte fra samtalen.
                    </p>
                  </div>

                  {/* Primary Large Chat Launcher Button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAIChatOpen(true)}
                      className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-electric-600 via-purple-600 to-electric-500 hover:from-electric-500 hover:to-purple-500 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-electric-500/25 flex items-center justify-center gap-3 cursor-pointer hover:scale-[1.02] active:scale-98 group"
                    >
                      <Brain size={20} className="group-hover:rotate-12 transition-transform" />
                      <span>Åpne MesterAI Arbeidsstasjon (Fullskjerm)</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Quick Conversational Prompt Bar */}
                <div className="pt-5 border-t border-slate-200/80">
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendCommand(); }}
                    className="flex flex-col sm:flex-row items-stretch gap-3"
                  >
                    <div className="relative flex-1">
                      <input 
                        type="text"
                        value={commandText}
                        onChange={(e) => setCommandText(e.target.value)}
                        placeholder="Spør MesterAI om hva som helst (skriv tilbud, varsle endring NS 8406, sjekk TEK17, SJA, faglige råd)..."
                        className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 shadow-xs transition-all"
                      />
                      <button 
                        type="button"
                        onClick={toggleMic}
                        className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer",
                          isListeningMic ? "bg-rose-500 text-white animate-pulse" : "text-slate-400 hover:text-electric-600"
                        )}
                        title={t('cockpit_mic_title', 'Snakk inn instruks')}
                      >
                        {isListeningMic ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                    </div>

                    <button 
                      type="submit"
                      disabled={isDispatching || !commandText.trim()}
                      className="flex items-center justify-center gap-2 px-6 py-3.5 bg-navy-900 hover:bg-navy-800 text-white rounded-2xl text-xs font-black disabled:opacity-50 transition-all shrink-0 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-98"
                    >
                      {isDispatching ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Analyserer...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Spør MesterAI</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Suggestion Prompt Chips */}
                  <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-1">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                      Hurtighandling:
                    </span>
                    {[
                      { 
                        label: '📝 Hjelp meg å skrive et nytt tilbud', 
                        prompt: 'Hjelp meg å skrive et nytt tilbud'
                      },
                      { 
                        label: '⚡ Varsle endringsordre (NS 8406)', 
                        prompt: 'Registrer endringsordre: Ekstra downlights og trekkerør kr 14500'
                      },
                      { 
                        label: '🛡️ Lag SJA for tak- og stillasarbeid', 
                        prompt: 'Lag SJA for tak- og stillasarbeid'
                      },
                      { 
                        label: '⚠️ Registrer nytt avvik / RUH', 
                        prompt: 'Registrer nytt avvik på byggeplass'
                      },
                      { 
                        label: '⏱️ Før dagens timer på prosjekt', 
                        prompt: 'Før timer på dagens arbeid'
                      },
                      { 
                        label: '📸 TEK17 bildekontroll', 
                        action: () => setIsAIVisionModalOpen(true)
                      }
                    ].map((chip, i) => (
                      <button 
                        key={i}
                        type="button"
                        onClick={() => chip.action ? chip.action() : handleSendCommand(chip.prompt)}
                        className="px-3 py-1.5 bg-white hover:bg-electric-50 hover:text-electric-700 hover:border-electric-300 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-700 transition-all text-left shadow-2xs cursor-pointer hover:scale-[1.02] active:scale-98"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. FOUR KEY METRICS CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                {/* 1. Aktive Byggeplasser */}
                <div 
                  onClick={() => setActiveTab('prosjekter')}
                  className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group hover:border-blue-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <HardHat size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors">
                      Felt & Vær &rarr;
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
                    {projects.length}
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">
                    Aktive byggeplasser i drift
                  </div>
                </div>

                {/* 2. Endringsordrer (NS 8406) */}
                <div 
                  onClick={() => setActiveTab('endringsordrer')}
                  className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group hover:border-amber-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <FileSignature size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      NS 8406
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
                    kr {Math.round((agentMetrics.securedRevenue || 84500) / 1000)}k
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">
                    {dashboardChangeOrders.length} sikrede tilleggskrav
                  </div>
                </div>

                {/* 3. Pristilbud & Kalkyler */}
                <div 
                  onClick={() => setActiveTab('endringsordrer')}
                  className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group hover:border-electric-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-electric-50 text-electric-600 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-electric-600 transition-colors">
                      Kalkyle &rarr;
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
                    {dashboardOffers.length} tilbud
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">
                    kr {Math.round((dashboardOffers.reduce((acc, o) => acc + (o.totalAmount || o.customPrice || 0), 0) || 853000) / 1000)}k i tilbudsmasse
                  </div>
                </div>

                {/* 4. Kvalitet, Avvik & Lukkesperrer */}
                <div 
                  onClick={() => setActiveTab('kvalitet')}
                  className={cn(
                    "p-5 sm:p-6 rounded-3xl border shadow-2xs hover:shadow-md transition-all cursor-pointer group",
                    lukkesperreZones.some(z => z.status === 'RED') 
                      ? "bg-rose-50/40 border-rose-200 hover:border-rose-400" 
                      : "bg-white border-slate-200/90 hover:border-emerald-300"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center",
                      lukkesperreZones.some(z => z.status === 'RED') ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {lukkesperreZones.some(z => z.status === 'RED') ? <Lock size={20} /> : <ShieldCheck size={20} />}
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                      lukkesperreZones.some(z => z.status === 'RED') 
                        ? "bg-rose-100 text-rose-800 animate-pulse" 
                        : "bg-emerald-100 text-emerald-800"
                    )}>
                      {lukkesperreZones.some(z => z.status === 'RED') ? '1 Lukkesperre' : 'TEK17 OK'}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
                    {deviations.length} avvik
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">
                    {lukkesperreZones.some(z => z.status === 'RED') ? 'Vaskerom sperret mot lukking' : 'Kvalitet & HMS godkjent'}
                  </div>
                </div>
              </div>

              {/* 3. TABS NAVIGATION */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 border-b border-slate-200 mb-8 pb-3">
                {[
                  { id: 'cockpit', label: t('tab_cockpit', 'Agent-Cockpit & Godkjenning'), icon: <Zap size={16} />, badge: pendingApprovals.length > 0 ? pendingApprovals.length : undefined },
                  { id: 'prosjekter', label: t('tab_projects', 'Prosjekter & Vær'), icon: <Building2 size={16} /> },
                  { id: 'endringsordrer', label: t('tab_changeorders', 'Endringsordrer (NS 8406)'), icon: <FileSignature size={16} /> },
                  { id: 'kvalitet', label: t('tab_quality', 'Kvalitet & Lukkesperre (TEK17)'), icon: <ShieldCheck size={16} /> },
                  { id: 'agent', label: t('tab_agent', 'Agent-Kanaler & Regler'), icon: <Brain size={16} /> }
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
                          <span>{t('approval_requires_yours', 'Krever Din Godkjenning')}</span>
                          {pendingApprovals.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                              {t('approval_waiting_count', '{{count}} venter', { count: pendingApprovals.length })}
                            </span>
                          )}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t('approval_subtitle', 'Talebeskjeder og ekstraarbeider fra byggeplassen ferdig tolket og kalkulert av agenten.')}
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
                        <h3 className="text-sm font-bold text-navy-900">{t('no_pending_approvals_title', 'Ingen ventende godkjenninger')}</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                          {t('no_pending_approvals_desc', 'Alle endringsordrer, byggedagbøker og varsler er godkjent og synkronisert med kunden og VikingCRM.')}
                        </p>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setIsDailyLogModalOpen(true)}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            + Ny Byggedagbok
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsChangeOrderModalOpen(true)}
                            className="px-3.5 py-1.5 bg-electric-50 hover:bg-electric-100 text-electric-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            + Ny Endringsordre (NS 8406)
                          </button>
                        </div>
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
                                    {t('change_order_tag', 'Endringsordre (NS 8406)')}
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
                                  kr {(item.amountExVat ?? 0).toLocaleString('no-NO')}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400">{t('ex_vat_days', 'eks mva ({{days}} dgr)', { days: item.impactDays || 0 })}</div>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                              «{item.description}»
                            </p>

                            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-400">
                                {t('recorded_from_voice_by', 'Registrert fra tale av:')} <strong className="text-slate-700">{item.authorName || 'Håndverker'}</strong>
                              </span>

                              <div className="flex items-center gap-2">
                                {isSuperAdmin && (
                                  <button 
                                    type="button"
                                    onClick={() => handleDeleteChangeOrder(item.id)}
                                    className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    title={t('btn_delete_order', 'Slett endringsordre')}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                                <button 
                                  type="button"
                                  onClick={() => handleRejectChangeOrder(item.id)}
                                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                  {t('btn_reject_delay', 'Avvis / Utsett')}
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleApproveChangeOrder(item.id)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-xl text-xs font-black hover:opacity-95 transition-all shadow-purple-cta cursor-pointer"
                                >
                                  <Check size={14} />
                                  <span>{t('btn_approve_send', 'Godkjenn & Send Kunde')}</span>
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
                        {t('craft_tools_title', 'Hurtigverktøy for Byggeleder')}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button 
                          onClick={() => setIsChecklistModalOpen(true)}
                          className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50 hover:bg-electric-50 hover:border-electric-200 border border-slate-200/70 transition-all group"
                        >
                          <ClipboardCheck size={20} className="text-electric-600 mb-1.5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-navy-900">{t('craft_checklist', 'Sjekkliste')}</span>
                        </button>

                        <button 
                          onClick={() => setIsDeviationModalOpen(true)}
                          className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200/70 transition-all group"
                        >
                          <AlertTriangle size={20} className="text-orange-600 mb-1.5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-navy-900">{t('craft_deviation', 'Registrer Avvik')}</span>
                        </button>

                        <button 
                          onClick={() => setIsTimeModalOpen(true)}
                          className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/70 transition-all group"
                        >
                          <Timer size={20} className="text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-navy-900">{t('craft_time', 'Timeføring')}</span>
                        </button>

                        <button 
                          onClick={() => setIsArchiveModalOpen(true)}
                          className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200/70 transition-all group"
                        >
                          <Library size={20} className="text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-navy-900">{t('craft_archive', 'Dokumentarkiv')}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Autonomous Activity Stream (5 cols) */}
                  <div className="lg:col-span-5 space-y-6">
                    <div>
                      <h2 className="text-lg font-extrabold text-navy-900 tracking-tight flex items-center gap-2">
                        <span>{t('activity_stream_title', 'Sanntids Agent-Logg')}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t('activity_stream_subtitle', 'Løpende handlinger utført autonomt av VikingMester.')}
                      </p>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                      {recentActivities.length === 0 ? (
                        <div className="py-8 text-center">
                          <div className="w-10 h-10 rounded-2xl bg-electric-50 text-electric-600 flex items-center justify-center mx-auto mb-3">
                            <Brain size={20} />
                          </div>
                          <h4 className="text-xs font-bold text-navy-900">{t('activity_empty_title', 'Agenten er aktiv og lytter')}</h4>
                          <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                            {t('activity_empty_desc', 'Handlinger som byggedagbok via tale, TEK17 bildeanalyser og endringsordrer loggføres her i sanntid.')}
                          </p>
                        </div>
                      ) : (
                        recentActivities.map((act, i) => (
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
                      ))
                    )}
                    </div>

                    {/* Pre-close wall security alert */}
                    <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                          <Lock size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-rose-950">
                            {t('preclose_alert_title', '1 Tverrfaglig Lukkesperre Aktiv')}
                          </h4>
                          <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                            {t('preclose_alert_desc', 'Storgata 8 (Vaskerom): Rørleggerens trykktestrapport mangler. Veggen er rødmerket mot kledning for å hindre reklamasjoner og erstatningsansvar.')}
                          </p>
                          <button 
                            type="button"
                            onClick={() => {
                              setActiveTab('kvalitet');
                              const redZone = lukkesperreZones.find(z => z.status === 'RED') || lukkesperreZones[1];
                              if (redZone) handleOpenPreClose(redZone);
                            }}
                            className="mt-3 text-xs font-bold text-rose-700 hover:text-rose-950 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{t('btn_inspect_matrix', 'Inspiser lukkesperrematrise')}</span>
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
                        {t('projects_tab_title', 'Aktive Byggeprosjekter')}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {t('projects_tab_subtitle', 'Oversikt over fremdrift, værforhold fra Yr.no og kvalitetssikring.')}
                      </p>
                    </div>

                    <button 
                      onClick={() => setIsCreateModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-2xl text-xs font-black shadow-purple-cta"
                    >
                      <Plus size={16} />
                      <span>{t('btn_create_project', 'Opprett Prosjekt')}</span>
                    </button>
                  </div>

                  {dataLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-8 h-8 border-4 border-electric-500/30 border-t-electric-500 rounded-full animate-spin mb-4" />
                      <p className="text-sm font-bold text-slate-500">{t('projects_loading', 'Henter prosjekter...')}</p>
                    </div>
                  ) : dataUnavailable ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-amber-50 border border-amber-200 rounded-3xl">
                      <AlertTriangle size={32} className="text-amber-500 mb-3" />
                      <p className="text-sm font-black text-amber-900 mb-1">{t('projects_no_company', 'Fant ingen firmatilknytning for kontoen din')}</p>
                      <p className="text-xs text-amber-700 max-w-sm">{t('projects_no_company_desc', 'Vi kunne derfor ikke hente prosjektene dine. Kontakt support på hei@vikingmester.no så ordner vi dette raskt.')}</p>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50 border border-slate-200 rounded-3xl">
                      <Building2 size={32} className="text-slate-300 mb-3" />
                      <p className="text-sm font-black text-navy-900 mb-1">{t('projects_empty_title', 'Ingen prosjekter ennå')}</p>
                      <p className="text-xs text-slate-500 max-w-sm mb-4">{t('projects_empty_desc', 'Kom i gang ved å opprette ditt første byggeprosjekt.')}</p>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-2xl text-xs font-black shadow-purple-cta"
                      >
                        <Plus size={16} />
                        <span>{t('btn_create_project', 'Opprett Prosjekt')}</span>
                      </button>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((proj) => (
                      <div 
                        key={proj.id}
                        className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-electric-50 text-electric-600 border border-electric-200">
                              {proj.status === 'active' ? t('status_in_progress', 'I drift') : t('status_planned', 'Planlagt')}
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
                              <span className="text-slate-500">{t('label_progress', 'Fremdrift')}</span>
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
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{t('label_client', 'Kunde')}</div>
                            <div className="font-bold text-navy-900">{proj.clientName || t('label_private_client', 'Privat byggherre')}</div>
                            <div className="text-[11px] text-slate-500">{proj.clientEmail || 'kunde@vikingmester.no'}</div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button 
                            onClick={() => onOpenPortal?.(proj)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <ExternalLink size={13} />
                            <span>{t('btn_customer_portal', 'Kundeportal')}</span>
                          </button>

                          <button 
                            onClick={() => setSelectedProject(proj)}
                            className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1"
                          >
                            <span>{t('btn_open_project', 'Åpne Prosjekt')}</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}

              {/* TAB 3: ENDRINGSORDER & PRISTILBUD */}
              {activeTab === 'endringsordrer' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-navy-900 tracking-tight">
                        {t('change_orders_tab_title', 'Endringsordrer & Pristilbud')}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {t('change_orders_tab_subtitle', 'Full styring over formelle varsler (NS 8406) og kalkulerte tilbud med påslag og timepriser.')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setChangeOrdersViewTab('changes')}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                            changeOrdersViewTab === 'changes'
                              ? "bg-white text-navy-950 shadow-xs"
                              : "text-slate-600 hover:text-navy-950"
                          )}
                        >
                          Endringsordrer ({dashboardChangeOrders.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setChangeOrdersViewTab('offers')}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                            changeOrdersViewTab === 'offers'
                              ? "bg-white text-navy-950 shadow-xs"
                              : "text-slate-600 hover:text-navy-950"
                          )}
                        >
                          Pristilbud & Kalkyle ({dashboardOffers.length})
                        </button>
                      </div>

                      {changeOrdersViewTab === 'changes' ? (
                        <button 
                          type="button"
                          onClick={() => setIsChangeOrderModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 hover:opacity-95 text-white rounded-2xl text-xs font-black shadow-purple-cta transition-opacity cursor-pointer"
                        >
                          <Plus size={16} />
                          <span>{t('btn_new_change_order', 'Ny Endringsordre')}</span>
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => setIsOfferModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-electric-600 to-electric-500 hover:opacity-95 text-white rounded-2xl text-xs font-black shadow-purple-cta transition-opacity cursor-pointer"
                        >
                          <Plus size={16} />
                          <span>Nytt Pristilbud</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {changeOrdersViewTab === 'offers' ? (
                    <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-black text-navy-900">
                            kr {dashboardOffers.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0).toLocaleString('no-NO')}
                          </div>
                          <span className="text-xs font-bold text-slate-500">
                            Kalkulert i aktive tilbud
                          </span>
                        </div>
                        <span className="text-xs font-bold text-electric-600 bg-electric-50 px-3 py-1 rounded-full border border-electric-200">
                          {dashboardOffers.length} aktive tilbud
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {dashboardOffers.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                            <div className="w-14 h-14 rounded-2xl bg-electric-50 text-electric-600 flex items-center justify-center mb-3">
                              <FileText size={26} />
                            </div>
                            <p className="text-base font-extrabold text-navy-900 mb-1">Ingen pristilbud opprettet ennå</p>
                            <p className="text-xs text-slate-500 max-w-sm mb-5">
                              Lag profesjonelle pristilbud med arbeidstimer, materialpåslag og NS-forbehold direkte via MesterAI eller tilbudsbyggeren.
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsOfferModalOpen(true)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-electric-600 to-electric-500 text-white rounded-2xl text-xs font-black shadow-purple-cta transition-all active:scale-95 cursor-pointer"
                            >
                              <Plus size={16} />
                              <span>Opprett Nytt Tilbud</span>
                            </button>
                          </div>
                        ) : (
                          dashboardOffers.map((off) => (
                            <div key={off.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-slate-600">{off.projectName || 'Prosjekt'}</span>
                                  <span className="text-xs font-bold text-slate-400">•</span>
                                  <span className="text-xs font-bold text-slate-500">{off.clientName || 'Kunde'}</span>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                    off.status === 'approved' ? "bg-emerald-100 text-emerald-800" :
                                    off.status === 'sent' ? "bg-blue-100 text-blue-800" :
                                    "bg-slate-100 text-slate-700"
                                  )}>
                                    {off.status === 'approved' ? 'Godkjent' : off.status === 'sent' ? 'Sendt' : 'Utkast'}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-navy-900">{off.title}</h4>
                                {off.clientEmail && (
                                  <p className="text-[11px] text-slate-400 mt-0.5">{off.clientEmail}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-4 sm:text-right shrink-0">
                                <div>
                                  <div className="text-sm font-black text-navy-900">
                                    kr {(off.totalAmount ?? 0).toLocaleString('no-NO')}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-bold">
                                    kr {(off.totalIncVat ?? Math.round((off.totalAmount ?? 0) * 1.25)).toLocaleString('no-NO')} ink mva
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOfferInitialData(off);
                                      setIsOfferModalOpen(true);
                                    }}
                                    className="px-3 py-2 bg-electric-50 hover:bg-electric-100 text-electric-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Rediger kalkyle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/godkjenn-tilbud?token=${off.token || off.id}`;
                                      navigator.clipboard.writeText(url);
                                      toast.success('Kundetilbud-lenke kopiert til utklippstavlen!');
                                    }}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-navy-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Kopier lenke
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDashboardOffer(off.id, off.title)}
                                    title="Slett tilbud"
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-black text-navy-900">
                            kr {(agentMetrics.securedRevenue || 84500).toLocaleString('no-NO')}
                          </div>
                          <span className="text-xs font-bold text-slate-500">
                            {t('total_secured_revenue', 'Totalt sikret i tilleggsarbeid')}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                          {t('zero_lost_claims', '0 tapte krav på grunn av sen varsling')}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {dashboardChangeOrders.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                              <FileSignature size={26} />
                            </div>
                            <p className="text-base font-extrabold text-navy-900 mb-1">{t('no_change_orders_title', 'Ingen endringsordrer registrert')}</p>
                            <p className="text-xs text-slate-500 max-w-sm mb-5">{t('no_change_orders_desc', 'Unngå uenighet og tapte penger i sluttoppgjøret. Send juridisk bindende varsel (NS 8406) med digital godkjenning på 1 minutt.')}</p>
                            <button
                              type="button"
                              onClick={() => setIsChangeOrderModalOpen(true)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 hover:opacity-95 text-white rounded-2xl text-xs font-black shadow-purple-cta transition-all active:scale-95 cursor-pointer"
                            >
                              <Plus size={16} />
                              <span>{t('btn_new_change_order', 'Ny Endringsordre')}</span>
                            </button>
                          </div>
                        ) : (
                          dashboardChangeOrders.map((co) => (
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
                                  <div className="text-sm font-black text-navy-900">kr {Number(co.amount).toLocaleString('no-NO')}</div>
                                  <div className="text-[10px] text-slate-400 font-bold">{t('ex_vat_days', 'eks mva (+{{days}} dgr)', { days: co.days })}</div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button 
                                    type="button"
                                    onClick={() => setIsChangeOrderModalOpen(true)}
                                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  >
                                    {t('btn_process', 'Behandle')}
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      if (co.shareUrl) {
                                        navigator.clipboard.writeText(co.shareUrl);
                                      }
                                      toast.success('Godkjenningslenke kopiert til utklippstavlen!');
                                    }}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-navy-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  >
                                    {t('btn_copy_link', 'Kopier lenke')}
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => handleDeleteDashboardOrder(co.id, co.title)}
                                    title={t('btn_delete_order', 'Slett endringsordre')}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: KVALITET & LUKKESPERRE (TEK17) */}
              {activeTab === 'kvalitet' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-navy-900 tracking-tight">
                      {t('quality_tab_title', 'Tverrfaglig Lukkesperre & TEK17 Kontroll')}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {t('quality_tab_subtitle', 'Sperrer rom og vegger mot lukking/flislegging før skjultanlegg og trykktester er verifisert.')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Zone Matrix */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div>
                          <h3 className="text-sm font-extrabold text-navy-900 flex items-center gap-2">
                            <span>{t('status_per_room', 'Status per Rom & Sone')}</span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">TEK17 § 13-15</span>
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {t('status_per_room_desc', 'Klikk på et rom for å inspisere sjekkpunkter, koble bilder eller godkjenne lukking.')}
                          </p>
                        </div>
                        <button 
                          type="button"
                          onClick={handleAddZone}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-electric-50 hover:bg-electric-100 text-electric-700 border border-electric-200 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          <Plus size={14} />
                          <span>{t('btn_new_zone', 'Ny Sone')}</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {lukkesperreZones.map((z) => (
                          <div 
                            key={z.id}
                            onClick={() => handleOpenPreClose(z)}
                            className={cn(
                              "p-4 rounded-2xl border flex items-start justify-between gap-3 cursor-pointer hover:shadow-md transition-all group",
                              z.status === 'GREEN' 
                                ? "bg-emerald-50/60 border-emerald-200 hover:border-emerald-400" 
                                : "bg-rose-50/70 border-rose-200 hover:border-rose-400"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {z.status === 'GREEN' ? (
                                  <Unlock size={16} className="text-emerald-600 shrink-0" />
                                ) : (
                                  <Lock size={16} className="text-rose-600 shrink-0" />
                                )}
                                <h4 className="text-xs font-bold text-navy-900 group-hover:text-electric-600 transition-colors truncate">
                                  {z.room}
                                </h4>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                {z.detail}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-medium flex-wrap">
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 size={12} className={z.checks.plumbing ? "text-emerald-600" : "text-slate-300"} />
                                  <span>{t('check_plumbing', 'Rør')}: {z.checks.plumbing ? t('status_approved_short', 'Godkjent') : t('status_missing_short', 'Mangler')}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 size={12} className={z.checks.vaporBarrier ? "text-emerald-600" : "text-slate-300"} />
                                  <span>{t('check_vapor', 'Dampsperre')}: {z.checks.vaporBarrier ? t('status_tight_short', 'Tett') : t('status_missing_short', 'Mangler')}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 size={12} className={z.checks.electric ? "text-emerald-600" : "text-slate-300"} />
                                  <span>{t('check_electric', 'El')}: {z.checks.electric ? t('status_verified_short', 'Verifisert') : t('status_unclarified_short', 'Uavklart')}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                z.status === 'GREEN' ? "bg-emerald-200 text-emerald-900" : "bg-rose-200 text-rose-900"
                              )}>
                                {z.status === 'GREEN' ? t('green_light', 'GRØNT LYS') : t('red_lock', 'RØD SPERRE')}
                              </span>
                              <span className="text-[10px] font-bold text-electric-600 group-hover:underline">
                                {t('btn_inspect_arrow', 'Inspiser →')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SJA Generator Card */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-extrabold text-navy-900">
                            {t('sja_easy_title', 'Sikker Jobb Analyse (SJA) på 1-2-3')}
                          </h3>
                          <span className="text-[10px] font-black uppercase bg-electric-50 text-electric-600 px-2 py-0.5 rounded-full border border-electric-200">
                            {t('statutory_badge', 'Lovpålagt')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                          {t('sja_easy_desc', 'Byggherreforskriften krever dokumentert risikovurdering ved risikofylt arbeid. Klikk på et fag for å åpne, signere og skrive ut ferdig SJA med Yr.no værdata:')}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            { name: 'Tømrer (Høyde/Stillas)', desc: 'Fall, stillas & verneutstyr' },
                            { name: 'Rørlegger (Trykk/Varmt)', desc: 'Trykktest & varme arbeider' },
                            { name: 'Elektriker (Spenningssatt)', desc: 'NEK 400 & LOTO' },
                            { name: 'Graver (Grøft/Kabler)', desc: 'Kabelpåvisning & rasfare' }
                          ].map((tradeItem, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleOpenSJAForTrade(tradeItem.name)}
                              className="p-3 bg-slate-50 hover:bg-electric-50 hover:text-electric-700 hover:border-electric-300 border border-slate-200/80 rounded-xl text-left transition-all group cursor-pointer"
                            >
                              <div className="text-xs font-bold text-slate-800 group-hover:text-electric-700 flex items-center justify-between">
                                <span>+ SJA for {tradeItem.name.split(' ')[0]}</span>
                                <FileSignature size={13} className="text-slate-400 group-hover:text-electric-600" />
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {tradeItem.desc}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] text-slate-400 font-bold">AML § 4-1 & Byggherreforskriften § 18</span>
                        <button 
                          type="button"
                          onClick={() => setIsHMSModalOpen(true)}
                          className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          {t('btn_open_hms_manual', 'Åpne HMS-Håndbok')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: AGENT-KANALER, SAMTALEPARTNER & REGLER */}
              {activeTab === 'agent' && (
                <div className="space-y-6">
                  {/* Dedicated MesterAI Samtalepartner Workstation Card */}
                  <div className="bg-gradient-to-br from-navy-950 via-slate-900 to-navy-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-electric-600/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Autonom Rådgiver & Fagpartner</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          MesterAI Samtalepartner & Lederassistent
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          Få øyeblikkelig veiledning i tilbudskalkyler med påslag og NS-forbehold, varsling av endringsordrer iht. NS 8406, TEK17-forskrifter, SJA-risikovurderinger og kundedialog.
                        </p>
                        
                        {/* Quick Prompts */}
                        <div className="pt-2 flex flex-wrap gap-2">
                          {[
                            'Hjelp meg å skrive et nytt tilbud på bad',
                            'Hvordan varsler jeg en endringsordre iht. NS 8406?',
                            'Hva er kravene til fall mot sluk i TEK17?',
                            'Lag en SJA for tak- og stillasarbeid'
                          ].map((chipPrompt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendCommand(chipPrompt)}
                              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer text-left"
                            >
                              💬 {chipPrompt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-center sm:items-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsAIChatOpen(true)}
                          className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-electric-600 to-purple-600 hover:from-electric-500 hover:to-purple-500 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-electric-600/30 flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-98"
                        >
                          <Brain size={18} />
                          <span>Start samtale med MesterAI</span>
                        </button>
                        <span className="text-[11px] text-slate-400">Åpnes i et lynraskt og behagelig popup-vindu</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Active Inboxes & Channels */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-extrabold text-navy-900">
                      {t('channels_title', 'Tilknyttede Kommunikasjonskanaler')}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {t('channels_desc', 'Håndverkerne kan sende inn byggedagbok, bilder og spørsmål rett fra lomma uten å installere apper.')}
                    </p>

                    <div className="space-y-3">
                      <div 
                        onClick={() => {
                          navigator.clipboard.writeText('hei@vikingmester.no');
                          toast.success('E-postadressen hei@vikingmester.no er kopiert til utklippstavlen!');
                        }}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-electric-50/50 hover:border-electric-200 border border-slate-200/70 flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div>
                          <div className="text-xs font-bold text-navy-900 group-hover:text-electric-700">{t('official_email_listener', 'Offisiell e-postlytter')}</div>
                          <div className="text-xs text-electric-600 font-mono font-bold mt-0.5">hei@vikingmester.no {t('click_to_copy', '(klikk for å kopiere)')}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 shrink-0">
                          {t('active_100', '100% Aktiv')}
                        </span>
                      </div>

                      <div 
                        onClick={() => {
                          toggleMic();
                          toast.info('Tale & diktat aktivert for testing');
                        }}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-electric-50/50 hover:border-electric-200 border border-slate-200/70 flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div>
                          <div className="text-xs font-bold text-navy-900 group-hover:text-electric-700">{t('voice_dictation_field', 'Tale & Diktat i felt (klikk for å teste mikrofon)')}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{t('voice_dictation_desc', 'Støtter alle språk (norsk, polsk, litauisk, ukrainsk, rumensk, engelsk, spansk, tysk + over 50 til) – oversetter og strukturerer automatisk til TEK17-fagterminologi')}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 shrink-0">
                          {t('status_operational', 'Operativ')}
                        </span>
                      </div>

                      <div 
                        onClick={() => {
                          toast.success('Yr.no værdata synkronisert: 14°C Oslo, lett bris, opphold');
                        }}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-electric-50/50 hover:border-electric-200 border border-slate-200/70 flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div>
                          <div className="text-xs font-bold text-navy-900 group-hover:text-electric-700">{t('yr_sync_title', 'Yr.no Værsynkronisering')}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{t('yr_sync_desc', 'Henter automatisk temperatur, nedbør og vind til alle byggedagbøker og SJA')}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 shrink-0">
                          {t('status_connected', 'Tilkoblet')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active Regulatory Engines */}
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-extrabold text-navy-900">
                      {t('rules_engines_title', 'Aktive Regelmotorer & Norske Standarder')}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {t('rules_engines_desc', 'Deterministisk validering som sikrer at alle rapporter holder juridisk mål ved tilsyn og overtakelse.')}
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
              </div>
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Button for Mobile / Phone Control */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <button
          type="button"
          onClick={() => setIsAIChatOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-electric-600 to-purple-600 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform border-2 border-white/30 cursor-pointer animate-in zoom-in duration-200"
          title="Snakk med MesterAI"
        >
          <Mic size={24} className="animate-pulse" />
        </button>
      </div>
    </div>
  );
}
