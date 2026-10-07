'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Crown, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = (searchParams.get('token') || '').trim();
  const emailParam = (searchParams.get('email') || '').trim().toLowerCase();

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Verifiser token ved lasting
  useEffect(() => {
    async function verifyToken() {
      if (!token || !emailParam) {
        setIsVerifying(false);
        setErrorMessage('Ugyldig eller manglende lenke. Vennligst be om en ny tilbakestillingslenke.');
        return;
      }

      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(emailParam)}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setIsValidToken(true);
          setEmail(data.email || emailParam);
          setIsSuperAdmin(Boolean(data.isSuperAdmin));
        } else {
          setIsValidToken(false);
          setErrorMessage(data.error || 'Denne lenken er utløpt eller allerede brukt.');
        }
      } catch (err: any) {
        setIsValidToken(false);
        setErrorMessage('Kunne ikke verifisere lenken. Sjekk internettforbindelsen.');
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, [token, emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('Passordet må være på minst 8 tegn.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passordene er ikke like. Vennligst sjekk stavemåten.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          newPassword: password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Kunne ikke oppdatere passord.');
      }

      // Lagre innloggingsdata slik at brukeren er innlogget umiddelbart!
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.user) {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        if (data.user.companyId) {
          localStorage.setItem('company_id', data.user.companyId);
        }
      }

      // Varsle andre komponenter om innlogging
      window.dispatchEvent(new Event('auth_state_changed'));
      window.dispatchEvent(new CustomEvent('auth_state_change', { detail: { user: data.user } }));

      setSuccess(true);
      toast.success('Passordet ditt er nå oppdatert! Sender deg til arbeidsflaten...');

      // Omdiriger til hovedsystemet etter 1.5 sekunder
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Det oppstod en feil. Vennligst prøv igjen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Bakgrunnsglød */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Tilbake til forsiden */}
      <a
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs uppercase tracking-wider font-bold z-10"
      >
        <ArrowLeft size={16} />
        Til forsiden
      </a>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl"
      >
        {/* Logo / Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            VikingMester Sikkerhet
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isSuperAdmin ? '👑 Velg SuperAdmin-passord' : 'Velg ditt passord'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
            {email ? (
              <>Konto: <strong className="text-amber-400 font-mono">{email}</strong></>
            ) : (
              'Oppgi ditt nye passord for VikingMester'
            )}
          </p>
        </div>

        {/* SuperAdmin Info Badge */}
        {isSuperAdmin && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-black text-amber-300">
              <Crown size={15} />
              <span>Full plattformeiertilgang</span>
            </div>
            <p className="text-[11px] text-amber-200/90">
              Du setter nå passord for en SuperAdmin-konto med 100% like rettigheter som Kenneth (500M tokens/mnd, tilgang til alle fagmoduler, SuperAdmin-portal).
            </p>
          </div>
        )}

        {/* Laster verifisering */}
        {isVerifying ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 size={32} className="mx-auto text-amber-400 animate-spin" />
            <p className="text-xs text-slate-400">Verifiserer sikkerhetslenke...</p>
          </div>
        ) : !isValidToken ? (
          /* Ugyldig eller utløpt lenke */
          <div className="space-y-4 text-center py-4">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <h3 className="font-bold text-white text-base">Lenken er ikke lenger gyldig</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {errorMessage || 'Denne tilbakestillingslenken har utløpt eller er allerede brukt.'}
            </p>
            <div className="pt-2">
              <a
                href="/?login=forgot"
                className="inline-block w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-all"
              >
                Be om ny tilbakestilling
              </a>
            </div>
          </div>
        ) : success ? (
          /* Suksess */
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="font-bold text-white text-lg">Passordet er oppdatert! 🎉</h3>
            <p className="text-xs text-slate-400">
              Du er nå logget inn og videresendes automatisk til arbeidsflaten...
            </p>
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
          </div>
        ) : (
          /* Skjema for å velge passord */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Nytt passord (minst 8 tegn) *
              </label>
              <div className="relative">
                <input
                  required
                  autoFocus
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minst 8 tegn..."
                  className="w-full pl-4 pr-10 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Bekreft nytt passord *
              </label>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Gjenta passord..."
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || password.length < 8}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Lagrer passord...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Lagre passord og logg inn</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
