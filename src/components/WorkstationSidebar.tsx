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
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { chatSessionService, ChatSession } from '../services/chatSessionService';
import { Project } from '../types';
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

  // Hent og abonner på oppdateringer i samtalehistorikk
  useEffect(() => {
    const reload = () => {
      setSessions(chatSessionService.getSessions());
    };
    reload();
    const unsub = chatSessionService.subscribe(reload);
    return () => unsub();
  }, [impersonatedCompanyId]);

  const { today, last7Days, older } = chatSessionService.groupSessions(sessions);

  const handleDeleteSession = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(`Vil du slette samtalen "${title}"?`)) {
      chatSessionService.deleteSession(id);
      toast.success('Samtale slettet');
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
      toast.success('Samtales tittel oppdatert');
    }
    setEditingSessionId(null);
  };

  const changeLanguage = async (lng: string) => {
    try {
      await i18n.changeLanguage(lng);
      localStorage.setItem('i18nextLng', lng);
      toast.success(lng === 'no' ? 'Norsk aktivert' : `Språk: ${lng.toUpperCase()}`);
    } catch (e) {
      console.error(e);
    }
  };

  const MODULES = [
    { id: 'dailylog', label: 'Byggedagbok & Timer', icon: Clock, color: 'text-amber-400' },
    { id: 'change_orders', label: 'Endringsordrer (NS 8406)', icon: FileSignature, color: 'text-purple-400' },
    { id: 'pre_close', label: 'KS & Lukkesperre (TEK17)', icon: ClipboardCheck, color: 'text-emerald-400' },
    { id: 'deviations', label: 'Avvik & RUH', icon: AlertTriangle, color: 'text-rose-400' },
    { id: 'sja', label: 'SJA & Sikkerhet', icon: HardHat, color: 'text-blue-400' },
    { id: 'offers', label: 'Tilbud & Kalkyle', icon: Calculator, color: 'text-indigo-400' },
    { id: 'archive', label: 'Dokumentarkiv & FDV', icon: Archive, color: 'text-teal-400' },
    { id: 'contacts', label: 'Kontakter & Team', icon: Users, color: 'text-cyan-400' },
    { id: 'all_modules', label: 'Alle 20+ moduler', icon: Layers, color: 'text-slate-300' }
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

      {/* 🖥️ Sidebar Container (Styled identically to Gemini Mobile & Desktop Workstation) */}
      <aside
        className={cn(
          "text-slate-200 border-r border-slate-800/80 flex flex-col z-50 transition-all duration-300 ease-in-out shrink-0 select-none",
          // Mobile: OLED Black Gemini Drawer
          "fixed inset-y-0 left-0 h-full w-[85vw] max-w-[320px] bg-[#000000] border-r border-white/10 shadow-2xl",
          isOpenMobile ? "translate-x-0" : "-translate-x-full",
          // Desktop: Static in-flow sidebar
          "md:static md:translate-x-0 md:h-[100dvh] md:bg-[#090D16] md:border-slate-800/80",
          isCollapsedDesktop ? "md:w-[68px]" : "md:w-[260px] lg:w-[280px]"
        )}
      >
        {/* 1. Header: Gemini style with brand & close/collapse toggle */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 md:border-slate-800/80 shrink-0 bg-[#000000] md:bg-transparent">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Multi-color glowing Gemini-style star */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
              <Sparkles size={17} className="text-white fill-white/20" />
            </div>
            {!isCollapsedDesktop && (
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white truncate">
                  VikingMester
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  AI
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle [ | ] */}
          <button
            type="button"
            onClick={onToggleCollapseDesktop}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
            title={isCollapsedDesktop ? "Åpne sidemeny" : "Lukk sidemeny"}
          >
            {isCollapsedDesktop ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>

          {/* Mobile close button (Gemini round X) */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Lukk meny"
          >
            <X size={19} />
          </button>
        </div>

        {/* 2. Top Primary Action: "+ Ny samtale" (Gemini Mobile rounded pill style) */}
        <div className="p-3 border-b border-white/10 md:border-slate-800/60 shrink-0 space-y-2">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              if (isOpenMobile) onCloseMobile();
            }}
            className={cn(
              "w-full flex items-center gap-3 py-3 px-4 rounded-full font-semibold text-xs sm:text-sm text-white transition-all shadow-sm active:scale-98 cursor-pointer",
              "bg-[#1e1f20] hover:bg-[#282a2d] border border-white/10 hover:border-white/20",
              isCollapsedDesktop && "md:p-2.5 md:justify-center md:rounded-xl"
            )}
            title="Start en ny samtale eller oppgave"
          >
            <Plus size={18} className="text-white shrink-0" />
            {!isCollapsedDesktop && <span className="truncate">Ny samtale</span>}
          </button>

          {/* 🔍 Søk i samtaler (Gemini pill style) */}
          {!isCollapsedDesktop && (
            <button
              type="button"
              onClick={onOpenSmartSearch}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">Søk i samtaler & prosjekter</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-400 font-mono shrink-0">⌘K</kbd>
            </button>
          )}
        </div>

        {/* 3. Scrollable Middle Area: Moduler, Prosjekter og Samtalehistorikk */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
          {/* Seksjon A: Verktøy & Moduler (Quick access) */}
          <div className="space-y-0.5">
            {!isCollapsedDesktop && (
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>Moduler & Fagsystem</span>
              </div>
            )}

            {MODULES.slice(0, isCollapsedDesktop ? 5 : MODULES.length).map((mod) => {
              const IconComponent = mod.icon;
              const isCurrentTab = currentActiveTab === mod.id;
              const isAllowed = hasModuleAccess ? hasModuleAccess(mod.id) : true;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    if (!isAllowed) {
                      toast.info(`Modulen "${mod.label}" er låst i din pakke. Oppgrader for å få full tilgang!`);
                      return;
                    }
                    onOpenModule(mod.id);
                    if (isOpenMobile) onCloseMobile();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left group",
                    isCurrentTab
                      ? "bg-slate-800 text-white font-bold"
                      : isAllowed 
                        ? "text-slate-300 hover:text-white hover:bg-slate-850" 
                        : "text-slate-500 hover:bg-slate-900/60 opacity-65",
                    isCollapsedDesktop && "justify-center px-2 py-2"
                  )}
                  title={isAllowed ? mod.label : `${mod.label} (Låst i gjeldende pakke)`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconComponent size={16} className={cn(isAllowed ? mod.color : "text-slate-600", "shrink-0 transition-transform group-hover:scale-110")} />
                    {!isCollapsedDesktop && (
                      <span className="truncate">{mod.label}</span>
                    )}
                  </div>
                  {!isCollapsedDesktop && !isAllowed && (
                    <Lock size={12} className="text-slate-500 shrink-0" />
                  )}
                </button>
              );
            })}

            {/* 👑 SuperAdmin Portal Shortcut (Only visible for genuine superadmins in superadmin mode) */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenSuperAdmin) onOpenSuperAdmin();
                  else window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "super-admin" } }));
                  if (isOpenMobile) onCloseMobile();
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-left group mt-1.5",
                  "bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 border border-amber-500/40 text-amber-300 hover:text-white hover:bg-amber-500/25 hover:border-amber-400 shadow-xs",
                  isCollapsedDesktop && "justify-center px-2 py-2"
                )}
                title="SuperAdmin Portal - Brukere, lisenser og systemovervåkning"
              >
                <Crown size={16} className="text-amber-400 shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform" />
                {!isCollapsedDesktop && (
                  <div className="flex items-center justify-between w-full min-w-0">
                    <span className="truncate">SuperAdmin Portal</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 font-mono font-black border border-amber-400/30">SYS</span>
                  </div>
                )}
              </button>
            )}

            {/* 👑 Plattformeier Hurtig-retur dersom i visningsmodus eller simulering */}
            {!isSuperAdmin && isPlatformOwner && (impersonatedCompanyId || simulatedPlan) && (
              <button
                type="button"
                onClick={() => {
                  if (setSimulatedPlan) setSimulatedPlan(null);
                  if (stopImpersonation) stopImpersonation();
                  if (onOpenSuperAdmin) onOpenSuperAdmin();
                  else window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "super-admin" } }));
                  if (isOpenMobile) onCloseMobile();
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer text-left group mt-1.5",
                  "bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-md",
                  isCollapsedDesktop && "justify-center px-2 py-2"
                )}
                title="Returner til SuperAdmin Portal"
              >
                <ArrowLeft size={14} className="shrink-0" />
                {!isCollapsedDesktop && (
                  <span className="truncate">← Tilbake til SuperAdmin</span>
                )}
              </button>
            )}
          </div>

          {/* Seksjon B: Prosjekter (Gemini: "Notatbøker") */}
          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            {!isCollapsedDesktop && (
              <div className="px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-electric-400" /> Prosjekter
                </span>
                <button
                  type="button"
                  onClick={onOpenCreateProject}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  title="Opprett nytt prosjekt"
                >
                  <Plus size={13} />
                </button>
              </div>
            )}

            <div className="space-y-0.5">
              {/* Alle prosjekter (Standard / Global fokus) */}
              <button
                type="button"
                onClick={() => {
                  onSelectProject(null);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left",
                  !selectedProject
                    ? "bg-slate-800 text-white font-bold"
                    : "text-slate-300 hover:text-white hover:bg-slate-850",
                  isCollapsedDesktop && "justify-center px-2 py-2"
                )}
                title="Alle byggeplasser"
              >
                <HardHat size={15} className={!selectedProject ? "text-amber-400 shrink-0" : "text-slate-400 shrink-0"} />
                {!isCollapsedDesktop && (
                  <span className="truncate">Alle byggeplasser</span>
                )}
              </button>

              {projects.map((proj) => {
                const isSelected = selectedProject?.id === proj.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      onSelectProject(proj);
                      if (isOpenMobile) onCloseMobile();
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left group",
                      isSelected
                        ? "bg-electric-950/70 border border-electric-500/40 text-white font-bold"
                        : "text-slate-300 hover:text-white hover:bg-slate-850",
                      isCollapsedDesktop && "justify-center px-2 py-2"
                    )}
                    title={`${proj.name} (${proj.clientName || 'Byggeplass'})`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        isSelected ? "bg-emerald-400 animate-pulse" : "bg-slate-500 group-hover:bg-slate-300"
                      )} />
                      {!isCollapsedDesktop && (
                        <span className="truncate">{proj.name}</span>
                      )}
                    </div>
                    {!isCollapsedDesktop && proj.progress !== undefined && (
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {proj.progress}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seksjon C: Nylige (Gemini: "Nylige" samtaler) */}
          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            {!isCollapsedDesktop && (
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>Nylige samtaler</span>
                <span className="text-[10px] text-slate-500 font-bold">{sessions.length}</span>
              </div>
            )}

            {sessions.length === 0 ? (
              !isCollapsedDesktop && (
                <p className="px-2.5 py-2 text-xs text-slate-500 italic">
                  Ingen tidligere samtaler ennå.
                </p>
              )
            ) : (
              <div className="space-y-0.5">
                {today.length > 0 && (
                  <>
                    {!isCollapsedDesktop && (
                      <p className="px-2.5 pt-1 pb-0.5 text-[10px] font-bold text-slate-500">I dag</p>
                    )}
                    {today.map(session => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={activeSessionId === session.id}
                        isCollapsed={isCollapsedDesktop}
                        isEditing={editingSessionId === session.id}
                        editingTitle={editingTitle}
                        onSetEditingTitle={setEditingTitle}
                        onSaveRename={() => handleSaveRename(session.id)}
                        onCancelRename={() => setEditingSessionId(null)}
                        onStartRename={(e) => handleStartRename(e, session)}
                        onSelect={() => {
                          onSelectSession(session.id);
                          if (isOpenMobile) onCloseMobile();
                        }}
                        onDelete={(e) => handleDeleteSession(e, session.id, session.title)}
                      />
                    ))}
                  </>
                )}

                {last7Days.length > 0 && (
                  <>
                    {!isCollapsedDesktop && (
                      <p className="px-2.5 pt-2 pb-0.5 text-[10px] font-bold text-slate-500">Siste 7 dager</p>
                    )}
                    {last7Days.map(session => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={activeSessionId === session.id}
                        isCollapsed={isCollapsedDesktop}
                        isEditing={editingSessionId === session.id}
                        editingTitle={editingTitle}
                        onSetEditingTitle={setEditingTitle}
                        onSaveRename={() => handleSaveRename(session.id)}
                        onCancelRename={() => setEditingSessionId(null)}
                        onStartRename={(e) => handleStartRename(e, session)}
                        onSelect={() => {
                          onSelectSession(session.id);
                          if (isOpenMobile) onCloseMobile();
                        }}
                        onDelete={(e) => handleDeleteSession(e, session.id, session.title)}
                      />
                    ))}
                  </>
                )}

                {older.length > 0 && (
                  <>
                    {!isCollapsedDesktop && (
                      <p className="px-2.5 pt-2 pb-0.5 text-[10px] font-bold text-slate-500">Tidligere</p>
                    )}
                    {older.map(session => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={activeSessionId === session.id}
                        isCollapsed={isCollapsedDesktop}
                        isEditing={editingSessionId === session.id}
                        editingTitle={editingTitle}
                        onSetEditingTitle={setEditingTitle}
                        onSaveRename={() => handleSaveRename(session.id)}
                        onCancelRename={() => setEditingSessionId(null)}
                        onStartRename={(e) => handleStartRename(e, session)}
                        onSelect={() => {
                          onSelectSession(session.id);
                          if (isOpenMobile) onCloseMobile();
                        }}
                        onDelete={(e) => handleDeleteSession(e, session.id, session.title)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. Footer: Gemini-style user profile card with location, settings & logout */}
        <div className="p-3 border-t border-white/10 md:border-slate-800/80 shrink-0 bg-[#000000] md:bg-[#070A11] space-y-2">
          <div className={cn("p-2 rounded-2xl bg-[#131314] border border-white/10 flex items-center justify-between gap-2 transition-all", isCollapsedDesktop && "justify-center p-1.5 bg-transparent border-transparent")}>
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'Profil'} 
                  className="w-8 h-8 rounded-full border border-white/20 object-cover shrink-0 aspect-square"
                />
              ) : (
                <div 
                  onClick={() => {
                    if (isCollapsedDesktop && isSuperAdmin && !impersonatedCompanyId) {
                      if (onOpenSuperAdmin) onOpenSuperAdmin();
                      else window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "super-admin" } }));
                    }
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 ring-2",
                    impersonatedCompanyId
                      ? "bg-gradient-to-tr from-amber-600 to-amber-400 ring-amber-500/30"
                      : "bg-gradient-to-tr from-purple-600 to-blue-500 ring-purple-500/30",
                    isCollapsedDesktop && isSuperAdmin && !impersonatedCompanyId && "cursor-pointer ring-amber-400/50 hover:scale-105 transition-transform"
                  )}
                  title={
                    impersonatedCompanyId
                      ? `Viser som kunde: ${impersonatedCompanyId === 'comp-demo-fjellheim' ? 'Fjellheim Bygg' : impersonatedCompanyId}`
                      : (isCollapsedDesktop && isSuperAdmin ? "👑 SuperAdmin Portal (klikk her)" : undefined)
                  }
                >
                  {impersonatedCompanyId === 'comp-demo-fjellheim' 
                    ? 'L' 
                    : (user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'K')}
                </div>
              )}
              {!isCollapsedDesktop && (
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {impersonatedCompanyId === 'comp-demo-fjellheim' 
                      ? 'Lars Fjellheim' 
                      : (impersonatedCompanyId ? `Kunde: ${impersonatedCompanyId}` : (user?.displayName || 'Kenneth Glosli Kristiansen'))}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border border-purple-500/30">
                      MESTER PRO
                    </span>
                    {isSuperAdmin && (
                      <span className="text-[9px] font-bold text-amber-400">👑 Sys</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsedDesktop && (
              <div className="flex items-center gap-0.5 shrink-0">
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenSuperAdmin) onOpenSuperAdmin();
                      else window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "super-admin" } }));
                    }}
                    className="p-1.5 rounded-lg text-amber-400 hover:text-white hover:bg-amber-500/20 transition-colors cursor-pointer"
                    title="SuperAdmin Portal"
                  >
                    <Crown size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Innstillinger"
                >
                  <Settings size={15} />
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                  title="Logg ut"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>

          {!isCollapsedDesktop && (
            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-850">
              <span className="flex items-center gap-1 truncate">
                <MapPin size={11} className="text-slate-500 shrink-0" />
                <span className="truncate">Tønsberg, Norge</span>
              </span>
              <div className="flex items-center gap-1">
                <Globe size={11} className="text-slate-500" />
                <select
                  value={getStandardLang(i18n.language)}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="text-[10px] font-bold bg-transparent border-none text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer uppercase [&>option]:bg-slate-900"
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
  onSelect,
  onDelete
}: {
  session: ChatSession;
  isActive: boolean;
  isCollapsed: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSetEditingTitle: (v: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onStartRename: (e: React.MouseEvent) => void;
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
          className="w-full px-2 py-1 text-xs bg-slate-900 border border-electric-500 rounded text-white focus:outline-none"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left group",
        isActive
          ? "bg-slate-800 text-white font-bold shadow-xs"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-850",
        isCollapsed && "justify-center px-2 py-2"
      )}
      title={session.title}
    >
      <div className="flex items-center gap-2 min-w-0">
        <MessageSquare size={13} className={isActive ? "text-purple-400 shrink-0" : "text-slate-500 shrink-0"} />
        {!isCollapsed && (
          <span className="truncate">{session.title}</span>
        )}
      </div>

      {!isCollapsed && (
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          <span
            role="button"
            tabIndex={0}
            onClick={onStartRename}
            onKeyDown={(e) => e.key === 'Enter' && onStartRename(e as any)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded cursor-pointer"
            title="Endre tittel"
          >
            <Edit2 size={11} />
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={onDelete}
            onKeyDown={(e) => e.key === 'Enter' && onDelete(e as any)}
            className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded cursor-pointer"
            title="Slett samtale"
          >
            <Trash2 size={11} />
          </span>
        </div>
      )}
    </button>
  );
}
