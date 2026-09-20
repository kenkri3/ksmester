'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  FileText, 
  Check, 
  ArrowRight, 
  HardHat, 
  Wrench, 
  Building2, 
  Zap, 
  Clock, 
  CloudSun, 
  ChevronRight,
  Scale,
  Layers,
  Smartphone,
  Database,
  FolderArchive,
  Info
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

export type DemoRole = 'byggmester' | 'tomrer' | 'rorlegger';

interface DemoScenario {
  id: string;
  role: DemoRole;
  label: string;
  prompt: string;
  agentReply: string;
  cardType?: 'change_order' | 'daily_log' | 'sja' | 'pre_close' | 'access_restricted';
  cardData?: any;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  // BYGGMESTER SCENARIOS
  {
    id: 'bm-eo',
    role: 'byggmester',
    label: '⚡ Varsle endringsordre (NS 8406)',
    prompt: 'Varsle endringsordre iht. NS 8406 på 28 500 kr for ekstra bærebjelke',
    agentReply: 'Endringsvarsel iht. **NS 8406 punkt 19** er generert og klart for utsendelse. Frist for varsling «uten ugrunnet opphold» er overholdt, og fristforlengelse på 3 virkedager er registrert.',
    cardType: 'change_order',
    cardData: {
      orderNumber: 'EO-04',
      project: 'Geitekleiva',
      title: 'Montering av forsterket HEB-180 ståldrager',
      description: 'Byggherre har bestilt fjerning av opprinnelig bærevegg mellom kjøkken og stue. Krever dimensjonert ståldrager med opplegg på søyler.',
      amount: 28500,
      daysExtension: 3,
      standard: 'NS 8406',
      status: 'SENDT_TIL_BYGGHERRE'
    }
  },
  {
    id: 'bm-status',
    role: 'byggmester',
    label: '📊 Prosjekthelse & Krav',
    prompt: 'Hva er prosjekthelse og ubehandlede krav på Geitekleiva?',
    agentReply: 'Her er status for **Geitekleiva**:\n- 📈 **Fremdrift:** 68% fullført (i henhold til tidsplan)\n- 💰 **Sikret tilleggsfakturering:** kr 94 200,- over 3 godkjente endringsordrer\n- ⚠️ **Kritiske sperrer:** 1 aktiv lukkesperre på Bad 2. etg (venter på VVS-trykktest før tømrer kan lukke vegg)\n- 🛡️ **HMS & SJA:** Alle 4 utførte risikovurderinger er signert.',
    cardType: 'sja',
    cardData: {
      title: 'Prosjekthelsestatus: Geitekleiva',
      status: 'God fremdrift • 1 kritisk punkt'
    }
  },
  {
    id: 'bm-offer',
    role: 'byggmester',
    label: '📝 Kalkyle på etterisolering',
    prompt: 'Lag et tilbud på etterisolering og ny kledning med 15% påslag',
    agentReply: 'Kalkyle er utarbeidet for 140 m² fasade:\n- 🧱 **Materiell (Rockwool + vindsperre + kledning):** kr 84 500,-\n- 🔨 **Arbeidstimer (75 timer à 890,-):** kr 66 750,-\n- 📈 **Påslag (15%):** kr 22 688,-\n- 💵 **Total tilbudssum eks. mva:** **kr 173 938,-**\nTilbudet er klart til å sendes som interaktiv kundeavtale på SMS/e-post.',
    cardType: 'change_order',
    cardData: {
      orderNumber: 'TILBUD-2026-12',
      project: 'Geitekleiva',
      title: 'Etterisolering 100mm og dobbelfalset kledning',
      amount: 173938,
      status: 'KLAR_FOR_UTSENDELSE'
    }
  },

