'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  Hammer,
  FolderKanban,
  Package,
  Volume2,
  Loader2,
  EyeOff
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import Image from 'next/image';
import InstallGuide from './InstallGuide';
import WorkstationShowcase from './WorkstationShowcase';
import { toast } from 'sonner';
import { promptPWAInstall, isPWAInstalled, triggerAppDownloadOrInstall } from '../lib/pwa';
import { useAuth } from '../hooks/useAuth';

export type LandingTab = 'home' | 'offers_ks' | 'change_orders' | 'lukkesperre' | 'fdv' | 'customer_portal' | 'pricing' | 'ai' | 'hms';

interface LandingPageProps {
  onStartDemo: () => void;
  onOpenPortal: (code: string) => void;
  onViewChange: (view: any) => void;
  currentTab?: LandingTab;
  onTabChange?: (tab: LandingTab) => void;
  onInstallApp?: () => void;
}

export default function LandingPage({ 
  onStartDemo, 
  onOpenPortal, 
  onViewChange,
  currentTab = 'home',
  onTabChange,
  onInstallApp
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
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }, 250);
  };

  const handleInstallApp = async () => {
    if (onInstallApp) {
      onInstallApp();
      return;
    }
    if (isPWAInstalled()) {
      toast.info('VikingMester er allerede installert på din enhet!');
      return;
    }
    await triggerAppDownloadOrInstall({
      onInstalled: () => toast.info('VikingMester er allerede installert på din enhet!'),
      onAccepted: () => toast.success('VikingMester ble installert på hjemskjermen!'),
      onFallback: () => {
        toast.success('Snarvei lastet ned til enheten din!');
      }
    });
  };

  return (
    <div className="bg-white text-navy-900 min-h-screen selection:bg-electric-500/20 selection:text-electric-700 font-sans">
      {/* 🚀 SUB-NAVIGASJON: Vises kun når man har klikket seg inn på en detaljert fagfane (aldri på selve forsiden) */}
      {activeTab !== 'home' && (
        <div className="sticky top-20 sm:top-24 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 py-2 shadow-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => switchTab('home')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-electric-500 text-white shadow-purple-cta cursor-pointer shrink-0"
              >
                <Sparkles size={13} className="text-amber-300" />
                <span>← Tilbake til oversikt</span>
              </button>
            <button
              onClick={() => switchTab('offers_ks')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'offers_ks' 
                  ? "bg-emerald-600 text-white shadow-md" 
                  : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
              )}
            >
              <Zap size={13} className="text-emerald-400" />
              <span>1. Tilbud til KS</span>
              <span className="text-[9px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded-md uppercase font-black">Autonomt</span>
            </button>
            <button
              onClick={() => switchTab('change_orders')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'change_orders' 
                  ? "bg-rose-600 text-white shadow-md" 
                  : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
              )}
            >
              <FileSignature size={13} className="text-rose-400" />
              <span>2. Tale-til-Endring</span>
              <span className="text-[9px] bg-rose-400/20 text-rose-300 border border-rose-400/30 px-1.5 py-0.2 rounded-md uppercase font-black">NS 8406</span>
            </button>
            <button
              onClick={() => switchTab('lukkesperre')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'lukkesperre' 
                  ? "bg-purple-600 text-white shadow-md" 
                  : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
              )}
            >
              <Lock size={13} className="text-purple-400" />
              <span>3. Lukkesperre</span>
              <span className="text-[9px] bg-purple-400/20 text-purple-300 border border-purple-400/30 px-1.5 py-0.2 rounded-md uppercase font-black">TEK17</span>
            </button>
            <button
              onClick={() => switchTab('fdv')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'fdv' 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
              )}
            >
              <FileCheck size={13} className="text-blue-400" />
              <span>4. 1-Klikk FDV</span>
              <span className="text-[9px] bg-blue-400/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.2 rounded-md uppercase font-black">Boligmappa</span>
            </button>
            <button
              onClick={() => switchTab('customer_portal')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'customer_portal' 
                  ? "bg-cyan-600 text-white shadow-md" 
                  : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
              )}
            >
              <Smartphone size={13} className="text-cyan-400" />
              <span>5. Kundeportal</span>
              <span className="text-[9px] bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 px-1.5 py-0.2 rounded-md uppercase font-black">Signatur</span>
            </button>
            <button
              onClick={() => switchTab('pricing')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'pricing' 
                  ? "bg-amber-600 text-white shadow-md" 
                  : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
              )}
            >
              <DollarSign size={13} className="text-amber-400" />
              <span>6. Pakker & Priser</span>
              <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-md font-black">Fra 690,-</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% AUTONOM MESTERAI
            </span>
            <button
              onClick={handleInstallApp}
              className="text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 px-3 py-1 rounded-full border border-slate-700 transition-colors cursor-pointer"
            >
              <Download size={12} className="text-electric-400" />
              <span>Last ned app</span>
            </button>
          </div>
        </div>
      </div>
      )}

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
              onSwitchTab={switchTab}
            />
          </motion.div>
        )}

        {activeTab === 'offers_ks' && (
          <motion.div
            key="offers_ks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TacticalOffersKsView 
              onStartDemo={onStartDemo} 
              onBack={() => switchTab('home')} 
              onGoToPricing={() => switchTab('pricing')} 
            />
          </motion.div>
        )}

        {activeTab === 'change_orders' && (
          <motion.div
            key="change_orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TacticalChangeOrdersView 
              onStartDemo={onStartDemo} 
              onBack={() => switchTab('home')} 
              onGoToPricing={() => switchTab('pricing')} 
            />
          </motion.div>
        )}

        {activeTab === 'lukkesperre' && (
          <motion.div
            key="lukkesperre"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TacticalLukkesperreView 
              onStartDemo={onStartDemo} 
              onBack={() => switchTab('home')} 
              onGoToPricing={() => switchTab('pricing')} 
            />
          </motion.div>
        )}

        {activeTab === 'customer_portal' && (
          <motion.div
            key="customer_portal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TacticalPortalView 
              onStartDemo={onStartDemo} 
              onBack={() => switchTab('home')} 
              onGoToPricing={() => switchTab('pricing')} 
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
    </div>
  );
}

