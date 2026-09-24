'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  Camera, 
  X, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Minus, 
  Copy, 
  Check, 
  Building2, 
  Layers, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  Bot, 
  User as UserIcon,
  ChevronDown,
  ArrowRight,
  Zap,
  CheckCircle2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { formatAiMarkdown } from '../lib/formatAiMarkdown';
import { formatUserMessage } from './MesterAIAgentFrame';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  quickReplies?: Array<{ title: string; payload: string }>;
  imageUrl?: string;
  isActionSuccess?: boolean;
}

interface MesterAICopilotProps {
  user?: any;
  currentView?: string;
  activeModuleTab?: string | null;
  selectedProject?: any;
  projects?: any[];
  onOpenModule?: (moduleTab: string) => void;
}

export default function MesterAICopilot({
  user,
  currentView = 'dashboard',
  activeModuleTab = null,
  selectedProject,
  projects = [],
  onOpenModule
}: MesterAICopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('MesterAI tenker og analyserer...');
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ url: string; preview: string; name?: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lastLiveAction, setLastLiveAction] = useState<{ title: string; time: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const loadingTimerRef = useRef<any>(null);

  const userName = user?.displayName || user?.name || 'Byggmester';
  const userTrade = user?.trade || 'carpenter';
  const companyName = user?.company || 'VikingMester';
  const currentProjName = selectedProject?.name || null;

  // 🎯 Generer dynamisk velkomst og hurtigvalg basert på aktiv fane, modul og prosjekt
  const contextualGreeting = useMemo(() => {
    const timeStr = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    const projLabel = currentProjName ? `på **${currentProjName}**` : '';

    if (activeModuleTab === 'dailylog') {
      return {
        id: 'context-dailylog',
        role: 'assistant' as const,
        content: `Hei ${userName}! 👋 Du står i **Byggedagbok & Timer** ${projLabel}.\n\nJeg kan loggføre timer direkte via stemme eller tekst, hente dagens værforhold fra Yr, eller registrere mannskapslister. Hva vil du føre nå?`,
        timestamp: timeStr,
        quickReplies: [
          { title: '⏱️ Før 7,5 timer i dag', payload: `Før 7.5 timer i dag${currentProjName ? ` på ${currentProjName}` : ''}` },
          { title: '🌤️ Hent vær til dagboken', payload: `Hent værdata og HMS-forhold for ${currentProjName || 'byggeplassen'}` },
          { title: '👥 Registrer mannskap', payload: `Registrer mannskap i byggedagboken${currentProjName ? ` for ${currentProjName}` : ''}` },
          { title: '📋 Vis ledergodkjenning', payload: 'Vis timegodkjenning for leder' }
        ]
      };
    }

    if (activeModuleTab === 'deviations') {
      return {
        id: 'context-deviations',
        role: 'assistant' as const,
        content: `Hei ${userName}! 🚨 Du er i **Avvik & RUH** ${projLabel}.\n\nSer du en feil eller skade? Ta et bilde med mobilen eller forklar hva som har skjedd, så sjekker jeg TEK17-krav og oppretter avvikssaken direkte!`,
        timestamp: timeStr,
        quickReplies: [
          { title: '📸 Analyser bilde/avvik', payload: `Meld inn et avvik på ${currentProjName || 'prosjektet'}` },
          { title: '💧 Fuktskade / underlag', payload: `Opprett avvik på fuktskade og manglende tildekking på ${currentProjName || 'byggeplass'}` },
          { title: '📐 Sjekk TEK17 toleranser', payload: 'Hva er toleransekravene i TEK17 for overflater og fall?' },
          { title: '🛡️ Lukkesperre-kontroll', payload: `Sjekk lukkesperre før kledning på ${currentProjName || 'prosjektet'}` }
        ]
      };
    }

    if (activeModuleTab === 'sja') {
      return {
        id: 'context-sja',
        role: 'assistant' as const,
        content: `Hei ${userName}! 🦺 Du er i **Sikker Jobb Analyse (SJA)** ${projLabel}.\n\nHvilket risikofylt arbeid skal dere i gang med? Fortell meg om stillas, varme arbeider, taktekking eller grøft, så genererer jeg godkjente vernetiltak og SJA umiddelbart!`,
        timestamp: timeStr,
        quickReplies: [
          { title: '🪜 SJA Stillas & Høyde', payload: `Opprett SJA for arbeid i stillas og fasadekledning på ${currentProjName || 'byggeplassen'}` },
          { title: '🔥 SJA Varme arbeider', payload: `Opprett SJA for varme arbeider med brannvakt på ${currentProjName || 'byggeplassen'}` },
          { title: '⚡ SJA El-frakobling', payload: `Opprett SJA for frakobling og spenningsløst arbeid på ${currentProjName || 'byggeplassen'}` },
          { title: '🌧️ Stillas i nedbør/vind', payload: `Lag SJA for stillasarbeid i regnvær og vind på ${currentProjName || 'byggeplassen'}` }
        ]
      };
    }

    if (activeModuleTab === 'change_orders') {
      return {
        id: 'context-change_orders',
        role: 'assistant' as const,
        content: `Hei ${userName}! 📋 Du er i **Endringsordrer & Varsler (NS 8406)** ${projLabel}.\n\nHar kunden bestilt ekstraarbeider eller oppstått uforutsette bygningsforhold? Beskriv saken, så setter jeg opp formelt varsel, timekalkyle og krav om fristforlengelse!`,
        timestamp: timeStr,
        quickReplies: [
          { title: '⚡ Varsle endringsordre', payload: `Opprett endringsordre på ${currentProjName || 'prosjektet'}: ` },
          { title: '💰 Beregn tilleggskrav', payload: `Beregne krav og fristforlengelse for endring på ${currentProjName || 'prosjektet'}` },
          { title: '⚖️ NS 8406 fristregler', payload: 'Hva er varslingsfristene for endringsordrer i NS 8406?' }
        ]
      };
    }

    if (activeModuleTab === 'offers') {
      return {
        id: 'context-offers',
        role: 'assistant' as const,
        content: `Hei ${userName}! 📝 Du er i **Pristilbud & Kalkyle**.\n\nHva skal vi prise? Beskriv arbeidet (f.eks. oppussing av bad, terrasse 25 m², tilbygg eller maling), så setter jeg opp spesifiserte tilbudsposter med materiell og arbeid!`,
        timestamp: timeStr,
        quickReplies: [
          { title: '🚿 Tilbud bad 6 m²', payload: 'Sett opp tilbud på totalrenovering av bad 6 m2 iht BVN' },
          { title: '🔨 Tilbud terrasse 30 m²', payload: 'Sett opp tilbud på bygging av terrasse 30 m2 med rekkverk' },
          { title: '🏠 Etterisolering & kledning', payload: 'Lag et tilbud på etterisolering og ny kledning med 15% påslag' },
          { title: '📦 Hent NOBB-priser', payload: 'Hvordan henter jeg veiledende materialpriser fra NOBB?' }
        ]
      };
    }

    if (activeModuleTab === 'hms') {
      return {
        id: 'context-hms',
        role: 'assistant' as const,
        content: `Hei ${userName}! 🛡️ Du er i **HMS & Internkontroll** ${projLabel}.\n\nTrenger du hjelp med vernerunder, stoffkartotek for kjemikalier eller HMS-krav fra Arbeidstilsynet? Spør meg om hva som helst!`,
        timestamp: timeStr,
        quickReplies: [
          { title: '📋 Vernerunde sjekkliste', payload: `Klargjør vernerunde sjekkliste for ${currentProjName || 'byggeplassen'}` },
          { title: '🗂️ Åpne stoffkartotek', payload: 'Hvilke datablader og kjemikalier må vi ha i stoffkartoteket?' },
          { title: '🦺 Krav til fallsikring', payload: 'Hva er Arbeidstilsynets krav til fallsikring og rekkverkshøyde?' }
        ]
      };
    }

    // Standard velkomst (prosjektoversikt, dashboard eller andre visninger)
    return {
      id: 'context-general',
      role: 'assistant' as const,
      content: currentProjName 
        ? `Hei ${userName}! 👋 Jeg er **MesterAI**, din autonome pilot for **${currentProjName}**.\n\nJeg kan utføre alt fra timeføring og SJA til endringsvarsler og TEK17-sjekk. Hva skal gjøres?`
        : `Hei ${userName}! 👋 Jeg er **MesterAI**, din helautonome prosjektpilot for **${companyName}**.\n\nHele systemet snakker sammen i sanntid. Du kan be meg om å føre timer, lage SJA, melde avvik eller varsle endringer. Hva vil du utføre?`,
      timestamp: timeStr,
      quickReplies: [
        { title: '⏱️ Før 7,5 timer i dag', payload: `Før 7.5 timer i dag${currentProjName ? ` på ${currentProjName}` : ''}` },
        { title: '🛡️ Opprett ny SJA', payload: `Opprett en ny SJA${currentProjName ? ` for ${currentProjName}` : ''}` },
        { title: '🚨 Meld avvik (RUH)', payload: `Meld inn et nytt avvik${currentProjName ? ` på ${currentProjName}` : ''}` },
        { title: '📊 Sjekk prosjektstatus', payload: `Hva er status og fremdrift${currentProjName ? ` på ${currentProjName}` : ''}?` }
      ]
    };
  }, [userName, companyName, currentProjName, activeModuleTab]);

  const [messages, setMessages] = useState<CopilotMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('mester_copilot_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [contextualGreeting];
  });

  // Oppdater velkomstmelding dersom fane endres og brukeren ikke har en lang pågående dialog
  useEffect(() => {
    if (messages.length <= 1) {
      setMessages([contextualGreeting]);
    }
  }, [contextualGreeting]);

  // Lagre historikk
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        sessionStorage.setItem('mester_copilot_history', JSON.stringify(messages));
      } catch {}
    }
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Tastatursnarvei: Ctrl+M eller Cmd+K for å åpne/lukke Copilot overalt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lytter til globale eventer: "mesterai:open-copilot" med valgfri startmelding
  useEffect(() => {
    const handleOpenTrigger = (e: any) => {
      setIsOpen(true);
      setIsMinimized(false);
      const prompt = e?.detail?.prompt;
      if (prompt && typeof prompt === 'string') {
        setTimeout(() => handleSendMessage(prompt), 250);
      }
    };
    window.addEventListener('mesterai:open-copilot', handleOpenTrigger);
    return () => window.removeEventListener('mesterai:open-copilot', handleOpenTrigger);
  }, [selectedProject, activeModuleTab]);

  // Bildeopplasting
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vennligst velg en gyldig bildefil');
      return;
    }

    setIsUploadingImage(true);
    toast.info('Laster opp foto til MesterAI...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Opplasting feilet');
      const data = await res.json();
      setAttachedImage({
        url: data.url,
        preview: URL.createObjectURL(file),
        name: file.name
      });
      toast.success('Bilde klart! Send inn for analyse.');
    } catch (err: any) {
      toast.error('Feil ved bildeopplasting: ' + err.message);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Tale (Speech-to-text)
  const toggleMic = () => {
    if (isListeningMic) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListeningMic(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Nettleseren støtter ikke direkte stemmegjenkjenning.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'nb-NO';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListeningMic(true);
        toast.info('🎙️ Lytter... Snakk inn oppgaven din nå');
      };

      rec.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        if (spoken) {
          setInputVal(prev => (prev ? `${prev} ${spoken}` : spoken));
        }
      };

      rec.onerror = () => setIsListeningMic(false);
      rec.onend = () => setIsListeningMic(false);

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  // Send melding til MesterAI backend proxy
  const handleSendMessage = async (textToSend: string, imageOverride?: string) => {
    const activeImage = imageOverride || attachedImage?.url;
    const currentPreview = attachedImage?.preview;

    if ((!textToSend.trim() && !activeImage) || isLoading) return;

    setAttachedImage(null);

    const userMsgText = formatUserMessage(textToSend.trim()) || (activeImage ? 'Vennligst analyser dette bildet for fagmessig utførelse og TEK17.' : '');

    const userMsg: CopilotMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      imageUrl: currentPreview || activeImage
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    if (textareaRef.current) textareaRef.current.style.height = '42px';

    // 📶 Sjekk om enheten er offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setMessages(prev => [
        ...prev,
        {
          id: `offline-${Date.now()}`,
          role: 'assistant',
          content: `📶 **Du er for øyeblikket frakoblet (uten nettdekning).**\n\nDu kan trygt fortsette å jobbe i VikingMester: Fyll ut sjekklister, knips avviksbilder, se stoffkartoteket og før timer direkte i modulene. Alt lagres trygt lokalt på enheten og **synkroniseres automatisk til databasen** så snart du får dekning igjen!\n\n*(MesterAI nettsky-analyser kobler seg på igjen automatisk så fort nettverket er tilbake).*`,
          timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return;
    }

    setIsLoading(true);

    // 🚀 Start live statusHUD
    const stages = activeImage
      ? ['Analyserer bildet med AI-syn og TEK17...', 'Sjekker detaljer og utførelse...', 'Ferdigstiller rapport...']
      : textToSend.toLowerCase().includes('time') 
        ? ['Beregner timer og oppgave...', 'Kobler mot byggedagboken...', 'Registrerer i VikingMester...']
        : textToSend.toLowerCase().includes('sja')
          ? ['Vurderer risikofaktorer...', 'Strukturerer vernetiltak...', 'Oppretter SJA i KS-systemet...']
          : textToSend.toLowerCase().includes('avvik')
            ? ['Vurderer TEK17-avvik...', 'Klargjør strakstiltak...', 'Logger avvik i systemet...']
            : ['MesterAI tenker og analyserer...', 'Behandler data i VikingMester...', 'Ferdigstiller svar...'];

    setLoadingStage(stages[0]);
    if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    let stageIdx = 0;
    loadingTimerRef.current = setInterval(() => {
      stageIdx++;
      if (stageIdx < stages.length) setLoadingStage(stages[stageIdx]);
      else clearInterval(loadingTimerRef.current);
    }, 2400);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: textToSend.trim() || userMsgText,
          sessionId: `copilot-${user?.id || 'guest'}`,
          projectName: currentProjName,
          projectId: selectedProject?.id,
          availableProjects: projects.map(p => ({ id: p.id, name: p.name, code: p.code })),
          userName,
          userTrade,
          companyName,
          userId: user?.id,
          imageUrl: activeImage
        })
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();

      const assistantMsg: CopilotMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Forespørselen er utført.',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        quickReplies: data.quickReplies,
        isActionSuccess: !!data.timeEntry
      };

      setMessages(prev => [...prev, assistantMsg]);

      // ⚡ LIVE SYSTEMOPPDATERING: Send globalt event slik at dashboardet og åpne moduler oppdateres direkte
      if (data.timeEntry) {
        setLastLiveAction({
          title: `⏱️ ${Number(data.timeEntry.hours || 7.5).toFixed(1)}t ført i byggedagboken!`,
          time: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
        });
        window.dispatchEvent(new CustomEvent('mester_live_data_updated', {
          detail: { type: 'time_logged', timeEntry: data.timeEntry }
        }));
        toast.success(`⏱️ ${Number(data.timeEntry.hours || 7.5).toFixed(1)} timer er bokført på ${data.timeEntry.projectName || currentProjName || 'prosjektet'}!`);
      } else {
        window.dispatchEvent(new CustomEvent('mester_live_data_updated', {
          detail: { type: 'agent_action_completed', payload: textToSend }
        }));
      }

    } catch (err: any) {
      console.error('Copilot feil:', err);
      toast.error('Kunne ikke nå MesterAI: ' + err.message);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Beklager, det oppstod en midlertidig feil under behandlingen. Vennligst prøv igjen.',
          timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    try {
      sessionStorage.removeItem('mester_copilot_history');
    } catch {}
    setMessages([contextualGreeting]);
    setInputVal('');
    toast.success('Samtalesession nullstilt');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Kopiert til utklippstavlen');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* 🚀 1. FLYTENDE LAUNCHER-KNAPP (Alltid tilgjengelig nede i høyre hjørne) */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2"
        >
          {lastLiveAction && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-lg backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{lastLiveAction.title}</span>
            </motion.div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-electric-600 via-electric-500 to-indigo-600 hover:from-electric-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-2xl hover:shadow-electric-500/30 transition-all duration-300 cursor-pointer border border-electric-400/40"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
            </span>
            <Sparkles size={16} className="text-amber-300 animate-pulse" />
            <span className="tracking-wide">MesterAI Pilot</span>
            <span className="hidden md:inline text-[10px] font-mono opacity-70 bg-black/30 px-1.5 py-0.5 rounded-md">
              Ctrl+M
            </span>
          </button>
        </motion.div>
      )}

      {/* 🚀 2. MINIMERT DOCK-STATUS */}
      {isOpen && isMinimized && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 p-2 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl"
        >
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-electric-600/20 hover:bg-electric-600/30 text-electric-300 text-xs font-bold transition-all cursor-pointer"
          >
            <Sparkles size={15} className="text-amber-400" />
            <span>MesterAI Pilot</span>
            {currentProjName && (
              <span className="text-[11px] text-slate-400 truncate max-w-[130px]">({currentProjName})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
          >
            <X size={15} />
          </button>
        </motion.div>
      )}

      {/* 🚀 3. COPILOT HOVEDVINDU (Side-drawer / Floating Copilot) */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed z-50 bg-[#0A101D] border border-slate-800 shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl transition-all duration-300",
              isFullscreen
                ? "inset-2 sm:inset-4 rounded-3xl"
                : "bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-32px)] sm:w-[480px] h-[640px] max-h-[calc(100vh-32px)] rounded-3xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 shrink-0 select-none">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-electric-500 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-white truncate">MesterAI Pilot</h3>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Autonom</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {currentProjName ? `Byggeplass: ${currentProjName}` : `Bedrift: ${companyName}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  title="Nullstill samtale"
                  onClick={handleClearHistory}
                  className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  type="button"
                  title={isFullscreen ? "Minimer vindu" : "Fullskjerm"}
                  onClick={() => setIsFullscreen(prev => !prev)}
                  className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-all hidden sm:block"
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button
                  type="button"
                  title="Minimer til dock"
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  <Minus size={14} />
                </button>
                <button
                  type="button"
                  title="Lukk MesterAI"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* LIVE ACTION STATUS HUD BANNER */}
            {isLoading && (
              <div className="bg-electric-950/80 border-b border-electric-500/30 px-4 py-2 flex items-center justify-between text-xs text-electric-300 font-bold shrink-0 animate-pulse">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-electric-400 animate-ping" />
                  <span className="truncate">{loadingStage}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider bg-electric-500/20 px-2 py-0.5 rounded-full border border-electric-400/30 shrink-0">
                  Live MCP
                </span>
              </div>
            )}

            {/* Meldingsliste */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 custom-scrollbar"
            >
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col gap-1.5 max-w-[88%]",
                      isUser ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold px-1">
                      {isUser ? (
                        <>
                          <span>Du</span>
                          <span>•</span>
                          <span>{m.timestamp}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} className="text-amber-400" />
                          <span className="text-slate-300">MesterAI</span>
                          <span>•</span>
                          <span>{m.timestamp}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={cn(
                        "p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm relative group",
                        isUser
                          ? "bg-electric-600 text-white rounded-br-xs"
                          : "bg-slate-900/90 text-slate-100 border border-slate-800 rounded-bl-xs"
                      )}
                    >
                      {/* Bildevedlegg i meldingen */}
                      {m.imageUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-white/20 max-w-[220px]">
                          <img src={m.imageUrl} alt="Vedlegg" className="w-full h-auto object-cover" />
                        </div>
                      )}

                      {/* Selve teksten */}
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <div className="prose prose-invert prose-xs sm:prose-sm max-w-none space-y-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {formatAiMarkdown(m.content)}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Kopieringsknapp for assistentmeldinger */}
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.content)}
                          className="absolute bottom-2 right-2 p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Kopier svar"
                        >
                          {copiedId === m.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>

                    {/* Hurtigvalg (Quick Replies) */}
                    {m.quickReplies && m.quickReplies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {m.quickReplies.map((qr, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleSendMessage(qr.payload)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-electric-600/30 border border-slate-700 hover:border-electric-500/50 text-slate-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <span>{qr.title}</span>
                            <ArrowRight size={11} className="opacity-60" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Input-seksjon */}
            <div className="p-3 bg-slate-900/95 border-t border-slate-800 shrink-0 space-y-2">
              {/* Forhåndsvisning av vedlagt bilde */}
              {attachedImage && (
                <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-xl border border-slate-700 w-fit">
                  <img src={attachedImage.preview} alt="Vedlegg" className="w-8 h-8 rounded-lg object-cover" />
                  <span className="text-xs text-slate-300 truncate max-w-[150px]">{attachedImage.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 hover:text-rose-400 text-slate-400"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-1.5 bg-slate-950 border border-slate-800 focus-within:border-electric-500/60 rounded-2xl p-1.5 shadow-inner">
                {/* Kamera / Bildeopplasting */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageSelect} 
                />
                <button
                  type="button"
                  title="Ta bilde eller last opp foto for TEK17-visjon"
                  disabled={isUploadingImage || isLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-electric-300 hover:bg-slate-800/80 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Camera size={17} />
                </button>

                {/* Mikrofon (Speech-to-text) */}
                <button
                  type="button"
                  title="Snakk inn oppgaven (Mikrofon)"
                  onClick={toggleMic}
                  className={cn(
                    "p-2 rounded-xl transition-all cursor-pointer",
                    isListeningMic 
                      ? "bg-rose-500/30 text-rose-400 animate-pulse border border-rose-500/50" 
                      : "text-slate-400 hover:text-amber-300 hover:bg-slate-800/80"
                  )}
                >
                  {isListeningMic ? <MicOff size={17} /> : <Mic size={17} />}
                </button>

                {/* Tekstfelt */}
                <textarea
                  ref={textareaRef}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(inputVal);
                    }
                  }}
                  placeholder={
                    activeModuleTab === 'dailylog'
                      ? "F.eks: 'Før 7.5 timer i dag på Vidjeveien'..."
                      : activeModuleTab === 'deviations'
                        ? "Beskriv avvik eller spør om TEK17..."
                        : activeModuleTab === 'sja'
                          ? "F.eks: 'Lag SJA for stillas i regn'..."
                          : "Be MesterAI om hva som helst..."
                  }
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-white text-xs sm:text-sm placeholder-slate-500 resize-none outline-none py-1.5 px-1 max-h-32 min-h-[36px]"
                />

                {/* Send-knapp */}
                <button
                  type="button"
                  disabled={(!inputVal.trim() && !attachedImage) || isLoading}
                  onClick={() => handleSendMessage(inputVal)}
                  className="p-2 bg-electric-600 hover:bg-electric-500 disabled:bg-slate-800 text-white disabled:text-slate-600 rounded-xl transition-all shadow-md cursor-pointer shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                <span>Enter for å sende • Shift+Enter for ny linje</span>
                <span className="flex items-center gap-1">
                  <Zap size={10} className="text-emerald-400" />
                  100% Autonom
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
