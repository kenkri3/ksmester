import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'VikingMester - Byggeplassens råeste kraftverktøy | Autonom HMS, KS & Fagledelse',
  description: 'Byggeplassens råeste kraftverktøy for norske håndverkere og entreprenører. Snakk inn dagboken, knips avvikene, og la VikingMester ta resten. En del av Vikingnet.',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.APP_URL || 'https://vikingmester.no'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'VikingMester - Byggeplassens råeste kraftverktøy',
    description: 'Autonom HMS, TEK17-avvik og byggedagbok på sekunder. Bygget for norske håndverkere og entreprenører av Vikingnet.',
    url: 'https://vikingmester.no',
    siteName: 'VikingMester',
    locale: 'nb_NO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VikingMester - Byggeplassens råeste kraftverktøy',
    description: 'Autonom HMS, TEK17-avvik og byggedagbok for norske håndverkere.',
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
  themeColor: '#0F1115',
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
