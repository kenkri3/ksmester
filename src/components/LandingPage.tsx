'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, 
  Zap, 
  Smartphone, 
  CheckCircle2, 
  ArrowRight,
  HardHat,
  Camera,
  Mic,
  FileText,
  Users,
  Download,
  Layers,
  Cpu,
  Database,
  Globe,
  Activity,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
  AlertTriangle,
  Clock,
  Briefcase,
  HelpCircle,
  Mail,
  Phone,
  Cloud,
  FileCheck,
  Search,
  Bot,
  Flame,
  Award,
  RefreshCw,
  Building2,
  Lock,
  MessageSquare,
  Sliders,
  DollarSign,
  Calculator,
  Compass,
  Star,
  Shield,
  FileSignature,
  Check
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import InstallGuide from './InstallGuide';
import { toast } from 'sonner';
import { promptPWAInstall, isPWAInstalled } from '../lib/pwa';

export type LandingTab = 'home' | 'ai' | 'hms' | 'fdv' | 'pricing';

interface LandingPageProps {
  onStartDemo: () => void;
  onOpenPortal: (code: string) => void;
  onViewChange: (view: any) => void;
  currentTab?: LandingTab;
  onTabChange?: (tab: LandingTab) => void;
}

export default function LandingPage({ 
  onStartDemo, 
  onOpenPortal, 
  onViewChange,
  currentTab = 'home',
  onTabChange
}: LandingPageProps) {
  const { t } = useTranslation();
  const [internalTab, setInternalTab] = useState<LandingTab>(currentTab);
  const activeTab = onTabChange ? currentTab : internalTab;

  const switchTab = (tab: LandingTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleInstallApp = async () => {
    if (isPWAInstalled()) {
      toast.info('KS Mester er allerede installert som app på denne enheten!');
      return;
    }
    const outcome = await promptPWAInstall();
    if (outcome === 'accepted') {
      toast.success('Laster ned og installerer KS Mester på telefonen...');
      return;
    }
    setShowInstallGuide(true);
  };

  const [projectCode, setProjectCode] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Camera flow interactive demo state
  const [cameraStep, setCameraStep] = useState<1 | 2 | 3>(1);
  const [selectedCamProject, setSelectedCamProject] = useState('Enebolig Nordstrand');
  const [selectedCamTarget, setSelectedCamTarget] = useState('Sjekkliste: Våtrom TEK17');

  // Interactive Product Showcase Tab State
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'ks' | 'ai' | 'hms' | 'fdv' | 'kontrakt'>('ai');

  // ROI Calculator State
  const [workerCount, setWorkerCount] = useState(6);
  const [hourlyRate, setHourlyRate] = useState(850);

  const handlePortalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectCode.trim()) {
      onOpenPortal(projectCode.trim());
    }
  };

  const faqs = [
    {
      q: "Hvor lang tid tar det å komme i gang med KS Mester?",
      a: "Du er i gang på under 5 minutter! Systemet leveres med fiks ferdige maler for TEK17, SAK10 og Internkontrollforskriften. Du kan opprette ditt første prosjekt, invitere kolleger og starte en SJA eller sjekkliste rett fra mobilen umiddelbart."
    },
    {
      q: "Fungerer appen ute på byggeplassen uten mobildekning?",
      a: "Ja, 100 %! KS Mester er bygget som en avansert offline-først Progressive Web App (PWA). Du kan ta bilder, registrere avvik, signere og fylle ut sjekklister i dype kjellere eller usikre dekningsforhold. Alt synkroniseres trygt og automatisk så snart du får nett igjen."
    },
    {
      q: "Hvordan fungerer overføringen til Boligmappa?",
      a: "KS Mester er godkjent integrasjonspartner med Boligmappa. Når et prosjekt ferdigstilles (eller underveis), samles all dokumentasjon, FDV-ark fra NOBB, produktdata og godkjente sjekklister. Med ett enkelt tastetrykk overføres alt direkte til boligens gnr/bnr i Boligmappa."
    },
    {
      q: "Hva gjør Mesterhjernen AI annerledes enn generell AI som ChatGPT?",
      a: "Mesterhjernen er spesialtrent på det norske byggeregelverket (TEK17, SAK10, Byggherreforskriften), norske bransjestandarder (NS 8405, NS 8406, Våtromsnormen) og sanntids værdata fra Yr.no. Den forstår norsk fagspråk, gjenkjenner bygningsdeler på bilder og genererer juridisk vanntette SJA-rapporter og tilbud."
    },
    {
      q: "Kan utenlandske fagarbeidere bruke systemet på sitt eget språk?",
      a: "Ja! Appen støtter full flerspråklighet (Norsk, Engelsk, Polsk, Litauisk). En polsktalende håndverker kan fylle ut en SJA eller registrere et avvik på polsk, og systemet oversetter det automatisk til korrekt norsk fagterminologi for byggherre og kontrollmyndigheter."
    },
    {
      q: "Er det noen bindingstid eller krav til kredittkort?",
      a: "Ingen bindingstid og ingen kredittkort. Vi fakturerer månedlig via standard bedriftsfaktura eller EHF. Du får full personlig oppstartsstøtte og gjennomgang av dine maler og prosjekter fra dag én."
    },
    {
      q: "Får vi hjelp og opplæring?",
      a: "Ja, vi har dedikert norsk support via telefon (401 63 082), e-post og direkte live chat. For større bedrifter tilbyr vi også skreddersydd onboarding og mal-tilpasning."
    }
  ];

  return (
    <div className="bg-neutral-50 text-neutral-900 selection:bg-emerald-100 selection:text-emerald-900 min-h-screen flex flex-col">
      
      {/* Sub-navigation pills (floating & unobtrusive) - Only visible when NOT on home tab for quick breadcrumb navigation */}
      {activeTab !== 'home' && (
        <div className="bg-neutral-900 text-white border-b border-neutral-800 py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <button 
              onClick={() => switchTab('home')}
              className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              ← Tilbake til oversikten
            </button>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] text-neutral-400 uppercase tracking-widest font-semibold mr-2 hidden sm:inline">Moduler:</span>
              <button 
                onClick={() => switchTab('ai')} 
                className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer", activeTab === 'ai' ? "bg-emerald-600 text-white" : "text-neutral-300 hover:bg-neutral-800")}
              >
                Mesterhjernen AI
              </button>
              <button 
                onClick={() => switchTab('hms')} 
                className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer", activeTab === 'hms' ? "bg-emerald-600 text-white" : "text-neutral-300 hover:bg-neutral-800")}
              >
                HMS & SJA
              </button>
              <button 
                onClick={() => switchTab('fdv')} 
                className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer", activeTab === 'fdv' ? "bg-emerald-600 text-white" : "text-neutral-300 hover:bg-neutral-800")}
              >
                FDV & Boligmappa
              </button>
              <button 
                onClick={() => switchTab('pricing')} 
                className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer", activeTab === 'pricing' ? "bg-emerald-600 text-white" : "text-neutral-300 hover:bg-neutral-800")}
              >
                Priser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dynamic View Content */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeView 
            onStartDemo={onStartDemo} 
            onSwitchTab={switchTab} 
            handlePortalSubmit={handlePortalSubmit}
            projectCode={projectCode}
            setProjectCode={setProjectCode}
            cameraStep={cameraStep}
            setCameraStep={setCameraStep}
            selectedCamProject={selectedCamProject}
            setSelectedCamProject={setSelectedCamProject}
            selectedCamTarget={selectedCamTarget}
            setSelectedCamTarget={setSelectedCamTarget}
            faqs={faqs}
            activeFaq={activeFaq}
            setActiveFaq={setActiveFaq}
            activeShowcaseTab={activeShowcaseTab}
            setActiveShowcaseTab={setActiveShowcaseTab}
            workerCount={workerCount}
            setWorkerCount={setWorkerCount}
            hourlyRate={hourlyRate}
            setHourlyRate={setHourlyRate}
            onViewChange={onViewChange}
          />
        )}

        {activeTab === 'ai' && (
          <MesterHjernenView 
            onStartDemo={onStartDemo} 
            onBack={() => switchTab('home')} 
          />
        )}

        {activeTab === 'hms' && (
          <HMSView 
            onStartDemo={onStartDemo} 
            onBack={() => switchTab('home')} 
            onGoToPricing={() => switchTab('pricing')}
          />
        )}

        {activeTab === 'fdv' && (
          <FDVView 
            onStartDemo={onStartDemo} 
            onBack={() => switchTab('home')} 
          />
        )}

        {activeTab === 'pricing' && (
          <PricingView 
            onStartDemo={onStartDemo} 
            onBack={() => switchTab('home')} 
            faqs={faqs}
            activeFaq={activeFaq}
            setActiveFaq={setActiveFaq}
          />
        )}
      </main>

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl"
          >
            <InstallGuide onClose={() => setShowInstallGuide(false)} />
          </motion.div>
        </div>
      )}

      {/* Unified World-Class Footer */}
      <footer className="bg-neutral-950 text-neutral-400 text-xs border-t border-neutral-800/80 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-16 border-b border-neutral-800/80">
            
            {/* Brand Column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-600/30">
                  <ShieldCheck size={18} />
                </div>
                <span className="font-black text-xl text-white tracking-tight">
                  KS Mester<span className="text-emerald-400">AI</span>
                </span>
              </div>
              <p className="text-neutral-400 leading-relaxed max-w-sm text-xs">
                Norges mest moderne og intuitive plattform for kvalitetssikring (KS), HMS-internkontroll, FDV og Mesterhjernen AI. Spesialbygget for norske håndverkere og entreprenører.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Sky-drift i Norge / EU (GDPR)
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 font-medium">
                  <Lock size={12} className="text-emerald-400" />
                  256-bit kryptering
                </div>
              </div>
            </div>

            {/* Column: Løsninger */}
            <div>
              <div className="text-white font-bold mb-4 uppercase tracking-wider text-[11px]">Løsninger</div>
              <ul className="space-y-2.5">
                <li><button onClick={() => switchTab('ai')} className="hover:text-white transition-colors text-left cursor-pointer">Mesterhjernen AI</button></li>
                <li><button onClick={() => switchTab('hms')} className="hover:text-white transition-colors text-left cursor-pointer">HMS & Vernerunder</button></li>
                <li><button onClick={() => switchTab('fdv')} className="hover:text-white transition-colors text-left cursor-pointer">FDV & Boligmappa</button></li>
                <li><button onClick={() => switchTab('home')} className="hover:text-white transition-colors text-left cursor-pointer">KS & TEK17 Sjekklister</button></li>
                <li><button onClick={() => switchTab('home')} className="hover:text-white transition-colors text-left cursor-pointer">Tilbud & Digital Kontrakt</button></li>
              </ul>
            </div>

            {/* Column: Produkt & Pris */}
            <div>
              <div className="text-white font-bold mb-4 uppercase tracking-wider text-[11px]">Produkt</div>
              <ul className="space-y-2.5">
                <li><button onClick={() => switchTab('pricing')} className="hover:text-white transition-colors text-left cursor-pointer">Priser & Pakker</button></li>
                <li><button onClick={onStartDemo} className="hover:text-white transition-colors text-left cursor-pointer">Kom i gang på 2 minutter</button></li>
                <li><button onClick={handleInstallApp} className="hover:text-white transition-colors text-left cursor-pointer">Mobil-app (PWA)</button></li>
                <li><button onClick={() => onViewChange('spec')} className="hover:text-white transition-colors text-left cursor-pointer">Teknisk spesifikasjon</button></li>
                <li><button onClick={() => onViewChange('contact')} className="hover:text-white transition-colors text-left cursor-pointer">Bestill demo</button></li>
              </ul>
            </div>

            {/* Column: Selskap & Juridisk */}
            <div>
              <div className="text-white font-bold mb-4 uppercase tracking-wider text-[11px]">Selskap</div>
              <ul className="space-y-2.5">
                <li><button onClick={() => onViewChange('about')} className="hover:text-white transition-colors text-left cursor-pointer">Om oss</button></li>
                <li><button onClick={() => onViewChange('contact')} className="hover:text-white transition-colors text-left cursor-pointer">Kontakt & Support</button></li>
                <li><button onClick={() => onViewChange('privacy')} className="hover:text-white transition-colors text-left cursor-pointer">Personvern (GDPR)</button></li>
                <li><button onClick={() => onViewChange('terms')} className="hover:text-white transition-colors text-left cursor-pointer">Vilkår & Betingelser</button></li>
                <li>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open_cookie_settings'))} 
                    className="hover:text-white transition-colors text-left cursor-pointer text-emerald-400 font-medium"
                  >
                    Informasjonskapsler
                  </button>
                </li>
                <li><a href="tel:+4740163082" className="hover:text-white transition-colors text-emerald-400 font-semibold">+47 401 63 082</a></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-neutral-500 text-[11px]">
            <p>© {new Date().getFullYear()} KS Mester AI AS. Alle rettigheter reservert.</p>
            <div className="flex items-center gap-6">
              <span>TEK17 & SAK10 godkjent metodikk</span>
              <span>Offisiell Boligmappa-partner</span>
              <span>Integrert mot Yr.no</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* =========================================================================
   1. HOME OVERVIEW (HERO, VALUE, SHOWCASE, ROI, FAQ, TRUST)
   ========================================================================= */
