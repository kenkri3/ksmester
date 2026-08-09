import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Mail, Phone, MapPin, ShieldCheck, FileText, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PageWrapper = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-neutral-50">
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-xl shadow-neutral-200/50 border border-neutral-100 p-8 lg:p-16"
      >
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-8">{title}</h1>
        <div className="prose prose-neutral max-w-none">
          {children}
        </div>
      </motion.div>
    </div>
  </div>
);

export const PricingPage = () => {
  const { t } = useTranslation();
  const plans = [
    {
      name: 'Basis',
      price: '990,-',
      desc: 'For små bedrifter og enkeltpersonforetak.',
      features: ['Opptil 3 brukere', 'Ubegrenset SJA', 'Mobilapp', 'Grunnleggende HMS/KS']
    },
    {
      name: 'Pro',
      price: '2490,-',
      desc: 'For voksende håndverksbedrifter.',
      features: ['Opptil 15 brukere', 'AI-drevet bildeanalyse', 'Prosjektstyring', 'Integrasjon med Boligmappa', 'Prioritert support'],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Kontakt oss',
      desc: 'For store entreprenører med komplekse behov.',
      features: ['Ubegrenset brukere', 'Full API-tilgang', 'Egen kontaktperson', 'Skreddersydde rapporter', 'Onboarding & opplæring']
    }
  ];

  return (
    <PageWrapper title={t('pricing', 'Priser')}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className={`p-8 rounded-3xl border ${plan.popular ? 'border-emerald-600 ring-4 ring-emerald-50 shadow-xl' : 'border-neutral-100'} relative`}
          >
            {plan.popular && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
                Mest populær
              </span>
            )}
            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
            <div className="text-3xl font-black text-emerald-600 mb-4">{plan.price}<span className="text-sm text-neutral-400 font-medium">/mnd</span></div>
            <p className="text-sm text-neutral-500 mb-6">{plan.desc}</p>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-neutral-600">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.popular ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200'}`}>
              Velg {plan.name}
            </button>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
};

export const AboutPage = () => {
  const { t } = useTranslation();
  return (
    <PageWrapper title={t('about_us', 'Om oss')}>
      <p className="text-lg text-neutral-600 leading-relaxed mb-6">
        KS MesterAI ble grunnlagt med en visjon om å forenkle hverdagen for norske håndverkere gjennom smart bruk av teknologi og kunstig intelligens.
      </p>
      <p className="text-neutral-600 leading-relaxed mb-8">
        Vi forstår utfordringene med dokumentasjon, HMS/KS og TEK17-krav. Vårt mål er å automatisere de tidkrevende prosessene slik at du kan bruke mer tid på det du er best til – selve håndverket.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
          <h3 className="font-bold text-emerald-900 mb-2">Vår Misjon</h3>
          <p className="text-sm text-emerald-700">Å være den ledende digitale partneren for kvalitetssikring i den norske byggenæringen.</p>
        </div>
        <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
          <h3 className="font-bold text-blue-900 mb-2">Vår Teknologi</h3>
          <p className="text-sm text-blue-700">Vi kombinerer dyp bransjekunnskap med avansert AI for å levere løsninger som faktisk fungerer på byggeplassen.</p>
        </div>
      </div>
    </PageWrapper>
  );
};

export const ContactPage = () => {
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { db, collection, addDoc, serverTimestamp } = await import('../services/dbAdapter');
      await addDoc(collection(db, 'leads'), {
        name,
        email,
        message,
        status: 'new',
        createdAt: serverTimestamp(),
        source: 'contact_form'
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Det oppsto en feil ved sending av meldingen. Vennligst prøv igjen senere.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper title={t('contact', 'Kontakt oss')}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <p className="text-neutral-600">Vi er her for å hjelpe deg. Ta kontakt for en uforpliktende prat eller demo.</p>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Mail size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">E-post</p>
                <p className="font-bold">support@ksmesterai.no</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <Phone size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Telefon</p>
                <p className="font-bold">+47 22 33 44 55</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Adresse</p>
                <p className="font-bold">Teknologiveien 1, 0123 Oslo</p>
              </div>
            </div>
          </div>
        </div>
        {success ? (
          <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100 text-center">
            <CheckCircle2 size={48} className="text-emerald-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-emerald-900 mb-2">Melding sendt!</h3>
            <p className="text-emerald-700">Takk for din henvendelse. Vi tar kontakt med deg så snart som mulig.</p>
            <button 
              onClick={() => setSuccess(false)}
              className="mt-6 text-sm font-bold text-emerald-600 hover:text-emerald-700"
            >
              Send en ny melding
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-neutral-50 p-8 rounded-3xl border border-neutral-100">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Navn</label>
              <input 
                required
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">E-post</label>
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Melding</label>
              <textarea 
                required
                rows={4} 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" 
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {loading ? 'Sender...' : 'Send melding'}
            </button>
          </form>
        )}
      </div>
    </PageWrapper>
  );
};

export const PrivacyPage = () => {
  const { t } = useTranslation();
  return (
    <PageWrapper title={t('privacy', 'Personvern')}>
      <div className="space-y-6 text-neutral-600 leading-relaxed">
        <section>
          <h3 className="text-xl font-bold text-neutral-900 mb-3 flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-600" />
            1. Behandling av personopplysninger
          </h3>
          <p>KS MesterAI behandler personopplysninger i samsvar med den til enhver tid gjeldende personvernlovgivning, herunder GDPR. Vi er opptatt av å beskytte ditt personvern og dine data.</p>
        </section>
        <section>
          <h3 className="text-xl font-bold text-neutral-900 mb-3 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            2. Hvilke data samler vi inn?
          </h3>
          <p>Vi samler inn informasjon du oppgir ved registrering (navn, e-post, firmanavn) og data som genereres ved bruk av tjenesten (prosjektdata, bilder, rapporter). Dette er nødvendig for å levere tjenesten.</p>
        </section>
        <section>
          <h3 className="text-xl font-bold text-neutral-900 mb-3 flex items-center gap-2">
            <HelpCircle size={20} className="text-purple-600" />
            3. Dine rettigheter
          </h3>
          <p>Du har rett til innsyn i egne personopplysninger, samt rett til å kreve rettet eller slettet mangelfulle eller uriktige opplysninger. Du kan når som helst trekke tilbake ditt samtykke.</p>
        </section>
      </div>
    </PageWrapper>
  );
};

export const TermsPage = () => {
  const { t } = useTranslation();
  return (
    <PageWrapper title={t('terms', 'Vilkår og betingelser')}>
      <div className="space-y-6 text-neutral-600 leading-relaxed">
        <section>
          <h3 className="text-xl font-bold text-neutral-900 mb-3">1. Aksept av vilkår</h3>
          <p>Ved å ta i bruk KS MesterAI aksepterer du disse vilkårene. Tjenesten leveres "som den er" for å støtte din bedrifts kvalitetssikringsarbeid.</p>
        </section>
        <section>
          <h3 className="text-xl font-bold text-neutral-900 mb-3">2. Brukerens ansvar</h3>
          <p>Brukeren er selv ansvarlig for at all dokumentasjon som genereres og lagres i systemet er korrekt og i samsvar med gjeldende lover og regler (f.eks. TEK17).</p>
        </section>
        <section>
          <h3 className="text-xl font-bold text-neutral-900 mb-3">3. Betaling og abonnement</h3>
          <p>Abonnementet faktureres månedlig eller årlig forskuddsvis. Oppsigelsestiden er inneværende måned pluss én måned, med mindre annet er avtalt.</p>
        </section>
      </div>
    </PageWrapper>
  );
};
