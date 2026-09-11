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
  ExternalLink,
  Lock,
  LogOut,
  HelpCircle,
  Clock,
  MessageSquare,
  Gift,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

interface PartnerLead {
  id: string;
  source: string;
  sellerId?: string;
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
  status: 'contacted' | 'dialogue' | 'trial' | 'won' | 'lost';
  timeline?: {
    id: string;
    timestamp: string;
    status: string;
    title: string;
    note: string;
    updatedBy: string;
  }[];
  createdAt: string;
  followUpSentAt?: string;
}

interface PartnerStats {
  totalLeads: number;
  contacted: number;
  inDialogue: number;
  inTrial: number;
  won: number;
  totalEstimatedMrc: number;
  wonMrc: number;
}

interface PartnerSeller {
  id: string;
  name: string;
  email: string;
  phone?: string;
  firm: string;
  role: string;
}

interface PartnerPortalProps {
  onBackToApp?: () => void;
}

export default function PartnerPortal({ onBackToApp }: PartnerPortalProps) {
  // Autentisering
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentSeller, setCurrentSeller] = useState<PartnerSeller | null>(null);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('login');
  
  // Skjemafelter for Auth
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authFirm, setAuthFirm] = useState('NonFoodGroup AS');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Nytt lead-skjema
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
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [successLead, setSuccessLead] = useState<PartnerLead | null>(null);
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [stats, setStats] = useState<PartnerStats>({
    totalLeads: 0,
    contacted: 0,
    inDialogue: 0,
    inTrial: 0,
    won: 0,
    totalEstimatedMrc: 0,
    wonMrc: 0
  });
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<PartnerLead | null>(null);

  // 1. Initialiser fra localStorage (Lagre token og selgerinfo)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('vikingmester_partner_token');
      const savedSellerJson = localStorage.getItem('vikingmester_partner_seller');

      if (savedToken && savedSellerJson) {
        try {
          const seller = JSON.parse(savedSellerJson);
          setAuthToken(savedToken);
          setCurrentSeller(seller);
        } catch (e) {
          localStorage.removeItem('vikingmester_partner_token');
          localStorage.removeItem('vikingmester_partner_seller');
        }
      }
    }
  }, []);

  // 2. Hent leads for innlogget selger
  const fetchLeads = async (tokenOverride?: string) => {
    const token = tokenOverride || authToken;
    setIsLoadingLeads(true);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/partner/leads', { headers });
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
    if (authToken) {
      fetchLeads(authToken);
    }
  }, [authToken]);

  // Auth Handling (Logg inn eller Registrer)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);

    try {
      if (authMode === 'register') {
        const ALLOWED_PARTNER_EMAILS = ['jm@nonfoodgroup.no', 'lars@nonfoodgroup.no'];
        const normalizedEmail = authEmail.trim().toLowerCase();

        if (!authName.trim()) {
          toast.error('Vennligst oppgi navnet ditt.');
          setIsAuthLoading(false);
          return;
        }

        if (!ALLOWED_PARTNER_EMAILS.includes(normalizedEmail)) {
          toast.error('Registrering er kun tilgjengelig for autoriserte selgere fra NonFoodGroup AS (jm@nonfoodgroup.no og lars@nonfoodgroup.no).');
          setIsAuthLoading(false);
          return;
        }

        const res = await fetch('/api/partner/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: authName.trim(),
            email: normalizedEmail,
            password: authPassword.trim(),
            phone: authPhone.trim(),
            firm: authFirm.trim()
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Kunne ikke opprette selgerkonto');
        }

        setAuthToken(data.token);
        setCurrentSeller(data.seller);
        localStorage.setItem('vikingmester_partner_token', data.token);
        localStorage.setItem('vikingmester_partner_seller', JSON.stringify(data.seller));
        toast.success(`🎉 Velkommen, ${data.seller.name}! Kontoen din er klar.`);
        fetchLeads(data.token);
      } else {
        // Login
        const res = await fetch('/api/partner/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authEmail.trim().toLowerCase(),
            password: authPassword.trim()
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Feil e-post eller passord');
        }

        setAuthToken(data.token);
        setCurrentSeller(data.seller);
        localStorage.setItem('vikingmester_partner_token', data.token);
        localStorage.setItem('vikingmester_partner_seller', JSON.stringify(data.seller));
        toast.success(`Velkommen tilbake, ${data.seller.name}!`);
        fetchLeads(data.token);
      }
    } catch (err: any) {
      toast.error(err.message || 'Innlogging feilet');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentSeller(null);
    localStorage.removeItem('vikingmester_partner_token');
    localStorage.removeItem('vikingmester_partner_seller');
    setLeads([]);
    toast.info('Du er nå logget ut av partnerportalen.');
  };

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
          toast.success(`Fant ${unit.navn} i Brønnøysund!`);
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

  // Innsending av nytt lead
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentSeller) {
      toast.error('Du må være innlogget som selger for å registrere leads.');
      return;
    }

    if (!companyInput.trim()) {
      toast.error('Vennligst oppgi firmanavn eller organisasjonsnummer.');
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

    setIsSubmittingLead(true);
    try {
      const payload = {
        sellerId: currentSeller.id,
        sellerName: currentSeller.name,
        sellerEmail: currentSeller.email,
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kunne ikke registrere lead');
      }

      setSuccessLead(data.lead);
      toast.success(`🎉 Lead registrert! Personlig e-post fra deg er sendt til ${data.lead.email}!`);

      // Nullstill felter
      setCompanyInput('');
      setContactName('');
      setEmail('');
      setPhone('');
      setNotes('');
      setBrregResult(null);

      // Oppdater liste
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Noe gikk galt under registrering.');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const handleCopyPartnerLink = () => {
    const sName = encodeURIComponent(currentSeller?.name || 'Partner');
    const link = `https://vikingmester.no?ref=${sName}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Hurtiglenke kopiert! Du kan sende denne på SMS til kunden.');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Filtrerte leads
  const filteredLeads = leads.filter(l => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      l.company.toLowerCase().includes(q) ||
      l.name.toLowerCase().includes(q) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.orgnr && l.orgnr.includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-500/30 selection:text-purple-300">
      {/* Topplinje */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 font-black text-white text-xs tracking-wider">
            NFG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight">NonFoodGroup AS</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                50/50 Partnerportal
              </span>
            </div>
            <p className="text-[11px] text-slate-400">VikingMester • Autonomt Salg & Onboarding</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentSeller ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-white">{currentSeller.name}</div>
                <div className="text-[10px] text-purple-400">{currentSeller.firm}</div>
              </div>

              <button
                onClick={handleCopyPartnerLink}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition cursor-pointer"
                title="Kopier direkte lenke med din selger-referanse"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-purple-400" />}
                <span>{copiedLink ? 'Kopiert!' : 'Kopier SMS-lenke'}</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 transition cursor-pointer"
                title="Logg ut av partnerportalen"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Logg ut</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Ikke innlogget
            </div>
          )}

          {onBackToApp ? (
            <button
              onClick={onBackToApp}
              className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
            >
              ← Tilbake
            </button>
          ) : (
            <a
              href="/"
              className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              vikingmester.no →
            </a>
          )}
        </div>
      </header>

      {/* Hovedinnhold */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ========================================================================= */}
        {/* HVIS IKKE INNLOGGET: Super-enkel registrering / innlogging for selgere    */}
        {/* ========================================================================= */}
        {!currentSeller ? (
          <div className="max-w-xl mx-auto space-y-6 py-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                <Sparkles size={14} className="text-purple-400" />
                VikingMester & NonFoodGroup AS • 50/50 Partner
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Partnerportal: NonFoodGroup AS
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Eksklusiv 50/50 salgsportal for NonFoodGroup AS. Legg inn potensielle kunder, og vår autonome AI-agent tar seg av oppfølging, tilbud og lukking for deg.
              </p>
            </div>

            {/* Miniguide: 1-2-3 (Akkurat som for barn) */}
            <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <HelpCircle size={15} /> Slik fungerer det for deg som selger (3 enkle steg):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span>
                    Legg inn bedriften
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Tast 9 siffer i org.nr eller firmanavn. Vi henter kontaktdata automatisk.
                  </p>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                    AI gjør jobben
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Agenten sender velkomst i ditt navn, svarer på spørsmål og forhandler avtalen.
                  </p>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                    Følg med & Tjen
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Du får e-post underveis, og ser nøyaktig når salget er lukket i ditt dashboard.
                  </p>
                </div>
              </div>
            </div>

            {/* Auth Kort */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
              {/* Tab selector */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`py-2 rounded-lg transition cursor-pointer text-center ${
                    authMode === 'login'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Logg inn som selger
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`py-2 rounded-lg transition cursor-pointer text-center ${
                    authMode === 'register'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ny selger? Registrer deg (20 sek)
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <>
                    <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl text-xs text-purple-200 flex items-start gap-2.5">
                      <Lock size={15} className="text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Eksklusiv partneradgang:</div>
                        <div className="text-purple-300/90 text-[11px] mt-0.5 leading-relaxed">
                          Kun forhåndsgodkjente adresser fra NonFoodGroup AS (<span className="text-white font-semibold">jm@nonfoodgroup.no</span> og <span className="text-white font-semibold">lars@nonfoodgroup.no</span>) kan opprette selgerkonto med 50/50 provisjon.
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Ditt fulle navn <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="F.eks. Lars Erik Eng / JM"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Samarbeidspartner
                      </label>
                      <div className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-purple-300 font-semibold flex items-center justify-between">
                        <span>NonFoodGroup AS (50/50 Partner)</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Låst avtale</span>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Din NonFoodGroup e-postadresse <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="jm@nonfoodgroup.no eller lars@nonfoodgroup.no"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition font-sans"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Her mottar du sanntidsoppdateringer og provisjonsvarsler når leads lukkes.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Passord <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Velg et trygt passord (minst 6 tegn)"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition"
                    required
                  />
                </div>

                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Telefonnummer (valgfritt)
                    </label>
                    <input
                      type="tel"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      placeholder="F.eks. 900 00 000"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isAuthLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Klargjør din konto...</span>
                    </>
                  ) : authMode === 'register' ? (
                    <>
                      <UserCheck size={16} />
                      <span>Opprett selgerkonto & Åpne portalen 🚀</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Logg inn på min salgsside →</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* NÅR SELGEREN ER INNLOGGET: Personlig Dashboard & Lead-registrering        */
          /* ========================================================================= */
          <div className="space-y-8">
            {/* Selger Dashboard Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/20 p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                    <UserCheck size={13} className="text-purple-400" />
                    Innlogget som {currentSeller.name} ({currentSeller.firm})
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Ditt Salgsdashbord & Pipeline
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    Her har du full oversikt over dine leads. Når du legger inn en håndverker, sender vi en personlig introduksjon fra 
                    <strong className="text-white mx-1">{currentSeller.name} (VikingMester)</strong>, og oppdaterer deg automatisk på e-post underveis!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPartnerLink}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Kopiert til utklippstavle!' : 'Kopier din invitasjonslenke'}</span>
                  </button>
                </div>
              </div>

              {/* Nøkkeltall for selgeren */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
                <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800">
                  <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <FileText size={14} className="text-purple-400" /> Dine registrerte leads
                  </div>
                  <div className="text-xl font-black text-white mt-1">{stats.totalLeads}</div>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800">
                  <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-indigo-400" /> I aktiv dialog / test
                  </div>
                  <div className="text-xl font-black text-indigo-400 mt-1">
                    {stats.inDialogue + stats.inTrial}
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800">
                  <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Award size={14} className="text-emerald-400" /> Vunnet salg (Avtaler)
                  </div>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    {stats.won}
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800">
                  <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-amber-400" /> Pipeline / Omsetning
                  </div>
                  <div className="text-xl font-black text-amber-300 mt-1">
                    kr {stats.totalEstimatedMrc.toLocaleString('nb-NO')},- <span className="text-[11px] font-normal text-slate-400">/ mnd</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2-kolonne innhold: Skjema (venstre) og Dine salg (høyre) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Venstre kolonne: Skjema for registrering av lead (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <form onSubmit={handleSubmitLead} className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-5">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                        <Building2 size={16} /> Legg inn nytt lead
                      </h3>
                      <p className="text-[11px] text-slate-400">Tast inn – vi følger opp umiddelbart</p>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Selger: {currentSeller.name}
                    </span>
                  </div>

                  {/* Brønnøysund Autocomplete */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      1. Firmanavn eller Org.nummer (9 siffer) <span className="text-red-400">*</span>
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
                        placeholder="F.eks. 933 851 222 eller Hansen Bygg AS"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl pl-3.5 pr-24 py-2.5 text-sm text-white placeholder-slate-500 transition font-sans"
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

                    {brregResult && (
                      <div className="mt-2.5 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <div>
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
                        2. Kontaktperson <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="F.eks. Ole Hansen"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Telefon / Mobil
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="F.eks. 900 00 000"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition"
                      />
                    </div>
                  </div>

                  {/* E-post */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      3. Kundens e-postadresse <span className="text-red-400">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="F.eks. ole@hansenbygg.no"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-500 transition font-sans"
                        required
                      />
                      <Mail size={16} className="absolute right-3.5 text-slate-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      💡 Vi sender en personlig e-post fra <strong>{currentSeller.name}</strong> til denne adressen umiddelbart.
                    </p>
                  </div>

                  {/* Hva ønsker kunden */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      4. Hva ønsker kunden nå?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div
                        onClick={() => setLeadType('info')}
                        className={`p-2.5 rounded-xl border cursor-pointer transition text-center ${
                          leadType === 'info'
                            ? 'bg-purple-950/50 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <FileText size={16} className="mx-auto text-purple-400 mb-1" />
                        <div className="text-xs font-bold text-white">Info & Materiell</div>
                      </div>

                      <div
                        onClick={() => setLeadType('trial')}
                        className={`p-2.5 rounded-xl border cursor-pointer transition text-center ${
                          leadType === 'trial'
                            ? 'bg-purple-950/50 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <Sparkles size={16} className="mx-auto text-indigo-400 mb-1" />
                        <div className="text-xs font-bold text-white">14 dagers test</div>
                      </div>

                      <div
                        onClick={() => setLeadType('order')}
                        className={`p-2.5 rounded-xl border cursor-pointer transition text-center ${
                          leadType === 'order'
                            ? 'bg-purple-950/50 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <Flame size={16} className="mx-auto text-amber-400 mb-1" />
                        <div className="text-xs font-bold text-white">Klar for kjøp</div>
                      </div>
                    </div>
                  </div>

                  {/* Notat */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      5. Hva snakket dere om? (Valgfritt notat)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="F.eks. Snakket på telefon, sliter med byggedagbøker og TEK17 på bad."
                      className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 transition"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Agenten nevner dette naturlig i e-posten slik at henvendelsen føles 100 % personlig.
                    </p>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmittingLead}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingLead ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Sender autonom oppfølging...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Send over til AI-agenten 🚀</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Suksesskort */}
                {successLead && (
                  <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/40 p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 size={18} />
                      ✓ Lead registrert for {successLead.company}!
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      E-post er nå sendt til <strong>{successLead.email}</strong> med <strong>{successLead.sellerName}</strong> som avsender. 
                      Du vil motta en e-postoppdatering så snart kunden svarer eller avtale inngås!
                    </p>
                    <button
                      onClick={() => setSuccessLead(null)}
                      className="text-xs text-emerald-400 hover:underline font-semibold cursor-pointer"
                    >
                      Lukk og legg inn neste lead →
                    </button>
                  </div>
                )}
              </div>

              {/* Høyre kolonne: Selgerens Pipeline & Salgsoversikt (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                        <Award size={16} /> Dine Registrerte Kunder & Salg ({filteredLeads.length})
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Her ser du nøyaktig hvor i prosessen kunden din er akkurat nå
                      </p>
                    </div>

                    <button
                      onClick={() => fetchLeads()}
                      disabled={isLoadingLeads}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Oppdater liste"
                    >
                      <RefreshCw size={14} className={isLoadingLeads ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {/* Søkefelt */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Søk i dine kunder..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 transition"
                    />
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  </div>

                  {/* Leads liste med visuell fremdriftslinje */}
                  <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
                    {isLoadingLeads ? (
                      <div className="text-center py-10 text-xs text-slate-500">
                        <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-purple-400" />
                        Henter dine salg...
                      </div>
                    ) : filteredLeads.length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-500 space-y-2">
                        <Building2 size={32} className="mx-auto text-slate-600" />
                        <p className="text-sm font-semibold text-slate-400">Ingen kunder lagt inn ennå.</p>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                          Bruk skjemaet til venstre for å legge inn din første håndverker! AI-agenten tar over resten.
                        </p>
                      </div>
                    ) : (
                      filteredLeads.map((lead) => {
                        // Beregn aktivt trinn (1: contacted, 2: dialogue, 3: trial, 4: won)
                        let activeStep = 1;
                        if (lead.status === 'dialogue') activeStep = 2;
                        else if (lead.status === 'trial') activeStep = 3;
                        else if (lead.status === 'won') activeStep = 4;

                        return (
                          <div
                            key={lead.id}
                            className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-3.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-bold text-white text-base flex items-center gap-2">
                                  {lead.company}
                                  {lead.orgnr && (
                                    <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                      {lead.orgnr}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-300 font-medium mt-0.5">
                                  {lead.name} • {lead.trade}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-sm font-black text-emerald-400">
                                  kr {lead.monthlyPrice.toLocaleString('nb-NO')},- <span className="text-[10px] text-slate-400 font-normal">/ mnd</span>
                                </div>
                                <div className="text-[10px] text-purple-400 font-semibold">{lead.plan}</div>
                              </div>
                            </div>

                            {/* Visuell Fremdriftsindikator (4 Steg for selgeren) */}
                            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 space-y-2">
                              <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                                <span>Status i salgsprosessen:</span>
                                <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                                  lead.status === 'won' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                  lead.status === 'trial' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                                  lead.status === 'dialogue' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                  'bg-slate-800 text-slate-300'
                                }`}>
                                  {lead.status === 'won' ? '🎉 Avtale inngått (Vunnet)' :
                                   lead.status === 'trial' ? '🚀 Prøveperiode aktiv' :
                                   lead.status === 'dialogue' ? '💬 Forhandling pågår' :
                                   '📬 Info & materiell sendt'}
                                </span>
                              </div>

                              {/* Steglinje */}
                              <div className="grid grid-cols-4 gap-1.5 pt-1">
                                <div className={`h-1.5 rounded-full ${activeStep >= 1 ? 'bg-purple-500' : 'bg-slate-800'}`} />
                                <div className={`h-1.5 rounded-full ${activeStep >= 2 ? 'bg-purple-500' : 'bg-slate-800'}`} />
                                <div className={`h-1.5 rounded-full ${activeStep >= 3 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
                                <div className={`h-1.5 rounded-full ${activeStep >= 4 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                              </div>

                              <div className="grid grid-cols-4 text-[10px] text-slate-400 font-medium text-center">
                                <span className={activeStep >= 1 ? 'text-purple-300 font-bold' : ''}>1. Kontaktet</span>
                                <span className={activeStep >= 2 ? 'text-purple-300 font-bold' : ''}>2. Forhandling</span>
                                <span className={activeStep >= 3 ? 'text-indigo-300 font-bold' : ''}>3. Prøveperiode</span>
                                <span className={activeStep >= 4 ? 'text-emerald-300 font-bold' : ''}>4. Salg lukket</span>
                              </div>
                            </div>

                            {/* Kontaktinfo & Tidsstempel */}
                            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 pt-1 border-t border-slate-900">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Mail size={12} className="text-slate-500" /> {lead.email}
                                </span>
                                {lead.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={12} className="text-slate-500" /> {lead.phone}
                                  </span>
                                )}
                              </div>

                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Clock size={11} />
                                {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('nb-NO') : 'Nylig'}
                              </span>
                            </div>

                            {/* Siste forhandlingsnotat hvis tilstede */}
                            {lead.timeline && lead.timeline.length > 0 && (
                              <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                                <div className="font-semibold text-purple-300 mb-0.5 flex items-center gap-1">
                                  <MessageSquare size={12} /> Siste AI-oppdatering:
                                </div>
                                <div className="italic text-slate-400">
                                  {lead.timeline[0].note || lead.timeline[0].title}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 50/50 Partnergaranti */}
                <div className="rounded-2xl bg-slate-900/90 border border-purple-500/30 p-5 space-y-2 text-xs">
                  <div className="font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-purple-400" />
                    100 % Trygt & Automatisert 50/50 Samarbeid
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Alle leads du registrerer merkes automatisk med din selgerkonto. Når avtaler lukkes, 
                    inngår inntekten direkte i den månedlige 50/50-avregningen for VikingMester. 
                    Du trenger ikke gjøre manuell oppfølging – agenten håndterer alt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
