import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { ShieldCheck, LogIn, ArrowLeft, Mail, Lock, User, Building, ArrowRight, Loader2, Hash } from 'lucide-react';
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
  const [orgnr, setOrgnr] = useState('');
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
        await registerWithEmail(email, password, name, company, gdprConsent, orgnr);
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden text-navy-900 font-sans">
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
          className="absolute top-6 left-6 flex items-center gap-2 text-slate-600 hover:text-navy-900 transition-colors text-xs uppercase tracking-wider font-bold z-10 cursor-pointer"
        >
          <ArrowLeft size={16} />
          {t('back', 'Tilbake til forsiden')}
        </button>
      )}
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-card-hover p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl"
      >
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700 font-bold uppercase tracking-widest text-[11px]">VIKINGMESTER ADGANGS-TERMINAL</span>
          </div>
          <span className="text-electric-600 font-bold text-xs bg-electric-50 px-2 py-0.5 rounded-full border border-electric-200">AES-256</span>
        </div>

        <div className="flex flex-col items-center mb-6">
          <Logo size="lg" className="mb-3" />
          <p className="text-slate-600 text-xs sm:text-sm text-center font-sans leading-relaxed">
            {mode === 'login' 
              ? 'Logg inn med din autoriserte bedriftskonto.' 
              : mode === 'register'
              ? 'Opprett bedriftskonto med månedlig bedriftsfaktura.'
              : 'Oppgi din e-postadresse for å motta tilbakestillingslenke.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
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
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="text"
                    placeholder="Fullt navn (daglig leder/kontaktperson)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all"
                  />
                </div>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="text"
                    placeholder="Bedriftsnavn (Foretak)"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all"
                  />
                </div>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="text"
                    placeholder="Organisasjonsnummer (9 siffer)"
                    value={orgnr}
                    onChange={(e) => setOrgnr(e.target.value)}
                    maxLength={12}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all font-mono"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="email"
              placeholder="E-postadresse (jobbadresse)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                type="password"
                placeholder={mode === 'register' ? 'Passord (minst 8 tegn)' : 'Passord'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 8 : 1}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm transition-all"
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-slate-600 leading-relaxed font-sans">
                <input
                  type="checkbox"
                  checked={gdprConsent}
                  onChange={(e) => setGdprConsent(e.target.checked)}
                  required
                  className="mt-0.5 accent-electric-500"
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
                className="text-xs text-electric-600 font-bold hover:underline cursor-pointer"
              >
                Glemt passord?
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold text-sm shadow-purple-cta hover:shadow-purple-hover transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <span>{mode === 'login' ? 'Logg inn på Dashboard' : mode === 'register' ? 'Opprett Bedriftskonto' : 'Send Tilbakestilling'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
          {mode === 'login' ? (
            <>
              Har du ikke konto ennå?{' '}
              <button 
                onClick={() => setMode('register')}
                className="text-electric-600 font-bold hover:underline cursor-pointer ml-1"
              >
                Registrer bedrift her
              </button>
            </>
          ) : (
            <>
              Har du allerede en konto?{' '}
              <button 
                onClick={() => setMode('login')}
                className="text-electric-600 font-bold hover:underline cursor-pointer ml-1"
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
