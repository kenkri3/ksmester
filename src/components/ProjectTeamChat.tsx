'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Camera,
  Image as ImageIcon,
  Mic,
  MicOff,
  Search,
  Pin,
  Smile,
  Phone,
  Mail,
  User,
  HardHat,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  ChevronLeft,
  Plus,
  Users,
  Check,
  ExternalLink,
  Bot,
  Truck,
  MapPin,
  Eye,
  Paperclip,
  Maximize2,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { Project } from '@/src/types';
import { generateAiContent } from '@/src/services/aiClient';
import { customerMessageService } from '@/src/services/customerMessageService';
import { cn } from '@/src/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatAiMarkdown } from '@/src/lib/formatAiMarkdown';

export interface TeamChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderCompany?: string;
  senderCategory?: 'team' | 'subcontractor' | 'client' | 'admin' | 'ai';
  content: string;
  imageUrl?: string;
  timestamp: string;
  formattedTime: string;
  reactions?: { [emoji: string]: string[] };
  isPinned?: boolean;
  isAiGenerated?: boolean;
  quickTag?: 'onsite' | 'delivery' | 'inspection' | 'urgent' | 'finished';
  isCustomerMessage?: boolean;
  customerName?: string;
  clientEmail?: string;
  aiSuggestedReply?: string;
  aiDraftStatus?: 'pending_approval' | 'approved' | 'rejected';
  isCustomerFacing?: boolean;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  type: 'company' | 'project' | 'hms' | 'dm';
  badgeCount?: number;
  projectId?: string;
  dmParticipant?: {
    id: string;
    name: string;
    role: string;
    phone?: string;
    email?: string;
    companyName?: string;
  };
}

interface ProjectTeamChatProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject?: (project: Project | null) => void;
  user: any;
  projectContacts?: any[];
  onOpenCopilot?: (initialPrompt?: string) => void;
  onBackToWorkstation?: () => void;
}

const QUICK_TAGS = [
  { id: 'onsite', label: 'På byggeplass', icon: MapPin, text: '📍 Er på byggeplassen nå og starter arbeidet.' },
  { id: 'delivery', label: 'Materiell ankommet', icon: Truck, text: '🚚 Materiell og vareleveranse har ankommet byggeplassen.' },
  { id: 'inspection', label: 'Klar for sjekk', icon: CheckCircle2, text: '🔍 Ferdig med sone – klar for KS & lukkesjekk før plating.' },
  { id: 'urgent', label: 'Haster / Avklaring', icon: AlertTriangle, text: '⚠️ Trenger rask avklaring fra bas/prosjektleder vedrørende utførelse.' },
  { id: 'finished', label: 'Ferdig for dagen', icon: Clock, text: '⏱️ Ferdig for dagen. Byggeplassen er ryddet og låst.' },
] as const;

const POPULAR_EMOJIS = ['👍', '🔨', '✅', '⚠️', '👏', '💪'];

const AI_SUGGESTIONS = [
  { label: '📋 Sjekkliste lukkesjekk', prompt: '@MesterAI Lag en sjekkliste for tømrer før lukking av yttervegg iht. TEK17' },
  { label: '💧 Våtromskrav membran', prompt: '@MesterAI Hvilke krav gjelder til slukmansjett og smøremembran iht. Våtromsnormen?' },
  { label: '🛡️ SJA stillasarbeid', prompt: '@MesterAI Trenger en rask SJA for stillas og fallsikring i 2. etasje' },
  { label: '📄 NS 8406 endringsvarsel', prompt: '@MesterAI Formuler et formelt varsel om endringsordre og fristforlengelse iht. NS 8406' }
];

