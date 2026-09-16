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
  Minus
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
}

interface MesterAIChatProps {
  isOpen: boolean;
  onClose?: () => void;
  selectedProject?: any;
  projects?: any[];
  initialPrompt?: string;
  onOpenOfferModal?: (data?: any) => void;
  onOpenChangeOrderModal?: (data?: any) => void;
  onOpenSJAModal?: (data?: any) => void;
  onOpenAIVision?: () => void;
  onPromptHandled?: () => void;
}

export default function MesterAIChat({
  isOpen,
  onClose,
  selectedProject,
  projects = [],
  initialPrompt,
  onOpenOfferModal,
  onOpenChangeOrderModal,
  onOpenSJAModal,
  onOpenAIVision,
  onPromptHandled
}: MesterAIChatProps) {
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
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hei! Jeg er **MesterAI**, din autonome lederassistent og faglige samtalepartner.\n\nJeg kan hjelpe deg med **alt innen bygg og anlegg**:\n- 📝 **Tilbud & Kalkyle:** Beregne arbeidstimer, materialpriser, påslag (15–25%) og standard forbehold (NS 8406 / NS 8405).\n- 📄 **Endringsordrer & Varsling:** Føre krav om tilleggsvederlag og fristforlengelse iht. NS 8406 uten å tape rettigheter.\n- 📐 **TEK17 & Forskrifter:** Fall til sluk (§ 13-15), dampsperre, u-verdier, brann- og lydkrav.\n- 🛡️ **SJA & Sikkerhet:** Risikovurdering og vernetiltak for stillas, kappsag, varme arbeider.\n- 💬 **Kundedialog & E-poster:** Formulere diplomatiske svar på klager eller avvise urimelige krav.\n\nHva trenger du hjelp til i dag?`,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        followUpPrompts: [
          'Hjelp meg å skrive et nytt tilbud på bad',
          'Hvordan varsler jeg en endringsordre iht. NS 8406?',
          'Hva er kravene til fall mot sluk i TEK17?',
          'Lag en SJA for tak- og stillasarbeid'
        ]
      }
    ];
  });

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Save conversation history to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        sessionStorage.setItem('mester_ai_chat_history', JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  // Scroll to bottom on new messages (strictly isolated inside container - eliminates entire page bounce)
  useEffect(() => {
    if (isOpen && !isMinimized) {
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
  }, [messages, isLoading, isOpen, isMinimized]);

  // Handle incoming initial prompt from Cockpit
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
      onPromptHandled?.();
    }
  }, [initialPrompt]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

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

      // Extract past messages (excluding welcome) for multi-turn history
      const historyPayload = newMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/agent/dispatch', {
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

      if (!res.ok) {
        throw new Error(`Serverfeil: ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Jeg har mottatt instruksen din. Hva mer kan jeg hjelpe deg med?',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: data.suggestedActions || [],
        followUpPrompts: data.followUpPrompts || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Beklager, jeg opplevde en midlertidig feil under behandlingen: ${err.message}. Vennligst prøv igjen om et øyeblikk.`,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Vil du starte en ny samtale og tilbakestille historikken?')) {
      const resetMsg: ChatMessage[] = [
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hei igjen! Samtalen er tilbakestilt.\n\nHva ønsker du å sparre om eller få hjelp til nå? (f.eks: Skrive tilbud, vurdere TEK17-krav, opprette endringsordre eller SJA)`,
          timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
          followUpPrompts: [
            'Hjelp meg med tilbud på nytt bad',
            'Hvordan varsler jeg en endringsordre iht. NS 8406?',
            'Hva er kravene til fall mot sluk i TEK17?',
            'Lag en SJA for tak- og stillasarbeid'
          ]
        }
      ];
      setMessages(resetMsg);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('mester_ai_chat_history');
      }
      toast.success('Ny samtale startet');
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Tekst kopiert til utklippstavlen!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleActionClick = (action: any) => {
    if (action.type === 'open_offer_modal') {
      if (onOpenOfferModal) {
        onOpenOfferModal(action.data);
      } else {
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'offers' } }));
      }
    } else if (action.type === 'open_change_order_modal') {
      if (onOpenChangeOrderModal) {
        onOpenChangeOrderModal(action.data);
      } else {
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'change_order' } }));
      }
    } else if (action.type === 'open_sja_modal') {
      if (onOpenSJAModal) {
        onOpenSJAModal(action.data);
      } else {
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'sja' } }));
      }
    } else if (action.type === 'open_ai_vision') {
      if (onOpenAIVision) {
        onOpenAIVision();
      } else {
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'take_photo' } }));
      }
    }
  };

  // Voice dictation
  const toggleMic = () => {
    if (isListeningMic) {
      setIsListeningMic(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.info('Tale-til-tekst er aktivert via tastatur. Dikter direkte i feltet.');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'nb-NO';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningMic(true);
        toast.info('Lytter... Still spørsmålet ditt med stemmen nå.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputVal(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListeningMic(false);
        toast.success('Tale oppfattet!');
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  // Rich text renderer with ReactMarkdown
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

  if (!isOpen) return null;

  if (isMinimized) {
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
              <span>MesterAI Samtalepartner</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[11px] text-slate-300">
              Minimert ({messages.length} meldinger) • Klikk for å åpne
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col transition-all",
          isFullscreen 
            ? "w-[98vw] h-[95vh] max-w-7xl max-h-[96vh]" 
            : "w-full max-w-4xl h-[88vh] max-h-[820px]"
        )}
      >
        {/* Chat Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-navy-900 via-slate-900 to-navy-900 text-white flex items-center justify-between gap-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-electric-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-electric-500/20 shrink-0">
              <Brain size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black tracking-tight text-white">MesterAI Samtalepartner</h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  100% Operativ
                </span>
                {selectedProject && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 truncate max-w-[180px]">
                    <Building2 size={10} />
                    <span className="truncate">{selectedProject.name}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                Faglig rådgiver for tilbud, kalkyle, TEK17, NS 8406, SJA og alle håndverker-caser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Start en ny samtale"
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">Ny samtale</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              title={isFullscreen ? "Standard visning" : "Fullskjerm"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              title="Minimer til hjørnet"
            >
              <Minus size={16} />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                title="Lukk samtalepanel"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Messages Thread Container */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50 custom-scrollbar"
        >
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={cn(
                "flex flex-col gap-2 max-w-[92%] sm:max-w-[85%]",
                msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              {/* Bubble */}
              <div className={cn(
                "p-4 rounded-2xl shadow-xs transition-all",
                msg.role === 'user' 
                  ? "bg-navy-900 text-white rounded-br-xs" 
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
                        className="text-slate-400 hover:text-navy-900 transition-colors p-1"
                        title="Kopier svar"
                      >
                        {copiedId === msg.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                )}

                {msg.role === 'user' ? (
                  <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                ) : (
                  renderFormattedContent(msg.content)
                )}

                {/* Interactive Action Buttons */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {msg.suggestedActions.map((action, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleActionClick(action)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-electric-50 hover:bg-electric-100 text-electric-700 border border-electric-200 hover:border-electric-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        {action.type.includes('offer') && <FileText size={14} className="text-emerald-600" />}
                        {action.type.includes('change_order') && <FileSignature size={14} className="text-rose-600" />}
                        {action.type.includes('sja') && <Sparkles size={14} className="text-amber-600" />}
                        {action.type.includes('vision') && <Camera size={14} className="text-purple-600" />}
                        <span>{action.label}</span>
                        <ChevronRight size={13} className="opacity-60" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Follow-up Suggestion Chips (Under Assistant Message) */}
              {msg.role === 'assistant' && msg.followUpPrompts && msg.followUpPrompts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
                  {msg.followUpPrompts.map((promptText, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleSendMessage(promptText)}
                      disabled={isLoading}
                      className="px-2.5 py-1 bg-white hover:bg-electric-50 text-slate-600 hover:text-electric-700 border border-slate-200 hover:border-electric-200 rounded-lg text-[11px] font-medium transition-all shadow-2xs text-left cursor-pointer active:scale-95"
                    >
                      💬 {promptText}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Thinking / Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 p-4 bg-white border border-slate-200/80 rounded-2xl mr-auto max-w-md shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-electric-500 text-white flex items-center justify-center animate-spin">
                <RefreshCw size={15} />
              </div>
              <div>
                <div className="text-xs font-bold text-navy-900">MesterAI vurderer faglige standarder...</div>
                <div className="text-[10px] text-slate-500">Kalkulerer timer, materialer, TEK17 og entrepriserett</div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 shrink-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputVal); }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Still et spørsmål eller be om hjelp med tilbud, TEK17, HMS, kalkyle..."
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all outline-none"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={toggleMic}
                className={cn(
                  "absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all cursor-pointer",
                  isListeningMic ? "bg-rose-500 text-white animate-pulse" : "text-slate-400 hover:text-electric-600"
                )}
                title="Snakk inn instruks eller spørsmål"
              >
                {isListeningMic ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="px-4 sm:px-5 py-3 bg-navy-900 hover:bg-navy-800 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-40 shrink-0 shadow-sm cursor-pointer"
            >
              <span>Send</span>
              <Send size={13} />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
            <span>Trykk Enter for å sende • Støtter norsk byggeskikk, TEK17, NS 8406 og kalkyler</span>
            <span className="font-bold text-electric-600">VikingMester AI v3.0</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
