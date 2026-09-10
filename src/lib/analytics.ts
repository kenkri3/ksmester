/**
 * Google Analytics 4 (GA4) verktøy for Next.js 15
 * Benytter @next/third-parties/google og respekterer samtykke
 */

import { sendGAEvent } from '@next/third-parties/google';

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

/**
 * Sjekker om Google Analytics er konfigurert og aktivert
 */
export const isAnalyticsEnabled = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    Boolean(GA_MEASUREMENT_ID) &&
    GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX'
  );
};

export interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  label?: string;
  attribution?: Record<string, unknown>;
}

export interface GAEvent {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, unknown>;
}

/**
 * Sender Core Web Vitals til Google Analytics
 */
export function reportWebVitals(metric: WebVitalsMetric): void {
  if (!isAnalyticsEnabled()) {
    if (process.env.NODE_ENV === 'development') {
      console.info('Web Vitals (dev):', metric);
    }
    return;
  }

  // Multipliser CLS med 1000 for GA4 heltallsrepresentasjon
  const value = Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value);

  sendGAEvent({
    event_name: 'web_vitals',
    event_category: 'Web Vitals',
    event_label: metric.name,
    value: value,
    metric_id: metric.id,
    metric_rating: metric.rating,
    metric_delta: metric.delta,
    custom_parameters: metric.attribution || {},
  });
}

/**
 * Sender egendefinert hendelse til GA4
 */
export function trackEvent(event: GAEvent): void {
  if (!isAnalyticsEnabled()) return;

  sendGAEvent({
    event_name: event.action,
    event_category: event.category || 'engasjement',
    event_label: event.label,
    value: event.value,
    custom_parameters: event.custom_parameters,
  });
}

/**
 * Forhåndsdefinerte forretningshendelser for konverteringssporing
 */
export const analytics = {
  // Lead-innsending (prøveperiode, demo, kontakt)
  trackLeadGenerated: (plan: string, company: string) => {
    trackEvent({
      action: 'generate_lead',
      category: 'konvertering',
      label: plan,
      custom_parameters: {
        plan_type: plan,
        company_name: company,
      },
    });
  },

  // Planvalg klikk
  trackPlanSelected: (planName: string, price: number) => {
    trackEvent({
      action: 'select_plan',
      category: 'pris',
      label: planName,
      value: price,
      custom_parameters: {
        currency: 'NOK',
        plan: planName,
      },
    });
  },

  // Start gratis prøveperiode klikk
  trackTrialStartClick: (source: string) => {
    trackEvent({
      action: 'start_trial_click',
      category: 'cta',
      label: source,
    });
  },

  // Telefon- eller e-postklikk
  trackContactClick: (type: 'phone' | 'email', destination: string) => {
    trackEvent({
      action: `click_${type}`,
      category: 'kontakt',
      label: destination,
    });
  },

  // AI Funksjonsbruk (tale, TEK17 bilde, avvik)
  trackAiFeatureUsed: (feature: 'voice_log' | 'tek17_vision' | 'change_order') => {
    trackEvent({
      action: 'use_ai_feature',
      category: 'produkt',
      label: feature,
    });
  },
};

export const trackLeadSubmission = (source: string, plan: string = 'demo', company?: string) => {
  analytics.trackLeadGenerated(plan, company || source);
};

