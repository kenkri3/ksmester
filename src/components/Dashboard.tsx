import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Users, 
  ClipboardCheck, 
  AlertTriangle, 
  Plus, 
  Zap,
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
  Copy
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Project, Deviation, UserProfile, ProjectMaterial, InventoryItem, Offer } from '../types';
import { db, auth, collection, onSnapshot, query, orderBy, where, getDocs, OperationType, handleFirestoreError, getUserProfile, updateUserProfile } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { dashboardAiService, DashboardInsight } from '../services/dashboardAiService';
import { TrendingUp as TrendingIcon, Cloud, Sun, CloudRain, CloudSnow, Wind, CloudLightning, FileText as FileIcon, BarChart3 as ChartIcon, Settings2, Sparkles } from 'lucide-react';
import { weatherService, WeatherData } from '../services/weatherService';
import { fdvService, FDVDocument } from '../services/fdvService';
import { deviationAiService, DeviationAnalysis } from '../services/deviationAiService';
import { reportService, ExecutiveSummary } from '../services/reportService';
import { resourceService, ResourceEstimation } from '../services/resourceService';
import AiReportModal from './AiReportModal';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';
import UniversalTranslator from './UniversalTranslator';
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
import ApprenticeModule from './ApprenticeModule';
import IntegrationModal from './IntegrationModal';
import HandoverModal from './HandoverModal';
import InventoryModal from './InventoryModal';
import VehicleModal from './VehicleModal';
import HMSModal from './HMSModal';
import HMSModule from './HMSModule';
import ProjectDetails from './ProjectDetails';
import SmartSearch from './SmartSearch';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Dashboard({ 
  isDemo = false, 
  onOpenPortal,
  initialTab = 'oversikt',
  onTabChange
}: { 
  isDemo?: boolean, 
  onOpenPortal?: (project: Project) => void,
  initialTab?: 'oversikt' | 'prosjekter' | 'tilbud' | 'avvik' | 'ai' | 'finans' | 'laerling' | 'hms',
  onTabChange?: (tab: string) => void
}) {
  const { t, i18n } = useTranslation();
  const { user, companyModules } = useAuth();
  const { projects, deviations, stats, loading } = useDashboardData();
  const [activeTab, setActiveTab] = useState<'oversikt' | 'prosjekter' | 'tilbud' | 'avvik' | 'ai' | 'finans' | 'laerling' | 'hms'>(initialTab);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSelect = (tab: any) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerSearchTerm, setOfferSearchTerm] = useState('');
  const debouncedOfferSearch = useDebounce(offerSearchTerm, 300);
  const [offerStatusFilter, setOfferStatusFilter] = useState<string>('alle');
  const [isActivityLogModalOpen, setIsActivityLogModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeviationModalOpen, setIsDeviationModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [checklistProjectId, setChecklistProjectId] = useState<string | undefined>(undefined);
  const [isAIVisionModalOpen, setIsAIVisionModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerInitialData, setOfferInitialData] = useState<any>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isBuildingAppModalOpen, setIsBuildingAppModalOpen] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverProjectId, setHandoverProjectId] = useState<string | undefined>(undefined);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isHMSModalOpen, setIsHMSModalOpen] = useState(false);
  const [isSmartSearchOpen, setIsSmartSearchOpen] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const debouncedProjectSearch = useDebounce(projectSearchTerm, 300);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deviationAnalysis, setDeviationAnalysis] = useState<DeviationAnalysis | null>(null);
  const [aiInsights, setAiInsights] = useState<DashboardInsight[]>([]);
  const [inventoryStats, setInventoryStats] = useState({ total: 0, lowStock: 0 });
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);

  useEffect(() => {
    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as InventoryItem);
      setInventoryItems(items);
      setInventoryStats({
        total: items.length,
        lowStock: items.filter((item: any) => item.minQuantity && item.quantity < item.minQuantity).length
      });
    });

    const unsubMaterials = onSnapshot(collection(db, 'project_materials'), (snapshot) => {
      setMaterials(snapshot.docs.map(doc => doc.data() as ProjectMaterial));
    });

    const unsubOffers = onSnapshot(query(collection(db, 'offers'), orderBy('createdAt', 'desc')), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
      setOffers(list);
    }, (err) => console.error("Offers subscription error:", err));

    return () => {
      unsubInventory();
      unsubMaterials();
      unsubOffers();
    };
  }, []);
  const [projectAnalysis, setProjectAnalysis] = useState<any>(null);
  const [isAiReportOpen, setIsAiReportOpen] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportType, setReportType] = useState<string>('');
  const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<ExecutiveSummary | null>(null);
  const [fdvData, setFdvData] = useState<FDVDocument[] | null>(null);
  const [reportProjectName, setReportProjectName] = useState<string>('');
  const [automationSettings, setAutomationSettings] = useState([
    { id: 'fdv', label: 'Automatisk FDV-generering', desc: 'Henter dokumentasjon fra leverandører automatisk.', active: true },
    { id: 'ruh', label: 'AI-drevet RUH-klassifisering', desc: 'Kategoriserer avvik basert på bilder og tekst.', active: true },
    { id: 'report', label: 'Ukentlig leder-rapport', desc: 'Genererer oppsummering til daglig leder hver fredag.', active: false },
    { id: 'safety', label: 'Sikkerhetsvarsling', desc: 'Varsler ved mønstre som tyder på økt risiko.', active: true },
  ]);

  const toggleAutomation = (id: string) => {
    setAutomationSettings(prev => prev.map(item => 
      item.id === id ? { ...item, active: !item.active } : item
    ));
  };

  const handleAnalyzeDeviations = async () => {
    setIsReportLoading(true);
    setReportType('deviation_analysis');
    setIsAiReportModalOpen(true);
    try {
      const analysis = await deviationAiService.analyzeDeviations(deviations);
      setDeviationAnalysis(analysis);
    } catch (error) {
      console.error("Failed to analyze deviations:", error);
    } finally {
      setIsReportLoading(false);
    }
  };
  const handleAnalyzeProject = async (project: Project) => {
    setIsReportLoading(true);
    setReportType('project_analysis');
    setReportProjectName(project.name);
    setIsAiReportModalOpen(true);
    try {
      // Fetch time entries for the project (simulated for now or fetch from Firestore)
      // In a real app, we'd query the 'time_entries' collection
      const timeEntries: any[] = []; 
      
      const materialsQuery = query(
        collection(db, 'project_materials'),
        where('projectId', '==', project.id)
      );
      const materialsSnapshot = await getDocs(materialsQuery);
      const materials = materialsSnapshot.docs.map(doc => doc.data() as ProjectMaterial);
      
      const analysis = await dashboardAiService.analyzeProjectHealth(project, deviations.filter(d => d.projectId === project.id), timeEntries, materials);
      setProjectAnalysis(analysis);
    } catch (error) {
      console.error("Failed to analyze project:", error);
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleGenerateWeeklyReport = async () => {
    setIsReportLoading(true);
    setReportType('weekly_report');
    setIsAiReportModalOpen(true);
    try {
      const data = await reportService.generateWeeklyReport(projects, deviations);
      setReportData(data);
    } catch (error) {
      console.error("Failed to generate weekly report:", error);
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleGenerateFDV = async (project: Project) => {
    setIsReportLoading(true);
    setReportType('fdv');
    setReportProjectName(project.name);
    setIsAiReportModalOpen(true);
    try {
      const materialsQuery = query(
        collection(db, 'project_materials'),
        where('projectId', '==', project.id)
      );
      const materialsSnapshot = await getDocs(materialsQuery);
      const materials = materialsSnapshot.docs.map(doc => doc.data() as ProjectMaterial);

      const data = await fdvService.generateFDV(project, materials);
      setFdvData(data);
    } catch (error) {
      console.error("Failed to generate FDV:", error);
    } finally {
      setIsReportLoading(false);
    }
  };

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [projectWeather, setProjectWeather] = useState<Record<string, WeatherData>>({});
  
  const lifecycleStages = [
    { id: 'offer', label: t('phase_offer', 'Tilbud'), icon: <Calculator size={16} />, color: 'bg-blue-500' },
    { id: 'contract', label: t('phase_contract', 'Kontrakt'), icon: <FileSignature size={16} />, color: 'bg-indigo-500' },
    { id: 'active', label: t('phase_execution', 'Gjennomføring'), icon: <HardHat size={16} />, color: 'bg-emerald-500' },
    { id: 'completion', label: t('phase_handover', 'Overlevering'), icon: <CheckCircle2 size={16} />, color: 'bg-rose-500' },
    { id: 'archived', label: t('phase_archive', 'Arkiv'), icon: <Library size={16} />, color: 'bg-neutral-500' },
  ];

  const actionGroups = [
    {
      title: t('group_planning_sales', 'Planlegging & Salg'),
      actions: [
        { id: 'new_project', label: t('new_project', 'Nytt Prosjekt'), icon: <Plus size={18} />, color: 'bg-blue-600', module: 'projects' },
        { id: 'offers', label: t('create_offer', 'Opprett Tilbud'), icon: <Calculator size={18} />, color: 'bg-blue-600', module: 'economy' },
        { id: 'contracts', label: t('contracts', 'Kontrakter'), icon: <FileSignature size={18} />, color: 'bg-blue-600', module: 'economy' },
        { id: 'building_app', label: t('building_application', 'Byggesøknad'), icon: <Building2 size={18} />, color: 'bg-blue-600', module: 'building_app' },
      ]
    },
    {
      title: t('group_daily_operations', 'Daglig Drift'),
      actions: [
        { id: 'start_checklist', label: t('ks_hms_checklist', 'KS/HMS Sjekkliste'), icon: <ListChecks size={18} />, color: 'bg-emerald-600', module: 'checklists' },
        { id: 'hms', label: t('hms_crew', 'HMS & Mannskap'), icon: <ShieldCheck size={18} />, color: 'bg-emerald-600', module: 'checklists' },
        { id: 'log_deviation', label: t('log_deviation_ruh', 'Logg Avvik/RUH'), icon: <AlertTriangle size={18} />, color: 'bg-orange-600', module: 'deviations' },
        { id: 'take_photo', label: t('ai_vision_control', 'AI Vision Kontroll'), icon: <Camera size={18} />, color: 'bg-rose-600', module: 'ai' },
        { id: 'apprentice', label: t('apprentice_module', 'Lærlingmodul'), icon: <GraduationCap size={18} />, color: 'bg-emerald-600', module: 'apprentice' },
      ]
    },
    {
      title: t('group_automation_doc', 'Automatisering & Dokumentasjon'),
      actions: [
        { id: 'ai_analysis', label: t('ai_analysis', 'AI Analyse'), icon: <Brain size={18} />, color: 'bg-neutral-900', module: 'ai' },
        { id: 'library', label: t('fdv_archive', 'FDV Arkiv'), icon: <Library size={18} />, color: 'bg-neutral-900', module: 'fdv' },
        { id: 'integrations', label: t('integrations', 'Integrasjoner'), icon: <RefreshCw size={18} />, color: 'bg-neutral-900', module: 'fdv' },
        { id: 'handover', label: t('handover_fdv', 'Overlevering / FDV'), icon: <CheckCircle2 size={18} />, color: 'bg-neutral-900', module: 'fdv' },
        { id: 'inventory', label: t('inventory_module', 'Lager & Verktøy'), icon: <Package size={18} />, color: 'bg-neutral-900', module: 'inventory' },
        { id: 'vehicle', label: t('vehicle_module', 'Kjørebok'), icon: <Car size={18} />, color: 'bg-neutral-900', module: 'vehicle' },
        { id: 'time_registration', label: t('time_registration', 'Timeføring'), icon: <Timer size={18} />, color: 'bg-neutral-900', module: 'time' },
      ]
    }
  ].map(group => ({
    ...group,
    actions: group.actions.filter(action => !companyModules || companyModules.includes(action.module))
  })).filter(group => group.actions.length > 0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
        } else {
          const newProfile: UserProfile = {
            id: user.uid,
            name: user.displayName || 'Anonym',
            email: user.email || '',
            role: 'admin',
            companyId: 'demo-company',
            companyName: 'Demo Entreprenør AS'
          };
          await updateUserProfile(user.uid, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || projects.length === 0) return;

    const fetchWeatherAndInsights = async () => {
      setIsAiLoading(true);
      try {
        // Fetch weather for all projects
        const weatherMap: Record<string, WeatherData> = {};
        await Promise.all(projects.map(async (p) => {
          try {
            const w = await weatherService.getWeather(p.location);
            weatherMap[p.id] = w;
          } catch (e) {
            console.error(`Failed to fetch weather for ${p.location}`, e);
          }
        }));
        setProjectWeather(weatherMap);

        // Generate insights with weather and inventory context
        const insights = await dashboardAiService.generateInsights(projects, deviations, weatherMap, inventoryItems, i18n.language);
        if (insights && insights.length > 0) {
          setAiInsights(insights);
        }
      } catch (error) {
        console.error("Failed to fetch AI insights:", error);
      } finally {
        setIsAiLoading(false);
      }
    };

    fetchWeatherAndInsights();
  }, [projects, deviations, loading, inventoryItems]);

  const getInsightIcon = (iconName?: string, type?: string) => {
    switch (iconName) {
      case 'alert': return <AlertTriangle className="text-orange-600" size={20} />;
      case 'zap': return <Zap className="text-blue-600" size={20} />;
      case 'camera': return <Camera className="text-rose-600" size={20} />;
      case 'check': return <CheckCircle2 className="text-emerald-600" size={20} />;
      case 'trending': return <TrendingIcon className="text-indigo-600" size={20} />;
      case 'cloud': return <Cloud className="text-blue-500" size={20} />;
      default: 
        if (type === 'predictive') return <Brain className="text-purple-600" size={20} />;
        return type === 'warning' 
          ? <AlertTriangle className="text-orange-600" size={20} />
          : <Zap className="text-blue-600" size={20} />;
    }
  };

  const getWeatherIcon = (iconName?: string) => {
    switch (iconName) {
      case 'sun': return <Sun size={14} className="text-amber-500" />;
      case 'rain': return <CloudRain size={14} className="text-blue-500" />;
      case 'snow': return <CloudSnow size={14} className="text-sky-400" />;
      case 'wind': return <Wind size={14} className="text-neutral-400" />;
      case 'cloud-lightning': return <CloudLightning size={14} className="text-purple-500" />;
      default: return <Cloud size={14} className="text-neutral-400" />;
    }
  };

  const isActionVisible = (actionId: string) => {
    if (!userProfile) return true;
    if (userProfile.industry === 'general' || !userProfile.industry) return true;
    
    // Define which actions are "core" and which are "industry-specific"
    const coreActions = ['new_project', 'start_checklist', 'hms', 'log_deviation', 'take_photo', 'library', 'time_registration'];
    
    // If the user has explicitly ordered modules, check them
    if (userProfile.modules && userProfile.modules.length > 0) {
      return userProfile.modules.includes(actionId) || coreActions.includes(actionId);
    }
    
    // Otherwise, filter based on industry defaults
    const industryDefaults: Record<string, string[]> = {
      'carpenter': ['offers', 'contracts', 'inventory', 'vehicle', 'apprentice'],
      'plumber': ['offers', 'contracts', 'inventory', 'vehicle', 'apprentice'],
      'electrician': ['offers', 'contracts', 'inventory', 'vehicle', 'apprentice'],
      'mason': ['offers', 'contracts', 'inventory', 'vehicle'],
      'painter': ['offers', 'contracts', 'inventory'],
    };

    const allowed = industryDefaults[userProfile.industry] || [];
    return coreActions.includes(actionId) || allowed.includes(actionId);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSmartSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSmartNavigate = (type: string, id?: string) => {
    if (type === 'project' && id) {
      const p = projects.find(p => p.id === id);
      if (p) setSelectedProject(p);
    } else if (type === 'create_deviation') {
      setIsDeviationModalOpen(true);
    } else if (type === 'start_checklist') {
      setIsChecklistModalOpen(true);
      if (id) setChecklistProjectId(id);
    }
  };

  const handleQuickAction = (id: string) => {
    switch (id) {
      case 'new_project':
        setIsCreateModalOpen(true);
        break;
      case 'offers':
        setIsOfferModalOpen(true);
        break;
      case 'contracts':
        setIsContractModalOpen(true);
        break;
      case 'library':
        setIsArchiveModalOpen(true);
        break;
      case 'time_registration':
        setIsTimeModalOpen(true);
        break;
      case 'building_app':
        setIsBuildingAppModalOpen(true);
        break;
      case 'apprentice':
        setActiveTab('laerling');
        break;
      case 'integrations':
        setIsIntegrationModalOpen(true);
        break;
      case 'handover':
        setIsHandoverModalOpen(true);
        break;
      case 'inventory':
        setIsInventoryModalOpen(true);
        break;
      case 'vehicle':
        setIsVehicleModalOpen(true);
        break;
      case 'hms':
        setIsHMSModalOpen(true);
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
      case 'ai_analysis':
        setActiveTab('ai');
        break;
      case 'prosjekter':
        setActiveTab('prosjekter');
        break;
      case 'avvik':
        setActiveTab('avvik');
        break;
      default:
        console.log('Action not implemented:', id);
    }
  };

  useEffect(() => {
    const handleTrigger = (e: any) => {
      if (e.detail?.actionId) {
        handleQuickAction(e.detail.actionId);
      }
    };
    window.addEventListener('trigger_dashboard_action', handleTrigger);
    return () => window.removeEventListener('trigger_dashboard_action', handleTrigger);
  }, []);

  // Memoized derived data to prevent unnecessary recalculations on re-renders
  const memoizedOfferStats = useMemo(() => {
    const draft = offers.filter(o => o.status === 'draft');
    const sent = offers.filter(o => o.status === 'sent');
    const accepted = offers.filter(o => o.status === 'accepted');

    return {
      draft: {
        count: draft.length,
        sum: draft.reduce((s, o) => s + (o.totalAmount || 0), 0)
      },
      sent: {
        count: sent.length,
        sum: sent.reduce((s, o) => s + (o.totalAmount || 0), 0)
      },
      accepted: {
        count: accepted.length,
        sum: accepted.reduce((s, o) => s + (o.totalAmount || 0), 0)
      }
    };
  }, [offers]);

  // ⚡ Bolt: Debounce search input to reduce recalculations while typing
  // Move .toLowerCase() outside the filter loop to avoid O(N) redundant string conversions
  const filteredOffersList = useMemo(() => {
    const searchLower = debouncedOfferSearch.toLowerCase();
    return offers.filter(offer => {
      const matchesSearch = !searchLower ||
        (offer.title && offer.title.toLowerCase().includes(searchLower)) ||
        (offer.clientName && offer.clientName.toLowerCase().includes(searchLower)) ||
        (offer.projectCode && offer.projectCode.toLowerCase().includes(searchLower));
      const matchesStatus = offerStatusFilter === 'alle' || offer.status === offerStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [offers, debouncedOfferSearch, offerStatusFilter]);

  // ⚡ Bolt: Debounce search input to prevent rapid list re-renders
  // Pre-compute .toLowerCase() outside the mapping iteration
  const filteredProjectsList = useMemo(() => {
    const searchLower = debouncedProjectSearch.toLowerCase();
    if (!searchLower) return projects;
    return projects.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.projectCode?.toLowerCase().includes(searchLower) ||
      p.location.toLowerCase().includes(searchLower)
    );
  }, [projects, debouncedProjectSearch]);

  const memoizedStageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => {
      if (p.stage) {
        counts[p.stage] = (counts[p.stage] || 0) + 1;
      }
    });
    return counts;
  }, [projects]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AiReportModal 
        isOpen={isAiReportModalOpen}
        onClose={() => setIsAiReportModalOpen(false)}
        type={reportType as any}
        reportData={reportData || undefined}
        fdvData={fdvData || undefined}
        deviationData={deviationAnalysis || undefined}
        analysisData={projectAnalysis || undefined}
        projectName={reportProjectName}
        isLoading={isReportLoading}
      />
      <ActivityLogModal 
        isOpen={isActivityLogModalOpen}
        onClose={() => setIsActivityLogModalOpen(false)}
        projectId={projects[0]?.id}
      />
      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <CreateDeviationModal 
        isOpen={isDeviationModalOpen} 
        onClose={() => setIsDeviationModalOpen(false)} 
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
      />
      <ChecklistModal 
        isOpen={isChecklistModalOpen} 
        onClose={() => setIsChecklistModalOpen(false)} 
        projectId={checklistProjectId}
        initialTrade={userProfile?.trade}
      />
      <AIVisionModal 
        isOpen={isAIVisionModalOpen} 
        onClose={() => setIsAIVisionModalOpen(false)} 
        projectId={selectedProject?.id}
        projectName={selectedProject?.name}
      />
      <OfferModal 
        isOpen={isOfferModalOpen} 
        onClose={() => setIsOfferModalOpen(false)} 
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
        onClose={() => {
          setIsHandoverModalOpen(false);
          setHandoverProjectId(undefined);
        }} 
        projects={projects}
        initialProjectId={handoverProjectId}
      />
      <InventoryModal isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} />
      <VehicleModal 
        isOpen={isVehicleModalOpen} 
        onClose={() => setIsVehicleModalOpen(false)} 
        projects={projects}
      />
      <HMSModal 
        isOpen={isHMSModalOpen} 
        onClose={() => setIsHMSModalOpen(false)} 
        projects={projects}
      />

      <SmartSearch 
        isOpen={isSmartSearchOpen}
        onClose={() => setIsSmartSearchOpen(false)}
        onNavigate={handleSmartNavigate}
      />
      
      <AnimatePresence mode="wait">
        {selectedProject ? (
          <ProjectDetails 
            key="details"
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
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {isDemo ? "Velkommen til Demo" : `${t('welcome')}, Ken`}
                </h1>
                <p className="text-neutral-500">
                  {isDemo ? "Utforsk funksjonene i KS MesterAI med eksempeldata" : "Sømløs kontroll fra tilbud til ferdigstillelse."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSmartSearchOpen(true)}
                  className="hidden md:flex items-center gap-3 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-400 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm min-w-[300px]"
                >
                  <Search size={16} />
                  <span>{t('search_system_placeholder', 'Søk i hele systemet...')}</span>
                  <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px] text-neutral-400">
                    <Command size={10} /> K
                  </div>
                </button>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-neutral-100 overflow-hidden">
                      <img src={`https://picsum.photos/seed/u${i}/32/32`} alt="User" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                    +12
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
                >
                  <Plus size={16} />
                  {t('new_project')}
                </button>
              </div>
            </div>

            {/* AI Smart Insights - Recipe 1: Technical Dashboard */}
            <AnimatePresence>
              {(isAiLoading || aiInsights.length > 0) && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
                >
                  {isAiLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm animate-pulse">
                        <div className="w-10 h-10 bg-neutral-100 rounded-2xl mb-4" />
                        <div className="h-4 bg-neutral-100 rounded-md w-3/4 mb-2" />
                        <div className="h-3 bg-neutral-100 rounded-md w-full mb-4" />
                        <div className="h-8 bg-neutral-100 rounded-md w-1/3" />
                      </div>
                    ))
                  ) : (
                    aiInsights.map((insight) => (
                      <motion.div 
                        key={insight.id}
                        layout
                        className={cn(
                          "p-5 rounded-3xl border flex flex-col justify-between transition-all hover:shadow-lg",
                          insight.type === 'warning' ? "bg-orange-50 border-orange-100" : 
                          insight.type === 'predictive' ? "bg-purple-50 border-purple-100" :
                          "bg-blue-50 border-blue-100"
                        )}
                      >
                        <div className="flex gap-4 mb-4">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                            insight.type === 'warning' ? "bg-white text-orange-600" : 
                            insight.type === 'predictive' ? "bg-white text-purple-600" :
                            "bg-white text-blue-600"
                          )}>
                            {getInsightIcon(insight.icon, insight.type)}
                          </div>
                          <div>
                            <h3 className={cn(
                              "font-bold text-sm",
                              insight.type === 'warning' ? "text-orange-900" : 
                              insight.type === 'predictive' ? "text-purple-900" :
                              "text-blue-900"
                            )}>{insight.title}</h3>
                            <p className={cn(
                              "text-xs mt-1 leading-relaxed",
                              insight.type === 'warning' ? "text-orange-700" : 
                              insight.type === 'predictive' ? "text-purple-700" :
                              "text-blue-700"
                            )}>{insight.description}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleQuickAction(insight.actionId)}
                          className={cn(
                            "w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
                            insight.type === 'warning' ? "bg-orange-600 text-white hover:bg-orange-500" : 
                            insight.type === 'predictive' ? "bg-purple-600 text-white hover:bg-purple-500" :
                            "bg-blue-600 text-white hover:bg-blue-500"
                          )}
                        >
                          {insight.action}
                          <ChevronRight size={14} />
                        </button>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Stats Bar - Recipe 8: Clean Utility / Minimal */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Aktive Prosjekter', value: stats.activeProjects, icon: <HardHat size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Åpne Avvik', value: stats.openDeviations, icon: <AlertTriangle size={18} />, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Kritiske Avvik', value: stats.criticalDeviations, icon: <Zap size={18} />, color: 'text-rose-600', bg: 'bg-rose-50' },
                { label: 'Compliance Grad', value: `${stats.avgCompliance}%`, icon: <ShieldCheck size={18} />, color: 'text-blue-600', bg: 'bg-blue-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm">
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-4", stat.bg, stat.color)}>
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Project Pipeline Visualization */}
            <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 mb-12 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold tracking-tight">Prosjektflyt</h2>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  <Zap size={14} />
                  {t('ai_automation_active', 'AI-automatisering aktiv')}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {lifecycleStages.map((stage, i) => {
                  const count = stage.id === 'offer' ? (offers.length || (memoizedStageCounts['offer'] || 0)) : (memoizedStageCounts[stage.id] || 0);
                  const stageTooltips: Record<string, string> = {
                    offer: 'Klikk for å opprette tilbud',
                    contract: 'Klikk for å administrere kontrakter',
                    active: 'Klikk for å se aktive prosjekter',
                    completion: 'Klikk for overlevering og FDV',
                    archived: 'Klikk for dokumentarkiv'
                  };

                  return (
                    <button 
                      key={stage.id} 
                      type="button"
                      title={stageTooltips[stage.id] || stage.label}
                      onClick={() => {
                        if (stage.id === 'offer') {
                          setOfferInitialData(null);
                          setIsOfferModalOpen(true);
                        } else if (stage.id === 'contract') {
                          setIsContractModalOpen(true);
                        } else if (stage.id === 'active') {
                          setActiveTab('prosjekter');
                        } else if (stage.id === 'completion') {
                          setIsHandoverModalOpen(true);
                        } else if (stage.id === 'archived') {
                          setIsArchiveModalOpen(true);
                        }
                      }}
                      className="relative group cursor-pointer focus:outline-none w-full text-center"
                    >
                      <div className="flex flex-col items-center text-center p-3 rounded-2xl hover:bg-neutral-50 active:scale-95 transition-all">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg transition-transform group-hover:scale-110 group-hover:shadow-xl",
                          stage.color
                        )}>
                          {stage.icon}
                        </div>
                        <div className="text-xs font-bold mb-1 group-hover:text-emerald-600 transition-colors">{stage.label}</div>
                        <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{count} {stage.id === 'offer' ? 'Tilbud' : 'Prosjekter'}</div>
                        <div className="text-[9px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">Åpne &rarr;</div>
                      </div>
                      {i < lifecycleStages.length - 1 && (
                        <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-neutral-100 pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {actionGroups.map((group, i) => {
                const visibleActions = group.actions.filter(action => isActionVisible(action.id));
                if (visibleActions.length === 0) return null;

                return (
                  <div key={i} className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">{group.title}</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {visibleActions.map((action) => (
                        <button 
                          key={action.id}
                          onClick={() => handleQuickAction(action.id)}
                          className="flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all group text-left"
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform group-hover:rotate-6",
                            action.color
                          )}>
                            {action.icon}
                          </div>
                          <div>
                            <div className="text-sm font-bold group-hover:text-emerald-600 transition-colors">{action.label}</div>
                            <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Klikk for å starte</div>
                          </div>
                          <ChevronRight size={16} className="ml-auto text-neutral-300 group-hover:text-emerald-600 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-neutral-200 mb-8 overflow-x-auto">
              {['oversikt', 'prosjekter', 'tilbud', 'avvik', 'hms', 'finans', 'laerling', 'ai'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "pb-4 text-sm font-bold transition-all relative whitespace-nowrap",
                    activeTab === tab ? "text-emerald-600" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  {tab === 'finans' ? 'Finans' : tab === 'laerling' ? 'Lærling' : tab === 'hms' ? 'HMS' : tab === 'tilbud' ? 'Tilbud & Kalkyle' : t(tab === 'ai' ? 'ai_analysis' : tab)}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"
                    />
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'oversikt' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Main Project List */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Active Alerts / Smart Assistant */}
                    <div className="bg-neutral-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-emerald-500 rounded-lg">
                            <Brain size={24} />
                          </div>
                          <h3 className="text-xl font-bold">Autonom HMS-Kontroll</h3>
                        </div>
                        <div className="space-y-4">
                          {aiInsights.length > 0 ? (
                            aiInsights.map((insight) => (
                              <div key={insight.id} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                  insight.type === 'warning' ? "bg-orange-500/20 text-orange-500" : "bg-blue-500/20 text-blue-500"
                                )}>
                                  {insight.icon}
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{insight.title}</div>
                                  <p className="text-xs text-neutral-400 mt-1">{insight.description}</p>
                                  <button 
                                    onClick={() => handleQuickAction(insight.actionId)}
                                    className="mt-3 text-xs font-bold text-emerald-400 hover:underline"
                                  >
                                    {insight.action} →
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                              <div className="w-8 h-8 bg-emerald-500/20 text-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                                <CheckCircle2 size={18} />
                              </div>
                              <div>
                                <div className="text-sm font-bold">Alt er i rute</div>
                                <p className="text-xs text-neutral-400 mt-1">{t('ai_monitoring_msg', 'AI overvåker prosjektene dine. Ingen kritiske avvik funnet akkurat nå.')}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
                        <h2 className="font-bold">{t('active_projects_title')}</h2>
                        <button 
                          onClick={() => setActiveTab('prosjekter')}
                          className="text-sm text-emerald-600 font-bold hover:underline"
                        >
                          {t('see_all')}
                        </button>
                      </div>
                      <div className="divide-y divide-neutral-100">
                        {loading ? (
                          <div className="p-8 sm:p-12 text-center text-neutral-400">
                            <div className="w-8 h-8 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
                            {t('loading_projects', 'Laster prosjekter...')}
                          </div>
                        ) : projects.length === 0 ? (
                          <div className="p-8 sm:p-12 text-center text-neutral-400">
                            <HardHat size={48} className="mx-auto mb-4 opacity-20" />
                            <p>{t('no_projects', 'Ingen aktive prosjekter funnet.')}</p>
                          </div>
                        ) : (
                          projects.slice(0, 3).map((project) => (
                            <div 
                              key={project.id} 
                              onClick={() => setSelectedProject(project)}
                              className="p-4 sm:p-8 hover:bg-neutral-50 transition-colors cursor-pointer group"
                            >
                              <div className="flex justify-between items-start mb-4 sm:mb-6">
                                <div className="flex items-center gap-3 sm:gap-4">
                                  <div className={cn(
                                    "w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg",
                                    project.status === 'active' ? "bg-emerald-500" : (project.status === 'completed' ? "bg-blue-500" : "bg-amber-500")
                                  )}>
                                    <HardHat size={20} className="sm:w-7 sm:h-7" />
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                      {project.projectCode && (
                                        <span className="px-1 py-0.5 bg-neutral-100 text-neutral-500 text-[8px] sm:text-[10px] font-bold rounded uppercase">
                                          {project.projectCode}
                                        </span>
                                      )}
                                      <h3 className="text-sm sm:text-lg font-bold group-hover:text-emerald-600 transition-colors line-clamp-1">{project.name}</h3>
                                      <span className={cn(
                                        "text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1 sm:px-1.5 py-0.5 rounded",
                                        project.stage === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                      )}>
                                        {project.stage}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOfferInitialData({
                                              projectId: project.id,
                                              projectCode: project.projectCode,
                                              title: `Tilbud: ${project.name}`,
                                              description: project.description,
                                              clientName: project.clientName,
                                              clientEmail: project.clientEmail
                                            });
                                            setIsOfferModalOpen(true);
                                          }}
                                          className="p-1 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                          title={t('generate_offer', 'Generer Tilbud')}
                                        >
                                          <Sparkles size={12} className="sm:w-3.5 sm:h-3.5" />
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAnalyzeProject(project);
                                          }}
                                          className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                          title={t('ai_project_analysis', 'AI Prosjektanalyse')}
                                        >
                                          <Brain size={12} className="sm:w-3.5 sm:h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-neutral-400 mt-1">
                                      <span className="flex items-center gap-1">
                                        <MapPin size={10} className="sm:w-3 sm:h-3" /> 
                                        {project.location}
                                      </span>
                                      {projectWeather[project.id] && (
                                        <span className="flex items-center gap-1 px-1 py-0.5 bg-neutral-100 rounded-md">
                                          {getWeatherIcon(projectWeather[project.id].icon)}
                                          {projectWeather[project.id].temp}°C
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1"><Clock size={10} className="sm:w-3 sm:h-3" /> {project.lastUpdate}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xs sm:text-sm font-bold">{project.progress}%</div>
                                  <div className="text-[8px] sm:text-[10px] text-neutral-400 uppercase tracking-widest font-black">Fullført</div>
                                </div>
                              </div>
                              
                              <div className="h-1.5 sm:h-2 w-full bg-neutral-100 rounded-full overflow-hidden mb-3 sm:mb-4">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${project.progress}%` }}
                                  className={cn(
                                    "h-full",
                                    project.status === 'active' ? "bg-emerald-500" : (project.status === 'completed' ? "bg-blue-500" : "bg-amber-500")
                                  )}
                                ></motion.div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex -space-x-1.5 sm:-space-x-2">
                                  {[1, 2].map(i => (
                                    <div key={i} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white bg-neutral-100 overflow-hidden">
                                      <img src={`https://picsum.photos/seed/p${project.id}${i}/24/24`} alt="User" referrerPolicy="no-referrer" />
                                    </div>
                                  ))}
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                                  {project.progress > 80 && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleGenerateFDV(project);
                                      }}
                                      className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                      <FileIcon size={10} className="sm:w-3 sm:h-3" />
                                      {t('generate_fdv', 'Generer FDV')}
                                    </button>
                                  )}
                                  <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-neutral-400">
                                    <ShieldCheck size={10} className="sm:w-3 sm:h-3" />
                                    KS OK
                                  </div>
                                  <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-neutral-400">
                                    <FileText size={10} className="sm:w-3 sm:h-3" />
                                    12 Dok
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar: Automation & Insights */}
                  <div className="space-y-8">
                    {/* Material & Inventory Widget */}
                    <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">{t('inventory_materiell', 'Lager & Materiell')}</h3>
                        <button 
                          onClick={() => setIsInventoryModalOpen(true)}
                          className="text-xs font-bold text-blue-600 hover:underline"
                        >
                          {t('see_inventory', 'Se lager')}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <div className="text-2xl font-bold text-blue-900">{inventoryStats.total}</div>
                          <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{t('articles_in_stock', 'Artikler i lager')}</div>
                        </div>
                        <div className={cn(
                          "p-4 rounded-2xl border transition-all",
                          inventoryStats.lowStock > 0 ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"
                        )}>
                          <div className={cn(
                            "text-2xl font-bold",
                            inventoryStats.lowStock > 0 ? "text-rose-900" : "text-emerald-900"
                          )}>{inventoryStats.lowStock}</div>
                          <div className={cn(
                            "text-[10px] font-black uppercase tracking-widest mt-1",
                            inventoryStats.lowStock > 0 ? "text-rose-600" : "text-emerald-600"
                          )}>{t('low_stock', 'Lav beholdning')}</div>
                        </div>
                      </div>
                      <div className="mt-6 space-y-3">
                        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <Package size={16} className="text-neutral-400" />
                            <span className="text-xs font-bold">{t('project_materiell', 'Prosjektmateriell')}</span>
                          </div>
                          <span className="text-xs font-black text-neutral-900">{materials.length}</span>
                        </div>
                        <button 
                          onClick={() => setActiveTab('ai')}
                          className="w-full py-3 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                        >
                          <Brain size={14} />
                          {t('ai_inventory_analysis', 'AI Lager-analyse')}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
                      <h3 className="font-bold mb-6 flex items-center justify-between">
                        Automatisering
                        <RefreshCw size={14} className="text-neutral-300 animate-spin-slow" />
                      </h3>
                      <div className="space-y-6">
                        {[
                          { label: 'Tripletex Synk', status: 'OK', time: '10m siden', color: 'text-emerald-500' },
                          { label: 'FDV-generering', status: 'Aktiv', time: 'Nå', color: 'text-blue-500' },
                          { label: 'SJA-arkivering', status: 'OK', time: '1t siden', color: 'text-emerald-500' },
                          { label: 'Lager-oppdatering', status: 'Venter', time: 'Planlagt', color: 'text-amber-500' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-bold">{item.label}</div>
                              <div className="text-[10px] text-neutral-400">{item.time}</div>
                            </div>
                            <div className={cn("text-[10px] font-black uppercase tracking-widest", item.color)}>
                              {item.status}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={() => setIsActivityLogModalOpen(true)}
                        className="w-full mt-8 py-3 bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
                      >
                        {t('see_all_logs', 'Se alle logger')}
                      </button>
                    </div>

                    <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-lg shadow-emerald-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                      <div className="relative z-10">
                        <h3 className="font-bold mb-2">{t('ai_cost_control', 'AI Kostnadskontroll')}</h3>
                        <p className="text-xs text-emerald-100 leading-relaxed mb-6">
                          Vi ser et avvik på materialbruk i Prosjekt Bjørklund. Foreslår å sjekke svinn-loggen.
                        </p>
                        <button 
                          onClick={() => setIsDeviationModalOpen(true)}
                          className="w-full bg-white text-emerald-600 py-3 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors"
                        >
                          {t('analyze_deviation', 'Analyser avvik')}
                        </button>
                      </div>
                    </div>

                    <UniversalTranslator className="h-[400px]" />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'prosjekter' && (
              <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
                  <h2 className="text-xl font-bold">{t('active_projects_title')}</h2>
                  <div className="flex gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                      <input 
                        type="text" 
                        value={projectSearchTerm}
                        onChange={(e) => setProjectSearchTerm(e.target.value)}
                        placeholder="Søk i prosjekter..." 
                        className="pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <button
                      aria-label={t('filter_projects', 'Filtrer prosjekter')}
                      title={t('filter_projects', 'Filtrer prosjekter')}
                      className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:outline-none"
                    >
                      <Filter size={20} className="text-neutral-500" />
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-neutral-100">
                  {loading ? (
                    <div className="p-20 text-center text-neutral-400">
                      <div className="w-10 h-10 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm font-medium">{t('loading_projects', 'Laster prosjekter...')}</p>
                    </div>
                  ) : filteredProjectsList.length === 0 ? (
                    <div className="p-20 text-center text-neutral-400">
                      <HardHat size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">{t('no_projects', 'Ingen prosjekter funnet.')}</p>
                      <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
                      >
                        Opprett nytt prosjekt
                      </button>
                    </div>
                  ) : (
                    filteredProjectsList
                      .map((project) => (
                      <div 
                        key={project.id} 
                        onClick={() => setSelectedProject(project)}
                        className="p-8 hover:bg-neutral-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-6">
                            <div className={cn(
                              "w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg",
                              project.status === 'active' ? "bg-emerald-500 shadow-emerald-100" : (project.status === 'completed' ? "bg-blue-500 shadow-blue-100" : "bg-amber-500 shadow-amber-100")
                            )}>
                              <HardHat size={32} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                {project.projectCode && (
                                  <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] font-bold rounded uppercase">
                                    {project.projectCode}
                                  </span>
                                )}
                                <h3 className="text-lg font-bold group-hover:text-emerald-600 transition-colors">{project.name}</h3>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-neutral-400 mt-1">
                                <span className="flex items-center gap-1"><MapPin size={14} /> {project.location}</span>
                                <span className="flex items-center gap-1"><Clock size={14} /> {project.lastUpdate}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-sm font-bold">{project.progress}% fullført</div>
                            <div className="w-48 h-2 bg-neutral-100 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-1000",
                                  project.status === 'active' ? "bg-emerald-500" : (project.status === 'completed' ? "bg-blue-500" : "bg-amber-500")
                                )}
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tilbud' && (
              <div className="space-y-8">
                {/* KPI Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{t('total_offers', 'Totalt Antall Tilbud')}</div>
                    <div className="text-3xl font-black text-neutral-900">{offers.length}</div>
                    <div className="text-xs text-neutral-500 font-bold mt-1">{t('registered_in_system', 'Registrert i systemet')}</div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">{t('in_progress_draft', 'Under Behandling / Utkast')}</div>
                    <div className="text-3xl font-black text-amber-600">
                      {memoizedOfferStats.draft.count}
                    </div>
                    <div className="text-xs text-neutral-500 font-bold mt-1">
                      Sum: {memoizedOfferStats.draft.sum.toLocaleString()} kr
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">{t('sent_to_customer', 'Sendt til Kunde')}</div>
                    <div className="text-3xl font-black text-blue-600">
                      {memoizedOfferStats.sent.count}
                    </div>
                    <div className="text-xs text-neutral-500 font-bold mt-1">
                      Sum: {memoizedOfferStats.sent.sum.toLocaleString()} kr
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">{t('accepted_won', 'Godkjent / Vunnet')}</div>
                    <div className="text-3xl font-black text-emerald-600">
                      {memoizedOfferStats.accepted.count}
                    </div>
                    <div className="text-xs text-neutral-500 font-bold mt-1">
                      Sum: {memoizedOfferStats.accepted.sum.toLocaleString()} kr
                    </div>
                  </div>
                </div>

                {/* Filter & Action Bar */}
                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="text"
                        placeholder={t('search_offers_placeholder', 'Søk tilbud, kunde, kode...')}
                        value={offerSearchTerm}
                        onChange={(e) => setOfferSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-2xl overflow-x-auto w-full sm:w-auto">
                      {['alle', 'draft', 'sent', 'accepted', 'declined'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setOfferStatusFilter(st)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap",
                            offerStatusFilter === st ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
                          )}
                        >
                          {st === 'alle' ? t('filter_all', 'Alle') : st === 'draft' ? t('filter_draft', 'Utkast') : st === 'sent' ? t('filter_sent', 'Sendt') : st === 'accepted' ? t('filter_accepted', 'Godkjent') : t('filter_declined', 'Avslått')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setOfferInitialData(null);
                      setIsOfferModalOpen(true);
                    }}
                    className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all shrink-0"
                  >
                    <Plus size={18} />
                    {t('create_offer_now', 'Opprett Nytt Tilbud')}
                  </button>
                </div>

                {/* Offers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOffersList.length === 0 ? (
                    <div className="col-span-full bg-white p-12 rounded-3xl border border-neutral-200 text-center">
                      <Calculator size={48} className="mx-auto text-neutral-300 mb-4" />
                      <h3 className="text-lg font-bold text-neutral-800">{t('no_offers_found', 'Ingen tilbud funnet')}</h3>
                      <p className="text-xs text-neutral-500 mt-1 mb-6">{t('no_offers_desc', 'Det er ikke opprettet noen tilbud som passer til valgt filter ennå.')}</p>
                      <button 
                        onClick={() => {
                          setOfferInitialData(null);
                          setIsOfferModalOpen(true);
                        }}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl transition-all"
                      >
                        + {t('create_offer_now', 'Opprett Nytt Tilbud')}
                      </button>
                    </div>
                  ) : (
                    filteredOffersList
                      .map((offer) => (
                        <div key={offer.id} className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-between hover:border-emerald-500 transition-all group">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                offer.status === 'accepted' ? "bg-emerald-100 text-emerald-800" :
                                offer.status === 'sent' ? "bg-blue-100 text-blue-800" :
                                offer.status === 'declined' ? "bg-rose-100 text-rose-800" :
                                "bg-amber-100 text-amber-800"
                              )}>
                                {offer.status === 'accepted' ? t('filter_accepted', 'Godkjent') : offer.status === 'sent' ? t('filter_sent', 'Sendt') : offer.status === 'declined' ? t('filter_declined', 'Avslått') : t('filter_draft', 'Utkast')}
                              </span>
                              {offer.projectCode && (
                                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-lg">
                                  {offer.projectCode}
                                </span>
                              )}
                            </div>

                            <h3 className="text-base font-bold text-neutral-900 group-hover:text-emerald-600 transition-colors line-clamp-1 mb-1">
                              {offer.title}
                            </h3>
                            <p className="text-xs font-semibold text-neutral-500 mb-4 flex items-center gap-1">
                              <Users size={12} />
                              {t('customer', 'Kunde')}: {offer.clientName}
                            </p>

                            {offer.description && (
                              <p className="text-xs text-neutral-600 line-clamp-2 mb-4 bg-neutral-50 p-3 rounded-2xl">
                                {offer.description}
                              </p>
                            )}

                            <div className="text-xs text-neutral-400 mb-4 space-y-1">
                              <div>{offer.items?.length || 0} {t('items_count', 'stiklinjer')}</div>
                              {offer.validUntil && <div>{t('valid_until', 'Gyldig til')}: {offer.validUntil}</div>}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-neutral-100 mt-2">
                            <div className="flex items-baseline justify-between mb-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{t('total_amount', 'Totalbeløp')}</span>
                              <span className="text-xl font-black text-emerald-600">{(offer.totalAmount || 0).toLocaleString()} kr</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={() => {
                                  setOfferInitialData({
                                    projectId: offer.projectId,
                                    projectCode: offer.projectCode,
                                    title: offer.title,
                                    description: offer.description,
                                    clientName: offer.clientName,
                                    clientEmail: offer.clientEmail
                                  });
                                  setIsOfferModalOpen(true);
                                }}
                                className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl transition-all"
                              >
                                {t('view_edit', 'Vis / Rediger')}
                              </button>
                              <button 
                                onClick={() => {
                                  const link = `${window.location.origin}/#offer-${offer.id}`;
                                  navigator.clipboard.writeText(link);
                                  toast.success("Tilbudslenke kopiert!");
                                }}
                                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                              >
                                <Copy size={12} /> {t('copy_link', 'Kopiér Lenke')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'avvik' && (
              <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-neutral-100">
                  <h2 className="text-xl font-bold">{t('critical_deviations')}</h2>
                </div>
                <div className="divide-y divide-neutral-100">
                  {loading ? (
                    <div className="p-20 text-center text-neutral-400">
                      <div className="w-10 h-10 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm font-medium">{t('loading_deviations', 'Laster avvik...')}</p>
                    </div>
                  ) : deviations.length === 0 ? (
                    <div className="p-20 text-center text-neutral-400">
                      <AlertTriangle size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">{t('no_deviations', 'Ingen kritiske avvik funnet.')}</p>
                    </div>
                  ) : (
                    deviations.map((dev) => (
                      <div key={dev.id} className="p-8 hover:bg-neutral-50 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "p-3 rounded-xl",
                              dev.severity === 'high' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                            )}>
                              <AlertTriangle size={24} />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold">{dev.title}</h3>
                              <div className="flex items-center gap-4 text-sm text-neutral-400 mt-1">
                                <span>{dev.project}</span>
                                <span>•</span>
                                <span>{dev.timestamp}</span>
                              </div>
                            </div>
                          </div>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest",
                            dev.severity === 'high' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {dev.severity === 'high' ? t('critical') : t('moderate')}
                          </span>
                        </div>
                        <p className="text-neutral-600 max-w-3xl leading-relaxed">{dev.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'hms' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <HMSModule projects={projects} />
              </motion.div>
            )}

            {activeTab === 'finans' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: t('revenue_mnd', 'Omsetning (Mnd)'), value: '1.2M', trend: '+12%', color: 'text-emerald-600' },
                    { label: t('costs_mnd', 'Kostnader (Mnd)'), value: '850K', trend: '-5%', color: 'text-rose-600' },
                    { label: t('profit_mnd', 'Resultat (Mnd)'), value: '350K', trend: '+18%', color: 'text-blue-600' },
                    { label: t('outstanding', 'Utestående'), value: '420K', trend: '5 fakturaer', color: 'text-amber-600' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm">
                      <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{stat.label}</div>
                      <div className="text-3xl font-black text-neutral-900">{stat.value}</div>
                      <div className={cn("text-[10px] font-bold mt-1", stat.color)}>{stat.trend}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
                    <h3 className="font-bold mb-8">{t('revenue_vs_costs', 'Omsetning vs Kostnader')}</h3>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                          { name: 'Jan', omsetning: 800, kostnader: 600 },
                          { name: 'Feb', omsetning: 950, kostnader: 700 },
                          { name: 'Mar', omsetning: 1200, kostnader: 850 },
                          { name: 'Apr', omsetning: 1100, kostnader: 800 },
                          { name: 'Mai', omsetning: 1400, kostnader: 900 },
                          { name: 'Jun', omsetning: 1600, kostnader: 1100 },
                        ]}>
                          <defs>
                            <linearGradient id="colorOmsetning" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorKostnader" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Area type="monotone" dataKey="omsetning" stroke="#10b981" fillOpacity={1} fill="url(#colorOmsetning)" strokeWidth={3} />
                          <Area type="monotone" dataKey="kostnader" stroke="#ef4444" fillOpacity={1} fill="url(#colorKostnader)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
                    <h3 className="font-bold mb-8">{t('profitability_per_project', 'Lønnsomhet per Prosjekt')}</h3>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Bjørklund', margin: 28 },
                          { name: 'Solli', margin: 15 },
                          { name: 'Vika', margin: 32 },
                          { name: 'Garasje Sola', margin: 22 },
                        ]} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} width={80} />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="margin" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={24}>
                            { [28, 15, 32, 22].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry > 25 ? '#10b981' : (entry > 20 ? '#3b82f6' : '#f59e0b')} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'laerling' && (
              <ApprenticeModule />
            )}

            {activeTab === 'ai' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 bg-neutral-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500 rounded-lg">
                            <Brain size={24} />
                          </div>
                          <h2 className="text-2xl font-bold">{t('ai_strategic_analysis', 'AI Strategisk Analyse')}</h2>
                        </div>
                        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-2">
                          <RefreshCw size={14} className="animate-spin-slow" />
                          {t('update_analysis', 'Oppdater analyse')}
                        </button>
                      </div>
                      <p className="text-neutral-400 mb-8 max-w-xl">
                        Vår AI har analysert dine {projects.length} aktive prosjekter og {deviations.length} avvik for å gi deg innsikt i hvordan du kan optimalisere driften.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">{t('efficiency', 'Effektivitet')}</div>
                          <div className="text-3xl font-bold">92%</div>
                          <div className="text-[10px] text-neutral-500 mt-1">+4% fra forrige mnd</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">{t('risk', 'Risiko')}</div>
                          <div className="text-3xl font-bold">Lav</div>
                          <div className="text-[10px] text-neutral-500 mt-1">Ingen kritiske avvik</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">{t('automation', 'Automatisering')}</div>
                          <div className="text-3xl font-bold">65%</div>
                          <div className="text-[10px] text-neutral-500 mt-1">8 oppgaver spart i dag</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
                    <h3 className="font-bold mb-6 flex items-center justify-between">
                      {t('ai_recommendations', 'AI Anbefalinger')}
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{t('new_badge', '3 NYE')}</span>
                    </h3>
                    <div className="space-y-4">
                      {[
                        { title: 'Opplæring trengs', desc: 'Økning i fuktavvik. Foreslår kurs i dampsperre.', icon: <GraduationCap size={16} />, color: 'bg-amber-100 text-amber-600' },
                        { title: 'Ressursoptimalisering', desc: 'Team B er ledig fra tirsdag. Kan fremskynde Prosjekt X.', icon: <Users size={16} />, color: 'bg-blue-100 text-blue-600' },
                        { title: 'Automatisk FDV', desc: '3 nye produkter detektert. FDV-blader er hentet.', icon: <Package size={16} />, color: 'bg-emerald-100 text-emerald-600' }
                      ].map((rec, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-100 hover:border-emerald-200 transition-colors cursor-pointer group">
                          <div className={cn("p-2 h-fit rounded-lg transition-transform group-hover:scale-110", rec.color)}>
                            {rec.icon}
                          </div>
                          <div>
                            <div className="text-sm font-bold">{rec.title}</div>
                            <div className="text-xs text-neutral-500 mt-1">{rec.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-bold">{t('trend_analysis', 'Trendanalyse: Avvikstyper')}</h3>
                      <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> {t('quality', 'Kvalitet')}</span>
                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /> HMS</span>
                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> {t('materials', 'Materialer')}</span>
                      </div>
                    </div>
                    <div className="h-48 flex items-end gap-3">
                      {[65, 45, 85, 30, 55, 75, 95, 40, 60, 80, 50, 70].map((h, i) => (
                        <div key={i} className="flex-grow group relative">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            className={cn(
                              "w-full rounded-t-lg transition-all group-hover:opacity-80",
                              i % 3 === 0 ? "bg-emerald-500" : (i % 3 === 1 ? "bg-amber-500" : "bg-blue-500")
                            )}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                      <span>{t('week', 'Uke')} 1</span>
                      <span>{t('week', 'Uke')} 4</span>
                      <span>{t('week', 'Uke')} 8</span>
                      <span>{t('week', 'Uke')} 12</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold flex items-center gap-2">
                        <Sparkles size={18} className="text-emerald-500" />
                        {t('smart_automation', 'Smart Automatisering')}
                      </h3>
                      <button 
                        onClick={handleGenerateWeeklyReport}
                        className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:underline"
                      >
                        {t('generate_executive_report', 'Generer Leder-rapport')}
                      </button>
                      <button 
                        onClick={handleAnalyzeDeviations}
                        disabled={isReportLoading || deviations.length === 0}
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline disabled:opacity-50"
                      >
                        {isReportLoading && reportType === 'deviation_analysis' ? 'Analyserer...' : t('analyze_deviations_ai', 'Analyser Avvik (AI)')}
                      </button>
                    </div>
                    <div className="space-y-4">
                      {automationSettings.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                          <div>
                            <div className="text-sm font-bold">{item.label}</div>
                            <div className="text-[10px] text-neutral-500 mt-0.5">{item.desc}</div>
                          </div>
                          <button 
                            onClick={() => toggleAutomation(item.id)}
                            className={cn(
                              "w-12 h-6 rounded-full p-1 transition-colors relative",
                              item.active ? "bg-emerald-500" : "bg-neutral-300"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                              item.active ? "translate-x-6" : "translate-x-0"
                            )} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
