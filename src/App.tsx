'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  HardHat, 
  ClipboardCheck, 
  Users, 
  LayoutDashboard, 
  Smartphone, 
  FileText, 
  Zap, 
  Camera, 
  Mic, 
  AlertTriangle,
  Menu,
  X,
  ChevronRight,
  CheckCircle2,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Plus,
  ArrowRight,
  Download,
  User as UserIcon,
  Shield,
  Bell,
  Coins,
  GraduationCap,
  Brain,
  Car,
  Package,
  Clock,
  FolderKanban,
  ChevronDown,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Toaster } from 'sonner';
import { View, Project, SJAReport, Deviation } from './types';
import LandingPage, { LandingTab } from './components/LandingPage';
import Dashboard from './components/Dashboard';
import MobileApp from './components/MobileApp';
import TechnicalSpec from './components/TechnicalSpec';
import ArchitecturePhase1 from './components/ArchitecturePhase1';
import ArchitecturePhase2 from './components/ArchitecturePhase2';
import ArchitecturePhase3 from './components/ArchitecturePhase3';
import ArchitecturePhase4 from './components/ArchitecturePhase4';
import ArchitecturePhase5 from './components/ArchitecturePhase5';
import ArchitecturePhase6 from './components/ArchitecturePhase6';
import Login from './components/Login';
import SettingsPage from './components/Settings';
import CustomerPortal from './components/CustomerPortal';
import SuperAdmin from './components/SuperAdmin';
import OfferPage from './components/OfferPage';
import InviteAcceptancePage from './components/InviteAcceptancePage';
import PublicOfferFlow from './components/PublicOfferFlow';
import PublicChangeOrderFlow from './components/PublicChangeOrderFlow';
import { PricingPage, AboutPage, ContactPage, PrivacyPage, TermsPage } from './components/StaticPages';
import Logo from './components/Logo';
import { NotificationBell } from './components/NotificationBell';
import { AuthProvider, useAuth } from './hooks/useAuth';
import InstallGuide from './components/InstallGuide';
import NetworkStatusBadge from './components/NetworkStatusBadge';
import CookieBanner from './components/CookieBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import MobileBottomNav from './components/MobileBottomNav';
import MobileQuickActionSheet from './components/MobileQuickActionSheet';

