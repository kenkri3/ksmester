import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'team' | 'modules' | 'notifications' | 'billing' | 'system'>('profile');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  
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
        role: 'admin', // Default role for now
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

  const tabs = [
    { id: 'profile', label: t('profile', 'Profil'), icon: <User size={18} /> },
    { id: 'company', label: t('company', 'Bedrift'), icon: <Building2 size={18} /> },
    { id: 'team', label: t('team', 'Team'), icon: <Users size={18} /> },
    { id: 'modules', label: t('modules', 'Moduler'), icon: <Package size={18} /> },
    { id: 'notifications', label: t('notifications', 'Varslinger'), icon: <Bell size={18} /> },
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
                        src={user?.photoURL || `https://picsum.photos/seed/${user?.uid}/100/100`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <button className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-500 transition-colors">
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">{t('language', 'Språk')}</label>
                    <select 
                      value={profile.language}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        updateProfile('language', newLang);
                        i18n.changeLanguage(newLang);
                      }}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="no">Norsk</option>
                      <option value="en">English</option>
                      <option value="pl">Polski</option>
                      <option value="lt">Lietuvių</option>
                    </select>
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
                    {['Boligmappa', 'Tripletex', 'PowerOffice Go'].map((service) => (
                      <div key={service} className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-200">
                        <span className="text-sm font-bold">{service}</span>
                        <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
                          {t('connect', 'Koble til')}
                        </button>
                      </div>
                    ))}
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
                    { id: 'contracts', label: 'Kontrakter & Signering', icon: <FileSignature size={18} />, desc: 'Digital signering med BankID.' },
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
                      <button className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all">
                        {subscriptionStatus === 'trial' ? t('upgrade_now', 'Oppgrader nå') : t('manage_billing', 'Administrer betaling')}
                      </button>
                      {subscriptionStatus !== 'trial' && (
                        <button className="px-6 py-2 bg-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-all">
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
                    { label: t('storage', 'Lagring'), value: `${profile.billing.usage.storage} / ${profile.billing.usage.maxStorage}`, color: 'bg-purple-500', percent: 40 }, // Placeholder percent for storage
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
                  <p className="text-xs text-emerald-700 mb-6">Status for produksjonsklarhet for KS MesterAI Elite.</p>
                  
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
                  <h4 className="font-bold mb-4">Produksjonsmiljø</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-[10px] text-neutral-400 uppercase font-black mb-1">Region</div>
                      <div className="text-sm font-bold">europe-west2 (London)</div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-[10px] text-neutral-400 uppercase font-black mb-1">Database</div>
                      <div className="text-sm font-bold">PostgreSQL (Relasjonell Cloud DB)</div>
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
      <InviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
      />
    </div>
  );
}
