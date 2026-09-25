import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, Shield, Building2, Users, ArrowRight, AlertCircle, LogIn, UserPlus, Lock, Mail, User as UserIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db, collection, query, where, getDocs, doc, updateDoc, setDoc, handleFirestoreError, OperationType, setCurrentAuthUser } from '../services/firebase';
import { Invitation, UserProfile } from '../types';
import { toast } from 'sonner';

interface InviteAcceptancePageProps {
  token: string;
}

const InviteAcceptancePage: React.FC<InviteAcceptancePageProps> = ({ token }) => {
  const { user, loginWithEmail, registerWithEmail } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auth form state for unauthenticated recipients
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Persist token in localStorage in case user needs to reload or navigate
  useEffect(() => {
    if (token) {
      try {
        localStorage.setItem('pending_invite_token', token);
      } catch (e) {
        console.warn('Could not store pending invite token', e);
      }
    }
  }, [token]);

  useEffect(() => {
    async function fetchInvitation() {
      try {
        let inviteData: Invitation | null = null;

        // Method 1: Query through db adapter (which now attaches ?token=)
        try {
          const q = query(collection(db, 'invitations'), where('token', '==', token));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            inviteData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Invitation;
          }
        } catch (dbErr) {
          console.warn('db query failed, attempting direct REST fetch:', dbErr);
        }

        // Method 2: Direct REST fetch fallback
        if (!inviteData) {
          const res = await fetch(`/api/data/invitations?token=${encodeURIComponent(token)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              inviteData = data[0] as Invitation;
            } else if (data && data.token === token) {
              inviteData = data as Invitation;
            }
          }
        }

        if (!inviteData) {
          setError('Invitasjonen ble ikke funnet eller er ugyldig.');
          return;
        }

        if (inviteData.status !== 'pending') {
          setError('Denne invitasjonen har allerede blitt akseptert eller er ikke lenger gyldig.');
          return;
        }

        if (inviteData.expiresAt && new Date(inviteData.expiresAt) < new Date()) {
          setError('Denne invitasjonen er utløpt.');
          return;
        }

        setInvitation(inviteData);
        if (inviteData.inviteeEmail) {
          setAuthEmail(inviteData.inviteeEmail);
        }
      } catch (err) {
        setError('Det oppstod en feil ved henting av invitasjonen.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      if (authMode === 'login') {
        if (!authEmail.trim() || !authPassword) {
          setAuthError('Vennligst oppgi både e-post og passord.');
          setAuthSubmitting(false);
          return;
        }
        await loginWithEmail(authEmail.trim(), authPassword);
        toast.success('Logget inn! Du kan nå akseptere invitasjonen.');
      } else {
        if (!authName.trim() || !authEmail.trim() || !authPassword) {
          setAuthError('Vennligst fyll ut navn, e-post og passord.');
          setAuthSubmitting(false);
          return;
        }
        await registerWithEmail(
          authEmail.trim(),
          authPassword,
          authName.trim(),
          invitation?.companyName || 'Bedrift',
          true
        );
        toast.success('Bruker opprettet! Du kan nå akseptere invitasjonen.');
      }
    } catch (err: any) {
      console.error('Auth error on invite acceptance:', err);
      setAuthError(err.message || 'Innlogging/registrering feilet. Vennligst sjekk opplysningene dine.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleAccept = async () => {
    if (!user || !invitation) return;
    setProcessing(true);

    try {
      // 1. Update user profile with assigned company & project
      const userRef = doc(db, 'users', user.uid);
      const existingProjects = (user as any).accessibleProjects || [];
      const updatedProjects = invitation.projectId && !existingProjects.includes(invitation.projectId)
        ? [...existingProjects, invitation.projectId]
        : (existingProjects.length > 0 ? existingProjects : (invitation.projectId ? [invitation.projectId] : []));

      const isSuper = invitation.role === 'superadmin' || 
        ['kenkri3@gmail.com', 'aichatnorge@gmail.com', 'kenneth@aichatnorge.no', 'fredrik.r.ellingsen@gmail.com', 'fredrik@aichatnorge.no'].includes((user.email || '').toLowerCase());
      const assignedRole = isSuper ? 'superadmin' : invitation.role;
      const assignedCompanyId = isSuper ? 'comp-001' : invitation.companyId;
      const assignedCompanyName = isSuper ? 'AIChat Norge AS / Vikingnet' : invitation.companyName;

      const userProfile: Partial<UserProfile> = {
        name: user.displayName || user.email?.split('@')[0] || (user.email?.includes('fredrik') ? 'Fredrik R. Ellingsen' : 'Bruker'),
        email: user.email || '',
        companyId: assignedCompanyId,
        companyName: assignedCompanyName,
        role: assignedRole,
        accessibleProjects: updatedProjects,
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, userProfile, { merge: true });

      // 2. Update cached auth user in localStorage
      const updatedAuthUser = {
        ...user,
        companyId: assignedCompanyId,
        company: assignedCompanyName,
        role: assignedRole,
        accessibleProjects: updatedProjects
      };
      setCurrentAuthUser(updatedAuthUser);

      // 3. Mark invitation as accepted
      const inviteRef = doc(db, 'invitations', invitation.id);
      await updateDoc(inviteRef, {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        acceptedBy: user.uid
      });

      // 4. Remember project for auto-selection in dashboard
      if (invitation.projectId) {
        localStorage.setItem('last_selected_project', invitation.projectId);
      }
      localStorage.removeItem('pending_invite_token');

      toast.success('Invitasjon akseptert!');
      setSuccess(true);

      // Redirect to root application after 1.8 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 1800);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'invitations');
      console.error('Accept error:', err);
      setError('Det oppstod en feil ved aksept av invitasjonen.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Henter invitasjon...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md w-full text-center border border-slate-100"
        >
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Ugyldig Invitasjon</h1>
          <p className="text-slate-500 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-sm"
          >
            Gå til forsiden
          </button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md w-full text-center border border-emerald-100"
        >
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Velkommen til teamet!</h1>
          <p className="text-slate-600 mb-6 text-sm">
            Du har nå akseptert invitasjonen til <strong className="text-slate-900">{invitation?.companyName}</strong>. 
            Videresender deg til prosjektet...
          </p>
          <div className="flex justify-center items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
            <Loader2 className="w-4 h-4 animate-spin" />
            Laster inn dashbord
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-xl border border-slate-100 max-w-xl w-full overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-emerald-100/60 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 text-center">
          <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
            <Building2 size={32} />
          </div>
          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            Team-invitasjon
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
            {invitation?.companyName}
          </h1>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            <strong className="text-slate-900">{invitation?.inviterName || 'Byggeleder'}</strong> har invitert deg til å samarbeide i VikingMester.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Key Details Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rolle</p>
                <p className="font-bold text-slate-800 text-sm capitalize">
                  {invitation?.role === 'superadmin' ? '👑 SuperAdmin / Systemeier (Full tilgang)' :
                   invitation?.role === 'external_worker' ? 'Ekstern Håndverker' :
                   invitation?.role === 'external_manager' ? 'Prosjektleder' :
                   invitation?.role === 'worker' ? 'Fagmedarbeider' :
                   invitation?.role === 'manager' ? 'Driftsleder' :
                   invitation?.role.replace('_', ' ')}
                </p>
              </div>
            </div>
            
            {invitation?.projectName && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prosjekt</p>
                  <p className="font-bold text-slate-800 text-sm truncate max-w-[170px]" title={invitation.projectName}>
                    {invitation.projectName}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* User state handling */}
          {!user ? (
            <div className="space-y-4 pt-2">
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                    authMode === 'login'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <LogIn size={16} />
                  Logg inn
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                    authMode === 'register'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <UserPlus size={16} />
                  Opprett ny konto
                </button>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Fullt navn</label>
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="F.eks. Ola Nordmann"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">E-postadresse</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="din@epost.no"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Passord</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full mt-2 py-3.5 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-200 text-sm disabled:opacity-50"
                >
                  {authSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : authMode === 'login' ? (
                    <>
                      <LogIn size={16} />
                      Logg inn og gå videre
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Opprett konto og gå videre
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <a
                  href={`/?invite=${encodeURIComponent(token)}&login=true`}
                  className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
                >
                  Eller gå til hovedinnlogging på vikingmester.no
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              <div className="flex items-center gap-3 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">Logget inn som</p>
                  <p className="font-bold text-slate-900 text-sm truncate">{user.displayName || user.email}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>

              <button 
                onClick={handleAccept}
                disabled={processing}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-200 text-base disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Kobler til prosjekt...
                  </>
                ) : (
                  <>
                    Aksepter Invitasjon
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default InviteAcceptancePage;

