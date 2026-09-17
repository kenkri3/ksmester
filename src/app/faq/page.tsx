import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/src/components/PublicHeader';
import { PublicFooter } from '@/src/components/PublicFooter';
import { StructuredData } from '@/src/components/StructuredData';
import { 
  HelpCircle, 
  ChevronDown, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  PhoneCall, 
  CheckCircle2, 
  FileCheck2,
  HardHat,
  Cpu
} from 'lucide-react';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

export const metadata: Metadata = {
  title: 'Ofte stilte spørsmål om KS og HMS | FAQ | VikingMester',
  description: 'Få svar på alt du lurer på om KS-system, HMS-krav, internkontrollforskriften § 5, TEK17-visjon, priser og offline-støtte for håndverkere.',
  alternates: {
    canonical: `${baseUrl}/faq`,
  },
  openGraph: {
    title: 'Ofte stilte spørsmål om KS- og HMS-system | VikingMester',
    description: 'Svar på vanlige spørsmål om byggedagbok, avvik, SJA, stoffkartotek, priser og lovkrav for norske håndverkere.',
    url: `${baseUrl}/faq`,
  },
};

const faqSections = [
  {
    category: 'KS-system og Kvalitetssikring',
    icon: FileCheck2,
    items: [
      {
        question: 'Hva er et KS-system, og hvem har plikt til å ha det?',
        answer: 'Et KS-system (kvalitetssikringssystem) er et dokumentert system for å sikre at bygge- og anleggsarbeid utføres i samsvar med gjeldende lover, tekniske forskrifter (TEK17) og kontraktsstandarder (som NS 8405 / NS 8406). Alle foretak med ansvarsrett etter plan- og bygningsloven § 20-3 er lovpålagt å ha et fungerende kvalitetssikringssystem.',
      },
      {
        question: 'Hvordan fungerer sjekklister og fotodokumentasjon i VikingMester?',
        answer: 'Fagarbeiderne åpner sjekklisten direkte på mobilen på byggeplassen. Hvert kontrollpunkt har mulighet for direkte bildeopplasting med tids- og lokasjonsstempel. VikingMester lagrer all dokumentasjon i skyen, og genererer ferdig sluttrapport som kan overleveres til tiltakshaver eller arkiveres til ferdigattest.',
      },
      {
        question: 'Hvordan hjelper VikingMester med TEK17-samsvar?',
        answer: 'VikingMester har ferdiglagde sjekklister for våtrom (TEK17 § 13-15), brannmotstand (TEK17 kap. 11), bærekonstruksjoner og energikrav. I tillegg har systemet en innebygd AI-visjon som kan analysere bilder av membraner, rørgjennomføringer og isolasjon og varsle om synlige avvik før det tildekkes.',
      },
      {
        question: 'Kan vi hente ut rapporter for ferdigattest og FDV med ett klikk?',
        answer: 'Ja. All registrert dokumentasjon – inkludert sjekklister, bildemateriale, avvikshistorikk og produktdatablader – kan eksporteres som profesjonelt branded PDF eller zippet FDV-pakke klar til innsending til kommune eller kunde.',
      },
    ],
  },
  {
    category: 'HMS og Lovkrav (§ 5)',
    icon: HardHat,
    items: [
      {
        question: 'Hva krever Internkontrollforskriften § 5 av en håndverksbedrift?',
        answer: 'Internkontrollforskriften krever at bedriften kan dokumentere: 1) Mål for HMS, 2) Hvem som har ansvar og oppgaver, 3) Kartlegging av farer og risikovurdering med tiltaksplan, 4) Rutiner for å avdekke, rette og forebygge overtredelser (avvikshåndtering), og 5) Systematisk gjennomgang og revisjon av internkontrollen.',
      },
      {
        question: 'Hva er forskjellen på en risikovurdering og en SJA (Sikker Jobb Analyse)?',
        answer: 'En overordnet risikovurdering gjøres for hele virksomheten eller faste arbeidsoperasjoner. En SJA er en konkret risikogjennomgang som utføres på byggeplassen før en spesiell eller risikofylt arbeidsoppgave starter (f.eks. arbeid i høyden, varme arbeider eller riving). VikingMester har intuitive maler for begge.',
      },
      {
        question: 'Er stoffkartoteket i VikingMester lovlig iht. Arbeidstilsynets forskrifter?',
        answer: 'Ja. Arbeidsmiljøloven og forskrift om utførelse av arbeid § 3 krever at kjemikalier skal registreres og sikkerhetsdatablad skal være tilgjengelig for alle ansatte. VikingMester gir full offline-tilgang på mobilen, slik at førstehjelps- og vernetiltak kan leses selv uten mobildekning.',
      },
    ],
  },
  {
    category: 'Mobil, Offline & Teknologi',
    icon: Cpu,
    items: [
      {
        question: 'Fungerer appen i kjellere eller områder uten internettdekning?',
        answer: 'Ja. VikingMester er bygget som en Progressive Web App (PWA) med lokal caching. Du kan opprette avvik, ta bilder, fylle ut sjekklister og lese stoffkartotek helt uten dekning. Så snart mobilen får nettforbindelse igjen, synkroniseres dataene automatisk i bakgrunnen.',
      },
      {
        question: 'Hvordan fungerer omnichannel-varsling (Discord, Slack, MS Teams)?',
        answer: 'Gutta på byggeplassen slipper å sjekke enda en app for oppdateringer! VikingMester kan koble seg direkte til bedriftens eksisterende kanaler i Discord, Slack eller Microsoft Teams via webhooks. Kritiske HMS-avvik, oppgaver og godkjenninger varsles direkte dit håndverkerne allerede chatter. Dette er 100 % inkludert i samtlige abonnement (Solo, Team og Totalentreprenør).',
      },
      {
        question: 'Kan vi koble til NOBB og hente produktdokumentasjon og FDV automatisk?',
        answer: 'Ja! VikingMester har direkte integrasjon med NOBB (Norsk Byggevarebase) og Byggtjeneste med oppslag mot over 1 million byggevarer. Bedriften kan i tillegg legge inn sin egen NOBB API-nøkkel (BYOK) under Innstillinger > Integrasjoner for å hente ut egne grossistpriser, tekniske godkjenninger, FDV og EPD rett inn i sjekklister og sluttrapporter.',
      },
      {
        question: 'Må håndverkerne laste ned noe fra App Store eller Google Play?',
        answer: 'Nei, ingen tunge nedlastinger er påkrevd. Du besøker bare vikingmester.no på mobilen og trykker "Legg til på Hjem-skjerm". Da har du full appopplevelse med fullskjermvisning og lynrask respons.',
      },
      {
        question: 'Hvor trygt lagres bedriftens bilder og data?',
        answer: 'Dataene lagres i sikre europeiske datasentre med full GDPR-etterlevelse, kontinuerlig kryptering under overføring (HTTPS/TLS 1.3) og i ro (AES-256), samt automatiske daglige sikkerhetskopier.',
      },
    ],
  },
  {
    category: 'Priser, Prøveperiode og Bytte',
    icon: ShieldCheck,
    items: [
      {
        question: 'Er det bindingstid hos VikingMester?',
        answer: 'Nei, aldri! Vi tror på at du skal bli fordi systemet er best, ikke fordi du er låst. Du kan si opp eller justere abonnementet ditt når som helst med virkning fra neste måned.',
      },
      {
        question: 'Hvordan fungerer den 14 dagers gratis prøveperioden?',
        answer: 'Du får umiddelbar tilgang til hele systemet med alle moduler. Du trenger ikke oppgi betalingskort. Hvis du etter 14 dager ønsker å fortsette, velger du abonnement. Hvis ikke, stopper kontoen automatisk uten kostnad.',
      },
      {
        question: 'Vi bruker SmartDok eller Holte i dag – kan vi overføre data?',
        answer: 'Ja! Vårt supportteam hjelper deg med gratis migrering av prosjektlister, sjekklister og ansatte fra SmartDok, Holte, Tripletex eller Excel. Overgangen tar normalt under 24 timer.',
      },
      {
        question: 'Hva koster support og opplæring?',
        answer: 'Fri norsk support på e-post, telefon og chat er 100 % inkludert i månedsprisen. Vi holder også gratis 20-minutters videosamlinger for deg og teamet ditt om ønskelig.',
      },
    ],
  },
];

