import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  X, 
  RotateCcw, 
  FileText, 
  ShieldAlert, 
  Camera, 
  Copy, 
  Check, 
  ChevronRight, 
  Building2,
  Minimize2,
  Maximize2,
  Minus,
  HardHat,
  MessageSquare,
  ArrowRight,
  Phone,
  Mail,
  User,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

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
  }>;
  followUpPrompts?: string[];
  needsProjectSelection?: boolean;
  availableProjects?: Array<{
    id: string;
    name: string;
    projectCode?: string;
  }>;
}

interface VikingChatbotProps {
  user?: any;
  projects?: any[];
  activeProject?: any;
  currentView?: string;
  onOpenOfferModal?: (data?: any) => void;
  onOpenChangeOrderModal?: (data?: any) => void;
  onOpenSJAModal?: (data?: any) => void;
  onOpenAIVision?: () => void;
  onOpenPricing?: () => void;
  onOpenRegister?: () => void;
}

export default function VikingChatbot({
  user,
  projects = [],
  activeProject,
  currentView,
  onOpenOfferModal,
  onOpenChangeOrderModal,
  onOpenSJAModal,
  onOpenAIVision,
  onOpenPricing,
  onOpenRegister
}: VikingChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLeadDrawer, setShowLeadDrawer] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', company: '', phone: '', email: '' });
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  const isAuthenticated = !!user;
  const userName = user?.displayName || user?.name || user?.email?.split('@')[0] || 'Byggmester';
  const userCompany = user?.company || 'Mester Entreprenør AS';

  // Initial welcome message based on auth status
  const getInitialMessages = (): ChatMessage[] => {
    const timeStr = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    if (isAuthenticated) {
      return [
        {
          id: 'welcome-auth',
          role: 'assistant',
          content: `Hei **${userName}**! Jeg er **MesterAI**, din autonome lederassistent for **${userCompany}**.\n\nHele systemet snakker sammen i sanntid. Hva vil du utføre i dag?\n- 📄 **Endringsordre (NS 8406):** Varsle tilleggsarbeid og sikre fristforlengelse\n- 🛡️ **Sikker Jobb Analyse (SJA):** Lovpålagt risikovurdering og vernetiltak\n- 📝 **Tilbud & Kalkyle:** Rask prising med timepriser, materiell og påslag\n- 📖 **Byggedagbok:** Føre dagboken direkte med stemme eller tekst\n- 📐 **TEK17 & Lukkesperre:** Verifisere fall mot sluk og godkjenninger før lukking\n\n*Tips: Hvis du ikke oppgir hvilket prosjekt det gjelder, vil jeg spørre deg før handlingen lagres!*`,
          timestamp: timeStr,
          followUpPrompts: [
            'Opprett en endringsordre iht. NS 8406',
            'Lag en SJA for stillasarbeid',
            'Før 6 timer tømrerarbeid i byggedagboken',
            'Hva er kravene til fall mot sluk i TEK17?'
          ]
        }
      ];
    } else {
      return [
        {
          id: 'welcome-guest',
          role: 'assistant',
          content: `Hei! Jeg er **Ragnar**, den offisielle autonome AI-rådgiveren for **VikingMester AS**.\n\nVikingMester er Norges ledende autonome KS/HMS- og prosjektstyringssystem for bygg- og anleggsbransjen. Vi fjerner **80% av papirarbeidet** for håndverkere og entreprenører.\n\n- 🚀 **14 dagers gratis prøveperiode** (umiddelbar oppstart, ingen bindingstid)\n- 📄 **Automatisk NS 8406:** Sikrer deg mot tapte tilleggskrav på byggeplassen\n- 📸 **TEK17 Visjon & Lukkesperre:** AI-kontroll av sluk, membran og rør før lukking\n- 💰 **Priser (eks. mva):** Solo kr **1.490,-/mnd**, Team kr **3.490,-/mnd**, Total kr **6.900,-/mnd**\n\nHva lurer du på, eller vil du teste en gratis prøveperiode?`,
          timestamp: timeStr,
          followUpPrompts: [
            'Hva koster VikingMester?',
            'Hvordan fungerer 14 dagers gratis prøveperiode?',
            'Hvordan sikrer dere mot tapte tillegg i NS 8406?',
            'Hvordan fungerer TEK17-visjonsanalysen?'
          ]
        }
      ];
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const key = isAuthenticated ? 'viking_chat_auth_history' : 'viking_chat_guest_history';
        const saved = sessionStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return getInitialMessages();
  });

  // Re-initialize if auth status changes
  useEffect(() => {
    try {
      const key = isAuthenticated ? 'viking_chat_auth_history' : 'viking_chat_guest_history';
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}
    setMessages(getInitialMessages());
  }, [isAuthenticated, user?.email]);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        const key = isAuthenticated ? 'viking_chat_auth_history' : 'viking_chat_guest_history';
        sessionStorage.setItem(key, JSON.stringify(messages));
      } catch {}
    }
  }, [messages, isAuthenticated]);

  // Auto-scroll on new messages & modal opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading, isOpen, isMinimized]);

  // Handle send message
  const handleSendMessage = async (textToSend: string, additionalPayload: any = {}) => {
    const cleanText = textToSend.trim();
    if (!cleanText && !additionalPayload.leadData) return;
    if (isLoading) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: cleanText || 'Sendt kontaktdetaljer',
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputVal('');
    setIsLoading(true);

    try {
      const activeProj = activeProject || projects[0];
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // Extract conversation history for multi-turn context
      const historyPayload = newMessages
        .filter(m => !m.id.startsWith('welcome-'))
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          text: cleanText,
          history: historyPayload,
          projectId: additionalPayload.projectId || activeProj?.id || '',
          projectName: additionalPayload.projectName || activeProj?.name || '',
          leadData: additionalPayload.leadData || null
        })
      });

      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Takk for henvendelsen! Hvordan kan jeg hjelpe deg videre?',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: data.suggestedActions || [],
        followUpPrompts: data.followUpPrompts || [],
        needsProjectSelection: data.needsProjectSelection || false,
        availableProjects: data.availableProjects || []
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.leadCaptured) {
        toast.success('Henvendelse mottatt! En rådgiver kontakter deg innen kort tid.');
        setShowLeadDrawer(false);
      }
    } catch (err: any) {
      console.warn('[VikingChatbot] Feil under innsending:', err);
      // Fallback assistant response
      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: isAuthenticated 
          ? `Jeg har registrert henvendelsen din. Systemet oppdateres fortløpende. Vennligst prøv igjen om et øyeblikk dersom du ønsker å opprette en ny oppgave.`
          : `Takk for at du tar kontakt med VikingMester! Du kan nå oss direkte på **hei@vikingmester.no** eller ringe oss. Våre priser er Solo: kr 1.490,-/mnd, Team: kr 3.490,-/mnd og Total: kr 6.900,-/mnd eks. mva med 14 dagers gratis prøveperiode.`,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        followUpPrompts: isAuthenticated 
          ? ['Opprett endringsordre', 'Lag en SJA', 'Før byggedagbok']
          : ['Hva koster VikingMester?', 'Start gratis prøveperiode']
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit direct lead drawer form
  const handleSubmitLeadForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name && !leadForm.email && !leadForm.phone) {
      toast.error('Vennligst fyll inn navn og e-post eller telefonnummer');
      return;
    }

    setIsSubmittingLead(true);
    try {
      const summaryText = `Forespørsel om oppstart fra ${leadForm.name} (${leadForm.company || 'Bedrift'}). Tlf: ${leadForm.phone}, E-post: ${leadForm.email}.`;
      await handleSendMessage(summaryText, { leadData: leadForm });
      setLeadForm({ name: '', company: '', phone: '', email: '' });
      setShowLeadDrawer(false);
    } catch (e) {
      toast.error('Kunne ikke sende inn. Prøv igjen.');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Reset chat history
  const handleClearHistory = () => {
    if (window.confirm('Vil du nullstille samtalen og starte på nytt?')) {
      const initial = getInitialMessages();
      setMessages(initial);
      const key = isAuthenticated ? 'viking_chat_auth_history' : 'viking_chat_guest_history';
      sessionStorage.removeItem(key);
      toast.success('Samtalen er tilbakestilt');
    }
  };

  // Copy message text
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Kopiert til utklippstavlen!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle action buttons
  const handleActionClick = (action: any) => {
    if (action.type === 'open_change_order_modal') {
      if (onOpenChangeOrderModal) onOpenChangeOrderModal(action.data);
      else window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'change_order', data: action.data } }));
    } else if (action.type === 'open_sja_modal') {
      if (onOpenSJAModal) onOpenSJAModal(action.data);
      else window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'sja', data: action.data } }));
    } else if (action.type === 'open_offer_modal') {
      if (onOpenOfferModal) onOpenOfferModal(action.data);
      else window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'offers', data: action.data } }));
    } else if (action.type === 'open_ai_vision') {
      if (onOpenAIVision) onOpenAIVision();
      else window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'take_photo' } }));
    } else if (action.type === 'open_pricing') {
      if (onOpenPricing) onOpenPricing();
      else {
        window.location.hash = 'priser';
      }
    } else if (action.type === 'request_trial') {
      if (onOpenRegister) onOpenRegister();
      else setShowLeadDrawer(true);
    } else if (action.type === 'select_project') {
      handleSendMessage(`Gjelder prosjekt ${action.data.projectName}`, {
        projectId: action.data.projectId,
        projectName: action.data.projectName
      });
    }
  };

  // Speech recognition (Web Speech API)
  const toggleMic = () => {
    if (isListeningMic) {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
      setIsListeningMic(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error('Nettleseren din støtter dessverre ikke direkte stemmediktat. Bruk tastatur eller Chrome.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'nb-NO';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningMic(true);
        toast.info('🎙️ Lytter... Snakk inn instruksen eller spørsmålet ditt nå.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputVal(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start error:', e);
      setIsListeningMic(false);
    }
  };

  // Quick Chips
  const activeChips = isAuthenticated ? [
    '📄 Ny endringsordre (NS 8406)',
    '🛡️ Lag en SJA',
    '📝 Beregn tilbud',
    '📖 Før byggedagbok',
    '📐 Sjekk TEK17-krav'
  ] : [
    '💰 Hva koster VikingMester?',
    '🚀 14 dagers gratis prøveperiode',
    '📄 Hvordan fungerer NS 8406?',
    '📸 TEK17 Visjonskontroll',
    '🔒 Bindingstid og oppstart'
  ];

  const renderMessageContent = (content: string, isUser: boolean) => {
    if (isUser) {
      return (
        <div className="whitespace-pre-wrap font-sans text-white font-medium text-xs sm:text-sm">
          {content}
        </div>
      );
    }

    return (
      <div className="text-neutral-900 leading-relaxed font-sans text-xs sm:text-sm">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h3 className="text-base font-black text-neutral-950 mt-3 mb-1.5 pb-1 border-b border-neutral-200">
                {children}
              </h3>
            ),
            h2: ({ children }) => (
              <h4 className="text-sm font-black text-neutral-950 mt-3 mb-1 pb-0.5 border-b border-neutral-100 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-purple-600 rounded-full inline-block shrink-0" />
                {children}
              </h4>
            ),
            h3: ({ children }) => (
              <h5 className="text-xs sm:text-sm font-black text-neutral-950 mt-2.5 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-purple-600 rounded-full inline-block shrink-0" />
                {children}
              </h5>
            ),
            p: ({ children }) => (
              <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed my-1.5 first:mt-0 last:mb-0">
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-extrabold text-neutral-950">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-neutral-700">
                {children}
              </em>
            ),
            ul: ({ children }) => (
              <ul className="space-y-1 my-2 pl-0.5">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal space-y-1 my-2 pl-5 text-xs sm:text-sm text-neutral-800 font-medium">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-xs sm:text-sm text-neutral-800 flex items-start gap-2">
                <span className="text-purple-600 font-bold shrink-0 leading-5">•</span>
                <span className="flex-1">{children}</span>
              </li>
            ),
            hr: () => (
              <hr className="my-3 border-neutral-200" />
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-purple-500 bg-purple-50/80 pl-3 py-2 my-2 rounded-r-xl text-xs text-purple-950 font-medium shadow-2xs">
                💡 {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="px-1.5 py-0.5 rounded bg-purple-100/80 text-purple-900 font-mono text-[11px] font-bold">
                  {children}
                </code>
              ) : (
                <pre className="p-3 my-2 bg-neutral-900 text-neutral-100 rounded-xl text-xs font-mono overflow-x-auto">
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

  return (
    <>
      {/* 🚀 FLYTENDE KNAPP (LAV HØYRE, TILPASSET MOBIL & DESKTOP) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            className={cn(
              "fixed z-40 transition-all duration-300",
              // Plassert litt opp på mobil for å aldri overlappe MobileBottomNav
              "bottom-20 right-4 sm:bottom-6 sm:right-6"
            )}
          >
            <div className="relative group">
              {/* Tooltip on desktop hover */}
              <div className="hidden sm:block absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap bg-neutral-900/90 text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow-lg border border-neutral-700">
                {isAuthenticated ? `MesterAI: Autonom Agent (${userName})` : 'Spør Ragnar (VikingMester AI-Rådgiver)'}
              </div>

              {/* Pulserende glød-ring */}
              <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 opacity-70 blur-sm group-hover:opacity-100 transition duration-300 animate-pulse" />

              <button
                type="button"
                onClick={() => {
                  setIsOpen(true);
                  setIsMinimized(false);
                  setHasUnread(false);
                }}
                className={cn(
                  "relative flex items-center justify-center p-3.5 sm:p-4 rounded-full shadow-2xl transition-all duration-300 transform active:scale-95 cursor-pointer",
                  isAuthenticated 
                    ? "bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white border-2 border-purple-500/40 hover:border-purple-400" 
                    : "bg-gradient-to-br from-purple-700 via-indigo-700 to-neutral-900 text-white border-2 border-white/20 hover:border-white/40"
                )}
                aria-label="Åpne AI Chatbot"
              >
                {isAuthenticated ? (
                  <div className="relative flex items-center justify-center">
                    <Bot size={26} className="text-purple-300 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <Sparkles size={26} className="text-amber-300 group-hover:scale-110 transition-transform duration-300" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                    </span>
                  </div>
                )}
                
                {/* Knapp-etikett for mobil/desktop */}
                <span className="hidden sm:inline-block ml-2.5 font-bold text-sm text-white pr-1">
                  {isAuthenticated ? 'MesterAI' : 'Spør Ragnar'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 CHATBOT HOVEDVINDU (FULL SKJERM PÅ MOBIL / FLYTENDE KORT ELLER FULLSKJERM PÅ DESKTOP) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '70px' : undefined
            }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "fixed z-50 flex flex-col bg-white shadow-2xl border border-neutral-200 overflow-hidden transition-all duration-300",
              // Fullskjerm på PC (dekker hele skjermen / siden) vs standard flytende hjørne
              isFullscreen
                ? "inset-0 sm:inset-3 md:inset-5 sm:rounded-3xl sm:max-w-6xl sm:mx-auto sm:my-auto sm:h-[94vh]"
                : "inset-0 h-full sm:h-[650px] sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[440px] sm:max-h-[88vh] sm:rounded-3xl",
              isMinimized && "sm:h-[70px] sm:w-[320px] rounded-2xl"
            )}
          >
            {/* TOP BAR / HEADER */}
            <div 
              onClick={() => {
                if (isMinimized) setIsMinimized(false);
              }}
              className={cn(
                "flex items-center justify-between px-4 py-3.5 sm:px-5 border-b select-none",
                isMinimized && "cursor-pointer hover:bg-opacity-95",
                isAuthenticated 
                  ? "bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-white border-neutral-800" 
                  : "bg-gradient-to-r from-purple-900 via-indigo-900 to-neutral-900 text-white border-purple-800/40"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner",
                    isAuthenticated 
                      ? "bg-purple-950/80 border border-purple-500/30 text-purple-300" 
                      : "bg-indigo-950/80 border border-indigo-500/30 text-amber-300"
                  )}>
                    {isAuthenticated ? <Bot size={22} /> : <Sparkles size={22} />}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-neutral-900 rounded-full" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black tracking-tight text-white truncate">
                      {isAuthenticated ? 'MesterAI' : 'Ragnar'}
                    </h3>
                    <span className={cn(
                      "text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full",
                      isAuthenticated 
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    )}>
                      {isAuthenticated ? 'Autonom Agent' : 'AI-Rådgiver'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 truncate">
                    {isMinimized
                      ? 'Samtale minimert (klikk for å åpne)'
                      : (isAuthenticated 
                          ? `${userCompany} • ${activeProject?.name || 'Byggeleder i felt'}` 
                          : 'VikingMester AS • Svarer direkte')}
                  </p>
                </div>
              </div>

              {/* Handlingsknapper i header */}
              <div className="flex items-center gap-1">
                {!isAuthenticated && !isMinimized && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowLeadDrawer(!showLeadDrawer); }}
                    className="hidden sm:flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer mr-1"
                    title="Bli kontaktet / Start prøveperiode"
                  >
                    <Mail size={12} />
                    <span>Prøv gratis</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClearHistory(); }}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Nullstill samtale"
                >
                  <RotateCcw size={16} />
                </button>

                {/* Minimer-knapp */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                  className="hidden sm:block p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title={isMinimized ? "Gjenopprett samtale" : "Minimer"}
                >
                  <Minus size={16} />
                </button>

                {/* Fullskjerm / Dekk hele siden på PC */}
                <button
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsFullscreen(!isFullscreen);
                    if (isMinimized) setIsMinimized(false);
                  }}
                  className="hidden sm:block p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title={isFullscreen ? "Gjenopprett normal størrelse" : "Dekk hele skjermen (Fullskjerm)"}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Lukk chat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* HOVEDINNHOLD DERSOM IKKE MINIMERT */}
            {!isMinimized && (
              <>
                {/* HURTIG-LEAD DRAWER FOR GJESTER */}
                <AnimatePresence>
                  {showLeadDrawer && !isAuthenticated && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-purple-50/90 border-b border-purple-200 px-4 py-3 shrink-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <Zap size={14} className="text-purple-600" />
                          Start 14 dagers gratis prøveperiode
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowLeadDrawer(false)}
                          className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <form onSubmit={handleSubmitLeadForm} className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Ditt navn *"
                            value={leadForm.name}
                            onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                            className="p-2 text-xs bg-white border border-neutral-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-500"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Firmanavn"
                            value={leadForm.company}
                            onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                            className="p-2 text-xs bg-white border border-neutral-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="tel"
                            placeholder="Telefon *"
                            value={leadForm.phone}
                            onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                            className="p-2 text-xs bg-white border border-neutral-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-500"
                            required
                          />
                          <input
                            type="email"
                            placeholder="E-post *"
                            value={leadForm.email}
                            onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                            className="p-2 text-xs bg-white border border-neutral-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSubmittingLead}
                          className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-bold hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {isSubmittingLead ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          <span>Send henvendelse til Ragnar</span>
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* MELDINGSLOGG (SCROLLBAR) */}
                <div className={cn(
                  "flex-1 p-3 sm:p-4 overflow-y-auto space-y-3.5 bg-neutral-50/60",
                  isFullscreen && "px-6 md:px-16"
                )}>
                  {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex flex-col", 
                          isUser ? "items-end" : "items-start",
                          isFullscreen && "max-w-4xl mx-auto w-full"
                        )}
                      >
                        <div className={cn(
                          "max-w-[88%] sm:max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm relative group",
                          isUser 
                            ? "bg-neutral-900 text-white rounded-br-none" 
                            : "bg-white text-neutral-800 border border-neutral-200/80 rounded-bl-none"
                        )}>
                          {/* Kopier knapp */}
                          {!isUser && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg.id, msg.content)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-neutral-700 bg-neutral-100 rounded cursor-pointer"
                              title="Kopier tekst"
                            >
                              {copiedId === msg.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          )}

                          {/* Meldingstekst med støtte for punktlister, fet skrift og tips-bokser */}
                          {renderMessageContent(msg.content, isUser)}

                          <div className={cn(
                            "mt-1 text-[10px] text-right font-medium",
                            isUser ? "text-neutral-400" : "text-neutral-400"
                          )}>
                            {msg.timestamp}
                          </div>
                        </div>

                        {/* PROSJEKTVALG-KNAPPER NÅR SYSTEMET MÅ VITE PROSJEKTET */}
                        {msg.needsProjectSelection && msg.availableProjects && msg.availableProjects.length > 0 && (
                          <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-2xl w-[92%] space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                              <AlertCircle size={14} className="text-amber-600" />
                              <span>Velg hvilket prosjekt det gjelder:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.availableProjects.map((proj) => (
                                <button
                                  key={proj.id}
                                  type="button"
                                  onClick={() => handleSendMessage(`Gjelder prosjekt ${proj.name}`, {
                                    projectId: proj.id,
                                    projectName: proj.name
                                  })}
                                  className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl transition-colors cursor-pointer shadow-sm"
                                >
                                  <Building2 size={12} className="text-amber-700" />
                                  <span>{proj.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* INTERAKTIVE HANDLINGSKNAPPER FRA ASSISTENTEN */}
                        {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                            {msg.suggestedActions.map((action) => (
                              <button
                                key={action.id}
                                type="button"
                                onClick={() => handleActionClick(action)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                <span>{action.label}</span>
                                <ChevronRight size={12} className="text-purple-600" />
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Lasteindikator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-xs text-neutral-500 bg-white border border-neutral-200/80 px-3.5 py-2.5 rounded-2xl rounded-bl-none max-w-[200px] shadow-sm"
                    >
                      <div className="flex space-x-1">
                        <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" />
                      </div>
                      <span className="font-medium text-neutral-600">
                        {isAuthenticated ? 'MesterAI tenker...' : 'Ragnar svarer...'}
                      </span>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* HURTIG-CHIPS / SPØRSMÅLSFORSLAG (HORISONTAL SCROLL) */}
                <div className={cn(
                  "px-3 py-2 bg-white border-t border-neutral-100 overflow-x-auto no-scrollbar flex gap-1.5 shrink-0",
                  isFullscreen && "px-6 md:px-16 justify-center"
                )}>
                  <div className={cn("flex gap-1.5", isFullscreen && "max-w-4xl w-full justify-start")}>
                    {activeChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(chip.replace(/^[^\w\s]+/, '').trim())}
                        className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-purple-50 hover:text-purple-900 text-neutral-600 border border-neutral-200 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* INPUT-OMRÅDE (OPTIMALISERT FOR MOBIL & TASTETUR) */}
                <div className={cn("p-2.5 sm:p-3 bg-white border-t border-neutral-200 shrink-0", isFullscreen && "px-6 md:px-16")}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage(inputVal);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 bg-neutral-100/90 border border-neutral-300/80 rounded-2xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white transition-all shadow-inner",
                      isFullscreen && "max-w-4xl mx-auto"
                    )}
                  >
                    {/* Stemme-mikrofonknapp */}
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={cn(
                        "p-2 rounded-xl transition-all cursor-pointer shrink-0",
                        isListeningMic 
                          ? "bg-red-500 text-white animate-pulse" 
                          : "text-neutral-500 hover:text-purple-600 hover:bg-neutral-200/60"
                      )}
                      title={isListeningMic ? "Stopper lytting..." : "Snakk inn instruks eller spørsmål"}
                    >
                      {isListeningMic ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>

                    <input
                      type="text"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      placeholder={
                        isAuthenticated 
                          ? `Instruks for ${activeProject?.name || 'prosjekt'} (f.eks: "Lag SJA på...")` 
                          : 'Spør Ragnar om priser, TEK17, prøveperiode...'
                      }
                      className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-neutral-800 placeholder:text-neutral-400 px-1 py-1"
                      disabled={isLoading}
                    />

                    <button
                      type="submit"
                      disabled={!inputVal.trim() || isLoading}
                      className={cn(
                        "p-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center",
                        inputVal.trim() && !isLoading
                          ? "bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm active:scale-95"
                          : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                      )}
                    >
                      <Send size={16} />
                    </button>
                  </form>

                  {/* Liten bunn-tekst med garanti / status */}
                  <div className={cn("flex items-center justify-between mt-1.5 px-1 text-[10px] text-neutral-400", isFullscreen && "max-w-4xl mx-auto")}>
                    <span>
                      {isAuthenticated 
                        ? '🟢 MesterAI Autonom Agent aktiv' 
                        : '🟢 Ragnar • Offisiell AI-Rådgiver for VikingMester'}
                    </span>
                    {!isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => setShowLeadDrawer(true)}
                        className="text-purple-600 hover:underline font-bold cursor-pointer"
                      >
                        Start prøveperiode
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
