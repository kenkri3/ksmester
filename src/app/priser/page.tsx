import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  HelpCircle,
  Clock,
  Coins
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Priser på KS- og HMS-system | Forutsigbart, ingen binding | VikingMester',
  description: 'Gjennomsiktige priser på Norges råeste KS- og HMS-system med 100% autonom MesterAI byggeleder, Gemini 3.8 Flash Vision, 100% offline-modus og integrert prosjektchatt. Solo kr 690,- eks mva/mnd (550,- årlig). Team kr 1 490,- eks mva/mnd (1 190,- årlig). Totalentreprenør Pro kr 2 990,- eks mva/mnd. 14 dagers gratis prøveperiode uten bindingstid.',
  alternates: {
    canonical: `${baseUrl}/priser`,
  },
  openGraph: {
    title: 'Priser på KS- og HMS-system | VikingMester',
    description: 'Ingen bindingstid, ingen etableringsgebyrer. Komplett KS, HMS, SJA, byggedagbok, prosjektchatt og 100% offline-modus med autonom MesterAI.',
    url: `${baseUrl}/priser`,
  },
};

const faqs = [
  {
    question: 'Er det bindingstid på abonnementet?',
    answer: 'Nei, hos VikingMester har vi ingen bindingstid. Du kan oppgradere, nedgradere eller si opp abonnementet ditt når som helst med virkning fra neste måned.',
  },
  {
    question: 'Er det noen oppstartskostnader eller etableringsgebyr?',
    answer: 'Nei, kr 0,- i etableringsgebyr. Vi hjelper deg i gang gratis, og du kan teste systemet med alle funksjoner i 14 dager uten å legge inn betalingskort.',
  },
  {
    question: 'Fungerer appen ute på byggeplasser uten 4G/5G-dekning?',
    answer: 'Ja! VikingMester har 100% offline-modus. Du kan føre timer, ta TEK17-bilder, fylle ut sjekklister og slå opp i stoffkartoteket i dype kjellere eller nybygg. Alt lagres trygt lokalt og synkroniseres automatisk til databasen og skylagringen så fort telefonen får dekning igjen.',
  },
  {
    question: 'Hvordan fungerer MesterAI Copilot og Gemini 3.8 Flash Vision?',
    answer: 'MesterAI Copilot (Ctrl+M) er din personlige digitale byggeleder, tilgjengelig overalt i systemet. Drevet av Gemini 3.8 Flash Vision analyserer den byggeplassbilder på under 0,2 sekunder for å verifisere TEK17-krav (slukmansjett, klemring, fall, rørgjennomføringer). Du kan også snakke inn timer, stille spørsmål om TEK17 og pinne samtalene for fremtidig referanse.',
  },
  {
    question: 'Hva er Prosjekt- & Firmachatt og hvordan fungerer den på byggeplassen?',
    answer: 'Prosjektchatten er en integrert feltkommunikasjonskanal for byggeplassen. Håndverkerne kan dele bilder, bruke hurtigtags (📍 På byggeplass, 🚚 Materiell ankommet, 🔍 Klar for sjekk, ⏱️ Ferdig, ⚠️ Avvik) og stille MesterAI spørsmål direkte i tråden. Dette eliminerer rotete SMS-tråder og samler all prosjektkommunikasjon på ett sted.',
  },
  {
    question: 'Kan vi godkjenne timer og eksportere direkte til Tripletex, PowerOffice Go eller Fiken?',
    answer: 'Ja! Med ett klikk godkjenner lederen timene (oppdelt i normaltid, 50% og 100% overtid iht. Arbeidsmiljøloven § 10-6/10-7) og eksporterer lønns- og fakturagrunnlaget direkte til regnskapssystemet.',
  },
  {
    question: 'Hva koster ekstra brukere utover Team-pakken?',
    answer: 'I Team-pakken er inntil 5-10 aktive fagarbeidere inkludert. Ekstra brukere koster kun kr 199,- eks mva per måned per bruker.',
  },
  {
    question: 'Hva skjer hvis bedriften bruker opp den inkluderte AI-tokenkvoten?',
    answer: 'Vårt innebygde Marginvern forhindrer ubehagelige overraskelsesfakturaer. All standard KS, HMS, sjekklister, timeføring, prosjektchatt og offline-stoffkartotek forblir 100% ubegrenset. Hvis du trenger mer avansert AI-kapasitet (TEK17-visjon, avansert NS 8406-kalkyle), kan du når som helst aktivere en Mester Top-up under Innstillinger (fra kr 490,- for +5M tokens). Vi går aldri i minus, og du får aldri en sjokkregning.',
  },
  {
    question: 'Får vi fri support inkludert i prisen?',
    answer: 'Ja, fri norsk support på e-post, chat og telefon er inkludert for alle kunder, uansett abonnement.',
  },
];

