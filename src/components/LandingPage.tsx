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
    <div className="bg-white text-navy-900 min-h-screen selection:bg-electric-500/20 selection:text-electric-700 font-sans">
      {/* Sub-navigation tabs for direct feature drill-downs */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => switchTab('home')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'home' 
                  ? "bg-electric-50 text-electric-600 border border-electric-300/40 shadow-xs" 
                  : "text-slate-600 hover:text-navy-900 hover:bg-slate-100 border border-transparent"
              )}
            >
              <Hammer size={13} className="text-electric-500" />
              <span>Oversikt</span>
            </button>
            <button
              onClick={() => switchTab('ai')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'ai' 
                  ? "bg-electric-50 text-electric-600 border border-electric-300/40 shadow-xs" 
                  : "text-slate-600 hover:text-navy-900 hover:bg-slate-100 border border-transparent"
              )}
            >
              <Cpu size={13} />
              <span>Multimodal AI</span>
            </button>
            <button
              onClick={() => switchTab('hms')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'hms' 
                  ? "bg-electric-50 text-electric-600 border border-electric-300/40 shadow-xs" 
                  : "text-slate-600 hover:text-navy-900 hover:bg-slate-100 border border-transparent"
              )}
            >
              <ShieldCheck size={13} />
              <span>HMS & SJA</span>
            </button>
            <button
              onClick={() => switchTab('fdv')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'fdv' 
                  ? "bg-electric-50 text-electric-600 border border-electric-300/40 shadow-xs" 
                  : "text-slate-600 hover:text-navy-900 hover:bg-slate-100 border border-transparent"
              )}
            >
              <FileCheck size={13} />
              <span>FDV & Boligmappa</span>
            </button>
            <button
              onClick={() => switchTab('pricing')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'pricing' 
                  ? "bg-electric-50 text-electric-600 border border-electric-300/40 shadow-xs" 
                  : "text-slate-600 hover:text-navy-900 hover:bg-slate-100 border border-transparent"
              )}
            >
              <DollarSign size={13} />
              <span>Priser & Rammer</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM 100% OPERATIVT
            </span>
            <button
              onClick={handleInstallApp}
              className="text-xs font-bold text-slate-700 hover:text-navy-900 flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-3 py-1 rounded-full border border-slate-200 transition-colors cursor-pointer"
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

      {/* Global Vikingnet Authority Footer */}
      <footer className="border-t border-navy-800 bg-navy-900 text-slate-300 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">Viking<span className="text-electric-400">Mester</span></span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-electric-500/20 text-electric-300 border border-electric-400/30">PRO</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Byggeplassens råeste kraftverktøy. Utviklet i Norge for tømrere, rørleggere, elektrikere og totalentreprenører som vil ha alt på stell før de forlater byggeplassen.
            </p>
            <div className="text-xs font-medium text-slate-400">
              En del av Vikingnet • AIChat Norge AS (Org.nr: 933 851 222)
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-electric-400 uppercase tracking-widest mb-4">Fagområder</h4>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li className="hover:text-white transition-colors cursor-pointer">Tømrer & Byggmester (TEK17)</li>
              <li className="hover:text-white transition-colors cursor-pointer">Rørlegger & VVS (BVN 31.205)</li>
              <li className="hover:text-white transition-colors cursor-pointer">Elektro & El-installasjon (NEK 400)</li>
              <li className="hover:text-white transition-colors cursor-pointer">Graving & Grunnarbeid (Geomatikk)</li>
              <li className="hover:text-white transition-colors cursor-pointer">Maler, Sparkel & Flis</li>
              <li className="hover:text-white transition-colors cursor-pointer">Totalentreprenør & Prosjektledelse</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-electric-400 uppercase tracking-widest mb-4">Teknisk & Sikkerhet</h4>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li>Gemini 3.8 Flash Multimodal</li>
              <li>Deterministisk SJA-motor</li>
              <li>Yr.no Værsynkronisering</li>
              <li>Brønnøysundregistrene API</li>
              <li>AES-256 kryptering & GDPR</li>
              <li>Norsk skylagring i Oslo</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-electric-400 uppercase tracking-widest mb-4">Direktekontakt & Support</h4>
            <div className="space-y-3 text-xs text-slate-300">
              <p className="flex items-center gap-2">
                <Mail size={14} className="text-electric-400" />
                <a href="mailto:hei@vikingmester.no" className="text-electric-300 font-bold hover:underline">hei@vikingmester.no</a>
              </p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Man-Fre 07:00 - 17:00.<br/>Autonom e-postagent svarer døgnet rundt på henvendelser og tilbud.
              </p>
              <div className="pt-2">
                <button 
                  onClick={onStartDemo}
                  className="w-full bg-electric-500/10 hover:bg-electric-500/20 text-electric-300 border border-electric-400/40 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Åpne Interaktiv Demo →
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} VikingMester PRO • En del av Vikingnet. Alle rettigheter reservert.
          </div>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); onViewChange('privacy'); }}>Personvern & GDPR</span>
            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); onViewChange('terms'); }}>Vilkår & DPA</span>
            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); onViewChange("about"); }}>Om Vikingnet</span>
            <span className="text-purple-400 font-bold hover:text-purple-300 cursor-pointer transition-colors" onClick={() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); onViewChange("partner"); }}>Partnerportal (50/50 Lead-inntak)</span>
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
  const [leadOrgnr, setLeadOrgnr] = useState('');
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
          orgnr: leadOrgnr,
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
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200 bg-radial-purple bg-grid-slate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Top Mission Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-electric-50 border border-electric-300/40 text-electric-600 text-xs font-bold tracking-wide uppercase shadow-xs">
              <span className="w-2 h-2 rounded-full bg-electric-500 animate-ping" />
              <span>VIKINGMESTER 2.0 • BYGGEBRANSJENS FØRSTE MULTIMODALE KRAFTVERKTØY</span>
            </div>
          </div>

          {/* Bold Punchy Headline */}
          <div className="text-center max-w-4xl mx-auto mb-8">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-navy-900 leading-[1.12]">
              Byggeplassens råeste kraftverktøy.
              <span className="block text-gradient-purple mt-2">Alt på stell før du forlater byggeplassen.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-sans">
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
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-white hover:bg-slate-50 text-navy-900 border border-slate-200 text-sm font-bold shadow-card-soft transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Start Interaktiv Demo</span>
            </button>
          </div>

          {/* Interactive Live Cockpit Mockup */}
          <div className="max-w-5xl mx-auto bg-white border border-slate-200/80 rounded-3xl shadow-card-hover p-4 sm:p-7 relative overflow-hidden">
            {/* Window Chrome Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 text-xs font-sans text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                <span className="ml-2 text-slate-800 font-extrabold tracking-wide">VIKINGMESTER LIVE FIELD TERMINAL</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-electric-600 font-bold text-xs">GEMINI 3.8 FLASH ENGINE</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
              </div>
            </div>

            {/* 3 Real-time Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Voice-to-Log Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-electric-600 uppercase flex items-center gap-1.5">
                      <Mic size={14} className="text-electric-500 animate-pulse" />
                      1. Stemmestyrt Dagbok
                    </span>
                    <span className="text-xs font-mono text-slate-400">07:42</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs text-xs text-slate-800 font-medium italic mb-3">
                    <p>"Gipset ferdig himling plan 2. Venter på elektriker før vegger lukkes. Yr melder regn, tildekket materialer."</p>
                  </div>
                  <div className="text-xs space-y-1.5">
                    <p className="text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Værdata lagt til: Oslo 6°C, 3.2 m/s</span>
                    </p>
                    <p className="text-slate-700 font-medium flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-slate-400" />
                      <span>Prosjekt: Villa Holmenkollen</span>
                    </p>
                    <p className="text-slate-700 font-medium flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-slate-400" />
                      <span>Generert PDF-rapport til byggherre</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-500">TID BRUKT: 14 SEK</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">STATUS: ARKIVERT</span>
                </div>
              </div>

              {/* Vision Scanner Card */}
              <div className="bg-slate-50 border-2 border-electric-400/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-xs">
                <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-electric-100 text-electric-700 font-bold text-[10px] uppercase rounded-bl-lg border-b border-l border-electric-300/40">
                  AI VISION SCAN
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-electric-600 uppercase flex items-center gap-1.5">
                      <Camera size={14} className="text-electric-500" />
                      2. TEK17 Avvikskontroll
                    </span>
                  </div>
                  
                  {/* High Tech Blueprint Camera Preview */}
                  <div className="h-28 rounded-xl bg-gradient-to-br from-navy-900 to-navy-950 border border-navy-800 relative flex items-center justify-center overflow-hidden mb-3 shadow-inner">
                    {/* Simulated laser scan line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-scan-laser" />
                    
                    {/* Architectural Blueprint grid inside preview */}
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#9D00FF_1px,transparent_1px)] [background-size:12px_12px]" />

                    <div className="border border-emerald-400/60 rounded-lg px-3 py-1.5 bg-emerald-950/80 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5 shadow-lg relative z-10">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>SLUKMANSJETT GODKJENT (BVN 31.205)</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1.5 text-slate-700 font-medium">
                    <p className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Klemring montert korrekt</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Oppkant membran: 25 mm [OK]</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-500">FDV-DOKUMENTASJON</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">100% SAMSVAR</span>
                </div>
              </div>

              {/* Cross-Trade Lock Card */}
              <div className="bg-slate-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-rose-600 uppercase flex items-center gap-1.5">
                      <Shield size={14} className="text-rose-500" />
                      3. Tverrfaglig Lukkesperre
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">AKTIV</span>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs mb-3">
                    <p className="font-bold text-rose-900 flex items-center gap-1">
                      <span>⚠️ SONE BAD 2. ETG LÅST FOR GIPSING</span>
                    </p>
                    <p className="text-[11px] text-rose-700 mt-1 font-medium leading-relaxed">
                      Rørlegger har ikke registrert trykktest av rør-i-rør (TEK17 § 13-15).
                    </p>
                  </div>

                  <div className="text-xs space-y-1.5">
                    <p className="text-emerald-700 font-semibold flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Elektriker rørføring: Kvittert</span>
                    </p>
                    <p className="text-rose-600 font-bold flex items-center gap-1.5">
                      <span>✗</span>
                      <span>Trykkprøving VVS: Mangler</span>
                    </p>
                    <p className="text-electric-700 font-medium text-[11px]">
                      SMS-varsel sendt til underentreprenør
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-500">HINDRER BYGGFEIL</span>
                  <span className="text-electric-700 bg-electric-50 px-2 py-0.5 rounded border border-electric-200">SPART: 45 000 KR</span>
                </div>
              </div>
            </div>
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
                  <span>Tale-til-endringsordre (NS 8406) godkjent av byggherre på SMS før arbeidet starter.</span>
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
                Pakke som passer for deg: <span className="text-navy-900 font-bold underline decoration-electric-400">{workerCount <= 1 ? 'VikingMester Solo (990 kr/mnd)' : workerCount <= 5 ? 'VikingMester Team (2 490 kr/mnd)' : 'VikingMester Totalentreprenør (fra 4 900 kr/mnd)'}</span>
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
              FORUTSIGBARE DRIFTSKOSTNADER
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-navy-900 mt-4 leading-tight">
              KNIVSKARPE RAMMER. 100% PROFITTMULTIPLIKATOR.
            </h2>
            <p className="text-slate-600 mt-4 text-sm sm:text-base leading-relaxed">
              Alltid månedlig bedriftsfaktura eller EHF. Ingen bindingstid. Ingen skjulte kostnader.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {/* Solo */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card-soft p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">ENKELTMANNSFORETAK / MESTER</span>
                <h3 className="text-2xl font-black text-navy-900 mt-1">VikingMester Solo</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-black text-navy-900 font-sans">990,-</span>
                  <span className="text-xs text-slate-500 font-mono ml-2">/mnd eks. mva</span>
                </div>
                <div className="space-y-3 text-xs sm:text-sm font-sans text-slate-700 border-t border-slate-200 pt-4">
                  <p className="text-electric-600 font-bold font-mono text-xs">KVOTER & RAMMER:</p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>1 aktiv bruker</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Inntil 3 aktive prosjekter</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>2 GB lagring (~10 000 WebP-bilder)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>100 AI-analyser / mnd</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Stemmestyrt byggedagbok</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Yr.no automatisk værsynk</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Eksport til Boligmappa PDF</span>
                  </p>
                </div>
              </div>
              <a 
                href="#bestill"
                className="w-full mt-8 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold text-xs uppercase tracking-wider text-center border border-slate-200 transition-colors cursor-pointer"
              >
                Bestill Solo
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
                  <span className="text-4xl font-black text-electric-600 font-sans">2 490,-</span>
                  <span className="text-xs text-slate-500 font-mono ml-2">/mnd eks. mva</span>
                </div>
                <div className="space-y-3 text-xs sm:text-sm font-sans text-slate-800 font-medium border-t border-slate-200 pt-4">
                  <p className="text-electric-600 font-bold font-mono text-xs">KVOTER & RAMMER:</p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Inntil 5 aktive brukere</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Inntil 15 aktive prosjekter</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>10 GB lagring (~50 000 WebP-bilder)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>500 AI-analyser / mnd</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Tale-til-endringsordre (NS 8406)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>TEK17 bilde-avvik og visjon</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Flerspråklig (Norsk, Polsk, Litauisk)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Tverrfaglig koordinering</span>
                  </p>
                </div>
              </div>
              <a 
                href="#bestill"
                className="w-full mt-8 py-3.5 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold text-xs uppercase tracking-wider text-center shadow-purple-cta hover:shadow-purple-hover transition-all cursor-pointer"
              >
                Bestill Team
              </a>
            </div>

            {/* Totalentreprenør */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card-soft p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">FOR STØRRE ENTREPRENØRER</span>
                <h3 className="text-2xl font-black text-navy-900 mt-1">Totalentreprenør</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-black text-navy-900 font-sans">Fra 4 900,-</span>
                  <span className="text-xs text-slate-500 font-mono ml-2">/mnd</span>
                </div>
                <div className="space-y-3 text-xs sm:text-sm font-sans text-slate-700 border-t border-slate-200 pt-4">
                  <p className="text-electric-600 font-bold font-mono text-xs">KVOTER & RAMMER:</p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Inntil 15 brukere (skalerbart)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Inntil 50 aktive prosjekter</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>30 GB lagringsvolum</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>2 000 AI-analyser / mnd</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Tverrfaglig Lukkesperre (Rom/Sone)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Underentreprenør-tildeling</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Tripletex & PowerOffice API</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Eget Microsoft Teams Bot oppsett</span>
                  </p>
                </div>
              </div>
              <a 
                href="#bestill"
                className="w-full mt-8 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold text-xs uppercase tracking-wider text-center border border-slate-200 transition-colors cursor-pointer"
              >
                Bestill Entreprenør
              </a>
            </div>
          </div>

          {/* Addons matrix */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-5xl mx-auto shadow-card-soft mt-12">
            <h4 className="text-sm font-bold text-electric-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-electric-500" />
              MODULÆRE TILLEGG PÅ ALLE NIVÅER
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs sm:text-sm font-sans">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <span className="text-slate-800 font-bold">Ekstra bruker:</span>
                <span className="text-electric-600 font-mono font-black">249,- /mnd</span>
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
                <span className="text-slate-800 font-bold">Våtrom & Membran BVN:</span>
                <span className="text-electric-600 font-mono font-black">490,- /mnd</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <span className="text-slate-800 font-bold">Elektro & NEK 400:</span>
                <span className="text-electric-600 font-mono font-black">490,- /mnd</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <span className="text-slate-800 font-bold">Tripletex / PowerOffice:</span>
                <span className="text-electric-600 font-mono font-black">490,- /mnd</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Direct Order Form (Lead Capture) */}
      <section id="bestill" className="py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-card-hover relative">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1 rounded-full border border-electric-300/40">
                BEDRIFTSBESTILLING
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-navy-900 mt-4 leading-tight">
                FÅ TILGANG NÅ
              </h2>
              <p className="text-xs sm:text-sm font-sans text-slate-600 mt-2">
                Faktura sendes automatisk på EHF / e-post. Null kredittkortkrav.
              </p>
            </div>

            {leadSuccess ? (
              <div className="p-6 sm:p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center font-sans">
                <CheckCircle2 size={44} className="text-emerald-600 mx-auto mb-3" />
                <h3 className="text-xl sm:text-2xl font-bold text-navy-900 mb-2">Takk for bestillingen!</h3>
                <p className="text-sm text-slate-700 leading-relaxed max-w-lg mx-auto">
                  Vi verifiserer foretaket mot Brønnøysundregistrene og har sendt ordrebekreftelse til <strong className="text-navy-900">{leadEmail}</strong>. Fakturagrunnlag klargjøres automatisk.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onStartDemo()}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Åpne Mester-Dashboardet nå</span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewChange("mobile")}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Åpne Mobil App</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4 font-sans text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      BEDRIFTSNAVN / FORETAK *
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="f.eks. Mesterbygg AS"
                      value={leadCompany}
                      onChange={(e) => setLeadCompany(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      ORGANISASJONSNUMMER *
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="9 siffer (f.eks. 912 345 678)"
                      value={leadOrgnr}
                      onChange={(e) => setLeadOrgnr(e.target.value)}
                      maxLength={12}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      E-POST FOR FAKTURA *
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
                      ØNSKET PAKKE
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all cursor-pointer"
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
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold text-sm tracking-wide shadow-purple-cta hover:shadow-purple-hover transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingLead ? (
                      <span>Sjekker Enhetsregisteret...</span>
                    ) : (
                      <>
                        <span>Bestill Nå – Faktura Sendes EHF</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 text-center pt-2">
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
          DOKUMENTASJON
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-navy-900 mt-2 mb-4 leading-tight">
          FDV & BOLIGMAPPA PÅ 1 KLIKK
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-sans mb-8">
          Alle produktark, bilder av skjulte installasjoner og samsvarserklæringer pakkes automatisk inn i en godkjent digital perm klar for overlevering til byggherre og Boligmappa.
        </p>
        <button 
          onClick={onStartDemo} 
          className="bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white px-7 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-purple-cta hover:shadow-purple-hover transition-all cursor-pointer"
        >
          Prøv Boligmappa-eksport →
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
          FASTE MÅNEDSPRISER • INGEN BINDINGSTID
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-sans mb-8">
          Solo: 990 kr/mnd • Team: 2 490 kr/mnd • Totalentreprenør: fra 4 900 kr/mnd. Faktura sendes på EHF hver måned.
        </p>
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
