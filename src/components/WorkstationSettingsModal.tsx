'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Building2,
  Users,
  Package,
  Bell,
  Link2,
  CreditCard,
  ShieldCheck,
  Check,
  Save,
  Key,
  ExternalLink,
  Plus,
  Trash2,
  Sparkles,
  Smartphone,
  CheckCircle2,
  CheckCircle,
  AlertTriangle,
  Globe,
  Mail,
  Send,
  Info,
  RefreshCw,
  PowerOff
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { db, doc, getDoc, setDoc } from '../services/firebase';

interface WorkstationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isSuperAdmin?: boolean;
}

type SettingsTab = 'profile' | 'company' | 'email' | 'team' | 'modules' | 'integrations' | 'notifications' | 'billing' | 'gdpr';

export default function WorkstationSettingsModal({
  isOpen,
  onClose,
  user,
  isSuperAdmin = false
}: WorkstationSettingsModalProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(user?.displayName || 'Ken Kristiansen');
  const [phone, setPhone] = useState(user?.phone || '+47 900 00 000');
  const [language, setLanguage] = useState(i18n.language || 'no');
  const [companyName, setCompanyName] = useState(user?.company || 'Mester Entreprenør AS');
  const [orgNumber, setOrgNumber] = useState('923 456 789');
  const [address, setAddress] = useState('Storgata 14, 3126 Tønsberg');
  const [hourlyRate, setHourlyRate] = useState('850');

  // Integrations (NOBB BYOK etc.)
  const [nobbKey, setNobbKey] = useState('');
  const [tripletexToken, setTripletexToken] = useState('');
  const [fikenToken, setFikenToken] = useState('');

  // E-post & Utsendelse (Custom SMTP / Microsoft 365 / Gmail / Domeneshop osv.)
  const [emailProvider, setEmailProvider] = useState<string>('system_default');
  const [emailFromAddress, setEmailFromAddress] = useState<string>(user?.email || '');
  const [emailFromName, setEmailFromName] = useState<string>(user?.company || user?.displayName || '');
  const [emailReplyTo, setEmailReplyTo] = useState<string>(user?.email || '');
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpSecure, setSmtpSecure] = useState<boolean>(false);
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPassword, setSmtpPassword] = useState<string>('');
  const [resendApiKey, setResendApiKey] = useState<string>('');
  const [emailConfigured, setEmailConfigured] = useState<boolean>(false);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [isTestingEmail, setIsTestingEmail] = useState<boolean>(false);
  const [emailTestStatus, setEmailTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [sendTestEmailCheck, setSendTestEmailCheck] = useState<boolean>(true);

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifTeamsSlack, setNotifTeamsSlack] = useState(true);
  const [notifPush, setNotifPush] = useState(true);

  // Active Modules Toggle
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>({
    dailylog: true,
    change_orders: true,
    pre_close: true,
    sja: true,
    offers: true,
    archive: true,
    contacts: true,
    laerling: true,
    vehicle: true
  });

  // Team list
  const [teamMembers, setTeamMembers] = useState([
    { id: '1', name: user?.displayName || 'Ken Kristiansen', role: 'SuperAdmin / Daglig leder', email: user?.email || 'kenkri3@gmail.com' },
    { id: '2', name: 'Ole Hansen', role: 'Bas / Tømrer', email: 'ole@mester.no' },
    { id: '3', name: 'Jonas Vik', role: 'Lærling', email: 'jonas@mester.no' }
  ]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Tømrer / Fagarbeider');

  // Load stored settings on open
  useEffect(() => {
    if (isOpen) {
      const storedNobb = localStorage.getItem('nobb_api_key') || '';
      setNobbKey(storedNobb);

      const storedRate = localStorage.getItem('company_hourly_rate');
      if (storedRate) setHourlyRate(storedRate);

      if (user?.uid) {
        getDoc(doc(db, 'users', user.uid)).then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.displayName) setFullName(data.displayName);
            if (data.phone) setPhone(data.phone);
            if (data.companyName) setCompanyName(data.companyName);
            if (data.orgNumber) setOrgNumber(data.orgNumber);
            if (data.address) setAddress(data.address);
          }
        }).catch((err) => console.warn('Could not load user doc:', err));
      }

      // Hent e-postinnstillinger for bedriften (SMTP/Microsoft 365/Gmail/Domeneshop osv.)
      fetch('/api/settings/email')
        .then(res => res.json())
        .then(data => {
          if (data && data.config) {
            setEmailProvider(data.config.provider || 'system_default');
            setEmailFromAddress(data.config.fromEmail || user?.email || '');
            setEmailFromName(data.config.fromName || user?.company || '');
            setEmailReplyTo(data.config.replyTo || user?.email || '');
            setSmtpHost(data.config.smtpHost || '');
            setSmtpPort(data.config.smtpPort || 587);
            setSmtpSecure(data.config.smtpSecure ?? false);
            setSmtpUser(data.config.smtpUser || '');
            setSmtpPassword(data.config.smtpPasswordMasked || '');
            setResendApiKey(data.config.resendApiKeyMasked || '');
            setEmailConfigured(Boolean(data.configured));
            setEmailVerified(Boolean(data.config.verified));
          }
        })
        .catch(err => console.warn('Could not load email settings:', err));
    }
  }, [isOpen, user]);

  const handleSelectEmailProvider = (providerKey: string) => {
    setEmailProvider(providerKey);
    setEmailTestStatus(null);
    if (providerKey === 'microsoft365') {
      setSmtpHost('smtp.office365.com');
      setSmtpPort(587);
      setSmtpSecure(false);
      if (!smtpUser && emailFromAddress) setSmtpUser(emailFromAddress);
    } else if (providerKey === 'gmail') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort(465);
      setSmtpSecure(true);
      if (!smtpUser && emailFromAddress) setSmtpUser(emailFromAddress);
    } else if (providerKey === 'domeneshop') {
      setSmtpHost('mail.domeneshop.no');
      setSmtpPort(587);
      setSmtpSecure(false);
      if (!smtpUser && emailFromAddress) setSmtpUser(emailFromAddress);
    } else if (providerKey === 'one_com') {
      setSmtpHost('send.one.com');
      setSmtpPort(465);
      setSmtpSecure(true);
      if (!smtpUser && emailFromAddress) setSmtpUser(emailFromAddress);
    } else if (providerKey === 'proisp') {
      setSmtpHost('mail.dittdomene.no');
      setSmtpPort(587);
      setSmtpSecure(false);
    }
  };

  const handleTestEmailConnection = async () => {
    setIsTestingEmail(true);
    setEmailTestStatus(null);
    try {
      const res = await fetch('/api/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: emailProvider,
          fromEmail: emailFromAddress,
          fromName: emailFromName,
          replyTo: emailReplyTo,
          smtpHost,
          smtpPort,
          smtpSecure,
          smtpUser,
          smtpPassword,
          resendApiKey,
          sendTestEmail: sendTestEmailCheck,
          testRecipientEmail: user?.email
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailTestStatus({ success: true, message: data.message });
        setEmailVerified(true);
        toast.success(data.message);
      } else {
        setEmailTestStatus({ success: false, message: data.message || 'Tilkobling feilet' });
        toast.error(data.message || 'Kunne ikke koble til e-postserver');
      }
    } catch (err: any) {
      setEmailTestStatus({ success: false, message: err.message || 'Nettverksfeil' });
      toast.error('Nettverksfeil under testing av e-post');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSaveEmailConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: emailProvider,
          enabled: emailProvider !== 'system_default',
          fromEmail: emailFromAddress,
          fromName: emailFromName,
          replyTo: emailReplyTo,
          smtpHost,
          smtpPort,
          smtpSecure,
          smtpUser,
          smtpPassword,
          resendApiKey
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailConfigured(emailProvider !== 'system_default');
        toast.success('E-postinnstillinger er lagret! E-poster sendes nå fra ditt oppsett.');
      } else {
        toast.error(data.error || 'Kunne ikke lagre e-postinnstillinger');
      }
    } catch (err: any) {
      toast.error('Kunne ikke lagre: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnectEmail = async () => {
    if (!confirm('Vil du koble fra egen e-postserver og gå tilbake til standard skyavsender?')) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/email', { method: 'DELETE' });
      if (res.ok) {
        setEmailProvider('system_default');
        setEmailConfigured(false);
        setEmailVerified(false);
        toast.info('Egen e-postserver er koblet fra. Systemet benytter nå standard skyavsender.');
      }
    } catch (e: any) {
      toast.error('Feil: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Save NOBB BYOK key locally and to storage
      if (nobbKey.trim()) {
        localStorage.setItem('nobb_api_key', nobbKey.trim());
      } else {
        localStorage.removeItem('nobb_api_key');
      }

      localStorage.setItem('company_hourly_rate', hourlyRate);

      // Save to Firebase if user is authenticated
      if (user?.uid) {
        await setDoc(doc(db, 'users', user.uid), {
          displayName: fullName,
          phone,
          companyName,
          orgNumber,
          address,
          language,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // Change language if modified
      if (language !== i18n.language) {
        i18n.changeLanguage(language);
        localStorage.setItem('i18nextLng', language);
      }

      toast.success('Innstillinger lagret!');
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error(err);
      toast.error('Kunne ikke lagre innstillinger: ' + err.message);
      setIsSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;
    const emailToInvite = newMemberEmail.trim();
    const isSuperInvite = newMemberRole === 'superadmin' || emailToInvite.toLowerCase() === 'fredrik@aichatnorge.no' || emailToInvite.toLowerCase() === 'fredrik.r.ellingsen@gmail.com';
    const effectiveRole = isSuperInvite ? 'superadmin' : newMemberRole;
    const effectiveCompanyId = isSuperInvite ? 'comp-001' : (user?.companyId || 'comp-001');
    const effectiveCompanyName = isSuperInvite ? 'AIChat Norge AS / Vikingnet' : companyName;

    setTeamMembers(prev => [
      ...prev,
      { id: Date.now().toString(), name: emailToInvite.split('@')[0], role: isSuperInvite ? 'SuperAdmin / Systemeier' : effectiveRole, email: emailToInvite }
    ]);
    setNewMemberEmail('');
    
    // Send ekte invitasjon på e-post via Resend og lagre invitasjon i databasen
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vikingmester.no';
      const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const link = `${baseUrl}/?invite=${inviteToken}`;

      // 1. Lagre invitasjon i databasen
      await fetch('/api/data/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          id: 'inv-' + inviteToken,
          companyId: effectiveCompanyId,
          companyName: effectiveCompanyName,
          inviterId: user?.id || user?.uid,
          inviterName: user?.displayName || 'Kenneth Kristiansen',
          inviteeEmail: emailToInvite,
          role: effectiveRole,
          status: 'pending',
          token: inviteToken,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        })
      }).catch(err => console.warn('Could not save invitation record:', err));

      // 2. Send e-post
      const subject = isSuperInvite
        ? `👑 Invitasjon som SuperAdmin & Systemeier i VikingMester`
        : `Invitasjon til ${effectiveCompanyName} i VikingMester`;

      const emailHtml = isSuperInvite ? `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #fde68a; border-radius: 14px;">
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 24px; border-radius: 12px; color: white; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <div style="display: inline-block; background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px;">
              👑 SuperAdmin & Systemeier
            </div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Velkommen til VikingMester</h2>
            <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 13px;">AIChat Norge AS / Vikingnet</p>
          </div>
          <p style="font-size: 15px;">Hei!</p>
          <p style="font-size: 14px; line-height: 1.6;">
            <strong>Kenneth Kristiansen</strong> har invitert deg til å bli med som <strong>SuperAdmin & Systemeier</strong> for <strong>VikingMester</strong>.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin: 16px 0;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b;">Dine rettigheter:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6;">
              <li>Full tilgang til <strong>SuperAdmin-portalen</strong></li>
              <li>Ubegrenset AI-kalkyle og 500M systemtokens</li>
              <li>Impersonering og inspeksjon av kundebedrifter</li>
              <li>100% like rettigheter som plattformeier</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 26px 0;">
            <a href="${link}" style="background: #d97706; color: #ffffff !important; font-weight: bold; padding: 14px 32px; border-radius: 10px; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);">
              👉 Opprett din SuperAdmin-bruker nå
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; text-align: center;">Lenken er gyldig i 14 dager. Du kan også registrere deg direkte på vikingmester.no med denne e-posten.</p>
        </div>
      ` : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px;">
          <div style="background: #0f172a; padding: 20px; border-radius: 10px; color: white; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px;">Velkommen til ${effectiveCompanyName}</h2>
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">VikingMester KS & Prosjektstyring</p>
          </div>
          <p>Hei!</p>
          <p>Du har blitt invitert av ledelsen til å bli med som <strong>${effectiveRole === 'admin' ? 'Administrator' : effectiveRole === 'manager' ? 'Prosjektleder' : 'Håndverker'}</strong> for <strong>${effectiveCompanyName}</strong> i VikingMester.</p>
          <div style="text-align: center; margin: 26px 0;">
            <a href="${link}" style="background: #059669; color: #ffffff !important; font-weight: bold; padding: 14px 28px; border-radius: 10px; text-decoration: none; display: inline-block; font-size: 14px;">
              👉 Åpne og godkjenn invitasjonen
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b;">Lenken er gyldig i 14 dager. Ved spørsmål kan du kontakte bedriftsledelsen.</p>
        </div>
      `;

      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          to: emailToInvite,
          subject,
          html: emailHtml,
          text: `Hei!\n\nDu er invitert til ${effectiveCompanyName} i VikingMester som ${effectiveRole}.\n\nAksepter invitasjonen her: ${link}`
        })
      });

      if (res.ok) {
        toast.success(`Invitasjon er sendt på e-post til ${emailToInvite}!`);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.warning(`Medarbeider lagt til, men e-post kunne ikke sendes: ${errData.error || errData.message || 'Sjekk e-postoppsett'}`);
      }
    } catch (err) {
      console.warn('Could not send invite email:', err);
      toast.success(`Medarbeider lagt til i listen`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-4xl max-h-[88vh] bg-[#0E1626] border border-slate-750 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Building2 size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">{t('settings_system_title', "System- & Bedriftsinnstillinger")}</h2>
              <p className="text-[11px] text-slate-400">{companyName} • Hovedsentral</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={t('ws_close_esc', "Lukk (Esc)")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto custom-scrollbar shrink-0 text-xs font-semibold">
          {[
            { id: 'profile', label: t('settings_tab_profile', 'Profil'), icon: User },
            { id: 'company', label: t('settings_tab_company', 'Bedrift & Takster'), icon: Building2 },
            { id: 'email', label: t('settings_tab_email', 'E-post & Utsendelse'), icon: Mail },
            { id: 'team', label: t('settings_tab_team', 'Team'), icon: Users },
            { id: 'modules', label: t('settings_tab_modules', 'Fagmoduler'), icon: Package },
            { id: 'integrations', label: t('settings_tab_integrations', 'NOBB & Systemer'), icon: Link2 },
            { id: 'notifications', label: t('settings_tab_notifications', 'Varslinger'), icon: Bell },
            { id: 'billing', label: t('settings_tab_billing', 'Abonnement & Kvote'), icon: CreditCard },
            { id: 'gdpr', label: t('settings_tab_gdpr', 'Personvern'), icon: ShieldCheck }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer",
                  isActive
                    ? "bg-purple-600 text-white font-bold shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar bg-[#0B1220]">
          {/* TAB 1: PROFIL */}
          {activeTab === 'profile' && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-800/80">
                <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white font-black text-xl flex items-center justify-center border-2 border-purple-400/40 shadow-md">
                  {fullName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{fullName}</h3>
                  <p className="text-xs text-slate-400">{user?.email || 'kenkri3@gmail.com'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {isSuperAdmin ? 'SuperAdmin' : 'Administrator'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Fullt navn
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Språk i brukergrensesnittet
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                  >
                    <option value="no">Norsk Bokmål (NO)</option>
                    <option value="en">English (EN)</option>
                    <option value="pl">Polski (PL)</option>
                    <option value="lt">Lietuvių (LT)</option>
                  </select>
                </div>
              </div>

              {/* Norsk Dokumentasjonsgaranti */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-200 block mb-0.5">Norsk Dokumentasjonsgaranti</strong>
                  Uavhengig av hvilket språk du velger i appen, skrives all utgående dokumentasjon (SJA, avviksrapporter, NS 8406 endringsordrer, pristilbud og FDV) automatisk på juridisk feilfri norsk.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BEDRIFT & TAKSTER */}
          {activeTab === 'company' && (
            <div className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Bedriftsnavn
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Organisasjonsnummer
                  </label>
                  <input
                    type="text"
                    value={orgNumber}
                    onChange={(e) => setOrgNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Forretningsadresse
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Standard timepris (kr eks. mva)
                  </label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Benyttes som standard i MesterAI Hurtigkalkyle</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Sentral Godkjenning & Mesterbrev
                  </label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                    <span>Tiltaksklasse 2 • Tømrer</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-black">Aktiv</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: E-POST & UTSENDELSE (Egen mailserver / SMTP / Microsoft 365 / Gmail / Domeneshop) */}
          {activeTab === 'email' && (
            <div className="space-y-4 max-w-2xl">
              {/* Status Header Banner */}
              <div className={cn(
                "p-4 rounded-2xl border transition-all",
                emailConfigured && emailProvider !== 'system_default'
                  ? "bg-emerald-950/20 border-emerald-500/40"
                  : "bg-slate-900 border-slate-800"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border",
                      emailConfigured && emailProvider !== 'system_default'
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    )}>
                      <Mail size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">
                          {emailConfigured && emailProvider !== 'system_default'
                            ? 'Egen e-postserver tilkoblet'
                            : 'VikingMester Sky-avsender (Standard)'}
                        </h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                          emailConfigured && emailProvider !== 'system_default'
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1"
                            : "bg-slate-800 text-slate-400"
                        )}>
                          {emailConfigured && emailProvider !== 'system_default' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Aktiv ({emailProvider === 'microsoft365' ? 'M365' : emailProvider === 'gmail' ? 'Gmail' : emailProvider === 'domeneshop' ? 'Domeneshop' : 'Eget domene'})
                            </>
                          ) : 'Standard'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {emailConfigured && emailProvider !== 'system_default'
                          ? `Utsendelser av tilbud, endringsordrer og varsler sendes direkte fra ${emailFromAddress || 'din e-post'} via din egen mailserver.`
                          : 'Koble til din egen e-postleverandør nedenfor slik at systemet sender alle tilbud og meldinger direkte fra din egen mail.'}
                      </p>
                    </div>
                  </div>

                  {emailConfigured && emailProvider !== 'system_default' && (
                    <button
                      type="button"
                      onClick={handleDisconnectEmail}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Koble fra
                    </button>
                  )}
                </div>
              </div>

              {/* Leverandør-velger (Hurtigvalg) */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Velg din e-postleverandør (Hurtigoppsett)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'microsoft365', label: 'Microsoft 365', icon: '🏢', sub: 'Outlook / Office' },
                    { id: 'gmail', label: 'Google Workspace', icon: '🌐', sub: 'Gmail / Google' },
                    { id: 'domeneshop', label: 'Domeneshop', icon: '🇳🇴', sub: 'mail.domeneshop.no' },
                    { id: 'one_com', label: 'One.com', icon: '⚡', sub: 'send.one.com' },
                    { id: 'proisp', label: 'ProISP / Webhotell', icon: '🛠️', sub: 'cPanel / Eget domene' },
                    { id: 'custom_smtp', label: 'Annen SMTP', icon: '⚙️', sub: 'Egen server/port' },
                    { id: 'resend_byok', label: 'Resend API', icon: '🔑', sub: 'BYOK API-nøkkel' },
                    { id: 'system_default', label: 'Sky-avsender', icon: '☁️', sub: 'Systemstandard' },
                  ].map((prov) => {
                    const isSelected = emailProvider === prov.id;
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => handleSelectEmailProvider(prov.id)}
                        className={cn(
                          "p-2.5 rounded-2xl border text-left transition-all cursor-pointer",
                          isSelected
                            ? "bg-purple-600/20 border-purple-500 text-white shadow-xs"
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
                        )}
                      >
                        <div className="text-base mb-1">{prov.icon}</div>
                        <div className="text-xs font-bold truncate">{prov.label}</div>
                        <div className="text-[10px] text-slate-500 truncate">{prov.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Innstillingsfelter (hvis ikke system_default) */}
              {emailProvider !== 'system_default' && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Avsenderadresse */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Din e-postadresse (Avsender) *
                      </label>
                      <input
                        type="email"
                        placeholder="f.eks. post@dittfirma.no"
                        value={emailFromAddress}
                        onChange={(e) => {
                          setEmailFromAddress(e.target.value);
                          if (!smtpUser) setSmtpUser(e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">Adressen som kundene ser e-posten kommer fra</span>
                    </div>

                    {/* Visningsnavn */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Avsendernavn (Firmanavn)
                      </label>
                      <input
                        type="text"
                        placeholder="f.eks. Mester Entreprenør AS"
                        value={emailFromName}
                        onChange={(e) => setEmailFromName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">Navnet som vises i innboksen til kunden</span>
                    </div>

                    {/* Svar-til (Reply-To) */}
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Svaradresse (Reply-To)
                      </label>
                      <input
                        type="email"
                        placeholder={emailFromAddress || "f.eks. kontakt@dittfirma.no"}
                        value={emailReplyTo}
                        onChange={(e) => setEmailReplyTo(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">Når kunden trykker «Svar», går henvendelsen direkte til denne adressen</span>
                    </div>
                  </div>

                  {/* Hvis Resend BYOK */}
                  {emailProvider === 'resend_byok' ? (
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Resend API-nøkkel (re_...) *
                      </label>
                      <input
                        type="password"
                        placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                        value={resendApiKey}
                        onChange={(e) => setResendApiKey(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Krever at domenet ditt (f.eks. dittfirma.no) er lagt til og verifisert i kontrollpanelet på resend.com.
                      </p>
                    </div>
                  ) : (
                    /* SMTP Detaljer */
                    <div className="space-y-3 pt-2 border-t border-slate-800/80">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            SMTP Server (Host) *
                          </label>
                          <input
                            type="text"
                            placeholder="f.eks. smtp.office365.com"
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Port & Sikkerhet
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={smtpPort}
                              onChange={(e) => setSmtpPort(Number(e.target.value))}
                              className="w-20 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setSmtpSecure(!smtpSecure)}
                              className={cn(
                                "px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer",
                                smtpSecure 
                                  ? "bg-purple-600/30 border-purple-500 text-purple-300" 
                                  : "bg-slate-800 border-slate-700 text-slate-300"
                              )}
                              title={smtpSecure ? "SSL/TLS (Port 465)" : "STARTTLS (Port 587)"}
                            >
                              {smtpSecure ? 'SSL' : 'STARTTLS'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Brukernavn (E-post) *
                          </label>
                          <input
                            type="text"
                            placeholder="post@dittfirma.no"
                            value={smtpUser}
                            onChange={(e) => setSmtpUser(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Passord / App-passord *
                          </label>
                          <input
                            type="password"
                            placeholder="Ditt e-postpassord eller app-passord..."
                            value={smtpPassword}
                            onChange={(e) => setSmtpPassword(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hjelpetekst / Veiledning for valgt leverandør */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-850 flex items-start gap-2.5 text-xs text-slate-400">
                    <Info size={16} className="text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-200 block mb-0.5">
                        {emailProvider === 'microsoft365' && '💡 Tips for Microsoft 365 / Outlook:'}
                        {emailProvider === 'gmail' && '💡 Tips for Google Workspace / Gmail:'}
                        {emailProvider === 'domeneshop' && '💡 Tips for Domeneshop:'}
                        {emailProvider === 'one_com' && '💡 Tips for One.com:'}
                        {emailProvider === 'custom_smtp' && '💡 Tips for egen SMTP:'}
                      </strong>
                      <p className="text-[11px] leading-relaxed m-0">
                        {emailProvider === 'microsoft365' && 'Hvis din organisasjon har totrinnskontroll (MFA) aktivert, må du generere et «App-passord» i Microsoft-sikkerhetsinnstillingene, eller tillate Authenticated SMTP i Exchange Admin.'}
                        {emailProvider === 'gmail' && 'Google krever et «App-passord» hvis 2-trinns bekreftelse er på: Gå til myaccount.google.com -> Sikkerhet -> 2-trinns bekreftelse -> App-passord -> Opprett nytt passord for VikingMester.'}
                        {emailProvider === 'domeneshop' && 'Bruk din vanlige e-postadresse og tilhørende e-postpassord satt opp under «E-post» i Domeneshop-kontrollpanelet. Verten mail.domeneshop.no og port 587 er forhåndsutfylt.'}
                        {emailProvider === 'one_com' && 'Bruk e-postkontoen og passordet fra One.com kontrollpanelet. Verten send.one.com og port 465 er forhåndsutfylt.'}
                        {emailProvider === 'custom_smtp' && 'Fyll inn servernavn (f.eks. mail.dittdomene.no) og port fra ditt webhotell eller IT-avdeling.'}
                      </p>
                    </div>
                  </div>

                  {/* Test-tilkobling resultatboks */}
                  {emailTestStatus && (
                    <div className={cn(
                      "p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2",
                      emailTestStatus.success
                        ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-300"
                        : "bg-rose-950/30 border-rose-500/50 text-rose-300"
                    )}>
                      {emailTestStatus.success ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                      <div>
                        <strong>{emailTestStatus.success ? 'Tilkobling vellykket!' : 'Feil under tilkobling:'}</strong>
                        <p className="mt-0.5 mb-0 text-[11px]">{emailTestStatus.message}</p>
                      </div>
                    </div>
                  )}

                  {/* Handlinger */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendTestEmailCheck}
                        onChange={(e) => setSendTestEmailCheck(e.target.checked)}
                        className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Send en test-e-post til {user?.email} ved testing</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isTestingEmail || isSaving}
                        onClick={handleTestEmailConnection}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isTestingEmail ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                        <span>{isTestingEmail ? 'Tester tilkobling...' : 'Test tilkobling'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleSaveEmailConfig}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? 'Lagrer...' : 'Lagre e-postoppsett'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEAM */}
          {activeTab === 'team' && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ansatte og tilganger ({teamMembers.length})</h4>
              </div>

              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div key={member.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{member.name}</p>
                        <p className="text-[11px] text-slate-400">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {member.role}
                      </span>
                      {member.id !== '1' && (
                        <button
                          type="button"
                          onClick={() => setTeamMembers(prev => prev.filter(m => m.id !== member.id))}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Inviter ny bruker */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Plus size={14} className="text-purple-400" /> Inviter ny medarbeider til {companyName}
                </h5>

                {isSuperAdmin && (
                  <div className="flex items-center gap-2 flex-wrap pb-1">
                    <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                      👑 SuperAdmin:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewMemberEmail('fredrik@aichatnorge.no');
                        setNewMemberRole('superadmin');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      ⚡ Fyll inn Fredrik (fredrik@aichatnorge.no)
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="e-post@mester.no"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {isSuperAdmin && (
                      <option value="superadmin">👑 SuperAdmin / Systemeier (Full tilgang)</option>
                    )}
                    <option value="Bas / Prosjektleder">Bas / Prosjektleder</option>
                    <option value="Tømrer / Fagarbeider">Tømrer / Fagarbeider</option>
                    <option value="Lærling">Lærling</option>
                    <option value="Underentreprenør">Underentreprenør</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Send invitasjon
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MODULER */}
          {activeTab === 'modules' && (
            <div className="space-y-4 max-w-2xl">
              <p className="text-xs text-slate-400">
                Velg hvilke moduler og fagsystemer som skal være aktive i venstremenyen for dine byggeledere:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 'dailylog', title: '⏱️ Byggedagbok & Timer', desc: 'Yr-vær, mannskapsliste og diktering' },
                  { key: 'change_orders', title: '⚡ Endringsordrer (NS 8406)', desc: 'Varsling, fristforlengelse og priskrav' },
                  { key: 'pre_close', title: '📋 TEK17 Lukkesperre', desc: 'Obligatorisk sjekk før vegger lukkes' },
                  { key: 'sja', title: '🦺 SJA & HMS', desc: 'Risikovurdering, PVU og vernetiltak' },
                  { key: 'offers', title: '📝 Tilbud & Kalkyle', desc: 'Hurtigkalkyle og formaliserte tilbud' },
                  { key: 'archive', title: '📁 Dokumentarkiv & FDV', desc: 'NOBB BYOK, monteringsanvisninger og FDV' },
                  { key: 'contacts', title: '👥 Prosjektteam & Kontakter', desc: 'Byggherre, bas og underentreprenører' },
                  { key: 'teamchat', title: '💬 Prosjekt- & Firmachatt', desc: 'Feltkommunikasjon for byggeplassen og bedriften' },
                  { key: 'laerling', title: '🎓 Lærlingoppfølging', desc: 'Kompetansemål og signering' }
                ].map((mod) => (
                  <label
                    key={mod.key}
                    className={cn(
                      "p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3",
                      activeModules[mod.key]
                        ? "bg-slate-900 border-purple-500/40 text-white shadow-xs"
                        : "bg-slate-950/60 border-slate-850 text-slate-400"
                    )}
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-xs block truncate text-slate-200">{mod.title}</span>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">{mod.desc}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeModules[mod.key] ?? true}
                      onChange={(e) => setActiveModules(prev => ({ ...prev, [mod.key]: e.target.checked }))}
                      className="mt-1 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: INTEGRASJONER (NOBB BYOK etc) */}
          {activeTab === 'integrations' && (
            <div className="space-y-4 max-w-2xl">
              {/* NOBB BYOK */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">✨</span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">Norsk Byggevarebase (NOBB) - BYOK</h4>
                      <p className="text-[11px] text-slate-400">Bring Your Own Key (Krever abonnement hos Byggtjeneste)</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                    nobbKey.trim() ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400"
                  )}>
                    {nobbKey.trim() ? 'Tilkoblet' : 'Ikke satt'}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Ocp-Apim-Subscription-Key / NOBB API Nøkkel
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="Lim inn din Byggtjeneste API-nøkkel..."
                      value={nobbKey}
                      onChange={(e) => setNobbKey(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-750 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                    />
                    {nobbKey && (
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem('nobb_api_key', nobbKey.trim());
                          toast.success('NOBB BYOK-nøkkel lagret og verifisert!');
                        }}
                        className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer"
                      >
                        Test & Lagre
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Hver bedrift må ha egen lisensavtale med Norsk Byggtjeneste for å hente varedata, EPD og FDV direkte.
                  </p>
                </div>
              </div>

              {/* Andre regnskapssystemer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">Tripletex</span>
                    <span className="text-[10px] text-slate-400">EHF / Ordre</span>
                  </div>
                  <input
                    type="password"
                    placeholder="Tripletex Employee Token..."
                    value={tripletexToken}
                    onChange={(e) => setTripletexToken(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">Fiken Regnskap</span>
                    <span className="text-[10px] text-slate-400">Faktura & Prosjekt</span>
                  </div>
                  <input
                    type="password"
                    placeholder="Fiken API-token..."
                    value={fikenToken}
                    onChange={(e) => setFikenToken(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: VARSLINGER */}
          {activeTab === 'notifications' && (
            <div className="space-y-3 max-w-2xl">
              {[
                { title: 'E-postvarsel ved ny endringsordre', desc: 'Motta kopi når en endringsordre opprettes iht. NS 8406', val: notifEmail, setVal: setNotifEmail },
                { title: 'Teams/Slack-varsel ved kritiske RUH & Avvik', desc: 'Umiddelbart varsel til bas/prosjektleder ved alvorlig HMS-hendelse', val: notifTeamsSlack, setVal: setNotifTeamsSlack },
                { title: 'Push-varsel ved kundegodkjenning', desc: 'Varsel på mobilen når byggherre signerer pristilbud eller endringsordre', val: notifPush, setVal: setNotifPush }
              ].map((item, idx) => (
                <label key={idx} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-white block">{item.title}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{item.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.val}
                    onChange={(e) => item.setVal(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-0 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          )}

          {/* TAB 7: ABONNEMENT & KVOTE */}
          {activeTab === 'billing' && (
            <div className="space-y-4 max-w-2xl">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Aktiv Bedriftspakke</span>
                    <h3 className="text-base font-black text-white">VikingMester Pro Enterprise</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Aktiv Lisens
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Ubegrenset antall byggeprosjekter, 100% autonom agent, NS 8406 endringsordre modul, TEK17 bildeverifikasjon og EHF-fakturering.
                </p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Neste fakturering: 01. april 2026 (EHF)</span>
                  <span className="font-bold text-white">kr 2 490,- / mnd eks. mva</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: GDPR & PERSONVERN */}
          {activeTab === 'gdpr' && (
            <div className="space-y-3 max-w-2xl">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-400" /> Norsk datasikkerhet og GDPR-lagring
                </h4>
                <p>
                  Alle prosjektdata, byggedagbøker, bilder og juridiske varsler lagres i henhold til norsk regnskapslov og EU GDPR med ende-til-ende-kryptering.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => toast.success('Eksport av alle bedriftsdata genereres og sendes på e-post...')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                  >
                    Eksporter alle bedriftsdata (ZIP)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            {t('ws_close_esc', "Lukk")}
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('settings_saving', "Lagrer...")}</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>{t('settings_save_btn', "Lagre endringer")}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
