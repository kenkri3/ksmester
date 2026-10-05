import type { Metadata } from 'next';
import VerktoyClient from './VerktoyClient';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

// SIKKERHETSFIKS (O-06): denne siden hadde ingen egen canonical, så den arvet
// root-layoutens `alternates.canonical = '/'`. Det gjorde at Google ble bedt om å
// indeksere verktøysiden som forsiden — samtidig som siden står i sitemap med
// priority 0.85. Siden er en klientkomponent og kan ikke eksportere metadata selv,
// så den er delt: denne serverkomponenten eier metadata, VerktoyClient.tsx eier UI-et.
export const metadata: Metadata = {
  title: 'Gratis SJA-generator (Sikker Jobb Analyse) | VikingMester',
  description:
    'Lag en komplett Sikker Jobb Analyse (SJA) på sekunder. Gratis verktøy for norske håndverkere med risikovurdering, tiltak og HMS-krav.',
  alternates: {
    canonical: `${baseUrl}/verktoy/sja-generator`,
  },
  openGraph: {
    title: 'Gratis SJA-generator (Sikker Jobb Analyse) | VikingMester',
    description:
      'Lag en komplett Sikker Jobb Analyse (SJA) på sekunder. Gratis verktøy for norske håndverkere.',
    url: `${baseUrl}/verktoy/sja-generator`,
    siteName: 'VikingMester',
    locale: 'nb_NO',
    type: 'website',
  },
};

export default function SjaGeneratorPage() {
  return <VerktoyClient />;
}
