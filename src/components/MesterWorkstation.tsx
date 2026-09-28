'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Camera,
  Copy,
  Check,
  Building2,
  HardHat,
  Trash2,
  Edit2,
  RefreshCw,
  Clock,
  FileSignature,
  ClipboardCheck,
  AlertTriangle,
  Calculator,
  Archive,
  Users,
  Menu,
  PanelLeftOpen,
  Radio,
  Search,
  Volume2,
  VolumeX,
  X,
  Plus,
  ArrowLeft,
  ChevronDown,
  MapPin,
  Bot,
  User as UserIcon,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  DollarSign,
  CheckCircle2,
  Shield,
  Calendar,
  Phone,
  Mail,
  FileText,
  Layers,
  Wrench,
  Eye,
  CornerDownLeft,
  MessageSquare,
  CheckSquare,
  Crown,
  Car,
  Package,
  Languages,
  GraduationCap,
  CloudSun,
  Lock,
  BookOpen,
  HelpCircle,
  FileSpreadsheet,
  FileCheck,
  SquarePen,
  Image as ImageIcon,
  Paperclip,
  Loader2
} from 'lucide-react';
import { getDynamicReasoningFlow } from '@/src/lib/reasoningEngine';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Project, Deviation, TeamChatConsultContext, Trade } from '../types';
import { chatSessionService, ChatSession, ChatMessageItem } from '../services/chatSessionService';
import WorkstationSidebar from './WorkstationSidebar';
import { NotificationBell } from './NotificationBell';
import InChatWorkspace, { InChatFormType } from './InChatWorkspace';
import DocumentationArchive from './DocumentationArchive';
import WorkstationSettingsModal from './WorkstationSettingsModal';
import ChangeOrderDetailModal from './ChangeOrderDetailModal';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../services/firebase';
import SuperAdmin from './SuperAdmin';
import OfferModal from './OfferModal';
import OfferDetailModal from './OfferDetailModal';
import ApprenticeModal from './ApprenticeModal';
import HMSModule from './HMSModule';
import BuildingApplicationModal from './BuildingApplicationModal';
import ChecklistModal from './ChecklistModal';
import AIVisionModal from './AIVisionModal';
import ContractModal from './ContractModal';
import HandoverModal from './HandoverModal';
import InventoryModal from './InventoryModal';
import TimeRegistrationModal from './TimeRegistrationModal';
import { formatAiMarkdown } from '../lib/formatAiMarkdown';
import WeatherWidget from './WeatherWidget';
import MesterAICopilot from './MesterAICopilot';
import ProjectTeamChat from './ProjectTeamChat';
import SendToTeamChatModal from './SendToTeamChatModal';
import { VehicleFleetManager } from './VehicleFleetManager';
import MesterAIIcon from './MesterAIIcon';
import QuickStartGuide from './QuickStartGuide';
import OnboardingWelcomeModal from './OnboardingWelcomeModal';
import MobileInstallGuideModal from './MobileInstallGuideModal';

interface MesterWorkstationProps {
  initialModuleTab?: string | null;
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project | null) => void;
  changeOrders: any[];
  offers: any[];
  deviations: Deviation[];
  lukkesperreZones: any[];
  recentActivities: any[];
  tasks: any[];
  initialPrompt?: string;
  onPromptHandled?: () => void;
  onOpenCreateProject: () => void;
  onOpenSmartSearch: () => void;
  onOpenAllModules: () => void;
  onApproveChangeOrder?: (id: string) => void;
  onRejectChangeOrder?: (id: string) => void;
  onDeleteChangeOrder?: (id: string, title: string) => void;
  onDeleteOffer?: (id: string, title: string) => void;
  onOpenPreClose?: (zone: any) => void;
  onOpenOmnichannelModal?: () => void;
  onOpenOfferModal?: (data?: any) => void;
  onOpenChangeOrderModal?: (data?: any) => void;
  onOpenSJAModal?: (data?: any) => void;
  onOpenAIVision?: () => void;
  onOpenDailyLogModal?: () => void;
  onOpenTimeModal?: () => void;
  onOpenArchiveModal?: () => void;
  onOpenContactsModal?: () => void;
  onOpenSettings: () => void;
  onOpenSuperAdmin?: () => void;
}

export interface ModuleGuideItem {
  title: string;
  badge: string;
  lawBadge?: string;
  desc: string;
  steps: { num: string; title: string; text: string }[];
  aiActionPrompt: string;
}

export const MODULE_GUIDE_DATA: Record<string, ModuleGuideItem> = {
  vehicle: {
    title: 'Bilpark & Elektronisk Kjørebok',
    badge: 'Flåtestyring & Kjøregodtgjørelse',
    lawBadge: 'Skatteetaten (4,90 kr/km)',
    desc: 'Holder orden på firmabiler og ansattes privatbiler. Regner automatisk ut Statens kilometersats og bompenger, klart til lønn og fakturering.',
    steps: [
      { num: '1', title: 'Velg eller registrer bil', text: 'Legg inn firmabil eller privatbil med start-kilometerstand under fanen Biler.' },
      { num: '2', title: 'Før turen eller dikter til AI', text: 'Fyll inn start/slutt km, eller be MesterAI føre den via tale («Før 24 km til Vidjeveien»).' },
      { num: '3', title: 'Automatisk beregning & eksport', text: 'Systemet regner ut 4,90 kr/km + bompenger. 1-klikk eksport til Tripletex, Fiken eller CSV.' }
    ],
    aiActionPrompt: 'Forklar meg hvordan elektronisk kjørebok og flåtestyring fungerer i Vikingmester. Hvordan regnes 4,90 kr/km + bompenger, hvordan fører jeg turer raskest, og hvordan eksporterer jeg til Tripletex/Fiken?'
  },
  dailylog: {
    title: 'Byggedagbok & Timer',
    badge: 'Lovpålagt timeføring & Vær',
    lawBadge: 'Arbeidsmiljøloven § 10-7',
    desc: 'Registrer timer, mannskap og byggeplassforhold. Dagens værdata og temperatur hentes automatisk fra Yr.',
    steps: [
      { num: '1', title: 'Dagens vær & forhold', text: 'Yr-værdata og temperatur loggføres automatisk på byggedatoen.' },
      { num: '2', title: 'Før timer med stemme eller tekst', text: 'Håndverkere fører timer og utført arbeid med mobilen eller tale på sekunder.' },
      { num: '3', title: 'Ledergodkjenning & lønnseksport', text: 'Prosjektleder godkjenner timene samlet med ett klikk for eksport til lønn og faktura.' }
    ],
    aiActionPrompt: 'Hvordan fungerer byggedagbok og timeføring? Vis meg hvordan håndverkere fører timer med stemme eller tekst, og hvordan leder godkjenner iht. AML § 10-7.'
  },
  deviations: {
    title: 'Avvik & RUH (Kvalitet & HMS)',
    badge: 'Kvalitetssikring & Sporbarhet',
    lawBadge: 'TEK17 kap. 2 & HMS-forskriften',
    desc: 'Dokumenter feil, skader, fukt eller HMS-mangler før de utvikler seg til kostbare reklamasjoner.',
    steps: [
      { num: '1', title: 'Knips et foto med mobilen', text: 'Last opp bilde direkte fra byggeplassen eller forklar hva som har skjedd.' },
      { num: '2', title: 'MesterAI analyserer mot TEK17', text: 'AI vurderer toleransekrav, identifiserer feilen og foreslår godkjente strakstiltak.' },
      { num: '3', title: 'Utbedring & lukking med etterbilde', text: 'Når feilen er rettet, lastes etterbilde opp og avviket lukkes med full sporbarhet.' }
    ],
    aiActionPrompt: 'Hvordan melder vi inn avvik og RUH? Forklar hvordan bildegjenkjenning sjekker TEK17, og hvordan saken lukkes fagmessig.'
  },
  sja: {
    title: 'Sikker Jobb Analyse (SJA)',
    badge: 'Risikovurdering & Vernetiltak',
    lawBadge: 'Forskrift om utførelse av arbeid',
    desc: 'Lovpålagt risikovurdering før risikofylte oppgaver (stillas, tak, varme arbeider, el, tunge løft).',
    steps: [
      { num: '1', title: 'Beskriv arbeidet', text: 'Fortell MesterAI hva som skal gjøres (f.eks: «Montere stillas i vind og regn»).' },
      { num: '2', title: 'MesterAI genererer SJA på 30 sekunder', text: 'Systemet identifiserer de 3-4 største farene, konkrete vernetiltak og påkrevd PVU.' },
      { num: '3', title: 'Digital signering av mannskapet', text: 'Alle på arbeidslaget bekrefter og signerer digitalt på mobilen før oppstart.' }
    ],
    aiActionPrompt: 'Hvordan oppretter vi en godkjent Sikker Jobb Analyse (SJA)? Forklar 30-sekunders prosessen med farer, vernetiltak og signering av mannskap.'
  },
  change_orders: {
    title: 'Endringsordrer & Varsler',
    badge: 'Tilleggsarbeid & Krav',
    lawBadge: 'Norsk Standard NS 8406 / NS 8405',
    desc: 'Sikrer at bedriften får betalt for alle tillegg, endringer og uforutsette bygningsforhold.',
    steps: [
      { num: '1', title: 'Varsle i tide iht. NS 8406', text: 'Opprett varsel umiddelbart når kunden ber om endring eller uforutsette forhold oppstår.' },
      { num: '2', title: 'MesterAI setter opp kalkylen', text: 'Få spesifiserte poster med timer, materiell, påslag og krav om fristforlengelse.' },
      { num: '3', title: 'Byggherre godkjenner digitalt', text: 'Formelt varsel sendes på e-post til byggherre, som aksepterer med ett tastetrykk.' }
    ],
    aiActionPrompt: 'Hvordan fungerer endringsordrer og varsler iht. NS 8406 / NS 8405? Hvordan setter jeg opp kalkylen og sender formelt varsel til byggherre?'
  },
  offers: {
    title: 'Pristilbud & Hurtigkalkyle',
    badge: 'Kalkyle & Salg',
    lawBadge: 'Byggblankett 3501 & Håndverkertjenesteloven',
    desc: 'Rask, profesjonell og lønnsom prising av byggeoppdrag med full kontroll på dekningsbidrag og MVA.',
    steps: [
      { num: '1', title: 'Beskriv oppdraget', text: 'Fortell MesterAI hva som skal utføres (renovering, tilbygg, terrasse, bad osv.).' },
      { num: '2', title: 'Kalkyle med materialer & timer', text: 'AI setter opp spesifiserte poster med enhetspriser, påslagsprosent og 25% MVA.' },
      { num: '3', title: 'Send tilbud med digital aksept', text: 'Kunden mottar tilbudet på e-post eller PDF og kan signere/godkjenne direkte.' }
    ],
    aiActionPrompt: 'Hvordan lager og kalkulerer vi et vinnende pristilbud med MesterAI? Forklar oppsett av poster, påslag og hvordan kunden godkjenner digitalt.'
  },
  pre_close: {
    title: 'KS & Lukkesperre (TEK17)',
    badge: 'Forsegling & Skjult Anlegg',
    lawBadge: 'TEK17 § 2-1 (Kvalitetssikring)',
    desc: 'Digital sperre som fysisk hindrer lukking av vegger/gulv før rørlegger, elektriker og tømrer har kvittert ut kontrollpunktene.',
    steps: [
      { num: '1', title: 'Tverrfaglig kontroll', text: 'Rørlegger og elektriker sjekker trykktesting (10 bar), rør-i-rør og skjult anlegg.' },
      { num: '2', title: 'Fotobevis før tildekking', text: 'Last opp bilder av rør og isolasjon som ugjendrivelig bevis i FDV-arkivet.' },
      { num: '3', title: 'Hev sperren (Rød → Grønn)', text: 'Når alle fag har signert ut, heves sperren og tømrer kan kle igjen uten risiko for feil.' }
    ],
    aiActionPrompt: 'Hva er KS og Lukkesperre iht. TEK17? Forklar hvordan sperren fungerer, hvilke fagkontroller som kreves, og hvordan den heves.'
  },
  archive: {
    title: 'Dokumentarkiv & FDV',
    badge: 'Overleveringsperm & FDV',
    lawBadge: 'TEK17 kapittel 4 (FDV)',
    desc: 'Samler all produktdokumentasjon, monteringsanvisninger, tegninger og godkjenninger for prosjektet.',
    steps: [
      { num: '1', title: 'Løpende arkivering', text: 'Last opp datablader, garantier, bilder og samsvarserklæringer underveis i byggingen.' },
      { num: '2', title: 'Automatisk indeksering', text: 'MesterAI sorterer dokumentene automatisk etter bygningsdel og fag.' },
      { num: '3', title: '1-klikk komplett FDV-perm', text: 'Generer en ferdig, profesjonell FDV-sluttrapport for overlevering til byggherre.' }
    ],
    aiActionPrompt: 'Hvordan fungerer dokumentarkivet og automatisk FDV-generering? Hvordan samles alt til en komplett overleveringsperm?'
  },
  contacts: {
    title: 'Prosjektkontakter & Telefonbok',
    badge: 'Team & Rettigheter',
    lawBadge: 'Rollebasert tilgangskontroll (RBAC)',
    desc: 'Full oversikt over ansatte, lærlinger, underentreprenører og byggherrer.',
    steps: [
      { num: '1', title: 'Legg inn person', text: 'Fyll inn navn, telefon og e-post for den nye medarbeideren eller samarbeidspartneren.' },
      { num: '2', title: 'Velg rolle & prosjekt', text: 'Velg tilgangsnivå (Leder, Håndverker, Lærling, Byggherre). Håndverkere ser kun tildelte plasser.' },
      { num: '3', title: 'Send innloggingslenke', text: 'Systemet sender automatisk en personlig aktiveringslenke der de velger eget passord.' }
    ],
    aiActionPrompt: 'Hvordan administrerer jeg kontakter, håndverkere og byggherrer i Vikingmester? Hvordan sender jeg innloggingslenke og tildeler byggeplass?'
  },
  apprentice: {
    title: 'Lærlingmodul & Opplæringsbok',
    badge: 'Fagopplæring & Kompetansemål',
    lawBadge: 'Utdanningsdirektoratet (Læreplan Vg3)',
    desc: 'Gjør lærlingoppfølging lekende lett for både lærling og faglig leder.',
    steps: [
      { num: '1', title: 'Lærlingen fører arbeid', text: 'Lærlingen logger utført arbeid med bilder og beskrivelse på mobilen.' },
      { num: '2', title: 'MesterAI kobler kompetansemål', text: 'AI kobler aktiviteten automatisk mot de offisielle læreplanmålene for faget.' },
      { num: '3', title: 'Veiledergodkjenning', text: 'Faglig leder godkjenner i appen, og lærlingen har komplett dokumentasjon klar til svenneprøven.' }
    ],
    aiActionPrompt: 'Hvordan fungerer lærlingmodulen og opplæringsboken? Hvordan kobles daglig arbeid til læreplanmålene og faglig leder-godkjenning?'
  },
  hms: {
    title: 'HMS, Stoffkartotek & Vernerunder',
    badge: 'Internkontroll & Sikkerhet',
    lawBadge: 'Internkontrollforskriften',
    desc: 'Alt lovpålagt HMS-arbeid samlet på ett sted: vernerunder, stoffkartotek for kjemikalier og beredskapsplaner.',
    steps: [
      { num: '1', title: 'Digital vernerunde', text: 'Gjennomfør vernerunden med sjekkliste og bilder direkte på mobilen.' },
      { num: '2', title: 'Stoffkartotek med sikkerhetsdatablader', text: 'Alle kjemikalier, lim og maling har lett tilgjengelige sikkerhetsdatablader.' },
      { num: '3', title: 'Full sporbarhet ved tilsyn', text: 'Dokumentasjonen er 100% i orden dersom Arbeidstilsynet eller byggherre kommer på kontroll.' }
    ],
    aiActionPrompt: 'Hvordan fungerer HMS-modulen, vernerunder og stoffkartotek? Hva krever Arbeidstilsynet og hvordan hjelper systemet oss?'
  },
  teamchat: {
    title: 'Prosjekt- & Firmachatt',
    badge: 'Byggeplasskommunikasjon',
    lawBadge: 'Sikker intern samhandling',
    desc: 'Hold all dialog, beskjeder og bilder samlet på byggeplassen, fri fra spredte SMS-tråder.',
    steps: [
      { num: '1', title: 'Prosjektspesifikk kanal', text: 'Beskjeder som skrives er knyttet direkte til gjeldende prosjekt.' },
      { num: '2', title: 'Del bilder og oppdateringer', text: 'Del situasjonsbilder, spørsmål og HMS-meldinger i sanntid med alle involverte.' },
      { num: '3', title: 'Søkbar historikk', text: 'Aldri mer uenighet om hva som ble avtalt – all historikk er bevart.' }
    ],
    aiActionPrompt: 'Hvordan fungerer prosjekt- og firmachatten internt? Hvordan holder vi all dialog og bildedokumentasjon samlet på byggeplassen?'
  },
  superadmin: {
    title: 'SuperAdmin Portal & SaaS Drift',
    badge: 'Systemdrift & Marginer',
    lawBadge: '96–98% garantert lønnsomhet',
    desc: 'Overordnet administrasjon av hele Vikingmester: bedrifter, abonnement, marginbeskyttelse og tokenforbruk.',
    steps: [
      { num: '1', title: 'Bedriftsoversikt & Lisenser', text: 'Administrer aktive selskaper, brukere og abonnementstyper (Solo, Team, Totalentreprenør).' },
      { num: '2', title: 'Marginbeskyttelse & Tokenovervåking', text: 'Systemet sperrer automatisk all tapsrisiko og sikrer 96–98% bruttomargin i alle scenarier.' },
      { num: '3', title: 'Inviter SuperAdmin / Kunder', text: 'Opprett nye bedrifter eller medadministratorer med automatisk e-post og selvvalgt passord.' }
    ],
    aiActionPrompt: 'Hvordan fungerer SuperAdmin-portalen, marginbeskyttelsen (96–98%), tokenovervåkning og opprettelse av nye bedrifter?'
  },
  building_app: {
    title: 'Byggesøknad & Nabovarsel (SAK10)',
    badge: 'Byggesaksforskriften & SAK10',
    lawBadge: 'Plan- og bygningsloven § 20',
    desc: 'Full oversikt over søknadsprosessen mot kommunen: ett-trinns søknad, rammetillatelse, nabovarsling og ansvarsretter.',
    steps: [
      { num: '1', title: 'Velg prosjekt & søknadstype', text: 'Velg byggeplass og søknadsform (ett-trinns, ramme eller igangsetting).' },
      { num: '2', title: 'Sjekkliste for vedlegg', text: 'Kvitter ut tegninger, nabovarsel, situasjonsplan og ansvarsretter.' },
      { num: '3', title: 'AI-kontroll før innsending', text: 'MesterAI analyserer søknaden mot kommunens krav og varsler om mangler.' }
    ],
    aiActionPrompt: 'Hvordan setter vi opp en komplett byggesøknad etter SAK10? Forklar hvilke vedlegg som kreves for ett-trinns søknad og hvordan vi unngår mangelbrev fra kommunen.'
  },
  checklists: {
    title: 'Kvalitetskontroll & Sjekklister (TEK17)',
    badge: 'Lovpålagt KS / Egenkontroll',
    lawBadge: 'TEK17 § 2-1 (Kvalitetssikring)',
    desc: 'Faseinndelte sjekklister for tømrer, rørlegger, elektriker og betong. Automatisk generering av KS-protokoll til FDV ved fullføring.',
    steps: [
      { num: '1', title: 'Velg fase og fagkontroll', text: 'Gå gjennom sjekkpunkter for forberedelse, råbygg, lukkesperre eller sluttkontroll.' },
      { num: '2', title: 'Kvitter ut med foto', text: 'Marker godkjent, legg til merknader eller knips bilde med mobilen.' },
      { num: '3', title: 'Autonom KS-protokoll', text: 'Når en fase fullføres, genereres en formell KS-kontrollrapport rett inn i FDV-arkivet.' }
    ],
    aiActionPrompt: 'Hvordan fungerer de faglige sjekklistene og KS-kontrollene i Vikingmester? Hvordan dokumenterer jeg punktene og hvordan autogenereres KS-protokollen?'
  },
  ai_vision: {
    title: 'MesterAI Vision (Bildeanalyse)',
    badge: 'Autonom bildekontroll',
    lawBadge: 'TEK17 visuell verifisering',
    desc: 'Visuell kvalitetskontroll direkte med kamera på mobil eller PC. MesterAI sjekker konstruksjoner, rør og dampsperrer mot TEK17.',
    steps: [
      { num: '1', title: 'Knips eller last opp foto', text: 'Ta bilde av konstruksjonen, overgangen, sluket eller overflaten.' },
      { num: '2', title: 'MesterAI analyserer bildet', text: 'AI-en gjenkjenner bygningsdeler, måler utførelse og sjekker mot TEK17-krav.' },
      { num: '3', title: 'Automatisk arkivering eller avvik', text: 'Godkjente bilder lagres i prosjektets fotomappe. Feil oppretter avvik med ett klikk.' }
    ],
    aiActionPrompt: 'Hvordan fungerer MesterAI Vision for bildekontroll på byggeplassen? Hva kan AI-en detektere, og hvordan kobles bildene automatisk mot sjekklister og avvik?'
  },
  contracts: {
    title: 'Kontraktshåndtering & NS-standarder',
    badge: 'Juridisk entreprisevern',
    lawBadge: 'NS 8405 / 8406 & Bustadoppføringslova',
    desc: 'Oversikt over bedriftens kontrakter, juridisk risikosjekk med MesterAI, og sammenligning av kontrakt mot innsendt tilbud.',
    steps: [
      { num: '1', title: 'Opprett eller last opp kontrakt', text: 'Knytt kontrakten til prosjektet med tittel, byggherre og kontraktssum.' },
      { num: '2', title: 'AI-risikoanalyse', text: 'MesterAI skanner vilkår for urimelige dagmulkter, ensidige frister og uvanlige krav.' },
      { num: '3', title: 'Sammenlign mot tilbud', text: 'AI sjekker at kontrakten stemmer 100% overens med det opprinnelige pristilbudet.' }
    ],
    aiActionPrompt: 'Hvordan hjelper MesterAI meg med kontrakter og standarder (NS 8405, NS 8406)? Hvordan fungerer juridisk risikosjekk og sammenligning mot pristilbud?'
  },
  handover: {
    title: 'Overlevering & Sluttrapport (FDV)',
    badge: 'Ferdigstillelse & Overtakelse',
    lawBadge: 'Bustadoppføringslova § 14 / NS 8406',
    desc: 'Sikrer formell overtakelse med protokoll, lukking av alle gjenstående avvik, og 1-klikk overlevering av samlet FDV-perm til byggherre.',
    steps: [
      { num: '1', title: 'Verifiser sluttkontroll', text: 'Sjekk at sluttbefaring er utført og lukk eventuelle gjenstående avvik.' },
      { num: '2', title: 'Generer komplett FDV-perm', text: 'Systemet samler alle produktdatablader, garantier og samsvarserklæringer i én fil.' },
      { num: '3', title: 'Overlevering og digital signering', text: 'Overtakelsesprotokoll og FDV sendes formelt til byggherre og arkiveres.' }
    ],
    aiActionPrompt: 'Hvordan gjennomfører vi en forskriftsmessig overlevering med FDV og overtakelsesprotokoll? Hva krever bustadoppføringslova og NS 8406 ved overtakelse?'
  },
  inventory: {
    title: 'Lager, Verktøy & Kjemikalier',
    badge: 'Materiellstyring & Sporbarhet',
    lawBadge: 'Arbeidsmiljøloven § 4-5',
    desc: 'Oversikt over verktøypark, materialer, kjemikalier, kalibreringsdatoer og serviceintervaller.',
    steps: [
      { num: '1', title: 'Registrer verktøy og materiell', text: 'Legg inn verktøy, maskiner, forbruksmateriell og plassering.' },
      { num: '2', title: 'AI-forbruksinnsikt', text: 'MesterAI varsler når beholdningen er lav eller utstyr trenger lovpålagt kontroll.' },
      { num: '3', title: 'Sikkerhetsdatablader', text: 'Kjemikalier kobles direkte mot stoffkartoteket for trygg håndtering.' }
    ],
    aiActionPrompt: 'Hvordan fungerer lager- og verktøystyringen i Vikingmester? Hvordan holder vi oversikt over serviceintervaller og forbruksmateriell?'
  },
  time: {
    title: 'Timeføring & Lønn',
    badge: 'Timer & Lønnsgrunnlag',
    lawBadge: 'Arbeidsmiljøloven § 10-7',
    desc: 'Timeføring per prosjekt, oppgave, overtid og fravær med full historikk og godkjenningsløp for leder.',
    steps: [
      { num: '1', title: 'Velg prosjekt og dato', text: 'Knytt timene til riktig byggeplass eller interntid.' },
      { num: '2', title: 'Angi timer og kategori', text: 'Velg ordinære timer, overtid eller reisetid med kort beskrivelse.' },
      { num: '3', title: 'Godkjenning og eksport', text: 'Leder godkjenner timene for overføring til lønn og fakturering.' }
    ],
    aiActionPrompt: 'Hvordan fører og godkjenner jeg timer i Vikingmester? Hvilke regler gjelder for overtid og timelister iht. Arbeidsmiljøloven § 10-7?'
  }
};

export const getModuleHelpPrompt = (tab: string | null, projName?: string | null): string => {
  const pName = projName ? ` for ${projName}` : '';
  if (tab && MODULE_GUIDE_DATA[tab]) {
    return MODULE_GUIDE_DATA[tab].aiActionPrompt;
  }
  return `Hvordan fungerer denne visningen${pName}? Gi meg en kort, enkel 3-trinns veiledning for håndverkere og prosjektledere.`;
};

