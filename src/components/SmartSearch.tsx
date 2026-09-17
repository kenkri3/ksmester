import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, Command, Brain, Building2, AlertTriangle, FileText, ArrowRight, 
  Loader2, Sparkles, CheckSquare, Clock, ShieldCheck, DollarSign, Camera, 
  Truck, Package, ExternalLink, HardHat, Info, Wrench, ChevronRight, CornerDownLeft,
  CheckCircle2, MapPin
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { generateAiContent } from '../services/aiClient';
import { db, collection, getDocs, query, limit } from '../services/firebase';
import { Project, Deviation } from '../types';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

export interface SmartSearchItem {
  id?: string;
  category: 'action' | 'project' | 'deviation' | 'route' | 'status' | 'ai';
  title: string;
  description: string;
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'purple' | 'orange' | 'rose' | 'slate' | 'amber' | 'cyan' | 'indigo';
  icon: any;
  actionType: string;
  metadata?: any;
}

interface SmartSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (actionType: string, id?: string, extra?: any) => void;
  projects?: Project[];
  deviations?: Deviation[];
  recentActivities?: any[];
}

const SYSTEM_ACTIONS: SmartSearchItem[] = [
  // Prosjekter
  {
    category: 'action',
    title: 'Vis alle prosjekter',
    description: 'Åpne prosjektoversikten med fremdrift, værvarsel og status',
    badge: 'Prosjekter',
    badgeColor: 'blue',
    icon: Building2,
    actionType: 'prosjekter',
    metadata: { keywords: ['prosjekt', 'prosjekter', 'oversikt', 'vis alle', 'liste', 'byggeplasser', 'ordre', 'alle prosjekter'] }
  },
  {
    category: 'action',
    title: 'Opprett nytt prosjekt',
    description: 'Start nytt byggeprosjekt med MesterAI, TEK17-sjekk og værsynk',
    badge: 'MesterAI',
    badgeColor: 'emerald',
    icon: HardHat,
    actionType: 'create_project',
    metadata: { keywords: ['nytt prosjekt', 'opprett', 'lag', 'start prosjekt', 'nybygg', 'tilbygg', 'rehabilitering', 'anbud'] }
  },
  // Avvik & Kvalitet
  {
    category: 'action',
    title: 'Opprett nytt avvik',
    description: 'Meld inn HMS- eller kvalitetsavvik med bilde, lokasjon og alvorlighetsgrad',
    badge: 'Kvalitet',
    badgeColor: 'rose',
    icon: AlertTriangle,
    actionType: 'create_deviation',
    metadata: { keywords: ['avvik', 'nytt avvik', 'feil', 'mangel', 'hms avvik', 'skade', 'avviksmelding', 'rua', 'reklamasjon', 'meld avvik'] }
  },
  {
    category: 'action',
    title: 'Kvalitets- og avviksoversikt',
    description: 'Se alle åpne og lukkede avvik, statistikk og tiltak',
    badge: 'Kvalitet',
    badgeColor: 'orange',
    icon: AlertTriangle,
    actionType: 'deviations',
    metadata: { keywords: ['avvik', 'kvalitet', 'oversikt', 'åpne avvik', 'behandle avvik', 'rua', 'avviksbehandling'] }
  },
  {
    category: 'action',
    title: 'Tverrfaglig Lukkesperre (Pre-close check)',
    description: 'Kontroller at rør, elektro, dampsperre og isolasjon er godkjent før vegg lukkes',
    badge: 'TEK17 Sperre',
    badgeColor: 'rose',
    icon: ShieldCheck,
    actionType: 'pre_close',
    metadata: { keywords: ['lukkesperre', 'pre-close', 'lukke vegg', 'vegg', 'trykktest', 'dampsperre', 'tverrfaglig', 'sperre', 'rør-i-rør', 'inspeksjon', 'bad 2. etg'] }
  },
  {
    category: 'action',
    title: 'TEK17 Visjonskontroll (AI-kamera)',
    description: 'Skann byggeplassen med kamera for automatisk verifisering av fall og rørføring',
    badge: 'AI Syn',
    badgeColor: 'purple',
    icon: Camera,
    actionType: 'tek17_vision',
    metadata: { keywords: ['kamera', 'visjon', 'bilde', 'skann', 'tek17 visjon', 'foto', 'membran', 'sluk', 'bildekontroll'] }
  },
  // Sjekklister & HMS
  {
    category: 'action',
    title: 'Sjekkliste for tømrer',
    description: 'Kvalitetskontroll for bindingsverk, vindsperre, isolasjon og kledning iht. NS 3420',
    badge: 'Tømrer',
    badgeColor: 'blue',
    icon: CheckSquare,
    actionType: 'start_checklist',
    metadata: { keywords: ['sjekkliste', 'tømrer', 'trearbeid', 'vindsperre', 'bindingsverk', 'kledning', 'ns3420', 'lekting', 'sjekklister'] }
  },
  {
    category: 'action',
    title: 'Sjekkliste for våtrom & membran (BVN)',
    description: 'Kontroll av slukmansjett, klemring, fall og membran iht. Byggebransjens Våtromsnorm',
    badge: 'Våtrom',
    badgeColor: 'cyan',
    icon: CheckSquare,
    actionType: 'start_checklist',
    metadata: { keywords: ['våtrom', 'bad', 'membran', 'sluk', 'fall', 'bvn', 'smøremembran', 'rørlegger'] }
  },
  {
    category: 'action',
    title: 'HMS-håndbok & Vernerunde',
    description: 'Gjennomfør vernerunde, se sikkerhetsrutiner og rapporter uønskede hendelser',
    badge: 'HMS / SHA',
    badgeColor: 'emerald',
    icon: ShieldCheck,
    actionType: 'hms',
    metadata: { keywords: ['hms', 'hms håndbok', 'vernerunde', 'sha', 'arbeidstilsynet', 'sikkerhet', 'førstehjelp', 'brannvern'] }
  },
  {
    category: 'action',
    title: 'Sikker Jobb Analyse (SJA)',
    description: 'Gjennomfør og signer SJA for risikofylt arbeid i høyden eller med maskiner',
    badge: 'Sikkerhet',
    badgeColor: 'amber',
    icon: Wrench,
    actionType: 'sja',
    metadata: { keywords: ['sja', 'sikker jobb analyse', 'risiko', 'farlig arbeid', 'arbeid i høyden', 'stillas', 'gravearbeid'] }
  },
  // Byggedagbok & Timeføring
  {
    category: 'action',
    title: 'Automatisk Byggedagbok',
    description: 'Se og eksporter dagbøker synkronisert med Yr-værforhold og timeføring (Byggherreforskriften)',
    badge: 'Lovpålagt',
    badgeColor: 'cyan',
    icon: Clock,
    actionType: 'daily_log',
    metadata: { keywords: ['byggedagbok', 'dagbok', 'dagsrapport', 'vær', 'yr', 'mannskapsliste', 'force majeure', 'byggherreforskriften', 'lekting og vindsperre'] }
  },
  {
    category: 'action',
    title: 'Før timer (Timeføring)',
    description: 'Registrer arbeidstimer, overtid, faggruppe og maskintid på byggeprosjekter',
    badge: 'Timer',
    badgeColor: 'blue',
    icon: Clock,
    actionType: 'time_registration',
    metadata: { keywords: ['time', 'timer', 'timeføring', 'arbeidstid', 'lønn', 'timerapportering', 'stempling', 'føre timer'] }
  },
  // Endringsordrer & Økonomi
  {
    category: 'action',
    title: 'Endringsordrer & Tilleggskrav (NS 8406)',
    description: 'Varsle tilleggsarbeid uten ugrunnet opphold for å sikre betaling og fristforlengelse',
    badge: 'NS 8406',
    badgeColor: 'purple',
    icon: DollarSign,
    actionType: 'change_order',
    metadata: { keywords: ['endring', 'endringsordre', 'ekstraarbeid', 'tillegg', 'varsel', 'ns8406', 'krav', 'penger', 'faktura', 'downlights'] }
  },
  {
    category: 'action',
    title: 'Opprett Tilbud / Pristilbud',
    description: 'MesterAI hjelper deg å kalkulere materialer, timeforbruk og sende profesjonelt tilbud',
    badge: 'Kalkyle',
    badgeColor: 'emerald',
    icon: FileText,
    actionType: 'offer',
    metadata: { keywords: ['tilbud', 'anbud', 'pris', 'kalkyle', 'befaring', 'overslag', 'kunde'] }
  },
  {
    category: 'action',
    title: 'Kontrakter & Juridisk Risikovurdering',
    description: 'Generer og analyser NS 8405 / NS 8406 kontrakter med juridisk AI-sjekk',
    badge: 'Kontrakt',
    badgeColor: 'indigo',
    icon: FileText,
    actionType: 'contract',
    metadata: { keywords: ['kontrakt', 'avtale', 'ns8405', 'ns8406', 'håndverkeravtale', 'juridisk', 'dagmulkt'] }
  },
  // Verktøy & Ressurser
  {
    category: 'action',
    title: 'Dokumentarkiv (FDV & Tegninger)',
    description: 'Arkiv for byggetegninger, FDV-dokumentasjon, produktdatablader og sertifikater',
    badge: 'Arkiv',
    badgeColor: 'slate',
    icon: FileText,
    actionType: 'archive',
    metadata: { keywords: ['arkiv', 'dokumenter', 'tegninger', 'fdv', 'sertifikater', 'pdf', 'filer'] }
  },
  {
    category: 'action',
    title: 'Varelager & Mottakskontroll',
    description: 'Oversikt over verktøy, materialer og kjemikalier på byggeplass og lager',
    badge: 'Lager',
    badgeColor: 'slate',
    icon: Package,
    actionType: 'inventory',
    metadata: { keywords: ['lager', 'varelager', 'materialer', 'verktøy', 'mottak', 'bestilling'] }
  },
  {
    category: 'action',
    title: 'Bilpark & Kjørebok',
    description: 'Firmabiler, kilometerlogg, EU-kontroll og serviceintervaller',
    badge: 'Kjøretøy',
    badgeColor: 'slate',
    icon: Truck,
    actionType: 'vehicle',
    metadata: { keywords: ['bil', 'biler', 'kjøretøy', 'bilpark', 'kjørebok', 'service', 'firmabil'] }
  },
  {
    category: 'action',
    title: 'Byggesøknad & Nabovarsel Veileder',
    description: 'Regler og veileder for tiltak unntatt søknadsplikt og nabovarsling iht. SAK10',
    badge: 'Plan & Bygg',
    badgeColor: 'cyan',
    icon: FileText,
    actionType: 'building_app',
    metadata: { keywords: ['byggesøknad', 'sak10', 'nabovarsel', 'søknad', 'ansvarsrett', 'dispensasjon', 'kommune'] }
  },
  {
    category: 'action',
    title: 'Åpne Feltapp (Mobilgrensesnitt)',
    description: 'Bytt til det enkle 1-hånds mobilgrensesnittet for bruk på byggeplass',
    badge: 'Mobil',
    badgeColor: 'emerald',
    icon: ExternalLink,
    actionType: 'mobile',
    metadata: { keywords: ['mobil', 'feltapp', 'app', 'telefon', 'smarttelefon', 'ute i felt'] }
  },
  // Faglige web-ruter
  {
    category: 'route',
    title: 'Fallkalkulator (TEK17 Våtrom)',
    description: 'Beregn nøyaktig fall på gulv mot sluk iht. TEK17 § 13-17 (1:50 og 1:100)',
    badge: 'Kalkulator',
    badgeColor: 'blue',
    icon: Wrench,
    actionType: 'route',
    id: '/verktoy/fall-kalkulator-tek17',
    metadata: { keywords: ['fall', 'fallkalkulator', 'sluk', 'våtrom', 'tek17', '1:50', 'dusjnisje'] }
  },
  {
    category: 'route',
    title: 'SJA Generator Verktøy',
    description: 'Lag en fullstendig Sikker Jobb Analyse på nett med risikomatrise',
    badge: 'Kalkulator',
    badgeColor: 'amber',
    icon: ShieldCheck,
    actionType: 'route',
    id: '/verktoy/sja-generator',
    metadata: { keywords: ['sja generator', 'risikomatrise', 'farer', 'tiltak', 'sikkerhet'] }
  },
  {
    category: 'route',
    title: 'Varslingsfristkalkulator (NS 8406)',
    description: 'Beregn juridisk frist for "uten ugrunnet opphold" ved varsling av tilleggskrav',
    badge: 'Juss',
    badgeColor: 'purple',
    icon: DollarSign,
    actionType: 'route',
    id: '/verktoy/varslingsfrist-ns8406',
    metadata: { keywords: ['frist', 'varslingsfrist', 'ugrunnet opphold', 'ns8406', 'preklusjon', 'tidsfrist'] }
  },
  {
    category: 'route',
    title: 'Kjemisk Stoffkartotek',
    description: 'Lovpålagt register over kjemikalier, sikkerhetsdatablader og verneutstyr',
    badge: 'Lovkrav',
    badgeColor: 'rose',
    icon: Package,
    actionType: 'route',
    id: '/stoffkartotek',
    metadata: { keywords: ['stoffkartotek', 'kjemikalier', 'datablad', 'sds', 'sikkerhetsdatablad', 'gift', 'fugemasse', 'lim'] }
  }
];

