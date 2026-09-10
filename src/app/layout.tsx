import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'VikingMester — Byggeplassens råeste kraftverktøy | En del av Vikingnet',
  description: 'Byggeplassens råeste kraftverktøy for norske håndverkere og entreprenører. Snakk inn dagboken, knips avvikene med TEK17-visjon, og lås inn ekstraarbeider på sekunder. En del av Vikingnet.',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.APP_URL || 'https://vikingmester.no'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'VikingMester — Byggeplassens råeste kraftverktøy',
    description: 'Autonom HMS, TEK17-avvik og byggedagbok på sekunder. Bygget for norske håndverkere og entreprenører av Vikingnet.',
    url: 'https://vikingmester.no',
    siteName: 'VikingMester',
    locale: 'nb_NO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VikingMester — Byggeplassens råeste kraftverktøy',
    description: 'Autonom HMS, TEK17-avvik og byggedagbok for norske håndverkere. En del av Vikingnet.',
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
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'VikingMester',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description: 'Autonom HMS/KS, TEK17-avvik og usynlig dokumentasjon for norske håndverksbedrifter.',
  offers: {
    '@type': 'Offer',
    price: '990',
    priceCurrency: 'NOK',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Vikingnet / AIChat Norge AS',
    url: 'https://vikingmester.no',
  },
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
      <body className="bg-white text-navy-900 antialiased selection:bg-electric-500/20 selection:text-electric-700">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
