import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { ShieldCheck, LogIn, ArrowLeft, Mail, Lock, User, Building, ArrowRight, Loader2, CheckSquare, Square, Terminal } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';

export default function Login({ onBack }: { onBack?: () => void }) {
  const { loginWithEmail, registerWithEmail, resetPassword, loading } = useAuth();
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'register') {
      if (password.length < 8) {
        setError('Passordet må bestå av minst 8 tegn av sikkerhetshensyn.');
        return;
      }
      if (!gdprConsent) {
        setError('Du må godta personvernerklæringen og brukervilkårene for å opprette en konto.');
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else if (mode === 'register') {
        await registerWithEmail(email, password, name, company, gdprConsent);
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setSuccess(t('reset_email_sent', 'E-post for tilbakestilling av passord er sendt. Sjekk innboksen din.'));
      }
    } catch (err: any) {
      setError(err.message || 'Noe gikk galt. Vennligst prøv igjen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090d] bg-tactical-grid bg-radial-amber flex items-center justify-center p-4 relative overflow-hidden text-slate-100 font-mono">
      {(onBack || mode !== 'login') && (
        <button 
          onClick={() => {
            if (mode !== 'login') {
              setMode('login');
              setError('');
              setSuccess('');
            } else if (onBack) {
              onBack();
            }
          }}
          className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors text-xs uppercase tracking-wider font-bold z-10 cursor-pointer"
        >
          <ArrowLeft size={16} />
          {t('back', 'Tilbake til forsiden')}
        </button>
      )}
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#0d1017]/95 border border-amber-500/30 rounded-2xl shadow-2xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl"
      >
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10 text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-bold uppercase tracking-widest">VIKINGMESTER ADGANGS-TERMINAL</span>
          </div>
          <span className="text-amber-400">AES-256</span>
        </div>

        <div className="flex flex-col items-center mb-6">
          <Logo size="lg" className="mb-3" />
          <p className="text-slate-400 text-xs text-center font-sans">
            {mode === 'login' 
              ? 'Logg inn med din autoriserte bedriftskonto.' 
              : mode === 'register'
              ? 'Opprett bedriftskonto med månedlig bedriftsfaktura.'
              : 'Oppgi din e-postadresse for å motta tilbakestillingslenke.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                key="register-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    placeholder="Fullt navn (daglig leder/kontaktperson)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white focus:border-amber-500 outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    placeholder="Bedriftsnavn (Foretak)"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white focus:border-amber-500 outline-none transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="email"
              placeholder="E-postadresse (jobbadresse)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white focus:border-amber-500 outline-none transition-all"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="password"
                placeholder={mode === 'register' ? 'Passord (minst 8 tegn)' : 'Passord'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 8 : 1}
                className="w-full pl-10 pr-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white focus:border-amber-500 outline-none transition-all"
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="bg-black/40 p-3.5 rounded-xl border border-white/5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none text-[11px] text-slate-400 leading-relaxed font-sans">
                <input
                  type="checkbox"
                  checked={gdprConsent}
                  onChange={(e) => setGdprConsent(e.target.checked)}
                  required
                  className="mt-0.5 accent-amber-500"
                />
                <span>
                  Jeg godtar VikingMester sine forretningsvilkår, databehandleravtale (DPA) og personvernerklæring.
                </span>
              </label>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end items-center px-1">
              <button 
                type="button"
                onClick={() => setMode('forgot')}
                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
              >
                Glemt passord?
              </button>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="p-2.5 rounded bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black uppercase tracking-wider text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <span>{mode === 'login' ? 'Logg inn på Dashboard' : mode === 'register' ? 'Opprett Bedriftskonto' : 'Send Tilbakestilling'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <>
              Har du ikke konto ennå?{' '}
              <button 
                onClick={() => setMode('register')}
                className="text-amber-400 font-bold hover:underline cursor-pointer"
              >
                Registrer bedrift her
              </button>
            </>
          ) : (
            <>
              Har du allerede en konto?{' '}
              <button 
                onClick={() => setMode('login')}
                className="text-amber-400 font-bold hover:underline cursor-pointer"
              >
                Logg inn her
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
