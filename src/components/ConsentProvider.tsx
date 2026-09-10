'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type ConsentState = 'granted' | 'denied' | 'unknown';

interface ConsentContextType {
  consent: ConsentState;
  setConsent: (c: ConsentState) => void;
  resetConsent: () => void;
}

const ConsentContext = createContext<ConsentContextType>({
  consent: 'unknown',
  setConsent: () => {},
  resetConsent: () => {},
});

export function useConsent() {
  return useContext(ConsentContext);
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsentState] = useState<ConsentState>('unknown');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vikingmester-analytics-consent') as ConsentState | null;
      if (saved === 'granted' || saved === 'denied') {
        setConsentState(saved);
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('consent', 'update', {
            analytics_storage: saved === 'granted' ? 'granted' : 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
          });
        }
      }
    } catch (e) {
      console.warn('Could not read consent from localStorage:', e);
    }
  }, []);

  const setConsent = (c: ConsentState) => {
    try {
      localStorage.setItem('vikingmester-analytics-consent', c);
    } catch (e) {
      console.warn('Could not save consent to localStorage:', e);
    }
    setConsentState(c);

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: c === 'granted' ? 'granted' : 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }
  };

  const resetConsent = () => {
    try {
      localStorage.removeItem('vikingmester-analytics-consent');
    } catch (e) {
      console.warn('Could not remove consent from localStorage:', e);
    }
    setConsentState('unknown');
  };

  return (
    <ConsentContext.Provider value={{ consent, setConsent, resetConsent }}>
      {children}
    </ConsentContext.Provider>
  );
}
