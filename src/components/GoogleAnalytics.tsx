'use client';

import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google';
import { GA_MEASUREMENT_ID, isAnalyticsEnabled } from '@/src/lib/analytics';
import { useConsent } from './ConsentProvider';

export default function GoogleAnalytics() {
  const { consent } = useConsent();

  // GDPR: Aldri last Google Analytics-skriptet før brukeren har eksplisitt trykket Godta
  if (!isAnalyticsEnabled() || consent !== 'granted') {
    return null;
  }

  return <NextGoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