// -------------------------------------------------------------
// TACTICAL HOME VIEW
// -------------------------------------------------------------
function TacticalHomeView({ 
  onStartDemo, 
  onGoToPricing, 
  onViewChange,
  onSwitchTab
}: { 
  onStartDemo: () => void, 
  onGoToPricing: () => void, 
  onViewChange: (view: any) => void,
  onSwitchTab?: (tab: LandingTab) => void
}) {
  const { applyAuthSession } = useAuth();
  const [workerCount, setWorkerCount] = useState<number>(4);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadOrgnr, setLeadOrgnr] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadContactName, setLeadContactName] = useState('');
  const [leadPassword, setLeadPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState('tomrer');
  const [selectedPlan, setSelectedPlan] = useState<'solo' | 'team' | 'entreprenor'>('team');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

  // Brønnøysund auto-lookup state
  const [isSearchingBrreg, setIsSearchingBrreg] = useState(false);
  const [brregSuggestions, setBrregSuggestions] = useState<any[]>([]);
  const [verifiedBrregUnit, setVerifiedBrregUnit] = useState<any | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<any>(null);

  // 1. Slå opp 9-sifret organisasjonsnummer automatisk
  const handleOrgnrChange = async (val: string) => {
    setLeadOrgnr(val);
    const clean = val.replace(/\s+/g, '').trim();
    if (clean.length === 9 && /^\d{9}$/.test(clean)) {
      setIsSearchingBrreg(true);
      try {
        const res = await fetch(`/api/brreg?orgnr=${clean}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found && data.unit) {
            setVerifiedBrregUnit(data.unit);
            setLeadCompany(data.unit.navn);
            if (data.unit.tradeSuggestion) {
              setSelectedTrade(data.unit.tradeSuggestion);
            }
            if (data.unit.antallAnsatte) {
              const count = Math.max(1, Number(data.unit.antallAnsatte));
              setWorkerCount(count);
              if (count === 1) setSelectedPlan('solo');
              else if (count > 5) setSelectedPlan('entreprenor');
              else setSelectedPlan('team');
            }
            toast.success(`✓ Verifisert fra Brønnøysund: ${data.unit.navn}`);
          }
        }
      } catch (err) {
        console.warn('Brreg lookup error:', err);
      } finally {
        setIsSearchingBrreg(false);
      }
    } else if (verifiedBrregUnit && clean.length < 9) {
      setVerifiedBrregUnit(null);
    }
  };

  // 2. Søk i Brønnøysund mens brukeren skriver bedriftsnavn
  const handleCompanyChange = (val: string) => {
    setLeadCompany(val);
    if (verifiedBrregUnit && val !== verifiedBrregUnit.navn) {
      setVerifiedBrregUnit(null);
    }
    if (searchTimeout) clearTimeout(searchTimeout);

    const query = val.trim();
    if (query.length >= 3 && !verifiedBrregUnit) {
      const timer = setTimeout(async () => {
        setIsSearchingBrreg(true);
        try {
          const res = await fetch(`/api/brreg?query=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.units && data.units.length > 0) {
              setBrregSuggestions(data.units);
            } else {
              setBrregSuggestions([]);
            }
          }
        } catch (e) {
          console.warn('Brreg name search error:', e);
        } finally {
          setIsSearchingBrreg(false);
        }
      }, 350);
      setSearchTimeout(timer);
    } else {
      setBrregSuggestions([]);
    }
  };

  const handleSelectBrregUnit = (unit: any) => {
    setVerifiedBrregUnit(unit);
    setLeadCompany(unit.navn);
    setLeadOrgnr(unit.orgnr);
    if (unit.tradeSuggestion) {
      setSelectedTrade(unit.tradeSuggestion);
    }
    if (unit.antallAnsatte) {
      const count = Math.max(1, Number(unit.antallAnsatte));
      setWorkerCount(count);
      if (count === 1) setSelectedPlan('solo');
      else if (count > 5) setSelectedPlan('entreprenor');
      else setSelectedPlan('team');
    }
    setBrregSuggestions([]);
    toast.success(`✓ Valgte ${unit.navn} (${unit.orgnr})`);
  };

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
    if (!leadPassword || leadPassword.length < 8) {
      toast.error('Vennligst velg et passord på minst 8 tegn slik at du kan logge inn.');
      return;
    }
    if (!acceptedTerms) {
      toast.error('Du må bekrefte at du godtar forretningsvilkårene og personvernerklæringen (DPA).');
      return;
    }
    setIsSubmittingLead(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: leadCompany,
          orgnr: leadOrgnr,
          name: leadContactName || leadCompany,
          email: leadEmail,
          phone: leadPhone,
          password: leadPassword,
          trade: selectedTrade,
          plan: selectedPlan,
          workers: workerCount,
          acceptedTerms: true,
          acceptedTermsAt: new Date().toISOString()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeadSuccess(true);
        if (data.token && data.user) {
          localStorage.setItem('token', data.token);
          applyAuthSession(data.token, data.user);
          window.dispatchEvent(new CustomEvent('auth_session_created', { detail: { token: data.token, user: data.user } }));
        }
        toast.success('🎉 Gratulerer! Din 14-dagers gratis prøveperiode er aktivert.');

        // Automatisk navigering inn i Mester-arbeidsflaten
        setTimeout(() => {
          onViewChange('dashboard');
        }, 1800);
      } else {
        toast.error(data.message || data.error || 'Kunne ikke sende registrering.');
      }
    } catch {
      toast.error('Nettverksfeil. Ta kontakt på hei@vikingmester.no');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <div className="relative">
      {/* Hero Section - SELGER DRØMMEN OM FRIHET */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200 bg-radial-purple bg-grid-slate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Top Mission Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold tracking-wide uppercase shadow-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-amber-400">VIKINGMESTER 2.0</span>
              <span className="text-slate-500">•</span>
              <span>100% AUTONOM BYGGELEDER & MESTER-WORKSTATION</span>
            </div>
          </div>

          {/* Bold Punchy Headline - Selger drømmen til håndverkeren */}
          <div className="text-center max-w-4xl mx-auto mb-8">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-navy-900 leading-[1.2] pb-1">
              Friheten tilbake. Null kveldsarbeid.
              <span className="block text-gradient-purple mt-2 pb-3 pt-1">Få betalt for hver eneste endringstime.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-sans">
              Snakk inn byggedagboken fra varebilen på vei hjem. La MesterAI opprette byggeplass, kontrakter og TEK17-sjekklister automatisk. Få kunden til å godkjenne endringsordrer via e-post, Teams eller Slack på 15 sekunder før du rører hammeren. Du har fri når du kommer hjem til familien.
            </p>

            {/* Micro-guarantees */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Fra kun 690 kr/mnd</span>
              </span>
              <span className="flex items-center gap-1.5 text-electric-700 bg-electric-50 px-2.5 py-1 rounded-full border border-electric-200">
                <CheckCircle2 size={13} className="text-electric-600" />
                <span>0,- etablering • Ingen binding</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                <CheckCircle2 size={13} className="text-slate-600" />
                <span>Norsk NS 8406 & TEK17</span>
              </span>
            </div>
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
              onClick={() => {
                const el = document.getElementById('live-demo');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  onStartDemo();
                }
              }}
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-white hover:bg-slate-50 text-navy-900 border border-slate-200 text-sm font-bold shadow-card-soft transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Prøvekjør Agenten Live</span>
              <Sparkles size={15} className="text-amber-500 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* 💎 1:1 INTERACTIVE MESTER-WORKSTATION TERMINAL MOCKUP (GJENSPEILER BACKEND 100%) */}
          <div className="max-w-6xl mx-auto bg-[#0A101D] border-2 border-slate-800 rounded-3xl shadow-2xl p-4 sm:p-7 relative overflow-hidden text-white">
            {/* Ambient cyberpunk background glow */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Window Chrome Header - Identisk med MesterWorkstation.tsx */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800 text-xs font-sans text-slate-400 relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block shadow-xs" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block shadow-xs" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block shadow-xs" />
                <span className="ml-2 text-white font-extrabold tracking-wide text-[11px] sm:text-xs">
                  VIKINGMESTER WORKSTATION v2.6 • MESTERAI KJERNE
                </span>
                <span className="hidden md:inline-flex items-center gap-1 ml-2 text-[10px] bg-slate-800/80 text-purple-300 px-2 py-0.5 rounded-md border border-purple-500/20">
                  <FolderKanban size={10} />
                  <span>Villa Holmenkollen</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-purple-400 font-mono text-[11px]">
                  GEMINI 3.8 FLASH (0 ms)
                </span>
                <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
            </div>

            {/* 3 Hyper-realistiske kjernefunksjoner i mørkt workstation-design */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              
              {/* 1. Tale-til-Endringsordre (NS 8406) */}
              <div className="bg-slate-900/90 border border-rose-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-rose-400 transition-colors shadow-lg">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1.5">
                      <Mic size={14} className="text-rose-400 animate-pulse" />
                      1. Tale-til-Endring (NS 8406)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                      E-POST & VARSEL SENDT
                    </span>
                  </div>

                  {/* Lydtranskripsjon fra stillaset */}
                  <div className="p-3 rounded-xl bg-[#080C14] border border-slate-800 text-xs text-slate-200 font-medium italic mb-3">
                    <p className="text-slate-400 text-[10px] uppercase font-mono not-italic mb-1 flex items-center gap-1">
                      <Volume2 size={11} className="text-rose-400" />
                      Innlest tale fra byggeplass:
                    </p>
                    <p>"Kunden vil ha 6 ekstra downlights og flytte sluk 15 cm på badet."</p>
                  </div>

                  <div className="text-xs space-y-1.5 text-slate-300">
                    <p className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span>Beregnet: 18 500 kr eks. mva (+2 dager frist)</span>
                    </p>
                    <p className="text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-rose-400 shrink-0" />
                      <span>Kunde (Ola Nordmann) godkjente via e-post</span>
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      Juridisk bindende kontrakt arkivert automatisk
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-400">FAKTURERT TILLEGG</span>
                  <span className="text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    +18 500 KR SIKRET
                  </span>
                </div>
              </div>

              {/* 2. Tverrfaglig Lukkesperre (TEK17) */}
              <div className="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-purple-400 transition-colors shadow-lg">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-purple-300 uppercase flex items-center gap-1.5">
                      <Lock size={14} className="text-purple-400" />
                      2. Lukkesperre (TEK17)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                      SONE BAD LÅST
                    </span>
                  </div>
                  
                  {/* Statusboks med advarsel */}
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs mb-3">
                    <p className="font-bold text-amber-300 flex items-center gap-1">
                      <span>⚠️ STOPP: Ikke plate vegg i bad 2. etg</span>
                    </p>
                    <p className="text-[11px] text-amber-200/80 mt-1 leading-relaxed">
                      VVS-underentreprenør mangler trykkprøving av rør-i-rør (TEK17 § 13-15).
                    </p>
                  </div>

                  <div className="text-xs space-y-1.5">
                    <p className="text-emerald-400 font-medium flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Elektriker rørføring: Kvittert & fotografert</span>
                    </p>
                    <p className="text-amber-400 font-bold flex items-center gap-1.5">
                      <span>✗</span>
                      <span>Trykkprøving VVS: Venter på kvittering</span>
                    </p>
                    <p className="text-purple-300 text-[11px]">
                      Automatisk purring sendt til rørlegger via e-post og Teams
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-400">UNNGÅTT RIVESKADE</span>
                  <span className="text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                    SPART CA. 65 000 KR
                  </span>
                </div>
              </div>

              {/* 3. Autonom Tilbud ➔ Kontrakt ➔ KS */}
              <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-emerald-400 transition-colors shadow-lg">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                      <Zap size={14} className="text-emerald-400" />
                      3. Tilbud til KS (Autonomt)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      3 SEKUNDER
                    </span>
                  </div>

                  {/* Autopilot kvittering */}
                  <div className="p-3 rounded-xl bg-[#080C14] border border-slate-800 text-xs text-slate-200 mb-3">
                    <p className="text-emerald-400 font-bold text-[11px] flex items-center gap-1 mb-1">
                      <Sparkles size={12} />
                      Kunde godkjente tilbud kr 420 000,-
                    </p>
                    <p className="text-[11px] text-slate-400">
                      MesterAI har generert prosjektmappe, kontrakt og KS.
                    </p>
                  </div>

                  <div className="text-xs space-y-1.5 text-slate-300 font-medium">
                    <p className="flex items-center gap-1.5 text-emerald-400">
                      <span>✓</span>
                      <span>NS 8406 Byggekontrakt generert</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-emerald-400">
                      <span>✓</span>
                      <span>18 TEK17 sjekkpunkter tildelt fagarbeidere</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-300">
                      <span>✓</span>
                      <span>Sanntidsvær Yr.no koblet på byggedagbok</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-400">TID BRUKT</span>
                  <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    0 TIMER KVELDSARBEID
                  </span>
                </div>
              </div>

            </div>

            {/* Terminal Bottom Prompt Bar - Lar brukeren oppleve kraften */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 w-full sm:w-auto bg-[#080C14] px-3.5 py-2 rounded-xl border border-slate-800 text-slate-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400">MesterAI Prompt:</span>
                <span className="text-purple-300 truncate">"Snakk inn endring, avvik eller opprett prosjekt..."</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onStartDemo}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md text-xs"
                >
                  <Sparkles size={13} />
                  <span>Prøvekjør Cockpiten</span>
                </button>
                <a
                  href="#priser"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all text-xs"
                >
                  Se pakker fra 690,-
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 Ekte Mester Workstation Backend Showcase */}
      <section id="live-demo" className="py-20 bg-[#070B14] border-y border-slate-800 relative overflow-hidden text-white">
        {/* Ambient glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-purple-600/15 via-blue-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Ekte brukergrensesnitt · Mester Workstation
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Slik ser VikingMester ut når du logger inn
            </h2>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-normal">
              Ingen falske animasjoner eller kompliserte oppsett. Alt du trenger for å styre byggeplassen, registrere avvik, føre byggedagbok og sikre tilleggsarbeid – samlet i én lynrask, stemmestyrt arbeidsstasjon.
            </p>
          </div>

          {/* Screenshot Showcase Container (Krystallklar, ekte Workstation) */}
          <div className="max-w-6xl mx-auto rounded-2xl sm:rounded-3xl border border-white/15 bg-[#0c1220] shadow-2xl shadow-purple-950/60 overflow-hidden relative group">
            {/* Top Window Bar (Ekte nettleserramme) */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0c1220] border-b border-white/10 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block shadow-sm" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block shadow-sm" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block shadow-sm" />
                <div className="ml-3 px-3 py-1 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-slate-300 flex items-center gap-2">
                  <Lock size={11} className="text-emerald-400" />
                  <span>vikingmester.no/workstation</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Arbeidsstasjon
                </span>
              </div>
            </div>

            {/* Ekte krystallklar Workstation UI i sin helhet */}
            <div className="relative w-full overflow-hidden bg-[#0A101D]">
              <WorkstationShowcase
                onInteract={(action) => {
                  if (action) {
                    toast.info(`Demonstrasjon: ${action}`);
                  }
                  const el = document.getElementById('bestill');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else onGoToPricing();
                }}
              />
            </div>
          </div>

          {/* 4 Feature Badges beneath image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 max-w-6xl mx-auto text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-2">
                <Mic size={16} className="text-purple-400" />
                <span>100% Stemmestyrt</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Snakk inn byggedagboken, avvik og endringer direkte fra stillaset eller varebilen.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-2">
                <Camera size={16} className="text-rose-400" />
                <span>TEK17 AI-Bildevisjon</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Knips sluk og membran. Systemet stempler GPS, tidspunkt og sjekker mot Våtromsnormen.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-2">
                <FileCheck size={16} className="text-blue-400" />
                <span>NS 8406 Endringsordrer</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Send formelt varsel på 15 sekunder før tilleggsarbeid starter. Unngå tapte penger.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-2">
                <Layers size={16} className="text-emerald-400" />
                <span>20+ Integrerte Moduler</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Alt fra SJA og stoffkartotek til timeføring, prosjektchatt og lærlingmodul.
              </p>
            </div>
          </div>

          {/* CTA under screenshot */}
          <div className="mt-10 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                const el = document.getElementById('bestill');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else onGoToPricing();
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-electric-600 hover:from-purple-500 hover:to-electric-500 text-white font-bold text-sm shadow-purple-cta transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Start 14 dagers gratis prøveperiode</span>
              <ArrowRight size={16} />
            </button>
            <a
              href="#moduler"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm border border-slate-800 transition-colors"
            >
              Utforsk alle 20 moduler
            </a>
          </div>
        </div>
      </section>

      {/* Direct Comparison: Old Apps vs VikingMester */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1 rounded-full border border-electric-300/40">
              BRANSJEREVOLUSJON
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-navy-900 mt-4 leading-tight">
              HVORFOR DE GAMLE KS-APPENE FEILER
            </h2>
            <p className="text-slate-600 mt-4 text-sm sm:text-base leading-relaxed">
              SmartDok, Holte og permer ble laget for PC på kontoret. VikingMester er bygget for tømreren, rørleggeren og basen ute på stillaset.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* The Old Way */}
            <div className="bg-white border-2 border-rose-200 rounded-3xl p-6 sm:p-8 shadow-card-soft">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <X size={20} />
                </div>
                <h3 className="text-lg font-bold text-rose-950 uppercase">Det Gamle KS-Byråkratiet</h3>
              </div>
              <ul className="space-y-4 text-xs sm:text-sm font-sans text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-black text-base mt-[-2px]">✗</span>
                  <span>45 minutter kveldsarbeid foran PC etter en 10-timers arbeidsdag.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-black text-base mt-[-2px]">✗</span>
                  <span>Muntlige endringer blir aldri varslet skriftlig – håndverker taper 80 000 kr i sluttoppgjør.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-black text-base mt-[-2px]">✗</span>
                  <span>Tømrer gipser over rør som ikke er trykktestet – vegg må rives etter lekkasje.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-black text-base mt-[-2px]">✗</span>
                  <span>Dyre lisenser per bruker og 12 måneders låste avtaler.</span>
                </li>
              </ul>
            </div>

            {/* The VikingMester Way */}
            <div className="bg-white border-2 border-electric-500 rounded-3xl p-6 sm:p-8 shadow-purple-cta relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3.5 py-1 bg-gradient-to-r from-electric-500 to-electric-400 text-white font-bold text-[10px] uppercase rounded-bl-xl shadow-xs">
                VIKINGMESTER PRO
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-electric-50 text-electric-600 flex items-center justify-center font-bold">
                  <Check size={20} />
                </div>
                <h3 className="text-lg font-bold text-navy-900 uppercase">VikingMester Autonome Agent</h3>
              </div>
              <ul className="space-y-4 text-xs sm:text-sm font-sans text-slate-800 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-black text-base mt-[-2px]">✓</span>
                  <span>Snakk inn dagboken på 20 sekunder fra bilen – AI gjør resten.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-black text-base mt-[-2px]">✓</span>
                  <span>Tale-til-endringsordre (NS 8406) godkjent av byggherre via e-post eller Teams før arbeidet starter.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-black text-base mt-[-2px]">✓</span>
                  <span>Tverrfaglig lukkesperre hindrer plating før rør og el er fotografert og trykktestet.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-black text-base mt-[-2px]">✓</span>
                  <span>Forutsigbar månedlig bedriftsfaktura. Null bindingstid. Full fleksibilitet.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The 7 Crafts Trades Grid */}
      <section className="py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1 rounded-full border border-electric-300/40">
              TILPASSET ALLE FAG
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-navy-900 mt-4 leading-tight">
              SKREDDERSYDD FOR DITT HÅNDVERKSFAG
            </h2>
            <p className="text-slate-600 mt-4 text-sm sm:text-base leading-relaxed">
              VikingMester har innebygde regler, forskrifter og sjekklister for alle 7 kjernefag i norsk bygg og anlegg.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Tømrer */}
            <div className="bg-white border border-slate-200 hover:border-electric-400 rounded-3xl p-6 sm:p-7 shadow-card-soft hover:shadow-card-hover transition-all group">
              <div className="text-electric-600 mb-3 text-xs font-bold flex items-center justify-between">
                <span>[FAG 01]</span>
                <span className="text-[11px] font-mono text-slate-500">TEK17 § 13-14</span>
              </div>
              <h3 className="text-lg font-extrabold text-navy-900 mb-2 group-hover:text-electric-600 transition-colors">Tømrer & Byggmester</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans mb-4">
                U-verdiberegning, fuktsikring, lufttetthet, takstol-kontroll og automatisk sjekkliste for gipsing og isolering.
              </p>
              <div className="text-xs font-semibold text-electric-700 bg-electric-50 px-3 py-1 rounded-full border border-electric-200 inline-block">
                Spesialregel: Sperre mot lukking før VVS/El-signoff
              </div>
            </div>

            {/* 2. Rørlegger */}
            <div className="bg-white border border-slate-200 hover:border-electric-400 rounded-3xl p-6 sm:p-7 shadow-card-soft hover:shadow-card-hover transition-all group">
              <div className="text-electric-600 mb-3 text-xs font-bold flex items-center justify-between">
                <span>[FAG 02]</span>
                <span className="text-[11px] font-mono text-slate-500">BVN 31.205</span>
              </div>
              <h3 className="text-lg font-extrabold text-navy-900 mb-2 group-hover:text-electric-600 transition-colors">Rørlegger & VVS</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans mb-4">
                Slukmansjett-visjon, rør-i-rør trykktesting, klemring-verifisering og fallmåling mot sluk iht. Våtromsnormen.
              </p>
              <div className="text-xs font-semibold text-electric-700 bg-electric-50 px-3 py-1 rounded-full border border-electric-200 inline-block">
                Spesialregel: Obligatorisk trykktest-attest (PDF)
              </div>
            </div>

            {/* 3. Elektriker */}
            <div className="bg-white border border-slate-200 hover:border-electric-400 rounded-3xl p-6 sm:p-7 shadow-card-soft hover:shadow-card-hover transition-all group">
              <div className="text-electric-600 mb-3 text-xs font-bold flex items-center justify-between">
                <span>[FAG 03]</span>
                <span className="text-[11px] font-mono text-slate-500">NEK 400:2022</span>
              </div>
              <h3 className="text-lg font-extrabold text-navy-900 mb-2 group-hover:text-electric-600 transition-colors">Elektriker & Installatør</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans mb-4">
                Samsvarserklæring på 1-2-3, sluttkontroll, kursfortegnelse og fotodokumentasjon av skjulte rørføringer i vegg.
              </p>
              <div className="text-xs font-semibold text-electric-700 bg-electric-50 px-3 py-1 rounded-full border border-electric-200 inline-block">
                Spesialregel: 5-sikre kontrollskjema
              </div>
            </div>

            {/* 4. Grunnarbeid */}
            <div className="bg-white border border-slate-200 hover:border-electric-400 rounded-3xl p-6 sm:p-7 shadow-card-soft hover:shadow-card-hover transition-all group">
              <div className="text-electric-600 mb-3 text-xs font-bold flex items-center justify-between">
                <span>[FAG 04]</span>
                <span className="text-[11px] font-mono text-slate-500">Geomatikk / VA</span>
              </div>
              <h3 className="text-lg font-extrabold text-navy-900 mb-2 group-hover:text-electric-600 transition-colors">Graver & Grunnarbeid</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans mb-4">
                Gravemelding, sjekk av kabler i bakken, komprimering, dreneringsfall og fotodokumentasjon før gjenfylling.
              </p>
              <div className="text-xs font-semibold text-electric-700 bg-electric-50 px-3 py-1 rounded-full border border-electric-200 inline-block">
                Spesialregel: Pukk/drenering bildebevis
              </div>
            </div>

            {/* 5. Maler & Mur */}
            <div className="bg-white border border-slate-200 hover:border-electric-400 rounded-3xl p-6 sm:p-7 shadow-card-soft hover:shadow-card-hover transition-all group">
              <div className="text-electric-600 mb-3 text-xs font-bold flex items-center justify-between">
                <span>[FAG 05]</span>
                <span className="text-[11px] font-mono text-slate-500">NS 3420 / BVN</span>
              </div>
              <h3 className="text-lg font-extrabold text-navy-900 mb-2 group-hover:text-electric-600 transition-colors">Maler, Mur & Flis</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans mb-4">
                Smøremembran tykkelsesmåling, fuktkontroll i betong, hulrom under fliser og overflatefinish iht. toleranseklasse.
              </p>
              <div className="text-xs font-semibold text-electric-700 bg-electric-50 px-3 py-1 rounded-full border border-electric-200 inline-block">
                Spesialregel: Membran sjikttykkelse kontroll
              </div>
            </div>

            {/* 6. Totalentreprenør */}
            <div className="bg-white border-2 border-electric-300 rounded-3xl p-6 sm:p-7 shadow-card-hover transition-all group bg-gradient-to-b from-electric-50/40 to-white">
              <div className="text-electric-600 mb-3 text-xs font-bold flex items-center justify-between">
                <span>[FAG 06 & 07]</span>
                <span className="text-[11px] font-black text-electric-600">TOTALENTREPRENØR</span>
              </div>
              <h3 className="text-lg font-extrabold text-navy-900 mb-2 group-hover:text-electric-600 transition-colors">Byggeleder & Entreprenør</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans mb-4">
                Tverrfaglig kontrolltårn, lukkesperre per rom/etasje, automatisk samling av underentreprenørers FDV og SHA-plan.
              </p>
              <div className="text-xs font-semibold text-electric-700 bg-electric-50 px-3 py-1 rounded-full border border-electric-200 inline-block">
                Spesialfunksjon: Tverrfaglig Lukkesperre
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dedikert SEO- og Fagseksjon: Komplett verktøykasse for norsk byggebransje */}
      <section className="py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1 rounded-full border border-electric-300/40">
              KOMPLETT FAGSYSTEM
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-navy-900 mt-4 leading-tight">
              UTFORSK VÅRE SPESIALISERINGER & MODULER
            </h2>
            <p className="text-slate-600 mt-4 text-sm sm:text-base leading-relaxed font-sans">
              Alt du trenger for å levere feilfrie bygg, bestå revisjoner fra Arbeidstilsynet og sikre full betaling for ekstraarbeid.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 1. KS-system */}
            <Link 
              href="/ks-system"
              className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-electric-400 hover:shadow-card-hover transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileCheck size={24} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">TEK17 & BVN</span>
                  <span className="text-xs text-slate-400 font-mono">PBL § 21</span>
                </div>
                <h3 className="text-xl font-bold text-navy-900 group-hover:text-electric-600 transition-colors mb-3">
                  KS-system for håndverkere
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-sans mb-6">
                  Komplett kvalitetssikring rett i lomma. Snakk inn byggedagboken på 20 sekunder, ta bilder og generer revisjonsgodkjente rapporter til byggherre og Boligmappa.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-electric-600 group-hover:translate-x-1 transition-transform">
                <span>Les mer om KS-systemet</span>
                <ArrowRight size={14} />
              </div>
            </Link>

            {/* 2. HMS & Internkontroll */}
            <Link 
              href="/hms"
              className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-electric-400 hover:shadow-card-hover transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={24} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">ARBEIDSTILSYNET</span>
                  <span className="text-xs text-slate-400 font-mono">IK-FORSKRIFTEN § 5</span>
                </div>
                <h3 className="text-xl font-bold text-navy-900 group-hover:text-electric-600 transition-colors mb-3">
                  HMS & Internkontroll
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-sans mb-6">
                  Lovpålagt HMS for bygg og anlegg med null papirarbeid. Digitale vernerunder, risikovurderinger og beredskapsplaner ferdig utfylt og godkjent.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-electric-600 group-hover:translate-x-1 transition-transform">
                <span>Les mer om HMS & vernerunder</span>
                <ArrowRight size={14} />
              </div>
            </Link>

            {/* 3. Avvikshåndtering TEK17 */}
            <Link 
              href="/avvikshandtering"
              className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-electric-400 hover:shadow-card-hover transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Camera size={24} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">AI-VISJON</span>
                  <span className="text-xs text-slate-400 font-mono">TEK17 / BVN</span>
                </div>
                <h3 className="text-xl font-bold text-navy-900 group-hover:text-electric-600 transition-colors mb-3">
                  Avvikshåndtering (TEK17)
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-sans mb-6">
                  Knips bilde av konstruksjonen – Gemini AI identifiserer brudd på TEK17 og Våtromsnormen automatisk. Tverrfaglig lukkesperre hindrer plating før feil er rettet.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-electric-600 group-hover:translate-x-1 transition-transform">
                <span>Les mer om avvikskontroll</span>
                <ArrowRight size={14} />
              </div>
            </Link>

            {/* 4. SJA */}
            <Link 
              href="/sja"
              className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-electric-400 hover:shadow-card-hover transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <AlertTriangle size={24} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">SIKKER JOBB ANALYSE</span>
                  <span className="text-xs text-slate-400 font-mono">YR.NO SYNC</span>
                </div>
                <h3 className="text-xl font-bold text-navy-900 group-hover:text-electric-600 transition-colors mb-3">
                  Sikker Jobb Analyse (SJA)
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-sans mb-6">
                  Autonom SJA på 30 sekunder. Snakk inn oppgaven på stillaset – AI henter sanntids vind- og nedbørsdata fra Yr og foreslår relevante sikkerhetstiltak.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-electric-600 group-hover:translate-x-1 transition-transform">
                <span>Les mer om SJA & værrisiko</span>
                <ArrowRight size={14} />
              </div>
            </Link>

            {/* 5. Stoffkartotek */}
            <Link 
              href="/stoffkartotek"
              className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-electric-400 hover:shadow-card-hover transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Package size={24} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">OFFLINE KARTOTEK</span>
                  <span className="text-xs text-slate-400 font-mono">FORSKRIFT OM UTTAKT § 2</span>
                </div>
                <h3 className="text-xl font-bold text-navy-900 group-hover:text-electric-600 transition-colors mb-3">
                  Digitalt Stoffkartotek
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-sans mb-6">
                  Full kontroll på kjemikalier, lim, maling og fugemasser. Sikkerhetsdatablader (SDS) og faresymboler tilgjengelig offline ute i felten for alle ansatte.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-electric-600 group-hover:translate-x-1 transition-transform">
                <span>Les mer om stoffkartoteket</span>
                <ArrowRight size={14} />
              </div>
            </Link>

            {/* 6. Prosjektstyring & Endringsordre */}
            <Link 
              href="/prosjektstyring"
              className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-electric-400 hover:shadow-card-hover transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FolderKanban size={24} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">NS 8406 / NS 8405</span>
                  <span className="text-xs text-slate-400 font-mono">LØNNSOMHET</span>
                </div>
                <h3 className="text-xl font-bold text-navy-900 group-hover:text-electric-600 transition-colors mb-3">
                  Prosjektstyring & Endring
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-sans mb-6">
                  Få betalt for uvarslet ekstraarbeid. Generer formelle endringsvarsler på 15 sekunder med tale, send direkte til byggherre og få godkjenning via e-post, Teams eller Slack.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-electric-600 group-hover:translate-x-1 transition-transform">
                <span>Les mer om endringsordrer</span>
                <ArrowRight size={14} />
              </div>
            </Link>
          </div>

          {/* Quick Pillar Links */}
          <div className="mt-12 pt-8 border-t border-slate-200 flex flex-wrap items-center justify-center gap-4 text-xs font-bold">
            <span className="text-slate-400 uppercase tracking-wider">Hurtigsnarveier:</span>
            <Link href="/priser" className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-full border border-slate-200 transition-colors">
              Priser & Rammer
            </Link>

            <Link href="/faq" className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-full border border-slate-200 transition-colors">
              Ofte stilte spørsmål (FAQ)
            </Link>
            <Link href="/om-oss" className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-full border border-slate-200 transition-colors">
              Om oss & Sikkerhet
            </Link>
            <Link href="/kontakt" className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-full border border-slate-200 transition-colors">
              Kontakt & Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-card-hover p-6 sm:p-10">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1 rounded-full border border-electric-300/40">
                LØNNSOMHETSKALKULATOR
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-navy-900 mt-4 leading-tight">
                HVA KOSTER DET Å IKKE BRUKE VIKINGMESTER?
              </h2>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-700 font-bold mb-2">
                <span>ANTALL FAGARBEIDERE / HÅNDVERKERE:</span>
                <span className="text-lg font-black text-electric-600">{workerCount} ansatte</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="30" 
                value={workerCount} 
                onChange={(e) => setWorkerCount(Number(e.target.value))}
                className="w-full accent-electric-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-xs text-slate-500 font-medium mt-2">
                <span>1 mann (Solo)</span>
                <span>5 mann (Team)</span>
                <span>15 mann</span>
                <span>30 mann (Entreprenør)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl text-center">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">Sparte timer / mnd</span>
                <p className="text-2xl sm:text-3xl font-black text-navy-900 font-mono mt-1">{hoursSavedPerMonth} timer</p>
                <span className="text-xs text-slate-500">14t per mann</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl text-center">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">Ekstra fakturert endring</span>
                <p className="text-2xl sm:text-3xl font-black text-electric-600 font-mono mt-1">+{extraInvoicedChangeOrders.toLocaleString('no-NO')} kr</p>
                <span className="text-xs text-slate-500">NS 8406 endringsordrer</span>
              </div>

              <div className="bg-electric-50 border border-electric-300/40 p-4 sm:p-5 rounded-2xl text-center">
                <span className="text-xs font-mono font-bold text-electric-600 uppercase">Total verdi per måned</span>
                <p className="text-2xl sm:text-3xl font-black text-electric-600 font-mono mt-1">+{totalValueMonth.toLocaleString('no-NO')} kr</p>
                <span className="text-xs text-emerald-700 font-bold">1 400% ROI</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-700 mb-4 font-sans font-medium">
                Pakke som passer for deg: <span className="text-navy-900 font-bold underline decoration-electric-400">{workerCount <= 1 ? 'VikingMester Solo (690 kr/mnd)' : workerCount <= 5 ? 'VikingMester Team (1 490 kr/mnd)' : 'VikingMester Totalentreprenør Pro (fra 2 990 kr/mnd)'}</span>
              </p>
              <a 
                href="#bestill"
                className="inline-block px-8 py-3.5 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold text-xs uppercase tracking-wider shadow-purple-cta hover:shadow-purple-hover transition-colors cursor-pointer"
              >
                Gå til bestilling →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Matrix with strict limits */}
      <section id="priser" className="py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1 rounded-full border border-electric-300/40">
              FORUTSIGBARE DRIFTSKOSTNADER • 14 DAGERS PRØVEPERIODE
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-navy-900 mt-4 leading-tight">
              100% AUTONOM BYGGELEDER. ZERO-ENTRY AI.
            </h2>
            <p className="text-slate-600 mt-4 text-sm sm:text-base leading-relaxed">
              Alltid månedlig bedriftsfaktura eller EHF. Ingen bindingstid. 14 dagers gratis prøveperiode med umiddelbar oppstart på 2 minutter.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {/* Solo */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card-soft p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">ENKELTMANNSFORETAK / MESTER</span>
                <h3 className="text-2xl font-black text-navy-900 mt-1">VikingMester Solo</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-black text-navy-900 font-sans">690,-</span>
                  <span className="text-xs text-slate-500 font-mono ml-2">/mnd eks. mva</span>
                  <div className="text-xs text-emerald-600 font-bold mt-1">Kun 550,-/mnd ved årlig avtale</div>
                </div>
                <div className="space-y-3 text-xs sm:text-sm font-sans text-slate-700 border-t border-slate-200 pt-4">
                  <p className="text-electric-600 font-bold font-mono text-xs">AUTONOME FUNKSJONER & RAMMER:</p>
                  <p className="flex items-center gap-2 font-semibold text-navy-900">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>100% Autonom MesterAI Copilot (Ctrl+M)</span>
                  </p>
                  <p className="flex items-center gap-2 font-semibold text-electric-600">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Gemini 3.8 Flash Vision (bildekontroll)</span>
                  </p>
                  <p className="flex items-center gap-2 font-semibold text-emerald-600">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>100% Offline-modus med bakgrunnssynk</span>
                  </p>
                  <p className="flex items-center gap-2 font-semibold text-electric-600">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Handsfree stemmestyring (timer & overtid)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Pinning & lagring av viktige AI-samtaler</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>1 aktiv fagarbeider (inntil 5 prosjekter)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Yr.no sanntids byggedagbok (værlogging)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Lovpålagt SJA (Sikker Jobb Analyse)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Digitalt stoffkartotek offline på byggeplass</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Eksport til Boligmappa PDF på 1 klikk</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Omnichannel (Discord, Slack & Teams i felt)</span>
                  </p>
                </div>
              </div>
              <a 
                href="#bestill"
                onClick={() => setSelectedPlan('solo')}
                className="w-full mt-8 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold text-xs uppercase tracking-wider text-center border border-slate-200 transition-colors cursor-pointer"
              >
                Prøv Solo gratis i 14 dager
              </a>
            </div>

            {/* Team - POPULAR */}
            <div className="bg-white border-2 border-electric-500 rounded-3xl shadow-purple-cta p-6 sm:p-8 flex flex-col justify-between relative shadow-xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-electric-500 to-electric-400 text-white font-bold text-[11px] tracking-wide rounded-full shadow-md">
                MEST POPULÆR FOR HÅNDVERKERE
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-electric-600 uppercase">FOR SMÅ & MELLOMSTORE BYGGFIRMAER</span>
                <h3 className="text-2xl font-black text-navy-900 mt-1">VikingMester Team</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-black text-electric-600 font-sans">1 490,-</span>
                  <span className="text-xs text-slate-500 font-mono ml-2">/mnd eks. mva</span>
                  <div className="text-xs text-emerald-600 font-bold mt-1">Kun 1 190,-/mnd ved årlig avtale</div>
                </div>
                <div className="space-y-3 text-xs sm:text-sm font-sans text-slate-800 font-medium border-t border-slate-200 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">ALT I SOLO INKLUDERT, PLUSS:</p>
                  <p className="flex items-center gap-2 font-bold text-electric-600">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>NYHET: Prosjekt- & Firmachatt (Feltkommunikasjon)</span>
                  </p>
                  <p className="flex items-center gap-2 font-bold text-navy-900">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Inntil 5-10 aktive fagarbeidere (+199,- per ekstra)</span>
                  </p>
                  <p className="flex items-center gap-2 font-bold text-electric-600">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Tale-til-endringsordre (NS 8406) med signering via mail</span>
                  </p>
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Tverrfaglig Lukkesperre (Sone låst før VVS/El)</span>
                  </p>
                  <p className="flex items-center gap-2 font-bold text-navy-900">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Ledergodkjenning av timer & overtid med lønnseksport</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Inntil 15-20 aktive byggeprosjekter samtidig</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Prosjektøkonomi & marginvarsling i sanntid</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>1-Klikk Slutt-FDV til Boligmappa & kundeportal</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Flerspråklig (Norsk, Engelsk, Polsk, Litauisk)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>25 GB sikker skylagring for tegninger & FDV</span>
                  </p>
                </div>
              </div>
              <a 
                href="#bestill"
                onClick={() => setSelectedPlan('team')}
                className="w-full mt-8 py-3.5 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold text-xs uppercase tracking-wider text-center shadow-purple-cta hover:shadow-purple-hover transition-all cursor-pointer"
              >
                Prøv Team gratis i 14 dager
              </a>
            </div>

            {/* Totalentreprenør */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card-soft p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">FOR STØRRE ENTREPRENØRER</span>
                <h3 className="text-2xl font-black text-navy-900 mt-1">Totalentreprenør Pro</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-black text-navy-900 font-sans">Fra 2 990,-</span>
                  <span className="text-xs text-slate-500 font-mono ml-2">/mnd eks. mva</span>
                  <div className="text-xs text-emerald-600 font-bold mt-1">Kun 2 390,-/mnd ved årlig avtale</div>
                </div>
                <div className="space-y-3 text-xs sm:text-sm font-sans text-slate-700 border-t border-slate-200 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">ALT I TEAM INKLUDERT, PLUSS:</p>
                  <p className="flex items-center gap-2 font-bold text-navy-900">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Underentreprenør-portal (UE-innsyn & KS)</span>
                  </p>
                  <p className="flex items-center gap-2 font-bold text-electric-600">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Autonom Tilbud-til-Prosjekt-til-KS motor (3 sek)</span>
                  </p>
                  <p className="flex items-center gap-2 font-bold text-electric-600">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Juridisk NS 8405 / NS 8406 endringsordremotor</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Ubegrenset antall aktive brukere & prosjekter</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Tverrfaglig Lukkesperre med tidslås og soner</span>
                  </p>
                  <p className="flex items-center gap-2 font-semibold text-emerald-600">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Tripletex, PowerOffice Go & Fiken API-bro</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>NOBB Enterprise API, Boligmappa massedybde-synk</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>SuperAdmin bedriftsportal, revisjonslogger & 99.9% SLA</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Dedikert onboarding, opplæring & prioritert support</span>
                  </p>
                </div>
              </div>
              <a 
                href="#bestill"
                onClick={() => setSelectedPlan('entreprenor')}
                className="w-full mt-8 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold text-xs uppercase tracking-wider text-center border border-slate-200 transition-colors cursor-pointer"
              >
                Prøv Entreprenør gratis i 14 dager
              </a>
            </div>
          </div>

          {/* Addons matrix */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-5xl mx-auto shadow-card-soft mt-12">
            <h4 className="text-sm font-bold text-electric-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-electric-500" />
              MODULÆRE TILLEGG & TOP-UP PÅ ALLE NIVÅER
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs sm:text-sm font-sans">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <span className="text-slate-800 font-bold">Liten Mester Top-up:</span>
                <span className="text-electric-600 font-mono font-black">490,- (+5M tok)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <span className="text-slate-800 font-bold">Stor Mester Top-up:</span>
                <span className="text-electric-600 font-mono font-black">1 490,- (+20M tok)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <span className="text-slate-800 font-bold">Ekstra fagarbeider:</span>
                <span className="text-electric-600 font-mono font-black">199,- /mnd</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <span className="text-slate-800 font-bold">+10 Prosjekter:</span>
                <span className="text-electric-600 font-mono font-black">490,- /mnd</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <span className="text-slate-800 font-bold">+10 GB Lagring:</span>
                <span className="text-electric-600 font-mono font-black">149,- /mnd</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <span className="text-slate-800 font-bold">Tripletex / PowerOffice:</span>
                <span className="text-electric-600 font-mono font-black">490,- /mnd</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Direct Order Form (Lead Capture & Immediate Trial Access) */}
      <section id="bestill" className="py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-card-hover relative">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1 rounded-full border border-electric-300/40">
                14 DAGERS GRATIS PRØVEPERIODE • 0,- KR I DAG
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-navy-900 mt-4 leading-tight">
                START DIN TEST NÅ
              </h2>
              <p className="text-xs sm:text-sm font-sans text-slate-600 mt-2">
                Opprett brukerkonto på 60 sekunder og test Mester-arbeidsflaten umiddelbart. Null kredittkortkrav.
              </p>
            </div>

            {leadSuccess ? (
              <div className="p-6 sm:p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center font-sans">
                <CheckCircle2 size={48} className="text-emerald-600 mx-auto mb-3" />
                <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                  14 DAGERS GRATIS PRØVE AKTIVERT
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-navy-900 mb-2">Velkommen til VikingMester!</h3>
                <p className="text-sm text-slate-700 leading-relaxed max-w-lg mx-auto">
                  Din konto for <strong className="text-navy-900">{leadCompany}</strong> er opprettet. Vi har sendt en skriftlig bekreftelse til <strong className="text-navy-900">{leadEmail}</strong>.
                </p>

                <div className="p-4 bg-white/90 rounded-xl border border-emerald-200 max-w-md mx-auto my-5 text-xs text-slate-700 text-left space-y-1.5 shadow-xs">
                  <div><strong className="text-slate-900">Brukernavn / E-post:</strong> {leadEmail}</div>
                  <div><strong className="text-slate-900">Passord:</strong> Passordet du oppga ved registrering</div>
                  <div><strong className="text-slate-900">Abonnement:</strong> {selectedPlan === 'solo' ? 'VikingMester Solo (690,-/mnd)' : selectedPlan === 'entreprenor' ? 'Totalentreprenør Pro (2 990,-/mnd)' : 'VikingMester Team (1 490,-/mnd)'}</div>
                  <div className="text-emerald-700 font-bold pt-1 border-t border-slate-100">
                    ✓ 14 dager 100% gratis • Faktura sendes kun dersom du fortsetter etter prøvetiden.
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onViewChange('dashboard')}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Åpne Mester-Dashboardet nå</span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewChange("mobile")}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Smartphone size={16} className="text-slate-600" />
                    <span>Åpne Mobil App</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4 font-sans text-xs sm:text-sm">
                
                {/* 1. Bedriftsinformasjon med Brønnøysund-oppslag */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>ORGANISASJONSNUMMER *</span>
                      {isSearchingBrreg && (
                        <span className="text-[10px] text-electric-600 font-semibold flex items-center gap-1">
                          <Loader2 size={11} className="animate-spin" />
                          Søker i Brreg...
                        </span>
                      )}
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="9 siffer (f.eks. 933 851 222)"
                      value={leadOrgnr}
                      onChange={(e) => handleOrgnrChange(e.target.value)}
                      maxLength={12}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tast inn ditt org.nr for automatisk utfylling fra Brønnøysund.
                    </p>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      BEDRIFTSNAVN / FORETAK *
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="f.eks. Mesterbygg AS"
                      value={leadCompany}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all"
                    />

                    {/* Live Brønnøysund-forslag dropdown */}
                    {brregSuggestions.length > 0 && !verifiedBrregUnit && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                        <div className="p-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Treff i Brønnøysundregistrene (klikk for å velge):
                        </div>
                        {brregSuggestions.map((unit) => (
                          <button
                            key={unit.orgnr}
                            type="button"
                            onClick={() => handleSelectBrregUnit(unit)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-electric-50 border-b border-slate-100 last:border-b-0 transition-colors flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{unit.navn}</div>
                              <div className="text-[11px] text-slate-500">
                                Org.nr: <span className="font-mono">{unit.orgnr}</span> {unit.poststed ? `• ${unit.poststed}` : ''}
                              </div>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono uppercase">
                              {unit.organisasjonsform}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Verifisert Brønnøysund-badge */}
                {verifiedBrregUnit && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold flex items-center gap-1.5 flex-wrap">
                        <span>{verifiedBrregUnit.navn}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono uppercase">
                          {verifiedBrregUnit.organisasjonsformBeskrivelse || verifiedBrregUnit.organisasjonsform}
                        </span>
                        {verifiedBrregUnit.mvaRegistrert && (
                          <span className="text-[10px] bg-emerald-200/60 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                            MVA
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        Org.nr: <span className="font-mono">{verifiedBrregUnit.orgnr}</span> {verifiedBrregUnit.poststed ? `• ${verifiedBrregUnit.poststed}` : ''} {verifiedBrregUnit.antallAnsatte ? `• ${verifiedBrregUnit.antallAnsatte} ansatte` : ''} {verifiedBrregUnit.naeringsbeskrivelse ? `• ${verifiedBrregUnit.naeringsbeskrivelse}` : ''}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Kontaktperson & Telefon */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      DITT NAVN / KONTAKTPERSON
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ola Nordmann (Daglig leder / Mester)"
                      value={leadContactName}
                      onChange={(e) => setLeadContactName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      TELEFONNUMMER
                    </label>
                    <input 
                      type="tel" 
                      placeholder="900 00 000"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                {/* 3. E-post og Brukerpassord (Slik at kunden kan teste umiddelbart!) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      E-POST (INNLOGGING & BEKREFTELSE) *
                    </label>
                    <input 
                      type="email" 
                      required
                      placeholder="post@bedrift.no"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      VELG DITT PASSORD (MIN. 8 TEGN) *
                    </label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        placeholder="Minst 8 tegn"
                        value={leadPassword}
                        onChange={(e) => setLeadPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Fagområde og Ønsket pakke */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      HOVEDFAG
                    </label>
                    <select
                      value={selectedTrade}
                      onChange={(e) => setSelectedTrade(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all cursor-pointer"
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
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      ØNSKET PAKKE (14 DAGER GRATIS)
                    </label>
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all cursor-pointer font-semibold"
                    >
                      <option value="team">VikingMester Team (1 490,-/mnd - 14 dager gratis prøve)</option>
                      <option value="solo">VikingMester Solo (690,-/mnd - 14 dager gratis prøve)</option>
                      <option value="entreprenor">Totalentreprenør Pro (fra 2 990,-/mnd - 14 dager gratis prøve)</option>
                    </select>
                  </div>
                </div>

                {/* GDPR, Avtalevilkår & DPA Samtykkeboks */}
                <div className="pt-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      required
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-electric-600 focus:ring-electric-500 cursor-pointer shrink-0 accent-electric-600"
                    />
                    <span className="text-xs text-slate-700 leading-relaxed font-normal">
                      Jeg bekrefter at jeg bestiller på vegne av foretaket, og godtar VikingMesters{' '}
                      <Link
                        href="/vilkar"
                        target="_blank"
                        className="font-bold text-electric-600 hover:text-electric-700 underline"
                      >
                        forretningsvilkår
                      </Link>{' '}
                      og{' '}
                      <Link
                        href="/personvern"
                        target="_blank"
                        className="font-bold text-electric-600 hover:text-electric-700 underline"
                      >
                        personvernerklæring & databehandleravtale (DPA)
                      </Link>
                      . 14 dagers gratis prøveperiode uten bindingstid (0,- kr ved oppstart).
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 pl-7 leading-tight">
                    Full overensstemmelse med GDPR og norsk personopplysningslov. Ingen kredittkort. Ingen bindingstid.
                  </p>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmittingLead}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold text-sm tracking-wide shadow-purple-cta hover:shadow-purple-hover transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                  >
                    {isSubmittingLead ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Klargjør din brukerkonto & 14 dagers gratis prøve...</span>
                      </span>
                    ) : (
                      <>
                        <Sparkles size={16} className="text-amber-300" />
                        <span>Opprett Bruker & Start 14 Dagers Gratis Test</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 text-center pt-1.5 leading-relaxed">
                  ✓ 14 dager 100% gratis • Umiddelbar tilgang • Null kredittkortkrav • Ingen bindingstid • Faktura sendes kun hvis du velger å fortsette etter 14 dager.
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
// 1. TACTICAL OFFERS TO KS VIEW (AUTONOM PIPELINE)
// -------------------------------------------------------------
function TacticalOffersKsView({ onStartDemo, onBack, onGoToPricing }: { onStartDemo: () => void, onBack: () => void, onGoToPricing: () => void }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 font-sans">
      <button onClick={onBack} className="text-xs font-bold text-electric-600 hover:underline mb-6 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>

      {/* Hero Card */}
      <div className="bg-[#0A101D] text-white border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
          <Zap size={14} className="text-emerald-400 animate-pulse" />
          <span>AUTONOM PROSJEKTOPPRETTELSE • ZERO-ADMIN</span>
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4">
          Fra signert tilbud til ferdig KS på 3 sekunder.
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed mb-8">
          Slutt på kveldene hvor du må sitte foran PC-en og manuelt opprette prosjektmapper, sjekklister og juridiske kontrakter. I det øyeblikket kunden godkjenner og signerer tilbudet via mail, overtar MesterAI styringen.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
            <span className="text-emerald-400 font-black text-2xl font-mono">1. Signatur</span>
            <h4 className="text-sm font-bold text-white mt-1 mb-2">Kunde signerer tilbud</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Kunden mottar tilbudet på mail og godkjenner digitalt på under 1 minutt.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-emerald-500/40 p-5 rounded-2xl shadow-emerald-500/5 shadow-lg">
            <span className="text-emerald-400 font-black text-2xl font-mono">2. Autopilot</span>
            <h4 className="text-sm font-bold text-white mt-1 mb-2">MesterAI bygger riggen</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Genererer formell NS 8406 / forbrukerkontrakt, oppretter skymappe og tildeler faglige TEK17-sjekklister.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
            <span className="text-emerald-400 font-black text-2xl font-mono">3. Byggeplass</span>
            <h4 className="text-sm font-bold text-white mt-1 mb-2">Klar for hammeren</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gutta på byggeplassen har sjekkpunkter på mobilen og Yr.no byggedagbok koblet på før de har startet bilen.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onStartDemo}
            className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <Sparkles size={14} />
            <span>Prøv Tilbud-til-KS Live</span>
          </button>
          <button
            onClick={onGoToPricing}
            className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Se pakker fra 690,-/mnd
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. TACTICAL CHANGE ORDERS VIEW (NS 8406 & TALE)
// -------------------------------------------------------------
function TacticalChangeOrdersView({ onStartDemo, onBack, onGoToPricing }: { onStartDemo: () => void, onBack: () => void, onGoToPricing: () => void }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 font-sans">
      <button onClick={onBack} className="text-xs font-bold text-electric-600 hover:underline mb-6 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>

      {/* Hero Card */}
      <div className="bg-[#0A101D] text-white border-2 border-rose-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-400 text-xs font-bold uppercase tracking-wider mb-4">
          <FileSignature size={14} className="text-rose-400 animate-pulse" />
          <span>NS 8406 & NS 8405 • SLUTT PÅ TAPTE INNTEKTER</span>
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4">
          Tale-til-Endringsordre på 15 sekunder.
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed mb-8">
          Norske håndverkere taper i snitt 80 000 kr i året på muntlige avtaler og tillegg som aldri blir varslet skriftlig. Med VikingMester snakker du inn endringen fra stillaset med arbeidshanskene på. Kunden godkjenner via e-post, Teams eller Slack før du starter saga.
        </p>

        {/* Realistic Terminal Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/90 border border-rose-900/60 p-6 rounded-2xl">
            <h3 className="text-rose-400 font-black text-sm uppercase flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Slik taper bransjen penger i dag:
            </h3>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✗</span>
                <span>Byggherre ber muntlig om 4 ekstra stikkontakter og en ekstra vegg.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✗</span>
                <span>Du glemmer å skrive det ned eller utsetter det til kvelden.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✗</span>
                <span>Ved sluttoppgjør nekter kunden å betale: "Dette trodde jeg var inkludert".</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✗</span>
                <span>Tap: 35 000 kr + tapt nattesøvn og konflikt.</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-900/90 border border-emerald-500/40 p-6 rounded-2xl shadow-lg">
            <h3 className="text-emerald-400 font-black text-sm uppercase flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Slik sikrer VikingMester pengene dine:
            </h3>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Du trykker på mikrofonen og sier: "Kunden vil ha 4 ekstra stikk og en ekstra vegg."</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>MesterAI priser arbeid og materiell med fast påslag og lager varsel iht. NS 8406.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Kunden mottar lenke via mail og godkjenner/signerer direkte på 30 sekunder.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Gevinst: 35 000 kr rett i lomma, 100% juridisk vanntett sluttoppgjør.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onStartDemo}
            className="px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <Mic size={14} />
            <span>Test Tale-til-Endringsordre Nå</span>
          </button>
          <button
            onClick={onGoToPricing}
            className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Se pakker fra 690,-/mnd
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. TACTICAL LUKKESPERRE VIEW (TEK17 & BVN)
// -------------------------------------------------------------
function TacticalLukkesperreView({ onStartDemo, onBack, onGoToPricing }: { onStartDemo: () => void, onBack: () => void, onGoToPricing: () => void }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 font-sans">
      <button onClick={onBack} className="text-xs font-bold text-electric-600 hover:underline mb-6 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>

      {/* Hero Card */}
      <div className="bg-[#0A101D] text-white border-2 border-purple-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider mb-4">
          <Lock size={14} className="text-purple-400 animate-pulse" />
          <span>TVERRFAGLIG KONTROLL • NULL RIVESKADER</span>
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4">
          Tverrfaglig Lukkesperre som redder bunnlinjen.
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed mb-8">
          Byggebransjens dyreste tabbe er når tømreren gipser over rør som ikke er trykktestet, eller k-rør som ikke er trukket. Lukkesperren låser veggen eller sonen digitalt inntil alle fag har kvittert og tatt bilde.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/90 border border-purple-500/30 p-5 rounded-2xl">
            <span className="text-purple-400 font-black text-xl font-mono">1. Digital Lås</span>
            <h4 className="text-sm font-bold text-white mt-1 mb-2">Vegg eller rom låses</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              MesterAI markerer sonen som "Låst for plating" inntil rørlegger og elektriker har levert dokumentasjon.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-purple-500/30 p-5 rounded-2xl">
            <span className="text-purple-400 font-black text-xl font-mono">2. Automatisk Purring</span>
            <h4 className="text-sm font-bold text-white mt-1 mb-2">Varsel til UE</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Systemet sender automatisk påminnelse via e-post og Teams til rørleggeren om at trykktesten må registreres før plating kan starte.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-emerald-500/40 p-5 rounded-2xl">
            <span className="text-emerald-400 font-black text-xl font-mono">3. Frigivelse</span>
            <h4 className="text-sm font-bold text-white mt-1 mb-2">Grønt lys for tømrer</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Når bildene og testen er godkjent, åpnes sonen umiddelbart. Full sporbarhet iht. TEK17 § 13-15.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onStartDemo}
            className="px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <ShieldCheck size={14} />
            <span>Se Lukkesperre i Aksjon</span>
          </button>
          <button
            onClick={onGoToPricing}
            className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Se pakker fra 690,-/mnd
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. TACTICAL CUSTOMER PORTAL VIEW
// -------------------------------------------------------------
function TacticalPortalView({ onStartDemo, onBack, onGoToPricing }: { onStartDemo: () => void, onBack: () => void, onGoToPricing: () => void }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 font-sans">
      <button onClick={onBack} className="text-xs font-bold text-electric-600 hover:underline mb-6 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>

      {/* Hero Card */}
      <div className="bg-[#0A101D] text-white border-2 border-cyan-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-4">
          <Smartphone size={14} className="text-cyan-400 animate-pulse" />
          <span>KUNDEPORTAL • FULL GJENNOMSIKTIGHET UTEN MAS</span>
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4">
          Gi byggherren en VIP-opplevelse på mobilen.
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed mb-8">
          Kunder som ikke vet hva som skjer på byggeplassen ringer deg kl. 21 på kvelden. Med VikingMester Kundeportal får kunden sin egen enkle side på mobilen. Ingen app-nedlasting eller passord nødvendig.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <CheckCircle2 size={20} className="text-cyan-400 mb-2" />
            <h4 className="text-xs font-bold text-white mb-1">Sanntids Bildestrøm</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Kunden ser fremdriften dag for dag gjennom bilder du tar i felt.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <FileSignature size={20} className="text-rose-400 mb-2" />
            <h4 className="text-xs font-bold text-white mb-1">Digital Signatur</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Kunden signerer endringer og tillegg med tommelen på 10 sekunder.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <FileCheck size={20} className="text-blue-400 mb-2" />
            <h4 className="text-xs font-bold text-white mb-1">Slutt-FDV Eksport</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Kunden laster ned ferdig Boligmappa-perm ved overlevering på 1 klikk.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <Clock size={20} className="text-emerald-400 mb-2" />
            <h4 className="text-xs font-bold text-white mb-1">Ro på kveldstid</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Null oppringninger etter arbeidstid. Kunden føler seg trygg og ivaretatt.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onStartDemo}
            className="px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <Smartphone size={14} />
            <span>Test Kundeportalen Live</span>
          </button>
          <button
            onClick={onGoToPricing}
            className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Se pakker fra 690,-/mnd
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// TACTICAL DRILLDOWN VIEWS (AI, HMS, FDV, PRICING)
// -------------------------------------------------------------
function TacticalAiView({ onStartDemo, onBack }: { onStartDemo: () => void, onBack: () => void }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 font-sans">
      <button onClick={onBack} className="text-xs font-bold text-electric-600 hover:underline mb-8 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>
      <div className="border border-slate-200 rounded-3xl p-8 sm:p-12 bg-white shadow-card-hover">
        <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3 py-1 rounded-full border border-electric-300/40 inline-block mb-3">
          MULTIMODAL ARKITEKTUR
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-navy-900 mt-2 mb-4 leading-tight">
          GEMINI 3.8 FLASH VISION & TALE
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-sans mb-8">
          VikingMester bruker markedets raskeste multimodale modell. Den analyserer bilder direkte mot Byggeforskriftene (TEK17) og Våtromsnormen (BVN), og transkriberer tale fra byggeplassen med over 98% nøyaktighet på norske faguttrykk.
        </p>
        <button 
          onClick={onStartDemo} 
          className="bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white px-7 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-purple-cta hover:shadow-purple-hover transition-all cursor-pointer"
        >
          Test Modellen i Live Demo →
        </button>
      </div>
    </div>
  );
}

function TacticalHmsView({ onStartDemo, onBack }: { onStartDemo: () => void, onBack: () => void }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 font-sans">
      <button onClick={onBack} className="text-xs font-bold text-electric-600 hover:underline mb-8 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>
      <div className="border border-slate-200 rounded-3xl p-8 sm:p-12 bg-white shadow-card-hover">
        <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3 py-1 rounded-full border border-electric-300/40 inline-block mb-3">
          HMS & SIKKERHET
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-navy-900 mt-2 mb-4 leading-tight">
          LOVPÅLAGT HMS, SJA & VERNERUNDER
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-sans mb-8">
          Oppfyll kravene i Arbeidsmiljøloven, Internkontrollforskriften og Byggherreforskriften med 0 timers papirarbeid. SJA genereres automatisk basert på oppgave og sanntids værrisiko fra Yr.
        </p>
        <button 
          onClick={onStartDemo} 
          className="bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white px-7 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-purple-cta hover:shadow-purple-hover transition-all cursor-pointer"
        >
          Generer Eksempel-SJA →
        </button>
      </div>
    </div>
  );
}

function TacticalFdvView({ onStartDemo, onBack }: { onStartDemo: () => void, onBack: () => void }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 font-sans">
      <button onClick={onBack} className="text-xs font-bold text-electric-600 hover:underline mb-8 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>
      <div className="border border-slate-200 rounded-3xl p-8 sm:p-12 bg-white shadow-card-hover">
        <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3 py-1 rounded-full border border-electric-300/40 inline-block mb-3">
          DOKUMENTASJON & VAREBASE
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-navy-900 mt-2 mb-4 leading-tight">
          FDV, NOBB & BOLIGMAPPA PÅ 1 KLIKK
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-sans mb-6">
          Koble til bedriftens egen NOBB API-nøkkel (BYOK) eller bruk vår integrerte varebase for direkte tilgang til over 1 million byggevarer. Alle FDV-dokumenter, sikkerhetsdatablader, EPD og bilder pakkes automatisk inn i en godkjent digital perm klar for overlevering til byggherre og Boligmappa.
        </p>
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold">
            NOBB API-støtte (1M+ varer)
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
            1-Klikks Boligmappa Eksport
          </span>
          <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-bold">
            Automatisk Sikkerhetsdatablad (SDS)
          </span>
        </div>
        <button 
          onClick={onStartDemo} 
          className="bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white px-7 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-purple-cta hover:shadow-purple-hover transition-all cursor-pointer"
        >
          Prøv Boligmappa & NOBB-eksport →
        </button>
      </div>
    </div>
  );
}

function TacticalPricingView({ onStartDemo, onBack }: { onStartDemo: () => void, onBack: () => void }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 font-sans">
      <button onClick={onBack} className="text-xs font-bold text-electric-600 hover:underline mb-8 flex items-center gap-1 cursor-pointer">
        ← Tilbake til oversikt
      </button>
      <div className="border border-slate-200 rounded-3xl p-8 sm:p-12 bg-white shadow-card-hover">
        <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3 py-1 rounded-full border border-electric-300/40 inline-block mb-3">
          PRISER & RAMMER
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-navy-900 mt-2 mb-4 leading-tight">
          FASTE MÅNEDSPRISER • OMNICHANNEL INKLUDERT I ALLE PAKKER
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-sans mb-6">
          Solo: 690 kr/mnd (550,- årlig) • Team: 1 490 kr/mnd (1 190,- årlig) • Totalentreprenør Pro: fra 2 990 kr/mnd. Alle pakker inkluderer 100% autonom MesterAI Copilot, Gemini 3.8 Flash Vision, 100% offline-modus, prosjektchatt i felt, og Omnichannel (Discord, Slack, Teams). Faktura sendes på EHF hver måned. 14 dagers gratis prøveperiode.
        </p>
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-full text-xs font-bold">
            ⚡ MesterAI Copilot (Gemini 3.8)
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
            📶 100% Offline med bakgrunnssynk
          </span>
          <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-bold">
            💬 Prosjekt- & Firmachatt
          </span>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full text-xs font-bold">
            Omnichannel (Discord / Slack / Teams)
          </span>
          <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold">
            Egen NOBB API-nøkkel (BYOK)
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
            0 kr Etablering • Ingen binding
          </span>
        </div>
        <a 
          href="#bestill" 
          className="inline-block bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white px-7 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-purple-cta hover:shadow-purple-hover transition-all cursor-pointer"
        >
          Gå til Bestilling →
        </a>
      </div>
    </div>
  );
}

