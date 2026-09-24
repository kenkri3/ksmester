'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Camera,
  Copy,
  Check,
  Building2,
  HardHat,
  Trash2,
  Edit2,
  RefreshCw,
  Clock,
  FileSignature,
  ClipboardCheck,
  AlertTriangle,
  Calculator,
  Archive,
  Users,
  Menu,
  PanelLeftOpen,
  Radio,
  Search,
  Volume2,
  VolumeX,
  X,
  Plus,
  ArrowLeft,
  ChevronDown,
  MapPin,
  Bot,
  User as UserIcon,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  DollarSign,
  CheckCircle2,
  Shield,
  Calendar,
  Phone,
  Mail,
  FileText,
  Layers,
  Wrench,
  Eye,
  CornerDownLeft,
  MessageSquare,
  CheckSquare,
  Crown,
  Car,
  Package,
  Languages,
  GraduationCap,
  CloudSun,
  Lock,
  BookOpen,
  FileSpreadsheet,
  FileCheck,
  SquarePen,
  Image as ImageIcon,
  Paperclip
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { Project, Deviation } from '../types';
import { chatSessionService, ChatSession, ChatMessageItem } from '../services/chatSessionService';
import WorkstationSidebar from './WorkstationSidebar';
import { NotificationBell } from './NotificationBell';
import InChatWorkspace, { InChatFormType } from './InChatWorkspace';
import DocumentationArchive from './DocumentationArchive';
import WorkstationSettingsModal from './WorkstationSettingsModal';
import ChangeOrderDetailModal from './ChangeOrderDetailModal';
import { db, collection, addDoc } from '../services/firebase';
import SuperAdmin from './SuperAdmin';
import OfferModal from './OfferModal';
import OfferDetailModal from './OfferDetailModal';
import ApprenticeModal from './ApprenticeModal';
import HMSModule from './HMSModule';
import { formatAiMarkdown } from '../lib/formatAiMarkdown';
import WeatherWidget from './WeatherWidget';

interface MesterWorkstationProps {
  initialModuleTab?: string | null;
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project | null) => void;
  changeOrders: any[];
  offers: any[];
  deviations: Deviation[];
  lukkesperreZones: any[];
  recentActivities: any[];
  tasks: any[];
  initialPrompt?: string;
  onPromptHandled?: () => void;
  onOpenCreateProject: () => void;
  onOpenSmartSearch: () => void;
  onOpenAllModules: () => void;
  onApproveChangeOrder?: (id: string) => void;
  onRejectChangeOrder?: (id: string) => void;
  onDeleteChangeOrder?: (id: string, title: string) => void;
  onDeleteOffer?: (id: string, title: string) => void;
  onOpenPreClose?: (zone: any) => void;
  onOpenOmnichannelModal?: () => void;
  onOpenOfferModal?: (data?: any) => void;
  onOpenChangeOrderModal?: (data?: any) => void;
  onOpenSJAModal?: (data?: any) => void;
  onOpenAIVision?: () => void;
  onOpenDailyLogModal?: () => void;
  onOpenTimeModal?: () => void;
  onOpenArchiveModal?: () => void;
  onOpenContactsModal?: () => void;
  onOpenSettings: () => void;
  onOpenSuperAdmin?: () => void;
}