export default function MesterWorkstation({
  initialModuleTab,
  projects,
  selectedProject,
  onSelectProject,
  changeOrders = [],
  offers = [],
  deviations = [],
  lukkesperreZones = [],
  recentActivities = [],
  tasks = [],
  initialPrompt,
  onPromptHandled,
  onOpenCreateProject,
  onOpenSmartSearch,
  onOpenAllModules,
  onApproveChangeOrder,
  onRejectChangeOrder,
  onDeleteChangeOrder,
  onDeleteOffer,
  onOpenPreClose,
  onOpenOmnichannelModal,
  onOpenOfferModal,
  onOpenChangeOrderModal,
  onOpenSJAModal,
  onOpenAIVision,
  onOpenDailyLogModal,
  onOpenTimeModal,
  onOpenArchiveModal,
  onOpenContactsModal,
  onOpenSettings,
  onOpenSuperAdmin
}: MesterWorkstationProps) {
  const { user, isSuperAdmin, isPlatformOwner, role, simulatedPlan, setSimulatedPlan, logout, trade, company, impersonatedCompanyId, stopImpersonation } = useAuth();
  const { t, i18n } = useTranslation();
  const isAdmin = Boolean(
    isSuperAdmin || 
    isPlatformOwner || 
    role === 'admin' || 
    role === 'leader' || 
    user?.role === 'admin' || 
    user?.role === 'leader'
  );

  // 📐 Layout State
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mester_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapseDesktop = () => {
    setIsCollapsedDesktop(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mester_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  // 🎯 View Mode: 'chat' | 'module' | 'form'
  const [viewMode, setViewMode] = useState<'chat' | 'module' | 'form'>(() => {
    return 'module'; // Standard oppstart på 'all_projects' iht. brukerens ønske!
  });
  const [activeModuleTab, setActiveModuleTab] = useState<string | null>(initialModuleTab || 'all_projects');
  const [showModuleGuide, setShowModuleGuide] = useState(false);
  const [activeForm, setActiveForm] = useState<{ type: InChatFormType; data?: any } | null>(null);

  const handleOpenModuleCopilotHelp = () => {
    const prompt = getModuleHelpPrompt(activeModuleTab, selectedProject?.name);
    window.dispatchEvent(new CustomEvent('mesterai:open-copilot', {
      detail: {
        module: activeModuleTab,
        prompt: prompt
      }
    }));
  };
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const mobileProjectDropdownRef = useRef<HTMLDivElement>(null);

  // Lukk prosjekt-nedtrekksmenyen ved klikk på utsiden
  useEffect(() => {
    if (!isProjectDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        projectDropdownRef.current && !projectDropdownRef.current.contains(target) &&
        mobileProjectDropdownRef.current && !mobileProjectDropdownRef.current.contains(target)
      ) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isProjectDropdownOpen]);

  // Lokal tilbuds-modal state som fallback
  const [isLocalOfferModalOpen, setIsLocalOfferModalOpen] = useState(false);
  const [localOfferInitialData, setLocalOfferInitialData] = useState<any>(null);

  // 🚀 Onboarding & Velkomst for nye kunder (og for administrator/bruker)
  const [isOnboardingWelcomeOpen, setIsOnboardingWelcomeOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const shown = localStorage.getItem('viking_onboarding_shown');
      return !shown;
    }
    return false;
  });
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);

  useEffect(() => {
    const handleOpenOnboarding = () => setIsOnboardingWelcomeOpen(true);
    window.addEventListener('open_onboarding_guide', handleOpenOnboarding);
    return () => window.removeEventListener('open_onboarding_guide', handleOpenOnboarding);
  }, []);

  // 🔗 Privat MesterAI-rådgivning fra TeamChat
  const [activeTeamChatConsult, setActiveTeamChatConsult] = useState<TeamChatConsultContext | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mesterai_active_teamchat_consult');
        return stored ? JSON.parse(stored) : null;
      } catch {}
    }
    return null;
  });

  const [sendToChatModalOpen, setSendToChatModalOpen] = useState(false);
  const [sendToChatContent, setSendToChatContent] = useState('');

  const handleStartTeamChatConsult = (consultContext: TeamChatConsultContext) => {
    setActiveTeamChatConsult(consultContext);
    try {
      localStorage.setItem('mesterai_active_teamchat_consult', JSON.stringify(consultContext));
    } catch {}

    // Bytt til MesterAI Chat
    setViewMode('chat');
    setActiveModuleTab(null);

    // Send henvendelsen med samtalekontekst inn til MesterAI
    if (consultContext.initialPrompt) {
      setTimeout(() => {
        handleSendMessage(consultContext.initialPrompt!);
      }, 150);
    }
  };

  useEffect(() => {
    const handleConsultEvent = (e: any) => {
      if (e.detail) {
        handleStartTeamChatConsult(e.detail);
      }
    };
    window.addEventListener('mesterai:consult-teamchat', handleConsultEvent as EventListener);
    return () => window.removeEventListener('mesterai:consult-teamchat', handleConsultEvent as EventListener);
  }, []);

  const handleOpenCreateOffer = (initialData?: any) => {
    const data = initialData || (selectedProject ? {
      projectId: selectedProject.id,
      projectCode: selectedProject.projectCode || selectedProject.id,
      clientName: selectedProject.clientName || '',
      clientEmail: selectedProject.clientEmail || '',
      title: `Tilbud - ${selectedProject.name}`
    } : { clientName: '', projectId: '' });

    // Åpne direkte i arbeidsflaten der MesterAI er (ingen popup!)
    setActiveForm({ type: 'offer', data });
    setViewMode('form');
  };

  const handleOpenCreateChangeOrder = (initialData?: any) => {
    setActiveForm({ type: 'change_order', data: initialData || { projectId: selectedProject?.id } });
    setViewMode('form');
  };

  const handleOpenCreateSJA = (initialData?: any) => {
    setActiveForm({ type: 'sja', data: initialData || { projectId: selectedProject?.id } });
    setViewMode('form');
  };

  const handleOpenCreateDeviation = (initialData?: any) => {
    setActiveForm({ type: 'deviation', data: initialData || { projectId: selectedProject?.id } });
    setViewMode('form');
  };

  const handleOpenCreateTime = (initialData?: any) => {
    setActiveForm({ type: 'time', data: initialData || { projectId: selectedProject?.id } });
    setViewMode('form');
  };

  const handleFormSuccess = (msg: string, resultMeta?: any) => {
    let actions: any[] | undefined = undefined;

    if (resultMeta?.type === 'offer_created') {
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const publicOrigin = isLocal ? 'https://vikingmester.no' : (typeof window !== 'undefined' ? window.location.origin : 'https://vikingmester.no');
      const offerLink = resultMeta.offerLink || `${publicOrigin}/?offerToken=${resultMeta.token || ''}`;
      actions = [
        {
          id: 'open_public_offer',
          type: 'open_public_offer',
          label: '👁️ Se digitalt tilbud (Kunde)',
          data: { token: resultMeta.token, offerLink, offer: resultMeta.offerData }
        },
        {
          id: 'open_offer_form',
          type: 'open_offer_form',
          label: '📝 Åpne i Tilbudsbygger',
          data: resultMeta.offerData || { id: resultMeta.offerId, token: resultMeta.token }
        },
        {
          id: 'copy_offer_link',
          type: 'copy_link',
          label: '🔗 Kopier tilbudslenke',
          data: { url: offerLink, shareUrl: offerLink }
        }
      ];
    } else if (resultMeta?.type === 'change_order_created') {
      actions = [
        {
          id: 'open_co_module',
          type: 'open_module',
          label: '📋 Se alle endringsordrer',
          data: { module: 'change_orders' }
        }
      ];
    }

    const aiMessage: ChatMessageItem = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: msg,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      actions
    };

    setMessages(prev => [...prev, aiMessage]);
    setViewMode('chat');
    setActiveForm(null);
  };

  // 🚨 Håndtering av avvik & RUH (både fra database og lokale oppføringer meldt til agenten)
  const [localDeviations, setLocalDeviations] = useState<Deviation[]>(() => {
    try {
      const cached = localStorage.getItem('cached_deviations');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [deviationFilterStatus, setDeviationFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [deviationFilterProject, setDeviationFilterProject] = useState<string>('all');

  // Slå sammen avvik fra prop og lokalt opprettede avvik
  const allDeviations = useMemo(() => {
    const map = new Map<string, Deviation>();
    (deviations || []).forEach(d => map.set(d.id, d));
    (localDeviations || []).forEach(d => map.set(d.id, d));
    return Array.from(map.values()).sort((a, b) => {
      const tA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const tB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return tB - tA;
    });
  }, [deviations, localDeviations]);

  // Håndter oppdatering av avviksstatus (lukke/gjenåpne)
  const handleToggleDeviationStatus = async (dev: Deviation) => {
    const newStatus = dev.status === 'closed' ? 'open' : 'closed';
    const updatedDev = { ...dev, status: newStatus as any, updatedAt: new Date().toISOString() };

    setLocalDeviations(prev => {
      const updated = prev.map(d => d.id === dev.id ? updatedDev : d);
      try { localStorage.setItem('cached_deviations', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      if (dev.id && !dev.id.startsWith('dev_rec_')) {
        await updateDoc(doc(db, 'deviations', dev.id), { status: newStatus, updatedAt: serverTimestamp() });
      }
    } catch (e) {
      console.warn('Firestore status-oppdatering:', e);
    }

    toast.success(newStatus === 'closed' ? '✅ Avvik merket som utbedret og lukket!' : '⏳ Avvik gjenåpnet for oppfølging.');
  };

  // Håndter sletting av avvik
  const handleDeleteDeviation = async (devId: string) => {
    if (!confirm('Er du sikker på at du vil slette dette avviket?')) return;
    setLocalDeviations(prev => {
      const updated = prev.filter(d => d.id !== devId);
      try { localStorage.setItem('cached_deviations', JSON.stringify(updated)); } catch {}
      return updated;
    });
    try {
      await deleteDoc(doc(db, 'deviations', devId));
    } catch (e) {
      console.warn('Firestore sletting:', e);
    }
    toast.info('Avvik slettet.');
  };

  // Synkroniser aktiv fane dersom initialModuleTab endrer seg eksternt
  useEffect(() => {
    if (initialModuleTab) {
      setActiveModuleTab(initialModuleTab);
      setViewMode('module');
    }
  }, [initialModuleTab]);

  // Håndter global navigasjon inn i SuperAdmin eller andre moduler uten å forlate arbeidsstasjonen
  useEffect(() => {
    const handleNavigate = (e: any) => {
      const targetView = e.detail?.view;
      if (targetView === 'super-admin' || targetView === 'superadmin') {
        setActiveModuleTab('superadmin');
        setViewMode('module');
      } else if (targetView === 'offers' || targetView === 'kalkyle') {
        setActiveModuleTab('offers');
        setViewMode('module');
      } else if (targetView === 'contacts' || targetView === 'telefonbok') {
        setActiveModuleTab('contacts');
        setViewMode('module');
      } else if (targetView === 'teamchat' || targetView === 'prosjektchat' || targetView === 'chat-module') {
        setActiveModuleTab('teamchat');
        setViewMode('module');
      } else if (targetView === 'vehicle' || targetView === 'bilpark' || targetView === 'kjørebok') {
        setActiveModuleTab('vehicle');
        setViewMode('module');
      }
    };
    window.addEventListener('navigate_view', handleNavigate);
    return () => window.removeEventListener('navigate_view', handleNavigate);
  }, []);

  // Lytt etter dashboard-handlinger og globale modul-åpninger
  useEffect(() => {
    const handleGlobalAction = (e: any) => {
      const actionId = e.detail?.actionId;
      if (!actionId) return;
      if (e.detail?.projectId) {
        const found = projects.find(p => p.id === e.detail.projectId);
        if (found) onSelectProject(found);
      }
      handleModuleCardClick(actionId);
    };
    window.addEventListener('trigger_dashboard_action', handleGlobalAction as EventListener);
    window.addEventListener('open_workstation_module', handleGlobalAction as EventListener);
    return () => {
      window.removeEventListener('trigger_dashboard_action', handleGlobalAction as EventListener);
      window.removeEventListener('open_workstation_module', handleGlobalAction as EventListener);
    };
  }, [projects, onSelectProject]);

  // Lytt etter hendelse fra varselbjella om å åpne en spesifikk prosjektchat
  useEffect(() => {
    const handleOpenProjectChat = (e: any) => {
      const { projectId, channelId } = e.detail || {};
      if (projectId) {
        const found = projects.find(p => p.id === projectId);
        if (found) {
          onSelectProject(found);
        }
      }
      setActiveModuleTab('teamchat');
      setViewMode('module');
    };
    window.addEventListener('open_project_chat', handleOpenProjectChat as EventListener);
    return () => window.removeEventListener('open_project_chat', handleOpenProjectChat as EventListener);
  }, [projects, onSelectProject]);

  const handleOpenSuperAdmin = () => {
    setActiveModuleTab('superadmin');
    setViewMode('module');
  };

  // 💬 Chat Session State
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return chatSessionService.getActiveSessionId() || 'session_init';
  });

  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    const existing = chatSessionService.getActiveSession();
    if (existing && existing.messages.length > 0) {
      return existing.messages;
    }
    return [];
  });

  // 🔄 Skann samtaletråden for å fange opp avvik brukeren har skrevet til agenten
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    messages.forEach(m => {
      if (m.role === 'user' && m.content) {
        const text = m.content.toLowerCase();
        const hasAvvikWord = text.includes('avvik') || text.includes('ruh') || text.includes('mangel');
        const hasActionOrDefect = (
          text.includes('registrer') || 
          text.includes('meld') || 
          text.includes('opprett') || 
          text.includes('loggfør') || 
          text.includes('det er') || 
          text.includes('vi har') || 
          text.includes('oppdaget') || 
          text.includes('mangler') || 
          text.includes('feil') || 
          text.includes('lekkasje') || 
          text.includes('skade')
        );

        if (hasAvvikWord && hasActionOrDefect && !text.startsWith('hva er') && !text.startsWith('vis avvik') && !text.startsWith('hent avvik')) {
          const isAlreadySaved = allDeviations.some(d => 
            (d.description && d.description.includes(m.content)) || 
            (d.title && m.content.toLowerCase().includes(d.title.toLowerCase()))
          );

          if (!isAlreadySaved) {
            const clean = m.content
              .replace(/^(?:hei mesterai|hei|kan du|vennligst)?\s*(?:registrer|meld|opprett|loggfør|legg inn|før)?\s*(?:et\s+)?avvik\s*(?:på|for|om|i|angående)?\s*/i, '')
              .replace(/^(?:avvik|ruh)[:\-–]?\s*/i, '')
              .trim();

            const title = clean.length > 3 ? (clean.charAt(0).toUpperCase() + clean.slice(1, 80)) : 'Kvalitetsavvik meldt i chat';
            const targetProj = selectedProject || projects[0];

            let category = 'quality';
            let codeRef = 'TEK17 & Internkontrollforskriften § 5';
            let suggestedAction = 'Utbedre avviket i henhold til prosjektert løsning og dokumentere med foto.';
            let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';

            if (text.includes('membran') || text.includes('sluk') || text.includes('våtrom') || text.includes('klemring')) {
              category = 'membran';
              codeRef = 'TEK17 § 13-15 (Våtrom og fall mot sluk) & BVN';
              suggestedAction = 'Montere godkjent klemring/mansjett og verifisere vanntetthet.';
            } else if (text.includes('isolasjon') || text.includes('dampsperre')) {
              category = 'isolasjon';
              codeRef = 'TEK17 § 14-2 (Energieffektivitet) & Byggforsk';
              suggestedAction = 'Tette dampsperre med klemte skjøter før kledning monteres.';
            } else if (text.includes('brann')) {
              category = 'brann';
              codeRef = 'TEK17 § 11-10 (Brannceller og seksjonering)';
              suggestedAction = 'Branntette gjennomføringer med godkjent masse.';
              severity = 'critical';
            }

            const recoveredDev: Deviation = {
              id: `dev_rec_${m.id || Date.now()}`,
              projectId: targetProj?.id || 'proj-default',
              project: targetProj?.name || 'Aktiv byggeplass',
              projectName: targetProj?.name || 'Aktiv byggeplass',
              title,
              description: `Avvik meldt inn til agenten: ${m.content}`,
              category: category as any,
              severity: severity as any,
              status: 'open' as const,
              reportedBy: user?.displayName || 'Byggeleder',
              action: suggestedAction,
              codeReference: codeRef,
              createdAt: new Date().toISOString(),
              timestamp: new Date().toISOString()
            } as any;

            setLocalDeviations(prev => {
              if (prev.some(d => d.id === recoveredDev.id || d.title === recoveredDev.title)) return prev;
              const updated = [recoveredDev, ...prev];
              try { localStorage.setItem('cached_deviations', JSON.stringify(updated)); } catch {}
              return updated;
            });

            try {
              addDoc(collection(db, 'deviations'), {
                ...recoveredDev,
                timestamp: serverTimestamp()
              }).catch(() => {});
            } catch {}
          }
        }
      }
    });
  }, [messages, selectedProject, projects, allDeviations, user?.displayName]);

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('MesterAI tenker og analyserer...');
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedChangeOrderForDetail, setSelectedChangeOrderForDetail] = useState<any | null>(null);
  const [changeOrderScope, setChangeOrderScope] = useState<'project' | 'all'>('project');

  const isApprovedOrder = (co: any) => {
    const s = (co?.status || '').toLowerCase();
    return s === 'godkjent av kunde' || s === 'approved' || s === 'approved_by_admin' || s === 'godkjent' || s === 'accepted';
  };

  const isRejectedOrder = (co: any) => {
    const s = (co?.status || '').toLowerCase();
    return s === 'avvist' || s === 'avslått' || s === 'rejected';
  };

  const getThinkingSteps = (query: string, hasImg?: boolean) => {
    return getDynamicReasoningFlow(query, hasImg, i18n?.language || 'no').steps;
  };

  const projectChangeOrders = useMemo(() => {
    if (!selectedProject) return changeOrders;
    return changeOrders.filter(co => {
      if (co.projectId && selectedProject.id) {
        return String(co.projectId) === String(selectedProject.id);
      }
      if (co.raw?.projectId && selectedProject.id) {
        return String(co.raw.projectId) === String(selectedProject.id);
      }
      if (co.project && selectedProject.name) {
        return co.project.toLowerCase().trim() === selectedProject.name.toLowerCase().trim();
      }
      return false;
    });
  }, [changeOrders, selectedProject]);

  const visibleChangeOrders = (selectedProject && changeOrderScope === 'project')
    ? projectChangeOrders
    : changeOrders;

  // ⏱️ Tenketimer og aktiv henvendelse for MesterAI
  const [activeThinkingDuration, setActiveThinkingDuration] = useState(0);
  const [activeThinkingQuery, setActiveThinkingQuery] = useState('');
  const [activeThinkingHasImage, setActiveThinkingHasImage] = useState(false);
  const thinkingTimerRef = useRef<any>(null);

  // 📱 Gemini Mobile Experience State
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isLiveVoiceActive, setIsLiveVoiceActive] = useState(false);
  const [selectedOfferForDetail, setSelectedOfferForDetail] = useState<any | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // 🔍 Top Search Bar & Floating Panel State (Alltid i arbeidsvinduet, aldri popups over menyen)
  const [isTopSearchOpen, setIsTopSearchOpen] = useState(false);
  const [topSearchQuery, setTopSearchQuery] = useState('');
  const topSearchInputRef = useRef<HTMLInputElement>(null);

  // 🧮 Hurtigkalkyle flerpost-modell for Tilbud & Kalkyle
  interface QuickCalcLine {
    id: string;
    title: string;
    hours: number;
    hourlyRate: number;
    materials: number;
    markup: number;
  }

  const [calcLines, setCalcLines] = useState<QuickCalcLine[]>([
    {
      id: 'post-1',
      title: 'Tømrer- og monteringsarbeid',
      hours: 35,
      hourlyRate: 890,
      materials: 22000,
      markup: 15
    },
    {
      id: 'post-2',
      title: 'Riving og forarbeid',
      hours: 10,
      hourlyRate: 890,
      materials: 6500,
      markup: 15
    }
  ]);

  const handleAddCalcLine = (preset?: { title: string; hours: number; hourlyRate: number; materials: number; markup: number }) => {
    const defaultRate = calcLines[0]?.hourlyRate || 890;
    const defaultMarkup = calcLines[0]?.markup || 15;
    const newLine: QuickCalcLine = preset ? {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...preset
    } : {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `Kalkylepost ${calcLines.length + 1}`,
      hours: 8,
      hourlyRate: defaultRate,
      materials: 3500,
      markup: defaultMarkup
    };
    setCalcLines(prev => [...prev, newLine]);
    toast.success(`La til kalkylelinje: "${newLine.title}"`);
  };

  const handleUpdateCalcLine = (id: string, field: 'title' | 'hours' | 'hourlyRate' | 'materials' | 'markup', value: string | number) => {
    setCalcLines(prev => prev.map(line => {
      if (line.id !== id) return line;
      return {
        ...line,
        [field]: field === 'title' ? String(value) : Math.max(0, Number(value) || 0)
      };
    }));
  };

  const handleDuplicateCalcLine = (id: string) => {
    const target = calcLines.find(l => l.id === id);
    if (!target) return;
    const copy: QuickCalcLine = {
      ...target,
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${target.title} (Kopi)`
    };
    const targetIndex = calcLines.findIndex(l => l.id === id);
    setCalcLines(prev => {
      const copyArr = [...prev];
      copyArr.splice(targetIndex + 1, 0, copy);
      return copyArr;
    });
    toast.success(`Dupliserte "${target.title}"`);
  };

  const handleRemoveCalcLine = (id: string) => {
    if (calcLines.length <= 1) {
      toast.error('Kalkylen må inneholde minst én linje');
      return;
    }
    const target = calcLines.find(l => l.id === id);
    setCalcLines(prev => prev.filter(l => l.id !== id));
    if (target) {
      toast.info(`Fjernet "${target.title}" fra kalkylen`);
    }
  };

  const handleResetCalcLines = () => {
    setCalcLines([
      {
        id: `post-${Date.now()}-1`,
        title: 'Tømrer- og monteringsarbeid',
        hours: 35,
        hourlyRate: 890,
        materials: 22000,
        markup: 15
      },
      {
        id: `post-${Date.now()}-2`,
        title: 'Riving og forarbeid',
        hours: 10,
        hourlyRate: 890,
        materials: 6500,
        markup: 15
      }
    ]);
    toast.info('Kalkylelinjer tilbakestilt');
  };

  // Bakoverkompatible beregninger og nøkkeltall for arbeidsstasjonen
  const calcHours = useMemo(() => calcLines.reduce((acc, l) => acc + (Number(l.hours) || 0), 0), [calcLines]);
  const calcHourlyRate = useMemo(() => {
    if (calcLines.length === 0) return 890;
    return calcLines[0].hourlyRate || 890;
  }, [calcLines]);
  const calcMaterials = useMemo(() => calcLines.reduce((acc, l) => acc + (Number(l.materials) || 0), 0), [calcLines]);
  const calcMarkup = useMemo(() => {
    if (calcLines.length === 0) return 15;
    return calcLines[0].markup || 15;
  }, [calcLines]);

  // ⚙️ Innstillinger-modal rett inne i arbeidsstasjonen ("liten boks med alle funksjoner")
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 👥 Prosjektkontakter & Telefonbok state (Tenant & prosjekt-isolert)
  interface ProjectContactItem {
    id: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    companyName?: string;
    projectId?: string;
    category?: 'team' | 'subcontractor' | 'client' | 'former';
    isFormer?: boolean;
    accessibleProjects?: string[]; // IDs for tildelte byggeplasser eller ['all']
  }

  interface DailyTimeItem {
    id: string;
    workerName: string;
    role: string;
    date: string;
    hours: number;
    overtime50: number;
    overtime100: number;
    task: string;
    status: 'pending' | 'approved';
    projectId?: string;
    projectName?: string;
    loggedBy?: string;
    isLiveAdded?: boolean;
  }

  const [projectContacts, setProjectContacts] = useState<ProjectContactItem[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactCategoryFilter, setContactCategoryFilter] = useState<'all' | 'team' | 'subcontractor' | 'client' | 'former'>('all');
  const [newContactCategory, setNewContactCategory] = useState<'team' | 'subcontractor' | 'client' | 'former'>('subcontractor');
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('Tømrer / Fagarbeider');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('');
  const [newContactProjects, setNewContactProjects] = useState<string[]>(['all']);

  // ✏️ Rediger kontakt state (Kun Admin)
  const [editingContact, setEditingContact] = useState<ProjectContactItem | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactRole, setEditContactRole] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactCompany, setEditContactCompany] = useState('');
  const [editContactCategory, setEditContactCategory] = useState<'team' | 'subcontractor' | 'client' | 'former'>('team');
  const [editContactProjects, setEditContactProjects] = useState<string[]>(['all']);

  // ⏱️ Byggedagbok & Timeføring state (AML § 10-7 og ledergodkjenning)
  const [dailyTimeEntries, setDailyTimeEntries] = useState<DailyTimeItem[]>([]);
  const [isTimeApprovalView, setIsTimeApprovalView] = useState(false);
  const [logHours, setLogHours] = useState('7.5');
  const [logDescription, setLogDescription] = useState('Lekting av yttervegg og klargjøring for kledning');
  const [logIsWeekendEvening, setLogIsWeekendEvening] = useState(false);
  const [logWorkerSelection, setLogWorkerSelection] = useState<string>('self');

  // 🔒 Håndheving av prosjekttilganger: Admin ser alle byggeplasser, fagarbeidere ser kun tildelte byggeplasser
  const userAccessibleProjects = useMemo(() => {
    if (isAdmin) return projects;
    const myEmail = (user?.email || '').trim().toLowerCase();
    const myName = (user?.displayName || '').trim().toLowerCase();
    const myContact = projectContacts.find(c => 
      (myEmail && c.email && c.email.trim().toLowerCase() === myEmail) ||
      (myName && c.name && c.name.trim().toLowerCase() === myName)
    );
    const allowed = (user as any)?.accessibleProjects || myContact?.accessibleProjects;
    if (allowed && Array.isArray(allowed)) {
      if (allowed.includes('all')) return projects;
      return projects.filter(p => allowed.includes(p.id));
    }
    // Sjekk om prosjektet har håndverkeren tildelt i teamMembers eller oppgaver
    const memberProjects = projects.filter(p => {
      const tm = (p as any).teamMembers || (p as any).assignedWorkers || [];
      if (Array.isArray(tm)) {
        return tm.some((m: string) => 
          (user?.id && m === user.id) ||
          (myEmail && m.toLowerCase() === myEmail) ||
          (myName && m.toLowerCase() === myName)
        );
      }
      return false;
    });
    if (memberProjects.length > 0) return memberProjects;

    // Fagarbeidere og lærlinger uten eksplisitt tildeling har kun tilgang til tildelte prosjekter
    if (!isAdmin && (user?.role === 'worker' || user?.role === 'apprentice' || role === 'worker' || role === 'apprentice')) {
      return [];
    }
    return projects;
  }, [projects, isAdmin, user?.email, user?.displayName, (user as any)?.accessibleProjects, projectContacts, role, user?.role, user?.id]);

  const currentTenantScope = impersonatedCompanyId || (user?.company ? user.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'tenant_default');
  const contactsStorageKey = `mester_contacts_${currentTenantScope}_${selectedProject?.id || 'all'}`;
  const logsStorageKey = `mester_timelogs_${currentTenantScope}_${selectedProject?.id || 'all'}`;

  // 🔄 Synkroniser timeføringer på tvers av master-liste og prosjektlister
  const syncDailyTimeEntryLocally = (entry: DailyTimeItem) => {
    try {
      const masterKey = `mester_timelogs_${currentTenantScope}_master`;
      const masterRaw = localStorage.getItem(masterKey);
      const masterList: DailyTimeItem[] = masterRaw ? JSON.parse(masterRaw) : [];
      const updatedMaster = [entry, ...masterList.filter(e => e.id !== entry.id)];
      localStorage.setItem(masterKey, JSON.stringify(updatedMaster));

      const allKey = `mester_timelogs_${currentTenantScope}_all`;
      const allRaw = localStorage.getItem(allKey);
      const allList: DailyTimeItem[] = allRaw ? JSON.parse(allRaw) : [];
      const updatedAll = [entry, ...allList.filter(e => e.id !== entry.id)];
      localStorage.setItem(allKey, JSON.stringify(updatedAll));

      if (entry.projectId && entry.projectId !== 'all') {
        const projKey = `mester_timelogs_${currentTenantScope}_${entry.projectId}`;
        const projRaw = localStorage.getItem(projKey);
        const projList: DailyTimeItem[] = projRaw ? JSON.parse(projRaw) : [];
        const updatedProj = [entry, ...projList.filter(e => e.id !== entry.id)];
        localStorage.setItem(projKey, JSON.stringify(updatedProj));
      }
    } catch (e) {
      console.warn('Could not sync daily time entry locally:', e);
    }
  };

  // Last inn telefonbok / kontakter & auto-synkroniser kunder fra prosjekter og kundeportal
  useEffect(() => {
    try {
      const raw = localStorage.getItem(contactsStorageKey);
      let list: ProjectContactItem[] = raw ? JSON.parse(raw) : [];

      // Auto-synkroniser kunder fra alle tilgjengelige byggeprosjekter (og kundeportal-registreringer)
      const existingClientEmails = new Set(list.map(c => (c.email || '').trim().toLowerCase()).filter(Boolean));
      const existingClientNames = new Set(list.map(c => (c.name || '').trim().toLowerCase()).filter(Boolean));

      let hasNewClients = false;
      projects.forEach(p => {
        if (p.clientName) {
          const normName = p.clientName.trim().toLowerCase();
          const normEmail = (p.clientEmail || '').trim().toLowerCase();
          if (!existingClientNames.has(normName) && (!normEmail || !existingClientEmails.has(normEmail))) {
            list.push({
              id: `c_proj_${p.id}`,
              name: p.clientName,
              role: 'Kunde / Byggherre',
              phone: (p as any).clientPhone || '+47 988 00 111',
              email: p.clientEmail || 'kunde@kundeportal.no',
              companyName: p.name,
              projectId: p.id,
              category: 'client'
            });
            existingClientNames.add(normName);
            if (normEmail) existingClientEmails.add(normEmail);
            hasNewClients = true;
          }
        }
      });

      // Auto-synkroniser innlogget bruker/ansatt
      if (user && user.displayName) {
        const normUserName = user.displayName.trim().toLowerCase();
        if (!existingClientNames.has(normUserName)) {
          list.push({
            id: 'c_user_me',
            name: user.displayName,
            role: (user.role === 'admin' || user.role === 'leader') ? 'Prosjektleder / Byggmester' : 'Fagarbeider',
            phone: '+47 900 00 000',
            email: user.email || 'kontakt@mester.no',
            companyName: user.company || 'Min Bedrift',
            category: 'team'
          });
          hasNewClients = true;
        }
      }

      setProjectContacts(list);
      if (hasNewClients || !raw) {
        localStorage.setItem(contactsStorageKey, JSON.stringify(list));
      }
    } catch (e) {
      console.warn("Could not load contacts:", e);
    }
  }, [contactsStorageKey, projects, user, impersonatedCompanyId]);

  // Last inn timeføringer og synkroniser mot backend
  useEffect(() => {
    let currentLogs: DailyTimeItem[] = [];
    try {
      const raw = localStorage.getItem(logsStorageKey);
      const masterKey = `mester_timelogs_${currentTenantScope}_master`;
      const masterRaw = localStorage.getItem(masterKey);
      const masterList: DailyTimeItem[] = masterRaw ? JSON.parse(masterRaw) : [];

      if (raw) {
        currentLogs = JSON.parse(raw);
      }

      if (masterList.length > 0) {
        const map = new Map<string, DailyTimeItem>();
        currentLogs.forEach(item => map.set(item.id, item));
        masterList.forEach(item => {
          if (
            !selectedProject?.id || 
            selectedProject.id === 'all' || 
            item.projectId === selectedProject.id || 
            item.projectName === selectedProject.name
          ) {
            map.set(item.id, item);
          }
        });
        currentLogs = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      }

      if (currentLogs.length > 0) {
        setDailyTimeEntries(currentLogs);
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        const initialLogs: DailyTimeItem[] = [
          {
            id: 'log_1',
            workerName: user?.displayName || 'Fagarbeider',
            role: user?.trade || 'Tømrer',
            date: todayStr,
            hours: 7.5,
            overtime50: 0,
            overtime100: 0,
            task: 'Oppstart byggeplass og kontroll av underlag',
            status: 'approved',
            projectId: selectedProject?.id,
            projectName: selectedProject?.name
          }
        ];
        currentLogs = initialLogs;
        setDailyTimeEntries(initialLogs);
        localStorage.setItem(logsStorageKey, JSON.stringify(initialLogs));
        syncDailyTimeEntryLocally(initialLogs[0]);
      }
    } catch (e) {}

    // Hent også lagrede timeføringer fra PostgreSQL / backend
    const fetchBackendLogs = async () => {
      try {
        const res = await fetch('/api/data/time_entries');
        if (res.ok) {
          const serverEntries = await res.json();
          if (Array.isArray(serverEntries) && serverEntries.length > 0) {
            const relevant = serverEntries.filter((item: any) => {
              if (!selectedProject?.id || selectedProject.id === 'all') return true;
              return item.projectId === selectedProject.id || item.projectName === selectedProject.name;
            });

            if (relevant.length > 0) {
              setDailyTimeEntries(prev => {
                const map = new Map<string, DailyTimeItem>();
                prev.forEach(item => map.set(item.id, item));
                relevant.forEach((item: any) => {
                  const entryObj: DailyTimeItem = {
                    id: item.id,
                    workerName: item.workerName || user?.displayName || 'Fagarbeider',
                    role: item.role || 'Tømrer',
                    date: item.date || new Date().toISOString().split('T')[0],
                    hours: Number(item.hours) || 0,
                    overtime50: Number(item.overtime50) || 0,
                    overtime100: Number(item.overtime100) || 0,
                    task: item.task || 'Arbeid på byggeplass',
                    status: item.status || 'pending',
                    projectId: item.projectId,
                    projectName: item.projectName
                  };
                  map.set(item.id, entryObj);
                  syncDailyTimeEntryLocally(entryObj);
                });
                const merged = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                try {
                  localStorage.setItem(logsStorageKey, JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
          }
        }
      } catch (err) {
        console.warn('Kunne ikke hente time_entries fra backend:', err);
      }
    };

    fetchBackendLogs();
  }, [logsStorageKey, selectedProject?.id, selectedProject?.name, currentTenantScope, impersonatedCompanyId]);

  // Arkiver kontakt som tidligere ansatt / historisk kontakt (anbefalt for reklamasjons- og HMS-historikk)
  const handleArchiveContact = (id: string, name: string) => {
    const updated = projectContacts.map(c => c.id === id ? { ...c, category: 'former' as const, isFormer: true } : c);
    setProjectContacts(updated);
    try {
      localStorage.setItem(contactsStorageKey, JSON.stringify(updated));
    } catch {}
    toast.success(`"${name}" er arkivert som tidligere kontakt. Telefon og e-post er bevart under "Tidligere ansatte / Arkiv".`);
  };

  // Gjenopprett kontakt til aktivt team
  const handleRestoreContact = (id: string, name: string) => {
    const updated = projectContacts.map(c => c.id === id ? { ...c, category: 'team' as const, isFormer: false } : c);
    setProjectContacts(updated);
    try {
      localStorage.setItem(contactsStorageKey, JSON.stringify(updated));
    } catch {}
    toast.success(`"${name}" er gjenopprettet i aktivt team.`);
  };

  // ✏️ Åpne redigeringsmodal (Kun Admin)
  const handleOpenEditContact = (contact: ProjectContactItem) => {
    if (!isAdmin) {
      toast.error('Kun administrator har tilgang til å redigere kontakter.');
      return;
    }
    setEditingContact(contact);
    setEditContactName(contact.name || '');
    setEditContactRole(contact.role || '');
    setEditContactPhone(contact.phone || '');
    setEditContactEmail(contact.email || '');
    setEditContactCompany(contact.companyName || '');
    setEditContactCategory(contact.category || 'team');
    setEditContactProjects(contact.accessibleProjects || ['all']);
  };

  // 💾 Lagre endret kontakt (Kun Admin)
  const handleSaveEditedContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Kun administrator har tilgang til å redigere kontakter.');
      return;
    }
    if (!editingContact || !editContactName.trim()) {
      toast.error('Vennligst oppgi navn på kontakten');
      return;
    }

    const updated = projectContacts.map(c => {
      if (c.id === editingContact.id) {
        return {
          ...c,
          name: editContactName.trim(),
          role: editContactRole.trim(),
          phone: editContactPhone.trim(),
          email: editContactEmail.trim(),
          companyName: editContactCompany.trim(),
          category: editContactCategory,
          isFormer: editContactCategory === 'former',
          accessibleProjects: editContactCategory === 'team' ? editContactProjects : c.accessibleProjects
        };
      }
      return c;
    });

    setProjectContacts(updated);
    try {
      localStorage.setItem(contactsStorageKey, JSON.stringify(updated));
    } catch {}

    setEditingContact(null);
    toast.success(`Kontakt "${editContactName.trim()}" er oppdatert med tildelte byggeplasser!`);
  };

  const handleDeleteContact = (id: string, name: string, phone: string, category?: string) => {
    if (!isAdmin) {
      toast.error('Kun administrator har tilgang til å slette eller arkivere kontakter.');
      return;
    }

    if (category === 'team') {
      const shouldArchive = window.confirm(
        `Tips for reklamasjon og HMS:\nVil du arkivere ${name} som «Tidligere ansatt» slik at telefon og e-post beholdes dersom det oppstår spørsmål om tidligere utført arbeid?\n\n- Trykk OK for å ARKIVERE som tidligere ansatt (anbefalt)\n- Trykk AVBRYT for å slette permanent i neste trinn.`
      );
      if (shouldArchive) {
        handleArchiveContact(id, name);
        return;
      }
    }

    if (window.confirm(`Er du sikker på at du vil slette ${name} (${phone}) permanent fra telefonboken?`)) {
      const updated = projectContacts.filter(c => c.id !== id);
      setProjectContacts(updated);
      try {
        localStorage.setItem(contactsStorageKey, JSON.stringify(updated));
      } catch {}
      toast.success(`Kontakt "${name}" er slettet fra telefonboken.`);
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      toast.error('Vennligst oppgi navn på kontakten');
      return;
    }
    const newC: ProjectContactItem = {
      id: `c_${Date.now()}`,
      name: newContactName.trim(),
      role: newContactRole.trim(),
      phone: newContactPhone.trim() || '+47 000 00 000',
      email: newContactEmail.trim() || 'kontakt@firma.no',
      companyName: newContactCompany.trim() || (user?.company || 'Bedrift'),
      projectId: selectedProject?.id,
      category: newContactCategory,
      isFormer: newContactCategory === 'former',
      accessibleProjects: newContactCategory === 'team' ? newContactProjects : ['all']
    };
    const updated = [newC, ...projectContacts];
    setProjectContacts(updated);
    try {
      localStorage.setItem(contactsStorageKey, JSON.stringify(updated));
    } catch {}
    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setNewContactCompany('');
    setNewContactCategory('subcontractor');
    setNewContactProjects(['all']);
    setIsAddContactModalOpen(false);
    toast.success(`Kontakt "${newC.name}" lagt til i telefonboken med prosjekttilgang!`);
  };

  const handleSaveDailyLog = async () => {
    const parsedH = parseFloat(logHours.replace(',', '.')) || 7.5;
    const normalH = Math.min(7.5, parsedH);
    const ot50 = logIsWeekendEvening ? 0 : Math.max(0, parsedH - 7.5);
    const ot100 = logIsWeekendEvening ? parsedH : 0;

    let targetWorkerName = user?.displayName || 'Fagarbeider';
    let targetWorkerRole = user?.trade || 'Tømrer';

    if (isAdmin && logWorkerSelection && logWorkerSelection !== 'self') {
      const found = projectContacts.find(c => c.id === logWorkerSelection);
      if (found) {
        targetWorkerName = found.name;
        targetWorkerRole = found.role;
      }
    }

    const newEntry: DailyTimeItem = {
      id: `time_${Date.now()}`,
      workerName: targetWorkerName,
      role: targetWorkerRole,
      date: new Date().toISOString().split('T')[0],
      hours: normalH,
      overtime50: ot50,
      overtime100: ot100,
      task: logDescription || 'Arbeid på byggeplass',
      status: 'pending',
      projectId: selectedProject?.id,
      projectName: selectedProject?.name,
      loggedBy: (isAdmin && targetWorkerName !== user?.displayName) ? `${user?.displayName || 'Admin'} (Leder)` : undefined
    };
    const updated = [newEntry, ...dailyTimeEntries];
    setDailyTimeEntries(updated);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(updated));
      syncDailyTimeEntryLocally(newEntry);
    } catch {}

    // Lagre også til backend / PostgreSQL
    try {
      await fetch('/api/data/time_entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
    } catch (e) {
      console.warn('Kunne ikke synkronisere timeføring til backend:', e);
    }

    toast.success(`Ført ${parsedH} timer på ${targetWorkerName} (${ot50 > 0 ? `+${ot50}t 50% overtid` : ot100 > 0 ? `+${ot100}t 100% overtid` : 'normaltid'})`);
  };

  const handleApproveAllLogs = async () => {
    const updated = dailyTimeEntries.map(entry => ({ ...entry, status: 'approved' as const }));
    setDailyTimeEntries(updated);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(updated));
    } catch {}

    // Oppdater i backend også
    try {
      for (const entry of updated) {
        await fetch(`/api/data/time_entries/${entry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' })
        }).catch(() => null);
      }
    } catch (e) {}

    toast.success('Alle førte timer og overtid er godkjent av leder iht. AML § 10-7.');
  };

  const handleApproveSingleLog = async (id: string) => {
    const updated = dailyTimeEntries.map(entry => entry.id === id ? { ...entry, status: 'approved' as const } : entry);
    setDailyTimeEntries(updated);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(updated));
    } catch {}

    try {
      await fetch(`/api/data/time_entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
    } catch (e) {}

    toast.success('Timeføring godkjent av leder iht. AML § 10-7.');
  };

  const handleToggleSingleLogStatus = async (id: string) => {
    const target = dailyTimeEntries.find(e => e.id === id);
    if (!target) return;
    const newStatus = target.status === 'approved' ? ('pending' as const) : ('approved' as const);
    const updated = dailyTimeEntries.map(entry => entry.id === id ? { ...entry, status: newStatus } : entry);
    setDailyTimeEntries(updated);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(updated));
    } catch {}

    try {
      await fetch(`/api/data/time_entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {}

    toast.success(newStatus === 'approved' ? 'Timeføring godkjent av leder iht. AML § 10-7.' : 'Timeføring satt tilbake til venter.');
  };

  const handleDeleteSingleLog = async (id: string) => {
    const updated = dailyTimeEntries.filter(entry => entry.id !== id);
    setDailyTimeEntries(updated);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(updated));
    } catch {}

    try {
      await fetch(`/api/data/time_entries/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {}

    toast.success('Timeføring slettet.');
  };

  // 🏗️ Nytt prosjekt inline state
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjAddress, setNewProjAddress] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjStage, setNewProjStage] = useState<'Planlegging' | 'Oppstart' | 'Pågående' | 'Ferdigstillelse'>('Pågående');
  const [newProjAiPrompt, setNewProjAiPrompt] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // ⋯ Alle fagmoduler filter og søk
  const [allModulesCategory, setAllModulesCategory] = useState<'all' | 'prosjekt' | 'ks_hms' | 'okonomi' | 'ressurser' | 'superadmin'>('all');
  const [allModulesSearch, setAllModulesSearch] = useState('');

  // Bildeopplasting
  const [attachedImage, setAttachedImage] = useState<{ url: string; preview: string; name?: string; base64?: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestMessageTopRef = useRef<HTMLDivElement>(null);
  const latestTurnTopRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const prevIsLoadingRef = useRef(isLoading);
  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const loadingTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    };
  }, []);

  // Fokus på søkelinje når den åpnes
  useEffect(() => {
    if (isTopSearchOpen) {
      setTimeout(() => topSearchInputRef.current?.focus(), 60);
    }
  }, [isTopSearchOpen]);

  // Tastatursnarvei ⌘K / Ctrl+K
  useEffect(() => {
    const handleWorkstationKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (onOpenSmartSearch) {
          onOpenSmartSearch();
        } else {
          setIsTopSearchOpen(prev => !prev);
        }
      } else if (e.key === 'Escape' && isTopSearchOpen) {
        setIsTopSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleWorkstationKey);
    return () => window.removeEventListener('keydown', handleWorkstationKey);
  }, [isTopSearchOpen, onOpenSmartSearch]);

  // Lytt til select_chat_session custom event
  useEffect(() => {
    const handleSelectSessionEvent = (e: any) => {
      if (e.detail?.sessionId) {
        handleSelectSession(e.detail.sessionId);
      }
    };
    window.addEventListener('select_chat_session', handleSelectSessionEvent);
    return () => window.removeEventListener('select_chat_session', handleSelectSessionEvent);
  }, [projects]);

  // Lytt til select_project custom event
  useEffect(() => {
    const handleSelectProjectEvent = (e: any) => {
      if (e.detail?.projectId || e.detail?.project) {
        const proj = e.detail.project || userAccessibleProjects.find(p => p.id === e.detail.projectId);
        if (proj) {
          onSelectProject(proj);
          if (e.detail.openDetails) {
            setActiveModuleTab('project_details');
            setViewMode('module');
          }
        }
      }
    };
    window.addEventListener('select_project', handleSelectProjectEvent);
    return () => window.removeEventListener('select_project', handleSelectProjectEvent);
  }, [userAccessibleProjects, onSelectProject]);

  // 🔄 Initialiser eller synkroniser aktiv sesjon (isolerer strengt per kunde/bedrift)
  useEffect(() => {
    const syncActiveSession = () => {
      const active = chatSessionService.getActiveSession();
      if (active) {
        setActiveSessionId(active.id);
        setMessages(active.messages || []);
        if (active.projectId) {
          const found = projects.find(p => p.id === active.projectId);
          if (found) onSelectProject(found);
        }
      } else {
        const fresh = chatSessionService.createSession({
          projectName: selectedProject?.name,
          projectId: selectedProject?.id
        });
        setActiveSessionId(fresh.id);
        setMessages([]);
      }
    };

    syncActiveSession();

    const handleSessionChange = () => syncActiveSession();
    window.addEventListener('mester_impersonation_changed', handleSessionChange);
    window.addEventListener('mester_chat_sessions_changed', handleSessionChange);

    return () => {
      window.removeEventListener('mester_impersonation_changed', handleSessionChange);
      window.removeEventListener('mester_chat_sessions_changed', handleSessionChange);
    };
  }, [impersonatedCompanyId, company, projects]);

  // ⚡ Lytt til sanntidsoppdateringer fra MesterAI Copilot overalt i systemet
  useEffect(() => {
    const handleLiveAgentUpdate = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;

      if (detail.type === 'time_logged' && detail.timeEntry) {
        setDailyTimeEntries(prev => {
          const exists = prev.some(item => item.id === detail.timeEntry.id);
          const updated = exists ? prev : [{ ...detail.timeEntry, isLiveAdded: true }, ...prev];
          try {
            localStorage.setItem(logsStorageKey, JSON.stringify(updated));
            syncDailyTimeEntryLocally(detail.timeEntry);
          } catch {}
          return updated;
        });
      }
    };

    window.addEventListener('mester_live_data_updated', handleLiveAgentUpdate);
    return () => window.removeEventListener('mester_live_data_updated', handleLiveAgentUpdate);
  }, [logsStorageKey]);

  // 🎯 Gemini-stil presis scroll til toppen av svar / spørsmål
  const performSmartScrollToTop = useCallback((smooth = true) => {
    const container = chatScrollContainerRef.current;
    if (!container) return;

    const promptEl = latestTurnTopRef.current;
    const assistantEl = latestMessageTopRef.current;

    let targetEl: HTMLElement | null = assistantEl;
    if (promptEl && assistantEl) {
      const promptHeight = promptEl.offsetHeight;
      // Hvis spørsmålet er konsist (under 180px), rull slik at spørsmålet står øverst
      // og svaret begynner rett under (1:1 lik Gemini og ChatGPT web/mobil)
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
    const finalScrollTop = Math.max(0, targetScrollTop - 24);

    container.scrollTo({
      top: finalScrollTop,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, []);

  const handleUserScrollIntent = useCallback(() => {
    isUserScrollingRef.current = true;
  }, []);

  // 📜 Gemini-stil smart scroll:
  // Når et nytt svar ankommer, ruller visningen alltid til TOPPEN av svaret
  // slik at brukeren kan begynne å lese ovenfra og ned (aldri starte nederst og måtte rulle opp!)
  useEffect(() => {
    if (viewMode !== 'chat') return;

    const hadNewMessage = messages.length > prevMessagesLengthRef.current;
    const justStoppedLoading = prevIsLoadingRef.current && !isLoading;
    const justStartedLoading = !prevIsLoadingRef.current && isLoading;

    prevMessagesLengthRef.current = messages.length;
    prevIsLoadingRef.current = isLoading;

    if (justStartedLoading) {
      isUserScrollingRef.current = false;
      const timer = setTimeout(() => {
        const container = chatScrollContainerRef.current;
        const target = latestTurnTopRef.current || thinkingRef.current;
        if (container && target) {
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const targetScrollTop = targetRect.top - containerRect.top + container.scrollTop;
          container.scrollTo({
            top: Math.max(0, targetScrollTop - 24),
            behavior: 'smooth'
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }

    if (hadNewMessage || justStoppedLoading) {
      isUserScrollingRef.current = false;

      // Fase 1: Umiddelbar posisjonering i rAF (hindrer at brukeren et halvt sekund ser bunnen)
      const rafId = requestAnimationFrame(() => {
        performSmartScrollToTop(false);
      });

      // Fase 2: Myk justering etter at ReactMarkdown og komponenter har hydrert (70ms)
      const t1 = setTimeout(() => {
        if (!isUserScrollingRef.current) {
          performSmartScrollToTop(true);
        }
      }, 70);

      // Fase 3: Stabilisering etter at tabeller, punkter og styling har satt seg (220ms)
      const t2 = setTimeout(() => {
        if (!isUserScrollingRef.current) {
          performSmartScrollToTop(true);
        }
      }, 220);

      // Fase 4: Endelig garanti for å sikre at visningen er låst til toppen (480ms)
      const t3 = setTimeout(() => {
        if (!isUserScrollingRef.current) {
          performSmartScrollToTop(true);
        }
      }, 480);

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [messages, isLoading, viewMode, performSmartScrollToTop]);

  // 📐 Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 44), 160)}px`;
    }
  }, [inputVal]);

  // Håndter initialPrompt (hvis sendt inn fra eksternt sted)
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
      onPromptHandled?.();
    }
  }, [initialPrompt]);

  // ➕ Ny samtale
  const handleNewChat = () => {
    const fresh = chatSessionService.createSession({
      projectName: selectedProject?.name,
      projectId: selectedProject?.id
    });
    setActiveSessionId(fresh.id);
    setMessages([]);
    setInputVal('');
    setAttachedImage(null);
    setViewMode('chat');
    setActiveModuleTab(null);
    setActiveForm(null);
    setIsOpenMobile(false);
    toast.success('Ny samtale startet');
  };

  // 🔄 Velg en eksisterende samtale fra historikken
  const handleSelectSession = (sessionId: string) => {
    chatSessionService.setActiveSessionId(sessionId);
    setActiveSessionId(sessionId);
    const target = chatSessionService.getSessions().find(s => s.id === sessionId);
    if (target) {
      setMessages(target.messages || []);
      if (target.projectId) {
        const found = projects.find(p => p.id === target.projectId);
        if (found) onSelectProject(found);
      }
    }
    window.dispatchEvent(new CustomEvent('close_all_modals'));
    window.dispatchEvent(new CustomEvent('close_all_dashboard_modals'));
    setViewMode('chat');
    setActiveModuleTab(null);
    setActiveForm(null);
    setIsOpenMobile(false);
  };

  // 🛠️ Åpne modul fra sidemeny - Alt åpnes direkte i arbeidsvinduet!
  const handleOpenModuleFromSidebar = (moduleId: string) => {
    window.dispatchEvent(new CustomEvent('close_all_modals'));
    window.dispatchEvent(new CustomEvent('close_all_dashboard_modals'));
    setActiveModuleTab(moduleId);
    setViewMode('module');
    setIsOpenMobile(false);
  };

  // 🚀 Aktiver modul fra "Alle moduler"-oversikten eller globale hendelser
  const handleModuleCardClick = (actionId: string) => {
    window.dispatchEvent(new CustomEvent('close_all_modals'));
    window.dispatchEvent(new CustomEvent('close_all_dashboard_modals'));
    switch (actionId) {
      case 'projects':
      case 'all_projects':
        setActiveModuleTab('all_projects');
        setViewMode('module');
        break;
      case 'create_project':
      case 'new_project':
        setActiveModuleTab('create_project');
        setViewMode('module');
        break;
      case 'dailylog':
      case 'daily_log':
      case 'byggedagbok':
      case 'activity_log':
      case 'aktivitetslogg':
        setActiveModuleTab('dailylog');
        setViewMode('module');
        break;
      case 'weather':
      case 'yr':
        setActiveModuleTab('dailylog');
        setViewMode('module');
        toast.info('Viser sanntids værdata fra Yr.no i byggedagboken');
        break;
      case 'archive':
      case 'documentation':
      case 'fdv':
      case 'dokumentarkiv':
        setActiveModuleTab('archive');
        setViewMode('module');
        break;
      case 'building_app':
      case 'byggesoknad':
      case 'byggesøknad':
        setActiveModuleTab('building_app');
        setViewMode('module');
        break;
      case 'checklists':
      case 'checklist':
      case 'start_checklist':
        setActiveModuleTab('checklists');
        setViewMode('module');
        break;
      case 'ai_vision':
      case 'take_photo':
      case 'tek17_vision':
      case 'camera':
        setActiveModuleTab('ai_vision');
        setViewMode('module');
        break;
      case 'sja':
      case 'voice_sja':
      case 'safe_job_analysis':
        setActiveModuleTab('sja');
        setViewMode('module');
        break;
      case 'deviations':
      case 'log_deviation':
      case 'deviation':
        setActiveModuleTab('deviations');
        setViewMode('module');
        break;
      case 'pre_close':
      case 'lukkesperre':
        setActiveModuleTab('pre_close');
        setViewMode('module');
        break;
      case 'hms':
      case 'hms_handbook':
        setActiveModuleTab('hms');
        setViewMode('module');
        break;
      case 'change_orders':
      case 'change_order':
      case 'endringsordre':
      case 'endringsordrer':
        setActiveModuleTab('change_orders');
        setViewMode('module');
        break;
      case 'offers':
      case 'offer':
      case 'tilbud':
        setActiveModuleTab('offers');
        setViewMode('module');
        break;
      case 'contracts':
      case 'contract':
      case 'kontrakt':
      case 'kontrakter':
        setActiveModuleTab('contracts');
        setViewMode('module');
        break;
      case 'time':
      case 'time_registration':
      case 'timer':
      case 'time_tracking':
        setActiveModuleTab('time');
        setViewMode('module');
        break;
      case 'handover':
      case 'overlevering':
        setActiveModuleTab('handover');
        setViewMode('module');
        break;
      case 'vehicle':
      case 'bilpark':
      case 'kjørebok':
        setActiveModuleTab('vehicle');
        setViewMode('module');
        break;
      case 'inventory':
      case 'lager':
        setActiveModuleTab('inventory');
        setViewMode('module');
        break;
      case 'contacts':
      case 'telefonliste':
        setActiveModuleTab('contacts');
        setViewMode('module');
        break;
      case 'teamchat':
      case 'prosjektchat':
      case 'chat-module':
        setActiveModuleTab('teamchat');
        setViewMode('module');
        break;
      case 'apprentice':
      case 'laerling':
        setActiveModuleTab('apprentice');
        setViewMode('module');
        break;
      case 'translator':
      case 'oversetter':
        setViewMode('chat');
        handleSendMessage('Hei MesterAI! Jeg trenger hjelp med flerspråklig oversettelse på byggeplassen. Hvilke språk støtter du, og kan du hjelpe meg med en faglig oversettelse?');
        break;
      case 'super_admin':
      case 'superadmin':
        handleOpenSuperAdmin();
        break;
      case 'all_modules':
      case 'modules':
        setActiveModuleTab('all_modules');
        setViewMode('module');
        break;
      default:
        handleOpenModuleFromSidebar(actionId);
        break;
    }
  };

  // 📜 Generer fullstendig FDV-sluttrapport for prosjektet (basert på alt som har skjedd på byggeplassen)
  const handleGenerateFdvSluttrapport = async (projectToFdv?: Project | null) => {
    const targetProject = projectToFdv || selectedProject;
    if (!targetProject) {
      toast.error('Velg et prosjekt for å generere FDV-sluttrapport.');
      return;
    }
    const toastId = toast.loading(`Samler inn byggedagbok, sjekklister, NOBB-materialer og avvik for ${targetProject.name}...`);
    try {
      const res = await fetch('/api/documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_combined_fdv',
          projectId: targetProject.id,
          projectInfo: {
            name: targetProject.name,
            clientName: targetProject.clientName || 'Byggherre',
            address: targetProject.address || (targetProject as any).location || 'Byggeplass',
            code: targetProject.code || targetProject.projectCode || 'PROJ'
          },
          companyName: user?.company || 'Viking Entreprenør AS'
        })
      });
      const data = await res.json();
      toast.dismiss(toastId);
      if (data.html) {
        const blob = new Blob([data.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `FDV_Sluttrapport_${targetProject.name.replace(/\s+/g, '_')}.html`;
          a.click();
        }
        toast.success(`FDV og sluttrapport for ${targetProject.name} er ferdigstilt og åpnet! 🎉`);
      } else {
        toast.info(`FDV-rapport samlet: ${data.message || 'Klar til nedlasting'}`);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Kunne ikke hente FDV-rapport. Vennligst sjekk nettverkstilkoblingen.');
    }
  };

  // 💰 Bygg tilbudsposter fra alle kalkylelinjer
  const buildOfferItemsFromCalc = () => {
    const items: Array<{
      description: string;
      quantity: number;
      unit: string;
      pricePerUnit: number;
      total: number;
    }> = [];

    let totalLabor = 0;
    let totalMaterialsWithMarkup = 0;
    let totalHours = 0;

    calcLines.forEach((line, index) => {
      const hours = Number(line.hours) || 0;
      const rate = Number(line.hourlyRate) || 0;
      const matsCost = Number(line.materials) || 0;
      const markup = Number(line.markup) || 0;
      const title = line.title?.trim() || `Post ${index + 1}`;

      const lineLabor = hours * rate;
      const lineMats = Math.round(matsCost * (1 + markup / 100));

      totalHours += hours;
      totalLabor += lineLabor;
      totalMaterialsWithMarkup += lineMats;

      if (hours > 0 && lineMats > 0) {
        items.push({
          description: `${title}: Fagmessig arbeid (${hours} timer à kr ${rate})`,
          quantity: hours,
          unit: 'timer',
          pricePerUnit: rate,
          total: lineLabor
        });
        items.push({
          description: `${title}: Materialer og forbruk (inkl. ${markup}% påslag)`,
          quantity: 1,
          unit: 'stk',
          pricePerUnit: lineMats,
          total: lineMats
        });
      } else if (hours > 0) {
        items.push({
          description: `${title}: Fagmessig arbeid (${hours} timer à kr ${rate})`,
          quantity: hours,
          unit: 'timer',
          pricePerUnit: rate,
          total: lineLabor
        });
      } else if (lineMats > 0) {
        items.push({
          description: `${title}: Materialer og utstyr (inkl. ${markup}% påslag)`,
          quantity: 1,
          unit: 'stk',
          pricePerUnit: lineMats,
          total: lineMats
        });
      } else {
        items.push({
          description: title,
          quantity: 1,
          unit: 'post',
          pricePerUnit: 0,
          total: 0
        });
      }
    });

    const total = totalLabor + totalMaterialsWithMarkup;
    return { items, totalLabor, totalMaterialsWithMarkup, totalHours, total };
  };

  // 💰 Opprett tilbud direkte fra hurtigkalkyle med alle linjer
  const handleCreateOfferFromCalc = async () => {
    const { items, totalMaterialsWithMarkup, totalHours, total } = buildOfferItemsFromCalc();

    const newOffer = {
      title: `Tilbud: ${selectedProject?.name || 'Byggeoppdrag'}`,
      projectName: selectedProject?.name || 'Geitekleiva 12',
      projectId: selectedProject?.id || 'gen',
      clientName: selectedProject?.clientName || 'Privatkunde',
      amount: total,
      totalPrice: total,
      totalAmount: total,
      hours: totalHours,
      materials: totalMaterialsWithMarkup,
      items,
      status: 'Sendt til kunde',
      createdAt: new Date().toISOString().split('T')[0]
    };
    try {
      const docRef = await addDoc(collection(db, 'offers'), newOffer);
      const createdOffer = { id: docRef.id, ...newOffer };
      setSelectedOfferForDetail(createdOffer);
      toast.success(`Opprettet pristilbud på kr ${total.toLocaleString('no-NO')} eks. mva med ${items.length} spesifiserte tilbudsposter!`);
    } catch (e) {
      toast.info(`Tilbud på kr ${total.toLocaleString('no-NO')} er klart i kalkylen!`);
    }
  };

  // 📝 Åpne i full tilbudsbygger med ferdigutfylte kalkyleposter
  const handleOpenOfferBuilderFromCalc = () => {
    const { items, totalMaterialsWithMarkup, totalHours, total } = buildOfferItemsFromCalc();

    handleOpenCreateOffer({
      title: `Tilbud: ${selectedProject?.name || 'Byggeoppdrag'}`,
      projectName: selectedProject?.name || 'Geitekleiva 12',
      projectId: selectedProject?.id || '',
      clientName: selectedProject?.clientName || '',
      clientEmail: selectedProject?.clientEmail || '',
      amount: total,
      totalPrice: total,
      totalAmount: total,
      hours: totalHours,
      materials: totalMaterialsWithMarkup,
      items
    });
  };

  // 🪄 AI Autofyll for prosjektopprettelse
  const handleQuickAiFillProject = (type?: string) => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    if (type === 'bad') {
      setNewProjName('Totalrenovering Bad - Våtromsnormen');
      setNewProjCode(`BAD-${randomNum}`);
      setNewProjClient('Privatkunde');
      setNewProjAddress('Vidjeveien 21, Oslo');
      setNewProjDesc('Totalrehabilitering av baderom iht. Byggebransjens Våtromsnorm (BVN) og TEK17. Inkluderer riving, slukbytte, membranarbeid, flislegging og sanitærmontasje.');
      setNewProjStage('Oppstart');
      toast.success('Forhåndsutfylt mal for Bad / Våtrom BVN');
    } else if (type === 'enebolig') {
      setNewProjName('Nybygg Enebolig TEK17');
      setNewProjCode(`ENE-${randomNum}`);
      setNewProjClient('Familien Hansen');
      setNewProjAddress('Furuveien 8, Drammen');
      setNewProjDesc('Oppføring av moderne enebolig i trekonstruksjon iht. TEK17 energikrav, radon- og fuktsikring, samt integrert teknisk anlegg.');
      setNewProjStage('Planlegging');
      toast.success('Forhåndsutfylt mal for Enebolig TEK17');
    } else if (type === 'tilbygg') {
      setNewProjName('Tilbygg & Takoppløft');
      setNewProjCode(`TIL-${randomNum}`);
      setNewProjClient('Kari & Per Johansen');
      setNewProjAddress('Solbakken 19, Asker');
      setNewProjDesc('Tilbygg på 45 m² med stueutvidelse, takoppløft med nye arker og komplett fasadeoppgradering.');
      setNewProjStage('Pågående');
      toast.success('Forhåndsutfylt mal for Tilbygg');
    } else if (type === 'naering') {
      setNewProjName('Lokaletilpasning Kontorbygg');
      setNewProjCode(`NÆR-${randomNum}`);
      setNewProjClient('Næringsutvikling AS');
      setNewProjAddress('Industriveien 3, Sandvika');
      setNewProjDesc('Ombygging av kontorlokaler: systemvegger, akustiske himlinger, sprinklerjustering og TEK17 universell utforming.');
      setNewProjStage('Planlegging');
      toast.success('Forhåndsutfylt mal for Næringsbygg');
    } else if (newProjAiPrompt.trim()) {
      const promptLower = newProjAiPrompt.toLowerCase();
      let detectedName = newProjAiPrompt.slice(0, 45);
      let detectedClient = 'Privatkunde';
      let detectedAddress = 'Norge';

      if (promptLower.includes('bad')) {
        detectedName = 'Totalrenovering Bad';
      } else if (promptLower.includes('kjøkken')) {
        detectedName = 'Kjøkkenfornying & Montering';
      } else if (promptLower.includes('tak')) {
        detectedName = 'Takomlegging & Nytt Beslag';
      } else if (promptLower.includes('garasje')) {
        detectedName = 'Ny Garasje m/bod';
      }

      setNewProjName(detectedName);
      setNewProjCode(`PROJ-${randomNum}`);
      setNewProjClient(detectedClient);
      setNewProjAddress(detectedAddress);
      setNewProjDesc(newProjAiPrompt);
      setNewProjStage('Oppstart');
      toast.success('MesterAI har generert prosjektdata fra beskrivelsen!');
    } else {
      toast.info('Skriv inn en kort beskrivelse i AI-feltet eller velg en ferdig mal');
    }
  };

  // 💾 Lagre nytt prosjekt direkte i Firestore og sett det som aktivt
  const handleSaveNewProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProjName.trim()) {
      toast.error('Vennligst oppgi et prosjektnavn');
      return;
    }

    setIsCreatingProject(true);
    const code = newProjCode.trim() || `PROJ-${Math.floor(100 + Math.random() * 900)}`;
    const client = newProjClient.trim() || 'Privatoppdrag';
    const address = newProjAddress.trim() || 'Byggeplass Norge';
    const desc = newProjDesc.trim() || 'Oppdrag opprettet i MesterWorkstation';

    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: newProjName.trim(),
        code,
        clientName: client,
        address,
        description: desc,
        stage: newProjStage,
        status: 'active',
        progress: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'mester-bruker'
      });

      const created: Project = {
        id: docRef.id,
        name: newProjName.trim(),
        code,
        clientName: client,
        address,
        location: address,
        description: desc,
        stage: newProjStage,
        status: 'active',
        progress: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onSelectProject(created);
      setActiveModuleTab('project_details');
      setViewMode('module');

      setNewProjName('');
      setNewProjCode('');
      setNewProjClient('');
      setNewProjAddress('');
      setNewProjDesc('');
      setNewProjAiPrompt('');

      toast.success(`Prosjekt «${created.name}» er opprettet og aktivt!`);
    } catch (err) {
      console.error('Feil ved opprettelse av prosjekt:', err);
      const localProject: Project = {
        id: `local-${Date.now()}`,
        name: newProjName.trim(),
        code,
        clientName: client,
        address,
        location: address,
        description: desc,
        stage: newProjStage,
        status: 'active',
        progress: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onSelectProject(localProject);
      setActiveModuleTab('project_details');
      setViewMode('module');
      toast.success(`Prosjekt «${localProject.name}» er opprettet lokalt!`);
    } finally {
      setIsCreatingProject(false);
    }
  };

  // 📷 Bildeopplasting med garantert base64-konvertering for bildeanalyse
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vennligst velg en bildefil');
      return;
    }

    setIsUploadingImage(true);
    const localPreview = URL.createObjectURL(file);

    try {
      // 1. Les inn Base64 umiddelbart og garantert (for lynrask og feilsikker bildeanalyse)
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      // Sett attachedImage med komplett base64 umiddelbart så brukeren kan sende med én gang
      setAttachedImage({
        url: localPreview,
        preview: localPreview,
        name: file.name,
        base64: base64Data
      });

      toast.success('Bilde klart for analyse!');

      // 2. Parallell bakgrunnsopplasting til server (for prosjektgalleri og lagring på disk)
      const formData = new FormData();
      formData.append('file', file);

      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.url) {
            setAttachedImage(prev => prev ? { ...prev, url: data.url, base64: prev.base64 || base64Data } : null);
          }
        })
        .catch(err => {
          console.warn('Bakgrunnsopplasting til server feilet, bruker lokal base64:', err);
        });
    } catch (err: any) {
      console.warn('Opplasting via server feilet, bruker lokal base64:', err);
      toast.error('Kunne ikke lese inn bilde');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // 🎙️ Mikrofon / Tale-til-tekst
  const toggleMic = () => {
    if (isListeningMic) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListeningMic(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info('Tale-til-tekst støttes ikke direkte i denne nettleseren.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'nb-NO';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;

      let captured = '';

      recognition.onstart = () => {
        setIsListeningMic(true);
        toast.info('🎙️ Lytter... Snakk inn instruksen nå');
      };

      recognition.onresult = (event: any) => {
        for (let i = 0; i < event.results.length; ++i) {
          captured += event.results[i][0]?.transcript || '';
        }
        if (captured.trim()) {
          setInputVal(prev => prev ? `${prev} ${captured.trim()}` : captured.trim());
        }
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
        if (captured.trim()) {
          toast.success(`Oppfattet: "${captured.trim()}"`);
          handleSendMessage(captured.trim());
        }
      };

      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  // 🔊 TTS Taleopplesning
  const handleSpeakText = async (textToSpeak: string) => {
    if (isSpeaking) {
      if (audioPlayerRef.current) {
        try { audioPlayerRef.current.pause(); } catch {}
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          text: textToSpeak,
          voice: 'onyx',
          model: 'tts-1'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audioPlayerRef.current = audio;
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => setIsSpeaking(false);
          await audio.play();
          return;
        }
      }
    } catch {}

    // Fallback til nettleserstemme
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const clean = textToSpeak.replace(/[*_#`~>]/g, '').slice(0, 600);
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'nb-NO';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  // ✉️ Send melding til MesterAI
  const handleSendMessage = async (textToSend: string, imageOverride?: string) => {
    const activeImage = imageOverride || attachedImage?.url;
    const previewImage = attachedImage?.preview;
    const base64Image = attachedImage?.base64 || (imageOverride?.startsWith('data:') ? imageOverride : undefined);

    if ((!textToSend.trim() && !activeImage && !base64Image) || isLoading) return;

    setAttachedImage(null);

    const userMessage: ChatMessageItem = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend.trim() || (activeImage ? 'Vennligst analyser dette bildet for fagmessig utførelse og TEK17.' : ''),
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      imageUrl: previewImage || activeImage
    };

    const updatedWithUser = [...messages, userMessage];
    setMessages(updatedWithUser);
    setInputVal('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';
    // 🔍 Sjekk om meldingen refererer til et spesifikt prosjekt (eller om et prosjekt allerede er valgt)
    let currentProj = selectedProject;
    const lowerText = (textToSend || userMessage.content).toLowerCase().trim();

    // ⚡ Direktenavigasjon på quick replies / kommandoer
    if (
      lowerText === 'vis timegodkjenning for leder' || 
      lowerText === 'åpne ledergodkjenning' || 
      lowerText === 'gå til ledergodkjenning' ||
      lowerText === 'se ledergodkjenning'
    ) {
      setActiveModuleTab('dailylog');
      setIsTimeApprovalView(true);
      setViewMode('module');
      toast.info('Åpner ledergodkjenning for førte timer og overtid.');
      return;
    }
    if (
      lowerText === 'vis byggedagbok' || 
      lowerText === 'åpne byggedagbok'
    ) {
      setActiveModuleTab('dailylog');
      setIsTimeApprovalView(false);
      setViewMode('module');
      return;
    }

    if (projects && projects.length > 0) {
      const matched = projects.find(p => {
        const pName = (p.name || '').toLowerCase().trim();
        const pAddress = (p.address || (p as any).location || '').toLowerCase().trim();
        const pCode = (p.code || '').toLowerCase().trim();

        // 1. Eksakt match eller fullt prosjektnavn / adresse i teksten
        if (pName && (lowerText === pName || lowerText.includes(pName))) return true;
        if (pAddress && (lowerText === pAddress || lowerText.includes(pAddress))) return true;
        if (pCode && pCode.length >= 3 && lowerText.includes(pCode)) return true;

        // 2. Delord fra prosjektnavn (f.eks. "Vidjeveien" fra "Renovering Bad Vidjeveien 21")
        const words = pName.split(/[\s,.-]+/).filter(w => 
          w.length >= 4 && !['renovering', 'bad', 'enebolig', 'bygg', 'prosjekt', 'tilbygg', 'nybygg', 'hytte'].includes(w)
        );
        if (words.length > 0 && words.some(w => lowerText.includes(w))) return true;

        return false;
      });

      if (matched) {
        currentProj = matched;
        if (!selectedProject || selectedProject.id !== matched.id) {
          onSelectProject(matched);
        }
      }
    }

    const activeProjName = currentProj?.name || undefined;
    const activeProjId = currentProj?.id || undefined;

    setActiveThinkingDuration(0);
    setActiveThinkingQuery(textToSend.trim() || userMessage.content || '');
    setActiveThinkingHasImage(Boolean(activeImage || base64Image));
    setIsLoading(true);

    if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);

    let seconds = 0;
    thinkingTimerRef.current = setInterval(() => {
      seconds += 1;
      setActiveThinkingDuration(seconds);
    }, 1000);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const impersonated = typeof window !== 'undefined' ? localStorage.getItem('impersonatedCompanyId') : null;
      const effectiveCompanyId = impersonated || (user as any)?.companyId || 'comp-001';
      const effectiveCompanyName = impersonated === 'comp-demo-fjellheim' 
        ? 'Fjellheim Bygg & Tømrer AS' 
        : (company || user?.company || 'Viking Entreprenør AS');
      const effectiveUserName = impersonated === 'comp-demo-fjellheim' 
        ? 'Lars Fjellheim' 
        : (user?.displayName || 'Kenneth Glosli Kristiansen');

      const historyPayload = messages
        .filter(m => m.id !== 'welcome' && m.id !== userMessage.id)
        .slice(-8)
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));

      let previousSessionContext = '';
      try {
        const allSessions = chatSessionService.getSessions();
        const otherSessions = allSessions.filter(s => s.id !== activeSessionId && s.messages && s.messages.length > 0);
        if (otherSessions.length > 0) {
          const lastSession = otherSessions[0];
          const lastMsgs = lastSession.messages
            .filter(m => m.id !== 'welcome')
            .slice(-4);
          if (lastMsgs.length > 0) {
            previousSessionContext = `Tittel: «${lastSession.title}» (${lastSession.projectName || 'Generelt'}). Siste temaer:\n` +
              lastMsgs.map(m => `${m.role === 'assistant' ? 'MesterAI' : 'Håndverker'}: ${m.content.slice(0, 300)}`).join('\n');
          }
        }
      } catch {}

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          message: textToSend.trim() || userMessage.content,
          history: historyPayload,
          previousSessionContext: previousSessionContext || undefined,
          sessionId: activeSessionId,
          projectName: activeProjName,
          projectId: activeProjId,
          language: i18n?.language || 'no',
          availableProjects: userAccessibleProjects.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code || p.projectCode,
            address: p.address || (p as any).location,
            progress: typeof p.progress === 'number' ? p.progress : 0,
            status: p.status || 'active',
            stage: p.stage || 'Pågående',
            clientName: p.clientName || 'Privatkunde'
          })),
          userName: effectiveUserName,
          userTrade: trade || user?.trade || 'carpenter',
          userRole: role || user?.role || 'worker',
          isAdmin: isAdmin,
          companyName: effectiveCompanyName,
          companyId: effectiveCompanyId,
          userId: impersonated === 'comp-demo-fjellheim' ? 'u-demo-lars-fjellheim' : (user?.uid || user?.id),
          userEmail: user?.email || '',
          replyTo: user?.email || '',
          imageUrl: activeImage,
          imageBase64: base64Image,
          teamMembers: projectContacts
            .filter(c => c.category === 'team')
            .map(c => ({ id: c.id, name: c.name, role: c.role, email: c.email })),
          tasks: (tasks || [])
            .filter((t: any) => isAdmin || !t.projectId || userAccessibleProjects.some(p => p.id === t.projectId))
            .map((t: any) => ({
              id: t.id,
              title: t.title,
              projectId: t.projectId,
              projectName: t.projectName,
              assignedTo: t.assignedTo,
              dueDate: t.dueDate,
              status: t.status,
              priority: t.priority,
              description: t.description
            })),
          timeEntries: (dailyTimeEntries || [])
            .filter((t: any) => isAdmin || !t.projectId || userAccessibleProjects.some(p => p.id === t.projectId))
            .map((t: any) => ({
              id: t.id,
              projectId: t.projectId,
              projectName: t.projectName,
              userName: t.workerName || t.userName,
              workerName: t.workerName || t.userName,
              date: t.date,
              hours: t.hours,
              task: t.task || t.description,
              status: t.status
            })),
          deviations: (deviations || [])
            .filter((d: any) => isAdmin || !d.projectId || userAccessibleProjects.some(p => p.id === d.projectId))
            .map((d: any) => ({
              id: d.id,
              projectId: d.projectId,
              projectName: d.projectName,
              title: d.title,
              severity: d.severity,
              status: d.status,
              trade: d.trade,
              description: d.description,
              correctiveAction: d.correctiveAction
            }))
        })
      });

      if (!res.ok) throw new Error(`Agent-API svarte med status ${res.status}`);

      const data = await res.json();

      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }

      const assistantMessage: ChatMessageItem = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Forespørselen din er behandlet.',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        quickReplies: data.quickReplies
      };

      const finalMessages = [...updatedWithUser, assistantMessage];
      setMessages(finalMessages);

      // ⏱️ Fang opp direkte timeføring fra MesterAI og oppdater Byggedagbok & Timer i sanntid
      if (data.timeEntry) {
        setDailyTimeEntries(prev => {
          const exists = prev.some(e => e.id === data.timeEntry.id);
          const updated = exists ? prev : [data.timeEntry, ...prev];
          try {
            localStorage.setItem(logsStorageKey, JSON.stringify(updated));
            syncDailyTimeEntryLocally(data.timeEntry);
          } catch {}
          return updated;
        });
        const totalLogged = (Number(data.timeEntry.hours) || 0) + (Number(data.timeEntry.overtime50) || 0) + (Number(data.timeEntry.overtime100) || 0);
        toast.success(`⏱️ ${totalLogged.toFixed(1)}t registrert i byggedagboken for ${data.timeEntry.projectName || 'prosjektet'}!`);
      }

      // ⚠️ Fang opp direkte avviksregistrering fra MesterAI og oppdater Avvik & RUH i sanntid
      if (data.deviation) {
        setLocalDeviations(prev => {
          const exists = prev.some(d => d.id === data.deviation.id);
          const updated = exists ? prev : [data.deviation, ...prev];
          try {
            localStorage.setItem('cached_deviations', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        try {
          addDoc(collection(db, 'deviations'), {
            ...data.deviation,
            timestamp: serverTimestamp()
          }).catch(e => console.warn('Firestore synkroniseringsfeil:', e));
        } catch (e) {
          console.warn('Firestore direkte feil:', e);
        }

        toast.success(`⚠️ Avvik «${data.deviation.title}» registrert under ${data.deviation.projectName || 'prosjektet'}!`);
      }

      // 🎙️ Live Voice mode: les opp svar automatisk
      if (isLiveVoiceActive && assistantMessage.content) {
        handleSpeakText(assistantMessage.content);
      }

      // Lagre i sesjonstjenesten (oppdaterer tittel i sidebaren automatisk)
      chatSessionService.saveSessionMessages(activeSessionId, finalMessages, {
        autoTitle: true,
        projectName: activeProjName,
        projectId: activeProjId
      });
    } catch (err: any) {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
      console.error(err);
      toast.error('Feil ved kontakt med MesterAI: ' + err.message);
      const errMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Beklager, det oppstod en midlertidig feil under tilkoblingen til MesterAI. Vennligst prøv igjen.`,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
      setIsLoading(false);
      setActiveThinkingQuery('');
      setActiveThinkingHasImage(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Kopiert til utklippstavle');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderPromptBar = (isHeroCentered = false) => {
    return (
      <div className={cn("w-full space-y-2 relative pointer-events-auto", isHeroCentered ? "max-w-2xl mx-auto" : "max-w-3xl mx-auto")}>
        {/* Forhåndsvisning av vedlagt bilde */}
        {attachedImage && (
          <div className="flex items-center gap-2.5 p-2 bg-[#1b2230] rounded-2xl border border-white/15 shadow-md w-fit">
            <img src={attachedImage.preview} alt="Vedlegg" className="w-9 h-9 rounded-lg object-cover" />
            <span className="text-xs font-medium text-slate-200 truncate max-w-[200px]">{attachedImage.name}</span>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="p-1 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Pill Container (Rounded-full bg-[#171d27]/95) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
          className={cn(
            "relative flex items-center bg-[#171d27]/95 border border-white/10 hover:border-white/20 focus-within:border-white/30 focus-within:ring-2 focus-within:ring-purple-500/15 rounded-full p-1.5 sm:p-2 shadow-2xl backdrop-blur-xl transition-all",
            isHeroCentered ? "shadow-2xl shadow-purple-950/30 ring-1 ring-white/10" : "shadow-xl"
          )}
        >
          {/* File inputs using sr-only */}
          <input
            id={`mester-file-input-${isHeroCentered ? 'hero' : 'dock'}`}
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="sr-only"
          />
          <input
            id={`mester-camera-input-${isHeroCentered ? 'hero' : 'dock'}`}
            type="file"
            ref={cameraInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            capture="environment"
            className="sr-only"
          />
          <input
            id={`mester-doc-input-${isHeroCentered ? 'hero' : 'dock'}`}
            type="file"
            ref={docInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                toast.success(`Dokument vedlagt: ${file.name}`);
                setInputVal(prev => prev ? `${prev} (Vedlagt fil: ${file.name})` : `Analyser vedlagt dokument: ${file.name}`);
              }
            }}
            accept=".pdf,.dwg,.doc,.docx,.xlsx,.txt"
            className="sr-only"
          />

          {/* Left: + circular button with direct popover */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAttachmentMenuOpen(!isAttachmentMenuOpen);
              }}
              disabled={isUploadingImage || isLoading}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors active:scale-95"
              title="Legg ved bilde, ta foto eller last opp tegning"
            >
              <Plus size={20} className={cn("transition-transform duration-200", isAttachmentMenuOpen && "rotate-45")} />
            </button>

            <AnimatePresence>
              {isAttachmentMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAttachmentMenuOpen(false);
                    }} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-3 z-50 bg-[#161c28] border border-white/15 rounded-3xl p-2 shadow-2xl w-64 space-y-1 backdrop-blur-xl"
                  >
                    <label
                      htmlFor={`mester-camera-input-${isHeroCentered ? 'hero' : 'dock'}`}
                      onClick={() => setIsAttachmentMenuOpen(false)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer text-left group"
                    >
                      <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Camera size={16} />
                      </div>
                      <div>
                        <p className="font-bold">{t('ws_attach_camera', "Ta bilde med kamera")}</p>
                        <p className="text-[10px] text-slate-400">{t('ws_attach_camera_desc', "TEK17 våtrom & slukkontroll")}</p>
                      </div>
                    </label>

                    <label
                      htmlFor={`mester-file-input-${isHeroCentered ? 'hero' : 'dock'}`}
                      onClick={() => setIsAttachmentMenuOpen(false)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer text-left group"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <ImageIcon size={16} />
                      </div>
                      <div>
                        <p className="font-bold">{t('ws_attach_photo', "Bildegalleri")}</p>
                        <p className="text-[10px] text-slate-400">{t('ws_attach_photo_desc', "Last opp eksisterende bilder")}</p>
                      </div>
                    </label>

                    <label
                      htmlFor={`mester-doc-input-${isHeroCentered ? 'hero' : 'dock'}`}
                      onClick={() => setIsAttachmentMenuOpen(false)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer text-left group"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Paperclip size={16} />
                      </div>
                      <div>
                        <p className="font-bold">{t('ws_attach_doc', "Tegning & FDV")}</p>
                        <p className="text-[10px] text-slate-400">{t('ws_attach_doc_desc', "PDF, DWG eller Word-dokument")}</p>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAttachmentMenuOpen(false);
                        handleOpenCreateOffer();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer text-left group"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Calculator size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-purple-300 group-hover:text-purple-200">{t('ws_create_offer_action', "Nytt tilbud & kalkyle")}</p>
                        <p className="text-[10px] text-slate-400">{t('ws_create_offer_desc', "NS 8406, materiell og PDF")}</p>
                      </div>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Center: Expanding textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
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
            placeholder={t('ws_ask_mesterai', "Spør MesterAI om prosjekt, NS 8406, TEK17, kalkyler...")}
            disabled={isLoading}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (items) {
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) {
                      e.preventDefault();
                      const fakeEvent = { target: { files: [file] } } as any;
                      handleImageSelect(fakeEvent);
                      break;
                    }
                  }
                }
              }
            }}
            className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-[15px] text-white placeholder:text-slate-400 focus:outline-none resize-none max-h-32 min-h-[38px] leading-relaxed no-scrollbar overflow-y-auto"
          />

          {/* Right controls: Mic + Send */}
          <div className="flex items-center gap-1.5 shrink-0 pr-1">
            {/* Regular Mic Dictation */}
            <button
              type="button"
              onClick={toggleMic}
              className={cn(
                "p-2 rounded-full transition-all cursor-pointer",
                isListeningMic
                  ? "bg-rose-500 text-white animate-pulse"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              )}
              title={isListeningMic ? t('ws_mic_listening', "Lytter... Trykk for å stoppe") : t('ws_mic_speak', "Snakk inn instruks")}
            >
              {isListeningMic ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* If text or image is present, show Send button */}
            {(inputVal.trim() || attachedImage) ? (
              <button
                type="submit"
                disabled={isLoading}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-md shadow-purple-600/30 active:scale-95 transition-all"
                title={t('ws_send', "Send")}
              >
                <Send size={15} className="translate-x-0.5" />
              </button>
            ) : (
              /* 🔵 Live Voice Gemini button */
              <button
                type="button"
                onClick={() => {
                  const next = !isLiveVoiceActive;
                  setIsLiveVoiceActive(next);
                  if (next) {
                    toast.info(t('ws_live_voice_enabled', '🎙️ Live Voice samtale aktivert. Snakk fritt!'));
                    if (!isListeningMic) toggleMic();
                  } else {
                    toast.info(t('ws_live_voice_disabled', 'Live Voice deaktivert.'));
                    if (isListeningMic) toggleMic();
                  }
                }}
                className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer shadow-md transition-all active:scale-95",
                  isLiveVoiceActive
                    ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 ring-2 ring-blue-400/50 shadow-blue-500/40 animate-pulse"
                    : "bg-[#1a73e8] hover:bg-[#1557b0] shadow-blue-500/25"
                )}
                title={isLiveVoiceActive ? t('ws_live_voice_active', "Avslutt Live Voice samtale") : t('ws_live_voice_start', "Start Live Voice samtale (handsfree)")}
              >
                <div className="flex items-center gap-[2.5px] h-4">
                  <span className={cn("w-[2.5px] rounded-full bg-white transition-all duration-200", isLiveVoiceActive || isListeningMic ? "h-4 animate-bounce" : "h-2")} />
                  <span className={cn("w-[2.5px] rounded-full bg-white transition-all duration-200 delay-75", isLiveVoiceActive || isListeningMic ? "h-5 animate-bounce" : "h-3.5")} />
                  <span className={cn("w-[2.5px] rounded-full bg-white transition-all duration-200 delay-150", isLiveVoiceActive || isListeningMic ? "h-3.5 animate-bounce" : "h-2.5")} />
                  <span className={cn("w-[2.5px] rounded-full bg-white transition-all duration-200 delay-100", isLiveVoiceActive || isListeningMic ? "h-4.5 animate-bounce" : "h-1.5")} />
                </div>
              </button>
            )}
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 md:static flex h-[100dvh] w-full bg-[#0A101D] text-slate-100 overflow-hidden font-sans overscroll-none">
      {/* 1. Left Sidebar (Collapsible Desktop + Mobile Drawer) */}
      <WorkstationSidebar
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        isCollapsedDesktop={isCollapsedDesktop}
        onToggleCollapseDesktop={toggleCollapseDesktop}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={(p) => {
          onSelectProject(p);
          setIsOpenMobile(false);
          if (p) {
            setActiveModuleTab('project_details');
            setViewMode('module');
            toast.info(`Aktivt prosjekt: ${p.name}`);
          } else {
            setActiveModuleTab('all_projects');
            setViewMode('module');
            toast.info('Viser alle byggeplasser');
          }
        }}
        onOpenCreateProject={() => {
          setActiveModuleTab('create_project');
          setViewMode('module');
          setIsOpenMobile(false);
          toast.info('✨ Opprett ny byggeplass');
        }}
        onOpenCreateOffer={() => {
          handleOpenCreateOffer();
          setIsOpenMobile(false);
        }}
        onOpenModule={(moduleId) => {
          handleOpenModuleFromSidebar(moduleId);
          setIsOpenMobile(false);
        }}
        onOpenSmartSearch={() => {
          if (onOpenSmartSearch) onOpenSmartSearch();
          else setIsTopSearchOpen(true);
          setIsOpenMobile(false);
        }}
        onOpenSettings={() => {
          setIsSettingsModalOpen(true);
          setIsOpenMobile(false);
        }}
        onOpenSuperAdmin={() => {
          handleOpenSuperAdmin();
          setIsOpenMobile(false);
        }}
        user={user}
        isSuperAdmin={isSuperAdmin}
        onLogout={logout}
        currentActiveTab={activeModuleTab || undefined}
      />

      {/* 2. Main Workstation Center Stage */}
      <main 
        className="flex-1 flex flex-col h-full overflow-hidden bg-[#0A101D] relative"
        style={{
          backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(30, 48, 80, 0.22), transparent 70%), radial-gradient(ellipse 60% 40% at 50% 50%, rgba(18, 28, 48, 0.25), transparent 80%)'
        }}
      >
        {/* Top Navigation Bar (Gemini & ChatGPT style) */}
        <header className={cn(
          "relative h-14 px-3 sm:px-5 border-b border-slate-800/60 flex items-center justify-between gap-3 bg-[#0A101D]/80 backdrop-blur-md shrink-0 overflow-x-clip min-w-0 w-full",
          isTopSearchOpen ? "z-50" : "z-40"
        )}>
          {isTopSearchOpen ? (
            <div className="flex-1 flex items-center gap-2 max-w-3xl mx-auto animate-in fade-in duration-150">
              <div className="relative flex-1 flex items-center">
                <Search size={16} className="absolute left-3.5 text-purple-400 shrink-0" />
                <input
                  ref={topSearchInputRef}
                  type="text"
                  placeholder={t('ws_search_all_placeholder', "Søk i byggeplasser, avvik, sjekklister, NOBB-materiell eller NS 8406...")}
                  value={topSearchQuery}
                  onChange={(e) => setTopSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsTopSearchOpen(false);
                      setTopSearchQuery('');
                    }
                  }}
                  className="w-full pl-10 pr-8 py-2 rounded-xl bg-slate-900 border border-purple-500/30 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
                  autoFocus
                />
                {topSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTopSearchQuery('')}
                    className="absolute right-2.5 text-slate-400 hover:text-white p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTopSearchOpen(false);
                  setTopSearchQuery('');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                {t('ws_close_esc', "Lukk (Esc)")}
              </button>
            </div>
          ) : (
            <>
              {/* 📱 MOBILE TOP BAR (1:1 Google Gemini App - Screenshot 3) */}
              <div className="flex md:hidden items-center justify-between w-full min-w-0 gap-1.5">
                {/* Left: Hamburger Menu */}
                <button
                  type="button"
                  onClick={() => setIsOpenMobile(true)}
                  className="p-1.5 -ml-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title={t('ws_open_menu', "Åpne meny")}
                >
                  <Menu size={22} />
                </button>

                {/* Center: Model / Project Switcher Pill */}
                <div ref={mobileProjectDropdownRef} className="relative min-w-0 max-w-[135px] xs:max-w-[170px] sm:max-w-[200px]">
                  <button
                    type="button"
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e1f20] border border-white/10 text-xs font-semibold text-white shadow-xs hover:border-white/20 transition-all cursor-pointer min-w-0 max-w-full"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate block">
                      {selectedProject ? selectedProject.name : 'MesterAI v2.6'}
                    </span>
                    <ChevronDown size={14} className="text-slate-400 shrink-0" />
                  </button>

                  {/* Project Switcher Dropdown on Mobile */}
                  {isProjectDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setIsProjectDropdownOpen(false)} 
                      />
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-[#131314] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-white/10 flex items-center justify-between">
                          <span>{t('ws_select_active_site', "Velg aktiv byggeplass")}</span>
                          <span className="text-emerald-400 font-mono">{projects.length} prosjekter</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject(null);
                            setIsProjectDropdownOpen(false);
                            setActiveModuleTab('all_projects');
                            setViewMode('module');
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer mt-1",
                            !selectedProject ? "bg-white/10 text-white border border-white/20" : "text-slate-300 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <Building2 size={15} className="shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <p className="truncate font-bold">{t('ws_all_sites', "Alle byggeplasser")}</p>
                            <p className="text-[10px] text-slate-400">{t('ws_total_overview', "Totaloversikt over oppdrag")}</p>
                          </div>
                        </button>

                        {userAccessibleProjects.map((proj) => (
                          <button
                            key={proj.id}
                            type="button"
                            onClick={() => {
                              onSelectProject(proj);
                              setIsProjectDropdownOpen(false);
                              setActiveModuleTab('project_details');
                              setViewMode('module');
                            }}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer mt-0.5",
                              selectedProject?.id === proj.id ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-300 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <HardHat size={14} className="shrink-0 text-emerald-400" />
                            <div className="min-w-0">
                              <p className="truncate font-bold">{proj.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{proj.clientName || 'Privat oppdragsgiver'}</p>
                            </div>
                          </button>
                        ))}

                        {/* ➕ Hurtighandlinger direkte fra mobil-dropdown */}
                        <div className="pt-1 mt-1 border-t border-white/10 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsProjectDropdownOpen(false);
                              handleOpenCreateOffer();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:text-white hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
                          >
                            <Calculator size={14} className="shrink-0 text-emerald-400" />
                            <span>+ Nytt tilbud (Kalkyle)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsProjectDropdownOpen(false);
                              setActiveModuleTab('create_project');
                              setViewMode('module');
                              toast.info('✨ Opprett ny byggeplass');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-purple-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/30 transition-all cursor-pointer"
                          >
                            <Plus size={14} className="shrink-0 text-purple-400" />
                            <span>{t('ws_create_project_title', "Opprett nytt prosjekt")}</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Right: Tilbud 📝 (hidden on narrow mobile) + Compose ✏️ + Profile Avatar */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenCreateOffer()}
                    className="hidden xs:flex p-1.5 rounded-full text-purple-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/30 transition-colors cursor-pointer shrink-0"
                    title={t('ws_create_offer_title', "Opprett nytt tilbud")}
                  >
                    <Calculator size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleNewChat();
                      setViewMode('chat');
                    }}
                    className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    title={t('ws_new_chat', "Start ny samtale")}
                  >
                    <SquarePen size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/20 overflow-hidden flex items-center justify-center bg-gradient-to-tr from-purple-600 to-blue-500 text-white font-bold text-xs shrink-0 active:scale-95 transition-transform"
                    title={t('ws_settings_profile', "Innstillinger & Profil")}
                  >
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profil" className="w-full h-full object-cover" />
                    ) : (
                      <span>{user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'K'}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* 🖥️ DESKTOP TOP BAR (Full workstation cockpit) */}
              <div className="hidden md:flex items-center justify-between w-full gap-2">
                {/* Left Desktop Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Åpne/lås sidemeny-knapp dersom minimert på desktop */}
                  {isCollapsedDesktop && (
                    <button
                      type="button"
                      onClick={toggleCollapseDesktop}
                      className="p-1.5 px-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5 text-xs font-semibold"
                      title={t('ws_open_sidebar', "Åpne og lås sidemeny")}
                    >
                      <PanelLeftOpen size={16} className="text-emerald-400" />
                      <span className="hidden xl:inline text-slate-400 hover:text-white text-[11px]">{t('ws_menu', 'Meny')}</span>
                    </button>
                  )}

                  {/* Workstation Badge & Selected Project Dropdown */}
                  <div ref={projectDropdownRef} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs font-bold text-white transition-all cursor-pointer shadow-xs group"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate max-w-[160px] lg:max-w-[220px]">
                        {selectedProject ? selectedProject.name : t('ws_all_sites', 'Alle Byggeplasser')}
                      </span>
                      <ChevronDown size={14} className="text-slate-400 group-hover:text-white transition-colors shrink-0" />
                    </button>

                    {/* Project Switcher Dropdown */}
                    {isProjectDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 cursor-default" 
                          onClick={() => setIsProjectDropdownOpen(false)} 
                        />
                        <div className="absolute left-0 top-full mt-1.5 w-72 max-h-80 overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                            <span>{t('ws_select_active_site', "Velg aktiv byggeplass")}</span>
                            <span className="text-emerald-400">{projects.length} prosjekter</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectProject(null);
                              setIsProjectDropdownOpen(false);
                              setActiveModuleTab('all_projects');
                              setViewMode('module');
                            }}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer mt-1",
                              !selectedProject ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-300 hover:bg-slate-850 hover:text-white"
                            )}
                          >
                            <Building2 size={14} className="shrink-0 text-slate-400" />
                            <div className="min-w-0">
                              <p className="truncate font-bold">{t('ws_all_sites', "Alle byggeplasser")}</p>
                              <p className="text-[10px] text-slate-500">{t('ws_total_overview', "Totaloversikt over oppdrag")}</p>
                            </div>
                          </button>

                          {userAccessibleProjects.map((proj) => (
                            <button
                              key={proj.id}
                              type="button"
                              onClick={() => {
                                onSelectProject(proj);
                                setIsProjectDropdownOpen(false);
                                setActiveModuleTab('project_details');
                                viewMode !== 'module' && setViewMode('module');
                              }}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer mt-0.5",
                                selectedProject?.id === proj.id ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-300 hover:bg-slate-850 hover:text-white"
                              )}
                            >
                              <HardHat size={14} className="shrink-0 text-emerald-400" />
                              <div className="min-w-0">
                                <p className="truncate font-bold">{proj.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{proj.clientName || 'Privat oppdragsgiver'}</p>
                              </div>
                            </button>
                          ))}

                          {/* ➕ Hurtighandlinger direkte fra desktop-dropdown */}
                          <div className="pt-1 mt-1 border-t border-slate-800 space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsProjectDropdownOpen(false);
                                handleOpenCreateOffer();
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:text-white hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
                            >
                              <Calculator size={14} className="shrink-0 text-emerald-400" />
                              <span>+ Nytt tilbud (Kalkyle)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsProjectDropdownOpen(false);
                                setActiveModuleTab('create_project');
                                setViewMode('module');
                                toast.info('✨ Opprett ny byggeplass');
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-purple-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/30 transition-all cursor-pointer"
                            >
                              <Plus size={14} className="shrink-0 text-purple-400" />
                              <span>{t('ws_create_project_title', "Opprett nytt prosjekt")}</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ➕ Hurtigknapp for Nytt Tilbud (Desktop) */}
                  <button
                    type="button"
                    onClick={() => handleOpenCreateOffer()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition-all shadow-xs cursor-pointer group active:scale-95 shrink-0 whitespace-nowrap"
                    title="Opprett nytt pristilbud eller hurtigkalkyle"
                  >
                    <Calculator size={13} className="text-purple-400 group-hover:scale-110 transition-transform" />
                    <span>+ Nytt tilbud</span>
                  </button>

                  {/* 🚀 Kom i gang / Hurtigstart knapp */}
                  <button
                    type="button"
                    onClick={() => setIsOnboardingWelcomeOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 hover:text-white text-xs font-bold transition-all shadow-xs cursor-pointer group active:scale-95 shrink-0 whitespace-nowrap"
                    title="Åpne Kom i gang-veileder for nye kunder"
                  >
                    <Sparkles size={13} className="text-amber-400 group-hover:rotate-12 transition-transform" />
                    <span>Kom i gang</span>
                  </button>

                  {/* Status: 100% Autonom (Vises på brede skjermer så den aldri kolliderer) */}
                  <span className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{t('ws_autonomous_agent', "100% Autonom Agent")}</span>
                  </span>
                </div>

                {/* Right Desktop Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={handleOpenSuperAdmin}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
                      title="Åpne SuperAdmin Portal (Brukere, Lisenser, Logger)"
                    >
                      <Crown size={14} className="text-amber-400 shrink-0" />
                      <span className="hidden xl:inline">SuperAdmin</span>
                    </button>
                  )}

                  {!isSuperAdmin && isPlatformOwner && (impersonatedCompanyId || simulatedPlan) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (setSimulatedPlan) setSimulatedPlan(null);
                        if (stopImpersonation) stopImpersonation();
                        handleOpenSuperAdmin();
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black transition-all shadow-md cursor-pointer shrink-0 whitespace-nowrap"
                      title="Avslutt visningsmodus og returner til SuperAdmin"
                    >
                      <ArrowLeft size={13} className="shrink-0" />
                      <span className="hidden xl:inline">{t('ws_back_to_superadmin', "← Til SuperAdmin")}</span>
                    </button>
                  )}
                  {onOpenOmnichannelModal && (
                    <button
                      type="button"
                      onClick={onOpenOmnichannelModal}
                      className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
                      title="Omnichannel Lytter (Discord, Slack, Teams, E-post)"
                    >
                      <Radio size={16} className="text-emerald-400" />
                    </button>
                  )}

                  {/* 🔍 Prominent Global Search Bar (Linear / Gemini style - kontrollert bredde) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenSmartSearch) onOpenSmartSearch();
                      else setIsTopSearchOpen(true);
                    }}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#13161c] hover:bg-[#1a1e28] text-slate-400 hover:text-white border border-slate-700/60 hover:border-purple-500/50 transition-all text-xs font-medium cursor-pointer shadow-xs w-36 md:w-48 lg:w-60 xl:w-72 shrink-0 group"
                    title={t('ws_search_placeholder', "Søk i hele systemet: samtaler, prosjekter, avvik, verktøy... (⌘K)")}
                  >
                    <Search size={14} className="text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
                    <span className="truncate text-slate-400 group-hover:text-slate-200">
                      {t('ws_search_all_placeholder', "Søk i systemet...")}
                    </span>
                    <kbd className="ml-auto px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 font-mono font-bold shrink-0">
                      ⌘K
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenSmartSearch) onOpenSmartSearch();
                      else setIsTopSearchOpen(true);
                    }}
                    className="sm:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
                    title={t('ws_search_placeholder', "Søk i samtaler, prosjekter og moduler (⌘K)")}
                  >
                    <Search size={16} />
                  </button>

                  {/* 💬 Prosjekt- & Firmachatt Hurtigknapp */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModuleTab('teamchat');
                      setViewMode('module');
                    }}
                    className={cn(
                      "p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer relative shrink-0",
                      activeModuleTab === 'teamchat' && viewMode === 'module'
                        ? "bg-violet-600/30 text-violet-300 border border-violet-500/50"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                    )}
                    title="Åpne Prosjekt- & Firmachatt (Internkommunikasjon)"
                  >
                    <MessageSquare size={16} className="text-violet-400" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  </button>

                  <div className="shrink-0">
                    <NotificationBell darkMode={true} />
                  </div>
                </div>
              </div>
            </>
          )}
        </header>

        {/* Floating Top Search Results Dropdown */}
        <AnimatePresence>
          {isTopSearchOpen && (
            <>
              <div 
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs" 
                onClick={() => setIsTopSearchOpen(false)} 
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="fixed left-3 right-3 sm:left-6 sm:right-6 top-16 z-50 max-w-2xl mx-auto bg-slate-900/98 backdrop-blur-xl border border-purple-500/40 rounded-2xl shadow-2xl p-3.5 max-h-[75vh] overflow-y-auto custom-scrollbar"
              >
                {(() => {
                  const queryLower = topSearchQuery.toLowerCase().trim();
                  const allSessions = chatSessionService.getSessions();
                  const filteredSessions = queryLower
                    ? allSessions.filter(s => s.title.toLowerCase().includes(queryLower) || s.projectName?.toLowerCase().includes(queryLower))
                    : allSessions.slice(0, 4);

                  const filteredProjects = queryLower
                    ? userAccessibleProjects.filter(p => p.name.toLowerCase().includes(queryLower) || p.clientName?.toLowerCase().includes(queryLower))
                    : userAccessibleProjects.slice(0, 3);

                  const moduleList = [
                    { id: 'offers', name: '📝 Tilbud & Hurtigkalkyle', desc: 'Prising, timepriser, materiell og påslag' },
                    { id: 'dailylog', name: '⏱️ Byggedagbok & Timer', desc: 'Yr-vær, mannskapsliste og diktering' },
                    { id: 'change_orders', name: '⚡ Endringsordrer (NS 8406)', desc: 'Varsling, fristforlengelse og krav' },
                    { id: 'pre_close', name: '📋 KS & Lukkesperre TEK17', desc: 'Obligatorisk sjekk før vegger lukkes' },
                    { id: 'sja', name: '🦺 SJA & Sikkerhet', desc: 'Risikovurdering, PVU og tiltak' },
                    { id: 'archive', name: '📁 Dokumentarkiv & FDV', desc: 'NOBB BYOK og monteringsanvisninger' },
                    { id: 'contacts', name: '👥 Kontakter & Team', desc: 'Byggherre, bas og underentreprenører' },
                    { id: 'all_modules', name: '⋯ Alle fagmoduler', desc: 'Full oversikt over 20+ verktøy' }
                  ];

                  const filteredModules = queryLower
                    ? moduleList.filter(m => m.name.toLowerCase().includes(queryLower) || m.desc.toLowerCase().includes(queryLower))
                    : moduleList.slice(0, 6);

                  const hasAny = filteredSessions.length > 0 || filteredProjects.length > 0 || filteredModules.length > 0;

                  if (!hasAny) {
                    return (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Ingen resultater for «{topSearchQuery}». Prøv et annet ord eller still spørsmålet direkte i chatten!
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3.5 text-xs">
                      {/* Samtaler */}
                      {filteredSessions.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                            <MessageSquare size={12} /> Nylige samtaler & oppgaver
                          </div>
                          <div className="space-y-1">
                            {filteredSessions.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  handleSelectSession(s.id);
                                  setIsTopSearchOpen(false);
                                  setTopSearchQuery('');
                                }}
                                className="w-full p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-purple-500/40 text-left transition-colors flex items-center justify-between group cursor-pointer"
                              >
                                <span className="font-medium text-slate-200 group-hover:text-white truncate">
                                  {s.title}
                                </span>
                                {s.projectName && (
                                  <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 shrink-0 ml-2">
                                    {s.projectName}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prosjekter */}
                      {filteredProjects.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 size={12} /> Byggeprosjekter
                          </div>
                          <div className="space-y-1">
                            {filteredProjects.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  onSelectProject(p);
                                  setIsTopSearchOpen(false);
                                  setTopSearchQuery('');
                                  setActiveModuleTab('project_details');
                                  setViewMode('module');
                                  setIsOpenMobile(false);
                                  toast.info(`Valgt prosjekt: ${p.name}`);
                                }}
                                className="w-full p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-emerald-500/40 text-left transition-colors flex items-center justify-between group cursor-pointer"
                              >
                                <span className="font-medium text-slate-200 group-hover:text-white truncate">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-emerald-400 shrink-0 ml-2">
                                  Velg byggeplass →
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fagmoduler */}
                      {filteredModules.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={12} /> Fagsystemer & Moduler
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {filteredModules.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  handleOpenModuleFromSidebar(m.id);
                                  setIsTopSearchOpen(false);
                                  setTopSearchQuery('');
                                }}
                                className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-blue-500/40 text-left transition-colors cursor-pointer group"
                              >
                                <span className="font-bold text-slate-200 group-hover:text-white block truncate">
                                  {m.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {m.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 3. Main Stage Content Area */}
        {viewMode === 'form' && activeForm ? (
          /* 📝 SKJEMA & BYGGER DIREKTE I ARBEIDSFLATEN DER MESTERAI ER (INGEN POPUP) */
          <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-[#0A101D] relative">
            <InChatWorkspace
              formType={activeForm.type}
              initialData={activeForm.data}
              projects={projects}
              selectedProject={selectedProject}
              onClose={() => {
                setActiveForm(null);
                setViewMode('chat');
              }}
              onSuccess={(msg, actionData) => {
                handleFormSuccess(msg, actionData);
              }}
              onSwitchForm={(nextType, nextData) => {
                setActiveForm({ type: nextType, data: nextData });
              }}
              onOpenOmnichannelModal={onOpenOmnichannelModal}
            />
          </div>
        ) : viewMode === 'module' && activeModuleTab === 'teamchat' ? (
          /* 💬 PROSJEKT- & FIRMACHATT: FULLSKJERM EDGE-TO-EDGE SOM HOVEDCHATTEN (INGEN DOBLE BOKSER ELLER SCROLLBARS) */
          <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-[#0A101D] relative">
            <ProjectTeamChat
              projects={projects}
              selectedProject={selectedProject}
              onSelectProject={onSelectProject}
              user={user}
              projectContacts={projectContacts}
              onOpenCopilot={(prompt) => {
                if (prompt) handleSendMessage(prompt);
                else window.dispatchEvent(new CustomEvent('mesterai:open-copilot'));
              }}
              onBackToWorkstation={() => {
                setViewMode('chat');
                setActiveModuleTab(null);
              }}
              onConsultMesterAi={(consult) => {
                handleStartTeamChatConsult(consult);
              }}
            />
          </div>
        ) : (
          <div 
            ref={chatScrollContainerRef} 
            onWheel={handleUserScrollIntent}
            onTouchMove={handleUserScrollIntent}
            style={{ overflowAnchor: 'none' }}
            className="flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar flex flex-col relative [touch-action:pan-y] [overflow-anchor:none]"
          >
            {viewMode === 'module' ? (
              /* 📊 MODULE VIEW (When user clicks a module from the left sidebar) */
              <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-4">
                {/* Back to chat banner & Copilot quick launcher */}
                <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xs gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('chat')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm border border-slate-700 transition-all cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span className="hidden sm:inline">← Tilbake til MesterAI Chat</span>
                    <span className="sm:hidden">← Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenModuleCopilotHelp}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-electric-600 to-indigo-600 hover:from-electric-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer border border-electric-400/40"
                    title="Åpne MesterAI Copilot for veiledning i denne visningen (Ctrl+M)"
                  >
                    <Sparkles size={15} className="text-amber-300 animate-pulse" />
                    <span>Spør MesterAI om denne visningen</span>
                    <span className="hidden md:inline text-[10px] font-mono opacity-80 bg-black/30 px-1.5 py-0.5 rounded-md">Ctrl+M</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowModuleGuide(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      showModuleGuide 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                    title="Vis hvordan denne modulen fungerer i 3 enkle steg"
                  >
                    <HelpCircle size={15} className={showModuleGuide ? "text-amber-400" : "text-slate-400"} />
                    <span className="hidden sm:inline">Slik fungerer det</span>
                    <span className="sm:hidden">Hjelp</span>
                  </button>
                </div>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  {activeModuleTab === 'project_details' && (
                    <span>Aktiv byggeplass: <strong className="text-emerald-400">{selectedProject?.name || 'Prosjektoversikt'}</strong></span>
                  )}
                  {activeModuleTab === 'all_projects' && (
                    <span>Byggeplassoversikt: <strong className="text-amber-400">Alle prosjekter</strong></span>
                  )}
                  {activeModuleTab === 'create_project' && (
                    <span>Ny byggeplass: <strong className="text-purple-400">Opprett prosjekt</strong></span>
                  )}
                  {activeModuleTab === 'superadmin' && (
                    <span>Systemadministrasjon: <strong className="text-amber-400">👑 SuperAdmin Portal & SaaS Drift</strong></span>
                  )}
                  {activeModuleTab === 'offers' && (
                    <span>Kalkyle & Salg: <strong className="text-purple-400">Tilbud, Kontrakter & Prosjektoppstart</strong></span>
                  )}
                  {activeModuleTab === 'contacts' && (
                    <span>Telefonbok: <strong className="text-emerald-400">Kunder, Ansatte & Samarbeidspartnere</strong></span>
                  )}
                  {activeModuleTab === 'apprentice' && (
                    <span>Opplæring: <strong className="text-indigo-400">🎓 Lærlingmodul & Opplæringsbok</strong></span>
                  )}
                  {activeModuleTab === 'hms' && (
                    <span>HMS & Internkontroll: <strong className="text-teal-400">🛡️ HMS, Stoffkartotek & Vernerunder</strong></span>
                  )}
                  {activeModuleTab === 'teamchat' && (
                    <span>Internkommunikasjon: <strong className="text-violet-400">💬 Prosjekt- & Firmachatt</strong></span>
                  )}
                  {activeModuleTab === 'vehicle' && (
                    <span>Bilpark & Kjørebok: <strong className="text-amber-400">🚗 Elektronisk Kjørebok & Flåtestyring</strong></span>
                  )}
                  {activeModuleTab === 'building_app' && (
                    <span>Byggesak: <strong className="text-blue-400">🏗️ Byggesøknad & Nabovarsel (SAK10)</strong></span>
                  )}
                  {activeModuleTab === 'checklists' && (
                    <span>Kvalitetskontroll: <strong className="text-emerald-400">📋 Sjekklister & Fagkontroll (TEK17)</strong></span>
                  )}
                  {activeModuleTab === 'ai_vision' && (
                    <span>Bildeanalyse: <strong className="text-rose-400">🧠 MesterAI Vision & Feildeteksjon</strong></span>
                  )}
                  {activeModuleTab === 'contracts' && (
                    <span>Entreprise: <strong className="text-indigo-400">📝 Kontraktshåndtering (NS 8405 / 8406)</strong></span>
                  )}
                  {activeModuleTab === 'handover' && (
                    <span>Ferdigstillelse: <strong className="text-rose-400">🏆 Overlevering & Sluttkontroll</strong></span>
                  )}
                  {activeModuleTab === 'inventory' && (
                    <span>Materiell: <strong className="text-blue-400">📦 Lager, Verktøy & Kjemikalier</strong></span>
                  )}
                  {!['project_details', 'all_projects', 'create_project', 'superadmin', 'offers', 'contacts', 'apprentice', 'hms', 'teamchat', 'vehicle', 'building_app', 'checklists', 'ai_vision', 'contracts', 'handover', 'inventory', 'change_orders', 'pre_close', 'deviations', 'sja', 'archive', 'dailylog', 'all_modules'].includes(activeModuleTab || '') && (
                    <span>Viser fagsystem: <strong className="text-white capitalize">{activeModuleTab}</strong></span>
                  )}
                </span>
              </div>

              {/* Modulveiledning panel hvis aktivert */}
              {showModuleGuide && activeModuleTab && MODULE_GUIDE_DATA[activeModuleTab] && (() => {
                const guide = MODULE_GUIDE_DATA[activeModuleTab];
                return (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-electric-500/30 shadow-xl space-y-4 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-electric-500/20 text-electric-400 border border-electric-500/30 flex items-center justify-center font-bold shrink-0">
                          <BookOpen size={16} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-black text-white text-sm">{guide.title}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-electric-500/20 text-electric-300 border border-electric-500/30">
                              {guide.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">{guide.desc}</p>
                        </div>
                      </div>
                      {guide.lawBadge && (
                        <span className="self-start sm:self-center text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg shrink-0">
                          ⚖️ {guide.lawBadge}
                        </span>
                      )}
                    </div>

                    {/* 3 Trinn */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {guide.steps.map((st, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-electric-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                              {st.num}
                            </span>
                            <span className="text-xs font-bold text-white">{st.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed pl-7">{st.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* AI Action footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-400" />
                        MesterAI kan hjelpe deg å utføre denne oppgaven trinn-for-trinn eller via stemmen.
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenModuleCopilotHelp}
                        className="px-3.5 py-1.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
                      >
                        <Sparkles size={13} className="text-amber-300" />
                        <span>Spør MesterAI om denne modulen</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 0A. 🏗️ PROSJEKTOVERSIKT & DASHBOARD (INLINE I ARBEIDSVINDUET) */}
              {activeModuleTab === 'project_details' && (
                <div className="space-y-4">
                  {selectedProject ? (
                    <>
                      {/* Prosjekt Header & Hero Card */}
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                              <Building2 size={24} />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-black text-white">{selectedProject.name}</h3>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  {selectedProject.code || 'PROJ-101'}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                  {selectedProject.stage || 'Pågående'}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <UserIcon size={14} className="text-purple-400" />
                                  <strong>Kunde:</strong> {selectedProject.clientName || 'Privat oppdragsgiver'}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <MapPin size={14} className="text-rose-400" />
                                  <strong>Byggeplass:</strong> {selectedProject.address || 'Norge'}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-400">
                                  <Calendar size={14} className="text-blue-400" />
                                  {selectedProject.createdAt ? new Date(selectedProject.createdAt).toLocaleDateString('no-NO') : 'September 2026'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleGenerateFdvSluttrapport(selectedProject)}
                              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                              title="Fullfør prosjekt og generer automatisk FDV-dokumentasjon og sluttrapport basert på alt som har skjedd på byggeplassen"
                            >
                              <FileCheck size={15} />
                              <span>Fullfør & Generer FDV</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('chat');
                                setActiveModuleTab(null);
                                handleSendMessage(`Gi meg en statusoppdatering og neste steg for prosjektet ${selectedProject.name}`);
                              }}
                              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-electric-600 hover:from-purple-500 hover:to-electric-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                            >
                              <Sparkles size={15} />
                              <span>MesterAI Status & Analyse</span>
                            </button>
                          </div>
                        </div>

                        {/* Fremdriftslinje */}
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-300 flex items-center gap-2">
                              <CheckCircle2 size={15} className="text-emerald-400" />
                              Fremdrift på byggeplass
                            </span>
                            <span className="font-black text-emerald-400">{selectedProject.progress || 35}% fullført</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${selectedProject.progress || 35}%` }}
                            />
                          </div>
                        </div>

                        {/* Sanntids Værvarsel for byggeplassen (Yr / Open-Meteo) */}
                        <WeatherWidget 
                          projectLocation={selectedProject.address || (selectedProject as any).location || selectedProject.name} 
                          className="border-slate-800"
                        />

                        {/* 4 Nøkkeltall / Statuskort for dette prosjektet */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div 
                            onClick={() => handleOpenModuleFromSidebar('dailylog')}
                            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Byggedagbok</span>
                              <Clock size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-xl font-black text-white mt-1">7,5 t i dag</div>
                            <span className="text-[10px] text-amber-400 block mt-1">Før timer & Yr-vær →</span>
                          </div>

                          <div 
                            onClick={() => handleOpenModuleFromSidebar('change_orders')}
                            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/40 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Endringsordrer</span>
                              <FileSignature size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-xl font-black text-white mt-1">
                              {changeOrders.filter(co => !selectedProject || co.projectId === selectedProject.id || co.project === selectedProject.name).length} aktive
                            </div>
                            <span className="text-[10px] text-purple-400 block mt-1">NS 8406 varsling →</span>
                          </div>

                          <div 
                            onClick={() => handleOpenModuleFromSidebar('pre_close')}
                            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-teal-500/40 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lukkesperre</span>
                              <ClipboardCheck size={15} className="text-teal-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-xl font-black text-white mt-1">TEK17 Sjekk</div>
                            <span className="text-[10px] text-teal-400 block mt-1">Kontroll før tildekking →</span>
                          </div>

                          <div 
                            onClick={() => handleOpenModuleFromSidebar('deviations')}
                            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-rose-500/40 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avvik & SJA</span>
                              <AlertTriangle size={15} className="text-rose-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-xl font-black text-white mt-1">
                              {allDeviations.filter(d => (!selectedProject || d.projectId === selectedProject.id) && d.status !== 'closed').length} åpne
                            </div>
                            <span className="text-[10px] text-rose-400 block mt-1">HMS & RUH-rapportering →</span>
                          </div>
                        </div>
                      </div>

                      {/* 8 Snarveier til fagmoduler for dette prosjektet */}
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Layers size={16} className="text-purple-400" />
                            <span>Fagmoduler for {selectedProject.name}</span>
                          </h4>
                          <span className="text-xs text-slate-400">Alt åpnes direkte i arbeidsvinduet</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { id: 'offers', name: 'Tilbud & Kalkyle', icon: Calculator, color: 'text-purple-400' },
                            { id: 'dailylog', name: 'Byggedagbok', icon: Clock, color: 'text-amber-400' },
                            { id: 'change_orders', name: 'Endringsordre', icon: FileSignature, color: 'text-blue-400' },
                            { id: 'pre_close', name: 'Lukkesperre', icon: ClipboardCheck, color: 'text-teal-400' },
                            { id: 'deviations', name: 'Avvik & RUH', icon: AlertTriangle, color: 'text-rose-400' },
                            { id: 'sja', name: 'SJA & Sikkerhet', icon: Shield, color: 'text-emerald-400' },
                            { id: 'archive', name: 'FDV & NOBB', icon: Archive, color: 'text-cyan-400' },
                            { id: 'contacts', name: 'Team & Roller', icon: Users, color: 'text-indigo-400' }
                          ].map((m) => {
                            const Icon = m.icon;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleOpenModuleFromSidebar(m.id)}
                                className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 text-left transition-all cursor-pointer group shadow-xs"
                              >
                                <Icon size={18} className={cn(m.color, "mb-2 group-hover:scale-110 transition-transform")} />
                                <span className="font-bold text-xs text-white block group-hover:text-purple-300 transition-colors">
                                  {m.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Åpne modul →</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* MesterAI Prosjektassistent-kort */}
                      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-purple-500/30 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-purple-400" />
                          <h4 className="text-sm font-bold text-white">Spør MesterAI om {selectedProject.name}</h4>
                        </div>
                        <p className="text-xs text-slate-400">
                          Klikk på en hurtigkommando nedenfor for å utføre handlingen automatisk i chatten:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('chat');
                              setActiveModuleTab(null);
                              handleSendMessage(`Før 7,5 timer lekting og isolasjon i byggedagboken for ${selectedProject.name}`);
                            }}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <Clock size={14} className="text-amber-400 shrink-0" />
                            <span>«Før 7,5 timer lekting for {selectedProject.name}»</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('chat');
                              setActiveModuleTab(null);
                              handleSendMessage(`Varsle endringsordre iht. NS 8406 for ${selectedProject.name}: 25 000 kr for ekstra forsterkning`);
                            }}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <FileSignature size={14} className="text-purple-400 shrink-0" />
                            <span>«Varsle endringsordre iht. NS 8406 på 25 000 kr»</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('chat');
                              setActiveModuleTab(null);
                              handleSendMessage(`Opprett en Sikker Jobb Analyse (SJA) for ${selectedProject.name}: stillasarbeid i 2. etasje`);
                            }}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <Shield size={14} className="text-emerald-400 shrink-0" />
                            <span>«Lag SJA for stillasarbeid i 2. etasje»</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('chat');
                              setActiveModuleTab(null);
                              handleSendMessage(`Sjekk TEK17 og Byggebransjens Våtromsnorm krav til lukkesperre for ${selectedProject.name}`);
                            }}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <ClipboardCheck size={14} className="text-teal-400 shrink-0" />
                            <span>«Sjekk TEK17 krav til lukkesperre»</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('chat');
                              setActiveModuleTab(null);
                              handleSendMessage(`Hva blir været på ${selectedProject.name} i dag?`);
                            }}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer sm:col-span-2"
                          >
                            <CloudSun size={14} className="text-amber-400 shrink-0" />
                            <span>«Hva blir været på {selectedProject.name} i dag? (Sanntidsvarsel & HMS-arbeidsråd)»</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
                      <Building2 size={36} className="text-slate-500 mx-auto" />
                      <h3 className="text-base font-bold text-white">Ingen byggeplass valgt</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Velg et prosjekt i menyen til venstre, eller se full oversikt over alle byggeplasser.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveModuleTab('all_projects')}
                        className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white text-xs font-bold"
                      >
                        Se alle byggeplasser
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 0B. 🏢 ALLE BYGGEPLASSER & PROSJEKTER */}
              {activeModuleTab === 'all_projects' && (
                <div className="space-y-4">
                  {/* 🌟 Hurtigstart & Onboarding for nye og eksisterende brukere */}
                  <QuickStartGuide
                    projectsCount={userAccessibleProjects.length}
                    onOpenAction={(actionId) => {
                      if (actionId === 'chat') {
                        setViewMode('chat');
                        setActiveModuleTab(null);
                      } else {
                        handleModuleCardClick(actionId);
                      }
                    }}
                    onOpenAllModules={() => handleModuleCardClick('all_modules')}
                    onOpenTour={() => setIsOnboardingWelcomeOpen(true)}
                    onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
                  />

                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <HardHat className="text-amber-400" size={20} />
                          <span>{isAdmin ? 'Alle Byggeplasser' : 'Mine Byggeplasser'} ({userAccessibleProjects.length})</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isAdmin 
                            ? 'Oversikt over alle aktive, planlagte og fullførte byggeprosjekter i bedriften.' 
                            : 'Oversikt over byggeplasser du er tildelt tilgang til av prosjektleder/admin.'}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModuleTab('create_project');
                            setViewMode('module');
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                        >
                          <Plus size={15} />
                          <span>Opprett nytt prosjekt</span>
                        </button>
                      )}
                    </div>

                    {/* Søkefilter */}
                    <div className="relative">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={projectSearchQuery}
                        onChange={(e) => setProjectSearchQuery(e.target.value)}
                        placeholder="Søk etter prosjektnavn, prosjektkode, kunde eller adresse..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Prosjektliste */}
                    {(() => {
                      const q = projectSearchQuery.toLowerCase().trim();
                      const filtered = q
                        ? userAccessibleProjects.filter(p =>
                            p.name.toLowerCase().includes(q) ||
                            p.code?.toLowerCase().includes(q) ||
                            p.clientName?.toLowerCase().includes(q) ||
                            p.address?.toLowerCase().includes(q)
                          )
                        : userAccessibleProjects;

                      if (filtered.length === 0) {
                        return (
                          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-2xl space-y-3">
                            <p>Ingen prosjekter matcher søket «{projectSearchQuery}».</p>
                            <button
                              type="button"
                              onClick={() => setProjectSearchQuery('')}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700"
                            >
                              Nullstill søk
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {filtered.map((proj) => {
                            const isSelected = selectedProject?.id === proj.id;
                            return (
                              <div
                                key={proj.id}
                                className={cn(
                                  "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4",
                                  isSelected
                                    ? "bg-slate-950 border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                                )}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-white">{proj.name}</span>
                                        {isSelected && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            Aktiv
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                        {proj.code || 'PROJ-101'}
                                      </p>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                      {proj.stage || 'Pågående'}
                                    </span>
                                  </div>

                                  <div className="space-y-1 text-xs text-slate-400 pt-1">
                                    <div className="flex items-center gap-1.5">
                                      <UserIcon size={12} className="text-purple-400 shrink-0" />
                                      <span className="truncate">{proj.clientName || 'Privat oppdragsgiver'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <MapPin size={12} className="text-rose-400 shrink-0" />
                                      <span className="truncate">{proj.address || 'Norge'}</span>
                                    </div>
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="pt-2">
                                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                      <span>Fremdrift</span>
                                      <span className="font-bold text-emerald-400">{proj.progress || 35}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-400 rounded-full"
                                        style={{ width: `${proj.progress || 35}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectProject(proj);
                                      setActiveModuleTab('project_details');
                                      setViewMode('module');
                                      toast.info(`Aktivt prosjekt: ${proj.name}`);
                                    }}
                                    className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-slate-750 transition-colors cursor-pointer text-center"
                                  >
                                    Åpne prosjektoversikt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectProject(proj);
                                      setViewMode('chat');
                                      setActiveModuleTab(null);
                                      handleSendMessage(`Jeg vil jobbe med prosjektet ${proj.name}. Hva er status og åpne oppgaver?`);
                                    }}
                                    className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                                    title="Start MesterAI Chat for dette prosjektet"
                                  >
                                    <Sparkles size={15} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 0C. ➕ OPPRETT NYTT PROSJEKT (INLINE I ARBEIDSVINDUET - INGEN POPUP!) */}
              {activeModuleTab === 'create_project' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
                    <div className="pb-4 border-b border-slate-800 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                          <Sparkles className="text-purple-400" size={22} />
                          <span>Opprett ny byggeplass / prosjekt</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                          MesterAI setter automatisk opp riktige faglige krav, kontrollplaner iht. TEK17 og NS-standarder.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedProject) {
                            setActiveModuleTab('project_details');
                          } else {
                            setActiveModuleTab('all_projects');
                          }
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                        title="Lukk / Avbryt"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Hurtigmaler */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 block">
                        ⚡ Velg en ferdig fagmal for hurtigoppsett:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'bad', label: '🚿 Bad / Våtrom (BVN)', desc: 'TEK17 sluk & membran' },
                          { id: 'enebolig', label: '🏠 Enebolig TEK17', desc: 'Nybygg trekonstruksjon' },
                          { id: 'tilbygg', label: '🔨 Tilbygg / Påbygg', desc: 'Bæring & utvidelse' },
                          { id: 'naering', label: '🏢 Næringsbygg', desc: 'Systemvegger & akustikk' }
                        ].map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => handleQuickAiFillProject(tpl.id)}
                            className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 text-left transition-all cursor-pointer group shadow-xs"
                          >
                            <span className="font-bold text-xs text-white block group-hover:text-purple-300 transition-colors">
                              {tpl.label}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {tpl.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Fritekst Prompt */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-950 to-slate-950 border border-purple-500/30 space-y-2.5">
                      <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Sparkles size={14} /> Eller beskriv oppdraget med egne ord:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newProjAiPrompt}
                          onChange={(e) => setNewProjAiPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleQuickAiFillProject();
                            }
                          }}
                          placeholder="f.eks: Totalrenovering av bad i Vidjeveien 21 for Ola Nordmann, estimert 3 uker..."
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-500/30 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickAiFillProject()}
                          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
                        >
                          <Sparkles size={13} />
                          <span>Autofyll</span>
                        </button>
                      </div>
                    </div>

                    {/* Skjema */}
                    <form onSubmit={handleSaveNewProject} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Prosjektnavn <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={newProjName}
                            onChange={(e) => setNewProjName(e.target.value)}
                            placeholder="F.eks: Totalrenovering Bad - Vidjeveien 21"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Prosjektkode / Referanse
                          </label>
                          <input
                            type="text"
                            value={newProjCode}
                            onChange={(e) => setNewProjCode(e.target.value)}
                            placeholder="F.eks: PROJ-105"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Prosjektfase
                          </label>
                          <select
                            value={newProjStage}
                            onChange={(e: any) => setNewProjStage(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                          >
                            <option value="Planlegging">Planlegging</option>
                            <option value="Oppstart">Oppstart</option>
                            <option value="Pågående">Pågående</option>
                            <option value="Ferdigstillelse">Ferdigstillelse</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Kunde / Byggherre
                          </label>
                          <input
                            type="text"
                            value={newProjClient}
                            onChange={(e) => setNewProjClient(e.target.value)}
                            placeholder="F.eks: Ola & Kari Nordmann"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Adresse / Byggeplass
                          </label>
                          <input
                            type="text"
                            value={newProjAddress}
                            onChange={(e) => setNewProjAddress(e.target.value)}
                            placeholder="F.eks: Vidjeveien 21, 0484 Oslo"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            Beskrivelse & Omfang
                          </label>
                          <textarea
                            rows={3}
                            value={newProjDesc}
                            onChange={(e) => setNewProjDesc(e.target.value)}
                            placeholder="Beskriv arbeidets omfang, eventuelle underleverandører eller spesielle krav..."
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 resize-none"
                          />
                        </div>
                      </div>

                      {/* Handlingsknapper */}
                      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedProject) {
                              setActiveModuleTab('project_details');
                            } else {
                              setActiveModuleTab('all_projects');
                            }
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Avbryt
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingProject || !newProjName.trim()}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isCreatingProject ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>Oppretter prosjekt...</span>
                            </>
                          ) : (
                            <>
                              <Check size={14} />
                              <span>Opprett og åpne prosjekt</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 1. 📝 TILBUD & HURTIGKALKYLE */}
              {activeModuleTab === 'offers' && (
                <div className="space-y-4 pb-24 sm:pb-8">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                          <Calculator className="text-purple-400 shrink-0" size={20} />
                          <span>Tilbud & Hurtigkalkyle</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Aktiv på <strong className="text-slate-200">{selectedProject?.name || 'Geitekleiva 12 - Enebolig'}</strong>. Hurtig beregning av timepriser, materiell og påslag.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenCreateOffer({ clientName: '', projectId: selectedProject?.id || '' })}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer shrink-0"
                        >
                          <Plus size={14} /> Nytt tilbud
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateOfferFromCalc}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                        >
                          <Plus size={14} /> Opprett tilbud fra kalkyle
                        </button>
                      </div>
                    </div>

                    {/* 💡 Autonom tilbudsflyt banner */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-[11px] sm:text-xs text-purple-200 flex items-start gap-2.5 sm:gap-3 shadow-xs">
                      <span className="text-base sm:text-xl shrink-0 mt-0.5">✨</span>
                      <div className="space-y-1">
                        <strong className="text-white block font-bold">100% Autonom Kontrakt- og Prosjektoppstart</strong>
                        <p className="text-purple-300 leading-relaxed">
                          Et tilbud trenger <strong>ikke</strong> knyttes til et eksisterende prosjekt – det lages ofte for nye henvendelser.
                          Når kunden aksepterer tilbudet digitalt, genereres juridisk bindende kontrakt (Håndverkertjenesteloven / NS 8406), 
                          prosjektet etableres automatisk i systemet, og <strong>tilpassede KS-sjekklister</strong> (våtrom, TEK17 lukkesperre, SJA og sluttkontroll) 
                          settes opp automatisk basert på tilbudet slik at håndverkeren slipper manuelle forberedelser!
                        </p>
                      </div>
                    </div>

                    {/* 3 Nøkkeltall for tilbud */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800/80">
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                          Tilbudsverdi
                        </span>
                        <div className="text-xs sm:text-lg font-black text-white mt-1 truncate">
                          kr {offers.reduce((acc, curr) => acc + (Number(curr.totalPrice || curr.amount) || 0), 0).toLocaleString('no-NO')}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-purple-400 font-medium mt-0.5 block truncate">Eks. mva</span>
                      </div>

                      <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800/80">
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                          Aktive tilbud
                        </span>
                        <div className="text-xs sm:text-lg font-black text-white mt-1">
                          {offers.length} stk
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-emerald-400 font-medium mt-0.5 block truncate">I systemet</span>
                      </div>

                      <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800/80">
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                          Standard timepris
                        </span>
                        <div className="text-xs sm:text-lg font-black text-purple-300 mt-1 truncate">
                          kr {calcHourlyRate},-
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5 block truncate">Pr. time</span>
                      </div>
                    </div>

                    {/* MesterAI Hurtigkalkulator */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-purple-500/30 shadow-lg space-y-3.5 sm:space-y-4">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0 text-purple-400">
                            <Calculator size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                MesterAI Hurtigkalkulator
                              </h4>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Live · Flerpostkalkyle
                              </span>
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                              Sanntids pris- og tilbudsestimat med fleksible linjer og fagposter
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleAddCalcLine()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white border border-purple-500/30 text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                          >
                            <Plus size={12} />
                            <span>Ny linje</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleResetCalcLines}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-300 border border-slate-800 text-[10px] font-medium transition-all cursor-pointer"
                            title="Tilbakestill kalkylelinjer"
                          >
                            Nullstill
                          </button>
                        </div>
                      </div>

                      {/* Hurtigvalg faggrupper / maler */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Hurtigtillegg fagposter:
                          </span>
                          <span className="text-[9px] text-slate-400">Klikk for å legge til ferdig utfylt faglinje</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleAddCalcLine({ title: 'Tømrer- og snekkerarbeid', hours: 25, hourlyRate: 890, materials: 18000, markup: 15 })}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-purple-900/40 text-purple-300 hover:text-white border border-purple-500/20 text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={10} /> Tømrer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddCalcLine({ title: 'Riving og avfallshåndtering', hours: 12, hourlyRate: 850, materials: 4500, markup: 12 })}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-purple-900/40 text-purple-300 hover:text-white border border-purple-500/20 text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={10} /> Riving
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddCalcLine({ title: 'Sparkling og malerarbeid', hours: 16, hourlyRate: 850, materials: 6500, markup: 15 })}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-purple-900/40 text-purple-300 hover:text-white border border-purple-500/20 text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={10} /> Maler
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddCalcLine({ title: 'Flis- og murerarbeid (Våtrom)', hours: 20, hourlyRate: 920, materials: 14000, markup: 15 })}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-purple-900/40 text-purple-300 hover:text-white border border-purple-500/20 text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={10} /> Murer/Flis
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddCalcLine({ title: 'Elektrikerarbeid (Underentreprenør)', hours: 10, hourlyRate: 1050, materials: 16000, markup: 12 })}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-purple-900/40 text-purple-300 hover:text-white border border-purple-500/20 text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={10} /> Elektro
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddCalcLine({ title: 'Rørleggerarbeid (Underentreprenør)', hours: 10, hourlyRate: 1100, materials: 18000, markup: 12 })}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-purple-900/40 text-purple-300 hover:text-white border border-purple-500/20 text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={10} /> Rørlegger
                          </button>
                        </div>
                      </div>

                      {/* Liste over kalkylelinjer */}
                      <div className="space-y-2.5">
                        {calcLines.map((line, idx) => {
                          const lineLabor = (Number(line.hours) || 0) * (Number(line.hourlyRate) || 0);
                          const lineMats = Math.round((Number(line.materials) || 0) * (1 + (Number(line.markup) || 0) / 100));
                          const lineTotal = lineLabor + lineMats;

                          return (
                            <div
                              key={line.id}
                              className="p-3 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all space-y-2.5 shadow-xs"
                            >
                              {/* Topplinje: Postnummer, Tittel/Beskrivelse, Handlinger & Sum */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-black flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={line.title}
                                    onChange={(e) => handleUpdateCalcLine(line.id, 'title', e.target.value)}
                                    placeholder="F.eks. Tømrerarbeid, Riving, Malerarbeid..."
                                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/70 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                                  />
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                                  <div className="text-right">
                                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium block">
                                      Linjesum eks. mva
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold text-white">
                                      kr {lineTotal.toLocaleString('no-NO')}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateCalcLine(line.id)}
                                      title="Dupliser denne linjen"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      <Copy size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCalcLine(line.id)}
                                      disabled={calcLines.length <= 1}
                                      title={calcLines.length <= 1 ? "Minst én linje må beholdes" : "Slett denne linjen"}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* 4 parameter-inputfelt */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="bg-slate-950/90 border border-slate-800/90 focus-within:border-purple-500/70 rounded-lg p-2 transition-all">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                    Arbeidstimer
                                  </span>
                                  <div className="flex items-center justify-between gap-1">
                                    <input
                                      type="number"
                                      value={line.hours}
                                      onChange={(e) => handleUpdateCalcLine(line.id, 'hours', e.target.value)}
                                      className="w-full bg-transparent text-white font-bold text-xs sm:text-sm focus:outline-none"
                                    />
                                    <span className="text-[10px] text-slate-500 font-semibold shrink-0">t</span>
                                  </div>
                                </div>

                                <div className="bg-slate-950/90 border border-slate-800/90 focus-within:border-purple-500/70 rounded-lg p-2 transition-all">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                    Timepris
                                  </span>
                                  <div className="flex items-center justify-between gap-1">
                                    <input
                                      type="number"
                                      value={line.hourlyRate}
                                      onChange={(e) => handleUpdateCalcLine(line.id, 'hourlyRate', e.target.value)}
                                      className="w-full bg-transparent text-white font-bold text-xs sm:text-sm focus:outline-none"
                                    />
                                    <span className="text-[10px] text-slate-500 font-semibold shrink-0">kr/t</span>
                                  </div>
                                </div>

                                <div className="bg-slate-950/90 border border-slate-800/90 focus-within:border-purple-500/70 rounded-lg p-2 transition-all">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                    Materiellkost
                                  </span>
                                  <div className="flex items-center justify-between gap-1">
                                    <input
                                      type="number"
                                      value={line.materials}
                                      onChange={(e) => handleUpdateCalcLine(line.id, 'materials', e.target.value)}
                                      className="w-full bg-transparent text-white font-bold text-xs sm:text-sm focus:outline-none"
                                    />
                                    <span className="text-[10px] text-slate-500 font-semibold shrink-0">kr</span>
                                  </div>
                                </div>

                                <div className="bg-slate-950/90 border border-slate-800/90 focus-within:border-purple-500/70 rounded-lg p-2 transition-all">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                    Påslag materiell
                                  </span>
                                  <div className="flex items-center justify-between gap-1">
                                    <input
                                      type="number"
                                      value={line.markup}
                                      onChange={(e) => handleUpdateCalcLine(line.id, 'markup', e.target.value)}
                                      className="w-full bg-transparent text-white font-bold text-xs sm:text-sm focus:outline-none"
                                    />
                                    <span className="text-[10px] text-slate-500 font-semibold shrink-0">%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Linjens del-summer */}
                              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5 border-t border-slate-800/40">
                                <span>Arbeid: <strong className="text-slate-300">kr {lineLabor.toLocaleString('no-NO')}</strong> ({line.hours}t × {line.hourlyRate} kr)</span>
                                <span>Materiell m/påslag: <strong className="text-slate-300">kr {lineMats.toLocaleString('no-NO')}</strong> ({line.markup}% påslag)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Legg til linje knapp */}
                      <button
                        type="button"
                        onClick={() => handleAddCalcLine()}
                        className="w-full py-2.5 px-3 rounded-xl border border-dashed border-purple-500/30 hover:border-purple-500/60 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Plus size={14} />
                        <span>Legg til ny kalkylelinje / fagpost</span>
                      </button>

                      {/* Kalkylesammendrag */}
                      {(() => {
                        let totalLabor = 0;
                        let totalMats = 0;
                        let totalHours = 0;

                        calcLines.forEach((l) => {
                          const h = Number(l.hours) || 0;
                          const r = Number(l.hourlyRate) || 0;
                          const m = Number(l.materials) || 0;
                          const mk = Number(l.markup) || 0;
                          totalHours += h;
                          totalLabor += h * r;
                          totalMats += Math.round(m * (1 + mk / 100));
                        });

                        const totalExMva = totalLabor + totalMats;
                        const mva = Math.round(totalExMva * 0.25);
                        const totalIncMva = totalExMva + mva;

                        return (
                          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/90 border border-purple-500/30 space-y-3.5 shadow-md">
                            {/* 3 Del-summer: Poster, Arbeid og Materiell */}
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                                <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                                  Kalkyleposter
                                </span>
                                <strong className="text-xs sm:text-sm font-bold text-white mt-0.5 block truncate">
                                  {calcLines.length} poster ({totalHours}t)
                                </strong>
                              </div>
                              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                                <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                                  Samlet arbeid
                                </span>
                                <strong className="text-xs sm:text-sm font-bold text-white mt-0.5 block truncate">
                                  kr {totalLabor.toLocaleString('no-NO')}
                                </strong>
                              </div>
                              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                                <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block uppercase tracking-wider truncate">
                                  Samlet materiell
                                </span>
                                <strong className="text-xs sm:text-sm font-bold text-white mt-0.5 block truncate">
                                  kr {totalMats.toLocaleString('no-NO')}
                                </strong>
                              </div>
                            </div>

                            <div className="h-px bg-slate-800/80" />

                            {/* Totalsum og Knapper */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center justify-between sm:justify-start sm:gap-5">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                                    Sum eks. mva
                                  </span>
                                  <span className="text-xl sm:text-2xl font-black text-white">
                                    kr {totalExMva.toLocaleString('no-NO')}
                                  </span>
                                </div>
                                <div className="text-right sm:text-left sm:pl-4 sm:border-l sm:border-slate-800">
                                  <span className="text-[10px] font-medium text-slate-400 block">
                                    Inkl. 25% mva
                                  </span>
                                  <span className="text-xs sm:text-sm font-semibold text-slate-300">
                                    kr {totalIncMva.toLocaleString('no-NO')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <button
                                  type="button"
                                  onClick={handleOpenOfferBuilderFromCalc}
                                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                  title="Åpne i full tilbudsbygger for å tilpasse NS-kontrakt, betalingsplan og vilkår"
                                >
                                  <FileSignature size={14} />
                                  <span>Åpne i tilbudsbygger</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleCreateOfferFromCalc}
                                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Check size={14} className="text-white" />
                                  <span>Opprett tilbud fra kalkyle</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Liste over registrerte tilbud */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Registrerte tilbud ({offers.length})
                      </h4>

                      {offers.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-2xl">
                          Ingen registrerte tilbud ennå. Bruk hurtigkalkulatoren over eller si «Lag et tilbud» i chatten!
                        </div>
                      ) : (
                        <div className="grid gap-2.5">
                          {offers.map((off: any) => (
                            <div 
                              key={off.id} 
                              onClick={() => setSelectedOfferForDetail(off)}
                              className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group shadow-sm"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                                    {off.title || 'Tilbud byggeoppdrag'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    {off.status || 'Sendt til kunde'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {off.projectName || selectedProject?.name} • Kunde: {off.clientName || 'Privatkunde'} • kr {Number(off.totalPrice || off.amount || 0).toLocaleString('no-NO')} eks. mva
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOfferForDetail(off);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                                >
                                  Åpne tilbud
                                </button>
                                {onDeleteOffer && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteOffer(off.id, off.title);
                                    }}
                                    className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    title="Slett tilbud"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. ⏱️ BYGGEDAGBOK & TIMER (AML § 10-7) */}
              {activeModuleTab === 'dailylog' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Clock className="text-amber-400" size={20} />
                        <span>Byggedagbok & Timer</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Lovpålagt time- og værlogging iht. AML § 10-7 for <strong className="text-slate-200">{selectedProject?.name || 'Aktivt prosjekt'}</strong>.
                      </p>
                    </div>

                    {/* View Switcher: Dagbok vs Ledergodkjenning */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setIsTimeApprovalView(false)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          !isTimeApprovalView
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        Byggedagbok
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsTimeApprovalView(true)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                          isTimeApprovalView
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        <span>Ledergodkjenning</span>
                        {dailyTimeEntries.filter(e => e.status === 'pending').length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        )}
                      </button>
                    </div>
                  </div>

                  {!isTimeApprovalView ? (
                    <>
                      {/* Yr Vær-kort & Mannskap */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <span>⛅</span> Vær og temperatur (Yr.no)
                          </span>
                          <div className="text-base font-bold text-white">
                            8°C • Lettskyet • 3 m/s SV
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Nedbør siste 24t: 0.0 mm • Forholdene godkjent for utvendig byggearbeid og lukking.
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Users size={12} className="text-emerald-400" /> Mannskapsliste i dag ({dailyTimeEntries.length} registreringer)
                          </span>
                          <div className="space-y-1 text-xs text-slate-300">
                            {dailyTimeEntries.slice(0, 3).map((entry) => (
                              <div key={entry.id} className="flex justify-between items-center">
                                <span>{entry.workerName} ({entry.role})</span>
                                <strong className="text-white font-mono">{entry.hours + entry.overtime50 + entry.overtime100} t</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Hurtigføring av timer */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Plus size={14} className="text-amber-400" /> Før timer i byggedagboken
                          </h4>
                          {isAdmin ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-400">Før timer for:</span>
                              <select
                                value={logWorkerSelection}
                                onChange={(e) => setLogWorkerSelection(e.target.value)}
                                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-750 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                              >
                                <option value="self">Meg selv ({user?.displayName || 'Admin'})</option>
                                {projectContacts
                                  .filter(c => c.category === 'team' && c.name !== user?.displayName)
                                  .map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                                  ))}
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>Føres automatisk på din konto:</span>
                              <strong className="text-white font-semibold px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-750">
                                {user?.displayName || 'Innlogget fagarbeider'}
                              </strong>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Timer (f.eks: 7.5)"
                            value={logHours}
                            onChange={(e) => setLogHours(e.target.value)}
                            className="sm:w-28 px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />
                          <input
                            type="text"
                            placeholder="Arbeidsoppgave utført..."
                            value={logDescription}
                            onChange={(e) => setLogDescription(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />
                          <label className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-750 rounded-xl text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={logIsWeekendEvening}
                              onChange={(e) => setLogIsWeekendEvening(e.target.checked)}
                              className="accent-amber-500 rounded"
                            />
                            <span className="whitespace-nowrap text-[11px]">Kveld/Helg (100%)</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleSaveDailyLog}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                          >
                            Lagre loggføring
                          </button>
                        </div>
                      </div>

                      {/* Oppføringer i byggedagboken */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Siste oppføringer i byggedagboken
                        </h4>
                        {dailyTimeEntries.map((entry) => (
                          <div key={entry.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between text-slate-400 text-[11px]">
                              <span>{entry.date} • {entry.workerName} ({entry.role}) • <strong className="text-white">{entry.hours + entry.overtime50 + entry.overtime100}t</strong> ({entry.hours}t normal{entry.overtime50 > 0 ? ` + ${entry.overtime50}t 50%` : ''}{entry.overtime100 > 0 ? ` + ${entry.overtime100}t 100%` : ''})</span>
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", entry.status === 'approved' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-300")}>
                                {entry.status === 'approved' ? 'Godkjent dagbok' : 'Til godkjenning'}
                              </span>
                            </div>
                            <p className="text-slate-200 font-medium">
                              {entry.task}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* 👑 LEDER / ADMIN OVERTIDS- & TIMEGODKJENNING */
                    <div className="space-y-4">
                      {/* Nøkkeltall for leder */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Førte timer i uken</p>
                          <p className="text-lg font-black text-white mt-0.5">
                            {dailyTimeEntries.reduce((sum, e) => sum + e.hours + e.overtime50 + e.overtime100, 0).toFixed(1)} t
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                          <p className="text-[10px] uppercase font-bold text-blue-400">Normaltid (7.5t/d)</p>
                          <p className="text-lg font-black text-blue-300 mt-0.5">
                            {dailyTimeEntries.reduce((sum, e) => sum + e.hours, 0).toFixed(1)} t
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                          <p className="text-[10px] uppercase font-bold text-amber-400">50% Overtid (AML § 10-6)</p>
                          <p className="text-lg font-black text-amber-300 mt-0.5">
                            {dailyTimeEntries.reduce((sum, e) => sum + e.overtime50, 0).toFixed(1)} t
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                          <p className="text-[10px] uppercase font-bold text-rose-400">100% Overtid (Kveld/Helg)</p>
                          <p className="text-lg font-black text-rose-300 mt-0.5">
                            {dailyTimeEntries.reduce((sum, e) => sum + e.overtime100, 0).toFixed(1)} t
                          </p>
                        </div>
                      </div>

                      {/* Godkjenningskontroller */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
                        <div className="text-xs text-slate-300">
                          <span>Utestående til godkjenning: </span>
                          <strong className="text-amber-400 font-bold">
                            {dailyTimeEntries.filter(e => e.status === 'pending').length} timelister
                          </strong>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              toast.success('Timelister eksportert til Tripletex / Fiken format (.csv)');
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-750 transition-all cursor-pointer"
                          >
                            Eksporter til lønn
                          </button>
                          <button
                            type="button"
                            onClick={handleApproveAllLogs}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <Check size={14} />
                            <span>Godkjenn alle timer</span>
                          </button>
                        </div>
                      </div>

                      {/* Tabell over timer for ansatte */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                              <th className="p-3">Ansatt & Fag</th>
                              <th className="p-3">Dato</th>
                              <th className="p-3">Normaltid</th>
                              <th className="p-3">50% Overtid</th>
                              <th className="p-3">100% Overtid</th>
                              <th className="p-3">Oppgave</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Handling</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 bg-slate-900">
                            {dailyTimeEntries.map((e) => (
                              <tr key={e.id} className="hover:bg-slate-850/50 transition-colors">
                                <td className="p-3 font-bold text-white">
                                  <div>{e.workerName} ({e.role})</div>
                                  {e.projectName && (
                                    <div className="text-[10px] text-slate-400 font-normal">{e.projectName}</div>
                                  )}
                                  {e.loggedBy && (
                                    <div className="text-[9px] text-purple-400 font-normal">Ført av: {e.loggedBy}</div>
                                  )}
                                </td>
                                <td className="p-3 text-slate-400 font-mono">{e.date}</td>
                                <td className="p-3 text-slate-200 font-bold">{e.hours} t</td>
                                <td className="p-3 text-amber-400 font-bold">{e.overtime50 > 0 ? `+${e.overtime50} t` : '-'}</td>
                                <td className="p-3 text-rose-400 font-bold">{e.overtime100 > 0 ? `+${e.overtime100} t` : '-'}</td>
                                <td className="p-3 text-slate-300 max-w-xs truncate">{e.task}</td>
                                <td className="p-3">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block",
                                    e.status === 'approved' 
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  )}>
                                    {e.status === 'approved' ? '✓ Godkjent' : '⏳ Venter'}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {e.status === 'pending' ? (
                                      <button
                                        type="button"
                                        onClick={() => handleApproveSingleLog(e.id)}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                                        title="Godkjenn denne timeføringen (AML § 10-7)"
                                      >
                                        <Check size={13} />
                                        <span>Godkjenn</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleSingleLogStatus(e.id)}
                                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-all border border-slate-700 cursor-pointer shrink-0"
                                        title="Angre godkjenning (sett tilbake til venter)"
                                      >
                                        Angre
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSingleLog(e.id)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title="Slett timeføring"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. ⚡ ENDRINGSORDRER (NS 8406) */}
              {activeModuleTab === 'change_orders' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <FileSignature className="text-purple-400" size={20} />
                        <span>Endringsordrer & Varsler (NS 8406)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Totalt sikret: kr {visibleChangeOrders.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString('no-NO')} eks. mva
                        {selectedProject && ` • ${changeOrderScope === 'project' ? `Prosjekt: ${selectedProject.name}` : 'Viser alle prosjekter'}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedProject && (
                        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                          <button
                            type="button"
                            onClick={() => setChangeOrderScope('project')}
                            className={cn(
                              "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                              changeOrderScope === 'project' 
                                ? "bg-purple-600 text-white shadow-xs" 
                                : "text-slate-400 hover:text-white"
                            )}
                            title={`Vis kun endringsordrer for ${selectedProject.name}`}
                          >
                            Kun {selectedProject.name} ({projectChangeOrders.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setChangeOrderScope('all')}
                            className={cn(
                              "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                              changeOrderScope === 'all' 
                                ? "bg-purple-600 text-white shadow-xs" 
                                : "text-slate-400 hover:text-white"
                            )}
                            title="Vis endringsordrer på tvers av alle prosjekter"
                          >
                            Alle prosjekter ({changeOrders.length})
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenCreateChangeOrder()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <Plus size={15} /> Ny endringsordre
                      </button>
                    </div>
                  </div>

                  {visibleChangeOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      {selectedProject && changeOrderScope === 'project'
                        ? `Ingen registrerte endringsordrer for ${selectedProject.name} ennå. Si «Varsle endringsordre» eller klikk knappen over for å opprette!`
                        : 'Ingen registrerte endringsordrer ennå. Si «Varsle endringsordre» til MesterAI for å opprette!'}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {visibleChangeOrders.map((co) => (
                        <div 
                          key={co.id} 
                          onClick={() => setSelectedChangeOrderForDetail(co)}
                          className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">{co.title}</span>
                              <span className="text-xs text-purple-400 font-mono">#{co.number}</span>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                                isApprovedOrder(co)
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : isRejectedOrder(co)
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              )}>
                                {isApprovedOrder(co) 
                                  ? '✓ Godkjent av kunde' 
                                  : isRejectedOrder(co) 
                                    ? '✕ Avvist av kunde' 
                                    : '📤 Sendt til kunde'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {co.project} • {co.legal} • Kr {Number(co.amount).toLocaleString('no-NO')}
                              {co.days > 0 ? ` • +${co.days} dgr` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedChangeOrderForDetail(co)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Forhåndsvis eller gjør endringer"
                            >
                              <Eye size={13} />
                              <span className="hidden sm:inline">Forhåndsvis / Rediger</span>
                            </button>
                            {!isApprovedOrder(co) && onApproveChangeOrder && (
                              <button
                                type="button"
                                onClick={() => onApproveChangeOrder(co.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer transition-all"
                                title="Registrer at kunden har akseptert/signert endringsordren"
                              >
                                Registrer godkjenning
                              </button>
                            )}
                            {onDeleteChangeOrder && (
                              <button
                                type="button"
                                onClick={() => onDeleteChangeOrder(co.id, co.title)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Slett"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. 📋 KS & LUKKESPERRE (TEK17) */}
              {activeModuleTab === 'pre_close' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <ClipboardCheck className="text-teal-400" size={20} />
                        <span>KS & Lukkesperre (TEK17)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Kvalitetssikring og tverrfaglig sperre før vegger og gulv kles igjen.
                      </p>
                    </div>
                  </div>

                  {/* Visuell Rød/Grønn Sperre-banner */}
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-xs">
                    <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm">
                        RØD SPERRE AKTIV: Lukking av vegger forbudt
                      </h4>
                      <p className="text-rose-200/90 mt-1 leading-relaxed">
                        Konstruksjonen i 2. etasje kan ikke kles med plater før rørlegger, elektriker og tømrer har kvittert ut kontrollpunktene nedenfor med bildebevis.
                      </p>
                    </div>
                  </div>

                  {/* Fagkontroller */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Obligatoriske tverrfaglige kontroller
                    </h4>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                          ✓
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Rørlegger: Trykktesting og rør-i-rør</p>
                          <p className="text-[11px] text-slate-400">Trykktestet til 10 bar i 2 timer uten fall. Slukmansjett verifisert.</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Godkjent
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                          ✓
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Elektriker: Skjult anlegg og rørføring</p>
                          <p className="text-[11px] text-slate-400">Trekkerør og koblingsbokser festet forskriftsmessig.</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Godkjent
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                          ⏳
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Tømrer: Dampsperre og isolasjon</p>
                          <p className="text-[11px] text-slate-400">Mangler fotodokumentasjon av klemte skjøter mot yttervegg.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('chat');
                          handleSendMessage('Verifiser dampsperre og klemring i TEK17 for bad i 2. etasje');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
                      >
                        Sjekk med AI →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. 🚨 AVVIK & RUH */}
              {activeModuleTab === 'deviations' && (() => {
                const filteredDeviations = allDeviations.filter(d => {
                  const matchesProject = deviationFilterProject === 'all' || d.projectId === deviationFilterProject;
                  const matchesStatus = deviationFilterStatus === 'all' 
                    ? true 
                    : deviationFilterStatus === 'open' 
                      ? d.status !== 'closed' 
                      : d.status === 'closed';
                  return matchesProject && matchesStatus;
                });
                const openCount = allDeviations.filter(d => d.status !== 'closed').length;
                const closedCount = allDeviations.filter(d => d.status === 'closed').length;

                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xl">
                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500/20 to-orange-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                            <AlertTriangle size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg sm:text-xl font-black text-white">Avvik & RUH ({allDeviations.length})</h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                {openCount} åpne
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Kvalitetsavvik, mangler og uønskede hendelser (TEK17 & Internkontrollforskriften § 5)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Handlingsknapper */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode('chat');
                            const targetP = projects.find(p => p.id === deviationFilterProject) || selectedProject || projects[0];
                            setInputVal(`Meld avvik på ${targetP?.name || 'prosjektet'}: `);
                            setTimeout(() => {
                              if (textareaRef.current) textareaRef.current.focus();
                            }, 100);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
                        >
                          <Sparkles size={15} />
                          <span>Meld med MesterAI</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCreateDeviation({ projectId: deviationFilterProject !== 'all' ? deviationFilterProject : selectedProject?.id })}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>Loggfør avvik manuelt</span>
                        </button>
                      </div>
                    </div>

                    {/* Filterbar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      {/* Status-faner */}
                      <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 shrink-0 text-xs">
                        <button
                          type="button"
                          onClick={() => setDeviationFilterStatus('all')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer",
                            deviationFilterStatus === 'all' ? "bg-slate-800 text-white shadow-xs" : "text-slate-400 hover:text-white"
                          )}
                        >
                          Alle ({allDeviations.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeviationFilterStatus('open')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5",
                            deviationFilterStatus === 'open' ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "text-slate-400 hover:text-white"
                          )}
                        >
                          <span>Åpne</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                          <span>({openCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeviationFilterStatus('closed')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer",
                            deviationFilterStatus === 'closed' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-white"
                          )}
                        >
                          Utbedret ({closedCount})
                        </button>
                      </div>

                      {/* Prosjekt-velger */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 font-medium hidden md:inline">Byggeplass:</span>
                        <select
                          value={deviationFilterProject}
                          onChange={(e) => setDeviationFilterProject(e.target.value)}
                          className="w-full sm:w-auto px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-rose-500 transition-colors text-xs font-semibold cursor-pointer"
                        >
                          <option value="all">Alle byggeplasser ({allDeviations.length})</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Avviksliste */}
                    {filteredDeviations.length === 0 ? (
                      <div className="py-12 px-4 text-center rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                          <CheckCircle2 size={24} />
                        </div>
                        <h4 className="font-black text-white text-base">
                          {deviationFilterStatus === 'open' 
                            ? 'Ingen åpne avvik registrert!' 
                            : 'Ingen avvik matcher dette filteret'}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                          Byggeplassen har full kontroll iht. kvalitetsplanen, TEK17 og HMS-kravene. Meld inn feil eller mangler direkte i chatten for øyeblikkelig registrering.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {filteredDeviations.map((dev) => {
                          const isClosed = dev.status === 'closed';
                          const isCrit = dev.severity === 'critical';
                          const isHigh = dev.severity === 'high';
                          const sevLabel = isCrit ? '🔴 Kritisk avvik' : isHigh ? '🟠 Høy alvorlighet' : '🟡 Middels avvik';
                          const sevClass = isCrit 
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30" 
                            : isHigh 
                              ? "bg-orange-500/20 text-orange-300 border-orange-500/30" 
                              : "bg-amber-500/20 text-amber-300 border-amber-500/30";

                          return (
                            <div 
                              key={dev.id} 
                              className={cn(
                                "p-4 sm:p-5 rounded-2xl bg-slate-950 border transition-all space-y-3",
                                isClosed ? "border-slate-800/60 opacity-80" : isCrit ? "border-rose-500/50 shadow-sm shadow-rose-950/30" : "border-slate-800 hover:border-slate-700"
                              )}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={cn("text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border", sevClass)}>
                                      {sevLabel}
                                    </span>
                                    <span className={cn(
                                      "text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
                                      isClosed 
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                                        : "bg-slate-900 text-slate-300 border-slate-800"
                                    )}>
                                      {isClosed ? '✅ Utbedret / Lukket' : '⏳ Åpent avvik'}
                                    </span>
                                    {((dev as any).projectName || (dev as any).project) && (
                                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                                        <Building2 size={12} className="text-slate-500" />
                                        <span>{(dev as any).projectName || (dev as any).project}</span>
                                      </span>
                                    )}
                                    {dev.createdAt && (
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {new Date(dev.createdAt).toLocaleDateString('no-NO')}
                                      </span>
                                    )}
                                  </div>

                                  <h4 className={cn("text-base font-black tracking-tight", isClosed ? "text-slate-300 line-through" : "text-white")}>
                                    {dev.title}
                                  </h4>
                                  
                                  <p className="text-xs text-slate-300 leading-relaxed">
                                    {dev.description}
                                  </p>

                                  {(dev as any).codeReference && (
                                    <div className="text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 inline-block mt-1">
                                      📐 Forskriftskrav: {(dev as any).codeReference}
                                    </div>
                                  )}

                                  {((dev as any).correctiveAction || (dev as any).action) && (
                                    <p className="text-xs text-slate-400 mt-1">
                                      <strong className="text-slate-300">Påkrevd tiltak:</strong> {(dev as any).correctiveAction || (dev as any).action}
                                    </p>
                                  )}
                                </div>

                                {/* Handlingsknapper på kortet */}
                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDeviationStatus(dev)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer",
                                      isClosed
                                        ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                                    )}
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>{isClosed ? 'Gjenåpne' : 'Merk som utbedret'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDeviation(dev.id)}
                                    className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    title="Slett avvik"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 6. 🦺 SIKKER JOBB ANALYSE (SJA) */}
              {activeModuleTab === 'sja' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <HardHat className="text-blue-400" size={20} />
                        <span>Sikker Jobb Analyse (SJA & HMS)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Risikovurdering og påbudt verneutstyr før oppstart.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenCreateSJA()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <Plus size={14} /> Fyll ut SJA
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('chat');
                          handleSendMessage('Opprett en SJA for arbeid i stillas og fasadekledning');
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                      >
                        <Sparkles size={14} className="text-amber-300" /> Med MesterAI
                      </button>
                    </div>
                  </div>

                  {/* PVU Påbud */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Påbudt personlig verneutstyr (PVU)
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-200">
                        🪖 Vernehelm (EN 397)
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-200">
                        🥾 Vernesko m/spikertramp (S3)
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-200">
                        🦺 Synlighetsvest (Klasse 2)
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-200">
                        🎧 Hørselvern ved kapping
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-200">
                        🧗 Fallsikringssele over 2m
                      </span>
                    </div>
                  </div>

                  {/* Gjennomførte SJA-er */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Gjennomførte og aktive SJA-analyser
                    </h4>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white text-sm block">SJA #1: Stillas og fasadearbeid</span>
                        <span className="text-xs text-slate-400">Gjennomgått med 3 tømrere • Risikonivå: Akseptabelt med vernetiltak</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                        Signert av bas
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. 📁 DOKUMENTARKIV & FDV */}
              {activeModuleTab === 'archive' && (
                <div className="space-y-4">
                  <DocumentationArchive
                    inline={true}
                    isOpen={true}
                    projectId={selectedProject?.id}
                    projects={projects}
                    onSelectProject={onSelectProject}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}

              {/* 8. 👥 PROSJEKTKONTAKTER & TELEFONBOK */}
              {activeModuleTab === 'contacts' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Users className="text-emerald-400" size={20} />
                        <span>Prosjektkontakter & Telefonbok</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Telefonbok og nøkkelpersoner for <strong className="text-slate-200">{selectedProject?.name || 'Aktivt prosjekt'}</strong>.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Søk i kontakter..."
                          value={contactSearchQuery}
                          onChange={(e) => setContactSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-44"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddContactModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                      >
                        <Plus size={14} />
                        <span>Ny kontakt</span>
                      </button>
                    </div>
                  </div>

                  {/* 🏷️ Kategori Filter Tabs: Tydelig skille mellom kunder, ansatte, UE og arkiv */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/80">
                    {[
                      { id: 'all', label: 'Alle kontakter', count: projectContacts.length },
                      { id: 'client', label: '🏡 Kunder (Kundeportal)', count: projectContacts.filter(c => c && c.category === 'client').length },
                      { id: 'team', label: '👥 Ansatte & Team', count: projectContacts.filter(c => c && c.category === 'team').length },
                      { id: 'subcontractor', label: '🔨 Underentreprenører', count: projectContacts.filter(c => c && c.category === 'subcontractor').length },
                      { id: 'former', label: '📁 Tidligere ansatte / Arkiv', count: projectContacts.filter(c => c && (c.category === 'former' || c.isFormer)).length },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setContactCategoryFilter(tab.id as any)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                          contactCategoryFilter === tab.id
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                            : "bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
                        )}
                      >
                        <span>{tab.label}</span>
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                          contactCategoryFilter === tab.id ? "bg-emerald-500/30 text-emerald-200" : "bg-slate-800 text-slate-400"
                        )}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Kontakter Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projectContacts
                      .filter(c => {
                        if (!c) return false;
                        if (contactCategoryFilter !== 'all') {
                          if (contactCategoryFilter === 'former') {
                            if (c.category !== 'former' && !c.isFormer) return false;
                          } else if (c.category !== contactCategoryFilter) {
                            return false;
                          }
                        }
                        if (!contactSearchQuery.trim()) return true;
                        const q = contactSearchQuery.toLowerCase();
                        return (
                          (c.name && c.name.toLowerCase().includes(q)) ||
                          (c.role && c.role.toLowerCase().includes(q)) ||
                          (c.phone && c.phone.toLowerCase().includes(q)) ||
                          (c.email && c.email.toLowerCase().includes(q)) ||
                          (c.companyName && c.companyName.toLowerCase().includes(q))
                        );
                      })
                      .map((c) => (
                        <div key={c.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 group hover:border-slate-700 transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="text-sm font-bold text-white truncate">{c.name}</p>
                              {c.category === 'client' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                  🏡 Kunde
                                </span>
                              )}
                              {c.category === 'team' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                                  👥 Ansatt
                                </span>
                              )}
                              {c.category === 'subcontractor' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                  🔨 UE
                                </span>
                              )}
                              {(c.category === 'former' || c.isFormer) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/50 text-slate-400 border border-slate-600/50 shrink-0">
                                  📁 Tidligere
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-emerald-400 font-medium truncate">{c.role}</p>
                            <p className="text-[11px] text-slate-400 mt-1 truncate">
                              <span className="font-mono text-slate-300">{c.phone}</span> • <span>{c.email}</span>
                            </p>
                            {c.companyName && (
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{c.companyName}</p>
                            )}
                            {c.category === 'team' && (
                              <div className="flex items-center gap-1.5 flex-wrap mt-1.5 pt-1 border-t border-slate-800/60">
                                <span className="text-[10px] font-bold text-slate-400">Byggeplasser:</span>
                                {(!c.accessibleProjects || c.accessibleProjects.includes('all')) ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                    🌐 Alle byggeplasser
                                  </span>
                                ) : c.accessibleProjects.length === 0 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                    Ingen tildelte
                                  </span>
                                ) : (
                                  c.accessibleProjects.map(projId => {
                                    const p = projects.find(proj => proj.id === projId);
                                    return (
                                      <span key={projId} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 truncate max-w-[140px]">
                                        🏗️ {p?.name || projId}
                                      </span>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`tel:${c.phone}`}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-400 border border-slate-750 transition-colors"
                              title={`Ring ${c.phone}`}
                            >
                              <Phone size={14} />
                            </a>
                            <a
                              href={`mailto:${c.email}`}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 border border-slate-750 transition-colors"
                              title={`Send e-post til ${c.email}`}
                            >
                              <Mail size={14} />
                            </a>
                            {/* ✏️ Rediger kontakt (Kun Admin) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditContact(c)}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-purple-500/20 text-slate-400 hover:text-purple-300 border border-slate-750 transition-colors cursor-pointer"
                                title={`Rediger ${c.name} (Admin)`}
                              >
                                <Edit2 size={14} />
                              </button>
                            )}

                            {/* 🗑️ Slett eller arkiver kontakt (Kun Admin) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteContact(c.id, c.name, c.phone, c.category)}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-750 transition-colors cursor-pointer"
                                title={`Slett eller arkiver ${c.name} (Admin)`}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    {projectContacts.length === 0 && (
                      <div className="col-span-2 p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                        Ingen kontakter registrert for dette prosjektet ennå. Klikk "+ Ny kontakt" for å legge til byggherre, bas eller håndverkere.
                      </div>
                    )}
                  </div>

                  {/* Modal for å legge til ny kontakt */}
                  {isAddContactModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <h4 className="text-sm font-black text-white flex items-center gap-2">
                            <Plus size={16} className="text-emerald-400" />
                            <span>Legg til kontakt i telefonboken</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setIsAddContactModalOpen(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <form onSubmit={handleAddContact} className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Fullt navn *</label>
                            <input
                              type="text"
                              required
                              placeholder="F.eks. Ola Hansen"
                              value={newContactName}
                              onChange={(e) => setNewContactName(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Kategori / Tilhørighet *</label>
                            <select
                              value={newContactCategory}
                              onChange={(e) => setNewContactCategory(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                            >
                              <option value="client">🏡 Kunde (Byggherre / Kundeportal)</option>
                              <option value="team">👥 Ansatt / Eget team & håndverkere</option>
                              <option value="subcontractor">🔨 Underentreprenør / Samarbeidspartner</option>
                              <option value="former">📁 Tidligere ansatt (Historisk arkiv)</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">Rolle / Fag *</label>
                              <input
                                type="text"
                                required
                                placeholder="F.eks. Bas Tømrer / Byggherre"
                                value={newContactRole}
                                onChange={(e) => setNewContactRole(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">Firma</label>
                              <input
                                type="text"
                                placeholder="F.eks. Hansen Bygg AS"
                                value={newContactCompany}
                                onChange={(e) => setNewContactCompany(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Telefonnummer *</label>
                            <input
                              type="tel"
                              required
                              placeholder="+47 900 00 000"
                              value={newContactPhone}
                              onChange={(e) => setNewContactPhone(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">E-postadresse</label>
                            <input
                              type="email"
                              placeholder="kontakt@bedrift.no"
                              value={newContactEmail}
                              onChange={(e) => setNewContactEmail(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          {/* 🏗️ Prosjekttilgang for egne ansatte / håndverkere */}
                          {newContactCategory === 'team' && (
                            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                  <Building2 size={13} className="text-amber-400" />
                                  <span>Tildel byggeplasser / prosjekter</span>
                                </label>
                                <span className="text-[10px] text-amber-400 font-bold">Admin-styrt</span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Velg hvilke byggeplasser håndverkeren skal ha tilgang til, føre timer på og se sjekklister for.
                              </p>
                              
                              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-750 cursor-pointer hover:border-slate-650 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={newContactProjects.includes('all')}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewContactProjects(['all']);
                                    } else {
                                      setNewContactProjects(projects.map(p => p.id));
                                    }
                                  }}
                                  className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-white">🌐 Tilgang til alle byggeplasser</span>
                              </label>

                              {!newContactProjects.includes('all') && (
                                <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                                  <p className="text-[10px] font-bold text-slate-400">Avmerk tillatte prosjekter:</p>
                                  {projects.map((p) => {
                                    const isChecked = newContactProjects.includes(p.id);
                                    return (
                                      <label
                                        key={p.id}
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs transition-colors",
                                          isChecked ? "bg-amber-500/10 border-amber-500/30 text-white" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                                        )}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setNewContactProjects(prev => [...prev.filter(id => id !== 'all'), p.id]);
                                            } else {
                                              setNewContactProjects(prev => prev.filter(id => id !== p.id));
                                            }
                                          }}
                                          className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                                        />
                                        <span className="truncate font-semibold">{p.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-3">
                            <button
                              type="button"
                              onClick={() => setIsAddContactModalOpen(false)}
                              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                            >
                              Avbryt
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              Lagre kontakt
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Modal for å redigere eksisterende kontakt (Kun Admin) */}
                  {editingContact && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                              <Edit2 size={16} />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white flex items-center gap-2">
                                <span>Rediger kontakt</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Admin
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">Endre detaljer for {editingContact.name}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingContact(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <form onSubmit={handleSaveEditedContact} className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Fullt navn *</label>
                            <input
                              type="text"
                              required
                              placeholder="F.eks. Ola Hansen"
                              value={editContactName}
                              onChange={(e) => setEditContactName(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Kategori / Tilhørighet *</label>
                            <select
                              value={editContactCategory}
                              onChange={(e) => setEditContactCategory(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                            >
                              <option value="client">🏡 Kunde (Byggherre / Kundeportal)</option>
                              <option value="team">👥 Ansatt / Eget team & håndverkere</option>
                              <option value="subcontractor">🔨 Underentreprenør / Samarbeidspartner</option>
                              <option value="former">📁 Tidligere ansatt (Historisk arkiv)</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">Rolle / Fag *</label>
                              <input
                                type="text"
                                required
                                placeholder="F.eks. Bas Tømrer / Byggherre"
                                value={editContactRole}
                                onChange={(e) => setEditContactRole(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">Firma</label>
                              <input
                                type="text"
                                placeholder="F.eks. Hansen Bygg AS"
                                value={editContactCompany}
                                onChange={(e) => setEditContactCompany(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Telefonnummer *</label>
                            <input
                              type="tel"
                              required
                              placeholder="+47 900 00 000"
                              value={editContactPhone}
                              onChange={(e) => setEditContactPhone(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">E-postadresse</label>
                            <input
                              type="email"
                              placeholder="kontakt@bedrift.no"
                              value={editContactEmail}
                              onChange={(e) => setEditContactEmail(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          {/* 🏗️ Prosjekttilgang for egne ansatte / håndverkere */}
                          {editContactCategory === 'team' && (
                            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                  <Building2 size={13} className="text-purple-400" />
                                  <span>Tildel byggeplasser / prosjekter</span>
                                </label>
                                <span className="text-[10px] text-purple-400 font-bold">Admin-styrt</span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Velg hvilke byggeplasser denne håndverkeren har tilgang til, kan føre timer på og se sjekklister for.
                              </p>
                              
                              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-750 cursor-pointer hover:border-slate-650 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={editContactProjects.includes('all')}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditContactProjects(['all']);
                                    } else {
                                      setEditContactProjects(projects.map(p => p.id));
                                    }
                                  }}
                                  className="rounded text-purple-500 focus:ring-purple-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-white">🌐 Tilgang til alle byggeplasser</span>
                              </label>

                              {!editContactProjects.includes('all') && (
                                <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                                  <p className="text-[10px] font-bold text-slate-400">Avmerk tillatte prosjekter:</p>
                                  {projects.map((p) => {
                                    const isChecked = editContactProjects.includes(p.id);
                                    return (
                                      <label
                                        key={p.id}
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs transition-colors",
                                          isChecked ? "bg-purple-500/10 border-purple-500/30 text-white" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                                        )}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setEditContactProjects(prev => [...prev.filter(id => id !== 'all'), p.id]);
                                            } else {
                                              setEditContactProjects(prev => prev.filter(id => id !== p.id));
                                            }
                                          }}
                                          className="rounded text-purple-500 focus:ring-purple-500 cursor-pointer"
                                        />
                                        <span className="truncate font-semibold">{p.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-3">
                            <button
                              type="button"
                              onClick={() => setEditingContact(null)}
                              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                            >
                              Avbryt
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Check size={14} />
                              <span>Lagre endringer</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 8B. 🎓 LÆRLINGMODUL & OPPLÆRINGSBOK (INLINE) */}
              {activeModuleTab === 'apprentice' && (
                <div className="space-y-4">
                  <ApprenticeModal
                    inline={true}
                    isOpen={true}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}

              {/* 8C. 🛡️ HMS & STOFFKARTOTEK (INLINE) */}
              {activeModuleTab === 'hms' && (
                <div className="space-y-4">
                  <HMSModule projects={projects} />
                </div>
              )}

              {/* 8D. 🚗 BILPARK & KJØREBOK (INLINE) */}
              {activeModuleTab === 'vehicle' && (
                <div className="space-y-4">
                  <VehicleFleetManager projects={projects} />
                </div>
              )}

              {/* 8E. 🏗️ BYGGESØKNAD & NABOVARSEL (INLINE) */}
              {activeModuleTab === 'building_app' && (
                <div className="space-y-4">
                  <BuildingApplicationModal
                    inline={true}
                    isOpen={true}
                    projects={projects}
                    selectedProject={selectedProject}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}

              {/* 8F. 📋 KVALITETSKONTROLL & SJEKKLISTER (INLINE) */}
              {activeModuleTab === 'checklists' && (
                <div className="space-y-4">
                  <ChecklistModal
                    inline={true}
                    isOpen={true}
                    projectId={selectedProject?.id || (projects.length > 0 ? projects[0].id : undefined)}
                    initialTrade={(trade as any) || undefined}
                    projects={projects}
                    selectedProject={selectedProject}
                    onSelectProject={onSelectProject}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}

              {/* 8G. 🧠 MESTERAI VISION (INLINE) */}
              {activeModuleTab === 'ai_vision' && (
                <div className="space-y-4">
                  <AIVisionModal
                    inline={true}
                    isOpen={true}
                    projectId={selectedProject?.id}
                    projectName={selectedProject?.name}
                    projects={projects}
                    selectedProject={selectedProject}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}

              {/* 8H. 📝 KONTRAKTSHÅNDTERING (INLINE) */}
              {activeModuleTab === 'contracts' && (
                <div className="space-y-4">
                  <ContractModal
                    inline={true}
                    isOpen={true}
                    projects={projects}
                    selectedProject={selectedProject}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}

              {/* 8I. 🏆 OVERLEVERING & FDV-SLUTTRAPPORT (INLINE) */}
              {activeModuleTab === 'handover' && (
                <div className="space-y-4">
                  <HandoverModal
                    inline={true}
                    isOpen={true}
                    projects={projects}
                    selectedProject={selectedProject}
                    initialProjectId={selectedProject?.id}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}

              {/* 8J. 📦 LAGER, VERKTØY & MATERIELL (INLINE) */}
              {activeModuleTab === 'inventory' && (
                <div className="space-y-4">
                  <InventoryModal
                    inline={true}
                    isOpen={true}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}

              {/* 8K. ⏱️ TIME- OG TIMEREGISTRERING (INLINE) */}
              {(activeModuleTab === 'time' || activeModuleTab === 'time_registration') && (
                <div className="space-y-4">
                  <TimeRegistrationModal
                    inline={true}
                    isOpen={true}
                    projects={projects}
                    selectedProject={selectedProject}
                    onClose={() => setViewMode('chat')}
                  />
                </div>
              )}



              {/* 9. ⋯ ALLE FAGMODULER */}
              {activeModuleTab === 'all_modules' && (() => {
                const ALL_MODULES_CATALOG = [
                  // 🏗️ Kategori 1: Prosjekt & Bygg (6)
                  {
                    id: 'projects',
                    title: 'Prosjektoversikt',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Aktive bygg',
                    icon: Building2,
                    color: 'text-blue-400',
                    bgGlow: 'hover:border-blue-500/50',
                    desc: 'Oversikt over alle byggeplasser, adresser, fremdrift og milepæler.',
                    actionId: 'projects'
                  },
                  {
                    id: 'new_project',
                    title: 'Nytt Prosjekt & Byggeplass',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Rask oppstart',
                    icon: Plus,
                    color: 'text-indigo-400',
                    bgGlow: 'hover:border-indigo-500/50',
                    desc: 'Opprett nytt byggeoppdrag på under 1 minutt med AI-maler for bad, enebolig og tilbygg.',
                    actionId: 'create_project'
                  },
                  {
                    id: 'dailylog',
                    title: 'Byggedagbok & Timer',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Lovkrav',
                    icon: Clock,
                    color: 'text-amber-400',
                    bgGlow: 'hover:border-amber-500/50',
                    desc: 'Før dagbok via tale eller tekst m/mannskapsliste og automatisk Yr-vær.',
                    actionId: 'dailylog'
                  },
                  {
                    id: 'weather',
                    title: 'Vær & Yr.no',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Sanntid',
                    icon: CloudSun,
                    color: 'text-cyan-400',
                    bgGlow: 'hover:border-cyan-500/50',
                    desc: 'Sanntids værdata, vindstyrke og stillasvurdering for dine aktive byggeplasser.',
                    actionId: 'weather'
                  },
                  {
                    id: 'archive',
                    title: 'Dokumentarkiv & FDV',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Dokumentasjon',
                    icon: Archive,
                    color: 'text-teal-400',
                    bgGlow: 'hover:border-teal-500/50',
                    desc: 'Tegninger, FDV-dokumentasjon, datablader, monteringsanvisninger og godkjenninger.',
                    actionId: 'archive'
                  },
                  {
                    id: 'building_app',
                    title: 'Byggesøknad & Nabovarsel',
                    category: 'prosjekt' as const,
                    categoryLabel: 'Prosjekt',
                    badge: 'Veileder',
                    icon: Building2,
                    color: 'text-emerald-400',
                    bgGlow: 'hover:border-emerald-500/50',
                    desc: 'Veileder for tiltak unntatt søknadsplikt, dispensasjon og automatisk nabovarsling.',
                    actionId: 'building_app'
                  },

                  // 🛡️ Kategori 2: Kvalitet, KS & HMS (6)
                  {
                    id: 'checklists',
                    title: 'KS-Sjekklister',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'Lovpålagt',
                    icon: ClipboardCheck,
                    color: 'text-amber-400',
                    bgGlow: 'hover:border-amber-500/50',
                    desc: 'Lovpålagte sjekklister tilpasset ditt fag: tømrer, betong, mur, våtrom og elektro.',
                    actionId: 'checklists'
                  },
                  {
                    id: 'ai_vision',
                    title: 'AI Bildekontroll TEK17',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'AI Vision',
                    icon: Camera,
                    color: 'text-blue-400',
                    bgGlow: 'hover:border-blue-500/50',
                    desc: 'Automatisk fotokontroll av sluk, membran, kledning og rørgjennomføringer.',
                    actionId: 'ai_vision'
                  },
                  {
                    id: 'sja',
                    title: 'Sikker Jobb Analyse (SJA)',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'HMS-krav',
                    icon: HardHat,
                    color: 'text-blue-400',
                    bgGlow: 'hover:border-blue-500/50',
                    desc: 'Risikovurdering, påbudt personlig verneutstyr (PVU) og vernetiltak før oppstart.',
                    actionId: 'sja'
                  },
                  {
                    id: 'deviations',
                    title: 'Avvik & RUH',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'Kvalitet',
                    icon: AlertTriangle,
                    color: 'text-rose-400',
                    bgGlow: 'hover:border-rose-500/50',
                    desc: 'Registrer og lukk avvik og uønskede hendelser med foto, årsak og tiltak.',
                    actionId: 'deviations'
                  },
                  {
                    id: 'pre_close',
                    title: 'KS & Lukkesperre (TEK17)',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'TEK17',
                    icon: Lock,
                    color: 'text-emerald-400',
                    bgGlow: 'hover:border-emerald-500/50',
                    desc: 'Tverrfaglig sperre som forhindrer lukking av vegger før alle fag har godkjent.',
                    actionId: 'pre_close'
                  },
                  {
                    id: 'hms',
                    title: 'HMS & Stoffkartotek',
                    category: 'ks_hms' as const,
                    categoryLabel: 'KS & HMS',
                    badge: 'Internkontroll',
                    icon: BookOpen,
                    color: 'text-teal-400',
                    bgGlow: 'hover:border-teal-500/50',
                    desc: 'Internkontrollforskriften, sikkerhetsdatablader, vernerunder og kjemikaliehåndtering.',
                    actionId: 'hms'
                  },

                  // 💰 Kategori 3: Økonomi, Tilbud & Kontrakt (5)
                  {
                    id: 'change_orders',
                    title: 'Endringsordrer (NS 8406)',
                    category: 'okonomi' as const,
                    categoryLabel: 'Økonomi',
                    badge: 'NS 8406',
                    icon: FileSignature,
                    color: 'text-purple-400',
                    bgGlow: 'hover:border-purple-500/50',
                    desc: 'Varsling av avvik, fristforlengelse og vederlagskrav med digital kundesignering.',
                    actionId: 'change_orders'
                  },
                  {
                    id: 'offers',
                    title: 'Tilbudskalkulator',
                    category: 'okonomi' as const,
                    categoryLabel: 'Økonomi',
                    badge: 'Kalkyle',
                    icon: Calculator,
                    color: 'text-indigo-400',
                    bgGlow: 'hover:border-indigo-500/50',
                    desc: 'Prising av timer og materiell m/påslag, PDF-tilbud og digital kundeaksept.',
                    actionId: 'offers'
                  },
                  {
                    id: 'contracts',
                    title: 'Byggekontrakter',
                    category: 'okonomi' as const,
                    categoryLabel: 'Økonomi',
                    badge: 'Juridisk',
                    icon: FileSpreadsheet,
                    color: 'text-violet-400',
                    bgGlow: 'hover:border-violet-500/50',
                    desc: 'Juridisk trygge standardkontrakter iht. NS 8405/8406 og Håndverkertjenesteloven.',
                    actionId: 'contracts'
                  },
                  {
                    id: 'time',
                    title: 'Timeføring & Lønn',
                    category: 'okonomi' as const,
                    categoryLabel: 'Økonomi',
                    badge: 'Timer',
                    icon: Clock,
                    color: 'text-emerald-400',
                    bgGlow: 'hover:border-emerald-500/50',
                    desc: 'Timeføring per prosjekt, oppgave, bil og overtid for lønn og fakturagrunnlag.',
                    actionId: 'time'
                  },
                  {
                    id: 'handover',
                    title: 'Overtakelse & Sluttoppgjør',
                    category: 'okonomi' as const,
                    categoryLabel: 'Økonomi',
                    badge: 'Signatur',
                    icon: CheckCircle2,
                    color: 'text-teal-400',
                    bgGlow: 'hover:border-teal-500/50',
                    desc: 'Ferdigbefaring, mangelliste, overtakelsesprotokoll og signert sluttoppgjør.',
                    actionId: 'handover'
                  },

                  // 🚗 Kategori 4: Ressurser, Bil & Felt (5)
                  {
                    id: 'vehicle',
                    title: 'Kjørebok & Bil',
                    category: 'ressurser' as const,
                    categoryLabel: 'Ressurser',
                    badge: 'Kjøring',
                    icon: Car,
                    color: 'text-amber-400',
                    bgGlow: 'hover:border-amber-500/50',
                    desc: 'Elektronisk kjørebok, bompasseringer, km-godtgjørelse og prosjektkobling.',
                    actionId: 'vehicle'
                  },
                  {
                    id: 'inventory',
                    title: 'Verktøy & Maskinlager',
                    category: 'ressurser' as const,
                    categoryLabel: 'Ressurser',
                    badge: 'Maskiner',
                    icon: Package,
                    color: 'text-orange-400',
                    bgGlow: 'hover:border-orange-500/50',
                    desc: 'Ha full kontroll på hvem som har lånt verktøy og maskiner, samt serviceintervaller.',
                    actionId: 'inventory'
                  },
                  {
                    id: 'contacts',
                    title: 'Prosjektteam & Kontakter',
                    category: 'ressurser' as const,
                    categoryLabel: 'Ressurser',
                    badge: 'Team',
                    icon: Users,
                    color: 'text-cyan-400',
                    bgGlow: 'hover:border-cyan-500/50',
                    desc: 'Telefonliste for byggeplassen: byggherre, prosjektleder, bas og underentreprenører.',
                    actionId: 'contacts'
                  },
                  {
                    id: 'teamchat',
                    title: 'Prosjekt- & Firmachatt',
                    category: 'ressurser' as const,
                    categoryLabel: 'Kommunikasjon',
                    badge: 'Sanntid',
                    icon: MessageSquare,
                    color: 'text-violet-400',
                    bgGlow: 'hover:border-violet-500/50',
                    desc: 'Internkommunikasjon og feltchatt for byggeplassen og bedriften. Del bilder, beskjeder, statusoppdateringer og talemeldinger i sanntid.',
                    actionId: 'teamchat'
                  },
                  {
                    id: 'apprentice',
                    title: 'Lærlingmodul',
                    category: 'ressurser' as const,
                    categoryLabel: 'Ressurser',
                    badge: 'Læreplan',
                    icon: GraduationCap,
                    color: 'text-indigo-400',
                    bgGlow: 'hover:border-indigo-500/50',
                    desc: 'Loggfør læremål, kompetansemål og dokumentasjon til fagprøve og opplæringskontor.',
                    actionId: 'apprentice'
                  },
                  {
                    id: 'translator',
                    title: 'Flerspråklig Oversetter',
                    category: 'ressurser' as const,
                    categoryLabel: 'Ressurser',
                    badge: 'Byggeplass',
                    icon: Languages,
                    color: 'text-blue-400',
                    bgGlow: 'hover:border-blue-500/50',
                    desc: 'Fagterminologisk oversetter for byggeplassen (polsk, litauisk, ukrainsk, engelsk).',
                    actionId: 'translator'
                  },

                  // 👑 Kategori 5: SuperAdmin (hvis bruker har superadmin-tilgang)
                  ...(isSuperAdmin ? [{
                    id: 'super_admin',
                    title: 'SuperAdmin Portal',
                    category: 'superadmin' as const,
                    categoryLabel: 'Admin',
                    badge: 'System',
                    icon: Crown,
                    color: 'text-amber-400',
                    bgGlow: 'hover:border-amber-400/60',
                    desc: 'Administrasjon av bedrifter, lisenser, brukersesjoner, systemlogger og feilsøking.',
                    actionId: 'super_admin'
                  }] : [])
                ];

                const categories = [
                  { id: 'all', label: `Alle (${ALL_MODULES_CATALOG.length})` },
                  { id: 'prosjekt', label: `🏗️ Prosjekt & Bygg (${ALL_MODULES_CATALOG.filter(m => m.category === 'prosjekt').length})` },
                  { id: 'ks_hms', label: `🛡️ KS & HMS (${ALL_MODULES_CATALOG.filter(m => m.category === 'ks_hms').length})` },
                  { id: 'okonomi', label: `💰 Økonomi & Kontrakt (${ALL_MODULES_CATALOG.filter(m => m.category === 'okonomi').length})` },
                  { id: 'ressurser', label: `🚗 Ressurser & Felt (${ALL_MODULES_CATALOG.filter(m => m.category === 'ressurser').length})` },
                  ...(isSuperAdmin ? [{ id: 'superadmin', label: '👑 SuperAdmin (1)' }] : [])
                ];

                const filteredModules = ALL_MODULES_CATALOG.filter((m) => {
                  const matchesCat = allModulesCategory === 'all' || m.category === allModulesCategory;
                  const q = allModulesSearch.trim().toLowerCase();
                  const matchesSearch = !q || m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.badge.toLowerCase().includes(q);
                  return matchesCat && matchesSearch;
                });

                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg sm:text-xl font-black text-white">Alle Fagmoduler & Verktøy ({ALL_MODULES_CATALOG.length})</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Komplett fagsystem
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Klikk på en modul for å åpne verktøyet direkte eller starte arbeidsflyten:
                        </p>
                      </div>

                      {/* Hurtigsøk i moduler */}
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          placeholder="Søk i moduler..."
                          value={allModulesSearch}
                          onChange={(e) => setAllModulesSearch(e.target.value)}
                          className="w-full pl-8 pr-7 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-500 transition-colors"
                        />
                        {allModulesSearch && (
                          <button
                            type="button"
                            onClick={() => setAllModulesSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Kategori-faner */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setAllModulesCategory(cat.id as any)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0",
                            allModulesCategory === cat.id
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Rutenett over moduler */}
                    {filteredModules.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-2xl space-y-2">
                        <p>Ingen moduler matcher søket «{allModulesSearch}».</p>
                        <button
                          type="button"
                          onClick={() => { setAllModulesSearch(''); setAllModulesCategory('all'); }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Tilbakestill filter
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredModules.map((mod) => {
                          const IconComp = mod.icon;
                          return (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => handleModuleCardClick(mod.actionId)}
                              className={cn(
                                "p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left transition-all cursor-pointer group shadow-xs flex flex-col justify-between",
                                mod.bgGlow
                              )}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <IconComp size={18} className={mod.color} />
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                                    {mod.badge}
                                  </span>
                                </div>
                                <h4 className="font-bold text-sm text-white block mb-1 group-hover:text-purple-300 transition-colors">
                                  {mod.title}
                                </h4>
                                <p className="text-xs text-slate-400 block leading-relaxed line-clamp-2">
                                  {mod.desc}
                                </p>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-slate-850 flex items-center justify-between text-[11px] font-bold text-slate-500 group-hover:text-purple-400 transition-colors">
                                <span>{mod.categoryLabel}</span>
                                <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                  <span>Åpne</span>
                                  <ChevronRight size={13} />
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 10. ⚙️ INNSTILLINGER (INLINE TRIGGER) */}
              {activeModuleTab === 'settings' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl max-w-lg mx-auto my-8">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center mx-auto">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">System- og Bedriftsinnstillinger</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Åpne innstillingsboksen for å justere profil, bedriftsdata, team og moduler.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                  >
                    Åpne innstillinger
                  </button>
                </div>
              )}

              {/* 11. 👑 SUPERADMIN (INLINE I ARBEIDSSTASJONEN) */}
              {activeModuleTab === 'superadmin' && (
                <div className="w-full">
                  {isSuperAdmin || isPlatformOwner ? (
                    <SuperAdmin
                      onBackToDashboard={() => {
                        setActiveModuleTab(null);
                        setViewMode('chat');
                        window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'dashboard' } }));
                      }}
                    />
                  ) : (
                    <div className="max-w-md mx-auto my-12 p-8 bg-slate-900 border border-red-500/30 rounded-3xl text-center shadow-xl">
                      <div className="w-14 h-14 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shield size={28} />
                      </div>
                      <h3 className="text-base font-bold text-white mb-2">Ingen tilgang til SuperAdmin</h3>
                      <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                        SuperAdmin-konsollen er forbeholdt plattformeier og systemadministratorer.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModuleTab(null);
                          setViewMode('chat');
                          window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'dashboard' } }));
                        }}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Tilbake til MesterAI
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* 🤖 THE DEFAULT CHAT INTERFACE (ChatGPT / Gemini / Antigravity style) */
            <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full px-3 sm:px-6 pt-4 pb-4">
              {messages.length === 0 ? (
                /* Centered Welcome Hero (Clean Gemini style with VikingMester brand) */
                <div className="my-auto py-8 sm:py-16 text-center max-w-2xl mx-auto w-full space-y-6 sm:space-y-8 animate-in fade-in duration-300">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <MesterAIIcon size="lg" />
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mt-2">
                      {t('ws_hero_greeting', 'Hva kan MesterAI bistå med i dag?')}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 font-normal">
                      {selectedProject ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{t('ws_active_site_prefix', 'Aktiv byggeplass:')} <strong className="text-white font-medium">{selectedProject.name}</strong></span>
                        </span>
                      ) : (
                        <span className="text-slate-400">{t('ws_ready_to_assist', 'Klar til å bistå på tvers av alle dine byggeprosjekter, kalkyler og NS-krav')}</span>
                      )}
                    </p>
                  </div>

                  {/* ✦ The Floating Center Input Capsule */}
                  <div className="w-full px-1">
                    {renderPromptBar(true)}
                  </div>

                  {/* ✦ 4 Subtle Minimalist Suggestion Chips (Gemini style) */}
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto px-2">
                    {[
                      { 
                        text: t('ws_quick_change_order', "Opprett endringsordre (NS 8406)"), 
                        action: t('ws_quick_change_order_action', "Varsle endringsordre iht. NS 8406 for ekstraarbeid") 
                      },
                      { 
                        text: t('ws_quick_tek17_check', "TEK17 våtroms- og slukkontroll"), 
                        action: t('ws_quick_tek17_action', "Hva er TEK17-kravene til sluk, klemring og membran på bad?") 
                      },
                      { 
                        text: t('ws_quick_daily_log', "Før dagens byggedagbok"), 
                        action: t('ws_quick_daily_log_action', "Før dagens byggedagbok med mannskapsliste og Yr-sanntidsvær") 
                      },
                      { 
                        text: t('ws_quick_calc', "Hurtigkalkyle for tilbud"), 
                        action: t('ws_quick_calc_action', "Hjelp meg å beregne en hurtigkalkyle for et oppdrag med timer og materiell") 
                      }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(item.action)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pt-2 pb-6">
                  {/* 🔗 Privat rådgivning banner for TeamChat */}
                  {activeTeamChatConsult && (
                    <div className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-indigo-950/80 border border-purple-500/40 shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                          <Bot size={16} className="text-purple-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">Privat rådgivning: {activeTeamChatConsult.channelName}</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              100% Skjult for teamet
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            Du kan diskutere og finne løsningen her. Trykk «Send svar til {activeTeamChatConsult.channelName}» under AI-svaret for å dele.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode('module');
                            setActiveModuleTab('teamchat');
                            window.dispatchEvent(new CustomEvent('open_project_chat', {
                              detail: { channelId: activeTeamChatConsult.channelId, projectId: activeTeamChatConsult.projectId }
                            }));
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Til chatten
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTeamChatConsult(null);
                            try { localStorage.removeItem('mesterai_active_teamchat_consult'); } catch {}
                          }}
                          className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Lukk privat sesjon"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  )}

                  {messages.map((msg, idx) => {
                    const isLatest = idx === messages.length - 1;
                    const isPromptForLatest = 
                      idx === messages.length - 2 && 
                      msg.role === 'user' && 
                      messages[messages.length - 1]?.role === 'assistant';

                    return (
                      <div
                        key={msg.id}
                        ref={
                          isPromptForLatest 
                            ? latestTurnTopRef 
                            : isLatest 
                            ? latestMessageTopRef 
                            : undefined
                        }
                        className={cn(
                          "flex flex-col gap-2 scroll-mt-6 sm:scroll-mt-8 transition-all",
                          msg.role === 'user'
                            ? "max-w-[85%] sm:max-w-[75%] ml-auto items-end"
                            : "w-full items-start"
                        )}
                      >
                        <div className={cn(
                          "w-full transition-all",
                          msg.role === 'user'
                            ? "bg-[#24272a] text-white px-5 py-3 sm:px-6 sm:py-3.5 rounded-[22px] shadow-xs text-[15px] sm:text-[16px] font-normal leading-relaxed"
                            : "bg-[#131722]/50 border border-white/5 rounded-3xl p-4 sm:p-6 shadow-sm backdrop-blur-md"
                        )}>
                          {msg.role === 'user' ? (
                            <div>
                              {msg.imageUrl && (
                                <div className="mb-3 rounded-2xl overflow-hidden border border-white/20 max-w-xs shadow-md">
                                  <img src={msg.imageUrl} alt="Vedlagt bilde" className="w-full h-auto object-cover" />
                                </div>
                              )}
                              <div className="text-white text-[15px] sm:text-[16px] font-normal leading-relaxed">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    h1: ({ node, ...props }) => <h3 className="text-base sm:text-lg font-bold text-white mt-3 mb-1.5 border-b border-white/10 pb-1" {...props} />,
                                    h2: ({ node, ...props }) => <h4 className="text-sm sm:text-base font-bold text-white mt-2.5 mb-1" {...props} />,
                                    h3: ({ node, ...props }) => <h5 className="text-sm font-bold text-purple-200 mt-2 mb-1 uppercase tracking-wide" {...props} />,
                                    h4: ({ node, ...props }) => <h6 className="text-xs sm:text-sm font-bold text-purple-200 mt-2 mb-1" {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed font-medium" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="my-2 space-y-1 pl-4 list-disc text-white/90" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="my-2 space-y-1 pl-5 list-decimal text-white/90" {...props} />,
                                    li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                                    blockquote: ({ node, ...props }) => (
                                      <blockquote className="my-2 p-2.5 bg-white/5 border-l-2 border-purple-400 rounded-r-xl text-sm text-purple-100" {...props} />
                                    ),
                                    code: ({ node, inline, ...props }: any) => (
                                      inline 
                                        ? <code className="px-1.5 py-0.5 rounded bg-black/40 text-purple-200 font-mono text-xs" {...props} />
                                        : <code className="block p-2 rounded-xl bg-black/50 text-slate-200 font-mono text-xs overflow-x-auto my-2" {...props} />
                                    )
                                  }}
                                >
                                  {formatAiMarkdown(msg.content)}
                                </ReactMarkdown>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2.5 text-xs font-bold text-white mb-3 px-1">
                                <MesterAIIcon size="xs" />
                                <span className="text-[14px] tracking-wide font-bold text-white/95">MesterAI</span>
                                <span className="text-[11px] text-slate-400 font-mono ml-auto">{msg.timestamp}</span>
                              </div>

                              {msg.imageUrl && (
                                <div className="mb-4 rounded-2xl overflow-hidden border border-white/20 max-w-sm shadow-md">
                                  <img src={msg.imageUrl} alt="Vedlagt bilde" className="w-full h-auto object-cover" />
                                </div>
                              )}

                              <div className="text-white">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    h1: ({ node, ...props }) => (
                                      <h2 className="text-[22px] sm:text-[24px] font-bold text-white mt-6 mb-3 tracking-tight border-b border-slate-800/80 pb-2 flex items-center gap-2" {...props} />
                                    ),
                                    h2: ({ node, ...props }) => (
                                      <h3 className="text-[20px] sm:text-[22px] font-bold text-white mt-5 mb-2.5 tracking-tight flex items-center gap-2" {...props} />
                                    ),
                                    h3: ({ node, ...props }) => (
                                      <h4 className="text-[18px] sm:text-[19px] font-bold text-emerald-400 mt-4 mb-2 flex items-center gap-2 uppercase tracking-wide text-sm sm:text-base" {...props} />
                                    ),
                                    p: ({ node, ...props }) => (
                                      <p className="text-[17px] sm:text-[19px] text-white/95 leading-[1.65] font-normal mb-3.5 last:mb-0" {...props} />
                                    ),
                                    ul: ({ node, ...props }) => (
                                      <ul className="my-3 space-y-2.5 pl-1 list-none" {...props} />
                                    ),
                                    ol: ({ node, ...props }) => (
                                      <ol className="my-3 space-y-2.5 pl-6 list-decimal text-[17px] sm:text-[19px] text-white/95 leading-[1.65]" {...props} />
                                    ),
                                    li: ({ node, ...props }) => (
                                      <li className="text-[17px] sm:text-[19px] text-white/95 leading-[1.65] flex items-start gap-3">
                                        <span className="w-2 h-2 rounded-full border-2 border-emerald-400/90 bg-emerald-400/40 mt-2.5 shrink-0 shadow-xs" />
                                        <span className="flex-1 min-w-0">{props.children}</span>
                                      </li>
                                    ),
                                    strong: ({ node, ...props }) => (
                                      <strong className="font-bold text-white" {...props} />
                                    ),
                                    blockquote: ({ node, ...props }) => (
                                      <blockquote className="my-4 p-4 bg-emerald-950/30 border-l-4 border-emerald-500 rounded-r-2xl text-[16px] sm:text-[18px] text-emerald-200 leading-relaxed shadow-xs" {...props} />
                                    ),
                                    table: ({ node, ...props }) => (
                                      <div className="my-4 rounded-2xl border border-slate-800 overflow-x-auto text-[15px] sm:text-[16px] shadow-md bg-slate-950/80">
                                        <table className="w-full text-left divide-y divide-slate-800" {...props} />
                                      </div>
                                    ),
                                    th: ({ node, ...props }) => (
                                      <th className="p-3.5 bg-slate-900 text-slate-300 font-bold text-[13px] uppercase tracking-wider" {...props} />
                                    ),
                                    td: ({ node, ...props }) => (
                                      <td className="p-3.5 text-white/90 border-b border-slate-800/60" {...props} />
                                    ),
                                    code: ({ node, inline, ...props }: any) => (
                                      <code className="px-2 py-0.5 rounded-lg bg-slate-800/90 text-amber-300 font-mono text-[15px] sm:text-[16px] border border-slate-700/50" {...props} />
                                    ),
                                    a: ({ node, href, children, ...props }: any) => {
                                      const isOfferOrContractLink = href && (
                                        href.includes('offerToken=') || 
                                        href.includes('contractToken=') || 
                                        href.includes('/tilbud/') || 
                                        href.includes('/kontrakt/')
                                      );

                                      return (
                                        <a
                                          href={href}
                                          target={isOfferOrContractLink ? '_self' : '_blank'}
                                          rel="noopener noreferrer"
                                          onClick={(e) => {
                                            if (isOfferOrContractLink) {
                                              e.preventDefault();
                                              try {
                                                const urlObj = new URL(href, window.location.origin);
                                                const token = urlObj.searchParams.get('offerToken') || 
                                                              urlObj.searchParams.get('contractToken') || 
                                                              urlObj.searchParams.get('tilbud') || 
                                                              urlObj.pathname.split('/')[2];
                                                if (token) {
                                                  window.dispatchEvent(new CustomEvent('open_public_offer', {
                                                    detail: { token, offerToken: token }
                                                  }));
                                                  return;
                                                }
                                              } catch (err) {}
                                              window.open(href, '_blank');
                                            }
                                          }}
                                          className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1 rounded-xl border border-emerald-500/30 transition-all font-semibold text-[15px] sm:text-[16px] no-underline group shadow-xs my-0.5 cursor-pointer"
                                          {...props}
                                        >
                                          <ExternalLink size={13} className="text-emerald-400 group-hover:text-emerald-300 shrink-0" />
                                          <span className="underline decoration-emerald-400/40 group-hover:decoration-white">{children}</span>
                                        </a>
                                      );
                                    }
                                  }}
                                >
                                  {formatAiMarkdown(msg.content)}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {/* Rich Actions (f.eks. etter opprettet tilbud eller handlinger) */}
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                              {msg.actions.map((act, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    if (act.type === 'open_public_offer') {
                                      const token = act.data?.token || act.data?.offer?.token;
                                      if (token) {
                                        window.dispatchEvent(new CustomEvent('open_public_offer', {
                                          detail: { token, offerToken: token, offer: act.data?.offer }
                                        }));
                                      } else if (act.data?.offerLink) {
                                        window.open(act.data.offerLink, '_blank');
                                      }
                                    } else if (act.type === 'open_offer_form') {
                                      handleOpenCreateOffer(act.data);
                                    } else if (act.type === 'copy_link' && act.data?.url) {
                                      navigator.clipboard.writeText(act.data.url);
                                      toast.success('Lenke kopiert!');
                                    } else if (act.type === 'open_module' && act.data?.module) {
                                      setActiveModuleTab(act.data.module);
                                      setViewMode('module');
                                    }
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <span>{act.label}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Quick Replies below assistant message */}
                          {msg.quickReplies && msg.quickReplies.length > 0 && (
                            <div className="mt-5 pt-3.5 border-t border-slate-800 flex flex-wrap gap-2.5">
                              {msg.quickReplies.map((qr, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleSendMessage(qr.payload || qr.title)}
                                  className="px-4 py-2 rounded-full bg-slate-800/90 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/50 text-[14px] sm:text-[15px] font-semibold text-slate-100 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                                >
                                  {qr.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Assistant actions: Copy, Speak */}
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-3 mt-1.5 text-slate-400 text-xs pl-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 hover:text-white transition-all cursor-pointer text-slate-400"
                              title={t('ws_copy_reply', "Kopier svar")}
                            >
                              {copiedId === msg.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                              <span>Kopier</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSpeakText(msg.content)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 hover:text-white transition-all cursor-pointer text-slate-400"
                              title={t('ws_listen_reply', "Les opp svar")}
                            >
                              {isSpeaking ? <VolumeX size={13} className="text-amber-400" /> : <Volume2 size={13} />}
                              <span>{isSpeaking ? 'Stopp' : 'Les opp'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSendToChatContent(msg.content);
                                setSendToChatModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600/25 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 transition-all cursor-pointer text-xs font-semibold shadow-xs active:scale-95"
                              title={activeTeamChatConsult ? `Send dette svaret inn i ${activeTeamChatConsult.channelName}` : "Send svar til en team-chat kanal"}
                            >
                              <Send size={12} className="text-purple-300" />
                              <span>{activeTeamChatConsult ? `Send svar til ${activeTeamChatConsult.channelName}` : 'Send til team-chat'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* ✦ Next-Gen Dynamic Thinking & Reasoning HUD (Gemini / o3 inspired) */}
                  {isLoading && (() => {
                    const flow = getDynamicReasoningFlow(
                      activeThinkingQuery,
                      activeThinkingHasImage,
                      i18n?.language || 'no'
                    );

                    return (
                      <div 
                        ref={thinkingRef}
                        className="w-full rounded-3xl bg-[#0c1220]/95 border border-amber-500/30 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 my-3 overflow-hidden relative scroll-mt-6 sm:scroll-mt-8"
                      >
                        {/* Subtil Gemini-aura bakgrunnsglød */}
                        <div className="absolute -top-12 -left-12 w-44 h-44 bg-gradient-to-br from-amber-500/20 via-emerald-500/15 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" />
                        <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-gradient-to-tl from-purple-500/20 via-blue-500/15 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" />

                        {/* Topplinje med dynamisk oppgavetittel og sanntidstimer */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/25 via-emerald-500/25 to-purple-500/25 border border-amber-500/40 shrink-0 shadow-sm">
                              <span className="text-amber-300 text-sm font-bold select-none animate-pulse">✦</span>
                              <span className="absolute inset-0 rounded-xl bg-amber-400/20 animate-ping opacity-50" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[17px] sm:text-[19px] font-bold text-white tracking-tight truncate">
                                {flow.headline}
                              </span>
                              <span className="text-xs text-amber-300/90 font-mono tracking-wider uppercase font-semibold">
                                {flow.subSummary}
                              </span>
                            </div>
                          </div>

                          {/* Sanntids tenketimer */}
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-mono text-amber-300 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span>{activeThinkingDuration}s</span>
                          </div>
                        </div>

                        {/* Levende fremdriftslinje */}
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden my-3 relative z-10">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-purple-500 transition-all duration-700 ease-out rounded-full"
                            style={{ width: `${Math.min(96, Math.max(16, (activeThinkingDuration / 7.5) * 100))}%` }}
                          />
                        </div>

                        {/* Dynamisk punktvis resonneringsstrøm */}
                        <div className="space-y-2.5 relative z-10">
                          {flow.steps.map((step, idx, arr) => {
                            const isDone = activeThinkingDuration >= (arr[idx + 1]?.time ?? 99);
                            const isActive = !isDone && activeThinkingDuration >= step.time;

                            return (
                              <div 
                                key={step.id} 
                                className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                                  isDone 
                                    ? 'text-slate-300 font-normal' 
                                    : isActive 
                                    ? 'text-white font-semibold drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]' 
                                    : 'text-slate-500/70 opacity-40'
                                }`}
                              >
                                {isDone ? (
                                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                    <Check size={11} strokeWidth={3} />
                                  </div>
                                ) : isActive ? (
                                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0">
                                    <Loader2 size={11} className="animate-spin text-amber-400" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                  </div>
                                )}
                                <span className="flex-1 truncate text-[14px] sm:text-[15px]">
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
              )}
            </div>
          )}
        </div>
      )}

        {/* 4. Docked Bottom Input Area (when conversation is active) - Zero overlap with messages */}
        {viewMode === 'chat' && messages.length > 0 && (
          <div 
            className="shrink-0 bg-[#0A101D] border-t border-slate-800/80 pt-2.5 px-3 sm:px-6 z-20"
            style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
          >
            <div className="max-w-3xl mx-auto w-full space-y-1.5 relative">
              {renderPromptBar(false)}

              {/* Disclaimer footer */}
              <p className="text-[11px] text-slate-500 text-center pb-0.5">
                {t('ws_disclaimer', "MesterAI v2.6 kan gjøre feil. Kontroller viktige mål og NS 8406 endringsvarsler.")}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ⚙️ Kompakt Innstillings- og Konfigurasjonsboks ("liten boks med alle funksjoner") */}
      <WorkstationSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={user}
        isSuperAdmin={isSuperAdmin}
      />

      {/* 📄 Forhåndsvisning & Redigering av Endringsordrer (NS 8406) */}
      <ChangeOrderDetailModal
        isOpen={Boolean(selectedChangeOrderForDetail)}
        onClose={() => setSelectedChangeOrderForDetail(null)}
        changeOrder={selectedChangeOrderForDetail}
        project={selectedProject}
        onApprove={onApproveChangeOrder}
        onDelete={onDeleteChangeOrder}
        onSave={(updated) => {
          setSelectedChangeOrderForDetail(updated);
        }}
      />

      {/* 📄 Forhåndsvisning & Detaljvisning av Pristilbud */}
      <OfferDetailModal
        isOpen={Boolean(selectedOfferForDetail)}
        onClose={() => setSelectedOfferForDetail(null)}
        offer={selectedOfferForDetail}
        project={selectedProject}
        onDelete={onDeleteOffer}
        onEditInBuilder={(off) => {
          setSelectedOfferForDetail(null);
          if (onOpenOfferModal) {
            onOpenOfferModal(off);
          } else {
            handleOpenCreateOffer(off);
          }
        }}
        onSave={(updated) => {
          setSelectedOfferForDetail(updated);
        }}
      />

      {/* ➕ Opprett / Rediger Pristilbud Modal (Fallback i workstation) */}
      <OfferModal
        isOpen={isLocalOfferModalOpen}
        onClose={() => {
          setIsLocalOfferModalOpen(false);
          setLocalOfferInitialData(null);
        }}
        initialData={localOfferInitialData}
      />

      {/* 💬 Send svar fra MesterAI til TeamChat Modal */}
      <SendToTeamChatModal
        isOpen={sendToChatModalOpen}
        onClose={() => setSendToChatModalOpen(false)}
        initialText={sendToChatContent}
        consultContext={activeTeamChatConsult}
        projects={projects}
        user={user}
        onSuccess={(channelId, channelName) => {
          setViewMode('module');
          setActiveModuleTab('teamchat');
        }}
      />

      {/* 🤖 Universell MesterAI Copilot (Kun tilgjengelig i fagmoduler, aldri over chattefeltet) */}
      {viewMode === 'module' && activeModuleTab !== 'teamchat' && (
        <MesterAICopilot
          user={user}
          currentView="dashboard"
          activeModuleTab={activeModuleTab}
          selectedProject={selectedProject}
          projects={projects}
          onOpenModule={(mod) => {
            setActiveModuleTab(mod);
            setViewMode('module');
          }}
        />
      )}

      {/* 🚀 Onboarding Velkomstmodal for førstegangsbrukere */}
      <OnboardingWelcomeModal
        isOpen={isOnboardingWelcomeOpen}
        onClose={() => {
          setIsOnboardingWelcomeOpen(false);
          try {
            localStorage.setItem('viking_onboarding_shown', 'true');
          } catch {}
        }}
        userName={user?.displayName || (user as any)?.name}
        companyName={(user as any)?.company || (user as any)?.companyName}
        onStartProject={() => {
          setActiveModuleTab('create_project');
          setViewMode('module');
        }}
        onStartChat={(prompt) => {
          setViewMode('chat');
          setActiveModuleTab(null);
          if (prompt) {
            setTimeout(() => handleSendMessage(prompt), 100);
          }
        }}
        onOpenChecklists={() => {
          handleModuleCardClick('checklists');
        }}
        onOpenMobileGuide={() => {
          setIsMobileGuideOpen(true);
        }}
      />

      {/* 📱 Mobil PWA installasjonsveileder */}
      <MobileInstallGuideModal
        isOpen={isMobileGuideOpen}
        onClose={() => setIsMobileGuideOpen(false)}
      />
    </div>
  );
}

