import type { Metadata } from 'next';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { PrivacyPage } from '@/src/components/StaticPages';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Personvernerklæring & GDPR | VikingMester',
  description: 'Hvordan VikingMester behandler personopplysninger i samsvar med GDPR, personopplysningsloven og databehandleravtale (DPA) for håndverkerbedrifter.',
  alternates: {
    canonical: `${baseUrl}/personvern`,
  },
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PublicHeader />
      <main className="flex-1">
        <PrivacyPage />
      </main>
      <PublicFooter />
    </div>
  );
}
