'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
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
  FileCheck,
  Layers,
  MessageSquare,
  FileSignature,
  Lock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Toaster } from 'sonner';
import { View, Project, SJAReport, Deviation } from './types';
import LandingPage, { LandingTab } from './components/LandingPage';
import Login from './components/Login';
import { PricingPage, AboutPage, ContactPage, PrivacyPage, TermsPage } from './components/StaticPages';
import Logo from './components/Logo';
import { NotificationBell } from './components/NotificationBell';
import { AuthProvider, useAuth } from './hooks/useAuth';
import NetworkStatusBadge from './components/NetworkStatusBadge';
import CookieBanner from './components/CookieBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import Link from 'next/link';
import { PublicFooter } from './components/PublicFooter';
import MobileBottomNav from './components/MobileBottomNav';
import MobileQuickActionSheet from './components/MobileQuickActionSheet';
import VikingChatbot from './components/VikingChatbot';

// 🚀 CODE SPLITTING: Lazy load heavy app modules to keep the landing bundle lightweight and fast
const Dashboard = lazy(() => import('./components/Dashboard'));
const MobileApp = lazy(() => import('./components/MobileApp'));
const SettingsPage = lazy(() => import('./components/Settings'));
const CustomerPortal = lazy(() => import('./components/CustomerPortal'));
const SuperAdmin = lazy(() => import('./components/SuperAdmin'));
const OfferPage = lazy(() => import('./components/OfferPage'));
const InviteAcceptancePage = lazy(() => import('./components/InviteAcceptancePage'));
const InstallGuide = lazy(() => import('./components/InstallGuide'));
const PublicOfferFlow = lazy(() => import('./components/PublicOfferFlow'));
const PublicChangeOrderFlow = lazy(() => import('./components/PublicChangeOrderFlow'));
const PartnerPortal = lazy(() => import('./components/PartnerPortal'));
const IntegrationModal = lazy(() => import('./components/IntegrationModal'));
import AdminSimulationBar from './components/AdminSimulationBar';

function ModuleLoader() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 space-y-4">
      <div className="w-10 h-10 border-4 border-electric-200 border-t-electric-600 rounded-full animate-spin" />
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('module_loading', 'Laster inn modul...')}</span>
    </div>
  );
}

