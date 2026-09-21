'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Bot,
  User as UserIcon,
  ShieldCheck,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { Project, Deviation } from '../types';
import { chatSessionService, ChatSession, ChatMessageItem } from '../services/chatSessionService';
import WorkstationSidebar from './WorkstationSidebar';
import { NotificationBell } from './NotificationBell';
import InChatWorkspace, { InChatFormType } from './InChatWorkspace';

interface MesterWorkstationProps {
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
  const { user, isSuperAdmin, logout, trade, company } = useAuth();

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
  const [viewMode, setViewMode] = useState<'chat' | 'module' | 'form'>('chat');
  const [activeModuleTab, setActiveModuleTab] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<{ type: InChatFormType; data?: any } | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

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

  // Bildeopplasting
  const [attachedImage, setAttachedImage] = useState<{ url: string; preview: string; name?: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const loadingTimerRef = useRef<any>(null);

  // 🔄 Initialiser eller synkroniser aktiv sesjon
  useEffect(() => {
    const active = chatSessionService.getActiveSession();
    if (active) {
      setActiveSessionId(active.id);
      setMessages(active.messages);
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
  }, []);

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

  // 🛠️ Åpne modul fra sidemeny
  const handleOpenModuleFromSidebar = (moduleId: string) => {
    switch (moduleId) {
      case 'dailylog':
        onOpenDailyLogModal?.();
        break;
      case 'pre_close':
        onOpenPreClose?.(lukkesperreZones[0]);
        break;
      case 'sja':
        onOpenSJAModal?.();
        break;
      case 'archive':
        onOpenArchiveModal?.();
        break;
      case 'contacts':
        onOpenContactsModal?.();
        break;
      case 'all_modules':
        onOpenAllModules?.();
        break;
      case 'change_orders':
      case 'deviations':
      case 'offers':
        setActiveModuleTab(moduleId);
        setViewMode('module');
        break;
      default:
        setActiveModuleTab(moduleId);
        setViewMode('module');
        break;
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
    toast.info('Laster opp bilde...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Opplasting feilet');

      const data = await res.json();
      setAttachedImage({
        url: data.url,
        preview: URL.createObjectURL(file),
        name: file.name
      });
      toast.success('Bilde klart for analyse!');
    } catch (err: any) {
      console.error(err);
      toast.error('Kunne ikke laste opp bilde: ' + err.message);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    setIsLoading(true);

    const lower = textToSend.toLowerCase();
    if (lower.includes('nobb') || lower.includes('pris') || lower.includes('materiell')) {
      setLoadingStatus('Søker opp NOBB-priser og vareinformasjon...');
    } else if (lower.includes('tek17') || lower.includes('sluk') || lower.includes('våtrom') || lower.includes('forskrift')) {
      setLoadingStatus('Slår opp i TEK17 og Byggebransjens Våtromsnorm...');
    } else if (lower.includes('endring') || lower.includes('ns 8406') || lower.includes('ordre')) {
      setLoadingStatus('Vurderer endringskrav og frister iht. NS 8406...');
    } else if (lower.includes('sja') || lower.includes('stillas') || lower.includes('sikkerhet')) {
      setLoadingStatus('Formulerer Sikker Jobb Analyse (SJA)...');
    } else if (lower.includes('time') || lower.includes('dagbok')) {
      setLoadingStatus('Beregner timeforbruk og fører byggedagbok...');
    } else {
      setLoadingStatus('MesterAI tenker og analyserer...');
    }

    try {
      const activeProjName = selectedProject?.name || (projects[0]?.name || 'Geitekleiva 12 - Enebolig');
      const activeProjId = selectedProject?.id || projects[0]?.id;

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim() || userMessage.content,
          sessionId: activeSessionId,
          projectName: activeProjName,
          userName: user?.displayName || 'Kenneth Glosli Kristiansen',
          userTrade: trade || user?.trade || 'carpenter',
          companyName: company || user?.company || 'Viking Entreprenør AS',
          userId: user?.uid || user?.id,
          imageUrl: activeImage
        })
      });

      if (!res.ok) throw new Error(`Agent-API svarte med status ${res.status}`);

      const data = await res.json();
      const assistantMessage: ChatMessageItem = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Forespørselen din er behandlet.',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        quickReplies: data.quickReplies
      };

      const finalMessages = [...updatedWithUser, assistantMessage];
      setMessages(finalMessages);

