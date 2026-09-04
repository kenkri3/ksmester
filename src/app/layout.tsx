import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'KS MesterAI Elite - Det mest avanserte økosystemet for norske håndverksbedrifter',
  description: 'Autonom HMS/KS, AI-drevet SJA og usynlig dokumentasjon. Systemet som tenker mens du bygger.',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.APP_URL || 'https://ksmester.no'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'KS MesterAI Elite - Profesjonelt HMS & KS for håndverkere',
    description: 'Autonom HMS/KS, AI-drevet SJA og usynlig dokumentasjon for norske håndverksbedrifter.',
    url: '/',
    siteName: 'KS Mester AI Elite',
    locale: 'nb_NO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KS MesterAI Elite',
    description: 'Autonom HMS/KS og AI-drevet SJA for norske håndverkere.',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#059669',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'KS Mester AI Elite',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description: 'Autonom HMS/KS, AI-drevet SJA og usynlig dokumentasjon for norske håndverksbedrifter.',
  offers: {
    '@type': 'Offer',
    price: '990',
    priceCurrency: 'NOK',
  },
  publisher: {
    '@type': 'Organization',
    name: 'KS Mester',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
      <body>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
