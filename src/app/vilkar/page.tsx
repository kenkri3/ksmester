import type { Metadata } from 'next';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { TermsPage } from '@/src/components/StaticPages';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Vilkår for bruk & Forretningsbetingelser | VikingMester',
  description: 'Vilkår og betingelser for bruk av VikingMester sine skytjenester og mobilapper for håndverkerbedrifter.',
  alternates: {
    canonical: `${baseUrl}/vilkar`,
  },
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PublicHeader />
      <main className="flex-1">
        <TermsPage />
      </main>
      <PublicFooter />
    </div>
  );
}