      // Lagre i sesjonstjenesten (oppdaterer tittel i sidebaren automatisk)
      chatSessionService.saveSessionMessages(activeSessionId, finalMessages, {
        autoTitle: true,
        projectName: activeProjName,
        projectId: activeProjId
      });
    } catch (err: any) {
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
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Kopiert til utklippstavle');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#0A101D] text-slate-100 overflow-hidden font-sans">
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
          if (p) toast.info(`Aktivt prosjekt: ${p.name}`);
        }}
        onOpenCreateProject={onOpenCreateProject}
        onOpenModule={handleOpenModuleFromSidebar}
        onOpenSmartSearch={onOpenSmartSearch}
        onOpenSettings={onOpenSettings}
        onOpenSuperAdmin={onOpenSuperAdmin}
        user={user}
        isSuperAdmin={isSuperAdmin}
        onLogout={logout}
        currentActiveTab={activeModuleTab || undefined}
      />

      {/* 2. Main Workstation Center Stage */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0A101D] relative">
        {/* Top Navigation Bar (Gemini & ChatGPT style) */}
        <header className="h-14 px-3 sm:px-5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-[#0A101D]/90 backdrop-blur-md shrink-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile hamburger menu */}
            <button
              type="button"
              onClick={() => setIsOpenMobile(true)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Åpne meny"
            >
              <Menu size={19} />
            </button>

            {/* Desktop uncollapse button if collapsed */}
            {isCollapsedDesktop && (
              <button
                type="button"
                onClick={toggleCollapseDesktop}
                className="hidden md:flex p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Åpne sidemeny"
              >
                <PanelLeftOpen size={18} />
              </button>
            )}

            {/* Prosjektvelger-dropdown (Aktivt prosjekt) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-750 text-xs sm:text-sm font-bold text-white transition-all cursor-pointer max-w-[200px] sm:max-w-[320px] truncate shadow-xs"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">
                  {selectedProject ? selectedProject.name : 'Alle byggeplasser'}
                </span>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isProjectDropdownOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isProjectDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProjectDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      className="absolute left-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl p-1.5 z-50 text-slate-200"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProject(null);
                          setIsProjectDropdownOpen(false);
                          toast.info('Viser alle byggeplasser');
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left",
                          !selectedProject ? "bg-electric-600/30 text-white font-bold" : "hover:bg-slate-800 text-slate-300"
                        )}
                      >
                        <span>Alle byggeplasser</span>
                        {!selectedProject && <Check size={14} className="text-emerald-400" />}
                      </button>
                      <div className="h-px bg-slate-800 my-1" />
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onSelectProject(p);
                            setIsProjectDropdownOpen(false);
                            toast.info(`Aktivt prosjekt: ${p.name}`);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left",
                            selectedProject?.id === p.id ? "bg-electric-600/30 text-white font-bold" : "hover:bg-slate-800 text-slate-300"
                          )}
                        >
                          <span className="truncate">{p.name}</span>
                          {selectedProject?.id === p.id && <Check size={14} className="text-emerald-400 shrink-0" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Status: 100% Autonom */}
            <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              100% Autonom Agent
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
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
              onClick={onOpenSmartSearch}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Søk (⌘K)"
            >
              <Search size={16} />
            </button>

            <NotificationBell darkMode={true} />
          </div>
        </header>

        {/* 3. Main Stage Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
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
                  Viser fagsystem: <strong className="text-white capitalize">{activeModuleTab}</strong>
                </span>
              </div>

              {/* Innhold for valgt modul */}
              {activeModuleTab === 'change_orders' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white">Endringsordrer & Varsler (NS 8406)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Totalt sikret: kr {changeOrders.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString('no-NO')} eks. mva
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenChangeOrderModal?.()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Plus size={15} /> Ny endringsordre
                    </button>
                  </div>

                  {changeOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      Ingen registrerte endringsordrer ennå. Si «Varsle endringsordre» til MesterAI for å opprette!
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {changeOrders.map((co) => (
                        <div key={co.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{co.title}</span>
                              <span className="text-xs text-purple-400 font-mono">#{co.number}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {co.project} • {co.legal} • Kr {Number(co.amount).toLocaleString('no-NO')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {co.status !== 'Godkjent av kunde' && onApproveChangeOrder && (
                              <button
                                type="button"
                                onClick={() => onApproveChangeOrder(co.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer"
                              >
                                Godkjenn
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
            </div>
          ) : (
            /* 🤖 THE DEFAULT CHAT INTERFACE (ChatGPT / Gemini / Antigravity style) */
            <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full px-3 sm:px-6 pt-4 pb-32">
              {messages.length === 0 ? (
                /* Centered Welcome Hero (Like Gemini: "Hva har du i tankene i dag?") */
                <div className="my-auto py-8 sm:py-14 text-center space-y-6 animate-in fade-in duration-300">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 via-electric-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-electric-500/25">
                    <Sparkles size={28} />
                  </div>

                  <div className="space-y-2 max-w-xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Hva vil du ha utført i dag?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Aktiv på <strong className="text-slate-200">{selectedProject?.name || 'Geitekleiva 12 - Enebolig'}</strong>. MesterAI fører timer, varsler endringsordrer iht. NS 8406, lager SJA og sjekker TEK17.
                    </p>
                  </div>

                  {/* Små hint på siden */}
                  <div className="max-w-xl mx-auto p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5 text-left shadow-xs">
                    <span className="text-base shrink-0">💡</span>
                    <span>
                      <strong>Tips:</strong> Du kan snakke inn timer, be om NS 8406 endringsordre eller laste opp bilde av utførelsen for automatisk TEK17-sjekk.
                    </span>
                  </div>

                  {/* 5 Suggestion Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto text-left pt-2">
                    <button
                      type="button"
                      onClick={() => handleSendMessage(`Før 7,5 timer lekting og vindsperre i byggedagboken for ${selectedProject?.name || 'Geitekleiva'}`)}
                      className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all text-xs text-slate-300 hover:text-white font-medium cursor-pointer shadow-xs group"
                    >
                      <span className="text-amber-400 font-bold block mb-1 flex items-center gap-1.5">
                        <Clock size={14} /> Før timer i byggedagbok
                      </span>
                      «Før 7,5 timer lekting og vindsperre på {selectedProject?.name || 'Geitekleiva'}»
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage('Varsle endringsordre iht. NS 8406 på 28 500 kr for ekstra bæring')}
                      className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all text-xs text-slate-300 hover:text-white font-medium cursor-pointer shadow-xs group"
                    >
                      <span className="text-purple-400 font-bold block mb-1 flex items-center gap-1.5">
                        <FileSignature size={14} /> Varsle endringsordre
                      </span>
                      «Varsle endringsordre iht. NS 8406 på 28 500 kr»
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage('Opprett en ny Sikker Jobb Analyse (SJA) for arbeid i stillas i 3. etasje')}
                      className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all text-xs text-slate-300 hover:text-white font-medium cursor-pointer shadow-xs group"
                    >
                      <span className="text-blue-400 font-bold block mb-1 flex items-center gap-1.5">
                        <HardHat size={14} /> SJA for risikofylt arbeid
                      </span>
                      «Opprett SJA for arbeid i stillas i 3. etasje»
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage('Hva er kravene til fall mot sluk og klemring på bad i TEK17?')}
                      className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all text-xs text-slate-300 hover:text-white font-medium cursor-pointer shadow-xs group"
                    >
                      <span className="text-emerald-400 font-bold block mb-1 flex items-center gap-1.5">
                        <ClipboardCheck size={14} /> TEK17 Våtrom & Lukkesperre
                      </span>
                      «Hva er kravene til fall mot sluk og klemring på bad?»
                    </button>
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
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
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

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="mr-auto flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                      <RefreshCw size={14} className="animate-spin text-purple-400" />
                      <span className="animate-pulse font-medium">{loadingStatus}</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Bottom Pill Input Box (Identical to ChatGPT & Gemini) */}
        {viewMode === 'chat' && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0A101D] via-[#0A101D]/90 to-transparent pt-6 pb-4 px-3 sm:px-6 z-20">
            <div className="max-w-4xl mx-auto w-full space-y-2">
              {/* Forhåndsvisning av vedlagt bilde */}
              {attachedImage && (
                <div className="flex items-center gap-2.5 p-2 bg-slate-900 rounded-2xl border border-slate-750 shadow-md w-fit">
                  <img src={attachedImage.preview} alt="Vedlegg" className="w-9 h-9 rounded-lg object-cover" />
                  <span className="text-xs font-medium text-slate-300 truncate max-w-[200px]">{attachedImage.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Pill Container */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputVal);
                }}
                className="relative flex items-end bg-slate-900 border border-slate-750 focus-within:border-purple-500/80 focus-within:ring-2 focus-within:ring-purple-500/20 rounded-3xl p-1.5 sm:p-2 shadow-2xl transition-all"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />

                {/* Left: + / 📷 Image upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage || isLoading}
                  className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Legg ved bilde for TEK17 analyse"
                >
                  <Camera size={18} />
                </button>

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
                  placeholder="Spør MesterAI eller gi en instruks..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent px-2.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none resize-none max-h-36 min-h-[40px] leading-relaxed custom-scrollbar"
                />

                {/* Right controls: Mic & Send */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={cn(
                      "p-2 sm:p-2.5 rounded-full transition-all cursor-pointer",
                      isListeningMic
                        ? "bg-rose-500 text-white animate-pulse"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    )}
                    title={isListeningMic ? "Lytter... Trykk for å stoppe" : "Snakk inn instruks (handsfree)"}
                  >
                    {isListeningMic ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading || (!inputVal.trim() && !attachedImage)}
                    className={cn(
                      "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white transition-all shrink-0 cursor-pointer active:scale-95",
                      (inputVal.trim() || attachedImage)
                        ? "bg-gradient-to-tr from-purple-600 to-electric-600 hover:from-purple-500 hover:to-electric-500 shadow-md shadow-purple-600/30"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                    )}
                    title="Send"
                  >
                    <Send size={16} className={cn((inputVal.trim() || attachedImage) && "translate-x-0.5 -translate-y-0.5")} />
                  </button>
                </div>
              </form>

              {/* Disclaimer footer */}
              <p className="text-[11px] text-slate-500 text-center">
                MesterAI kan gjøre feil. Kontroller viktige mål og NS 8406 endringsvarsler.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
