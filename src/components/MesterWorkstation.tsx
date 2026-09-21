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
  CheckSquare
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
import { formatAiMarkdown } from '../lib/formatAiMarkdown';
import { db, collection, addDoc } from '../services/firebase';

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
  const [selectedChangeOrderForDetail, setSelectedChangeOrderForDetail] = useState<any | null>(null);

  // ⏱️ Tenketimer for MesterAI
  const [activeThinkingDuration, setActiveThinkingDuration] = useState(0);
  const thinkingTimerRef = useRef<any>(null);

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

  // ⏱️ Byggedagbok hurtigføring
  const [logHours, setLogHours] = useState('7.5');
  const [logDescription, setLogDescription] = useState('Lekting av yttervegg og klargjøring for kledning');

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

  // 🛠️ Åpne modul fra sidemeny - Alt åpnes direkte i arbeidsvinduet!
  const handleOpenModuleFromSidebar = (moduleId: string) => {
    setActiveModuleTab(moduleId);
    setViewMode('module');
  };

  // 💰 Opprett tilbud direkte fra hurtigkalkyle
  const handleCreateOfferFromCalc = async () => {
    const labor = calcHours * calcHourlyRate;
    const mats = Math.round(calcMaterials * (1 + calcMarkup / 100));
    const total = labor + mats;
    const newOffer = {
      title: `Tilbud: ${selectedProject?.name || 'Byggeoppdrag'}`,
      projectName: selectedProject?.name || 'Geitekleiva 12',
      projectId: selectedProject?.id || 'gen',
      clientName: selectedProject?.clientName || 'Privatkunde',
      amount: total,
      totalPrice: total,
      hours: calcHours,
      materials: mats,
      status: 'Sendt til kunde',
      createdAt: new Date().toISOString().split('T')[0]
    };
    try {
      await addDoc(collection(db, 'offers'), newOffer);
      toast.success(`Opprettet pristilbud på kr ${total.toLocaleString('no-NO')} eks. mva!`);
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
    const activeProjName = selectedProject?.name || (projects[0]?.name || 'Geitekleiva 12 - Enebolig');
    const activeProjId = selectedProject?.id || projects[0]?.id;

    setActiveThinkingDuration(0);
    setIsLoading(true);

    if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);

    let seconds = 0;
    thinkingTimerRef.current = setInterval(() => {
      seconds += 1;
      setActiveThinkingDuration(seconds);
    }, 1000);

    try {
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
          if (p) {
            setActiveModuleTab('project_details');
            setViewMode('module');
            toast.info(`Aktivt prosjekt: ${p.name}`);
          } else {
            setActiveModuleTab('all_projects');
            setViewMode('module');
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
          {isTopSearchOpen ? (
            <div className="flex-1 flex items-center gap-2 max-w-3xl mx-auto animate-in fade-in duration-150">
              <div className="relative flex-1 flex items-center">
                <Search size={16} className="absolute left-3.5 text-purple-400 shrink-0" />
                <input
                  ref={topSearchInputRef}
                  type="text"
                  value={topSearchQuery}
                  onChange={(e) => setTopSearchQuery(e.target.value)}
                  placeholder="Søk i samtaler, prosjekter eller fagsystemer... (Esc for å lukke)"
                  className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900 border border-purple-500/50 text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                {topSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTopSearchQuery('')}
                    className="absolute right-3 p-0.5 text-slate-400 hover:text-white cursor-pointer"
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
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Lukk
              </button>
            </div>
          ) : (
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
                            setActiveModuleTab('all_projects');
                            setViewMode('module');
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
                              setActiveModuleTab('project_details');
                              setViewMode('module');
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
                        <div className="h-px bg-slate-800 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsProjectDropdownOpen(false);
                            setActiveModuleTab('create_project');
                            setViewMode('module');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors text-left cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Opprett nytt prosjekt</span>
                        </button>
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
          )}

          {/* Right Header Controls */}
          {!isTopSearchOpen && (
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
                onClick={() => setIsTopSearchOpen(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Søk i samtaler, prosjekter og moduler (⌘K)"
              >
                <Search size={16} />
              </button>

              <NotificationBell darkMode={true} />
            </div>
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
                    ? projects.filter(p => p.name.toLowerCase().includes(queryLower) || p.clientName?.toLowerCase().includes(queryLower))
                    : projects.slice(0, 3);

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
                  {activeModuleTab === 'project_details' && (
                    <span>Aktiv byggeplass: <strong className="text-emerald-400">{selectedProject?.name || 'Prosjektoversikt'}</strong></span>
                  )}
                  {activeModuleTab === 'all_projects' && (
                    <span>Byggeplassoversikt: <strong className="text-amber-400">Alle prosjekter</strong></span>
                  )}
                  {activeModuleTab === 'create_project' && (
                    <span>Ny byggeplass: <strong className="text-purple-400">Opprett prosjekt</strong></span>
                  )}
                  {!['project_details', 'all_projects', 'create_project'].includes(activeModuleTab || '') && (
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
                          <span>Alle Byggeplasser ({projects.length})</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Oversikt over alle aktive, planlagte og fullførte byggeprosjekter.
                        </p>
                      </div>
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
                        ? projects.filter(p =>
                            p.name.toLowerCase().includes(q) ||
                            p.code?.toLowerCase().includes(q) ||
                            p.clientName?.toLowerCase().includes(q) ||
                            p.address?.toLowerCase().includes(q)
                          )
                        : projects;

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
                      <button
                        type="button"
                        onClick={handleCreateOfferFromCalc}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                      >
                        <Plus size={15} /> Opprett tilbud fra kalkyle
                      </button>
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
                            <div key={off.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-white">{off.title || 'Tilbud byggeoppdrag'}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    {off.status || 'Sendt til kunde'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {off.projectName || selectedProject?.name} • Kunde: {off.clientName || 'Privatkunde'} • kr {Number(off.totalPrice || off.amount || 0).toLocaleString('no-NO')} eks. mva
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {onDeleteOffer && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteOffer(off.id, off.title)}
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

              {/* 2. ⏱️ BYGGEDAGBOK & TIMER */}
              {activeModuleTab === 'dailylog' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Clock className="text-amber-400" size={20} />
                        <span>Byggedagbok & Timer</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Dokumentasjon iht. Byggherreforskriften for <strong className="text-slate-200">{selectedProject?.name || 'Geitekleiva 12'}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Yr Vær-kort & Mannskap */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span>⛅</span> Vær og temperatur (Yr.no)
                      </span>
                      <div className="text-base font-bold text-white">
                        7°C • Lettskyet • 3 m/s SV
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Nedbør siste 24t: 0.0 mm • Forholdene godkjent for utvendig kledningsarbeid.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Users size={12} className="text-emerald-400" /> Mannskapsliste i dag (3 aktive)
                      </span>
                      <div className="space-y-1 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span>Ken Kristiansen (Bas)</span>
                          <strong className="text-white">7,5 t</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Ole Hansen (Tømrer)</span>
                          <strong className="text-white">7,5 t</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Jonas Vik (Lærling)</span>
                          <strong className="text-white">6,0 t</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hurtigføring av timer */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Plus size={14} className="text-amber-400" /> Før timer i byggedagboken
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Antall timer (f.eks: 7.5)"
                        value={logHours}
                        onChange={(e) => setLogHours(e.target.value)}
                        className="sm:w-32 px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="text"
                        placeholder="Arbeidsoppgave utført..."
                        value={logDescription}
                        onChange={(e) => setLogDescription(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          toast.success(`Ført ${logHours} timer på ${selectedProject?.name || 'Geitekleiva'}: ${logDescription}`);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                      >
                        Lagre loggføring
                      </button>
                    </div>
                  </div>

                  {/* Tidligere loggføringer */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Siste oppføringer i byggedagboken
                    </h4>
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>I dag, 15:30 • Ført av Ken Kristiansen</span>
                        <span className="text-emerald-400 font-bold">Godkjent dagbok</span>
                      </div>
                      <p className="text-slate-200 font-medium">
                        Lekting av yttervegg og klargjøring for liggende kledning mot vest. Dampsperre kontrollert før lukking.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>I går, 16:00 • Ført av Ole Hansen</span>
                        <span className="text-emerald-400 font-bold">Godkjent dagbok</span>
                      </div>
                      <p className="text-slate-200 font-medium">
                        Montering av vindsperreduk og klemming i gesims. Elektriker på plass for rørføring i 2. etasje.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ⚡ ENDRINGSORDRER (NS 8406) */}
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
                                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                                co.status === 'Godkjent av kunde'
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              )}>
                                {co.status === 'Godkjent av kunde' ? '✓ Godkjent' : '⏳ Venter på godkjenning'}
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
                            {co.status !== 'Godkjent av kunde' && onApproveChangeOrder && (
                              <button
                                type="button"
                                onClick={() => onApproveChangeOrder(co.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer transition-all"
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

              {/* 7. 📁 DOKUMENTARKIV & NOBB BYOK */}
              {activeModuleTab === 'archive' && (
                <div className="space-y-4">
                  <DocumentationArchive
                    inline={true}
                    isOpen={true}
                    projectId={selectedProject?.id}
                    projects={projects}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}

              {/* 8. 👥 PROSJEKTKONTAKTER & TEAM */}
              {activeModuleTab === 'contacts' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Users className="text-emerald-400" size={20} />
                        <span>Prosjektkontakter & Team</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Nøkkelpersoner for {selectedProject?.name || 'Geitekleiva 12'}.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { name: selectedProject?.clientName || 'Privat oppdragsgiver', role: 'Byggherre / Kunde', phone: '+47 988 00 111', email: 'byggherre@kunde.no' },
                      { name: user?.displayName || 'Ken Kristiansen', role: 'Prosjektleder / Byggmester', phone: '+47 900 00 000', email: user?.email || 'kenkri3@gmail.com' },
                      { name: 'Ole Hansen', role: 'Bas Tømrer', phone: '+47 911 22 333', email: 'ole@mester.no' },
                      { name: 'El-Mesteren AS', role: 'Elektroentreprenør', phone: '+47 33 00 11 22', email: 'post@elmesteren.no' },
                      { name: 'Rør & Varme AS', role: 'Rørleggerbedrift', phone: '+47 33 22 33 44', email: 'post@rorvarme.no' }
                    ].map((c, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">{c.name}</p>
                          <p className="text-xs text-emerald-400 font-medium">{c.role}</p>
                          <p className="text-[11px] text-slate-400 mt-1">{c.phone} • {c.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`tel:${c.phone}`}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition-colors"
                            title="Ring"
                          >
                            <Phone size={14} />
                          </a>
                          <a
                            href={`mailto:${c.email}`}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition-colors"
                            title="Send e-post"
                          >
                            <Mail size={14} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. ⋯ ALLE FAGMODULER */}
              {activeModuleTab === 'all_modules' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="pb-4 border-b border-slate-800">
                    <h3 className="text-lg font-black text-white">Alle Fagmoduler & Verktøy (20+)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Klikk på en modul for å åpne den direkte her i arbeidsvinduet:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { id: 'offers', name: '📝 Tilbud & Hurtigkalkyle', desc: 'Prising av timer og materiell m/påslag' },
                      { id: 'dailylog', name: '⏱️ Byggedagbok & Timer', desc: 'Yr-vær, mannskapsliste og timeføring' },
                      { id: 'change_orders', name: '⚡ Endringsordrer (NS 8406)', desc: 'Varsling, fristforlengelse og krav' },
                      { id: 'pre_close', name: '📋 KS & Lukkesperre TEK17', desc: 'Obligatorisk sjekk før vegger lukkes' },
                      { id: 'deviations', name: '🚨 Avvik & RUH', desc: 'Bildebevis og lukking av avvik' },
                      { id: 'sja', name: '🦺 SJA & HMS', desc: 'Risikovurdering, PVU og vernetiltak' },
                      { id: 'archive', name: '📁 Dokumentarkiv & FDV', desc: 'NOBB BYOK, monteringsanvisninger' },
                      { id: 'contacts', name: '👥 Prosjektteam & Kontakter', desc: 'Byggherre og underentreprenører' }
                    ].map((mod) => (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => handleOpenModuleFromSidebar(mod.id)}
                        className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 text-left transition-all cursor-pointer group shadow-xs"
                      >
                        <span className="font-bold text-sm text-white block mb-1 group-hover:text-purple-300 transition-colors">
                          {mod.name}
                        </span>
                        <span className="text-xs text-slate-400 block leading-relaxed">
                          {mod.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 10. ⚙️ INNSTILLINGER (INLINE TRIGGER) */}
              {activeModuleTab === 'settings' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl max-w-lg mx-auto my-8">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center mx-auto">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">System- og Bedriftsinnstillinger</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Åpne innstillingsboksen for å justere profil, bedriftsdata, team, moduler og NOBB BYOK-nøkkel.
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
                                  <h5 className="text-xs sm:text-sm font-bold text-teal-300 mt-4 mb-2 flex items-center gap-1.5 uppercase tracking-wider bg-slate-950/60 w-fit px-2.5 py-1 rounded-lg border border-teal-500/20 shadow-xs" {...props} />
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
                                  <strong className="font-extrabold text-white bg-slate-800/80 px-1.5 py-0.5 rounded text-[12px] sm:text-[13px] border border-slate-700/60" {...props} />
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

                  {/* ✦ Clean & Honest Loading Indicator */}
                  {isLoading && (
                    <div className="mr-auto inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-purple-500/30 shadow-xl animate-in fade-in duration-200">
                      <div className="relative flex items-center justify-center">
                        <RefreshCw size={14} className="animate-spin text-purple-400" />
                        <span className="absolute w-2 h-2 rounded-full bg-purple-400 animate-ping opacity-40" />
                      </div>
                      <span className="text-xs font-medium text-slate-200">
                        MesterAI tenker og formulerer svar...
                      </span>
                      {activeThinkingDuration > 0 && (
                        <span className="text-[11px] font-mono text-purple-400/90 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                          {activeThinkingDuration}s
                        </span>
                      )}
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
    </div>
  );
}

