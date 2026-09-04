import { useState, useEffect, useRef } from 'react';
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
  Users,
  ShieldCheck,
  Download,
  FileText,
  Lock,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { getStandardLang } from '../i18n';
import { cn } from '@/src/lib/utils';
import { db, doc, getDoc, setDoc, handleFirestoreError, OperationType, collection, query, where, getDocs, deleteDoc } from '../services/firebase';
import { toast } from 'sonner';
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
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
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
        role: user.role || 'worker',
        photoURL: profilePhoto || user.photoURL || null,
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
        body: JSON.stringify({ reason: deleteReason })\n      });\n      const data = await res.json();\n      if (!res.ok) throw new Error(data.error || 'Feil ved innsending');\n      setDeleteStatus(data.message || 'Sletteforespørsel registrert.');\n    } catch (err: any) {\n      alert(err.message || 'Kunne ikke registrere forespørsel.');\n    } finally {\n      setIsRequestingDelete(false);\n    }\n  };\n\n  const tabs = [\n    { id: 'profile', label: t('profile', 'Profil'), icon: <User size={18} /> },\n    { id: 'company', label: t('company', 'Bedrift'), icon: <Building2 size={18} /> },\n    { id: 'team', label: t('team', 'Team'), icon: <Users size={18} /> },\n    { id: 'modules', label: t('modules', 'Moduler'), icon: <Package size={18} /> },\n    { id: 'notifications', label: t('notifications', 'Varslinger'), icon: <Bell size={18} /> },\n    { id: 'privacy', label: 'Personvern & GDPR', icon: <ShieldCheck size={18} /> },\n    { id: 'billing', label: t('billing', 'Abonnement'), icon: <CreditCard size={18} /> },\n    { id: 'system', label: t('system_status', 'Systemstatus'), icon: <Shield size={18} /> },\n  ];\n\n  if (isLoading) {\n    return (\n      <div className=\"flex items-center justify-center min-h-[60vh]\">\n        <Loader2 className=\"w-8 h-8 text-emerald-600 animate-spin\" />\n      </div>\n    );\n  }\n\n  return (\n    <div className=\"max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">\n      <div className=\"flex flex-col md:flex-row gap-8\">\n        {/* Sidebar */}\n        <div className=\"w-full md:w-64 space-y-2\">\n          <h1 className=\"text-2xl font-bold mb-6 px-4\">{t('settings', 'Innstillinger')}</h1>\n          {tabs.map((tab) => (\n            <button\n              key={tab.id}\n              onClick={() => setActiveTab(tab.id as any)}\n              className={cn(\n                \"w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all\",\n                activeTab === tab.id \n                  ? \"bg-emerald-600 text-white shadow-lg shadow-emerald-100\" \n                  : \"text-neutral-500 hover:bg-neutral-100\"\n              )}\n            >\n              {tab.icon}\n              {tab.label}\n            </button>\n          ))}\n          <div className=\"pt-8 mt-8 border-t border-neutral-100\">\n            <button \n              onClick={logout}\n              className=\"w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all\"\n            >\n              <LogOut size={18} />\n              {t('logout', 'Logg ut')}\n            </button>\n          </div>\n        </div>\n\n        {/* Content Area */}\n        <div className=\"flex-1 bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden\">\n          <div className=\"p-8\">\n            {activeTab === 'team' && (\n              <motion.div \n                initial={{ opacity: 0, y: 10 }}\n                animate={{ opacity: 1, y: 0 }}\n                className=\"space-y-6\"\n              >\n                <div className=\"flex items-center justify-between\">\n                  <div>\n                    <h3 className=\"font-bold\">{t('team_management', 'Teamadministrasjon')}</h3>\n                    <p className=\"text-xs text-neutral-500\">{t('team_desc', 'Administrer ansatte og deres tilgangsnivåer.')}</p>\n                  </div>\n                  <button \n                    onClick={() => setIsInviteModalOpen(true)}\n                    className=\"flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100\"\n                  >\n                    <UserPlus size={16} />\n                    {t('invite_member', 'Inviter medlem')}\n                  </button>\n                </div>\n\n                <div className=\"overflow-hidden border border-neutral-100 rounded-2xl\">\n                  <table className=\"w-full text-left border-collapse\">\n                    <thead>\n                      <tr className=\"bg-neutral-50 border-b border-neutral-100\">\n                        <th className=\"px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400\">{t('member', 'Medlem')}</th>\n                        <th className=\"px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400\">{t('role', 'Rolle')}</th>\n                        <th className=\"px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400\">{t('status', 'Status')}</th>\n                        <th className=\"px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400\"></th>\n                      </tr>\n                    </thead>\n                    <tbody className=\"divide-y divide-neutral-100\">\n                      {loadingTeam ? (\n                        <tr>\n                          <td colSpan={4} className=\"px-6 py-8 text-center\">\n                            <Loader2 className=\"w-6 h-6 text-emerald-600 animate-spin mx-auto\" />\n                          </td>\n                        </tr>\n                      ) : teamMembers.length === 0 ? (\n                        <tr>\n                          <td colSpan={4} className=\"px-6 py-8 text-center text-neutral-500 text-sm\">\n                            {t('no_members', 'Ingen teammedlemmer funnet.')}\n                          </td>\n                        </tr>\n                      ) : (\n                        teamMembers.map((member) => (\n                          <tr key={member.id} className=\"hover:bg-neutral-50 transition-colors\">\n                            <td className=\"px-6 py-4\">\n                              <div className=\"flex items-center gap-3\">\n                                <div className=\"w-8 h-8 rounded-full bg-neutral-100 overflow-hidden\">\n                                  <img \n                                    src={member.imageUrl || `https://picsum.photos/seed/${member.id}/40/40`} \n                                    alt=\"\" \n                                    className=\"w-full h-full object-cover\"\n                                    referrerPolicy=\"no-referrer\"\n                                  />\n                                </div>\n                                <div>\n                                  <div className=\"text-sm font-bold\">{member.name}</div>\n                                  <div className=\"text-[10px] text-neutral-500\">{member.email}</div>\n                                </div>\n                              </div>\n                            </td>\n                            <td className=\"px-6 py-4\">\n                              <span className={cn(\n                                \"px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded\",\n                                member.role === 'admin' ? \"bg-purple-50 text-purple-700\" :\n                                member.role === 'manager' ? \"bg-blue-50 text-blue-700\" :\n                                \"bg-neutral-100 text-neutral-600\"\n                              )}>\n                                {member.role}\n                              </span>\n                            </td>\n                            <td className=\"px-6 py-4\">\n                              <div className=\"flex items-center gap-1.5\">\n                                <div className=\"w-1.5 h-1.5 rounded-full bg-emerald-500\"></div>\n                                <span className=\"text-[10px] font-bold text-neutral-600 uppercase tracking-widest\">Aktiv</span>\n                              </div>\n                            </td>\n                            <td className=\"px-6 py-4 text-right\">\n                              <button \n                                onClick={() => handleDeleteMember(member.id)}\n                                className=\"p-2 text-neutral-400 hover:text-red-600 transition-colors\"\n                              >\n                                <Trash2 size={16} />\n                              </button>\n                            </td>\n                          </tr>\n                        ))\n                      )}\n                    </tbody>\n                  </table>\n                </div>\n              </motion.div>\n            )}\n\n            {activeTab === 'profile' && (\n              <motion.div \n                initial={{ opacity: 0, y: 10 }}\n                animate={{ opacity: 1, y: 0 }}\n                className=\"space-y-8\"\n              >\n                <div className=\"flex items-center gap-6\">\n                  <div className=\"relative group\">\n                    <div className=\"w-24 h-24 rounded-full bg-neutral-100 border-4 border-white shadow-md overflow-hidden\">\n                      <img \n                        src={profilePhoto || user?.photoURL || `https://picsum.photos/seed/${user?.uid}/100/100`} \n                        alt=\"Profile\" \n                        className=\"w-full h-full object-cover\"\n                        referrerPolicy=\"no-referrer\"\n                      />\n                    </div>\n                    <input \n                      type=\"file\" \n                      ref={profilePhotoInputRef} \n                      accept=\"image/*\" \n                      className=\"hidden\" \n                      onChange={(e) => {\n                        const file = e.target.files?.[0];\n                        if (file) {\n                          const reader = new FileReader();\n                          reader.onloadend = () => {\n                            setProfilePhoto(reader.result as string);\n                            toast.success(\"Nytt profilbilde valgt. Klikk 'Lagre endringer' for å oppdatere.\");\n                          };\n                          reader.readAsDataURL(file);\n                        }\n                      }} \n                    />\n                    <button \n                      type=\"button\"\n                      onClick={() => profilePhotoInputRef.current?.click()}\n                      className=\"absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-500 transition-colors cursor-pointer\"\n                      title=\"Last opp profilbilde\"\n                    >\n                      <Camera size={14} />\n                    </button>\n                  </div>\n                  <div>\n                    <h2 className=\"text-xl font-bold\">{profile.displayName || user?.displayName || 'Bruker'}</h2>\n                    <p className=\"text-neutral-500 text-sm\">{user?.email}</p>\n                    <span className=\"inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded\">\n                      {t('admin', 'Administrator')}\n                    </span>\n                  </div>\n                </div>\n\n                <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">\n                  <div className=\"space-y-2\">\n                    <label className=\"text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1\">{t('full_name', 'Fullt navn')}</label>\n                    <input \n                      type=\"text\" \n                      value={profile.displayName}\n                      onChange={(e) => updateProfile('displayName', e.target.value)}\n                      className=\"w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20\"\n                    />\n                  </div>\n                  <div className=\"space-y-2\">\n                    <label className=\"text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1\">{t('email', 'E-post')}</label>\n                    <input \n                      type=\"email\" \n                      defaultValue={user?.email || ''}\n                      disabled\n                      className=\"w-full px-4 py-3 bg-neutral-100 border border-neutral-100 rounded-xl text-sm text-neutral-500 cursor-not-allowed\"\n                    />\n                  </div>\n                  <div className=\"space-y-2\">\n                    <label className=\"text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1\">{t('phone', 'Telefon')}</label>\n                    <input \n                      type=\"tel\" \n                      value={profile.phone}\n                      onChange={(e) => updateProfile('phone', e.target.value)}\n                      placeholder=\"+47 000 00 000\"\n                      className=\"w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20\"\n                    />\n                  </div>\n                  <div className=\"space-y-2\">\n                    <label className=\"text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1\">{t('language', 'Språk for brukergrensesnitt')}</label>\n                    <select \n                      value={getStandardLang(profile.language || i18n.language)}\n                      onChange={(e) => {\n                        const newLang = e.target.value;\n                        updateProfile('language', newLang);\n                        i18n.changeLanguage(newLang);\n                        localStorage.setItem('i18nextLng', newLang);\n                      }}\n                      className=\"w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20\"\n                    >\n                      <option value=\"no\">Norsk (NO)</option>\n                      <option value=\"en\">English (EN)</option>\n                      <option value=\"pl\">Polski (PL)</option>\n                      <option value=\"lt\">Lietuvių (LT)</option>\n                    </select>\n                    <p className=\"text-[11px] text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-100/80\">\n                      💡 <strong>Norsk Dokumentasjonsgaranti:</strong> Du ser appen på ditt valgte språk, mens all utgående dokumentasjon (SJA, avvik, tilbud, kontrakt, FDV) automatisk genereres på profesjonelt norsk (Bokmål).\n                    </p>\n                  </div>\n                </div>\n              </motion.div>\n            )}\n\n            {activeTab === 'company' && (\n              <motion.div \n                initial={{ opacity: 0, y: 10 }}\n                animate={{ opacity: 1, y: 0 }}\n                className=\"space-y-8\"\n              >\n                <div className=\"p-6 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-4\">\n                  <div className=\"w-16 h-16 bg-white rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-400 overflow-hidden\">\n                    {profile.companyLogo ? (\n                      <img src={profile.companyLogo} alt=\"Logo\" className=\"w-full h-full object-contain\" />\n                    ) : (\n                      <Building2 size={32} />\n                    )}\n                  </div>\n                  <div>\n                    <h3 className=\"font-bold\">{t('company_logo', 'Bedriftslogo')}</h3>\n                    <p className=\"text-xs text-neutral-500\">{t('logo_desc', 'Last opp din bedriftslogo for bruk i rapporter.')}</p>\n                  </div>\n                  <label className=\"ml-auto px-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-bold hover:bg-neutral-50 transition-colors cursor-pointer\">\n                    {t('upload', 'Last opp')}\n                    <input type=\"file\" className=\"hidden\" accept=\"image/*\" onChange={handleLogoUpload} />\n                  </label>\n                </div>\n\n                <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">\n                  <div className=\"space-y-2\">\n                    <label className=\"text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1\">{t('company_name', 'Bedriftsnavn')}</label>\n                    <input \n                      type=\"text\" \n                      value={profile.companyName}\n                      onChange={(e) => updateProfile('companyName', e.target.value)}\n                      placeholder=\"Firma AS\"\n                      className=\"w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20\"\n                    />\n                  </div>\n                  <div className=\"space-y-2\">\n                    <label className=\"text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1\">{t('org_number', 'Organisasjonsnummer')}</label>\n                    <input \n                      type=\"text\" \n                      value={profile.orgNumber}\n                      onChange={(e) => updateProfile('orgNumber', e.target.value)}\n                      placeholder=\"999 999 999\"\n                      className=\"w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20\"\n                    />\n                  </div>\n                  <div className=\"md:col-span-2 space-y-2\">\n                    <label className=\"text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1\">{t('address', 'Adresse')}</label>\n                    <input \n                      type=\"text\" \n                      value={profile.address}\n                      onChange={(e) => updateProfile('address', e.target.value)}\n                      placeholder=\"Storgata 1, 0123 Oslo\"\n                      className=\"w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20\"\n                    />\n                  </div>\n                  <div className=\"md:col-span-2 space-y-2\">\n                    <label className=\"text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1\">{t('industry', 'Bransje')}</label>\n                    <select \n                      value={profile.industry}\n                      onChange={(e) => updateProfile('industry', e.target.value)}\n                      className=\"w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20\"\n                    >\n                      <option value=\"general\">{t('general_contractor', 'Generalentreprenør / Full pakke')}</option>\n                      <option value=\"carpenter\">{t('carpenter', 'Tømrer / Snekker')}</option>\n                      <option value=\"plumber\">{t('plumber', 'Rørlegger')}</option>\n                      <option value=\"electrician\">{t('electrician', 'Elektriker')}</option>\n                      <option value=\"mason\">{t('mason', 'Murer')}</option>\n                      <option value=\"painter\">{t('painter', 'Maler')}</option>\n                    </select>\n                    <p className=\"text-[10px] text-neutral-500 mt-1\">\n                      {t('industry_hint', 'Systemet tilpasses automatisk din valgte bransje.')}\n                    </p>\n                  </div>\n                </div>\n\n                <div className=\"p-6 bg-blue-50 rounded-2xl border border-blue-100\">\n                  <div className=\"flex items-center gap-3 mb-2\">\n                    <Shield size={20} className=\"text-blue-600\" />\n                    <h4 className=\"font-bold text-blue-900\">{t('integrations', 'Integrasjoner')}</h4>\n                  </div>\n                  <p className=\"text-xs text-blue-700 mb-4\">{t('integrations_desc', 'Koble til dine fagsystemer for automatisk dokumentoverføring.')}</p>\n                  <div className=\"space-y-3\">\n                    {['Boligmappa', 'Tripletex', 'PowerOffice Go'].map((service) => (\n                      <div key={service} className=\"flex items-center justify-between p-3 bg-white rounded-xl border border-blue-200\">\n                        <span className=\"text-sm font-bold\">{service}</span>\n                        <button \n                          onClick={() => toast.info(`Integrasjon med ${service} krever bedriftsavtale og API-nøkkel. Ta kontakt med post@ksmester.no for oppsett.`)}\n                          className=\"text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline cursor-pointer\"\n                        >\n                          {t('connect', 'Koble til')}\n                        </button>\n                      </div>\n                    ))}\n                  </div>\n                </div>\n              </motion.div>\n            )}\n\n            {activeTab === 'modules' && (\n              <motion.div \n                initial={{ opacity: 0, y: 10 }}\n                animate={{ opacity: 1, y: 0 }}\n                className=\"space-y-6\"\n              >\n                <div className=\"flex items-center justify-between mb-4\">\n                  <div>\n                    <h3 className=\"font-bold\">{t('available_modules', 'Tilgjengelige Moduler')}</h3>\n                    <p className=\"text-xs text-neutral-500\">{t('modules_desc', 'Velg modulene som passer din bedrift. Du betaler kun for det du bruker.')}</p>\n                  </div>\n                  <div className=\"px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded\">\n                    {profile.industry === 'general' ? 'Full pakke inkludert' : 'Bransjetilpasset'}\n                  </div>\n                </div>\n\n                <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\n                  {[\n                    { id: 'offers', label: 'Tilbud & Kalkulasjon', icon: <Calculator size={18} />, desc: 'Opprett profesjonelle tilbud raskt.' },\n                    { id: 'contracts', label: 'Kontrakter & Signering', icon: <FileSignature size={18} />, desc: 'Digital signering med BankID.' },\n                    { id: 'building_app', label: 'Byggesøknad', icon: <Building2 size={18} />, desc: 'Forenklet innsending til kommunen.' },\n                    { id: 'apprentice', label: 'Lærlingmodul', icon: <GraduationCap size={18} />, desc: 'Oppfølging av lærlinger og mål.' },\n                    { id: 'inventory', label: 'Lager & Verktøy', icon: <Package size={18} />, desc: 'Full kontroll på utstyr og materiell.' },\n                    { id: 'vehicle', label: 'Kjørebok', icon: <Car size={18} />, desc: 'Automatisk logging av turer.' },\n                    { id: 'ai_analysis', label: 'AI Analyse (Premium)', icon: <Brain size={18} />, desc: 'Avansert bildeanalyse og HMS-kontroll.' },\n                  ].map((mod) => {\n                    const isIncluded = profile.industry === 'general' || (profile.modules && profile.modules.includes(mod.id));\n                    const isDisabled = profile.industry === 'general';\n\n                    return (\n                      <div \n                        key={mod.id}\n                        className={cn(\n                          \"p-4 rounded-2xl border transition-all flex items-start gap-4\",\n                          isIncluded ? \"bg-emerald-50 border-emerald-200\" : \"bg-white border-neutral-100 hover:border-neutral-200\"\n                        )}\n                      >\n                        <div className={cn(\n                          \"w-10 h-10 rounded-xl flex items-center justify-center shrink-0\",\n                          isIncluded ? \"bg-emerald-600 text-white\" : \"bg-neutral-100 text-neutral-400\"\n                        )}>\n                          {mod.icon}\n                        </div>\n                        <div className=\"flex-1\">\n                          <div className=\"flex items-center justify-between\">\n                            <span className=\"text-sm font-bold\">{mod.label}</span>\n                            <button\n                              disabled={isDisabled}\n                              onClick={() => toggleModule(mod.id)}\n                              className={cn(\n                                \"text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors\",\n                                isIncluded \n                                  ? (isDisabled ? \"text-emerald-600 cursor-default\" : \"text-red-600 hover:bg-red-50\") \n                                  : \"text-emerald-600 hover:bg-emerald-100\"\n                              )}\n                            >\n                              {isIncluded ? (isDisabled ? 'Inkludert' : 'Fjern') : 'Bestill'}\n                            </button>\n                          </div>\n                          <p className=\"text-[10px] text-neutral-500 mt-1\">{mod.desc}</p>\n                        </div>\n                      </div>\n                    );\n                  })}\n                </div>\n              </motion.div>\n            )}\n\n            {activeTab === 'notifications' && (\n              <motion.div \n                initial={{ opacity: 0, y: 10 }}\n                animate={{ opacity: 1, y: 0 }}\n                className=\"space-y-6\"\n              >\n                <h3 className=\"font-bold mb-4\">{t('notification_settings', 'Varslingsinnstillinger')}</h3>\n                <div className=\"space-y-4\">\n                  {[\n                    { id: 'deviations', label: t('new_deviations', 'Nye avvik'), desc: t('deviations_notify', 'Få varsel når et nytt avvik blir logget.') },\n                    { id: 'sja', label: t('sja_approvals', 'SJA-godkjenninger'), desc: t('sja_notify', 'Få varsel når en SJA-rapport venter på godkjenning.') },\n                    { id: 'reports', label: t('weekly_reports', 'Ukentlige rapporter'), desc: t('reports_notify', 'Motta en oppsummering av alle prosjekter hver mandag.') },\n                    { id: 'hmsCardExpiry', label: t('hms_card_expiry', 'HMS-kort utløp'), desc: t('hms_card_expiry_notify', 'Få varsel når et HMS-kort er i ferd med å utløpe eller har utløpt.') },\n                  ].map((item) => (\n                    <div key={item.id} className=\"flex items-center justify-between p-4 hover:bg-neutral-50 rounded-2xl transition-colors\">\n                      <div className=\"flex-1 mr-4\">\n                        <div className=\"text-sm font-bold\">{item.label}</div>\n                        <p className=\"text-xs text-neutral-500\">{item.desc}</p>\n                      </div>\n                      <button \n                        onClick={() => updateNotifications(item.id as any, !profile.notifications[item.id as keyof SettingsProfile['notifications']])}\n                        className={cn(\n                          \"relative inline-flex h-6 w-11 items-center rounded-full transition-colors\",\n                          profile.notifications[item.id as keyof SettingsProfile['notifications']] ? \"bg-emerald-600\" : \"bg-neutral-200\"\n                        )}\n                      >\n                        <span className={cn(\n                          \"inline-block h-4 w-4 transform rounded-full bg-white transition\",\n                          profile.notifications[item.id as keyof SettingsProfile['notifications']] ? \"translate-x-6\" : \"translate-x-1\"\n                        )} />\n                      </button>\n                    </div>\n                  ))}\n                </div>\n              </motion.div>\n            )}\n\n            {activeTab === 'billing' && (\n              <motion.div \n                initial={{ opacity: 0, y: 10 }}\n                animate={{ opacity: 1, y: 0 }}\n                className=\"space-y-8\"\n              >\n                <div className={cn(\n                  \"p-8 text-white rounded-3xl relative overflow-hidden\",\n                  subscriptionStatus === 'trial' ? \"bg-emerald-900\" : \"bg-neutral-900\"\n                )}>\n                  <div className=\"absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full -mr-32 -mt-32 blur-3xl\"></div>\n                  <div className=\"relative z-10\">\n                    <div className=\"text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2\">\n                      {subscriptionStatus === 'trial' ? t('trial_period', 'Prøveperiode') : t('current_plan', 'Gjeldende plan')}\n                    </div>\n                    <h3 className=\"text-3xl font-bold mb-2\">\n                      {subscriptionStatus === 'trial' ? t('free_trial', 'Gratis prøveperiode') : profile.billing.plan}\n                    </h3>\n                    <p className=\"text-neutral-400 text-sm mb-6\">\n                      {subscriptionStatus === 'trial' \n                        ? `${trialDaysLeft} ${t('days_left', 'dager igjen')}` \n                        : `${t('billing_cycle', 'Neste fakturering')}: ${new Date(profile.billing.nextBilling).toLocaleDateString()}`\n                      }\n                    </p>\n                    <div className=\"flex items-center gap-4\">\n                      <button \n                        onClick={() => window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'pricing' } }))}\n                        className=\"px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all cursor-pointer\"\n                      >\n                        {subscriptionStatus === 'trial' ? t('upgrade_now', 'Oppgrader nå') : t('manage_billing', 'Administrer betaling')}\n                      </button>\n                      {subscriptionStatus !== 'trial' && (\n                        <button \n                          onClick={() => toast.info('Ingen utestående fakturaer registrert for gjeldende termin.')}\n                          className=\"px-6 py-2 bg-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-all cursor-pointer\"\n                        >\n                          {t('view_invoices', 'Se fakturaer')}\n                        </button>\n                      )}\n                    </div>\n                  </div>\n                </div>\n\n                <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">\n                  {[\n                    { label: t('users', 'Brukere'), value: `${profile.billing.usage.users} / ${profile.billing.usage.maxUsers}`, color: 'bg-blue-500', percent: (profile.billing.usage.users / profile.billing.usage.maxUsers) * 100 },\n                    { label: t('projects', 'Prosjekter'), value: `${profile.billing.usage.projects} / ${profile.billing.usage.maxProjects}`, color: 'bg-emerald-500', percent: (profile.billing.usage.projects / profile.billing.usage.maxProjects) * 100 },\n                    { label: t('storage', 'Lagring'), value: `${profile.billing.usage.storage} / ${profile.billing.usage.maxStorage}`, color: 'bg-purple-500', percent: 40 }, // Placeholder percent for storage\n                  ].map((stat) => (\n                    <div key={stat.label} className=\"p-4 bg-neutral-50 rounded-2xl border border-neutral-100\">\n                      <div className=\"text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1\">{stat.label}</div>\n                      <div className=\"text-lg font-bold\">{stat.value}</div>\n                      <div className=\"mt-2 h-1 w-full bg-neutral-200 rounded-full overflow-hidden\">\n                        <div className={cn(\"h-full\", stat.color)} style={{ width: `${stat.percent}%` }}></div>\n                      </div>\n                    </div>\n                  ))}\n                </div>\n              </motion.div>\n            )}\n\n            {activeTab === 'privacy' && (\n              <motion.div \n                initial={{ opacity: 0, y: 10 }}\n                animate={{ opacity: 1, y: 0 }}\n                className=\"space-y-8\"\n              >\n                {/* Header Banner */}\n                <div className=\"p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-4\">\n                  <div className=\"w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200\">\n                    <ShieldCheck size={24} />\n                  </div>\n                  <div>\n                    <h3 className=\"font-bold text-emerald-950 text-base mb-1\">Personvern, Sikkerhet & GDPR</h3>\n                    <p className=\"text-xs text-emerald-800 leading-relaxed\">\n                      KS MesterAI oppfyller EUs personvernforordning (GDPR), Personopplysningsloven, Byggherreforskriften og gjeldende norske HMS- og regnskapskrav. Dine data lagres strengt isolert og deles aldri med uvedkommende.\n                    </p>\n                  </div>\n                </div>\n\n                {/* Section 1: Data Export */}\n                <div className=\"p-6 bg-white rounded-2xl border border-neutral-200 shadow-sm space-y-4\">\n                  <div className=\"flex items-center justify-between\">\n                    <div>\n                      <h4 className=\"font-bold text-neutral-900 flex items-center gap-2\">\n                        <Download size={18} className=\"text-emerald-600\" />\n                        Innsyn og Dataportabilitet (GDPR Art. 15 & 20)\n                      </h4>\n                      <p className=\"text-xs text-neutral-500 mt-1\">\n                        Last ned en komplett, maskinlesbar kopi (JSON) av alle dine personopplysninger, tidsregistreringer og prosjektlogger.\n                      </p>\n                    </div>\n                    <button\n                      onClick={handleExportGdprData}\n                      disabled={isExporting}\n                      className=\"flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-md shadow-emerald-100 disabled:opacity-50\"\n                    >\n                      {isExporting ? <Loader2 size={16} className=\"animate-spin\" /> : <Download size={16} />}\n                      {isExporting ? 'Eksporterer...' : 'Last ned mine data'}\n                    </button>\n                  </div>\n                </div>\n\n                {/* Section 2: Security & Statutory Compliance */}\n                <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\n                  <div className=\"p-5 bg-neutral-50 rounded-2xl border border-neutral-200\">\n                    <div className=\"flex items-center gap-2 font-bold text-neutral-900 text-sm mb-2\">\n                      <Lock size={16} className=\"text-emerald-600\" />\n                      Streng Multi-Tenant Dataseparasjon\n                    </div>\n                    <p className=\"text-xs text-neutral-600 leading-relaxed\">\n                      Alle prosjekter, tilbud, avvik og timelister er kryptert og isolert per bedrifts-ID. Ingen andre entreprenører eller tredjeparter har innsyn i bedriftens data.\n                    </p>\n                  </div>\n\n                  <div className=\"p-5 bg-neutral-50 rounded-2xl border border-neutral-200\">\n                    <div className=\"flex items-center gap-2 font-bold text-neutral-900 text-sm mb-2\">\n                      <FileText size={16} className=\"text-emerald-600\" />\n                      Byggherreforskriften & HMS (§ 15)\n                    </div>\n                    <p className=\"text-xs text-neutral-600 leading-relaxed\">\n                      Elektroniske mannskapslister og HMS-kortnumre oppbevares og arkiveres i 6 måneder iht. lovkrav fra Arbeidstilsynet, før automatisk sletting.\n                    </p>\n                  </div>\n                </div>\n\n                {/* Section 3: Right to Erasure */}\n                <div className=\"p-6 bg-red-50/50 rounded-2xl border border-red-100 space-y-4\">\n                  <div>\n                    <h4 className=\"font-bold text-red-950 text-sm flex items-center gap-2\">\n                      <Trash2 size={16} className=\"text-red-600\" />\n                      Retten til sletting / «Å bli glemt» (GDPR Art. 17)\n                    </h4>\n                    <p className=\"text-xs text-red-900/80 mt-1 leading-relaxed\">\n                      Du kan be om fullstendig sletting eller anonymisering av dine personopplysninger. Vær oppmerksom på at lovpålagt prosjektdokumentasjon og regnskapsbilag må oppbevares iht. Bokføringsloven (§ 13, 5 år) og Plan- og bygningsloven.\n                    </p>\n                  </div>\n\n                  <div className=\"space-y-3\">\n                    <input\n                      type=\"text\"\n                      placeholder=\"Oppgi eventuell årsak eller merknad for sletteforespørselen (valgfritt)...\"\n                      value={deleteReason}\n                      onChange={(e) => setDeleteReason(e.target.value)}\n                      className=\"w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-400\"\n                    />\n                    \n                    <div className=\"flex items-center justify-between\">\n                      {deleteStatus ? (\n                        <p className=\"text-xs font-bold text-emerald-700\">{deleteStatus}</p>\n                      ) : (\n                        <p className=\"text-[11px] text-neutral-400\">Forespørselen loggføres og bekreftes på e-post.</p>\n                      )}\n                      <button\n                        onClick={handleRequestGdprDelete}\n                        disabled={isRequestingDelete}\n                        className=\"px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all disabled:opacity-50\"\n                      >\n                        {isRequestingDelete ? 'Sender...' : 'Send sletteforespørsel'}\n                      </button>\n                    </div>\n                  </div>\n                </div>\n              </motion.div>\n            )}\n\n            {activeTab === 'system' && (\n              <motion.div \n                initial={{ opacity: 0, y: 10 }}\n                animate={{ opacity: 1, y: 0 }}\n                className=\"space-y-8\"\n              >\n                <div className=\"p-6 bg-emerald-50 rounded-2xl border border-emerald-100\">\n                  <h3 className=\"font-bold text-emerald-900 mb-2\">Lanseringssjekkliste</h3>\n                  <p className=\"text-xs text-emerald-700 mb-6\">Status for produksjonsklarhet for KS MesterAI Elite.</p>\n                  \n                  <div className=\"space-y-3\">\n                    {[\n                      { label: 'AI Mesterhjerne (Core)', status: 'ready', desc: 'Sentralisert AI-tjeneste for tekst og oversettelse.' },\n                      { label: 'Kart & Matrikkel (GNR/BNR)', status: 'ready', desc: 'Automatisk adresseoppslag via Geonorge API.' },\n                      { label: 'HMS/KS Moduler', status: 'ready', desc: 'SJA, Avvik og HMS-kontroll med AI-støtte.' },\n                      { label: 'Flerspråklig støtte', status: 'ready', desc: 'Norsk, Engelsk, Polsk og Litauisk integrert.' },\n                      { label: 'Sikkerhet & Tilgang', status: 'ready', desc: 'PostgreSQL Row-Level Security, JWT Auth og RBAC implementert.' },\n                      { label: 'PWA & Mobil', status: 'ready', desc: 'Offline-støtte og mobiloptimalisert grensesnitt.' },\n                      { label: 'GDPR & Personvern', status: 'ready', desc: 'Ekomloven & GDPR samtykke-håndtering med cookie-kontroll.' },\n                      { label: 'PDF Rapportering', status: 'pending', desc: 'Eksport av HMS/KS dokumentasjon til PDF.' },\n                      { label: 'Integrasjoner (Boligmappa)', status: 'pending', desc: 'Direkte overføring til Boligmappa.' },\n                    ].map((item, idx) => (
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