import './i18n';
import { getStandardLang } from './i18n';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { db, doc, getDoc, collection, query, where, getDocs, updateUserProfile } from './services/firebase';
import { toast } from 'sonner';
import { promptPWAInstall, isPWAInstalled, triggerAppDownloadOrInstall, downloadMobileShortcut } from './lib/pwa';

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
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [mobileScreen, setMobileScreen] = useState<'home' | 'camera' | 'voice' | 'report' | 'imageResult' | 'translator' | 'laerling' | 'dailyLog' | 'activity' | 'contacts'>('home');
  const { t, i18n } = useTranslation();
  const { user, logout, isAuthReady, subscriptionStatus, trialDaysLeft, impersonatedCompanyId, stopImpersonation, isSuperAdmin, isPlatformOwner } = useAuth();

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail?.token) setOfferToken(e.detail.token);
      if (e.detail?.offerToken) setOfferToken(e.detail.offerToken);
      if (e.detail?.changeOrderToken) setChangeOrderToken(e.detail.changeOrderToken);
      if (e.detail?.view) setView(e.detail.view);
      if (e.detail?.screen) setMobileScreen(e.detail.screen);
    };
    const handleOpenContacts = () => {
      setMobileScreen('contacts');
      setView('mobile');
    };
    const handleOpenMobileMenu = () => setIsMenuOpen(true);

    const handleOpenPublicOffer = (e: any) => {
      const token = e.detail?.token || e.detail?.offerToken;
      if (token) {
        setOfferToken(token);
        setView('public-offer');
      }
    };

    const handleOpenPublicChangeOrder = (e: any) => {
      const token = e.detail?.token || e.detail?.changeOrderToken;
      if (token) {
        setChangeOrderToken(token);
        setView('public-change-order');
      }
    };

    window.addEventListener('navigate_view', handleNav);
    window.addEventListener('open_public_offer', handleOpenPublicOffer);
    window.addEventListener('open_public_change_order', handleOpenPublicChangeOrder);
    window.addEventListener('open_mobile_contacts', handleOpenContacts);
    window.addEventListener('open_mobile_menu', handleOpenMobileMenu);
    return () => {
      window.removeEventListener('navigate_view', handleNav);
      window.removeEventListener('open_public_offer', handleOpenPublicOffer);
      window.removeEventListener('open_public_change_order', handleOpenPublicChangeOrder);
      window.removeEventListener('open_mobile_contacts', handleOpenContacts);
      window.removeEventListener('open_mobile_menu', handleOpenMobileMenu);
    };
  }, []);

  // 🚀 Auto-route into dashboard on initial authentication
  const hasInitiallyRouted = useRef(false);
  useEffect(() => {
    if (isAuthReady && user && !hasInitiallyRouted.current) {
      hasInitiallyRouted.current = true;
      if (['landing', 'login'].includes(view)) {
        setView('dashboard');
      }
    }
  }, [isAuthReady, user, view]);

  const handleMobileNavigate = (targetView: string, tab?: string) => {
    if (tab) {
      setDashboardTab(tab as any);
      window.dispatchEvent(new CustomEvent('switch_mester_tab', { detail: { tab } }));
    }
    setView(targetView as View);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMobileAction = (actionId: string) => {
    const mobileActions = ['take_photo', 'voice_sja', 'log_deviation', 'start_checklist', 'contacts', 'laerling', 'translator', 'activity', 'all_modules', 'modules'];

    if (actionId === 'all_modules' || actionId === 'modules') {
      if (view !== 'dashboard') {
        setView('dashboard');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'all_modules' } }));
        }, 150);
      } else {
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'all_modules' } }));
      }
      return;
    }

    if (view === 'mobile') {
      if (actionId === 'contacts') {
        setMobileScreen('contacts');
      }
      if (mobileActions.includes(actionId)) {
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId } }));
        return;
      }
      // Action requires dashboard view
      setView('dashboard');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId } }));
      }, 150);
      return;
    }

    if (actionId === 'voice_sja') {
      if (view !== 'dashboard') {
        setView('dashboard');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'voice_sja' } }));
        }, 150);
      } else {
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'voice_sja' } }));
      }
      return;
    }
    if (actionId === 'contacts') {
      if (view !== 'dashboard') {
        setView('dashboard');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'contacts' } }));
        }, 150);
      } else {
        window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'contacts' } }));
      }
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

  // 🔒 Forhindre overscroll / elastisk drag på mobil når man er i arbeidsstasjonen
  useEffect(() => {
    if (['dashboard', 'mobile', 'super-admin'].includes(view)) {
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.body.style.position = 'fixed';
      document.body.style.inset = '0';
      document.body.style.overscrollBehavior = 'none';
      document.body.style.backgroundColor = '#0A101D';
      return () => {
        document.documentElement.style.overflow = '';
        document.documentElement.style.height = '';
        document.documentElement.style.overscrollBehavior = '';
        document.body.style.overflow = '';
        document.body.style.height = '';
        document.body.style.position = '';
        document.body.style.inset = '';
        document.body.style.overscrollBehavior = '';
        document.body.style.backgroundColor = '';
      };
    }
  }, [view]);

  const publicViews: View[] = ['landing', 'spec', 'pricing', 'about', 'contact', 'privacy', 'terms', 'offer', 'invite', 'customer-portal', 'login', 'public-offer', 'public-change-order', 'partner'];
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
      setView('landing');
      setLandingTab('home');
      setTimeout(() => {
        const el = document.getElementById('live-demo');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 120);
    }
  };

  const handleGoToOrder = () => {
    setView('landing');
    setLandingTab('home');
    setTimeout(() => {
      const el = document.getElementById('bestill');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 120);
  };

  const handleInstallApp = async () => {
    if (isPWAInstalled()) {
      toast.info('VikingMester er allerede installert som app på denne enheten!');
      return;
    }

    await triggerAppDownloadOrInstall({
      onInstalled: () => toast.info('VikingMester er allerede installert som app på denne enheten!'),
      onAccepted: () => toast.success('Laster ned og installerer VikingMester på telefonen...'),
      onFallback: () => {
        toast.success('Laster ned snarvei til VikingMester...');
      }
    });
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

  // Scroll to top helper - Instant and smooth without freezing the thread
  const scrollToTop = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Scroll to top on view and landingTab change
  useEffect(() => {
    scrollToTop();
  }, [view, landingTab]);

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

    const invite = params.get('invite') || (typeof window !== 'undefined' ? localStorage.getItem('pending_invite_token') : null);
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
    if (pathParts[1] === 'partner') {
      setView('partner');
    }
    const partnerParam = params.get('partner') || params.get('partnerportal');
    if (partnerParam) {
      setView('partner');
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
      <Suspense fallback={<ModuleLoader />}>
        <PublicOfferFlow 
          token={offerToken || undefined} 
          onNavigateToPortal={(id) => handleOpenPortal(id)} 
          onBackToApp={() => setView(user ? 'dashboard' : 'landing')} 
        />
      </Suspense>
    );
  }

  // Direct full-screen Customer Change Order flow
  if (view === 'public-change-order' && changeOrderToken) {
    return (
      <Suspense fallback={<ModuleLoader />}>
        <PublicChangeOrderFlow 
          token={changeOrderToken} 
          onNavigateToPortal={(id) => handleOpenPortal(id)} 
        />
      </Suspense>
    );
  }

  // Direct full-screen Partner Onboarding & Lead Portal (50/50 Joint Venture)
  if (view === 'partner') {
    return (
      <Suspense fallback={<ModuleLoader />}>
        <PartnerPortal 
          onBackToApp={() => setView(user ? 'dashboard' : 'landing')} 
        />
      </Suspense>
    );
  }

  // If trying to access a private view without being logged in, show login
  if (!user && !isPublicView) {
    return <Login onBack={() => setView('landing')} onSuccess={() => setView('dashboard')} />;
  }


  const isSubscriptionLocked = user && !isSuperAdmin && (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled' || subscriptionStatus === 'deactivated');

  if (isSubscriptionLocked) {
    const isCancelled = subscriptionStatus === 'cancelled' || subscriptionStatus === 'deactivated';
    return (
      <div className="min-h-screen bg-[#08090d] bg-tactical-grid bg-radial-amber flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#0e111a] rounded-2xl shadow-2xl p-8 lg:p-12 text-center border border-white/10"
        >
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-white">
            {isCancelled ? 'Abonnementet er deaktivert' : t('trial_expired', '14-dagers prøveperiode er over')}
          </h1>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            {isCancelled 
              ? 'Tilgangen til din bedrift er deaktivert etter oppsigelse eller endring. Ta kontakt med oss for å gjenåpne eller reaktivere kontoen.'
              : t('trial_expired_desc', 'Din 14-dagers gratis prøveperiode er fullført. For å fortsette å bruke VikingMester må du velge et abonnement.')}
          </p>
          <button 
            onClick={() => setView('pricing')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold transition-all mb-3 cursor-pointer shadow-lg shadow-emerald-900/30"
          >
            {isCancelled ? 'Se abonnement og priser' : t('choose_plan', 'Velg abonnement nå')}
          </button>
          <button 
            onClick={() => setView('contact')}
            className="w-full bg-white/10 hover:bg-white/15 text-white py-3 rounded-2xl font-bold transition-all mb-4 text-xs cursor-pointer"
          >
            Ta kontakt med kundeservice
          </button>
          <button 
            onClick={logout}
            className="text-neutral-400 hover:text-neutral-200 font-medium text-sm cursor-pointer transition-colors"
          >
            {t('logout', 'Logg ut')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      "font-sans selection:bg-electric-500/20 selection:text-electric-700",
      ['dashboard', 'super-admin'].includes(view)
        ? "h-[100dvh] w-full overflow-hidden fixed inset-0 bg-[#0A101D] text-slate-100"
        : "min-h-screen bg-white text-navy-900"
    )}>
      {/* 👑 Fast forankret SuperAdmin Simulator Bar for Kenneth (Sikrer at Kenneth aldri mister tilgang) */}
      <AdminSimulationBar />

      {/* 🚀 UNIFIED MARKETING & APP HEADER (Eliminerer all overlapping mellom ticker og meny) */}
      {(!user || !['dashboard', 'super-admin'].includes(view)) && !['customer-portal', 'offer', 'invite', 'public-offer', 'public-change-order'].includes(view) && (
        <header className="fixed top-0 left-0 right-0 z-50 flex flex-col bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-card-soft">
          {/* 1. Trial Banner (kun ved aktiv prøveperiode) */}
          {user && subscriptionStatus === 'trial' && !impersonatedCompanyId && (
            <div className="bg-emerald-600 text-white text-[10px] font-bold py-1 text-center uppercase tracking-widest shrink-0">
              {t('trial_active', 'Du er i en prøveperiode.')} {trialDaysLeft} {t('days_left', 'dager igjen.')}
            </div>
          )}

          {/* 2. 🏆 THE DREAM TICKER: Slutt på kveldsarbeid og tapte penger */}
          {(!user || ['landing', 'pricing', 'about', 'contact', 'privacy', 'terms'].includes(view)) && (
            <div className="bg-slate-950 text-white py-1.5 px-3 sm:px-4 border-b border-white/10 shrink-0">
              {/* Desktop version (Ren, lekker linje med null tekstbryting) */}
              <div className="hidden sm:flex items-center justify-center gap-3 lg:gap-5 text-[11px] font-semibold tracking-wide whitespace-nowrap overflow-hidden">
                <span className="flex items-center gap-1.5 text-amber-400 font-black tracking-wider uppercase shrink-0">
                  <Sparkles size={12} className="text-amber-400" />
                  <span>DRØMMEN OM FRIHET:</span>
                </span>
                <span className="text-slate-300 font-medium truncate">
                  Slutt på kveldsarbeid foran PC etter 10 timer på byggeplassen.
                </span>
                <span className="text-emerald-400 font-extrabold flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={12} />
                  <span>Få betalt for alle endringer (NS 8406)</span>
                </span>
                <span className="text-electric-300 font-extrabold hidden lg:inline shrink-0">
                  ⚡ 100% Autonom MesterAI
                </span>
                <span className="text-amber-300 bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0">
                  14 dager gratis • 0,- etablering
                </span>
              </div>

              {/* Mobile Compact Ticker (1 ren, delikat linje som aldri brekker til 3 klumpete rader) */}
              <div className="sm:hidden flex items-center justify-between gap-1.5 text-[10.5px] font-semibold whitespace-nowrap overflow-hidden px-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sparkles size={11} className="text-amber-400 shrink-0" />
                  <span className="text-slate-200 truncate">
                    Slutt på kveldsarbeid • Få betalt for endringer
                  </span>
                </div>
                <span className="text-amber-300 font-bold shrink-0 text-[10px]">
                  14 dgr gratis ➔
                </span>
              </div>
            </div>
          )}

          {/* 3. Navigation Bar */}
          <nav className="w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {(!user || ['landing', 'pricing', 'about', 'contact', 'privacy', 'terms'].includes(view)) ? (
                /* PUBLIC MARKETING NAVBAR - SELLER DRØMMEN */
                <div className="flex justify-between h-16 items-center">
                  {/* Left: Logo & Audience Tag */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div 
                      className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => { setView('landing'); setLandingTab('home'); }}
                    >
                      <Logo size="md" className="text-navy-900" />
                    </div>
                  </div>

              {/* Desktop Center: World-Class SaaS Links That Sell The Dream */}
              <div className="hidden lg:flex items-center gap-1 xl:gap-1.5 2xl:gap-2">
                {/* Autonome Superkrefter Dropdown */}
                <div className="relative group">
                  <button 
                    onClick={() => setIsSolutionsDropdownOpen(!isSolutionsDropdownOpen)}
                    className={cn(
                      "px-2.5 xl:px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                      (view === 'landing' && ['ai', 'hms', 'fdv'].includes(landingTab))
                        ? "bg-electric-50 text-electric-600 font-bold border border-electric-300/30" 
                        : "text-slate-700 hover:text-navy-900 hover:bg-slate-100"
                    )}
                  >
                    <span>Autonome Superkrefter</span>
                    <ChevronDown size={14} className="text-slate-400 group-hover:text-amber-500 transition-transform group-hover:rotate-180 shrink-0" />
                  </button>

                  {/* Dropdown Menu - Selling Each Dream */}
                  <div className={cn(
                    "absolute top-full left-0 mt-1.5 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150",
                    isSolutionsDropdownOpen ? "block" : "hidden group-hover:block"
                  )}>
                    <Link 
                      href="/ks-system"
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group/item"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors">
                        <Zap size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-navy-900">Autonom Tilbud-til-KS</p>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Magisk</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">Signert tilbud oppretter kontrakt, prosjekt og sjekklister automatisk på 3 sekunder.</p>
                      </div>
                    </Link>

                    <Link 
                      href="/prosjektstyring"
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group/item"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover/item:bg-rose-600 group-hover/item:text-white transition-colors">
                        <FileSignature size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-navy-900">Tale-til-Endringsordre (NS 8406)</p>
                          <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">Få betalt</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">Snakk inn endringen på 15 sek ➔ Kunden godkjenner via e-post eller Teams før arbeidet starter.</p>
                      </div>
                    </Link>

                    <Link 
                      href="/avvikshandtering"
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group/item"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover/item:bg-purple-600 group-hover/item:text-white transition-colors">
                        <Lock size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-navy-900">Tverrfaglig Lukkesperre (TEK17)</p>
                          <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">Null rivning</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">Vegg låses mot plating inntil rør & el er fotokvittert. Full trygghet mot tabber.</p>
                      </div>
                    </Link>

                    <Link 
                      href="/ks-system#fdv"
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group/item"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors">
                        <FileCheck size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-navy-900">1-Klikk FDV til Boligmappa</p>
                          <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">Slutt på permer</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">All dokumentasjon og bilder samles i en fiks ferdig rapport på ett tastetrykk.</p>
                      </div>
                    </Link>

                    <Link 
                      href="/hms"
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group/item"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover/item:bg-amber-600 group-hover/item:text-white transition-colors">
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-navy-900">HMS, SJA & Yr-sanntidsvær</p>
                        <p className="text-[10px] text-slate-500 leading-tight">Lovpålagt internkontroll og risikovurdering ferdig på sekunder fra stillaset.</p>
                      </div>
                    </Link>

                    <Link 
                      href="/stoffkartotek"
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group/item"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover/item:bg-teal-600 group-hover/item:text-white transition-colors">
                        <Package size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-navy-900">Digitalt Stoffkartotek (Offline)</p>
                        <p className="text-[10px] text-slate-500 leading-tight">Sikkerhetsdatablader offline på byggeplassen for alle ansatte.</p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Priser (Fra 690,- / Spar 40t) */}
                <Link
                  href="/priser"
                  className={cn(
                    "px-2 xl:px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap",
                    view === 'pricing'
                      ? "bg-electric-50 text-electric-600 font-bold border border-electric-300/30"
                      : "text-slate-700 hover:text-navy-900 hover:bg-slate-100"
                  )}
                >
                  <span>Priser</span>
                  <span className="text-[10px] font-black uppercase text-electric-700 bg-electric-50 border border-electric-200 px-1.5 py-0.5 rounded-full shrink-0">
                    Fra 690,-
                  </span>
                </Link>

                {/* Kundeportal */}
                <button 
                  onClick={() => setIsPortalModalOpen(true)}
                  className="px-2 xl:px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-navy-900 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Users size={14} className="text-emerald-600 shrink-0" />
                  <span>Kundeportal</span>
                </button>

                {/* FAQ */}
                <Link
                  href="/faq"
                  className="hidden xl:inline-flex px-2 xl:px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-navy-900 hover:bg-slate-100 transition-all whitespace-nowrap"
                >
                  FAQ
                </Link>

                {/* Om oss */}
                <Link
                  href="/om-oss"
                  className={cn(
                    "hidden xl:inline-flex px-2 xl:px-2.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                    view === 'about'
                      ? "bg-electric-50 text-electric-600 font-bold border border-electric-300/30"
                      : "text-slate-600 hover:text-navy-900 hover:bg-slate-100"
                  )}
                >
                  Om oss
                </Link>

                {/* Kontakt */}
                <Link
                  href="/kontakt"
                  className={cn(
                    "hidden lg:inline-flex px-2 xl:px-2.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                    view === 'contact'
                      ? "bg-electric-50 text-electric-600 font-bold border border-electric-300/30"
                      : "text-slate-600 hover:text-navy-900 hover:bg-slate-100"
                  )}
                >
                  Kontakt
                </Link>
              </div>

              {/* Desktop Right: Actions */}
              <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 2xl:gap-2.5 shrink-0">
                {/* Language Selector */}
                <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 transition-all shrink-0">
                  <Globe size={13} className="text-slate-500 shrink-0" />
                  <select 
                    onChange={(e) => changeLanguage(e.target.value)}
                    value={getStandardLang(i18n.language)}
                    className="text-[11px] font-bold bg-transparent border-none focus:ring-0 cursor-pointer uppercase text-slate-800 pr-1 outline-none"
                    title={t('language', 'Bytt språk')}
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
                    className="whitespace-nowrap shrink-0 bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white px-3.5 xl:px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-purple-cta active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <LayoutDashboard size={14} />
                    <span>{t('nav_dashboard', 'Gå til Dashboard')}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 xl:gap-2 shrink-0">
                    <button 
                      onClick={() => setView('login')}
                      className="whitespace-nowrap shrink-0 text-slate-700 hover:text-navy-900 px-2 xl:px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      {t('nav_login', 'Logg inn')}
                    </button>
                    <button 
                      onClick={handleGoToOrder}
                      className="whitespace-nowrap shrink-0 bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white px-3 xl:px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-purple-cta hover:shadow-purple-hover active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles size={13} className="text-amber-300 animate-pulse shrink-0" />
                      <span className="hidden xl:inline">Start 14 dager gratis</span>
                      <span className="xl:hidden">Prøv gratis</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="lg:hidden flex items-center gap-2">
                <NetworkStatusBadge />
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-neutral-700 hover:text-neutral-950 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>
            </div>
          ) : (
            /* AUTHENTICATED INTERNAL APP NAVBAR */
            <div className="flex justify-between h-16 items-center">
              {/* Left: Logo & Active Workspace Badge */}
              <div className="flex items-center gap-3 shrink-0">
                <div 
                  className="flex items-center gap-1.5 cursor-pointer group"
                  onClick={() => setView('dashboard')}
                  title="Gå til Dashboard"
                >
                  <Logo size="md" className="text-navy-900" />
                </div>
                {user?.company && (
                  <span className="hidden sm:inline-flex items-center text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                    {user.company}
                  </span>
                )}
                {view !== 'dashboard' && (
                  <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t('nav_agent_active', 'MesterAI Aktiv')}</span>
                  </div>
                )}
              </div>

              {/* Desktop Center: Internal Operational App Navigation */}
              <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
                <button 
                  onClick={handleGoToDashboard}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    view === 'dashboard' 
                      ? "bg-electric-50 text-electric-600 font-bold border border-electric-300/30 shadow-sm" 
                      : "text-slate-600 hover:text-navy-900 hover:bg-slate-100"
                  )}
                >
                  <LayoutDashboard size={15} />
                  <span>{t('nav_overview', 'Oversikt')}</span>
                </button>

                <button 
                  onClick={() => setView('mobile')}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    view === 'mobile' 
                      ? "bg-electric-50 text-electric-600 font-bold border border-electric-300/30 shadow-sm" 
                      : "text-slate-600 hover:text-navy-900 hover:bg-slate-100"
                  )}
                >
                  <Smartphone size={15} />
                  <span>{t('nav_mobile', 'Mobilapp')}</span>
                </button>

                <button 
                  onClick={() => setView('settings')}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    view === 'settings' 
                      ? "bg-electric-50 text-electric-600 font-bold border border-electric-300/30 shadow-sm" 
                      : "text-slate-600 hover:text-navy-900 hover:bg-slate-100"
                  )}
                >
                  <Settings size={15} />
                  <span>{t('nav_settings', 'Innstillinger')}</span>
                </button>


                {isSuperAdmin && (
                  <button 
                    onClick={() => setView('super-admin')}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      view === 'super-admin' 
                        ? "bg-rose-50 text-rose-600 font-bold border border-rose-300/30 shadow-sm" 
                        : "text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                    )}
                  >
                    <Shield size={15} />
                    <span>{t('nav_superadmin', 'Super Admin')}</span>
                  </button>
                )}
              </div>

              {/* Desktop Right: Install Shortcut, Language, Notifications, Unified Profile */}
              <div className="hidden md:flex items-center gap-3">
                <button 
                  onClick={handleInstallApp}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-slate-50 text-neutral-700 hover:text-emerald-800 rounded-xl text-xs font-bold transition-all border border-neutral-200/80 hover:border-emerald-300 shadow-sm active:scale-95 cursor-pointer"
                  title={t('nav_download_app', 'Last ned app')}
                >
                  <Download size={14} className="text-emerald-600" />
                  <span>{t('nav_download_app', 'Last ned app')}</span>
                </button>

                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5/80 hover:bg-slate-50 rounded-xl border border-neutral-200 transition-all">
                  <Globe size={14} className="text-slate-400 shrink-0" />
                  <select 
                    onChange={(e) => changeLanguage(e.target.value)}
                    value={getStandardLang(i18n.language)}
                    className="text-xs font-black bg-transparent border-none focus:ring-0 cursor-pointer uppercase text-neutral-800 pr-1 outline-none"
                    title={t('language', 'Bytt språk')}
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
                          : "bg-neutral-50 border-neutral-200/80 hover:bg-slate-50 text-neutral-800"
                      )}
                      title={t('nav_settings', 'Brukerprofil & Innstillinger')}
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
                        <p className="text-xs font-bold truncate max-w-[110px]">{user.displayName || t('user_default_name', 'Bruker')}</p>
                        <p className="text-[10px] font-black uppercase text-neutral-400">
                          {(user.role === 'admin' || user.role === 'superadmin' || user.displayName?.toLowerCase().includes('admin') || isSuperAdmin)
                            ? 'Admin / Leder' 
                            : user.role === 'external_worker' 
                              ? 'UE Håndverker'
                              : t('user_craftsman', 'Håndverker')}
                        </p>
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
                  className="p-2 text-neutral-700 hover:text-navy-900 rounded-xl hover:bg-slate-50 cursor-pointer"
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
              className={cn(
                "absolute top-full left-0 right-0 bg-[#060911] border-b border-white/10 p-4 shadow-2xl max-h-[calc(100dvh-5rem)] overflow-y-auto custom-scrollbar z-40 pb-24 text-slate-100",
                (!user || ['landing', 'pricing', 'about', 'contact', 'privacy', 'terms'].includes(view)) ? "lg:hidden" : "md:hidden"
              )}
            >
              {(!user || ['landing', 'pricing', 'about', 'contact', 'privacy', 'terms'].includes(view)) ? (
                /* Public Mobile Menu (Gemini OLED Dark Aesthetic) */
                <div className="space-y-4">
                  {/* Primary Actions */}
                  {user ? (
                    <button 
                      onClick={() => { handleGoToDashboard(); setIsMenuOpen(false); }}
                      className="w-full bg-gradient-to-r from-purple-600 via-electric-600 to-blue-600 text-white py-3.5 rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
                    >
                      <LayoutDashboard size={16} />
                      <span>Gå til MesterAI Cockpit</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { handleGoToOrder(); setIsMenuOpen(false); }}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-full text-xs font-bold shadow-md shadow-purple-600/25 cursor-pointer text-center"
                      >
                        Prøv gratis nå
                      </button>
                      <button 
                        onClick={() => { setView('login'); setIsMenuOpen(false); }}
                        className="w-full bg-[#1e1f20] hover:bg-[#282a2d] text-white border border-white/10 py-3 rounded-full text-xs font-bold cursor-pointer text-center"
                      >
                        Logg inn
                      </button>
                    </div>
                  )}

                  {/* Løsninger Section - Autonome Superkrefter */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                      <span>Autonome Superkrefter</span>
                      <span className="text-emerald-400 font-bold text-[10px]">100% Autonom</span>
                    </div>
                    <div className="space-y-1.5">
                      <Link 
                        href="/ks-system"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full text-left p-3 rounded-2xl bg-[#0d1322] hover:bg-[#131b2e] border border-white/5 hover:border-white/15 text-xs font-bold text-white flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <Zap size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>Autonom Tilbud-til-KS</span>
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">Magisk</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">Signert tilbud oppretter prosjekt & KS på 3 sek</div>
                        </div>
                      </Link>
                      <Link 
                        href="/prosjektstyring"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full text-left p-3 rounded-2xl bg-[#0d1322] hover:bg-[#131b2e] border border-white/5 hover:border-white/15 text-xs font-bold text-white flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                          <FileSignature size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>Tale-til-Endringsordre (NS 8406)</span>
                            <span className="text-[9px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.2 rounded border border-rose-500/30">Få betalt</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">Kunden godkjenner via e-post eller Teams før arbeidet starter</div>
                        </div>
                      </Link>
                      <Link 
                        href="/avvikshandtering"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full text-left p-3 rounded-2xl bg-[#0d1322] hover:bg-[#131b2e] border border-white/5 hover:border-white/15 text-xs font-bold text-white flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                          <Lock size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>Tverrfaglig Lukkesperre (TEK17)</span>
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.2 rounded border border-purple-500/30">Null rivning</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">Vegg låses mot plating inntil rør & el er kvittert</div>
                        </div>
                      </Link>
                      <Link 
                        href="/ks-system#fdv"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full text-left p-3 rounded-2xl bg-[#0d1322] hover:bg-[#131b2e] border border-white/5 hover:border-white/15 text-xs font-bold text-white flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                          <FileCheck size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>1-Klikk FDV til Boligmappa</span>
                            <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-500/30">Slutt på permer</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">Fiks ferdig overleveringsrapport på ett klikk</div>
                        </div>
                      </Link>
                      <Link 
                        href="/hms"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full text-left p-3 rounded-2xl bg-[#0d1322] hover:bg-[#131b2e] border border-white/5 hover:border-white/15 text-xs font-bold text-white flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-white">HMS, SJA & Yr-sanntidsvær</div>
                          <div className="text-[10px] text-slate-400 font-normal">Lovpålagt internkontroll og risikovurdering</div>
                        </div>
                      </Link>
                      <Link 
                        href="/stoffkartotek"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full text-left p-3 rounded-2xl bg-[#0d1322] hover:bg-[#131b2e] border border-white/5 hover:border-white/15 text-xs font-bold text-white flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
                          <Package size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-white">Digitalt Stoffkartotek</div>
                          <div className="text-[10px] text-slate-400 font-normal">Sikkerhetsdatablader offline på mobil</div>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* Pages Section */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Informasjon & Ressurser
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link 
                        href="/priser"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-left p-2.5 rounded-xl bg-[#0e1422] text-xs font-bold text-white hover:bg-[#151e33] border border-white/10 flex items-center justify-between"
                      >
                        <span>Priser</span>
                        <span className="text-[9px] text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded-full font-bold">Fra 690,-</span>
                      </Link>

                      <Link 
                        href="/faq"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-left p-2.5 rounded-xl bg-[#0e1422] text-xs font-bold text-white hover:bg-[#151e33] border border-white/10"
                      >
                        FAQ
                      </Link>
                      <button 
                        onClick={() => { setIsPortalModalOpen(true); setIsMenuOpen(false); }}
                        className="text-left p-2.5 rounded-xl bg-[#0e1422] text-xs font-bold text-white hover:bg-[#151e33] border border-white/10 cursor-pointer flex items-center gap-1.5"
                      >
                        <Users size={13} className="text-emerald-400" />
                        <span>Kundeportal</span>
                      </button>
                      <Link 
                        href="/om-oss"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-left p-2.5 rounded-xl bg-[#0e1422] text-xs font-bold text-white hover:bg-[#151e33] border border-white/10"
                      >
                        Om oss
                      </Link>
                      <Link 
                        href="/kontakt"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-left p-2.5 rounded-xl bg-[#0e1422] text-xs font-bold text-white hover:bg-[#151e33] border border-white/10"
                      >
                        Kontakt
                      </Link>
                    </div>

                    <button 
                      onClick={() => { handleInstallApp(); setIsMenuOpen(false); }} 
                      className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition-all cursor-pointer"
                    >
                      <Download size={15} className="text-purple-400" />
                      <span>{t('app_shortcut_download', 'Last ned mobil-app / snarvei')}</span>
                    </button>
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center justify-between px-4 py-3 bg-[#131314] rounded-xl border border-white/10 mt-2">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-purple-400" />
                      <select 
                        onChange={(e) => { changeLanguage(e.target.value); setIsMenuOpen(false); }}
                        value={getStandardLang(i18n.language)}
                        className="text-xs font-black bg-transparent border-none focus:ring-0 cursor-pointer uppercase text-white"
                      >
                        <option value="no" className="bg-slate-900 text-white">Norsk (NO)</option>
                        <option value="en" className="bg-slate-900 text-white">English (EN)</option>
                        <option value="pl" className="bg-slate-900 text-white">Polski (PL)</option>
                        <option value="lt" className="bg-slate-900 text-white">Lietuvių (LT)</option>
                      </select>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                      {t('export_standard_note', 'Eksport: Norsk')}
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
                        <p className="text-sm font-bold text-navy-900 truncate">{user.displayName || 'Mester Bruker'}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => { setView('settings'); setIsMenuOpen(false); }}
                        aria-label="Innstillinger"
                        className={cn(
                          "p-2 rounded-xl transition-colors cursor-pointer",
                          view === 'settings' ? "bg-emerald-100 text-emerald-700" : "text-slate-400 hover:bg-neutral-200"
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

                  {/* Banner: Åpne alle 20 verktøy & moduler */}
                  <button
                    onClick={() => {
                      handleMobileAction('all_modules');
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-electric-600 via-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-xs shadow-md active:scale-98 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 bg-white/20 rounded-xl">
                        <Layers size={18} />
                      </span>
                      <div className="text-left">
                        <div className="font-bold text-white text-xs">Se alle 20 verktøy & moduler</div>
                        <div className="text-[10px] text-white/80 font-normal">Komplett verktøykasse for bygg & anlegg</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/80" />
                  </button>

                  {/* Main App Modules */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-1 mb-2">
                      MesterAI Arbeidsstasjon
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { tab: 'chat', label: 'MesterAI Samtale', icon: <MessageSquare size={16} />, badge: 'AI' },
                        { tab: 'control_center', label: 'Dagens Kontroll', icon: <Sparkles size={16} /> },
                        { tab: 'projects', label: 'Prosjektoversikt', icon: <FolderKanban size={16} /> },
                        { tab: 'admin', label: 'Tilbud & Kalkyle', icon: <FileText size={16} /> },
                        { tab: 'admin', label: 'Endringsordrer', icon: <FileSignature size={16} />, badge: 'NS 8406' },
                        { tab: 'team', label: 'Team & Tilganger', icon: <Users size={16} /> },
                      ].map((m, idx) => (
                        <button
                          key={`${m.tab}-${idx}`}
                          onClick={() => {
                            handleMobileNavigate('dashboard', m.tab);
                            setIsMenuOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer",
                            view === 'dashboard' && dashboardTab === m.tab
                              ? "bg-electric-50 border-electric-300 text-electric-700 shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={cn(
                              "p-1.5 rounded-lg shrink-0",
                              view === 'dashboard' && dashboardTab === m.tab ? "bg-electric-500 text-white" : "bg-slate-100 text-slate-600"
                            )}>
                              {m.icon}
                            </span>
                            <span className="truncate">{m.label}</span>
                          </div>
                          {m.badge && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-electric-100 text-electric-800 shrink-0">
                              {m.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Field Tools Direct Launch */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-1 mb-2">
                      Feltverktøy & Hurtighandlinger
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          handleMobileAction('time_registration');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold bg-neutral-50 border border-neutral-200/80 text-neutral-800 hover:bg-slate-50 transition-all cursor-pointer"
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
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold bg-neutral-50 border border-neutral-200/80 text-neutral-800 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <span className="p-1.5 rounded-lg bg-rose-500 text-white shrink-0">
                          <Camera size={16} />
                        </span>
                        <span className="truncate">AI Vision</span>
                      </button>

                      <button
                        onClick={() => {
                          handleMobileAction('voice_sja');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold bg-neutral-50 border border-neutral-200/80 text-neutral-800 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <span className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0">
                          <Mic size={16} />
                        </span>
                        <span className="truncate">Stemme-SJA</span>
                      </button>

                      <button
                        onClick={() => {
                          handleMobileAction('start_checklist');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold bg-neutral-50 border border-neutral-200/80 text-neutral-800 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <span className="p-1.5 rounded-lg bg-teal-600 text-white shrink-0">
                          <FileCheck size={16} />
                        </span>
                        <span className="truncate">Sjekkliste</span>
                      </button>

                      <button
                        onClick={() => {
                          handleMobileAction('vehicle');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold bg-neutral-50 border border-neutral-200/80 text-neutral-800 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <span className="p-1.5 rounded-lg bg-slate-800 text-white shrink-0">
                          <Car size={16} />
                        </span>
                        <span className="truncate">Kjørebok</span>
                      </button>

                      <button
                        onClick={() => {
                          handleMobileAction('inventory');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold bg-neutral-50 border border-neutral-200/80 text-neutral-800 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <span className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0">
                          <Package size={16} />
                        </span>
                        <span className="truncate">Lager & Utstyr</span>
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

                      {isSuperAdmin && (
                        <button 
                          onClick={() => { setView('super-admin'); setIsMenuOpen(false); }} 
                          className={cn("col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all", view === 'super-admin' ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-neutral-900 text-white hover:bg-neutral-800")}
                        >
                          <Shield size={15} className="text-rose-400" />
                          <span>SuperAdmin & Autonom Agent</span>
                        </button>
                      )}
                    </div>

                    <button 
                      onClick={() => { handleInstallApp(); setIsMenuOpen(false); }} 
                      className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-emerald-600 text-navy-900 rounded-xl text-xs font-bold shadow-md hover:bg-slate-500 transition-all cursor-pointer"
                    >
                      <Smartphone size={16} />
                      <span>{t('nav_download_app', 'Installer som app på mobilen')}</span>
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
                      {t('export_standard_note', 'Eksport: Norsk')}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
          </nav>
        </header>
      )}

      {/* Main Content */}
      <main className={cn(
        (!['dashboard', 'super-admin'].includes(view) && !['customer-portal', 'offer', 'invite', 'public-offer', 'public-change-order'].includes(view)) ? "pt-24 sm:pt-28" : "",
        ((user && subscriptionStatus === 'trial') || impersonatedCompanyId) && (['dashboard', 'super-admin'].includes(view) || ['customer-portal', 'offer', 'invite', 'public-offer', 'public-change-order'].includes(view) ? "pt-0" : "pt-28"),
        user && !['customer-portal', 'offer', 'invite', 'public-offer', 'public-change-order'].includes(view) && !['dashboard', 'super-admin'].includes(view) ? "pb-24 md:pb-8" : "",
        ['dashboard', 'super-admin'].includes(view) && "h-full w-full overflow-hidden"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onAnimationComplete={() => scrollToTop()}
            className={['dashboard', 'super-admin'].includes(view) ? "h-full w-full overflow-hidden" : undefined}
          >
            <Suspense fallback={<ModuleLoader />}>
              {view === 'landing' && (
                <LandingPage 
                  onStartDemo={handleStartDemo}
                  onOpenPortal={handleOpenPortal}
                  onViewChange={setView}
                  currentTab={landingTab}
                  onTabChange={setLandingTab}
                  onInstallApp={handleInstallApp}
                />
              )}
              {view === 'login' && <Login onBack={() => setView('landing')} onSuccess={() => setView('dashboard')} />}
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
              {view === 'mobile' && (
                <MobileApp 
                  initialScreen={mobileScreen} 
                  onScreenChange={(s) => setMobileScreen(s as any)} 
                />
              )}
              {view === 'spec' && (
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
              {view === 'settings' && <SettingsPage />}
              {view === 'super-admin' && (
                (isSuperAdmin || isPlatformOwner) ? (
                  <Dashboard 
                    isDemo={false} 
                    initialTab="oversikt"
                    initialWorkstationTab="superadmin"
                    onTabChange={(tab) => setDashboardTab(tab as any)}
                    onOpenPortal={(p) => {
                      setPortalProject(p);
                      setView('customer-portal');
                    }}
                    onOpenSuperAdmin={() => setView('super-admin')}
                  />
                ) : (
                  <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl shadow-xl border border-red-100 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Shield size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-navy-900 mb-2">Ingen tilgang til Admin</h2>
                    <p className="text-slate-400 text-sm mb-6">
                      Denne modulen krever administrator-rettigheter. Vennligst logg inn med en admin-konto.
                    </p>
                    <button 
                      onClick={() => logout().then(() => setView('dashboard'))} 
                      className="w-full bg-emerald-600 text-navy-900 py-3 rounded-xl font-bold text-sm hover:bg-slate-500 transition-all shadow-md"
                    >
                      Logg inn som Admin
                    </button>
                  </div>
                )
              )}
              {view === 'offer' && offerToken && <OfferPage token={offerToken} />}
              {view === 'invite' && inviteToken && <InviteAcceptancePage token={inviteToken} />}
              {view === 'customer-portal' && portalProject && (
                <CustomerPortal 
                  project={portalProject} 
                  onClose={() => setView(user ? 'dashboard' : 'login')} 
                  isContractorPreview={!!user}
                />
              )}
              {view === 'pricing' && <PricingPage />}
              {view === 'about' && <AboutPage />}
              {view === 'contact' && <ContactPage />}
              {view === 'privacy' && <PrivacyPage />}
              {view === 'terms' && <TermsPage />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Native Mobile Bottom Navigation Dock (Fixed at bottom on phones) */}
      {user && !['offer', 'invite', 'customer-portal', 'dashboard', 'super-admin'].includes(view) && (
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
            <Suspense fallback={<div className="p-8 text-center text-white font-bold">Laster inn veileder...</div>}>
              <InstallGuide onClose={() => setShowInstallGuide(false)} />
            </Suspense>
          </motion.div>
        </div>
      )}

      {/* Public Marketing Footer */}
      {(!user || ['landing', 'pricing', 'about', 'contact', 'privacy', 'terms'].includes(view)) && (
        <PublicFooter />
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
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-neutral-200 text-slate-400 flex items-center justify-center transition-colors cursor-pointer text-sm"
              aria-label="Lukk"
            >
              ✕
            </button>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-bold text-navy-900 mb-2">Kundeportal for byggherre</h3>
            <p className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed">
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
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-navy-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPortalModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={!portalModalCode.trim()}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-slate-500 disabled:opacity-50 text-navy-900 text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Åpne portal
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Integration Modal */}
      <Suspense fallback={null}>
        <IntegrationModal isOpen={isIntegrationModalOpen} onClose={() => setIsIntegrationModalOpen(false)} />
      </Suspense>

      {/* 🛡️ Universal VikingMester AI Chatbot (Ragnar for visitors, never when logged in and never in settings or portals) */}
      {!user && !['dashboard', 'settings', 'super-admin', 'customer-portal', 'offer', 'invite', 'public-offer', 'public-change-order'].includes(view) && (
        <VikingChatbot
          user={user}
          currentView={view}
          onOpenPricing={() => {
            setView('pricing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenRegister={() => {
            setView('landing');
            setLandingTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenChangeOrderModal={(data) => {
            setView('dashboard');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'change_order', data } }));
            }, 150);
          }}
          onOpenSJAModal={(data) => {
            setView('dashboard');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'sja', data } }));
            }, 150);
          }}
          onOpenOfferModal={(data) => {
            setView('dashboard');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'offers', data } }));
            }, 150);
          }}
          onOpenAIVision={() => {
            setView('dashboard');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('trigger_dashboard_action', { detail: { actionId: 'take_photo' } }));
            }, 150);
          }}
        />
      )}

      {/* GDPR Cookie Banner */}
      <CookieBanner onOpenPrivacyPolicy={() => setView('privacy')} />
      <Toaster position="top-right" richColors />
    </div>
  );
}
