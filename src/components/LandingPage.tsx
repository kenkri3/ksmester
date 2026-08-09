import { useState, useEffect } from 'react';
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
  Menu,
  Check,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import InstallGuide from './InstallGuide';

type PageTab = 'home' | 'ai' | 'hms' | 'fdv' | 'pricing';

export default function LandingPage({ 
  onStartDemo, 
  onOpenPortal, 
  onViewChange 
}: { 
  onStartDemo: () => void, 
  onOpenPortal: (code: string) => void, 
  onViewChange: (view: any) => void 
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PageTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showPortalInput, setShowPortalInput] = useState(false);
  const [projectCode, setProjectCode] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Camera flow interactive demo state
  const [cameraStep, setCameraStep] = useState<1 | 2 | 3>(1);
  const [selectedCamProject, setSelectedCamProject] = useState('Enebolig Nordstrand');
  const [selectedCamTarget, setSelectedCamTarget] = useState('Sjekkliste: Våtrom');

  const switchTab = (tab: PageTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePortalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectCode) {
      onOpenPortal(projectCode);
    }
  };

  const faqs = [
    {
      q: "Hvor lang tid tar det å komme i gang?",
      a: "Du er i gang på under 10 minutter! Våre ferdige maler for TEK17 og SAK10 gjør at du kan opprette ditt første prosjekt og starte SJA umiddelbart uten opplæring."
    },
    {
      q: "Fungerer det uten internett?",
      a: "Ja! Appen har full offline-støtte som PWA. Du kan fylle ut sjekklister, ta bilder og registrere avvik ute på byggeplassen uten dekning. Alt synkroniseres automatisk når du kobler til nett."
    },
    {
      q: "Kan jeg prøve før jeg betaler?",
      a: "Ja, alle får 14 dagers helt gratis prøveperiode med full tilgang til alle funksjoner. Ingen kredittkort kreves for å starte."
    },
    {
      q: "Er dataene mine sikre?",
      a: "Dine data lagres trygt i skytjenester i Europa med 256-bit kryptering og daglig sikkerhetskopiering. Du beholder eierskap til all dokumentasjon."
    },
    {
      q: "Får jeg hjelp hvis jeg står fast?",
      a: "Ja! Vi har norsk support via e-post, telefon (401 63 082) og live AI-assistent i appen som hjelper deg døgnet rundt."
    },
    {
      q: "Hva er forskjellen på pakkene?",
      a: "Enkeltmannsforetaket er perfekt for små firma opptil 3 brukere. Mesterbedriften gir deg AI Tilbudsassistent, lærlingoppfølging og automatisk tilbudsflyt. Totalentreprenøren gir full SAK10/HMS, værbasert SJA og integrasjoner mot Tripletex, PowerOffice og Boligmappa."
    }
  ];

  return (
    <div className="bg-white text-neutral-900 selection:bg-emerald-100 selection:text-emerald-900 min-h-screen flex flex-col">
      
      {/* Sticky Top Sub-Navigation / Tab Bar */}
      <nav className="sticky top-16 z-40 bg-neutral-950/90 backdrop-blur-md text-white border-b border-neutral-800/80 text-xs font-semibold py-2.5 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Scrollable Tab Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 shrink">
            <button 
              onClick={() => switchTab('home')}
              className={cn(
                "px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold shrink-0",
                activeTab === 'home' 
                  ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/40" 
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              )}
            >
              {t('nav_home', 'Hovedside')}
            </button>

            <button 
              onClick={() => switchTab('ai')}
              className={cn(
                "px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold shrink-0",
                activeTab === 'ai' 
                  ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/40" 
                  : "text-neutral-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              )}
            >
              <Sparkles size={14} className="text-emerald-400" />
              {t('nav_ai', 'Mester-hjernen')}
            </button>

            <button 
              onClick={() => switchTab('hms')}
              className={cn(
                "px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold shrink-0",
                activeTab === 'hms' 
                  ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/40" 
                  : "text-neutral-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              )}
            >
              <ShieldCheck size={14} className="text-emerald-400" />
              {t('nav_hms', 'HMS-system')}
            </button>

            <button 
              onClick={() => switchTab('fdv')}
              className={cn(
                "px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold shrink-0",
                activeTab === 'fdv' 
                  ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/40" 
                  : "text-neutral-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              )}
            >
              <FileCheck size={14} className="text-emerald-400" />
              {t('nav_fdv', 'FDV')}
            </button>

            <button 
              onClick={() => switchTab('pricing')}
              className={cn(
                "px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold shrink-0",
                activeTab === 'pricing' 
                  ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/40" 
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              )}
            >
              {t('nav_pricing', 'Priser')}
            </button>
          </div>

          {/* Quick CTA button */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button 
              onClick={onStartDemo} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Zap size={14} />
              Prøv gratis
            </button>
          </div>

        </div>
      </nav>

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
            setShowPortalInput={setShowPortalInput}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl"
          >
            <InstallGuide onClose={() => setShowInstallGuide(false)} />
          </motion.div>
        </div>
      )}

      {/* Single Unified Categorized Footer */}
      <footer className="bg-neutral-950 text-neutral-400 text-xs border-t border-neutral-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-6 gap-8">
          
          <div className="col-span-2 space-y-3">
            <div className="text-white font-black text-xl flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                KS
              </div>
              KS-Mester
            </div>
            <p className="text-neutral-400 leading-relaxed max-w-xs text-xs">
              Profesjonell kvalitetssikring, HMS og FDV for håndverkere og byggfirmaer. Alt i én intelligent plattform.
            </p>
          </div>

          <div>
            <div className="text-white font-bold mb-3 uppercase tracking-wider text-[10px]">Hovedsider</div>
            <ul className="space-y-2">
              <li><button onClick={() => switchTab('home')} className="hover:text-white transition-colors">Hovedside</button></li>
              <li><button onClick={() => switchTab('ai')} className="hover:text-emerald-400 transition-colors text-emerald-400 font-semibold">Mester-hjernen AI</button></li>
              <li><button onClick={() => switchTab('hms')} className="hover:text-blue-400 transition-colors text-blue-400 font-semibold">HMS-system</button></li>
              <li><button onClick={() => switchTab('fdv')} className="hover:text-amber-400 transition-colors text-amber-400 font-semibold">FDV-dokumentasjon</button></li>
            </ul>
          </div>

          <div>
            <div className="text-white font-bold mb-3 uppercase tracking-wider text-[10px]">Produkt</div>
            <ul className="space-y-2">
              <li><button onClick={() => switchTab('pricing')} className="hover:text-white transition-colors">Priser</button></li>
              <li><button onClick={onStartDemo} className="hover:text-white transition-colors">Se demo</button></li>
              <li><a href="mailto:support@ksmester.no" className="hover:text-white transition-colors">Kontakt</a></li>
            </ul>
          </div>

          <div>
            <div className="text-white font-bold mb-3 uppercase tracking-wider text-[10px]">For fagfolk</div>
            <ul className="space-y-2">
              <li><span onClick={onStartDemo} className="hover:text-white cursor-pointer">Tømrer & Snekker</span></li>
              <li><span onClick={onStartDemo} className="hover:text-white cursor-pointer">Rørlegger</span></li>
              <li><span onClick={onStartDemo} className="hover:text-white cursor-pointer">Elektriker</span></li>
              <li><span onClick={onStartDemo} className="hover:text-white cursor-pointer">Maler & Murer</span></li>
            </ul>
          </div>

          <div>
            <div className="text-white font-bold mb-3 uppercase tracking-wider text-[10px]">Kunde & Juridisk</div>
            <ul className="space-y-2">
              <li><button onClick={() => setShowPortalInput(true)} className="hover:text-white transition-colors">Min Side (kundeportal)</button></li>
              <li><button onClick={() => onViewChange('privacy')} className="hover:text-white transition-colors">Personvern</button></li>
              <li><button onClick={() => onViewChange('terms')} className="hover:text-white transition-colors">Vilkår</button></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-500">
          <div>© 2026 KS-Mester AI. Alle rettigheter reservert.</div>
          <div className="flex gap-4">
            <button onClick={() => onViewChange('privacy')} className="hover:text-neutral-400">Personvern</button>
            <button onClick={() => onViewChange('terms')} className="hover:text-neutral-400">Vilkår</button>
            <a href="mailto:support@ksmester.no" className="hover:text-neutral-400">Support: support@ksmester.no</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* =========================================================================
   1. HOME / OVERVIEW VIEW
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
  setShowPortalInput
}: any) {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] grid grid-cols-1 lg:grid-cols-2 border-b border-neutral-100 overflow-hidden">
        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-white relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-6 border border-emerald-200/60 shadow-sm">
              <ShieldCheck size={14} className="text-emerald-600" />
              Komplett KS-, HMS- og FDV-system for håndverkere
            </div>
            
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] mb-6 text-neutral-900">
              Bygg smartere. <br />
              <span className="text-emerald-600">Dokumenter automatisk.</span>
            </h1>
            
            <p className="text-base sm:text-lg text-neutral-600 max-w-xl mb-8 leading-relaxed font-normal">
              Det smidigste kvalitetssikringssystemet for norske fagarbeidere. 
              SJA, vernerunder, sjekklister og Boligmappa-eksport – alt drevet av intelligent norsk AI.
            </p>

            {/* Micro Highlights Grid */}
            <div className="grid grid-cols-2 gap-3 mb-8 max-w-lg">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center gap-2.5">
                <Zap className="text-emerald-600 shrink-0" size={18} />
                <span className="text-xs font-bold text-neutral-800">Spar 5+ timer/uke</span>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center gap-2.5">
                <Bot className="text-emerald-600 shrink-0" size={18} />
                <span className="text-xs font-bold text-neutral-800">15+ AI-funksjoner</span>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center gap-2.5">
                <Cloud className="text-emerald-600 shrink-0" size={18} />
                <span className="text-xs font-bold text-neutral-800">Fungerer offline</span>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center gap-2.5">
                <Clock className="text-emerald-600 shrink-0" size={18} />
                <span className="text-xs font-bold text-neutral-800">I gang på 10 minutter</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <button 
                onClick={onStartDemo}
                className="group bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all active:scale-95 shadow-xl shadow-emerald-600/20"
              >
                Prøv gratis i 14 dager
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={onStartDemo}
                className="bg-neutral-900 text-white border border-neutral-800 px-8 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all active:scale-95"
              >
                Se demo
              </button>
            </div>

            <p className="text-xs text-neutral-400 font-medium flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              Ingen kredittkort påkrevd • Kanseller når som helst • Norsk support
            </p>
          </motion.div>
        </div>
        
        {/* Right Hero Interactive Visual */}
        <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 flex items-center justify-center p-6 sm:p-10 text-white">
          <div className="relative w-full max-w-md space-y-4">
            
            {/* Live AI Status Widget */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono text-emerald-300 font-bold uppercase tracking-wider">KS-Mester AI Assist</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">Aktiv</span>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/10 font-mono text-xs text-neutral-300 space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Sparkles size={14} />
                  <span>SJA Værbasert sjekk utfort</span>
                </div>
                <p className="text-[11px] text-neutral-400">"Yr.no varsler 12m/s vind. SJA-tiltak automatisk lagt til for arbeid i høyden."</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-emerald-400 text-sm font-black">15+</div>
                  <div className="text-neutral-400">AI-verktøy</div>
                </div>
                <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-emerald-400 text-sm font-black">100%</div>
                  <div className="text-neutral-400">TEK17/SAK10</div>
                </div>
                <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-emerald-400 text-sm font-black">1-klikk</div>
                  <div className="text-neutral-400">Boligmappa</div>
                </div>
              </div>
            </div>

            {/* Quick Customer Portal Entry */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-xs font-bold text-neutral-300 mb-2 flex items-center gap-2">
                <Users size={14} className="text-emerald-400" />
                Har du en prosjektkode fra håndverkeren din?
              </div>
              <form onSubmit={handlePortalSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  placeholder="F.eks. PRO-123"
                  className="bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 flex-1 focus:outline-none focus:border-emerald-500"
                />
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0"
                >
                  Min Side
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="py-6 bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-between items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all font-black text-xs sm:text-sm tracking-wider text-neutral-700">
            <span>TRIPLETEX</span>
            <span>POWEROFFICE GO</span>
            <span>BOLIGMAPPA</span>
            <span>TEK17 / SAK10</span>
            <span>SINTEF BYGGFORSK</span>
            <span>YR.NO</span>
          </div>
        </div>
      </section>

      {/* THREE CORE PORTAL CARDS (Navigates directly to sub-pages) */}
      <section className="py-20 bg-neutral-900 text-white border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Tre hovedsøyler
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
              Alt du trenger samlet i tre dedikerte moduler
            </h2>
            <p className="text-neutral-400 text-base sm:text-lg">
              Klikk deg inn på modulene for å utforske de dyptgående AI-, HMS- og FDV-funksjonene.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* 1. Mester-hjernen Card */}
            <div className="bg-neutral-950/90 rounded-3xl p-8 border border-emerald-500/30 hover:border-emerald-500/80 transition-all group flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center font-bold mb-6">
                  <Sparkles size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block mb-3">
                  15+ AI-funksjoner
                </span>
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-emerald-400 transition-colors">
                  Mester-hjernen
                </h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed mb-6">
                  Norsk AI spesialtrent for håndverkere. Smart søk, værbasert SJA, tilbudsgenerator og kalkyle.
                </p>
                <ul className="space-y-2 text-xs text-neutral-300 mb-8 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Værbasert SJA-analyse</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> AI Tilbudsgenerator</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Prediktiv avviksanalyse</li>
                </ul>
              </div>
              <button 
                onClick={() => onSwitchTab('ai')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
              >
                Utforsk Mester-hjernen
                <ArrowRight size={16} />
              </button>
            </div>

            {/* 2. HMS-system Card */}
            <div className="bg-neutral-950/90 rounded-3xl p-8 border border-emerald-500/20 hover:border-emerald-500/80 transition-all group flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center font-bold mb-6">
                  <ShieldCheck size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block mb-3">
                  Oppfyller alle lovkrav
                </span>
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-emerald-400 transition-colors">
                  HMS-system
                </h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed mb-6">
                  Komplett HMS med vernerunder, SJA, risikovurderinger, stoffkartotek og digital HMS-håndbok.
                </p>
                <ul className="space-y-2 text-xs text-neutral-300 mb-8 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Digitale vernerunder</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Arbeidstilsynets krav (AML/IK)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Gratis SHA & SJA maler</li>
                </ul>
              </div>
              <button 
                onClick={() => onSwitchTab('hms')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
              >
                Utforsk HMS-system
                <ArrowRight size={16} />
              </button>
            </div>

            {/* 3. FDV-dokumentasjon Card */}
            <div className="bg-neutral-950/90 rounded-3xl p-8 border border-emerald-500/20 hover:border-emerald-500/80 transition-all group flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center font-bold mb-6">
                  <FileCheck size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block mb-3">
                  Boligmappa-eksport
                </span>
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-emerald-400 transition-colors">
                  FDV-dokumentasjon
                </h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed mb-6">
                  FDV-dokumentasjonen bygges fortløpende mens du jobber. Send alt direkte til Boligmappa med 1-klikk.
                </p>
                <ul className="space-y-2 text-xs text-neutral-300 mb-8 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Offisiell Boligmappa-partner</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Spar 5+ timer per prosjekt</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Automatisk kategorisering</li>
                </ul>
              </div>
              <button 
                onClick={() => onSwitchTab('fdv')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
              >
                Utforsk FDV-dokumentasjon
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="py-20 bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Effektivitet i hverdagen
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
              Slutt på papirkaos og kveldsarbeid
            </h2>
            <p className="text-neutral-500 text-base">
              Mange håndverkere bruker kveldene sine på papirarbeid. Med KS-Mester er alt gjort ute på byggeplassen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-red-50/50 rounded-3xl p-8 border border-red-100">
              <div className="flex items-center gap-3 mb-6 text-red-700">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                  <X size={20} />
                </div>
                <h3 className="text-xl font-bold">Uten KS-Mester</h3>
              </div>
              <ul className="space-y-4 text-sm text-neutral-700 font-medium">
                <li className="flex items-start gap-3">
                  <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span>Timer brukt på kveldstid på FDV og papirarbeid</span>
                </li>
                <li className="flex items-start gap-3">
                  <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span>Bilder spredt på private telefoner uten prosjektkobling</span>
                </li>
                <li className="flex items-start gap-3">
                  <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span>Manuelle SJA og vernerunder i tunge papirskjemaer</span>
                </li>
              </ul>
            </div>

            <div className="bg-emerald-50/50 rounded-3xl p-8 border border-emerald-200/80">
              <div className="flex items-center gap-3 mb-6 text-emerald-800">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold">Med KS-Mester</h3>
              </div>
              <ul className="space-y-4 text-sm text-neutral-800 font-medium">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>FDV bygges automatisk underveis – alt ferdig ved overlevering</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Smart kamera sorterer bilder rett i sjekklister og prosjektmappe</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>AI forstår været fra Yr.no og lager ferdige SJA-forslag</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* For hvem? */}
      <section className="py-20 bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full">
              For fagfolk
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
              Tilpasset din bransje
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: HardHat, title: "Tømrer & Snekker", desc: "Sjekklister for TEK17, råbygg, våtrom og kledning. Full SAK10-kontroll." },
              { icon: Zap, title: "Elektriker", desc: "Samsvarserklæringer, risikovurderinger og dokumentasjon for el-anlegg." },
              { icon: Building2, title: "Rørlegger", desc: "Trykktesting, våtromsnormen, kran-sjekker og Boligmappa-overføring." },
              { icon: Briefcase, title: "Maler & Murer", desc: "Overflatedokumentasjon, stoffkartotek, HMS-målinger og avvikshåndtering." }
            ].map((b, i) => (
              <div key={i} className="p-6 bg-white rounded-2xl border border-neutral-200 hover:border-emerald-500/50 hover:shadow-lg transition-all">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold mb-4">
                  <b.icon size={20} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-neutral-900">{b.title}</h3>
                <p className="text-neutral-600 text-xs leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Smart Camera Demo */}
      <section className="py-20 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Interaktiv Demo
            </span>
            <h2 className="text-3xl sm:text-4xl font-black mt-3 mb-2">
              Prøv Smart Kamera
            </h2>
            <p className="text-neutral-500 text-sm">
              Se hvordan bilder automatisk knyttes til prosjekt og sjekkliste.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-2xl">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-emerald-400" />
                <span className="font-bold">KS-Mester Kamera AI</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold">
                Steg {cameraStep} av 3
              </span>
            </div>

            {cameraStep === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-neutral-300 font-medium">1. Velg aktivt prosjekt:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Enebolig Nordstrand', 'Solberg Rekkehus', 'Kontorbygg Lysaker'].map((p) => (
                    <button 
                      key={p} 
                      onClick={() => setSelectedCamProject(p)}
                      className={cn(
                        "p-3 rounded-xl border text-left text-xs font-bold transition-all",
                        selectedCamProject === p ? "bg-emerald-600/20 border-emerald-500 text-emerald-300" : "bg-neutral-800 border-white/10 hover:border-white/20"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCameraStep(2)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs mt-4 transition-all"
                >
                  Neste: Velg sjekkliste →
                </button>
              </div>
            )}

            {cameraStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-neutral-300 font-medium">2. Velg sjekkliste for {selectedCamProject}:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Sjekkliste: Våtrom TEK17', 'Vernerunder SJA', 'Kledning & Membran'].map((t) => (
                    <button 
                      key={t} 
                      onClick={() => setSelectedCamTarget(t)}
                      className={cn(
                        "p-3 rounded-xl border text-left text-xs font-bold transition-all",
                        selectedCamTarget === t ? "bg-emerald-600/20 border-emerald-500 text-emerald-300" : "bg-neutral-800 border-white/10 hover:border-white/20"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCameraStep(1)} className="bg-neutral-800 px-4 py-3 rounded-xl text-xs font-bold">Tilbake</button>
                  <button onClick={() => setCameraStep(3)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs transition-all">
                    Simuler bildeopplastning 📸
                  </button>
                </div>
              </div>
            )}

            {cameraStep === 3 && (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} />
                </div>
                <h4 className="font-bold text-lg text-white">Bilde lagret og kategorisert!</h4>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Bilde lagret i <span className="text-emerald-400 font-mono">{selectedCamProject}</span> under <span className="text-emerald-400 font-mono">{selectedCamTarget}</span>. FDV-mappen er automatisk oppdatert.
                </p>
                <button onClick={() => setCameraStep(1)} className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all">
                  Prøv på nytt
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full">
              Vanlige spørsmål
            </span>
            <h2 className="text-3xl font-black mt-3">Alt du lurer på om KS-Mester</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq: any, idx: number) => (
              <div key={idx} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                <button 
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm flex items-center justify-between text-neutral-900"
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={18} className={cn("transition-transform text-neutral-400", activeFaq === idx && "rotate-180 text-emerald-600")} />
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

      {/* Home Final CTA */}
      <section className="py-20 bg-emerald-950 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Klar til å oppleve Mester-kvalitet?</h2>
          <p className="text-emerald-200 text-sm mb-8">Start din 14-dagers gratis prøveperiode på 2 minutter. Ingen kredittkort kreves.</p>
          <button onClick={onStartDemo} className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-8 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">
            Start gratis i 14 dager
          </button>
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
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1.5 mb-8 bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 transition-all"
        >
          ← Tilbake til oversikten
        </button>

        {/* Top Hero Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 inline-flex items-center gap-2 mb-6">
              <Sparkles size={14} className="text-emerald-400" />
              Mester-hjernen AI
            </span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-6">
              AI som forstår <br />
              <span className="text-emerald-400">håndverkerens hverdag</span>
            </h1>
            <p className="text-neutral-300 text-base sm:text-lg mb-8 leading-relaxed">
              Mester-hjernen er 15+ AI-funksjoner bygget spesifikt for håndverkere. 
              Smart søk, værbasert SJA, tilbudsgenerator og smart kalkyle – alt i én intelligent assistent.
            </p>

            <div className="flex flex-wrap gap-3 mb-8 text-xs font-bold">
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> 15+ AI-funksjoner
              </span>
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Norsk språk
              </span>
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Lærer av dine data
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onStartDemo}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
              >
                Prøv Mester-hjernen gratis
                <ArrowRight size={16} />
              </button>
              <button 
                onClick={onStartDemo}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                Se AI i aksjon
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
                  <h3 className="font-bold text-sm text-white">Mester-hjernen</h3>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Aktiv
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-mono font-bold">
                v2.5 DeepMind AI
              </span>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="flex justify-end">
                <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs font-medium max-w-[85%] shadow-md">
                  "Vis meg alle åpne avvik på Solberg-prosjektet"
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-neutral-800 border border-white/10 text-neutral-200 p-4 rounded-2xl rounded-tl-xs max-w-[95%] space-y-2">
                  <p className="font-semibold text-emerald-400">Fant 3 åpne avvik på Villa Solberg:</p>
                  <div className="space-y-1.5 text-neutral-300 font-mono text-[11px]">
                    <div className="p-2 bg-neutral-900/80 rounded-lg border border-red-500/30 text-red-300">
                      <span className="font-bold text-red-400">#47</span> Manglende membran under vindu
                    </div>
                    <div className="p-2 bg-neutral-900/80 rounded-lg border border-amber-500/30 text-amber-300">
                      <span className="font-bold text-amber-400">#52</span> Feil fall mot sluk
                    </div>
                    <div className="p-2 bg-neutral-900/80 rounded-lg border border-neutral-700 text-neutral-300">
                      <span className="font-bold text-neutral-400">#55</span> Ujevn flislegging
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="bg-neutral-950 border border-white/15 rounded-xl px-4 py-3 text-neutral-500 flex items-center justify-between cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={onStartDemo}>
                  <span className="text-xs">Spør Mester-hjernen...</span>
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
              Mester-hjernen er et komplett AI-økosystem
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                tag: "Mest brukt",
                tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                title: "Smart Søk",
                desc: "Søk på tvers av alle 15+ moduler med naturlig språk. «Vis avvik fra Solberg-prosjektet siste måned»"
              },
              {
                tag: "Unik",
                tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                title: "Værbasert SJA",
                desc: "Automatiske sikkerhetsvarsler basert på værdata fra Yr.no. Foreslår tiltak ved risiko."
              },
              {
                tag: "Konvertering",
                tagColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
                title: "AI Tilbudsgenerator",
                desc: "Skriv stikkord, få profesjonelle tilbud. Lærer av dine historiske prosjekter."
              },
              {
                tag: "Lønnsomhet",
                tagColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
                title: "Smart Kalkyle",
                desc: "AI analyserer dine historiske prosjekter og foreslår priser basert på erfaringsdata."
              },
              {
                tag: "Proaktiv",
                tagColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
                title: "Prediktiv Analyse",
                desc: "Se risiko før det blir problemer. AI analyserer mønstre og varsler om potensielle avvik."
              },
              {
                tag: "Effektivitet",
                tagColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
                title: "AI Sjekklistegenerator",
                desc: "Beskriv arbeidet med egne ord – AI lager komplett sjekkliste med TEK17-krav."
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

          {/* "Og enda mer..." List */}
          <div className="mt-8 bg-neutral-900 rounded-2xl p-6 border border-white/10">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles size={16} /> Og enda mer...
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-neutral-300 font-medium">
              <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> AI Fakturaforslag basert på tidsregistrering
              </div>
              <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Automatisk kategorisering av avvik
              </div>
              <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Smart prioritering av oppgaver
              </div>
              <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> HMS-forslag basert på prosjekttype
              </div>
              <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Kontinuerlig FDV-generering
              </div>
              <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> AI-mentor for lærlinger
              </div>
            </div>
          </div>
        </div>

        {/* Why Mester-hjernen is different */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Unike fordeler</span>
            <h2 className="text-2xl sm:text-4xl font-black mt-2">
              Hvorfor Mester-hjernen er annerledes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center font-bold mb-6">
                <HardHat size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Bygget for håndverkere</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Ikke en generisk AI – spesialtrent på byggebransjens språk, lovverk (TEK17/SAK10/NS) og daglige arbeidsflyt.
              </p>
            </div>

            <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center font-bold mb-6">
                <Database size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Lærer av dine data</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Jo mer du bruker systemet, jo smartere blir Mester-hjernen. Dine tidligere prosjekter gi stadig bedre og mer presise forslag.
              </p>
            </div>

            <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center font-bold mb-6">
                <Globe size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Norsk og lokal</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Forstår norsk fagterminologi perfekt, kjenner TEK17/SAK10 og integrerer direkte med Yr, Boligmappa og norske regnskapssystemer.
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mb-16">
          <div className="p-6 bg-emerald-950/40 rounded-2xl border border-emerald-500/30">
            <div className="text-4xl font-black text-emerald-400 mb-1">15+</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">AI-funksjoner</div>
          </div>
          <div className="p-6 bg-emerald-950/40 rounded-2xl border border-emerald-500/30">
            <div className="text-4xl font-black text-emerald-400 mb-1">50.000+</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">AI-interaksjoner/mnd</div>
          </div>
          <div className="p-6 bg-emerald-950/40 rounded-2xl border border-emerald-500/30">
            <div className="text-4xl font-black text-emerald-400 mb-1">98%</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">Forståelsesgrad</div>
          </div>
          <div className="p-6 bg-emerald-950/40 rounded-2xl border border-emerald-500/30">
            <div className="text-4xl font-black text-emerald-400 mb-1">5 sek</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">Gjennomsnittlig respons</div>
          </div>
        </div>

        {/* Call to action box */}
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-950 rounded-3xl p-10 border border-emerald-500/40 text-center flex flex-col items-center max-w-3xl mx-auto shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-black mb-3 text-white">
            Klar til å møte Mester-hjernen?
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200 mb-6 max-w-xl">
            Start gratis og opplev hvordan AI kan transformere arbeidshverdagen din på byggeplassen og på kontoret.
          </p>
          <button 
            onClick={onStartDemo}
            className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 flex items-center gap-2"
          >
            <Sparkles size={16} />
            Prøv Mester-hjernen gratis
          </button>
        </div>

      </div>
    </div>
  );
}

/* =========================================================================
   3. HMS-SYSTEM DEDICATED VIEW
   ========================================================================= */
function HMSView({ onStartDemo, onBack, onGoToPricing }: { onStartDemo: () => void, onBack: () => void, onGoToPricing: () => void }) {
  return (
    <div className="bg-white text-neutral-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 mb-8 bg-neutral-100 px-3.5 py-2 rounded-xl border border-neutral-200 transition-all"
        >
          ← Tilbake til oversikten
        </button>

        {/* HMS Hero Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <span className="text-emerald-700 text-xs font-bold uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200/80 inline-flex items-center gap-2 mb-6">
              <ShieldCheck size={14} className="text-emerald-600" />
              HMS-system
            </span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-6 text-neutral-900">
              HMS som <br />
              <span className="text-emerald-600">faktisk fungerer</span>
            </h1>
            <p className="text-neutral-600 text-base sm:text-lg mb-8 leading-relaxed">
              Komplett HMS-system for håndverkere og byggfirmaer. Vernerunder, SJA, risikovurderinger og stoffkartotek – alt i én app. Alltid i samsvar med Arbeidstilsynets krav.
            </p>

            <div className="flex flex-wrap gap-3 mb-8 text-xs font-bold">
              <span className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Oppfyller alle lovkrav
              </span>
              <span className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> AI-assistert SJA
              </span>
              <span className="bg-neutral-100 text-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-neutral-600" /> Offline-støtte
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onStartDemo}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
              >
                Start gratis i 14 dager
                <ArrowRight size={16} />
              </button>
              <button 
                onClick={onStartDemo}
                className="bg-neutral-900 hover:bg-neutral-800 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                Se demo
              </button>
            </div>
          </div>

          {/* Included HMS Modules Quick Visual */}
          <div className="bg-neutral-900 rounded-3xl p-8 border border-neutral-800 text-white shadow-2xl relative">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <ShieldCheck size={16} /> HMS-moduler inkludert
            </div>
            <h3 className="text-xl font-bold mb-6">Alt i én integrert HMS-plattform</h3>

            <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Vernerunder</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>SJA med AI-forslag</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Risikovurderinger</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>HMS-hendelser (RUH)</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Stoffkartotek</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>HMS-håndbok</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alt du trenger for HMS Grid */}
        <div className="mb-20">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              HMS-moduler
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
              Alt du trenger for HMS
            </h2>
            <p className="text-neutral-500 text-base">
              Fra vernerunder til stoffkartotek – alle verktøyene du trenger for å oppfylle lovkravene
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Vernerunder",
                desc: "Digitale vernerunder med fotodokumentasjon, automatiske oppfølgingspunkter og historikk."
              },
              {
                title: "SJA - Sikker Jobb Analyse",
                desc: "AI-assistert SJA som foreslår risikoer basert på arbeidstype og værforhold."
              },
              {
                title: "Risikovurderinger",
                desc: "Strukturerte risikovurderinger med sannsynlighet- og konsekvensmatrise."
              },
              {
                title: "HMS-hendelser (RUH)",
                desc: "Registrer uønskede hendelser, nestenulykker og avvik med full sporbarhet."
              },
              {
                title: "Stoffkartotek",
                desc: "Registrer farlige stoffer med sikkerhetsdatablad og eksponering."
              },
              {
                title: "HMS-håndbok",
                desc: "Digital HMS-håndbok som alltid er oppdatert og tilgjengelig for alle ansatte."
              }
            ].map((hms, i) => (
              <div key={i} className="p-6 bg-neutral-50 rounded-2xl border border-neutral-200/80 hover:border-emerald-500/50 hover:shadow-lg transition-all">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold mb-4">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-lg font-bold mb-2 text-neutral-900">{hms.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{hms.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Feature: Weather SJA Box */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-white rounded-3xl p-8 sm:p-12 border border-emerald-500/30 mb-20 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 inline-block mb-4">
                AI-funksjon
              </span>
              <h2 className="text-3xl font-black mb-4">Værbasert SJA</h2>
              <p className="text-neutral-300 text-sm leading-relaxed mb-6">
                Mester-hjernen henter værdata fra Yr.no og foreslår automatisk relevante risikoer og tiltak for dagens arbeidsoppgaver. Glatt føre? Sterk vind? Du får varsel før du starter.
              </p>

              <ul className="space-y-3 text-xs text-neutral-200 font-medium">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Automatiske varsler ved farlige værforhold
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Foreslår tiltak basert på temperatur og vind
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Integrert med prosjektets arbeidsplan
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Historikk for dokumentasjon
                </li>
              </ul>
            </div>

            {/* Weather Alert Visual */}
            <div className="bg-neutral-800/90 rounded-2xl p-6 border border-amber-500/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle size={16} /> Værvarsel
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">Automatisk generert</span>
              </div>

              <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-200 text-xs font-medium leading-relaxed">
                ⚠️ Sterk vind (15 m/s) varslet mellom kl. 12-16. Vurder å utsette arbeid i høyden.
              </div>

              <div className="p-3 bg-neutral-900 rounded-xl border border-white/10 text-xs text-neutral-300 font-medium flex items-center justify-between">
                <span>Foreslåtte tiltak lagt til i dagens SJA</span>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">Godkjent</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance with laws */}
        <div className="mb-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Lovkrav
            </span>
            <h2 className="text-3xl font-black tracking-tight mt-3 mb-3">
              Alltid i samsvar med lovverket
            </h2>
            <p className="text-neutral-500 text-sm">
              KS-Mester er bygget for å oppfylle alle relevante krav fra Arbeidstilsynet og Direktoratet for byggkvalitet
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="font-black text-emerald-800 text-base mb-1">Arbeidsmiljøloven</div>
              <div className="text-[11px] text-neutral-600">Krav om systematisk HMS-arbeid (§3-1)</div>
            </div>
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="font-black text-emerald-800 text-base mb-1">Internkontrollforskriften</div>
              <div className="text-[11px] text-neutral-600">Dokumentasjonskrav for alle bedrifter</div>
            </div>
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="font-black text-emerald-800 text-base mb-1">Byggherreforskriften</div>
              <div className="text-[11px] text-neutral-600">SHA-plan og koordinering på byggeplass</div>
            </div>
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="font-black text-emerald-800 text-base mb-1">TEK17</div>
              <div className="text-[11px] text-neutral-600">Tekniske krav til byggverk</div>
            </div>
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="font-black text-emerald-800 text-base mb-1">SAK10</div>
              <div className="text-[11px] text-neutral-600">Dokumentasjonskrav for tiltak</div>
            </div>
          </div>

          {/* Free Downloadable HMS Resources */}
          <div className="mt-8 bg-emerald-50/60 rounded-2xl p-6 border border-emerald-200/80 text-center">
            <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-3">
              Last ned gratis ressurser for HMS-arbeid:
            </h3>
            <div className="flex flex-wrap justify-center gap-4 text-xs font-bold text-emerald-800">
              <button onClick={onStartDemo} className="bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-sm hover:bg-emerald-100 transition-colors flex items-center gap-2">
                <Download size={14} className="text-emerald-600" /> SHA-plan mal
              </button>
              <button onClick={onStartDemo} className="bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-sm hover:bg-emerald-100 transition-colors flex items-center gap-2">
                <Download size={14} className="text-emerald-600" /> Vernerunde sjekkliste
              </button>
              <button onClick={onStartDemo} className="bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-sm hover:bg-emerald-100 transition-colors flex items-center gap-2">
                <Download size={14} className="text-emerald-600" /> SJA-skjema
              </button>
            </div>
          </div>
        </div>

        {/* Slik fungerer det */}
        <div className="mb-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Steg for steg
            </span>
            <h2 className="text-3xl font-black tracking-tight mt-3 mb-3">
              Slik fungerer det
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { num: "1", title: "Inviter teamet", desc: "Legg til ansatte med riktige roller og tilganger" },
              { num: "2", title: "Planlegg vernerunder", desc: "Sett opp faste vernerunder med automatiske påminnelser" },
              { num: "3", title: "Gjennomfør på mobil", desc: "Fyll ut sjekklister på byggeplass – fungerer offline" },
              { num: "4", title: "Få varsler", desc: "Automatiske påminnelser og oppfølging av avvik" }
            ].map((s, i) => (
              <div key={i} className="p-6 bg-neutral-50 rounded-2xl border border-neutral-200 text-center">
                <div className="w-10 h-10 bg-emerald-600 text-white font-black text-base rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
                  {s.num}
                </div>
                <h3 className="font-bold text-base mb-1 text-neutral-900">{s.title}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* HMS CTA */}
        <div className="bg-neutral-900 text-white rounded-3xl p-10 border border-neutral-800 text-center flex flex-col items-center max-w-3xl mx-auto shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            Klar for bedre HMS-rutiner?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mb-6 max-w-xl">
            Start med gratis prøveperiode og se hvor enkelt HMS kan være. Ingen kredittkort kreves.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={onStartDemo}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all shadow-xl active:scale-95"
            >
              Start gratis i 14 dager
            </button>
            <button 
              onClick={onGoToPricing}
              className="bg-white/10 hover:bg-white/15 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold text-sm transition-all"
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
   4. FDV-DOKUMENTASJON DEDICATED VIEW
   ========================================================================= */
function FDVView({ onStartDemo, onBack }: { onStartDemo: () => void, onBack: () => void }) {
  return (
    <div className="bg-neutral-950 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1.5 mb-8 bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 transition-all"
        >
          ← Tilbake til oversikten
        </button>

        {/* FDV Hero Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 inline-flex items-center gap-2 mb-6">
              <FileCheck size={14} className="text-emerald-400" />
              FDV-dokumentasjon
            </span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-6">
              FDV som <br />
              <span className="text-emerald-400">bygges mens du jobber</span>
            </h1>
            <p className="text-neutral-300 text-base sm:text-lg mb-8 leading-relaxed">
              Slutt med hektisk dokumentasjonssamling i sluttfasen. KS-Mester bygger FDV-dokumentasjonen kontinuerlig gjennom hele prosjektet. Ett klikk sender alt til Boligmappa.
            </p>

            <div className="flex flex-wrap gap-3 mb-8 text-xs font-bold">
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" /> Boligmappa-integrasjon
              </span>
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" /> Kontinuerlig FDV
              </span>
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" /> AI-kategorisering
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onStartDemo}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
              >
                Start gratis i 14 dager
                <ArrowRight size={16} />
              </button>
              <button 
                onClick={onStartDemo}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                Se demo
              </button>
            </div>
          </div>

          {/* FDV Fremdrift Interactive Card */}
          <div className="bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">Villa Solberg</span>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <FileCheck size={18} className="text-emerald-400" /> FDV-fremdrift
                </h3>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-500/30">
                78% Komplett
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-neutral-300">Total komplettering</span>
                <span className="text-emerald-400">78%</span>
              </div>
              <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-[78%] transition-all duration-1000" />
              </div>
            </div>

            {/* Progress Breakdown */}
            <div className="space-y-3 text-xs mb-6">
              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>Produktdatablad</span>
                  <span className="text-emerald-400 font-bold">100%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-[100%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>Monteringsveiledninger</span>
                  <span className="text-emerald-400 font-bold">100%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-[100%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>Garantidokumenter</span>
                  <span className="text-emerald-400 font-bold">85%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-[85%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>Samsvarserklæringer</span>
                  <span className="text-emerald-400 font-bold">60%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-[60%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>Brukerveiledninger</span>
                  <span className="text-emerald-400 font-bold">45%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-[45%]" />
                </div>
              </div>
            </div>

            <button 
              onClick={onStartDemo}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
            >
              <Cloud size={16} />
              Eksporter til Boligmappa
            </button>
          </div>
        </div>

        {/* Kontinuerlig FDV-innsamling */}
        <div className="mb-20">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Automatisert arbeidsflyt
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
              Kontinuerlig FDV-innsamling
            </h2>
            <p className="text-neutral-400 text-base">
              FDV-dokumentasjonen bygges automatisk mens du jobber – ingen ekstra arbeid
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Bilder lagres automatisk",
                desc: "Alle bilder fra sjekklister og dokumentasjon sorteres inn i FDV-mappen"
              },
              {
                title: "Produktinfo skannes",
                desc: "Ta bilde av produktetikett – AI henter datablad og garantiinfo"
              },
              {
                title: "Dokumenter kategoriseres",
                desc: "AI sorterer dokumenter i riktige kategorier etter Boligmappa-standard"
              },
              {
                title: "Ett-klikk eksport",
                desc: "Send komplett FDV-pakke til Boligmappa med ett klikk"
              }
            ].map((item, i) => (
              <div key={i} className="bg-neutral-900 rounded-3xl p-6 border border-neutral-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold mb-4">
                    <FileCheck size={20} />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">{item.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Boligmappa Integration Box */}
        <div className="bg-neutral-900 rounded-3xl p-8 sm:p-12 border border-emerald-500/30 mb-20 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block mb-4">
                Integrasjon
              </span>
              <h2 className="text-3xl font-black mb-4">Direkte til Boligmappa</h2>
              <p className="text-neutral-300 text-sm leading-relaxed mb-6">
                KS-Mester er offisiell integrasjonspartner med Boligmappa. FDV-dokumentasjon overføres direkte til riktig bolig med riktig struktur – ingen manuell opplasting.
              </p>

              <ul className="space-y-3 text-xs text-neutral-200 font-medium">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Automatisk kobling til riktig eiendom via matrikkel
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Dokumenter sorteres etter Boligmappa-standard
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Boligeier får varsel om ny dokumentasjon
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Fullt sporbar leveranse for din dokumentasjon
                </li>
              </ul>
            </div>

            {/* Boligmappa Live Card */}
            <div className="bg-neutral-800/90 rounded-2xl p-6 border border-emerald-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-xs">
                    BM
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Boligmappa</h3>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Integrasjon aktiv
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold">
                  Sømløs API
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-neutral-900 rounded-xl border border-white/10">
                  <div className="text-2xl font-black text-emerald-400">247</div>
                  <div className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Dokumenter sendt</div>
                </div>
                <div className="p-3 bg-neutral-900 rounded-xl border border-white/10">
                  <div className="text-2xl font-black text-emerald-400">34</div>
                  <div className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Boliger dokumentert</div>
                </div>
              </div>

              <div className="p-3 bg-neutral-900 rounded-xl border border-white/10 text-xs text-neutral-300 flex items-center justify-between">
                <span>Siste eksport</span>
                <span className="text-emerald-400 font-bold">I dag, 10:42</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hvorfor kontinuerlig FDV? */}
        <div className="mb-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Gevinster</span>
            <h2 className="text-3xl font-black tracking-tight mt-3 mb-3">
              Hvorfor kontinuerlig FDV?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-neutral-900 rounded-3xl p-8 border border-neutral-800">
              <div className="text-emerald-400 font-black text-3xl mb-2">5+ timer</div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-4">spart per prosjekt</div>
              <h3 className="text-xl font-bold mb-2">Spar 5+ timer per prosjekt</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Slutt med hektisk dokumentasjonssamling i sluttfasen. Alt er klart når prosjektet er ferdig.
              </p>
            </div>

            <div className="bg-neutral-900 rounded-3xl p-8 border border-neutral-800">
              <div className="text-emerald-400 font-black text-3xl mb-2">14 dager</div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-4">raskere betalt</div>
              <h3 className="text-xl font-bold mb-2">Raskere fakturering</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Dokumentasjon ferdig = raskere sluttfaktura. Ingen venting på manglende papirer.
              </p>
            </div>

            <div className="bg-neutral-900 rounded-3xl p-8 border border-neutral-800">
              <div className="text-emerald-400 font-black text-3xl mb-2">4.8/5</div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-4">kundetilfredshet</div>
              <h3 className="text-xl font-bold mb-2">Profesjonell leveranse</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Imponér kundene med komplett FDV-dokumentasjon fra dag én. Øker kundetilfredsheten.
              </p>
            </div>
          </div>
        </div>

        {/* FDV Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mb-16">
          <div className="p-6 bg-emerald-950/40 rounded-2xl border border-emerald-500/30">
            <div className="text-4xl font-black text-emerald-400 mb-1">10.000+</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">FDV-dokumenter eksportert</div>
          </div>
          <div className="p-6 bg-emerald-950/40 rounded-2xl border border-emerald-500/30">
            <div className="text-4xl font-black text-emerald-400 mb-1">500+</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">Boliger dokumentert</div>
          </div>
          <div className="p-6 bg-emerald-950/40 rounded-2xl border border-emerald-500/30">
            <div className="text-4xl font-black text-emerald-400 mb-1">98%</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">Automatisk kategorisering</div>
          </div>
          <div className="p-6 bg-emerald-950/40 rounded-2xl border border-emerald-500/30">
            <div className="text-4xl font-black text-emerald-400 mb-1">5 min</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">Fra ferdig til Boligmappa</div>
          </div>
        </div>

        {/* FDV CTA */}
        <div className="bg-neutral-900 text-white rounded-3xl p-10 border border-emerald-500/40 text-center flex flex-col items-center max-w-3xl mx-auto shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            Klar for enklere FDV?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mb-6 max-w-xl">
            Start gratis og opplev hvordan FDV-dokumentasjon kan bygges automatisk.
          </p>
          <button 
            onClick={onStartDemo}
            className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 flex items-center gap-2"
          >
            <FileCheck size={16} />
            Start gratis i 14 dager
          </button>
        </div>

      </div>
    </div>
  );
}

/* =========================================================================
   5. PRISER DEDICATED VIEW
   ========================================================================= */
function PricingView({ onStartDemo, onBack, faqs, activeFaq, setActiveFaq }: any) {
  return (
    <div className="bg-white text-neutral-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 mb-8 bg-neutral-100 px-3.5 py-2 rounded-xl border border-neutral-200 transition-all"
        >
          ← Tilbake til oversikten
        </button>

        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
            Forutsigbare priser
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mt-4 mb-4">
            Invester i mer fritid og bedre kvalitet
          </h1>
          <p className="text-neutral-600 text-base">
            Ingen bindingstid, ingen skjulte gebyrer. Alle planer inkluderer 14 dagers gratis prøveperiode.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          
          {/* Plan 1 */}
          <div className="p-8 bg-neutral-50 rounded-3xl border border-neutral-200 flex flex-col justify-between hover:shadow-xl transition-all">
            <div>
              <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Enkeltmannsforetak</div>
              <h2 className="text-2xl font-bold mb-1">Mester Lite</h2>
              <p className="text-xs text-neutral-500 mb-6">For deg som jobber alene eller har opptil 3 ansatte.</p>
              
              <div className="mb-6">
                <span className="text-4xl font-black">490 kr</span>
                <span className="text-xs text-neutral-500 font-medium"> / mnd per bruker</span>
              </div>

              <ul className="space-y-3 text-xs text-neutral-700 font-medium mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Inntil 3 brukere</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> SJA & Vernerunder</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> TEK17/SAK10 sjekklister</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Boligmappa-eksport</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Offline mobilapp</li>
              </ul>
            </div>

            <button onClick={onStartDemo} className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-3.5 rounded-xl font-bold text-xs transition-all">
              Prøv gratis i 14 dager
            </button>
          </div>

          {/* Plan 2 - Popular */}
          <div className="p-8 bg-neutral-900 text-white rounded-3xl border-2 border-emerald-500 shadow-2xl relative flex flex-col justify-between">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-neutral-950 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
              Mest populær
            </span>
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Mesterbedriften</div>
              <h2 className="text-2xl font-bold mb-1">Mester Pro</h2>
              <p className="text-xs text-neutral-400 mb-6">For voksende håndverkerfirmaer fra 3-15 ansatte.</p>
              
              <div className="mb-6">
                <span className="text-4xl font-black text-emerald-400">890 kr</span>
                <span className="text-xs text-neutral-400 font-medium"> / mnd per bruker</span>
              </div>

              <ul className="space-y-3 text-xs text-neutral-300 font-medium mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Alt i Mester Lite</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> <b>Mester-hjernen AI Assistant</b></li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Værbasert automatisk SJA</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> AI Tilbudsgenerator & Kalkyle</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Lærlingoppfølging med SINTEF</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Prioritert norsk support</li>
              </ul>
            </div>

            <button onClick={onStartDemo} className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 py-3.5 rounded-xl font-black text-xs transition-all shadow-lg">
              Start gratis i 14 dager
            </button>
          </div>

          {/* Plan 3 */}
          <div className="p-8 bg-neutral-50 rounded-3xl border border-neutral-200 flex flex-col justify-between hover:shadow-xl transition-all">
            <div>
              <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Totalentreprenøren</div>
              <h2 className="text-2xl font-bold mb-1">Mester Enterprise</h2>
              <p className="text-xs text-neutral-500 mb-6">For større prosjekter, entreprenører og kjeder.</p>
              
              <div className="mb-6">
                <span className="text-4xl font-black">Skreddersydd</span>
              </div>

              <ul className="space-y-3 text-xs text-neutral-700 font-medium mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Alt i Mester Pro</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Tripletex & PowerOffice API</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Egen dedikert rådgiver</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Tilpassede TEK17 maler</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> SLA & Garantert opptid</li>
              </ul>
            </div>

            <button onClick={onStartDemo} className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-3.5 rounded-xl font-bold text-xs transition-all">
              Kontakt salg
            </button>
          </div>

        </div>

        {/* FAQs inside Pricing Page */}
        <div className="max-w-4xl mx-auto pt-12 border-t border-neutral-200">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Ofte stilte spørsmål om priser</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq: any, idx: number) => (
              <div key={idx} className="bg-neutral-50 rounded-2xl border border-neutral-200 overflow-hidden">
                <button 
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-4 text-left font-bold text-xs flex items-center justify-between text-neutral-900"
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
