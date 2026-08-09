import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { ShieldCheck, LogIn, ArrowLeft, Mail, Lock, User, Building, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';

export default function Login({ onBack }: { onBack?: () => void }) {
  const { login, loginWithEmail, registerWithEmail, resetPassword, loading } = useAuth();
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else if (mode === 'register') {
        await registerWithEmail(email, password, name, company);
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
          <p className="text-neutral-500 text-sm">
            {mode === 'login' 
              ? t('login_desc', 'Velkommen tilbake. Logg inn for å fortsette.') 
              : mode === 'register'
              ? t('register_desc', 'Start din 7-dagers gratis prøveperiode i dag.')
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
                    placeholder={t('full_name', 'Fullt navn')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                  />
                </div>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    type="text"
                    placeholder={t('company_name', 'Bedriftsnavn')}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="email"
              placeholder={t('email', 'E-postadresse')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="password"
                placeholder={t('password', 'Passord')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
              />
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
                {mode === 'login' ? t('login', 'Logg inn') : mode === 'register' ? t('start_trial', 'Start gratis prøveperiode') : t('reset_password', 'Tilbakestill passord')}
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
                {t('register_here', 'Registrer deg her')}
              </button>
            </>
          ) : mode === 'register' ? (
            <>
              {t('have_account', 'Har du allerede konto?')} {' '}
              <button 
                onClick={() => setMode('login')}
                className="text-emerald-600 font-bold hover:underline"
              >
                {t('login_here', 'Logg inn her')}
              </button>
            </>
          ) : (
            <button 
              onClick={() => setMode('login')}
              className="text-emerald-600 font-bold hover:underline"
            >
              {t('back_to_login', 'Tilbake til innlogging')}
            </button>
          )}
        </p>

        <div className="mt-10 pt-8 border-t border-neutral-100 text-center">
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black mb-4">Stolt samarbeidspartner med</p>
          <div className="flex justify-center gap-8 opacity-30 grayscale">
            <img src="https://picsum.photos/seed/logo1/100/40" alt="Partner" className="h-5 object-contain" referrerPolicy="no-referrer" />
            <img src="https://picsum.photos/seed/logo2/100/40" alt="Partner" className="h-5 object-contain" referrerPolicy="no-referrer" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
