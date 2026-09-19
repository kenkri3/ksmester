'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  Send, 
  Mic, 
  MicOff, 
  RotateCcw, 
  Copy, 
  Check, 
  Building2,
  Bot,
  User as UserIcon
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  quickReplies?: Array<{ title: string; payload: string }>;
}

interface MesterAIAgentFrameProps {
  className?: string;
  selectedProjectName?: string;
  userName?: string;
  initialHeight?: string;
  initialPrompt?: string;
  onPromptHandled?: () => void;
}

export default function MesterAIAgentFrame({
  className,
  selectedProjectName,
  userName = 'Byggmester',
  initialHeight = 'h-full',
  initialPrompt,
  onPromptHandled
}: MesterAIAgentFrameProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('mester_ai_agent_history');
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
        content: `Hei! 👋 Jeg er **MesterAI Prosjektpilot**, din autonome prosjektassistent.\n\nJeg kan hjelpe deg med **timeføring, byggedagbok, SJA, avvik (RUH), endringsordrer (NS 8406)** og oppslag i **TEK17 / Byggforsk**.\n\nHva vil du at jeg skal utføre for deg i dag?`,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        quickReplies: [
          { title: '⏰ Før timer på prosjekt', payload: 'Jeg vil føre timer på prosjektet' },
          { title: '🚨 Meld avvik (RUH)', payload: 'Jeg vil melde inn et nytt avvik' },
          { title: '📝 Ny SJA-analyse', payload: 'Opprett en ny Sikker Jobb Analyse (SJA)' },
          { title: '📐 Sjekk TEK17-krav', payload: 'Hva er kravene til fall mot sluk i TEK17 våtrom?' }
        ]
      }
    ];
  });

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mester_agent_session_id');
      if (saved && saved.length === 13) return saved;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let s = '';
      for (let i = 0; i < 13; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
      localStorage.setItem('mester_agent_session_id', s);
      return s;
    }
    return 'vikingAgent13';
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('mester_ai_agent_history', JSON.stringify(messages));
    } catch {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearHistory = () => {
    const fresh: Message[] = [
      {
        id: `w-${Date.now()}`,
        role: 'assistant',
        content: `Samtalen er nullstilt. Hva kan jeg hjelpe deg med i prosjektet nå?`,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        quickReplies: [
          { title: '⏰ Før timer på prosjekt', payload: 'Jeg vil føre timer' },
          { title: '🚨 Meld avvik (RUH)', payload: 'Meld avvik' },
          { title: '📐 Sjekk TEK17-krav', payload: 'Krav til fall mot sluk' }
        ]
      }
    ];
    setMessages(fresh);
    toast.success('Samtalesession nullstilt');
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          sessionId,
          projectName: selectedProjectName,
          userName
        })
      });

      if (!res.ok) {
        throw new Error(`Feilkode ${res.status}`);
      }

      const data = await res.json();

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Forespørselen er behandlet.',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        quickReplies: data.quickReplies && data.quickReplies.length > 0 ? data.quickReplies : undefined
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Agent chat error:', err);
      toast.error('Kunne ikke nå agenten: ' + err.message);
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Beklager, det oppstod en midlertidig feil ved kontakt med agenten. Vennligst prøv igjen.`,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // 🎙️ Lytt på eksterne talekommandoer (f.eks. fra den opphøyde Snakk-knappen i mobil-bunnlinjen)
  useEffect(() => {
    const handleVoiceOrExternalMsg = (e: any) => {
      const text = e?.detail?.text;
      if (text && typeof text === 'string' && text.trim()) {
        handleSendMessage(text.trim());
      }
    };
    window.addEventListener('mesterai:send-message', handleVoiceOrExternalMsg);
    return () => {
      window.removeEventListener('mesterai:send-message', handleVoiceOrExternalMsg);
    };
  }, [sessionId, isLoading, selectedProjectName, userName]);

  // Håndter eventuell initialPrompt sendt inn fra prosjektoversikt / avvik
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
      onPromptHandled?.();
    }
  }, [initialPrompt]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Kopiert til utklippstavlen');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleMic = () => {
    if (isListeningMic) {
      recognitionRef.current?.stop();
      setIsListeningMic(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Nettleseren støtter ikke direkte tale-til-tekst');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'no-NO';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListeningMic(true);
        toast.info('🎙️ Lytter... Snakk inn instruksen');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputVal(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error);
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Mic error:', err);
      setIsListeningMic(false);
    }
  };

  const renderFormattedContent = (content: string) => {
    // Normaliser punktlister: gjør om unike kulepunkter (• og ●) til markdown standard `- `
    const normalizedContent = (content || '')
      .replace(/^[ \t]*[•●][ \t]*/gm, '- ')
      .replace(/\n[ \t]*[•●][ \t]*/g, '\n- ');

    return (
      <div className="text-slate-800 leading-relaxed font-sans text-xs sm:text-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
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
              <ul className="space-y-1 my-1.5 pl-4 list-disc text-xs sm:text-sm text-slate-800">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal space-y-1 my-1.5 pl-5 text-xs sm:text-sm text-slate-800 font-medium">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                {children}
              </li>
            ),
            h1: ({ children }) => (
              <h3 className="text-sm sm:text-base font-black text-navy-950 mt-2 mb-1 pb-1 border-b border-slate-100">
                {children}
              </h3>
            ),
            h2: ({ children }) => (
              <h4 className="text-xs sm:text-sm font-black text-electric-800 mt-2 mb-1">
                {children}
              </h4>
            ),
            h3: ({ children }) => (
              <h5 className="text-xs sm:text-sm font-bold text-navy-950 mt-1.5 mb-0.5">
                {children}
              </h5>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-electric-500 bg-electric-50/70 pl-3 py-1.5 my-1.5 rounded-r-xl text-xs text-navy-950 font-medium">
                {children}
              </blockquote>
            )
          }}
        >
          {normalizedContent}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={cn(
      "flex flex-col bg-white overflow-hidden transition-all duration-300",
      isFullscreen 
        ? "fixed inset-0 z-50 rounded-none shadow-2xl" 
        : "rounded-2xl border border-slate-200/90 shadow-sm",
      initialHeight,
      className
    )}>
      {/* 🌟 MesterAI White-label Header */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 via-navy-950 to-slate-900 border-b border-white/10 flex items-center justify-between gap-3 shrink-0 text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-electric-600 to-electric-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white truncate">
                MesterAI Prosjektpilot
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sanntid aktiv
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate hidden sm:block">
              {selectedProjectName 
                ? `Aktiv på prosjekt: ${selectedProjectName}` 
                : 'Autonom byggmesteragent for timeføring, byggedagbok og TEK17'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Nullstill samtale"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer hidden sm:block"
            title={isFullscreen ? "Avslutt fullskjerm" : "Fullskjerm"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* 💬 Meldinger-container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 custom-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={cn(
              "flex flex-col gap-1.5 max-w-[92%] sm:max-w-[85%]",
              msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div className={cn(
              "p-3.5 sm:p-4 rounded-2xl shadow-xs transition-all",
              msg.role === 'user' 
                ? "bg-gradient-to-r from-electric-600 to-electric-500 text-white rounded-br-xs shadow-md shadow-electric-600/15" 
                : "bg-white text-navy-950 border border-slate-200/90 rounded-bl-xs"
            )}>
              {msg.role === 'assistant' && (
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-black text-electric-700">
                    <Bot size={14} />
                    <span>MesterAI Pilot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="text-slate-400 hover:text-navy-900 transition-colors cursor-pointer"
                      title="Kopier"
                    >
                      {copiedId === msg.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              )}

              {msg.role === 'user' ? (
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-white font-medium">
                  {msg.content}
                </div>
              ) : (
                renderFormattedContent(msg.content)
              )}

              {/* Hurtigvalg (Quick Replies) */}
              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {msg.quickReplies.map((qr, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSendMessage(qr.payload || qr.title)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-electric-50 hover:bg-electric-100 text-electric-800 text-[11px] font-bold border border-electric-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Sparkles size={11} className="text-electric-600" />
                      <span>{qr.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="mr-auto items-start max-w-[85%]">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-electric-600 text-white flex items-center justify-center">
                <RefreshCw size={13} className="animate-spin" />
              </div>
              <span className="text-xs text-slate-600 font-medium animate-pulse">
                MesterAI analyserer kalkylen, TEK17 og prosjektdata...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 📝 Inputfelt og mikrofon */}
      <div className={cn(
        "p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 transition-all",
        isFullscreen 
          ? "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-3.5" 
          : "pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-3.5"
      )}>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
          className="flex items-center gap-2 max-w-4xl mx-auto w-full"
        >
          <div className="relative flex-1">
            <input 
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Skriv instruks (f.eks. før timer, sjekk TEK17, meld avvik)..."
              disabled={isLoading}
              className="w-full pl-3.5 pr-10 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all shadow-xs"
            />
            <button
              type="button"
              onClick={toggleMic}
              className={cn(
                "absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer",
                isListeningMic ? "bg-rose-500 text-white animate-pulse" : "text-slate-400 hover:text-electric-600 active:scale-90"
              )}
              title="Tale-til-tekst"
            >
              {isListeningMic ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-3 bg-navy-950 hover:bg-navy-900 text-white rounded-xl text-xs sm:text-sm font-black disabled:opacity-40 transition-all shrink-0 shadow-sm cursor-pointer active:scale-95"
          >
            <Send size={15} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
