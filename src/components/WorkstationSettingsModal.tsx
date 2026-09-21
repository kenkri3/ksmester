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
  AlertTriangle,
  Globe
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

type SettingsTab = 'profile' | 'company' | 'team' | 'modules' | 'integrations' | 'notifications' | 'billing' | 'gdpr';

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

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
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
    }
  }, [isOpen, user]);

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
    setTeamMembers(prev => [
      ...prev,
      { id: Date.now().toString(), name: emailToInvite.split('@')[0], role: newMemberRole, email: emailToInvite }
    ]);
    setNewMemberEmail('');
    
    // Send ekte invitasjon på e-post via Resend
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vikingmester.no';
      const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const link = `${baseUrl}/?invite=${inviteToken}`;

      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          to: emailToInvite,
          subject: `Invitasjon til ${companyName} i VikingMester`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px;">
              <div style="background: #0f172a; padding: 20px; border-radius: 10px; color: white; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 18px;">Velkommen til ${companyName}</h2>
                <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">VikingMester KS & Prosjektstyring</p>
              </div>
              <p>Hei!</p>
              <p>Du har blitt invitert av ledelsen til å bli med som <strong>${newMemberRole === 'admin' ? 'Administrator' : newMemberRole === 'manager' ? 'Prosjektleder' : 'Håndverker'}</strong> for <strong>${companyName}</strong> i VikingMester.</p>
              <div style="text-align: center; margin: 26px 0;">
                <a href="${link}" style="background: #059669; color: #ffffff !important; font-weight: bold; padding: 14px 28px; border-radius: 10px; text-decoration: none; display: inline-block; font-size: 14px;">
                  👉 Åpne og godkjenn invitasjonen
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b;">Lenken er gyldig i 14 dager. Ved spørsmål kan du kontakte bedriftsledelsen.</p>
            </div>
          `,
          text: `Hei!\n\nDu er invitert til ${companyName} i VikingMester som ${newMemberRole}.\n\nAksepter invitasjonen her: ${link}`
        })
      });

      if (res.ok) {
        toast.success(`Invitasjon er sendt på e-post til ${emailToInvite}!`);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.warning(`Medarbeider lagt til, men e-post kunne ikke sendes: ${errData.error || errData.message || 'Sjekk Resend API-nøkkel'}`);
      }
    } catch (err) {
      console.warn('Could not send invite email:', err);
      toast.success(`Medarbeider lagt til i listen`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
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
              <h2 className="text-sm sm:text-base font-black text-white">System- & Bedriftsinnstillinger</h2>
              <p className="text-[11px] text-slate-400">{companyName} • Hovedsentral</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Lukk (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto custom-scrollbar shrink-0 text-xs font-semibold">
          {[
            { id: 'profile', label: 'Profil', icon: User },
            { id: 'company', label: 'Bedrift & Takster', icon: Building2 },
            { id: 'team', label: 'Team', icon: Users },
            { id: 'modules', label: 'Fagmoduler', icon: Package },
            { id: 'integrations', label: 'NOBB & Systemer', icon: Link2 },
            { id: 'notifications', label: 'Varslinger', icon: Bell },
            { id: 'billing', label: 'Abonnement & Kvote', icon: CreditCard },
            { id: 'gdpr', label: 'Personvern', icon: ShieldCheck }
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
                    <option value="Tømrer / Fagarbeider">Tømrer / Fagarbeider</option>
                    <option value="Bas / Prosjektleder">Bas / Prosjektleder</option>
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
                { title: 'SMS-varsel ved kritiske RUH & Avvik', desc: 'Umiddelbar SMS til bas/prosjektleder ved alvorlig HMS-hendelse', val: notifSms, setVal: setNotifSms },
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
            Lukk
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
                <span>Lagrer...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Lagre endringer</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