  // TØMRER SCENARIOS
  {
    id: 'tom-log',
    role: 'tomrer',
    label: '🎙️ Stemmestyrt dagbok',
    prompt: 'Før 7,5 timer lekting og vindsperre i byggedagboken',
    agentReply: 'Timer og framdrift er registrert i byggedagboken for **Geitekleiva**. Værdata fra **Yr.no** er automatisk hentet og koblet til dagsrapporten for å dokumentere tørre arbeidsforhold.',
    cardType: 'daily_log',
    cardData: {
      date: 'I dag',
      project: 'Geitekleiva',
      craftsman: 'Magne (Tømrer)',
      hours: 7.5,
      weather: 'Oslo/Ski: 11°C, lett bris 3,2 m/s, opphold',
      workPerformed: 'Montert vindsperreduk og lektet ferdig sør- og vestvegg. Gjort klart for montering av stående kledning.',
      status: 'ARKIVERT_I_BYGGEDAGBOK'
    }
  },
  {
    id: 'tom-sja',
    role: 'tomrer',
    label: '🛡️ SJA for arbeid i stillas',
    prompt: 'Lag en SJA for utvendig fasadearbeid og stillas i 3. etasje',
    agentReply: 'Sikker Jobb Analyse (SJA) er utarbeidet iht. **Forskrift om utførelse av arbeid kap. 17**. Sanntids vinddata fra Yr.no (3,2 m/s) vurderes som trygt for stillasarbeid.',
    cardType: 'sja',
    cardData: {
      task: 'Montering av kledning fra stillas i 3. etasje (høyde over 5 meter)',
      project: 'Geitekleiva',
      hazards: [
        'Fall fra høyde ved arbeid utenfor rekkverk',
        'Vindkast og fallende verktøy/kledningsbord mot bakkeplan',
        'Manglende forankring eller sperring på stillas'
      ],
      safetyMeasures: [
        'Stillas godkjent med grønt adgangskort og fullt fotlist/rekkverk',
        'Sikringstau og verktøystropper på alt batteriverktøy',
        'Avsperring av bakkeområde med kjegler mot uvedkommende'
      ],
      status: 'SIGNERT_PÅ_BYGGEPLASS'
    }
  },
  {
    id: 'tom-tek17',
    role: 'tomrer',
    label: '📐 Krav til dampsperre (TEK17)',
    prompt: 'Hva sier TEK17 og Våtromsnormen om dampsperre mot yttervegg?',
    agentReply: 'I henhold til **TEK17 § 13-14** og **BVN 31.205** gjelder følgende:\n1. Dampsperren må være kontinuerlig og klemt med godkjent tape mot tilstøtende bygningsdeler.\n2. Ved våtrom mot yttervegg må samlet dampmotstand beregnes slik at det ikke oppstår fuktfelle mellom membran og dampsperre.\n3. Alle rør- og kabelgjennomføringer må ha tette mansjetter før veggen lukkes.',
  },
  {
    id: 'tom-security',
    role: 'tomrer',
    label: '🔒 Sjekk tilgangsbegrensning (Firmaøkonomi)',
    prompt: 'Hva er firmaets dekningsbidrag og timepriser på prosjektet?',
    agentReply: '🔒 **Tilgang nektet (Rollebegrenset tilgang):**\nSom fagarbeider har du tilgang til faglig utførelse, timeføring, byggedagbok og HMS for **Geitekleiva**.\n\nFirmaets interne marginer, kalkylepåslag og overordnede regnskapstall er strengt skjermet og kun tilgjengelig for Byggmester og ledelsen.',
    cardType: 'access_restricted'
  },

  // RØRLEGGER SCENARIOS
  {
    id: 'ror-close',
    role: 'rorlegger',
    label: '🚰 Godkjenn trykktest (Lukkesperre)',
    prompt: 'Godkjenn trykktest og rør-i-rør for Bad 2. etasje',
    agentReply: 'Trykktestrapport er verifisert og godkjent (10 bar / 30 min uten trykkfall). **Tverrfaglig Lukkesperre for Bad 2. etasje har skiftet fra RØDT LYS til GRØNT LYS!** Tømrer har nå fått klarsignal om at veggen kan kles og isoleres.',
    cardType: 'pre_close',
    cardData: {
      room: 'Bad 2. etasje (Hovedbad)',
      project: 'Geitekleiva',
      trades: {
        plumbing: true,
        electric: true,
        vaporBarrier: true,
        insulation: true
      },
      status: 'GREEN'
    }
  },
  {
    id: 'ror-deviation',
    role: 'rorlegger',
    label: '📸 Meld avvik: Manglende utsparing',
    prompt: 'Meld avvik: Bjelkelag mangler utsparing for avløpsrør 110mm i teknisk sjakt',
    agentReply: 'Avvik registrert som **#AVV-18** under kategorien *Kollisjon mellom fag (Tømrer / Rørlegger)*. Byggeleder Ken har mottatt direktevarsel med tiltaksfrist innen 24 timer for å unngå forsinkelse.',
    cardType: 'change_order',
    cardData: {
      orderNumber: 'AVV-18',
      project: 'Geitekleiva',
      title: 'Mangler utsparing for 110mm avløp i bjelkelag',
      description: 'Hulltaking ikke utført iht. VVS-tegning revisjon C. Hindrer rørlegger i framdrift.',
      status: 'MELD_TIL_BYGGELEDER'
    }
  }
];

