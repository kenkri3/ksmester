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
  Maximize2
} from 'lucide-react';
import { toast } from 'sonner';
import { Project } from '@/src/types';
import { generateAiContent } from '@/src/services/aiClient';
import { cn } from '@/src/lib/utils';

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
  const [selectedContactForCard, setSelectedContactForCard] = useState<any | null>(null);

  // Tale-diktering state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // AI assistent tenketilstand
  const [isAiThinking, setIsAiThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      .slice(0, 8)
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
      content: content,
      imageUrl: attachedImage || undefined,
      timestamp: now.toISOString(),
      formattedTime: formattedTime,
      quickTag: quickTag
    };

    const updated = [...messages, newMsg];
    saveMessages(updated);
    setInputVal('');
    setAttachedImage(null);

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
Du svarer nå direkte inn i team-chatten for byggeprosjektet "${activeChannel.name}".
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
    const prompt = window.prompt('Hva vil du spørre MesterAI om for dette prosjektet? (Svaret deles med hele teamet):');
    if (prompt && prompt.trim()) {
      handleSendMessage(`@MesterAI ${prompt.trim()}`);
    }
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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] sm:h-[calc(100vh-100px)] max-w-7xl mx-auto w-full bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* 1. Topp-fane / Prosjekthode */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Mobil tilbake til kanalliste-knapp */}
          <button
            type="button"
            onClick={() => setMobileTab(mobileTab === 'chat' ? 'list' : 'chat')}
            className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            title={mobileTab === 'chat' ? 'Vis alle kanaler' : 'Vis samtale'}
          >
            {mobileTab === 'chat' ? <Users size={16} /> : <ChevronLeft size={16} />}
          </button>

          <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
            {activeChannel.type === 'company' && <Building2 size={18} />}
            {activeChannel.type === 'project' && <HardHat size={18} />}
            {activeChannel.type === 'hms' && <AlertTriangle size={18} />}
            {activeChannel.type === 'dm' && <User size={18} />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white truncate flex items-center gap-1.5">
                <span>{activeChannel.name}</span>
                {activeChannel.type === 'project' && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Byggeplass
                  </span>
                )}
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
              {activeChannel.description}
            </p>
          </div>
        </div>

        {/* Høyre toppkontroller */}
        <div className="flex items-center gap-1.5">
          {/* Spør MesterAI i samtalen */}
          <button
            type="button"
            onClick={handleAskMesterAiDirectly}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-electric-600 hover:from-purple-500 hover:to-electric-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer border border-purple-400/40"
            title="Kall på MesterAI for å gi råd i chatten"
          >
            <Sparkles size={14} className="text-amber-300 animate-pulse" />
            <span>@MesterAI i chatten</span>
          </button>

          {/* Søk i meldinger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={cn(
              "p-2 rounded-xl border transition-colors cursor-pointer",
              isSearchOpen ? "bg-purple-600/20 text-purple-300 border-purple-500/40" : "bg-slate-800 text-slate-400 hover:text-white border-slate-750"
            )}
            title="Søk i samtalehistorikk"
          >
            <Search size={15} />
          </button>

          {/* Medlemsliste / Telefonbok for kanalen */}
          <button
            type="button"
            onClick={() => setIsMembersModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-750 text-xs font-bold transition-colors cursor-pointer"
            title="Se hvem som er med i kanalen og ring direkte"
          >
            <Users size={15} className="text-cyan-400" />
            <span className="hidden sm:inline">Deltakere</span>
          </button>
        </div>
      </div>

      {/* 2. Søkelinje (ved klikk på søk) */}
      {isSearchOpen && (
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 animate-in fade-in">
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
              className="p-1 text-slate-400 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* 3. Festede meldinger banner (hvis noen er festet) */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 bg-purple-950/40 border-b border-purple-900/40 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-purple-300 min-w-0">
            <Pin size={13} className="shrink-0 text-amber-400 fill-amber-400" />
            <span className="font-bold text-[11px] text-amber-300 shrink-0">Festet beskjed:</span>
            <p className="truncate text-slate-300 font-medium">
              {pinnedMessages[pinnedMessages.length - 1].content}
            </p>
          </div>
          <span className="text-[10px] text-purple-400/80 shrink-0">
            {pinnedMessages.length} festet
          </span>
        </div>
      )}

      {/* 4. Hovedkropp: Split view (Kanaler til venstre på desktop, samtale til høyre) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Venstre kanal- og kontaktliste */}
        <div className={cn(
          "w-full md:w-72 lg:w-80 border-r border-slate-800 bg-slate-900/70 flex flex-col shrink-0 overflow-y-auto custom-scrollbar",
          mobileTab === 'list' ? "flex" : "hidden md:flex"
        )}>
          {/* Seksjon: Kanaler */}
          <div className="p-3 border-b border-slate-800/80">
            <div className="px-2 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Sammendrag & Kanaler</span>
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
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer group",
                      isActive
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                      isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 group-hover:text-purple-300"
                    )}>
                      {ch.type === 'company' && <Building2 size={13} />}
                      {ch.type === 'project' && <HardHat size={13} />}
                      {ch.type === 'hms' && <AlertTriangle size={13} className="text-amber-400" />}
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

          {/* Seksjon: Direktemeldinger / Prosjektkolleger */}
          <div className="p-3 flex-1">
            <div className="px-2 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Direktemeldinger (1-til-1)</span>
              <span className="text-emerald-400 text-[10px]">{projectContacts.length} kontakter</span>
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
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer group",
                      isActive
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                      isActive ? "bg-white text-purple-900" : "bg-slate-800 text-purple-300 border border-slate-750"
                    )}>
                      {dm.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate">{dm.name}</p>
                      </div>
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

        {/* Høyre spalte: Meldingsfeed og inntasting */}
        <div className={cn(
          "flex-1 flex flex-col bg-slate-950 overflow-hidden",
          mobileTab === 'chat' ? "flex" : "hidden md:flex"
        )}>
          {/* Meldingsstrøm */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4 [touch-action:pan-y]">
            {filteredMessages.length === 0 ? (
              <div className="py-14 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
                  <MessageSquare size={22} />
                </div>
                <h4 className="text-sm font-bold text-white">Ingen meldinger ennå i {activeChannel.name}</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Vær den første til å dele en oppdatering, et byggeplassbilde eller stille et spørsmål til teamet!
                </p>
              </div>
            ) : (
              filteredMessages.map((msg, idx) => {
                const isMe = msg.senderId === user?.id || msg.senderCategory === 'admin' && user?.role === 'admin';
                const isAi = msg.isAiGenerated || msg.senderCategory === 'ai';

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
                      {isAi ? (
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
                        >
                          <span>{msg.senderName}</span>
                          {msg.senderRole && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({msg.senderRole})
                            </span>
                          )}
                        </button>
                      )}
                      <span className="text-[10px] text-slate-400">{msg.formattedTime}</span>
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
                        "p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[94%] sm:max-w-[85%] shadow-md relative group",
                        isAi
                          ? "bg-slate-900 border border-purple-500/40 text-slate-100 rounded-tl-xs"
                          : isMe
                          ? "bg-gradient-to-r from-purple-700 to-electric-600 text-white rounded-tr-xs"
                          : "bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-xs"
                      )}
                    >
                      {/* Hurtigtags visning */}
                      {msg.quickTag && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/30 text-amber-300 font-bold text-[10px] uppercase tracking-wider mb-2 border border-white/10">
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

                      {/* Tekstinnhold */}
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Emojireaksjoner */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-white/10">
                          {Object.entries(msg.reactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="px-2 py-0.5 rounded-lg bg-black/30 hover:bg-black/50 border border-white/15 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer transition-colors"
                              title={`Reagert av: ${users.join(', ')}`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] text-slate-300">{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Hurtigverktøy ved hover på melding (Fest og reaksjon) */}
                      <div className={cn(
                        "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-1.5 py-1 shadow-lg z-10",
                        isMe ? "-left-20" : "-right-20"
                      )}>
                        <button
                          type="button"
                          onClick={() => handleTogglePin(msg.id)}
                          className="p-1 text-slate-400 hover:text-amber-400 rounded-md transition-colors cursor-pointer"
                          title={msg.isPinned ? "Løsne beskjed" : "Fest beskjed øverst"}
                        >
                          <Pin size={12} className={msg.isPinned ? "fill-amber-400 text-amber-400" : ""} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, '👍')}
                          className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer text-xs"
                          title="Gi tommel opp"
                        >
                          👍
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, '🔨')}
                          className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer text-xs"
                          title="Bygge-reaksjon"
                        >
                          🔨
                        </button>
                      </div>
                    </div>
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

          {/* 5. Felt-hurtigknapper (1-klikk feltknapper for byggeplassen) */}
          <div className="px-3 pt-2 bg-slate-900/90 border-t border-slate-850 overflow-x-auto custom-scrollbar flex items-center gap-1.5 pb-1 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-1">
              Felt:
            </span>
            {QUICK_TAGS.map(tag => {
              const Icon = tag.icon;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleSendMessage(tag.text, tag.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-medium shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  <Icon size={12} className="text-purple-400 shrink-0" />
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>

          {/* 6. Inntastingsfelt for melding */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0 space-y-2">
            {/* Forhåndsvisning av vedlagt bilde */}
            {attachedImage && (
              <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-purple-500/40 w-fit">
                <img src={attachedImage} alt="Klargjort bilde" className="w-10 h-10 rounded-lg object-cover" />
                <span className="text-xs text-purple-300 font-medium">Bilde klart for sending</span>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Skjult fil-opplasting for kamera/galleri */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
              />

              {/* Kamera / Bildeknapp */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-750 transition-colors cursor-pointer shrink-0"
                title="Ta bilde eller legg ved bilde fra byggeplassen"
              >
                <Camera size={17} className="text-purple-400" />
              </button>

              {/* Mikrofon tale-diktering */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={cn(
                  "p-2.5 rounded-xl border transition-all cursor-pointer shrink-0",
                  isRecording
                    ? "bg-rose-600 text-white border-rose-500 animate-pulse shadow-md"
                    : "bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-750"
                )}
                title={isRecording ? "Trykk for å stoppe diktering" : "Snakk inn beskjed (tale-til-tekst)"}
              >
                {isRecording ? <MicOff size={17} /> : <Mic size={17} className="text-emerald-400" />}
              </button>

              {/* Tekstfelt */}
              <input
                type="text"
                placeholder={isRecording ? "Lytter... snakk nå..." : `Skriv melding til ${activeChannel.name}...`}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />

              {/* Sendknapp */}
              <button
                type="submit"
                disabled={!inputVal.trim() && !attachedImage}
                className={cn(
                  "p-2.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer shadow-md",
                  (inputVal.trim() || attachedImage)
                    ? "bg-purple-600 hover:bg-purple-500 text-white"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                )}
                title="Send melding"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 7. Modal: Deltakere / Telefonbok i aktiv kanal */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
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
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.role} • {c.companyName || 'Internt'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                          title={`Ring ${c.name} (${c.phone})`}
                        >
                          <Phone size={13} />
                        </a>
                      )}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
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
