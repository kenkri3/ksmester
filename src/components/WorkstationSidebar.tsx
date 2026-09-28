'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Plus,
  Search,
  MessageSquare,
  Building2,
  HardHat,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Edit2,
  Clock,
  AlertTriangle,
  ClipboardCheck,
  FileSignature,
  Calculator,
  Archive,
  Users,
  Shield,
  Crown,
  Settings,
  LogOut,
  Layers,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  Check,
  Lock,
  ArrowLeft,
  Pin,
  Car,
  Folder,
  FolderOpen,
  ChevronDown,
  Filter
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { chatSessionService, ChatSession } from '../services/chatSessionService';
import { Project } from '../types';
import MesterAIIcon from './MesterAIIcon';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getStandardLang } from '../i18n';
import { useAuth } from '../hooks/useAuth';

interface WorkstationSidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleCollapseDesktop: () => void;
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project | null) => void;
  onOpenCreateProject: () => void;
  onOpenCreateOffer?: () => void;
  onOpenModule: (moduleId: string) => void;
  onOpenSmartSearch: () => void;
  onOpenSettings: () => void;
  onOpenSuperAdmin?: () => void;
  user: any;
  isSuperAdmin: boolean;
  onLogout: () => void;
  currentActiveTab?: string;
}

export default function WorkstationSidebar({
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleCollapseDesktop,
  activeSessionId,
  onSelectSession,
  onNewChat,
  projects,
  selectedProject,
  onSelectProject,
  onOpenCreateProject,
  onOpenCreateOffer,
  onOpenModule,
  onOpenSmartSearch,
  onOpenSettings,
  onOpenSuperAdmin,
  user,
  isSuperAdmin,
  onLogout,
  currentActiveTab
}: WorkstationSidebarProps) {
  const { t, i18n } = useTranslation();
  const { 
    impersonatedCompanyId, 
    stopImpersonation, 
    hasModuleAccess, 
    isPlatformOwner, 
    simulatedPlan, 
    setSimulatedPlan 
  } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // 🖱️ Hover-to-expand desktop sidebar state
  const [isHovered, setIsHovered] = useState(false);
  const isEffectiveCollapsed = isCollapsedDesktop && !isHovered;

  useEffect(() => {
    if (!isCollapsedDesktop) {
      setIsHovered(false);
    }
  }, [isCollapsedDesktop]);

  // Hent og abonner på oppdateringer i samtalehistorikk
  useEffect(() => {
    const reload = () => {
      setSessions(chatSessionService.getSessions());
    };
    reload();
    const unsub = chatSessionService.subscribe(reload);
    return () => unsub();
  }, [impersonatedCompanyId]);

  // 🗂️ Sorterings- og organiseringsvalg for samtaler
  const [viewGrouping, setViewGrouping] = useState<'time' | 'project'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('mester_sidebar_grouping') as 'time' | 'project') || 'time';
    }
    return 'time';
  });
  const [filterOnlyActiveProject, setFilterOnlyActiveProject] = useState(false);
  const [sidebarChatFilter, setSidebarChatFilter] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [collapsedBuckets, setCollapsedBuckets] = useState<Record<string, boolean>>({});
  const [showAllInBucket, setShowAllInBucket] = useState<Record<string, boolean>>({});

  const handleSetViewGrouping = (grouping: 'time' | 'project') => {
    setViewGrouping(grouping);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mester_sidebar_grouping', grouping);
    }
  };

  const safeCloseAllModals = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('close_all_modals'));
      window.dispatchEvent(new CustomEvent('close_all_dashboard_modals'));
    }
  };

  const handleCleanupEmptySessions = (e: React.MouseEvent) => {
    e.stopPropagation();
    const removed = chatSessionService.cleanupEmptySessions();
    if (removed > 0) {
      toast.success(t('ws_cleaned_sessions', `Ryddet opp: ${removed} tomme samtaler fjernet`));
    } else {
      toast.info(t('ws_no_empty_sessions', 'Ingen tomme samtaler å rydde opp i'));
    }
  };

  // Filtrer samtaler basert på aktivt prosjekt og lokalt søk
  const filteredSessions = React.useMemo(() => {
    return sessions.filter(session => {
      // 1. Prosjekt-filter
      if (filterOnlyActiveProject && selectedProject) {
        const matchesProjId = session.projectId === selectedProject.id;
        const matchesProjName = session.projectName?.toLowerCase() === selectedProject.name.toLowerCase();
        if (!matchesProjId && !matchesProjName) return false;
      }

      // 2. Søk/filter i tittel eller prosjektnavn
      if (sidebarChatFilter.trim()) {
        const q = sidebarChatFilter.trim().toLowerCase();
        const matchesTitle = (session.title || '').toLowerCase().includes(q);
        const matchesProj = (session.projectName || '').toLowerCase().includes(q);
        return matchesTitle || matchesProj;
      }

      return true;
    });
  }, [sessions, filterOnlyActiveProject, selectedProject, sidebarChatFilter]);

  const { pinned, today, yesterday, last7Days, older } = React.useMemo(() => {
    return chatSessionService.groupSessions(filteredSessions);
  }, [filteredSessions]);

  const projectGroups = React.useMemo(() => {
    return chatSessionService.groupSessionsByProject(filteredSessions, projects);
  }, [filteredSessions, projects]);

  // Sørg for at aktivt prosjekt alltid er foldet ut i prosjektvisning
  useEffect(() => {
    if (selectedProject?.id) {
      setExpandedProjects(prev => ({ ...prev, [selectedProject.id]: true }));
    }
  }, [selectedProject?.id]);

  const toggleBucketCollapse = (bucketKey: string) => {
    setCollapsedBuckets(prev => ({ ...prev, [bucketKey]: !prev[bucketKey] }));
  };

  const toggleShowAllInBucket = (bucketKey: string) => {
    setShowAllInBucket(prev => ({ ...prev, [bucketKey]: !prev[bucketKey] }));
  };

  const toggleProjectExpand = (projId: string) => {
    setExpandedProjects(prev => ({ ...prev, [projId]: !prev[projId] }));
  };

  const handleTogglePinSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const isNowPinned = chatSessionService.togglePinSession(id);
    toast.success(isNowPinned ? t('ws_chat_pinned', '📌 Samtale festet øverst') : t('ws_chat_unpinned', 'Samtale løsnet'));
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(`${t('ws_confirm_delete_chat', 'Vil du slette samtalen')} "${title}"?`)) {
      chatSessionService.deleteSession(id);
      toast.success(t('ws_chat_deleted', 'Samtale slettet'));
    }
  };

  const handleStartRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      chatSessionService.renameSession(id, editingTitle.trim());
      toast.success(t('ws_chat_renamed', 'Samtales tittel oppdatert'));
    }
    setEditingSessionId(null);
  };

  const changeLanguage = async (lng: string) => {
    try {
      await i18n.changeLanguage(lng);
      localStorage.setItem('i18nextLng', lng);
      window.dispatchEvent(new CustomEvent('language_changed', { detail: { language: lng } }));
      toast.success(lng === 'no' ? 'Norsk aktivert' : `Language: ${lng.toUpperCase()}`);
    } catch (e) {
      console.error(e);
    }
  };

  const MODULES = [
    { id: 'dailylog', labelKey: 'ws_dailylog', defaultLabel: 'Byggedagbok & Timer', icon: Clock, color: 'text-amber-400' },
    { id: 'change_orders', labelKey: 'ws_change_orders', defaultLabel: 'Endringsordrer (NS 8406)', icon: FileSignature, color: 'text-purple-400' },
    { id: 'pre_close', labelKey: 'ws_pre_close', defaultLabel: 'KS & Lukkesperre (TEK17)', icon: ClipboardCheck, color: 'text-emerald-400' },
    { id: 'deviations', labelKey: 'ws_deviations', defaultLabel: 'Avvik & RUH', icon: AlertTriangle, color: 'text-rose-400' },
    { id: 'sja', labelKey: 'ws_sja', defaultLabel: 'SJA & Sikkerhet', icon: HardHat, color: 'text-blue-400' },
    { id: 'offers', labelKey: 'ws_offers', defaultLabel: 'Tilbud & Kalkyle', icon: Calculator, color: 'text-indigo-400' },
    { id: 'archive', labelKey: 'ws_archive', defaultLabel: 'Dokumentarkiv & FDV', icon: Archive, color: 'text-teal-400' },
    { id: 'contacts', labelKey: 'ws_contacts', defaultLabel: 'Kontakter & Team', icon: Users, color: 'text-cyan-400' },
    { id: 'teamchat', labelKey: 'ws_teamchat', defaultLabel: 'Prosjekt- & Firmachatt', icon: MessageSquare, color: 'text-violet-400' },
    { id: 'vehicle', labelKey: 'ws_vehicle', defaultLabel: 'Kjørebok & Bilpark', icon: Car, color: 'text-amber-400' },
    { id: 'all_modules', labelKey: 'ws_all_modules', defaultLabel: 'Alle 20+ moduler', icon: Layers, color: 'text-slate-300' }
  ];

  return (
    <>
      {/* 📱 Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isOpenMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Flow spacer so main chat canvas does NOT jump or reflow when hovering over collapsed sidebar */}
      {isCollapsedDesktop && isHovered && (
        <div className="hidden md:block w-[72px] shrink-0 h-full pointer-events-none" />
      )}

      {/* 🖥️ Sidebar Container (Styled identically to Gemini / Chat Workstation) */}
      <aside
        onMouseEnter={() => {
          if (isCollapsedDesktop) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (isCollapsedDesktop) setIsHovered(false);
        }}
        className={cn(
          "text-slate-200 border-r border-slate-800/80 flex flex-col z-50 transition-all duration-200 ease-out shrink-0 select-none",
          // Mobile: Rich Navy/Slate Drawer matching chat aesthetic
          "fixed inset-y-0 left-0 h-full w-[88vw] max-w-[360px] sm:max-w-[380px] bg-[#0A101D] border-r border-slate-800/90 shadow-2xl",
          isOpenMobile ? "translate-x-0" : "-translate-x-full",
          // Desktop:
          "md:translate-x-0 md:h-[100dvh] md:bg-[#0A101D] md:border-slate-800/80",
          isCollapsedDesktop && isHovered
            ? "md:fixed md:inset-y-0 md:left-0 md:w-[290px] lg:w-[320px] md:shadow-2xl md:shadow-black/95 md:ring-1 md:ring-white/10 md:z-50"
            : isCollapsedDesktop
              ? "md:static md:w-[72px]"
              : "md:static md:w-[290px] lg:w-[320px]"
        )}
      >
        {/* 1. Header: Gemini style with brand & close/collapse toggle */}
        <div className={cn(
          "h-16 flex items-center border-b border-slate-800/80 shrink-0 bg-[#0A101D] transition-all",
          isEffectiveCollapsed ? "justify-center px-0" : "px-4 sm:px-5 justify-between"
        )}>
          <div className="flex items-center gap-3 min-w-0">
            {/* 🛡️ Offisielt VikingMester AI Merkevare-ikon */}
            <div
              onClick={isCollapsedDesktop ? onToggleCollapseDesktop : undefined}
              className={cn(isCollapsedDesktop && "cursor-pointer hover:scale-105 transition-transform")}
              title={isCollapsedDesktop ? (isHovered ? "Klikk for å låse menyen åpen" : "Hold over med musa eller klikk for å åpne") : undefined}
            >
              <MesterAIIcon size="md" />
            </div>
            {!isEffectiveCollapsed && (
              <div className="min-w-0 flex items-center gap-2">
                <span className="font-bold text-[17px] tracking-tight text-white truncate">
                  VikingMester
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/25 text-purple-200 border border-purple-500/40">
                  AI
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle [ | ] */}
          <button
            type="button"
            onClick={onToggleCollapseDesktop}
            className={cn(
              "hidden md:flex p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer",
              isEffectiveCollapsed && "hidden"
            )}
            title={isCollapsedDesktop ? "Lås menyen åpen" : "Lukk sidemeny (vis kun ikoner)"}
          >
            {isCollapsedDesktop ? (
              <PanelLeftOpen size={19} className="text-emerald-400 hover:text-emerald-300" />
            ) : (
              <PanelLeftClose size={19} />
            )}
          </button>

          {/* Mobile close button (Gemini round X) */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Lukk meny"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. Top Primary Action: "+ Ny samtale" (Clean pill style) */}
        <div className="p-3 border-b border-slate-800/60 shrink-0 space-y-2">
          <button
            type="button"
            onClick={() => {
              safeCloseAllModals();
              onCloseMobile();
              onNewChat();
            }}
            className={cn(
              "w-full flex items-center gap-3 py-2.5 px-4 rounded-full font-medium text-[14px] sm:text-[15px] text-white transition-all shadow-sm active:scale-98 cursor-pointer",
              "bg-[#1c2230] hover:bg-[#242c3d] border border-white/10 hover:border-white/20",
              isEffectiveCollapsed && "md:p-2.5 md:justify-center md:rounded-2xl"
            )}
            title={t('ws_start_new_chat_title', "Start en ny samtale eller oppgave")}
          >
            <Plus size={18} className="text-white shrink-0" />
            {!isEffectiveCollapsed && <span className="truncate">{t('ws_new_chat', "Ny samtale")}</span>}
          </button>

          {/* 🔍 Søk i samtaler (Clean pill style) */}
          {!isEffectiveCollapsed && (
            <button
              type="button"
              onClick={() => {
                safeCloseAllModals();
                onCloseMobile();
                onOpenSmartSearch();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-full text-[13px] font-normal text-slate-400 hover:text-white bg-[#111622] hover:bg-[#181e2c] border border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{t('ws_search_placeholder', "Søk i samtaler & prosjekter")}</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-400 font-mono shrink-0">⌘K</kbd>
            </button>
          )}
        </div>

        {/* 3. Scrollable Middle Area: Moduler, Prosjekter og Samtalehistorikk */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain no-scrollbar md:custom-scrollbar p-3 space-y-4 [touch-action:pan-y]">
          {/* Seksjon A: Verktøy & Moduler (Quick access) */}
          <div className="space-y-1">
            {!isEffectiveCollapsed && (
              <div className="px-3 pt-1 pb-1.5 text-[12px] sm:text-[13px] font-bold uppercase tracking-wider text-slate-400/90 flex items-center justify-between">
                <span>{t('ws_modules_heading', "Moduler & Fagsystem")}</span>
              </div>
            )}

            {MODULES.slice(0, isEffectiveCollapsed ? 5 : MODULES.length).map((mod) => {
              const IconComponent = mod.icon;
              const isCurrentTab = currentActiveTab === mod.id;
              const isAllowed = hasModuleAccess ? hasModuleAccess(mod.id) : true;
              const label = t(mod.labelKey, mod.defaultLabel);
              return (
                <div
                  key={mod.id}
                  className="relative group/mod flex items-center w-full"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAllowed) {
                        toast.info(`Modulen "${label}" er låst i din pakke. Oppgrader for å få full tilgang!`);
                        return;
                      }
                      safeCloseAllModals();
                      onCloseMobile();
                      onOpenModule(mod.id);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 sm:py-3 rounded-2xl text-[15px] sm:text-[16px] font-semibold transition-all cursor-pointer text-left group",
                      isCurrentTab
                        ? "bg-[#161c28] text-white font-bold border border-slate-700/80 shadow-md ring-1 ring-white/10"
                        : isAllowed 
                          ? "text-slate-200 hover:text-white hover:bg-[#131822] border border-transparent hover:border-white/10" 
                          : "text-slate-500 hover:bg-slate-900/40 opacity-60",
                      isEffectiveCollapsed && "justify-center px-2 py-2.5"
                    )}
                    title={isAllowed ? label : `${label} (Låst i gjeldende pakke)`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconComponent size={20} className={cn(isAllowed ? mod.color : "text-slate-600", "shrink-0 transition-transform group-hover:scale-110")} />
                      {!isEffectiveCollapsed && (
                        <span className="truncate">{label}</span>
                      )}
                    </div>
                    {!isEffectiveCollapsed && !isAllowed && (
                      <Lock size={14} className="text-slate-500 shrink-0" />
                    )}
                  </button>

                  {/* ➕ Hurtigknapp for å opprette tilbud direkte fra modullisten */}
                  {mod.id === 'offers' && !isEffectiveCollapsed && isAllowed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        safeCloseAllModals();
                        onCloseMobile();
                        if (onOpenCreateOffer) onOpenCreateOffer();
                        else onOpenModule('offers');
                      }}
                      className="absolute right-2 p-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-all opacity-85 hover:opacity-100 cursor-pointer"
                      title={t('ws_create_offer_title', "Opprett nytt tilbud")}
                    >
                      <Plus size={15} className="text-purple-300 hover:scale-110 transition-transform" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* 👑 SuperAdmin Portal Shortcut (Only visible for genuine superadmins in superadmin mode) */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  safeCloseAllModals();
                  onCloseMobile();
                  if (onOpenSuperAdmin) onOpenSuperAdmin();
                  else window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "super-admin" } }));
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-2xl text-[15px] sm:text-[16px] font-bold transition-all cursor-pointer text-left group mt-2",
                  "bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 border border-amber-500/40 text-amber-300 hover:text-white hover:bg-amber-500/25 hover:border-amber-400 shadow-xs",
                  isEffectiveCollapsed && "justify-center px-2 py-2.5"
                )}
                title={t('ws_superadmin_portal', "SuperAdmin Portal")}
              >
                <Crown size={20} className="text-amber-400 shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform" />
                {!isEffectiveCollapsed && (
                  <div className="flex items-center justify-between w-full min-w-0">
                    <span className="truncate">{t('ws_superadmin_portal', "SuperAdmin Portal")}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 font-mono font-black border border-amber-400/30">SYS</span>
                  </div>
                )}
              </button>
            )}

            {/* 👑 Plattformeier Hurtig-retur dersom i visningsmodus eller simulering */}
            {!isSuperAdmin && isPlatformOwner && (impersonatedCompanyId || simulatedPlan) && (
              <button
                type="button"
                onClick={() => {
                  safeCloseAllModals();
                  onCloseMobile();
                  if (setSimulatedPlan) setSimulatedPlan(null);
                  if (stopImpersonation) stopImpersonation();
                  if (onOpenSuperAdmin) onOpenSuperAdmin();
                  else window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "super-admin" } }));
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-2xl text-[15px] sm:text-[16px] font-black transition-all cursor-pointer text-left group mt-2",
                  "bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-md",
                  isEffectiveCollapsed && "justify-center px-2 py-2.5"
                )}
                title={t('ws_back_to_superadmin', "Tilbake til SuperAdmin")}
              >
                <ArrowLeft size={16} className="shrink-0" />
                {!isEffectiveCollapsed && (
                  <span className="truncate">{t('ws_back_to_superadmin', "Tilbake til SuperAdmin")}</span>
                )}
              </button>
            )}
          </div>

          {/* Seksjon B: Prosjekter (Gemini: "Notatbøker") */}
          <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
            {!isEffectiveCollapsed && (
              <div className="px-3 py-1 flex items-center justify-between text-[12px] sm:text-[13px] font-bold uppercase tracking-wider text-slate-400/90">
                <button
                  type="button"
                  onClick={() => {
                    safeCloseAllModals();
                    onCloseMobile();
                    onSelectProject(null);
                    onOpenModule('all_projects');
                  }}
                  className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer text-left group"
                  title={t('ws_all_sites', "Alle byggeplasser")}
                >
                  <Building2 size={15} className="text-electric-400 group-hover:text-electric-300" /> 
                  <span className="group-hover:underline">{t('ws_projects_heading', "Prosjekter")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    safeCloseAllModals();
                    onCloseMobile();
                    onOpenCreateProject();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer active:scale-95 transition-transform"
                  title={t('ws_create_project_title', "Opprett nytt prosjekt")}
                >
                  <Plus size={15} />
                </button>
              </div>
            )}

            <div className="space-y-1">
              {/* Alle prosjekter (Standard / Global fokus) */}
              <button
                type="button"
                onClick={() => {
                  safeCloseAllModals();
                  onCloseMobile();
                  onSelectProject(null);
                  onOpenModule('all_projects');
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-2xl text-[15px] sm:text-[16px] font-semibold transition-all cursor-pointer text-left",
                  (!selectedProject && currentActiveTab === 'all_projects')
                    ? "bg-[#161c28] text-white font-bold border border-slate-700/80 shadow-md ring-1 ring-white/10"
                    : "text-slate-200 hover:text-white hover:bg-[#131822] border border-transparent hover:border-white/10",
                  isEffectiveCollapsed && "justify-center px-2 py-2.5"
                )}
                title={t('ws_all_sites', "Alle byggeplasser")}
              >
                <HardHat size={20} className={(!selectedProject && currentActiveTab === 'all_projects') ? "text-amber-400 shrink-0" : "text-slate-400 shrink-0"} />
                {!isEffectiveCollapsed && (
                  <span className="truncate">{t('ws_all_sites', "Alle byggeplasser")}</span>
                )}
              </button>

              {projects.map((proj) => {
                const isSelected = selectedProject?.id === proj.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      safeCloseAllModals();
                      onCloseMobile();
                      onSelectProject(proj);
                      onOpenModule('project_details');
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 sm:py-3 rounded-2xl text-[15px] sm:text-[16px] font-semibold transition-all cursor-pointer text-left group",
                      isSelected
                        ? "bg-[#131d30] border border-electric-500/50 text-white font-bold shadow-md ring-1 ring-electric-500/20"
                        : "text-slate-200 hover:text-white hover:bg-[#131822] border border-transparent hover:border-white/10",
                      isEffectiveCollapsed && "justify-center px-2 py-2.5"
                    )}
                    title={`${proj.name} (${proj.clientName || 'Byggeplass'})`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        isSelected ? "bg-emerald-400 animate-pulse ring-2 ring-emerald-500/30" : "bg-slate-500 group-hover:bg-slate-300"
                      )} />
                      {!isEffectiveCollapsed && (
                        <span className="truncate">{proj.name}</span>
                      )}
                    </div>
                    {!isEffectiveCollapsed && proj.progress !== undefined && (
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700/60 shrink-0">
                        {proj.progress}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seksjon C: Samtaler & Oppgaver (Smart Sortering, Prosjektmapper & Fast Filter) */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            {!isEffectiveCollapsed && (
              <div className="px-2 space-y-2">
                {/* Header med tittel, antall, og visningsmodus-knapper */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wider text-slate-400/90 truncate">
                      {t('ws_recent_chats', "Samtaler")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                      {filteredSessions.length}
                    </span>
                  </div>

                  {/* Sorteringsmodus: Tid vs Prosjekt + Rydd opp-knapp */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="bg-[#13161c] p-0.5 rounded-lg border border-white/10 flex items-center">
                      <button
                        type="button"
                        onClick={() => handleSetViewGrouping('time')}
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1",
                          viewGrouping === 'time'
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                        title="Kronologisk sortering (I dag, I går, osv.)"
                      >
                        <Clock size={11} />
                        <span className="hidden sm:inline">Tid</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetViewGrouping('project')}
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1",
                          viewGrouping === 'project'
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                        title="Grupper samtaler per byggeprosjekt i mapper"
                      >
                        <Folder size={11} />
                        <span className="hidden sm:inline">Prosjekt</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCleanupEmptySessions}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                      title="Rydd opp: Fjern tomme samtaler"
                    >
                      <Sparkles size={12} className="text-purple-400" />
                    </button>
                  </div>
                </div>

                {/* Hurtig-filter i samtaler */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={sidebarChatFilter}
                    onChange={(e) => setSidebarChatFilter(e.target.value)}
                    placeholder="Filtrer samtaler..."
                    className="w-full bg-[#13161c] border border-white/10 focus:border-purple-500/50 rounded-xl pl-7 pr-7 py-1 text-[11px] text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                  />
                  {sidebarChatFilter && (
                    <button
                      type="button"
                      onClick={() => setSidebarChatFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Valgt prosjekt hurtigfilter (hvis et prosjekt er valgt) */}
                {selectedProject && (
                  <div className="flex items-center gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setFilterOnlyActiveProject(false)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                        !filterOnlyActiveProject
                          ? "bg-white/10 text-white border border-white/15"
                          : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      Alle samtaler
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterOnlyActiveProject(true)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 truncate max-w-[170px]",
                        filterOnlyActiveProject
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "text-slate-500 hover:text-slate-300"
                      )}
                      title={`Vis kun samtaler for ${selectedProject.name}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">Kun {selectedProject.name}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {filteredSessions.length === 0 ? (
              !isEffectiveCollapsed && (
                <div className="px-3 py-4 text-center space-y-1">
                  <p className="text-xs text-slate-500 italic">
                    {sidebarChatFilter
                      ? `Ingen samtaler matcher «${sidebarChatFilter}»`
                      : filterOnlyActiveProject
                        ? `Ingen samtaler for ${selectedProject?.name} ennå.`
                        : t('ws_no_chats', "Ingen tidligere samtaler ennå.")}
                  </p>
                  {sidebarChatFilter && (
                    <button
                      type="button"
                      onClick={() => setSidebarChatFilter('')}
                      className="text-[11px] text-purple-400 hover:underline"
                    >
                      Nullstill filter
                    </button>
                  )}
                </div>
              )
            ) : viewGrouping === 'project' ? (
              /* 📁 VISNING: Gruppert per prosjekt (Mappevisning) */
              <div className="space-y-1.5">
                {projectGroups.map(group => {
                  const isExpanded = expandedProjects[group.projectId] ?? (selectedProject?.id === group.projectId);
                  const isCurrentActiveProject = selectedProject?.id === group.projectId;
                  return (
                    <div key={group.projectId} className="space-y-1">
                      {!isEffectiveCollapsed && (
                        <button
                          type="button"
                          onClick={() => toggleProjectExpand(group.projectId)}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all text-left cursor-pointer group border",
                            isCurrentActiveProject
                              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                              : "bg-[#13161c]/60 hover:bg-[#161c28] border-white/5 hover:border-white/10 text-slate-300 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isExpanded ? (
                              <FolderOpen size={14} className={isCurrentActiveProject ? "text-emerald-400 shrink-0" : "text-amber-400 shrink-0"} />
                            ) : (
                              <Folder size={14} className={isCurrentActiveProject ? "text-emerald-400 shrink-0" : "text-amber-400/80 shrink-0"} />
                            )}
                            <span className="text-xs font-bold truncate">{group.projectName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400 font-bold border border-white/5">
                              {group.sessions.length}
                            </span>
                            <ChevronDown size={13} className={cn("text-slate-400 transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} />
                          </div>
                        </button>
                      )}

                      {(isExpanded || isEffectiveCollapsed) && (
                        <div className={cn("space-y-1", !isEffectiveCollapsed && "ml-2.5 pl-2 border-l border-slate-800/80 my-1")}>
                          {group.sessions.map(session => (
                            <SessionItem
                              key={session.id}
                              session={session}
                              isActive={activeSessionId === session.id}
                              isCollapsed={isEffectiveCollapsed}
                              isEditing={editingSessionId === session.id}
                              editingTitle={editingTitle}
                              onSetEditingTitle={setEditingTitle}
                              onSaveRename={() => handleSaveRename(session.id)}
                              onCancelRename={() => setEditingSessionId(null)}
                              onStartRename={(e) => handleStartRename(e, session)}
                              onTogglePin={(e) => handleTogglePinSession(e, session.id)}
                              onSelect={() => {
                                safeCloseAllModals();
                                onCloseMobile();
                                onSelectSession(session.id);
                              }}
                              onDelete={(e) => handleDeleteSession(e, session.id, session.title)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 🕒 VISNING: Kronologisk (I dag, I går, Siste 7 dager, Eldre med grenser) */
              <div className="space-y-1.5">
                {/* 📌 Festede samtaler */}
                {pinned.length > 0 && (
                  <div className="space-y-1 pb-1.5 mb-1 border-b border-white/5">
                    {!isEffectiveCollapsed && (
                      <button
                        type="button"
                        onClick={() => toggleBucketCollapse('pinned')}
                        className="w-full flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider cursor-pointer hover:text-amber-300"
                      >
                        <span className="flex items-center gap-1.5">
                          <Pin size={11} className="fill-amber-400" />
                          <span>{t('ws_pinned_chats', "Festede samtaler")}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-mono">
                            {pinned.length}
                          </span>
                          <ChevronDown size={11} className={cn("transition-transform", collapsedBuckets['pinned'] ? "-rotate-90" : "rotate-0")} />
                        </div>
                      </button>
                    )}
                    {!collapsedBuckets['pinned'] && pinned.map(session => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={activeSessionId === session.id}
                        isCollapsed={isEffectiveCollapsed}
                        isEditing={editingSessionId === session.id}
                        editingTitle={editingTitle}
                        showProjectBadge={true}
                        onSetEditingTitle={setEditingTitle}
                        onSaveRename={() => handleSaveRename(session.id)}
                        onCancelRename={() => setEditingSessionId(null)}
                        onStartRename={(e) => handleStartRename(e, session)}
                        onTogglePin={(e) => handleTogglePinSession(e, session.id)}
                        onSelect={() => {
                          safeCloseAllModals();
                          onCloseMobile();
                          onSelectSession(session.id);
                        }}
                        onDelete={(e) => handleDeleteSession(e, session.id, session.title)}
                      />
                    ))}
                  </div>
                )}

                {/* ⚡ I dag */}
                {today.length > 0 && (
                  <div className="space-y-1">
                    {!isEffectiveCollapsed && (
                      <button
                        type="button"
                        onClick={() => toggleBucketCollapse('today')}
                        className="w-full flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white"
                      >
                        <span>{t('ws_today', "I dag")}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400 font-mono">
                            {today.length}
                          </span>
                          <ChevronDown size={11} className={cn("transition-transform", collapsedBuckets['today'] ? "-rotate-90" : "rotate-0")} />
                        </div>
                      </button>
                    )}
                    {!collapsedBuckets['today'] && (
                      <>
                        {(showAllInBucket['today'] ? today : today.slice(0, 5)).map(session => (
                          <SessionItem
                            key={session.id}
                            session={session}
                            isActive={activeSessionId === session.id}
                            isCollapsed={isEffectiveCollapsed}
                            isEditing={editingSessionId === session.id}
                            editingTitle={editingTitle}
                            showProjectBadge={true}
                            onSetEditingTitle={setEditingTitle}
                            onSaveRename={() => handleSaveRename(session.id)}
                            onCancelRename={() => setEditingSessionId(null)}
                            onStartRename={(e) => handleStartRename(e, session)}
                            onTogglePin={(e) => handleTogglePinSession(e, session.id)}
                            onSelect={() => {
                              safeCloseAllModals();
                              onCloseMobile();
                              onSelectSession(session.id);
                            }}
                            onDelete={(e) => handleDeleteSession(e, session.id, session.title)}
                          />
                        ))}
                        {!isEffectiveCollapsed && today.length > 5 && (
                          <button
                            type="button"
                            onClick={() => toggleShowAllInBucket('today')}
                            className="w-full py-1 text-center text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                          >
                            {showAllInBucket['today'] ? 'Vis færre ↑' : `+ Vis ${today.length - 5} flere fra i dag...`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* 📅 I går */}
                {yesterday.length > 0 && (
                  <div className="space-y-1">
                    {!isEffectiveCollapsed && (
                      <button
                        type="button"
                        onClick={() => toggleBucketCollapse('yesterday')}
                        className="w-full flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white"
                      >
                        <span>{t('ws_yesterday', "I går")}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400 font-mono">
                            {yesterday.length}
                          </span>
                          <ChevronDown size={11} className={cn("transition-transform", collapsedBuckets['yesterday'] ? "-rotate-90" : "rotate-0")} />
                        </div>
                      </button>
                    )}
                    {!collapsedBuckets['yesterday'] && (
                      <>
                        {(showAllInBucket['yesterday'] ? yesterday : yesterday.slice(0, 5)).map(session => (
                          <SessionItem
                            key={session.id}
                            session={session}
                            isActive={activeSessionId === session.id}
                            isCollapsed={isEffectiveCollapsed}
                            isEditing={editingSessionId === session.id}
                            editingTitle={editingTitle}
                            showProjectBadge={true}
                            onSetEditingTitle={setEditingTitle}
                            onSaveRename={() => handleSaveRename(session.id)}
                            onCancelRename={() => setEditingSessionId(null)}
                            onStartRename={(e) => handleStartRename(e, session)}
                            onTogglePin={(e) => handleTogglePinSession(e, session.id)}
                            onSelect={() => {
                              safeCloseAllModals();
                              onCloseMobile();
                              onSelectSession(session.id);
                            }}
                            onDelete={(e) => handleDeleteSession(e, session.id, session.title)}
                          />
                        ))}
                        {!isEffectiveCollapsed && yesterday.length > 5 && (
                          <button
                            type="button"
                            onClick={() => toggleShowAllInBucket('yesterday')}
                            className="w-full py-1 text-center text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                          >
                            {showAllInBucket['yesterday'] ? 'Vis færre ↑' : `+ Vis ${yesterday.length - 5} flere fra i går...`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* 🗓️ Siste 7 dager */}
                {last7Days.length > 0 && (
                  <div className="space-y-1">
                    {!isEffectiveCollapsed && (
                      <button
                        type="button"
                        onClick={() => toggleBucketCollapse('last7Days')}
                        className="w-full flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white"
                      >
                        <span>{t('ws_last_7_days', "Siste 7 dager")}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400 font-mono">
                            {last7Days.length}
                          </span>
                          <ChevronDown size={11} className={cn("transition-transform", collapsedBuckets['last7Days'] ? "-rotate-90" : "rotate-0")} />
                        </div>
                      </button>
                    )}
                    {!collapsedBuckets['last7Days'] && (
                      <>
                        {(showAllInBucket['last7Days'] ? last7Days : last7Days.slice(0, 5)).map(session => (
                          <SessionItem
                            key={session.id}
                            session={session}
                            isActive={activeSessionId === session.id}
                            isCollapsed={isEffectiveCollapsed}
                            isEditing={editingSessionId === session.id}
                            editingTitle={editingTitle}
                            showProjectBadge={true}
                            onSetEditingTitle={setEditingTitle}
                            onSaveRename={() => handleSaveRename(session.id)}
                            onCancelRename={() => setEditingSessionId(null)}
                            onStartRename={(e) => handleStartRename(e, session)}
                            onTogglePin={(e) => handleTogglePinSession(e, session.id)}
                            onSelect={() => {
                              safeCloseAllModals();
                              onCloseMobile();
                              onSelectSession(session.id);
                            }}
                            onDelete={(e) => handleDeleteSession(e, session.id, session.title)}
                          />
                        ))}
                        {!isEffectiveCollapsed && last7Days.length > 5 && (
                          <button
                            type="button"
                            onClick={() => toggleShowAllInBucket('last7Days')}
                            className="w-full py-1 text-center text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                          >
                            {showAllInBucket['last7Days'] ? 'Vis færre ↑' : `+ Vis ${last7Days.length - 5} flere...`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* 🗃️ Eldre samtaler */}
                {older.length > 0 && (
                  <div className="space-y-1">
                    {!isEffectiveCollapsed && (
                      <button
                        type="button"
                        onClick={() => toggleBucketCollapse('older')}
                        className="w-full flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white"
                      >
                        <span>{t('ws_older', "Tidligere")}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400 font-mono">
                            {older.length}
                          </span>
                          <ChevronDown size={11} className={cn("transition-transform", collapsedBuckets['older'] ? "-rotate-90" : "rotate-0")} />
                        </div>
                      </button>
                    )}
                    {!collapsedBuckets['older'] && (
                      <>
                        {(showAllInBucket['older'] ? older : older.slice(0, 5)).map(session => (
                          <SessionItem
                            key={session.id}
                            session={session}
                            isActive={activeSessionId === session.id}
                            isCollapsed={isEffectiveCollapsed}
                            isEditing={editingSessionId === session.id}
                            editingTitle={editingTitle}
                            showProjectBadge={true}
                            onSetEditingTitle={setEditingTitle}
                            onSaveRename={() => handleSaveRename(session.id)}
                            onCancelRename={() => setEditingSessionId(null)}
                            onStartRename={(e) => handleStartRename(e, session)}
                            onTogglePin={(e) => handleTogglePinSession(e, session.id)}
                            onSelect={() => {
                              safeCloseAllModals();
                              onCloseMobile();
                              onSelectSession(session.id);
                            }}
                            onDelete={(e) => handleDeleteSession(e, session.id, session.title)}
                          />
                        ))}
                        {!isEffectiveCollapsed && older.length > 5 && (
                          <button
                            type="button"
                            onClick={() => toggleShowAllInBucket('older')}
                            className="w-full py-1 text-center text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                          >
                            {showAllInBucket['older'] ? 'Vis færre ↑' : `+ Vis ${older.length - 5} flere...`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. Footer: Gemini-style user profile card with location, settings & logout */}
        <div className="p-3.5 border-t border-slate-800/80 shrink-0 bg-[#0A101D] space-y-2.5">
          <div className={cn("p-2.5 rounded-2xl bg-[#13161c] border border-white/10 flex items-center justify-between gap-2.5 transition-all shadow-md", isEffectiveCollapsed && "justify-center p-1.5 bg-transparent border-transparent shadow-none")}>
            <div className="flex items-center gap-3 min-w-0">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'Profil'} 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/20 object-cover shrink-0 aspect-square"
                />
              ) : (
                <div 
                  onClick={() => {
                    if (isEffectiveCollapsed && isSuperAdmin && !impersonatedCompanyId) {
                      if (onOpenSuperAdmin) onOpenSuperAdmin();
                      else window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "super-admin" } }));
                    }
                  }}
                  className={cn(
                    "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 ring-2",
                    impersonatedCompanyId
                      ? "bg-gradient-to-tr from-amber-600 to-amber-400 ring-amber-500/30"
                      : "bg-gradient-to-tr from-purple-600 to-blue-500 ring-purple-500/30",
                    isEffectiveCollapsed && isSuperAdmin && !impersonatedCompanyId && "cursor-pointer ring-amber-400/50 hover:scale-105 transition-transform"
                  )}
                  title={
                    impersonatedCompanyId
                      ? `Viser som kunde: ${impersonatedCompanyId === 'comp-demo-fjellheim' ? 'Fjellheim Bygg' : impersonatedCompanyId}`
                      : (isEffectiveCollapsed && isSuperAdmin ? "👑 SuperAdmin Portal (klikk her)" : undefined)
                  }
                >
                  {impersonatedCompanyId === 'comp-demo-fjellheim' 
                    ? 'L' 
                    : (user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'K')}
                </div>
              )}
              {!isEffectiveCollapsed && (
                <div className="min-w-0">
                  <p className="text-[14px] sm:text-[15px] font-bold text-white truncate">
                    {impersonatedCompanyId === 'comp-demo-fjellheim' 
                      ? 'Lars Fjellheim' 
                      : (impersonatedCompanyId ? `Kunde: ${impersonatedCompanyId}` : (user?.displayName || 'Kenneth Glosli Kristiansen'))}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/25 text-purple-200 border border-purple-500/40">
                      MESTER PRO
                    </span>
                    {isSuperAdmin && (
                      <span className="text-[10px] font-bold text-amber-400">👑 Sys</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!isEffectiveCollapsed && (
              <div className="flex items-center gap-1 shrink-0">
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      safeCloseAllModals();
                      onCloseMobile();
                      if (onOpenSuperAdmin) onOpenSuperAdmin();
                      else window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "super-admin" } }));
                    }}
                    className="p-2 rounded-xl text-amber-400 hover:text-white hover:bg-amber-500/20 transition-colors cursor-pointer"
                    title="SuperAdmin Portal"
                  >
                    <Crown size={17} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    safeCloseAllModals();
                    onCloseMobile();
                    onOpenSettings();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={t('settings', "Innstillinger")}
                >
                  <Settings size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    safeCloseAllModals();
                    onCloseMobile();
                    onLogout();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                  title={t('logout', "Logg ut")}
                >
                  <LogOut size={17} />
                </button>
              </div>
            )}
          </div>

          {!isEffectiveCollapsed && (
            <div className="pt-1 flex items-center justify-between text-[11px] sm:text-[12px] text-slate-400 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5 truncate">
                <MapPin size={13} className="text-slate-500 shrink-0" />
                <span className="truncate">{t('ws_location_display', "Tønsberg, Norge")}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Globe size={13} className="text-slate-500" />
                <select
                  value={getStandardLang(i18n.language)}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="text-[11px] font-bold bg-transparent border-none text-slate-300 hover:text-white focus:outline-none cursor-pointer uppercase [&>option]:bg-slate-900"
                >
                  <option value="no">NO</option>
                  <option value="en">EN</option>
                  <option value="pl">PL</option>
                  <option value="lt">LT</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function SessionItem({
  session,
  isActive,
  isCollapsed,
  isEditing,
  editingTitle,
  onSetEditingTitle,
  onSaveRename,
  onCancelRename,
  onStartRename,
  onTogglePin,
  showProjectBadge,
  onSelect,
  onDelete
}: {
  session: ChatSession;
  isActive: boolean;
  isCollapsed: boolean;
  isEditing: boolean;
  editingTitle: string;
  showProjectBadge?: boolean;
  onSetEditingTitle: (v: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onStartRename: (e: React.MouseEvent) => void;
  onTogglePin: (e: React.MouseEvent) => void;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  if (isEditing) {
    return (
      <div className="px-2 py-1">
        <input
          type="text"
          value={editingTitle}
          onChange={(e) => onSetEditingTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveRename();
            if (e.key === 'Escape') onCancelRename();
          }}
          onBlur={onSaveRename}
          autoFocus
          className="w-full px-3 py-2 text-[14px] bg-[#161c28] border border-electric-500 rounded-xl text-white focus:outline-none"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-[13px] sm:text-[14px] font-normal transition-all cursor-pointer text-left group",
        isActive
          ? "bg-white/10 text-white font-medium shadow-xs"
          : "text-slate-300 hover:text-white hover:bg-white/5",
        session.isPinned && !isActive && "text-slate-200",
        isCollapsed && "justify-center px-2 py-2"
      )}
      title={session.isPinned ? `📌 (Festet) ${session.title}` : session.title}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <MessageSquare size={15} className={isActive ? "text-purple-400 shrink-0" : session.isPinned ? "text-amber-400 shrink-0" : "text-slate-500 shrink-0 group-hover:text-slate-300"} />
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <span className="truncate block leading-tight">{session.title}</span>
            {showProjectBadge && session.projectName && (
              <span className="text-[10px] text-slate-500 font-normal truncate block mt-0.5">
                {session.projectName}
              </span>
            )}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="flex items-center gap-0.5 shrink-0">
          {session.isPinned && (
            <Pin size={12} className="text-amber-400 fill-amber-400 shrink-0 group-hover:hidden" />
          )}
          <div className="hidden group-hover:flex items-center gap-0.5">
            <span
              role="button"
              tabIndex={0}
              onClick={onTogglePin}
              onKeyDown={(e) => e.key === 'Enter' && onTogglePin(e as any)}
              className={cn(
                "p-1 rounded-md cursor-pointer transition-colors",
                session.isPinned
                  ? "text-amber-400 hover:text-amber-300 hover:bg-white/10"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              )}
              title={session.isPinned ? "Løsne samtale" : "Fest samtale øverst"}
            >
              <Pin size={12} className={session.isPinned ? "fill-amber-400" : ""} />
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={onStartRename}
              onKeyDown={(e) => e.key === 'Enter' && onStartRename(e as any)}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-md cursor-pointer"
              title="Endre tittel"
            >
              <Edit2 size={12} />
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={onDelete}
              onKeyDown={(e) => e.key === 'Enter' && onDelete(e as any)}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-md cursor-pointer"
              title="Slett samtale"
            >
              <Trash2 size={12} />
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