const INTEGRATION_MODULES = [
  {
    icon: Scale,
    title: 'NS 8405 / NS 8406 / NS 8407',
    tag: 'Jus & Kontrakt',
    description: 'Automatisk varsling av avvik og endringsordrer iht. pkt. 19, krav om fristforlengelse og vederlagsjustering rett fra byggeplass før fristen ryker.'
  },
  {
    icon: Layers,
    title: 'TEK17 & Byggforsk Kunnskap',
    tag: 'Byggteknisk',
    description: 'Sanntidsoppslag på tekniske forskrifter, u-verdikrav, dampsperreregler, fall på våtrom og godkjente Byggforsk-detaljer direkte i dialogen.'
  },
  {
    icon: ShieldCheck,
    title: 'Tverrfaglig Lukkesperre',
    tag: 'Kvalitetssikring',
    description: 'Digital sperre som hindrer tømrer i å lukke vegger og etasjeskiller før rørlegger har trykktestet og elektriker har fotografert skjulte rørføringer.'
  },
  {
    icon: CloudSun,
    title: 'Yr.no Sanntids Værlogging',
    tag: 'Byggedagbok',
    description: 'Temperatur, nedbør og vindstyrke hentes automatisk inn i byggedagboken ved hver føring. Gir vanntett bevisgrunnlag ved værforbehold og tørketider.'
  },
  {
    icon: Database,
    title: 'Tripletex & PowerOffice Go',
    tag: 'Økonomi & ERP',
    description: 'Sømløs toveis overføring av godkjente tillegg, timelister, fakturagrunnlag og prosjektnumre. Hindrer manuelt dobbeltarbeid og glemte fakturaer.'
  },
  {
    icon: Lock,
    title: 'Rollebasert Sikkerhetsmur',
    tag: 'Sikkerhet & Personvern',
    description: 'Håndverkere og underentreprenører ser kun sine oppgaver og sjekklister. Timepriser, kalkylmarginer og regnskap er strengt skjermet for ledelsen.'
  },
  {
    icon: Smartphone,
    title: 'Omnichannel: Tale, SMS & Mobil',
    tag: 'Feltkommunikasjon',
    description: 'Håndverkerne kan snakke inn timer, sende inn bilder og føre avvik via SMS eller mobilnett uten å måtte navigere i kompliserte menyer.'
  },
  {
    icon: FolderArchive,
    title: 'Boligmappa & FDV-Eksport',
    tag: 'Overlevering',
    description: 'FDV-dokumentasjon, produktdatablad, bilder og sjekklister eksporteres automatisk til Boligmappa eller ferdig FDV-perm ved ferdigstillelse.'
  }
];

function renderFormattedMessage(content: string) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-2 leading-relaxed text-slate-800">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const isNumbered = /^\d+\.\s/.test(trimmed);

        const textToParse = isBullet 
          ? trimmed.replace(/^[-*]\s+/, '') 
          : isNumbered 
            ? trimmed.replace(/^\d+\.\s+/, '') 
            : trimmed;

        // Parse markdown inline elements: bold (**text**) and italic (*text*)
        const tokens = textToParse.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        const renderedTokens = tokens.map((tok, tokIdx) => {
          if (tok.startsWith('**') && tok.endsWith('**') && tok.length >= 4) {
            return (
              <strong key={tokIdx} className="font-bold text-navy-950">
                {tok.slice(2, -2)}
              </strong>
            );
          }
          if (tok.startsWith('*') && tok.endsWith('*') && tok.length >= 2 && !tok.startsWith('**')) {
            return (
              <em key={tokIdx} className="italic text-slate-700">
                {tok.slice(1, -1)}
              </em>
            );
          }
          return <React.Fragment key={tokIdx}>{tok}</React.Fragment>;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1">
              <span className="text-electric-500 font-bold select-none leading-normal">•</span>
              <div className="flex-1">{renderedTokens}</div>
            </div>
          );
        }

        if (isNumbered) {
          const numberMatch = trimmed.match(/^(\d+)\./);
          const num = numberMatch ? numberMatch[1] : `${lineIdx + 1}`;
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1">
              <span className="font-bold text-electric-600 select-none leading-normal">{num}.</span>
              <div className="flex-1">{renderedTokens}</div>
            </div>
          );
        }

        return (
          <p key={lineIdx}>
            {renderedTokens}
          </p>
        );
      })}
    </div>
  );
}