export default function ProjectTeamChat({
  projects,
  selectedProject,
  onSelectProject,
  user,
  projectContacts = [],
  onOpenCopilot,
  onBackToWorkstation
}: ProjectTeamChatProps) {
  const currentTenantScope = useMemo(() => {
    if (user?.impersonatedCompanyId) return user.impersonatedCompanyId;
    if (user?.company) return user.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return 'tenant_default';
  }, [user]);

  // Aktiv valgt kanal (standard: aktivt prosjekt hvis valgt, ellers bedriftsfelles)
  const defaultChannelId = selectedProject ? `proj_${selectedProject.id}` : 'company_general';
  const [activeChannelId, setActiveChannelId] = useState<string>(defaultChannelId);
  
  // Mobilvisning: 'list' (kanalliste) eller 'chat' (meldingsvisning)
  const [mobileTab, setMobileTab] = useState<'list' | 'chat'>('chat');
  
  // Meldinger per kanal
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedContactForCard, setSelectedContactForCard] = useState<TeamChatMessage | null>(null);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [activeEmojiPickerForMsgId, setActiveEmojiPickerForMsgId] = useState<string | null>(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);

  // Tale-diktering state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // AI assistent tenketilstand
  const [isAiThinking, setIsAiThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Bytt kanal automatisk hvis bruker velger nytt prosjekt i toppen
  useEffect(() => {
    if (selectedProject) {
      setActiveChannelId(`proj_${selectedProject.id}`);
    }
  }, [selectedProject?.id]);

  // Generer tilgjengelige kanaler
  const channels: ChatChannel[] = useMemo(() => {
    const list: ChatChannel[] = [
      {
        id: 'company_general',
        name: 'Hele firmaet (Felles)',
        description: `Internkanal for alle ansatte i ${user?.company || 'bedriften'}`,
        type: 'company'
      },
      {
        id: 'hms_alerts',
        name: 'HMS, Sikkerhet & Varsler',
        description: 'Viktige sikkerhetsmeldinger, farevarsler, verneutstyr og SJA',
        type: 'hms'
      }
    ];

    // Legg til prosjektkanaler for alle tilgjengelige prosjekter
    projects.forEach(p => {
      list.push({
        id: `proj_${p.id}`,
        name: p.name,
        description: p.address || p.clientName || 'Aktiv byggeplass',
        type: 'project',
        projectId: p.id
      });
    });

    // Legg til direktemeldingskanaler fra prosjektkontakter
    projectContacts
      .filter(c => !c.isFormer && c.name && c.name !== user?.displayName)
      .forEach(c => {
        list.push({
          id: `dm_${c.id}`,
          name: c.name,
          description: `${c.role || 'Kollega'} • ${c.companyName || 'Internt'}`,
          type: 'dm',
          dmParticipant: c
        });
      });

    return list;
  }, [projects, projectContacts, user?.company, user?.displayName]);

  // Aktiv kanal metadata
  const activeChannel = useMemo(() => {
    return channels.find(c => c.id === activeChannelId) || channels[0];
  }, [channels, activeChannelId]);

  // Lagringsnøkkel for gjeldende kanal
  const storageKey = `mester_teamchat_${currentTenantScope}_${activeChannelId}`;

  // Last meldinger for aktiv kanal (inkluderer naturtro seed-meldinger første gang)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setMessages(JSON.parse(raw));
      } else {
        // Generer realistiske startmeldinger
        const initialSeed = generateInitialSeedMessages(activeChannel, user, selectedProject);
        setMessages(initialSeed);
        localStorage.setItem(storageKey, JSON.stringify(initialSeed));
      }
    } catch {
      setMessages([]);
    }
  }, [storageKey, activeChannelId]);

  // Lytt etter oppdateringer fra andre vinduer/faner
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) setMessages(JSON.parse(raw));
      } catch (e) {
        console.warn('Feil ved synk av chatmeldinger:', e);
      }
    };
    window.addEventListener('mester_teamchat_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('mester_teamchat_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [storageKey]);

  // Lytt etter åpning av en bestemt kanal/prosjektchat fra varselbjella
  useEffect(() => {
    const handleOpenChat = (e: any) => {
      const { channelId, projectId } = e.detail || {};
      if (channelId) {
        setActiveChannelId(channelId);
        setMobileTab('chat');
      } else if (projectId) {
        setActiveChannelId(`proj_${projectId}`);
        setMobileTab('chat');
      }
    };
    window.addEventListener('open_project_chat', handleOpenChat as EventListener);
    return () => window.removeEventListener('open_project_chat', handleOpenChat as EventListener);
  }, []);

  // Autoscroll til bunnen når nye meldinger kommer
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  // Lagre meldinger til localStorage og broadcast endring
  const saveMessages = (newMessages: TeamChatMessage[]) => {
    setMessages(newMessages);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newMessages));
      window.dispatchEvent(new CustomEvent('mester_teamchat_updated', { detail: { channelId: activeChannelId } }));
    } catch (e) {
      console.warn('Kunne ikke lagre chat-meldinger:', e);
    }
  };

  // Håndter sending av melding
  const handleSendMessage = async (textToSend?: string, quickTag?: TeamChatMessage['quickTag']) => {
    const content = (textToSend !== undefined ? textToSend : inputVal).trim();
    if (!content && !attachedImage) return;

    const now = new Date();
    const formattedTime = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

    const newMsg: TeamChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      channelId: activeChannelId,
      senderId: user?.id || 'current_user',
      senderName: user?.displayName || 'Byggmester',
      senderRole: user?.role === 'admin' ? 'Prosjektleder / Admin' : 'Håndverker',
      senderCompany: user?.company || 'Viking Bygg AS',
      senderCategory: user?.role === 'admin' ? 'admin' : 'team',
      content: content || (attachedImage ? '📷 Bilde delt fra byggeplassen' : ''),
      imageUrl: attachedImage || undefined,
      timestamp: now.toISOString(),
      formattedTime: formattedTime,
      quickTag: quickTag
    };

    const updated = [...messages, newMsg];
    saveMessages(updated);
    setInputVal('');
    setAttachedImage(null);
    setShowAiSuggestions(false);
    setIsAttachmentMenuOpen(false);

    // Hvis meldingen inneholder @MesterAI eller brukeren kaller på AI, trigger autonomt svar
    if (content.toLowerCase().includes('@mesterai') || content.toLowerCase().includes('@ai')) {
      triggerMesterAiResponse(content, updated);
    }
  };

  // Autonomt MesterAI svar i chatten
  const triggerMesterAiResponse = async (userPrompt: string, currentHistory: TeamChatMessage[]) => {
    setIsAiThinking(true);
    try {
      const cleanPrompt = userPrompt.replace(/@mesterai/gi, '').replace(/@ai/gi, '').trim();
      const channelContext = `Du er MesterAI, en erfaren norsk byggmester, prosjektleder og fagrådgiver.
Du svarer nå direkte inn i team-chatten for kanalen "${activeChannel.name}".
Deltakere i chatten er tømrere, prosjektledere, underentreprenører og bas.
Hold svaret konsist, praktisk, faglig presist i henhold til TEK17 / NS 8406 / Våtromsnormen, og i en vennlig, profesjonell håndverkertone.
Maks 2-4 avsnitt eller punktliste.`;

      const aiRes = await generateAiContent({
        prompt: cleanPrompt || 'Hva bør vi passe på i dag på denne byggeplassen?',
        systemInstruction: channelContext,
        operation: 'team_chat_assistant'
      });

      const now = new Date();
      const aiMsg: TeamChatMessage = {
        id: `ai_${Date.now()}`,
        channelId: activeChannelId,
        senderId: 'mesterai_bot',
        senderName: 'MesterAI Fagpilot',
        senderRole: 'Autonom Byggmester AI',
        senderCompany: 'KS Mester Fagmotor',
        senderCategory: 'ai',
        content: aiRes.text || 'Jeg har registrert henvendelsen. Husk å dokumentere med TEK17 bildekontroll og føre timer i byggedagboken.',
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        isAiGenerated: true
      };

      const withAi = [...currentHistory, aiMsg];
      saveMessages(withAi);
    } catch (err) {
      console.warn('Feil ved svar fra MesterAI i teamchat:', err);
      toast.error('MesterAI kunne ikke svare akkurat nå.');
    } finally {
      setIsAiThinking(false);
    }
  };

  // Hurtigknapp for å spørre MesterAI
  const handleAskMesterAiDirectly = () => {
    setShowAiSuggestions(prev => !prev);
    setInputVal(prev => (prev.startsWith('@MesterAI') ? prev : `@MesterAI ${prev}`.trimStart()));
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Godkjenn MesterAI-svar til kunde (Kunden ser svaret først når dette godkjennes)
  const handleApproveAiReply = async (msg: TeamChatMessage) => {
    if (!msg.aiSuggestedReply) return;
    const replyText = msg.aiSuggestedReply;
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

    // 1. Merk meldingen som godkjent i den lokale chatten
    const updated = messages.map(m => m.id === msg.id ? { ...m, aiDraftStatus: 'approved' as const } : m);

    // 2. Legg til offisielt bedriftssvar i chat-tråden
    const replyMsg: TeamChatMessage = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channelId: msg.channelId,
      senderId: user?.id || 'admin',
      senderName: `${user?.displayName || 'Byggmester'} (${user?.company || 'Firma'})`,
      senderRole: 'Prosjektleder / Admin',
      senderCategory: 'admin',
      content: replyText,
      timestamp: now.toISOString(),
      formattedTime,
      isCustomerFacing: true
    };

    const withReply = [...updated, replyMsg];
    saveMessages(withReply);

    // 3. Oppdater i backend/Firestore via customerMessageService
    const projectId = activeChannel.projectId || (msg.channelId.startsWith('proj_') ? msg.channelId.replace('proj_', '') : '');
    if (projectId) {
      await customerMessageService.approveAndSendReply(projectId, msg.id, replyText, user);
    }

    toast.success('Svaret ble godkjent og sendt til kunden i kundeportalen!');
  };

  // Rediger før sending
  const handleEditAiReply = (msg: TeamChatMessage) => {
    if (!msg.aiSuggestedReply) return;
    setInputVal(msg.aiSuggestedReply);
    const updated = messages.map(m => m.id === msg.id ? { ...m, aiDraftStatus: 'approved' as const } : m);
    saveMessages(updated);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    toast.info('Utkast lagt i meldingsfeltet. Gjør eventuelle endringer og trykk Send.');
  };

  // Avvis MesterAI-forslag
  const handleRejectAiReply = (msg: TeamChatMessage) => {
    const updated = messages.map(m => m.id === msg.id ? { ...m, aiDraftStatus: 'rejected' as const } : m);
    saveMessages(updated);
    toast.info('Forslag avvist.');
  };

  // Reaksjon på melding
  const handleToggleReaction = (msgId: string, emoji: string) => {
    const userName = user?.displayName || 'Meg';
    const updated = messages.map(m => {
      if (m.id === msgId) {
        const reactions = { ...(m.reactions || {}) };
        const users = reactions[emoji] || [];
        if (users.includes(userName)) {
          reactions[emoji] = users.filter(u => u !== userName);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...users, userName];
        }
        return { ...m, reactions };
      }
      return m;
    });
    saveMessages(updated);
  };

  // Feste / Løsne melding
  const handleTogglePin = (msgId: string) => {
    const updated = messages.map(m => {
      if (m.id === msgId) {
        const nextState = !m.isPinned;
        toast.info(nextState ? 'Beskjed festet øverst i kanalen' : 'Beskjed løsnet');
        return { ...m, isPinned: nextState };
      }
      return m;
    });
    saveMessages(updated);
  };

  // Slett melding (for egen melding eller admin)
  const handleDeleteMessage = (msgId: string) => {
    const updated = messages.filter(m => m.id !== msgId);
    saveMessages(updated);
    toast.success('Melding slettet');
  };

  // Bildeopplasting
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Bildet er for stort (maks 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
      setIsAttachmentMenuOpen(false);
      toast.success('Bilde vedlagt – legg til tekst og trykk send');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Tale-til-tekst (Web Speech API)
  const toggleVoiceRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Nettleseren din støtter ikke direkte tale-til-tekst. Skriv inn meldingen manuelt.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'nb-NO';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        toast.info('🎙️ Lytter... Snakk inn beskjeden nå.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputVal(prev => (prev ? `${prev} ${transcript}` : transcript));
          toast.success('Tale transkribert!');
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        toast.error('Kunne ikke oppfatte tale. Prøv igjen.');
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
      toast.error('Mikrofontilgang ble avvist.');
    }
  };

  // Filtrerte meldinger ved søk
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase().trim();
    return messages.filter(m =>
      m.content.toLowerCase().includes(q) ||
      m.senderName.toLowerCase().includes(q) ||
      (m.senderRole && m.senderRole.toLowerCase().includes(q))
    );
  }, [messages, searchQuery]);

  // Festede meldinger i aktiv kanal
  const pinnedMessages = useMemo(() => {
    return messages.filter(m => m.isPinned);
  }, [messages]);

  // Kontaktkort for klikket avsender
  const contactDetails = useMemo(() => {
    if (!selectedContactForCard) return null;
    const match = projectContacts.find(c =>
      c.name?.toLowerCase() === selectedContactForCard.senderName?.toLowerCase() ||
      c.id === selectedContactForCard.senderId
    );
    return {
      name: selectedContactForCard.senderName,
      role: selectedContactForCard.senderRole || match?.role || 'Kollega',
      company: selectedContactForCard.senderCompany || match?.companyName || user?.company || 'Firma',
      phone: match?.phone,
      email: match?.email,
      id: match?.id || selectedContactForCard.senderId,
      category: selectedContactForCard.senderCategory || match?.category || 'team'
    };
  }, [selectedContactForCard, projectContacts, user?.company]);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#0A101D] text-slate-100 overflow-hidden relative select-text">
      {/* Skjulte fil-innganger for kamera og galleri */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* 1. Header (Clean, minimal, 100% integrert i appen) */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-[#0A101D]/90 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          {/* Mobil navigasjon: Tilbake til liste eller tilbake til arbeidsstasjon */}
          <button
            type="button"
            onClick={() => {
              if (mobileTab === 'chat') {
                setMobileTab('list');
              } else if (onBackToWorkstation) {
                onBackToWorkstation();
              }
            }}
            className="md:hidden p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 active:scale-95"
            title={mobileTab === 'chat' ? 'Vis alle kanaler' : 'Tilbake til systemet'}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Desktop Tilbakeknapp */}
          {onBackToWorkstation && (
            <button
              type="button"
              onClick={onBackToWorkstation}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer shrink-0 active:scale-95"
              title="Gå tilbake til arbeidsstasjonen"
            >
              <ArrowLeft size={14} />
              <span>Tilbake</span>
            </button>
          )}

          {/* Kanal ikon */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 flex items-center justify-center shrink-0">
            {activeChannel.type === 'company' && <Building2 size={16} />}
            {activeChannel.type === 'project' && <HardHat size={16} />}
            {activeChannel.type === 'hms' && <AlertTriangle size={16} />}
            {activeChannel.type === 'dm' && <User size={16} />}
          </div>

          {/* Kanal tittel & metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {activeChannel.name}
              </h2>
              {activeChannel.type === 'project' && (
                <span className="hidden sm:inline-flex shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Byggeplass
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {activeChannel.description}
            </p>
          </div>
        </div>

        {/* Høyre toppkontroller */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Spør MesterAI i samtalen */}
          <button
            type="button"
            onClick={handleAskMesterAiDirectly}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-purple-500/30 active:scale-95"
            title="Kall på MesterAI for å gi fagråd i chatten"
          >
            <Sparkles size={13} className="text-amber-300 animate-pulse shrink-0" />
            <span className="hidden sm:inline">@MesterAI</span>
            <span className="sm:hidden font-mono text-[11px]">@AI</span>
          </button>

          {/* Søk i meldinger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={cn(
              "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer",
              isSearchOpen ? "bg-purple-600 text-white" : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            )}
            title="Søk i samtalehistorikk"
          >
            <Search size={15} />
          </button>

          {/* Medlemsliste / Telefonbok */}
          <button
            type="button"
            onClick={() => setIsMembersModalOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Se deltakere, ring eller start privat samtale"
          >
            <Users size={15} />
          </button>
        </div>
      </div>

      {/* 2. Søkelinje ved klikk */}
      {isSearchOpen && (
        <div className="px-4 py-2 bg-[#0d1424] border-b border-white/10 flex items-center gap-2 animate-in fade-in shrink-0">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Søk etter meldinger, avtaler, bildebeskrivelser..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* 3. Festet beskjed banner (Kompakt og elegant) */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-1.5 bg-[#17122b]/80 border-b border-purple-500/20 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-purple-300 min-w-0">
            <Pin size={12} className="shrink-0 text-amber-400 fill-amber-400" />
            <span className="font-bold text-[11px] text-amber-300 shrink-0">Festet:</span>
            <p className="truncate text-slate-300 text-xs font-medium">
              {pinnedMessages[pinnedMessages.length - 1].content.replace(/\*\*/g, '').replace(/^[•●–—]\s*/, '')}
            </p>
          </div>
          <span className="text-[10px] text-purple-400/80 shrink-0 font-medium">
            {pinnedMessages.length} festet
          </span>
        </div>
      )}

      {/* 4. Hovedkropp: Split view på desktop, fullskjerm på mobil */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Venstre kanal- og kontaktliste */}
        <div className={cn(
          "w-full md:w-72 lg:w-80 border-r border-white/10 bg-[#0d1424]/70 flex flex-col shrink-0 overflow-y-auto no-scrollbar",
          mobileTab === 'list' ? "flex" : "hidden md:flex"
        )}>
          {/* Mobil topprad i listen */}
          <div className="md:hidden p-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Kanaler & Samtaler</span>
            {onBackToWorkstation && (
              <button
                type="button"
                onClick={onBackToWorkstation}
                className="text-xs font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
              >
                Tilbake til systemet
              </button>
            )}
          </div>

          {/* Seksjon: Felles og Byggeplasskanaler */}
          <div className="p-3 border-b border-white/5">
            <div className="px-2 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Byggeplass & Firma</span>
              <span className="text-[10px] font-normal text-purple-400">{user?.company || 'Firma'}</span>
            </div>
            <div className="space-y-1 mt-1.5">
              {channels.filter(c => c.type !== 'dm').map(ch => {
                const isActive = ch.id === activeChannelId;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setActiveChannelId(ch.id);
                      setMobileTab('chat');
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer group",
                      isActive
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                      isActive ? "bg-white/20 text-white" : "bg-white/5 text-slate-400 group-hover:text-purple-300"
                    )}>
                      {ch.type === 'company' && <Building2 size={14} />}
                      {ch.type === 'project' && <HardHat size={14} />}
                      {ch.type === 'hms' && <AlertTriangle size={14} className="text-amber-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{ch.name}</p>
                      <p className={cn("text-[10px] truncate font-normal", isActive ? "text-purple-200" : "text-slate-500")}>
                        {ch.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seksjon: Direktemeldinger */}
          <div className="p-3 flex-1">
            <div className="px-2 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Direktemeldinger</span>
              <span className="text-emerald-400 text-[10px]">{channels.filter(c => c.type === 'dm').length} kolleger</span>
            </div>
            <div className="space-y-1 mt-1.5">
              {channels.filter(c => c.type === 'dm').map(dm => {
                const isActive = dm.id === activeChannelId;
                const contact = dm.dmParticipant;
                return (
                  <button
                    key={dm.id}
                    type="button"
                    onClick={() => {
                      setActiveChannelId(dm.id);
                      setMobileTab('chat');
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer group",
                      isActive
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                      isActive ? "bg-white text-purple-900" : "bg-white/10 text-purple-300 border border-white/10"
                    )}>
                      {dm.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{dm.name}</p>
                      <p className={cn("text-[10px] truncate font-normal", isActive ? "text-purple-200" : "text-slate-500")}>
                        {contact?.role || 'Kollega'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Høyre spalte: Meldingsfeed */}
        <div className={cn(
          "flex-1 flex flex-col bg-[#0A101D] overflow-hidden relative",
          mobileTab === 'chat' ? "flex" : "hidden md:flex"
        )}>
          {/* Meldingsstrøm - Med god padding i bunnen slik at ingenting gjemmes bak floating input pill */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-4 [touch-action:pan-y] pb-32 sm:pb-36">
            {filteredMessages.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
                  <MessageSquare size={24} />
                </div>
                <h4 className="text-sm font-bold text-white">Ingen meldinger ennå i {activeChannel.name}</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Del en oppdatering, et bilde eller still et spørsmål til teamet eller MesterAI.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg, idx) => {
                const isClient = msg.senderCategory === 'client' || msg.isCustomerMessage;
                const isMe = !isClient && (msg.senderId === user?.id || (msg.senderCategory === 'admin' && user?.role === 'admin'));
                const isAi = msg.isAiGenerated || msg.senderCategory === 'ai';

                // Unngå duplikat rollevisning som "Kenneth (Prosjektleder) (Prosjektleder)"
                const displayName = msg.senderName;
                const roleToShow = msg.senderRole && !displayName.toLowerCase().includes(msg.senderRole.toLowerCase())
                  ? msg.senderRole
                  : null;

                return (
                  <div
                    key={msg.id || idx}
                    className={cn(
                      "flex flex-col gap-1 w-full animate-in fade-in duration-200",
                      isMe ? "items-end" : "items-start"
                    )}
                  >
                    {/* Avsenderheader */}
                    <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                      {isClient ? (
                        <span className="font-bold text-teal-400 flex items-center gap-1.5">
                          <User size={13} className="text-teal-400" />
                          <span>{displayName}</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-teal-500/20 text-teal-300 text-[9px] font-black border border-teal-500/30">
                            KUNDEPORTAL
                          </span>
                        </span>
                      ) : isAi ? (
                        <span className="font-bold text-purple-400 flex items-center gap-1">
                          <Bot size={13} />
                          <span>{msg.senderName}</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-300 text-[9px] border border-purple-500/30">
                            AI FAGPILOT
                          </span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedContactForCard(msg)}
                          className="font-bold text-slate-200 hover:text-purple-300 transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Klikk for å se kontaktkort"
                        >
                          <span>{displayName}</span>
                          {roleToShow && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({roleToShow})
                            </span>
                          )}
                        </button>
                      )}
                      <span className="text-[10px] text-slate-500">{msg.formattedTime}</span>
                      {msg.isPinned && (
                        <span className="flex items-center gap-0.5 text-amber-400 text-[10px] font-bold">
                          <Pin size={10} className="fill-amber-400" />
                          <span>Festet</span>
                        </span>
                      )}
                    </div>

                    {/* Selve meldingsboksen */}
                    <div
                      className={cn(
                        "p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[88%] sm:max-w-[80%] shadow-lg relative group",
                        isClient
                          ? "bg-[#0c1f1b] border-2 border-teal-500/40 text-teal-50 rounded-tl-xs shadow-teal-950/30"
                          : isAi
                          ? "bg-[#131b2e] border border-purple-500/30 text-slate-100 rounded-tl-xs"
                          : isMe
                          ? "bg-gradient-to-r from-purple-600 to-electric-600 text-white rounded-tr-xs"
                          : "bg-[#131b2e] text-slate-200 border border-white/10 rounded-tl-xs"
                      )}
                    >
                      {/* Hurtigtags visning */}
                      {msg.quickTag && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/40 text-amber-300 font-bold text-[10px] uppercase tracking-wider mb-2 border border-white/10">
                          {msg.quickTag === 'onsite' && <MapPin size={11} />}
                          {msg.quickTag === 'delivery' && <Truck size={11} />}
                          {msg.quickTag === 'inspection' && <CheckCircle2 size={11} />}
                          {msg.quickTag === 'urgent' && <AlertTriangle size={11} />}
                          {msg.quickTag === 'finished' && <Clock size={11} />}
                          <span>
                            {msg.quickTag === 'onsite' && 'På byggeplass'}
                            {msg.quickTag === 'delivery' && 'Vareleveranse'}
                            {msg.quickTag === 'inspection' && 'Klar for kontroll'}
                            {msg.quickTag === 'urgent' && 'Haster!'}
                            {msg.quickTag === 'finished' && 'Dagsrapport fullført'}
                          </span>
                        </div>
                      )}

                      {/* Vedlagt bilde med forhåndsvisning og forstørr-mulighet */}
                      {msg.imageUrl && (
                        <div
                          onClick={() => setPreviewImage(msg.imageUrl || null)}
                          className="mb-2.5 rounded-xl overflow-hidden border border-white/15 cursor-pointer max-w-sm relative group/img"
                        >
                          <img
                            src={msg.imageUrl}
                            alt="Vedlagt bilde"
                            className="w-full h-auto max-h-72 object-cover transition-transform group-hover/img:scale-102"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                            <Maximize2 size={14} />
                            <span>Klikk for full skjerm</span>
                          </div>
                        </div>
                      )}

                      {/* Tekstinnhold med ekte Markdown-parsing slik at **fet skrift**, lister og overskrifter ikke vises som rå stjerner/firkanter */}
                      {isAi ? (
                        <div className="prose prose-invert prose-sm max-w-none text-slate-100 leading-relaxed font-sans">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ node, ...props }) => (
                                <h3 className="text-sm font-black text-white mt-3 mb-1.5 flex items-center gap-1.5 border-b border-purple-500/20 pb-1" {...props} />
                              ),
                              h2: ({ node, ...props }) => (
                                <h4 className="text-xs sm:text-sm font-black text-purple-300 mt-2.5 mb-1 flex items-center gap-1.5" {...props} />
                              ),
                              h3: ({ node, ...props }) => (
                                <h5 className="text-xs font-bold text-teal-300 mt-2 mb-1 uppercase tracking-wider" {...props} />
                              ),
                              p: ({ node, ...props }) => (
                                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-2.5 last:mb-0" {...props} />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul className="my-2 space-y-1.5 pl-1 list-none" {...props} />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol className="my-2 space-y-1.5 pl-4 list-decimal text-slate-200 text-xs sm:text-sm" {...props} />
                              ),
                              li: ({ node, ...props }) => (
                                <li className="text-xs sm:text-sm text-slate-200 leading-relaxed flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0 shadow-xs" />
                                  <span className="flex-1 min-w-0">{props.children}</span>
                                </li>
                              ),
                              strong: ({ node, ...props }) => (
                                <strong className="font-extrabold text-white" {...props} />
                              ),
                              blockquote: ({ node, ...props }) => (
                                <blockquote className="my-2 p-2.5 bg-purple-950/40 border-l-3 border-purple-500 rounded-r-xl text-xs text-purple-200 shadow-sm" {...props} />
                              ),
                              code: ({ node, inline, ...props }: any) => (
                                inline ? (
                                  <code className="px-1.5 py-0.5 rounded bg-black/40 text-purple-300 font-mono text-xs" {...props} />
                                ) : (
                                  <code className="block p-2 rounded-xl bg-black/50 text-slate-200 font-mono text-xs overflow-x-auto my-2" {...props} />
                                )
                              )
                            }}
                          >
                            {formatAiMarkdown(msg.content)}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm leading-relaxed text-inherit font-sans">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ node, ...props }) => <p className="mb-1 last:mb-0 leading-relaxed" {...props} />,
                              strong: ({ node, ...props }) => <strong className="font-bold underline decoration-white/20" {...props} />,
                              ul: ({ node, ...props }) => <ul className="my-1.5 space-y-1 pl-3 list-disc" {...props} />,
                              li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                              a: ({ node, href, children, ...props }: any) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-white" {...props}>
                                  {children}
                                </a>
                              )
                            }}
                          >
                            {(msg.content || '')
                              .replace(/^[ \t]*[•●–—][ \t]*/gm, '- ')
                              .replace(/\n[ \t]*[•●–—][ \t]*/g, '\n- ')}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Emojireaksjoner */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-white/10">
                          {Object.entries(msg.reactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="px-2 py-0.5 rounded-full bg-black/30 hover:bg-black/50 border border-white/15 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer transition-colors"
                              title={`Reagert av: ${users.join(', ')}`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] text-slate-300">{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Hurtigverktøy for melding (Fest, reaksjon, slett) */}
                      <div className={cn(
                        "absolute -top-3 z-10 flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-full px-2 py-0.5 shadow-lg transition-opacity",
                        isMe ? "right-2" : "left-2",
                        "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                      )}>
                        <button
                          type="button"
                          onClick={() => handleTogglePin(msg.id)}
                          className="p-1 text-slate-400 hover:text-amber-400 rounded-full transition-colors cursor-pointer"
                          title={msg.isPinned ? "Løsne beskjed" : "Fest beskjed øverst"}
                        >
                          <Pin size={12} className={msg.isPinned ? "fill-amber-400 text-amber-400" : ""} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveEmojiPickerForMsgId(activeEmojiPickerForMsgId === msg.id ? null : msg.id)}
                          className="p-1 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
                          title="Velg reaksjon"
                        >
                          <Smile size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, '👍')}
                          className="p-1 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer text-xs"
                          title="Tommel opp"
                        >
                          👍
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, '🔨')}
                          className="p-1 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer text-xs"
                          title="Bygge-hammer"
                        >
                          🔨
                        </button>

                        {/* Slett-knapp for egne meldinger eller admin */}
                        {(isMe || user?.role === 'admin') && !isAi && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded-full transition-colors cursor-pointer"
                            title="Slett melding"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      {/* Utvidet emojivelger ved klikk på smile-ikon */}
                      {activeEmojiPickerForMsgId === msg.id && (
                        <div className={cn(
                          "absolute -top-10 z-20 flex items-center gap-1 p-1 bg-slate-900 border border-slate-700 rounded-full shadow-xl animate-in zoom-in-95",
                          isMe ? "right-2" : "left-2"
                        )}>
                          {POPULAR_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                handleToggleReaction(msg.id, emoji);
                                setActiveEmojiPickerForMsgId(null);
                              }}
                              className="p-1 hover:bg-white/10 rounded-full text-sm transition-transform hover:scale-125 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* MesterAI Forslag til svar (Krever godkjenning av byggeleder før det sendes til kunde) */}
                    {isClient && msg.aiSuggestedReply && msg.aiDraftStatus === 'pending_approval' && (
                      <div className="w-full max-w-xl mt-1.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-purple-950/90 via-slate-900 to-indigo-950/90 border-2 border-purple-500/40 shadow-xl space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                              <Sparkles size={14} className="text-amber-300 animate-pulse" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-purple-200">MesterAI Forslag til svar</span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Venter på din godkjenning
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Svaret er IKKE sendt til kunden. Du må godkjenne eller redigere før kunden ser det.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans select-text">
                          {msg.aiSuggestedReply}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleApproveAiReply(msg)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 size={14} />
                            <span>Godkjenn & Send til kunde</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditAiReply(msg)}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer active:scale-95"
                          >
                            <ExternalLink size={14} />
                            <span>Rediger før sending</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRejectAiReply(msg)}
                            className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center gap-1.5 border border-rose-500/20 transition-all cursor-pointer"
                          >
                            <X size={14} />
                            <span>Avvis</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Hvis forslag allerede er godkjent */}
                    {isClient && msg.aiDraftStatus === 'approved' && (
                      <div className="mt-1 text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 pl-1">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Godkjent svar levert til kunden i kundeportalen</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* MesterAI tenkestatus i samtalen */}
            {isAiThinking && (
              <div className="flex items-center gap-2 p-3 bg-purple-950/40 border border-purple-500/30 rounded-2xl w-fit text-xs text-purple-300 animate-pulse">
                <Sparkles size={14} className="text-amber-300 animate-spin" />
                <span>MesterAI formulerer faglig svar til teamet...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 5. FLOATING ROUNDED-FULL INPUT BOX (1:1 GOOGLE GEMINI APP & HOVEDCHAT) */}
          <div 
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0A101D] via-[#0A101D]/95 to-transparent pt-6 px-3 sm:px-6 z-20 pointer-events-none"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <div className="max-w-3xl mx-auto w-full space-y-2 relative pointer-events-auto">
              {/* Forhåndsvisning av vedlagt bilde */}
              {attachedImage && (
                <div className="flex items-center gap-2.5 p-2 bg-[#1e1f20] rounded-2xl border border-white/15 shadow-xl w-fit">
                  <img src={attachedImage} alt="Klargjort bilde" className="w-9 h-9 rounded-lg object-cover" />
                  <span className="text-xs text-purple-300 font-medium">Bilde klart for sending</span>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* AI forslag (hvis aktivert) */}
              {showAiSuggestions && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1 px-1">
                  {AI_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-900/60 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-700/60 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer backdrop-blur-sm shadow-xs"
                    >
                      <Sparkles size={11} className="text-amber-300" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Raske feltknapper (Sleek swipeable chips uten stygg scrollbar!) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1 px-1">
                {QUICK_TAGS.map(tag => {
                  const Icon = tag.icon;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleSendMessage(tag.text, tag.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#182235]/90 hover:bg-[#202d47] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs backdrop-blur-sm"
                    >
                      <Icon size={12} className="text-purple-400 shrink-0" />
                      <span>{tag.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Hovedinndata-pille (Rounded-full bg-[#1e1f20]) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center bg-[#1e1f20] border border-white/10 focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/20 rounded-full p-1.5 sm:p-2 shadow-2xl transition-all"
              >
                {/* Pluss-knapp (+) som åpner kamera/galleri/handlinger */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors active:scale-95"
                    title="Legg ved bilde eller hurtighandling"
                  >
                    <Plus size={18} />
                  </button>

                  {/* Popover meny ved trykk på + */}
                  {isAttachmentMenuOpen && (
                    <div className="absolute bottom-12 left-0 z-50 w-56 p-1.5 rounded-2xl bg-[#1e1f20] border border-white/15 shadow-2xl space-y-1 animate-in zoom-in-95 backdrop-blur-xl">
                      <button
                        type="button"
                        onClick={() => {
                          cameraInputRef.current?.click();
                          setIsAttachmentMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left text-xs font-bold text-slate-200 cursor-pointer transition-colors"
                      >
                        <Camera size={15} className="text-purple-400" />
                        <span>Ta bilde med kamera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setIsAttachmentMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left text-xs font-bold text-slate-200 cursor-pointer transition-colors"
                      >
                        <ImageIcon size={15} className="text-teal-400" />
                        <span>Last opp fra bildegalleri</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleAskMesterAiDirectly();
                          setIsAttachmentMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left text-xs font-bold text-purple-300 cursor-pointer transition-colors border-t border-white/5"
                      >
                        <Sparkles size={15} className="text-amber-300" />
                        <span>Spør @MesterAI</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Tekstfelt */}
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={isRecording ? "Lytter... snakk nå..." : `Skriv melding til #${activeChannel.name}...`}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none"
                />

                {/* Mikrofon tale-diktering */}
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={cn(
                    "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all",
                    isRecording
                      ? "bg-rose-600 text-white animate-pulse shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                  )}
                  title={isRecording ? "Stopp diktering" : "Snakk inn beskjed (tale-til-tekst)"}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} className="text-slate-300" />}
                </button>

                {/* Send-knapp */}
                <button
                  type="submit"
                  disabled={!inputVal.trim() && !attachedImage}
                  className={cn(
                    "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md",
                    (inputVal.trim() || attachedImage)
                      ? "bg-gradient-to-tr from-purple-600 to-electric-500 text-white hover:scale-105 active:scale-95 shadow-purple-500/30"
                      : "bg-white/5 text-slate-500 cursor-not-allowed opacity-40"
                  )}
                  title="Send melding"
                >
                  <Send size={16} />
                </button>
              </form>

              {/* Sub-label under pillen */}
              <p className="text-[10px] text-center text-slate-500 pb-0.5 font-medium">
                Trykk + for kamera, bilder og feltstatuser
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Modal: Deltakere / Telefonbok */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#131b2e] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Deltakere & Telefonliste</h4>
                  <p className="text-[11px] text-slate-400">{activeChannel.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMembersModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {projectContacts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Ingen kontakter registrert for dette prosjektet ennå.
                </p>
              ) : (
                projectContacts.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.role} • {c.companyName || 'Internt'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Direktemelding */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChannelId(`dm_${c.id}`);
                          setIsMembersModalOpen(false);
                          setMobileTab('chat');
                          toast.success(`Åpnet 1-til-1 samtale med ${c.name}`);
                        }}
                        className="p-2 rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors cursor-pointer"
                        title={`Send direktemelding til ${c.name}`}
                      >
                        <MessageSquare size={13} />
                      </button>

                      {/* Telefon */}
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="p-2 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                          title={`Ring ${c.name} (${c.phone})`}
                        >
                          <Phone size={13} />
                        </a>
                      )}

                      {/* E-post */}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="p-2 rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                          title={`E-post til ${c.name}`}
                        >
                          <Mail size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Kontaktprofilkort ved klikk på avsender */}
      {selectedContactForCard && contactDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#131b2e] border border-white/15 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                  {contactDetails.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-black text-white">{contactDetails.name}</h4>
                  <p className="text-xs text-purple-400 font-semibold">{contactDetails.role}</p>
                  <p className="text-[11px] text-slate-400">{contactDetails.company}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContactForCard(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {contactDetails.phone ? (
                <a
                  href={`tel:${contactDetails.phone}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                      <Phone size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Telefon</p>
                      <p className="text-xs font-mono font-bold text-white">{contactDetails.phone}</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold">Ring nå →</span>
                </a>
              ) : (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400 flex items-center gap-2">
                  <Phone size={14} className="text-slate-500" />
                  <span>Telefonnummer ikke registrert</span>
                </div>
              )}

              {contactDetails.email && (
                <a
                  href={`mailto:${contactDetails.email}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20">
                      <Mail size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">E-post</p>
                      <p className="text-xs font-medium text-white truncate">{contactDetails.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-400 font-bold shrink-0">Send →</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveChannelId(`dm_${contactDetails.id}`);
                  setSelectedContactForCard(null);
                  setMobileTab('chat');
                  toast.success(`Åpnet 1-til-1 samtale med ${contactDetails.name}`);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer mt-3"
              >
                <MessageSquare size={16} />
                <span>Åpne direktemelding (1-til-1)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Lightbox for bildevisning i fullskjerm */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img src={previewImage} alt="Forstørret bilde" className="w-full h-auto object-contain max-h-[85vh] rounded-2xl" />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Hjelpefunksjon for å generere realistiske seed-meldinger
function generateInitialSeedMessages(channel: ChatChannel, user: any, project: Project | null): TeamChatMessage[] {
  const now = new Date();
  const formatT = (minusMinutes: number) => {
    const d = new Date(now.getTime() - minusMinutes * 60000);
    return d.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
  };

  if (channel.type === 'hms') {
    return [
      {
        id: 'seed_hms_1',
        channelId: channel.id,
        senderId: 'bas_1',
        senderName: 'Bas Tømrer',
        senderRole: 'Verneombud / Bas',
        senderCategory: 'team',
        content: 'Husk at stillas i 2. etasje er kontrollert og godkjent for arbeid i dag. Påbudt med hjelm og fallsikringssele ved arbeid utenfor rekkverk.',
        timestamp: new Date(now.getTime() - 120 * 60000).toISOString(),
        formattedTime: formatT(120),
        isPinned: true,
        reactions: { '👍': ['Ola Tømrer', 'Kari Byggmester'] }
      }
    ];
  }

  if (channel.type === 'dm') {
    return [
      {
        id: `seed_dm_${channel.id}`,
        channelId: channel.id,
        senderId: channel.dmParticipant?.id || 'other_user',
        senderName: channel.name,
        senderRole: channel.dmParticipant?.role || 'Kollega',
        senderCompany: channel.dmParticipant?.companyName || user?.company || 'Firma',
        senderCategory: 'team',
        content: `Hei ${user?.displayName || 'kollega'}! Dette er en direkte meldingstråd mellom oss to for raske avklaringer på byggeplassen.`,
        timestamp: new Date(now.getTime() - 45 * 60000).toISOString(),
        formattedTime: formatT(45),
        reactions: { '👍': [user?.displayName || 'Meg'] }
      }
    ];
  }

  if (channel.type === 'project' && project) {
    return [
      {
        id: 'seed_proj_1',
        channelId: channel.id,
        senderId: 'pm_1',
        senderName: 'Kenneth (Prosjektleder)',
        senderRole: 'Prosjektleder',
        senderCategory: 'admin',
        content: `Velkommen til prosjektchatten for ${project.name} (${project.address || 'byggeplass'}). Her melder vi inn ankomst, vareleveranser, KS-lukkesjekker og avklaringer med rørlegger/elektriker.`,
        timestamp: new Date(now.getTime() - 180 * 60000).toISOString(),
        formattedTime: formatT(180),
        isPinned: true,
        reactions: { '👍': ['Tømrer', 'Elektriker'] }
      },
      {
        id: 'seed_proj_2',
        channelId: channel.id,
        senderId: 'carp_1',
        senderName: 'Lars Fagarbeider',
        senderRole: 'Tømrer',
        senderCategory: 'team',
        quickTag: 'onsite',
        content: '📍 Er på byggeplassen nå. Starter på lekting av baderomsveggene og klargjøring for rørlegger.',
        timestamp: new Date(now.getTime() - 60 * 60000).toISOString(),
        formattedTime: formatT(60),
        reactions: { '🔨': ['Kenneth (Prosjektleder)'] }
      }
    ];
  }

  return [
    {
      id: 'seed_comp_1',
      channelId: channel.id,
      senderId: 'leader_1',
      senderName: 'Daglig Leder',
      senderRole: 'Admin',
      senderCategory: 'admin',
      content: `Felleskanal for ${user?.company || 'bedriften'}. Her kan alle ansatte utveksle fellesbeskjeder, verktøyettersyn, firmabiler og oppdateringer.`,
      timestamp: new Date(now.getTime() - 240 * 60000).toISOString(),
      formattedTime: formatT(240),
      isPinned: true,
      reactions: { '👏': ['Team'] }
    }
  ];
}
