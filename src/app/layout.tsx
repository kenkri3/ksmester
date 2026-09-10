import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { StructuredData } from '@/src/components/StructuredData';
import { ConsentProvider } from '@/src/components/ConsentProvider';
import GoogleAnalytics from '@/src/components/GoogleAnalytics';
import { WebVitals } from '@/src/components/WebVitals';
import CookieBanner from '@/src/components/CookieBanner';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'VikingMester — Norges ledende KS- og HMS-system for håndverkere',
    template: '%s | VikingMester',
  },
  description: 'Byggeplassens råeste kraftverktøy for norske håndverkere og entreprenører. Snakk inn dagboken, knips avvikene med TEK17-visjon, og lås inn ekstraarbeider på sekunder. Lagd i Norge av Vikingnet.',
  keywords: [
    'ks system',
    'hms system',
    'kvalitetssikring bygg',
    'avvikshåndtering',
    'sikker jobb analyse',
    'sja app',
    'byggedagbok',
    'stoffkartotek',
    'tek17',
    'ns 8406',
    'håndverker app',
    'vikingmester',
    'vikingmester.no'
  ],
  authors: [{ name: 'Vikingnet / AIChat Norge AS', url: baseUrl }],
  creator: 'Vikingnet',
  publisher: 'AIChat Norge AS',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'VikingMester — Norges ledende KS- og HMS-system for håndverkere',
    description: 'Autonom HMS, TEK17-avvik og byggedagbok på sekunder. Bygget for norske håndverkere og entreprenører av Vikingnet.',
    url: baseUrl,
    siteName: 'VikingMester',
    locale: 'nb_NO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VikingMester — Norges ledende KS- og HMS-system for håndverkere',
    description: 'Autonom HMS, TEK17-avvik og byggedagbok for norske håndverkere. En del av Vikingnet.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0A192F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nb">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* Google Consent Mode v2 default denied BEFORE any scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = window.gtag || gtag;
              gtag('consent', 'default', {
                'ad_storage': 'denied',
                'analytics_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'wait_for_update': 500
              });
            `,
          }}
        />

        {/* Global JSON-LD Schema */}
        <StructuredData />

        {/* Service worker and PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration error:', err);
                  });
                });
              }
              window.deferredInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.deferredInstallPrompt = e;
                window.dispatchEvent(new CustomEvent('pwa_prompt_available'));
              });
            `,
          }}
        />
      </head>
      <body className="bg-white text-navy-900 antialiased selection:bg-electric-500/20 selection:text-electric-700 min-h-screen flex flex-col">
        <ConsentProvider>
          {children}
          <Toaster richColors position="top-right" />
          <CookieBanner />

          {/* GA4 and Web Vitals loaded AFTER hydration and strictly upon consent */}
          <GoogleAnalytics />
          <WebVitals />
        </ConsentProvider>
      </body>
    </html>
  );
}
