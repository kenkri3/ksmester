import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { ShieldCheck, LogIn, ArrowLeft, Mail, Lock, User, Building, ArrowRight, Loader2, CheckSquare, Square } from 'lucide-react';
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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-3xl" />
      </div>

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
          className="absolute top-8 left-8 flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors font-medium z-10"
        >
          <ArrowLeft size={20} />
          {t('back', 'Tilbake')}
        </button>
      )}
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-100/50 border border-neutral-100 p-8 lg:p-12"
      >
        <div className="flex flex-col items-center mb-8">
          <Logo size="xl" className="mb-2 text-neutral-900" />
          <p className="text-neutral-500 text-sm text-center">
            {mode === 'login' 
              ? t('login_desc', 'Velkommen tilbake. Logg inn med din bedriftskonto.') 
              : mode === 'register'
              ? t('register_desc', 'Opprett bedriftskonto med standard bedriftsfaktura.')
              : t('forgot_desc', 'Skriv inn din e-postadresse for å tilbakestille passordet.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    type="text"
                    placeholder={t('full_name', 'Fullt navn (daglig leder/kontaktperson)')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                  />
                </div>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    type="text"
                    placeholder={t('company_name', 'Bedriftsnavn (Foretak)')}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="email"
              placeholder={t('email_or_username', 'E-postadresse')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="password"
                placeholder={mode === 'register' ? 'Passord (minst 8 tegn)' : t('password', 'Passord')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 8 : 1}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
              <label className="flex items-start gap-3 cursor-pointer select-none text-xs text-neutral-600 leading-relaxed">
                <input
                  type="checkbox"
                  checked={gdprConsent}
                  onChange={(e) => setGdprConsent(e.target.checked)}
                  required
                  className="mt-0.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  Jeg bekrefter at jeg godtar KS MesterAI sine vilkår, databehandleravtale (DPA) og personvernerklæring i samsvar med GDPR og norsk lovgivning.
                </span>
              </label>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end items-center px-2">
              <button 
                type="button"
                onClick={() => setMode('forgot')}
                className="text-xs text-emerald-600 font-bold hover:underline"
              >
                {t('forgot_password', 'Glemt passord?')}
              </button>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-xs font-medium px-2">{error}</p>
          )}

          {success && (
            <p className="text-emerald-600 text-xs font-medium px-2">{success}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-100 text-sm"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {mode === 'login' ? t('login', 'Logg inn') : mode === 'register' ? t('start_trial', 'Opprett bedriftskonto') : t('reset_password', 'Tilbakestill passord')}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-neutral-500">
          {mode === 'login' ? (
            <>
              {t('no_account', 'Har du ikke konto?')} {' '}
              <button 
                onClick={() => setMode('register')}
                className="text-emerald-600 font-bold hover:underline"
              >
                {t('register_now', 'Registrer bedrift')}
              </button>
            </>
          ) : (
            <>
              {t('already_have_account', 'Har du allerede en konto?')} {' '}
              <button 
                onClick={() => setMode('login')}
                className="text-emerald-600 font-bold hover:underline"
              >
                {t('login', 'Logg inn')}
              </button>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}