const allFaqs = faqSections.flatMap((s) => s.items);

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900 font-sans">
      <PublicHeader />

      <StructuredData
        breadcrumbs={[
          { name: 'Hjem', path: '/' },
          { name: 'Ofte stilte spørsmål', path: '/faq' },
        ]}
        faqs={allFaqs}
      />

      {/* Hero */}
      <section className="pt-16 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1.5 rounded-full border border-electric-300/40 mb-6">
            <HelpCircle size={14} />
            Kunnskapsbase & svar
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-navy-900 mb-6">
            Ofte stilte spørsmål om <span className="text-electric-600">KS & HMS</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Få klare svar på lovpålagte krav, internkontrollforskriften § 5, TEK17, priser og hvordan VikingMester forenkler hverdagen for håndverkere.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full flex-1">
        <div className="space-y-16">
          {faqSections.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <div key={idx} className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-electric-50 text-electric-600 flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </div>
                  <h2 className="text-2xl font-black text-navy-900">{sec.category}</h2>
                </div>

                <div className="space-y-4">
                  {sec.items.map((item, itemIdx) => (
                    <details
                      key={itemIdx}
                      className="group border border-slate-200 rounded-2xl p-5 bg-white shadow-xs open:bg-slate-50/60 transition-colors"
                    >
                      <summary className="cursor-pointer font-bold text-base sm:text-lg text-navy-900 list-none flex items-center justify-between gap-4">
                        <span>{item.question}</span>
                        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 group-open:rotate-180 group-open:bg-electric-100 group-open:text-electric-600 transition-transform">
                          <ChevronDown size={16} />
                        </span>
                      </summary>
                      <div className="mt-4 pt-4 border-t border-slate-200/60 text-slate-600 leading-relaxed text-sm sm:text-base">
                        {item.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-20 p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-navy-900 to-navy-950 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-black">Fant du ikke svaret du lette etter?</h3>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              Vårt team i Oslo svarer raskt på alle spørsmål om forskrifter, overgang fra andre systemer eller tilpasninger.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
            <Link
              href="/kontakt"
              className="px-6 py-3.5 rounded-xl font-bold bg-white text-navy-900 hover:bg-slate-100 transition-colors text-center text-sm shadow-md"
            >
              Kontakt oss
            </Link>
            <Link
              href="/?action=demo"
              className="px-6 py-3.5 rounded-xl font-bold bg-electric-500 hover:bg-electric-600 text-white transition-all text-center text-sm shadow-lg shadow-electric-500/25 flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              Prøv gratis i 14 dager
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