export default function MesterWorkstation({
  initialModuleTab,
  projects,
  selectedProject,
  onSelectProject,
  changeOrders = [],
  offers = [],
  deviations = [],
  lukkesperreZones = [],
  recentActivities = [],
  tasks = [],
  initialPrompt,
  onPromptHandled,
  onOpenCreateProject,
  onOpenSmartSearch,
  onOpenAllModules,
  onApproveChangeOrder,
  onRejectChangeOrder,
  onDeleteChangeOrder,
  onDeleteOffer,
  onOpenPreClose,
  onOpenOmnichannelModal,
  onOpenOfferModal,
  onOpenChangeOrderModal,
  onOpenSJAModal,
  onOpenAIVision,
  onOpenDailyLogModal,
  onOpenTimeModal,
  onOpenArchiveModal,
  onOpenContactsModal,
  onOpenSettings,
  onOpenSuperAdmin
}: MesterWorkstationProps) {
  const { user, isSuperAdmin, isPlatformOwner, role, simulatedPlan, setSimulatedPlan, logout, trade, company, impersonatedCompanyId, stopImpersonation } = useAuth();
  const isAdmin = Boolean(
    isSuperAdmin || 
    isPlatformOwner || 
    role === 'admin' || 
    role === 'leader' || 
    user?.role === 'admin' || 
    user?.role === 'leader'
  );

  // 📐 Layout State
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mester_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapseDesktop = () => {
    setIsCollapsedDesktop(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mester_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  // 🎯 View Mode: 'chat' | 'module' | 'form'
  const [viewMode, setViewMode] = useState<'chat' | 'module' | 'form'>(() => {
    if (initialModuleTab) return 'module';
    return 'chat';
  });
  const [activeModuleTab, setActiveModuleTab] = useState<string | null>(initialModuleTab || null);
  const [activeForm, setActiveForm] = useState<{ type: InChatFormType; data?: any } | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  // Synkroniser aktiv fane dersom initialModuleTab endrer seg eksternt
  useEffect(() => {
    if (initialModuleTab) {
      setActiveModuleTab(initialModuleTab);
      setViewMode('module');
    }
  }, [initialModuleTab]);

  // Håndter global navigasjon inn i SuperAdmin eller andre moduler uten å forlate arbeidsstasjonen
  useEffect(() => {
    const handleNavigate = (e: any) => {
      const targetView = e.detail?.view;
      if (targetView === 'super-admin' || targetView === 'superadmin') {
        setActiveModuleTab('superadmin');
        setViewMode('module');
      } else if (targetView === 'offers' || targetView === 'kalkyle') {
        setActiveModuleTab('offers');
        setViewMode('module');
      } else if (targetView === 'contacts' || targetView === 'telefonbok') {
        setActiveModuleTab('contacts');
        setViewMode('module');
      }
    };
    window.addEventListener('navigate_view', handleNavigate);
    return () => window.removeEventListener('navigate_view', handleNavigate);
  }, []);

  const handleOpenSuperAdmin = () => {
    setActiveModuleTab('superadmin');
    setViewMode('module');
  };

  // 💬 Chat Session State
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return chatSessionService.getActiveSessionId() || 'session_init';
  });

  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    const existing = chatSessionService.getActiveSession();
    if (existing && existing.messages.length > 0) {
      return existing.messages;
    }
    return [];
  });

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('MesterAI tenker og analyserer...');
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedChangeOrderForDetail, setSelectedChangeOrderForDetail] = useState<any | null>(null);
  const [changeOrderScope, setChangeOrderScope] = useState<'project' | 'all'>('project');

  const isApprovedOrder = (co: any) => {
    const s = (co?.status || '').toLowerCase();
    return s === 'godkjent av kunde' || s === 'approved' || s === 'approved_by_admin' || s === 'godkjent' || s === 'accepted';
  };

  const isRejectedOrder = (co: any) => {
    const s = (co?.status || '').toLowerCase();
    return s === 'avvist' || s === 'avslått' || s === 'rejected';
  };

  const getThinkingSteps = (query: string) => {
    const lower = (query || '').toLowerCase();
    
    if (
      lower.includes('søk') || 
      lower.includes('helg') || 
      lower.includes('hva skjer') || 
      lower.includes('google') || 
      lower.includes('nettsøk') || 
      lower.includes('nyheter') || 
      lower.includes('arrangement') || 
      lower.includes('konsert') ||
      lower.includes('festival') ||
      lower.includes('åpningstid')
    ) {
      return [
        { id: 1, title: 'Definerer søkeintensjon og nøkkelord', time: 0 },
        { id: 2, title: 'Søker i sanntidskilder på nettet', time: 2 },
        { id: 3, title: 'Analyserer og kryssjekker ferske treff', time: 5 },
        { id: 4, title: 'Strukturerer svar med verifiserte kilder', time: 8 }
      ];
    }

    if (
      lower.includes('tilbud') || 
      lower.includes('kalkyle') || 
      lower.includes('pris') || 
      lower.includes('kostnad') || 
      lower.includes('materiell') || 
      lower.includes('gips')
    ) {
      return [
        { id: 1, title: 'Kartlegger oppdragsbeskrivelse og omfang', time: 0 },
        { id: 2, title: 'Beregner materialbehov og enhetspriser', time: 2 },
        { id: 3, title: 'Estimerer timeforbruk iht. bransjestandard', time: 5 },
        { id: 4, title: 'Utarbeider komplett kalkyle og tilbudsutkast', time: 8 }
      ];
    }

    if (
      lower.includes('sja') || 
      lower.includes('sikkerhet') || 
      lower.includes('hms') || 
      lower.includes('risiko') || 
      lower.includes('vern') ||
      lower.includes('stillas') ||
      lower.includes('fallsikring')
    ) {
      return [
        { id: 1, title: 'Kartlegger arbeidsoppgaver og risikofaktorer', time: 0 },
        { id: 2, title: 'Konsulterer Byggherreforskriften og HMS-krav', time: 2 },
        { id: 3, title: 'Definerer forebyggende sikringstiltak og PVU', time: 5 },
        { id: 4, title: 'Ferdigstiller godkjent Sikker Jobb Analyse (SJA)', time: 8 }
      ];
    }

    if (
      lower.includes('endring') || 
      lower.includes('ns 8406') || 
      lower.includes('ns8406') || 
      lower.includes('varsel') || 
      lower.includes('tillegg') ||
      lower.includes('krav')
    ) {
      return [
        { id: 1, title: 'Vurderer varslingsplikt og frister iht. NS 8406', time: 0 },
        { id: 2, title: 'Beregner konsekvens for fremdrift og vederlag', time: 2 },
        { id: 3, title: 'Formulerer formelt endringsvarsel for byggherre', time: 5 },
        { id: 4, title: 'Klargjør dokumentasjon og utsendelsesgrunnlag', time: 8 }
      ];
    }

    if (
      lower.includes('dagbok') || 
      lower.includes('time') || 
      lower.includes('timer') || 
      lower.includes('vær') ||
      lower.includes('bemanningsliste')
    ) {
      return [
        { id: 1, title: 'Henter gjeldende prosjektdata og sanntidsvær', time: 0 },
        { id: 2, title: 'Registrerer timefordeling og ressursbruk', time: 2 },
        { id: 3, title: 'Dokumenterer arbeidsforhold og fremdrift', time: 5 },
        { id: 4, title: 'Ferdigstiller oppføring i byggedagboken', time: 8 }
      ];
    }

    return [
      { id: 1, title: 'Analyserer henvendelse og byggeplasskontekst', time: 0 },
      { id: 2, title: 'Konsulterer TEK17 og relevante bransjestandarder', time: 2 },
      { id: 3, title: 'Utarbeider faglig vurdering og løsningsforslag', time: 5 },
      { id: 4, title: 'Kvalitetssikrer og ferdigstiller komplett svar', time: 8 }
    ];
  };

  const projectChangeOrders = useMemo(() => {
    if (!selectedProject) return changeOrders;
    return changeOrders.filter(co => {
      if (co.projectId && selectedProject.id) {
        return String(co.projectId) === String(selectedProject.id);
      }
      if (co.raw?.projectId && selectedProject.id) {
        return String(co.raw.projectId) === String(selectedProject.id);
      }
      if (co.project && selectedProject.name) {
        return co.project.toLowerCase().trim() === selectedProject.name.toLowerCase().trim();
      }
      return false;
    });
  }, [changeOrders, selectedProject]);

  const visibleChangeOrders = (selectedProject && changeOrderScope === 'project')
    ? projectChangeOrders
    : changeOrders;

  // ⏱️ Tenketimer og aktiv henvendelse for MesterAI
  const [activeThinkingDuration, setActiveThinkingDuration] = useState(0);
  const [activeThinkingQuery, setActiveThinkingQuery] = useState('');
  const thinkingTimerRef = useRef<any>(null);

  // 📱 Gemini Mobile Experience State
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isLiveVoiceActive, setIsLiveVoiceActive] = useState(false);
  const [selectedOfferForDetail, setSelectedOfferForDetail] = useState<any | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // 🔍 Top Search Bar & Floating Panel State (Alltid i arbeidsvinduet, aldri popups over menyen)
  const [isTopSearchOpen, setIsTopSearchOpen] = useState(false);
  const [topSearchQuery, setTopSearchQuery] = useState('');
  const topSearchInputRef = useRef<HTMLInputElement>(null);

  // 🧮 Hurtigkalkyle state for Tilbud & Kalkyle
  const [calcHours, setCalcHours] = useState(45);
  const [calcHourlyRate, setCalcHourlyRate] = useState(890);
  const [calcMaterials, setCalcMaterials] = useState(28500);
  const [calcMarkup, setCalcMarkup] = useState(15);

  // ⚙️ Innstillinger-modal rett inne i arbeidsstasjonen ("liten boks med alle funksjoner")
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 👥 Prosjektkontakter & Telefonbok state (Tenant & prosjekt-isolert)
  interface ProjectContactItem {
    id: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    companyName?: string;
    projectId?: string;
    category?: 'team' | 'subcontractor' | 'client' | 'former';
    isFormer?: boolean;
    accessibleProjects?: string[]; // IDs for tildelte byggeplasser eller ['all']
  }

  interface DailyTimeItem {
    id: string;
    workerName: string;
    role: string;
    date: string;
    hours: number;
    overtime50: number;
    overtime100: number;
    task: string;
    status: 'pending' | 'approved';
    projectId?: string;
    projectName?: string;
    loggedBy?: string;
  }

  const [projectContacts, setProjectContacts] = useState<ProjectContactItem[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactCategoryFilter, setContactCategoryFilter] = useState<'all' | 'team' | 'subcontractor' | 'client' | 'former'>('all');
  const [newContactCategory, setNewContactCategory] = useState<'team' | 'subcontractor' | 'client' | 'former'>('subcontractor');
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('Tømrer / Fagarbeider');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('');
  const [newContactProjects, setNewContactProjects] = useState<string[]>(['all']);

  // ✏️ Rediger kontakt state (Kun Admin)
  const [editingContact, setEditingContact] = useState<ProjectContactItem | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactRole, setEditContactRole] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactCompany, setEditContactCompany] = useState('');
  const [editContactCategory, setEditContactCategory] = useState<'team' | 'subcontractor' | 'client' | 'former'>('team');
  const [editContactProjects, setEditContactProjects] = useState<string[]>(['all']);

  // ⏱️ Byggedagbok & Timeføring state (AML § 10-7 og ledergodkjenning)
  const [dailyTimeEntries, setDailyTimeEntries] = useState<DailyTimeItem[]>([]);
  const [isTimeApprovalView, setIsTimeApprovalView] = useState(false);
  const [logHours, setLogHours] = useState('7.5');
  const [logDescription, setLogDescription] = useState('Lekting av yttervegg og klargjøring for kledning');
  const [logIsWeekendEvening, setLogIsWeekendEvening] = useState(false);
  const [logWorkerSelection, setLogWorkerSelection] = useState<string>('self');

  // 🔒 Håndheving av prosjekttilganger: Admin ser alle byggeplasser, fagarbeidere ser kun tildelte byggeplasser
  const userAccessibleProjects = useMemo(() => {
    if (isAdmin) return projects;
    const myEmail = (user?.email || '').trim().toLowerCase();
    const myName = (user?.displayName || '').trim().toLowerCase();
    const myContact = projectContacts.find(c => 
      (myEmail && c.email && c.email.trim().toLowerCase() === myEmail) ||
      (myName && c.name && c.name.trim().toLowerCase() === myName)
    );
    const allowed = (user as any)?.accessibleProjects || myContact?.accessibleProjects;
    if (allowed && Array.isArray(allowed)) {
      if (allowed.includes('all')) return projects;
      return projects.filter(p => allowed.includes(p.id));
    }
    return projects;
  }, [projects, isAdmin, user?.email, user?.displayName, (user as any)?.accessibleProjects, projectContacts]);

  const currentTenantScope = impersonatedCompanyId || (user?.company ? user.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'tenant_default');
  const contactsStorageKey = `mester_contacts_${currentTenantScope}_${selectedProject?.id || 'all'}`;
  const logsStorageKey = `mester_timelogs_${currentTenantScope}_${selectedProject?.id || 'all'}`;

  // Last inn telefonbok / kontakter & auto-synkroniser kunder fra prosjekter og kundeportal
  useEffect(() => {
    try {
      const raw = localStorage.getItem(contactsStorageKey);
      let list: ProjectContactItem[] = raw ? JSON.parse(raw) : [];

      // Auto-synkroniser kunder fra alle tilgjengelige byggeprosjekter (og kundeportal-registreringer)
      const existingClientEmails = new Set(list.map(c => (c.email || '').trim().toLowerCase()).filter(Boolean));
      const existingClientNames = new Set(list.map(c => (c.name || '').trim().toLowerCase()).filter(Boolean));

      let hasNewClients = false;
      projects.forEach(p => {
        if (p.clientName) {
          const normName = p.clientName.trim().toLowerCase();
          const normEmail = (p.clientEmail || '').trim().toLowerCase();
          if (!existingClientNames.has(normName) && (!normEmail || !existingClientEmails.has(normEmail))) {
            list.push({
              id: `c_proj_${p.id}`,
              name: p.clientName,
              role: 'Kunde / Byggherre',
              phone: (p as any).clientPhone || '+47 988 00 111',
              email: p.clientEmail || 'kunde@kundeportal.no',
              companyName: p.name,
              projectId: p.id,
              category: 'client'
            });
            existingClientNames.add(normName);
            if (normEmail) existingClientEmails.add(normEmail);
            hasNewClients = true;
          }
        }
      });

      // Auto-synkroniser innlogget bruker/ansatt
      if (user && user.displayName) {
        const normUserName = user.displayName.trim().toLowerCase();
        if (!existingClientNames.has(normUserName)) {
          list.push({
            id: 'c_user_me',
            name: user.displayName,
            role: (user.role === 'admin' || user.role === 'leader') ? 'Prosjektleder / Byggmester' : 'Fagarbeider',
            phone: '+47 900 00 000',
            email: user.email || 'kontakt@mester.no',
            companyName: user.company || 'Min Bedrift',
            category: 'team'
          });
          hasNewClients = true;
        }
      }

      setProjectContacts(list);
      if (hasNewClients || !raw) {
        localStorage.setItem(contactsStorageKey, JSON.stringify(list));
      }
    } catch (e) {
      console.warn("Could not load contacts:", e);
    }
  }, [contactsStorageKey, projects, user, impersonatedCompanyId]);

  // Last inn timeføringer og synkroniser mot backend
  useEffect(() => {
    let currentLogs: DailyTimeItem[] = [];
    try {
      const raw = localStorage.getItem(logsStorageKey);
      if (raw) {
        currentLogs = JSON.parse(raw);
        setDailyTimeEntries(currentLogs);
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        const initialLogs: DailyTimeItem[] = [
          {
            id: 'log_1',
            workerName: user?.displayName || 'Fagarbeider',
            role: user?.trade || 'Tømrer',
            date: todayStr,
            hours: 7.5,
            overtime50: 0,
            overtime100: 0,
            task: 'Oppstart byggeplass og kontroll av underlag',
            status: 'approved',
            projectId: selectedProject?.id,
            projectName: selectedProject?.name
          }
        ];
        currentLogs = initialLogs;
        setDailyTimeEntries(initialLogs);
        localStorage.setItem(logsStorageKey, JSON.stringify(initialLogs));
      }
    } catch (e) {}

    // Hent også lagrede timeføringer fra PostgreSQL / backend
    const fetchBackendLogs = async () => {
      try {
        const res = await fetch('/api/data/time_entries');
        if (res.ok) {
          const serverEntries = await res.json();
          if (Array.isArray(serverEntries) && serverEntries.length > 0) {
            const relevant = serverEntries.filter((item: any) => {
              if (!selectedProject?.id || selectedProject.id === 'all') return true;
              return item.projectId === selectedProject.id;
            });

            if (relevant.length > 0) {
              setDailyTimeEntries(prev => {
                const map = new Map<string, DailyTimeItem>();
                prev.forEach(item => map.set(item.id, item));
                relevant.forEach((item: any) => {
                  map.set(item.id, {
                    id: item.id,
                    workerName: item.workerName || user?.displayName || 'Fagarbeider',
                    role: item.role || 'Tømrer',
                    date: item.date || new Date().toISOString().split('T')[0],
                    hours: Number(item.hours) || 0,
                    overtime50: Number(item.overtime50) || 0,
                    overtime100: Number(item.overtime100) || 0,
                    task: item.task || 'Arbeid på byggeplass',
                    status: item.status || 'pending',
                    projectId: item.projectId,
                    projectName: item.projectName
                  });
                });
                const merged = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                try {
                  localStorage.setItem(logsStorageKey, JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
          }
        }
      } catch (err) {
        console.warn('Kunne ikke hente time_entries fra backend:', err);
      }
    };

    fetchBackendLogs();
  }, [logsStorageKey, selectedProject?.id, selectedProject?.name, impersonatedCompanyId]);

  // Arkiver kontakt som tidligere ansatt / historisk kontakt (anbefalt for reklamasjons- og HMS-historikk)
  const handleArchiveContact = (id: string, name: string) => {
    const updated = projectContacts.map(c => c.id === id ? { ...c, category: 'former' as const, isFormer: true } : c);
    setProjectContacts(updated);
    try {
      localStorage.setItem(contactsStorageKey, JSON.stringify(updated));
    } catch {}
    toast.success(`"${name}" er arkivert som tidligere kontakt. Telefon og e-post er bevart under "Tidligere ansatte / Arkiv".`);
  };

  // Gjenopprett kontakt til aktivt team
  const handleRestoreContact = (id: string, name: string) => {
    const updated = projectContacts.map(c => c.id === id ? { ...c, category: 'team' as const, isFormer: false } : c);
    setProjectContacts(updated);
    try {
      localStorage.setItem(contactsStorageKey, JSON.stringify(updated));
    } catch {}
    toast.success(`"${name}" er gjenopprettet i aktivt team.`);
  };

  // ✏️ Åpne redigeringsmodal (Kun Admin)
  const handleOpenEditContact = (contact: ProjectContactItem) => {
    if (!isAdmin) {
      toast.error('Kun administrator har tilgang til å redigere kontakter.');
      return;
    }
    setEditingContact(contact);
    setEditContactName(contact.name || '');
    setEditContactRole(contact.role || '');
    setEditContactPhone(contact.phone || '');
    setEditContactEmail(contact.email || '');
    setEditContactCompany(contact.companyName || '');
    setEditContactCategory(contact.category || 'team');
    setEditContactProjects(contact.accessibleProjects || ['all']);
  };

  // 💾 Lagre endret kontakt (Kun Admin)
  const handleSaveEditedContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Kun administrator har tilgang til å redigere kontakter.');
      return;
    }
    if (!editingContact || !editContactName.trim()) {
      toast.error('Vennligst oppgi navn på kontakten');
      return;
    }

    const updated = projectContacts.map(c => {
      if (c.id === editingContact.id) {
        return {
          ...c,
          name: editContactName.trim(),
          role: editContactRole.trim(),
          phone: editContactPhone.trim(),
          email: editContactEmail.trim(),
          companyName: editContactCompany.trim(),
          category: editContactCategory,
          isFormer: editContactCategory === 'former',
          accessibleProjects: editContactCategory === 'team' ? editContactProjects : c.accessibleProjects
        };
      }
      return c;
    });

    setProjectContacts(updated);
    try {
      localStorage.setItem(contactsStorageKey, JSON.stringify(updated));
    } catch {}

    setEditingContact(null);
    toast.success(`Kontakt "${editContactName.trim()}" er oppdatert med tildelte byggeplasser!`);
  };

  const handleDeleteContact = (id: string, name: string, phone: string, category?: string) => {
    if (!isAdmin) {
      toast.error('Kun administrator har tilgang til å slette eller arkivere kontakter.');
      return;
    }

    if (category === 'team') {
      const shouldArchive = window.confirm(
        `Tips for reklamasjon og HMS:\nVil du arkivere ${name} som «Tidligere ansatt» slik at telefon og e-post beholdes dersom det oppstår spørsmål om tidligere utført arbeid?\n\n- Trykk OK for å ARKIVERE som tidligere ansatt (anbefalt)\n- Trykk AVBRYT for å slette permanent i neste trinn.`
      );
      if (shouldArchive) {
        handleArchiveContact(id, name);
        return;
      }
    }

    if (window.confirm(`Er du sikker på at du vil slette ${name} (${phone}) permanent fra telefonboken?`)) {
      const updated = projectContacts.filter(c => c.id !== id);
      setProjectContacts(updated);
      try {
        localStorage.setItem(contactsStorageKey, JSON.stringify(updated));
      } catch {}
      toast.success(`Kontakt "${name}" er slettet fra telefonboken.`);
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      toast.error('Vennligst oppgi navn på kontakten');
      return;
    }
    const newC: ProjectContactItem = {
      id: `c_${Date.now()}`,
      name: newContactName.trim(),
      role: newContactRole.trim(),
      phone: newContactPhone.trim() || '+47 000 00 000',
      email: newContactEmail.trim() || 'kontakt@firma.no',
      companyName: newContactCompany.trim() || (user?.company || 'Bedrift'),
      projectId: selectedProject?.id,
      category: newContactCategory,
      isFormer: newContactCategory === 'former',
      accessibleProjects: newContactCategory === 'team' ? newContactProjects : ['all']
    };
    const updated = [newC, ...projectContacts];
    setProjectContacts(updated);
    try {
      localStorage.setItem(contactsStorageKey, JSON.stringify(updated));
    } catch {}
    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setNewContactCompany('');
    setNewContactCategory('subcontractor');
    setNewContactProjects(['all']);
    setIsAddContactModalOpen(false);
    toast.success(`Kontakt "${newC.name}" lagt til i telefonboken med prosjekttilgang!`);
  };

  const handleSaveDailyLog = async () => {
    const parsedH = parseFloat(logHours.replace(',', '.')) || 7.5;
    const normalH = Math.min(7.5, parsedH);
    const ot50 = logIsWeekendEvening ? 0 : Math.max(0, parsedH - 7.5);
    const ot100 = logIsWeekendEvening ? parsedH : 0;

    let targetWorkerName = user?.displayName || 'Fagarbeider';
    let targetWorkerRole = user?.trade || 'Tømrer';

    if (isAdmin && logWorkerSelection && logWorkerSelection !== 'self') {
      const found = projectContacts.find(c => c.id === logWorkerSelection);
      if (found) {
        targetWorkerName = found.name;
        targetWorkerRole = found.role;
      }
    }

    const newEntry: DailyTimeItem = {
      id: `time_${Date.now()}`,
      workerName: targetWorkerName,
      role: targetWorkerRole,
      date: new Date().toISOString().split('T')[0],
      hours: normalH,
      overtime50: ot50,
      overtime100: ot100,
      task: logDescription || 'Arbeid på byggeplass',
      status: 'pending',
      projectId: selectedProject?.id,
      projectName: selectedProject?.name,
      loggedBy: (isAdmin && targetWorkerName !== user?.displayName) ? `${user?.displayName || 'Admin'} (Leder)` : undefined
    };
    const updated = [newEntry, ...dailyTimeEntries];
    setDailyTimeEntries(updated);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(updated));
    } catch {}

    // Lagre også til backend / PostgreSQL
    try {
      await fetch('/api/data/time_entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
    } catch (e) {
      console.warn('Kunne ikke synkronisere timeføring til backend:', e);
    }

    toast.success(`Ført ${parsedH} timer på ${targetWorkerName} (${ot50 > 0 ? `+${ot50}t 50% overtid` : ot100 > 0 ? `+${ot100}t 100% overtid` : 'normaltid'})`);
  };

  const handleApproveAllLogs = async () => {
    const updated = dailyTimeEntries.map(entry => ({ ...entry, status: 'approved' as const }));
    setDailyTimeEntries(updated);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(updated));
    } catch {}

    // Oppdater i backend også
    try {
      for (const entry of updated) {
        await fetch(`/api/data/time_entries/${entry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' })
        }).catch(() => null);
      }
    } catch (e) {}

    toast.success('Alle førte timer og overtid er godkjent av leder iht. AML § 10-7.');
  };

  const handleApproveSingleLog = async (id: string) => {
    const updated = dailyTimeEntries.map(entry => entry.id === id ? { ...entry, status: 'approved' as const } : entry);
    setDailyTimeEntries(updated);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(updated));
    } catch {}

    try {
      await fetch(`/api/data/time_entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
    } catch (e) {}

    toast.success('Timeføring godkjent av leder iht. AML § 10-7.');
  };

  const handleToggleSingleLogStatus = async (id: string) => {
    const target = dailyTimeEntries.find(e => e.id === id);
    if (!target) return;
    const newStatus = target.status === 'approved' ? ('pending' as const) : ('approved' as const);
    const updated = dailyTimeEntries.map(entry => entry.id === id ? { ...entry, status: newStatus } : entry);
    setDailyTimeEntries(updated);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(updated));
    } catch {}

    try {
      await fetch(`/api/data/time_entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {}

    toast.success(newStatus === 'approved' ? 'Timeføring godkjent av leder iht. AML § 10-7.' : 'Timeføring satt tilbake til venter.');
  };

  const handleDeleteSingleLog = async (id: string) => {
    const updated = dailyTimeEntries.filter(entry => entry.id !== id);
    setDailyTimeEntries(updated);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(updated));
    } catch {}

    try {
      await fetch(`/api/data/time_entries/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {}

    toast.success('Timeføring slettet.');
  };

  // 🏗️ Nytt prosjekt inline state
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjAddress, setNewProjAddress] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjStage, setNewProjStage] = useState<'Planlegging' | 'Oppstart' | 'Pågående' | 'Ferdigstillelse'>('Pågående');
  const [newProjAiPrompt, setNewProjAiPrompt] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // ⋯ Alle fagmoduler filter og søk
  const [allModulesCategory, setAllModulesCategory] = useState<'all' | 'prosjekt' | 'ks_hms' | 'okonomi' | 'ressurser' | 'superadmin'>('all');
  const [allModulesSearch, setAllModulesSearch] = useState('');

  // Bildeopplasting
  const [attachedImage, setAttachedImage] = useState<{ url: string; preview: string; name?: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const loadingTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    };
  }, []);

  // Fokus på søkelinje når den åpnes
  useEffect(() => {
    if (isTopSearchOpen) {
      setTimeout(() => topSearchInputRef.current?.focus(), 60);
    }
  }, [isTopSearchOpen]);

  // Tastatursnarvei ⌘K / Ctrl+K
  useEffect(() => {
    const handleWorkstationKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsTopSearchOpen(prev => !prev);
      } else if (e.key === 'Escape' && isTopSearchOpen) {
        setIsTopSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleWorkstationKey);
    return () => window.removeEventListener('keydown', handleWorkstationKey);
  }, [isTopSearchOpen]);

  // Lytt til select_chat_session custom event
  useEffect(() => {
    const handleSelectSessionEvent = (e: any) => {
      if (e.detail?.sessionId) {
        handleSelectSession(e.detail.sessionId);
      }
    };
    window.addEventListener('select_chat_session', handleSelectSessionEvent);
    return () => window.removeEventListener('select_chat_session', handleSelectSessionEvent);
  }, [projects]);

  // 🔄 Initialiser eller synkroniser aktiv sesjon (isolerer strengt per kunde/bedrift)
  useEffect(() => {
    const syncActiveSession = () => {
      const active = chatSessionService.getActiveSession();
      if (active) {
        setActiveSessionId(active.id);
        setMessages(active.messages || []);
        if (active.projectId) {
          const found = projects.find(p => p.id === active.projectId);
          if (found) onSelectProject(found);
        }
      } else {
        const fresh = chatSessionService.createSession({
          projectName: selectedProject?.name,
          projectId: selectedProject?.id
        });
        setActiveSessionId(fresh.id);
        setMessages([]);
      }
    };

    syncActiveSession();

    const handleSessionChange = () => syncActiveSession();
    window.addEventListener('mester_impersonation_changed', handleSessionChange);
    window.addEventListener('mester_chat_sessions_changed', handleSessionChange);

    return () => {
      window.removeEventListener('mester_impersonation_changed', handleSessionChange);
      window.removeEventListener('mester_chat_sessions_changed', handleSessionChange);
    };
  }, [impersonatedCompanyId, company, projects]);

  // 📜 Autoscroll til bunnen når nye meldinger ankommer
  useEffect(() => {
    if (viewMode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, viewMode]);

  // 📐 Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 44), 160)}px`;
    }
  }, [inputVal]);

  // Håndter initialPrompt (hvis sendt inn fra eksternt sted)
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
      onPromptHandled?.();
    }
  }, [initialPrompt]);

  // ➕ Ny samtale
  const handleNewChat = () => {
    const fresh = chatSessionService.createSession({
      projectName: selectedProject?.name,
      projectId: selectedProject?.id
    });
    setActiveSessionId(fresh.id);
    setMessages([]);
    setInputVal('');
    setAttachedImage(null);
    setViewMode('chat');
    setActiveModuleTab(null);
    setActiveForm(null);
    toast.success('Ny samtale startet');
  };

  // 🔄 Velg en eksisterende samtale fra historikken
  const handleSelectSession = (sessionId: string) => {
    chatSessionService.setActiveSessionId(sessionId);
    setActiveSessionId(sessionId);
    const target = chatSessionService.getSessions().find(s => s.id === sessionId);
    if (target) {
      setMessages(target.messages || []);
      if (target.projectId) {
        const found = projects.find(p => p.id === target.projectId);
        if (found) onSelectProject(found);
      }
    }
    setViewMode('chat');
    setActiveModuleTab(null);
    setActiveForm(null);
  };

  // 🛠️ Åpne modul fra sidemeny - Alt åpnes direkte i arbeidsvinduet!
  const handleOpenModuleFromSidebar = (moduleId: string) => {
    setActiveModuleTab(moduleId);
    setViewMode('module');
  };

  // 🚀 Aktiver modul fra "Alle moduler"-oversikten
  const handleModuleCardClick = (actionId: string) => {
    switch (actionId) {
      case 'projects':
        setActiveModuleTab('all_projects');
        setViewMode('module');
        break;
      case 'create_project':
        setActiveModuleTab('create_project');
        setViewMode('module');
        break;
      case 'dailylog':
        setActiveModuleTab('dailylog');
        setViewMode('module');
        break;
      case 'weather':
        setActiveModuleTab('dailylog');
        setViewMode('module');
        toast.info('Viser sanntids værdata fra Yr.no i byggedagboken');
        break;
      case 'archive':
        setActiveModuleTab('archive');
        setViewMode('module');
        break;
      case 'building_app':
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'building_app' } }));
        break;
      case 'checklists':
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'start_checklist' } }));
        break;
      case 'ai_vision':
        if (onOpenAIVision) onOpenAIVision();
        else window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'take_photo' } }));
        break;
      case 'sja':
        setActiveModuleTab('sja');
        setViewMode('module');
        break;
      case 'deviations':
        setActiveModuleTab('deviations');
        setViewMode('module');
        break;
      case 'pre_close':
        setActiveModuleTab('pre_close');
        setViewMode('module');
        break;
      case 'hms':
        setActiveModuleTab('hms');
        setViewMode('module');
        break;
      case 'change_orders':
        setActiveModuleTab('change_orders');
        setViewMode('module');
        break;
      case 'offers':
        setActiveModuleTab('offers');
        setViewMode('module');
        break;
      case 'contracts':
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'contracts' } }));
        break;
      case 'time':
        if (onOpenTimeModal) onOpenTimeModal();
        else window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'time_registration' } }));
        break;
      case 'handover':
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'handover' } }));
        break;
      case 'vehicle':
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'vehicle' } }));
        break;
      case 'inventory':
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'inventory' } }));
        break;
      case 'contacts':
        setActiveModuleTab('contacts');
        setViewMode('module');
        break;
      case 'apprentice':
        setActiveModuleTab('apprentice');
        setViewMode('module');
        break;
      case 'translator':
        setViewMode('chat');
        handleSendMessage('Hei MesterAI! Jeg trenger hjelp med flerspråklig oversettelse på byggeplassen. Hvilke språk støtter du, og kan du hjelpe meg med en faglig oversettelse?');
        break;
      case 'super_admin':
        handleOpenSuperAdmin();
        break;
      default:
        handleOpenModuleFromSidebar(actionId);
        break;
    }
  };

  // 📜 Generer fullstendig FDV-sluttrapport for prosjektet (basert på alt som har skjedd på byggeplassen)
  const handleGenerateFdvSluttrapport = async (projectToFdv?: Project | null) => {
    const targetProject = projectToFdv || selectedProject;
    if (!targetProject) {
      toast.error('Velg et prosjekt for å generere FDV-sluttrapport.');
      return;
    }
    const toastId = toast.loading(`Samler inn byggedagbok, sjekklister, NOBB-materialer og avvik for ${targetProject.name}...`);
    try {
      const res = await fetch('/api/documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_combined_fdv',
          projectId: targetProject.id,
          projectInfo: {
            name: targetProject.name,
            clientName: targetProject.clientName || 'Byggherre',
            address: targetProject.address || (targetProject as any).location || 'Byggeplass',
            code: targetProject.code || targetProject.projectCode || 'PROJ'
          },
          companyName: user?.company || 'Viking Entreprenør AS'
        })
      });
      const data = await res.json();
      toast.dismiss(toastId);
      if (data.html) {
        const blob = new Blob([data.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `FDV_Sluttrapport_${targetProject.name.replace(/\s+/g, '_')}.html`;
          a.click();
        }
        toast.success(`FDV og sluttrapport for ${targetProject.name} er ferdigstilt og åpnet! 🎉`);
      } else {
        toast.info(`FDV-rapport samlet: ${data.message || 'Klar til nedlasting'}`);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Kunne ikke hente FDV-rapport. Vennligst sjekk nettverkstilkoblingen.');
    }
  };

  // 💰 Opprett tilbud direkte fra hurtigkalkyle
  const handleCreateOfferFromCalc = async () => {
    const labor = calcHours * calcHourlyRate;
    const mats = Math.round(calcMaterials * (1 + calcMarkup / 100));
    const total = labor + mats;
    const items = [
      {
        description: `Tømrer- og fagmessig byggearbeid (${calcHours} timer)`,
        quantity: calcHours,
        unit: 'timer',
        pricePerUnit: calcHourlyRate,
        total: labor
      },
      {
        description: `Byggematerialer og forbruksmateriell (inkl. ${calcMarkup}% påslag og svinn)`,
        quantity: 1,
        unit: 'stk',
        pricePerUnit: mats,
        total: mats
      }
    ];
    const newOffer = {
      title: `Tilbud: ${selectedProject?.name || 'Byggeoppdrag'}`,
      projectName: selectedProject?.name || 'Geitekleiva 12',
      projectId: selectedProject?.id || 'gen',
      clientName: selectedProject?.clientName || 'Privatkunde',
      amount: total,
      totalPrice: total,
      totalAmount: total,
      hours: calcHours,
      materials: mats,
      items,
      status: 'Sendt til kunde',
      createdAt: new Date().toISOString().split('T')[0]
    };
    try {
      await addDoc(collection(db, 'offers'), newOffer);
      toast.success(`Opprettet pristilbud på kr ${total.toLocaleString('no-NO')} eks. mva med ${items.length} spesifiserte tilbudsposter!`);
    } catch (e) {
      toast.info(`Tilbud på kr ${total.toLocaleString('no-NO')} er klart i kalkylen!`);
    }
  };

  // 🪄 AI Autofyll for prosjektopprettelse
  const handleQuickAiFillProject = (type?: string) => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    if (type === 'bad') {
      setNewProjName('Totalrenovering Bad - Våtromsnormen');
      setNewProjCode(`BAD-${randomNum}`);
      setNewProjClient('Privatkunde');
      setNewProjAddress('Vidjeveien 21, Oslo');
      setNewProjDesc('Totalrehabilitering av baderom iht. Byggebransjens Våtromsnorm (BVN) og TEK17. Inkluderer riving, slukbytte, membranarbeid, flislegging og sanitærmontasje.');
      setNewProjStage('Oppstart');
      toast.success('Forhåndsutfylt mal for Bad / Våtrom BVN');
    } else if (type === 'enebolig') {
      setNewProjName('Nybygg Enebolig TEK17');
      setNewProjCode(`ENE-${randomNum}`);
      setNewProjClient('Familien Hansen');
      setNewProjAddress('Furuveien 8, Drammen');
      setNewProjDesc('Oppføring av moderne enebolig i trekonstruksjon iht. TEK17 energikrav, radon- og fuktsikring, samt integrert teknisk anlegg.');
      setNewProjStage('Planlegging');
      toast.success('Forhåndsutfylt mal for Enebolig TEK17');
    } else if (type === 'tilbygg') {
      setNewProjName('Tilbygg & Takoppløft');
      setNewProjCode(`TIL-${randomNum}`);
      setNewProjClient('Kari & Per Johansen');
      setNewProjAddress('Solbakken 19, Asker');
      setNewProjDesc('Tilbygg på 45 m² med stueutvidelse, takoppløft med nye arker og komplett fasadeoppgradering.');
      setNewProjStage('Pågående');
      toast.success('Forhåndsutfylt mal for Tilbygg');
    } else if (type === 'naering') {
      setNewProjName('Lokaletilpasning Kontorbygg');
      setNewProjCode(`NÆR-${randomNum}`);
      setNewProjClient('Næringsutvikling AS');
      setNewProjAddress('Industriveien 3, Sandvika');
      setNewProjDesc('Ombygging av kontorlokaler: systemvegger, akustiske himlinger, sprinklerjustering og TEK17 universell utforming.');
      setNewProjStage('Planlegging');
      toast.success('Forhåndsutfylt mal for Næringsbygg');
    } else if (newProjAiPrompt.trim()) {
      const promptLower = newProjAiPrompt.toLowerCase();
      let detectedName = newProjAiPrompt.slice(0, 45);
      let detectedClient = 'Privatkunde';
      let detectedAddress = 'Norge';

      if (promptLower.includes('bad')) {
        detectedName = 'Totalrenovering Bad';
      } else if (promptLower.includes('kjøkken')) {
        detectedName = 'Kjøkkenfornying & Montering';
      } else if (promptLower.includes('tak')) {
        detectedName = 'Takomlegging & Nytt Beslag';
      } else if (promptLower.includes('garasje')) {
        detectedName = 'Ny Garasje m/bod';
      }

      setNewProjName(detectedName);
      setNewProjCode(`PROJ-${randomNum}`);
      setNewProjClient(detectedClient);
      setNewProjAddress(detectedAddress);
      setNewProjDesc(newProjAiPrompt);
      setNewProjStage('Oppstart');
      toast.success('MesterAI har generert prosjektdata fra beskrivelsen!');
    } else {
      toast.info('Skriv inn en kort beskrivelse i AI-feltet eller velg en ferdig mal');
    }
  };

  // 💾 Lagre nytt prosjekt direkte i Firestore og sett det som aktivt
  const handleSaveNewProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProjName.trim()) {
      toast.error('Vennligst oppgi et prosjektnavn');
      return;
    }

    setIsCreatingProject(true);
    const code = newProjCode.trim() || `PROJ-${Math.floor(100 + Math.random() * 900)}`;
    const client = newProjClient.trim() || 'Privatoppdrag';
    const address = newProjAddress.trim() || 'Byggeplass Norge';
    const desc = newProjDesc.trim() || 'Oppdrag opprettet i MesterWorkstation';

    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: newProjName.trim(),
        code,
        clientName: client,
        address,
        description: desc,
        stage: newProjStage,
        status: 'active',
        progress: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'mester-bruker'
      });

      const created: Project = {
        id: docRef.id,
        name: newProjName.trim(),
        code,
        clientName: client,
        address,
        location: address,
        description: desc,
        stage: newProjStage,
        status: 'active',
        progress: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onSelectProject(created);
      setActiveModuleTab('project_details');
      setViewMode('module');

      setNewProjName('');
      setNewProjCode('');
      setNewProjClient('');
      setNewProjAddress('');
      setNewProjDesc('');
      setNewProjAiPrompt('');

      toast.success(`Prosjekt «${created.name}» er opprettet og aktivt!`);
    } catch (err) {
      console.error('Feil ved opprettelse av prosjekt:', err);
      const localProject: Project = {
        id: `local-${Date.now()}`,
        name: newProjName.trim(),
        code,
        clientName: client,
        address,
        location: address,
        description: desc,
        stage: newProjStage,
        status: 'active',
        progress: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onSelectProject(localProject);
      setActiveModuleTab('project_details');
      setViewMode('module');
      toast.success(`Prosjekt «${localProject.name}» er opprettet lokalt!`);
    } finally {
      setIsCreatingProject(false);
    }
  };

  // 📷 Bildeopplasting
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vennligst velg en bildefil');
      return;
    }

    setIsUploadingImage(true);
    const localPreview = URL.createObjectURL(file);

    // Vis bildet umiddelbart så brukeren slipper ventetid
    setAttachedImage({
      url: localPreview,
      preview: localPreview,
      name: file.name
    });
    toast.info('Behandler bilde...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setAttachedImage({
          url: data.url || localPreview,
          preview: localPreview,
          name: file.name
        });
        toast.success('Bilde klart for analyse!');
      } else {
        // Fallback til Base64 dersom serveropplasting feiler eller mangler rettigheter
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            setAttachedImage({
              url: reader.result as string,
              preview: localPreview,
              name: file.name
            });
            toast.success('Bilde klart for analyse!');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.warn('Opplasting via server feilet, bruker lokal base64:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setAttachedImage({
            url: reader.result as string,
            preview: localPreview,
            name: file.name
          });
          toast.success('Bilde klart for analyse!');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // 🎙️ Mikrofon / Tale-til-tekst
  const toggleMic = () => {
    if (isListeningMic) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListeningMic(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info('Tale-til-tekst støttes ikke direkte i denne nettleseren.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'nb-NO';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;

      let captured = '';

      recognition.onstart = () => {
        setIsListeningMic(true);
        toast.info('🎙️ Lytter... Snakk inn instruksen nå');
      };

      recognition.onresult = (event: any) => {
        for (let i = 0; i < event.results.length; ++i) {
          captured += event.results[i][0]?.transcript || '';
        }
        if (captured.trim()) {
          setInputVal(prev => prev ? `${prev} ${captured.trim()}` : captured.trim());
        }
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
        if (captured.trim()) {
          toast.success(`Oppfattet: "${captured.trim()}"`);
          handleSendMessage(captured.trim());
        }
      };

      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  // 🔊 TTS Taleopplesning
  const handleSpeakText = async (textToSpeak: string) => {
    if (isSpeaking) {
      if (audioPlayerRef.current) {
        try { audioPlayerRef.current.pause(); } catch {}
        audioPlayerRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          text: textToSpeak,
          voice: 'onyx',
          model: 'tts-1'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audioPlayerRef.current = audio;
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => setIsSpeaking(false);
          await audio.play();
          return;
        }
      }
    } catch {}

    // Fallback til nettleserstemme
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const clean = textToSpeak.replace(/[*_#`~>]/g, '').slice(0, 600);
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'nb-NO';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  // ✉️ Send melding til MesterAI
  const handleSendMessage = async (textToSend: string, imageOverride?: string) => {
    const activeImage = imageOverride || attachedImage?.url;
    const previewImage = attachedImage?.preview;

    if ((!textToSend.trim() && !activeImage) || isLoading) return;

    setAttachedImage(null);

    const userMessage: ChatMessageItem = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend.trim() || (activeImage ? 'Vennligst analyser dette bildet for fagmessig utførelse og TEK17.' : ''),
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      imageUrl: previewImage || activeImage
    };

    const updatedWithUser = [...messages, userMessage];
    setMessages(updatedWithUser);
    setInputVal('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';
    // 🔍 Sjekk om meldingen refererer til et spesifikt prosjekt (eller om et prosjekt allerede er valgt)
    let currentProj = selectedProject;
    const lowerText = (textToSend || userMessage.content).toLowerCase().trim();

    // ⚡ Direktenavigasjon på quick replies / kommandoer
    if (
      lowerText === 'vis timegodkjenning for leder' || 
      lowerText === 'åpne ledergodkjenning' || 
      lowerText === 'gå til ledergodkjenning' ||
      lowerText === 'se ledergodkjenning'
    ) {
      setActiveModuleTab('dailylog');
      setIsTimeApprovalView(true);
      setViewMode('module');
      toast.info('Åpner ledergodkjenning for førte timer og overtid.');
      return;
    }
    if (
      lowerText === 'vis byggedagbok' || 
      lowerText === 'åpne byggedagbok'
    ) {
      setActiveModuleTab('dailylog');
      setIsTimeApprovalView(false);
      setViewMode('module');
      return;
    }

    if (projects && projects.length > 0) {
      const matched = projects.find(p => {
        const pName = (p.name || '').toLowerCase().trim();
        const pAddress = (p.address || (p as any).location || '').toLowerCase().trim();
        const pCode = (p.code || '').toLowerCase().trim();

        // 1. Eksakt match eller fullt prosjektnavn / adresse i teksten
        if (pName && (lowerText === pName || lowerText.includes(pName))) return true;
        if (pAddress && (lowerText === pAddress || lowerText.includes(pAddress))) return true;
        if (pCode && pCode.length >= 3 && lowerText.includes(pCode)) return true;

        // 2. Delord fra prosjektnavn (f.eks. "Vidjeveien" fra "Renovering Bad Vidjeveien 21")
        const words = pName.split(/[\s,.-]+/).filter(w => 
          w.length >= 4 && !['renovering', 'bad', 'enebolig', 'bygg', 'prosjekt', 'tilbygg', 'nybygg', 'hytte'].includes(w)
        );
        if (words.length > 0 && words.some(w => lowerText.includes(w))) return true;

        return false;
      });

      if (matched) {
        currentProj = matched;
        if (!selectedProject || selectedProject.id !== matched.id) {
          onSelectProject(matched);
        }
      }
    }

    const activeProjName = currentProj?.name || undefined;
    const activeProjId = currentProj?.id || undefined;

    setActiveThinkingDuration(0);
    setActiveThinkingQuery(textToSend.trim() || userMessage.content || '');
    setIsLoading(true);

    if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);

    let seconds = 0;
    thinkingTimerRef.current = setInterval(() => {
      seconds += 1;
      setActiveThinkingDuration(seconds);
    }, 1000);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const impersonated = typeof window !== 'undefined' ? localStorage.getItem('impersonatedCompanyId') : null;
      const effectiveCompanyId = impersonated || (user as any)?.companyId || 'comp-001';
      const effectiveCompanyName = impersonated === 'comp-demo-fjellheim' 
        ? 'Fjellheim Bygg & Tømrer AS' 
        : (company || user?.company || 'Viking Entreprenør AS');
      const effectiveUserName = impersonated === 'comp-demo-fjellheim' 
        ? 'Lars Fjellheim' 
        : (user?.displayName || 'Kenneth Glosli Kristiansen');

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          message: textToSend.trim() || userMessage.content,
          sessionId: activeSessionId,
          projectName: activeProjName,
          projectId: activeProjId,
          availableProjects: userAccessibleProjects.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            address: p.address || (p as any).location
          })),
          userName: effectiveUserName,
          userTrade: trade || user?.trade || 'carpenter',
          userRole: role || user?.role || 'worker',
          isAdmin: isAdmin,
          companyName: effectiveCompanyName,
          companyId: effectiveCompanyId,
          userId: impersonated === 'comp-demo-fjellheim' ? 'u-demo-lars-fjellheim' : (user?.uid || user?.id),
          userEmail: user?.email || '',
          replyTo: user?.email || '',
          imageUrl: activeImage,
          teamMembers: projectContacts
            .filter(c => c.category === 'team')
            .map(c => ({ id: c.id, name: c.name, role: c.role, email: c.email }))
        })
      });

      if (!res.ok) throw new Error(`Agent-API svarte med status ${res.status}`);

      const data = await res.json();

      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }

      const assistantMessage: ChatMessageItem = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Forespørselen din er behandlet.',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        quickReplies: data.quickReplies
      };

      const finalMessages = [...updatedWithUser, assistantMessage];
      setMessages(finalMessages);

      // ⏱️ Fang opp direkte timeføring fra MesterAI og oppdater Byggedagbok & Timer i sanntid
      if (data.timeEntry) {
        setDailyTimeEntries(prev => {
          const exists = prev.some(e => e.id === data.timeEntry.id);
          const updated = exists ? prev : [data.timeEntry, ...prev];
          try {
            localStorage.setItem(logsStorageKey, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        const totalLogged = (Number(data.timeEntry.hours) || 0) + (Number(data.timeEntry.overtime50) || 0) + (Number(data.timeEntry.overtime100) || 0);
        toast.success(`⏱️ ${totalLogged.toFixed(1)}t registrert i byggedagboken for ${data.timeEntry.projectName || 'prosjektet'}!`);
      }

      // 🎙️ Live Voice mode: les opp svar automatisk
      if (isLiveVoiceActive && assistantMessage.content) {
        handleSpeakText(assistantMessage.content);
      }

      // Lagre i sesjonstjenesten (oppdaterer tittel i sidebaren automatisk)
      chatSessionService.saveSessionMessages(activeSessionId, finalMessages, {
        autoTitle: true,
        projectName: activeProjName,
        projectId: activeProjId
      });
    } catch (err: any) {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
      console.error(err);
      toast.error('Feil ved kontakt med MesterAI: ' + err.message);
      const errMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Beklager, det oppstod en midlertidig feil under tilkoblingen til MesterAI. Vennligst prøv igjen.`,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      setActiveThinkingQuery('');
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Kopiert til utklippstavle');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 md:static flex h-[100dvh] w-full bg-[#0A101D] text-slate-100 overflow-hidden font-sans overscroll-none">
      {/* 1. Left Sidebar (Collapsible Desktop + Mobile Drawer) */}
      <WorkstationSidebar
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        isCollapsedDesktop={isCollapsedDesktop}
        onToggleCollapseDesktop={toggleCollapseDesktop}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={(p) => {
          onSelectProject(p);
          if (p) {
            if (activeModuleTab === 'all_projects' || !activeModuleTab) {
              setActiveModuleTab('project_details');
              setViewMode('module');
            }
            toast.info(`Aktivt prosjekt: ${p.name}`);
          } else {
            if (activeModuleTab === 'project_details') {
              setActiveModuleTab('all_projects');
              setViewMode('module');
            }
            toast.info('Viser alle byggeplasser');
          }
        }}
        onOpenCreateProject={() => {
          setActiveModuleTab('create_project');
          setViewMode('module');
        }}
        onOpenModule={handleOpenModuleFromSidebar}
        onOpenSmartSearch={() => setIsTopSearchOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenSuperAdmin={handleOpenSuperAdmin}
        user={user}
        isSuperAdmin={isSuperAdmin}
        onLogout={logout}
        currentActiveTab={activeModuleTab || undefined}
      />

      {/* 2. Main Workstation Center Stage */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0A101D] relative">
        {/* Top Navigation Bar (Gemini & ChatGPT style) */}
        <header className="h-14 px-3 sm:px-5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-[#0A101D]/90 backdrop-blur-md shrink-0 z-30">
          {isTopSearchOpen ? (
            <div className="flex-1 flex items-center gap-2 max-w-3xl mx-auto animate-in fade-in duration-150">
              <div className="relative flex-1 flex items-center">
                <Search size={16} className="absolute left-3.5 text-purple-400 shrink-0" />
                <input
                  ref={topSearchInputRef}
                  type="text"
                  placeholder="Søk i byggeplasser, avvik, sjekklister, NOBB-materiell eller NS 8406..."
                  value={topSearchQuery}
                  onChange={(e) => setTopSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsTopSearchOpen(false);
                      setTopSearchQuery('');
                    }
                  }}
                  className="w-full pl-10 pr-8 py-2 rounded-xl bg-slate-900 border border-purple-500/30 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
                  autoFocus
                />
                {topSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTopSearchQuery('')}
                    className="absolute right-2.5 text-slate-400 hover:text-white p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTopSearchOpen(false);
                  setTopSearchQuery('');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Lukk (Esc)
              </button>
            </div>
          ) : (
            <>
              {/* 📱 MOBILE TOP BAR (1:1 Google Gemini App - Screenshot 3) */}
              <div className="flex md:hidden items-center justify-between w-full">
                {/* Left: Hamburger Menu */}
                <button
                  type="button"
                  onClick={() => setIsOpenMobile(true)}
                  className="p-2 -ml-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Åpne meny"
                >
                  <Menu size={22} />
                </button>

                {/* Center: Model / Project Switcher Pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1e1f20] border border-white/10 text-xs font-semibold text-white shadow-xs hover:border-white/20 transition-all cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate max-w-[150px]">
                      {selectedProject ? selectedProject.name : 'MesterAI v2.6'}
                    </span>
                    <ChevronDown size={14} className="text-slate-400 shrink-0" />
                  </button>

                  {/* Project Switcher Dropdown on Mobile */}
                  {isProjectDropdownOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-[#131314] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-white/10 flex items-center justify-between">
                        <span>Velg aktiv byggeplass</span>
                        <span className="text-emerald-400 font-mono">{projects.length} prosjekter</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectProject(null);
                          setIsProjectDropdownOpen(false);
                          setActiveModuleTab('all_projects');
                          setViewMode('module');
                        }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer mt-1",
                          !selectedProject ? "bg-white/10 text-white border border-white/20" : "text-slate-300 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Building2 size={15} className="shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <p className="truncate font-bold">Alle byggeplasser</p>
                          <p className="text-[10px] text-slate-400">Totaloversikt over oppdrag</p>
                        </div>
                      </button>

                      {userAccessibleProjects.map((proj) => (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            onSelectProject(proj);
                            setIsProjectDropdownOpen(false);
                            setActiveModuleTab('project_details');
                            setViewMode('module');
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer mt-0.5",
                            selectedProject?.id === proj.id ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-300 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <HardHat size={14} className="shrink-0 text-emerald-400" />
                          <div className="min-w-0">
                            <p className="truncate font-bold">{proj.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{proj.clientName || 'Privat oppdragsgiver'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Compose ✏️ + Profile Avatar */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleNewChat();
                      setViewMode('chat');
                    }}
                    className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Start ny samtale"
                  >
                    <SquarePen size={19} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="w-8 h-8 rounded-full border border-white/20 overflow-hidden flex items-center justify-center bg-gradient-to-tr from-purple-600 to-blue-500 text-white font-bold text-xs shrink-0 active:scale-95 transition-transform"
                    title="Innstillinger & Profil"
                  >
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profil" className="w-full h-full object-cover" />
                    ) : (
                      <span>{user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'K'}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* 🖥️ DESKTOP TOP BAR (Full workstation cockpit) */}
              <div className="hidden md:flex items-center justify-between w-full">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Workstation Badge & Selected Project Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs font-bold text-white transition-all cursor-pointer shadow-xs group"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate max-w-[220px]">
                        {selectedProject ? selectedProject.name : 'Alle Byggeplasser'}
                      </span>
                      <ChevronDown size={14} className="text-slate-400 group-hover:text-white transition-colors shrink-0" />
                    </button>

                    {/* Project Switcher Dropdown */}
                    {isProjectDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-72 max-h-80 overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                          <span>Velg aktiv byggeplass</span>
                          <span className="text-emerald-400">{projects.length} prosjekter</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject(null);
                            setIsProjectDropdownOpen(false);
                            setActiveModuleTab('all_projects');
                            setViewMode('module');
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer mt-1",
                            !selectedProject ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-300 hover:bg-slate-850 hover:text-white"
                          )}
                        >
                          <Building2 size={14} className="shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <p className="truncate font-bold">Alle byggeplasser</p>
                            <p className="text-[10px] text-slate-500">Oversikt over alle oppdrag</p>
                          </div>
                        </button>

                        {userAccessibleProjects.map((proj) => (
                          <button
                            key={proj.id}
                            type="button"
                            onClick={() => {
                              onSelectProject(proj);
                              setIsProjectDropdownOpen(false);
                              setActiveModuleTab('project_details');
                              setViewMode('module');
                            }}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer mt-0.5",
                              selectedProject?.id === proj.id ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-300 hover:bg-slate-850 hover:text-white"
                            )}
                          >
                            <HardHat size={14} className="shrink-0 text-emerald-400" />
                            <div className="min-w-0">
                              <p className="truncate font-bold">{proj.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{proj.clientName || 'Privat oppdragsgiver'}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status: 100% Autonom */}
                  <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    100% Autonom Agent
                  </span>
                </div>

                {/* Right Desktop Controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={handleOpenSuperAdmin}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Åpne SuperAdmin Portal (Brukere, Lisenser, Logger)"
                    >
                      <Crown size={14} className="text-amber-400" />
                      <span>SuperAdmin</span>
                    </button>
                  )}

                  {!isSuperAdmin && isPlatformOwner && (impersonatedCompanyId || simulatedPlan) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (setSimulatedPlan) setSimulatedPlan(null);
                        if (stopImpersonation) stopImpersonation();
                        handleOpenSuperAdmin();
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black transition-all shadow-md cursor-pointer"
                      title="Avslutt visningsmodus og returner til SuperAdmin"
                    >
                      <ArrowLeft size={13} />
                      <span>← Til SuperAdmin</span>
                    </button>
                  )}
                  {onOpenOmnichannelModal && (
                    <button
                      type="button"
                      onClick={onOpenOmnichannelModal}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                      title="Omnichannel Lytter (Discord, Slack, Teams, E-post)"
                    >
                      <Radio size={16} className="text-emerald-400" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsTopSearchOpen(true)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                    title="Søk i samtaler, prosjekter og moduler (⌘K)"
                  >
                    <Search size={16} />
                  </button>

                  <NotificationBell darkMode={true} />
                </div>
              </div>
            </>
          )}
        </header>

        {/* Floating Top Search Results Dropdown (Kun i arbeidsvinduet, aldri over menyen) */}
        <AnimatePresence>
          {isTopSearchOpen && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsTopSearchOpen(false)} 
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-3 right-3 sm:left-6 sm:right-6 top-16 z-40 max-w-2xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-purple-500/40 rounded-2xl shadow-2xl p-3.5 max-h-[72vh] overflow-y-auto custom-scrollbar"
              >
                {(() => {
                  const queryLower = topSearchQuery.toLowerCase().trim();
                  const allSessions = chatSessionService.getSessions();
                  const filteredSessions = queryLower
                    ? allSessions.filter(s => s.title.toLowerCase().includes(queryLower) || s.projectName?.toLowerCase().includes(queryLower))
                    : allSessions.slice(0, 4);

                  const filteredProjects = queryLower
                    ? userAccessibleProjects.filter(p => p.name.toLowerCase().includes(queryLower) || p.clientName?.toLowerCase().includes(queryLower))
                    : userAccessibleProjects.slice(0, 3);

                  const moduleList = [
                    { id: 'offers', name: '📝 Tilbud & Hurtigkalkyle', desc: 'Prising, timepriser, materiell og påslag' },
                    { id: 'dailylog', name: '⏱️ Byggedagbok & Timer', desc: 'Yr-vær, mannskapsliste og diktering' },
                    { id: 'change_orders', name: '⚡ Endringsordrer (NS 8406)', desc: 'Varsling, fristforlengelse og krav' },
                    { id: 'pre_close', name: '📋 KS & Lukkesperre TEK17', desc: 'Obligatorisk sjekk før vegger lukkes' },
                    { id: 'sja', name: '🦺 SJA & Sikkerhet', desc: 'Risikovurdering, PVU og tiltak' },
                    { id: 'archive', name: '📁 Dokumentarkiv & FDV', desc: 'NOBB BYOK og monteringsanvisninger' },
                    { id: 'contacts', name: '👥 Kontakter & Team', desc: 'Byggherre, bas og underentreprenører' },
                    { id: 'all_modules', name: '⋯ Alle fagmoduler', desc: 'Full oversikt over 20+ verktøy' }
                  ];

                  const filteredModules = queryLower
                    ? moduleList.filter(m => m.name.toLowerCase().includes(queryLower) || m.desc.toLowerCase().includes(queryLower))
                    : moduleList.slice(0, 6);

                  const hasAny = filteredSessions.length > 0 || filteredProjects.length > 0 || filteredModules.length > 0;

                  if (!hasAny) {
                    return (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Ingen resultater for «{topSearchQuery}». Prøv et annet ord eller still spørsmålet direkte i chatten!
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3.5 text-xs">
                      {/* Samtaler */}
                      {filteredSessions.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                            <MessageSquare size={12} /> Nylige samtaler & oppgaver
                          </div>
                          <div className="space-y-1">
                            {filteredSessions.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  handleSelectSession(s.id);
                                  setIsTopSearchOpen(false);
                                  setTopSearchQuery('');
                                }}
                                className="w-full p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-purple-500/40 text-left transition-colors flex items-center justify-between group cursor-pointer"
                              >
                                <span className="font-medium text-slate-200 group-hover:text-white truncate">
                                  {s.title}
                                </span>
                                {s.projectName && (
                                  <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 shrink-0 ml-2">
                                    {s.projectName}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prosjekter */}
                      {filteredProjects.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 size={12} /> Byggeprosjekter
                          </div>
                          <div className="space-y-1">
                            {filteredProjects.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  onSelectProject(p);
                                  setIsTopSearchOpen(false);
                                  setTopSearchQuery('');
                                  setActiveModuleTab('project_details');
                                  setViewMode('module');
                                  toast.info(`Valgt prosjekt: ${p.name}`);
                                }}
                                className="w-full p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-emerald-500/40 text-left transition-colors flex items-center justify-between group cursor-pointer"
                              >
                                <span className="font-medium text-slate-200 group-hover:text-white truncate">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-emerald-400 shrink-0 ml-2">
                                  Velg byggeplass →
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fagmoduler */}
                      {filteredModules.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={12} /> Fagsystemer & Moduler
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {filteredModules.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  handleOpenModuleFromSidebar(m.id);
                                  setIsTopSearchOpen(false);
                                  setTopSearchQuery('');
                                }}
                                className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-blue-500/40 text-left transition-colors cursor-pointer group"
                              >
                                <span className="font-bold text-slate-200 group-hover:text-white block truncate">
                                  {m.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {m.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 3. Main Stage Content Area */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar flex flex-col relative [touch-action:pan-y]">
          {viewMode === 'module' ? (
            /* 📊 MODULE VIEW (When user clicks a module from the left sidebar) */
            <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-4">
              {/* Back to chat banner */}
              <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('chat')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-electric-600/20 hover:bg-electric-600/30 text-electric-300 font-bold text-xs sm:text-sm border border-electric-500/30 transition-all cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>← Tilbake til MesterAI Chat</span>
                </button>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  {activeModuleTab === 'project_details' && (
                    <span>Aktiv byggeplass: <strong className="text-emerald-400">{selectedProject?.name || 'Prosjektoversikt'}</strong></span>
                  )}
                  {activeModuleTab === 'all_projects' && (
                    <span>Byggeplassoversikt: <strong className="text-amber-400">Alle prosjekter</strong></span>
                  )}
                  {activeModuleTab === 'create_project' && (
                    <span>Ny byggeplass: <strong className="text-purple-400">Opprett prosjekt</strong></span>
                  )}
                  {activeModuleTab === 'superadmin' && (
                    <span>Systemadministrasjon: <strong className="text-amber-400">👑 SuperAdmin Portal & SaaS Drift</strong></span>
                  )}
                  {activeModuleTab === 'offers' && (
                    <span>Kalkyle & Salg: <strong className="text-purple-400">Tilbud, Kontrakter & Prosjektoppstart</strong></span>
                  )}
                  {activeModuleTab === 'contacts' && (
                    <span>Telefonbok: <strong className="text-emerald-400">Kunder, Ansatte & Samarbeidspartnere</strong></span>
                  )}
                  {activeModuleTab === 'apprentice' && (
                    <span>Opplæring: <strong className="text-indigo-400">🎓 Lærlingmodul & Opplæringsbok</strong></span>
                  )}
                  {activeModuleTab === 'hms' && (
                    <span>HMS & Internkontroll: <strong className="text-teal-400">🛡️ HMS, Stoffkartotek & Vernerunder</strong></span>
                  )}
                  {!['project_details', 'all_projects', 'create_project', 'superadmin', 'offers', 'contacts', 'apprentice', 'hms'].includes(activeModuleTab || '') && (
                    <span>Viser fagsystem: <strong className="text-white capitalize">{activeModuleTab}</strong></span>
                  )}
                </span>
              </div>

              {/* 0A. 🏗️ PROSJEKTOVERSIKT & DASHBOARD (INLINE I ARBEIDSVINDUET) */}
              {activeModuleTab === 'project_details' && (
                <div className="space-y-4">
                  {selectedProject ? (
                    <>
                      {/* Prosjekt Header & Hero Card */}
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                              <Building2 size={24} />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-black text-white">{selectedProject.name}</h3>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  {selectedProject.code || 'PROJ-101'}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                  {selectedProject.stage || 'Pågående'}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <UserIcon size={14} className="text-purple-400" />
                                  <strong>Kunde:</strong> {selectedProject.clientName || 'Privat oppdragsgiver'}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <MapPin size={14} className="text-rose-400" />
                                  <strong>Byggeplass:</strong> {selectedProject.address || 'Norge'}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-400">
                                  <Calendar size={14} className="text-blue-400" />
                                  {selectedProject.createdAt ? new Date(selectedProject.createdAt).toLocaleDateString('no-NO') : 'September 2026'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleGenerateFdvSluttrapport(selectedProject)}
                              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                              title="Fullfør prosjekt og generer automatisk FDV-dokumentasjon og sluttrapport basert på alt som har skjedd på byggeplassen"
                            >
                              <FileCheck size={15} />
                              <span>Fullfør & Generer FDV</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('chat');
                                setActiveModuleTab(null);
                                handleSendMessage(`Gi meg en statusoppdatering og neste steg for prosjektet ${selectedProject.name}`);
                              }}
                              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-electric-600 hover:from-purple-500 hover:to-electric-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                            >
                              <Sparkles size={15} />
                              <span>MesterAI Status & Analyse</span>
                            </button>
                          </div>
                        </div>

                        {/* Fremdriftslinje */}
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-300 flex items-center gap-2">
                              <CheckCircle2 size={15} className="text-emerald-400" />
                              Fremdrift på byggeplass
                            </span>
                            <span className="font-black text-emerald-400">{selectedProject.progress || 35}% fullført</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${selectedProject.progress || 35}%` }}
                            />
                          </div>
                        </div>

                        {/* Sanntids Værvarsel for byggeplassen (Yr / Open-Meteo) */}
                        <WeatherWidget 
                          projectLocation={selectedProject.address || (selectedProject as any).location || selectedProject.name} 
                          className="border-slate-800"
                        />

                        {/* 4 Nøkkeltall / Statuskort for dette prosjektet */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div 
                            onClick={() => handleOpenModuleFromSidebar('dailylog')}
                            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Byggedagbok</span>
                              <Clock size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-xl font-black text-white mt-1">7,5 t i dag</div>
                            <span className="text-[10px] text-amber-400 block mt-1">Før timer & Yr-vær →</span>
                          </div>

                          <div 
                            onClick={() => handleOpenModuleFromSidebar('change_orders')}
                            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/40 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Endringsordrer</span>
                              <FileSignature size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-xl font-black text-white mt-1">
                              {changeOrders.filter(co => !selectedProject || co.projectId === selectedProject.id || co.project === selectedProject.name).length} aktive
                            </div>
                            <span className="text-[10px] text-purple-400 block mt-1">NS 8406 varsling →</span>
                          </div>

                          <div 
                            onClick={() => handleOpenModuleFromSidebar('pre_close')}
                            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-teal-500/40 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lukkesperre</span>
                              <ClipboardCheck size={15} className="text-teal-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-xl font-black text-white mt-1">TEK17 Sjekk</div>
                            <span className="text-[10px] text-teal-400 block mt-1">Kontroll før tildekking →</span>
                          </div>

                          <div 
                            onClick={() => handleOpenModuleFromSidebar('deviations')}
                            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-rose-500/40 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avvik & SJA</span>
                              <AlertTriangle size={15} className="text-rose-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-xl font-black text-white mt-1">
                              {deviations.filter(d => !selectedProject || d.projectId === selectedProject.id).length} åpne
                            </div>
                            <span className="text-[10px] text-rose-400 block mt-1">HMS & RUH-rapportering →</span>
                          </div>
                        </div>
                      </div>

                      {/* 8 Snarveier til fagmoduler for dette prosjektet */}
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Layers size={16} className="text-purple-400" />
                            <span>Fagmoduler for {selectedProject.name}</span>
                          </h4>
                          <span className="text-xs text-slate-400">Alt åpnes direkte i arbeidsvinduet</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { id: 'offers', name: 'Tilbud & Kalkyle', icon: Calculator, color: 'text-purple-400' },
                            { id: 'dailylog', name: 'Byggedagbok', icon: Clock, color: 'text-amber-400' },
                            { id: 'change_orders', name: 'Endringsordre', icon: FileSignature, color: 'text-blue-400' },
                            { id: 'pre_close', name: 'Lukkesperre', icon: ClipboardCheck, color: 'text-teal-400' },
                            { id: 'deviations', name: 'Avvik & RUH', icon: AlertTriangle, color: 'text-rose-400' },
                            { id: 'sja', name: 'SJA & Sikkerhet', icon: Shield, color: 'text-emerald-400' },
                            { id: 'archive', name: 'FDV & NOBB', icon: Archive, color: 'text-cyan-400' },
                            { id: 'contacts', name: 'Team & Roller', icon: Users, color: 'text-indigo-400' }
                          ].map((m) => {
                            const Icon = m.icon;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleOpenModuleFromSidebar(m.id)}
                                className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 text-left transition-all cursor-pointer group shadow-xs"
                              >
                                <Icon size={18} className={cn(m.color, "mb-2 group-hover:scale-110 transition-transform")} />
                                <span className="font-bold text-xs text-white block group-hover:text-purple-300 transition-colors">
                                  {m.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Åpne modul →</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* MesterAI Prosjektassistent-kort */}
                      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-purple-500/30 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-purple-400" />
                          <h4 className="text-sm font-bold text-white">Spør MesterAI om {selectedProject.name}</h4>
                        </div>
                        <p className="text-xs text-slate-400">
                          Klikk på en hurtigkommando nedenfor for å utføre handlingen automatisk i chatten:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('chat');
                              setActiveModuleTab(null);
                              handleSendMessage(`Før 7,5 timer lekting og isolasjon i byggedagboken for ${selectedProject.name}`);
                            }}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <Clock size={14} className="text-amber-400 shrink-0" />
                            <span>«Før 7,5 timer lekting for {selectedProject.name}»</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('chat');
                              setActiveModuleTab(null);
                              handleSendMessage(`Varsle endringsordre iht. NS 8406 for ${selectedProject.name}: 25 000 kr for ekstra forsterkning`);
                            }}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <FileSignature size={14} className="text-purple-400 shrink-0" />
                            <span>«Varsle endringsordre iht. NS 8406 på 25 000 kr»</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('chat');
                              setActiveModuleTab(null);
                              handleSendMessage(`Opprett en Sikker Jobb Analyse (SJA) for ${selectedProject.name}: stillasarbeid i 2. etasje`);
                            }}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <Shield size={14} className="text-emerald-400 shrink-0" />
                            <span>«Lag SJA for stillasarbeid i 2. etasje»</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('chat');
                              setActiveModuleTab(null);
                              handleSendMessage(`Sjekk TEK17 og Byggebransjens Våtromsnorm krav til lukkesperre for ${selectedProject.name}`);
                            }}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <ClipboardCheck size={14} className="text-teal-400 shrink-0" />
                            <span>«Sjekk TEK17 krav til lukkesperre»</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('chat');
                              setActiveModuleTab(null);
                              handleSendMessage(`Hva blir været på ${selectedProject.name} i dag?`);
                            }}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer sm:col-span-2"
                          >
                            <CloudSun size={14} className="text-amber-400 shrink-0" />
                            <span>«Hva blir været på {selectedProject.name} i dag? (Sanntidsvarsel & HMS-arbeidsråd)»</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
                      <Building2 size={36} className="text-slate-500 mx-auto" />
                      <h3 className="text-base font-bold text-white">Ingen byggeplass valgt</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Velg et prosjekt i menyen til venstre, eller se full oversikt over alle byggeplasser.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveModuleTab('all_projects')}
                        className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white text-xs font-bold"
                      >
                        Se alle byggeplasser
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 0B. 🏢 ALLE BYGGEPLASSER & PROSJEKTER */}
              {activeModuleTab === 'all_projects' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <HardHat className="text-amber-400" size={20} />
                          <span>{isAdmin ? 'Alle Byggeplasser' : 'Mine Byggeplasser'} ({userAccessibleProjects.length})</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isAdmin 
                            ? 'Oversikt over alle aktive, planlagte og fullførte byggeprosjekter i bedriften.' 
                            : 'Oversikt over byggeplasser du er tildelt tilgang til av prosjektleder/admin.'}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModuleTab('create_project');
                            setViewMode('module');
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                        >
                          <Plus size={15} />
                          <span>Opprett nytt prosjekt</span>
                        </button>
                      )}
                    </div>

                    {/* Søkefilter */}
                    <div className="relative">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={projectSearchQuery}
                        onChange={(e) => setProjectSearchQuery(e.target.value)}
                        placeholder="Søk etter prosjektnavn, prosjektkode, kunde eller adresse..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Prosjektliste */}
                    {(() => {
                      const q = projectSearchQuery.toLowerCase().trim();
                      const filtered = q
                        ? userAccessibleProjects.filter(p =>
                            p.name.toLowerCase().includes(q) ||
                            p.code?.toLowerCase().includes(q) ||
                            p.clientName?.toLowerCase().includes(q) ||
                            p.address?.toLowerCase().includes(q)
                          )
                        : userAccessibleProjects;

                      if (filtered.length === 0) {
                        return (
                          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-2xl space-y-3">
                            <p>Ingen prosjekter matcher søket «{projectSearchQuery}».</p>
                            <button
                              type="button"
                              onClick={() => setProjectSearchQuery('')}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700"
                            >
                              Nullstill søk
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {filtered.map((proj) => {
                            const isSelected = selectedProject?.id === proj.id;
                            return (
                              <div
                                key={proj.id}
                                className={cn(
                                  "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4",
                                  isSelected
                                    ? "bg-slate-950 border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                                )}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-white">{proj.name}</span>
                                        {isSelected && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            Aktiv
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                        {proj.code || 'PROJ-101'}
                                      </p>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                      {proj.stage || 'Pågående'}
                                    </span>
                                  </div>

                                  <div className="space-y-1 text-xs text-slate-400 pt-1">
                                    <div className="flex items-center gap-1.5">
                                      <UserIcon size={12} className="text-purple-400 shrink-0" />
                                      <span className="truncate">{proj.clientName || 'Privat oppdragsgiver'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <MapPin size={12} className="text-rose-400 shrink-0" />
                                      <span className="truncate">{proj.address || 'Norge'}</span>
                                    </div>
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="pt-2">
                                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                      <span>Fremdrift</span>
                                      <span className="font-bold text-emerald-400">{proj.progress || 35}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-400 rounded-full"
                                        style={{ width: `${proj.progress || 35}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectProject(proj);
                                      setActiveModuleTab('project_details');
                                      setViewMode('module');
                                      toast.info(`Aktivt prosjekt: ${proj.name}`);
                                    }}
                                    className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-slate-750 transition-colors cursor-pointer text-center"
                                  >
                                    Åpne prosjektoversikt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectProject(proj);
                                      setViewMode('chat');
                                      setActiveModuleTab(null);
                                      handleSendMessage(`Jeg vil jobbe med prosjektet ${proj.name}. Hva er status og åpne oppgaver?`);
                                    }}
                                    className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                                    title="Start MesterAI Chat for dette prosjektet"
                                  >
                                    <Sparkles size={15} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 0C. ➕ OPPRETT NYTT PROSJEKT (INLINE I ARBEIDSVINDUET - INGEN POPUP!) */}
              {activeModuleTab === 'create_project' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
                    <div className="pb-4 border-b border-slate-800 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                          <Sparkles className="text-purple-400" size={22} />
                          <span>Opprett ny byggeplass / prosjekt</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                          MesterAI setter automatisk opp riktige faglige krav, kontrollplaner iht. TEK17 og NS-standarder.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedProject) {
                            setActiveModuleTab('project_details');
                          } else {
                            setActiveModuleTab('all_projects');
                          }
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                        title="Lukk / Avbryt"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Hurtigmaler */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 block">
                        ⚡ Velg en ferdig fagmal for hurtigoppsett:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'bad', label: '🚿 Bad / Våtrom (BVN)', desc: 'TEK17 sluk & membran' },
                          { id: 'enebolig', label: '🏠 Enebolig TEK17', desc: 'Nybygg trekonstruksjon' },
                          { id: 'tilbygg', label: '🔨 Tilbygg / Påbygg', desc: 'Bæring & utvidelse' },
                          { id: 'naering', label: '🏢 Næringsbygg', desc: 'Systemvegger & akustikk' }
                        ].map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => handleQuickAiFillProject(tpl.id)}
                            className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 text-left transition-all cursor-pointer group shadow-xs"
                          >
                            <span className="font-bold text-xs text-white block group-hover:text-purple-300 transition-colors">
                              {tpl.label}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {tpl.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Fritekst Prompt */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-950 to-slate-950 border border-purple-500/30 space-y-2.5">
                      <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Sparkles size={14} /> Eller beskriv oppdraget med egne ord:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newProjAiPrompt}
                          onChange={(e) => setNewProjAiPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleQuickAiFillProject();
                            }
                          }}
                          placeholder="f.eks: Totalrenovering av bad i Vidjeveien 21 for Ola Nordmann, estimert 3 uker..."
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-500/30 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickAiFillProject()}
                          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
                        >
                          <Sparkles size={13} />
                          <span>Autofyll</span>
                        </button>
                      </div>
                    </div>

                    {/* Skjema */}
                    <form onSubmit={handleSaveNewProject} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Prosjektnavn <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={newProjName}
                            onChange={(e) => setNewProjName(e.target.value)}
                            placeholder="F.eks: Totalrenovering Bad - Vidjeveien 21"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white font-medium text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Prosjektkode / Referanse
                          </label>
                          <input
                            type="text"
                            value={newProjCode}
                            onChange={(e) => setNewProjCode(e.target.value)}
                            placeholder="F.eks: PROJ-105"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Prosjektfase
                          </label>
                          <select
                            value={newProjStage}
                            onChange={(e: any) => setNewProjStage(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                          >
                            <option value="Planlegging">Planlegging</option>
                            <option value="Oppstart">Oppstart</option>
                            <option value="Pågående">Pågående</option>
                            <option value="Ferdigstillelse">Ferdigstillelse</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Kunde / Byggherre
                          </label>
                          <input
                            type="text"
                            value={newProjClient}
                            onChange={(e) => setNewProjClient(e.target.value)}
                            placeholder="F.eks: Ola & Kari Nordmann"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Adresse / Byggeplass
                          </label>
                          <input
                            type="text"
                            value={newProjAddress}
                            onChange={(e) => setNewProjAddress(e.target.value)}
                            placeholder="F.eks: Vidjeveien 21, 0484 Oslo"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Beskrivelse & Omfang
                          </label>
                          <textarea
                            rows={3}
                            value={newProjDesc}
                            onChange={(e) => setNewProjDesc(e.target.value)}
                            placeholder="Beskriv arbeidets omfang, eventuelle underleverandører eller spesielle krav..."
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 resize-none"
                          />
                        </div>
                      </div>

                      {/* Handlingsknapper */}
                      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedProject) {
                              setActiveModuleTab('project_details');
                            } else {
                              setActiveModuleTab('all_projects');
                            }
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Avbryt
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingProject || !newProjName.trim()}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isCreatingProject ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>Oppretter prosjekt...</span>
                            </>
                          ) : (
                            <>
                              <Check size={14} />
                              <span>Opprett og åpne prosjekt</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 1. 📝 TILBUD & HURTIGKALKYLE */}
              {activeModuleTab === 'offers' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <Calculator className="text-purple-400" size={20} />
                          <span>Tilbud & Hurtigkalkyle</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Aktiv på <strong className="text-slate-200">{selectedProject?.name || 'Geitekleiva 12 - Enebolig'}</strong>. Hurtig beregning av timepriser, materiell og påslag.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {onOpenOfferModal && (
                          <button
                            type="button"
                            onClick={() => onOpenOfferModal({ clientName: '', projectId: '' })}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer shrink-0"
                          >
                            <Plus size={15} /> + Nytt tilbud (Frittstående)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleCreateOfferFromCalc}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                        >
                          <Plus size={15} /> Opprett tilbud fra kalkyle
                        </button>
                      </div>
                    </div>

                    {/* 💡 Autonom tilbudsflyt banner */}
                    <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-3 shadow-xs">
                      <span className="text-xl shrink-0">✨</span>
                      <div className="space-y-1">
                        <strong className="text-white block font-bold">100% Autonom Kontrakt- og Prosjektoppstart</strong>
                        <p className="text-purple-300 leading-relaxed">
                          Et tilbud trenger <strong>ikke</strong> knyttes til et eksisterende prosjekt – det lages ofte for nye henvendelser.
                          Når kunden aksepterer tilbudet digitalt, genereres juridisk bindende kontrakt (Håndverkertjenesteloven / NS 8406), 
                          prosjektet etableres automatisk i systemet, og <strong>tilpassede KS-sjekklister</strong> (våtrom, TEK17 lukkesperre, SJA og sluttkontroll) 
                          settes opp automatisk basert på tilbudet slik at håndverkeren slipper manuelle forberedelser!
                        </p>
                      </div>
                    </div>

                    {/* 3 Nøkkeltall for tilbud */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Samlet tilbudsverdi
                        </span>
                        <div className="text-xl font-black text-white mt-1">
                          kr {offers.reduce((acc, curr) => acc + (Number(curr.totalPrice || curr.amount) || 0), 0).toLocaleString('no-NO')}
                        </div>
                        <span className="text-[10px] text-purple-400 font-medium mt-0.5 block">Eks. mva</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Aktive tilbud
                        </span>
                        <div className="text-xl font-black text-white mt-1">
                          {offers.length} stk
                        </div>
                        <span className="text-[10px] text-emerald-400 font-medium mt-0.5 block">Registrert i systemet</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Standard timepris
                        </span>
                        <div className="text-xl font-black text-purple-300 mt-1">
                          kr {calcHourlyRate},- / time
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Mester Entreprenør AS</span>
                      </div>
                    </div>

                    {/* MesterAI Hurtigkalkulator */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-purple-500/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Sparkles size={16} className="text-purple-400" />
                          <span>MesterAI Hurtigkalkulator (Live estimat)</span>
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Interaktiv beregning
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            Arbeidstimer
                          </label>
                          <input
                            type="number"
                            value={calcHours}
                            onChange={(e) => setCalcHours(Math.max(0, Number(e.target.value)))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            Timepris (kr eks. mva)
                          </label>
                          <input
                            type="number"
                            value={calcHourlyRate}
                            onChange={(e) => setCalcHourlyRate(Math.max(0, Number(e.target.value)))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            Materiellkost (kr)
                          </label>
                          <input
                            type="number"
                            value={calcMaterials}
                            onChange={(e) => setCalcMaterials(Math.max(0, Number(e.target.value)))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            Påslag materiell (%)
                          </label>
                          <input
                            type="number"
                            value={calcMarkup}
                            onChange={(e) => setCalcMarkup(Math.max(0, Number(e.target.value)))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      {/* Kalkylesammendrag */}
                      {(() => {
                        const labor = calcHours * calcHourlyRate;
                        const mats = Math.round(calcMaterials * (1 + calcMarkup / 100));
                        const totalExMva = labor + mats;
                        const mva = Math.round(totalExMva * 0.25);
                        const totalIncMva = totalExMva + mva;

                        return (
                          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                              <div>
                                <span className="text-slate-500 block text-[10px]">Arbeid:</span>
                                <strong className="text-white">kr {labor.toLocaleString('no-NO')}</strong>
                              </div>
                              <span className="text-slate-600">+</span>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Materiell m/påslag:</span>
                                <strong className="text-white">kr {mats.toLocaleString('no-NO')}</strong>
                              </div>
                              <span className="text-slate-600">=</span>
                              <div>
                                <span className="text-purple-400 block text-[10px] font-bold">Sum eks. mva:</span>
                                <strong className="text-base text-purple-300 font-black">kr {totalExMva.toLocaleString('no-NO')}</strong>
                              </div>
                              <div className="border-l border-slate-800 pl-4">
                                <span className="text-slate-500 block text-[10px]">Inkl. 25% mva:</span>
                                <strong className="text-xs text-slate-200">kr {totalIncMva.toLocaleString('no-NO')}</strong>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleCreateOfferFromCalc}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                            >
                              ✓ Lagre tilbud
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Liste over registrerte tilbud */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Registrerte tilbud ({offers.length})
                      </h4>

                      {offers.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-2xl">
                          Ingen registrerte tilbud ennå. Bruk hurtigkalkulatoren over eller si «Lag et tilbud» i chatten!
                        </div>
                      ) : (
                        <div className="grid gap-2.5">
                          {offers.map((off: any) => (
                            <div 
                              key={off.id} 
                              onClick={() => setSelectedOfferForDetail(off)}
                              className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group shadow-sm"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                                    {off.title || 'Tilbud byggeoppdrag'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    {off.status || 'Sendt til kunde'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {off.projectName || selectedProject?.name} • Kunde: {off.clientName || 'Privatkunde'} • kr {Number(off.totalPrice || off.amount || 0).toLocaleString('no-NO')} eks. mva
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOfferForDetail(off);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                                >
                                  Åpne tilbud
                                </button>
                                {onDeleteOffer && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteOffer(off.id, off.title);
                                    }}
                                    className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    title="Slett tilbud"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. ⏱️ BYGGEDAGBOK & TIMER (AML § 10-7) */}
              {activeModuleTab === 'dailylog' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Clock className="text-amber-400" size={20} />
                        <span>Byggedagbok & Timer</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Lovpålagt time- og værlogging iht. AML § 10-7 for <strong className="text-slate-200">{selectedProject?.name || 'Aktivt prosjekt'}</strong>.
                      </p>
                    </div>

                    {/* View Switcher: Dagbok vs Ledergodkjenning */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setIsTimeApprovalView(false)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          !isTimeApprovalView
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        Byggedagbok
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsTimeApprovalView(true)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                          isTimeApprovalView
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        <span>Ledergodkjenning</span>
                        {dailyTimeEntries.filter(e => e.status === 'pending').length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        )}
                      </button>
                    </div>
                  </div>

                  {!isTimeApprovalView ? (
                    <>
                      {/* Yr Vær-kort & Mannskap */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <span>⛅</span> Vær og temperatur (Yr.no)
                          </span>
                          <div className="text-base font-bold text-white">
                            8°C • Lettskyet • 3 m/s SV
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Nedbør siste 24t: 0.0 mm • Forholdene godkjent for utvendig byggearbeid og lukking.
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Users size={12} className="text-emerald-400" /> Mannskapsliste i dag ({dailyTimeEntries.length} registreringer)
                          </span>
                          <div className="space-y-1 text-xs text-slate-300">
                            {dailyTimeEntries.slice(0, 3).map((entry) => (
                              <div key={entry.id} className="flex justify-between items-center">
                                <span>{entry.workerName} ({entry.role})</span>
                                <strong className="text-white font-mono">{entry.hours + entry.overtime50 + entry.overtime100} t</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Hurtigføring av timer */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Plus size={14} className="text-amber-400" /> Før timer i byggedagboken
                          </h4>
                          {isAdmin ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-400">Før timer for:</span>
                              <select
                                value={logWorkerSelection}
                                onChange={(e) => setLogWorkerSelection(e.target.value)}
                                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-750 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                              >
                                <option value="self">Meg selv ({user?.displayName || 'Admin'})</option>
                                {projectContacts
                                  .filter(c => c.category === 'team' && c.name !== user?.displayName)
                                  .map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                                  ))}
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>Føres automatisk på din konto:</span>
                              <strong className="text-white font-semibold px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-750">
                                {user?.displayName || 'Innlogget fagarbeider'}
                              </strong>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Timer (f.eks: 7.5)"
                            value={logHours}
                            onChange={(e) => setLogHours(e.target.value)}
                            className="sm:w-28 px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />
                          <input
                            type="text"
                            placeholder="Arbeidsoppgave utført..."
                            value={logDescription}
                            onChange={(e) => setLogDescription(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />
                          <label className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-750 rounded-xl text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={logIsWeekendEvening}
                              onChange={(e) => setLogIsWeekendEvening(e.target.checked)}
                              className="accent-amber-500 rounded"
                            />
                            <span className="whitespace-nowrap text-[11px]">Kveld/Helg (100%)</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleSaveDailyLog}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                          >
                            Lagre loggføring
                          </button>
                        </div>
                      </div>

                      {/* Oppføringer i byggedagboken */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Siste oppføringer i byggedagboken
                        </h4>
                        {dailyTimeEntries.map((entry) => (
                          <div key={entry.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between text-slate-400 text-[11px]">
                              <span>{entry.date} • {entry.workerName} ({entry.role}) • <strong className="text-white">{entry.hours + entry.overtime50 + entry.overtime100}t</strong> ({entry.hours}t normal{entry.overtime50 > 0 ? ` + ${entry.overtime50}t 50%` : ''}{entry.overtime100 > 0 ? ` + ${entry.overtime100}t 100%` : ''})</span>
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", entry.status === 'approved' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-300")}>
                                {entry.status === 'approved' ? 'Godkjent dagbok' : 'Til godkjenning'}
                              </span>
                            </div>
                            <p className="text-slate-200 font-medium">
                              {entry.task}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* 👑 LEDER / ADMIN OVERTIDS- & TIMEGODKJENNING */
                    <div className="space-y-4">
                      {/* Nøkkeltall for leder */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Førte timer i uken</p>
                          <p className="text-lg font-black text-white mt-0.5">
                            {dailyTimeEntries.reduce((sum, e) => sum + e.hours + e.overtime50 + e.overtime100, 0).toFixed(1)} t
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                          <p className="text-[10px] uppercase font-bold text-blue-400">Normaltid (7.5t/d)</p>
                          <p className="text-lg font-black text-blue-300 mt-0.5">
                            {dailyTimeEntries.reduce((sum, e) => sum + e.hours, 0).toFixed(1)} t
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                          <p className="text-[10px] uppercase font-bold text-amber-400">50% Overtid (AML § 10-6)</p>
                          <p className="text-lg font-black text-amber-300 mt-0.5">
                            {dailyTimeEntries.reduce((sum, e) => sum + e.overtime50, 0).toFixed(1)} t
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                          <p className="text-[10px] uppercase font-bold text-rose-400">100% Overtid (Kveld/Helg)</p>
                          <p className="text-lg font-black text-rose-300 mt-0.5">
                            {dailyTimeEntries.reduce((sum, e) => sum + e.overtime100, 0).toFixed(1)} t
                          </p>
                        </div>
                      </div>

                      {/* Godkjenningskontroller */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
                        <div className="text-xs text-slate-300">
                          <span>Utestående til godkjenning: </span>
                          <strong className="text-amber-400 font-bold">
                            {dailyTimeEntries.filter(e => e.status === 'pending').length} timelister
                          </strong>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              toast.success('Timelister eksportert til Tripletex / Fiken format (.csv)');
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-750 transition-all cursor-pointer"
                          >
                            Eksporter til lønn
                          </button>
                          <button
                            type="button"
                            onClick={handleApproveAllLogs}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <Check size={14} />
                            <span>Godkjenn alle timer</span>
                          </button>
                        </div>
                      </div>

                      {/* Tabell over timer for ansatte */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                              <th className="p-3">Ansatt & Fag</th>
                              <th className="p-3">Dato</th>
                              <th className="p-3">Normaltid</th>
                              <th className="p-3">50% Overtid</th>
                              <th className="p-3">100% Overtid</th>
                              <th className="p-3">Oppgave</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Handling</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 bg-slate-900">
                            {dailyTimeEntries.map((e) => (
                              <tr key={e.id} className="hover:bg-slate-850/50 transition-colors">
                                <td className="p-3 font-bold text-white">
                                  <div>{e.workerName} ({e.role})</div>
                                  {e.projectName && (
                                    <div className="text-[10px] text-slate-400 font-normal">{e.projectName}</div>
                                  )}
                                  {e.loggedBy && (
                                    <div className="text-[9px] text-purple-400 font-normal">Ført av: {e.loggedBy}</div>
                                  )}
                                </td>
                                <td className="p-3 text-slate-400 font-mono">{e.date}</td>
                                <td className="p-3 text-slate-200 font-bold">{e.hours} t</td>
                                <td className="p-3 text-amber-400 font-bold">{e.overtime50 > 0 ? `+${e.overtime50} t` : '-'}</td>
                                <td className="p-3 text-rose-400 font-bold">{e.overtime100 > 0 ? `+${e.overtime100} t` : '-'}</td>
                                <td className="p-3 text-slate-300 max-w-xs truncate">{e.task}</td>
                                <td className="p-3">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block",
                                    e.status === 'approved' 
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  )}>
                                    {e.status === 'approved' ? '✓ Godkjent' : '⏳ Venter'}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {e.status === 'pending' ? (
                                      <button
                                        type="button"
                                        onClick={() => handleApproveSingleLog(e.id)}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                                        title="Godkjenn denne timeføringen (AML § 10-7)"
                                      >
                                        <Check size={13} />
                                        <span>Godkjenn</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleSingleLogStatus(e.id)}
                                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-all border border-slate-700 cursor-pointer shrink-0"
                                        title="Angre godkjenning (sett tilbake til venter)"
                                      >
                                        Angre
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSingleLog(e.id)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title="Slett timeføring"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. ⚡ ENDRINGSORDRER (NS 8406) */}
              {activeModuleTab === 'change_orders' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <FileSignature className="text-purple-400" size={20} />
                        <span>Endringsordrer & Varsler (NS 8406)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Totalt sikret: kr {visibleChangeOrders.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString('no-NO')} eks. mva
                        {selectedProject && ` • ${changeOrderScope === 'project' ? `Prosjekt: ${selectedProject.name}` : 'Viser alle prosjekter'}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedProject && (
                        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                          <button
                            type="button"
                            onClick={() => setChangeOrderScope('project')}
                            className={cn(
                              "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                              changeOrderScope === 'project' 
                                ? "bg-purple-600 text-white shadow-xs" 
                                : "text-slate-400 hover:text-white"
                            )}
                            title={`Vis kun endringsordrer for ${selectedProject.name}`}
                          >
                            Kun {selectedProject.name} ({projectChangeOrders.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setChangeOrderScope('all')}
                            className={cn(
                              "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                              changeOrderScope === 'all' 
                                ? "bg-purple-600 text-white shadow-xs" 
                                : "text-slate-400 hover:text-white"
                            )}
                            title="Vis endringsordrer på tvers av alle prosjekter"
                          >
                            Alle prosjekter ({changeOrders.length})
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenChangeOrderModal?.()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <Plus size={15} /> Ny endringsordre
                      </button>
                    </div>
                  </div>

                  {visibleChangeOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      {selectedProject && changeOrderScope === 'project'
                        ? `Ingen registrerte endringsordrer for ${selectedProject.name} ennå. Si «Varsle endringsordre» eller klikk knappen over for å opprette!`
                        : 'Ingen registrerte endringsordrer ennå. Si «Varsle endringsordre» til MesterAI for å opprette!'}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {visibleChangeOrders.map((co) => (
                        <div 
                          key={co.id} 
                          onClick={() => setSelectedChangeOrderForDetail(co)}
                          className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">{co.title}</span>
                              <span className="text-xs text-purple-400 font-mono">#{co.number}</span>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                                isApprovedOrder(co)
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : isRejectedOrder(co)
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              )}>
                                {isApprovedOrder(co) 
                                  ? '✓ Godkjent av kunde' 
                                  : isRejectedOrder(co) 
                                    ? '✕ Avvist av kunde' 
                                    : '📤 Sendt til kunde'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {co.project} • {co.legal} • Kr {Number(co.amount).toLocaleString('no-NO')}
                              {co.days > 0 ? ` • +${co.days} dgr` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedChangeOrderForDetail(co)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Forhåndsvis eller gjør endringer"
                            >
                              <Eye size={13} />
                              <span className="hidden sm:inline">Forhåndsvis / Rediger</span>
                            </button>
                            {!isApprovedOrder(co) && onApproveChangeOrder && (
                              <button
                                type="button"
                                onClick={() => onApproveChangeOrder(co.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer transition-all"
                                title="Registrer at kunden har akseptert/signert endringsordren"
                              >
                                Registrer godkjenning
                              </button>
                            )}
                            {onDeleteChangeOrder && (
                              <button
                                type="button"
                                onClick={() => onDeleteChangeOrder(co.id, co.title)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Slett"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. 📋 KS & LUKKESPERRE (TEK17) */}
              {activeModuleTab === 'pre_close' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <ClipboardCheck className="text-teal-400" size={20} />
                        <span>KS & Lukkesperre (TEK17)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Kvalitetssikring og tverrfaglig sperre før vegger og gulv kles igjen.
                      </p>
                    </div>
                  </div>

                  {/* Visuell Rød/Grønn Sperre-banner */}
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-xs">
                    <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm">
                        RØD SPERRE AKTIV: Lukking av vegger forbudt
                      </h4>
                      <p className="text-rose-200/90 mt-1 leading-relaxed">
                        Konstruksjonen i 2. etasje kan ikke kles med plater før rørlegger, elektriker og tømrer har kvittert ut kontrollpunktene nedenfor med bildebevis.
                      </p>
                    </div>
                  </div>

                  {/* Fagkontroller */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Obligatoriske tverrfaglige kontroller
                    </h4>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                          ✓
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Rørlegger: Trykktesting og rør-i-rør</p>
                          <p className="text-[11px] text-slate-400">Trykktestet til 10 bar i 2 timer uten fall. Slukmansjett verifisert.</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Godkjent
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                          ✓
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Elektriker: Skjult anlegg og rørføring</p>
                          <p className="text-[11px] text-slate-400">Trekkerør og koblingsbokser festet forskriftsmessig.</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Godkjent
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                          ⏳
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Tømrer: Dampsperre og isolasjon</p>
                          <p className="text-[11px] text-slate-400">Mangler fotodokumentasjon av klemte skjøter mot yttervegg.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('chat');
                          handleSendMessage('Verifiser dampsperre og klemring i TEK17 for bad i 2. etasje');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
                      >
                        Sjekk med AI →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. 🚨 AVVIK & RUH */}
              {activeModuleTab === 'deviations' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <h3 className="text-lg font-black text-white">Avvik & RUH ({deviations.length})</h3>
                  </div>
                  {deviations.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      Ingen åpne avvik. Alt er i henhold til KS og TEK17!
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {deviations.map((dev) => (
                        <div key={dev.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-white">{dev.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{dev.description}</p>
                          </div>
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                            dev.status === 'closed' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                          )}>
                            {dev.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 6. 🦺 SIKKER JOBB ANALYSE (SJA) */}
              {activeModuleTab === 'sja' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <HardHat className="text-blue-400" size={20} />
                        <span>Sikker Jobb Analyse (SJA & HMS)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Risikovurdering og påbudt verneutstyr før oppstart.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('chat');
                        handleSendMessage('Opprett en SJA for arbeid i stillas og fasadekledning');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Plus size={15} /> Opprett ny SJA med MesterAI
                    </button>
                  </div>

                  {/* PVU Påbud */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Påbudt personlig verneutstyr (PVU)
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-200">
                        🪖 Vernehelm (EN 397)
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-200">
                        🥾 Vernesko m/spikertramp (S3)
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-200">
                        🦺 Synlighetsvest (Klasse 2)
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-200">
                        🎧 Hørselvern ved kapping
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-200">
                        🧗 Fallsikringssele over 2m
                      </span>
                    </div>
                  </div>

                  {/* Gjennomførte SJA-er */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Gjennomførte og aktive SJA-analyser
                    </h4>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white text-sm block">SJA #1: Stillas og fasadearbeid</span>
                        <span className="text-xs text-slate-400">Gjennomgått med 3 tømrere • Risikonivå: Akseptabelt med vernetiltak</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                        Signert av bas
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. 📁 DOKUMENTARKIV & FDV */}
              {activeModuleTab === 'archive' && (
                <div className="space-y-4">
                  <DocumentationArchive
                    inline={true}
                    isOpen={true}
                    projectId={selectedProject?.id}
                    projects={projects}
                    onSelectProject={onSelectProject}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}

              {/* 8. 👥 PROSJEKTKONTAKTER & TELEFONBOK */}
              {activeModuleTab === 'contacts' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Users className="text-emerald-400" size={20} />
                        <span>Prosjektkontakter & Telefonbok</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Telefonbok og nøkkelpersoner for <strong className="text-slate-200">{selectedProject?.name || 'Aktivt prosjekt'}</strong>.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Søk i kontakter..."
                          value={contactSearchQuery}
                          onChange={(e) => setContactSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-44"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddContactModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                      >
                        <Plus size={14} />
                        <span>Ny kontakt</span>
                      </button>
                    </div>
                  </div>

                  {/* 🏷️ Kategori Filter Tabs: Tydelig skille mellom kunder, ansatte, UE og arkiv */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/80">
                    {[
                      { id: 'all', label: 'Alle kontakter', count: projectContacts.length },
                      { id: 'client', label: '🏡 Kunder (Kundeportal)', count: projectContacts.filter(c => c && c.category === 'client').length },
                      { id: 'team', label: '👥 Ansatte & Team', count: projectContacts.filter(c => c && c.category === 'team').length },
                      { id: 'subcontractor', label: '🔨 Underentreprenører', count: projectContacts.filter(c => c && c.category === 'subcontractor').length },
                      { id: 'former', label: '📁 Tidligere ansatte / Arkiv', count: projectContacts.filter(c => c && (c.category === 'former' || c.isFormer)).length },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setContactCategoryFilter(tab.id as any)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                          contactCategoryFilter === tab.id
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                            : "bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
                        )}
                      >
                        <span>{tab.label}</span>
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                          contactCategoryFilter === tab.id ? "bg-emerald-500/30 text-emerald-200" : "bg-slate-800 text-slate-400"
                        )}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Kontakter Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projectContacts
                      .filter(c => {
                        if (!c) return false;
                        if (contactCategoryFilter !== 'all') {
                          if (contactCategoryFilter === 'former') {
                            if (c.category !== 'former' && !c.isFormer) return false;
                          } else if (c.category !== contactCategoryFilter) {
                            return false;
                          }
                        }
                        if (!contactSearchQuery.trim()) return true;
                        const q = contactSearchQuery.toLowerCase();
                        return (
                          (c.name && c.name.toLowerCase().includes(q)) ||
                          (c.role && c.role.toLowerCase().includes(q)) ||
                          (c.phone && c.phone.toLowerCase().includes(q)) ||
                          (c.email && c.email.toLowerCase().includes(q)) ||
                          (c.companyName && c.companyName.toLowerCase().includes(q))
                        );
                      })
                      .map((c) => (
                        <div key={c.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 group hover:border-slate-700 transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="text-sm font-bold text-white truncate">{c.name}</p>
                              {c.category === 'client' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                  🏡 Kunde
                                </span>
                              )}
                              {c.category === 'team' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                                  👥 Ansatt
                                </span>
                              )}
                              {c.category === 'subcontractor' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                  🔨 UE
                                </span>
                              )}
                              {(c.category === 'former' || c.isFormer) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/50 text-slate-400 border border-slate-600/50 shrink-0">
                                  📁 Tidligere
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-emerald-400 font-medium truncate">{c.role}</p>
                            <p className="text-[11px] text-slate-400 mt-1 truncate">
                              <span className="font-mono text-slate-300">{c.phone}</span> • <span>{c.email}</span>
                            </p>
                            {c.companyName && (
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{c.companyName}</p>
                            )}
                            {c.category === 'team' && (
                              <div className="flex items-center gap-1.5 flex-wrap mt-1.5 pt-1 border-t border-slate-800/60">
                                <span className="text-[10px] font-bold text-slate-400">Byggeplasser:</span>
                                {(!c.accessibleProjects || c.accessibleProjects.includes('all')) ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                    🌐 Alle byggeplasser
                                  </span>
                                ) : c.accessibleProjects.length === 0 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                    Ingen tildelte
                                  </span>
                                ) : (
                                  c.accessibleProjects.map(projId => {
                                    const p = projects.find(proj => proj.id === projId);
                                    return (
                                      <span key={projId} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 truncate max-w-[140px]">
                                        🏗️ {p?.name || projId}
                                      </span>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`tel:${c.phone}`}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-400 border border-slate-750 transition-colors"
                              title={`Ring ${c.phone}`}
                            >
                              <Phone size={14} />
                            </a>
                            <a
                              href={`mailto:${c.email}`}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 border border-slate-750 transition-colors"
                              title={`Send e-post til ${c.email}`}
                            >
                              <Mail size={14} />
                            </a>
                            {/* ✏️ Rediger kontakt (Kun Admin) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditContact(c)}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-purple-500/20 text-slate-400 hover:text-purple-300 border border-slate-750 transition-colors cursor-pointer"
                                title={`Rediger ${c.name} (Admin)`}
                              >
                                <Edit2 size={14} />
                              </button>
                            )}

                            {/* 🗑️ Slett eller arkiver kontakt (Kun Admin) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteContact(c.id, c.name, c.phone, c.category)}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-750 transition-colors cursor-pointer"
                                title={`Slett eller arkiver ${c.name} (Admin)`}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    {projectContacts.length === 0 && (
                      <div className="col-span-2 p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                        Ingen kontakter registrert for dette prosjektet ennå. Klikk "+ Ny kontakt" for å legge til byggherre, bas eller håndverkere.
                      </div>
                    )}
                  </div>

                  {/* Modal for å legge til ny kontakt */}
                  {isAddContactModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <h4 className="text-sm font-black text-white flex items-center gap-2">
                            <Plus size={16} className="text-emerald-400" />
                            <span>Legg til kontakt i telefonboken</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setIsAddContactModalOpen(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <form onSubmit={handleAddContact} className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Fullt navn *</label>
                            <input
                              type="text"
                              required
                              placeholder="F.eks. Ola Hansen"
                              value={newContactName}
                              onChange={(e) => setNewContactName(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Kategori / Tilhørighet *</label>
                            <select
                              value={newContactCategory}
                              onChange={(e) => setNewContactCategory(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                            >
                              <option value="client">🏡 Kunde (Byggherre / Kundeportal)</option>
                              <option value="team">👥 Ansatt / Eget team & håndverkere</option>
                              <option value="subcontractor">🔨 Underentreprenør / Samarbeidspartner</option>
                              <option value="former">📁 Tidligere ansatt (Historisk arkiv)</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">Rolle / Fag *</label>
                              <input
                                type="text"
                                required
                                placeholder="F.eks. Bas Tømrer / Byggherre"
                                value={newContactRole}
                                onChange={(e) => setNewContactRole(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">Firma</label>
                              <input
                                type="text"
                                placeholder="F.eks. Hansen Bygg AS"
                                value={newContactCompany}
                                onChange={(e) => setNewContactCompany(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Telefonnummer *</label>
                            <input
                              type="tel"
                              required
                              placeholder="+47 900 00 000"
                              value={newContactPhone}
                              onChange={(e) => setNewContactPhone(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">E-postadresse</label>
                            <input
                              type="email"
                              placeholder="kontakt@bedrift.no"
                              value={newContactEmail}
                              onChange={(e) => setNewContactEmail(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          {/* 🏗️ Prosjekttilgang for egne ansatte / håndverkere */}
                          {newContactCategory === 'team' && (
                            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                  <Building2 size={13} className="text-amber-400" />
                                  <span>Tildel byggeplasser / prosjekter</span>
                                </label>
                                <span className="text-[10px] text-amber-400 font-bold">Admin-styrt</span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Velg hvilke byggeplasser håndverkeren skal ha tilgang til, føre timer på og se sjekklister for.
                              </p>
                              
                              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-750 cursor-pointer hover:border-slate-650 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={newContactProjects.includes('all')}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewContactProjects(['all']);
                                    } else {
                                      setNewContactProjects(projects.map(p => p.id));
                                    }
                                  }}
                                  className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-white">🌐 Tilgang til alle byggeplasser</span>
                              </label>

                              {!newContactProjects.includes('all') && (
                                <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                                  <p className="text-[10px] font-bold text-slate-400">Avmerk tillatte prosjekter:</p>
                                  {projects.map((p) => {
                                    const isChecked = newContactProjects.includes(p.id);
                                    return (
                                      <label
                                        key={p.id}
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs transition-colors",
                                          isChecked ? "bg-amber-500/10 border-amber-500/30 text-white" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                                        )}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setNewContactProjects(prev => [...prev.filter(id => id !== 'all'), p.id]);
                                            } else {
                                              setNewContactProjects(prev => prev.filter(id => id !== p.id));
                                            }
                                          }}
                                          className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                                        />
                                        <span className="truncate font-semibold">{p.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-3">
                            <button
                              type="button"
                              onClick={() => setIsAddContactModalOpen(false)}
                              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                            >
                              Avbryt
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              Lagre kontakt
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Modal for å redigere eksisterende kontakt (Kun Admin) */}
                  {editingContact && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                              <Edit2 size={16} />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white flex items-center gap-2">
                                <span>Rediger kontakt</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Admin
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">Endre detaljer for {editingContact.name}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingContact(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <form onSubmit={handleSaveEditedContact} className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Fullt navn *</label>
                            <input
                              type="text"
                              required
                              placeholder="F.eks. Ola Hansen"
                              value={editContactName}
                              onChange={(e) => setEditContactName(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Kategori / Tilhørighet *</label>
                            <select
                              value={editContactCategory}
                              onChange={(e) => setEditContactCategory(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                            >
                              <option value="client">🏡 Kunde (Byggherre / Kundeportal)</option>
                              <option value="team">👥 Ansatt / Eget team & håndverkere</option>
                              <option value="subcontractor">🔨 Underentreprenør / Samarbeidspartner</option>
                              <option value="former">📁 Tidligere ansatt (Historisk arkiv)</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">Rolle / Fag *</label>
                              <input
                                type="text"
                                required
                                placeholder="F.eks. Bas Tømrer / Byggherre"
                                value={editContactRole}
                                onChange={(e) => setEditContactRole(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">Firma</label>
                              <input
                                type="text"
                                placeholder="F.eks. Hansen Bygg AS"
                                value={editContactCompany}
                                onChange={(e) => setEditContactCompany(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Telefonnummer *</label>
                            <input
                              type="tel"
                              required
                              placeholder="+47 900 00 000"
                              value={editContactPhone}
                              onChange={(e) => setEditContactPhone(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">E-postadresse</label>
                            <input
                              type="email"
                              placeholder="kontakt@bedrift.no"
                              value={editContactEmail}
                              onChange={(e) => setEditContactEmail(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          {/* 🏗️ Prosjekttilgang for egne ansatte / håndverkere */}
                          {editContactCategory === 'team' && (
                            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                  <Building2 size={13} className="text-purple-400" />
                                  <span>Tildel byggeplasser / prosjekter</span>
                                </label>
                                <span className="text-[10px] text-purple-400 font-bold">Admin-styrt</span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Velg hvilke byggeplasser denne håndverkeren har tilgang til, kan føre timer på og se sjekklister for.
                              </p>
                              
                              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-750 cursor-pointer hover:border-slate-650 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={editContactProjects.includes('all')}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditContactProjects(['all']);
                                    } else {
                                      setEditContactProjects(projects.map(p => p.id));
                                    }
                                  }}
                                  className="rounded text-purple-500 focus:ring-purple-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-white">🌐 Tilgang til alle byggeplasser</span>
                              </label>

                              {!editContactProjects.includes('all') && (
                                <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                                  <p className="text-[10px] font-bold text-slate-400">Avmerk tillatte prosjekter:</p>
                                  {projects.map((p) => {
                                    const isChecked = editContactProjects.includes(p.id);
                                    return (
                                      <label
                                        key={p.id}
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs transition-colors",
                                          isChecked ? "bg-purple-500/10 border-purple-500/30 text-white" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                                        )}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setEditContactProjects(prev => [...prev.filter(id => id !== 'all'), p.id]);
                                            } else {
                                              setEditContactProjects(prev => prev.filter(id => id !== p.id));
                                            }
                                          }}
                                          className="rounded text-purple-500 focus:ring-purple-500 cursor-pointer"
                                        />
                                        <span className="truncate font-semibold">{p.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-3">
                            <button
                              type="button"
                              onClick={() => setEditingContact(null)}
                              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                            >
                              Avbryt
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Check size={14} />
                              <span>Lagre endringer</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 8B. 🎓 LÆRLINGMODUL & OPPLÆRINGSBOK (INLINE) */}
              {activeModuleTab === 'apprentice' && (
                <div className="space-y-4">
                  <ApprenticeModal
                    inline={true}
                    isOpen={true}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}

              {/* 8C. 🛡️ HMS & STOFFKARTOTEK (INLINE) */}
              {activeModuleTab === 'hms' && (
                <div className="space-y-4">
                  <HMSModule projects={projects} />
                </div>
              )}

              {/* 9. ⋯ ALLE FAGMODULER */}
              {activeModuleTab === 'all_modules' && (() => {
                const ALL_MODULES_CATALOG = [
                  // 🏗️ Kategori 1: Prosjekt & Bygg (6)
                  {
                    id: 'projects',
                    title: 'Prosjektoversikt',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Aktive bygg',
                    icon: Building2,
                    color: 'text-blue-400',
                    bgGlow: 'hover:border-blue-500/50',
                    desc: 'Oversikt over alle byggeplasser, adresser, fremdrift og milepæler.',
                    actionId: 'projects'
                  },
                  {
                    id: 'new_project',
                    title: 'Nytt Prosjekt & Byggeplass',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Rask oppstart',
                    icon: Plus,
                    color: 'text-indigo-400',
                    bgGlow: 'hover:border-indigo-500/50',
                    desc: 'Opprett nytt byggeoppdrag på under 1 minutt med AI-maler for bad, enebolig og tilbygg.',
                    actionId: 'create_project'
                  },
                  {
                    id: 'dailylog',
                    title: 'Byggedagbok & Timer',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Lovkrav',
                    icon: Clock,
                    color: 'text-amber-400',
                    bgGlow: 'hover:border-amber-500/50',
                    desc: 'Før dagbok via tale eller tekst m/mannskapsliste og automatisk Yr-vær.',
                    actionId: 'dailylog'
                  },
                  {
                    id: 'weather',
                    title: 'Vær & Yr.no',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Sanntid',
                    icon: CloudSun,
                    color: 'text-cyan-400',
                    bgGlow: 'hover:border-cyan-500/50',
                    desc: 'Sanntids værdata, vindstyrke og stillasvurdering for dine aktive byggeplasser.',
                    actionId: 'weather'
                  },
                  {
                    id: 'archive',
                    title: 'Dokumentarkiv & FDV',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Dokumentasjon',
                    icon: Archive,
                    color: 'text-teal-400',
                    bgGlow: 'hover:border-teal-500/50',
                    desc: 'Tegninger, FDV-dokumentasjon, datablader, monteringsanvisninger og godkjenninger.',
                    actionId: 'archive'
                  },
                  {
                    id: 'building_app',
                    title: 'Byggesøknad & Nabovarsel',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Veileder',
                    icon: Building2,
                    color: 'text-emerald-400',
                    bgGlow: 'hover:border-emerald-500/50',
                    desc: 'Veileder for tiltak unntatt søknadsplikt, dispensasjon og automatisk nabovarsling.',
                    actionId: 'building_app'
                  },

                  // 🛡️ Kategori 2: Kvalitet, KS & HMS (6)
                  {
                    id: 'checklists',
                    title: 'KS-Sjekklister',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'Lovpålagt',
                    icon: ClipboardCheck,
                    color: 'text-amber-400',
                    bgGlow: 'hover:border-amber-500/50',
                    desc: 'Lovpålagte sjekklister tilpasset ditt fag: tømrer, betong, mur, våtrom og elektro.',
                    actionId: 'checklists'
                  },
                  {
                    id: 'ai_vision',
                    title: 'AI Bildekontroll TEK17',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'AI Vision',
                    icon: Camera,
                    color: 'text-blue-400',
                    bgGlow: 'hover:border-blue-500/50',
                    desc: 'Automatisk fotokontroll av sluk, membran, kledning og rørgjennomføringer.',
                    actionId: 'ai_vision'
                  },
                  {
                    id: 'sja',
                    title: 'Sikker Jobb Analyse (SJA)',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'HMS-krav',
                    icon: HardHat,
                    color: 'text-blue-400',
                    bgGlow: 'hover:border-blue-500/50',
                    desc: 'Risikovurdering, påbudt personlig verneutstyr (PVU) og vernetiltak før oppstart.',
                    actionId: 'sja'
                  },
                  {
                    id: 'deviations',
                    title: 'Avvik & RUH',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'Kvalitet',
                    icon: AlertTriangle,
                    color: 'text-rose-400',
                    bgGlow: 'hover:border-rose-500/50',
                    desc: 'Registrer og lukk avvik og uønskede hendelser med foto, årsak og tiltak.',
                    actionId: 'deviations'
                  },
                  {
                    id: 'pre_close',
                    title: 'KS & Lukkesperre (TEK17)',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'TEK17',
                    icon: Lock,
                    color: 'text-emerald-400',
                    bgGlow: 'hover:border-emerald-500/50',
                    desc: 'Tverrfaglig sperre som forhindrer lukking av vegger før alle fag har godkjent.',
                    actionId: 'pre_close'
                  },
                  {
                    id: 'hms',
                    title: 'HMS & Stoffkartotek',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'Internkontroll',
                    icon: BookOpen,
                    color: 'text-teal-400',
                    bgGlow: 'hover:border-teal-500/50',
                    desc: 'Internkontrollforskriften, sikkerhetsdatablader, vernerunder og kjemikaliehåndtering.',
                    actionId: 'hms'
                  },

                  // 💰 Kategori 3: Økonomi, Tilbud & Kontrakt (5)
                  {
                    id: 'change_orders',
                    title: 'Endringsordrer (NS 8406)',
                    category: 'okonomi' as const,
                    categoryLabel: 'Økonomi',
                    badge: 'NS 8406',
                    icon: FileSignature,
                    color: 'text-purple-400',
                    bgGlow: 'hover:border-purple-500/50',
                    desc: 'Varsling av avvik, fristforlengelse og vederlagskrav med digital kundesignering.',
                    actionId: 'change_orders'
                  },
                  {
                    id: 'offers',
                    title: 'Tilbudskalkulator',
                    category: 'okonomi' as const,
                    categoryLabel: 'Økonomi',
                    badge: 'Kalkyle',
                    icon: Calculator,
                    color: 'text-indigo-400',
                    bgGlow: 'hover:border-indigo-500/50',
                    desc: 'Prising av timer og materiell m/påslag, PDF-tilbud og digital kundeaksept.',
                    actionId: 'offers'
                  },
                  {
                    id: 'contracts',
                    title: 'Byggekontrakter',
                    category: 'okonomi' as const,
                    categoryLabel: 'Økonomi',
                    badge: 'Juridisk',
                    icon: FileSpreadsheet,
                    color: 'text-violet-400',
                    bgGlow: 'hover:border-violet-500/50',
                    desc: 'Juridisk trygge standardkontrakter iht. NS 8405/8406 og Håndverkertjenesteloven.',
                    actionId: 'contracts'
                  },
                  {
                    id: 'time',
                    title: 'Timeføring & Lønn',
                    category: 'okonomi' as const,
                    categoryLabel: 'Økonomi',
                    badge: 'Timer',
                    icon: Clock,
                    color: 'text-emerald-400',
                    bgGlow: 'hover:border-emerald-500/50',
                    desc: 'Timeføring per prosjekt, oppgave, bil og overtid for lønn og fakturagrunnlag.',
                    actionId: 'time'
                  },
                  {
                    id: 'handover',
                    title: 'Overtakelse & Sluttoppgjør',
                    category: 'okonomi' as const,
                    categoryLabel: 'Økonomi',
                    badge: 'Signatur',
                    icon: CheckCircle2,
                    color: 'text-teal-400',
                    bgGlow: 'hover:border-teal-500/50',
                    desc: 'Ferdigbefaring, mangelliste, overtakelsesprotokoll og signert sluttoppgjør.',
                    actionId: 'handover'
                  },

                  // 🚗 Kategori 4: Ressurser, Bil & Felt (5)
                  {
                    id: 'vehicle',
                    title: 'Kjørebok & Bil',
                    category: 'ressurser' as const,
                    categoryLabel: 'Ressurser',
                    badge: 'Kjøring',
                    icon: Car,
                    color: 'text-amber-400',
                    bgGlow: 'hover:border-amber-500/50',
                    desc: 'Elektronisk kjørebok, bompasseringer, km-godtgjørelse og prosjektkobling.',
                    actionId: 'vehicle'
                  },
                  {
                    id: 'inventory',
                    title: 'Verktøy & Maskinlager',
                    category: 'ressurser' as const,
                    categoryLabel: 'Ressurser',
                    badge: 'Maskiner',
                    icon: Package,
                    color: 'text-orange-400',
                    bgGlow: 'hover:border-orange-500/50',
                    desc: 'Ha full kontroll på hvem som har lånt verktøy og maskiner, samt serviceintervaller.',
                    actionId: 'inventory'
                  },
                  {
                    id: 'contacts',
                    title: 'Prosjektteam & Kontakter',
                    category: 'ressurser' as const,
                    categoryLabel: 'Ressurser',
                    badge: 'Team',
                    icon: Users,
                    color: 'text-cyan-400',
                    bgGlow: 'hover:border-cyan-500/50',
                    desc: 'Telefonliste for byggeplassen: byggherre, prosjektleder, bas og underentreprenører.',
                    actionId: 'contacts'
                  },
                  {
                    id: 'apprentice',
                    title: 'Lærlingmodul',
                    category: 'ressurser' as const,
                    categoryLabel: 'Ressurser',
                    badge: 'Læreplan',
                    icon: GraduationCap,
                    color: 'text-indigo-400',
                    bgGlow: 'hover:border-indigo-500/50',
                    desc: 'Loggfør læremål, kompetansemål og dokumentasjon til fagprøve og opplæringskontor.',
                    actionId: 'apprentice'
                  },
                  {
                    id: 'translator',
                    title: 'Flerspråklig Oversetter',
                    category: 'ressurser' as const,
                    categoryLabel: 'Ressurser',
                    badge: 'Byggeplass',
                    icon: Languages,
                    color: 'text-blue-400',
                    bgGlow: 'hover:border-blue-500/50',
                    desc: 'Fagterminologisk oversetter for byggeplassen (polsk, litauisk, ukrainsk, engelsk).',
                    actionId: 'translator'
                  },

                  // 👑 Kategori 5: SuperAdmin (hvis bruker har superadmin-tilgang)
                  ...(isSuperAdmin ? [{
                    id: 'super_admin',
                    title: 'SuperAdmin Portal',
                    category: 'superadmin' as const,
                    categoryLabel: 'Admin',
                    badge: 'System',
                    icon: Crown,
                    color: 'text-amber-400',
                    bgGlow: 'hover:border-amber-400/60',
                    desc: 'Administrasjon av bedrifter, lisenser, brukersesjoner, systemlogger og feilsøking.',
                    actionId: 'super_admin'
                  }] : [])
                ];

                const categories = [
                  { id: 'all', label: `Alle (${ALL_MODULES_CATALOG.length})` },
                  { id: 'prosjekt', label: `🏗️ Prosjekt & Bygg (${ALL_MODULES_CATALOG.filter(m => m.category === 'prosjekt').length})` },
                  { id: 'ks_hms', label: `🛡️ KS & HMS (${ALL_MODULES_CATALOG.filter(m => m.category === 'ks_hms').length})` },
                  { id: 'okonomi', label: `💰 Økonomi & Kontrakt (${ALL_MODULES_CATALOG.filter(m => m.category === 'okonomi').length})` },
                  { id: 'ressurser', label: `🚗 Ressurser & Felt (${ALL_MODULES_CATALOG.filter(m => m.category === 'ressurser').length})` },
                  ...(isSuperAdmin ? [{ id: 'superadmin', label: '👑 SuperAdmin (1)' }] : [])
                ];

                const filteredModules = ALL_MODULES_CATALOG.filter((m) => {
                  const matchesCat = allModulesCategory === 'all' || m.category === allModulesCategory;
                  const q = allModulesSearch.trim().toLowerCase();
                  const matchesSearch = !q || m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.badge.toLowerCase().includes(q);
                  return matchesCat && matchesSearch;
                });

                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg sm:text-xl font-black text-white">Alle Fagmoduler & Verktøy ({ALL_MODULES_CATALOG.length})</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Komplett fagsystem
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Klikk på en modul for å åpne verktøyet direkte eller starte arbeidsflyten:
                        </p>
                      </div>

                      {/* Hurtigsøk i moduler */}
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          placeholder="Søk i moduler..."
                          value={allModulesSearch}
                          onChange={(e) => setAllModulesSearch(e.target.value)}
                          className="w-full pl-8 pr-7 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-500 transition-colors"
                        />
                        {allModulesSearch && (
                          <button
                            type="button"
                            onClick={() => setAllModulesSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Kategori-faner */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setAllModulesCategory(cat.id as any)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0",
                            allModulesCategory === cat.id
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Rutenett over moduler */}
                    {filteredModules.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-2xl space-y-2">
                        <p>Ingen moduler matcher søket «{allModulesSearch}».</p>
                        <button
                          type="button"
                          onClick={() => { setAllModulesSearch(''); setAllModulesCategory('all'); }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Tilbakestill filter
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredModules.map((mod) => {
                          const IconComp = mod.icon;
                          return (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => handleModuleCardClick(mod.actionId)}
                              className={cn(
                                "p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left transition-all cursor-pointer group shadow-xs flex flex-col justify-between",
                                mod.bgGlow
                              )}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <IconComp size={18} className={mod.color} />
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                                    {mod.badge}
                                  </span>
                                </div>
                                <h4 className="font-bold text-sm text-white block mb-1 group-hover:text-purple-300 transition-colors">
                                  {mod.title}
                                </h4>
                                <p className="text-xs text-slate-400 block leading-relaxed line-clamp-2">
                                  {mod.desc}
                                </p>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-slate-850 flex items-center justify-between text-[11px] font-bold text-slate-500 group-hover:text-purple-400 transition-colors">
                                <span>{mod.categoryLabel}</span>
                                <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                  <span>Åpne</span>
                                  <ChevronRight size={13} />
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 10. ⚙️ INNSTILLINGER (INLINE TRIGGER) */}
              {activeModuleTab === 'settings' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl max-w-lg mx-auto my-8">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center mx-auto">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">System- og Bedriftsinnstillinger</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Åpne innstillingsboksen for å justere profil, bedriftsdata, team og moduler.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                  >
                    Åpne innstillinger
                  </button>
                </div>
              )}

              {/* 11. 👑 SUPERADMIN (INLINE I ARBEIDSSTASJONEN) */}
              {activeModuleTab === 'superadmin' && (
                <div className="w-full">
                  {isSuperAdmin || isPlatformOwner ? (
                    <SuperAdmin
                      onBackToDashboard={() => {
                        setActiveModuleTab(null);
                        setViewMode('chat');
                        window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'dashboard' } }));
                      }}
                    />
                  ) : (
                    <div className="max-w-md mx-auto my-12 p-8 bg-slate-900 border border-red-500/30 rounded-3xl text-center shadow-xl">
                      <div className="w-14 h-14 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shield size={28} />
                      </div>
                      <h3 className="text-base font-bold text-white mb-2">Ingen tilgang til SuperAdmin</h3>
                      <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                        SuperAdmin-konsollen er forbeholdt plattformeier og systemadministratorer.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModuleTab(null);
                          setViewMode('chat');
                          window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'dashboard' } }));
                        }}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Tilbake til MesterAI
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* 🤖 THE DEFAULT CHAT INTERFACE (ChatGPT / Gemini / Antigravity style) */
            <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full px-3 sm:px-6 pt-4 pb-32">
              {messages.length === 0 ? (
                /* Centered Welcome Hero (1:1 Google Gemini Mobile - Screenshot 3) */
                <div className="my-auto py-8 sm:py-14 text-center space-y-6 animate-in fade-in duration-300">
                  {/* Glowing 4-point Gemini star */}
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full blur-2xl bg-gradient-to-tr from-blue-500/30 via-purple-500/40 to-pink-500/30 scale-150 animate-pulse" />
                    <svg viewBox="0 0 48 48" className="w-14 h-14 sm:w-16 sm:h-16 relative z-10 drop-shadow-[0_0_24px_rgba(168,85,247,0.45)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="geminiStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#4285F4" />
                          <stop offset="35%" stopColor="#9B72CF" />
                          <stop offset="70%" stopColor="#D96570" />
                          <stop offset="100%" stopColor="#F4B400" />
                        </linearGradient>
                      </defs>
                      <path d="M24 0C24 13.2548 13.2548 24 0 24C13.2548 24 24 34.7452 24 48C24 34.7452 34.7452 24 48 24C34.7452 24 24 13.2548 24 0Z" fill="url(#geminiStarGrad)" />
                    </svg>
                  </div>

                  {/* Personalized Greeting (Screenshot 3: "Mikrofonen er din, Kenneth") */}
                  {(() => {
                    const rawName = user?.displayName || 'Kenneth';
                    const firstName = rawName.trim().split(' ')[0] || 'Kenneth';
                    return (
                      <div className="space-y-1.5 max-w-xl mx-auto px-4">
                        <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
                          Mikrofonen er din, {firstName}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 font-normal">
                          Aktiv byggeplass: <strong className="text-slate-200">{selectedProject?.name || 'Alle byggeplasser'}</strong>
                        </p>
                      </div>
                    );
                  })()}

                  {/* 4 Quick Suggestions with curvy arrow ↳ (1:1 Screenshot 3) */}
                  <div className="space-y-2 max-w-xl mx-auto w-full px-2 pt-2">
                    {[
                      { 
                        text: "Opprett endringsordre for ekstraarbeid (NS 8406)", 
                        action: "Varsle endringsordre iht. NS 8406 for ekstraarbeid" 
                      },
                      { 
                        text: "Ta TEK17 bildekontroll av sluk og membran", 
                        action: "Hva er TEK17-kravene til sluk, klemring og membran på bad?" 
                      },
                      { 
                        text: "Snakk inn byggedagbok med Yr-sanntidsvær", 
                        action: "Før dagens byggedagbok med mannskapsliste og Yr-sanntidsvær" 
                      },
                      { 
                        text: "Sjekk om sone bad er klar for lukking", 
                        action: "Sjekk sjekkliste og lukkesperre for bad før plating" 
                      }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(item.action)}
                        className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#1e1f20]/70 hover:bg-[#1e1f20] border border-white/10 hover:border-white/20 text-left text-xs sm:text-sm text-slate-200 hover:text-white transition-all cursor-pointer group active:scale-98 shadow-sm"
                      >
                        <span className="truncate font-normal">{item.text}</span>
                        <CornerDownLeft size={16} className="text-slate-400 group-hover:text-white shrink-0 transition-transform group-hover:-translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Chat Messages Stream (ChatGPT & Gemini style) */
                <div className="space-y-6 pt-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col gap-1.5 max-w-[92%] sm:max-w-[85%]",
                        msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start w-full"
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-1">
                          <Bot size={15} />
                          <span>MesterAI Pilot</span>
                          <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                        </div>
                      )}

                      <div className={cn(
                        "p-4 rounded-3xl text-sm leading-relaxed",
                        msg.role === 'user'
                          ? "bg-gradient-to-r from-purple-700 to-electric-600 text-white rounded-br-xs shadow-md"
                          : "bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-xs w-full shadow-md"
                      )}>
                        {msg.imageUrl && (
                          <div className="mb-3 rounded-2xl overflow-hidden border border-white/20 max-w-xs shadow-md">
                            <img src={msg.imageUrl} alt="Vedlagt bilde" className="w-full h-auto object-cover" />
                          </div>
                        )}


                        {msg.role === 'user' ? (
                          <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                        ) : (
                          <div className="prose prose-invert prose-sm max-w-none text-slate-200">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({ node, ...props }) => (
                                  <h3 className="text-base font-black text-white mt-5 mb-2.5 flex items-center gap-2 border-b border-slate-800 pb-2" {...props} />
                                ),
                                h2: ({ node, ...props }) => (
                                  <h4 className="text-sm font-black text-purple-300 mt-4 mb-2 flex items-center gap-2 border-b border-purple-500/20 pb-1.5" {...props} />
                                ),
                                h3: ({ node, ...props }) => (
                                  <h5 className="text-xs sm:text-sm font-bold text-teal-300 mt-4 mb-2 flex items-center gap-1.5 uppercase tracking-wider" {...props} />
                                ),
                                p: ({ node, ...props }) => (
                                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-3 last:mb-0" {...props} />
                                ),
                                ul: ({ node, ...props }) => (
                                  <ul className="my-2.5 space-y-2 pl-1 list-none" {...props} />
                                ),
                                ol: ({ node, ...props }) => (
                                  <ol className="my-2.5 space-y-2 pl-4 list-decimal text-slate-200" {...props} />
                                ),
                                li: ({ node, ...props }) => (
                                  <li className="text-xs sm:text-sm text-slate-200 leading-relaxed flex items-start gap-2.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0 shadow-xs" />
                                    <span className="flex-1 min-w-0">{props.children}</span>
                                  </li>
                                ),
                                strong: ({ node, ...props }) => (
                                  <strong className="font-bold text-white" {...props} />
                                ),
                                blockquote: ({ node, ...props }) => (
                                  <blockquote className="my-3.5 p-3.5 bg-gradient-to-r from-purple-950/40 to-slate-900 border-l-4 border-purple-500 rounded-r-2xl text-xs sm:text-sm text-purple-200 shadow-sm" {...props} />
                                ),
                                table: ({ node, ...props }) => (
                                  <div className="my-3 rounded-2xl border border-slate-800 overflow-hidden text-xs shadow-md">
                                    <table className="w-full text-left divide-y divide-slate-800" {...props} />
                                  </div>
                                ),
                                th: ({ node, ...props }) => (
                                  <th className="p-3 bg-slate-950 text-slate-400 font-extrabold text-[11px] uppercase tracking-wider" {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                  <td className="p-3 text-slate-300 border-b border-slate-800/50" {...props} />
                                ),
                                a: ({ node, href, children, ...props }: any) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-purple-300 hover:text-white bg-purple-500/15 hover:bg-purple-500/25 px-2.5 py-1 rounded-lg border border-purple-500/30 transition-all font-semibold text-xs no-underline group shadow-xs my-0.5 cursor-pointer"
                                    {...props}
                                  >
                                    <ExternalLink size={12} className="text-purple-400 group-hover:text-purple-300 shrink-0" />
                                    <span className="underline decoration-purple-400/40 group-hover:decoration-white">{children}</span>
                                  </a>
                                )
                              }}
                            >
                              {formatAiMarkdown(msg.content)}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Quick Replies below assistant message */}
                        {msg.quickReplies && msg.quickReplies.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                            {msg.quickReplies.map((qr, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSendMessage(qr.payload || qr.title)}
                                className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-purple-950/60 border border-slate-700 hover:border-purple-500/50 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                {qr.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Assistant actions: Copy, Speak */}
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mt-1 text-slate-500 text-xs pl-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="p-1 hover:text-white transition-colors cursor-pointer"
                            title="Kopier svar"
                          >
                            {copiedId === msg.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSpeakText(msg.content)}
                            className="p-1 hover:text-white transition-colors cursor-pointer"
                            title="Les opp svar"
                          >
                            {isSpeaking ? <VolumeX size={13} className="text-amber-400" /> : <Volume2 size={13} />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* ✦ Clean & Honest Loading Indicator med levende trinn-for-trinn fremdrift */}
                  {isLoading && (
                    <div className="mr-auto w-full max-w-md rounded-2xl bg-slate-900/95 border border-purple-500/30 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 my-2">
                      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex items-center justify-center">
                            <Sparkles size={15} className="text-purple-400 animate-pulse" />
                            <span className="absolute w-2.5 h-2.5 rounded-full bg-purple-400/40 animate-ping" />
                          </div>
                          <span className="text-xs font-bold text-white tracking-wide">
                            MesterAI arbeider med oppgaven...
                          </span>
                        </div>
                        {activeThinkingDuration > 0 && (
                          <span className="text-[11px] font-mono font-bold text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                            {activeThinkingDuration}s
                          </span>
                        )}
                      </div>

                      {/* Punktvis fremdriftsliste */}
                      <div className="space-y-2">
                        {getThinkingSteps(activeThinkingQuery).map((step, idx, arr) => {
                          const isDone = activeThinkingDuration >= (arr[idx + 1]?.time ?? 99);
                          const isActive = !isDone && activeThinkingDuration >= step.time;

                          return (
                            <div 
                              key={step.id} 
                              className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${
                                isDone 
                                  ? 'text-emerald-400 font-medium' 
                                  : isActive 
                                  ? 'text-white font-semibold' 
                                  : 'text-slate-500 opacity-50'
                              }`}
                            >
                              {isDone ? (
                                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                  <Check size={10} strokeWidth={3} />
                                </div>
                              ) : isActive ? (
                                <div className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center shrink-0">
                                  <RefreshCw size={10} className="animate-spin" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                </div>
                              )}
                              <span className="flex-1 truncate">
                                {step.title}
                                {isActive && '...'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Floating Rounded-Full Input Box (1:1 Google Gemini App - Screenshot 2 & 3) */}
        {viewMode === 'chat' && (
          <div 
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0A101D] via-[#0A101D]/90 to-transparent pt-6 px-3 sm:px-6 z-20 pointer-events-none"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <div className="max-w-3xl mx-auto w-full space-y-2 relative pointer-events-auto">
              {/* Forhåndsvisning av vedlagt bilde */}
              {attachedImage && (
                <div className="flex items-center gap-2.5 p-2 bg-[#1e1f20] rounded-2xl border border-white/15 shadow-md w-fit">
                  <img src={attachedImage.preview} alt="Vedlegg" className="w-9 h-9 rounded-lg object-cover" />
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[200px]">{attachedImage.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Pill Container (Rounded-full bg-[#1e1f20]) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputVal);
                }}
                className="relative flex items-center bg-[#1e1f20] border border-white/10 focus-within:border-white/20 focus-within:ring-2 focus-within:ring-purple-500/20 rounded-full p-1.5 sm:p-2 shadow-2xl transition-all"
              >
                {/* File inputs using sr-only for bulletproof programmatic and label activation */}
                <input
                  id="mester-file-input"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="sr-only"
                />
                <input
                  id="mester-camera-input"
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                />
                <input
                  id="mester-doc-input"
                  type="file"
                  ref={docInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      toast.success(`Dokument vedlagt: ${file.name}`);
                      setInputVal(prev => prev ? `${prev} (Vedlagt fil: ${file.name})` : `Analyser vedlagt dokument: ${file.name}`);
                    }
                  }}
                  accept=".pdf,.dwg,.doc,.docx,.xlsx,.txt"
                  className="sr-only"
                />

                {/* Left: + circular button with direct popover */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAttachmentMenuOpen(!isAttachmentMenuOpen);
                    }}
                    disabled={isUploadingImage || isLoading}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors active:scale-95"
                    title="Legg ved bilde, ta foto eller last opp tegning"
                  >
                    <Plus size={20} className={cn("transition-transform duration-200", isAttachmentMenuOpen && "rotate-45")} />
                  </button>

                  <AnimatePresence>
                    {isAttachmentMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAttachmentMenuOpen(false);
                          }} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 1 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-0 mb-3 z-50 bg-[#1e1f20] border border-white/15 rounded-3xl p-2 shadow-2xl w-64 space-y-1 backdrop-blur-xl"
                        >
                          <label
                            htmlFor="mester-camera-input"
                            onClick={() => setIsAttachmentMenuOpen(false)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer text-left group"
                          >
                            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Camera size={16} />
                            </div>
                            <div>
                              <p className="font-bold">Ta bilde med kamera</p>
                              <p className="text-[10px] text-slate-400">TEK17 våtrom & slukkontroll</p>
                            </div>
                          </label>

                          <label
                            htmlFor="mester-file-input"
                            onClick={() => setIsAttachmentMenuOpen(false)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer text-left group"
                          >
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <ImageIcon size={16} />
                            </div>
                            <div>
                              <p className="font-bold">Bildegalleri</p>
                              <p className="text-[10px] text-slate-400">Last opp eksisterende bilder</p>
                            </div>
                          </label>

                          <label
                            htmlFor="mester-doc-input"
                            onClick={() => setIsAttachmentMenuOpen(false)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer text-left group"
                          >
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Paperclip size={16} />
                            </div>
                            <div>
                              <p className="font-bold">Tegning & FDV</p>
                              <p className="text-[10px] text-slate-400">PDF, DWG eller Word-dokument</p>
                            </div>
                          </label>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Center: Expanding textarea */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                        e.preventDefault();
                        handleSendMessage(inputVal);
                      }
                    }
                  }}
                  placeholder="Spør MesterAI eller dikter oppgave..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none resize-none max-h-32 min-h-[38px] leading-relaxed custom-scrollbar"
                />

                {/* Right controls: Mic & Live Voice Button */}
                <div className="flex items-center gap-1.5 shrink-0 pr-1">
                  {/* Regular Mic Dictation */}
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={cn(
                      "p-2 rounded-full transition-all cursor-pointer",
                      isListeningMic
                        ? "bg-rose-500 text-white animate-pulse"
                        : "text-slate-400 hover:text-white hover:bg-white/10"
                    )}
                    title={isListeningMic ? "Lytter... Trykk for å stoppe" : "Snakk inn instruks"}
                  >
                    {isListeningMic ? <MicOff size={19} /> : <Mic size={19} />}
                  </button>

                  {/* If text or image is present, show Send button */}
                  {(inputVal.trim() || attachedImage) ? (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-md shadow-purple-600/30 active:scale-95 transition-all"
                      title="Send"
                    >
                      <Send size={15} className="translate-x-0.5" />
                    </button>
                  ) : (
                    /* 🔵 Live Voice Gemini button (Deep rich blue with vertical sound wave bars - Screenshot 2 & 3) */
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isLiveVoiceActive;
                        setIsLiveVoiceActive(next);
                        if (next) {
                          toast.info('🎙️ Live Voice samtale aktivert. Snakk fritt!');
                          if (!isListeningMic) toggleMic();
                        } else {
                          toast.info('Live Voice deaktivert.');
                          if (isListeningMic) toggleMic();
                        }
                      }}
                      className={cn(
                        "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer shadow-md transition-all active:scale-95",
                        isLiveVoiceActive
                          ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 ring-2 ring-blue-400/50 shadow-blue-500/40 animate-pulse"
                          : "bg-[#1a73e8] hover:bg-[#1557b0] shadow-blue-500/25"
                      )}
                      title={isLiveVoiceActive ? "Avslutt Live Voice samtale" : "Start Live Voice samtale (handsfree)"}
                    >
                      <div className="flex items-center gap-[2.5px] h-4">
                        <span className={cn("w-[2.5px] rounded-full bg-white transition-all duration-200", isLiveVoiceActive || isListeningMic ? "h-4 animate-bounce" : "h-2")} />
                        <span className={cn("w-[2.5px] rounded-full bg-white transition-all duration-200 delay-75", isLiveVoiceActive || isListeningMic ? "h-5 animate-bounce" : "h-3.5")} />
                        <span className={cn("w-[2.5px] rounded-full bg-white transition-all duration-200 delay-150", isLiveVoiceActive || isListeningMic ? "h-3.5 animate-bounce" : "h-2.5")} />
                        <span className={cn("w-[2.5px] rounded-full bg-white transition-all duration-200 delay-100", isLiveVoiceActive || isListeningMic ? "h-4.5 animate-bounce" : "h-1.5")} />
                      </div>
                    </button>
                  )}
                </div>
              </form>

              {/* Disclaimer footer */}
              <p className="text-[11px] text-slate-500 text-center">
                MesterAI v2.6 kan gjøre feil. Kontroller viktige mål og NS 8406 endringsvarsler.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ⚙️ Kompakt Innstillings- og Konfigurasjonsboks ("liten boks med alle funksjoner") */}
      <WorkstationSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={user}
        isSuperAdmin={isSuperAdmin}
      />

      {/* 📄 Forhåndsvisning & Redigering av Endringsordrer (NS 8406) */}
      <ChangeOrderDetailModal
        isOpen={Boolean(selectedChangeOrderForDetail)}
        onClose={() => setSelectedChangeOrderForDetail(null)}
        changeOrder={selectedChangeOrderForDetail}
        project={selectedProject}
        onApprove={onApproveChangeOrder}
        onDelete={onDeleteChangeOrder}
        onSave={(updated) => {
          setSelectedChangeOrderForDetail(updated);
        }}
      />

      {/* 📄 Forhåndsvisning & Detaljvisning av Pristilbud */}
      <OfferDetailModal
        isOpen={Boolean(selectedOfferForDetail)}
        onClose={() => setSelectedOfferForDetail(null)}
        offer={selectedOfferForDetail}
        project={selectedProject}
        onDelete={onDeleteOffer}
        onEditInBuilder={(off) => {
          setSelectedOfferForDetail(null);
          if (onOpenOfferModal) {
            onOpenOfferModal(off);
          }
        }}
        onSave={(updated) => {
          setSelectedOfferForDetail(updated);
        }}
      />
    </div>
  );
}