export default function MesterAIDemoSimulator({
  onStartFreeTrial,
  id = 'live-demo'
}: {
  onStartFreeTrial?: () => void;
  id?: string;
}) {
  const [selectedRole, setSelectedRole] = useState<DemoRole>('byggmester');
  const [activeScenario, setActiveScenario] = useState<DemoScenario>(DEMO_SCENARIOS[0]);
  const [isTyping, setIsTyping] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isSimulatedApproved, setIsSimulatedApproved] = useState(false);
  const [lukkesperreGreen, setLukkesperreGreen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Switch role and update default scenario
  const handleRoleChange = (role: DemoRole) => {
    setSelectedRole(role);
    setIsSimulatedApproved(false);
    setLukkesperreGreen(false);
    const firstForRole = DEMO_SCENARIOS.find(s => s.role === role) || DEMO_SCENARIOS[0];
    triggerScenario(firstForRole);
  };

  const triggerScenario = (scenario: DemoScenario) => {
    setIsTyping(true);
    setIsSimulatedApproved(false);
    if (scenario.cardType === 'pre_close') {
      setLukkesperreGreen(true);
    }
    setTimeout(() => {
      setActiveScenario(scenario);
      setIsTyping(false);
    }, 400);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    setIsTyping(true);
    const query = customPrompt.trim();
    setCustomPrompt('');

    setTimeout(() => {
      // Dynamic response matching role
      let reply = '';
      let cardType: any = undefined;
      let cardData: any = undefined;

      const lower = query.toLowerCase();

      if (lower.includes('endring') || lower.includes('ns 8406') || lower.includes('tillegg')) {
        if (selectedRole === 'byggmester') {
          reply = `Endringsvarsel iht. **NS 8406 punkt 19** er generert for Geitekleiva basert på din forespørsel: «${query}». Varslet er sendt til byggherre for godkjenning.`;
          cardType = 'change_order';
          cardData = {
            orderNumber: `EO-0${Math.floor(Math.random() * 9) + 5}`,
            project: 'Geitekleiva',
            title: query,
            amount: 19500,
            daysExtension: 2,
            standard: 'NS 8406',
            status: 'SENDT_TIL_BYGGHERRE'
          };
        } else {
          reply = `Som ${selectedRole === 'tomrer' ? 'tømrer' : 'underentreprenør'} kan du melde inn ekstraarbeid i byggedagboken. Byggmester Ken har mottatt notatet og vil utstede formelt NS 8406 varsel.`;
        }
      } else if (lower.includes('time') || lower.includes('dagbok') || lower.includes('jobbet')) {
        reply = `Timer er loggført på **Geitekleiva**. Værdata (11°C, lett bris) er automatisk vedlagt iht. internkontrollforskriften.`;
        cardType = 'daily_log';
        cardData = {
          date: 'I dag',
          project: 'Geitekleiva',
          craftsman: selectedRole === 'byggmester' ? 'Byggeleder Ken' : selectedRole === 'tomrer' ? 'Magne (Tømrer)' : 'VVS Teknikk AS',
          hours: 7.5,
          weather: 'Yr.no: 11°C, lett bris, opphold',
          workPerformed: query,
          status: 'ARKIVERT'
        };
      } else if (lower.includes('sja') || lower.includes('sikkerhet') || lower.includes('risiko')) {
        reply = `Lovpålagt **Sikker Jobb Analyse (SJA)** er opprettet med sanntids værdata og relevante vernetiltak.`;
        cardType = 'sja';
        cardData = {
          task: query,
          project: 'Geitekleiva',
          hazards: ['Fall fra høyde eller klemskade', 'Vind og glatt underlag'],
          safetyMeasures: ['Bruk av påbudt personlig verneutstyr (PVU)', 'Verifisert underlag før oppstart'],
          status: 'SIGNERT_I_FELT'
        };
      } else if (lower.includes('pris') || lower.includes('margin') || lower.includes('regnskap') || lower.includes('lønn')) {
        if (selectedRole === 'byggmester') {
          reply = `Firmaets gjennomsnittlige dekningsbidrag på Geitekleiva er 18,4%, med en timepris på kr 890,- eks. mva.`;
        } else {
          reply = `🔒 **Tilgang nektet (Rollebegrenset tilgang):** Som fagarbeider/UE har du ikke tilgang til firmaets interne økonomi. Dette er forbeholdt Byggmester/Ledelsen.`;
          cardType = 'access_restricted';
        }
      } else {
        reply = `Jeg har prosessert din instruks som **${selectedRole === 'byggmester' ? 'Byggmester' : selectedRole === 'tomrer' ? 'Tømrer' : 'Rørlegger'}** på prosjekt **Geitekleiva**. Alt er loggført og i tråd med TEK17 og NS 8406.`;
      }

      setActiveScenario({
        id: `custom-${Date.now()}`,
        role: selectedRole,
        label: query,
        prompt: query,
        agentReply: reply,
        cardType,
        cardData
      });
      setIsTyping(false);
    }, 450);
  };

  const handleSimulateVoice = () => {
    setIsListening(true);
    toast.info('Simulerer taleopptak i felt...');
    setTimeout(() => {
      setIsListening(false);
      const voicePrompts: Record<DemoRole, string> = {
        byggmester: 'Varsle endringsordre på 32 000 kr for ekstra lydisolering i etasjeskiller',
        tomrer: 'Før 6 timer montering av gips på stue, måtte vente 1 time på elektriker',
        rorlegger: 'Trykktest av rør-i-rør fordelerskap fullført med 10 bar, alt tett'
      };
      setCustomPrompt(voicePrompts[selectedRole]);
      toast.success('Tale transkribert med MesterAI Norsk Byggemodell!');
    }, 1200);
  };

  const roleScenarios = DEMO_SCENARIOS.filter(s => s.role === selectedRole);

  return (
    <section id={id} className="py-12 sm:py-24 bg-gradient-to-b from-white via-slate-50 to-white border-b border-slate-200 overflow-hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-50 border border-electric-300/40 text-electric-600 text-[11px] sm:text-xs font-bold tracking-wide uppercase shadow-xs mb-3">
            <Sparkles size={13} className="text-electric-500 animate-pulse" />
            <span>INTERAKTIV SANDKASSE • PRØVEKJØR MESTERAI LIVE</span>
          </div>
          <h2 className="text-xl sm:text-4xl lg:text-5xl font-black tracking-tight text-navy-900 leading-tight">
            Se hvordan agenten tilpasser seg <span className="text-gradient-purple">hver enkelt rolle</span>.
          </h2>
          <p className="mt-3 sm:mt-4 text-xs sm:text-base text-slate-600 leading-relaxed font-sans">
            Byggmesteren får full økonomisk kontroll, mens tømreren og rørleggeren har en lynrask assistent på byggeplassen – helt uten tilgang til sensitive bedriftstall.
          </p>
        </div>

        {/* Demo Disclaimer / Sandkasse-varsel */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-start sm:items-center gap-2.5 sm:gap-3.5 text-amber-950">
          <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 text-amber-800 shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle size={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="text-[11px] sm:text-sm leading-relaxed">
            <strong className="font-bold text-amber-900 uppercase tracking-wide text-[10px] sm:text-[11px] block sm:inline mr-2">
              ⚠️ Simulert forhåndsvisning (Ikke ekte agent):
            </strong>
            Dette er en lukket interaktiv demo basert på fiktive eksempeldata fra referanseprosjektet <strong>Geitekleiva</strong>. Ingen tilgang gis til eksterne systemer eller bedriftens reelle data for full trygghet.
          </div>
        </div>

        {/* Interactive Simulator Shell */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-card-hover overflow-hidden w-full">
          
          {/* Top Role Selector Tabs */}
          <div className="p-2.5 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300 uppercase tracking-wider truncate">
                Aktivt Sandkasse-prosjekt: <strong className="text-white">Geitekleiva</strong>
              </span>
            </div>

            {/* 3 Role Buttons */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl sm:rounded-2xl border border-slate-700/60 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => handleRoleChange('byggmester')}
                className={cn(
                  "px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                  selectedRole === 'byggmester'
                    ? "bg-electric-600 text-white shadow-md shadow-electric-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                )}
              >
                <Building2 size={13} className="sm:w-3.5 sm:h-3.5" />
                <span>1. Byggmester / Leder</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('tomrer')}
                className={cn(
                  "px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                  selectedRole === 'tomrer'
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                )}
              >
                <HardHat size={13} className="sm:w-3.5 sm:h-3.5" />
                <span>2. Tømrer (I stillas)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('rorlegger')}
                className={cn(
                  "px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                  selectedRole === 'rorlegger'
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                )}
              >
                <Wrench size={13} className="sm:w-3.5 sm:h-3.5" />
                <span>3. Rørlegger (Lukkesperre)</span>
              </button>
            </div>
          </div>

          {/* Role Status Banner */}
          <div className={cn(
            "px-3 sm:px-5 py-2 sm:py-3 text-[11px] sm:text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 border-b transition-colors",
            selectedRole === 'byggmester' && "bg-purple-50 text-purple-900 border-purple-100",
            selectedRole === 'tomrer' && "bg-amber-50 text-amber-900 border-amber-100",
            selectedRole === 'rorlegger' && "bg-blue-50 text-blue-900 border-blue-100"
          )}>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold uppercase tracking-wider text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-white/80 border shadow-xs">
                {selectedRole === 'byggmester' ? 'Full Administrator • Alle Prosjekter & Økonomi' : selectedRole === 'tomrer' ? 'Prosjektbundet • Kun Geitekleiva' : 'Underentreprenør • Faglig Lukkesperre'}
              </span>
              <span className="hidden sm:inline-block">•</span>
              <span className="text-[10px] sm:text-[11px]">
                {selectedRole === 'byggmester' 
                  ? 'Kan utstede NS 8406 krav, godkjenne fakturering og se dekningsgrad.'
                  : selectedRole === 'tomrer'
                    ? 'Kan føre timer, stemmestyre byggedagbok og lage SJA. Skjermet mot kalkyler.'
                    : 'Kan kvittere trykktest for å oppheve lukkesperre og melde tverrfaglige avvik.'}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase shrink-0 text-slate-500 self-end sm:self-auto">
              MesterAI 2.0 Live
            </span>
          </div>

          {/* Preset Scenario Buttons (Click-to-test) */}
          <div className="p-3 sm:p-5 bg-slate-50 border-b border-slate-200">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 sm:mb-2.5 flex items-center gap-1.5">
              <Zap size={13} className="text-electric-600 shrink-0" />
              <span>Prøv en ferdig kommando for denne rollen:</span>
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {roleScenarios.map((sc) => {
                const isActive = activeScenario.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => triggerScenario(sc)}
                    className={cn(
                      "px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all text-left flex items-center gap-1.5 cursor-pointer shadow-xs",
                      isActive
                        ? "bg-navy-950 text-white ring-2 ring-electric-500"
                        : "bg-white text-navy-900 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/80"
                    )}
                  >
                    <span>{sc.label}</span>
                    <ChevronRight size={12} className={cn("transition-transform shrink-0", isActive && "translate-x-0.5 text-electric-400")} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Simulator Conversation Area */}
          <div className="p-3 sm:p-6 space-y-3.5 sm:space-y-5 bg-white min-h-[340px] max-h-[580px] overflow-y-auto overflow-x-hidden w-full">
            
            {/* User Speech / Prompt Bubble */}
            <div className="flex items-start justify-end gap-2 sm:gap-3 w-full">
              <div className="max-w-[85%] sm:max-w-xl bg-navy-950 text-white rounded-2xl rounded-tr-xs p-3 sm:p-4 shadow-sm min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 text-[10px] sm:text-[11px] font-mono text-slate-400 flex-wrap">
                  <span>Du ({selectedRole === 'byggmester' ? 'Byggmester Ken' : selectedRole === 'tomrer' ? 'Tømrer Magne' : 'Rørlegger VVS Teknikk'})</span>
                  <span>•</span>
                  <span>Akkurat nå</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold leading-relaxed break-words">
                  "{activeScenario.prompt}"
                </p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-navy-900 shrink-0 font-black text-xs">
                {selectedRole === 'byggmester' ? '👔' : selectedRole === 'tomrer' ? '🔨' : '🚰'}
              </div>
            </div>

            {/* Agent Live Processing State */}
            {isTyping && (
              <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Bot size={16} className="animate-spin" />
                </div>
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs text-xs font-mono text-slate-500 flex items-center gap-2 min-w-0 truncate">
                  <span className="w-2 h-2 rounded-full bg-electric-500 animate-ping shrink-0" />
                  <span className="truncate">MesterAI tolker tale og sjekker TEK17 / NS 8406 regler...</span>
                </div>
              </div>
            )}

            {/* Agent Response Bubble */}
            {!isTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-start gap-2 sm:gap-3 w-full min-w-0"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-800 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
                </div>

                <div className="flex-1 min-w-0 max-w-2xl space-y-3 sm:space-y-4">
                  {/* Speech response */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-3 sm:p-4 text-xs sm:text-sm text-navy-950 font-sans shadow-xs break-words">
                    {renderFormattedMessage(activeScenario.agentReply)}
                  </div>

                  {/* Dynamic Visual Document Cards */}
                  {activeScenario.cardType === 'change_order' && activeScenario.cardData && (
                    <div className="p-3.5 sm:p-5 rounded-2xl bg-white border-2 border-electric-500/80 shadow-md min-w-0 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <FileText size={15} className="text-electric-600 shrink-0" />
                          <span className="text-xs font-black text-navy-900 tracking-wider truncate">
                            ENDRINGSORDRE {activeScenario.cardData.orderNumber}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 shrink-0">(NS 8406)</span>
                        </div>
                        <span className={cn(
                          "text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 self-start sm:self-auto",
                          isSimulatedApproved 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        )}>
                          {isSimulatedApproved ? 'GODKJENT AV BYGGHERRE' : activeScenario.cardData.status}
                        </span>
                      </div>

                      <div className="space-y-1 sm:space-y-1.5 text-xs text-slate-700 mb-3 sm:mb-4 break-words">
                        <p><strong>Beskrivelse:</strong> {activeScenario.cardData.title}</p>
                        <p><strong>Prosjekt:</strong> {activeScenario.cardData.project}</p>
                        <p><strong>Fristforlengelse:</strong> +{activeScenario.cardData.daysExtension || 2} virkedager</p>
                        <p className="text-xs sm:text-sm font-black text-navy-900 mt-2">
                          Kompensasjonskrav: kr {activeScenario.cardData.amount?.toLocaleString('no-NO')},- eks. mva
                        </p>
                      </div>

                      {!isSimulatedApproved ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSimulatedApproved(true);
                            toast.success('Byggherre godkjente endringsordren via SMS-link!');
                          }}
                          className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer text-center leading-tight"
                        >
                          <Check size={14} className="shrink-0" />
                          <span>Simuler at Byggherre godkjenner på mobil</span>
                        </button>
                      ) : (
                        <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span className="leading-tight">Kravet er låst og klart for direkte fakturering (hindrer tap av penger).</span>
                        </div>
                      )}
                    </div>
                  )}

                  {activeScenario.cardType === 'daily_log' && activeScenario.cardData && (
                    <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-md min-w-0 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 sm:pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <Clock size={15} className="text-amber-600 shrink-0" />
                          <span className="text-xs font-black text-navy-900 tracking-wider truncate">
                            BYGGEDAGBOK • {activeScenario.cardData.project}
                          </span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0 self-start sm:self-auto">
                          {activeScenario.cardData.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-700 break-words">
                        <div className="p-2 sm:p-2.5 bg-slate-50 rounded-xl flex items-center gap-2 text-blue-700">
                          <CloudSun size={15} className="shrink-0" />
                          <span className="font-semibold text-[11px] sm:text-xs">{activeScenario.cardData.weather}</span>
                        </div>
                        <p><strong>Ført av:</strong> {activeScenario.cardData.craftsman} ({activeScenario.cardData.hours} timer)</p>
                        <p><strong>Arbeid:</strong> {activeScenario.cardData.workPerformed}</p>
                      </div>
                    </div>
                  )}

                  {activeScenario.cardType === 'sja' && activeScenario.cardData && (
                    <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-amber-200 shadow-md min-w-0 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 sm:pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-amber-700 font-black text-xs min-w-0">
                          <AlertTriangle size={15} className="shrink-0" />
                          <span className="truncate">SIKKER JOBB ANALYSE (SJA)</span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 shrink-0 self-start sm:self-auto">
                          TEK17 & ARBEIDSTILSYNET
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-700 break-words">
                        <p><strong>Oppgave:</strong> {activeScenario.cardData.task || activeScenario.cardData.title}</p>
                        {activeScenario.cardData.hazards && (
                          <div>
                            <span className="font-bold text-rose-700">Identifiserte Farer:</span>
                            <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-600 pl-1">
                              {activeScenario.cardData.hazards.map((h: string, idx: number) => (
                                <li key={idx} className="leading-snug">{h}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {activeScenario.cardData.safetyMeasures && (
                          <div>
                            <span className="font-bold text-emerald-700">Iverksatte Sikkerhetstiltak:</span>
                            <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-600 pl-1">
                              {activeScenario.cardData.safetyMeasures.map((m: string, idx: number) => (
                                <li key={idx} className="leading-snug">{m}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeScenario.cardType === 'pre_close' && (
                    <div className="p-3.5 sm:p-5 rounded-2xl bg-white border-2 border-emerald-500 shadow-md min-w-0 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 sm:pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                          <span className="text-xs font-black text-navy-900 tracking-wider truncate">
                            TVERRFAGLIG LUKKESPERRE
                          </span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 flex items-center gap-1 shrink-0 self-start sm:self-auto">
                          <Unlock size={11} />
                          GRØNT LYS – LUKKING TILLATT
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs mb-3">
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] sm:text-xs">
                          <Check size={13} className="text-emerald-600 shrink-0" />
                          <span className="truncate">Rørlegger: Trykktest 10 bar</span>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] sm:text-xs">
                          <Check size={13} className="text-emerald-600 shrink-0" />
                          <span className="truncate">Elektriker: K-rør fotografert</span>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] sm:text-xs">
                          <Check size={13} className="text-emerald-600 shrink-0" />
                          <span className="truncate">Dampsperre: Klemte skjøter</span>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] sm:text-xs">
                          <Check size={13} className="text-emerald-600 shrink-0" />
                          <span className="truncate">Isolasjon: Uten kuldebro</span>
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 italic leading-snug">
                        Byggeleder og tømrer varslet automatisk: Vegg på Bad 2. etasje kan nå kles med gipsplater.
                      </p>
                    </div>
                  )}

                  {activeScenario.cardType === 'access_restricted' && (
                    <div className="p-3 sm:p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-xs min-w-0 w-full break-words">
                      <div className="flex items-center gap-2 text-rose-900 font-bold mb-1">
                        <Lock size={15} className="text-rose-600 shrink-0" />
                        <span>Sikkerhetsbarriere aktiv</span>
                      </div>
                      <p className="text-rose-700 leading-relaxed break-words">
                        VikingMester skiller strengt mellom administrative bedriftsdata og byggeplassens fagarbeidere. Dine håndverkere ser kun det de trenger for å bygge feilfritt.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Input Bar */}
          <form onSubmit={handleCustomSubmit} className="p-2 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleSimulateVoice}
              className={cn(
                "w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shrink-0 cursor-pointer",
                isListening 
                  ? "bg-rose-600 text-white animate-pulse" 
                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
              )}
              title="Snakk inn på byggeplass"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={
                selectedRole === 'byggmester' 
                  ? "Skriv inn tilbud eller NS 8406 endring..." 
                  : selectedRole === 'tomrer'
                    ? "Før timer eller be om TEK17 råd..."
                    : "Skriv trykktest eller avvik..."
              }
              className="min-w-0 flex-1 px-2.5 sm:px-4 py-2 sm:py-3 bg-white border border-slate-300 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-navy-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-electric-500 transition-all"
            />

            <button
              type="submit"
              disabled={!customPrompt.trim()}
              className="px-3 sm:px-4 py-2 sm:py-3 bg-electric-600 hover:bg-electric-700 disabled:opacity-40 text-white rounded-xl sm:rounded-2xl font-bold text-xs transition-all flex items-center gap-1 shrink-0 shadow-sm cursor-pointer"
            >
              <span>Test</span>
              <Send size={13} />
            </button>
          </form>

          {/* Bottom Conversion CTA Strip */}
          <div className="p-3.5 sm:p-6 bg-gradient-to-r from-navy-950 via-slate-900 to-navy-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">
                  KLAR FOR DETTE I DIN EGEN BEDRIFT?
                </span>
              </div>
              <p className="text-[11px] sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
                Start 14 dagers gratis prøveperiode. Ingen bindingstid – kom i gang på 30 sekunder.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
              <a
                href="#bestill"
                onClick={onStartFreeTrial}
                className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold text-xs shadow-purple-cta transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Start Gratis Prøveperiode</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>

        </div>

        {/* Hva kan kobles til i fullversjonen av MesterAI? */}
        <div className="mt-16 sm:mt-24 pt-12 border-t border-slate-200">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-navy-900 text-white text-xs font-bold tracking-wide uppercase shadow-xs mb-3">
              <Sparkles size={14} className="text-electric-400" />
              <span>PRODUKSJONSKLART • FUNKSJONALITET & INTEGRASJONER</span>
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-navy-900 tracking-tight">
              Hva kan kobles til i fullversjonen av MesterAI?
            </h3>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
              I motsetning til denne lukkede sandkassen, kobles MesterAI i fullversjon direkte sammen med din bedrifts systemer, kontraktsstandarder og mobile arbeidsflyter.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {INTEGRATION_MODULES.map((mod, index) => {
              const IconComponent = mod.icon;
              return (
                <div 
                  key={index} 
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-electric-50 text-electric-600 flex items-center justify-center border border-electric-100 group-hover:scale-105 transition-transform">
                        <IconComponent size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {mod.tag}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-navy-900 mb-1.5 leading-snug">
                      {mod.title}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-sans">
                      {mod.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>Klar for aktivering</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-slate-100/80 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-navy-900 text-white flex items-center justify-center shrink-0">
                <Info size={18} />
              </div>
              <p className="text-xs sm:text-sm text-slate-700 font-medium">
                Ønsker du en spesialtilpasset integrasjon med ditt nåværende ERP-system eller egne kalkyleregler? Vi setter det opp sammen med deg.
              </p>
            </div>
            <a
              href="#bestill"
              onClick={onStartFreeTrial}
              className="px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs transition-colors shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <span>Snakk med oss om integrasjon</span>
              <ArrowRight size={13} />
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
