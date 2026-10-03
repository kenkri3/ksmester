'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  CheckCircle2,
  RefreshCw,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { getDynamicReasoningFlow } from '@/src/lib/reasoningEngine';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { formatAiMarkdown } from '../lib/formatAiMarkdown';
import { formatUserMessage } from './MesterAIAgentFrame';
import MesterAIIcon from './MesterAIIcon';

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
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('MesterAI tenker og analyserer...');
  const [activeThinkingDuration, setActiveThinkingDuration] = useState(0);
  const [activeThinkingQuery, setActiveThinkingQuery] = useState('');
  const [activeThinkingHasImage, setActiveThinkingHasImage] = useState(false);
  const thinkingTimerRef = useRef<any>(null);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ url: string; preview: string; name?: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lastLiveAction, setLastLiveAction] = useState<{ title: string; time: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const latestMessageTopRef = useRef<HTMLDivElement>(null);
  const latestTurnTopRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const prevIsLoadingRef = useRef(false);
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

    if (activeModuleTab === 'vehicle') {
      return {
        id: 'context-vehicle',
        role: 'assistant' as const,
        content: `Hei ${userName}! 🚗 Du er i **Bilpark & Elektronisk Kjørebok**.\n\nHer har du full oversikt over firmabiler og privatbiler. Systemet beregner automatisk **4,90 kr/km (Statens satser) + bompenger** og klargjør godkjente bilag for lønn, faktura og regnskap (Tripletex/Fiken).\n\nDu kan diktere turer med stemmen («Før 28 km til Vidjeveien»), godkjenne oppdagede turer, eller hente månedsoversikt. Hva vil du gjøre?`,
        timestamp: timeStr,
        quickReplies: [
          { title: '💡 Hvordan fungerer kjøreboken?', payload: 'Forklar meg hvordan elektronisk kjørebok og flåtestyring fungerer i praksis, og hvordan jeg fører eller eksporterer turer.' },
          { title: '🎙️ Før tur med stemmen', payload: 'Hvordan fører jeg turer enklest mulig med stemmen her?' },
          { title: '📊 Beregning & Statens satser', payload: 'Hvordan regnes kilometergodtgjørelse og bompenger ut iht. Skatteetaten?' },
          { title: '📁 Eksport til Tripletex/regnskap', payload: 'Hvordan eksporterer jeg kjøreboken til Tripletex eller regnskap?' }
        ]
      };
    }

    if (activeModuleTab === 'pre_close') {
      return {
        id: 'context-pre_close',
        role: 'assistant' as const,
        content: `Hei ${userName}! 🔒 Du er i **KS & Lukkesperre (TEK17)** ${projLabel}.\n\nLukkesperren sikrer at ingen vegger, bjelkelag eller våtrom lukkes før skjulte installasjoner (rør, el, ventilasjon, dampsperre) er godkjent og fotodokumentert. Dette forhindrer dyre reklamasjoner og tvister!\n\nHva vil du kontrollere eller forsegle i dag?`,
        timestamp: timeStr,
        quickReplies: [
          { title: '💡 Hva er en lukkesperre?', payload: 'Hva er en lukkesperre, og hvorfor kreves dette iht. TEK17?' },
          { title: '📸 Dokumenter skjult installasjon', payload: `Hvordan forsegler og fotodokumenterer jeg en lukkesone på ${currentProjName || 'prosjektet'}?` },
          { title: '✅ Sjekkliste før lukking', payload: 'Hva må sjekkes før vi lukker vegger og bjelkelag?' },
          { title: '📋 Vis godkjente lukkesoner', payload: `Vis status for alle lukkesoner på ${currentProjName || 'prosjektet'}` }
        ]
      };
    }

    if (activeModuleTab === 'archive') {
      return {
        id: 'context-archive',
        role: 'assistant' as const,
        content: `Hei ${userName}! 📁 Du er i **Dokumentarkiv & FDV** ${projLabel}.\n\nHer samles alle FDV-blader, produktdatablad, tegninger, samsvarserklæringer og fotobevis automatisk. Ved prosjektslutt kan du generere en komplett, profesjonell FDV-sluttrapport med ett klikk til byggherren!\n\nHva trenger du hjelp til?`,
        timestamp: timeStr,
        quickReplies: [
          { title: '📑 Generer komplett FDV-perm', payload: `Hvordan genererer og eksporterer jeg en komplett FDV-perm for ${currentProjName || 'prosjektet'}?` },
          { title: '📂 Hvilke dokumenter må med?', payload: 'Hvilken FDV-dokumentasjon kreves ved overlevering til kunde?' },
          { title: '🔍 Søk i produktdatablad', payload: 'Hvordan finner jeg datablad og monteringsanvisninger i arkivet?' },
          { title: '📤 Del arkiv med kunde', payload: 'Hvordan gir jeg byggherre eller kunde tilgang til prosjektarkivet?' }
        ]
      };
    }

    if (activeModuleTab === 'contacts') {
      return {
        id: 'context-contacts',
        role: 'assistant' as const,
        content: `Hei ${userName}! 👥 Du er i **Prosjektkontakter & Telefonbok** ${projLabel}.\n\nHer administrerer du håndverkere, lærlinger, underentreprenører og byggherrer. Du kan tildele byggeplasser, sende innloggingslenker og definere roller med ett klikk!\n\nHvem vil du legge til eller administrere?`,
        timestamp: timeStr,
        quickReplies: [
          { title: '➕ Inviter ny håndverker', payload: 'Hvordan inviterer jeg en ny fagarbeider eller lærling til systemet?' },
          { title: '🔑 Forklar tilgangsnivåer', payload: 'Hva er forskjellen på SuperAdmin, Leder, Håndverker og Kunde-tilgang?' },
          { title: '👷 Tildel byggeplass', payload: `Hvordan tildeler jeg ansatte til ${currentProjName || 'byggeplasser'}?` },
          { title: '✉️ Send innloggingslenke', payload: 'Hvordan sender jeg en direkte innloggingslenke til en kollega?' }
        ]
      };
    }

    if (activeModuleTab === 'apprentice') {
      return {
        id: 'context-apprentice',
        role: 'assistant' as const,
        content: `Hei ${userName}! 🎓 Du er i **Lærlingmodul & Opplæringsbok** ${projLabel}.\n\nHer kobles lærlingens daglige byggeplassarbeid direkte mot læreplanmålene (Udir). MesterAI foreslår relevante kompetansemål ut fra utført arbeid, så faglig leder og lærling sparer timevis med papirarbeid!\n\nHva vil du registrere eller gjennomgå?`,
        timestamp: timeStr,
        quickReplies: [
          { title: '📖 Hvordan fungerer lærlingmodulen?', payload: 'Hvordan bruker lærlingen og faglig leder opplæringsboken i Vikingmester?' },
          { title: '🎯 Koble arbeid mot læreplanmål', payload: 'Hvordan kobler jeg dagens tømrerarbeid til læreplanmålene?' },
          { title: '✍️ Veiledergodkjenning', payload: 'Hvordan godkjenner jeg utførte lærlingoppgaver som faglig leder?' },
          { title: '📊 Vis fremdriftsrapport', payload: 'Hvordan ser lærlingens samlede måloppnåelse ut mot svenneprøven?' }
        ]
      };
    }

    if (activeModuleTab === 'teamchat') {
      return {
        id: 'context-teamchat',
        role: 'assistant' as const,
        content: `Hei ${userName}! 💬 Du er i **Prosjekt- & Firmachatt** ${projLabel}.\n\nHer foregår all internkommunikasjon trygt samlet på byggeplassen, uten at viktige avtaler forsvinner i rotete private SMS-tråder. Alle beskjeder, bilder og HMS-varsler forblir søkbare og knyttet til prosjektet!\n\nHva lurer du på?`,
        timestamp: timeStr,
        quickReplies: [
          { title: '📢 Hvordan varsler jeg alle?', payload: 'Hvordan sender jeg en fellesbeskjed til alle på byggeplassen?' },
          { title: '🔒 Hvem kan se meldingene?', payload: 'Hvem har tilgang til denne prosjektchatten?' },
          { title: '📸 Deling av bilder og tegninger', payload: 'Hvordan deler vi byggeplassbilder og tegninger i chatten?' }
        ]
      };
    }

    if (activeModuleTab === 'superadmin') {
      return {
        id: 'context-superadmin',
        role: 'assistant' as const,
        content: `Hei ${userName}! 👑 Du er i **SuperAdmin Portal & SaaS Drift**.\n\nHer har du full oversikt over hele plattformen: bedrifter, abonnement, marginer (96–98%), tokenforbruk, AI-drift og brukerinvitasjoner.\n\nHva vil du overvåke eller justere?`,
        timestamp: timeStr,
        quickReplies: [
          { title: '🛡️ Margin & Token-sikring', payload: 'Hvordan er marginer og token-sikringen lagt opp i Vikingmester?' },
          { title: '🏢 Bedriftsoversikt & Kunder', payload: 'Hvordan administrerer jeg bedrifter og aktive abonnement?' },
          { title: '✉️ Inviter SuperAdmin / Kunde', payload: 'Hvordan oppretter og inviterer jeg en ny bedrift eller SuperAdmin?' }
        ]
      };
    }

    if (activeModuleTab === 'all_modules') {
      return {
        id: 'context-all_modules',
        role: 'assistant' as const,
        content: `Hei ${userName}! 🧩 Du er i **Moduloversikten**.\n\nVikingmester dekker hele verdikjeden for håndverkere: Kalkyle, Kontrakter, Byggedagbok, Kjørebok, SJA, Avvik, Lukkesperre, FDV og HMS. Alle moduler er samkjørte og deler prosjektdata automatisk!\n\nHvilken modul vil du lære mer om eller åpne?`,
        timestamp: timeStr,
        quickReplies: [
          { title: '🚗 Kjørebok & Bilpark', payload: 'Forklar hvordan kjøreboken fungerer og regner ut kilometergodtgjørelse.' },
          { title: '🔒 KS & Lukkesperre', payload: 'Forklar hvordan lukkesperre fungerer iht. TEK17.' },
          { title: '📋 Endringsordrer (NS 8406)', payload: 'Forklar hvordan endringsordrer og varsler fungerer.' },
          { title: '📁 Dokumentarkiv & FDV', payload: 'Hvordan fungerer automatisk FDV-generering?' }
        ]
      };
    }

    if (activeModuleTab === 'create_project') {
      return {
        id: 'context-create_project',
        role: 'assistant' as const,
        content: `Hei ${userName}! 🏗️ Du er i **Opprett nytt prosjekt**.\n\nHer setter du opp en ny byggeplass med kundeinformasjon, adresse, entrepriseform og oppstartsjekkliste. Du kan også bare fortelle meg om jobben i chatten, så oppretter jeg hele prosjektet for deg!\n\nHva slags prosjekt skal dere starte?`,
        timestamp: timeStr,
        quickReplies: [
          { title: '🏠 Opprett enebolig / tilbygg', payload: 'Hjelp meg å opprette et nytt tilbygg-prosjekt med full struktur.' },
          { title: '🚿 Opprett bad renovering', payload: 'Hjelp meg å opprette et bad-oppussingsprosjekt iht. Våtromsnormen.' },
          { title: '📋 Sjekkliste ved prosjektoppstart', payload: 'Hvilke lovpålagte HMS- og KS-dokumenter må opprettes ved prosjektoppstart?' }
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

  // 🎯 Gemini-stil presis scroll til toppen av svar / spørsmål
  const performSmartScrollToTop = useCallback((smooth = true) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const promptEl = latestTurnTopRef.current;
    const assistantEl = latestMessageTopRef.current;

    let targetEl: HTMLElement | null = assistantEl;
    if (promptEl && assistantEl) {
      const promptHeight = promptEl.offsetHeight;
      if (promptHeight > 0 && promptHeight <= 180) {
        targetEl = promptEl;
      }
    } else if (promptEl && !assistantEl) {
      targetEl = promptEl;
    }

    if (!targetEl) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    const currentScrollTop = container.scrollTop;
    const targetScrollTop = targetRect.top - containerRect.top + currentScrollTop;
    const finalScrollTop = Math.max(0, targetScrollTop - 16);

    container.scrollTo({
      top: finalScrollTop,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, []);

  const handleUserScrollIntent = useCallback(() => {
    isUserScrollingRef.current = true;
  }, []);

  // Lagre historikk & smart scroll til toppen av nye svar
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        sessionStorage.setItem('mester_copilot_history', JSON.stringify(messages));
      } catch {}
    }

    const hadNewMessage = messages.length > prevMessagesLengthRef.current;
    const justStoppedLoading = prevIsLoadingRef.current && !isLoading;
    const justStartedLoading = !prevIsLoadingRef.current && isLoading;

    prevMessagesLengthRef.current = messages.length;
    prevIsLoadingRef.current = isLoading;

    if (justStartedLoading) {
      isUserScrollingRef.current = false;
      const timer = setTimeout(() => {
        const container = messagesContainerRef.current;
        const target = latestTurnTopRef.current || latestMessageTopRef.current;
        if (container && target) {
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const targetScrollTop = targetRect.top - containerRect.top + container.scrollTop;
          container.scrollTo({
            top: Math.max(0, targetScrollTop - 16),
            behavior: 'smooth'
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }

    if (hadNewMessage || justStoppedLoading) {
      isUserScrollingRef.current = false;

      // Fase 1: Umiddelbar posisjonering i rAF
      const rafId = requestAnimationFrame(() => {
        performSmartScrollToTop(false);
      });

      // Fase 2: Myk justering etter hydrering (60ms)
      const t1 = setTimeout(() => {
        if (!isUserScrollingRef.current) {
          performSmartScrollToTop(true);
        }
      }, 60);

      // Fase 3: Stabilisering (200ms)
      const t2 = setTimeout(() => {
        if (!isUserScrollingRef.current) {
          performSmartScrollToTop(true);
        }
      }, 200);

      // Fase 4: Endelig garanti for topp-låsing (450ms)
      const t3 = setTimeout(() => {
        if (!isUserScrollingRef.current) {
          performSmartScrollToTop(true);
        }
      }, 450);

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [messages, isLoading, performSmartScrollToTop]);

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

  // Auto-juster høyde på tekstfeltet basert på innhold (slik som i MesterWorkstation)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 38), 140)}px`;
    }
  }, [inputVal]);

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
    if (textareaRef.current) textareaRef.current.style.height = '38px';

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

    setActiveThinkingDuration(0);
    setActiveThinkingQuery(textToSend.trim() || userMsgText || '');
    setActiveThinkingHasImage(Boolean(activeImage));
    setIsLoading(true);

    if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    let seconds = 0;
    thinkingTimerRef.current = setInterval(() => {
      seconds += 1;
      setActiveThinkingDuration(seconds);
    }, 1000);

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
          history: messages
            .filter(m => m.id !== 'welcome' && m.id !== userMsg.id)
            .slice(-12)
            .map(m => ({ role: m.role, content: m.content })),
          sessionId: `copilot-${user?.id || 'guest'}`,
          projectName: currentProjName,
          projectId: selectedProject?.id,
          availableProjects: projects.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code || p.projectCode,
            address: p.address || (p as any).location,
            progress: typeof p.progress === 'number' ? p.progress : 0,
            status: p.status || 'active',
            stage: p.stage || 'Pågående',
            clientName: p.clientName || 'Privatkunde'
          })),
          userName,
          userTrade,
          companyName,
          userId: user?.id,
          language: i18n?.language || 'no',
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
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      setIsLoading(false);
      setActiveThinkingQuery('');
      setActiveThinkingHasImage(false);
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
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5"
        >
          {lastLiveAction && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-lg backdrop-blur-md"
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
            className="group relative flex items-center gap-3 px-4.5 py-3 rounded-full bg-[#1e1f20] hover:bg-[#282a2d] text-white font-bold text-[14px] sm:text-[15px] shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 cursor-pointer border border-white/15 hover:border-white/30"
            title="Spør MesterAI (Ctrl+M)"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <MesterAIIcon size="sm" />
            <span className="tracking-wide">MesterAI</span>
            <span className="hidden md:inline text-[11px] font-mono opacity-70 bg-white/10 px-1.5 py-0.5 rounded-md">
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
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 p-2 bg-[#0A101D]/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl"
        >
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#161c28] hover:bg-[#1a2233] text-white text-xs sm:text-sm font-bold border border-slate-700/80 transition-all cursor-pointer"
          >
            <MesterAIIcon size="xs" />
            <span>MesterAI</span>
            {currentProjName && (
              <span className="text-[12px] text-slate-400 truncate max-w-[130px]">({currentProjName})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* 🚀 3. COPILOT HOVEDVINDU (Side-drawer / Floating Copilot styled identical to Gemini chat) */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed z-50 bg-[#0A101D] shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl transition-all duration-300",
              isFullscreen
                ? "inset-0 sm:inset-4 sm:rounded-3xl border-0 sm:border border-slate-800"
                : "inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[540px] sm:h-[700px] sm:max-h-[calc(100vh-48px)] sm:rounded-3xl border-0 sm:border border-slate-800/90"
            )}
          >
            {/* Header: Gemini Workstation style */}
            <div 
              className="h-16 px-4 sm:px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0 bg-[#0A101D] select-none"
              style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <MesterAIIcon size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-bold text-white tracking-tight truncate">MesterAI</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/25 text-purple-200 border border-purple-500/40">
                      AI
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Autonom
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                    <Building2 size={13} className="text-slate-500 shrink-0" />
                    <span className="truncate">{currentProjName ? currentProjName : companyName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  title="Nullstill samtale"
                  onClick={handleClearHistory}
                  className="p-2 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  type="button"
                  title={isFullscreen ? "Minimer vindu" : "Fullskjerm"}
                  onClick={() => setIsFullscreen(prev => !prev)}
                  className="p-2 hover:text-white hover:bg-white/10 rounded-xl transition-all hidden sm:block cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  type="button"
                  title="Minimer til dock"
                  onClick={() => setIsMinimized(true)}
                  className="p-2 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <Minus size={16} />
                </button>
                <button
                  type="button"
                  title="Lukk MesterAI"
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Meldingsliste */}
            <div 
              ref={messagesContainerRef}
              onWheel={handleUserScrollIntent}
              onTouchMove={handleUserScrollIntent}
              style={{ overflowAnchor: 'none' }}
              className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-5 custom-scrollbar [overflow-anchor:none] bg-[#0A101D]"
            >
              {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                const isLatest = idx === messages.length - 1;
                const isPromptForLatest = 
                  idx === messages.length - 2 && 
                  m.role === 'user' && 
                  messages[messages.length - 1]?.role === 'assistant';

                return (
                  <div
                    key={m.id}
                    ref={
                      isPromptForLatest 
                        ? latestTurnTopRef 
                        : isLatest 
                        ? latestMessageTopRef 
                        : undefined
                    }
                    className={cn(
                      "flex flex-col gap-1.5 scroll-mt-6 transition-all",
                      isUser ? "max-w-[88%] ml-auto items-end" : "w-full items-start"
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold px-1">
                      {isUser ? (
                        <>
                          <span>Du</span>
                          <span>•</span>
                          <span>{m.timestamp}</span>
                        </>
                      ) : (
                        <>
                          <MesterAIIcon size="xs" />
                          <span className="text-slate-200 font-bold">MesterAI</span>
                          <span>•</span>
                          <span>{m.timestamp}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={cn(
                        "w-full transition-all relative group",
                        isUser
                          ? "bg-[#24272a] text-white px-5 py-3.5 sm:px-6 sm:py-4 rounded-[26px] shadow-sm text-[16px] sm:text-[17px] font-medium leading-relaxed border border-white/5"
                          : "bg-[#13161c]/90 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-lg backdrop-blur-md"
                      )}
                    >
                      {/* Bildevedlegg i meldingen */}
                      {m.imageUrl && (
                        <div className="mb-3 rounded-2xl overflow-hidden border border-white/20 max-w-[260px] shadow-md">
                          <img src={m.imageUrl} alt="Vedlegg" className="w-full h-auto object-cover" />
                        </div>
                      )}

                      {/* Selve teksten */}
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <div className="text-white">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ node, ...props }) => (
                                <h2 className="text-[20px] sm:text-[22px] font-bold text-white mt-4 mb-2 tracking-tight border-b border-slate-800/80 pb-1.5 flex items-center gap-2" {...props} />
                              ),
                              h2: ({ node, ...props }) => (
                                <h3 className="text-[18px] sm:text-[20px] font-bold text-white mt-3.5 mb-2 tracking-tight flex items-center gap-2" {...props} />
                              ),
                              h3: ({ node, ...props }) => (
                                <h4 className="text-[16px] sm:text-[17px] font-bold text-emerald-400 mt-3 mb-1.5 uppercase tracking-wide flex items-center gap-2" {...props} />
                              ),
                              p: ({ node, ...props }) => (
                                <p className="text-[15px] sm:text-[16px] text-white/95 leading-[1.65] font-normal mb-3 last:mb-0" {...props} />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul className="my-2.5 space-y-2 pl-1 list-none" {...props} />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol className="my-2.5 space-y-2 pl-5 list-decimal text-[15px] sm:text-[16px] text-white/95 leading-[1.65]" {...props} />
                              ),
                              li: ({ node, ...props }) => (
                                <li className="text-[15px] sm:text-[16px] text-white/95 leading-[1.65] flex items-start gap-2.5">
                                  <span className="w-2 h-2 rounded-full border-2 border-emerald-400/90 bg-emerald-400/40 mt-2 shrink-0 shadow-xs" />
                                  <span className="flex-1 min-w-0">{props.children}</span>
                                </li>
                              ),
                              strong: ({ node, ...props }) => (
                                <strong className="font-bold text-white" {...props} />
                              ),
                              blockquote: ({ node, ...props }) => (
                                <blockquote className="my-3 p-3.5 bg-emerald-950/30 border-l-4 border-emerald-500 rounded-r-2xl text-[14px] sm:text-[15px] text-emerald-200 leading-relaxed shadow-xs" {...props} />
                              ),
                              table: ({ node, ...props }) => (
                                <div className="my-3 rounded-2xl border border-slate-800 overflow-x-auto text-[14px] sm:text-[15px] shadow-md bg-slate-950/80">
                                  <table className="w-full text-left divide-y divide-slate-800" {...props} />
                                </div>
                              ),
                              th: ({ node, ...props }) => (
                                <th className="p-3 bg-slate-900 text-slate-300 font-bold text-[12px] uppercase tracking-wider" {...props} />
                              ),
                              td: ({ node, ...props }) => (
                                <td className="p-3 text-white/90 border-b border-slate-800/60" {...props} />
                              ),
                              code: ({ node, inline, ...props }: any) => (
                                <code className="px-2 py-0.5 rounded-lg bg-slate-800/90 text-amber-300 font-mono text-[14px] border border-slate-700/50" {...props} />
                              ),
                              a: ({ node, href, children, ...props }: any) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1 rounded-xl border border-emerald-500/30 transition-all font-semibold text-[14px] no-underline group shadow-xs my-0.5 cursor-pointer"
                                  {...props}
                                >
                                  <ExternalLink size={13} className="text-emerald-400 group-hover:text-emerald-300 shrink-0" />
                                  <span className="underline decoration-emerald-400/40 group-hover:decoration-white">{children}</span>
                                </a>
                              )
                            }}
                          >
                            {formatAiMarkdown(m.content)}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Kopieringsknapp for assistentmeldinger */}
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.content)}
                          className="absolute bottom-3 right-3 p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Kopier svar"
                        >
                          {copiedId === m.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>

                    {/* Hurtigvalg (Quick Replies / Foreslåtte oppgaver) - Styled identically to workstation suggestion cards */}
                    {m.quickReplies && m.quickReplies.length > 0 && (
                      <div className="w-full space-y-2 pt-2">
                        {m.quickReplies.map((qr, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleSendMessage(qr.payload)}
                            className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#1e1f20]/90 hover:bg-[#282a2d] border border-white/10 hover:border-white/20 text-left text-[14px] sm:text-[15px] font-medium text-slate-100 hover:text-white transition-all cursor-pointer group active:scale-98 shadow-sm disabled:opacity-50"
                          >
                            <span className="truncate">{qr.title}</span>
                            <ArrowRight size={16} className="text-slate-400 group-hover:text-white shrink-0 transition-transform group-hover:translate-x-1" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ✨ Next-Gen Dynamic Reasoning HUD i samtalestrømmen */}
              {isLoading && (() => {
                const flow = getDynamicReasoningFlow(
                  activeThinkingQuery,
                  activeThinkingHasImage,
                  i18n?.language || 'no'
                );

                return (
                  <div className="w-full rounded-2xl bg-[#0c1220]/95 border border-purple-500/30 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 my-2 overflow-hidden relative">
                    {/* Subtil bakgrunnsglød */}
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-purple-600/10 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-600/10 rounded-full blur-xl pointer-events-none" />

                    {/* Topplinje med tittel og timer */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 relative z-10">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600/25 to-blue-600/25 border border-purple-500/35 shrink-0">
                          <Sparkles size={12} className="text-purple-300 animate-pulse" />
                          <span className="absolute inset-0 rounded-lg bg-purple-400/20 animate-ping opacity-60" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white tracking-wide truncate">
                            {flow.headline}
                          </span>
                          <span className="text-[9px] text-purple-300/80 font-mono tracking-wider uppercase font-semibold">
                            {flow.subSummary}
                          </span>
                        </div>
                      </div>

                      {/* Sanntids tenketimer */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-mono text-purple-300 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                        <span>{activeThinkingDuration}s</span>
                      </div>
                    </div>

                    {/* Levende fremdriftslinje */}
                    <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden my-2 relative z-10">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${Math.min(96, Math.max(16, (activeThinkingDuration / 7.5) * 100))}%` }}
                      />
                    </div>

                    {/* Dynamisk punktvis resonneringsstrøm */}
                    <div className="space-y-1.5 relative z-10">
                      {flow.steps.map((step, idx, arr) => {
                        const isDone = activeThinkingDuration >= (arr[idx + 1]?.time ?? 99);
                        const isActive = !isDone && activeThinkingDuration >= step.time;

                        return (
                          <div 
                            key={step.id} 
                            className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                              isDone 
                                ? 'text-slate-300 font-normal' 
                                : isActive 
                                ? 'text-white font-medium drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]' 
                                : 'text-slate-500/70 opacity-40'
                            }`}
                          >
                            {isDone ? (
                              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                <Check size={9} strokeWidth={3} />
                              </div>
                            ) : isActive ? (
                              <div className="w-3.5 h-3.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center shrink-0">
                                <Loader2 size={9} className="animate-spin text-purple-400" />
                              </div>
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center shrink-0">
                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                              </div>
                            )}
                            <span className="flex-1 truncate">
                              {step.title}
                              {isActive && <span className="inline-block animate-pulse ml-0.5">...</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div ref={messagesEndRef} />
            </div>

            {/* Input-seksjon: 1:1 Gemini Prompt Box */}
            <div 
              className="p-3.5 bg-[#0A101D] border-t border-slate-800/80 shrink-0 space-y-2.5"
              style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
            >
              {/* Forhåndsvisning av vedlagt bilde */}
              {attachedImage && (
                <div className="flex items-center gap-2 p-2 bg-slate-800/90 rounded-2xl border border-slate-700 w-fit">
                  <img src={attachedImage.preview} alt="Vedlegg" className="w-9 h-9 rounded-xl object-cover" />
                  <span className="text-xs text-slate-300 truncate max-w-[160px]">{attachedImage.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 hover:text-rose-400 text-slate-400 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 bg-[#1e1f20] hover:bg-[#24272b] border border-white/10 focus-within:border-white/25 focus-within:ring-2 focus-within:ring-purple-500/25 rounded-[28px] p-2 sm:p-2.5 shadow-2xl transition-all">
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
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors active:scale-95 disabled:opacity-50"
                >
                  <Camera size={18} />
                </button>

                {/* Mikrofon (Speech-to-text) */}
                <button
                  type="button"
                  title={isListeningMic ? "Lytter... Trykk for å stoppe" : "Snakk inn oppgaven (Mikrofon)"}
                  onClick={toggleMic}
                  className={cn(
                    "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95",
                    isListeningMic 
                      ? "bg-rose-500 text-white animate-pulse" 
                      : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                  )}
                >
                  {isListeningMic ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                {/* Tekstfelt */}
                <textarea
                  ref={textareaRef}
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
                  placeholder={
                    activeModuleTab === 'dailylog'
                      ? "F.eks: 'Før 7.5 timer i dag på Vidjeveien'..."
                      : activeModuleTab === 'deviations'
                        ? "Beskriv avvik eller spør om TEK17..."
                        : activeModuleTab === 'sja'
                          ? "F.eks: 'Lag SJA for stillas i regn'..."
                          : t('ws_ask_mesterai', "Spør MesterAI...")
                  }
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 bg-transparent px-3 py-1.5 text-[15px] sm:text-[16px] text-white placeholder:text-slate-400 focus:outline-none resize-none max-h-36 min-h-[42px] leading-relaxed no-scrollbar overflow-y-auto"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                />

                {/* Send-knapp */}
                <button
                  type="button"
                  disabled={(!inputVal.trim() && !attachedImage) || isLoading}
                  onClick={() => handleSendMessage(inputVal)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-white disabled:text-slate-600 flex items-center justify-center shrink-0 cursor-pointer shadow-md shadow-purple-600/30 active:scale-95 transition-all disabled:opacity-40 disabled:shadow-none"
                  title={t('ws_send', "Send")}
                >
                  <Send size={16} className="translate-x-0.5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
                <span>Enter for å sende • Shift+Enter for ny linje</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Zap size={11} className="text-emerald-400" />
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