export default function SmartSearch({ 
  isOpen, 
  onClose, 
  onNavigate,
  projects: initialProjects = [],
  deviations: initialDeviations = []
}: SmartSearchProps) {
  const { t } = useTranslation();
  const [queryText, setQueryText] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiInsight, setAiInsight] = useState<{ answer: string; suggestedAction?: SmartSearchItem } | null>(null);
  const [liveProjects, setLiveProjects] = useState<Project[]>(initialProjects);
  const [liveDeviations, setLiveDeviations] = useState<Deviation[]>(initialDeviations);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(queryText, 450);

  // Synchronize incoming props or fetch live projects if empty
  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) {
      setLiveProjects(initialProjects);
    } else if (isOpen) {
      getDocs(query(collection(db, 'projects'), limit(50)))
        .then(snap => {
          setLiveProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
        })
        .catch(err => console.warn('Could not load projects for search:', err));
    }
  }, [initialProjects, isOpen]);

  useEffect(() => {
    if (initialDeviations && initialDeviations.length > 0) {
      setLiveDeviations(initialDeviations);
    } else if (isOpen) {
      getDocs(query(collection(db, 'deviations'), limit(50)))
        .then(snap => {
          setLiveDeviations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Deviation)));
        })
        .catch(err => console.warn('Could not load deviations for search:', err));
    }
  }, [initialDeviations, isOpen]);

  // Focus input and reset state on open
  useEffect(() => {
    if (isOpen) {
      setQueryText('');
      setAiInsight(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Instant Multi-Entity Matching (0 ms latency)
  const instantResults = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return [];

    const matches: SmartSearchItem[] = [];

    // 1. Check for specific status questions (e.g. "Hva er status på Bjørklund?", "status på...")
    const isStatusQuery = q.includes('status') || q.includes('fremdrift') || q.includes('hva er');
    if (isStatusQuery) {
      for (const p of liveProjects) {
        const nameLower = (p.name || '').toLowerCase();
        const codeLower = (p.projectCode || '').toLowerCase();
        const clientLower = (p.clientName || '').toLowerCase();
        const locationLower = (p.location || '').toLowerCase();

        const queryTerms = q.replace(/hva er|status på|status|fremdrift|hvordan går det med|\?/gi, '').trim().split(/\s+/).filter(w => w.length > 2);
        const matchesProject = queryTerms.length === 0 || queryTerms.some(term => 
          nameLower.includes(term) || codeLower.includes(term) || clientLower.includes(term) || locationLower.includes(term)
        );

        if (matchesProject) {
          const devCount = liveDeviations.filter(d => d.projectId === p.id && d.status !== 'closed').length;
          matches.push({
            id: p.id,
            category: 'status',
            title: `Status: ${p.name || 'Prosjekt'}`,
            description: `${p.progress || 0}% fremdrift • ${p.status === 'active' ? 'I drift' : 'Planlagt'} • ${p.location || 'Norge'}${devCount > 0 ? ` • ${devCount} åpne avvik` : ' • 0 åpne avvik'} • Kunde: ${p.clientName || 'Privat'}`,
            badge: `${p.progress || 0}% Fullført`,
            badgeColor: 'emerald',
            icon: CheckCircle2,
            actionType: 'nav_project',
            metadata: { project: p }
          });
        }
      }
    }

    // 2. Search in System Actions & Tools
    for (const act of SYSTEM_ACTIONS) {
      const titleMatch = act.title.toLowerCase().includes(q);
      const descMatch = act.description.toLowerCase().includes(q);
      const keywordMatch = act.metadata?.keywords?.some((k: string) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));

      if (titleMatch || descMatch || keywordMatch) {
        matches.push(act);
      }
    }

    // 3. Search in Live Projects (Name, Code, GNR/BNR, Location, Client, Tags)
    for (const p of liveProjects) {
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const codeMatch = (p.projectCode || '').toLowerCase().includes(q);
      const locMatch = (p.location || '').toLowerCase().includes(q);
      const clientMatch = (p.clientName || '').toLowerCase().includes(q);
      const gnrMatch = p.gnr && String(p.gnr).includes(q);
      const bnrMatch = p.bnr && String(p.bnr).includes(q);
      const gnrBnrCombined = (p.gnr && p.bnr) ? `${p.gnr}/${p.bnr}`.includes(q) : false;
      const tagsMatch = Array.isArray(p.tags) && p.tags.some((t: string) => t.toLowerCase().includes(q));

      if (nameMatch || codeMatch || locMatch || clientMatch || gnrMatch || bnrMatch || gnrBnrCombined || tagsMatch) {
        matches.push({
          id: p.id,
          category: 'project',
          title: p.name || 'Prosjekt',
          description: `${p.projectCode ? `${p.projectCode} • ` : ''}${p.location || 'Norge'}${p.gnr && p.bnr ? ` (GNR: ${p.gnr}, BNR: ${p.bnr})` : ''} • Kunde: ${p.clientName || 'Privat'}`,
          badge: `${p.progress || 0}%`,
          badgeColor: 'blue',
          icon: Building2,
          actionType: 'nav_project',
          metadata: { project: p }
        });
      }
    }

    // 4. Search in Live Deviations
    for (const d of liveDeviations) {
      const titleMatch = (d.title || '').toLowerCase().includes(q);
      const descMatch = (d.description || '').toLowerCase().includes(q);
      const sevMatch = (d.severity || '').toLowerCase().includes(q);

      if (titleMatch || descMatch || sevMatch) {
        const proj = liveProjects.find(p => p.id === d.projectId);
        matches.push({
          id: d.id,
          category: 'deviation',
          title: d.title,
          description: `${proj ? `Prosjekt: ${proj.name} • ` : ''}${d.description || 'Ingen beskrivelse'}`,
          badge: `Avvik: ${d.severity?.toUpperCase() || 'NORMAL'}`,
          badgeColor: d.severity === 'high' ? 'rose' : 'orange',
          icon: AlertTriangle,
          actionType: 'deviation',
          metadata: { deviation: d }
        });
      }
    }

    return matches;
  }, [queryText, liveProjects, liveDeviations]);

  // AI Semantic Fallback & Question Answering
  useEffect(() => {
    const val = debouncedQuery.trim();
    if (val.length < 3) {
      setAiInsight(null);
      setIsAiSearching(false);
      return;
    }

    const isQuestionOrSentence = 
      val.includes('?') || 
      val.startsWith('hva') || 
      val.startsWith('hvem') || 
      val.startsWith('hvordan') || 
      val.startsWith('hvor') || 
      val.startsWith('hvorfor') || 
      val.startsWith('er det') || 
      val.includes('krav') ||
      val.includes('regel') ||
      val.includes('forskrift') ||
      instantResults.length === 0;

    if (!isQuestionOrSentence) {
      setAiInsight(null);
      return;
    }

    let isCancelled = false;
    setIsAiSearching(true);

    const runAiSearch = async () => {
      try {
        const contextProjects = liveProjects.slice(0, 10).map(p => ({
          name: p.name,
          code: p.projectCode,
          location: p.location,
          progress: p.progress,
          client: p.clientName
        }));

        const prompt = `
Du er MesterAI, en lynrask fagassistent i VikingMester (norsk KS- og prosjektstyring for byggmestre).
Brukeren søker eller spør om: "${val}"

Kontekst for prosjekter i systemet:
${JSON.stringify(contextProjects, null, 2)}

Svar direkte, profesjonelt og konsist på norsk (maks 2 korte setninger). Henvis til relevante norske standarder (TEK17, NS 8406, BVN) hvis relevant.
Foreslå også hvilken handling i systemet som er mest relevant:
- "prosjekter": Se prosjekter
- "create_deviation": Opprette avvik
- "start_checklist": Starte sjekkliste
- "daily_log": Byggedagbok
- "change_order": Endringsordre
- "pre_close": Lukkesperre
- "tek17_vision": TEK17 kamera

Svar i JSON-format:
{
  "answer": "Kort faglig svar til brukeren",
  "suggestedAction": "prosjekter" | "create_deviation" | "start_checklist" | "daily_log" | "change_order" | "pre_close" | "tek17_vision" | "none",
  "actionTitle": "Tekst på handlingsknapp"
}
`;

        const response = await generateAiContent({
          prompt,
          responseMimeType: 'application/json'
        });

        if (isCancelled) return;

        if (response.text) {
          const parsed = JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, '').trim());
          if (parsed.answer) {
            let matchedActionItem: SmartSearchItem | undefined = undefined;
            if (parsed.suggestedAction && parsed.suggestedAction !== 'none') {
              matchedActionItem = SYSTEM_ACTIONS.find(a => a.actionType === parsed.suggestedAction);
            }
            setAiInsight({
              answer: parsed.answer,
              suggestedAction: matchedActionItem
            });
          }
        }
      } catch (e) {
        console.warn('SmartSearch AI error:', e);
      } finally {
        if (!isCancelled) setIsAiSearching(false);
      }
    };

    runAiSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, liveProjects, instantResults.length]);

  const handleItemClick = (item: SmartSearchItem) => {
    if (item.actionType === 'route') {
      if (typeof window !== 'undefined' && item.id) {
        window.location.href = item.id;
      }
    } else {
      onNavigate(item.actionType, item.id, item.metadata);
      if (item.actionType === 'prosjekter' || item.actionType === 'projects') {
        window.dispatchEvent(new CustomEvent('switch_mester_tab', { detail: { tab: 'projects' } }));
      } else if (item.actionType === 'change_orders' || item.actionType === 'endringsordrer') {
        window.dispatchEvent(new CustomEvent('switch_mester_tab', { detail: { tab: 'admin' } }));
      } else if (item.actionType === 'team') {
        window.dispatchEvent(new CustomEvent('switch_mester_tab', { detail: { tab: 'team' } }));
      }
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, instantResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + instantResults.length) % Math.max(1, instantResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (instantResults[selectedIndex]) {
        handleItemClick(instantResults[selectedIndex]);
      } else if (aiInsight?.suggestedAction) {
        handleItemClick(aiInsight.suggestedAction);
      }
    }
  };

  const getBadgeClasses = (color?: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'emerald': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'purple': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'orange': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'rose': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'amber': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'cyan': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'indigo': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default: return 'bg-white/10 text-neutral-300 border-white/10';
    }
  };

  const getIconContainerClasses = (category: string, badgeColor?: string) => {
    if (category === 'status') return 'bg-emerald-500/20 text-emerald-400';
    if (category === 'project') return 'bg-blue-500/20 text-blue-400';
    if (category === 'deviation') return 'bg-rose-500/20 text-rose-400';
    if (badgeColor === 'purple') return 'bg-purple-500/20 text-purple-400';
    if (badgeColor === 'amber') return 'bg-amber-500/20 text-amber-400';
    return 'bg-emerald-500/20 text-emerald-400';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[5vh] sm:pt-[12vh] px-2 sm:px-4 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="bg-neutral-900 w-full max-w-2xl rounded-2xl sm:rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Search Input Bar */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-blue-950/40 shrink-0">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl shadow-lg shadow-emerald-500/10">
                <Brain size={18} className="sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-400 sm:w-5 sm:h-5" size={18} />
                <input
                  ref={inputRef}
                  type="text"
                  value={queryText}
                  onChange={(e) => {
                    setQueryText(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Søk i prosjekter, avvik, GNR/BNR, verktøy eller spør MesterAI..."
                  className="w-full bg-transparent border-none text-white placeholder-neutral-500 pl-7 sm:pl-9 focus:ring-0 text-sm sm:text-base outline-none font-medium"
                />
              </div>
              <div className="flex items-center gap-2">
                {isAiSearching && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold animate-pulse">
                    <Loader2 size={13} className="animate-spin" />
                    <span className="hidden sm:inline">Analyserer...</span>
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  <Command size={10} /> K
                </div>
                <button 
                  onClick={onClose} 
                  aria-label="Lukk søk"
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
              {/* AI Insight Card */}
              {aiInsight && (
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
                      <Sparkles size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">MesterAI Svar</span>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-normal">{aiInsight.answer}</p>
                      {aiInsight.suggestedAction && (
                        <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-center justify-between">
                          <button
                            onClick={() => handleItemClick(aiInsight.suggestedAction!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 text-xs font-bold hover:bg-emerald-400 transition-colors shadow-sm"
                          >
                            <span>Åpne {aiInsight.suggestedAction.title}</span>
                            <ArrowRight size={13} />
                          </button>
                          <span className="text-[10px] text-neutral-500 font-medium">Trykk Enter eller klikk for å åpne</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Instant Search Results */}
              {instantResults.length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    <span>Resultater ({instantResults.length})</span>
                    <span className="text-[9px] text-neutral-500">Bruk piltaster ↑↓ og Enter</span>
                  </div>
                  {instantResults.map((item, i) => {
                    const IconComponent = item.icon || Building2;
                    const isSelected = selectedIndex === i;
                    return (
                      <button
                        key={`${item.actionType}-${item.id || i}`}
                        onClick={() => handleItemClick(item)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={cn(
                          "w-full flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all group text-left border",
                          isSelected
                            ? "bg-white/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                            : "hover:bg-white/5 border-transparent hover:border-white/10"
                        )}
                      >
                        <div className={cn(
                          "p-2.5 sm:p-3 rounded-xl shrink-0 transition-transform group-hover:scale-105",
                          getIconContainerClasses(item.category, item.badgeColor)
                        )}>
                          <IconComponent size={18} className="sm:w-5 sm:h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-white font-bold truncate text-xs sm:text-sm">{item.title}</h4>
                            {item.badge && (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold border shrink-0",
                                getBadgeClasses(item.badgeColor)
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] sm:text-xs text-neutral-400 truncate font-medium">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-neutral-500 group-hover:text-emerald-400 transition-colors">
                          <CornerDownLeft size={13} className={cn("hidden sm:inline transition-opacity", isSelected ? "opacity-100 text-emerald-400" : "opacity-0")} />
                          <ChevronRight size={16} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : queryText.trim().length > 1 ? (
                <div className="py-10 text-center space-y-3">
                  <Info className="mx-auto text-neutral-500" size={28} />
                  <p className="text-xs sm:text-sm text-neutral-300 font-semibold">Ingen direkte treff for &quot;{queryText}&quot;</p>
                  <p className="text-[11px] sm:text-xs text-neutral-500 max-w-sm mx-auto">
                    Prøv å søke etter prosjektnavn, kundenavn, GNR/BNR, verktøy eller still et fagspørsmål til MesterAI.
                  </p>
                  <button
                    onClick={() => {
                      onNavigate('ask_ai', undefined, { prompt: queryText });
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-all shadow-md cursor-pointer"
                  >
                    <Brain size={14} />
                    <span>Spør MesterAI om &quot;{queryText}&quot;</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ) : (
                /* Default Quick Actions / Suggestions */
                <div className="py-2 px-1 sm:px-2 space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2.5 px-1">
                      Hurtigvalg & Forslag
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { 
                          title: 'Vis alle prosjekter', 
                          action: () => handleItemClick({
                            category: 'action',
                            title: 'Vis alle prosjekter',
                            description: 'Prosjektoversikt og fremdrift',
                            badge: 'Prosjekter',
                            badgeColor: 'blue',
                            icon: Building2,
                            actionType: 'prosjekter'
                          }), 
                          icon: Building2, 
                          desc: 'Prosjektoversikt og fremdrift' 
                        },
                        { 
                          title: 'Opprett nytt avvik', 
                          action: () => handleItemClick({
                            category: 'action',
                            title: 'Opprett nytt avvik',
                            description: 'Meld inn HMS- eller kvalitetsavvik',
                            badge: 'Kvalitet',
                            badgeColor: 'rose',
                            icon: AlertTriangle,
                            actionType: 'create_deviation'
                          }), 
                          icon: AlertTriangle, 
                          desc: 'Meld inn HMS- eller kvalitetsavvik' 
                        },
                        { 
                          title: 'Sjekkliste for tømrer', 
                          action: () => handleItemClick({
                            category: 'action',
                            title: 'Sjekkliste for tømrer',
                            description: 'NS 3420 kontroll',
                            badge: 'Tømrer',
                            badgeColor: 'blue',
                            icon: CheckSquare,
                            actionType: 'start_checklist',
                            metadata: { trade: 'carpenter' }
                          }), 
                          icon: CheckSquare, 
                          desc: 'NS 3420 kontroll' 
                        },
                        { 
                          title: liveProjects[0]?.name ? `Hva er status på ${liveProjects[0].name}?` : 'Hva er status på Bjørklund?', 
                          action: () => {
                            const pName = liveProjects[0]?.name || 'Bjørklund';
                            setQueryText(`Hva er status på ${pName}?`);
                          }, 
                          icon: Brain, 
                          desc: 'Still statusspørsmål til AI' 
                        },
                        { 
                          title: 'Automatisk Byggedagbok', 
                          action: () => handleItemClick({
                            category: 'action',
                            title: 'Automatisk Byggedagbok',
                            description: 'Yr-værsynk og aktiviteter',
                            badge: 'Lovpålagt',
                            badgeColor: 'cyan',
                            icon: Clock,
                            actionType: 'daily_log'
                          }), 
                          icon: Clock, 
                          desc: 'Yr-værsynk og aktiviteter' 
                        },
                        { 
                          title: 'Endringsordrer (NS 8406)', 
                          action: () => handleItemClick({
                            category: 'action',
                            title: 'Endringsordrer (NS 8406)',
                            description: 'Varsle tillegg og frist',
                            badge: 'NS 8406',
                            badgeColor: 'purple',
                            icon: DollarSign,
                            actionType: 'change_order'
                          }), 
                          icon: DollarSign, 
                          desc: 'Varsle tillegg og frist' 
                        },
                        { 
                          title: 'Fallkalkulator (TEK17)', 
                          action: () => handleItemClick({
                            category: 'route',
                            title: 'Fallkalkulator (TEK17 Våtrom)',
                            description: '1:50 / 1:100 fall mot sluk',
                            badge: 'Kalkulator',
                            badgeColor: 'blue',
                            icon: Wrench,
                            actionType: 'route',
                            id: '/verktoy/fall-kalkulator-tek17'
                          }), 
                          icon: Wrench, 
                          desc: '1:50 / 1:100 fall mot sluk' 
                        },
                        { 
                          title: 'Tverrfaglig Lukkesperre', 
                          action: () => handleItemClick({
                            category: 'action',
                            title: 'Tverrfaglig Lukkesperre (Pre-close check)',
                            description: 'Stopp før vegg kles inn',
                            badge: 'TEK17 Sperre',
                            badgeColor: 'rose',
                            icon: ShieldCheck,
                            actionType: 'pre_close'
                          }), 
                          icon: ShieldCheck, 
                          desc: 'Stopp før vegg kles inn' 
                        }
                      ].map((sug, i) => {
                        const Icon = sug.icon;
                        return (
                          <button
                            key={i}
                            onClick={sug.action}
                            className="p-3 text-left rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-all border border-white/5 hover:border-white/10 group flex items-start gap-2.5 cursor-pointer"
                          >
                            <div className="p-2 rounded-lg bg-white/5 text-neutral-300 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors shrink-0">
                              <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-neutral-200 group-hover:text-white block truncate">{sug.title}</span>
                              <span className="text-[10px] text-neutral-400 block truncate">{sug.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with shortcuts */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-black/30 flex items-center justify-between text-[8px] sm:text-[10px] text-neutral-400 font-bold uppercase tracking-wider shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="flex items-center gap-1.5"><ArrowRight size={10} className="text-emerald-400" /> Enter = Åpne</span>
                <span className="flex items-center gap-1.5">↑↓ = Naviger</span>
                <span className="flex items-center gap-1.5">ESC = Lukk</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400">
                <Brain size={11} className="text-emerald-400" />
                <span>MesterAI Search v2.0</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


