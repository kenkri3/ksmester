'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  Send, 
  Search, 
  Sparkles, 
  TrendingUp, 
  Briefcase, 
  Phone, 
  Mail, 
  FileText, 
  ShieldCheck, 
  ArrowRight, 
  Copy, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Flame, 
  UserCheck, 
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface PartnerLead {
  id: string;
  source: string;
  sellerName: string;
  sellerEmail?: string;
  company: string;
  orgnr?: string;
  name: string;
  email: string;
  phone?: string;
  trade: string;
  leadType: 'info' | 'trial' | 'order';
  plan: string;
  monthlyPrice: number;
  notes?: string;
  status: string;
  createdAt: string;
  followUpSentAt?: string;
}

interface PartnerStats {
  totalLeads: number;
  contacted: number;
  totalEstimatedMrc: number;
  sellersCount: number;
  sellers: string[];
}

interface PartnerPortalProps {
  onBackToApp?: () => void;
}

export default function PartnerPortal({ onBackToApp }: PartnerPortalProps) {
  // Selger-profil (lagres i localStorage)
  const [sellerName, setSellerName] = useState('');
  const [sellerEmail, setSellerEmail] = useState('');

  // Lead-skjema
  const [companyInput, setCompanyInput] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [trade, setTrade] = useState('Byggmester / Tømrer');
  const [leadType, setLeadType] = useState<'info' | 'trial' | 'order'>('info');
  const [planChoice, setPlanChoice] = useState('team');
  const [workers, setWorkers] = useState('3');
  const [notes, setNotes] = useState('');

  // Brønnøysund-oppslag
  const [isSearchingBrreg, setIsSearchingBrreg] = useState(false);
  const [brregResult, setBrregResult] = useState<any>(null);

  // Status & Leads-liste
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successLead, setSuccessLead] = useState<PartnerLead | null>(null);
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [stats, setStats] = useState<PartnerStats>({
    totalLeads: 0,
    contacted: 0,
    totalEstimatedMrc: 0,
    sellersCount: 0,
    sellers: []
  });
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Last inn selgernavn fra localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSeller = localStorage.getItem('vikingmester_seller_name');
      const savedEmail = localStorage.getItem('vikingmester_seller_email');
      if (savedSeller) setSellerName(savedSeller);
      if (savedEmail) setSellerEmail(savedEmail);
    }
  }, []);

  // Lagre selgernavn i localStorage ved endring
  const handleSellerChange = (name: string, mail?: string) => {
    setSellerName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vikingmester_seller_name', name);
      if (mail !== undefined) {
        setSellerEmail(mail);
        localStorage.setItem('vikingmester_seller_email', mail);
      }
    }
  };

  // Hent leads og nøkkeltall
  const fetchLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const res = await fetch('/api/partner/leads');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLeads(data.leads || []);
          if (data.stats) setStats(data.stats);
        }
      }
    } catch (e) {
      console.warn('Could not fetch partner leads:', e);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Brønnøysund-oppslag
  const handleBrregLookup = async (query: string) => {
    const q = query.trim().replace(/\s+/g, '');
    if (!q || q.length < 2) return;

    setIsSearchingBrreg(true);
    try {
      let url = '';
      if (/^\d{9}$/.test(q)) {
        url = `https://data.brreg.no/enhetsregisteret/api/enheter/${q}`;
      } else {
        url = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(query)}&size=1`;
      }

      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const unit = data._embedded ? data._embedded.enheter?.[0] : data;
        if (unit && unit.navn) {
          setBrregResult(unit);
          setCompanyInput(unit.navn);
          if (unit.antallAnsatte) {
            setWorkers(unit.antallAnsatte.toString());
          }
          toast.success(`Fant ${unit.navn} i Brønnøysundregistrene!`);
        } else {
          toast.info('Ingen treff i Enhetsregisteret, men du kan taste manuelt.');
        }
      }
    } catch (err) {
      console.warn('Brreg lookup error:', err);
    } finally {
      setIsSearchingBrreg(false);
    }
  };

  // Innsending av lead
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sellerName.trim()) {
      toast.error('Vennligst skriv inn selgernavn øverst først.');
      return;
    }

    if (!companyInput.trim()) {
      toast.error('Vennligst skriv inn bedriftsnavn eller org.nummer.');
      return;
    }

    if (!contactName.trim()) {
      toast.error('Vennligst oppgi kontaktperson.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      toast.error('Gyldig e-postadresse er påkrevd for at agenten skal kunne følge opp kunden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sellerName: sellerName.trim(),
        sellerEmail: sellerEmail.trim() || undefined,
        company: companyInput.trim(),
        orgnr: brregResult?.organisasjonsnummer || (/^\d{9}$/.test(companyInput.trim()) ? companyInput.trim() : undefined),
        contactName: contactName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        trade,
        leadType,
        plan: planChoice,
        workers: Number(workers) || 3,
        notes: notes.trim()
      };

      const res = await fetch('/api/partner/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kunne ikke registrere lead');
      }

      setSuccessLead(data.lead);
      toast.success(`🎉 Lead registrert! Autonom velkomstepost er sendt til ${data.lead.email}!`);

      // Nullstill skjemafelter (men behold selgernavn)
      setCompanyInput('');
      setContactName('');
      setEmail('');
      setPhone('');
      setNotes('');
      setBrregResult(null);

      // Oppdater listen
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Noe gikk galt under registrering.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPartnerLink = () => {
    const sName = encodeURIComponent(sellerName.trim() || 'Partner');
    const link = `https://vikingmester.no?ref=${sName}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Hurtiglenke kopiert til utklippstavlen!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Filtrerte leads
  const filteredLeads = leads.filter(l => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      l.company.toLowerCase().includes(q) ||
      l.name.toLowerCase().includes(q) ||
      (l.sellerName && l.sellerName.toLowerCase().includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.orgnr && l.orgnr.includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-500/30 selection:text-purple-300">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 font-black text-white text-base">
            VM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight">VikingMester</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                50/50 Partnerportal
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Autonomt Lead-inntak & Onboarding</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyPartnerLink}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Kopier direkte lenke med din selger-referanse"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-purple-400" />}
            <span>{copiedLink ? 'Kopiert!' : 'Kopier SMS-lenke'}</span>
          </button>

          {onBackToApp ? (
            <button
              onClick={onBackToApp}
              className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
            >
              ← Tilbake til systemet
            </button>
          ) : (
            <a
              href="/"
              className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              Gå til vikingmester.no →
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/20 p-6 sm:p-8 shadow-2xl">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <Sparkles size={13} className="text-purple-400" />
              Sømløs Onboarding • 100 % Autonom Oppfølging
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Partner Lead-Inntak & Salg
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
              Legg inn håndverkerbedrifter som ønsker informasjon, demo eller bestilling. 
              Vår autonome agent tar over umiddelbart, sender skreddersydd introduksjon fra 
              <code className="text-purple-300 mx-1 bg-purple-900/40 px-1.5 py-0.5 rounded font-mono text-xs">hei@vikingnet.no</code> 
              på dine vegne, og følger opp kunden automatisk.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Users size={14} className="text-purple-400" /> Registrerte leads
              </div>
              <div className="text-xl font-black text-white mt-1">{stats.totalLeads}</div>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" /> Autonomt fulgt opp
              </div>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {stats.totalLeads > 0 ? `${Math.round((stats.contacted / stats.totalLeads) * 100)} %` : '100 %'}
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-indigo-400" /> Pipeline-verdi
              </div>
              <div className="text-xl font-black text-indigo-300 mt-1">
                kr {stats.totalEstimatedMrc.toLocaleString('nb-NO')},- <span className="text-[11px] font-normal text-slate-400">/ mnd</span>
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-400" /> Partnerskap
              </div>
              <div className="text-xl font-black text-amber-300 mt-1">
                50 / 50 <span className="text-[11px] font-normal text-slate-400">Deling</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Form & List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Selgeridentifikasjon */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <UserCheck size={16} /> 1. Hvem registrerer leadet? (Selger / Partner)
                </h3>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Check size={12} /> Huskes automatisk
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Ditt selgernavn / Partner <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => handleSellerChange(e.target.value, sellerEmail)}
                    placeholder="F.eks. Lars Erik Eng"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Brukes i oppfølgingse-posten og 50/50-avregningen.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Din e-postadresse <span className="text-slate-400 font-normal">(valgfritt)</span>
                  </label>
                  <input
                    type="email"
                    value={sellerEmail}
                    onChange={(e) => handleSellerChange(sellerName, e.target.value)}
                    placeholder="F.eks. lars@nonfoodgroup.no"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Du mottar bekreftelse når leadet er fulgt opp.</p>
                </div>
              </div>
            </div>

            {/* Step 2: Registreringsskjema */}
            <form onSubmit={handleSubmitLead} className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-5">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <Building2 size={16} /> 2. Bedrift & Kontaktperson
                </h3>
                <span className="text-xs text-slate-400">Enkel registrering</span>
              </div>

              {/* Brønnøysund Autocomplete Felt */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Bedriftsnavn eller Org.nummer (9 siffer) <span className="text-red-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={companyInput}
                    onChange={(e) => {
                      setCompanyInput(e.target.value);
                      if (/^\d{9}$/.test(e.target.value.trim())) {
                        handleBrregLookup(e.target.value);
                      }
                    }}
                    placeholder="F.eks. 933 851 222 eller Byggmester Hansen AS"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-3.5 pr-24 py-2.5 text-sm text-white placeholder-slate-500 transition font-sans"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleBrregLookup(companyInput)}
                    disabled={isSearchingBrreg || !companyInput.trim()}
                    className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-bold text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    {isSearchingBrreg ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                    <span>Søk Brreg</span>
                  </button>
                </div>

                {/* Brreg Info Badge if found */}
                {brregResult && (
                  <div className="mt-2.5 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        {brregResult.navn}
                        <span className="text-[10px] bg-purple-500/30 px-1.5 py-0.2 rounded font-mono text-purple-300">
                          {brregResult.organisasjonsnummer}
                        </span>
                      </div>
                      <div className="text-slate-300 text-[11px]">
                        {brregResult.forretningsadresse?.adresse?.[0]}, {brregResult.forretningsadresse?.postnummer} {brregResult.forretningsadresse?.poststed}
                        {brregResult.antallAnsatte ? ` • ${brregResult.antallAnsatte} ansatte` : ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Kontaktperson */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kontaktperson (Navn) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="F.eks. Ole Hansen (Daglig leder)"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Telefonnummer / Mobil
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="F.eks. 900 00 000"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition"
                  />
                </div>
              </div>

              {/* E-post (Kritisk for oppfølging) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kundens e-postadresse <span className="text-red-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="F.eks. ole@hansenbygg.no"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-500 transition font-sans"
                    required
                  />
                  <Mail size={16} className="absolute right-3.5 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Den autonome agenten sender en personlig velkomsthilsen hit så snart du klikker lagre.
                </p>
              </div>

              {/* Fagområde */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Fagområde
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Byggmester / Tømrer',
                    'Totalentreprenør',
                    'Rørlegger / VVS',
                    'Elektriker / Elektro',
                    'Maler & Flis',
                    'Mur & Betong',
                    'Annet håndverksfag'
                  ].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTrade(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        trade === t
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hva ønsker kunden? (Lead type) */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Hva ønsker kunden nå? <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setLeadType('info')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      leadType === 'info'
                        ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <FileText size={16} className="text-purple-400" />
                      Uforpliktende info
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Agenten sender introduksjon, funksjoner og veiledende priser.
                    </p>
                  </div>

                  <div
                    onClick={() => setLeadType('trial')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      leadType === 'trial'
                        ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles size={16} className="text-indigo-400" />
                      14 dagers prøve
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Agenten klargjør testbruker og sender innloggingsveiledning.
                    </p>
                  </div>

                  <div
                    onClick={() => setLeadType('order')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      leadType === 'order'
                        ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Flame size={16} className="text-amber-400" />
                      Bestilling / Avtale
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Agenten sender velkomst og fakturagrunnlag (EHF).
                    </p>
                  </div>
                </div>
              </div>

              {/* Notater / Hva dere snakket om */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Notater / Hva snakket dere om? <span className="text-slate-400 font-normal">(AI-kontekst)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="F.eks. Snakket med Ole på telefon. De er 4 tømrere, sliter med tidsbruk på byggedagbok og vil ha kontroll på sluk/membran på bad."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 Agenten fletter dette naturlig inn i e-posten slik at kunden opplever henvendelsen som 100 % skreddersydd og personlig.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Lagrer og sender autonom oppfølging...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Registrer lead & Start autonom oppfølging 🚀</span>
                  </>
                )}
              </button>
            </form>

            {/* Suksesskort hvis nylig registrert */}
            {successLead && (
              <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/40 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 size={18} />
                  ✓ Lead registrert & oppfølging aktivert for {successLead.company}!
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Den autonome agenten har nå sendt en personlig introduksjonse-post til 
                  <strong className="text-white mx-1">{successLead.email}</strong> 
                  på vegne av <strong>{successLead.sellerName}</strong>. 
                  Varsel er også sendt til Kenneth, Fredrik og aichatnorge@gmail.com.
                </p>
                <button
                  onClick={() => setSuccessLead(null)}
                  className="text-xs text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  Lukk bekreftelse og registrer neste lead →
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Registrerte Leads & Statistikk (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <FileText size={16} /> Registrerte Leads ({filteredLeads.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">Sanntidsoversikt over partnerleads</p>
                </div>
                <button
                  onClick={fetchLeads}
                  disabled={isLoadingLeads}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="Oppdater liste"
                >
                  <RefreshCw size={14} className={isLoadingLeads ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Søk / filter */}
              <div className="relative">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Søk i bedrift, selger eller kontaktperson..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 transition"
                />
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              </div>

              {/* Liste over leads */}
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {isLoadingLeads ? (
                  <div className="text-center py-10 text-xs text-slate-500">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-purple-400" />
                    Henter leads fra databasen...
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500 space-y-2">
                    <Building2 size={28} className="mx-auto text-slate-600" />
                    <p>Ingen leads registrert ennå.</p>
                    <p className="text-[11px] text-slate-600">
                      Bruk skjemaet til venstre for å legge inn din første håndverker!
                    </p>
                  </div>
                ) : (
                  filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            {lead.company}
                            {lead.orgnr && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({lead.orgnr})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-300 font-medium">
                            {lead.name} • {lead.trade}
                          </div>
                        </div>

                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Fulgt opp
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1">
                          <Mail size={12} className="text-slate-500" /> {lead.email}
                        </span>
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} className="text-slate-500" /> {lead.phone}
                          </span>
                        )}
                      </div>

                      {lead.notes && (
                        <div className="p-2 rounded bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 italic">
                          «{lead.notes}»
                        </div>
                      )}

                      <div className="pt-1 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          Selger: <strong className="text-purple-300">{lead.sellerName || 'Partner'}</strong>
                        </span>
                        <span>
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('nb-NO') : 'Nylig'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Partner Info Box */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950/30 border border-slate-800 p-5 text-xs text-slate-300 space-y-2.5">
              <div className="font-bold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-purple-400" />
                50/50 Partnerskapsavtale
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Alle leads som registreres her merkes automatisk i databasen og inkluderes i den månedlige 50/50-avregningen 
                for VikingMester. Eventuelle tilleggsprodukter og mersalg følges opp av Vikingnet.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
