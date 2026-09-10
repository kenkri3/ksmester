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
  Check,
  Radio,
  Eye,
  Wrench,
  Hammer
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

  const handleInstallApp = async () => {
    if (isPWAInstalled()) {
      toast.info('VikingMester er allerede installert på din enhet!');
      return;
    }
    const outcome = await promptPWAInstall();
    if (outcome === 'accepted') {
      toast.success('VikingMester ble installert på hjemskjermen!');
    }
  };

  return (
    <div className="bg-white text-slate-100 min-h-screen selection:bg-amber-500/30 selection:text-amber-200">
      {/* Sub-navigation tabs for direct feature drill-downs */}
      <div className="sticky top-16 z-40 bg-[#0c0e17]/95 backdrop-blur-md border-b border-slate-100 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => switchTab('home')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all uppercase tracking-wider flex items-center gap-1.5",
                activeTab === 'home' 
                  ? "bg-electric-100 text-electric-500 border border-electric-400/50 shadow-sm shadow-card-soft" 
                  : "text-slate-500 hover:text-navy-900 hover:bg-white/5"
              )}
            >
              <Hammer size={13} className="text-electric-500" />
              <span>Oversikt</span>
            </button>
            <button
              onClick={() => switchTab('ai')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all uppercase tracking-wider flex items-center gap-1.5",
                activeTab === 'ai' 
                  ? "bg-electric-100 text-electric-500 border border-electric-400/50 shadow-sm shadow-card-soft" 
                  : "text-slate-500 hover:text-navy-900 hover:bg-white/5"
              )}
            >
              <Cpu size={13} />
              <span>Multimodal AI</span>
            </button>
            <button
              onClick={() => switchTab('hms')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all uppercase tracking-wider flex items-center gap-1.5",
                activeTab === 'hms' 
                  ? "bg-electric-100 text-electric-500 border border-electric-400/50 shadow-sm shadow-card-soft" 
                  : "text-slate-500 hover:text-navy-900 hover:bg-white/5"
              )}
            >
              <ShieldCheck size={13} />
              <span>HMS & SJA</span>
            </button>
            <button
              onClick={() => switchTab('fdv')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all uppercase tracking-wider flex items-center gap-1.5",
                activeTab === 'fdv' 
                  ? "bg-electric-100 text-electric-500 border border-electric-400/50 shadow-sm shadow-card-soft" 
                  : "text-slate-500 hover:text-navy-900 hover:bg-white/5"
              )}
            >
              <FileCheck size={13} />
              <span>FDV & Boligmappa</span>
            </button>
            <button
              onClick={() => switchTab('pricing')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all uppercase tracking-wider flex items-center gap-1.5",
                activeTab === 'pricing' 
                  ? "bg-electric-100 text-electric-500 border border-electric-400/50 shadow-sm shadow-card-soft" 
                  : "text-slate-500 hover:text-navy-900 hover:bg-white/5"
              )}
            >
              <DollarSign size={13} />
              <span>Priser & Rammer</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM 100% OPERATIVT
            </span>
            <button
              onClick={handleInstallApp}
              className="text-xs font-mono text-slate-600 hover:text-navy-900 flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded border border-slate-200 transition-colors"
            >
              <Download size={12} />
              <span>Installer PWA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Router */}
      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TacticalHomeView 
              onStartDemo={onStartDemo} 
              onGoToPricing={() => switchTab('pricing')}
              onViewChange={onViewChange}
            />
          </motion.div>
        )}

        {activeTab === 'ai' && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TacticalAiView onStartDemo={onStartDemo} onBack={() => switchTab('home')} />
          </motion.div>
        )}

        {activeTab === 'hms' && (
          <motion.div
            key="hms"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TacticalHmsView onStartDemo={onStartDemo} onBack={() => switchTab('home')} />
          </motion.div>
        )}

        {activeTab === 'fdv' && (
          <motion.div
            key="fdv"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TacticalFdvView onStartDemo={onStartDemo} onBack={() => switchTab('home')} />
          </motion.div>
        )}

        {activeTab === 'pricing' && (
          <motion.div
            key="pricing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TacticalPricingView onStartDemo={onStartDemo} onBack={() => switchTab('home')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Tactical Dark Footer */}
      <footer className="border-t border-navy-800 bg-[#050608] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white">Viking<span className="text-electric-500">Mester</span></span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-electric-50 text-electric-500 border border-electric-300/40">PRO</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Byggeplassens råeste kraftverktøy. Utviklet i Norge for tømrere, rørleggere, elektrikere og totalentreprenører som vil ha alt på stell før de forlater byggeplassen.
            </p>
            <div className="text-[11px] font-mono text-slate-400">
              En del av Vikingnet • AIChat Norge AS (Org: 934 602 189)
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold text-electric-500 uppercase tracking-widest mb-4">Fagområder</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="hover:text-white transition-colors cursor-pointer">Tømrer & Byggmester (TEK17)</li>
              <li className="hover:text-white transition-colors cursor-pointer">Rørlegger & VVS (BVN 31.205)</li>
              <li className="hover:text-white transition-colors cursor-pointer">Elektro & El-installasjon (NEK 400)</li>
              <li className="hover:text-white transition-colors cursor-pointer">Graving & Grunnarbeid (Geomatikk)</li>
              <li className="hover:text-white transition-colors cursor-pointer">Maler, Sparkel & Flis</li>
              <li className="hover:text-white transition-colors cursor-pointer">Totalentreprenør & Prosjektledelse</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold text-electric-500 uppercase tracking-widest mb-4">Teknisk & Sikkerhet</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Gemini 3.8 Flash Multimodal</li>
              <li>Deterministisk SJA-motor (0 tokens)</li>
              <li>Yr.no Værsynkronisering</li>
              <li>Brønnøysundregistrene API</li>
              <li>AES-256 kryptering & GDPR</li>
              <li>Norsk skylagring i Oslo</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold text-electric-500 uppercase tracking-widest mb-4">Direktekontakt & Support</h4>
            <div className="space-y-3 text-xs text-slate-600">
              <p className="flex items-center gap-2">
                <Mail size={14} className="text-electric-500" />
                <a href="mailto:hei@vikingmester.no" className="hover:text-electric-400">hei@vikingmester.no</a>
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Man-Fre 07:00 - 17:00.<br/>Autonom e-postagent svarer døgnet rundt på henvendelser og tilbud.
              </p>
              <div className="pt-2">
                <button 
                  onClick={onStartDemo}
                  className="w-full bg-white/5 hover:bg-white/10 text-electric-500 border border-electric-300/40 px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all text-center"
                >
                  Åpne Interaktiv Demo →
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-400">
          <div>
            © {new Date().getFullYear()} VikingMester PRO • Alle rettigheter reservert.
          </div>
          <div className="flex gap-6">
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => onViewChange('privacy')}>Personvern & GDPR</span>
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => onViewChange('terms')}>Vilkår & DPA</span>
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => onViewChange('about')}>Om Vikingnet</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------
// TACTICAL HOME VIEW
// -------------------------------------------------------------
function TacticalHomeView({ onStartDemo, onGoToPricing, onViewChange }: { onStartDemo: () => void, onGoToPricing: () => void, onViewChange: (view: any) => void }) {
  const [workerCount, setWorkerCount] = useState<number>(4);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [selectedTrade, setSelectedTrade] = useState('tomrer');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

  // ROI calculations
  const hoursSavedPerMonth = workerCount * 14;
  const moneySavedPerMonth = hoursSavedPerMonth * 850;
  const extraInvoicedChangeOrders = workerCount * 15000;
  const totalValueMonth = moneySavedPerMonth + extraInvoicedChangeOrders;

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail || !leadCompany) {
      toast.error('Vennligst fyll inn bedriftsnavn og e-post.');
      return;
    }
    setIsSubmittingLead(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: leadCompany,
          email: leadEmail,
          phone: leadPhone,
          trade: selectedTrade,
          plan: workerCount <= 1 ? 'solo' : workerCount <= 5 ? 'team' : 'entreprenor',
          workers: workerCount
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeadSuccess(true);
        toast.success('Bestilling mottatt! Vi klargjør din bedriftsfaktura og tilgang umiddelbart.');
      } else {
        toast.error(data.message || 'Kunne ikke sende registrering.');
      }
    } catch {
      toast.error('Nettverksfeil. Ta kontakt på hei@vikingmester.no');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <div className="relative">
      {/* Heavy-Duty Tactical Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-100 bg-radial-purple bg-grid-slate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Top Mission Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-electric-50 border border-electric-300/40 text-electric-500 text-xs font-mono tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>VIKINGMESTER 2.0 • BYGGEBRANSJENS FØRSTE MULTIMODALE KRAFTVERKTØY</span>
            </div>
          </div>

          {/* Bold Punchy Headline */}
          <div className="text-center max-w-4xl mx-auto mb-8">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-navy-900 leading-[1.08]">
              Byggeplassens råeste kraftverktøy.<span className="block text-gradient-purple mt-2">Alt på stell før du forlater byggeplassen.</span>
            </h1>
            <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-sans">
              Snakk inn byggedagboken fra bilen. Knips avvikene med automatisk TEK17-visjon. Lås inn ekstraarbeider på 15 sekunder med tale-til-endringsordre (NS 8406).
            </p>
          </div>

          {/* Main Action Triggers */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
            <a 
              href="#bestill"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold text-sm shadow-purple-cta hover:shadow-purple-hover transition-all text-center flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Bestill Bedriftsfaktura</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>

            <button 
              onClick={onStartDemo}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white hover:bg-slate-50 text-navy-900 border border-slate-200 text-sm font-bold shadow-card-soft transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Start Interaktiv Demo</span>
            </button>
          </div>

          {/* Interactive Live Cockpit Mockup */}
          <div className="max-w-5xl mx-auto bg-white border border-white/15 rounded-2xl shadow-2xl p-4 sm:p-6 relative overflow-hidden">
            {/* Window Chrome Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                <span className="ml-2 text-slate-600 font-bold">VIKINGMESTER LIVE FIELD TERMINAL</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-electric-500">GEMINI 3.8 FLASH ENGINE</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
            </div>

            {/* 3 Real-time Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Voice-to-Log Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-electric-500 uppercase flex items-center gap-1.5">
                      <Mic size={14} className="text-electric-500 animate-pulse" />
                      1. Stemmestyrt Dagbok
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">07:42</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs text-xs text-slate-600 font-mono mb-3">
                    <p className="text-navy-900 italic font-medium">"Gipset ferdig himling plan 2. Venter på elektriker før vegger lukkes. Yr melder regn, tildekket materialer."</p>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 space-y-1">
                    <p className="text-emerald-400">✓ Værdata lagt til: Oslo 6°C, 3.2 m/s</p>
                    <p className="text-slate-400">✓ Prosjekt: Villa Holmenkollen</p>
                    <p className="text-slate-400">✓ Generert PDF-rapport til byggherre</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>TID BRUKT: 14 SEK</span>
                  <span className="text-emerald-400">STATUS: ARKIVERT</span>
                </div>
              </div>

              {/* Vision Scanner Card */}
              <div className="bg-slate-50 border border-electric-300/60 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-electric-100 text-electric-500 font-mono text-[9px] uppercase border-b border-l border-electric-300/40">
                  AI VISION SCAN
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-electric-500 uppercase flex items-center gap-1.5">
                      <Camera size={14} className="text-electric-500" />
                      2. TEK17 Avvikskontroll
                    </span>
                  </div>
                  <div className="h-28 rounded-lg bg-black/60 border border-navy-800 relative flex items-center justify-center overflow-hidden mb-3">
                    {/* Simulated laser scan line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-scan-laser" />
                    <div className="border border-emerald-500/80 rounded px-2 py-1 bg-emerald-950/40 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      <span>SLUKMANSJETT GODKJENT (BVN 31.205)</span>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 space-y-1">
                    <p className="text-slate-600">Klemring montert korrekt</p>
                    <p className="text-slate-600">Oppkant membran: 25 mm [OK]</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>FDV-DOKUMENTASJON</span>
                  <span className="text-emerald-400">100% SAMSVAR</span>
                </div>
              </div>

              {/* Cross-Trade Lock Card */}
              <div className="bg-slate-50 border border-rose-200 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-red-400 uppercase flex items-center gap-1.5">
                      <Shield size={14} className="text-red-400" />
                      3. Tverrfaglig Lukkesperre
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">AKTIV</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-500/20 text-xs text-red-200 font-mono mb-3">
                    <p className="font-bold text-red-400">⚠️ SONE BAD 2. ETG LÅST FOR GIPSING</p>
                    <p className="text-[11px] text-slate-400 mt-1">Rørlegger har ikke registrert trykktest av rør-i-rør (TEK17 § 13-15).</p>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 space-y-1">
                    <p className="text-emerald-400">✓ Elektriker rørforing: Kvittert</p>
                    <p className="text-red-400">✗ Trykkprøving VVS: Mangler</p>
                    <p className="text-electric-500">SMS-varsel sendt til underentreprenør</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>HINDRER BYGGFEIL</span>
                  <span className="text-electric-500">SPART: 45 000 KR</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Direct Comparison: Old Apps vs VikingMester */}
      <section className="py-20 bg-navy-900/70 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold text-electric-500 uppercase tracking-widest bg-electric-50 px-3 py-1 rounded border border-electric-300/40">
              BRANSJEREVOLUSJON
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-navy-900 mt-4">
              HVORFOR DE GAMLE KS-APPENE FEILER
            </h2>
            <p className="text-slate-400 mt-4 text-sm sm:text-base">
              SmartDok, Holte og permer ble laget for PC på kontoret. VikingMester er bygget for tømreren, rørleggeren og basen ute på stillaset.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* The Old Way */}
            <div className="bg-[#0f1118] border border-red-500/20 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                  <X size={18} />
                </div>
                <h3 className="text-lg font-mono font-bold text-white uppercase">Det Gamle KS-Byråkratiet</h3>
              </div>
              <ul className="space-y-4 text-xs font-mono text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span>45 minutter kveldsarbeid foran PC etter en 10-timers dag.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span>Muntlige endringer blir aldri varslet skriftlig – håndverker taper 80 000 kr i sluttoppgjør.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span>Tømrer gipser over rør som ikke er trykktestet – vegg må rives etter lekkasje.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span>Dyre lisenser per bruker og 12 måneders låste avtaler.</span>
                </li>
              </ul>
            </div>

            {/* The VikingMester Way */}
            <div className="bg-gradient-to-br from-[#121624] via-[#0d101a] to-[#090b12] border border-electric-400/50 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-amber-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-black font-mono font-black text-[10px] uppercase">
                VIKINGMESTER PRO
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-electric-100 text-electric-500 flex items-center justify-center">
                  <Check size={18} />
                </div>
                <h3 className="text-lg font-mono font-bold text-white uppercase">VikingMester Autonome Agent</h3>
              </div>
              <ul className="space-y-4 text-xs font-mono text-slate-200">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Snakk inn dagboken på 20 sekunder fra bilen – AI gjør resten.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Tale-til-endringsordre (NS 8406) godkjent av byggherre på SMS før arbeidet starter.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Tverrfaglig lukkesperre hindrer plating før rør og el er fotografert og trykktestet.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Forutsigbar månedlig bedriftsfaktura. Null bindingstid. Full fleksibilitet.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The 7 Crafts Trades Grid */}
      <section className="py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold text-electric-500 uppercase tracking-widest bg-electric-50 px-3 py-1 rounded border border-electric-300/40">
              TILPASSET ALLE FAG
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-navy-900 mt-4">
              SKREDDERSYDD FOR DITT HÅNDVERKSFAG
            </h2>
            <p className="text-slate-400 mt-4 text-sm sm:text-base">
              VikingMester har innebygde regler, forskrifter og sjekklister for alle 7 kjernefag i norsk bygg og anlegg.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Tømrer */}
            <div className="bg-[#0e111a] border border-navy-800 hover:border-electric-400/50 p-6 rounded-xl transition-all group">
              <div className="text-electric-500 mb-3 font-mono text-xs font-bold flex items-center justify-between">
                <span>[FAG 01]</span>
                <span className="text-[10px] text-slate-400">TEK17 § 13-14</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Tømrer & Byggmester</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
                Dampsperre, stenderverk, snølast og stillas-SJA. Automatisk lukkesjekk og bildebevis før kledning og gips.
              </p>
              <div className="text-[11px] font-mono text-electric-500/80">
                Spesialfunksjon: Dampsperre-skanning
              </div>
            </div>

            {/* 2. Rørlegger */}
            <div className="bg-[#0e111a] border border-navy-800 hover:border-electric-400/50 p-6 rounded-xl transition-all group">
              <div className="text-electric-500 mb-3 font-mono text-xs font-bold flex items-center justify-between">
                <span>[FAG 02]</span>
                <span className="text-[10px] text-slate-400">BVN 31.205</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Rørlegger & VVS</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
                Våtromsnormen, klemring, rør-i-rør trykkfallstest og automatisk generering av FDV til Boligmappa.
              </p>
              <div className="text-[11px] font-mono text-electric-500/80">
                Spesialfunksjon: Trykktest-sertifikat
              </div>
            </div>

            {/* 3. Elektriker */}
            <div className="bg-[#0e111a] border border-navy-800 hover:border-electric-400/50 p-6 rounded-xl transition-all group">
              <div className="text-electric-500 mb-3 font-mono text-xs font-bold flex items-center justify-between">
                <span>[FAG 03]</span>
                <span className="text-[10px] text-slate-400">NEK 400:2022</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Elektro & El-installatør</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
                5 sikre, sluttkontroll, risikovurdering og samsvarserklæring. Fotodokumentasjon av skjultanlegg før isolering.
              </p>
              <div className="text-[11px] font-mono text-electric-500/80">
                Spesialfunksjon: 5 Sikre på 60 sekunder
              </div>
            </div>

            {/* 4. Grunn & Graving */}
            <div className="bg-[#0e111a] border border-navy-800 hover:border-electric-400/50 p-6 rounded-xl transition-all group">
              <div className="text-electric-500 mb-3 font-mono text-xs font-bold flex items-center justify-between">
                <span>[FAG 04]</span>
                <span className="text-[10px] text-slate-400">GEOMATIKK</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Grunnarbeid & Graving</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
                Kabelpåvisning, grøftesikring dypere enn 1,5 meter (Forskrift om utførelse § 21), og massehåndteringsrapporter.
              </p>
              <div className="text-[11px] font-mono text-electric-500/80">
                Spesialfunksjon: Grøfte-SJA med Yr-regnvarsel
              </div>
            </div>

            {/* 5. Maler & Flis */}
            <div className="bg-[#0e111a] border border-navy-800 hover:border-electric-400/50 p-6 rounded-xl transition-all group">
              <div className="text-electric-500 mb-3 font-mono text-xs font-bold flex items-center justify-between">
                <span>[FAG 05]</span>
                <span className="text-[10px] text-slate-400">NS 3420</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Maler, Sparkel & Flis</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
                Fallkontroll 1:50, smøremembranlagtykkelse, fuktmåling i underlag og fargelogg for overlevering.
              </p>
              <div className="text-[11px] font-mono text-electric-500/80">
                Spesialfunksjon: Membran-lagtykkelsessjekk
              </div>
            </div>

            {/* 6. Totalentreprenør */}
            <div className="bg-[#0e111a] border border-electric-400/50 p-6 rounded-xl transition-all group bg-gradient-to-b from-amber-500/5 to-transparent">
              <div className="text-electric-500 mb-3 font-mono text-xs font-bold flex items-center justify-between">
                <span>[FAG 06 & 07]</span>
                <span className="text-[10px] text-electric-500 font-black">TOTALENTREPRENØR</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Byggeleder & Totalentreprenør</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
                Tverrfaglig kontrolltårn, lukkesperre per rom/etasje, automatisk samling av underentreprenørers FDV og SHA-plan.
              </p>
              <div className="text-[11px] font-mono text-electric-500 font-bold">
                Spesialfunksjon: Tverrfaglig Lukkesperre
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section className="py-20 bg-navy-900/70 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-card-soft p-6 sm:p-10 shadow-2xl">
            <div className="text-center mb-8">
              <span className="text-xs font-mono font-bold text-electric-500 uppercase tracking-widest bg-electric-50 px-3 py-1 rounded border border-electric-300/40">
                LØNNSOMHETSKALKULATOR
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-navy-900 mt-4">
                HVA KOSTER DET Å IKKE BRUKE VIKINGMESTER?
              </h2>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-mono text-slate-600 mb-2">
                <span>ANTALL FAGARBEIDERE / HÅNDVERKERE:</span>
                <span className="text-base font-black text-electric-500">{workerCount} ansatte</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="30" 
                value={workerCount} 
                onChange={(e) => setWorkerCount(Number(e.target.value))}
                className="w-full accent-electric-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>1 mann (Solo)</span>
                <span>5 mann (Team)</span>
                <span>15 mann</span>
                <span>30 mann (Entreprenør)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-slate-200 shadow-xs p-4 rounded-xl text-center">
                <span className="text-[11px] font-mono text-slate-400 uppercase">Sparte timer / mnd</span>
                <p className="text-2xl font-black text-white font-mono mt-1">{hoursSavedPerMonth} timer</p>
                <span className="text-[10px] text-slate-400">14t per mann</span>
              </div>

              <div className="bg-white border border-slate-200 shadow-xs p-4 rounded-xl text-center">
                <span className="text-[11px] font-mono text-slate-400 uppercase">Ekstra fakturert endring</span>
                <p className="text-2xl font-black text-electric-500 font-mono mt-1">+{extraInvoicedChangeOrders.toLocaleString('no-NO')} kr</p>
                <span className="text-[10px] text-slate-400">NS 8406 endringsordrer</span>
              </div>

              <div className="bg-electric-50 border border-electric-300/40 p-4 rounded-xl text-center">
                <span className="text-[11px] font-mono text-electric-500 uppercase font-bold">Total verdi per måned</span>
                <p className="text-2xl font-black text-electric-500 font-mono mt-1">+{totalValueMonth.toLocaleString('no-NO')} kr</p>
                <span className="text-[10px] text-emerald-400 font-bold">1 400% ROI</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-400 mb-4 font-mono">
                Pakke som passer for deg: <span className="text-white font-bold">{workerCount <= 1 ? 'VikingMester Solo (990 kr/mnd)' : workerCount <= 5 ? 'VikingMester Team (2 490 kr/mnd)' : 'VikingMester Totalentreprenør (fra 4 900 kr/mnd)'}</span>
              </p>
              <a 
                href="#bestill"
                className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold text-xs uppercase tracking-wider shadow-purple-cta hover:shadow-purple-hover transition-colors cursor-pointer"
              >
                Gå til bestilling →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Matrix with strict limits */}
      <section id="priser" className="py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold text-electric-500 uppercase tracking-widest bg-electric-50 px-3 py-1 rounded border border-electric-300/40">
              FORUTSIGBARE DRIFTSKOSTNADER
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-navy-900 mt-4">
              KNIVSKARPE RAMMER. 100% PROFITTMULTIPLIKATOR.
            </h2>
            <p className="text-slate-400 mt-4 text-sm sm:text-base">
              Alltid månedlig bedriftsfaktura eller EHF. Ingen bindingstid. Ingen skjulte kostnader.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {/* Solo */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card-soft p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">ENKELTMANNSFORETAK / MESTER</span>
                <h3 className="text-2xl font-extrabold text-navy-900 mt-1">VikingMester Solo</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-navy-900 font-sans">990,-</span>
                  <span className="text-xs text-slate-400 font-mono ml-2">/mnd eks. mva</span>
                </div>
                <div className="space-y-3 text-xs font-mono text-slate-600 border-t border-slate-100 pt-4">
                  <p className="text-electric-500 font-bold">KVOTER & RAMMER:</p>
                  <p className="flex items-center gap-2">✓ 1 aktiv bruker</p>
                  <p className="flex items-center gap-2">✓ Inntil 3 aktive prosjekter</p>
                  <p className="flex items-center gap-2">✓ 2 GB lagring (~10 000 WebP-bilder)</p>
                  <p className="flex items-center gap-2">✓ 100 AI-analyser / mnd</p>
                  <p className="flex items-center gap-2">✓ Stemmestyrt byggedagbok</p>
                  <p className="flex items-center gap-2">✓ Yr.no automatisk værsynk</p>
                  <p className="flex items-center gap-2">✓ Eksport til Boligmappa PDF</p>
                </div>
              </div>
              <a 
                href="#bestill"
                className="w-full mt-8 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold text-xs uppercase tracking-wider text-center border border-slate-200 transition-colors"
              >
                Bestill Solo
              </a>
            </div>

            {/* Team - POPULAR */}
            <div className="bg-white border-2 border-electric-500 rounded-3xl shadow-purple-cta p-6 sm:p-8 flex flex-col justify-between relative shadow-2xl shadow-card-soft">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-electric-500 to-electric-400 text-white font-bold text-[11px] tracking-wide rounded-full shadow-xs">
                MEST POPULÆR FOR HÅNDVERKERE
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-electric-500 uppercase">FOR SMÅ & MELLOMSTORE BYGGFIRMAER</span>
                <h3 className="text-2xl font-extrabold text-navy-900 mt-1">VikingMester Team</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-electric-600 font-sans">2 490,-</span>
                  <span className="text-xs text-slate-400 font-mono ml-2">/mnd eks. mva</span>
                </div>
                <div className="space-y-3 text-xs font-mono text-slate-200 border-t border-navy-800 pt-4">
                  <p className="text-electric-500 font-bold">KVOTER & RAMMER:</p>
                  <p className="flex items-center gap-2">✓ Inntil 5 aktive brukere</p>
                  <p className="flex items-center gap-2">✓ Inntil 15 aktive prosjekter</p>
                  <p className="flex items-center gap-2">✓ 10 GB lagring (~50 000 WebP-bilder)</p>
                  <p className="flex items-center gap-2">✓ 500 AI-analyser / mnd</p>
                  <p className="flex items-center gap-2">✓ Tale-til-endringsordre (NS 8406)</p>
                  <p className="flex items-center gap-2">✓ TEK17 bilde-avvik og visjon</p>
                  <p className="flex items-center gap-2">✓ Flerspråklig (Norsk, Polsk, Litauisk)</p>
                  <p className="flex items-center gap-2">✓ Tverrfaglig koordinering</p>
                </div>
              </div>
              <a 
                href="#bestill"
                className="w-full mt-8 py-3.5 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-black font-mono font-black text-xs uppercase tracking-wider text-center shadow-lg transition-all"
              >
                Bestill Team
              </a>
            </div>

            {/* Totalentreprenør */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card-soft p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">FOR STØRRE ENTREPRENØRER</span>
                <h3 className="text-2xl font-extrabold text-navy-900 mt-1">Totalentreprenør</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-navy-900 font-sans">Fra 4 900,-</span>
                  <span className="text-xs text-slate-400 font-mono ml-2">/mnd</span>
                </div>
                <div className="space-y-3 text-xs font-mono text-slate-600 border-t border-slate-100 pt-4">
                  <p className="text-electric-500 font-bold">KVOTER & RAMMER:</p>
                  <p className="flex items-center gap-2">✓ Inntil 15 brukere (skalerbart)</p>
                  <p className="flex items-center gap-2">✓ Inntil 50 aktive prosjekter</p>
                  <p className="flex items-center gap-2">✓ 30 GB lagringsvolum</p>
                  <p className="flex items-center gap-2">✓ 2 000 AI-analyser / mnd</p>
                  <p className="flex items-center gap-2">✓ Tverrfaglig Lukkesperre (Rom/Sone)</p>
                  <p className="flex items-center gap-2">✓ Underentreprenør-tildeling</p>
                  <p className="flex items-center gap-2">✓ Tripletex & PowerOffice API</p>
                  <p className="flex items-center gap-2">✓ Eget Microsoft Teams Bot oppsett</p>
                </div>
              </div>
              <a 
                href="#bestill"
                className="w-full mt-8 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold text-xs uppercase tracking-wider text-center border border-slate-200 transition-colors"
              >
                Bestill Entreprenør
              </a>
            </div>
          </div>

          {/* Addons matrix */}
          <div className="bg-[#0c0e16] border border-navy-800 rounded-2xl p-6 sm:p-8 max-w-5xl mx-auto">
            <h4 className="text-sm font-mono font-bold text-electric-500 uppercase tracking-widest mb-4">
              MODULÆRE TILLEGG PÅ ALLE NIVÅER
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-white font-bold">Ekstra bruker:</span>
                <span className="text-electric-500 float-right">249,- /mnd</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-white font-bold">+10 Prosjekter:</span>
                <span className="text-electric-500 float-right">490,- /mnd</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-white font-bold">+10 GB Lagring:</span>
                <span className="text-electric-500 float-right">149,- /mnd</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-white font-bold">Våtrom & Membran BVN:</span>
                <span className="text-electric-500 float-right">490,- /mnd</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-white font-bold">Elektro & NEK 400:</span>
                <span className="text-electric-500 float-right">490,- /mnd</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-white font-bold">Tripletex / PowerOffice:</span>
                <span className="text-electric-500 float-right">490,- /mnd</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Direct Order Form (Lead Capture) */}
      <section id="bestill" className="py-24 bg-navy-900/70 border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-electric-400/50 rounded-2xl p-6 sm:p-10 shadow-2xl relative">
            <div className="text-center mb-8">
              <span className="text-xs font-mono font-bold text-electric-500 uppercase tracking-widest bg-electric-50 px-3 py-1 rounded border border-electric-300/40">
                BEDRIFTSBESTILLING
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-navy-900 mt-4">
                FÅ TILGANG NÅ
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-2">
                Faktura sendes automatisk på EHF / e-post. Null kredittkortkrav.
              </p>
            </div>

            {leadSuccess ? (
              <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center font-mono">
                <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">Takk for bestillingen!</h3>
                <p className="text-xs text-slate-600">
                  Vi verifiserer foretaket mot Brønnøysundregistrene og sender ordrebekreftelse til din innboks om få minutter.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">BEDRIFTSNAVN / ENKELTPERSONFORETAK *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="f.eks. Mesterbygg AS"
                    value={leadCompany}
                    onChange={(e) => setLeadCompany(e.target.value)}
                    className="w-full bg-black/60 border border-navy-800 rounded-lg px-3.5 py-3 text-white focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1">E-POST FOR FAKTURA *</label>
                    <input 
                      type="email" 
                      required
                      placeholder="post@bedrift.no"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="w-full bg-black/60 border border-navy-800 rounded-lg px-3.5 py-3 text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">TELEFONNUMMER</label>
                    <input 
                      type="tel" 
                      placeholder="900 00 000"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      className="w-full bg-black/60 border border-navy-800 rounded-lg px-3.5 py-3 text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1">HOVEDFAG</label>
                    <select
                      value={selectedTrade}
                      onChange={(e) => setSelectedTrade(e.target.value)}
                      className="w-full bg-black/60 border border-navy-800 rounded-lg px-3.5 py-3 text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="tomrer">Tømrer / Byggmester</option>
                      <option value="rorlegger">Rørlegger / VVS</option>
                      <option value="elektriker">Elektriker / El-installatør</option>
                      <option value="graver">Grunnarbeid / Graving</option>
                      <option value="maler">Maler / Flis</option>
                      <option value="entreprenor">Totalentreprenør</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">ØNSKET PAKKE</label>
                    <select
                      className="w-full bg-black/60 border border-navy-800 rounded-lg px-3.5 py-3 text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="team">VikingMester Team (2 490,-/mnd)</option>
                      <option value="solo">VikingMester Solo (990,-/mnd)</option>
                      <option value="entreprenor">Totalentreprenør (fra 4 900,-/mnd)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmittingLead}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold tracking-wide text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingLead ? (
                      <span>Sjekker Enhetsregisteret...</span>
                    ) : (
                      <>
                        <span>Bestill Nå – Faktura Sendes EHF</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 text-center pt-2">
                  Ved bestilling aksepteres standard forretningsvilkår og DPA for VikingMester PRO. Ingen bindingstid.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// -------------------------------------------------------------
// TACTICAL DRILLDOWN VIEWS (AI, HMS, FDV, PRICING)
// -------------------------------------------------------------
function TacticalAiView({ onStartDemo, onBack }: { onStartDemo: () => void, onBack: () => void }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 font-mono">
      <button onClick={onBack} className="text-xs text-electric-500 hover:underline mb-8 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>
      <div className="border border-navy-800 rounded-2xl p-8 bg-[#0c0e17]">
        <span className="text-xs text-electric-500 uppercase">[MULTIMODAL ARKITEKTUR]</span>
        <h2 className="text-3xl font-black text-white mt-2 mb-4">GEMINI 3.8 FLASH VISION & TALE</h2>
        <p className="text-xs text-slate-600 leading-relaxed font-sans mb-6">
          VikingMester bruker markedets raskeste multimodale modell. Den analyserer bilder direkte mot Byggeforskriftene (TEK17) og Våtromsnormen (BVN), og transkriberer tale fra byggeplassen med over 98% nøyaktighet på norske faguttrykk.
        </p>
        <button onClick={onStartDemo} className="bg-amber-500 text-black px-6 py-3 rounded-lg text-xs font-bold uppercase cursor-pointer">
          Test Modellen i Live Demo →
        </button>
      </div>
    </div>
  );
}

function TacticalHmsView({ onStartDemo, onBack }: { onStartDemo: () => void, onBack: () => void }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 font-mono">
      <button onClick={onBack} className="text-xs text-electric-500 hover:underline mb-8 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>
      <div className="border border-navy-800 rounded-2xl p-8 bg-[#0c0e17]">
        <span className="text-xs text-electric-500 uppercase">[HMS & SIKKERHET]</span>
        <h2 className="text-3xl font-black text-white mt-2 mb-4">LOVPÅLAGT HMS, SJA & VERNERUNDER</h2>
        <p className="text-xs text-slate-600 leading-relaxed font-sans mb-6">
          Oppfyll kravene i Arbeidsmiljøloven, Internkontrollforskriften og Byggherreforskriften med 0 timers papirarbeid. SJA genereres automatisk basert på oppgave og sanntids værrisiko fra Yr.
        </p>
        <button onClick={onStartDemo} className="bg-amber-500 text-black px-6 py-3 rounded-lg text-xs font-bold uppercase cursor-pointer">
          Generer Eksempel-SJA →
        </button>
      </div>
    </div>
  );
}

function TacticalFdvView({ onStartDemo, onBack }: { onStartDemo: () => void, onBack: () => void }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 font-mono">
      <button onClick={onBack} className="text-xs text-electric-500 hover:underline mb-8 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>
      <div className="border border-navy-800 rounded-2xl p-8 bg-[#0c0e17]">
        <span className="text-xs text-electric-500 uppercase">[DOKUMENTASJON]</span>
        <h2 className="text-3xl font-black text-white mt-2 mb-4">FDV & BOLIGMAPPA PÅ 1 KLIKK</h2>
        <p className="text-xs text-slate-600 leading-relaxed font-sans mb-6">
          Alle produktark, bilder av skjulte installasjoner og samsvarserklæringer pakkes automatisk inn i en godkjent digital perm klar for overlevering til byggherre og Boligmappa.
        </p>
        <button onClick={onStartDemo} className="bg-amber-500 text-black px-6 py-3 rounded-lg text-xs font-bold uppercase cursor-pointer">
          Prøv Boligmappa-eksport →
        </button>
      </div>
    </div>
  );
}

function TacticalPricingView({ onStartDemo, onBack }: { onStartDemo: () => void, onBack: () => void }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 font-mono">
      <button onClick={onBack} className="text-xs text-electric-500 hover:underline mb-8 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>
      <div className="border border-navy-800 rounded-2xl p-8 bg-[#0c0e17]">
        <span className="text-xs text-electric-500 uppercase">[PRISER & RAMMER]</span>
        <h2 className="text-3xl font-black text-white mt-2 mb-4">FASTE MÅNEDSPRISER • INGEN BINDINGSTID</h2>
        <p className="text-xs text-slate-600 leading-relaxed font-sans mb-6">
          Solo: 990 kr/mnd • Team: 2 490 kr/mnd • Totalentreprenør: fra 4 900 kr/mnd. Faktura sendes på EHF hver måned.
        </p>
        <a href="#bestill" className="inline-block bg-amber-500 text-black px-6 py-3 rounded-lg text-xs font-bold uppercase cursor-pointer">
          Gå til Bestilling →
        </a>
      </div>
    </div>
  );
}
