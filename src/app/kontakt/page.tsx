import type { Metadata } from 'next';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { ContactForm } from '@/src/components/ContactForm';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Headphones, 
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Kontakt oss & Bestill demo | VikingMester',
  description: 'Ta kontakt med VikingMester for uforpliktende demo eller rådgivning om KS- og HMS-system. Ring +47 401 63 082 eller send en melding. Rask respons.',
  alternates: {
    canonical: `${baseUrl}/kontakt`,
  },
  openGraph: {
    title: 'Kontakt VikingMester | Norsk support og demo',
    description: 'Vi hjelper deg i gang på 10 minutter. Ingen bindingstid, gratis migrering og personlig oppfølging.',
    url: `${baseUrl}/kontakt`,
  },
};

export default function KontaktPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Kontakt', path: '/kontakt' },
        ]}
      />

      {/* Hero */}
      <section className="pt-16 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs font-mono font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1.5 rounded-full border border-electric-300/40 inline-block mb-6">
            Norsk rådgivning & support
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-navy-900 mb-6">
            Snakk med oss om <span className="text-electric-600">KS & HMS</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Har du spørsmål om systemet, ønsker en 15 minutters gjennomgang eller vil ha hjelp til å flytte over fra et annet system? Vi er her for deg!
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Info Panel */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-navy-900 text-white p-8 rounded-3xl space-y-6 shadow-xl">
              <h2 className="text-2xl font-black">Direkte kontakt</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Håndverkere starter tidlig, og det gjør vi også. Ring eller send en e-post, så svarer vi umiddelbart.
              </p>

              <div className="space-y-4 text-sm pt-2">
                <a
                  href="tel:+4740163082"
                  className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-electric-500/20 text-electric-400 flex items-center justify-center shrink-0">
                    <Phone size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Telefon / Vakttelefon</div>
                    <div className="font-bold text-base text-white">+47 401 63 082</div>
                  </div>
                </a>

                <a
                  href="mailto:hei@vikingmester.no"
                  className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-electric-500/20 text-electric-400 flex items-center justify-center shrink-0">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">E-post</div>
                    <div className="font-bold text-base text-white">hei@vikingmester.no</div>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5">
                  <div className="w-10 h-10 rounded-xl bg-electric-500/20 text-electric-400 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Åpningstider</div>
                    <div className="font-bold text-sm text-white">Man – Fre: 07:00 – 18:00</div>
                    <div className="text-[11px] text-slate-400">Helg: Vakt ved kritiske henvendelser</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5">
                  <div className="w-10 h-10 rounded-xl bg-electric-500/20 text-electric-400 flex items-center justify-center shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Lokasjon</div>
                    <div className="font-bold text-sm text-white">Oslo / Fredrikstad, Norge</div>
                    <div className="text-[11px] text-slate-400">AIChat Norge AS (Org.nr: 933 607 779 MVA)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantee / Benefits */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-3 text-sm">
              <h3 className="font-black text-navy-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                Vårt løfte til deg:
              </h3>
              <ul className="space-y-2 text-slate-600 text-xs">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Gratis hjelp til å importere dine eksisterende data</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>14 dagers gratis prøve uten bindingstid</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Ingen etableringsgebyr eller skjulte kostnader</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Form */}
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
