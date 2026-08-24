import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Cookie, Settings2, Check, X, Info, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

export interface CookiePreferences {
  necessary: boolean; // Always true
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  consentedAt: string;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: true,
  analytics: false,
  marketing: false,
  consentedAt: ''
};

export default function CookieBanner({ onOpenPrivacyPolicy }: { onOpenPrivacyPolicy?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const saved = localStorage.getItem('gdpr_cookie_consent_v1');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        setIsOpen(true);
      }
    } else {
      // Show banner if no consent stored
      setIsOpen(true);
    }

    // Global event listener to reopen banner from anywhere
    const handleReopen = () => {
      setIsOpen(true);
      setShowDetails(true);
    };
    window.addEventListener('open_cookie_settings', handleReopen);
    return () => window.removeEventListener('open_cookie_settings', handleReopen);
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    const updated = { ...prefs, consentedAt: new Date().toISOString() };
    setPreferences(updated);
    localStorage.setItem('gdpr_cookie_consent_v1', JSON.stringify(updated));
    setIsOpen(false);
    setShowDetails(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      consentedAt: new Date().toISOString()
    });
  };

  const handleAcceptNecessaryOnly = () => {
    saveConsent({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      consentedAt: new Date().toISOString()
    });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  return (
    <>
      {/* Floating Re-Open Trigger (always available in bottom left corner if closed) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setShowDetails(true);
          }}
          className="fixed bottom-4 left-4 z-40 flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-md border border-neutral-200/80 rounded-full shadow-md text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-emerald-700 transition-all cursor-pointer group"
          title="Endre cookie- og personverninnstillinger"
          id="cookie-settings-trigger"
        >
          <Cookie size={15} className="text-emerald-600 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">Informasjonskapsler</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:p-6 bg-black/30 backdrop-blur-[2px] pointer-events-auto">
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-3xl bg-white border border-neutral-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-sm sm:text-base flex items-center gap-2">
                      Informasjonskapsler og personvern
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">GDPR & Ekomloven</span>
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Vi bryr oss om dine data. Du har full kontroll over hva som lagres.
                    </p>
                  </div>
                </div>

                {/* Optional close if previously consented */}
                {localStorage.getItem('gdpr_cookie_consent_v1') && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
                    title="Lukk"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Main Content */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-neutral-600">
                <p className="leading-relaxed">
                  KS MesterAI benytter informasjonskapsler (cookies) og lokal lagring for å sikre at fagapplikasjonen fungerer optimalt, husker innstillingene dine, og gir deg en trygg opplevelse i tråd med den norske Ekomloven § 2-7b og EUs personvernforordning (GDPR).
                </p>

                {showDetails ? (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
                      Velg dine innstillinger:
                    </div>

                    {/* Category: Nødvendige */}
                    <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
                          <Lock size={14} className="text-neutral-500" />
                          Nødvendige (Påkrevd)
                          <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono">Alltid aktiv</span>
                        </div>
                        <p className="text-xs text-neutral-500">
                          Nødvendig for at du skal kunne logge inn, opprettholde trygg sesjon og lagre dine HMS/KS-prosjekter. Kan ikke slås av.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 accent-emerald-600 cursor-not-allowed opacity-70"
                      />
                    </div>

                    {/* Category: Funksjonelle */}
                    <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                          Funksjonelle
                        </div>
                        <p className="text-xs text-neutral-500">
                          Husker valgt språk, foretrukne visninger og tilpassede grensesnittinnstillinger.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.functional}
                        onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    {/* Category: Analytiske */}
                    <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-bold text-neutral-900 text-sm">
                          Analyse og feilsøking
                        </div>
                        <p className="text-xs text-neutral-500">
                          Hjelper oss å forbedre systemytelse, oppdage feil i AI-assistenten og optimalisere håndverkerens arbeidsflyt.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    {/* Category: Markedsføring */}
                    <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-bold text-neutral-900 text-sm">
                          Markedsføring og nyheter
                        </div>
                        <p className="text-xs text-neutral-500">
                          Brukes for å vise relevante produktopdateringer og tilbud tilpasset din håndverksbedrift.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-2 text-xs text-neutral-500 pt-1">
                  <Info size={14} className="text-emerald-600 shrink-0" />
                  <span>
                    Les mer om hvordan vi behandler personopplysninger i vår{' '}
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onOpenPrivacyPolicy?.();
                      }}
                      className="text-emerald-700 underline font-medium hover:text-emerald-800"
                    >
                      personvernerklæring
                    </button>
                    .
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 sm:p-5 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  <Settings2 size={15} />
                  {showDetails ? 'Skjul detaljer' : 'Tilpass innstillinger'}
                </button>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Equally prominent buttons: Kun nødvendige vs Godta alle */}
                  {showDetails ? (
                    <button
                      type="button"
                      onClick={handleSaveCustom}
                      className="px-4 py-2.5 text-xs font-bold text-neutral-800 bg-neutral-200 hover:bg-neutral-300 rounded-xl transition-colors text-center"
                    >
                      Lagre mine valg
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAcceptNecessaryOnly}
                      className="px-4 py-2.5 text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/80 rounded-xl transition-colors text-center"
                    >
                      Kun nødvendige
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-200/60 text-center flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Godta alle
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