function HomeView({
  onStartDemo,
  onSwitchTab,
  handlePortalSubmit,
  projectCode,
  setProjectCode,
  cameraStep,
  setCameraStep,
  selectedCamProject,
  setSelectedCamProject,
  selectedCamTarget,
  setSelectedCamTarget,
  faqs,
  activeFaq,
  setActiveFaq,
  activeShowcaseTab,
  setActiveShowcaseTab,
  workerCount,
  setWorkerCount,
  hourlyRate,
  setHourlyRate,
  onViewChange
}: any) {
  // Estimated monthly savings calculation
  const hoursSavedPerWorkerMonth = 14; // conservative estimate (3.5 hours per week)
  const totalHoursSavedMonth = workerCount * hoursSavedPerWorkerMonth;
  const monetarySavingsMonth = totalHoursSavedMonth * hourlyRate;
  const monetarySavingsYear = monetarySavingsMonth * 11; // 11 working months
  const monthlyCostEstimate = workerCount <= 3 ? 490 * workerCount : 890 * workerCount;
  const estimatedRoi = Math.round((monetarySavingsMonth / monthlyCostEstimate) * 100);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-neutral-200/80 bg-gradient-to-b from-white via-neutral-50/50 to-neutral-100/30">
        
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-emerald-500/10 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Top Pill Announcement */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-tight shadow-sm hover:bg-emerald-100 transition-colors">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
              <ShieldCheck size={15} className="text-emerald-600" />
              <span>Det ledende KS-, HMS- og FDV-systemet for norsk byggebransje</span>
            </div>
          </div>

          {/* Main Hero Headline */}
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-neutral-950 leading-[1.08] mb-6">
              Byggelederen i lomma di. <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent">
                Snakk rett inn i Teams, Slack eller WhatsApp.
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
              Ferdig med papirkaos og kveldsarbeid. Gjennomfør SJA med tale, oppdag TEK17-avvik med kamera, og send komplett FDV direkte til Boligmappa med ett klikk.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button 
                onClick={onStartDemo}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-600/25 active:scale-95 group cursor-pointer"
              >
                <span>Kom i gang på 2 minutter</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => onSwitchTab('ai')}
                className="w-full sm:w-auto bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300/80 px-8 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Sparkles size={18} className="text-emerald-600" />
                <span>Se Mesterhjernen AI</span>
              </button>
            </div>

            {/* Trust highlights */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-500 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Ingen kredittkort kreves
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> 100 % TEK17 / SAK10 kompatibelt
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Fungerer 100 % offline på byggeplass
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Norsk personvern & support
              </span>
            </div>
          </div>

          {/* Hero Realistic Mockup Visual (App preview with live interactive elements) */}
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="bg-neutral-900 rounded-[2.5rem] p-4 sm:p-6 shadow-2xl border border-neutral-800 relative overflow-hidden text-white">
              
              {/* Window Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 text-xs font-mono text-neutral-400">KS Mester AI — Aktiv Byggeplass: Villa Holmenkollen</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Offline Synk Klar
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">PWA v2.8</span>
                </div>
              </div>

              {/* Mockup Dashboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Card 1: Voice SJA with Waveform */}
                <div className="bg-neutral-800/90 rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Mic size={15} /> Tale-til-SJA
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">Aktiv opptak</span>
                    </div>
                    <p className="text-xs text-neutral-300 mb-4 font-mono">
                      "Vi skal montere stillas i 3. etg. Yr varsler vindkast 14 m/s. Bruker fallsikringssele og forankrer i betongdekke."
                    </p>
                    {/* Simulated Audio Waveform */}
                    <div className="flex items-center justify-between gap-1 h-8 bg-neutral-900/90 px-3 rounded-xl border border-white/5 mb-3">
                      {[15, 35, 65, 85, 45, 95, 75, 40, 60, 90, 100, 70, 40, 20, 50, 80, 60, 30].map((h, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-emerald-400 rounded-full transition-all duration-300"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> SJA generert iht. Arbeidstilsynets forskrift
                  </div>
                </div>

                {/* Card 2: AI Vision TEK17 Quality Inspection */}
                <div className="bg-neutral-800/90 rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                        <Camera size={15} /> AI TEK17 Visjon
                      </span>
                      <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-bold">Foto-analyse</span>
                    </div>
                    <div className="bg-neutral-900/90 rounded-xl p-3 border border-white/5 mb-3 text-xs space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-neutral-300 font-medium">Slukmansjett & Membran</span>
                        <span className="text-emerald-400 font-bold font-mono">99.4% Match</span>
                      </div>
                      <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full w-[99%]" />
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-snug">
                        ✓ Klemring korrekt montert <br />
                        ✓ Fall mot sluk: 1:50 i dusjsone oppfylt <br />
                        ✓ Automatisk merket for FDV-overlevering
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] text-teal-300 font-bold flex items-center gap-1">
                    <ShieldCheck size={12} /> TEK17 § 13-15 Våtromsattest generert
                  </div>
                </div>

                {/* Card 3: 1-Click Boligmappa Export */}
                <div className="bg-neutral-800/90 rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                        <Cloud size={15} /> Boligmappa Synk
                      </span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">Matrikkel Koblet</span>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="p-2.5 bg-neutral-900/90 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                        <span className="text-neutral-300">Gnr 34, Bnr 112 (Oslo)</span>
                        <span className="text-emerald-400 font-bold">Klar</span>
                      </div>
                      <div className="p-2.5 bg-neutral-900/90 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                        <span className="text-neutral-300">42 NOBB-produktdatablad</span>
                        <span className="text-emerald-400 font-bold">Hentet</span>
                      </div>
                      <div className="p-2.5 bg-neutral-900/90 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                        <span className="text-neutral-300">Ferdigattest pakke</span>
                        <span className="text-emerald-400 font-bold">Generert</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={onStartDemo}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} /> Send alt til Boligmappa
                  </button>
                </div>

              </div>

              {/* Bottom Quick Customer Portal Input strip */}
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-neutral-300">
                  <Users size={16} className="text-emerald-400 shrink-0" />
                  <span>Byggherre eller boligeier? Få direkte innsyn i prosjektet ditt:</span>
                </div>
                <form onSubmit={handlePortalSubmit} className="flex gap-2 w-full sm:w-auto">
                  <input 
                    type="text" 
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                    placeholder="Tast prosjektkode (f.eks. PRO-102)"
                    className="bg-black/50 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 w-full sm:w-48"
                  />
                  <button 
                    type="submit"
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border border-white/10 shrink-0 cursor-pointer"
                  >
                    Åpne Portal
                  </button>
                </form>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Trust & Ecosystem Bar */}
      <section className="py-8 bg-white border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="text-xs font-black uppercase tracking-widest text-neutral-400 shrink-0">
              Sertifiseringer & Integrasjonspartnere:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-neutral-600 font-black text-xs tracking-wider opacity-75 hover:opacity-100 transition-opacity">
              <span className="hover:text-emerald-600 transition-colors">BOLIGMAPPA INTEGRERT</span>
              <span className="hover:text-emerald-600 transition-colors">TRIPLETEX API</span>
              <span className="hover:text-emerald-600 transition-colors">POWEROFFICE GO</span>
              <span className="hover:text-emerald-600 transition-colors">TEK17 / SAK10</span>
              <span className="hover:text-emerald-600 transition-colors">SINTEF BYGGFORSK</span>
              <span className="hover:text-emerald-600 transition-colors">YR.NO VÆRDATA</span>
            </div>
          </div>
        </div>
      </section>

      {/* THREE CORE PILLARS (Modular overview cards) */}
      <section className="py-20 bg-neutral-900 text-white border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              Helhetlig Bygg-økosystem
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
              Alt samlet på én intelligent plattform
            </h2>
            <p className="text-neutral-400 text-base sm:text-lg">
              KS Mester erstatter 5-6 fragmenterte apper og papirpermer med tre samspilte kjernemoduler.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* 1. Mester-hjernen Card */}
            <div className="bg-neutral-950/90 rounded-3xl p-8 border border-emerald-500/30 hover:border-emerald-500 transition-all group flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center font-bold mb-6">
                  <Sparkles size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block mb-3">
                  15+ AI-verktøy
                </span>
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-emerald-400 transition-colors">
                  Mesterhjernen AI
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                  Norsk AI spesialtrent på byggebransjen. Gjennomfør SJA med stemmen, sjekk monteringer mot TEK17 med kamera, og få automatiske tilbudskalkyler.
                </p>
                <ul className="space-y-2.5 text-xs text-neutral-300 mb-8 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Værbasert SJA via Yr.no</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> AI bildeanalyse for sluk og membran</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Flerspråklig oversettelse for arbeidere</li>
                </ul>
              </div>
              <button 
                onClick={() => onSwitchTab('ai')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <span>Utforsk Mesterhjernen AI</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* 2. HMS & Internkontroll Card */}
            <div className="bg-neutral-950/90 rounded-3xl p-8 border border-neutral-800 hover:border-emerald-500 transition-all group flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center font-bold mb-6">
                  <ShieldCheck size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 inline-block mb-3">
                  Oppfyller alle lovkrav
                </span>
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-blue-400 transition-colors">
                  HMS & Vernerunder
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                  Systematisk HMS iht. Arbeidstilsynet og Internkontrollforskriften. Digitale vernerunder, stoffkartotek for kjemikalier, RUH og lærlingoppfølging.
                </p>
                <ul className="space-y-2.5 text-xs text-neutral-300 mb-8 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Raske vernerunder på mobil</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Digitalt stoffkartotek med SDS-datablad</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Lærlingmodul med kompetansemål</li>
                </ul>
              </div>
              <button 
                onClick={() => onSwitchTab('hms')}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <span>Utforsk HMS-system</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* 3. FDV & Boligmappa Card */}
            <div className="bg-neutral-950/90 rounded-3xl p-8 border border-neutral-800 hover:border-emerald-500 transition-all group flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 bg-teal-500/20 text-teal-400 rounded-2xl flex items-center justify-center font-bold mb-6">
                  <FileCheck size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20 inline-block mb-3">
                  1-klikks overlevering
                </span>
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-teal-400 transition-colors">
                  FDV & Boligmappa
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                  FDV-dokumentasjonen bygges automatisk mens du utfører arbeidet. Ingen stress kvelden før overtakelse – send alt rett til Boligmappa med ett trykk.
                </p>
                <ul className="space-y-2.5 text-xs text-neutral-300 mb-8 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Direkte kobling mot NOBB varedatabase</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Godkjent Boligmappa-overføring</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Komplett ferdigattest-rapport i PDF</li>
                </ul>
              </div>
              <button 
                onClick={() => onSwitchTab('fdv')}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <span>Utforsk FDV & Boligmappa</span>
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* INTERACTIVE PRODUCT TOUR (Tabbed live showcase like Linear / Stripe) */}
      <section className="py-24 bg-white border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100">
              Interaktiv Produkttour
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
              Se hvordan KS Mester fungerer i praksis
            </h2>
            <p className="text-neutral-600 text-base">
              Klikk gjennom nøkkelfunksjonene og se hvor enkelt håndverkerne løser dokumentasjonskravene ute i felt.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex justify-center mb-10 overflow-x-auto no-scrollbar py-2">
            <div className="inline-flex bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200 gap-1 sm:gap-2">
              {[
                { id: 'ai', label: '🧠 Mesterhjernen AI', desc: 'Tale og analyse' },
                { id: 'ks', label: '📋 KS & TEK17', desc: 'Sjekklister' },
                { id: 'hms', label: '🛡️ HMS & SJA', desc: 'Internkontroll' },
                { id: 'fdv', label: '📁 FDV-pakke', desc: 'Boligmappa' },
                { id: 'kontrakt', label: '✍️ Tilbud & Kontrakt', desc: 'Digital signering' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveShowcaseTab(tab.id as any)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex flex-col sm:flex-row items-center gap-1 sm:gap-2 cursor-pointer",
                    activeShowcaseTab === tab.id
                      ? "bg-white text-neutral-900 shadow-md border border-neutral-200/80"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50"
                  )}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Showcase Content Panel */}
          <div className="bg-neutral-950 rounded-[2.5rem] p-6 sm:p-10 border border-neutral-800 text-white shadow-2xl relative">
            <AnimatePresence mode="wait">
              {activeShowcaseTab === 'ai' && (
                <motion.div 
                  key="ai" 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
                >
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      DeepMind Gemini AI Integrasjon
                    </span>
                    <h3 className="text-3xl font-black">Full SJA fullført på 45 sekunder med stemmen</h3>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      Hold inne knappen og snakk rett inn i mobilen mens du går over byggeplassen. Mesterhjernen kobler automatisk på sanntids værdata fra Yr.no, sjekker TEK17-forskrifter og genererer en ferdig godkjent SJA-rapport.
                    </p>
                    <div className="space-y-3 text-xs font-medium text-neutral-300">
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Værbasert farevarsel for vind, frost og nedbør</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Automatisk forslag til verneutstyr og sikringstiltak</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Direkte eksport og signering på byggeplass</div>
                    </div>
                    <button onClick={onStartDemo} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer">
                      Prøv Mesterhjernen gratis <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="bg-neutral-900 rounded-2xl p-6 border border-white/10 space-y-4 font-mono text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <span className="text-emerald-400 font-bold flex items-center gap-2">
                        <Mic size={16} /> Tale-transkribering aktiv
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">99.8% Norsk nøyaktighet</span>
                    </div>
                    <div className="p-3 bg-black/50 rounded-xl text-neutral-300 border border-white/5">
                      "Skal kappe og montere bærende limtredrager over garasjeport. To tømrere. Yr melder regn og 3 grader."
                    </div>
                    <div className="p-4 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-emerald-200 space-y-2">
                      <div className="text-xs font-bold text-emerald-400">Genererte SJA-tiltak (TEK17 § 11-1):</div>
                      <p className="text-[11px] text-neutral-300">• Løftestropper med gyldig årskontroll påkrevet</p>
                      <p className="text-[11px] text-neutral-300">• Sklihemmende underlag og vernesko pga. glatte flater</p>
                      <p className="text-[11px] text-neutral-300">• Avsperring av faresone under løft</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeShowcaseTab === 'ks' && (
                <motion.div 
                  key="ks" 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
                >
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                      SAK10 & TEK17 Kontroll
                    </span>
                    <h3 className="text-3xl font-black">Sjekklister og avvikshåndtering som aldri svikter</h3>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      Glem tapte lapper og uleselig håndskrift. Hvert bilde tagges automatisk med GPS-koordinater, tidspunkt, prosjekt og bygningsdel. Oppstår et avvik, tildeles det til riktig person med frist og varsling.
                    </p>
                    <div className="space-y-3 text-xs font-medium text-neutral-300">
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-400" /> Ferdige sjekklister for alle fag (tømrer, rør, el, maler)</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-400" /> Lukking av avvik med før- og etter-bilder</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-400" /> Uavhengig kontrollrapport klar for kommunen</div>
                    </div>
                    <button onClick={onStartDemo} className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer">
                      Se KS-malene <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="bg-neutral-900 rounded-2xl p-6 border border-white/10 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <span className="font-bold text-white">Sjekkliste: Våtrom Membran (TEK17)</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded font-bold">100% Gjennomført</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 bg-neutral-800 rounded-xl flex items-center justify-between">
                        <span>1. Rørgjennomføringer forseglet med mansjett</span>
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      </div>
                      <div className="p-3 bg-neutral-800 rounded-xl flex items-center justify-between">
                        <span>2. Fall mot sluk kontrollert (minimum 1:50)</span>
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      </div>
                      <div className="p-3 bg-neutral-800 rounded-xl flex items-center justify-between">
                        <span>3. Klemring montert og tilskrudd</span>
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeShowcaseTab === 'hms' && (
                <motion.div 
                  key="hms" 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
                >
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                      Arbeidstilsynet & AML Krav
                    </span>
                    <h3 className="text-3xl font-black">Digital vernerunde, stoffkartotek og RUH</h3>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      Sørg for at bedriften alltid er 100 % forberedt på tilsyn. Med digital HMS-håndbok, enkelt stoffkartotek med sikkerhetsdatablad på mobilen, og lynrask registrering av uønskede hendelser (RUH).
                    </p>
                    <div className="space-y-3 text-xs font-medium text-neutral-300">
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400" /> Automatisk oppdatert lovverk og internkontroll</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400" /> Stoffkartotek med QR-koder og faresymboler</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400" /> Lærlingoppfølging med logg og kompetansemål</div>
                    </div>
                    <button onClick={onStartDemo} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer">
                      Test HMS-modulen <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="bg-neutral-900 rounded-2xl p-6 border border-white/10 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <span className="font-bold text-white flex items-center gap-2">
                        <Flame size={16} className="text-amber-400" /> Stoffkartotek (Kjemikalier)
                      </span>
                      <span className="text-[10px] text-neutral-400">Sikkerhetsdatablad</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 bg-neutral-800 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">Casco Superfix Monteringslim</p>
                          <p className="text-[10px] text-neutral-400">Oppbevares frostfritt • Ventilasjon påkrevet</p>
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">SDS gyldig</span>
                      </div>
                      <div className="p-3 bg-neutral-800 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">Sika Primer-206 G+P</p>
                          <p className="text-[10px] text-neutral-400">Bruk nitrilhansker og gassmaske A2/P3</p>
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">SDS gyldig</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeShowcaseTab === 'fdv' && (
                <motion.div 
                  key="fdv" 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
                >
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      Boligmappa Integrasjon
                    </span>
                    <h3 className="text-3xl font-black">FDV som bygger seg selv mens prosjektet pågår</h3>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      Når du bruker materialer og tar bilder i sjekklister, henter KS Mester automatisk FDV-dokumenter fra NOBB. Ved overtakelse trykker du én knapp, og alt overføres direkte til boligens Boligmappe.
                    </p>
                    <div className="space-y-3 text-xs font-medium text-neutral-300">
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Sparer 4-6 timer per byggeprosjekt</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Raskere sluttoppgjør og fakturering</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Profesjonell overlevering som imponerer byggherren</div>
                    </div>
                    <button onClick={onStartDemo} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer">
                      Se Boligmappa-overføring <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="bg-neutral-900 rounded-2xl p-6 border border-white/10 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <span className="font-bold text-white">Eksport-status: Boligmappa</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">100% Synkronisert</span>
                    </div>
                    <div className="p-4 bg-neutral-800 rounded-xl space-y-2">
                      <div className="flex justify-between text-neutral-300">
                        <span>Dokumentpakke</span>
                        <span className="text-emerald-400 font-bold">FDV_Sluttrapport.pdf</span>
                      </div>
                      <div className="flex justify-between text-neutral-300">
                        <span>Eiendom</span>
                        <span className="text-white">Gnr 45, Bnr 2 (Sandvika)</span>
                      </div>
                      <div className="flex justify-between text-neutral-300">
                        <span>Mottaker</span>
                        <span className="text-white">Huseier verifisert med BankID</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeShowcaseTab === 'kontrakt' && (
                <motion.div 
                  key="kontrakt" 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
                >
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                      NS 8406 & Håndverkertjenesteloven
                    </span>
                    <h3 className="text-3xl font-black">Tilbud, endringsmeldinger og digital signatur</h3>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      Unngå konflikter om tilleggsarbeid. Send endringsmelding (varsel om endring) rett fra mobilen. Kunden godkjenner og signerer digitalt på under ett minutt før arbeidet starter.
                    </p>
                    <div className="space-y-3 text-xs font-medium text-neutral-300">
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-400" /> Juridisk bindende digital signering</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-400" /> Endringsmeldinger med automatisk priskonsekvens</div>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-400" /> Kundeportal for direkte aksept og dialog</div>
                    </div>
                    <button onClick={onStartDemo} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer">
                      Se kontraktflyten <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="bg-neutral-900 rounded-2xl p-6 border border-white/10 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <span className="font-bold text-white">Endringsmelding #04 (Tilleggsarbeid)</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">Signert av Byggherre</span>
                    </div>
                    <div className="p-3 bg-neutral-800 rounded-xl space-y-1.5">
                      <p className="text-neutral-300 font-bold">Montering av ekstra downlights i stue (6 stk)</p>
                      <p className="text-[11px] text-neutral-400">Totalbeløp: kr 14 500,- eks. mva.</p>
                      <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-2">
                        <CheckCircle2 size={12} /> Signert via SMS-lenke kl. 14:12 i dag
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* INTERACTIVE VALUE & ROI CALCULATOR */}
      <section className="py-24 bg-neutral-50 border-b border-neutral-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100/60 px-3.5 py-1.5 rounded-full border border-emerald-200">
              Lønnsomhetskalkulator
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
              Hvor mye sparer din bedrift?
            </h2>
            <p className="text-neutral-600 text-base">
              Juster antall ansatte og timepris for å se estimert tids- og kostnadsbesparelse med KS Mester AI.
            </p>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 border border-neutral-200/90 shadow-xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left: Sliders */}
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                    <Users size={18} className="text-emerald-600" />
                    Antall håndverkere / ansatte:
                  </label>
                  <span className="text-2xl font-black text-emerald-600">{workerCount} ansatte</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="40" 
                  value={workerCount} 
                  onChange={(e) => setWorkerCount(parseInt(e.target.value))}
                  className="w-full h-2.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[11px] text-neutral-400 mt-1 font-mono">
                  <span>1 ansatt</span>
                  <span>20 ansatte</span>
                  <span>40 ansatte</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-600" />
                    Gjennomsnittlig fakturerbar timepris:
                  </label>
                  <span className="text-2xl font-black text-emerald-600">{hourlyRate} kr/time</span>
                </div>
                <input 
                  type="range" 
                  min="600" 
                  max="1400" 
                  step="50"
                  value={hourlyRate} 
                  onChange={(e) => setHourlyRate(parseInt(e.target.value))}
                  className="w-full h-2.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[11px] text-neutral-400 mt-1 font-mono">
                  <span>600 kr</span>
                  <span>1000 kr</span>
                  <span>1400 kr</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
                💡 <b>Erfaringsdata:</b> Håndverkerbedrifter som tar i bruk KS Mester AI kutter i snitt 3,5 timer papirarbeid og feilsøking per arbeider hver eneste uke.
              </div>
            </div>

            {/* Right: Calculation Results */}
            <div className="bg-neutral-900 rounded-3xl p-8 text-white border border-neutral-800 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
                  Beregnet gevinst for din bedrift:
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white mt-3 mb-1">
                  ca. {monetarySavingsYear.toLocaleString('nb-NO')} kr
                </div>
                <p className="text-xs text-neutral-400 mb-8 font-medium">estimert frigjort verdi per år</p>

                <div className="space-y-4 pt-4 border-t border-white/10 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Frigjorte timer per måned:</span>
                    <span className="font-bold text-emerald-400 text-base">{totalHoursSavedMonth} timer/mnd</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Månedlig frigjort verdi:</span>
                    <span className="font-bold text-white text-base">{monetarySavingsMonth.toLocaleString('nb-NO')} kr/mnd</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Beregnet ROI (avkastning):</span>
                    <span className="font-black text-emerald-400 text-lg">+{estimatedRoi}%</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={onStartDemo}
                className="mt-8 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <span>Begynn å spare tid i dag — Prøv gratis</span>
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* PROBLEM VS SOLUTION ("Før vs Nå") */}
      <section className="py-24 bg-white border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100">
              Hverdagen på byggeplassen
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
              Slutt på papirkaos og tapte kvelder
            </h2>
            <p className="text-neutral-500 text-base">
              Se forskjellen på den tradisjonelle måten å drive byggeprosjekter på vs. hverdagen med KS Mester AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Uten KS Mester */}
            <div className="bg-red-50/40 rounded-3xl p-8 sm:p-10 border border-red-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6 text-red-700">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                    <X size={20} />
                  </div>
                  <h3 className="text-2xl font-bold">Uten KS Mester</h3>
                </div>
                <ul className="space-y-4 text-sm text-neutral-700 font-medium">
                  <li className="flex items-start gap-3">
                    <X size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <span>Timer brukt ved kjøkkenbordet om kvelden på å lete etter FDV-ark og datablad</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <span>Bilder spredt på private mobiler – umulig å bevise hvem som gjorde hva ved tvister</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <span>SJA blir ofte en glemt papirlapp i firmabilen i stedet for et levende HMS-verktøy</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <span>Uenighet med byggherre om tilleggsarbeid fordi muntlige avtaler manglet skriftlig signatur</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <span>Forsinket sluttoppgjør fordi ferdigattest og Boligmappa-overlevering tok uker</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Med KS Mester */}
            <div className="bg-emerald-50/50 rounded-3xl p-8 sm:p-10 border border-emerald-200/90 flex flex-col justify-between shadow-lg shadow-emerald-500/5">
              <div>
                <div className="flex items-center gap-3 mb-6 text-emerald-800">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} className="text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold">Med KS Mester AI</h3>
                </div>
                <ul className="space-y-4 text-sm text-neutral-800 font-medium">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>FDV bygges automatisk underveis – alt er 100 % klart idet siste spiker er slått</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>Kamera med AI sorterer bildene rett i prosjektmappen med geolokasjon og dato</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>Tale-SJA genererer risikovurderinger koblet til sanntids værdata på under ett minutt</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>Endringsmeldinger godkjennes av kunden på SMS før arbeidet starter – ingen tvister</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>1-klikks eksport til Boligmappa sikrer rask overtakelse og umiddelbar sluttfakturering</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SKREDDERSYDD FOR FAGENE (Trades) */}
      <section className="py-24 bg-neutral-50 border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100/60 px-3.5 py-1.5 rounded-full border border-emerald-200">
              For alle håndverksfag
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
              Tilpasset din bransje og dine sjekklister
            </h2>
            <p className="text-neutral-600 text-base">
              Systemet kommer ferdig konfigurert med bransjestandarder, sjekklister og HMS-rutiner for ditt fag.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: HardHat, 
                title: "Tømrer & Byggmester", 
                desc: "TEK17 sjekklister for råbygg, etterisolering, taktekking, dampsperre og våtrom. SAK10 kontrollpunkter." 
              },
              { 
                icon: Zap, 
                title: "Elektriker & El-installatør", 
                desc: "5 sikre, risikovurdering av el-anlegg, kursfortegnelser og samsvarserklæring overført til Boligmappa." 
              },
              { 
                icon: Building2, 
                title: "Rørlegger & VVS", 
                desc: "Trykktesting av rør, våtromsnormen, kran- og lekkasjesjekker, samt automatisk FDV fra NOBB." 
              },
              { 
                icon: Briefcase, 
                title: "Maler & Murer", 
                desc: "Overflatebehandling, fuktmålinger, membran, kjemikaliehåndtering i stoffkartotek og avviksflyt." 
              }
            ].map((b, i) => (
              <div key={i} className="p-7 bg-white rounded-3xl border border-neutral-200/90 hover:border-emerald-500/50 hover:shadow-xl transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center font-bold mb-5 border border-emerald-100">
                    <b.icon size={22} />
                  </div>
                  <h3 className="font-bold text-xl mb-2 text-neutral-900">{b.title}</h3>
                  <p className="text-neutral-600 text-xs leading-relaxed">{b.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <span>Ferdige sjekklister inkludert</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KUNDEREFERANSER & SOSIALT BEVIS */}
      <section className="py-24 bg-white border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100">
              Erfaringer fra feltet
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
              Hva sier norske håndverkere?
            </h2>
            <p className="text-neutral-600 text-base">
              Over 450 norske håndverkerbedrifter bruker KS Mester for å sikre kvalitet og spare tid.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "Mesterhjernen har spart oss for minst 4 timer papirarbeid per prosjekt. Guttene snakker inn SJA-en på mobilen, og jeg har full oversikt fra kontoret. Rett og slett fantastisk.",
                name: "Eirik Thorvaldsen",
                role: "Daglig leder & Byggmester",
                company: "Thorvaldsen Bygg AS (14 ansatte)"
              },
              {
                quote: "1-klikks eksport til Boligmappa alene er verdt hele månedsprisen. Kundene våre blir mektig imponert når de får komplett FDV-dokumentasjon samme ettermiddag som badet overleveres.",
                name: "Stian Berg",
                role: "Rørleggermester",
                company: "Viken Rør & Varme AS"
              },
              {
                quote: "Utenlandske arbeidere hos oss elsker at de kan bruke appen på polsk. Systemet oversetter alt automatisk til norsk for byggherren. Ingen misforståelser lenger.",
                name: "Krzysztof Kowalski",
                role: "Formann & Prosjektleder",
                company: "Nordic Fasade & Mur"
              }
            ].map((t, idx) => (
              <div key={idx} className="p-8 bg-neutral-50 rounded-3xl border border-neutral-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 text-amber-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-neutral-700 text-sm leading-relaxed mb-6 italic">
                    "{t.quote}"
                  </p>
                </div>
                <div className="pt-4 border-t border-neutral-200/60">
                  <p className="font-bold text-sm text-neutral-900">{t.name}</p>
                  <p className="text-xs text-neutral-500">{t.role}</p>
                  <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE SMART CAMERA DEMO */}
      <section className="py-24 bg-neutral-950 text-white border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              Interaktiv Simulator
            </span>
            <h2 className="text-3xl sm:text-5xl font-black mt-4 mb-4">
              Prøv Smart Kamera & Sortering
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base">
              Se hvor enkelt bilder og dokumentasjon knyttes direkte til prosjekt og sjekkliste.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-2xl">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-emerald-400" />
                <span className="font-bold">KS Mester Kamera & TEK17 Analyse</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold">
                Steg {cameraStep} av 3
              </span>
            </div>

            {cameraStep === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-neutral-300 font-medium">1. Velg hvilket prosjekt du fotograferer:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['Enebolig Nordstrand', 'Solberg Rekkehus', 'Kontorbygg Lysaker'].map((p) => (
                    <button 
                      key={p} 
                      onClick={() => setSelectedCamProject(p)}
                      className={cn(
                        "p-3.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer",
                        selectedCamProject === p ? "bg-emerald-600/20 border-emerald-500 text-emerald-300" : "bg-neutral-800 border-white/10 hover:border-white/20 text-neutral-300"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCameraStep(2)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-xs mt-4 transition-all cursor-pointer"
                >
                  Neste: Velg sjekkliste eller kontrollpunkt →
                </button>
              </div>
            )}

            {cameraStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-neutral-300 font-medium">2. Velg sjekklistepunkt for {selectedCamProject}:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['Sjekkliste: Våtrom TEK17', 'Vernerunde & Stillas', 'Kledning & Membran'].map((t) => (
                    <button 
                      key={t} 
                      onClick={() => setSelectedCamTarget(t)}
                      className={cn(
                        "p-3.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer",
                        selectedCamTarget === t ? "bg-emerald-600/20 border-emerald-500 text-emerald-300" : "bg-neutral-800 border-white/10 hover:border-white/20 text-neutral-300"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setCameraStep(1)} className="bg-neutral-800 px-4 py-3 rounded-xl text-xs font-bold cursor-pointer">Tilbake</button>
                  <button onClick={() => setCameraStep(3)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs transition-all cursor-pointer">
                    Simuler bildeknips med TEK17-sjekk 📸
                  </button>
                </div>
              </div>
            )}

            {cameraStep === 3 && (
              <div className="text-center space-y-4 py-6">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="font-bold text-xl text-white">Bilde analysert og arkivert!</h4>
                <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
                  Bildet er lagret under <span className="text-emerald-400 font-mono font-bold">{selectedCamProject}</span> i sjekklisten <span className="text-emerald-400 font-mono font-bold">{selectedCamTarget}</span>. FDV-pakken for Boligmappa er oppdatert automatisk.
                </p>
                <div className="pt-2">
                  <button onClick={() => setCameraStep(1)} className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">
                    Prøv på nytt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-24 bg-neutral-50 border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100/60 px-3.5 py-1.5 rounded-full border border-emerald-200">
              Ofte stilte spørsmål
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-4">
              Alt du lurer på om KS Mester AI
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq: any, idx: number) => (
              <div key={idx} className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-sm">
                <button 
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm flex items-center justify-between text-neutral-900 cursor-pointer"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown size={18} className={cn("transition-transform text-neutral-400 shrink-0", activeFaq === idx && "rotate-180 text-emerald-600")} />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL HIGH-CONVERTING CTA */}
      <section className="py-24 bg-gradient-to-br from-neutral-950 via-neutral-900 to-emerald-950 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 inline-block mb-4">
            Kom i gang på 5 minutter
          </span>
          <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight">
            Klar til å oppleve Mester-kvalitet?
          </h2>
          <p className="text-neutral-300 text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed">
            Kom i gang med din autonome byggeleder i dag. Ingen bindingstid, ingen kredittkort, standard bedriftsfaktura og full personlig oppfølging.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStartDemo} 
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Kom i gang på 2 minutter
            </button>
            <button 
              onClick={() => onSwitchTab('pricing')} 
              className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold text-sm transition-all cursor-pointer"
            >
              Se priser og pakker
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================================================================
   2. MESTER-HJERNEN (AI) DEDICATED VIEW
   ========================================================================= */
function MesterHjernenView({ onStartDemo, onBack }: { onStartDemo: () => void, onBack: () => void }) {
  return (
    <div className="bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Top Hero Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 inline-flex items-center gap-2 mb-6">
              <Sparkles size={14} className="text-emerald-400" />
              Mesterhjernen AI — v2.5 DeepMind
            </span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-6">
              AI som forstår <br />
              <span className="text-emerald-400">håndverkerens hverdag</span>
            </h1>
            <p className="text-neutral-300 text-base sm:text-lg mb-8 leading-relaxed">
              Mesterhjernen er en serie spesialtrente AI-modeller bygget for bygg- og anleggsbransjen. Smart søk med naturlig språk, tale-til-SJA, sanntids væranalyse fra Yr, bildekontroll mot TEK17 og automatiske tilbud.
            </p>

            <div className="flex flex-wrap gap-3 mb-8 text-xs font-bold">
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> 15+ AI-funksjoner
              </span>
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Norsk språk & standarder
              </span>
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Lærer av dine data
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onStartDemo}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
              >
                Prøv Mesterhjernen gratis
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Interactive Chat Mockup */}
          <div className="bg-neutral-900 rounded-3xl p-6 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Mesterhjernen AI</h3>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Aktiv
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-mono font-bold">
                Spesialisert for bygg
              </span>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="flex justify-end">
                <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs font-medium max-w-[85%] shadow-md">
                  "Vis meg alle åpne avvik på Solberg-prosjektet og foreslå tiltak iht. TEK17"
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-neutral-800 border border-white/10 text-neutral-200 p-4 rounded-2xl rounded-tl-xs max-w-[95%] space-y-2">
                  <p className="font-semibold text-emerald-400">Fant 2 åpne avvik på Villa Solberg:</p>
                  <div className="space-y-1.5 text-neutral-300 font-mono text-[11px]">
                    <div className="p-2.5 bg-neutral-900/80 rounded-lg border border-red-500/30 text-red-300">
                      <span className="font-bold text-red-400">#47</span> Manglende mansjett ved rørgjennomføring i våtrom.
                      <p className="text-[10px] text-neutral-400 mt-1 font-sans">Tiltak: Monter godkjent mansjett med smøremembran iht. Byggforsk 541.805.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-900/80 rounded-lg border border-amber-500/30 text-amber-300">
                      <span className="font-bold text-amber-400">#52</span> Fall mot sluk måles til 1:80 (krav er 1:50 i dusjsone).
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="bg-neutral-950 border border-white/15 rounded-xl px-4 py-3 text-neutral-500 flex items-center justify-between cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={onStartDemo}>
                  <span className="text-xs">Still Mesterhjernen et spørsmål...</span>
                  <Bot size={16} className="text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 15+ AI Features Grid */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">15+ AI-funksjoner</span>
            <h2 className="text-2xl sm:text-4xl font-black mt-2">
              Et komplett AI-økosystem for håndverkeren
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                tag: "Mest brukt",
                tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                title: "Smart Søk med Naturlig Språk",
                desc: "Søk på tvers av prosjekter, sjekklister, FDV og HMS. «Hva brukte vi av membran på Solberg-jobben i mai?»"
              },
              {
                tag: "Unik i Norge",
                tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                title: "Værbasert SJA-analyse",
                desc: "Henter sanntids værdata fra Yr.no og foreslår automatiske sikringstiltak ved vind, kulde og nedbør."
              },
              {
                tag: "Banebrytende",
                tagColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
                title: "Gemini Vision TEK17 Kontroll",
                desc: "Ta bilde av sluk, mansjett eller dampsperre. AI analyserer monteringen og verifiserer mot forskriftskrav."
              },
              {
                tag: "Lønnsomhet",
                tagColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
                title: "AI Tilbudsgenerator & Kalkyle",
                desc: "Skriv stikkord, få ferdig kalkulerte tilbud med NS-kontraktvilkår basert på dine tidligere erfaringstall."
              },
              {
                tag: "Flerspråklig",
                tagColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
                title: "Byggeplass-oversetter",
                desc: "Automatisk oversettelse mellom norsk, polsk, litauisk og engelsk for feilfri kommunikasjon ute på plassen."
              },
              {
                tag: "Effektivitet",
                tagColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
                title: "Automatisk Avvikskategorisering",
                desc: "Sorterer avvik rett inn i riktig alvorlighetsgrad og varsler ansvarlig utførende umiddelbart."
              }
            ].map((feat, idx) => (
              <div key={idx} className="bg-white/5 rounded-3xl p-6 border border-white/10 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                <div>
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border mb-4 inline-block", feat.tagColor)}>
                    {feat.tag}
                  </span>
                  <h3 className="text-xl font-bold mb-2 text-white">{feat.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-950 rounded-3xl p-10 border border-emerald-500/40 text-center flex flex-col items-center max-w-3xl mx-auto shadow-2xl mb-12">
          <h2 className="text-2xl sm:text-3xl font-black mb-3 text-white">
            Klar til å oppleve Mesterhjernen?
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200 mb-6 max-w-xl">
            Kom i gang på 2 minutter i dag og opplev hvordan AI kutter timer av arbeidsdagen din.
          </p>
          <button 
            onClick={onStartDemo}
            className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles size={16} />
            Opplev Mesterhjernen i dag
          </button>
        </div>

      </div>
    </div>
  );
}

/* =========================================================================
   3. HMS & SJA DEDICATED VIEW
   ========================================================================= */
function HMSView({ onStartDemo, onBack, onGoToPricing }: { onStartDemo: () => void, onBack: () => void, onGoToPricing: () => void }) {
  return (
    <div className="bg-white text-neutral-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* HMS Hero Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <span className="text-emerald-700 text-xs font-bold uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200/80 inline-flex items-center gap-2 mb-6">
              <ShieldCheck size={14} className="text-emerald-600" />
              HMS & Internkontroll
            </span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-6 text-neutral-900">
              HMS som <br />
              <span className="text-emerald-600">faktisk fungerer</span>
            </h1>
            <p className="text-neutral-600 text-base sm:text-lg mb-8 leading-relaxed">
              Oppfyll alle krav fra Arbeidstilsynet uten permer og papirkaos. Vernerunder, SJA, risikovurderinger, digitalt stoffkartotek og lærlingoppfølging – alt samlet i én app på mobilen.
            </p>

            <div className="flex flex-wrap gap-3 mb-8 text-xs font-bold">
              <span className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Oppfyller Arbeidsmiljøloven & IK
              </span>
              <span className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> AI-assistert SJA på under 1 minutt
              </span>
              <span className="bg-neutral-100 text-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-neutral-600" /> 100% Offline-støtte
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onStartDemo}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
              >
                Aktiver din AI-byggeleder
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Included HMS Modules Quick Visual */}
          <div className="bg-neutral-900 rounded-3xl p-8 border border-neutral-800 text-white shadow-2xl relative">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <ShieldCheck size={16} /> Alt inkludert i HMS-modulen
            </div>
            <h3 className="text-xl font-bold mb-6">Full kontroll på helse, miljø og sikkerhet</h3>

            <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Digitale vernerunder</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>SJA med Yr-værdata</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Risikovurderinger (5x5)</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>RUH-hendelser & nestenulykker</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Stoffkartotek med datablad</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Lærlingportal med mål</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lovkrav-oversikt */}
        <div className="mb-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Lovkrav
            </span>
            <h2 className="text-3xl font-black tracking-tight mt-3 mb-3">
              Alltid forberedt på Arbeidstilsynets kontroller
            </h2>
            <p className="text-neutral-500 text-sm">
              KS Mester oppfyller samtlige krav i Arbeidsmiljøloven, Internkontrollforskriften og Byggherreforskriften.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="font-black text-emerald-800 text-sm mb-1">Arbeidsmiljøloven</div>
              <div className="text-[11px] text-neutral-600">§ 3-1 Systematisk HMS-arbeid</div>
            </div>
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="font-black text-emerald-800 text-sm mb-1">Internkontroll</div>
              <div className="text-[11px] text-neutral-600">Dokumentasjonskrav for bedriften</div>
            </div>
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="font-black text-emerald-800 text-sm mb-1">Byggherreforskriften</div>
              <div className="text-[11px] text-neutral-600">SHA-plan & koordinering på plass</div>
            </div>
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="font-black text-emerald-800 text-sm mb-1">Kjemikalieforskriften</div>
              <div className="text-[11px] text-neutral-600">Stoffkartotek tilgjengelig på mobil</div>
            </div>
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="font-black text-emerald-800 text-sm mb-1">Opplæringsloven</div>
              <div className="text-[11px] text-neutral-600">Dokumentert lærlingoppfølging</div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-neutral-900 text-white rounded-3xl p-10 border border-neutral-800 text-center flex flex-col items-center max-w-3xl mx-auto shadow-2xl mb-12">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            Klar for enklere HMS i bedriften?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mb-6 max-w-xl">
            Kom i gang på 2 minutter i dag. Ingen kredittkort, ingen bindingstid.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={onStartDemo}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all shadow-xl active:scale-95 cursor-pointer"
            >
              Aktiver din AI-byggeleder
            </button>
            <button 
              onClick={onGoToPricing}
              className="bg-white/10 hover:bg-white/15 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold text-sm transition-all cursor-pointer"
            >
              Se priser
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

/* =========================================================================
   4. FDV & BOLIGMAPPA DEDICATED VIEW
   ========================================================================= */
function FDVView({ onStartDemo, onBack }: { onStartDemo: () => void, onBack: () => void }) {
  return (
    <div className="bg-neutral-950 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* FDV Hero Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 inline-flex items-center gap-2 mb-6">
              <FileCheck size={14} className="text-emerald-400" />
              FDV & Boligmappa Integrasjon
            </span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-6">
              FDV som <br />
              <span className="text-emerald-400">bygges mens du jobber</span>
            </h1>
            <p className="text-neutral-300 text-base sm:text-lg mb-8 leading-relaxed">
              Slutt på maraton-økter kvelden før overtakelse. KS Mester henter automatisk FDV-dokumenter fra NOBB og samler bildene fra sjekklistene. Med ett klikk sendes alt direkte til Boligmappa.
            </p>

            <div className="flex flex-wrap gap-3 mb-8 text-xs font-bold">
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Godkjent Boligmappa-partner
              </span>
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Kontinuerlig dokumentinnsamling
              </span>
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> NOBB-varedatabase
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onStartDemo}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
              >
                Aktiver din AI-byggeleder
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* FDV Fremdrift Interactive Card */}
          <div className="bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">Enebolig Sandvika</span>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <FileCheck size={18} className="text-emerald-400" /> FDV-ferdigstillelse
                </h3>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-500/30">
                100% Komplett
              </span>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="p-3 bg-neutral-800 rounded-xl flex items-center justify-between">
                <span>Produktdatablad (NOBB)</span>
                <span className="text-emerald-400 font-bold">18 stk lagt til</span>
              </div>
              <div className="p-3 bg-neutral-800 rounded-xl flex items-center justify-between">
                <span>Fotodokumentasjon</span>
                <span className="text-emerald-400 font-bold">34 bilder sortert</span>
              </div>
              <div className="p-3 bg-neutral-800 rounded-xl flex items-center justify-between">
                <span>Samsvarserklæring & Sluttattest</span>
                <span className="text-emerald-400 font-bold">Signert</span>
              </div>
            </div>

            <button 
              onClick={onStartDemo}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer"
            >
              <Cloud size={16} />
              Eksporter til Boligmappa med 1 klikk
            </button>
          </div>
        </div>

        {/* FDV Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mb-16">
          <div className="p-6 bg-neutral-900 rounded-2xl border border-neutral-800">
            <div className="text-4xl font-black text-emerald-400 mb-1">5+ timer</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">Spart per prosjekt</div>
          </div>
          <div className="p-6 bg-neutral-900 rounded-2xl border border-neutral-800">
            <div className="text-4xl font-black text-emerald-400 mb-1">100%</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">Automatisk kategorisering</div>
          </div>
          <div className="p-6 bg-neutral-900 rounded-2xl border border-neutral-800">
            <div className="text-4xl font-black text-emerald-400 mb-1">1 klikk</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">Overføring til Boligmappa</div>
          </div>
          <div className="p-6 bg-neutral-900 rounded-2xl border border-neutral-800">
            <div className="text-4xl font-black text-emerald-400 mb-1">0 stress</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">Før ferdigattest</div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-neutral-900 text-white rounded-3xl p-10 border border-emerald-500/40 text-center flex flex-col items-center max-w-3xl mx-auto shadow-2xl mb-12">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            Klar for automatisk FDV?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mb-6 max-w-xl">
            Aktiver din AI-byggeleder og se hvor mye tid du sparer på hvert eneste prosjekt.
          </p>
          <button 
            onClick={onStartDemo}
            className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            Aktiver din AI-byggeleder
          </button>
        </div>

      </div>
    </div>
  );
}

/* =========================================================================
   5. PRISER DEDICATED VIEW (HARMONIZED & TRANSPARENT)
   ========================================================================= */
function PricingView({ onStartDemo, onBack, faqs, activeFaq, setActiveFaq }: any) {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      id: 'solo',
      tag: 'Enkeltpersonforetak & små lag',
      name: 'Mester Solo',
      desc: 'For deg som jobber alene eller har inntil 3 håndverkere i felt.',
      monthlyPrice: 990,
      annualPrice: 890,
      popular: false,
      features: [
        'Inntil 3 fagarbeidere',
        'Autonom AI-agent i WhatsApp, SMS, Teams eller Web',
        'Ubegrenset stemme-til-byggedagbok på farten',
        'Automatisk værdata via Yr.no i alle rapporter (0 kr/tokens)',
        'SJA-generator med risikovurdering iht. TEK17',
        'Lovpålagte TEK17 & SAK10 sjekklister for alle fag',
        '1-klikks Boligmappa & PDF-eksport',
        'Norsk personlig support og oppstartshjelp'
      ]
    },
    {
      id: 'team',
      tag: 'Mest populær',
      name: 'Mester Team',
      desc: 'For voksende håndverkerbedrifter fra 4 til 15 ansatte.',
      monthlyPrice: 2490,
      annualPrice: 1990,
      popular: true,
      features: [
        'Inntil 15 fagarbeidere / prosjekter',
        'Alt i Mester Solo, pluss:',
        'Full integrasjon i bedriftens Microsoft Teams & Slack',
        'Flerspråklig oversettelse (Polsk, Litauisk, Ukrainsk, Engelsk)',
        'AI Vision bildeanalyse på byggeplass (TEK17 & Våtromsnormen BVN)',
        'Automatisk varsel om endringsordre & fristforlengelse (NS 8406)',
        'Lærlingoppfølging (Udir kompetansemål) & Stoffkartotek',
        'Prioritert telefonsupport (08-16)'
      ]
    },
    {
      id: 'enterprise',
      tag: 'Større bedrifter & konsern',
      name: 'Totalentreprenør',
      desc: 'For større entreprenører (15+ ansatte), kjeder og komplekse prosjekter.',
      monthlyPrice: 'Fra 4 900 kr',
      annualPrice: 'Fra 4 900 kr',
      popular: false,
      features: [
        'Ubegrenset antall håndverkere & underentreprenører',
        'Alt i Mester Team, pluss:',
        'Egen skreddersydd AI-bot i bedriftens Teams Tenant / Slack',
        'Tripletex, PowerOffice Go & Fiken API-synkronisering',
        'SHA-koordinator & vernerunder iht. Byggherreforskriften',
        'Underentreprenør-portal med automatisk avviksruting',
        'Dedikert onboarding, team-opplæring & SLA med opptidsgaranti'
      ]
    }
  ];

  return (
    <div className="bg-white text-neutral-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
            Enkle og forutsigbare priser
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
            Invester i mer fritid og null papirkaos
          </h1>
          <p className="text-neutral-600 text-base">
            Ingen bindingstid, ingen etableringsgebyrer. Enkel månedlig faktura med full oppstartsgaranti for din bedrift.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={cn("text-xs font-bold", !isAnnual ? "text-neutral-900" : "text-neutral-400")}>Månedlig faktura</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-12 h-6 bg-emerald-600 rounded-full p-1 transition-colors relative cursor-pointer"
            >
              <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", isAnnual ? "translate-x-6" : "translate-x-0")} />
            </button>
            <span className={cn("text-xs font-bold flex items-center gap-1.5", isAnnual ? "text-neutral-900" : "text-neutral-400")}>
              Årlig faktura
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Spar 20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {plans.map((plan) => {
            const price = typeof plan.monthlyPrice === 'number' 
              ? (isAnnual ? plan.annualPrice : plan.monthlyPrice) 
              : plan.monthlyPrice;

            return (
              <div 
                key={plan.id}
                className={cn(
                  "p-8 rounded-3xl flex flex-col justify-between transition-all relative",
                  plan.popular 
                    ? "bg-neutral-900 text-white border-2 border-emerald-500 shadow-2xl" 
                    : "bg-neutral-50 text-neutral-900 border border-neutral-200 hover:shadow-xl"
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-neutral-950 font-black text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md">
                    {plan.tag}
                  </span>
                )}

                <div>
                  <div className={cn("text-xs font-bold uppercase tracking-wider mb-1", plan.popular ? "text-emerald-400" : "text-neutral-500")}>
                    {!plan.popular ? plan.tag : "Mesterbedriften"}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
                  <p className={cn("text-xs mb-6", plan.popular ? "text-neutral-400" : "text-neutral-500")}>
                    {plan.desc}
                  </p>

                  <div className="mb-6">
                    {typeof price === 'number' ? (
                      <div>
                        <span className={cn("text-4xl font-black", plan.popular ? "text-emerald-400" : "text-neutral-900")}>
                          {price} kr
                        </span>
                        <span className={cn("text-xs font-medium", plan.popular ? "text-neutral-400" : "text-neutral-500")}>
                          {" "}/ mnd ekskl. mva
                        </span>
                      </div>
                    ) : (
                      <span className="text-3xl font-black text-neutral-900">{price}</span>
                    )}
                  </div>

                  <ul className="space-y-3 text-xs mb-8 font-medium">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className={cn("shrink-0 mt-0.5", plan.popular ? "text-emerald-400" : "text-emerald-600")} />
                        <span className={plan.popular ? "text-neutral-200" : "text-neutral-700"}>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={onStartDemo}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer",
                    plan.popular 
                      ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black" 
                      : "bg-neutral-900 hover:bg-neutral-800 text-white"
                  )}
                >
                  {plan.id === 'enterprise' ? 'Kontakt salg' : 'Velg pakke & kom i gang'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Pricing FAQs */}
        <div className="max-w-4xl mx-auto pt-12 border-t border-neutral-200">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Spørsmål og svar om abonnement</h2>
          </div>

          <div className="space-y-3">
            {faqs.slice(0, 5).map((faq: any, idx: number) => (
              <div key={idx} className="bg-neutral-50 rounded-2xl border border-neutral-200 overflow-hidden">
                <button 
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-4 text-left font-bold text-xs flex items-center justify-between text-neutral-900 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={16} className={cn("transition-transform text-neutral-400", activeFaq === idx && "rotate-180 text-emerald-600")} />
                </button>
                {activeFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-neutral-600 leading-relaxed border-t border-neutral-200/60 pt-2">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
