import type { Metadata } from 'next';
import VerktoyClient from './VerktoyClient';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

// SIKKERHETSFIKS (O-06): se sja-generator/page.tsx. Siden arvet root-layoutens
// canonical '/' og ble dermed bedt indeksert som forsiden.
export const metadata: Metadata = {
  title: 'Varslingsfrist-kalkulator (NS 8406 / NS 8405) | VikingMester',
  description:
    'Regn ut riktig varslingsfrist etter NS 8406 og NS 8405. Gratis verktøy for endringsordrer, tilleggsarbeid og fristforlengelse.',
  alternates: {
    canonical: `${baseUrl}/verktoy/varslingsfrist-ns8406`,
  },
  openGraph: {
    title: 'Varslingsfrist-kalkulator (NS 8406 / NS 8405) | VikingMester',
    description:
      'Regn ut riktig varslingsfrist etter NS 8406 og NS 8405. Gratis verktøy for endringsordrer.',
    url: `${baseUrl}/verktoy/varslingsfrist-ns8406`,
    siteName: 'VikingMester',
    locale: 'nb_NO',
    type: 'website',
  },
};

export default function VarslingsfristNs8406Page() {
  return <VerktoyClient />;
}
