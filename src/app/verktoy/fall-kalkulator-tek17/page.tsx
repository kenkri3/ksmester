import type { Metadata } from 'next';
import VerktoyClient from './VerktoyClient';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

// SIKKERHETSFIKS (O-06): se sja-generator/page.tsx. Siden arvet root-layoutens
// canonical '/' og ble dermed bedt indeksert som forsiden.
export const metadata: Metadata = {
  title: 'Fallkalkulator for våtrom (TEK17) | VikingMester',
  description:
    'Regn ut riktig fall mot sluk etter TEK17 og BVN. Gratis kalkulator for våtrom med krav til fall i dusjsone og dokumentasjon.',
  alternates: {
    canonical: `${baseUrl}/verktoy/fall-kalkulator-tek17`,
  },
  openGraph: {
    title: 'Fallkalkulator for våtrom (TEK17) | VikingMester',
    description:
      'Regn ut riktig fall mot sluk etter TEK17 og BVN. Gratis kalkulator for våtrom.',
    url: `${baseUrl}/verktoy/fall-kalkulator-tek17`,
    siteName: 'VikingMester',
    locale: 'nb_NO',
    type: 'website',
  },
};

export default function FallKalkulatorTek17Page() {
  return <VerktoyClient />;
}
