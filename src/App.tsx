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
        "fixed left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200",
        (user && subscriptionStatus === 'trial') || impersonatedCompanyId ? "top-6" : "top-0"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div 
              className="flex items-center gap-1 sm:gap-2 cursor-pointer group shrink-0"
              onClick={() => setView('landing')}
            >
              <Logo size="md" className="text-neutral-900" />
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 mr-4 border-r border-neutral-200 pr-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100/80 hover:bg-neutral-100 rounded-lg border border-neutral-200/80 transition-all">
                  <Globe size={14} className="text-emerald-600 shrink-0" />
                  <select 
                    onChange={(e) => changeLanguage(e.target.value)}
                    value={getStandardLang(i18n.language)}
                    className="text-xs font-black bg-transparent border-none focus:ring-0 cursor-pointer uppercase text-neutral-800 pr-1"
                    title="Bytt klientspråk (Dokumentasjon eksporteres alltid på Norsk)"
                  >
                    <option value="no">NO - Norsk</option>
                    <option value="en">EN - English</option>
                    <option value="pl">PL - Polski</option>
                    <option value="lt">LT - Lietuvių</option>
                  </select>
                </div>
                <span className="hidden xl:inline-block text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60" title="Alt fagspråk i appen vises på ditt språk. All eksportert dokumentasjon garanteres på Norsk.">
                  Dokumentasjon: Norsk (NO)
                </span>
              </div>

              <button 
                onClick={() => setView('landing')}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-emerald-600",
                  view === 'landing' ? "text-emerald-600" : "text-neutral-600"
                )}
              >
                {t('welcome')}
              </button>
              <button 
                onClick={handleGoToDashboard}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-emerald-600",
                  view === 'dashboard' ? "text-emerald-600" : "text-neutral-600"
                )}
              >
                {t('dashboard')}
              </button>
              <button 
                onClick={() => setView('mobile')}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-emerald-600",
                  view === 'mobile' ? "text-emerald-600" : "text-neutral-600"
                )}
              >
                {t('mobile_app')}
              </button>

              <button 
                onClick={() => setShowInstallGuide(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all active:scale-95"
              >
                <Download size={14} />
                {t('download_app', 'Last ned app')}
              </button>

              {user && (
                <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
                  <NotificationBell />
                  <button 
                    onClick={() => setView('settings')}
                    className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 overflow-hidden hover:ring-2 hover:ring-emerald-500/20 transition-all"
                  >
                    <img 
                      src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => setView('spec')}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-emerald-600",
                  view === 'spec' ? "text-emerald-600" : "text-neutral-600"
                )}
              >
                {t('specification')}
              </button>
              {user && (user.role === 'admin' || user.email === 'kenkri3@gmail.com') && (
                <button 
                  onClick={() => setView('super-admin')}
                  className={cn(
                    "text-xs font-bold transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg border",
                    view === 'super-admin' 
                      ? "bg-red-600 text-white border-red-600 shadow-sm" 
                      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  )}
                >
                  <Shield size={14} />
                  Admin Control
                </button>
              )}
              <div className="flex items-center gap-4 ml-4 border-l border-neutral-200 pl-4 shrink-0">
                {user ? (
                  <>
                    <button 
                      onClick={() => setView('settings')}
                      className={cn(
                        "p-2 rounded-full transition-colors shrink-0",
                        view === 'settings' ? "bg-emerald-50 text-emerald-600" : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                      )}
                      title={t('settings', 'Innstillinger')}
                    >
                      <Settings size={18} />
                    </button>
                    <div className="flex items-center gap-3 shrink-0 min-w-max">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || 'User'} 
                          className="w-8 h-8 rounded-full border border-neutral-200 object-cover shrink-0 aspect-square"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-500 shrink-0 aspect-square">
                          <UserIcon size={16} />
                        </div>
                      )}
                      <div className="hidden lg:block text-left">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold leading-none">{user.displayName}</p>
                          {(user.role === 'admin' || user.email === 'kenkri3@gmail.com') && (
                            <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500 leading-none mt-0.5">{user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={logout}
                      className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                      title={t('logout', 'Logg ut')}
                    >
                      <LogOut size={18} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setView('dashboard')}
                    className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-neutral-800 transition-all active:scale-95"
                  >
                    {t('login', 'Logg inn')}
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-neutral-600 hover:text-neutral-900"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
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
                    {t('specification')}
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
            className="w-full max-w-2xl"
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
