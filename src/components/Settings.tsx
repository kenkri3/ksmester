import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { 
  User, 
  Building2, 
  Bell, 
  UserPlus,
  Trash2,
  Mail,
  Shield,
  CreditCard, 
  Globe, 
  LogOut,
  Save,
  CheckCircle2,
  ChevronRight,
  Camera,
  Loader2,
  Package,
  Calculator,
  FileSignature,
  GraduationCap,
  Car,
  Brain,
  Users,
  ShieldCheck,
  Download,
  FileText,
  Lock,
  AlertCircle,
  AlertTriangle,
  Cookie
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { getStandardLang } from '../i18n';
import { cn } from '@/src/lib/utils';
import { db, doc, getDoc, setDoc, handleFirestoreError, OperationType, collection, query, where, getDocs, deleteDoc } from '../services/firebase';
import InviteModal from './InviteModal';
import { UserProfile as TeamMember } from '../types';

interface SettingsProfile {
  displayName: string;
  phone: string;
  language: string;
  companyName: string;
  orgNumber: string;
  address: string;
  industry: string;
  modules: string[];
  companyLogo?: string;
  photoURL?: string;
  companyId?: string;
  notifications: {
    deviations: boolean;
    sja: boolean;
    reports: boolean;
    hmsCardExpiry: boolean;
  };
  billing: {
    plan: string;
    nextBilling: string;
    usage: {
      users: number;
      maxUsers: number;
      projects: number;
      maxProjects: number;
      storage: string;
      maxStorage: string;
    };
  };
}

export default function Settings() {
  const { user, logout, subscriptionStatus, trialDaysLeft } = useAuth();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'team' | 'modules' | 'notifications' | 'billing' | 'system' | 'privacy'>('profile');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRequestingDelete, setIsRequestingDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [activeIntegrationModal, setActiveIntegrationModal] = useState<string | null>(null);
  const [integrationSecret, setIntegrationSecret] = useState('');
  const [connectedServices, setConnectedServices] = useState<Record<string, boolean>>({});
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  
  const [aiQuota, setAiQuota] = useState<{
    usedTokens: number;
    limitTokens: number;
    baseTokens: number;
    topupTokens: number;
    topupImages: number;
    remainingTokens: number;
    percentUsed: number;
    plan: string;
    needsTopUp: boolean;
    isWarning: boolean;
    planMonthlyPrice: number;
  } | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);

  const [profile, setProfile] = useState<SettingsProfile>({
    displayName: '',
    phone: '',
    language: i18n.language,
    companyName: '',
    orgNumber: '',
    address: '',
    industry: 'general',
    modules: [],
    companyLogo: '',
    notifications: {
      deviations: true,
      sja: true,
      reports: true,
      hmsCardExpiry: true
    },
    billing: {
      plan: 'Pro Enterprise',
      nextBilling: '2026-04-01',
      usage: {
        users: 12,
        maxUsers: 20,
        projects: 8,
        maxProjects: 100,
        storage: '4.2 GB',
        maxStorage: '50 GB'
      }
    }
  });

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as SettingsProfile;
          setProfile(prev => ({ 
            ...prev, 
            ...data,
            billing: data.billing || prev.billing // Keep defaults if missing
          }));
          if (data.language && data.language !== i18n.language) {
            i18n.changeLanguage(data.language);
          }
        } else {
          // Initialize with user data if no profile exists
          setProfile(prev => ({
            ...prev,
            displayName: user.displayName || '',
            language: i18n.language
          }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  useEffect(() => {
    async function fetchTeam() {
      if (!user || activeTab !== 'team' || !profile.companyId) return;
      setLoadingTeam(true);
      try {
        const q = query(collection(db, 'users'), where('companyId', '==', profile.companyId));
        const querySnapshot = await getDocs(q);
        const members = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
        setTeamMembers(members);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users');
      } finally {
        setLoadingTeam(false);
      }
    }
    fetchTeam();
  }, [user, activeTab, profile.companyId]);

  const fetchAiQuota = async () => {
    try {
      setLoadingQuota(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/company/quota', {
        headers: token ? { 'Authorization': 'Bearer ' + token } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.quota) {
          setAiQuota(data.quota);
        }
      }
    } catch (err) {
      console.warn('Kunne ikke hente AI-kvote:', err);
    } finally {
      setLoadingQuota(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAiQuota();
    }
  }, [user, activeTab]);

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm(t('confirm_delete_member', 'Er du sikker på at du vil fjerne dette medlemmet?'))) return;
    try {
      await deleteDoc(doc(db, 'users', memberId));
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${memberId}`);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        email: user.email,
        role: user.role || 'worker',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfile = (field: keyof SettingsProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const updateNotifications = (field: keyof SettingsProfile['notifications'], value: boolean) => {
    setProfile(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [field]: value }
    }));
  };

  const toggleModule = (moduleId: string) => {
    setProfile(prev => {
      const modules = prev.modules || [];
      if (modules.includes(moduleId)) {
        return { ...prev, modules: modules.filter(m => m !== moduleId) };
      } else {
        return { ...prev, modules: [...modules, moduleId] };
      }
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateProfile('companyLogo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportGdprData = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/gdpr/export', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error('Kunne ikke laste ned data');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KS_Mester_GDPR_Export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(err.message || 'Feil ved eksport av data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRequestGdprDelete = async () => {
    setIsRequestingDelete(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/gdpr/delete-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason: deleteReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Feil ved innsending');
      setDeleteStatus(data.message || 'Sletteforespørsel registrert.');
    } catch (err: any) {
      alert(err.message || 'Kunne ikke registrere forespørsel.');
    } finally {
      setIsRequestingDelete(false);
    }
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      updateProfile('photoURL', dataUrl);
      toast.success('Profilbilde valgt. Husk å klikke "Lagre endringer"!');
    };
    reader.readAsDataURL(file);
  };

  const tabs = [
    { id: 'profile', label: t('profile', 'Profil'), icon: <User size={18} /> },
    { id: 'company', label: t('company', 'Bedrift'), icon: <Building2 size={18} /> },
    { id: 'team', label: t('team', 'Team'), icon: <Users size={18} /> },
    { id: 'modules', label: t('modules', 'Moduler'), icon: <Package size={18} /> },
    { id: 'notifications', label: t('notifications', 'Varslinger'), icon: <Bell size={18} /> },
    { id: 'privacy', label: 'Personvern & GDPR', icon: <ShieldCheck size={18} /> },
    { id: 'billing', label: t('billing', 'Abonnement'), icon: <CreditCard size={18} /> },
    { id: 'system', label: t('system_status', 'Systemstatus'), icon: <Shield size={18} /> },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          <h1 className="text-2xl font-bold mb-6 px-4">{t('settings', 'Innstillinger')}</h1>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
                  : "text-neutral-500 hover:bg-neutral-100"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <div className="pt-8 mt-8 border-t border-neutral-100">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={18} />
              {t('logout', 'Logg ut')}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-8">
            {activeTab === 'team' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{t('team_management', 'Teamadministrasjon')}</h3>
                    <p className="text-xs text-neutral-500">{t('team_desc', 'Administrer ansatte og deres tilgangsnivåer.')}</p>
                  </div>
                  <button 
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
                  >
                    <UserPlus size={16} />
                    {t('invite_member', 'Inviter medlem')}
                  </button>
                </div>

                <div className="overflow-hidden border border-neutral-100 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-100">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">{t('member', 'Medlem')}</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">{t('role', 'Rolle')}</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">{t('status', 'Status')}</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {loadingTeam ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center">
                            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : teamMembers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-neutral-500 text-sm">
                            {t('no_members', 'Ingen teammedlemmer funnet.')}
                          </td>
                        </tr>
                      ) : (
                        teamMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-neutral-100 overflow-hidden">
                                  <img 
                                    src={member.imageUrl || `https://picsum.photos/seed/${member.id}/40/40`} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{member.name}</div>
                                  <div className="text-[10px] text-neutral-500">{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded",
                                member.role === 'admin' ? "bg-purple-50 text-purple-700" :
                                member.role === 'manager' ? "bg-blue-50 text-blue-700" :
                                "bg-neutral-100 text-neutral-600"
                              )}>
                                {member.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Aktiv</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleDeleteMember(member.id)}
                                className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-neutral-100 border-4 border-white shadow-md overflow-hidden">
                      <img 
                        src={profile.photoURL || user?.photoURL || `https://picsum.photos/seed/${user?.uid}/100/100`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <input 
                      type="file" 
                      ref={profilePhotoInputRef} 
                      onChange={handleProfilePhotoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button 
                      type="button"
                      onClick={() => profilePhotoInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-500 transition-colors cursor-pointer"
                      title="Last opp profilbilde"
                    >
                      <Camera size={14} />
                    </button>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{profile.displayName || user?.displayName || 'Bruker'}</h2>
                    <p className="text-neutral-500 text-sm">{user?.email}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded">
                      {t('admin', 'Administrator')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">{t('full_name', 'Fullt navn')}</label>
                    <input 
                      type="text" 
                      value={profile.displayName}
                      onChange={(e) => updateProfile('displayName', e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">{t('email', 'E-post')}</label>
                    <input 
                      type="email" 
                      defaultValue={user?.email || ''}
                      disabled
                      className="w-full px-4 py-3 bg-neutral-100 border border-neutral-100 rounded-xl text-sm text-neutral-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">{t('phone', 'Telefon')}</label>
                    <input 
                      type="tel" 
                      value={profile.phone}
                      onChange={(e) => updateProfile('phone', e.target.value)}
                      placeholder="+47 000 00 000"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">{t('language', 'Språk for brukergrensesnitt')}</label>
                    <select 
                      value={getStandardLang(profile.language || i18n.language)}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        updateProfile('language', newLang);
                        i18n.changeLanguage(newLang);
                        localStorage.setItem('i18nextLng', newLang);
                      }}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="no">Norsk (NO)</option>
                      <option value="en">English (EN)</option>
                      <option value="pl">Polski (PL)</option>
                      <option value="lt">Lietuvių (LT)</option>
                    </select>
                    <p className="text-[11px] text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-100/80">
                      💡 <strong>Norsk Dokumentasjonsgaranti:</strong> Du ser appen på ditt valgte språk, mens all utgående dokumentasjon (SJA, avvik, tilbud, kontrakt, FDV) automatisk genereres på profesjonelt norsk (Bokmål).
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'company' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-400 overflow-hidden">
                    {profile.companyLogo ? (
                      <img src={profile.companyLogo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 size={32} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold">{t('company_logo', 'Bedriftslogo')}</h3>
                    <p className="text-xs text-neutral-500">{t('logo_desc', 'Last opp din bedriftslogo for bruk i rapporter.')}</p>
                  </div>
                  <label className="ml-auto px-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-bold hover:bg-neutral-50 transition-colors cursor-pointer">
                    {t('upload', 'Last opp')}
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">{t('company_name', 'Bedriftsnavn')}</label>
                    <input 
                      type="text" 
                      value={profile.companyName}
                      onChange={(e) => updateProfile('companyName', e.target.value)}
                      placeholder="Firma AS"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">{t('org_number', 'Organisasjonsnummer')}</label>
                    <input 
                      type="text" 
                      value={profile.orgNumber}
                      onChange={(e) => updateProfile('orgNumber', e.target.value)}
                      placeholder="999 999 999"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">{t('address', 'Adresse')}</label>
                    <input 
                      type="text" 
                      value={profile.address}
                      onChange={(e) => updateProfile('address', e.target.value)}
                      placeholder="Storgata 1, 0123 Oslo"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">{t('industry', 'Bransje')}</label>
                    <select 
                      value={profile.industry}
                      onChange={(e) => updateProfile('industry', e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="general">{t('general_contractor', 'Generalentreprenør / Full pakke')}</option>
                      <option value="carpenter">{t('carpenter', 'Tømrer / Snekker')}</option>
                      <option value="plumber">{t('plumber', 'Rørlegger')}</option>
                      <option value="electrician">{t('electrician', 'Elektriker')}</option>
                      <option value="mason">{t('mason', 'Murer')}</option>
                      <option value="painter">{t('painter', 'Maler')}</option>
                    </select>
                    <p className="text-[10px] text-neutral-500 mt-1">
                      {t('industry_hint', 'Systemet tilpasses automatisk din valgte bransje.')}
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield size={20} className="text-blue-600" />
                    <h4 className="font-bold text-blue-900">{t('integrations', 'Integrasjoner')}</h4>
                  </div>
                  <p className="text-xs text-blue-700 mb-4">{t('integrations_desc', 'Koble til dine fagsystemer for automatisk dokumentoverføring.')}</p>
                  <div className="space-y-3">
                    {['Boligmappa', 'Tripletex', 'PowerOffice Go'].map((service) => {
                      const isConnected = !!connectedServices[service];
                      return (
                        <div key={service} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-blue-200">
                          <div>
                            <span className="text-sm font-bold block text-slate-900">{service}</span>
                            <span className="text-[11px] text-slate-500">
                              {service === 'Boligmappa' ? 'Automatisk FDV- og samsvarserklæring' : 'Sanntidssynk av timer, tillegg og fakturagrunnlag'}
                            </span>
                          </div>
                          {isConnected ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={13} /> Tilkoblet
                            </span>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => {
                                setIntegrationSecret('');
                                setActiveIntegrationModal(service);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                            >
                              {t('connect', 'Koble til')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'modules' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold">{t('available_modules', 'Tilgjengelige Moduler')}</h3>
                    <p className="text-xs text-neutral-500">{t('modules_desc', 'Velg modulene som passer din bedrift. Du betaler kun for det du bruker.')}</p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded">
                    {profile.industry === 'general' ? 'Full pakke inkludert' : 'Bransjetilpasset'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'offers', label: 'Tilbud & Kalkulasjon', icon: <Calculator size={18} />, desc: 'Opprett profesjonelle tilbud raskt.' },
                    { id: 'contracts', label: 'Kontrakter & Signering', icon: <FileSignature size={18} />, desc: 'Digital signering og e-signaturbekreftelse.' },
                    { id: 'building_app', label: 'Byggesøknad', icon: <Building2 size={18} />, desc: 'Forenklet innsending til kommunen.' },
                    { id: 'apprentice', label: 'Lærlingmodul', icon: <GraduationCap size={18} />, desc: 'Oppfølging av lærlinger og mål.' },
                    { id: 'inventory', label: 'Lager & Verktøy', icon: <Package size={18} />, desc: 'Full kontroll på utstyr og materiell.' },
                    { id: 'vehicle', label: 'Kjørebok', icon: <Car size={18} />, desc: 'Automatisk logging av turer.' },
                    { id: 'ai_analysis', label: 'AI Analyse (Premium)', icon: <Brain size={18} />, desc: 'Avansert bildeanalyse og HMS-kontroll.' },
                  ].map((mod) => {
                    const isIncluded = profile.industry === 'general' || (profile.modules && profile.modules.includes(mod.id));
                    const isDisabled = profile.industry === 'general';

                    return (
                      <div 
                        key={mod.id}
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex items-start gap-4",
                          isIncluded ? "bg-emerald-50 border-emerald-200" : "bg-white border-neutral-100 hover:border-neutral-200"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          isIncluded ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-400"
                        )}>
                          {mod.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold">{mod.label}</span>
                            <button
                              disabled={isDisabled}
                              onClick={() => toggleModule(mod.id)}
                              className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors",
                                isIncluded 
                                  ? (isDisabled ? "text-emerald-600 cursor-default" : "text-red-600 hover:bg-red-50") 
                                  : "text-emerald-600 hover:bg-emerald-100"
                              )}
                            >
                              {isIncluded ? (isDisabled ? 'Inkludert' : 'Fjern') : 'Bestill'}
                            </button>
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-1">{mod.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h3 className="font-bold mb-4">{t('notification_settings', 'Varslingsinnstillinger')}</h3>
                <div className="space-y-4">
                  {[
                    { id: 'deviations', label: t('new_deviations', 'Nye avvik'), desc: t('deviations_notify', 'Få varsel når et nytt avvik blir logget.') },
                    { id: 'sja', label: t('sja_approvals', 'SJA-godkjenninger'), desc: t('sja_notify', 'Få varsel når en SJA-rapport venter på godkjenning.') },
                    { id: 'reports', label: t('weekly_reports', 'Ukentlige rapporter'), desc: t('reports_notify', 'Motta en oppsummering av alle prosjekter hver mandag.') },
                    { id: 'hmsCardExpiry', label: t('hms_card_expiry', 'HMS-kort utløp'), desc: t('hms_card_expiry_notify', 'Få varsel når et HMS-kort er i ferd med å utløpe eller har utløpt.') },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 hover:bg-neutral-50 rounded-2xl transition-colors">
                      <div className="flex-1 mr-4">
                        <div className="text-sm font-bold">{item.label}</div>
                        <p className="text-xs text-neutral-500">{item.desc}</p>
                      </div>
                      <button 
                        onClick={() => updateNotifications(item.id as any, !profile.notifications[item.id as keyof SettingsProfile['notifications']])}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          profile.notifications[item.id as keyof SettingsProfile['notifications']] ? "bg-emerald-600" : "bg-neutral-200"
                        )}
                      >
                        <span className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition",
                          profile.notifications[item.id as keyof SettingsProfile['notifications']] ? "translate-x-6" : "translate-x-1"
                        )} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className={cn(
                  "p-8 text-white rounded-3xl relative overflow-hidden",
                  subscriptionStatus === 'trial' ? "bg-emerald-900" : "bg-neutral-900"
                )}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  <div className="relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">
                      {subscriptionStatus === 'trial' ? t('trial_period', 'Prøveperiode') : t('current_plan', 'Gjeldende plan')}
                    </div>
                    <h3 className="text-3xl font-bold mb-2">
                      {subscriptionStatus === 'trial' ? t('free_trial', 'Gratis prøveperiode') : profile.billing.plan}
                    </h3>
                    <p className="text-neutral-400 text-sm mb-6">
                      {subscriptionStatus === 'trial' 
                        ? `${trialDaysLeft} ${t('days_left', 'dager igjen')}` 
                        : `${t('billing_cycle', 'Neste fakturering')}: ${new Date(profile.billing.nextBilling).toLocaleDateString()}`
                      }
                    </p>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          toast.info('For oppgradering til Pro/Enterprise eller endring av abonnement, kontakt hei@vikingmester.no.');
                        }}
                        className="px-6 py-2 bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white rounded-xl text-sm font-bold shadow-purple-cta transition-all cursor-pointer"
                      >
                        {subscriptionStatus === 'trial' ? t('upgrade_now', 'Oppgrader nå') : t('manage_billing', 'Administrer betaling')}
                      </button>
                      {subscriptionStatus !== 'trial' && (
                        <button 
                          onClick={() => {
                            toast.info('Fakturaer sendes per EHF eller e-post til bedriftens registrerte fakturaadresse.');
                          }}
                          className="px-6 py-2 bg-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-all cursor-pointer"
                        >
                          {t('view_invoices', 'Se fakturaer')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: t('users', 'Brukere'), value: `${profile.billing.usage.users} / ${profile.billing.usage.maxUsers}`, color: 'bg-blue-500', percent: (profile.billing.usage.users / profile.billing.usage.maxUsers) * 100 },
                    { label: t('projects', 'Prosjekter'), value: `${profile.billing.usage.projects} / ${profile.billing.usage.maxProjects}`, color: 'bg-emerald-500', percent: (profile.billing.usage.projects / profile.billing.usage.maxProjects) * 100 },
                    { label: t('storage', 'Lagring'), value: `${profile.billing.usage.storage} / ${profile.billing.usage.maxStorage}`, color: 'bg-purple-500', percent: 40 },
                  ].map((stat) => (
                    <div key={stat.label} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{stat.label}</div>
                      <div className="text-lg font-bold">{stat.value}</div>
                      <div className="mt-2 h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
                        <div className={cn("h-full", stat.color)} style={{ width: `${stat.percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 🛡️ AI Kvote & Marginvern (Fair Use & Top-up) */}
                <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Brain size={18} className="text-electric-400" />
                        <h4 className="text-base font-bold">MesterAI Kvote & Tokenbalanse</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border",
                          aiQuota?.needsTopUp 
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/30" 
                            : aiQuota?.isWarning 
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        )}>
                          {aiQuota?.needsTopUp ? 'Kvote nådd' : aiQuota?.isWarning ? '80% brukt' : 'Aktiv kvote (Marginvern)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Inkludert månedlig forbruk for stemmestyrt byggedagbok, TEK17 bildekontroll og tale-til-endringsordre (NS 8406) på pakken <strong className="text-slate-200">{aiQuota?.plan === 'team' ? 'VikingMester Team' : aiQuota?.plan === 'entreprenor' ? 'Totalentreprenør' : 'VikingMester Solo'}</strong>.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-xl font-black",
                        aiQuota?.needsTopUp ? "text-rose-400" : aiQuota?.isWarning ? "text-amber-400" : "text-electric-400"
                      )}>
                        {aiQuota ? `${aiQuota.percentUsed}% brukt` : '0% brukt'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {aiQuota 
                          ? `${(aiQuota.usedTokens / 1_000_000).toFixed(2)}M / ${(aiQuota.limitTokens / 1_000_000).toFixed(1)}M tokens` 
                          : '0.0M / 2.5M tokens'}
                        {aiQuota?.topupTokens ? ` (+${(aiQuota.topupTokens / 1_000_000).toFixed(0)}M top-up)` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden mb-6">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        aiQuota?.needsTopUp 
                          ? "bg-rose-500" 
                          : aiQuota?.isWarning 
                          ? "bg-gradient-to-r from-electric-500 to-amber-400" 
                          : "bg-gradient-to-r from-electric-500 to-emerald-400"
                      )} 
                      style={{ width: `${Math.max(2, Math.min(100, aiQuota?.percentUsed || 0))}%` }} 
                    />
                  </div>

                  {aiQuota?.needsTopUp && (
                    <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                      <span>Månedens inkluderte kvote er brukt opp. For å fortsette med MesterAI uten avbrudd, bestill en top-up nedenfor.</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-400">
                      Behov for ekstra kapasitet til store prosjekter? Kjøp en Mester Top-up pakke. Beløpet føres direkte på neste EHF-faktura.
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                            const res = await fetch('/api/settings/topup', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { 'Authorization': 'Bearer ' + token } : {})
                              },
                              body: JSON.stringify({ packageType: 'small' })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              toast.success(data.message || 'Liten Mester-pakke (+5M tokens / +200 bilder) aktivert for din bedrift! kr 490,- legges til på neste EHF.');
                              await fetchAiQuota();
                            } else {
                              toast.error(data.error || 'Kunne ikke bestille top-up');
                            }
                          } catch (e: any) {
                            toast.error('Feil ved bestilling: ' + e.message);
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                      >
                        +5M Tokens (kr 490,-)
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                            const res = await fetch('/api/settings/topup', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { 'Authorization': 'Bearer ' + token } : {})
                              },
                              body: JSON.stringify({ packageType: 'large' })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              toast.success(data.message || 'Stor Mester-pakke (+20M tokens / +1000 bilder) aktivert for din bedrift! kr 1 490,- legges til på neste EHF.');
                              await fetchAiQuota();
                            } else {
                              toast.error(data.error || 'Kunne ikke bestille top-up');
                            }
                          } catch (e: any) {
                            toast.error('Feil ved bestilling: ' + e.message);
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white text-xs font-bold shadow-purple-cta transition-all whitespace-nowrap cursor-pointer"
                      >
                        +20M Tokens (kr 1 490,-)
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'privacy' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Header Banner */}
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-950 text-base mb-1">Personvern, Sikkerhet & GDPR</h3>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      VikingMester oppfyller EUs personvernforordning (GDPR), Personopplysningsloven, Byggherreforskriften og gjeldende norske HMS- og regnskapskrav. Dine data lagres strengt isolert og deles aldri med uvedkommende.
                    </p>
                  </div>
                </div>

                {/* Section 1: Data Export */}
                <div className="p-6 bg-white rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-neutral-900 flex items-center gap-2">
                        <Download size={18} className="text-emerald-600" />
                        Innsyn og Dataportabilitet (GDPR Art. 15 & 20)
                      </h4>
                      <p className="text-xs text-neutral-500 mt-1">
                        Last ned en komplett, maskinlesbar kopi (JSON) av alle dine personopplysninger, tidsregistreringer og prosjektlogger.
                      </p>
                    </div>
                    <button
                      onClick={handleExportGdprData}
                      disabled={isExporting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-md shadow-emerald-100 disabled:opacity-50"
                    >
                      {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      {isExporting ? 'Eksporterer...' : 'Last ned mine data'}
                    </button>
                  </div>
                </div>

                {/* Section 2: Security & Statutory Compliance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
                    <div className="flex items-center gap-2 font-bold text-neutral-900 text-sm mb-2">
                      <Lock size={16} className="text-emerald-600" />
                      Streng Multi-Tenant Dataseparasjon
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Alle prosjekter, tilbud, avvik og timelister er kryptert og isolert per bedrifts-ID. Ingen andre entreprenører eller tredjeparter har innsyn i bedriftens data.
                    </p>
                  </div>

                  <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
                    <div className="flex items-center gap-2 font-bold text-neutral-900 text-sm mb-2">
                      <FileText size={16} className="text-emerald-600" />
                      Byggherreforskriften & HMS (§ 15)
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Elektroniske mannskapslister og HMS-kortnumre oppbevares og arkiveres i 6 måneder iht. lovkrav fra Arbeidstilsynet, før automatisk sletting.
                    </p>
                  </div>
                </div>

                {/* Section 3: Right to Erasure */}
                <div className="p-6 bg-red-50/50 rounded-2xl border border-red-100 space-y-4">
                  <div>
                    <h4 className="font-bold text-red-950 text-sm flex items-center gap-2">
                      <Trash2 size={16} className="text-red-600" />
                      Retten til sletting / «Å bli glemt» (GDPR Art. 17)
                    </h4>
                    <p className="text-xs text-red-900/80 mt-1 leading-relaxed">
                      Du kan be om fullstendig sletting eller anonymisering av dine personopplysninger. Vær oppmerksom på at lovpålagt prosjektdokumentasjon og regnskapsbilag må oppbevares iht. Bokføringsloven (§ 13, 5 år) og Plan- og bygningsloven.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Oppgi eventuell årsak eller merknad for sletteforespørselen (valgfritt)..."
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-400"
                    />
                    
                    <div className="flex items-center justify-between">
                      {deleteStatus ? (
                        <p className="text-xs font-bold text-emerald-700">{deleteStatus}</p>
                      ) : (
                        <p className="text-[11px] text-neutral-400">Forespørselen loggføres og bekreftes på e-post.</p>
                      )}
                      <button
                        onClick={handleRequestGdprDelete}
                        disabled={isRequestingDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all disabled:opacity-50"
                      >
                        {isRequestingDelete ? 'Sender...' : 'Send sletteforespørsel'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 4: Informasjonskapsler og samtykke */}
                <div className="p-6 bg-white rounded-2xl border border-neutral-200/90 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                        <Cookie size={16} className="text-emerald-600" />
                        Informasjonskapsler og samtykke (GDPR & Ekomloven)
                      </h4>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Administrer hvilke informasjonskapsler og analyseverktøy som benyttes i din nettleser. Du kan når som helst endre eller trekke tilbake samtykket ditt.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('open_cookie_settings'))}
                      className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
                    >
                      <Cookie size={14} className="text-emerald-600" />
                      <span>Endre cookie-innstillinger</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'system' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <h3 className="font-bold text-emerald-900 mb-2">Lanseringssjekkliste</h3>
                  <p className="text-xs text-emerald-700 mb-6">Status for produksjonsklarhet for VikingMester Elite.</p>
                  
                  <div className="space-y-3">
                    {[
                      { label: 'AI Mesterhjerne (Core)', status: 'ready', desc: 'Sentralisert AI-tjeneste for tekst og oversettelse.' },
                      { label: 'Kart & Matrikkel (GNR/BNR)', status: 'ready', desc: 'Automatisk adresseoppslag via Geonorge API.' },
                      { label: 'HMS/KS Moduler', status: 'ready', desc: 'SJA, Avvik og HMS-kontroll med AI-støtte.' },
                      { label: 'Flerspråklig støtte', status: 'ready', desc: 'Norsk, Engelsk, Polsk og Litauisk integrert.' },
                      { label: 'Sikkerhet & Tilgang', status: 'ready', desc: 'PostgreSQL Row-Level Security, JWT Auth og RBAC implementert.' },
                      { label: 'PWA & Mobil', status: 'ready', desc: 'Offline-støtte og mobiloptimalisert grensesnitt.' },
                      { label: 'GDPR & Personvern', status: 'ready', desc: 'Ekomloven & GDPR samtykke-håndtering med cookie-kontroll.' },
                      { label: 'PDF Rapportering', status: 'pending', desc: 'Eksport av HMS/KS dokumentasjon til PDF.' },
                      { label: 'Integrasjoner (Boligmappa)', status: 'pending', desc: 'Direkte overføring til Boligmappa.' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-xl border border-emerald-100">
                        <div>
                          <div className="text-sm font-bold flex items-center gap-2">
                            {item.label}
                            {item.status === 'ready' ? (
                              <CheckCircle2 size={14} className="text-emerald-600" />
                            ) : (
                              <Loader2 size={14} className="text-amber-500 animate-spin" />
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500">{item.desc}</p>
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded",
                          item.status === 'ready' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {item.status === 'ready' ? 'Klar' : 'Under arbeid'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-neutral-900 text-white rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      Produksjonsmiljø
                    </h4>
                    <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Railway Cloud
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-[10px] text-neutral-400 uppercase font-black mb-1">Plattform</div>
                      <div className="text-sm font-bold text-white">Railway (PaaS)</div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-[10px] text-neutral-400 uppercase font-black mb-1">Region</div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>🇳🇱</span>
                        <span>EU West (Amsterdam, Nederland)</span>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-[10px] text-neutral-400 uppercase font-black mb-1">Database</div>
                      <div className="text-sm font-bold text-white">PostgreSQL (Railway Managed DB)</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex justify-between items-center">
            <p className="text-xs text-neutral-400 italic">
              {t('last_saved', 'Sist lagret')}: {new Date().toLocaleTimeString()}
            </p>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : (isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />)}
              {isSaving ? t('saving', 'Lagrer...') : (isSaved ? t('saved', 'Lagret!') : t('save_changes', 'Lagre endringer'))}
            </button>
          </div>
        </div>
      </div>
      {/* Integration Setup Modal */}
      {activeIntegrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield size={20} className="text-electric-500" />
                <h3 className="text-lg font-bold text-slate-900">Koble til {activeIntegrationModal}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveIntegrationModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {activeIntegrationModal === 'Tripletex' && 'Lim inn din API-ansatt- eller sesjonstoken fra Tripletex. VikingMester synkroniserer automatisk godkjente tilleggsordrer og timelister direkte inn i prosjektet.'}
              {activeIntegrationModal === 'Boligmappa' && 'Lim inn bedriftens API-nøkkel fra Boligmappa. Samsvarserklæringer, TEK17-bilder og ferdigattester lastes automatisk opp til eiendommens gårds- og bruksnummer.'}
              {activeIntegrationModal === 'PowerOffice Go' && 'Lim inn Client Key eller Application Key fra PowerOffice Go for helautomatisk regnskapssynkronisering.'}
            </p>

            <div className="mb-4">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                API-nøkkel / Hemmelighet (Secret Token)
              </label>
              <input
                type="password"
                value={integrationSecret}
                onChange={(e) => setIntegrationSecret(e.target.value)}
                placeholder="f.eks. eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Nøkkelen krypteres og lagres trygt på din isolerte bedriftsprofil.
              </span>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveIntegrationModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={!integrationSecret.trim()}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/settings/integrations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        service: activeIntegrationModal,
                        secretToken: integrationSecret,
                        companyId: profile.companyId || 'comp-mester',
                        companyName: profile.companyName || 'Mesterbedrift'
                      })
                    });
                    if (res.ok) {
                      setConnectedServices(prev => ({ ...prev, [activeIntegrationModal!]: true }));
                      toast.success(`Integrasjon med ${activeIntegrationModal} er lagret og tilkoblet!`);
                      setActiveIntegrationModal(null);
                    } else {
                      toast.error('Kunne ikke lagre integrasjon');
                    }
                  } catch {
                    toast.error('Nettverksfeil ved lagring av integrasjon');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white text-xs font-bold shadow-purple-cta transition-all disabled:opacity-50 cursor-pointer"
              >
                Lagre og aktiver
              </button>
            </div>
          </div>
        </div>
      )}
      <InviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
      />
    </div>
  );
}
