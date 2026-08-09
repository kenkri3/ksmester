import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Building2, 
  Shield, 
  Zap, 
  Search, 
  Plus, 
  MoreVertical, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  X,
  Package,
  Settings,
  UserPlus,
  AlertTriangle,
  Calculator,
  Library,
  Car,
  Timer,
  GraduationCap,
  Mail,
  FileText,
  Send,
  MessageSquare,
  Clock,
  Tag,
  DollarSign,
  Sparkles,
  BrainCircuit,
  Copy
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { db, collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, handleFirestoreError, OperationType, orderBy } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

interface Company {
  id: string;
  name: string;
  orgNumber?: string;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  modules: string[];
  createdAt: any;
  userCount?: number;
}

export default function SuperAdmin() {
  const { user, startImpersonation } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'companies' | 'leads' | 'offers' | 'templates'>('companies');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isAnalyzingLead, setIsAnalyzingLead] = useState<string | null>(null);
  const [leadAnalysis, setLeadAnalysis] = useState<{[key: string]: any}>({});
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);

  // Offer form state
  const [offerForm, setOfferForm] = useState({
    recipientEmail: '',
    recipientName: '',
    companyName: '',
    modules: [] as string[],
    trialDays: 30,
    customPrice: 0,
    message: ''
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body: '',
    type: 'email' as 'email' | 'sms' | 'system',
    category: 'offer'
  });

  // Available modules
  const allModules = [
    { id: 'projects', name: 'Prosjektstyring', icon: <Plus size={16} /> },
    { id: 'checklists', name: 'KS/HMS Sjekklister', icon: <Shield size={16} /> },
    { id: 'deviations', name: 'Avvikshåndtering', icon: <AlertTriangle size={16} /> },
    { id: 'ai', name: 'AI Analyse & Vision', icon: <Zap size={16} /> },
    { id: 'economy', name: 'Tilbud & Kontrakt', icon: <Calculator size={16} /> },
    { id: 'fdv', name: 'FDV & Dokumentasjon', icon: <Library size={16} /> },
    { id: 'inventory', name: 'Lager & Verktøy', icon: <Package size={16} /> },
    { id: 'vehicle', name: 'Kjørebok & Bil', icon: <Car size={16} /> },
    { id: 'time', name: 'Timeføring', icon: <Timer size={16} /> },
    { id: 'apprentice', name: 'Lærlingmodul', icon: <GraduationCap size={16} /> },
    { id: 'building_app', name: 'Byggesøknad', icon: <Building2 size={16} /> }
  ];

  useEffect(() => {
    if (user?.email !== 'kenkri3@gmail.com') return;

    const companiesQ = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
    const unsubscribeCompanies = onSnapshot(companiesQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Company[];
      setCompanies(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'companies');
    });

    const leadsQ = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribeLeads = onSnapshot(leadsQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLeads(data);
    });

    const offersQ = query(collection(db, 'system_offers'), orderBy('createdAt', 'desc'));
    const unsubscribeOffers = onSnapshot(offersQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOffers(data);
    });

    const templatesQ = query(collection(db, 'templates'), orderBy('name', 'asc'));
    const unsubscribeTemplates = onSnapshot(templatesQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTemplates(data);
    });

    return () => {
      unsubscribeCompanies();
      unsubscribeLeads();
      unsubscribeOffers();
      unsubscribeTemplates();
    };
  }, [user]);

  useEffect(() => {
    if (!selectedCompany || !isUserModalOpen) return;

    const q = query(collection(db, 'users'), where('company', '==', selectedCompany.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCompanyUsers(data);
    });

    return () => unsubscribe();
  }, [selectedCompany, isUserModalOpen]);

  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette denne brukeren?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'leads');
    }
  };

  const handleAnalyzeLead = async (lead: any) => {
    setIsAnalyzingLead(lead.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyser denne lead-meldingen fra en potensiell kunde for et KS/HMS-system for byggbransjen:
        Navn: ${lead.name}
        E-post: ${lead.email}
        Melding: ${lead.message}
        
        Gi svar i JSON-format med følgende felt:
        - score: (0-100) Hvor sannsynlig er det at dette er en god kunde?
        - summary: En kort oppsummering av hva de trenger.
        - suggestedResponse: Et forslag til et profesjonelt svar.
        - priority: 'low', 'medium' eller 'high'.`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const analysis = JSON.parse(response.text || '{}');
      
      // Update lead in Firestore with AI analysis
      await updateDoc(doc(db, 'leads', lead.id), {
        aiScore: analysis.score,
        aiSummary: analysis.summary,
        aiPriority: analysis.priority,
        updatedAt: serverTimestamp()
      });

      setLeadAnalysis(prev => ({ ...prev, [lead.id]: analysis }));
    } catch (err) {
      console.error('AI Analysis error:', err);
    } finally {
      setIsAnalyzingLead(null);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette denne henvendelsen?')) return;
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'leads');
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await addDoc(collection(db, 'system_offers'), {
        ...offerForm,
        status: 'pending',
        token,
        createdAt: serverTimestamp(),
        createdBy: user?.uid
      });
      setIsOfferModalOpen(false);
      setOfferForm({
        recipientEmail: '',
        recipientName: '',
        companyName: '',
        modules: [],
        trialDays: 30,
        customPrice: 0,
        message: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'system_offers');
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'templates'), {
        ...templateForm,
        createdAt: serverTimestamp(),
        updatedBy: user?.uid
      });
      setIsTemplateModalOpen(false);
      setTemplateForm({
        name: '',
        subject: '',
        body: '',
        type: 'email',
        category: 'offer'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'templates');
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette denne kunden? Dette kan ikke angres.')) return;
    try {
      await deleteDoc(doc(db, 'companies', companyId));
      setSelectedCompany(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'companies');
    }
  };

  const handleUpdateCompanyInfo = async (companyId: string, name: string, orgNumber: string) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        name,
        orgNumber,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'companies');
    }
  };

  const handleUpdateModules = async (companyId: string, modules: string[]) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        modules,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'companies');
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.orgNumber?.includes(searchTerm)
  );

  if (user?.email !== 'kenkri3@gmail.com') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900">Ingen tilgang</h1>
          <p className="text-neutral-500">Du har ikke rettigheter til å se denne siden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-neutral-900 mb-2">SuperAdmin Dashboard</h1>
          <p className="text-neutral-500">Administrer alle kunder, moduler og systemtilgang.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
          >
            <FileText size={20} />
            Ny mal
          </button>
          <button 
            onClick={() => setIsOfferModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-100"
          >
            <Send size={20} />
            Send tilbud
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
          >
            <Plus size={20} />
            Opprett ny kunde
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: 'companies', label: 'Kunder', icon: <Building2 size={18} /> },
          { id: 'leads', label: 'Henvendelser', icon: <MessageSquare size={18} /> },
          { id: 'offers', label: 'Sendte tilbud', icon: <Send size={18} /> },
          { id: 'templates', label: 'Maler', icon: <FileText size={18} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-neutral-900 text-white shadow-lg" 
                : "bg-white text-neutral-500 hover:bg-neutral-50 border border-neutral-200"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'leads' && leads.filter(l => l.status === 'new').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                {leads.filter(l => l.status === 'new').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Totalt antall kunder', value: companies.length, icon: <Building2 className="text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Aktive abonnement', value: companies.filter(c => c.subscriptionStatus === 'active').length, icon: <CheckCircle2 className="text-emerald-600" />, bg: 'bg-emerald-50' },
          { label: 'Prøveperioder', value: companies.filter(c => c.subscriptionStatus === 'trial').length, icon: <Zap className="text-orange-600" />, bg: 'bg-orange-50' },
          { label: 'Systemstatus', value: 'Operativ', icon: <Shield className="text-amber-600" />, bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className={cn("p-6 rounded-[2rem] border border-neutral-200 shadow-sm", stat.bg)}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-black text-neutral-900">{stat.value}</div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'companies' && (
        <>
          {/* Search and Filters */}
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="text"
                  placeholder="Søk etter kundenavn eller org.nr..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Companies List */}
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Kunde</th>
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Status</th>
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Moduler</th>
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Brukere</th>
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Handlinger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-neutral-50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all">
                            <Building2 size={24} />
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900">{company.name}</div>
                            <div className="text-xs text-neutral-500">Org: {company.orgNumber || 'Ikke oppgitt'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          company.subscriptionStatus === 'active' ? "bg-emerald-100 text-emerald-700" :
                          company.subscriptionStatus === 'trial' ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {company.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1">
                          {company.modules?.map(m => (
                            <span key={m} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[10px] font-bold rounded uppercase">
                              {m}
                            </span>
                          ))}
                          {(!company.modules || company.modules.length === 0) && (
                            <span className="text-xs text-neutral-400 italic">Ingen moduler</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 font-bold text-neutral-600">
                        {company.userCount || 0}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setSelectedCompany(company); setIsEditInfoModalOpen(true); }}
                            className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Rediger kundeinfo"
                          >
                            <Building2 size={18} />
                          </button>
                          <button 
                            onClick={() => { setSelectedCompany(company); setIsUserModalOpen(true); }}
                            className="p-2 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                            title="Administrer brukere"
                          >
                            <Users size={18} />
                          </button>
                          <button 
                            onClick={() => { setSelectedCompany(company); setIsEditModalOpen(true); }}
                            className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="Rediger moduler"
                          >
                            <Settings size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteCompany(company.id)}
                            className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Slett kunde"
                          >
                            <Trash2 size={18} />
                          </button>
                          <button 
                            onClick={() => startImpersonation(company.id, 'admin')}
                            className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Impersonate (Logg inn som)"
                          >
                            <ExternalLink size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'leads' && (
        <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Navn</th>
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Melding</th>
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Status</th>
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Dato</th>
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="font-bold">{lead.name}</div>
                      <div className="text-xs text-neutral-500">{lead.email}</div>
                    </td>
                    <td className="px-8 py-6 max-w-xs">
                      <p className="text-sm text-neutral-600 truncate">{lead.message}</p>
                    </td>
                    <td className="px-8 py-6">
                      <select 
                        value={lead.status}
                        onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full outline-none border-none cursor-pointer",
                          lead.status === 'new' ? "bg-red-100 text-red-700" :
                          lead.status === 'contacted' ? "bg-blue-100 text-blue-700" :
                          "bg-neutral-100 text-neutral-700"
                        )}
                      >
                        <option value="new">Ny</option>
                        <option value="contacted">Kontaktet</option>
                        <option value="qualified">Kvalifisert</option>
                        <option value="lost">Tapt</option>
                      </select>
                    </td>
                    <td className="px-8 py-6 text-xs text-neutral-500">
                      {lead.createdAt?.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleAnalyzeLead(lead)}
                          disabled={isAnalyzingLead === lead.id}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            lead.aiScore ? "text-emerald-600 bg-emerald-50" : "text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50"
                          )}
                          title="AI Analyse"
                        >
                          {isAnalyzingLead === lead.id ? (
                            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Sparkles size={18} />
                          )}
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsResponseModalOpen(true);
                          }}
                          className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Svar"
                        >
                          <Mail size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setOfferForm({
                              ...offerForm,
                              recipientEmail: lead.email,
                              recipientName: lead.name
                            });
                            setIsOfferModalOpen(true);
                          }}
                          className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Send tilbud"
                        >
                          <Send size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Slett"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      {lead.aiScore && (
                        <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black uppercase text-emerald-700">AI Score</span>
                            <span className="text-xs font-bold text-emerald-900">{lead.aiScore}/100</span>
                          </div>
                          <p className="text-[10px] text-emerald-600 line-clamp-2">{lead.aiSummary}</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Mottaker</th>
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Pris</th>
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Status</th>
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Dato</th>
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {offers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="font-bold">{offer.recipientName}</div>
                      <div className="text-xs text-neutral-500">{offer.recipientEmail}</div>
                    </td>
                    <td className="px-8 py-6 font-bold text-neutral-900">
                      {offer.customPrice},-
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        offer.status === 'accepted' ? "bg-emerald-100 text-emerald-700" :
                        offer.status === 'declined' ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-xs text-neutral-500">
                      {offer.createdAt?.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => {
                          const url = `${window.location.origin}/?offer=${offer.token}`;
                          navigator.clipboard.writeText(url);
                          alert('Tilbudslenke kopiert til utklippstavlen!');
                        }}
                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink size={12} />
                        Kopier lenke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                  <FileText size={20} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setTemplateForm({
                        name: template.name,
                        subject: template.subject,
                        body: template.body,
                        type: template.type,
                        category: template.category
                      });
                      setIsTemplateModalOpen(true);
                    }}
                    className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Slette mal?')) {
                        await deleteDoc(doc(db, 'templates', template.id));
                      }
                    }}
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">{template.name}</h3>
              <p className="text-xs text-neutral-500 mb-4">{template.subject}</p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[10px] font-black uppercase tracking-widest rounded">
                  {template.type}
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded">
                  {template.category}
                </span>
              </div>
            </div>
          ))}
          <button 
            onClick={() => setIsTemplateModalOpen(true)}
            className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:bg-neutral-100 hover:border-neutral-300 transition-all"
          >
            <Plus size={24} />
            <span className="font-bold">Opprett ny mal</span>
          </button>
        </div>
      )}

      {/* Edit Modules Modal */}
      {isEditModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Skreddersy pakkeløsning</h2>
                <p className="text-sm text-neutral-500">Administrer moduler for {selectedCompany.name}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <XCircle size={24} className="text-neutral-400" />
              </button>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {allModules.map(module => {
                  const isActive = selectedCompany.modules?.includes(module.id);
                  return (
                    <button
                      key={module.id}
                      onClick={() => {
                        const newModules = isActive 
                          ? selectedCompany.modules.filter(m => m !== module.id)
                          : [...(selectedCompany.modules || []), module.id];
                        setSelectedCompany({ ...selectedCompany, modules: newModules });
                      }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                        isActive 
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900" 
                          : "border-neutral-100 bg-neutral-50 text-neutral-500 hover:border-neutral-200"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                        isActive ? "bg-emerald-600 text-white" : "bg-white text-neutral-400"
                      )}>
                        {module.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">{module.name}</div>
                        <div className="text-[10px] uppercase tracking-widest font-black opacity-60">
                          {isActive ? 'Aktiv' : 'Inaktiv'}
                        </div>
                      </div>
                      {isActive && <CheckCircle2 size={20} className="text-emerald-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    handleUpdateModules(selectedCompany.id, selectedCompany.modules);
                    setIsEditModalOpen(false);
                  }}
                  className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
                >
                  Lagre endringer
                </button>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-neutral-100 text-neutral-600 py-4 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* User Management Modal */}
      {isUserModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden"
          >
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Brukeradministrasjon</h2>
                <p className="text-sm text-neutral-500">Administrer brukere og rettigheter for {selectedCompany.name}</p>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <XCircle size={24} className="text-neutral-400" />
              </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="pb-4 text-xs font-black uppercase tracking-widest text-neutral-400">Navn</th>
                    <th className="pb-4 text-xs font-black uppercase tracking-widest text-neutral-400">Rolle</th>
                    <th className="pb-4 text-xs font-black uppercase tracking-widest text-neutral-400">Handlinger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {companyUsers.map(u => (
                    <tr key={u.id}>
                      <td className="py-4">
                        <div className="font-bold">{u.displayName}</div>
                        <div className="text-xs text-neutral-400">{u.email}</div>
                      </td>
                      <td className="py-4">
                        <select 
                          value={u.role}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                          className="text-xs font-bold bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Prosjektleder</option>
                          <option value="worker">Håndverker</option>
                          <option value="client">Kunde</option>
                        </select>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => startImpersonation(selectedCompany.id, u.role)}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink size={12} />
                            Logg inn som
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Company Modal */}
      {isCreateModalOpen && (
        <CreateCompanyModal 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={() => setIsCreateModalOpen(false)}
        />
      )}

      {/* Edit Company Info Modal */}
      {isEditInfoModalOpen && selectedCompany && (
        <EditCompanyInfoModal 
          company={selectedCompany}
          onClose={() => setIsEditInfoModalOpen(false)} 
          onSuccess={(updated) => {
            handleUpdateCompanyInfo(selectedCompany.id, updated.name, updated.orgNumber);
            setIsEditInfoModalOpen(false);
          }}
        />
      )}

      {/* Response Modal */}
      {isResponseModalOpen && selectedLead && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden"
          >
            <div className="p-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-neutral-900">Svar på henvendelse</h2>
                  <p className="text-neutral-500">Sender svar til {selectedLead.name} ({selectedLead.email})</p>
                </div>
                <button onClick={() => setIsResponseModalOpen(false)} className="p-4 bg-neutral-100 text-neutral-600 rounded-2xl hover:bg-neutral-200 transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100">
                  <p className="text-xs font-black uppercase text-neutral-400 mb-2">Original melding</p>
                  <p className="text-sm text-neutral-600 italic">"{selectedLead.message}"</p>
                </div>

                {leadAnalysis[selectedLead.id] && (
                  <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles size={18} className="text-emerald-600" />
                      <p className="text-xs font-black uppercase text-emerald-700">AI Forslag til svar</p>
                    </div>
                    <textarea 
                      className="w-full h-48 p-6 bg-white border border-emerald-100 rounded-2xl text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      defaultValue={leadAnalysis[selectedLead.id].suggestedResponse}
                    />
                  </div>
                )}

                {!leadAnalysis[selectedLead.id] && (
                  <div className="text-center py-12">
                    <button 
                      onClick={() => handleAnalyzeLead(selectedLead)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all"
                    >
                      <Sparkles size={18} />
                      Generer AI-svar
                    </button>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      // In a real app, this would send an email
                      alert('Svar sendt (simulert)');
                      handleUpdateLeadStatus(selectedLead.id, 'contacted');
                      setIsResponseModalOpen(false);
                    }}
                    className="flex-1 py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    Send Svar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Send Offer Modal */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-neutral-900">Send skreddersydd tilbud</h2>
              <button onClick={() => setIsOfferModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <XCircle size={24} className="text-neutral-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOffer} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Mottaker Navn</label>
                  <input 
                    required
                    type="text"
                    value={offerForm.recipientName}
                    onChange={(e) => setOfferForm({ ...offerForm, recipientName: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Mottaker E-post</label>
                  <input 
                    required
                    type="email"
                    value={offerForm.recipientEmail}
                    onChange={(e) => setOfferForm({ ...offerForm, recipientEmail: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Bedriftsnavn</label>
                <input 
                  required
                  type="text"
                  value={offerForm.companyName}
                  onChange={(e) => setOfferForm({ ...offerForm, companyName: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Velg moduler</label>
                <div className="grid grid-cols-2 gap-2">
                  {allModules.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const newModules = offerForm.modules.includes(m.id)
                          ? offerForm.modules.filter(id => id !== m.id)
                          : [...offerForm.modules, m.id];
                        setOfferForm({ ...offerForm, modules: newModules });
                      }}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border transition-all text-xs font-bold",
                        offerForm.modules.includes(m.id) ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-neutral-100 text-neutral-400"
                      )}
                    >
                      {m.icon}
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Prøveperiode (dager)</label>
                  <input 
                    type="number"
                    value={offerForm.trialDays}
                    onChange={(e) => setOfferForm({ ...offerForm, trialDays: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Skreddersydd pris (NOK/mnd)</label>
                  <input 
                    type="number"
                    value={offerForm.customPrice}
                    onChange={(e) => setOfferForm({ ...offerForm, customPrice: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Personlig melding</label>
                <textarea 
                  rows={4}
                  value={offerForm.message}
                  onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  placeholder="Skriv en hyggelig melding til kunden..."
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-100"
              >
                Generer og send tilbud
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-neutral-900">Administrer mal</h2>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <XCircle size={24} className="text-neutral-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTemplate} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Navn på mal</label>
                <input 
                  required
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="F.eks. Velkomst-epost"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Type</label>
                  <select 
                    value={templateForm.type}
                    onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="email">E-post</option>
                    <option value="sms">SMS</option>
                    <option value="system">Systemmelding</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Kategori</label>
                  <select 
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="offer">Tilbud</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="support">Support</option>
                    <option value="marketing">Markedsføring</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Emnefelt</label>
                <input 
                  required
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Innhold</label>
                <textarea 
                  required
                  rows={8}
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  placeholder="Bruk {{name}}, {{company}} etc. for variabler..."
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-lg"
              >
                Lagre mal
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function EditCompanyInfoModal({ company, onClose, onSuccess }: { company: Company, onClose: () => void, onSuccess: (data: { name: string, orgNumber: string }) => void }) {
  const [name, setName] = useState(company.name);
  const [orgNumber, setOrgNumber] = useState(company.orgNumber || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onSuccess({ name, orgNumber });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-900">Rediger kundeinfo</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <XCircle size={24} className="text-neutral-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Kundenavn</label>
            <input 
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Organisasjonsnummer</label>
            <input 
              type="text"
              value={orgNumber}
              onChange={(e) => setOrgNumber(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {loading ? 'Lagrer...' : 'Lagre endringer'}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-100 text-neutral-600 py-4 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
            >
              Avbryt
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function CreateCompanyModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [status, setStatus] = useState<'trial' | 'active'>('trial');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'companies'), {
        name,
        orgNumber,
        subscriptionStatus: status,
        modules: ['projects', 'checklists', 'deviations'], // Default modules
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userCount: 0
      });
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'companies');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-900">Opprett ny kunde</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <XCircle size={24} className="text-neutral-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Kundenavn</label>
            <input 
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="F.eks. Mesterbygg AS"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Organisasjonsnummer</label>
            <input 
              type="text"
              value={orgNumber}
              onChange={(e) => setOrgNumber(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="9 siffer"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Status</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('trial')}
                className={cn(
                  "py-3 rounded-xl font-bold text-sm transition-all",
                  status === 'trial' ? "bg-orange-100 text-orange-700 border-2 border-orange-200" : "bg-neutral-50 text-neutral-400 border-2 border-transparent"
                )}
              >
                Prøveperiode
              </button>
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={cn(
                  "py-3 rounded-xl font-bold text-sm transition-all",
                  status === 'active' ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-200" : "bg-neutral-50 text-neutral-400 border-2 border-transparent"
                )}
              >
                Aktiv
              </button>
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            {loading ? 'Oppretter...' : 'Opprett kunde'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
