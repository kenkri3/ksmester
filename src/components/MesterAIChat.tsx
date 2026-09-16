import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  Brain, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  X, 
  RefreshCw, 
  FileText, 
  FileSignature, 
  Camera, 
  Copy, 
  Check, 
  ChevronRight, 
  Building2,
  Trash2,
  Minimize2,
  Maximize2,
  Minus,
  Layers,
  Columns,
  HardHat,
  TrendingUp,
  AlertTriangle,
  Lock,
  Unlock,
  Plus,
  Search,
  ExternalLink,
  MessageSquare,
  Hash,
  Radio,
  Mail,
  CheckCircle2,
  CloudSun,
  ShieldCheck,
  Timer,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  ListTodo,
  CheckSquare,
  Square,
  Sliders,
  Shield,
  Smartphone,
  Home,
  ChevronLeft,
  Globe,
  RotateCcw,
  Settings,
  LogOut,
  Download,
  User as UserIcon,
  ChevronDown,
  Menu
} from 'lucide-react';
import InChatWorkspace, { InChatFormType } from './InChatWorkspace';
import AutonomousControlPost from './AutonomousControlPost';
import { optimizeImageForVision } from '@/src/lib/imageOptimizer';
import { visionService } from '../services/visionService';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { db, collection, onSnapshot, doc, updateDoc, updateUserProfile } from '../services/firebase';
import { getStoredOmnichannelSettings, OmnichannelSettings } from './OmnichannelModal';
import { NotificationBell } from './NotificationBell';
import { isPWAInstalled, triggerAppDownloadOrInstall } from '../lib/pwa';
import { getStandardLang } from '../i18n';
import { useTranslation } from 'react-i18next';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedActions?: Array<{
    id: string;
    type: string;
    label: string;
    title?: string;
    data?: any;
    prompt?: string;
  }>;
  followUpPrompts?: string[];
}

interface MesterAIChatProps {
  isOpen: boolean;
  onClose?: () => void;
  selectedProject?: any;
  projects?: any[];
  changeOrders?: any[];
  offers?: any[];
  deviations?: any[];
  lukkesperreZones?: any[];
  recentActivities?: any[];
  tasks?: any[];
  initialPrompt?: string;
  initialTab?: string;
  isEmbedded?: boolean;
  onSelectProject?: (project: any) => void;
  onOpenPortal?: (project: any) => void;
  onOpenCreateProject?: () => void;
  onOpenSmartSearch?: () => void;
  onOpenAllModules?: () => void;
  onApproveChangeOrder?: (id: string) => void;
  onRejectChangeOrder?: (id: string) => void;
  onDeleteChangeOrder?: (id: string, title: string) => void;
  onDeleteOffer?: (id: string, title: string) => void;
  onOpenPreClose?: (zone: any) => void;
  onOpenOmnichannelModal?: () => void;
  onOpenInviteModal?: () => void;
  onOpenOfferModal?: (data?: any) => void;
  onOpenChangeOrderModal?: (data?: any) => void;
  onOpenSJAModal?: (data?: any) => void;
  onOpenAIVision?: () => void;
  onPromptHandled?: () => void;
  onNavigate?: (tab: string) => void;
}

