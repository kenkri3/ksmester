import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { PLATFORM_LEGAL_NAME, PLATFORM_LEGAL_NAME_FULL, PLATFORM_ORGNUMBER_LABEL } from '@/src/constants/companyDetails';
import { 
  Building2, 
  ShieldCheck, 
  HeartHandshake, 
  MapPin, 
  Phone, 
  Mail, 
  Award, 
  CheckCircle2, 
  ArrowRight,
  HardHat,
  Sparkles,
  Users
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Om oss | Hvem står bak VikingMester? | AIChat Norge AS',
  description: `VikingMester leveres av ${PLATFORM_LEGAL_NAME} (Org.nr: ${PLATFORM_ORGNUMBER_LABEL}). Vi bygger fremtidens enkle og intelligente KS- og HMS-system for norske håndverkere.`,
  alternates: {
    canonical: `${baseUrl}/om-oss`,
  },
  openGraph: {
    title: 'Om VikingMester | Norsk KS og HMS for håndverkere',
    description: 'Bli kjent med teamet bak VikingMester. Utviklet i Norge for å eliminere papirmøller og overprisede lisenser i byggebransjen.',
    url: `${baseUrl}/om-oss`,
  },
};

export default function OmOssPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Om oss', path: '/om-oss' },
        ]}
      />

      {/* Hero */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs font-mono font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1.5 rounded-full border border-electric-300/40 inline-block mb-6">
            Norsk utviklet for byggebransjen
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-navy-900 mb-6">
            Vi gjør byggeplassen <span className="text-electric-600">enkel og papirløs</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            VikingMester ble skapt med ett mål: Å gi norske håndverkere et lynraskt, moderne og rimelig KS- og HMS-system som faktisk fungerer ute på stillaset – uten bindingstid eller skjulte gebyrer.
          </p>
        </div>
      </section>

      {/* Story & Mission */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-electric-600">Vår historie</span>
            <h2 className="text-3xl sm:text-4xl font-black text-navy-900 leading-tight">
              Byggebransjen fortjener bedre enn 15 år gammel programvare
            </h2>
            <p className="text-slate-600 leading-relaxed">
              I mange år har norske håndverkere måttet velge mellom to onder: Kostbare, trege systemer med årevis bindingstid, eller uoversiktlige permer og papirskjemaer som forsvinner i firmabilen.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Vi så håndverkere som tapte hundretusenvis av kroner på uvarslede endringsordrer, og mesterbedrifter som fryktet tilsyn fra Arbeidstilsynet eller kommunen fordi internkontrollen lå spredt i innbokser, permer og papirlapper.
            </p>
            <p className="text-slate-600 leading-relaxed font-semibold text-navy-900">
              VikingMester løser dette med moderne nettteknologi, kunstig intelligens for TEK17-kontroll, og en mobilapp som er like enkel å bruke som Vipps.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 space-y-6 shadow-xs">
            <h3 className="text-xl font-black text-navy-900 flex items-center gap-2">
              <Award className="text-electric-500" size={24} />
              Selskapet bak VikingMester
            </h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="text-slate-400 mt-1 shrink-0" size={18} />
                <div>
                  <div className="font-bold text-navy-900">Juridisk enhet</div>
                  <div className="text-slate-600">{PLATFORM_LEGAL_NAME_FULL}</div>
                  <div className="text-slate-500 text-xs">Org.nr: {PLATFORM_ORGNUMBER_LABEL}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="text-slate-400 mt-1 shrink-0" size={18} />
                <div>
                  <div className="font-bold text-navy-900">Hovedkontor & utvikling</div>
                  <div className="text-slate-600">Norge (Oslo / Fredrikstad)</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="text-slate-400 mt-1 shrink-0" size={18} />
                <div>
                  <div className="font-bold text-navy-900">E-post</div>
                  <a href="mailto:hei@vikingmester.no" className="text-electric-600 hover:underline">
                    hei@vikingmester.no
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="text-slate-400 mt-1 shrink-0" size={18} />
                <div>
                  <div className="font-bold text-navy-900">Kundestøtte & vakttelefon</div>
                  <a href="tel:+4740163082" className="text-electric-600 hover:underline">
                    +47 401 63 082
                  </a>
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
              <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
              <span>Registrert i Brønnøysundregistrene og MVA-registeret. Følger norske standarder og forskrifter.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-electric-600">Våre prinsipper</span>
            <h2 className="text-3xl sm:text-4xl font-black text-navy-900 mt-2">
              Bygget på ærlighet og respekt for håndverkerens tid
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-electric-50 text-electric-600 flex items-center justify-center font-black">
                <HardHat size={24} />
              </div>
              <h3 className="text-xl font-bold text-navy-900">Bygget for hanskene på</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Vi designer systemet så du kan dokumentere et avvik på under 30 sekunder. Store knapper, diktering av tekst, automatisk lokasjon og offline-støtte.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-navy-900">Ingen gissel-avtaler</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Vi har null måneders bindingstid. Hvis du ikke er fornøyd, kan du avslutte når du vil og ta med deg all data i åpne PDF- og Excel-formater.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                <Sparkles size={24} />
              </div>
              <h3 className="text-xl font-bold text-navy-900">Teknologi i fremste rekke</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Mens andre sitter fast i systemer fra 2010, bruker vi moderne skyinfrastruktur, lynrask Next.js og AI for automatisk bildegjenkjenning av byggefeil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-black text-navy-900 mb-6">
          Klar for å oppleve forskjellen?
        </h2>
        <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
          Bli med hundrevis av norske håndverkere som allerede har spart timer hver uke med VikingMester.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/kontakt"
            className="px-8 py-4 rounded-2xl font-bold bg-white text-navy-900 border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Snakk med oss
          </Link>
          <Link
            href="/?action=demo"
            className="px-8 py-4 rounded-2xl font-bold bg-electric-500 hover:bg-electric-600 text-white transition-all shadow-lg shadow-electric-500/25 flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            Start gratis i 14 dager
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
