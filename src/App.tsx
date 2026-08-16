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
  Bell
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Toaster } from 'sonner';
import { View, Project, SJAReport, Deviation } from './types';
import LandingPage from './components/LandingPage';
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
import { PricingPage, AboutPage, ContactPage, PrivacyPage, TermsPage } from './components/StaticPages';
import Logo from './components/Logo';
import { NotificationBell } from './components/NotificationBell';
import { AuthProvider, useAuth } from './hooks/useAuth';
import InstallGuide from './components/InstallGuide';
import NetworkStatusBadge from './components/NetworkStatusBadge';
import CookieBanner from './components/CookieBanner';
import { ErrorBoundary } from './components/ErrorBoundary';

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
  const [offerToken, setOfferToken] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [portalProject, setPortalProject] = useState<Project | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const { t, i18n } = useTranslation();
  const { user, logout, isAuthReady, subscriptionStatus, trialDaysLeft, impersonatedCompanyId, stopImpersonation } = useAuth();

  const publicViews: View[] = ['landing', 'spec', 'pricing', 'about', 'contact', 'privacy', 'terms', 'offer', 'invite'];
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
    setIsDemo(true);
    setView('dashboard');
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

      toast.error(`Prosjektet med kode/ID "${projectIdOrCode}" ble ikke funnet.`);
    } catch (error) {
      console.error("Error opening portal project:", error);
      toast.error("Kunne ikke hente prosjektet. Vennligst sjekk koden.");
    }
  };

  const handleGoToDashboard = () => {
    setIsDemo(false);
    setView('dashboard');
  };

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // Check for offer token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('offer');
    if (token) {
      setOfferToken(token);
      setView('offer');
    }

    const invite = params.get('invite');
    if (invite) {
      setInviteToken(invite);
      setView('invite');
    }

    // Check for path-based tokens (e.g., /invite/token)
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'invite' && pathParts[2]) {
      setInviteToken(pathParts[2]);
      setView('invite');
    }
    if (pathParts[1] === 'offer' && pathParts[2]) {
      setOfferToken(pathParts[2]);
      setView('offer');
    }
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
      </div>
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
        "fixed left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 transition-all",
        (user && subscriptionStatus === 'trial') || impersonatedCompanyId ? "top-6" : "top-0"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

            {/* Desktop Center: Clean, Focused Navigation Links */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
              <button 
                onClick={handleGoToDashboard}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
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
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
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
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70",
                  view === 'spec' && "bg-neutral-100 text-neutral-900 font-black"
                )}
              >
                {t('specification', 'Spesifikasjon')}
              </button>

              {user && (user.role === 'admin' || user.email === 'kenkri3@gmail.com') && (
                <button 
                  onClick={() => setView('super-admin')}
                  className={cn(
                    "text-xs font-bold transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ml-1",
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

            {/* Desktop Right: Mobile Shortcut Guide, Language, Notifications, Unified Profile */}
            <div className="hidden md:flex items-center gap-3">
              {/* Mobil Snarvei (PWA) Button */}
              <button 
                onClick={() => setShowInstallGuide(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-emerald-50 text-neutral-700 hover:text-emerald-800 rounded-xl text-xs font-bold transition-all border border-neutral-200/80 hover:border-emerald-300 shadow-sm active:scale-95"
                title="Slik legger du til KS Mester som snarvei/app på din iPhone eller Android med full offline-støtte"
              >
                <Smartphone size={14} className="text-emerald-600" />
                <span>Mobil-snarvei</span>
              </button>

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
                <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
                  <NotificationBell />

                  <div className="flex items-center gap-2 pl-1">
                    <button 
                      onClick={() => setView('settings')}
                      className={cn(
                        "flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border transition-all text-left",
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
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title={t('logout', 'Logg ut')}
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setView('dashboard')}
                  className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all shadow-sm active:scale-95"
                >
                  {t('login', 'Logg inn')}
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <NetworkStatusBadge />
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100"
              >
                {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 left-0 right-0 bg-white border-b border-neutral-200 p-4 md:hidden shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto"
            >
              <div className="flex flex-col gap-2">
                {user ? (
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 mb-2">
                    <div className="flex items-center gap-3 shrink-0 min-w-0">
                      <button 
                        onClick={() => { setView('settings'); setIsMenuOpen(false); }}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 aspect-square",
                          view === 'settings' ? "bg-emerald-50 text-emerald-600" : "bg-neutral-100 text-neutral-400"
                        )}
                      >
                        <Settings size={20} />
                      </button>
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || 'User'} 
                          className="w-10 h-10 rounded-full border border-neutral-200 object-cover shrink-0 aspect-square"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-500 shrink-0 aspect-square">
                          <UserIcon size={20} />
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-sm font-bold leading-none mb-1">{user.displayName}</p>
                        <p className="text-[10px] text-neutral-500 leading-none">{user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={logout}
                      className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-3 border-b border-neutral-100 mb-2">
                    <button 
                      onClick={() => { setView('dashboard'); setIsMenuOpen(false); }}
                      className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-bold active:scale-95 transition-all"
                    >
                      {t('login', 'Logg inn')}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 px-4 py-2 border-b border-neutral-100 mb-2">
                  <button 
                    onClick={() => { setView('landing'); setIsMenuOpen(false); }} 
                    className={cn("text-left px-3 py-2 rounded-lg text-sm font-medium", view === 'landing' ? "bg-emerald-50 text-emerald-600" : "text-neutral-600")}
                  >
                    {t('welcome')}
                  </button>
                  <button 
                    onClick={() => { handleGoToDashboard(); setIsMenuOpen(false); }} 
                    className={cn("text-left px-3 py-2 rounded-lg text-sm font-medium", view === 'dashboard' ? "bg-emerald-50 text-emerald-600" : "text-neutral-600")}
                  >
                    {t('dashboard')}
                  </button>
                  <button 
                    onClick={() => { setView('mobile'); setIsMenuOpen(false); }} 
                    className={cn("text-left px-3 py-2 rounded-lg text-sm font-medium", view === 'mobile' ? "bg-emerald-50 text-emerald-600" : "text-neutral-600")}
                  >
                    {t('mobile_app')}
                  </button>
                  <button 
                    onClick={() => { setView('spec'); setIsMenuOpen(false); }} 
                    className={cn("text-left px-3 py-2 rounded-lg text-sm font-medium", view === 'spec' ? "bg-emerald-50 text-emerald-600" : "text-neutral-600")}
                  >
                    {t('specification', 'Spesifikasjon')}
                  </button>

                  <button 
                    onClick={() => { setShowInstallGuide(true); setIsMenuOpen(false); }} 
                    className="col-span-2 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition-all mt-1"
                  >
                    <Smartphone size={15} className="text-emerald-600" />
                    <span>📱 Slik legger du til som snarvei på mobilen</span>
                  </button>
                </div>

                <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100">
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
                  <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                    Eksport: Norsk
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
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
              />
            )}
            {view === 'dashboard' && (
              <Dashboard 
                isDemo={isDemo} 
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

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2.5rem]"
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

      {/* GDPR Cookie Banner */}
      <CookieBanner onOpenPrivacyPolicy={() => setView('privacy')} />
      <Toaster position="top-right" richColors />
    </div>
  );
}