export default function MesterAIChat({
  isOpen,
  onClose,
  selectedProject,
  projects = [],
  changeOrders = [],
  offers = [],
  deviations = [],
  lukkesperreZones = [],
  recentActivities = [],
  tasks = [],
  initialPrompt,
  initialTab,
  isEmbedded = false,
  onSelectProject,
  onOpenPortal,
  onOpenCreateProject,
  onOpenSmartSearch,
  onOpenAllModules,
  onApproveChangeOrder,
  onRejectChangeOrder,
  onDeleteChangeOrder,
  onDeleteOffer,
  onOpenPreClose,
  onOpenOmnichannelModal,
  onOpenInviteModal,
  onOpenOfferModal,
  onOpenChangeOrderModal,
  onOpenSJAModal,
  onOpenAIVision,
  onPromptHandled,
  onNavigate
}: MesterAIChatProps) {
  const { user, isSuperAdmin, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const isWorker = user?.role === 'worker' || user?.role === 'external_worker';
  const isAdminOrManager = isSuperAdmin || user?.role === 'admin' || user?.role === 'manager' || !user?.role;

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const changeLanguage = async (lng: string) => {
    try {
      await i18n.changeLanguage(lng);
      localStorage.setItem('i18nextLng', lng);
      if (user?.uid) {
        await updateUserProfile(user.uid, { language: lng });
      }
      toast.success(
        lng === 'no' 
          ? 'Språk endret til Norsk' 
          : lng === 'pl' 
            ? 'Język zmieniony na Polski' 
            : lng === 'lt' 
              ? 'Kalba pakeista į Lietuvių' 
              : 'Language changed to English'
      );
    } catch (err) {
      console.error('Error changing language:', err);
    }
  };

  const handleInstallApp = async () => {
    if (isPWAInstalled()) {
      toast.info('VikingMester er allerede installert som app på denne enheten!');
      return;
    }

    await triggerAppDownloadOrInstall({
      onInstalled: () => toast.info('VikingMester er allerede installert som app på denne enheten!'),
      onAccepted: () => toast.success('Laster ned og installerer VikingMester på telefonen...'),
      onFallback: () => {
        toast.success('Laster ned snarvei til VikingMester...');
      }
    });
  };

  const handleNavigate = (targetView: string) => {
    setIsProfileMenuOpen(false);
    window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: targetView } }));
  };

  const getInitialMessages = (): ChatMessage[] => [
    {
      id: 'welcome',
      role: 'assistant',
      content: isWorker
        ? `Hei ${user?.displayName || 'håndverker'}! 🔨 Jeg er **MesterAI Feltassistent**.\n\nHer har du alt du trenger ute på byggeplassen:\n- 📋 **Mine Oppgaver:** Se hva du skal gjøre i dag og marker fullført.\n- ⏱️ **Timeføring:** Før timer med tale eller ett trykk.\n- 🛡️ **SJA & Sikkerhet:** Sjekk vernetiltak og risikovurdering før risikofylt arbeid.\n- 📐 **TEK17 & Forskrifter:** Still spørsmål om fall til sluk, dampsperre, u-verdier etc.\n\nHva vil du fikse nå?`
        : `Hei! Jeg er **MesterAI**, din autonome lederassistent og faglige samtalepartner.\n\nHer i arbeidsstasjonen har du **full kontroll over hele driften**:\n- 🎯 **Dagens Status:** Sanntids morgenbrifing, vær (Yr.no) og lukkesperrer.\n- 📋 **Tildel Oppgaver:** Deleger oppgaver direkte via tale eller skjema.\n- 📝 **Tilbud & Kalkyle:** Beregne arbeidstimer, materialer, påslag og forbehold (NS 8406 / NS 8405).\n- 📄 **Endringsordrer & Varsler:** Føre og godkjenne krav om tilleggsvederlag uten formfeil.\n- 👥 **Team & Invitasjoner:** Inviter håndverkere og tildel tilgangsnivåer.\n\nHva vil du fikse eller få oversikt over nå?`,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      followUpPrompts: isWorker
        ? [
            'Hva er oppgavene mine i dag?',
            projects?.[0]?.name ? `Før 7.5 timer på ${projects[0].name}` : 'Før dagens arbeidstimer',
            'Hva er kravene til fall mot sluk i TEK17?',
            'Lag en SJA for sikkert arbeid'
          ]
        : [
            projects?.[0]?.name ? `Dagens status for ${projects[0].name}` : 'Gi meg dagens status for byggeplassene',
            'Tildel ny oppgave til en håndverker',
            'Hjelp meg å skrive et nytt tilbud',
            'Hvordan varsler jeg en endringsordre iht. NS 8406?'
          ]
    }
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('mester_ai_chat_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return getInitialMessages();
  });

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSplitView, setIsSplitView] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });
  const [activeTab, setActiveTab] = useState<'control_center' | 'chat' | 'projects' | 'admin' | 'team' | 'toolbox' | 'channels'>('control_center');
  const [activeFormView, setActiveFormView] = useState<{ type: InChatFormType; data?: any } | null>(null);
  const [projectFilter, setProjectFilter] = useState('');
  const [adminTab, setAdminTab] = useState<'offers' | 'changes'>('offers');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [tasksList, setTasksList] = useState<any[]>(tasks || []);

  useEffect(() => {
    if (tasks) {
      setTasksList(tasks);
    }
  }, [tasks]);
  const [omniSettings, setOmniSettings] = useState<OmnichannelSettings>(getStoredOmnichannelSettings);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Sync initialTab with activeTab
  useEffect(() => {
    if (!initialTab) return;
    if (initialTab === 'prosjekter' || initialTab === 'projects') setActiveTab('projects');
    else if (initialTab === 'chat' || initialTab === 'samtale') setActiveTab('chat');
    else if (initialTab === 'admin' || initialTab === 'tilbud' || initialTab === 'endring' || initialTab === 'finans' || initialTab === 'endringsordrer') setActiveTab('admin');
    else if (initialTab === 'team') setActiveTab('team');
    else if (initialTab === 'toolbox' || initialTab === 'verktoy') setActiveTab('toolbox');
    else if (initialTab === 'oversikt' || initialTab === 'cockpit' || initialTab === 'control_center') setActiveTab('control_center');
  }, [initialTab]);

  // Global event listener for tab switching from header / mobile menu
  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      const target = e.detail?.tab;
      if (!target) return;
      if (target === 'prosjekter' || target === 'projects') setActiveTab('projects');
      else if (target === 'chat' || target === 'samtale') setActiveTab('chat');
      else if (target === 'admin' || target === 'tilbud' || target === 'endring' || target === 'finans' || target === 'endringsordrer') setActiveTab('admin');
      else if (target === 'team') setActiveTab('team');
      else if (target === 'toolbox' || target === 'verktoy') setActiveTab('toolbox');
      else if (target === 'oversikt' || target === 'cockpit' || target === 'control_center') setActiveTab('control_center');
      setActiveFormView(null);
    };
    window.addEventListener('switch_mester_tab', handleSwitchTab as EventListener);
    return () => window.removeEventListener('switch_mester_tab', handleSwitchTab as EventListener);
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Keep omnichannel settings updated in real time
  useEffect(() => {
    const handleOmniUpdate = (e: any) => {
      if (e.detail) {
        setOmniSettings(e.detail);
      } else {
        setOmniSettings(getStoredOmnichannelSettings());
      }
    };
    window.addEventListener('omnichannel_settings_updated', handleOmniUpdate);
    return () => window.removeEventListener('omnichannel_settings_updated', handleOmniUpdate);
  }, []);

  // Auto-scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tasks'), (snap) => {
      if (snap.docs && snap.docs.length > 0) {
        const live = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTasksList(live);
      }
    });
    return () => unsub();
  }, []);

  // Listen for local task assignments
  useEffect(() => {
    const handleNewTask = (e: any) => {
      if (e.detail) {
        setTasksList(prev => [e.detail, ...prev.filter(t => t.id !== e.detail.id)]);
      }
    };
    window.addEventListener('task_assigned_event', handleNewTask);
    return () => window.removeEventListener('task_assigned_event', handleNewTask);
  }, []);

  // Text to speech playback: Smart AI TTS via 1min.ai (OpenAI tts-1 onyx) with natural Norwegian pronunciation
  const handleSpeakText = async (textToSpeak: string) => {
    // 1. Hvis tale allerede spilles av -> Stopp
    if (isSpeaking) {
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
        } catch {}
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
      // 2. Forsøk førsteklasses AI TTS via serveren (/api/ai/tts drevet av 1min.ai / OpenAI TTS onyx)
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null;
      const ttsRes = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          text: textToSpeak,
          voice: 'onyx', // Dyp, rolig, autoritær mesterstemme
          model: 'tts-1'
        })
      });

      if (ttsRes.ok) {
        const data = await ttsRes.json();
        if (data.success && data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audioPlayerRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
            audioPlayerRef.current = null;
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            audioPlayerRef.current = null;
          };
          await audio.play();
          return;
        }
      }
    } catch (apiErr) {
      console.warn('[MesterAI TTS] AI TTS feilet, faller tilbake til lokal stemme:', apiErr);
    }

    // 3. Fallback: Nettleserens talesyntese (optimalisert for norsk)
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.info('Tale-syntese støttes ikke på denne enheten.');
      setIsSpeaking(false);
      return;
    }

    const cleanText = textToSpeak
      .replace(/[*_#`~>]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/\bkr\.?\s*([\d\s]+)/gi, '$1 kroner ')
      .replace(/\bNS\s*8406\b/gi, 'Norsk Standard 84 null 6')
      .replace(/\bTEK17\b/gi, 'Tek 17')
      .replace(/\bSJA\b/g, 'S-J-A')
      .slice(0, 800);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'nb-NO';
    utterance.rate = 1.0;

    // Finn beste tilgjengelige norske stemme
    const voices = window.speechSynthesis.getVoices();
    const norwegianVoice = voices.find(v => 
      (v.lang.includes('nb') || v.lang.includes('no') || v.lang.includes('nn')) && 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Nora') || v.name.includes('Henrik'))
    ) || voices.find(v => v.lang.startsWith('nb') || v.lang.startsWith('no'));

    if (norwegianVoice) {
      utterance.voice = norwegianVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Morning briefing speech synthesis
  const handleMorningBriefingSpeak = () => {
    const briefingText = isWorker
      ? `Hei ${user?.displayName || 'håndverker'}! Her er dine oppgaver for i dag: Du har ${tasksList.filter(t => t.status !== 'completed').length} åpne oppgaver. Husk å sjekke SJA før risikofylt arbeid og føre timer ved dagens slutt.`
      : `God morgen! Her er sammendrag for byggeledelsen: Du har ${projects.length} aktive byggeprosjekter. ${tasksList.filter(t => t.status !== 'completed').length} oppgaver gjenstår i dag. ${lukkesperreZones.some(z => z.status === 'RED') ? 'Merk at det er én aktiv lukkesperre som krever kontroll før kledning.' : 'Alle lukkesperrer og sjekklister er i orden.'} Du har sikret kr ${changeOrders.reduce((a, b) => a + (Number(b.amount) || 0), 0).toLocaleString('no-NO')} i godkjente endringsordrer iht. NS 8406.`;
    handleSpeakText(briefingText);
  };

  // Dedicated push-to-talk voice command handler with robust mobile SpeechRecognition
  const handleVoiceCommand = () => {
    if (isListeningMic) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListeningMic(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info('Tale-til-tekst støttes best i Chrome, Safari og Edge. Du kan også bruke tastaturet eller diktat-knappen.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'nb-NO';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      let capturedText = '';

      recognition.onstart = () => {
        setIsListeningMic(true);
        toast.info('Lytter... Still spørsmål eller gi instruks med stemmen nå.');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            capturedText += trans;
          } else {
            currentInterim += trans;
          }
        }
        if (!capturedText && currentInterim) {
          capturedText = currentInterim;
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice command recognition error:', event?.error);
        if (event?.error === 'not-allowed') {
          toast.error('Mikrofontilgang ble avvist. Vennligst tillat mikrofon i nettleseren.');
        } else if (event?.error === 'no-speech') {
          toast.info('Ingen tale registrert. Trykk og snakk tydelig.');
        }
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
        recognitionRef.current = null;
        const finalCmd = capturedText.trim();
        if (finalCmd) {
          toast.success(`Oppfattet: "${finalCmd}"`);
          handleSendMessage(finalCmd);
          setActiveTab('chat');
        }
      };

      recognition.start();
    } catch (e) {
      console.warn('Voice command start failed:', e);
      setIsListeningMic(false);
    }
  };

  // Fast progress adjuster for leaders
  const handleUpdateProjectProgress = async (projectId: string, currentProgress: number, delta: number) => {
    const newProgress = Math.min(100, Math.max(0, currentProgress + delta));
    const targetProj = projects.find(p => p.id === projectId);
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        ...(targetProj || {}),
        progress: newProgress,
        lastUpdate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast.success(`Fremdrift oppdatert til ${newProgress}%`);
    } catch (e) {
      console.warn('Could not update progress in Firestore, updating locally:', e);
      toast.success(`Fremdrift oppdatert til ${newProgress}%`);
    }
  };

  // Toggle task completion & recalculate project progress automatically
  const handleToggleTask = async (task: any) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updatedTasks = tasksList.map(t => t.id === task.id ? { ...t, status: nextStatus } : t);
    setTasksList(updatedTasks);

    // 🤖 Autonom fremdriftskalkulering
    const projId = task.projectId || selectedProject?.id || projects[0]?.id;
    if (projId) {
      const projTasks = updatedTasks.filter(t => t.projectId === projId);
      if (projTasks.length > 0) {
        const completedCount = projTasks.filter(t => t.status === 'completed').length;
        const autoProgress = Math.round((completedCount / projTasks.length) * 100);
        const targetProj = projects.find(p => p.id === projId);
        updateDoc(doc(db, 'projects', projId), {
          ...(targetProj || {}),
          progress: autoProgress,
          lastUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }
    }

    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
        completedBy: user?.displayName || user?.email || 'Bruker'
      });
      toast.success(nextStatus === 'completed' ? `Oppgave fullført! 🎉 Fremdrift oppdatert automatisk.` : 'Oppgave gjenåpnet');
    } catch {
      toast.success(nextStatus === 'completed' ? `Oppgave fullført!` : 'Oppgave gjenåpnet');
    }
  };

  // Save conversation history to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        sessionStorage.setItem('mester_ai_chat_history', JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && !isMinimized && activeTab === 'chat') {
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading, isOpen, isMinimized, activeTab]);

  // Handle incoming initial prompt
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
      setActiveTab('chat');
      onPromptHandled?.();
    }
  }, [initialPrompt]);

  // Direct in-chat photo analysis (TEK17 / BVN Vision AI)
  const handleChatPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const userMsgId = `usr-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        content: `📸 **Bilde lastet opp for KS-kontroll:** ${file.name}\n\n*Analyserer mot TEK17 og Byggebransjens Våtromsnorm (BVN)...*`,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    setIsLoading(true);
    setIsAnalyzingImage(true);
    try {
      const { base64, mimeType } = await optimizeImageForVision(file);
      const analysis = await visionService.analyzeImage(base64, mimeType);

      const isApproved = analysis.status === 'approved';
      const aiMsgContent = `${isApproved ? '✅ **TEK17 / BVN-KONTROLL GODKJENT**' : '⚠️ **AVVIK DETEKTERT / LUKKESPERRE AKTIVERT**'}\n\n` +
        `**Vurdering:** ${analysis.description}\n\n` +
        `**Detekterte elementer:** ${analysis.elements.join(', ')}\n\n` +
        (analysis.tips && analysis.tips.length > 0 ? `**Faglige råd:**\n${analysis.tips.map(t => `- ${t}`).join('\n')}\n\n` : '') +
        (analysis.recommendation ? `**Anbefalt tiltak:** ${analysis.recommendation}` : '');

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiMsgContent,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: isApproved ? [
          {
            id: 'log_photo',
            type: 'open_time_modal',
            label: '⏱️ Før timer på prosjektet',
            data: { projectId: selectedProject?.id }
          }
        ] : [
          {
            id: 'create_dev',
            type: 'open_deviation_modal',
            label: '🚨 Registrer formelt avvik (RUH)',
            data: {
              title: analysis.title || 'Avvik oppdaget ved bildekontroll',
              description: analysis.description,
              projectId: selectedProject?.id
            }
          }
        ]
      };

      setMessages(prev => [...prev, assistantMsg]);
      toast.success(isApproved ? 'Bilde godkjent iht. TEK17!' : 'Avvik identifisert av AI!');
    } catch (err: any) {
      console.error('Vision chat error:', err);
      toast.error('Kunne ikke analysere bildet: ' + (err.message || 'Prøv et skarpere bilde'));
    } finally {
      setIsLoading(false);
      setIsAnalyzingImage(false);
      if (chatFileInputRef.current) chatFileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const trimmed = textToSend.trim();
    const lower = trimmed.toLowerCase();
    if (lower === '/nullstill' || lower === '/reset' || lower === 'nullstill' || lower === 'nullstill samtale' || lower === 'nullstill chat' || lower === 'start på nytt') {
      handleClearHistory();
      setInputVal('');
      return;
    }

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputVal('');
    setIsLoading(true);

    try {
      const activeProj = selectedProject || projects[0];
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const historyPayload = newMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      let res: Response | null = null;
      let lastFetchErr: any = null;

      // Prøv inntil 2 ganger ved 502/503/504 (f.eks. under deployment rollover)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await fetch('/api/agent/dispatch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              action: 'chat',
              text: textToSend,
              history: historyPayload,
              projectId: activeProj?.id || '',
              projectName: activeProj?.name || 'Byggeprosjekt',
              authorName: typeof window !== 'undefined' && localStorage.getItem('user_display_name') ? localStorage.getItem('user_display_name') : 'Admin / Byggmester'
            })
          });

          // Hvis serveren returnerte 502/503/504 (f.eks. under container switchover), vent 2 sek og prøv på nytt
          if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt === 0) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          break;
        } catch (fetchErr: any) {
          lastFetchErr = fetchErr;
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
        }
      }

      if (!res || !res.ok) {
        const status = res ? res.status : 500;
        if (status === 502 || status === 503 || status === 504) {
          throw new Error(`Serveroppdatering pågår (${status})`);
        }
        throw new Error(lastFetchErr?.message || `Serverfeil: ${status}`);
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Jeg har mottatt forespørselen, men fikk ikke noe svarinnhold fra serveren.',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: data.suggestedActions || []
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.executedAction) {
        if (data.executedAction.type === 'create_task') {
          toast.success('Oppgave opprettet i MesterAI');
        } else if (data.executedAction.type === 'create_offer') {
          toast.success('Tilbudskalkyle opprettet i MesterAI');
        } else if (data.executedAction.type === 'change_order') {
          toast.success('Endringsordre generert');
        }
      }
    } catch (err: any) {
      console.error('MesterAI chat dispatch failed:', err);
      const isDeployOrTimeout = err.message?.includes('502') || err.message?.includes('503') || err.message?.includes('504') || err.message?.includes('Serveroppdatering');
      
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: isDeployOrTimeout
          ? `🔄 **Midlertidig kontaktbrudd mot serveren:**\n\nServeren utførte akkurat en automatisk oppdatering eller brukte litt for lang tid på å svare. Den nye versjonen er nå aktiv!\n\nKlikk på knappen under for å prøve forespørselen på nytt:`
          : `Beklager, jeg opplevde en midlertidig feil: ${err.message}. Vennligst prøv igjen om et øyeblikk.`,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          {
            id: 'retry_prompt',
            type: 'retry_prompt',
            label: '🔄 Prøv på nytt nå',
            data: { prompt: textToSend }
          }
        ]
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Vil du nullstille samtalen og starte med et rent chat-vindu?')) {
      const resetMsg = getInitialMessages();
      setMessages(resetMsg);
      setInputVal('');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('mester_ai_chat_history');
      }
      toast.success('Chatten er nullstilt og klar for nye oppgaver');
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Tekst kopiert til utklippstavlen!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleActionClick = (action: any) => {
    if (!action) return;

    if (action.type === 'open_task_modal' || action.id === 'assign_task') {
      setActiveFormView({ type: 'task', data: action.data });
      return;
    }
    if (action.type === 'open_offer_modal' || action.id === 'open_offer') {
      setActiveFormView({ type: 'offer', data: action.data });
      return;
    }
    if (action.type === 'open_change_order_modal' || action.id === 'open_co') {
      setActiveFormView({ type: 'change_order', data: action.data });
      return;
    }
    if (action.type === 'open_sja_modal' || action.id === 'open_sja') {
      setActiveFormView({ type: 'sja', data: action.data });
      return;
    }
    if (action.type === 'open_deviation_modal' || action.id === 'open_deviation') {
      setActiveFormView({ type: 'deviation', data: action.data });
      return;
    }
    if (action.type === 'open_time_modal' || action.id === 'open_time') {
      setActiveFormView({ type: 'time', data: action.data });
      return;
    }
    if (action.type === 'open_invite_modal' || action.id === 'invite_user') {
      if (onOpenInviteModal) {
        onOpenInviteModal();
      } else {
        setActiveTab('team');
        setActiveFormView(null);
      }
      return;
    }
    if (action.type === 'open_ai_vision') {
      onOpenAIVision?.();
      return;
    }
    if (action.type === 'open_apprentice_modal' || action.id === 'open_apprentice_modal') {
      window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'apprentice' } }));
      return;
    }
    if (action.type === 'open_building_app_modal' || action.id === 'open_building_app' || action.id === 'building_app') {
      window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'building_app', data: action.data } }));
      return;
    }
    if (action.type === 'open_checklist_modal' || action.id === 'open_checklist' || action.id === 'start_checklist') {
      window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'start_checklist', id: action.data?.projectId } }));
      return;
    }
    if (action.type === 'open_omnichannel_modal' || action.id === 'open_omnichannel') {
      if (onOpenOmnichannelModal) {
        onOpenOmnichannelModal();
      } else {
        window.dispatchEvent(new CustomEvent('open_omnichannel_modal'));
      }
      return;
    }
    if (action.type === 'open_documentation_archive' || action.id === 'open_documentation_archive') {
      window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'archive', id: action.data?.projectId } }));
      return;
    }
    if (action.type === 'download_combined_fdv' || action.id === 'download_combined_fdv') {
      fetch('/api/documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_combined_fdv',
          projectId: action.data?.projectId || 'general',
          projectInfo: { name: action.data?.projectName || 'Prosjekt' }
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data?.html) {
            const printWin = window.open('', '_blank');
            if (printWin) {
              printWin.document.write(data.html);
              printWin.document.close();
              setTimeout(() => { printWin.focus(); printWin.print(); }, 400);
            }
          }
        })
        .catch(err => console.error(err));
      return;
    }
    if (action.type === 'navigate_settings' || action.id === 'open_settings_billing') {
      window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'settings', tab: 'billing' } }));
      return;
    }

    if (action.prompt || action.data?.prompt) {
      handleSendMessage(action.prompt || action.data?.prompt);
    } else if (action.label) {
      const cleanPrompt = action.label.replace(/^[\p{Emoji}\s•\-–—]+/u, '').trim();
      handleSendMessage(cleanPrompt || action.label);
    }
  };

  const handleFormSuccess = (msg: string, resultMeta?: any) => {
    const confirmationMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      role: 'assistant',
      content: msg,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      followUpPrompts: [
        'Hva mer må gjøres på dette prosjektet?',
        'Varsle kunden på e-post nå',
        'Før dagens timer på prosjektet'
      ]
    };
    setMessages(prev => [...prev, confirmationMsg]);
    setActiveFormView(null);
    toast.success('Handling fullført i chatten!');
  };

  const toggleMic = () => {
    if (isListeningMic) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListeningMic(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info('Tale-til-tekst støttes best i Chrome, Safari og Edge. Du kan også bruke tastaturet eller diktat-knappen.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'nb-NO';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      let capturedText = '';

      recognition.onstart = () => {
        setIsListeningMic(true);
        toast.info('Lytter... Still spørsmålet ditt med stemmen nå.');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            capturedText += trans;
          } else {
            currentInterim += trans;
          }
        }
        const textToSet = (capturedText || currentInterim).trim();
        if (textToSet) {
          setInputVal(textToSet);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event?.error);
        if (event?.error === 'not-allowed') {
          toast.error('Mikrofontilgang ble avvist. Vennligst tillat mikrofon i nettleseren.');
        } else if (event?.error === 'no-speech') {
          toast.info('Ingen tale registrert. Prøv igjen.');
        }
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
        recognitionRef.current = null;
        if (capturedText.trim()) {
          toast.success('Tale oppfattet!');
        }
      };

      recognition.start();
    } catch (e) {
      console.warn('SpeechRecognition start failed:', e);
      setIsListeningMic(false);
    }
  };

  // Markdown renderer
  const renderFormattedContent = (content: string) => {
    return (
      <div className="text-slate-900 leading-relaxed font-sans text-xs sm:text-sm">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h3 className="text-base font-black text-navy-950 mt-3 mb-1.5 pb-1 border-b border-slate-200">
                {children}
              </h3>
            ),
            h2: ({ children }) => (
              <h4 className="text-sm font-black text-electric-800 mt-3 mb-1 pb-0.5 border-b border-slate-100 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-electric-600 rounded-full inline-block shrink-0" />
                {children}
              </h4>
            ),
            h3: ({ children }) => (
              <h5 className="text-xs sm:text-sm font-black text-navy-950 mt-2.5 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-electric-600 rounded-full inline-block shrink-0" />
                {children}
              </h5>
            ),
            p: ({ children }) => (
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed my-1.5 first:mt-0 last:mb-0">
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-extrabold text-navy-950">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-slate-700">
                {children}
              </em>
            ),
            ul: ({ children }) => (
              <ul className="space-y-1 my-2 pl-0.5">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal space-y-1 my-2 pl-5 text-xs sm:text-sm text-slate-800 font-medium">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-xs sm:text-sm text-slate-800 flex items-start gap-2">
                <span className="text-electric-600 font-bold shrink-0 leading-5">•</span>
                <span className="flex-1">{children}</span>
              </li>
            ),
            hr: () => (
              <hr className="my-3 border-slate-200" />
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-electric-500 bg-electric-50/80 pl-3 py-2 my-2 rounded-r-xl text-xs text-navy-950 font-medium shadow-2xs">
                💡 {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="px-1.5 py-0.5 rounded bg-electric-100/80 text-electric-900 font-mono text-[11px] font-bold">
                  {children}
                </code>
              ) : (
                <pre className="p-3 my-2 bg-navy-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto">
                  <code>{children}</code>
                </pre>
              );
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  // Quick ask helper for projects or offers
  const handleAskAboutItem = (prompt: string) => {
    setActiveTab('chat');
    handleSendMessage(prompt);
  };

  if (!isOpen && !isEmbedded) return null;

  if (isMinimized && !isEmbedded) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
        <div 
          onClick={() => setIsMinimized(false)}
          className="bg-navy-900 hover:bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 cursor-pointer transition-all hover:scale-105 active:scale-95 group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-electric-600 to-purple-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-electric-500/30">
            <Brain size={18} />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold flex items-center gap-2">
              <span>MesterAI Arbeidsstasjon</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[11px] text-slate-300">
              Minimert • Klikk for å åpne stor styring
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
              setIsMinimized(false);
            }}
            className="ml-2 p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Lukk"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  // Filtered projects
  const filteredProjects = (projects || []).filter(p => Boolean(p) && (
    (p.name || '').toLowerCase().includes(projectFilter.toLowerCase()) || 
    (p.clientName && p.clientName.toLowerCase().includes(projectFilter.toLowerCase())) ||
    (p.location && p.location.toLowerCase().includes(projectFilter.toLowerCase()))
  ));

  return (
    <div 
      className={cn(
        isEmbedded 
          ? "w-full flex-1 flex flex-col bg-slate-900 min-h-screen h-screen overflow-hidden relative" 
          : "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      )}
      onClick={isEmbedded ? undefined : onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-white flex flex-col transition-all overflow-hidden",
          isEmbedded
            ? "w-full h-full flex-1 rounded-none border-0 shadow-none"
            : cn(
                "rounded-3xl border border-slate-200 shadow-2xl",
                isFullscreen 
                  ? "w-[99vw] h-[97vh] max-w-[1700px] max-h-[98vh]" 
                  : "w-[96vw] max-w-6xl h-[92vh] max-h-[890px]"
              )
        )}
      >
        {/* 📱 1. MOBILE NATIVE APP HEADER (Visible only on mobile screens) */}
        <div className="flex md:hidden items-center justify-between px-3.5 py-2.5 bg-navy-950 text-white border-b border-white/10 shrink-0 relative z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-electric-600 to-purple-500 flex items-center justify-center text-white shadow-sm font-black text-xs shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              title="Brukerprofil & meny"
            >
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "M"}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-white truncate">
                  MesterAI
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {selectedProject?.name || `${projects.length} byggeplasser`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Mobile Notifications */}
            <NotificationBell darkMode={true} />

            {onOpenSmartSearch && (
              <button
                type="button"
                onClick={onOpenSmartSearch}
                className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                title="Søk"
              >
                <Search size={16} />
              </button>
            )}
            {onOpenAllModules && (
              <button
                type="button"
                onClick={onOpenAllModules}
                className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                title="Alle Verktøy"
              >
                <Layers size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={cn(
                "p-2 rounded-xl transition-colors cursor-pointer",
                isProfileMenuOpen ? "bg-white/20 text-white" : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
              title="Profil & meny"
            >
              <UserIcon size={16} />
            </button>
            {!isEmbedded && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* 📱 Mobile Profile & System Menu Dropdown */}
        <AnimatePresence>
          {isProfileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-slate-900 border-b border-white/15 px-4 py-3 text-slate-200 z-40 shadow-2xl shrink-0"
            >
              {/* User Info */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-electric-600 to-purple-500 flex items-center justify-center text-white font-black text-sm">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon size={16} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white truncate">{user?.displayName || 'Bruker'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email || ''}</p>
                    <span className="inline-block text-[9px] font-black uppercase text-emerald-400">
                      {isAdminOrManager ? 'Admin / Leder' : 'Håndverker'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Language Switcher in Mobile Drawer */}
              <div className="py-2.5 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                  <Globe size={13} className="text-slate-400" /> Språk
                </span>
                <div className="flex items-center gap-1">
                  {(['no', 'en', 'pl', 'lt'] as const).map((lng) => (
                    <button
                      key={lng}
                      type="button"
                      onClick={() => changeLanguage(lng)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer",
                        getStandardLang(i18n.language) === lng
                          ? "bg-electric-500 text-white shadow-sm"
                          : "bg-white/10 text-slate-300 hover:bg-white/20"
                      )}
                    >
                      {lng}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu items */}
              <div className="py-2 space-y-1">
                <button
                  type="button"
                  onClick={() => handleNavigate('settings')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 text-left cursor-pointer"
                >
                  <Settings size={16} className="text-electric-400" />
                  <span>Innstillinger & Profil</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('mobile')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 text-left cursor-pointer"
                >
                  <Smartphone size={16} className="text-purple-400" />
                  <span>Mobilapp visning</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleInstallApp();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 text-left cursor-pointer"
                >
                  <Download size={16} className="text-emerald-400" />
                  <span>Last ned app på telefon</span>
                </button>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleNavigate('super-admin')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-500/20 text-left cursor-pointer"
                  >
                    <Shield size={16} className="text-rose-400" />
                    <span>SuperAdmin Kontrollpanel</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleNavigate('landing')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 text-left cursor-pointer"
                >
                  <Home size={16} className="text-slate-400" />
                  <span>Se Nettside</span>
                </button>
              </div>

              {/* Logout */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={async () => {
                    setIsProfileMenuOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/20 text-left cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Logg ut</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 💻 2. DESKTOP & TABLET HEADER & NAVIGATION BAR (Visible md and up) */}
        <div className="hidden md:flex px-4 sm:px-6 py-2.5 bg-gradient-to-r from-navy-950 via-slate-900 to-navy-950 text-white items-center justify-between gap-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-electric-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-electric-500/20 shrink-0">
              <Brain size={18} />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight text-white whitespace-nowrap">
                MesterAI
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                100% Autonom
              </span>
              {selectedProject && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-200 border border-white/10 truncate max-w-[130px]">
                  <Building2 size={11} className="text-electric-400 shrink-0" />
                  <span className="truncate">{selectedProject.name}</span>
                </span>
              )}
            </div>
          </div>

          {/* Central Workspace View Mode Selector with RBAC (Streamlined 4 Core Views) */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-2xl backdrop-blur-md overflow-x-auto shrink-0">
            {/* 1. Oversikt / Kontrollsenter */}
            <button
              type="button"
              onClick={() => { setActiveTab('control_center'); setActiveFormView(null); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                activeTab === 'control_center' && !activeFormView
                  ? "bg-white text-navy-950 shadow-sm font-black"
                  : "text-slate-200 hover:text-white hover:bg-white/10"
              )}
            >
              <Sparkles size={14} className={activeTab === 'control_center' && !activeFormView ? "text-purple-600" : "text-purple-300"} />
              <span>{isWorker ? `Mine Oppgaver (${tasksList.filter(t => t.status !== 'completed').length})` : 'Oversikt'}</span>
            </button>

            {/* 2. Prosjekter / Byggeplasser */}
            <button
              type="button"
              onClick={() => { setActiveTab('projects'); setActiveFormView(null); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                activeTab === 'projects'
                  ? "bg-white text-navy-950 shadow-sm font-black"
                  : "text-slate-200 hover:text-white hover:bg-white/10"
              )}
            >
              <HardHat size={14} className={activeTab === 'projects' ? "text-blue-600" : "text-slate-300"} />
              <span>Prosjekt ({projects.length})</span>
            </button>

            {/* 3. Tilbud & Endringsordrer (NS 8406) */}
            {isAdminOrManager && (
              <button
                type="button"
                onClick={() => { setActiveTab('admin'); setActiveFormView(null); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                  activeTab === 'admin'
                    ? "bg-white text-navy-950 shadow-sm font-black"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                )}
              >
                <FileSignature size={14} className={activeTab === 'admin' ? "text-amber-600" : "text-slate-300"} />
                <span>Tilbud & Endring ({offers.length + changeOrders.length})</span>
              </button>
            )}

            {/* 4. Team & Invitasjoner */}
            {isAdminOrManager && (
              <button
                type="button"
                onClick={() => { setActiveTab('team'); setActiveFormView(null); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                  activeTab === 'team'
                    ? "bg-white text-navy-950 shadow-sm font-black"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                )}
              >
                <Users size={14} className={activeTab === 'team' ? "text-emerald-600" : "text-slate-300"} />
                <span>Team</span>
              </button>
            )}
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenOmnichannelModal && (
              <button
                type="button"
                onClick={onOpenOmnichannelModal}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                title="Omnichannel Lytter (Discord, Slack, Teams, E-post)"
              >
                <Radio size={15} className="text-emerald-400" />
              </button>
            )}

            {onOpenSmartSearch && (
              <button
                type="button"
                onClick={onOpenSmartSearch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <Search size={14} />
                <span>Søk</span>
                <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[10px] text-slate-300">⌘K</kbd>
              </button>
            )}

            {onOpenAllModules && (
              <button
                type="button"
                onClick={onOpenAllModules}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Se alle 20 moduler"
              >
                <Layers size={14} />
                <span>Moduler</span>
              </button>
            )}

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("navigate_view", { detail: { view: "super-admin" } }))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-sm cursor-pointer"
                title="SuperAdmin"
              >
                <Shield size={13} />
                <span>SuperAdmin</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSplitView(!isSplitView)}
              className={cn(
                "p-2 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer",
                isSplitView ? "bg-white/20 text-white" : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
              title={isSplitView ? "Enkeltvisning (full bredde)" : "Delt visning (Samtale + Oversikt)"}
            >
              <Columns size={15} />
              <span className="text-[11px]">{isSplitView ? 'Delt' : 'Full'}</span>
            </button>

            <button
              type="button"
              onClick={handleClearHistory}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Nullstill samtale og få et rent chat-vindu"
            >
              <RotateCcw size={15} />
              <span className="hidden xl:inline text-[11px]">Nullstill</span>
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-white/15 mx-1" />

            {/* Language Selector */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/15 rounded-xl border border-white/15 transition-all">
              <Globe size={13} className="text-slate-300 shrink-0" />
              <select 
                onChange={(e) => changeLanguage(e.target.value)}
                value={getStandardLang(i18n.language)}
                className="text-xs font-black bg-transparent border-none focus:ring-0 cursor-pointer uppercase text-white pr-0.5 outline-none [&>option]:bg-slate-900 [&>option]:text-white"
                title={t('language', 'Bytt språk')}
              >
                <option value="no">NO</option>
                <option value="en">EN</option>
                <option value="pl">PL</option>
                <option value="lt">LT</option>
              </select>
            </div>

            {/* Notifications */}
            <NotificationBell darkMode={true} />

            {/* User Profile & Operational Dropdown Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-all cursor-pointer select-none"
                title="Brukerprofil og systemmeny"
              >
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'Bruker'} 
                    className="w-6 h-6 rounded-lg object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-electric-600 to-purple-500 flex items-center justify-center text-white text-[11px] font-black shrink-0">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon size={12} />}
                  </div>
                )}
                <div className="text-left leading-tight hidden xl:block">
                  <p className="text-xs font-bold text-white truncate max-w-[120px]">
                    {user?.displayName || 'Bruker'}
                  </p>
                  <p className="text-[9px] font-black uppercase text-slate-300">
                    {isAdminOrManager ? 'Admin / Leder' : isWorker ? 'Håndverker' : 'Bruker'}
                  </p>
                </div>
                <ChevronDown size={14} className={cn("text-slate-300 transition-transform duration-200", isProfileMenuOpen && "rotate-180")} />
              </button>

              {/* Desktop Profile Dropdown Menu */}
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl p-2 z-50 text-slate-200 backdrop-blur-xl"
                  >
                    {/* User Info Header */}
                    <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                      <p className="text-xs font-bold text-white truncate">
                        {user?.displayName || 'Bruker'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {user?.email || ''}
                      </p>
                      {user?.company && (
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-slate-300">
                          <Building2 size={10} className="text-electric-400" />
                          <span className="truncate">{user.company}</span>
                        </div>
                      )}
                    </div>

                    {/* Menu Actions */}
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleNavigate('settings')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <Settings size={15} className="text-electric-400" />
                        <span>Innstillinger & Profil</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNavigate('mobile')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <Smartphone size={15} className="text-purple-400" />
                        <span>Mobilapp visning</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleInstallApp();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <Download size={15} className="text-emerald-400" />
                        <span>Last ned app på telefon</span>
                      </button>

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleNavigate('super-admin')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 transition-colors text-left cursor-pointer"
                        >
                          <Shield size={15} className="text-rose-400" />
                          <span>SuperAdmin Kontrollpanel</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleNavigate('landing')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <Home size={15} className="text-slate-400" />
                        <span>Se Nettside</span>
                      </button>
                    </div>

                    {/* Divider & Logout */}
                    <div className="border-t border-white/10 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsProfileMenuOpen(false);
                          await logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-colors text-left cursor-pointer"
                      >
                        <LogOut size={15} />
                        <span>Logg ut</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!isEmbedded && (
              <>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  title={isFullscreen ? "Standard størrelse" : "Fullskjerm"}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                    title="Lukk"
                  >
                    <X size={18} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* WORKSPACE BODY */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-100/50">
          {/* Left Column: Conversational AI Partner (Always visible in split view or when activeTab === 'chat') */}
          {(activeTab === 'chat' || (isSplitView && !activeFormView)) && (
            <div className={cn(
              "flex flex-col bg-white border-r border-slate-200 overflow-hidden transition-all",
              activeFormView 
                ? "hidden md:flex md:w-[44%] lg:w-[40%] xl:w-[38%]" 
                : (isSplitView && activeTab !== 'chat' ? "hidden md:flex md:w-[44%] lg:w-[40%] xl:w-[38%]" : "w-full flex-1")
            )}>
              {/* Chat Subheader with Active Project & Nullstill Chat Action */}
              <div className="px-3.5 sm:px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-bold text-navy-950 truncate">MesterAI Samtale</span>
                  {selectedProject ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold truncate max-w-[130px] sm:max-w-[180px]">
                      <Building2 size={11} className="shrink-0 text-emerald-600" />
                      <span className="truncate">{selectedProject.name}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 hidden sm:inline">• Aktiv rådgiver</span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-navy-950 hover:bg-slate-200/80 bg-white border border-slate-200/90 shadow-2xs transition-all cursor-pointer active:scale-95"
                    title="Nullstill chatten for å få et helt rent vindu"
                  >
                    <RotateCcw size={12} className="text-slate-500" />
                    <span>Nullstill chat</span>
                  </button>
                </div>
              </div>

              {/* Messages Container */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/40 custom-scrollbar"
              >
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex flex-col gap-1.5 max-w-[94%] sm:max-w-[88%]",
                      msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-4 rounded-2xl shadow-xs transition-all",
                      msg.role === 'user' 
                        ? "bg-gradient-to-r from-electric-600 to-electric-500 text-white rounded-br-xs shadow-md shadow-electric-600/20" 
                        : "bg-white text-navy-900 border border-slate-200/90 rounded-bl-xs"
                    )}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs font-black text-electric-700">
                            <Brain size={14} />
                            <span>MesterAI Rådgiver</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg.id, msg.content)}
                              className="text-slate-400 hover:text-navy-900 transition-colors p-1 cursor-pointer"
                              title="Kopier svar"
                            >
                              {copiedId === msg.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>
                      )}

                      {msg.role === 'user' ? (
                        <div className="text-white text-xs sm:text-sm font-semibold leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      ) : (
                        renderFormattedContent(msg.content)
                      )}

                      {/* Suggested In-Chat Form Actions */}
                      {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                          {msg.suggestedActions.map((act) => (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() => handleActionClick(act)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-electric-50 to-purple-50 hover:from-electric-100 hover:to-purple-100 text-electric-800 text-xs font-bold border border-electric-200 transition-all shadow-2xs hover:scale-[1.02] active:scale-98 cursor-pointer"
                            >
                              <Sparkles size={12} className="text-electric-600" />
                              <span>{act.label}</span>
                              <ChevronRight size={12} className="text-electric-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Follow-up Prompts */}
                    {msg.followUpPrompts && msg.followUpPrompts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1 pl-1">
                        {msg.followUpPrompts.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleSendMessage(p)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-white hover:bg-electric-50 hover:text-electric-700 hover:border-electric-300 text-slate-600 border border-slate-200 transition-all shadow-2xs cursor-pointer text-left"
                          >
                            💬 {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="mr-auto items-start max-w-[85%]">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-electric-500 text-white flex items-center justify-center">
                        <RefreshCw size={13} className="animate-spin" />
                      </div>
                      <span className="text-xs text-slate-600 font-medium animate-pulse">
                        MesterAI analyserer kalkylen, TEK17 og prosjektdata...
                      </span>
                    </div>
                  </div>
                )}

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Field & Toolbox Launcher */}
              <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 mb-16 md:mb-0">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(inputVal);
                  }}
                  className="flex items-center gap-2"
                >
                  <input 
                    type="file" 
                    ref={chatFileInputRef} 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleChatPhotoUpload} 
                  />

                  <button
                    type="button"
                    onClick={() => setActiveFormView({ type: 'toolbox' })}
                    className="p-2.5 bg-slate-100 hover:bg-electric-50 hover:text-electric-700 text-slate-600 rounded-xl transition-all cursor-pointer shrink-0"
                    title="Åpne skjemaer & verktøy"
                  >
                    <Layers size={17} />
                  </button>

                  <button
                    type="button"
                    disabled={isAnalyzingImage}
                    onClick={() => chatFileInputRef.current?.click()}
                    className={cn(
                      "p-2.5 rounded-xl transition-all cursor-pointer shrink-0 border",
                      isAnalyzingImage 
                        ? "bg-electric-100 border-electric-300 text-electric-700 animate-pulse" 
                        : "bg-slate-100 hover:bg-electric-50 hover:text-electric-700 text-slate-600 border-slate-200/80"
                    )}
                    title="Ta bilde eller last opp for direkte TEK17/BVN analyse"
                  >
                    <Camera size={17} />
                  </button>

                  <div className="relative flex-1">
                    <input 
                      type="text"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      placeholder="Skriv instruks (tilbud, endringsordre, SJA, TEK17)..."
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={cn(
                        "absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all",
                        isListeningMic ? "bg-rose-500 text-white animate-pulse" : "text-slate-400 hover:text-electric-600"
                      )}
                      title="Snakk inn spørsmål"
                    >
                      {isListeningMic ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !inputVal.trim()}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-black disabled:opacity-40 transition-all shrink-0 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-98"
                  >
                    <Send size={14} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Right Column / Full Body: Active Form OR Overview Views */}
          <div className={cn(
            "flex-1 overflow-y-auto flex flex-col bg-slate-50/70 transition-all custom-scrollbar",
            activeFormView ? "p-0 sm:p-6 pb-0 sm:pb-6" : "p-4 sm:p-6 pb-28 md:pb-6",
            activeTab === 'chat' && !activeFormView ? "hidden md:flex md:w-[56%] lg:w-[60%] xl:w-[62%]" : "w-full",
            isSplitView && activeTab !== 'chat' ? "md:w-[56%] lg:w-[60%] xl:w-[62%]" : ""
          )}>
            {/* 1. IN-CHAT WORKSPACE FORM VIEW */}
            {activeFormView ? (
              <div className="bg-white rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
                <InChatWorkspace
                  formType={activeFormView.type}
                  initialData={activeFormView.data}
                  projects={projects}
                  selectedProject={selectedProject}
                  onClose={() => setActiveFormView(null)}
                  onSuccess={handleFormSuccess}
                  onSwitchForm={(nextType, nextData) => setActiveFormView({ type: nextType, data: nextData })}
                  onOpenOmnichannelModal={onOpenOmnichannelModal}
                />
              </div>
            ) : activeTab === 'control_center' ? (
              /* DYNAMIC CONTROL CENTER (LEDER & FELTHÅNDVERKER) */
              <div className="space-y-4">
                {/* 1. HERO CONTROL BAR WITH VOICE-FIRST PUSH-TO-TALK & TTS */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 text-white rounded-3xl shadow-md border border-white/10 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-electric-500/20 text-electric-300 border border-electric-500/30">
                          {isWorker ? '🔨 Håndverker Feltassistent' : '👑 Leder Kontrollsenter'}
                        </span>
                        <span className="text-[11px] text-slate-300">
                          {isWorker ? 'Tilpasset mobil & handsfree på byggeplass' : 'Full operativ styring & sanntidsstatus'}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        {isWorker 
                          ? `Hei, ${user?.displayName || 'håndverker'}! Klar for dagens økt?` 
                          : 'Operativ Lederbrifing & Byggeplass-styring'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                        {isWorker 
                          ? 'Marker oppgaver som fullført, før timer, meld avvik med bilde eller få TEK17-fagråd direkte.' 
                          : 'Tildel oppgaver til håndverkere, hør morgenbrifing, juster fremdrift og ha full kontroll via telefonen.'}
                      </p>
                    </div>

                    {/* Dual Voice Action Buttons: Push-to-talk & Text-to-speech */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <button
                        type="button"
                        onClick={handleVoiceCommand}
                        className={cn(
                          "px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer",
                          isListeningMic
                            ? "bg-rose-500 text-white animate-pulse"
                            : "bg-electric-600 hover:bg-electric-500 text-white hover:scale-105 active:scale-95"
                        )}
                        title="Trykk for å snakke med MesterAI"
                      >
                        {isListeningMic ? <MicOff size={16} /> : <Mic size={16} />}
                        <span>{isListeningMic ? 'Lytter...' : 'Snakk med agenten'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleMorningBriefingSpeak}
                        className={cn(
                          "px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer",
                          isSpeaking 
                            ? "bg-amber-500 text-white border-amber-400 animate-pulse" 
                            : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                        )}
                        title="Hør opplest status"
                      >
                        {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        <span>{isSpeaking ? 'Stopp tale' : isWorker ? 'Hør oppgaver' : 'Les opp status'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Status Chips */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hurtigvalg:</span>
                    {isWorker ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveFormView({ type: 'time' })}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer"
                        >
                          ⏱️ Før dagens timer
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveFormView({ type: 'sja' })}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer"
                        >
                          🛡️ Ny SJA-analyse
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveFormView({ type: 'deviation' })}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer"
                        >
                          📸 Meld RUH / avvik med bilde
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAskAboutItem('Hva er kravene til fall mot sluk i TEK17 § 13-15?')}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer"
                        >
                          📐 Spør om TEK17
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveFormView({ type: 'task' })}
                          className="px-2.5 py-1 rounded-xl bg-electric-500/30 hover:bg-electric-500/40 text-electric-200 border border-electric-500/40 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          ➕ Tildel ny oppgave
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveFormView({ type: 'change_order' })}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer"
                        >
                          📄 Ny endringsordre (NS 8406)
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveFormView({ type: 'offer' })}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer"
                        >
                          📝 Nytt tilbud & kalkyle
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenInviteModal ? onOpenInviteModal() : setActiveTab('team')}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer"
                        >
                          👥 Inviter håndverker
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 🌟 MESTERENS AUTONOME KONTROLLPOST (100% Autonom drift med 100% Kontroll) */}
                {isAdminOrManager && (
                  <AutonomousControlPost 
                    onOpenProject={(id) => {
                      const p = projects.find(pr => pr.id === id);
                      if (p) onSelectProject?.(p);
                    }}
                    onOpenChangeOrder={(data) => {
                      onOpenChangeOrderModal?.(data);
                    }}
                  />
                )}

                {/* 2. OPERATIONAL KPI SUMMARY STRIP */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                      <span>{isWorker ? 'Mine Oppgaver' : 'Aktive Prosjekter'}</span>
                      <Building2 size={13} className="text-electric-600" />
                    </div>
                    <div className="text-xl font-black text-navy-950">
                      {isWorker ? tasksList.filter(t => t.status !== 'completed').length : projects.length}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                      {isWorker ? 'Venter på utførelse' : `${projects.filter(p => p.status === 'active').length} i aktiv drift`}
                    </div>
                  </div>

                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                      <span>{isWorker ? 'Fullført i dag' : 'Åpne Oppgaver'}</span>
                      <ListTodo size={13} className="text-indigo-600" />
                    </div>
                    <div className="text-xl font-black text-navy-950">
                      {isWorker ? tasksList.filter(t => t.status === 'completed').length : tasksList.filter(t => t.status !== 'completed').length}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                      {isWorker ? 'Godt levert!' : 'Tildelt fagpersoner'}
                    </div>
                  </div>

                  {/* Financial & Change Order metrics ONLY for Admin/Manager */}
                  {isAdminOrManager ? (
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                        <span>Sikret Tillegg</span>
                        <FileSignature size={13} className="text-emerald-600" />
                      </div>
                      <div className="text-xl font-black text-emerald-600">
                        kr {changeOrders.reduce((a, b) => a + (Number(b.amount) || 0), 0).toLocaleString('no-NO')}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                        {changeOrders.length} endringsordrer (NS 8406)
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                        <span>Sikkerhet & SJA</span>
                        <ShieldCheck size={13} className="text-emerald-600" />
                      </div>
                      <div className="text-xl font-black text-emerald-600">
                        Aktiv
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                        Forskrifter oppfylt
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                      <span>Lukkesperrer</span>
                      <Lock size={13} className={lukkesperreZones.some(z => z.status === 'RED') ? "text-rose-600" : "text-emerald-600"} />
                    </div>
                    <div className={cn(
                      "text-xl font-black",
                      lukkesperreZones.some(z => z.status === 'RED') ? "text-rose-600" : "text-navy-950"
                    )}>
                      {lukkesperreZones.filter(z => z.status === 'RED').length}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                      {lukkesperreZones.some(z => z.status === 'RED') ? 'Krever kontroll før kledning' : 'Ingen sperrer'}
                    </div>
                  </div>
                </div>

                {/* 3. TASK BOARD (OPPGAVEOVERSIKT MED 1-KLIKK FULLFØRING) */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-extrabold text-navy-950 flex items-center gap-2">
                        <CheckSquare size={16} className="text-electric-600" />
                        <span>{isWorker ? 'Mine Tildelte Oppgaver' : 'Dagens Oppgaver & Delegering i Felt'}</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        {isWorker 
                          ? 'Trykk på avhukingsboksen når du har gjort oppgaven, eller før timer.' 
                          : 'Håndverkere ser sine oppgaver her og på mobilen sin. Synkronisert med Discord og Slack.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdminOrManager && (
                        <button
                          type="button"
                          onClick={() => setActiveFormView({ type: 'task' })}
                          className="px-3 py-1.5 bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Tildel Oppgave</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Task List */}
                  {tasksList.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                      <ListTodo size={28} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-navy-950">Ingen oppgaver registrert ennå</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isWorker ? 'Du har ingen utestående oppgaver akkurat nå.' : 'Tildel første oppgave til en håndverker nå.'}
                      </p>
                      {isAdminOrManager && (
                        <button
                          type="button"
                          onClick={() => setActiveFormView({ type: 'task' })}
                          className="mt-3 px-3 py-1.5 bg-electric-50 text-electric-700 rounded-xl text-xs font-bold hover:bg-electric-100 transition-all cursor-pointer"
                        >
                          + Tildel Oppgave
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {tasksList.map((task) => (
                        <div 
                          key={task.id}
                          className={cn(
                            "py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
                            task.status === 'completed' ? "opacity-60 bg-slate-50/50 rounded-xl px-2" : "hover:bg-slate-50/70 rounded-xl px-2"
                          )}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleTask(task)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors p-0.5 cursor-pointer shrink-0"
                              title={task.status === 'completed' ? 'Marker som uferdig' : 'Marker som fullført'}
                            >
                              {task.status === 'completed' ? (
                                <CheckSquare size={18} className="text-emerald-600" />
                              ) : (
                                <Square size={18} />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={cn(
                                  "text-xs font-extrabold text-navy-950",
                                  task.status === 'completed' && "line-through text-slate-400"
                                )}>
                                  {task.title}
                                </span>
                                {task.priority === 'urgent' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                    Haster
                                  </span>
                                ) : task.priority === 'high' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                    Høy
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                                {task.projectName && (
                                  <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {task.projectName}
                                  </span>
                                )}
                                {task.assignedTo && (
                                  <span className="font-bold text-navy-950 bg-electric-50 text-electric-700 px-2 py-0.5 rounded-md border border-electric-200/60">
                                    👤 {task.assignedTo}
                                  </span>
                                )}
                                {task.deadline && (
                                  <span className="text-slate-400">
                                    📅 Frist: {task.deadline}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {isWorker && (
                              <button
                                type="button"
                                onClick={() => setActiveFormView({ 
                                  type: 'time', 
                                  data: { projectName: task.projectName, description: task.title } 
                                })}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Timer size={12} />
                                <span>Før time</span>
                              </button>
                            )}
                            {isAdminOrManager && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleAskAboutItem(`Hva er status og fremdrift for oppgaven "${task.title}" på ${task.projectName || 'prosjektet'}?`);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Brain size={12} />
                                <span>Spør MesterAI</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. RASKE FREMDRIFTSKONTROLLER & BYGGEPLASS-STYRING (FOR LEDERE) */}
                {isAdminOrManager && (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-extrabold text-navy-950 flex items-center gap-2">
                          <TrendingUp size={16} className="text-emerald-600" />
                          <span>Fremdrift & Prosjektstyring (100% Autonom)</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Fremdriften beregnes og oppdateres automatisk etter hvert som oppgaver utføres på byggeplassen.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(projects || []).filter(Boolean).map((proj) => {
                        const projName = proj.name || (proj.id?.toLowerCase().includes('kongeveien') ? 'Totalrenovering Kongeveien 93A' : 'Byggeplass');
                        const projLocation = proj.location || 'Norge';
                        const projClient = proj.clientName || 'Privatkunde';
                        const projTasks = tasksList.filter(t => t.projectId === proj.id);
                        const completedTasksCount = projTasks.filter(t => t.status === 'completed').length;
                        const totalTasksCount = projTasks.length;
                        const autoCalcProgress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : null;
                        const projProgress = autoCalcProgress !== null ? autoCalcProgress : (typeof proj.progress === 'number' ? proj.progress : 15);

                        return (
                          <div 
                            key={proj.id}
                            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-electric-400 shadow-xs transition-all space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="text-xs font-black text-slate-900">{projName}</h5>
                                <p className="text-[11px] text-slate-500">{projLocation} • {projClient}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-300 shadow-2xs inline-block">
                                  {projProgress}%
                                </span>
                              </div>
                            </div>

                            {/* Task progress breakdown */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span className="flex items-center gap-1 font-bold text-slate-700 text-[10px]">
                                  <Sparkles size={12} className="text-indigo-600" />
                                  {totalTasksCount > 0 
                                    ? `${completedTasksCount} av ${totalTasksCount} oppgaver fullført` 
                                    : 'Fremdrift styrt av fullførte oppgaver'}
                                </span>
                                <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                  Autonom
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                                <div 
                                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                  style={{ width: `${projProgress}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5" title="Manuell overstyring for leder ved behov">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mr-0.5">Overstyr:</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateProjectProgress(proj.id, projProgress, -5)}
                                  className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs rounded-md text-[11px] font-black text-slate-800 cursor-pointer transition-all active:scale-95"
                                  title="Manuell overstyring: Trekk fra 5%"
                                >
                                  -5%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateProjectProgress(proj.id, projProgress, +5)}
                                  className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs rounded-md text-[11px] font-black text-slate-800 cursor-pointer transition-all active:scale-95"
                                  title="Manuell overstyring: Legg til 5%"
                                >
                                  +5%
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setActiveFormView({ 
                                    type: 'task', 
                                    data: { projectId: proj.id, projectName: projName } 
                                  })}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                  title="Opprett ny oppgave for dette prosjektet"
                                >
                                  <Plus size={13} className="stroke-[3]" />
                                  <span>Oppgave</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveFormView({ 
                                    type: 'change_order', 
                                    data: { projectId: proj.id, projectName: projName } 
                                  })}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                  title="Opprett ny endringsordre (NS 8406)"
                                >
                                  <Plus size={13} className="stroke-[3]" />
                                  <span>Endring</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'projects' ? (
              /* 2. BYGGEPLASS & PROSJEKTER OVERSIKT */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div>
                    <h4 className="text-sm font-extrabold text-navy-950 flex items-center gap-2">
                      <HardHat size={16} className="text-blue-600" />
                      <span>Aktive Byggeplasser ({projects.length})</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Sanntids vær, fremdrift og lukkesperrer for alle byggeplasser.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                    {onOpenCreateProject && (
                      <button
                        type="button"
                        onClick={onOpenCreateProject}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 bg-gradient-to-r from-blue-600 to-electric-600 hover:from-blue-500 hover:to-electric-500 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer w-full sm:w-auto shrink-0 active:scale-98 transition-all"
                      >
                        <Plus size={13} />
                        <span>+ Nytt Prosjekt</span>
                      </button>
                    )}
                    <div className="relative w-full sm:w-56">
                      <input 
                        type="text"
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        placeholder="Filtrer prosjekter..."
                        className="w-full pl-7 pr-3 py-2 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white outline-none focus:ring-1 focus:ring-electric-500"
                      />
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Lukkesperre Highlights */}
                {lukkesperreZones.some(z => z.status === 'RED') && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Lock size={18} className="text-rose-600 mt-0.5 shrink-0" />
                      <div>
                        <h5 className="text-xs font-black text-rose-950">Aktiv Rød Lukkesperre</h5>
                        <p className="text-[11px] text-rose-800 mt-0.5">
                          {lukkesperreZones.find(z => z.status === 'RED')?.room}: Mangler nødvendig trykktest eller dampsperregodkjenning.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const red = lukkesperreZones.find(z => z.status === 'RED');
                        if (red && onOpenPreClose) onOpenPreClose(red);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer"
                    >
                      Inspiser
                    </button>
                  </div>
                )}

                {/* Projects List */}
                <div className="grid grid-cols-1 gap-3">
                  {filteredProjects.map((p) => (
                    <div 
                      key={p.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-xs sm:text-sm font-black text-navy-950">{p.name}</h5>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {p.projectCode || 'P-2026'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Kunde: <strong className="text-slate-700">{p.clientName || 'Privat oppdragsgiver'}</strong> • {p.location || 'Oslo'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/60 shrink-0">
                          <CloudSun size={14} />
                          <span>+14°C Opphold</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                          <span>Fremdrift</span>
                          <span className="text-navy-950 font-black">{p.progress || 65}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-electric-500 rounded-full"
                            style={{ width: `${p.progress || 65}%` }}
                          />
                        </div>
                      </div>

                      {/* Project Action Strip */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleAskAboutItem(`Gi meg en full statusoppdatering og fremdriftsanalyse for prosjektet "${p.name}".`)}
                          className="px-3 py-1.5 bg-electric-50 hover:bg-electric-100 text-electric-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Brain size={13} className="text-electric-600" />
                          <span>Spør AI om prosjektet</span>
                        </button>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {onSelectProject && (
                            <button
                              type="button"
                              onClick={() => onSelectProject(p)}
                              className="px-3 py-1.5 bg-navy-950 hover:bg-navy-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <ExternalLink size={13} />
                              <span>Åpne Prosjekt</span>
                            </button>
                          )}
                          {onOpenPortal && (
                            <button
                              type="button"
                              onClick={() => onOpenPortal(p)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Åpne Kundeportal for dette prosjektet"
                            >
                              <Globe size={13} />
                              <span className="hidden sm:inline">Kundeportal</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenAIVision?.()}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Start TEK17 bildeanalyse"
                          >
                            <Camera size={13} />
                            <span className="hidden sm:inline">TEK17 Foto</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveFormView({ type: 'sja', data: { projectId: p.id, projectName: p.name } })}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <ShieldCheck size={13} />
                            <span>SJA</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === 'admin' ? (
              /* 3. ADMINISTRASJON & ØKONOMI (TILBUD & ENDRINGSORDRER) */
              <div className="space-y-4">
                {/* View Switcher: Offers vs Change Orders */}
                <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdminTab('offers')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        adminTab === 'offers' 
                          ? "bg-navy-900 text-white shadow-xs" 
                          : "text-slate-600 hover:text-navy-950 hover:bg-slate-100"
                      )}
                    >
                      Pristilbud ({offers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab('changes')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        adminTab === 'changes' 
                          ? "bg-navy-900 text-white shadow-xs" 
                          : "text-slate-600 hover:text-navy-950 hover:bg-slate-100"
                      )}
                    >
                      Endringsordrer NS 8406 ({changeOrders.length})
                    </button>
                  </div>

                  {adminTab === 'offers' ? (
                    <button
                      type="button"
                      onClick={() => setActiveFormView({ type: 'offer' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-electric-600 to-electric-500 text-white rounded-xl text-xs font-black shadow-xs hover:scale-[1.02] cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Nytt Tilbud (AI)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveFormView({ type: 'change_order' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-pink-500 text-white rounded-xl text-xs font-black shadow-xs hover:scale-[1.02] cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Ny Endring (8406)</span>
                    </button>
                  )}
                </div>

                {/* Offers List */}
                {adminTab === 'offers' && (
                  <div className="space-y-3">
                    {offers.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                        <FileText size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">Ingen pristilbud opprettet ennå</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Bruk MesterAI til å kalkulere og generere tilbud på 1 minutt.</p>
                        <button
                          type="button"
                          onClick={() => setActiveFormView({ type: 'offer' })}
                          className="px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-bold"
                        >
                          + Opprett første tilbud
                        </button>
                      </div>
                    ) : (
                      offers.map((offer) => {
                        const sumEx = offer.totalAmount || offer.customPrice || 0;
                        const sumInc = offer.totalIncVat || Math.round(sumEx * 1.25);
                        const offerUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?offerToken=${offer.token || ''}`;

                        return (
                          <div 
                            key={offer.id}
                            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h5 className="text-xs sm:text-sm font-black text-navy-950">
                                  {offer.title || offer.recipientName || 'Tilbud uten tittel'}
                                </h5>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Kunde: <strong className="text-slate-700">{offer.clientName || offer.recipientName || 'Kunde'}</strong>
                                  {offer.projectName && <span> • Prosjekt: {offer.projectName}</span>}
                                </p>
                              </div>
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase shrink-0",
                                offer.status === 'accepted' ? "bg-emerald-100 text-emerald-800" :
                                offer.status === 'pending' ? "bg-blue-100 text-blue-800" :
                                "bg-slate-100 text-slate-700"
                              )}>
                                {offer.status === 'accepted' ? 'Godkjent' : offer.status === 'pending' ? 'Sendt til kunde' : 'Utkast'}
                              </span>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Sum eks. mva:</span>
                                <strong className="font-extrabold text-navy-950">kr {Number(sumEx).toLocaleString('no-NO')}</strong>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 block text-[10px]">Sum inkl. 25% mva:</span>
                                <strong className="font-extrabold text-emerald-700">kr {Number(sumInc).toLocaleString('no-NO')}</strong>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleAskAboutItem(`Kan du gå gjennom tilbudet til ${offer.clientName || offer.recipientName} på kr ${Number(sumEx).toLocaleString('no-NO')} og foreslå forbedringer eller standard NS-forbehold?`)}
                                className="text-xs font-bold text-electric-700 hover:text-electric-900 flex items-center gap-1 cursor-pointer"
                              >
                                <Brain size={13} />
                                <span>Spør AI om tilbudet</span>
                              </button>

                              <div className="flex items-center gap-2">
                                {offer.token && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(offerUrl);
                                      toast.success('Kundelenke kopiert til utklippstavlen!');
                                    }}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    title="Kopier kundelenke"
                                  >
                                    <Copy size={13} />
                                    <span>Kopier lenke</span>
                                  </button>
                                )}
                                {onDeleteOffer && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteOffer(offer.id, offer.title || 'Tilbud')}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                    title="Slett tilbud"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Change Orders List */}
                {adminTab === 'changes' && (
                  <div className="space-y-3">
                    {changeOrders.map((co) => (
                      <div
                        key={co.id}
                        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                                Endring #{co.number || 1}
                              </span>
                              <span className="text-xs font-bold text-slate-500">
                                {co.project}
                              </span>
                            </div>
                            <h5 className="text-xs sm:text-sm font-black text-navy-950 mt-1">
                              {co.title}
                            </h5>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-black text-navy-950">
                              kr {Number(co.amount).toLocaleString('no-NO')}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold">
                              eks mva (+{co.days || 0} dgr)
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                          <span className="text-[11px] font-bold text-slate-500">
                            Hjemmel: <strong className="text-slate-800">{co.legal || 'NS 8406 pkt. 19.2'}</strong>
                          </span>

                          <div className="flex items-center gap-2">
                            {co.status !== 'Godkjent av kunde' && onApproveChangeOrder && (
                              <button
                                type="button"
                                onClick={() => onApproveChangeOrder(co.id)}
                                className="px-3 py-1.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
                              >
                                Godkjenn
                              </button>
                            )}
                            {co.shareUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(co.shareUrl);
                                  toast.success('Godkjenningslenke kopiert!');
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                Kopier lenke
                              </button>
                            )}
                            {onDeleteChangeOrder && (
                              <button
                                type="button"
                                onClick={() => onDeleteChangeOrder(co.id, co.title)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'channels' ? (
              /* 4. OMNICHANNEL INTEGRASJONSHUB */
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-navy-950 to-slate-900 text-white rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black flex items-center gap-2">
                      <Radio size={16} className="text-emerald-400" />
                      <span>Omnichannel Agent Lytter</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Håndverkere i felt snakker med MesterAI gjennom sine eksisterende apper.
                    </p>
                  </div>
                  {onOpenOmnichannelModal && (
                    <button
                      type="button"
                      onClick={onOpenOmnichannelModal}
                      className="px-3.5 py-2 bg-electric-500 hover:bg-electric-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Konfigurer
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Discord */}
                  {(() => {
                    const isConnected = Boolean(omniSettings.discordEnabled && omniSettings.discordWebhook?.trim());
                    return (
                      <div 
                        onClick={onOpenOmnichannelModal}
                        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:border-indigo-300 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare size={16} className="text-indigo-600" />
                            <h5 className="text-xs font-black text-navy-950">Discord Bot</h5>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                            isConnected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500 border border-slate-200"
                          )}>
                            {isConnected ? 'Aktiv' : 'Ikke tilkoblet'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {isConnected 
                            ? `Lytter i kanalen ${omniSettings.discordChannel || '#byggeplass-oppdateringer'}. Byggedagbok og SJA via tale/tekst.`
                            : 'Klikk for å konfigurere webhook og koble Discord til MesterAI.'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Slack */}
                  {(() => {
                    const isConnected = Boolean(omniSettings.slackEnabled && omniSettings.slackWebhook?.trim());
                    return (
                      <div 
                        onClick={onOpenOmnichannelModal}
                        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:border-emerald-300 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Hash size={16} className="text-emerald-600" />
                            <h5 className="text-xs font-black text-navy-950">Slack App</h5>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                            isConnected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500 border border-slate-200"
                          )}>
                            {isConnected ? 'Aktiv' : 'Ikke tilkoblet'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {isConnected 
                            ? `Sender varsler om endringsordrer (NS 8406) til ${omniSettings.slackChannel || '#prosjekt-varsler'}.`
                            : 'Klikk for å konfigurere incoming webhook for Slack.'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Teams */}
                  {(() => {
                    const isConnected = Boolean(omniSettings.teamsEnabled && omniSettings.teamsWebhook?.trim());
                    return (
                      <div 
                        onClick={onOpenOmnichannelModal}
                        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:border-blue-300 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Radio size={16} className="text-blue-600" />
                            <h5 className="text-xs font-black text-navy-950">Microsoft Teams</h5>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                            isConnected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500 border border-slate-200"
                          )}>
                            {isConnected ? 'Aktiv' : 'Ikke tilkoblet'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {isConnected 
                            ? `Integrert for byggeledelse og baser via kanalen ${omniSettings.teamsChannel || 'Byggeledelse'}.`
                            : 'Klikk for å koble Microsoft Teams Power Automate / Webhook.'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* E-post */}
                  {(() => {
                    const isConnected = Boolean(omniSettings.emailListenerEnabled && omniSettings.emailAddress?.trim());
                    return (
                      <div 
                        onClick={onOpenOmnichannelModal}
                        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:border-purple-300 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail size={16} className="text-purple-600" />
                            <h5 className="text-xs font-black text-navy-950">E-post Lytter</h5>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                            isConnected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500 border border-slate-200"
                          )}>
                            {isConnected ? 'Operativ' : 'Inaktiv'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {isConnected 
                            ? `${omniSettings.emailAddress || 'hei@vikingmester.no'} fanger opp henvendelser og genererer forslag.`
                            : 'Klikk for å aktivere e-post videresending og AI-sortering.'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : activeTab === 'team' ? (
              /* 6. TEAM, ROLLER & BRUKERINVITASJONER (RBAC) */
              <div className="space-y-4">
                <div className="p-5 bg-gradient-to-r from-navy-950 via-slate-900 to-navy-950 text-white rounded-3xl shadow-sm border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={18} className="text-electric-400" />
                      <h4 className="text-base font-black">Team, Roller & Tilgangskontroll (RBAC)</h4>
                    </div>
                    <p className="text-xs text-slate-300 max-w-xl">
                      Inviter håndverkere, byggeledere og underentreprenører. Sikrer at håndverkere kun ser sine egne oppgaver, mens ledelsen har full kontroll over økonomi og tilbud.
                    </p>
                  </div>
                  {onOpenInviteModal && (
                    <button
                      type="button"
                      onClick={onOpenInviteModal}
                      className="px-4 py-2.5 bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <UserPlus size={15} />
                      <span>+ Inviter Ny Bruker</span>
                    </button>
                  )}
                </div>

                {/* Role Separation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-100 text-purple-800">
                        👑 Byggeleder / Admin
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Full Tilgang</span>
                    </div>
                    <h5 className="text-xs font-black text-navy-950">Leder & Administrator</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Har fullt innsyn i alle tilbud, kalkylers påslag, kundepriser, endringsordrer iht. NS 8406, tildeling av oppgaver og brukerinvitasjoner.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800">
                        🔨 Håndverker (Intern)
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Felt-tilgang</span>
                    </div>
                    <h5 className="text-xs font-black text-navy-950">Håndverker på Byggeplass</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Se tildelte oppgaver, timeføring med tale/trykk, SJA-analyser, avviksmelding med foto og TEK17 veiledning. <strong>Økonomiske tilbud og marginer er skjult.</strong>
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800">
                        🤝 Ekstern Håndverker (UE)
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Prosjektavgrenset</span>
                    </div>
                    <h5 className="text-xs font-black text-navy-950">Underentreprenør</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Kun tilgang til det spesifikke prosjektet og tildelte oppgaver. Ingen innsyn i bedriftens andre prosjekter eller kalkyler.
                    </p>
                  </div>
                </div>

                {/* Direct in-chat invitation helper */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                  <h5 className="text-xs font-extrabold text-navy-950">
                    💡 Tips: Du kan også invitere direkte med tale eller chat!
                  </h5>
                  <p className="text-xs text-slate-600">
                    Skriv eller si for eksempel til MesterAI:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Inviter ola@bygg.no som håndverker',
                      'Inviter snekker@firma.no som håndverker',
                      'Inviter leder@vikingmester.no som admin'
                    ].map((promptText, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAskAboutItem(promptText)}
                        className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-electric-50 hover:text-electric-700 rounded-xl transition-all border border-slate-200 cursor-pointer"
                      >
                        💬 &quot;{promptText}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* 5. DEFAULT / TOOLBOX MENU */
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <h4 className="text-sm font-extrabold text-navy-950 mb-1">
                    Verktøykasse for Byggeleder
                  </h4>
                  <p className="text-xs text-slate-500">
                    Klikk på et verktøy for å åpne og fylle ut direkte inne i arbeidsstasjonen:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { type: 'offer' as InChatFormType, title: 'Tilbudsbygger & Kalkyle', desc: 'Arbeidstimer, materialer, påslag og NS-forbehold', icon: <FileText size={20} className="text-electric-600" /> },
                    { type: 'change_order' as InChatFormType, title: 'Endringsordre (NS 8406)', desc: 'Tilleggskrav, dager og formelt varsel', icon: <FileSignature size={20} className="text-rose-600" /> },
                    { type: 'sja' as InChatFormType, title: 'Sikker Jobb Analyse (SJA)', desc: 'Risikovurdering og vernetiltak', icon: <ShieldCheck size={20} className="text-emerald-600" /> },
                    { type: 'deviation' as InChatFormType, title: 'Avvik & RUH', desc: 'Fagfeil, skader og strakstiltak', icon: <AlertTriangle size={20} className="text-amber-600" /> },
                    { type: 'time' as InChatFormType, title: 'Timeføring & Dagens Arbeid', desc: 'Timer og beskrivelse per prosjekt', icon: <Timer size={20} className="text-blue-600" /> }
                  ].map((tool) => (
                    <button
                      key={tool.type}
                      type="button"
                      onClick={() => setActiveFormView({ type: tool.type })}
                      className="p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-electric-400 hover:shadow-md transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                          {tool.icon}
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-navy-950 group-hover:text-electric-600 transition-colors">
                            {tool.title}
                          </h5>
                          <span className="text-[10px] text-slate-400">{tool.desc}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NATIVE MOBILE BOTTOM APP DOCK (md:hidden) - Skjules når skjemavisning er aktiv så knapper aldri dekkes */}
        {!activeFormView && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-navy-950/95 backdrop-blur-xl border-t border-white/10 md:hidden px-2 py-1.5 flex items-center justify-around shadow-2xl safe-bottom">
            {/* 1. Kontroll */}
            <button
              type="button"
              onClick={() => { setActiveTab('control_center'); setActiveFormView(null); }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all py-1 px-2.5 rounded-xl cursor-pointer",
                activeTab === 'control_center' && !activeFormView
                  ? "text-electric-400 font-black"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Sparkles size={19} className={activeTab === 'control_center' && !activeFormView ? "text-electric-400 scale-110" : "text-slate-400"} />
              <span className="text-[10px] font-bold tracking-tight">Kontroll</span>
            </button>

            {/* 2. MesterAI Chat */}
            <button
              type="button"
              onClick={() => { setActiveTab('chat'); setActiveFormView(null); }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all py-1 px-2.5 rounded-xl cursor-pointer",
                activeTab === 'chat' && !activeFormView
                  ? "text-electric-400 font-black"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <MessageSquare size={19} className={activeTab === 'chat' && !activeFormView ? "text-electric-400 scale-110" : "text-slate-400"} />
              <span className="text-[10px] font-bold tracking-tight">MesterAI</span>
            </button>

            {/* 3. CENTER ELEVATED PUSH-TO-TALK BUTTON */}
            <div className="relative -top-5 flex flex-col items-center">
              <button
                type="button"
                onClick={handleVoiceCommand}
                className={cn(
                  "w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer border-3 border-navy-900",
                  isListeningMic 
                    ? "bg-rose-500 text-white animate-pulse shadow-rose-500/50 scale-110" 
                    : "bg-gradient-to-tr from-electric-600 via-blue-500 to-cyan-400 text-white shadow-electric-500/40 hover:scale-105"
                )}
                title="Snakk med MesterAI"
              >
                {isListeningMic ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <span className="text-[9px] font-black text-slate-300 mt-1 uppercase tracking-wider">
                {isListeningMic ? 'Lytter...' : 'Snakk'}
              </span>
            </div>

            {/* 4. Prosjekter */}
            <button
              type="button"
              onClick={() => { setActiveTab('projects'); setActiveFormView(null); }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all py-1 px-2.5 rounded-xl cursor-pointer",
                activeTab === 'projects' && !activeFormView
                  ? "text-electric-400 font-black"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <HardHat size={19} className={activeTab === 'projects' && !activeFormView ? "text-electric-400 scale-110" : "text-slate-400"} />
              <span className="text-[10px] font-bold tracking-tight">Prosjekt</span>
            </button>

            {/* 5. Verktøy (Worker) / Tilbud & Adm (Leader) */}
            <button
              type="button"
              onClick={() => {
                if (isWorker) {
                  setActiveTab('toolbox');
                  setActiveFormView(null);
                } else {
                  setActiveTab('admin');
                  setActiveFormView(null);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all py-1 px-2.5 rounded-xl cursor-pointer",
                (activeTab === 'toolbox' || activeTab === 'admin') && !activeFormView
                  ? "text-electric-400 font-black"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {isWorker ? (
                <>
                  <Sliders size={19} className={activeTab === 'toolbox' ? "text-electric-400 scale-110" : "text-slate-400"} />
                  <span className="text-[10px] font-bold tracking-tight">Verktøy</span>
                </>
              ) : (
                <>
                  <FileText size={19} className={activeTab === 'admin' ? "text-electric-400 scale-110" : "text-slate-400"} />
                  <span className="text-[10px] font-bold tracking-tight">Tilbud</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
