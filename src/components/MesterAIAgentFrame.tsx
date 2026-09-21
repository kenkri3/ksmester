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
  User as UserIcon,
  Camera,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatAiMarkdown } from '../lib/formatAiMarkdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  quickReplies?: Array<{ title: string; payload: string }>;
  imageUrl?: string;
}

interface MesterAIAgentFrameProps {
  className?: string;
  selectedProjectName?: string;
  userName?: string;
  userTrade?: string;
  companyName?: string;
  userId?: string;
  initialHeight?: string;
  initialPrompt?: string;
  onPromptHandled?: () => void;
  storageKey?: string;
  hasBottomNav?: boolean;
}

/**
 * Konverterer tekniske maskin-payloads (som eo_material, eo_scope osv.)
 * til ryddig og profesjonelt norsk språk i brukerens chatboble.
 */
export function formatUserMessage(content: string): string {
  if (!content) return '';
  const trimmed = content.trim();

  const PAYLOAD_LABELS: Record<string, string> = {
    eo_material: 'Materialoppgradering',
    eo_scope: 'Ekstra flate / arbeid',
    eo_flate: 'Ekstra flate / arbeid',
    eo_stillas: 'Stillas / rigging',
    eo_rigging: 'Stillas / rigging',
    eo_other: 'Annet',
    eo_annet: 'Annet',
    eo_time: 'Ekstra timeverk',
    eo_timer: 'Ekstra timeverk',
    eo_hms: 'HMS / Sikkerhetstiltak',
    eo_preclose: 'Lukkesperre / Forsegling',
    eo_transport: 'Transport og kranbil',
    eo_avfall: 'Avfall og container'
  };

  if (PAYLOAD_LABELS[trimmed.toLowerCase()]) {
    return PAYLOAD_LABELS[trimmed.toLowerCase()];
  }

  // Generell opprydding hvis en string starter med teknisk prefiks som "eo_", "btn_", etc.
  if (/^(eo|btn|action|opt|cmd)_[a-z0-9_]+$/i.test(trimmed)) {
    const cleaned = trimmed
      .replace(/^(eo|btn|action|opt|cmd)_/i, '')
      .replace(/_/g, ' ');
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return content;
}

export default function MesterAIAgentFrame({
  className,
  selectedProjectName,
  userName = 'Byggmester',
  userTrade = 'carpenter',
  companyName = 'VikingMester',
  userId,
  initialHeight = 'h-full',
  initialPrompt,
  onPromptHandled,
  storageKey,
  hasBottomNav = true
}: MesterAIAgentFrameProps) {
  const effectiveStorageKey = storageKey || 'mester_ai_agent_history';

  const [messages, setMessages] = useState<Message[]>(() => {
    // Tilpass velkomsthilsen og hurtigvalg basert på brukerens fag og prosjekt
    const isPlumber = userTrade === 'plumber' || (userName && userName.toLowerCase().includes('rørlegger'));
    const isCarpenter = userTrade === 'carpenter' || (userName && userName.toLowerCase().includes('tømrer'));

    let welcomeText = '';
    let quickReplies: Array<{ title: string; payload: string }> = [];

    if (isPlumber) {
      welcomeText = selectedProjectName
        ? `Hei ${userName}! 👋 Jeg er **MesterAI** for VVS på **${selectedProjectName}**.\n\nKlar til å kvittere ut trykktest for lukkesperre, sjekke fall mot sluk (TEK17) eller loggføre avvik.\n\nHva skal kontrolleres i dag?`
        : `Hei ${userName}! 👋 Jeg er **MesterAI**, din VVS-pilot.\n\nKlar til å sjekke trykktester, rør-i-rør dokumentasjon og TEK17 våtromskrav.\n\nHva trenger du hjelp med?`;
      quickReplies = [
        { title: '🚰 Kvitter ut trykktest', payload: 'Trykktest av rør-i-rør fordelerskap fullført med 10 bar, alt tett' },
        { title: '📐 Sjekk fall mot sluk', payload: 'Hva er kravene til fall mot sluk i TEK17 på bad?' },
        { title: '📋 VVS-sjekkliste', payload: 'Vis sjekkliste for rør-i-rør og membran før lukking' },
        { title: '🚨 Meld VVS-avvik', payload: 'Jeg må melde inn et avvik på skadet rør' }
      ];
    } else if (isCarpenter) {
      welcomeText = selectedProjectName
        ? `Hei ${userName}! 👋 Jeg er **MesterAI** for **${selectedProjectName}**.\n\nKlar til å føre timer via tale, sjekke TEK17 på vindsperre og kledning, eller lage SJA før stillasarbeid.\n\nHva er status på byggeplassen?`
        : `Hei ${userName}! 👋 Jeg er **MesterAI**, din tømrer-pilot.\n\nKlar til å føre timer, lage SJA og sjekke konstruksjonskrav.\n\nHva vil du føre i dag?`;
      quickReplies = [
        { title: '⏱️ Før 7,5 timer i dagbok', payload: 'Før 7,5 timer lekting og vindsperre i byggedagboken' },
        { title: '🦺 Opprett SJA for stillas', payload: 'Opprett en ny Sikker Jobb Analyse (SJA) for arbeid i stillas i 3. etasje' },
        { title: '📸 Sjekk TEK17 vindsperre', payload: 'Hva er kravene til klemming av vindsperre og lufting av kledning i TEK17?' },
        { title: '🚨 Meld inn avvik', payload: 'Jeg vil melde inn et avvik på fuktig trevirke' }
      ];
    } else {
      welcomeText = selectedProjectName
        ? `Hei ${userName}! 👋 Jeg er **MesterAI**, din prosjektpilot på **${selectedProjectName}**.\n\nKlar til å varsle endringsordrer (NS 8406), sjekke prosjekthelse, kalkulere eller føre timeverk.\n\nHva vil du ha utført i dag?`
        : `Hei ${userName}! 👋 Jeg er **MesterAI**, din prosjektpilot.\n\nKlar til å føre timer, lage SJA, melde avvik eller sjekke prosjektøkonomi og TEK17.\n\nHva vil du ha utført i dag?`;
      quickReplies = [
        { title: '⚡ Varsle endringsordre', payload: 'Varsle endringsordre iht. NS 8406 på 28 500 kr for ekstra bærebjelke' },
        { title: '📊 Prosjekthelse & Krav', payload: 'Hva er prosjekthelse og ubehandlede krav på prosjektet?' },
        { title: '📝 Kalkyle etterisolering', payload: 'Lag et tilbud på etterisolering og ny kledning med 15% påslag' },
        { title: '⏱️ Før timer i dagbok', payload: 'Jeg vil føre timer på prosjektet' }
      ];
    }

    const welcomeMsg: Message = {
      id: 'welcome',
      role: 'assistant',
      content: welcomeText,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      quickReplies
    };

    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(effectiveStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Hvis brukeren kun har den gamle velkomstmeldingen, oppgrader til den nye
            if (parsed.length === 1 && parsed[0].id === 'welcome') {
              return [welcomeMsg];
            }
            return parsed;
          }
        }
      } catch {}
    }
    return [welcomeMsg];
  });

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('MesterAI tenker og analyserer...');
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      if (userId && typeof userId === 'string') {
        const cleanUid = userId.replace(/[^a-zA-Z0-9]/g, '');
        const stableId = `vm${cleanUid}`.padEnd(13, '0').slice(0, 13);
        localStorage.setItem('mester_agent_session_id', stableId);
        return stableId;
      }
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

  const [attachedImage, setAttachedImage] = useState<{ url: string; preview: string; name?: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadingTimerRef = useRef<any>(null);

  // 📷 Bildeopplasting direkte i MesterAI-chatten
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vennligst velg en gyldig bildefil');
      return;
    }

    setIsUploadingImage(true);
    toast.info('Laster opp foto for MesterAI...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Kunne ikke laste opp bildet');
      }

      const data = await res.json();
      const imageUrl = data.url;
      const objectUrl = URL.createObjectURL(file);

      setAttachedImage({
        url: imageUrl,
        preview: objectUrl,
        name: file.name
      });
      toast.success('Bilde klart! Still et spørsmål eller send direkte til agenten.');
    } catch (err: any) {
      console.error('Image upload failed:', err);
      toast.error('Feil ved bildeopplasting: ' + (err.message || 'Prøv igjen'));
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 🧠 Dynamiske statusfaser tilpasset brukerens faktiske spørsmål
  const getLoadingStages = (prompt: string): string[] => {
    const lower = prompt.toLowerCase();

    if (lower.includes('nobb') || lower.includes('pris') || lower.includes('vare') || lower.includes('kostnad') || lower.includes('materiell') || lower.includes('grossist') || lower.includes('rabatt')) {
      return [
        'Søker opp vareinformasjon og NOBB-priser...',
        'Henter materialdata og kalkylegrunnlag...',
        'Sammenstiller priser og leverandørdetaljer...'
      ];
    }

    if (lower.includes('søk') || lower.includes('google') || lower.includes('nett') || lower.includes('tavily') || lower.includes('brave') || lower.includes('finn ut') || lower.includes('research') || lower.includes('hvem er') || lower.includes('hva er') || lower.includes('guide') || lower.includes('tønsberg') || lower.includes('reise')) {
      return [
        'Gjør research og undersøker på nettet...',
        'Gjennomgår eksterne kilder og nettsider...',
        'Sammenfatter relevant informasjon...'
      ];
    }

    if (lower.includes('tek17') || lower.includes('forskrift') || lower.includes('standard') || lower.includes('ns 8406') || lower.includes('ns 3420') || lower.includes('våtrom') || lower.includes('membran') || lower.includes('sluk') || lower.includes('fall')) {
      return [
        'Slår opp i TEK17 og byggfaglige standarder...',
        'Kontrollerer tekniske krav og toleranser...',
        'Formulerer byggfaglig vurdering...'
      ];
    }

    if (lower.includes('vær') || lower.includes('yr') || lower.includes('vind') || lower.includes('regn') || lower.includes('temperatur') || lower.includes('meldes')) {
      return [
        'Henter sanntids værdata og prognoser fra Yr...',
        'Vurderer værforhold for byggeplassen...',
        'Ferdigstiller væroppdatering...'
      ];
    }

    if (lower.includes('sja') || lower.includes('sikker') || lower.includes('risiko') || lower.includes('vernetiltak') || lower.includes('hms') || lower.includes('vern') || lower.includes('farlig')) {
      return [
        'Vurderer faremomenter og vernetiltak...',
        'Strukturerer sikker jobb-analysen...',
        'Oppretter SJA i VikingMester...'
      ];
    }

    if (lower.includes('avvik') || lower.includes('ruh') || lower.includes('skade') || lower.includes('feil') || lower.includes('mangel')) {
      return [
        'Behandler avvik og konsekvenser...',
        'Klargjør korrigerende tiltak...',
        'Logger avviket i KS-systemet...'
      ];
    }

    if (lower.includes('time') || lower.includes('timer') || lower.includes('jobbet') || lower.includes('lønn') || lower.includes('timeliste')) {
      return [
        'Beregner timeforbruk og aktivitet...',
        'Kobler mot aktivt prosjekt...',
        'Registrerer timene i systemet...'
      ];
    }

    if (lower.includes('dagbok') || lower.includes('byggedagbok') || lower.includes('dagsrapport') || lower.includes('logg')) {
      return [
        'Samler dagens aktiviteter og mannskap...',
        'Formulerer byggedagboken iht. Byggherreforskriften...',
        'Arkiverer dagens notat i prosjektet...'
      ];
    }

    if (lower.includes('endring') || lower.includes('varsel') || lower.includes('tillegg') || lower.includes('ekstra') || lower.includes('krav')) {
      return [
        'Vurderer endringskrav og frister iht. NS 8406...',
        'Beregner konsekvenser for tid og kost...',
        'Utformer formell endringsordre...'
      ];
    }

    if (lower.includes('prosjekt') || lower.includes('status') || lower.includes('fremdrift') || lower.includes('oversikt') || lower.includes('økonomi')) {
      return [
        'Henter prosjektstatus og sanntidsdata...',
        'Beregner fremdrift og åpne oppgaver...',
        'Forbereder prosjektoppsummering...'
      ];
    }

    return [
      'MesterAI tenker og analyserer...',
      'Behandler oppgaven og sjekker verktøy...',
      'Ferdigstiller svaret til deg...'
    ];
  };

  // 📐 Juster høyden på chattefeltet automatisk etter innholdet (fra 1 linje opp til ca. 5 linjer)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      const targetH = Math.min(Math.max(scrollH, 42), 135);
      textareaRef.current.style.height = `${targetH}px`;
    }
  }, [inputVal]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // På desktop: Enter sender meldingen, Shift+Enter gir ny linje.
    // På mobil: Enter gir ny linje slik at man kan liste punkter, og Send-knappen sender.
    if (e.key === 'Enter' && !e.shiftKey) {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        e.preventDefault();
        handleSendMessage(inputVal);
      }
    }
  };

  useEffect(() => {
    try {
      sessionStorage.setItem(effectiveStorageKey, JSON.stringify(messages));
    } catch {}
    // Scroll kun internt i meldingsboksen uten å rulle foreldrevinduet eller hele nettsiden
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, effectiveStorageKey]);

  const handleClearHistory = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(effectiveStorageKey);
      } catch {}
    }
    const fresh: Message[] = [
      {
        id: `w-${Date.now()}`,
        role: 'assistant',
        content: selectedProjectName 
          ? `Samtalen er nullstilt. Klar på **${selectedProjectName}** – hva vil du utføre nå?`
          : `Samtalen er nullstilt. Hva vil du utføre i prosjektet nå?`,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        quickReplies: [
          { title: '⏱️ Før timer', payload: 'Jeg vil føre timer på prosjektet' },
          { title: '🛡️ Opprett SJA', payload: 'Opprett en ny Sikker Jobb Analyse (SJA)' },
          { title: '🚨 Meld avvik', payload: 'Jeg vil melde inn et nytt avvik (RUH)' },
          { title: '📊 Prosjektstatus', payload: 'Vis økonomisk status og timer for prosjektet' }
        ]
      }
    ];
    setMessages(fresh);
    setInputVal('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '42px';
    }
    toast.success('Samtalesession nullstilt');
  };

  const handleSendMessage = async (textToSend: string, imageOverride?: string, displayText?: string) => {
    const activeImage = imageOverride || attachedImage?.url;
    const currentPreview = attachedImage?.preview;

    if ((!textToSend.trim() && !activeImage) || isLoading) return;

    setAttachedImage(null);

    // Menneskelig tekst som skal vises i brukerens taleboble (f.eks. "Materialoppgradering" i stedet for "eo_material")
    const rawDisplay = displayText || textToSend.trim();
    const userMsgText = formatUserMessage(rawDisplay) || (activeImage ? 'Vennligst analyser dette bildet for fagmessig utførelse og TEK17.' : '');

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      imageUrl: currentPreview || activeImage
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '42px';
    }
    setIsLoading(true);

    // Teksten som sendes til backend-agenten (payload sendes til agenten for å trigge riktig flyt)
    const apiPayload = textToSend.trim() || userMsgText;

    // 🚀 Start dynamisk statusprosess tilpasset spørsmålet
    const stages = activeImage 
      ? [
          'Analyserer bildet med AI-syn og TEK17...',
          'Sjekker detaljer, overganger og fagmessig utførelse...',
          'Klargjør rapport og faglige observasjoner...'
        ]
      : getLoadingStages(userMsgText);
    setLoadingStatus(stages[0]);

    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
    }
    let stageIdx = 0;
    loadingTimerRef.current = setInterval(() => {
      stageIdx++;
      if (stageIdx < stages.length) {
        setLoadingStatus(stages[stageIdx]);
      } else {
        clearInterval(loadingTimerRef.current);
      }
    }, 2800);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: apiPayload,
          sessionId,
          projectName: selectedProjectName,
          userName,
          userTrade,
          companyName,
          userId,
          imageUrl: activeImage
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
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const lastHandledMsgRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  // 🎙️ Lytt på eksterne talekommandoer (f.eks. fra den opphøyde Snakk-knappen i mobil-bunnlinjen)
  useEffect(() => {
    const handleVoiceOrExternalMsg = (e: any) => {
      const text = e?.detail?.text;
      if (text && typeof text === 'string' && text.trim()) {
        const clean = text.trim();
        const now = Date.now();
        if (lastHandledMsgRef.current.text === clean && now - lastHandledMsgRef.current.time < 800) {
          return;
        }
        lastHandledMsgRef.current = { text: clean, time: now };
        handleSendMessage(clean);
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
      toast.error('Nettleseren støtter ikke direkte tale-til-tekst. Bruk tastatur eller diktat.');
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
      // 'nb-NO' er den offisielle BCP-47 koden for norsk bokmål som støttes av Android Chrome og Safari
      recognition.lang = 'nb-NO';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      let capturedSpeech = '';

      recognition.onstart = () => {
        setIsListeningMic(true);
        toast.info('🎙️ Lytter... Snakk inn instruksen nå');
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentText += event.results[i][0]?.transcript || '';
        }
        const speech = currentText.trim();
        if (speech) {
          capturedSpeech = speech;
          setInputVal(prev => {
            const trimmedPrev = prev.trim();
            return trimmedPrev ? `${trimmedPrev} ${speech}` : speech;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error in MesterAIAgentFrame:', event?.error);
        if (event?.error === 'not-allowed') {
          toast.error('Mikrofontilgang ble avvist. Vennligst tillat mikrofon i nettleseren.');
        } else if (event?.error === 'no-speech') {
          toast.info('Ingen tale registrert. Trykk på mikrofonen og snakk tydelig.');
        } else if (event?.error === 'language-not-supported') {
          toast.error('Norsk talegjenkjenning ikke støttet på denne enheten.');
        }
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
        recognitionRef.current = null;
        if (capturedSpeech) {
          const finalMessage = capturedSpeech.trim();
          toast.success(`Oppfattet: "${finalMessage}"`);
          handleSendMessage(finalMessage);
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Mic error:', err);
      setIsListeningMic(false);
    }
  };

  const renderFormattedContent = (content: string) => {
    const formatted = formatAiMarkdown(content || '');

    return (
      <div className="text-slate-800 leading-relaxed font-sans text-[13.5px] sm:text-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="text-[13.5px] sm:text-sm text-slate-800 leading-relaxed my-2 first:mt-0 last:mb-0">
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-extrabold text-navy-950 bg-slate-100 px-1 py-0.5 rounded text-[13px]">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-slate-700">
                {children}
              </em>
            ),
            ul: ({ children }) => (
              <ul className="space-y-2 my-2.5 pl-2 list-none text-[13.5px] sm:text-sm text-slate-800">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal space-y-2 my-2.5 pl-5 text-[13.5px] sm:text-sm text-slate-800 font-medium">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-[13.5px] sm:text-sm text-slate-800 leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-electric-600 mt-2 shrink-0 shadow-xs" />
                <span className="flex-1 min-w-0">{children}</span>
              </li>
            ),
            h1: ({ children }) => (
              <h3 className="text-sm sm:text-base font-black text-navy-950 mt-4 mb-2 pb-1 border-b border-slate-200">
                {children}
              </h3>
            ),
            h2: ({ children }) => (
              <h4 className="text-[13.5px] sm:text-sm font-black text-electric-800 mt-3.5 mb-1.5">
                {children}
              </h4>
            ),
            h3: ({ children }) => (
              <h5 className="text-[12.5px] sm:text-[13px] font-bold text-teal-800 bg-teal-50 border border-teal-200/60 px-2.5 py-1 rounded-lg w-fit mt-3 mb-1.5 flex items-center gap-1">
                {children}
              </h5>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-electric-500 bg-gradient-to-r from-electric-50/80 to-slate-50 pl-3.5 py-2.5 my-3 rounded-r-xl text-xs sm:text-[13px] text-navy-950 font-medium shadow-xs">
                {children}
              </blockquote>
            )
          }}
        >
          {formatted}
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
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 custom-scrollbar"
      >
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
                <div>
                  {msg.imageUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-white/20 shadow-xs max-w-[240px]">
                      <img 
                        src={msg.imageUrl} 
                        alt="Vedlagt foto" 
                        className="w-full h-auto max-h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-white font-medium">
                    {formatUserMessage(msg.content)}
                  </div>
                </div>
              ) : (
                renderFormattedContent(msg.content)
              )}

              {/* Hurtigvalg (Quick Replies) */}
              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2">
                  {msg.quickReplies.map((qr, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSendMessage(qr.payload || qr.title, undefined, qr.title)}
                      className="flex items-center justify-center text-center px-2.5 py-2.5 rounded-xl bg-slate-50 hover:bg-electric-50 text-slate-800 hover:text-electric-900 text-xs font-bold border border-slate-200 hover:border-electric-300 transition-all cursor-pointer shadow-2xs active:scale-95 leading-snug"
                    >
                      <span className="line-clamp-2 break-words">{qr.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="mr-auto items-start max-w-[88%]">
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3 animate-in fade-in duration-200">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-electric-600 via-indigo-600 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <RefreshCw size={13} className="animate-spin" />
              </div>
              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-xs text-slate-800 font-semibold leading-tight animate-pulse transition-all">
                  {loadingStatus}
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                  MesterAI Autonom Agent
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 📝 Inputfelt og mikrofon */}
      <div className={cn(
        "px-3 pt-2.5 sm:p-4 bg-white border-t border-slate-200 shrink-0 transition-all",
        isFullscreen || !hasBottomNav
          ? "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-3.5" 
          : "pb-[calc(3.85rem+env(safe-area-inset-bottom,0px))] md:pb-3.5"
      )}>
        {/* 📷 Forhåndsvisning av vedlagt bilde */}
        {attachedImage && (
          <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl mb-2 border border-slate-200 shadow-2xs max-w-4xl mx-auto w-full">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-300">
              <img src={attachedImage.preview} alt="Forhåndsvisning" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{attachedImage.name || 'Vedlagt bilde'}</p>
              <p className="text-[10px] text-slate-500">MesterAI analyserer bildet ved sending</p>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
              title="Fjern bilde"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
          className="flex items-end gap-2 max-w-4xl mx-auto w-full"
        >
          {/* Skjult filvelger for bilde / kamera */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />

          {/* Flerlinjers tekstfelt som vokser automatisk opp til ca 5 linjer */}
          <div className="relative flex-1 bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-electric-500 focus-within:ring-2 focus-within:ring-electric-500/20 rounded-2xl transition-all shadow-xs flex items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv instruks eller svar til agenten..."
              disabled={isLoading}
              className="w-full pl-3.5 pr-20 py-2.5 bg-transparent text-[13.5px] sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none max-h-34 min-h-[42px] leading-relaxed custom-scrollbar"
            />

            {/* Knapper for kamera og mikrofon inne i feltet */}
            <div className="absolute right-1.5 bottom-1.5 z-10 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage || isLoading}
                className={cn(
                  "p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center text-slate-400 hover:text-electric-600 hover:bg-slate-100 active:scale-90",
                  attachedImage && "text-electric-600 bg-electric-50 border border-electric-200",
                  isUploadingImage && "animate-spin text-electric-600"
                )}
                title="Knips bilde eller legg ved foto"
              >
                {isUploadingImage ? <RefreshCw size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
              <button
                type="button"
                onClick={toggleMic}
                className={cn(
                  "p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center",
                  isListeningMic 
                    ? "bg-rose-500 text-white animate-pulse shadow-md scale-105" 
                    : "text-slate-400 hover:text-electric-600 hover:bg-slate-100 active:scale-90"
                )}
                title={isListeningMic ? "Lytter... Trykk for å stoppe" : "Trykk for å snakke inn instruks"}
              >
                {isListeningMic ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
          </div>

          {/* Send-knapp som lyser opp i lilla når det er tekst eller bilde */}
          <button
            type="submit"
            disabled={isLoading || (!inputVal.trim() && !attachedImage)}
            className={cn(
              "flex items-center justify-center gap-1.5 h-[42px] px-3.5 sm:px-4 rounded-2xl text-xs sm:text-sm font-black transition-all shrink-0 cursor-pointer active:scale-95",
              (inputVal.trim() || attachedImage)
                ? "bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-700 hover:to-electric-600 text-white shadow-md shadow-electric-600/25"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
            )}
            title="Send instruks"
          >
            <Send size={15} className={cn("transition-transform", (inputVal.trim() || attachedImage) && "translate-x-0.5 -translate-y-0.5")} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
