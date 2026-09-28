import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Send, Link as LinkIcon, Users, Shield, CheckCircle2, Building2, UserCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { Project, UserProfile } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db, auth, collection, addDoc, serverTimestamp, OperationType, handleFirestoreError, doc, getDoc } from '../services/firebase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project; // Optional for company-level invites
}

type InviteRole = 'superadmin' | 'admin' | 'manager' | 'worker' | 'external_worker' | 'external_manager';

const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, project }) => {
  const { user, isSuperAdmin, isPlatformOwner } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>(project ? 'external_worker' : 'worker');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchUserProfile() {
      const activeUser = user || auth.currentUser;
      if (!activeUser) return;
      try {
        const uid = (activeUser as any).uid || (activeUser as any).id;
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    }
    if (isOpen) {
      fetchUserProfile();
      setCopied(false);
      setEmailSent(false);
    }
  }, [isOpen, user]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeUser = user || auth.currentUser;
    if (!activeUser) {
      toast.error('Du må være innlogget for å opprette en invitasjon.');
      return;
    }
    setLoading(true);

    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const inviterName = activeUser.displayName || userProfile?.name || 'Byggeleder';
      const isSuper = role === 'superadmin' || email.trim().toLowerCase() === 'fredrik@aichatnorge.no' || email.trim().toLowerCase() === 'fredrik.r.ellingsen@gmail.com';
      const companyId = isSuper ? 'comp-001' : ((activeUser as any).companyId || userProfile?.companyId || (project as any)?.companyId || 'company_default');
      const companyName = isSuper ? 'AIChat Norge AS / Vikingnet' : ((activeUser as any).company || userProfile?.companyName || (project as any)?.companyName || 'Bedrift');
      const inviterUid = (activeUser as any).uid || (activeUser as any).id;

      const inviteData = {
        projectId: isSuper ? null : (project?.id || null),
        projectName: isSuper ? null : (project?.name || null),
        companyId,
        companyName,
        inviterId: inviterUid,
        inviterName,
        inviteeEmail: email.trim(),
        role: isSuper ? 'superadmin' : role,
        status: 'pending',
        token: token,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dager
      };

      await addDoc(collection(db, 'invitations'), inviteData);
      
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vikingmester.no';
      // Use query parameter which works instantly across any hosting / SPA router
      const link = `${baseUrl}/?invite=${token}`;
      setInviteLink(link);
      setSuccess(true);

      // Send automated email if email address was provided
      if (email.trim()) {
        try {
          const roleTitle = isSuper 
            ? 'SuperAdmin & Systemeier' 
            : role === 'external_worker' 
            ? 'håndverker' 
            : role === 'external_manager' 
            ? 'prosjektleder' 
            : 'medarbeider';
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          const res = await fetch('/api/notify/email', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': 'Bearer ' + token } : {})
            },
            body: JSON.stringify({
              to: email.trim(),
              subject: isSuper 
                ? `👑 Invitasjon som SuperAdmin & Systemeier i VikingMester` 
                : `Invitasjon til ${project ? `prosjektet "${project.name}"` : companyName}`,
              content: `Hei!\n\nDu har blitt invitert av ${inviterName} til å delta på ${project ? `prosjektet "${project.name}"` : companyName} i VikingMester som ${roleTitle}.\n\nKlikk på lenken under for å åpne og akseptere invitasjonen:\n${link}\n\nLenken er gyldig i 14 dager.\n\nMed vennlig hilsen,\n${companyName} / VikingMester`,
              html: isSuper ? `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #fde68a; border-radius: 14px;">
                  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 24px; border-radius: 12px; color: white; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                    <div style="display: inline-block; background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px;">
                      👑 SuperAdmin & Systemeier
                    </div>
                    <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Invitasjon til VikingMester</h2>
                    <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 13px;">AIChat Norge AS / Vikingnet</p>
                  </div>
                  <p style="font-size: 15px;">Hei!</p>
                  <p style="font-size: 14px; line-height: 1.6;">
                    <strong>${inviterName}</strong> har invitert deg til å bli med som <strong>SuperAdmin & Systemeier</strong> i VikingMester med full plattformeiertilgang.
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
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 26px auto;">
                    <tr>
                      <td align="center" bgcolor="#d97706" style="background-color: #d97706; border-radius: 10px; border: 2px solid #b45309;">
                        <a href="${link}" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: bold; color: #ffffff !important; text-decoration: none; line-height: 1.2;">
                          <span style="color: #ffffff !important; font-weight: bold;">👉 Opprett din SuperAdmin-bruker nå</span>
                        </a>
                      </td>
                    </tr>
                  </table>
                  <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin: 18px 0; font-size: 12px; color: #64748b; word-break: break-all; text-align: left;">
                    Fungerer ikke knappen? Kopier og lim inn denne lenken i nettleseren:<br/>
                    <a href="${link}" style="color: #d97706; text-decoration: underline;">${link}</a>
                  </div>
                  <p style="font-size: 12px; color: #64748b; text-align: center;">Lenken er gyldig i 14 dager. Ved spørsmål kan du kontakte ${inviterName}.</p>
                </div>
              ` : `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px;">
                  <div style="background: #0f172a; padding: 20px; border-radius: 10px; color: white; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 18px;">Invitasjon til VikingMester</h2>
                    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">${companyName} ${project ? `• ${project.name}` : ''}</p>
                  </div>
                  <p>Hei!</p>
                  <p>Du har blitt invitert av <strong>${inviterName}</strong> til å delta på <strong>${project ? `prosjektet "${project.name}"` : companyName}</strong> som <em>${roleTitle}</em>.</p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 26px auto;">
                    <tr>
                      <td align="center" bgcolor="#059669" style="background-color: #059669; border-radius: 10px; border: 2px solid #047857;">
                        <a href="${link}" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff !important; text-decoration: none; line-height: 1.2;">
                          <span style="color: #ffffff !important; font-weight: bold;">👉 Åpne og godkjenn invitasjonen</span>
                        </a>
                      </td>
                    </tr>
                  </table>
                  <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin: 18px 0; font-size: 12px; color: #64748b; word-break: break-all; text-align: left;">
                    Fungerer ikke knappen? Kopier og lim inn denne lenken i nettleseren:<br/>
                    <a href="${link}" style="color: #059669; text-decoration: underline;">${link}</a>
                  </div>
                  <p style="font-size: 12px; color: #64748b;">Lenken er gyldig i 14 dager. Ved spørsmål kan du kontakte ${inviterName}.</p>
                </div>
              `
            })
          });
          if (res.ok) {
            setEmailSent(true);
            toast.success(`Invitasjon er sendt på e-post til ${email.trim()}!`);
          } else {
            const errData = await res.json().catch(() => ({}));
            console.warn('Could not dispatch invite email:', errData);
            toast.warning(`Invitasjonslenke opprettet, men e-posten kunne ikke leveres: ${errData.error || errData.message || 'Ukjent feil'}. Du kan kopiere lenken manuelt.`);
          }
        } catch (err: any) {
          console.warn('Could not dispatch invite email:', err);
          toast.warning('Invitasjonslenke opprettet, men kunne ikke koble til e-posttjenesten. Kopier lenken.');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invitations');
      toast.error('Kunne ikke opprette invitasjon. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!inviteLink) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(inviteLink);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = inviteLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      toast.success('Invitasjonslenke kopiert til utklippstavlen!');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      toast.error('Kunne ikke kopiere automatisk. Marker teksten i feltet for å kopiere.');
    }
  };

  if (!isOpen) return null;

  const roles: { id: InviteRole; label: string; desc: string; icon: React.ReactNode }[] = project 
    ? [
        { id: 'external_worker', label: 'Håndverker', desc: 'Kun tilgang til dette prosjektet', icon: <Users size={16} /> },
        { id: 'external_manager', label: 'Prosjektleder', desc: 'Full kontroll over dette prosjektet', icon: <Shield size={16} /> },
      ]
    : [
        ...(isSuperAdmin || isPlatformOwner || user?.role === 'superadmin' ? [{ id: 'superadmin' as InviteRole, label: '👑 SuperAdmin / Systemeier', desc: 'Full tilgang til alt (samme som deg)', icon: <Shield size={16} className="text-amber-500" /> }] : []),
        { id: 'admin', label: 'Administrator', desc: 'Full tilgang til alt i firmaet', icon: <Shield size={16} /> },
        { id: 'manager', label: 'Leder', desc: 'Kan styre prosjekter og ansatte', icon: <UserCircle size={16} /> },
        { id: 'worker', label: 'Ansatt', desc: 'Tilgang til egne prosjekter', icon: <Users size={16} /> },
      ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0B0F17] text-white border border-slate-800 w-full max-w-md rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-[#131722] shrink-0">
          <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto -mt-1 mb-3 shrink-0" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-950/50">
                {project ? <Users size={18} className="sm:w-5 sm:h-5" /> : <Building2 size={18} className="sm:w-5 sm:h-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-xl font-black text-white truncate">
                  {project ? 'Inviter til Prosjekt' : 'Inviter til Firma'}
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate">
                  {project ? `Ekstern bistand • ${project.name}` : userProfile?.companyName || 'Laster...'}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Lukk" className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white shrink-0 cursor-pointer">
              <X size={20} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 text-white">
          {success ? (
            <div className="text-center space-y-4 sm:space-y-6 py-2 sm:py-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={24} className="sm:w-8 sm:h-8" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-white">Invitasjon opprettet!</h4>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 sm:mt-2 font-medium">
                  {project 
                    ? 'Send denne linken til håndverkeren. De vil kun få tilgang til dette spesifikke prosjektet.'
                    : 'Send denne linken til den ansatte. De vil bli lagt til i firmaet med valgt rolle.'}
                </p>
              </div>
              
              <div 
                onClick={copyToClipboard}
                className="bg-slate-950 hover:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2 sm:gap-3 cursor-pointer transition-colors group"
                title="Klikk for å kopiere"
              >
                <input 
                  readOnly 
                  value={inviteLink}
                  onClick={(e) => { e.currentTarget.select(); copyToClipboard(); }}
                  className="bg-transparent border-none text-xs sm:text-sm font-mono text-white flex-1 focus:ring-0 truncate cursor-pointer select-all font-bold outline-none"
                />
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(); }}
                  className={cn(
                    "p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer",
                    copied ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                  )}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Kopiert!' : 'Kopier'}</span>
                </button>
              </div>

              {emailSent && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Invitasjon sendt automatisk på e-post til <strong>{email}</strong></span>
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button 
                  type="button"
                  onClick={copyToClipboard}
                  className="flex-1 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl sm:rounded-2xl font-bold transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/50"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Kopiert til utklippstavlen!' : 'Kopier invitasjonslenke'}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => window.open(inviteLink, '_blank')}
                  className="py-3 sm:py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl sm:rounded-2xl font-bold transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Åpne og test invitasjonen i en ny fane"
                >
                  <ExternalLink size={16} />
                  <span>Test lenke</span>
                </button>
              </div>

              <button 
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-slate-400 hover:text-white rounded-xl font-bold transition-all text-xs sm:text-sm cursor-pointer"
              >
                Lukk vindu
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-4 sm:space-y-5">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">E-postadresse</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 sm:w-[18px] sm:h-[18px]" size={16} />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all outline-none"
                      placeholder="navn@firma.no"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">Velg Rolle</label>
                  <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
                    {roles.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={cn(
                          "p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all text-left flex items-center gap-3 sm:gap-4 cursor-pointer",
                          role === r.id 
                            ? 'border-emerald-500 bg-emerald-950/30 shadow-xs' 
                            : 'border-slate-800 bg-[#131722] hover:border-slate-700 hover:bg-slate-800/40'
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          role === r.id ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'
                        )}>
                          {React.cloneElement(r.icon as React.ReactElement<any>, { size: 16, className: 'sm:w-5 sm:h-5' })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={cn(
                            "text-sm sm:text-base font-black truncate",
                            role === r.id ? "text-emerald-300" : "text-white"
                          )}>
                            {r.label}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 truncate font-medium">
                            {r.desc}
                          </div>
                        </div>
                        {role === r.id && (
                          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-amber-950/20 rounded-xl sm:rounded-2xl border border-amber-500/30 flex gap-2.5 sm:gap-3 text-amber-200">
                <Shield size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/90 leading-relaxed font-medium">
                  {project 
                    ? 'Ved å invitere en ekstern person gir du dem tilgang til prosjektets dokumenter, SJA-rapporter og avvik. De kan ikke se andre prosjekter i ditt firma.'
                    : 'Ved å invitere en ansatt gir du dem tilgang til firmaets ressurser basert på valgt rolle.'}
                </p>
              </div>

              <div className="pt-3 pb-1 border-t border-slate-800 bg-[#131722]">
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full py-3.5 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 text-sm sm:text-base cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
                      Generer Invitasjonslink
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default InviteModal;
