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

type InviteRole = 'admin' | 'manager' | 'worker' | 'external_worker' | 'external_manager';

const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, project }) => {
  const { user } = useAuth();
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
      const companyId = (activeUser as any).companyId || userProfile?.companyId || (project as any)?.companyId || 'company_default';
      const companyName = (activeUser as any).company || userProfile?.companyName || (project as any)?.companyName || 'Bedrift';
      const inviterUid = (activeUser as any).uid || (activeUser as any).id;

      const inviteData = {
        projectId: project?.id || null,
        projectName: project?.name || null,
        companyId,
        companyName,
        inviterId: auth.currentUser.uid,
        inviterName,
        inviteeEmail: email.trim(),
        role: role,
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
          const roleTitle = role === 'external_worker' ? 'håndverker' : role === 'external_manager' ? 'prosjektleder' : 'medarbeider';
          const res = await fetch('/api/notify/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email.trim(),
              subject: `Invitasjon til ${project ? `prosjektet "${project.name}"` : companyName}`,
              content: `
                Hei!
                
                Du har blitt invitert av ${inviterName} til å delta på ${project ? `prosjektet "${project.name}"` : companyName} i VikingMester som ${roleTitle}.
                
                Klikk på lenken under for å åpne og akseptere invitasjonen:
                ${link}
                
                Lenken er gyldig i 14 dager.
                
                Med vennlig hilsen,
                ${companyName} / VikingMester
              `
            })
          });
          if (res.ok) {
            setEmailSent(true);
            toast.success(`Invitasjon er sendt på e-post til ${email.trim()}!`);
          }
        } catch (err) {
          console.warn('Could not dispatch invite email:', err);
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
        { id: 'admin', label: 'Administrator', desc: 'Full tilgang til alt i firmaet', icon: <Shield size={16} /> },
        { id: 'manager', label: 'Leder', desc: 'Kan styre prosjekter og ansatte', icon: <UserCircle size={16} /> },
        { id: 'worker', label: 'Ansatt', desc: 'Tilgang til egne prosjekter', icon: <Users size={16} /> },
      ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="p-4 sm:p-8 border-b border-neutral-100 bg-emerald-50 shrink-0">
          <div className="sm:hidden w-12 h-1.5 bg-emerald-300/70 rounded-full mx-auto -mt-1 mb-3 shrink-0" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                {project ? <Users size={18} className="sm:w-5 sm:h-5" /> : <Building2 size={18} className="sm:w-5 sm:h-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-xl font-bold text-emerald-900 truncate">
                  {project ? 'Inviter til Prosjekt' : 'Inviter til Firma'}
                </h3>
                <p className="text-[10px] sm:text-xs text-emerald-700 font-bold uppercase tracking-wider truncate">
                  {project ? `Ekstern bistand • ${project.name}` : userProfile?.companyName || 'Laster...'}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Lukk" className="p-2 hover:bg-emerald-100 rounded-xl transition-colors text-emerald-900 shrink-0">
              <X size={20} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
          {success ? (
            <div className="text-center space-y-4 sm:space-y-6 py-2 sm:py-4">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={20} className="sm:w-8 sm:h-8" />
              </div>
              <div>
                <h4 className="text-sm sm:text-lg font-bold text-neutral-900">Invitasjon opprettet!</h4>
                <p className="text-[10px] sm:text-sm text-neutral-500 mt-1 sm:mt-2">
                  {project 
                    ? 'Send denne linken til håndverkeren. De vil kun få tilgang til dette spesifikke prosjektet.'
                    : 'Send denne linken til den ansatte. De vil bli lagt til i firmaet med valgt rolle.'}
                </p>
              </div>
              
              <div 
                onClick={copyToClipboard}
                className="bg-neutral-50 hover:bg-neutral-100/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-neutral-200 flex items-center gap-2 sm:gap-3 cursor-pointer transition-colors group"
                title="Klikk for å kopiere"
              >
                <input 
                  readOnly 
                  value={inviteLink}
                  onClick={(e) => { e.currentTarget.select(); copyToClipboard(); }}
                  className="bg-transparent border-none text-[10px] sm:text-xs font-mono text-neutral-800 flex-1 focus:ring-0 truncate cursor-pointer select-all font-bold"
                />
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(); }}
                  className={cn(
                    "p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer",
                    copied ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                  )}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Kopiert!' : 'Kopier'}</span>
                </button>
              </div>

              {emailSent && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Invitasjon sendt automatisk på e-post til <strong>{email}</strong></span>
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button 
                  type="button"
                  onClick={copyToClipboard}
                  className="flex-1 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl sm:rounded-2xl font-bold transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-100"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Kopiert til utklippstavlen!' : 'Kopier invitasjonslenke'}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => window.open(inviteLink, '_blank')}
                  className="py-3 sm:py-3.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl sm:rounded-2xl font-bold transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Åpne og test invitasjonen i en ny fane"
                >
                  <ExternalLink size={16} />
                  <span>Test lenke</span>
                </button>
              </div>

              <button 
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-neutral-500 hover:text-neutral-900 rounded-xl font-bold transition-all text-xs sm:text-sm cursor-pointer"
              >
                Lukk vindu
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-black text-neutral-400 uppercase tracking-wider mb-1.5 sm:mb-2">E-postadresse</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-neutral-400 sm:w-[18px] sm:h-[18px]" size={16} />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-neutral-50 border-none rounded-xl sm:rounded-2xl text-base sm:text-sm font-medium focus:ring-2 focus:ring-emerald-600 transition-all"
                      placeholder="navn@firma.no"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-black text-neutral-400 uppercase tracking-wider mb-1.5 sm:mb-2">Velg Rolle</label>
                  <div className="grid grid-cols-1 gap-2 sm:gap-3">
                    {roles.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all text-left flex items-center gap-3 sm:gap-4 ${
                          role === r.id 
                            ? 'border-emerald-600 bg-emerald-50' 
                            : 'border-neutral-100 bg-white hover:border-neutral-200'
                        }`}
                      >
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          role === r.id ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-400'
                        }`}>
                          {React.cloneElement(r.icon as React.ReactElement<any>, { size: 16, className: 'sm:w-5 sm:h-5' })}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm sm:text-base font-bold truncate">{r.label}</div>
                          <div className="text-xs sm:text-xs text-neutral-500 mt-0.5 truncate">{r.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-amber-50 rounded-xl sm:rounded-2xl border border-amber-100 flex gap-2.5 sm:gap-3">
                <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  {project 
                    ? 'Ved å invitere en ekstern person gir du dem tilgang til prosjektets dokumenter, SJA-rapporter og avvik. De kan ikke se andre prosjekter i ditt firma.'
                    : 'Ved å invitere en ansatt gir du dem tilgang til firmaets ressurser basert på valgt rolle.'}
                </p>
              </div>

              <div className="pt-4 pb-2 border-t border-neutral-100 mt-4 bg-white">
                <button
                  disabled={loading || !userProfile}
                  type="submit"
                  className="w-full py-3.5 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 text-sm sm:text-base cursor-pointer"
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
