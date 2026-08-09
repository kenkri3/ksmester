import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, Shield, Building2, Users, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db, collection, query, where, getDocs, doc, updateDoc, setDoc, handleFirestoreError, OperationType } from '../services/firebase';
import { Invitation, UserProfile } from '../types';

interface InviteAcceptancePageProps {
  token: string;
}

const InviteAcceptancePage: React.FC<InviteAcceptancePageProps> = ({ token }) => {
  const { user, login } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const q = query(collection(db, 'invitations'), where('token', '==', token));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setError('Invitasjonen ble ikke funnet eller er ugyldig.');
          return;
        }

        const inviteData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Invitation;
        
        if (inviteData.status !== 'pending') {
          setError('Denne invitasjonen har allerede blitt brukt eller er utløpt.');
          return;
        }

        if (new Date(inviteData.expiresAt) < new Date()) {
          setError('Denne invitasjonen er utløpt.');
          return;
        }

        setInvitation(inviteData);
      } catch (err) {
        setError('Det oppstod en feil ved henting av invitasjonen.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!user || !invitation) return;
    setProcessing(true);

    try {
      // 1. Update user profile
      const userRef = doc(db, 'users', user.uid);
      const userProfile: Partial<UserProfile> = {
        name: user.displayName || '',
        email: user.email || '',
        companyId: invitation.companyId,
        companyName: invitation.companyName,
        role: invitation.role,
        updatedAt: new Date().toISOString()
      };

      if (invitation.projectId) {
        userProfile.accessibleProjects = [invitation.projectId];
      }

      await setDoc(userRef, userProfile, { merge: true });

      // 2. Update invitation status
      const inviteRef = doc(db, 'invitations', invitation.id);
      await updateDoc(inviteRef, {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        acceptedBy: user.uid
      });

      setSuccess(true);
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
      setError('Det oppstod en feil ved aksept av invitasjonen.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Ugyldig Invitasjon</h1>
          <p className="text-neutral-500 mb-8">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all"
          >
            Gå til forsiden
          </button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Velkommen!</h1>
          <p className="text-neutral-500 mb-8">
            Du har nå akseptert invitasjonen til {invitation?.companyName}. 
            Du blir videresendt til dashbordet om et øyeblikk...
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden"
      >
        <div className="p-10 border-b border-neutral-100 bg-emerald-50 text-center">
          <div className="w-20 h-20 bg-emerald-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-100 rotate-3">
            <Building2 size={40} />
          </div>
          <h1 className="text-3xl font-bold text-emerald-900 mb-2">Invitasjon til {invitation?.companyName}</h1>
          <p className="text-emerald-700 font-medium">
            {invitation?.inviterName} har invitert deg til å bli med i deres team.
          </p>
        </div>

        <div className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm mb-4">
                <Shield size={20} />
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">Rolle</h3>
              <p className="text-sm text-neutral-500 capitalize">{invitation?.role.replace('_', ' ')}</p>
            </div>
            
            {invitation?.projectName && (
              <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm mb-4">
                  <Users size={20} />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Prosjekt</h3>
                <p className="text-sm text-neutral-500">{invitation.projectName}</p>
              </div>
            )}
          </div>

          {!user ? (
            <div className="space-y-6">
              <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-start gap-4">
                <AlertCircle className="text-blue-600 shrink-0 mt-1" size={20} />
                <p className="text-sm text-blue-800 leading-relaxed">
                  Du må logge inn for å akseptere denne invitasjonen. Vi vil koble din konto til {invitation?.companyName}.
                </p>
              </div>
              <button 
                onClick={login}
                className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-100"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Logg inn med Google
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                  <img 
                    src={user.photoURL || `https://picsum.photos/seed/${user.uid}/48/48`} 
                    alt="" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Logger inn som</p>
                  <p className="font-bold text-neutral-900">{user.displayName}</p>
                  <p className="text-xs text-neutral-500">{user.email}</p>
                </div>
              </div>

              <button 
                onClick={handleAccept}
                disabled={processing}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
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
