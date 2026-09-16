import { useState, useEffect, useMemo } from 'react';
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
  Copy,
  BookOpen,
  Camera,
  FileSignature,
  TrendingUp,
  HardHat,
  Brain,
  RefreshCw,
  Layers,
  Check,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { generateAiContent } from '../services/aiClient';
import { db, collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, handleFirestoreError, OperationType, orderBy } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import ProjectDetails from './ProjectDetails';

interface Company {
  id: string;
  name: string;
  orgNumber?: string;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  modules: string[];
  createdAt: any;
  userCount?: number;
}

export default function SuperAdmin({ onBackToDashboard }: { onBackToDashboard?: () => void } = {}) {
  const { user, startImpersonation, stopImpersonation, impersonatedCompanyId, isSuperAdmin: authIsSuperAdmin } = useAuth();
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const isSuperAdmin = authIsSuperAdmin || user?.role === 'admin' || user?.role === 'superadmin' || user?.email === 'kenkri3@gmail.com' || user?.email?.toLowerCase() === 'admin@vikingmester.no' || user?.email === 'aichatnorge@gmail.com' || user?.email === 'kenneth@aichatnorge.no' || user?.email === 'post@vikingent.no';

  const formatDate = (date: any) => {
    if (!date) return '-';
    if (typeof date === 'string' || typeof date === 'number') {
      const d = new Date(date);
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('no-NO');
    }
    if (date instanceof Date) return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('no-NO');
    if (typeof date.toDate === 'function') {
      try {
        return date.toDate().toLocaleDateString('no-NO');
      } catch {
        return '-';
      }
    }
    return '-';
  };

  const [companies, setCompanies] = useState<Company[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'agent' | 'projects' | 'deviations' | 'logs' | 'companies' | 'leads' | 'offers' | 'templates'>('agent');
  const [agentActivities, setAgentActivities] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allDeviations, setAllDeviations] = useState<any[]>([]);
  const [allDailyLogs, setAllDailyLogs] = useState<any[]>([]);
  const [allChangeOrders, setAllChangeOrders] = useState<any[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<any>({
    todayActionsCount: 0,
    pendingApprovalsCount: 0,
    activeBlockersCount: 0,
    securedRevenue: 0
  });
  const [adminCommandText, setAdminCommandText] = useState('');
  const [isAdminDispatching, setIsAdminDispatching] = useState(false);
  const [adminAgentReply, setAdminAgentReply] = useState<string | null>(null);
  const [deviationSeverityFilter, setDeviationSeverityFilter] = useState<'all' | 'critical' | 'open' | 'closed'>('all');
  const [adminProjectSearch, setAdminProjectSearch] = useState('');
  const [adminDeviationSearch, setAdminDeviationSearch] = useState('');
  const [adminLogSearch, setAdminLogSearch] = useState('');
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
    if (!isSuperAdmin) return;

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

    // Sanntids agent-aktiviteter
    const agentActQ = query(collection(db, 'agent_activities'), orderBy('createdAt', 'desc'));
    const unsubscribeAgentAct = onSnapshot(agentActQ, (snapshot) => {
      setAgentActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Alle prosjekter globalt
    const projectsQ = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribeProjects = onSnapshot(projectsQ, (snapshot) => {
      setAllProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Alle avvik globalt
    const deviationsQ = query(collection(db, 'deviations'), orderBy('createdAt', 'desc'));
    const unsubscribeDeviations = onSnapshot(deviationsQ, (snapshot) => {
      setAllDeviations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Alle byggedagbøker
    const dailyLogsQ = query(collection(db, 'daily_logs'), orderBy('createdAt', 'desc'));
    const unsubscribeDailyLogs = onSnapshot(dailyLogsQ, (snapshot) => {
      setAllDailyLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Alle endringsordrer
    const changeOrdersQ = query(collection(db, 'change_orders'), orderBy('createdAt', 'desc'));
    const unsubscribeChangeOrders = onSnapshot(changeOrdersQ, (snapshot) => {
      setAllChangeOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Hent live metrics fra agent dispatch
    const fetchAgentMetrics = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch('/api/agent/dispatch', {
          headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (data.metrics) setAgentMetrics(data.metrics);
        }
      } catch (e) {}
    };
    fetchAgentMetrics();

    return () => {
      unsubscribeCompanies();
      unsubscribeLeads();
      unsubscribeOffers();
      unsubscribeTemplates();
      unsubscribeAgentAct();
      unsubscribeProjects();
      unsubscribeDeviations();
      unsubscribeDailyLogs();
      unsubscribeChangeOrders();
    };
  }, [user, isSuperAdmin]);

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
      toast.success('Brukerrolle ble oppdatert!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette denne brukeren?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('Bruker ble slettet!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { status });
      toast.success('Status oppdatert!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'leads');
    }
  };

  const handleAnalyzeLead = async (lead: any) => {
    setIsAnalyzingLead(lead.id);
    try {
      const response = await generateAiContent({
        prompt: `Analyser denne lead-meldingen fra en potensiell kunde for et KS/HMS-system for byggbransjen:
        Navn: ${lead.name}
        E-post: ${lead.email}
        Melding: ${lead.message}
        
        Gi svar i JSON-format med følgende felt:
        - score: (0-100) Hvor sannsynlig er det at dette er en god kunde?
        - summary: En kort oppsummering av hva de trenger.
        - suggestedResponse: Et forslag til et profesjonelt svar.
        - priority: 'low', 'medium' eller 'high'.`,
        responseMimeType: "application/json"
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
      toast.success('AI-analyse fullført!');
    } catch (err) {
      console.error('AI Analysis error:', err);
      toast.error('Kunne ikke fullføre AI-analyse.');
    } finally {
      setIsAnalyzingLead(null);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette denne henvendelsen?')) return;
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      toast.success('Henvendelse slettet!');
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
        createdBy: user?.id || user?.email
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
      toast.success('Tilbud ble opprettet og lagret!');
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
        updatedBy: user?.id || user?.email
      });
      setIsTemplateModalOpen(false);
      setTemplateForm({
        name: '',
        subject: '',
        body: '',
        type: 'email',
        category: 'offer'
      });
      toast.success('Mal ble lagret!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'templates');
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette denne kunden? Dette kan ikke angres.')) return;
    try {
      await deleteDoc(doc(db, 'companies', companyId));
      setSelectedCompany(null);
      toast.success('Kunde ble slettet!');
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
      toast.success('Kundeinfo ble oppdatert!');
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
      toast.success('Moduler ble oppdatert!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'companies');
    }
  };

  const handleAdminDispatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminCommandText.trim() || isAdminDispatching) return;
    setIsAdminDispatching(true);
    setAdminAgentReply(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/agent/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          action: 'quick_command',
          actionType: 'quick_command',
          text: adminCommandText,
          instruction: adminCommandText,
          companyId: selectedCompany?.id || 'all'
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Agentinstruks utført!');
        setAdminAgentReply(data.reply || data.response || data.message || 'Instruksen er behandlet av den autonome agenten.');
        setAdminCommandText('');
        if (data.metrics) setAgentMetrics(data.metrics);
      } else {
        toast.error(data.error || 'Feil ved sending av instruks til agenten');
      }
    } catch (err: any) {
      toast.error('Kunne ikke kontakte agenten: ' + err.message);
    } finally {
      setIsAdminDispatching(false);
    }
  };

  // ⚡ Bolt: Memoize filtered lists to prevent expensive O(N) recalculations on every render
  const filteredCompanies = useMemo(() => {
    return companies.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.orgNumber?.includes(searchTerm)
    );
  }, [companies, searchTerm]);

  const filteredProjects = useMemo(() => {
    return allProjects.filter(p =>
      !adminProjectSearch ||
      p.name?.toLowerCase().includes(adminProjectSearch.toLowerCase()) ||
      p.projectNumber?.toLowerCase().includes(adminProjectSearch.toLowerCase()) ||
      p.client?.toLowerCase().includes(adminProjectSearch.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(adminProjectSearch.toLowerCase())
    );
  }, [allProjects, adminProjectSearch]);

  const filteredDeviations = useMemo(() => {
    return allDeviations.filter(d => {
      const matchesSearch = !adminDeviationSearch ||
        d.title?.toLowerCase().includes(adminDeviationSearch.toLowerCase()) ||
        d.description?.toLowerCase().includes(adminDeviationSearch.toLowerCase()) ||
        d.projectTitle?.toLowerCase().includes(adminDeviationSearch.toLowerCase()) ||
        d.id?.toLowerCase().includes(adminDeviationSearch.toLowerCase());
      
      if (!matchesSearch) return false;
      if (deviationSeverityFilter === 'critical') return d.severity === 'critical' || d.severity === 'high';
      if (deviationSeverityFilter === 'open') return d.status !== 'closed' && d.status !== 'resolved';
      if (deviationSeverityFilter === 'closed') return d.status === 'closed' || d.status === 'resolved';
      return true;
    });
  }, [allDeviations, adminDeviationSearch, deviationSeverityFilter]);

  const filteredDailyLogs = useMemo(() => {
    return allDailyLogs.filter(l =>
      !adminLogSearch ||
      l.projectName?.toLowerCase().includes(adminLogSearch.toLowerCase()) ||
      l.workPerformed?.toLowerCase().includes(adminLogSearch.toLowerCase()) ||
      l.authorName?.toLowerCase().includes(adminLogSearch.toLowerCase())
    );
  }, [allDailyLogs, adminLogSearch]);

  const handleCopyChangeOrderLink = (co: any) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const token = co.token || co.id;
    const url = co.shareUrl || `${baseUrl}/?changeOrderToken=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Godkjenningslenke kopiert til utklippstavlen!');
  };

  const handleSendChangeOrderEmail = async (co: any) => {
    const defaultEmail = co.clientEmail || '';
    const targetEmail = window.prompt('Send endringsordre til e-post:', defaultEmail);
    if (!targetEmail) return;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const token = co.token || co.id;
    const url = co.shareUrl || `${baseUrl}/?changeOrderToken=${token}`;
    const amount = Number(co.amountExVat || co.totalPrice || co.amount || (co.totalAmount ? Math.round(co.totalAmount / 1.25) : 0));
    const totalAmount = Number(co.totalAmount || Math.round(amount * 1.25));

    try {
      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          subject: `Endringsordre: ${co.title || 'Tilleggsavtale'} - ${co.projectName || 'Ditt prosjekt'}`,
          content: `
            Hei ${co.clientName || 'Kunde'}!
            
            Det er opprettet et tilleggsarbeid/endringsordre som krever din godkjenning:
            
            Arbeid: ${co.title || 'Endringsordre'}
            Beskrivelse: ${co.description || ''}
            Beløp: ${amount.toLocaleString('no-NO')} kr eks. mva (${totalAmount.toLocaleString('no-NO')} kr inkl. mva)
            
            Vennligst se avtalen og godkjenn/signer digitalt her:
            ${url}
            
            Vilkår i henhold til NS 8406 / Håndverkertjenesteloven § 9.
            
            Med vennlig hilsen,
            VikingMester System
          `
        })
      });
      if (res.ok) {
        toast.success(`Endringsordre sendt til ${targetEmail}!`);
      } else {
        toast.error('Kunne ikke sende e-post. Kontroller mottakeradresse.');
      }
    } catch (e) {
      toast.error('Feil ved sending av e-post');
    }
  };

  if (!isSuperAdmin) {
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

  if (selectedProject) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-800 rounded-2xl text-xs font-bold hover:bg-neutral-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>← Tilbake til SuperAdmin Dashboard</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
            <span>SuperAdmin Prosjekttilgang: <strong className="text-neutral-900">{selectedProject.name}</strong></span>
          </div>
        </div>
        <ProjectDetails
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-10 pb-32 md:pb-16 overflow-x-hidden">
      {/* Impersonation Notice & Navigation bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        {onBackToDashboard ? (
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>← Tilbake til Håndverker Dashboard</span>
          </button>
        ) : (
          <div />
        )}
        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
          SuperAdmin Modus
        </span>
      </div>

      {impersonatedCompanyId && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600 shrink-0" size={20} />
            <div className="text-xs text-red-900">
              Du er i visningsmodus for en annen kunde (<strong>ID: {impersonatedCompanyId}</strong>). Klikk avslutt for å returnere til din vanlige admin-tilgang.
            </div>
          </div>
          <button
            onClick={() => {
              stopImpersonation();
              toast.success('Avsluttet visningsmodus.');
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
          >
            Avslutt visningsmodus
          </button>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-10">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-neutral-900 mb-1 sm:mb-2">
            SuperAdmin Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Administrer alle kunder, moduler og systemtilgang.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:w-auto sm:gap-3">
          <button 
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 sm:px-5 sm:py-3 bg-neutral-100 text-neutral-700 rounded-xl sm:rounded-2xl font-bold hover:bg-neutral-200 transition-all text-xs sm:text-sm shadow-xs"
          >
            <FileText size={16} className="shrink-0" />
            <span className="truncate">Ny mal</span>
          </button>
          <button 
            onClick={() => setIsOfferModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 sm:px-5 sm:py-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-md shadow-blue-100 text-xs sm:text-sm"
          >
            <Send size={16} className="shrink-0" />
            <span className="truncate">Send tilbud</span>
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 sm:px-5 sm:py-3 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-xl sm:rounded-2xl font-black hover:opacity-95 transition-all shadow-purple-cta text-xs sm:text-sm"
          >
            <Plus size={16} className="shrink-0" />
            <span className="truncate">Ny kunde</span>
          </button>
        </div>
      </div>

      {/* Tabs - Horisontalt rullbare på mobil for å unngå stor vertikal blokk */}
      <div className="flex items-center gap-2 mb-6 sm:mb-8 pb-2 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 sm:mx-0 sm:px-0 scroll-smooth">
        {[
          { id: 'agent', label: 'Autonom Agent & Logg', icon: <BrainCircuit size={16} /> },
          { id: 'projects', label: 'Alle Prosjekter', icon: <Layers size={16} /> },
          { id: 'deviations', label: 'Avvik & HMS', icon: <AlertTriangle size={16} /> },
          { id: 'logs', label: 'Byggedagbøker', icon: <BookOpen size={16} /> },
          { id: 'companies', label: 'Kunder', icon: <Building2 size={16} /> },
          { id: 'leads', label: 'Henvendelser', icon: <MessageSquare size={16} /> },
          { id: 'offers', label: 'Sendte tilbud', icon: <Send size={16} /> },
          { id: 'templates', label: 'Maler', icon: <FileText size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl font-bold transition-all whitespace-nowrap text-xs sm:text-sm shrink-0",
              activeTab === tab.id 
                ? "bg-neutral-900 text-white shadow-lg shadow-neutral-900/20" 
                : "bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.id === 'leads' && leads.filter(l => l.status === 'new').length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                {leads.filter(l => l.status === 'new').length}
              </span>
            )}
            {tab.id === 'deviations' && allDeviations.filter(d => d.status !== 'closed' && d.status !== 'resolved').length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded-full">
                {allDeviations.filter(d => d.status !== 'closed' && d.status !== 'resolved').length}
              </span>
            )}
            {tab.id === 'agent' && (
              <span className="ml-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Stats Cards - Responsiv 2-kolonner på mobil, 4 på desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
        {[
          { tab: 'agent', label: 'Agenthandlinger i dag', value: agentMetrics.todayActionsCount || agentActivities.length, icon: <BrainCircuit className="text-purple-600" size={18} />, bg: 'bg-purple-50' },
          { tab: 'projects', label: 'Aktive Prosjekter', value: allProjects.filter(p => p.status !== 'completed').length || allProjects.length, icon: <Layers className="text-blue-600" size={18} />, bg: 'bg-blue-50' },
          { tab: 'deviations', label: 'Åpne Avvik & HMS', value: allDeviations.filter(d => d.status !== 'closed' && d.status !== 'resolved').length, icon: <AlertTriangle className="text-amber-600" size={18} />, bg: 'bg-amber-50' },
          { tab: 'companies', label: 'Kunder / Bedrifter', value: companies.length, icon: <Building2 className="text-emerald-600" size={18} />, bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => setActiveTab(stat.tab as any)}
            className={cn("p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-neutral-200 shadow-sm cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all", stat.bg)}
            title={`Klikk for å åpne ${stat.label}`}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-xs">
                {stat.icon}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-white/70 px-1.5 sm:px-2 py-0.5 rounded-md">Se alle</span>
            </div>
            <div className="text-xl sm:text-3xl font-black text-neutral-900">{stat.value}</div>
            <div className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider sm:tracking-widest mt-0.5 sm:mt-1 truncate">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'agent' && (
        <div className="space-y-6 sm:space-y-8 mb-12">
          {/* Autonomous Status Banner */}
          <div className="bg-gradient-to-r from-neutral-900 via-purple-950 to-neutral-900 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 text-white border border-purple-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-widest text-purple-300">100% Autonom Agent Operativ</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 font-mono">Gemini 2.5 Multi-Agent</span>
                </div>
                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">VikingMester Autonom Byggeleder</h2>
                <p className="text-sm text-neutral-300 max-w-2xl leading-relaxed">
                  Agenten overvåker kontinuerlig byggedagbøker, fanger opp endringsbehov og varsler om avvik. Den genererer automatisk juridisk forankrede endringsordrer, kalkulerer time-/materialkostnader og sender signaturlenker til byggherre.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setAdminCommandText('Kjør full systemsjekk på alle aktive prosjekter, oppsummer åpne avvik og beregn uavhentet endringsverdi.');
                  }}
                  className="px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Full systemsjekk
                </button>
              </div>
            </div>

            {/* Admin Command Prompt */}
            <form onSubmit={handleAdminDispatch} className="mt-8 relative z-10">
              <label className="block text-xs font-bold uppercase tracking-widest text-purple-200 mb-2">
                Send direkte instruks til den autonome agenten
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={adminCommandText}
                  onChange={(e) => setAdminCommandText(e.target.value)}
                  placeholder="F.eks: 'Inspiser alle byggedagbøker fra i dag og meld eventuelle nye avvik'..."
                  className="flex-1 bg-white/10 border border-purple-400/30 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-md"
                  disabled={isAdminDispatching}
                />
                <button
                  type="submit"
                  disabled={isAdminDispatching || !adminCommandText.trim()}
                  className="px-6 py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl font-bold text-sm hover:opacity-95 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                >
                  {isAdminDispatching ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Agenten jobber...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Kjør Agent
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Agent Reply Notification */}
            {adminAgentReply && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-2xl bg-purple-900/40 border border-purple-400/30 text-sm text-purple-100 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <Brain className="text-purple-300 shrink-0 mt-0.5" size={18} />
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-purple-300 mb-1">Agentsvar:</div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{adminAgentReply}</p>
                  </div>
                </div>
                <button onClick={() => setAdminAgentReply(null)} className="text-purple-300 hover:text-white">
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </div>

          {/* Autonomous Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-[2rem] border border-neutral-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Handlinger i dag</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Zap size={16} />
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-900">{agentMetrics.todayActionsCount || agentActivities.length}</div>
              <p className="text-xs text-neutral-500 mt-1">Autonome sjekker & beslutninger</p>
            </div>

            <div className="bg-white rounded-[2rem] border border-neutral-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Venter Godkjenning</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock size={16} />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-600">
                {agentMetrics.pendingApprovalsCount || allChangeOrders.filter(c => c.status === 'sent' || c.status === 'pending_signature' || c.status === 'pending_customer').length}
              </div>
              <p className="text-xs text-neutral-500 mt-1">Endringsordrer hos byggherre</p>
            </div>

            <div className="bg-white rounded-[2rem] border border-neutral-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Aktive Blokkeringer</span>
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div className="text-3xl font-black text-red-600">
                {agentMetrics.activeBlockersCount || allDeviations.filter(d => d.severity === 'critical' && d.status !== 'closed').length}
              </div>
              <p className="text-xs text-neutral-500 mt-1">Kritiske avvik som stopper fremdrift</p>
            </div>

            <div className="bg-white rounded-[2rem] border border-neutral-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Sikret Ekstrainntekt</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-600">
                {(agentMetrics.securedRevenue || allChangeOrders.reduce((sum, c) => sum + (Number(c.totalAmount || c.amountExVat || c.totalPrice || c.amount || 0)), 0)).toLocaleString('no-NO')} kr
              </div>
              <p className="text-xs text-neutral-500 mt-1">Identifisert & fakturert via agent</p>
            </div>
          </div>

          {/* Real-time Agent Log Stream */}
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Sanntids Agentaktivitet & Handlingslogg</h3>
                <p className="text-xs text-neutral-500">Live-feed over alt den autonome agenten utfører, sjekker og genererer.</p>
              </div>
              <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                {agentActivities.length} hendelser registrert
              </span>
            </div>

            {agentActivities.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-neutral-100 rounded-3xl">
                <BrainCircuit className="mx-auto text-neutral-300 mb-3" size={40} />
                <p className="text-neutral-500 font-medium">Ingen agentaktiviteter registrert enda.</p>
                <p className="text-xs text-neutral-400 mt-1">Når håndverkere logger arbeid eller endringer oppstår, dokumenterer agenten det her automatisk.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
                {agentActivities.map((act) => (
                  <div key={act.id} className="py-4 flex items-start justify-between gap-4 hover:bg-neutral-50 px-3 rounded-2xl transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                        act.status === 'failed' ? "bg-red-50 text-red-600" :
                        act.actionType?.includes('change_order') ? "bg-emerald-50 text-emerald-600" :
                        act.actionType?.includes('deviation') ? "bg-amber-50 text-amber-600" :
                        "bg-purple-50 text-purple-600"
                      )}>
                        {act.actionType?.includes('change_order') ? <FileSignature size={16} /> :
                         act.actionType?.includes('deviation') ? <AlertTriangle size={16} /> :
                         <Sparkles size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-neutral-900">{act.description || act.actionType || 'Autonom handling'}</span>
                          {act.status && (
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                              act.status === 'completed' || act.status === 'success' ? "bg-emerald-100 text-emerald-700" :
                              act.status === 'failed' ? "bg-red-100 text-red-700" :
                              "bg-neutral-100 text-neutral-600"
                            )}>
                              {act.status}
                            </span>
                          )}
                        </div>
                        {act.details && <p className="text-xs text-neutral-500 mt-0.5">{act.details}</p>}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-400">
                          {act.projectName && <span>Prosjekt: <strong className="text-neutral-600">{act.projectName}</strong></span>}
                          {act.companyName && <span>Bedrift: <strong className="text-neutral-600">{act.companyName}</strong></span>}
                          <span>{act.createdAt?.toDate ? act.createdAt.toDate().toLocaleTimeString('no-NO') : 'Nylig'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Autonome Endringsordrer Tabell */}
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Endringsordrer & Byggherregodkjenninger</h3>
                <p className="text-xs text-neutral-500">Endringsarbeid automatisk kalkulert og sendt til kunde for digital signering.</p>
              </div>
              <span className="text-xs font-bold text-neutral-400">{allChangeOrders.length} ordrer totalt</span>
            </div>

            {allChangeOrders.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-sm">
                Ingen endringsordrer registrert enda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Ordrer</th>
                      <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Prosjekt</th>
                      <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Beløp eks. mva</th>
                      <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Status</th>
                      <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Dato</th>
                      <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Handling</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {allChangeOrders.map((co) => {
                      const amountExVat = Number(co.amountExVat || co.totalPrice || co.amount || (co.totalAmount ? Math.round(co.totalAmount / 1.25) : 0));
                      const totalAmount = Number(co.totalAmount || Math.round(amountExVat * 1.25));
                      const isApproved = co.status === 'approved' || co.status === 'godkjent' || co.status === 'APPROVED_BY_ADMIN';
                      const isRejected = co.status === 'declined' || co.status === 'avvist' || co.status === 'rejected';

                      return (
                        <tr key={co.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-sm text-neutral-900">{co.title || (co.changeNumber ? `Endringsordre #${co.changeNumber}` : 'Endringsordre')}</div>
                            <div className="text-xs text-neutral-500 line-clamp-1">{co.description}</div>
                          </td>
                          <td 
                            onClick={() => {
                              const proj = allProjects.find(p => p.id === co.projectId);
                              if (proj) setSelectedProject(proj);
                              else toast.info(`Prosjekt: ${co.projectTitle || co.projectName || co.projectId}`);
                            }}
                            className="px-6 py-4 text-xs font-medium text-neutral-700 hover:text-purple-600 cursor-pointer"
                            title="Klikk for å åpne prosjektet"
                          >
                            {co.projectTitle || co.projectName || co.projectId || 'Ikke angitt'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-neutral-900 text-sm">
                              {amountExVat.toLocaleString('no-NO')} kr
                            </div>
                            <div className="text-[11px] text-neutral-400 font-medium">
                              {totalAmount.toLocaleString('no-NO')} kr ink. mva
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1",
                              isApproved ? "bg-emerald-100 text-emerald-700" :
                              isRejected ? "bg-rose-100 text-rose-700" :
                              "bg-amber-100 text-amber-800"
                            )}>
                              {isApproved ? 'Godkjent av kunde' : isRejected ? 'Avslått av kunde' : 'Venter på kunde'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-neutral-400">
                            {co.createdAt?.toDate ? co.createdAt.toDate().toLocaleDateString('no-NO') : formatDate(co.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopyChangeOrderLink(co)}
                                className="p-2 text-neutral-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                                title="Kopier godkjenningslenke"
                              >
                                <Copy size={16} />
                              </button>
                              <button
                                onClick={() => handleSendChangeOrderEmail(co)}
                                className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Send e-post til kunde"
                              >
                                <Mail size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                                  const token = co.token || co.id;
                                  const url = co.shareUrl || `${baseUrl}/?changeOrderToken=${token}`;
                                  window.open(url, '_blank');
                                }}
                                className="p-2 text-neutral-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                title="Åpne kundevisning (Forhåndsvis)"
                              >
                                <ExternalLink size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-8 mb-12">
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="text"
                  placeholder="Søk i alle prosjekter, kunde, nummer..."
                  value={adminProjectSearch}
                  onChange={(e) => setAdminProjectSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="text-xs font-bold text-neutral-400">
                Viser {filteredProjects.length} av {allProjects.length} prosjekter
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((proj) => {
              const projectDevs = allDeviations.filter(d => d.projectId === proj.id);
              const projectLogs = allDailyLogs.filter(l => l.projectId === proj.id);
              const projectOrders = allChangeOrders.filter(c => c.projectId === proj.id);

              return (
                <div key={proj.id} className="bg-white rounded-[2rem] border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        {proj.projectNumber || 'Uten ref.'}
                      </span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        proj.status === 'completed' ? "bg-neutral-100 text-neutral-600" :
                        proj.status === 'paused' ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      )}>
                        {proj.status === 'completed' ? 'Fullført' : proj.status === 'paused' ? 'På vent' : 'Aktiv'}
                      </span>
                    </div>
                    <h3 
                      onClick={() => setSelectedProject(proj)}
                      className="text-lg font-bold text-neutral-900 mb-1 line-clamp-1 cursor-pointer hover:text-purple-600 transition-colors"
                      title="Klikk for å gå direkte inn på prosjektet"
                    >
                      {proj.name || 'Navnløst prosjekt'}
                    </h3>
                    <p className="text-xs text-neutral-500 mb-4">{proj.client || 'Ingen oppdragsgiver angitt'}</p>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-neutral-100 mb-4 text-center">
                      <div>
                        <div className="text-xs font-black text-neutral-900">{projectLogs.length}</div>
                        <div className="text-[10px] font-bold text-neutral-400 uppercase">Dagbøker</div>
                      </div>
                      <div>
                        <div className="text-xs font-black text-neutral-900">{projectDevs.length}</div>
                        <div className="text-[10px] font-bold text-neutral-400 uppercase">Avvik</div>
                      </div>
                      <div>
                        <div className="text-xs font-black text-neutral-900">{projectOrders.length}</div>
                        <div className="text-[10px] font-bold text-neutral-400 uppercase">Endringer</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-400 pt-3 border-t border-neutral-100">
                    <span>Budsjett: <strong className="text-neutral-700">{proj.budget ? Number(proj.budget).toLocaleString('no-NO') + ' kr' : 'Ikke satt'}</strong></span>
                    <button
                      onClick={() => setSelectedProject(proj)}
                      className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Gå direkte inn på prosjektet"
                    >
                      <span>Gå inn på prosjekt</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'deviations' && (
        <div className="space-y-8 mb-12">
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="text"
                  placeholder="Søk i avvik, prosjekt eller beskrivelse..."
                  value={adminDeviationSearch}
                  onChange={(e) => setAdminDeviationSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'Alle' },
                  { id: 'open', label: 'Åpne' },
                  { id: 'critical', label: 'Kritiske' },
                  { id: 'closed', label: 'Lukkede' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setDeviationSeverityFilter(f.id as any)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      deviationSeverityFilter === f.id
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Avvik</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Prosjekt</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Alvorlighet</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Dato</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Handling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredDeviations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-neutral-400 text-sm">
                        Ingen avvik funnet som matcher søkekriteriene.
                      </td>
                    </tr>
                  ) : (
                    filteredDeviations.map((dev) => (
                      <tr key={dev.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-sm text-neutral-900">{dev.title || 'Avvik uten tittel'}</div>
                          <p className="text-xs text-neutral-500 line-clamp-1">{dev.description}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-neutral-700">
                          {dev.projectTitle || dev.projectName || dev.projectId || 'Ikke spesifisert'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            dev.severity === 'critical' ? "bg-red-100 text-red-700 font-bold" :
                            dev.severity === 'high' ? "bg-orange-100 text-orange-700" :
                            dev.severity === 'medium' ? "bg-amber-100 text-amber-700" :
                            "bg-neutral-100 text-neutral-600"
                          )}>
                            {dev.severity || 'Normal'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            dev.status === 'closed' || dev.status === 'resolved' ? "bg-emerald-100 text-emerald-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {dev.status === 'closed' || dev.status === 'resolved' ? 'Lukket' : 'Åpen'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-neutral-400">
                          {dev.createdAt?.toDate ? dev.createdAt.toDate().toLocaleDateString('no-NO') : 'Nylig'}
                        </td>
                        <td className="px-6 py-4">
                          {dev.status !== 'closed' && dev.status !== 'resolved' ? (
                            <button
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'deviations', dev.id), {
                                    status: 'closed',
                                    resolvedAt: serverTimestamp()
                                  });
                                  toast.success('Avvik markert som lukket!');
                                } catch (e) {
                                  toast.error('Kunne ikke lukke avvik');
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all"
                            >
                              Lukk avvik
                            </button>
                          ) : (
                            <span className="text-xs text-neutral-400 font-medium">Behandlet</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-8 mb-12">
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="text"
                  placeholder="Søk i byggedagbøker, utført arbeid, forfatter..."
                  value={adminLogSearch}
                  onChange={(e) => setAdminLogSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="text-xs font-bold text-neutral-400">
                {filteredDailyLogs.length} dagbokføringer
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDailyLogs.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-white rounded-[2rem] border border-neutral-200 text-neutral-400 text-sm">
                Ingen byggedagbøker funnet.
              </div>
            ) : (
              filteredDailyLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-[2rem] border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-black uppercase tracking-widest rounded-full">
                        {log.projectName || 'Prosjekt'}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {log.date || (log.createdAt?.toDate ? log.createdAt.toDate().toLocaleDateString('no-NO') : 'Nylig')}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-neutral-900 mb-1 flex items-center gap-2">
                      <HardHat size={16} className="text-amber-500" />
                      {log.authorName || 'Håndverker'}
                    </div>

                    <p className="text-sm text-neutral-600 bg-neutral-50 p-4 rounded-2xl mt-2 leading-relaxed whitespace-pre-wrap">
                      {log.workPerformed || log.description || 'Ingen arbeidsbeskrivelse.'}
                    </p>

                    {log.weather && (
                      <div className="mt-3 text-xs text-neutral-400 flex items-center gap-2">
                        <span>Værforhold: {log.weather}</span>
                        {log.temperature && <span>({log.temperature}°C)</span>}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
                    <span>Timer: <strong className="text-neutral-700">{log.hoursWorked || log.hours || '8'} t</strong></span>
                    {log.photos && log.photos.length > 0 && (
                      <span className="text-purple-600 font-bold flex items-center gap-1">
                        <Camera size={14} /> {log.photos.length} bilder vedlagt
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-electric-500 outline-none transition-all"
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
                          <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400 group-hover:bg-emerald-100 group-hover:text-electric-600 transition-all">
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
                            className="p-2 text-neutral-400 hover:text-electric-600 hover:bg-electric-50 rounded-xl transition-all"
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
                            onClick={() => {
                              startImpersonation(company.id, 'admin');
                              toast.success(`Logget inn som ${company.name || company.id}. Viser nå kundens system.`);
                              window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'dashboard' } }));
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-all cursor-pointer shadow-xs"
                            title={`Logg inn som ${company.name || company.id} og se deres system`}
                          >
                            <ExternalLink size={14} />
                            <span>Impersonate</span>
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
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleAnalyzeLead(lead)}
                          disabled={isAnalyzingLead === lead.id}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            lead.aiScore ? "text-emerald-600 bg-emerald-50" : "text-neutral-400 hover:text-electric-600 hover:bg-electric-50"
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
                          className="p-2 text-neutral-400 hover:text-electric-600 hover:bg-electric-50 rounded-xl transition-all"
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
                      {formatDate(offer.createdAt)}
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => {
                          const url = `${window.location.origin}/?offer=${offer.token}`;
                          navigator.clipboard.writeText(url);
                          toast.success('Tilbudslenke kopiert til utklippstavlen!');
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
                          ? "border-electric-500 bg-electric-50 text-electric-950" 
                          : "border-neutral-100 bg-neutral-50 text-neutral-500 hover:border-neutral-200"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                        isActive ? "bg-electric-500 text-white" : "bg-white text-neutral-400"
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
                  className="flex-1 bg-gradient-to-r from-electric-500 to-electric-400 text-white py-4 rounded-2xl font-black hover:opacity-95 transition-all shadow-purple-cta"
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
                            onClick={() => {
                              startImpersonation(selectedCompany.id, u.role);
                              toast.success(`Logget inn som ${u.name || u.email || 'bruker'} (${u.role}) hos ${selectedCompany.name}.`);
                              setIsUserModalOpen(false);
                              window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'dashboard' } }));
                            }}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
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
                      className="w-full h-48 p-6 bg-white border border-emerald-100 rounded-2xl text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-electric-500 transition-all"
                      defaultValue={leadAnalysis[selectedLead.id].suggestedResponse}
                    />
                  </div>
                )}

                {!leadAnalysis[selectedLead.id] && (
                  <div className="text-center py-12">
                    <button 
                      onClick={() => handleAnalyzeLead(selectedLead)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-2xl font-black hover:opacity-95 transition-all shadow-purple-cta"
                    >
                      <Sparkles size={18} />
                      Generer AI-svar
                    </button>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      toast.success(`Svar sendt til ${selectedLead.name} (${selectedLead.email})!`);
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
  const [plan, setPlan] = useState<'solo' | 'team' | 'entreprenor'>('team');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'companies'), {
        name,
        orgNumber,
        subscriptionStatus: status,
        plan,
        modules: ['projects', 'checklists', 'deviations', 'ai', 'economy', 'fdv', 'inventory', 'vehicle', 'time', 'apprentice', 'building_app'], // All default modules enabled
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userCount: 0
      });
      toast.success(`Kunde "${name}" (${plan}) ble opprettet!`);
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
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-electric-500 outline-none transition-all"
              placeholder="F.eks. Mesterbygg AS"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Organisasjonsnummer</label>
            <input 
              type="text"
              value={orgNumber}
              onChange={(e) => setOrgNumber(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-electric-500 outline-none transition-all"
              placeholder="9 siffer"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Abonnementsplan (Kvote & Marginvern)</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as any)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-electric-500 outline-none transition-all font-medium text-sm text-neutral-800"
            >
              <option value="solo">Solo (2.5M tokens/mnd - kr 1 490,-)</option>
              <option value="team">Team (10M tokens/mnd - kr 3 490,-)</option>
              <option value="entreprenor">Totalentreprenør (30M tokens/mnd - kr 6 900,-)</option>
            </select>
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
            className="w-full bg-gradient-to-r from-electric-500 to-electric-400 text-white py-4 rounded-2xl font-black hover:opacity-95 transition-all shadow-purple-cta disabled:opacity-50"
          >
            {loading ? 'Oppretter...' : 'Opprett kunde'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
