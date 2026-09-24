'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  FileText, 
  HelpCircle,
  Building2,
  Award,
  Sparkles,
  Lock,
  ArrowRight,
  Clock,
  Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';

const PageWrapper = ({ 
  badge, 
  title, 
  subtitle, 
  children 
}: { 
  badge?: string;
  title: string; 
  subtitle?: string;
  children: React.ReactNode 
}) => (
  <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 lg:px-8 bg-white text-navy-900 selection:bg-electric-500/20 selection:text-electric-700 font-sans">
    <div className="max-w-5xl mx-auto">
      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        {badge && (
          <span className="text-xs font-mono font-bold text-electric-600 uppercase tracking-widest bg-electric-50 px-3.5 py-1.5 rounded-full border border-electric-300/40 inline-block mb-4">
            {badge}
          </span>
        )}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-navy-900 mb-4 uppercase">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </div>
  </div>
);

/* =========================================================================
   1. PRICING PAGE (HARMONIZED)
   ========================================================================= */
export const PricingPage = () => {
  const { t } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      id: 'solo',
      name: 'VikingMester Solo',
      tag: 'Enkeltpersonforetak & 1 håndverker',
      desc: 'For deg som jobber alene og vil ha 100% autonom kontroll på byggeplass og dokumentasjon.',
      monthlyPrice: 690,
      annualPrice: 550,
      popular: false,
      features: [
        '100% Autonom MesterAI byggelederagent',
        '1 aktiv bruker (enkelt å oppgradere)',
        'Inntil 5 aktive prosjekter samtidig',
        'Zero-Entry AI: Snakk eller ta bilde, MesterAI gjør resten',
        'Handsfree stemme-til-byggedagbok med Yr.no værsynk',
        'Lovpålagt Sikker Jobb Analyse (SJA) & risikovurdering',
        'TEK17 AI Vision bildekontroll & avviksfoto',
        '2 GB lynrask skylagring & 1-klikks Boligmappa PDF',
        '14 dagers gratis prøveperiode (0,- etablering)'
      ]
    },
    {
      id: 'team',
      name: 'VikingMester Team',
      tag: 'Mest populær for bedrifter',
      desc: 'For voksende håndverkerbedrifter som vil ha en autonom byggeleder, sikre ekstratimer og ha full kontroll.',
      monthlyPrice: 1490,
      annualPrice: 1190,
      popular: true,
      features: [
        '100% Autonom MesterAI byggelederagent for hele laget',
        'Inntil 5-10 aktive fagarbeidere (+199,- per ekstra)',
        'Inntil 15 aktive prosjekter samtidig',
        'Tale-til-Endringsordre & automatisk fristvarsel (NS 8406)',
        'Digital kundesignering og godkjenning via mail',
        'Tverrfaglig Lukkesperre (digital signering før vegger lukkes)',
        'TEK17 AI Vision bildekontroll & avviksrapporter',
        'Yr.no sanntids værlogging i byggedagboken',
        'Flerspråklig oversettelse (Norsk, Engelsk, Polsk, Litauisk)',
        'Digitalt Stoffkartotek (offline) & 10 GB skylagring',
        '14 dagers gratis prøveperiode uten bindingstid'
      ]
    },
    {
      id: 'enterprise',
      name: 'Totalentreprenør Pro',
      tag: 'Større bedrifter & konsern',
      desc: 'For entreprenører (10+ ansatte), kjeder og komplekse byggeplasser.',
      monthlyPrice: 2990,
      annualPrice: 2390,
      popular: false,
      features: [
        'Full autonom AI-arkitektur & skreddersydd MesterAI',
        'Ubegrenset antall aktive brukere & prosjekter',
        'Autonom Tilbud-til-Prosjekt-til-KS motor',
        'Alle 20 moduler + underentreprenør-portal (UE)',
        'Juridisk NS 8405 / NS 8406 endringsordremotor',
        'Tverrfaglig Lukkesperre med tidslås og soner',
        'Omnichannel tilkobling (Discord, Slack, Microsoft Teams, E-post)',
        'Tripletex, PowerOffice Go & Fiken API-bro',
        'Dedikert onboarding, opplæring & prioritert support'
      ]
    }
  ];

  const addons = [
    { title: 'Liten Mester Top-up (+5M tokens)', price: 'kr 490,- / pakke', desc: '+5 000 000 tokens & 200 TEK17-bildeanalyser (nullstilles ikke)' },
    { title: 'Stor Mester Top-up (+20M tokens)', price: 'kr 1 490,- / pakke', desc: '+20 000 000 tokens & 1 000 TEK17-bildeanalyser for stordrift' },
    { title: 'Ekstra fagarbeider', price: 'kr 249,- / mnd', desc: 'Legg til ekstra fagarbeidere i Team-pakken' },
    { title: 'Ekstra prosjektpakke (+10)', price: 'kr 490,- / mnd', desc: 'Utvider grensen med 10 aktive byggeprosjekter' },
    { title: 'Ekstra lagringsvolum (+10 GB)', price: 'kr 149,- / mnd', desc: 'Plass til ytterligere ~50 000 WebP-bilder og FDV' },
    { title: 'Våtrom & Membran (BVN)', price: 'kr 490,- / mnd', desc: 'Dypkontroll iht. Byggebransjens Våtromsnorm BVN 31.205' },
    { title: 'Elektro & NEK 400', price: 'kr 490,- / mnd', desc: 'Samsvarserklæring og risikovurdering for el-installasjon' },
    { title: 'Tripletex / PowerOffice API', price: 'kr 490,- / mnd', desc: 'Synkroniserer timer, ordre og prosjekter automatisk' }
  ];

  const handleSelectPlan = (planId: string) => {
    if (planId === 'enterprise') {
      window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'contact' } }));
    } else {
      window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'login' } }));
    }
  };

  return (
    <PageWrapper 
      badge="Forutsigbare priser & 20 moduler"
      title="Invester i mer fritid og bedre kvalitet" 
      subtitle="Ingen bindingstid, ingen etableringsgebyrer. Alle 20 spesialiserte moduler inkludert med 100% forutsigbart marginvern og garanti mot overraskelsesfakturaer."
    >
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-12">
        <span className={cn("text-xs font-bold", !isAnnual ? "text-navy-900" : "text-neutral-400")}>
          Månedlig faktura
        </span>
        <button 
          onClick={() => setIsAnnual(!isAnnual)}
          className="w-12 h-6 bg-amber-500 rounded-full p-1 transition-colors relative cursor-pointer"
        >
          <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", isAnnual ? "translate-x-6" : "translate-x-0")} />
        </button>
        <span className={cn("text-xs font-bold flex items-center gap-1.5", isAnnual ? "text-navy-900" : "text-neutral-400")}>
          Årlig faktura
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Spar 20%</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {plans.map((plan) => {
          const price = typeof plan.monthlyPrice === 'number' 
            ? (isAnnual ? plan.annualPrice : plan.monthlyPrice) 
            : plan.monthlyPrice;

          return (
            <div 
              key={plan.id}
              className={cn(
                "p-8 rounded-3xl flex flex-col justify-between transition-all relative",
                plan.popular 
                  ? "bg-white text-navy-900 border-2 border-electric-500 shadow-purple-cta ring-4 ring-electric-500/10" 
                  : "bg-white text-navy-900 border border-slate-200 shadow-card-soft hover:shadow-card-hover"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-electric-500 text-navy-900 font-black text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md">
                  Mest populær
                </span>
              )}

              <div>
                <div className={cn("text-xs font-bold uppercase tracking-wider mb-1", plan.popular ? "text-electric-600" : "text-slate-500")}>
                  {plan.tag}
                </div>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className={cn("text-xs mb-6", plan.popular ? "text-slate-600" : "text-slate-600")}>
                  {plan.desc}
                </p>

                <div className="mb-6">
                  {typeof price === 'number' ? (
                    <div>
                      <span className={cn("text-4xl font-black", plan.popular ? "text-electric-600" : "text-navy-900")}>
                        {price} kr
                      </span>
                      <span className={cn("text-xs font-medium", plan.popular ? "text-slate-500" : "text-slate-500")}>
                        {" "}/ mnd ekskl. mva
                      </span>
                    </div>
                  ) : (
                    <span className="text-3xl font-black text-navy-900">{price}</span>
                  )}
                </div>

                <ul className="space-y-3 text-xs mb-8 font-medium">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                      <span className={plan.popular ? "text-slate-800 font-medium" : "text-slate-700"}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => handleSelectPlan(plan.id)}
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer",
                  plan.popular 
                    ? "bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold shadow-purple-cta hover:shadow-purple-hover" 
                    : "bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold border border-slate-200"
                )}
              >
                {plan.id === 'enterprise' ? 'Kontakt salg' : `Velg ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modular Addons & Customization */}
      <div className="bg-slate-50 rounded-3xl p-8 sm:p-12 border border-slate-200 mb-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-electric-600 uppercase tracking-widest bg-emerald-100/60 px-3 py-1 rounded-full">
            100 % fleksibelt
          </span>
          <h3 className="text-2xl font-bold text-navy-900 mt-3 mb-2">
            Skreddersy pakken med modulære tillegg
          </h3>
          <p className="text-xs text-slate-500">
            Start med det du trenger i dag, og bygg på med spesialiserte fagmoduler, ekstra kvoter og regnskapsintegrasjoner når bedriften vokser.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {addons.map((addon, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-electric-300/40 transition-colors">
              <div className="text-xs font-bold text-navy-900 mb-1">{addon.title}</div>
              <div className="text-sm font-black text-electric-600 mb-1.5">{addon.price}</div>
              <div className="text-[11px] text-slate-500 leading-snug">{addon.desc}</div>
            </div>
          ))}
        </div>
      </div>

    </PageWrapper>
  );
};

/* =========================================================================
   2. ABOUT PAGE
   ========================================================================= */
export const AboutPage = () => {
  const { t } = useTranslation();
  return (
    <PageWrapper 
      badge="Om VikingMester"
      title="Bygget for og med norske håndverkere"
      subtitle="Norges første 100 % autonome AI-byggeleder i lomma. Snakk rett inn i Teams, Slack eller WhatsApp – agenten ordner resten."
    >
      <div className="space-y-12">
        {/* Intro Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-6 text-neutral-700 leading-relaxed text-base">
          <p className="text-lg font-medium text-navy-900">
            Byggebransjen i Norge er underlagt strenge, men nødvendige krav: TEK17, SAK10, Byggherreforskriften og Arbeidsmiljølovens internkontrollforskrift.
          </p>
          <p>
            I altfor mange år har dette betydd tapte kveldstimer ved kjøkkenbordet foran PC-en, mapper fulle av uleselige lapper, og bilder spredt på private telefoner. Håndverkere skal bygge – ikke kaste bort kveldene på tungvinte datasystemer.
          </p>
          <p>
            VikingMester ble grunnlagt for å endre dette radikalt. Ved å kombinere dyp norsk bransjeinnsikt (TEK17, SAK10, NS 8406) med en 100 % autonom samtaleagent i Microsoft Teams, Slack og WhatsApp, gjøres all registrering, byggedagbok, SJA og avviksrapportering ferdig mens du står med hammeren i hånden.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-electric-50/60 p-8 rounded-3xl border border-emerald-100">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center font-bold mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-bold text-lg text-emerald-950 mb-2">100% Norsk Regelverk</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Utviklet spesifikt etter norske standarder (NS 8405, NS 8406, TEK17, SAK10 og Våtromsnormen).
            </p>
          </div>

          <div className="bg-blue-50/60 p-8 rounded-3xl border border-blue-100">
            <div className="w-12 h-12 bg-blue-100 text-blue-800 rounded-2xl flex items-center justify-center font-bold mb-4">
              <Sparkles size={24} />
            </div>
            <h3 className="font-bold text-lg text-blue-950 mb-2">Intelligent Assistanse</h3>
            <p className="text-xs text-blue-800 leading-relaxed">
              Mesterhjernen analyserer bilder, sjekker værdata fra Yr.no og oversetter tale til juridisk vanntette rapporter.
            </p>
          </div>

          <div className="bg-purple-50/60 p-8 rounded-3xl border border-purple-100">
            <div className="w-12 h-12 bg-purple-100 text-purple-800 rounded-2xl flex items-center justify-center font-bold mb-4">
              <Lock size={24} />
            </div>
            <h3 className="font-bold text-lg text-purple-950 mb-2">Sikkerhet & Eierskap</h3>
            <p className="text-xs text-purple-800 leading-relaxed">
              All data lagres kryptert i Europa i henhold til GDPR. Du beholder 100 % eierskap til din bedrifts data.
            </p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="bg-navy-900 rounded-3xl p-8 sm:p-12 text-white grid grid-cols-2 md:grid-cols-4 gap-6 text-center border border-navy-800 shadow-card-hover">
          <div>
            <div className="text-3xl sm:text-4xl font-black text-electric-400 mb-1">450+</div>
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider">Aktive håndverkerbedrifter</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-electric-400 mb-1">12 000+</div>
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider">SJA-analyser utført</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-electric-400 mb-1">99.8%</div>
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider">Godkjent i tilsyn</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-electric-400 mb-1">4.5 timer</div>
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider">Spart per arbeider/uke</div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

/* =========================================================================
   3. CONTACT PAGE
   ========================================================================= */
export const ContactPage = () => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { db, collection, addDoc, serverTimestamp } = await import('../services/dbAdapter');
      await addDoc(collection(db, 'leads'), {
        name,
        email,
        phone,
        message,
        status: 'new',
        createdAt: serverTimestamp(),
        source: 'contact_page'
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Det oppsto en feil ved sending av meldingen. Vennligst prøv igjen eller ring oss direkte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper 
      badge="Vi er her for deg"
      title="Kontakt oss for en prat eller demo" 
      subtitle="Har du spørsmål om systemet, ønsker en skreddersydd bedriftsgjennomgang, eller trenger hjelp? Vårt norske team svarer raskt."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Left: Contact Info & Support Cards */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm space-y-6">
            <h3 className="font-bold text-xl text-navy-900">Direkte kontaktpunkter</h3>
            
            <div className="space-y-5">
              <a 
                href="tel:+4740163082" 
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-colors group"
              >
                <div className="w-12 h-12 bg-emerald-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-navy-900 transition-colors">
                  <Phone size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Telefon (Hverdager 08:00 - 16:00)</p>
                  <p className="text-base font-bold text-navy-900">+47 401 63 082</p>
                </div>
              </a>

              <a 
                href="mailto:hei@vikingmester.no" 
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-colors group"
              >
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-navy-900 transition-colors">
                  <Mail size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">E-post</p>
                  <p className="text-base font-bold text-navy-900">hei@vikingmester.no</p>
                </div>
              </a>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Lokasjon & Drift</p>
                  <p className="text-sm font-bold text-navy-900">Norge (Heldigitalt økosystem for bygg & anlegg)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-electric-50 rounded-3xl p-6 border border-emerald-100 flex items-center gap-4">
            <Clock size={24} className="text-amber-600 shrink-0" />
            <p className="text-xs text-emerald-900 font-medium leading-relaxed">
              <b>Garantert responstid:</b> Vi svarer på alle skriftlige henvendelser innen 2 timer i vanlig arbeidstid.
            </p>
          </div>
        </div>

        {/* Right: Contact Form */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm">
          {success ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-electric-600 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-2xl font-black text-navy-900">Melding mottatt!</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Takk for at du tok kontakt. En av våre rådgivere vil kontakte deg snarlig.
              </p>
              <button 
                onClick={() => setSuccess(false)}
                className="text-xs font-bold text-electric-600 hover:text-amber-600 underline pt-4 cursor-pointer"
              >
                Send en ny melding
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-xl font-bold text-navy-900 mb-2">Send oss en melding</h3>
              
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Ditt navn *
                </label>
                <input 
                  required
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ola Nordmann"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 focus:bg-white outline-none transition-all" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                    E-postadresse *
                  </label>
                  <input 
                    required
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ola@byggmester.no"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 focus:bg-white outline-none transition-all" 
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                    Telefonnummer
                  </label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+47 900 00 000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 focus:bg-white outline-none transition-all" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Hva kan vi hjelpe deg med? *
                </label>
                <textarea 
                  required
                  rows={4} 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Fortell oss gjerne litt om din bedrift, antall ansatte og hva dere ser etter..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-electric-500/20 focus:border-electric-500 focus:bg-white outline-none transition-all resize-none" 
                />
              </div>

              <button 
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold text-sm tracking-wide shadow-purple-cta hover:shadow-purple-hover transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Sender henvendelse...' : 'Send henvendelse'}
              </button>
            </form>
          )}
        </div>

      </div>
    </PageWrapper>
  );
};

/* =========================================================================
   4. PRIVACY PAGE (GDPR)
   ========================================================================= */
export const PrivacyPage = () => {
  return (
    <PageWrapper 
      badge="Personvern & Sikkerhet"
      title="Personvernerklæring"
      subtitle="VikingMester behandler personopplysninger i full overensstemmelse med den norske personopplysningsloven og EUs personvernforordning (GDPR)."
    >
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-sm">
        
        <section className="space-y-3">
          <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <ShieldCheck size={22} className="text-electric-600" />
            1. Behandlingsansvarlig
          </h3>
          <p>
            Vikingnet / AIChat Norge AS er behandlingsansvarlig for behandling av personopplysninger som samles inn ved bruk av våre digitale tjenester, mobilapplikasjoner og kundeportaler. Vi forplikter oss til å beskytte integriteten og konfidensialiteten til våre brukeres data.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <FileText size={22} className="text-blue-600" />
            2. Hvilke data behandler vi og formålet?
          </h3>
          <p>
            Vi behandler kun opplysninger som er nødvendige for å levere og opprettholde et trygt kvalitetssikrings- og HMS-system:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-500">
            <li><b>Brukerkonto:</b> Navn, firmatilhørighet, rolle, e-postadresse og telefonnummer.</li>
            <li><b>Prosjekt- og fildokumentasjon:</b> Prosjektnavn, matrikkelinformasjon (Gnr/Bnr), bilder fra byggeplass, SJA-registreringer og avviksrapporter.</li>
            <li><b>Geolokasjon og tidsstempel:</b> Ved bildedokumentasjon til sjekklister registreres tidspunkt og koordinater for å oppfylle kravene til sporbarhet iht. TEK17 og SAK10.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <Lock size={22} className="text-purple-600" />
            3. Datalagring og sikkerhet
          </h3>
          <p>
            All data lagres i sikre datasentre innenfor EØS/Norge med kryptering både under overføring (TLS/HTTPS) og ved lagring (256-bit AES). Vi foretar daglige automatiske sikkerhetskopier for å forhindre tap av data.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <HelpCircle size={22} className="text-electric-600" />
            4. Dine rettigheter
          </h3>
          <p>
            Du har til enhver tid rett til innsyn i egne personopplysninger, retting av uriktige data, dataportabilitet, og sletting av opplysninger der lovbestemte oppbevaringskrav (f.eks. bokføringsloven eller plan- og bygningsloven) ikke er til hinder.
          </p>
        </section>

      </div>
    </PageWrapper>
  );
};

/* =========================================================================
   5. TERMS PAGE
   ========================================================================= */
export const TermsPage = () => {
  return (
    <PageWrapper 
      badge="Avtalebetingelser"
      title="Vilkår og Betingelser"
      subtitle="Brukervilkår for VikingMester programvare- og skytjenester."
    >
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-sm">
        
        <section className="space-y-3">
          <h3 className="text-xl font-bold text-navy-900">1. Avtalens omfang</h3>
          <p>
            Disse vilkårene regulerer tilgang til og bruk av VikingMester sine tjenester for bedriftskunder og deres autoriserte brukere. Ved å opprette en konto eller ta systemet i bruk, aksepteres disse betingelsene i sin helhet.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-navy-900">2. Brukerens ansvar og faglig kontroll</h3>
          <p>
            VikingMester leverer programvareverktøy og AI-assistanse for å effektivisere kvalitetssikring, HMS og FDV. Det påligger alltid den utførende fagpersonen og bedriftens ledelse å verifisere at dokumentasjon, kalkyleresultater og faglige vurderinger er i samsvar med gjeldende lover, TEK17 og prosjektets faktiske forhold.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-navy-900">3. Prøveperiode, abonnement og oppsigelse</h3>
          <p>
            Tjenesten faktureres etterskuddsvis eller månedlig via standard bedriftsfaktura (EHF/e-post) uten bindingstid, med mindre annet er særskilt avtalt. Oppsigelse kan gjøres når som helst før neste fornyelsesperiode via innstillingene i systemet eller skriftlig til support.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-navy-900">4. Oppetid og dataeierskap</h3>
          <p>
            Kunden beholder det fulle og eksklusive eierskapet til alle prosjektdata, bilder og dokumenter som lastes opp eller genereres i tjenesten. Kunden kan når som helst eksportere sine data.
          </p>
        </section>

      </div>
    </PageWrapper>
  );
};