import './i18n';
import { getStandardLang } from './i18n';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { db, doc, getDoc, collection, query, where, getDocs, updateUserProfile } from './services/firebase';
import { toast } from 'sonner';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const [view, setView] = useState<View>('landing');
  const [dashboardTab, setDashboardTab] = useState<'oversikt' | 'prosjekter' | 'tilbud' | 'avvik' | 'ai' | 'finans' | 'laerling' | 'hms'>('oversikt');
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [offerToken, setOfferToken] = useState<string | null>(null);
  const [changeOrderToken, setChangeOrderToken] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [portalProject, setPortalProject] = useState<Project | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [landingTab, setLandingTab] = useState<LandingTab>('home');
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [portalModalCode, setPortalModalCode] = useState('');
  const [isSolutionsDropdownOpen, setIsSolutionsDropdownOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { user, logout, isAuthReady, subscriptionStatus, trialDaysLeft, impersonatedCompanyId, stopImpersonation } = useAuth();

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail?.view) setView(e.detail.view);
    };
    window.addEventListener('navigate_view', handleNav);
    return () => window.removeEventListener('navigate_view', handleNav);
  }, []);

  const handleMobileNavigate = (targetView: string, tab?: string) => {
    if (tab) {
      setDashboardTab(tab as any);
    }
    setView(targetView as View);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMobileAction = (actionId: string) => {
    if (actionId === 'voice_sja') {
      setView('mobile');
      return;
    }
    if (view !== 'dashboard') {
      setView('dashboard');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId } }));
      }, 150);
    } else {
      window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId } }));
    }
  };

  const publicViews: View[] = ['landing', 'spec', 'pricing', 'about', 'contact', 'privacy', 'terms', 'offer', 'invite', 'customer-portal', 'login', 'public-offer', 'public-change-order'];
  const isPublicView = publicViews.includes(view);

  const changeLanguage = async (lng: string) => {
    try {
      await i18n.changeLanguage(lng);
      localStorage.setItem('i18nextLng', lng);
      if (user?.uid) {
        await updateUserProfile(user.uid, { language: lng });
      }
      toast.success(lng === 'no' ? 'Språk endret til Norsk' : lng === 'pl' ? 'Język zmieniony na Polski' : lng === 'lt' ? 'Kalba pakeista į Lietuvių' : 'Language changed to English');
    } catch (err) {
      console.error('Error changing language:', err);
    }
  };

  const handleStartDemo = () => {
    if (user) {
      setView('dashboard');
    } else {
      setView('login');
      toast.info('Vennligst logg inn eller opprett bedriftskonto for å få tilgang.');
    }
  };

  const handleOpenPortal = async (projectIdOrCode: string) => {
    try {
      // First try fetching by doc ID
      const docRef = doc(db, 'projects', projectIdOrCode);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPortalProject({ id: docSnap.id, ...docSnap.data() } as Project);
        setView('customer-portal');
        return;
      }

      // Try searching by projectCode
      const q = query(collection(db, 'projects'), where('projectCode', '==', projectIdOrCode));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const foundDoc = qSnap.docs[0];
        setPortalProject({ id: foundDoc.id, ...foundDoc.data() } as Project);
        setView('customer-portal');
        return;
      }

      // Try searching by portalToken
      const qToken = query(collection(db, 'projects'), where('portalToken', '==', projectIdOrCode));
      const tokenSnap = await getDocs(qToken);
      if (!tokenSnap.empty) {
        const foundDoc = tokenSnap.docs[0];
        setPortalProject({ id: foundDoc.id, ...foundDoc.data() } as Project);
        setView('customer-portal');
        return;
      }

      toast.error(`Prosjektet med kode/ID "${projectIdOrCode}" ble ikke funnet.`);
    } catch (error) {
      console.error("Error opening portal project:", error);
      toast.error("Kunne ikke hente prosjektet. Vennligst sjekk koden.");
    }
  };

  const handleGoToDashboard = () => {
    if (user) {
      setView('dashboard');
    } else {
      setView('login');
    }
  };

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // Check for offer token, invite token, or portal link in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Customer Offer & Contract direct links (Mesterhjernen)
    const customerOfferParam = params.get('offerToken') || params.get('contractToken') || params.get('tilbud') || params.get('kontrakt');
    if (customerOfferParam) {
      setOfferToken(customerOfferParam);
      setView('public-offer');
    }

    // Customer Change Order direct links (NS 8406 / Håndverkertjenesteloven)
    const changeOrderParam = params.get('changeOrderToken') || params.get('endring');
    if (changeOrderParam) {
      setChangeOrderToken(changeOrderParam);
      setView('public-change-order');
    }

    const token = params.get('offer');
    if (token) {
      setOfferToken(token);
      if (token.startsWith('o-') || token.startsWith('c-')) {
        setView('public-offer');
      } else {
        setView('offer');
      }
    }

    const invite = params.get('invite');
    if (invite) {
      setInviteToken(invite);
      setView('invite');
    }

    const portal = params.get('portal') || params.get('portalToken');
    if (portal) {
      handleOpenPortal(portal);
    }

    // Check for path-based tokens (e.g., /invite/token, /tilbud/token, /kontrakt/token, /offer/token, /endring/token, /portal/id)
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'invite' && pathParts[2]) {
      setInviteToken(pathParts[2]);
      setView('invite');
    }
    if ((pathParts[1] === 'tilbud' || pathParts[1] === 'kontrakt') && pathParts[2]) {
      setOfferToken(pathParts[2]);
      setView('public-offer');
    }
    if ((pathParts[1] === 'endring' || pathParts[1] === 'change-order') && pathParts[2]) {
      setChangeOrderToken(pathParts[2]);
      setView('public-change-order');
    }
    if (pathParts[1] === 'offer' && pathParts[2]) {
      setOfferToken(pathParts[2]);
      if (pathParts[2].startsWith('o-') || pathParts[2].startsWith('c-')) {
        setView('public-offer');
      } else {
        setView('offer');
      }
    }
    if (pathParts[1] === 'portal' && pathParts[2]) {
      handleOpenPortal(pathParts[2]);
    }
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Direct full-screen Customer Offer & Contract flow (Mesterhjernen)
  if (view === 'public-offer') {
    return (
      <PublicOfferFlow 
        token={offerToken || undefined} 
        onNavigateToPortal={(id) => handleOpenPortal(id)} 
        onBackToApp={() => setView('landing')} 
      />
    );
  }

  // Direct full-screen Customer Change Order flow
  if (view === 'public-change-order' && changeOrderToken) {
    return (
      <PublicChangeOrderFlow 
        token={changeOrderToken} 
        onNavigateToPortal={(id) => handleOpenPortal(id)} 
      />
    );
  }

  // If trying to access a private view without being logged in, show login
  if (!user && !isPublicView) {
    return <Login onBack={() => setView('landing')} />;
  }


  if (user && subscriptionStatus === 'expired') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 lg:p-12 text-center border border-red-100"
        >
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-4">{t('trial_expired', 'Prøveperioden er utløpt')}</h1>
          <p className="text-neutral-500 mb-8">
            {t('trial_expired_desc', 'Din 7-dagers gratis prøveperiode er over. For å fortsette å bruke KS MesterAI må du registrere deg for et abonnement.')}
          </p>
          <button className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-500 transition-all mb-4">
            {t('choose_plan', 'Velg abonnement')}
          </button>
          <button 
            onClick={logout}
            className="text-neutral-400 hover:text-neutral-600 font-medium text-sm"
          >
            {t('logout', 'Logg ut')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Trial Banner */}
      {user && subscriptionStatus === 'trial' && !impersonatedCompanyId && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-emerald-600 text-white text-[10px] font-bold py-1 text-center uppercase tracking-widest">
          {t('trial_active', 'Du er i en prøveperiode.')} {trialDaysLeft} {t('days_left', 'dager igjen.')}
        </div>
      )}

      {/* Impersonation Banner */}
      {impersonatedCompanyId && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-[10px] font-bold py-1 text-center uppercase tracking-widest flex items-center justify-center gap-4">
          <span>DU VISER NÅ SYSTEMET SOM EN ANNEN KUNDE (ID: {impersonatedCompanyId})</span>
          <button 
            onClick={() => { stopImpersonation(); setView('super-admin'); }}
            className="px-2 py-0.5 bg-white text-red-600 rounded hover:bg-neutral-100 transition-colors"
          >
            AVSLUTT
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn(
        "fixed left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 transition-all shadow-xs",
        (user && subscriptionStatus === 'trial') || impersonatedCompanyId ? "top-6" : "top-0"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {(!user || ['landing', 'pricing', 'about', 'contact', 'privacy', 'terms'].includes(view)) ? (
            /* PUBLIC MARKETING NAVBAR */
            <div className="flex justify-between h-16 items-center">
              {/* Left: Logo & Audience Tag */}
              <div className="flex items-center gap-3 shrink-0">
                <div 
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => { setView('landing'); setLandingTab('home'); }}
                >
                  <Logo size="md" className="text-neutral-900" />
                  <span className="hidden sm:inline-flex items-center text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200/80">
                    For Bygg & Anlegg
                  </span>
                </div>
                <NetworkStatusBadge />
              </div>

              {/* Desktop Center: World-Class SaaS Links */}
              <div className="hidden md:flex items-center gap-1 lg:gap-2">
                {/* Løsninger Dropdown */}
                <div className="relative group">
                  <button 
                    onClick={() => setIsSolutionsDropdownOpen(!isSolutionsDropdownOpen)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      (view === 'landing' && ['ai', 'hms', 'fdv'].includes(landingTab))
                        ? "bg-emerald-50 text-emerald-700 font-black" 
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                    )}
                  >
                    <span>Løsninger</span>
                    <ChevronDown size={14} className="text-neutral-400 group-hover:text-neutral-700 transition-transform group-hover:rotate-180" />
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200/80 p-2 hidden group-hover:block z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                    <button 
                      onClick={() => { setLandingTab('ai'); setView('landing'); }}
                      className="w-full text-left p-3 rounded-xl hover:bg-emerald-50 transition-colors flex items-start gap-3 cursor-pointer group/item"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900">Mesterhjernen AI</p>
                        <p className="text-[10px] text-neutral-500 leading-tight">Tale-til-SJA, Yr værrisiko & TEK17 syn</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => { setLandingTab('hms'); setView('landing'); }}
                      className="w-full text-left p-3 rounded-xl hover:bg-blue-50 transition-colors flex items-start gap-3 cursor-pointer group/item"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors">
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900">HMS & SJA</p>
                        <p className="text-[10px] text-neutral-500 leading-tight">Vernerunder, AML-krav & stoffkartotek</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => { setLandingTab('fdv'); setView('landing'); }}
                      className="w-full text-left p-3 rounded-xl hover:bg-teal-50 transition-colors flex items-start gap-3 cursor-pointer group/item"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover/item:bg-teal-600 group-hover/item:text-white transition-colors">
                        <FileCheck size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900">FDV & Boligmappa</p>
                        <p className="text-[10px] text-neutral-500 leading-tight">Automatisk NOBB-ark & 1-klikks eksport</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Priser */}
                <button 
                  onClick={() => { setView('pricing'); setLandingTab('pricing'); }}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    view === 'pricing' || (view === 'landing' && landingTab === 'pricing')
                      ? "bg-emerald-50 text-emerald-700 font-black"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                  )}
                >
                  Priser
                </button>

                {/* Kundeportal */}
                <button 
                  onClick={() => setIsPortalModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Users size={14} className="text-emerald-600" />
                  <span>Kundeportal</span>
                </button>

                {/* Om oss */}
                <button 
                  onClick={() => setView('about')}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    view === 'about'
                      ? "bg-emerald-50 text-emerald-700 font-black"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                  )}
                >
                  Om oss
                </button>

                {/* Kontakt */}
                <button 
                  onClick={() => setView('contact')}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    view === 'contact'
                      ? "bg-emerald-50 text-emerald-700 font-black"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                  )}
                >
                  Kontakt
                </button>
              </div>

              {/* Desktop Right: Actions */}
              <div className="hidden md:flex items-center gap-3">
                {/* Language Selector */}
                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-100/80 hover:bg-neutral-100 rounded-xl border border-neutral-200 transition-all">
                  <Globe size={14} className="text-neutral-500 shrink-0" />
                  <select 
                    onChange={(e) => changeLanguage(e.target.value)}
                    value={getStandardLang(i18n.language)}
                    className="text-xs font-black bg-transparent border-none focus:ring-0 cursor-pointer uppercase text-neutral-800 pr-1 outline-none"
                    title="Bytt språk"
                  >
                    <option value="no">NO</option>
                    <option value="en">EN</option>
                    <option value="pl">PL</option>
                    <option value="lt">LT</option>
                  </select>
                </div>

                {user ? (
                  <button 
                    onClick={handleGoToDashboard}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <LayoutDashboard size={14} />
                    <span>Gå til Dashboard</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setView('login')}
                      className="text-neutral-700 hover:text-neutral-950 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-neutral-100 transition-all cursor-pointer"
                    >
                      Logg inn
                    </button>
                    <button 
                      onClick={handleStartDemo}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Prøv gratis i 14 dager</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center gap-2">
                <NetworkStatusBadge />
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-neutral-700 hover:text-neutral-950 rounded-xl hover:bg-neutral-100 cursor-pointer"
                >
                  {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>
            </div>
          ) : (
            /* AUTHENTICATED INTERNAL APP NAVBAR */
            <div className="flex justify-between h-16 items-center">
              {/* Left: Logo & Live Offline/Online Status Badge */}
              <div className="flex items-center gap-3 shrink-0">
                <div 
                  className="flex items-center gap-1.5 cursor-pointer group"
                  onClick={() => setView('landing')}
                >
                  <Logo size="md" className="text-neutral-900" />
                </div>
                <NetworkStatusBadge />
              </div>

              {/* Desktop Center: Internal Operational App Navigation */}
              <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
                <button 
                  onClick={handleGoToDashboard}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    view === 'dashboard' 
                      ? "bg-emerald-50 text-emerald-700 font-black shadow-sm" 
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                  )}
                >
                  <LayoutDashboard size={15} />
                  {t('dashboard', 'Dashboard')}
                </button>

                <button 
                  onClick={() => setView('mobile')}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    view === 'mobile' 
                      ? "bg-emerald-50 text-emerald-700 font-black shadow-sm" 
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                  )}
                >
                  <Smartphone size={15} />
                  {t('mobile_app', 'Mobil-app')}
                </button>

                <button 
                  onClick={() => setView('spec')}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70 cursor-pointer",
                    view === 'spec' && "bg-neutral-100 text-neutral-900 font-black"
                  )}
                >
                  {t('specification', 'Spesifikasjon')}
                </button>

                {user && (user.role === 'admin' || user.email === 'kenkri3@gmail.com') && (
                  <button 
                    onClick={() => setView('super-admin')}
                    className={cn(
                      "text-xs font-bold transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ml-1 cursor-pointer",
                      view === 'super-admin' 
                        ? "bg-red-600 text-white border-red-600 shadow-sm font-black" 
                        : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                    )}
                  >
                    <Shield size={14} />
                    Admin Kontroll
                  </button>
                )}
              </div>

              {/* Desktop Right: Install Shortcut, Language, Notifications, Unified Profile */}
              <div className="hidden md:flex items-center gap-3">
                <button 
                  onClick={() => setShowInstallGuide(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-emerald-50 text-neutral-700 hover:text-emerald-800 rounded-xl text-xs font-bold transition-all border border-neutral-200/80 hover:border-emerald-300 shadow-sm active:scale-95 cursor-pointer"
                  title="Installer snarvei på mobil"
                >
                  <Smartphone size={14} className="text-emerald-600" />
                  <span>Mobil-snarvei</span>
                </button>

                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-100/80 hover:bg-neutral-100 rounded-xl border border-neutral-200 transition-all">
                  <Globe size={14} className="text-neutral-500 shrink-0" />
                  <select 
                    onChange={(e) => changeLanguage(e.target.value)}
                    value={getStandardLang(i18n.language)}
                    className="text-xs font-black bg-transparent border-none focus:ring-0 cursor-pointer uppercase text-neutral-800 pr-1 outline-none"
                    title="Bytt språk"
                  >
                    <option value="no">NO</option>
                    <option value="en">EN</option>
                    <option value="pl">PL</option>
                    <option value="lt">LT</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
                  <NotificationBell />

                  <div className="flex items-center gap-2 pl-1">
                    <button 
                      onClick={() => setView('settings')}
                      className={cn(
                        "flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border transition-all text-left cursor-pointer",
                        view === 'settings' 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                          : "bg-neutral-50 border-neutral-200/80 hover:bg-neutral-100 text-neutral-800"
                      )}
                      title="Brukerprofil & Innstillinger"
                    >
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || 'User'} 
                          className="w-7 h-7 rounded-lg object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-7 h-7 bg-neutral-200 rounded-lg flex items-center justify-center text-neutral-600 shrink-0">
                          <UserIcon size={14} />
                        </div>
                      )}
                      <div className="hidden lg:block leading-tight">
                        <p className="text-xs font-bold truncate max-w-[110px]">{user.displayName || 'Bruker'}</p>
                        <p className="text-[10px] font-black uppercase text-neutral-400">{user.role || 'Håndverker'}</p>
                      </div>
                    </button>

                    <button 
                      onClick={logout}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      title={t('logout', 'Logg ut')}
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Menu Button for Authenticated State */}
              <div className="md:hidden flex items-center gap-2">
                <NetworkStatusBadge />
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-neutral-700 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 cursor-pointer"
                >
                  {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 left-0 right-0 bg-white border-b border-neutral-200 p-4 md:hidden shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar z-40 pb-20"
            >
              {(!user || ['landing', 'pricing', 'about', 'contact', 'privacy', 'terms'].includes(view)) ? (
                /* Public Mobile Menu */
                <div className="space-y-4">
                  {/* Primary Actions */}
                  {user ? (
                    <button 
                      onClick={() => { handleGoToDashboard(); setIsMenuOpen(false); }}
                      className="w-full bg-emerald-600 text-white py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <LayoutDashboard size={16} />
                      <span>Gå til Dashboard</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { handleStartDemo(); setIsMenuOpen(false); }}
                        className="w-full bg-emerald-600 text-white py-3 rounded-xl text-xs font-bold shadow-md cursor-pointer text-center"
                      >
                        Prøv gratis
                      </button>
                      <button 
                        onClick={() => { setView('login'); setIsMenuOpen(false); }}
                        className="w-full bg-neutral-900 text-white py-3 rounded-xl text-xs font-bold cursor-pointer text-center"
                      >
                        Logg inn
                      </button>
                    </div>
                  )}

                  {/* Løsninger Section */}
                  <div className="pt-2 border-t border-neutral-100">
                    <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2">
                      Løsninger for bygg & anlegg
                    </div>
                    <div className="space-y-1">
                      <button 
                        onClick={() => { setLandingTab('ai'); setView('landing'); setIsMenuOpen(false); }}
                        className="w-full text-left p-3 rounded-xl hover:bg-emerald-50 text-xs font-bold text-neutral-800 flex items-center gap-3 cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Sparkles size={15} />
                        </div>
                        <span>Mesterhjernen AI</span>
                      </button>
                      <button 
                        onClick={() => { setLandingTab('hms'); setView('landing'); setIsMenuOpen(false); }}
                        className="w-full text-left p-3 rounded-xl hover:bg-blue-50 text-xs font-bold text-neutral-800 flex items-center gap-3 cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <ShieldCheck size={15} />
                        </div>
                        <span>HMS & SJA</span>
                      </button>
                      <button 
                        onClick={() => { setLandingTab('fdv'); setView('landing'); setIsMenuOpen(false); }}
                        className="w-full text-left p-3 rounded-xl hover:bg-teal-50 text-xs font-bold text-neutral-800 flex items-center gap-3 cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <FileCheck size={15} />
                        </div>
                        <span>FDV & Boligmappa</span>
                      </button>
                    </div>
                  </div>

                  {/* Pages Section */}
                  <div className="pt-2 border-t border-neutral-100">
                    <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2">
                      Informasjon
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { setView('pricing'); setIsMenuOpen(false); }}
                        className="text-left p-2.5 rounded-xl bg-neutral-50 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                      >
                        Priser
                      </button>
                      <button 
                        onClick={() => { setIsPortalModalOpen(true); setIsMenuOpen(false); }}
                        className="text-left p-2.5 rounded-xl bg-neutral-50 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer flex items-center gap-1.5"
                      >
                        <Users size={13} className="text-emerald-600" />
                        <span>Kundeportal</span>
                      </button>
                      <button 
                        onClick={() => { setView('about'); setIsMenuOpen(false); }}
                        className="text-left p-2.5 rounded-xl bg-neutral-50 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                      >
                        Om oss
                      </button>
                      <button 
                        onClick={() => { setView('contact'); setIsMenuOpen(false); }}
                        className="text-left p-2.5 rounded-xl bg-neutral-50 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                      >
                        Kontakt
                      </button>
                    </div>

                    <button 
                      onClick={() => { setShowInstallGuide(true); setIsMenuOpen(false); }} 
                      className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-3 bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold border border-neutral-200/80 hover:bg-neutral-200 transition-all cursor-pointer"
                    >
                      <Smartphone size={15} className="text-emerald-600" />
                      <span>Legg til snarvei på mobil (PWA)</span>
                    </button>
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100 mt-2">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-emerald-600" />
                      <select 
                        onChange={(e) => { changeLanguage(e.target.value); setIsMenuOpen(false); }}
                        value={getStandardLang(i18n.language)}
                        className="text-xs font-black bg-transparent border-none focus:ring-0 cursor-pointer uppercase text-neutral-800"
                      >
                        <option value="no">Norsk (NO)</option>
                        <option value="en">English (EN)</option>
                        <option value="pl">Polski (PL)</option>
                        <option value="lt">Lietuvių (LT)</option>
                      </select>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                      Eksport: Norsk
                    </span>
                  </div>
                </div>
              ) : (
                /* Authenticated App Mobile Menu */
                <div className="flex flex-col gap-3">
                  {/* User profile header */}
                  <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div className="flex items-center gap-3 min-w-0">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || 'User'} 
                          className="w-10 h-10 rounded-full border border-neutral-200 object-cover shrink-0 aspect-square"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-800 font-black rounded-full flex items-center justify-center shrink-0">
                          {user.displayName?.[0] || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-neutral-900 truncate">{user.displayName || 'Mester Bruker'}</p>
                        <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => { setView('settings'); setIsMenuOpen(false); }}
                        aria-label="Innstillinger"
                        className={cn(
                          "p-2 rounded-xl transition-colors cursor-pointer",
                          view === 'settings' ? "bg-emerald-100 text-emerald-700" : "text-neutral-500 hover:bg-neutral-200"
                        )}
                      >
                        <Settings size={18} />
                      </button>
                      <button 
                        onClick={() => { logout(); setIsMenuOpen(false); }}
                        aria-label="Logg ut"
                        className="p-2 text-neutral-400 hover:text-red-500 rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Main App Modules */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-1 mb-2">
                      Systemmoduler
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { tab: 'oversikt', label: 'Oversikt', icon: <LayoutDashboard size={16} /> },
                        { tab: 'prosjekter', label: 'Prosjekter', icon: <FolderKanban size={16} /> },
                        { tab: 'tilbud', label: 'Tilbud & Kalkyle', icon: <FileText size={16} /> },
                        { tab: 'avvik', label: 'Avvik & KS', icon: <AlertTriangle size={16} /> },
                        { tab: 'hms', label: 'HMS & Mannskap', icon: <ShieldCheck size={16} /> },
                        { tab: 'finans', label: 'Finans & Endringer', icon: <Coins size={16} /> },
                        { tab: 'laerling', label: 'Lærling', icon: <GraduationCap size={16} /> },
                        { tab: 'ai', label: 'AI Analyse', icon: <Brain size={16} /> },
                      ].map((m) => (
                        <button
                          key={m.tab}
                          onClick={() => {
                            handleMobileNavigate('dashboard', m.tab);
                            setIsMenuOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer",
                            view === 'dashboard' && dashboardTab === m.tab
                              ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm"
                              : "bg-white border-neutral-200/80 text-neutral-700 hover:bg-neutral-50"
                          )}
                        >
                          <span className={cn(
                            "p-1.5 rounded-lg shrink-0",
                            view === 'dashboard' && dashboardTab === m.tab ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600"
                          )}>
                            {m.icon}
                          </span>
                          <span className="truncate">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Field Tools Direct Launch */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-1 mb-2">
                      Feltverktøy
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          handleMobileAction('vehicle');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold bg-neutral-50 border border-neutral-200/80 text-neutral-800 hover:bg-neutral-100 transition-all cursor-pointer"
                      >
                        <span className="p-1.5 rounded-lg bg-neutral-900 text-white shrink-0">
                          <Car size={16} />
                        </span>
                        <span className="truncate">Kjørebok</span>
                      </button>

                      <button
                        onClick={() => {
                          handleMobileAction('inventory');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold bg-neutral-50 border border-neutral-200/80 text-neutral-800 hover:bg-neutral-100 transition-all cursor-pointer"
                      >
                        <span className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0">
                          <Package size={16} />
                        </span>
                        <span className="truncate">Lager & Utstyr</span>
                      </button>

                      <button
                        onClick={() => {
                          handleMobileAction('time_registration');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold bg-neutral-50 border border-neutral-200/80 text-neutral-800 hover:bg-neutral-100 transition-all cursor-pointer"
                      >
                        <span className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0">
                          <Clock size={16} />
                        </span>
                        <span className="truncate">Før timer</span>
                      </button>

                      <button
                        onClick={() => {
                          handleMobileAction('take_photo');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold bg-neutral-50 border border-neutral-200/80 text-neutral-800 hover:bg-neutral-100 transition-all cursor-pointer"
                      >
                        <span className="p-1.5 rounded-lg bg-rose-500 text-white shrink-0">
                          <Camera size={16} />
                        </span>
                        <span className="truncate">AI Vision</span>
                      </button>
                    </div>
                  </div>

                  {/* App Views & Admin */}
                  <div className="pt-2 border-t border-neutral-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { setView('mobile'); setIsMenuOpen(false); }} 
                        className={cn("flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold cursor-pointer", view === 'mobile' ? "bg-emerald-50 text-emerald-700" : "text-neutral-600 hover:bg-neutral-50")}
                      >
                        <Smartphone size={15} />
                        <span>Mobil Feltapp</span>
                      </button>

                      <button 
                        onClick={() => { setView('settings'); setIsMenuOpen(false); }} 
                        className={cn("flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold cursor-pointer", view === 'settings' ? "bg-emerald-50 text-emerald-700" : "text-neutral-600 hover:bg-neutral-50")}
                      >
                        <Settings size={15} />
                        <span>Innstillinger</span>
                      </button>

                      {(user.role === 'admin' || user.email === 'kenkri3@gmail.com') && (
                        <button 
                          onClick={() => { setView('super-admin'); setIsMenuOpen(false); }} 
                          className={cn("col-span-2 flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold cursor-pointer", view === 'super-admin' ? "bg-rose-50 text-rose-700" : "text-rose-600 hover:bg-rose-50")}
                        >
                          <Shield size={15} />
                          <span>SuperAdmin Kontrollpanel</span>
                        </button>
                      )}
                    </div>

                    <button 
                      onClick={() => { setShowInstallGuide(true); setIsMenuOpen(false); }} 
                      className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-500 transition-all cursor-pointer"
                    >
                      <Smartphone size={16} />
                      <span>Installer som app på mobilen</span>
                    </button>
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100 mt-1">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-emerald-600" />
                      <select 
                        onChange={(e) => { changeLanguage(e.target.value); setIsMenuOpen(false); }}
                        value={getStandardLang(i18n.language)}
                        className="text-xs font-black bg-transparent border-none focus:ring-0 cursor-pointer uppercase text-neutral-800"
                      >
                        <option value="no">Norsk (NO)</option>
                        <option value="en">English (EN)</option>
                        <option value="pl">Polski (PL)</option>
                        <option value="lt">Lietuvių (LT)</option>
                      </select>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                      Eksport: Norsk
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className={cn("pt-16", user ? "pb-24 md:pb-8" : "")}>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {view === 'landing' && (
              <LandingPage 
                onStartDemo={handleStartDemo} 
                onOpenPortal={handleOpenPortal}
                onViewChange={setView}
                currentTab={landingTab}
                onTabChange={setLandingTab}
              />
            )}
            {view === 'login' && <Login onBack={() => setView('landing')} />}
            {view === 'dashboard' && (
              <Dashboard 
                isDemo={false} 
                initialTab={dashboardTab}
                onTabChange={(tab) => setDashboardTab(tab as any)}
                onOpenPortal={(p) => {
                  setPortalProject(p);
                  setView('customer-portal');
                }}
              />
            )}
            {view === 'mobile' && <MobileApp />}
            {view === 'spec' && <TechnicalSpec />}
            {view === 'settings' && <SettingsPage />}
            {view === 'super-admin' && (
              (user?.role === 'admin' || user?.email === 'kenkri3@gmail.com') ? (
                <SuperAdmin />
              ) : (
                <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl shadow-xl border border-red-100 text-center">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 mb-2">Ingen tilgang til Admin</h2>
                  <p className="text-neutral-500 text-sm mb-6">
                    Denne modulen krever administrator-rettigheter. Vennligst logg inn med en admin-konto.
                  </p>
                  <button 
                    onClick={() => logout().then(() => setView('dashboard'))} 
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all shadow-md"
                  >
                    Logg inn som Admin
                  </button>
                </div>
              )
            )}
            {view === 'offer' && offerToken && <OfferPage token={offerToken} />}
            {view === 'invite' && inviteToken && <InviteAcceptancePage token={inviteToken} />}
            {view === 'customer-portal' && portalProject && <CustomerPortal project={portalProject} />}
            {view === 'pricing' && <PricingPage />}
            {view === 'about' && <AboutPage />}
            {view === 'contact' && <ContactPage />}
            {view === 'privacy' && <PrivacyPage />}
            {view === 'terms' && <TermsPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Native Mobile Bottom Navigation Dock (Fixed at bottom on phones) */}
      {user && !['offer', 'invite', 'customer-portal'].includes(view) && (
        <MobileBottomNav
          currentView={view}
          activeTab={dashboardTab}
          onNavigate={handleMobileNavigate}
          onOpenQuickActions={() => setIsQuickActionOpen(true)}
          onOpenMenu={() => setIsMenuOpen(true)}
        />
      )}

      {/* Mobile Quick Action Sheet */}
      <MobileQuickActionSheet
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        onAction={handleMobileAction}
      />

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2.5rem] pb-[env(safe-area-inset-bottom,0px)]"
          >
            <InstallGuide onClose={() => setShowInstallGuide(false)} />
          </motion.div>
        </div>
      )}

      {/* Footer - Only rendered when not on landing page since LandingPage has its own dedicated footer */}
      {view !== 'landing' && (
        <footer className="bg-neutral-900 text-neutral-400 py-12 border-t border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="col-span-1 md:col-span-2">
                <Logo size="md" className="mb-6 text-white" />
                <p className="max-w-md text-sm leading-relaxed">
                  {t('footer_desc')}
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">{t('product')}</h4>
                <ul className="space-y-2 text-sm">
                  <li><button onClick={() => setView('dashboard')} className="hover:text-white transition-colors">{t('dashboard')}</button></li>
                  <li><button onClick={() => setView('mobile')} className="hover:text-white transition-colors">{t('mobile_app')}</button></li>
                  <li><button onClick={() => setView('pricing')} className="hover:text-white transition-colors">{t('pricing')}</button></li>
                  <li><button className="hover:text-white transition-colors">{t('integrations')}</button></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">{t('company')}</h4>
                <ul className="space-y-2 text-sm">
                  <li><button onClick={() => setView('about')} className="hover:text-white transition-colors">{t('about_us')}</button></li>
                  <li><button onClick={() => setView('contact')} className="hover:text-white transition-colors">{t('contact')}</button></li>
                  <li><button onClick={() => setView('privacy')} className="hover:text-white transition-colors">{t('privacy')}</button></li>
                  <li><button onClick={() => setView('terms')} className="hover:text-white transition-colors">{t('terms')}</button></li>
                  <li>
                    <button 
                      onClick={() => window.dispatchEvent(new CustomEvent('open_cookie_settings'))} 
                      className="hover:text-white transition-colors text-emerald-400 font-medium"
                    >
                      Informasjonskapsler
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
              <p>{t('footer_rights')}</p>
              <div className="flex gap-6">
                <span>{t('tek17_compliance')}</span>
                <span>{t('gdpr_compliance')}</span>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Kundeportal Modal */}
      {isPortalModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-neutral-100 relative"
          >
            <button
              onClick={() => setIsPortalModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center transition-colors cursor-pointer text-sm"
              aria-label="Lukk"
            >
              ✕
            </button>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Kundeportal for byggherre</h3>
            <p className="text-neutral-500 text-xs md:text-sm mb-6 leading-relaxed">
              Er du oppdragsgiver eller byggherre? Tast inn din prosjektkode eller prosjekt-ID for direkte innsyn i fremdrift, KS-dokumentasjon, bilder og FDV-arkiv.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (portalModalCode.trim()) {
                handleOpenPortal(portalModalCode.trim());
                setIsPortalModalOpen(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-neutral-700 mb-1.5 uppercase tracking-wider">
                  Prosjektkode eller ID
                </label>
                <input
                  type="text"
                  value={portalModalCode}
                  onChange={(e) => setPortalModalCode(e.target.value)}
                  placeholder="f.eks. P-2025-01 eller portal-token"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPortalModalOpen(false)}
                  className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={!portalModalCode.trim()}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Åpne portal
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* GDPR Cookie Banner */}
      <CookieBanner onOpenPrivacyPolicy={() => setView('privacy')} />
      <Toaster position="top-right" richColors />
    </div>
  );
}
