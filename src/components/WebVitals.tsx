'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVitals } from '@/src/lib/analytics';
import { useConsent } from './ConsentProvider';

export function WebVitals() {
  const { consent } = useConsent();

  useReportWebVitals((metric) => {
    // Kun rapporter til GA dersom samtykke er innvilget
    if (consent === 'granted') {
      reportWebVitals(metric as any);
    }
  });

  return null;
}