export default function PriserPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Priser', path: '/priser' },
        ]}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs font-mono font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1.5 rounded-full border border-electric-300/40 inline-block mb-6">
            100% Autonom Byggeleder • 100% Offline • Forutsigbare priser
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-navy-900 mb-6">
            Enkle priser. <span className="text-electric-600">14 dagers prøveperiode.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Velg pakken som passer din håndverksbedrift. MesterAI Copilot, Gemini 3.8 Flash Vision, 100% offline-modus, prosjektchatt og alle 20 moduler er tilgjengelige fra dag én.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Solo Card */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Enkeltpersonforetak & 1 bruker
              </span>
              <h3 className="text-2xl font-bold text-navy-900 mt-1 mb-2">VikingMester Solo</h3>
              <p className="text-slate-600 text-sm mb-6">
                For deg som driver alene og vil ha 100% autonom kontroll på byggeplassen og papirene.
              </p>
              <div className="mb-8">
                <span className="text-4xl font-black text-navy-900">690 kr</span>
                <span className="text-slate-500 text-sm font-medium"> / mnd eks mva</span>
                <div className="text-xs text-emerald-600 font-bold mt-1">Kun 550 kr/mnd ved årlig avtale</div>
              </div>
              <ul className="space-y-3 text-sm text-slate-700 mb-8">
                <li className="flex items-center gap-2 font-semibold text-navy-900">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>100% Autonom MesterAI Copilot (Ctrl+M)</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-electric-600">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Gemini 3.8 Flash Vision (TEK17 bildekontroll)</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-emerald-600">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>100% Offline-modus med bakgrunnssynk</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-electric-600">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Handsfree stemmestyring (timer & overtid fra bilen)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Pinning & lagring av samtaler og kalkyler</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>1 aktiv fagarbeider (opptil 5 prosjekter)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Sikker Jobb Analyse (SJA) & risikovurdering</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Digitalt stoffkartotek offline på byggeplass</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Yr.no automatisk værsynk & byggedagbok (AML)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>1-Klikk Boligmappa & PDF-sluttrapport</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Omnichannel (Feltvarsler til Discord, Slack & Teams)</span>
                </li>
              </ul>
            </div>
            <Link
              href="/#bestill"
              className="w-full py-3 text-center text-sm font-bold text-navy-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Start 14 dagers prøve
            </Link>
          </div>

          {/* Team Card (Featured) */}
          <div className="p-8 rounded-3xl bg-white border-2 border-electric-500 shadow-xl ring-4 ring-electric-500/10 flex flex-col justify-between relative">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-electric-500 text-white font-black text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md">
              Mest populær for håndverkere
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-electric-600">
                Små & mellomstore bedrifter
              </span>
              <h3 className="text-2xl font-bold text-navy-900 mt-1 mb-2">VikingMester Team</h3>
              <p className="text-slate-600 text-sm mb-6">
                For voksende håndverkerbedrifter som vil samhandle sømløst, sikre ekstratimer og ha full kontroll.
              </p>
              <div className="mb-8">
                <span className="text-4xl font-black text-navy-900">1 490 kr</span>
                <span className="text-slate-500 text-sm font-medium"> / mnd eks mva</span>
                <div className="text-xs text-emerald-600 font-bold mt-1">Kun 1 190 kr/mnd ved årlig avtale</div>
              </div>
              <ul className="space-y-3 text-sm text-slate-700 mb-8">
                <li className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>Alt i Solo inkludert, pluss:</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-electric-600">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>NYHET: Prosjekt- & Firmachatt (Feltkommunikasjon)</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-navy-900">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Inntil 5-10 aktive fagarbeidere (+199,- per ekstra)</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-electric-600">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Tale-til-Endringsordre (NS 8406) med signering og godkjenning via mail</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-electric-600">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Tverrfaglig Lukkesperre (Sone låst før VVS/El-signoff)</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-navy-900">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Ledergodkjenning av timer & overtid (50%/100%) med eksport</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Inntil 15-20 aktive prosjekter samtidig</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Prosjektøkonomi, timeforbruk vs. tilbud & marginvarsel</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>1-Klikk Slutt-FDV til Boligmappa & kundeportal</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>Flerspråklig støtte (Norsk, Engelsk, Polsk, Litauisk)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-electric-500 shrink-0" />
                  <span>25 GB sikker skylagring for tegninger & FDV</span>
                </li>
              </ul>
            </div>
            <Link
              href="/#bestill"
              className="w-full py-3.5 text-center text-sm font-bold text-white bg-electric-500 hover:bg-electric-600 rounded-xl transition-all shadow-md shadow-electric-500/25"
            >
              Start gratis prøveperiode
            </Link>
          </div>

          {/* Entreprenør Card */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Større entreprenører & konsern
              </span>
              <h3 className="text-2xl font-bold text-navy-900 mt-1 mb-2">Totalentreprenør Pro</h3>
              <p className="text-slate-600 text-sm mb-6">
                For konsern med behov for skreddersydde integrasjoner, underentreprenører og komplekse anbud.
              </p>
              <div className="mb-8">
                <span className="text-3xl font-black text-navy-900">2 990 kr</span>
                <span className="text-slate-500 text-sm font-medium"> / mnd eks mva</span>
                <div className="text-xs text-emerald-600 font-bold mt-1">Kun 2 390 kr/mnd ved årlig avtale</div>
              </div>
              <ul className="space-y-3 text-sm text-slate-700 mb-8">
                <li className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>Alt i Team inkludert, pluss:</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-navy-900">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Underentreprenør-portal (UE-innsyn & KS-rapportering)</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-electric-600">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Autonom Tilbud-til-Prosjekt-til-KS motor (3 sek)</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-electric-600">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Juridisk NS 8405 / NS 8406 / NS 8407 endringsordremotor</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Ubegrenset antall aktive brukere & prosjekter</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Tverrfaglig Lukkesperre med tidslås og soner</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-emerald-600">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Tripletex, PowerOffice Go & Fiken API-bro</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>NOBB Enterprise API, Boligmappa massedybde-synk</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>SuperAdmin bedriftsportal, revisjonslogger & 99.9% SLA</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>Dedikert onboarding, opplæring & prioritert support</span>
                </li>
              </ul>
            </div>
            <Link
              href="/#bestill"
              className="w-full py-3 text-center text-sm font-bold text-navy-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Start 14 dagers prøve
            </Link>
          </div>
        </div>
      </section>

      {/* 🛡️ Marginvern & Top-up Seksjon */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 inline-block mb-3">
                100% FORUTSIGBARHET • INGEN OVERFORBRUKSSJOKK
              </span>
              <h2 className="text-2xl sm:text-3xl font-black">
                Mester Top-up & Marginvern
              </h2>
              <p className="text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
                Standard sjekklister, KS, HMS, timeføring og offline-stoffkartotek er alltid <strong>100% ubegrenset</strong>. Avansert AI-generering (TEK17-visjoner og NS 8406-kalkyler) har faste månedlige kvoter. Ved ekstra behov bestiller du enkelt en top-up pakke.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-electric-400 font-bold uppercase mb-1">Top-up Nivå 1</div>
                <h4 className="text-lg font-bold text-white">Liten Mester-pakke</h4>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  For ekstra byggeplasskontroll og avviksruting i travle perioder.
                </p>
                <div className="text-2xl font-black text-white mb-2">kr 490,- <span className="text-xs text-slate-400 font-normal">eks mva</span></div>
                <div className="text-xs text-emerald-400 font-medium space-y-1">
                  <div>✓ +5 000 000 tokens ekstra</div>
                  <div>✓ +200 TEK17 bildeanalyser</div>
                  <div>✓ Føres direkte på neste EHF-faktura</div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-electric-500/40 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider bg-electric-500 text-white px-2.5 py-0.5 rounded-full">
                Beste verdi
              </div>
              <div>
                <div className="text-xs font-mono text-electric-400 font-bold uppercase mb-1">Top-up Nivå 2</div>
                <h4 className="text-lg font-bold text-white">Stor Mester-pakke</h4>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  For stordrift, totalentrepriser og omfattende dokumentasjonskrav.
                </p>
                <div className="text-2xl font-black text-white mb-2">kr 1 490,- <span className="text-xs text-slate-400 font-normal">eks mva</span></div>
                <div className="text-xs text-emerald-400 font-medium space-y-1">
                  <div>✓ +20 000 000 tokens ekstra</div>
                  <div>✓ +1 000 TEK17 bildeanalyser</div>
                  <div>✓ Føres direkte på neste EHF-faktura</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-black text-center text-navy-900 mb-12">
          Ofte stilte spørsmål om priser
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-navy-900 text-base mb-2">{faq.question}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
