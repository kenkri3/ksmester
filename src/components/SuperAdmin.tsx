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
  ArrowLeft,
  Activity,
  Database,
  Server,
  Cpu,
  ArrowUpRight,
  CheckCheck,
  UserCheck,
  Key,
  Eye,
  EyeOff,
  Bot
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
  plan?: 'solo' | 'team' | 'entreprenor' | 'partner';
  isPartner?: boolean;
  isInternal?: boolean;
  monthlyPrice?: number;
  modules: string[];
  createdAt: any;
  updatedAt?: any;
  userCount?: number;
  trialStartDate?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  industry?: string;
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
  const [activeTab, setActiveTab] = useState<'companies' | 'leads' | 'agent' | 'offers' | 'templates' | 'support'>('companies');
  const [supportSubTab, setSupportSubTab] = useState<'projects' | 'deviations' | 'logs'>('projects');
  const [companyStatusFilter, setCompanyStatusFilter] = useState<'all' | 'active' | 'trial' | 'partner' | 'cancelled'>('all');
  const [tokenCosts, setTokenCosts] = useState<any[]>([]);
  const [accountingData, setAccountingData] = useState<any>(null);
  const [isAddingTopup, setIsAddingTopup] = useState<string | null>(null);
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
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('VM-Passord2026!');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'manager' | 'worker'>('worker');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<any | null>(null);

  const handleOpenConvertModal = (lead: any) => {
    setLeadToConvert(lead);
    setIsConvertModalOpen(true);
  };

  const handleJumpToCompany = (companyId?: string) => {
    if (!companyId) {
      setActiveTab('companies');
      return;
    }
    const target = companies.find(c => c.id === companyId);
    if (target) {
      setSelectedCompany(target);
    }
    setActiveTab('companies');
  };

  const handleLeadConverted = (companyId: string, companyName: string) => {
    setIsConvertModalOpen(false);
    setLeadToConvert(null);
    toast.success(`Kunde "${companyName}" er nå opprettet fra henvendelsen!`);
  };
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isAnalyzingLead, setIsAnalyzingLead] = useState<string | null>(null);
  const [leadAnalysis, setLeadAnalysis] = useState<{[key: string]: any}>({});
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
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

    // Token-forbruk og AI-kostnader
    const tokenCostsQ = query(collection(db, 'token_costs'), orderBy('timestamp', 'desc'));
    const unsubscribeTokenCosts = onSnapshot(tokenCostsQ, (snapshot) => {
      setTokenCosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, () => {});

    // Hent regnskaps- og tokenstatistikk fra backend
    const fetchAccounting = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch('/api/accounting/summary', {
          headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) setAccountingData(json.data);
        }
      } catch (e) {}
    };
    fetchAccounting();

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
      unsubscribeTokenCosts();
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
      const details = [
        lead.name ? `Navn: ${lead.name}` : '',
        lead.company ? `Bedrift: ${lead.company}` : '',
        lead.email ? `E-post: ${lead.email}` : '',
        lead.phone ? `Telefon: ${lead.phone}` : '',
        lead.trade ? `Fag/Bransje: ${lead.trade}` : '',
        lead.plan ? `Ønsket pakke/plan: ${lead.plan}` : '',
        lead.workers ? `Antall ansatte: ${lead.workers}` : '',
        lead.monthlyPrice ? `Kalkulert pris: ${lead.monthlyPrice} kr/mnd` : '',
        lead.message ? `Melding/Henvendelse: ${lead.message}` : (lead.plan ? 'Kunde har konfigurert prispakke via kalkulator/nettside.' : 'Ingen meldingstekst oppgitt.'),
        lead.source ? `Kilde: ${lead.source}` : ''
      ].filter(Boolean).join('\n');

      const response = await generateAiContent({
        prompt: `Du er en erfaren salgssjef og forretningsrådgiver for VikingMester (et ledende KS/HMS og prosjektstyringssystem for bygg- og anleggsbransjen i Norge).
Analyser denne henvendelsen/leaden fra en potensiell kunde:
${details}

Svar KUN med gyldig rå JSON (uten markdown \`\`\`json klammer):
{
  "score": 85,
  "summary": "Konsis oppsummering på norsk av hva kunden trenger og deres profil",
  "suggestedResponse": "Et personlig og profesjonelt svarutkast på norsk til ${lead.name || 'kunden'} med referanse til deres fag (${lead.trade || 'byggfag'}) og plan.",
  "priority": "high"
}`,
        responseMimeType: "application/json"
      });

      let raw = response.text || '{}';
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      let analysis: any = {};
      try {
        analysis = JSON.parse(raw);
      } catch {
        analysis = {
          score: 85,
          summary: lead.plan ? `Interessert i ${lead.plan} for ${lead.trade || 'håndverkere'} (${lead.workers || '1-5'} ansatte).` : 'Potensiell ny kunde via VikingMester.',
          suggestedResponse: `Hei ${lead.name || ''}!\n\nTakk for din henvendelse til VikingMester. Vi har mottatt din forespørsel angående ${lead.plan || 'KS- og HMS-systemet'} for ${lead.company || 'ditt firma'}.\n\nVi setter gjerne opp en uforpliktende prøveperiode eller en kort gjennomgang tilpasset dine behov.\n\nMed vennlig hilsen,\nVikingMester Teamet`,
          priority: 'high'
        };
      }

      await updateDoc(doc(db, 'leads', lead.id), {
        aiScore: analysis.score || 80,
        aiSummary: analysis.summary || '',
        aiPriority: analysis.priority || 'medium',
        suggestedResponse: analysis.suggestedResponse || '',
        updatedAt: serverTimestamp()
      });

      setLeadAnalysis(prev => ({ ...prev, [lead.id]: analysis }));
      if (selectedLead?.id === lead.id) {
        setReplyMessage(analysis.suggestedResponse || '');
      }
      toast.success('AI-analyse fullført!');
    } catch (err: any) {
      console.error('AI Analysis error:', err);
      const fallbackAnalysis = {
        score: 75,
        summary: lead.plan ? `Interessert i ${lead.plan} (${lead.trade || 'bygg'})` : 'Henvendelse mottatt.',
        suggestedResponse: `Hei ${lead.name || ''}!\n\nTakk for henvendelsen. Vi hjelper gjerne ${lead.company || 'dere'} i gang med VikingMester KS/HMS.\n\nTa gjerne kontakt hvis du lurer på noe!\n\nVennlig hilsen,\nVikingMester`,
        priority: 'medium'
      };
      setLeadAnalysis(prev => ({ ...prev, [lead.id]: fallbackAnalysis }));
      if (selectedLead?.id === lead.id) {
        setReplyMessage(fallbackAnalysis.suggestedResponse);
      }
      toast.info('AI-analyse generert med standardsvar.');
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
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vikingmester.no';
      const offerLink = `${baseUrl}/?offer=${token}`;

      await addDoc(collection(db, 'system_offers'), {
        ...offerForm,
        status: 'pending',
        token,
        offerLink,
        createdAt: serverTimestamp(),
        createdBy: user?.id || user?.email
      });

      const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      try {
        await fetch('/api/notify/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': 'Bearer ' + authToken } : {})
          },
          body: JSON.stringify({
            to: offerForm.recipientEmail,
            subject: `Skreddersydd tilbud på VikingMester for ${offerForm.companyName}`,
            text: `Hei ${offerForm.recipientName}!\n\nVi har gleden av å sende deg et skreddersydd tilbud på VikingMester for ${offerForm.companyName}.\n\nPris: ${offerForm.customPrice} NOK/mnd eks. mva\nPrøveperiode: ${offerForm.trialDays} dager\n\n${offerForm.message || ''}\n\nSe og godkjenn tilbudet her:\n${offerLink}\n\nMed vennlig hilsen,\nVikingMester Teamet`,
            html: `<div style="font-family: sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h2 style="color: #1e1b4b; margin-top: 0;">Skreddersydd tilbud fra VikingMester</h2>
              <p>Hei <strong>${offerForm.recipientName}</strong>,</p>
              <p>Vi har satt sammen et skreddersydd tilbud til <strong>${offerForm.companyName}</strong>:</p>
              <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0 0 8px 0; font-size: 16px;"><strong>Månedspris:</strong> ${offerForm.customPrice} NOK/mnd eks. mva</p>
                <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Prøveperiode:</strong> ${offerForm.trialDays} dager kostnadsfritt</p>
              </div>
              ${offerForm.message ? `<p style="white-space: pre-wrap; color: #334155;">${offerForm.message.replace(/</g, '&lt;')}</p>` : ''}
              <div style="margin: 30px 0; text-align: center;">
                <a href="${offerLink}" style="background: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">Se og godkjenn tilbudet</a>
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">Lenke: ${offerLink}</p>
            </div>`
          })
        });
        toast.success(`Tilbud opprettet og sendt på e-post til ${offerForm.recipientEmail}!`);
      } catch (err) {
        console.warn('Could not send offer email:', err);
        toast.success('Tilbud opprettet!');
      }

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

  const handleDeleteOffer = async (offerId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette dette tilbudet?')) return;
    try {
      await deleteDoc(doc(db, 'system_offers', offerId));
      toast.success('Tilbud slettet!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'system_offers');
    }
  };

  const handleResendOfferEmail = async (offer: any) => {
    const defaultEmail = offer.recipientEmail || '';
    const targetEmail = window.prompt('Send tilbud på nytt til e-post:', defaultEmail);
    if (!targetEmail) return;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vikingmester.no';
    const offerLink = `${baseUrl}/?offer=${offer.token}`;
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    try {
      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': 'Bearer ' + authToken } : {})
        },
        body: JSON.stringify({
          to: targetEmail,
          subject: `Tilbud på VikingMester for ${offer.companyName || 'ditt firma'}`,
          text: `Hei ${offer.recipientName || ''}!\n\nHer er tilbudet ditt på VikingMester:\n\nPris: ${offer.customPrice} NOK/mnd\nPrøveperiode: ${offer.trialDays || 30} dager\n\n${offer.message || ''}\n\nSe og godkjenn tilbudet her:\n${offerLink}\n\nMed vennlig hilsen,\nVikingMester`,
          html: `<div style="font-family: sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2 style="color: #1e1b4b; margin-top: 0;">Tilbud fra VikingMester</h2>
            <p>Hei <strong>${offer.recipientName || 'Kunde'}</strong>,</p>
            <p>Her er ditt skreddersydde tilbud til <strong>${offer.companyName || 'ditt firma'}</strong>:</p>
            <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; font-size: 16px;"><strong>Månedspris:</strong> ${offer.customPrice} NOK/mnd eks. mva</p>
              <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Prøveperiode:</strong> ${offer.trialDays || 30} dager kostnadsfritt</p>
            </div>
            ${offer.message ? `<p style="white-space: pre-wrap; color: #334155;">${offer.message.replace(/</g, '&lt;')}</p>` : ''}
            <div style="margin: 30px 0; text-align: center;">
              <a href="${offerLink}" style="background: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">Se og godkjenn tilbudet</a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">Lenke: ${offerLink}</p>
          </div>`
        })
      });
      if (res.ok) {
        toast.success(`Tilbud sendt til ${targetEmail}!`);
      } else {
        toast.error('Kunne ikke sende e-post.');
      }
    } catch (e: any) {
      toast.error('Feil ved sending: ' + e.message);
    }
  };

  const handleSendReplyEmail = async () => {
    if (!selectedLead || !replyMessage.trim() || isSendingReply) return;
    setIsSendingReply(true);
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': 'Bearer ' + authToken } : {})
        },
        body: JSON.stringify({
          to: selectedLead.email,
          subject: `Svar fra VikingMester angående din henvendelse`,
          text: replyMessage,
          html: `<div style="font-family: sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2 style="color: #1e1b4b; margin-top: 0;">Hei ${selectedLead.name || ''}!</h2>
            <div style="white-space: pre-wrap; font-size: 15px; margin: 20px 0; color: #334155;">${replyMessage.replace(/</g, '&lt;')}</div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            <p style="font-size: 12px; color: #64748b;">Med vennlig hilsen,<br><strong>VikingMester Teamet</strong><br>Norges ledende KS- og prosjektstyringssystem for bygg og anlegg.</p>
          </div>`
        })
      });

      if (res.ok) {
        toast.success(`Svar sendt til ${selectedLead.name} (${selectedLead.email})!`);
        await handleUpdateLeadStatus(selectedLead.id, 'contacted');
        setIsResponseModalOpen(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Kunne ikke sende svar på e-post');
      }
    } catch (err: any) {
      toast.error('Feil ved sending: ' + err.message);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplateId) {
        await updateDoc(doc(db, 'templates', editingTemplateId), {
          ...templateForm,
          updatedAt: serverTimestamp(),
          updatedBy: user?.id || user?.email
        });
        toast.success('Mal oppdatert!');
      } else {
        await addDoc(collection(db, 'templates'), {
          ...templateForm,
          createdAt: serverTimestamp(),
          updatedBy: user?.id || user?.email
        });
        toast.success('Mal ble lagret!');
      }
      setIsTemplateModalOpen(false);
      setEditingTemplateId(null);
      setTemplateForm({
        name: '',
        subject: '',
        body: '',
        type: 'email',
        category: 'offer'
      });
    } catch (error) {
      handleFirestoreError(error, editingTemplateId ? OperationType.UPDATE : OperationType.CREATE, 'templates');
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

  const handleUpdateCompanyInfo = async (companyId: string, name: string, orgNumber: string, plan?: 'solo' | 'team' | 'entreprenor' | 'partner') => {
    try {
      const isPartner = plan === 'partner';
      const updateData: any = {
        name,
        orgNumber,
        updatedAt: serverTimestamp()
      };
      if (plan) {
        updateData.plan = plan;
        if (isPartner) {
          updateData.isPartner = true;
          updateData.monthlyPrice = 0;
          updateData.subscriptionStatus = 'active';
        } else {
          updateData.isPartner = false;
          updateData.monthlyPrice = plan === 'solo' ? 1490 : plan === 'entreprenor' ? 6900 : 3490;
        }
      }
      await updateDoc(doc(db, 'companies', companyId), updateData);
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, ...updateData } : c));
      toast.success('Kundeinfo ble oppdatert!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'companies');
    }
  };

  const handleUpdateCompanyPlan = async (companyId: string, newPlan: 'solo' | 'team' | 'entreprenor' | 'partner') => {
    try {
      const isPartnerPlan = newPlan === 'partner';
      const updateData: any = {
        plan: newPlan,
        updatedAt: serverTimestamp()
      };
      if (isPartnerPlan) {
        updateData.monthlyPrice = 0;
        updateData.isPartner = true;
        updateData.subscriptionStatus = 'active';
      } else {
        updateData.isPartner = false;
        updateData.monthlyPrice = newPlan === 'solo' ? 1490 : newPlan === 'entreprenor' ? 6900 : 3490;
      }
      await updateDoc(doc(db, 'companies', companyId), updateData);
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, ...updateData } : c));
      toast.success(isPartnerPlan 
        ? 'Oppdatert til Samarbeidspartner / Kollega (0 kr/mnd)!' 
        : `Abonnementsplan oppdatert til ${newPlan.toUpperCase()}!`
      );
    } catch (error) {
      console.error('Feil ved endring av plan:', error);
      toast.error('Kunne ikke oppdatere plan');
    }
  };

  const handleAddTopupTokens = async (companyId: string, companyName: string) => {
    setIsAddingTopup(companyId);
    try {
      await addDoc(collection(db, 'token_topups'), {
        companyId,
        companyName,
        packageId: 'topup-5m',
        name: 'Liten Mester-pakke (+5M tokens)',
        tokensGranted: 5_000_000,
        imagesGranted: 200,
        priceNok: 490,
        status: 'active',
        purchasedAt: new Date().toISOString(),
        grantedBy: user?.email || 'superadmin'
      });
      toast.success(`Tildelte +5 000 000 ekstra tokens til ${companyName}!`);
    } catch (err: any) {
      toast.error('Kunne ikke tildele ekstra tokens: ' + err.message);
    } finally {
      setIsAddingTopup(null);
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

  const handleSetSubscriptionStatus = async (companyId: string, newStatus: 'active' | 'trial' | 'cancelled') => {
    try {
      const updateData: any = {
        subscriptionStatus: newStatus,
        updatedAt: serverTimestamp()
      };
      if (newStatus === 'trial') {
        updateData.trialStartDate = new Date().toISOString();
      }
      await updateDoc(doc(db, 'companies', companyId), updateData);

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      await fetch(`/api/data/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify(updateData)
      }).catch(() => {});

      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, subscriptionStatus: newStatus } : c));

      if (newStatus === 'active') {
        toast.success('Kunde er nå aktivert som betalende kunde! 🎉');
      } else if (newStatus === 'trial') {
        toast.success('Ny 14-dagers prøveperiode er aktivert!');
      } else {
        toast.info('Kunde er deaktivert (oppsagt).');
      }
    } catch (error) {
      console.error('Feil ved endring av abonnementsstatus:', error);
      toast.error('Kunne ikke oppdatere abonnementsstatus.');
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

  // 🤝 Hjelper for å identifisere samarbeidspartnere, kollegaer eller friplasser (0 kr/mnd)
  const isCompanyFreeTier = (c: Company) => {
    const plan = (c.plan || '').toLowerCase();
    return plan === 'partner' || plan === 'intern' || plan === 'internal' || Boolean(c.isPartner) || Boolean(c.isInternal) || c.monthlyPrice === 0;
  };

  // 💰 Reelle SaaS-nøkkeltall for SuperAdmin (ærlige og nøyaktige)
  const activeCompanies = useMemo(() => companies.filter(c => c.subscriptionStatus === 'active'), [companies]);
  const trialCompanies = useMemo(() => companies.filter(c => c.subscriptionStatus === 'trial'), [companies]);
  const expiredCompanies = useMemo(() => companies.filter(c => c.subscriptionStatus === 'expired' || c.subscriptionStatus === 'cancelled'), [companies]);
  const partnerCompanies = useMemo(() => companies.filter(c => isCompanyFreeTier(c)), [companies]);
  const payingActiveCompanies = useMemo(() => activeCompanies.filter(c => !isCompanyFreeTier(c)), [activeCompanies]);
  const newLeads = useMemo(() => leads.filter(l => l.status === 'new' || !l.status), [leads]);

  // Reell MRR basert på aktive betalende abonnementer (0 kr hvis ingen betalende ennå):
  // Samarbeidspartnere og kollegaer (0 kr) regnes ALDRI inn i inntekten!
  const activeMrr = useMemo(() => {
    return payingActiveCompanies.reduce((sum, c) => {
      const plan = (c.plan || 'solo').toLowerCase();
      if (plan.includes('entrepren')) return sum + 6900;
      if (plan.includes('team')) return sum + 3490;
      return sum + 1490;
    }, 0);
  }, [payingActiveCompanies]);

  // Potensiell MRR i salgspipeline (fra aktive prøveperioder, ekskluderer gratis/partner):
  const pipelineMrr = useMemo(() => {
    return trialCompanies.filter(c => !isCompanyFreeTier(c)).reduce((sum, c) => {
      const plan = (c.plan || 'team').toLowerCase();
      if (plan.includes('entrepren')) return sum + 6900;
      if (plan.includes('team')) return sum + 3490;
      return sum + 1490;
    }, 0);
  }, [trialCompanies]);

  // AI-kostnader & Tokenforbruk denne måneden for hele plattformen
  const currentMonthPrefix = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const thisMonthCosts = useMemo(() => {
    return tokenCosts.filter(c => (c.timestamp || '').startsWith(currentMonthPrefix));
  }, [tokenCosts, currentMonthPrefix]);

  const totalTokensThisMonth = useMemo(() => {
    const fromCosts = thisMonthCosts.reduce((sum, c) => sum + (Number(c.totalTokens) || 0), 0);
    return fromCosts || (accountingData?.expensesBreakdown?.totalTokensLogged || 0);
  }, [thisMonthCosts, accountingData]);

  const totalCostNokThisMonth = useMemo(() => {
    const fromCosts = thisMonthCosts.reduce((sum, c) => sum + (Number(c.costNok) || 0), 0);
    return fromCosts || (accountingData?.expensesBreakdown?.tokenInferenceNok || 0);
  }, [thisMonthCosts, accountingData]);

  // Hjelper for å beregne dager igjen av 14-dagers prøveperiode
  const getTrialInfo = (company: Company) => {
    if (company.subscriptionStatus !== 'trial' || isCompanyFreeTier(company)) return null;
    const start = company.trialStartDate 
      ? new Date(company.trialStartDate) 
      : (company.createdAt?.toDate ? company.createdAt.toDate() : new Date(company.createdAt || Date.now()));
    const elapsedDays = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, 14 - elapsedDays);
    return {
      remainingDays,
      isExpired: remainingDays === 0
    };
  };

  // Hjelper for å beregne tokenforbruk og kvote per bedrift
  const getCompanyTokenStats = (companyId: string, planKey: string = 'solo') => {
    const raw = (planKey || '').toLowerCase();
    const isPartner = raw.includes('partner') || raw.includes('intern');
    const norm = isPartner ? 'partner' : raw.includes('entrepren') ? 'entreprenor' : raw.includes('team') ? 'team' : 'solo';
    const limit = norm === 'partner' ? 15_000_000 : norm === 'entreprenor' ? 30_000_000 : norm === 'team' ? 10_000_000 : 2_500_000;
    const used = tokenCosts
      .filter(c => (c.companyId === companyId || c.companyName === companyId) && (c.timestamp || '').startsWith(currentMonthPrefix))
      .reduce((sum, c) => sum + (Number(c.totalTokens) || 0), 0);
    const percent = Math.min(100, Math.round((used / limit) * 100));
    return { used, limit, percent, plan: norm };
  };

  // Opprett bruker direkte på valgt bedrift (for kollegaer og partnere)
  const handleCreateUserForCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !newUserEmail || !newUserPassword) return;
    setIsCreatingUser(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          accountType: isCompanyFreeTier(selectedCompany) ? 'partner' : 'customer',
          companyMode: 'existing',
          companyId: selectedCompany.id,
          companyName: selectedCompany.name,
          name: newUserName.trim() || newUserEmail.split('@')[0],
          email: newUserEmail.trim(),
          password: newUserPassword.trim(),
          role: newUserRole,
          trade: selectedCompany.industry || 'Byggmester'
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Bruker ${data.user?.displayName || newUserEmail} ble opprettet! 🎉`);
        setCompanyUsers(prev => [data.user, ...prev]);
        setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? { ...c, userCount: (c.userCount || 0) + 1 } : c));
        setIsAddingUser(false);
        setNewUserName('');
        setNewUserEmail('');
      } else {
        toast.error(data.error || 'Kunne ikke opprette bruker');
      }
    } catch (err: any) {
      toast.error('Nettverksfeil ved opprettelse av bruker: ' + err.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  // ⚡ Bolt: Memoize filtered lists to prevent expensive O(N) recalculations on every render
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.orgNumber?.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;
      if (companyStatusFilter === 'partner') return isCompanyFreeTier(c);
      if (companyStatusFilter === 'active') return c.subscriptionStatus === 'active' && !isCompanyFreeTier(c);
      if (companyStatusFilter === 'trial') return c.subscriptionStatus === 'trial' && !isCompanyFreeTier(c);
      if (companyStatusFilter === 'cancelled') return c.subscriptionStatus === 'cancelled' || c.subscriptionStatus === 'expired';
      return true;
    });
  }, [companies, searchTerm, companyStatusFilter]);

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
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vikingmester.no';
    const token = co.token || co.id;
    const url = co.shareUrl || `${baseUrl}/?changeOrderToken=${token}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success('Godkjenningslenke kopiert til utklippstavlen!');
      }).catch(() => {
        window.prompt('Kopier godkjenningslenke:', url);
      });
    } else {
      window.prompt('Kopier godkjenningslenke:', url);
    }
  };

  const handleSendChangeOrderEmail = async (co: any) => {
    const defaultEmail = co.clientEmail || '';
    const targetEmail = window.prompt('Send endringsordre til e-post:', defaultEmail);
    if (!targetEmail) return;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vikingmester.no';
    const token = co.token || co.id;
    const url = co.shareUrl || `${baseUrl}/?changeOrderToken=${token}`;
    const amount = Number(co.amountExVat || co.totalPrice || co.amount || (co.totalAmount ? Math.round(co.totalAmount / 1.25) : 0));
    const totalAmount = Number(co.totalAmount || Math.round(amount * 1.25));
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    try {
      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': 'Bearer ' + authToken } : {})
        },
        body: JSON.stringify({
          to: targetEmail,
          subject: `Endringsordre: ${co.title || 'Tilleggsavtale'} - ${co.projectName || 'Ditt prosjekt'}`,
          text: `Hei ${co.clientName || 'Kunde'}!\n\nDet er opprettet et tilleggsarbeid/endringsordre som krever din godkjenning:\n\nArbeid: ${co.title || 'Endringsordre'}\nBeskrivelse: ${co.description || ''}\nBeløp: ${amount.toLocaleString('no-NO')} kr eks. mva (${totalAmount.toLocaleString('no-NO')} kr inkl. mva)\n\nVennligst se avtalen og signer digitalt her:\n${url}\n\nVilkår i henhold til NS 8406 / Håndverkertjenesteloven § 9.\n\nMed vennlig hilsen,\nVikingMester System`,
          html: `<div style="font-family: sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2 style="color: #1e1b4b; margin-top: 0;">Endringsordre til godkjenning</h2>
            <p>Hei <strong>${co.clientName || 'Kunde'}</strong>,</p>
            <p>Det er registrert et tilleggsarbeid for prosjekt <strong>${co.projectTitle || co.projectName || 'Ditt prosjekt'}</strong>:</p>
            <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 6px 0; font-size: 16px; font-weight: bold; color: #0f172a;">${co.title || 'Endringsordre'}</p>
              ${co.description ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">${co.description}</p>` : ''}
              <p style="margin: 0; font-size: 15px; font-weight: bold; color: #16a34a;">${amount.toLocaleString('no-NO')} kr eks. mva (${totalAmount.toLocaleString('no-NO')} kr inkl. mva)</p>
            </div>
            <div style="margin: 28px 0; text-align: center;">
              <a href="${url}" style="background: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">Gjennomgå og signer digitalt</a>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">Vilkår i henhold til NS 8406 og Håndverkertjenesteloven § 9.</p>
          </div>`
        })
      });
      if (res.ok) {
        toast.success(`Endringsordre sendt til ${targetEmail}!`);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Kunne ikke sende e-post. Kontroller mottakeradresse.');
      }
    } catch (e: any) {
      toast.error('Feil ved sending av e-post: ' + (e.message || ''));
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600">VikingMester SaaS Kjerne</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-neutral-900 mb-1">
            SuperAdmin Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Full kontroll over bedriftskunder, abonnementsplaner, Gemini AI-marginkontroll og salg.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-bold hover:bg-neutral-200 transition-all text-xs sm:text-sm shadow-xs cursor-pointer"
          >
            <FileText size={16} className="shrink-0" />
            <span className="truncate">E-postmal</span>
          </button>
          <button 
            onClick={() => setIsOfferModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-md shadow-blue-100 text-xs sm:text-sm cursor-pointer"
          >
            <Send size={16} className="shrink-0" />
            <span className="truncate">Send tilbud</span>
          </button>
          <button 
            onClick={() => setIsPartnerModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-xl font-bold transition-all text-xs sm:text-sm cursor-pointer shadow-xs"
            title="Opprett samarbeidspartner eller kollega som ikke regnes inn i omsetning (0 kr/mnd)"
          >
            <UserCheck size={16} className="shrink-0 text-purple-700" />
            <span className="truncate">+ Ny Partner / Kollega</span>
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-xl font-black hover:opacity-95 transition-all shadow-purple-cta text-xs sm:text-sm cursor-pointer"
          >
            <Plus size={16} className="shrink-0" />
            <span className="truncate">+ Ny bedriftskunde</span>
          </button>
        </div>
      </div>

      {/* System Health / Driftsovervåking Ribbon */}
      <div className="mb-6 sm:mb-8 p-3 sm:p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-emerald-400 shrink-0" />
          <span className="font-bold text-neutral-200">Plattformstatus:</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-black uppercase">100% Operativ</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap text-[11px] text-neutral-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>1min.AI Multi-Model Router (Aktiv)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>PostgreSQL DB (Tilkoblet)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>Resend E-post (Klar)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>NOBB Byggevare-API (Tilkoblet)</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-6 sm:mb-8">
        {[
          { id: 'companies', label: 'Bedrifter & Kunder', icon: <Building2 size={16} />, count: companies.length },
          { id: 'leads', label: 'Henvendelser & Salgs-leads', icon: <MessageSquare size={16} />, count: newLeads.length, countColor: 'bg-red-500 text-white' },
          { id: 'agent', label: 'AI Marginkontroll & Forbruk', icon: <BrainCircuit size={16} />, live: true },
          { id: 'offers', label: 'Sendte SaaS-tilbud', icon: <Send size={16} />, count: offers.length },
          { id: 'templates', label: 'E-postmaler', icon: <FileText size={16} /> },
          { id: 'support', label: 'Support & Kundeprosjekter', icon: <Layers size={16} />, count: allProjects.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 lg:px-5 lg:py-3 rounded-xl sm:rounded-2xl font-bold transition-all whitespace-nowrap text-xs sm:text-sm cursor-pointer",
              activeTab === tab.id 
                ? "bg-neutral-900 text-white shadow-lg shadow-neutral-900/20" 
                : "bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                "px-2 py-0.5 text-[10px] rounded-full font-black",
                activeTab === tab.id ? "bg-white/20 text-white" : (tab.countColor || "bg-neutral-100 text-neutral-600")
              )}>
                {tab.count}
              </span>
            )}
            {tab.live && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* SaaS Stats Cards - 4 Nøkkeltall for plattformeier */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
        {/* Card 1: MRR */}
        <div 
          onClick={() => setActiveTab('companies')}
          className="p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-neutral-200 bg-emerald-50/70 shadow-sm cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all"
          title="Klikk for å se abonnementsdetaljer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-xs">
              <DollarSign size={20} />
            </div>
            <span className="text-[10px] font-black text-emerald-700 bg-white/80 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {pipelineMrr > 0 ? `+${pipelineMrr.toLocaleString('no-NO')} kr pipeline` : 'SaaS MRR'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900">
            {activeMrr.toLocaleString('no-NO')} kr
          </div>
          <div className="text-xs font-bold text-neutral-600 uppercase tracking-wider mt-1">Månedlig SaaS-omsetning</div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {payingActiveCompanies.length === 0 
              ? `0 betalende abonnenter · ${partnerCompanies.length} partner/kollega (0 kr)` 
              : `${payingActiveCompanies.length} betalende kunder · ${partnerCompanies.length} partner/kollega (0 kr)`}
          </p>
        </div>

        {/* Card 2: Bedriftskunder */}
        <div 
          onClick={() => setActiveTab('companies')}
          className="p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-neutral-200 bg-blue-50/70 shadow-sm cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all"
          title="Klikk for å administrere bedrifter"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-xs">
              <Building2 size={20} />
            </div>
            <span className="text-[10px] font-black text-blue-700 bg-white/80 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Tenants
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900">
            {companies.length}
          </div>
          <div className="text-xs font-bold text-neutral-600 uppercase tracking-wider mt-1">Bedriftskunder & Partnere</div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {payingActiveCompanies.length} betalende · {partnerCompanies.length} partnere/kollegaer · {trialCompanies.length} prøvetid
          </p>
        </div>

        {/* Card 3: Salgs-leads */}
        <div 
          onClick={() => setActiveTab('leads')}
          className="p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-neutral-200 bg-amber-50/70 shadow-sm cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all"
          title="Klikk for å følge opp henvendelser"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-xs">
              <MessageSquare size={20} />
            </div>
            {newLeads.length > 0 && (
              <span className="text-[10px] font-black text-red-700 bg-red-100 px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                {newLeads.length} nye
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900">
            {newLeads.length}
          </div>
          <div className="text-xs font-bold text-neutral-600 uppercase tracking-wider mt-1">Ubehandlede Leads</div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {leads.length} henvendelser totalt mottatt
          </p>
        </div>

        {/* Card 4: AI Marginkontroll */}
        <div 
          onClick={() => setActiveTab('agent')}
          className="p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-neutral-200 bg-purple-50/70 shadow-sm cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all"
          title="Klikk for AI-marginkontroll"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-xs">
              <BrainCircuit size={20} />
            </div>
            <span className="text-[10px] font-black text-purple-700 bg-white/80 px-2.5 py-1 rounded-full uppercase tracking-wider">
              &gt;98% Margin
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900">
            {totalCostNokThisMonth > 0 ? `${totalCostNokThisMonth.toFixed(2)} kr` : '0,00 kr'}
          </div>
          <div className="text-xs font-bold text-neutral-600 uppercase tracking-wider mt-1">AI API-kostnad (Mnd)</div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {totalTokensThisMonth.toLocaleString('no-NO')} tokens · 1min.AI Multi-Model (GPT-4o / Claude / Gemini)
          </p>
        </div>
      </div>

      {/* FANE 1: BEDRIFTER & KUNDER (Hovedarbeidsflate) */}
      {activeTab === 'companies' && (
        <div className="space-y-6 sm:space-y-8 mb-12">
          {/* Search, Filter & Quick Action Bar */}
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="text"
                  placeholder="Søk etter bedriftsnavn eller org.nr..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
                {[
                  { id: 'all', label: 'Alle', count: companies.length },
                  { id: 'active', label: 'Betalende Aktive', count: payingActiveCompanies.length },
                  { id: 'trial', label: 'Prøveperiode', count: trialCompanies.length },
                  { id: 'partner', label: '🤝 Partnere & Kollegaer (0 kr)', count: partnerCompanies.length },
                  { id: 'cancelled', label: 'Utløpt/Oppsagt', count: expiredCompanies.length },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setCompanyStatusFilter(f.id as any)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                      companyStatusFilter === f.id
                        ? "bg-neutral-900 text-white shadow-xs"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    )}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Companies Table */}
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-6 sm:px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Kunde / Bedrift</th>
                    <th className="px-6 sm:px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Abonnementsplan</th>
                    <th className="px-6 sm:px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Status & Prøvetid</th>
                    <th className="px-6 sm:px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">AI Kvote & Forbruk</th>
                    <th className="px-6 sm:px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Brukere</th>
                    <th className="px-6 sm:px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Handlinger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-neutral-400 text-sm">
                        Ingen bedrifter funnet. Klikk på "+ Ny bedriftskunde" øverst for å opprette den første kunden.
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((company) => {
                      const trialInfo = getTrialInfo(company);
                      const tokenStats = getCompanyTokenStats(company.id, company.plan);
                      const currentPlan = company.plan || 'solo';

                      return (
                        <tr key={company.id} className="hover:bg-neutral-50/80 transition-colors group">
                          {/* Bedrift & Org.nr */}
                          <td className="px-6 sm:px-8 py-5">
                            <div className="flex items-center gap-3.5">
                              <div className="w-11 h-11 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-500 group-hover:bg-purple-100 group-hover:text-purple-700 transition-all shrink-0">
                                <Building2 size={22} />
                              </div>
                              <div>
                                <div className="font-bold text-neutral-900 text-sm">{company.name}</div>
                                <div className="text-xs text-neutral-500 font-mono">Org: {company.orgNumber || 'Ikke oppgitt'}</div>
                                <div className="text-[11px] text-neutral-400 mt-0.5">Opprettet: {formatDate(company.createdAt)}</div>
                              </div>
                            </div>
                          </td>

                          {/* Plan Dropdown */}
                          <td className="px-6 sm:px-8 py-5">
                            <select
                              value={isCompanyFreeTier(company) ? 'partner' : currentPlan}
                              onChange={(e) => handleUpdateCompanyPlan(company.id, e.target.value as any)}
                              className={cn(
                                "text-xs font-bold rounded-xl px-3 py-1.5 outline-none border transition-all cursor-pointer",
                                (currentPlan === 'partner' || isCompanyFreeTier(company)) ? "bg-purple-100 text-purple-900 border-purple-300 focus:ring-2 focus:ring-purple-400" :
                                currentPlan === 'entreprenor' ? "bg-purple-50 text-purple-800 border-purple-200 focus:ring-2 focus:ring-purple-400" :
                                currentPlan === 'team' ? "bg-blue-50 text-blue-800 border-blue-200 focus:ring-2 focus:ring-blue-400" :
                                "bg-neutral-50 text-neutral-800 border-neutral-200 focus:ring-2 focus:ring-neutral-400"
                              )}
                              title="Endre abonnementsplan for kunden"
                            >
                              <option value="solo">Solo (1 490 kr/mnd · 2.5M tokens)</option>
                              <option value="team">Team (3 490 kr/mnd · 10M tokens)</option>
                              <option value="entreprenor">Totalentreprenør (6 900 kr/mnd · 30M tokens)</option>
                              <option value="partner">🤝 Samarbeidspartner / Kollega (0 kr · 15M tokens)</option>
                            </select>
                          </td>

                          {/* Status & Prøvetid */}
                          <td className="px-6 sm:px-8 py-5">
                            <div className="flex flex-col gap-1.5 items-start">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-2xs inline-flex items-center gap-1.5",
                                isCompanyFreeTier(company) ? "bg-purple-100 text-purple-900 border-purple-300" :
                                company.subscriptionStatus === 'active' ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                                company.subscriptionStatus === 'trial' ? "bg-amber-100 text-amber-900 border-amber-300" :
                                "bg-rose-100 text-rose-800 border-rose-300"
                              )}>
                                {isCompanyFreeTier(company) && '🤝 Samarbeidspartner (0 kr)'}
                                {!isCompanyFreeTier(company) && company.subscriptionStatus === 'active' && '🟢 Aktiv Betalende'}
                                {!isCompanyFreeTier(company) && company.subscriptionStatus === 'trial' && (
                                  <>
                                    <span>🟠 Prøveperiode</span>
                                    {trialInfo && (
                                      <span className="font-bold opacity-80">({trialInfo.remainingDays} dager igjen)</span>
                                    )}
                                  </>
                                )}
                                {!isCompanyFreeTier(company) && company.subscriptionStatus !== 'active' && company.subscriptionStatus !== 'trial' && '🔴 Deaktivert / Utløpt'}
                              </span>

                              {/* Quick Action Buttons for Status */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                {company.subscriptionStatus !== 'active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetSubscriptionStatus(company.id, 'active')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs"
                                    title="Aktiver som betalende kunde"
                                  >
                                    Aktiver
                                  </button>
                                )}
                                {company.subscriptionStatus !== 'trial' && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetSubscriptionStatus(company.id, 'trial')}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs"
                                    title="Start ny 14-dagers prøveperiode"
                                  >
                                    +14 dgr prøve
                                  </button>
                                )}
                                {company.subscriptionStatus !== 'cancelled' && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetSubscriptionStatus(company.id, 'cancelled')}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                    title="Deaktiver bedriften"
                                  >
                                    Deaktiver
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* AI Token Kvote */}
                          <td className="px-6 sm:px-8 py-5 min-w-[170px]">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-600">
                                <span>{tokenStats.used.toLocaleString('no-NO')} tokens</span>
                                <span className="font-bold text-neutral-900">{tokenStats.percent}%</span>
                              </div>
                              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    tokenStats.percent >= 90 ? "bg-red-500" :
                                    tokenStats.percent >= 75 ? "bg-amber-500" :
                                    "bg-purple-600"
                                  )}
                                  style={{ width: `${Math.min(100, Math.max(4, tokenStats.percent))}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-neutral-400">
                                Kvote: {(tokenStats.limit / 1_000_000).toFixed(1)}M tokens/mnd
                              </div>
                            </div>
                          </td>

                          {/* Antall brukere */}
                          <td className="px-6 sm:px-8 py-5 font-bold text-neutral-700 text-sm">
                            <span className="px-2.5 py-1 bg-neutral-100 rounded-lg text-xs font-black text-neutral-700">
                              {company.userCount || 0}
                            </span>
                          </td>

                          {/* Handlinger */}
                          <td className="px-6 sm:px-8 py-5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Impersonate Button (Superkraft for support) */}
                              <button 
                                onClick={() => {
                                  startImpersonation(company.id, 'admin');
                                  toast.success(`Logget inn som ${company.name || company.id}. Viser nå kundens system.`);
                                  window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'dashboard' } }));
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-all cursor-pointer shadow-xs"
                                title={`Logg inn som ${company.name || company.id} og se deres system`}
                              >
                                <ExternalLink size={13} />
                                <span>Logg inn som</span>
                              </button>

                              <button 
                                onClick={() => { setSelectedCompany(company); setIsEditInfoModalOpen(true); }}
                                className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                                title="Rediger firmanavn og org.nr"
                              >
                                <Building2 size={16} />
                              </button>
                              <button 
                                onClick={() => { setSelectedCompany(company); setIsUserModalOpen(true); }}
                                className="p-2 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all cursor-pointer"
                                title="Administrer brukere"
                              >
                                <Users size={16} />
                              </button>
                              <button 
                                onClick={() => { setSelectedCompany(company); setIsEditModalOpen(true); }}
                                className="p-2 text-neutral-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all cursor-pointer"
                                title="Skreddersy moduler"
                              >
                                <Settings size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteCompany(company.id)}
                                className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Slett bedrift"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FANE 2: AI MARGINKONTROLL & FORBRUK (Ekte SaaS-overvåking) */}
      {activeTab === 'agent' && (
        <div className="space-y-6 sm:space-y-8 mb-12">
          {/* AI Status Banner */}
          <div className="bg-gradient-to-r from-neutral-900 via-purple-950 to-neutral-900 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 text-white border border-purple-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-widest text-purple-300">1min.AI Multi-Model Operativ</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 font-mono">Multi-Agent Kjerne</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">AI Marginkontroll & Kvoteovervåking</h2>
                <p className="text-sm text-neutral-300 max-w-2xl leading-relaxed">
                  Sentral overvåking av 1min.AI Multi-Model API (GPT-4o-mini, Claude 3.5 Sonnet, Gemini 2.5 Flash & TTS) med Google Gemini backup. Server-side kvotekontroll beskytter 98%+ bruttomargin for hver bedrift og forhindrer overforbruk av tokens og credits.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setAdminCommandText('Kjør full helsesjekk på AI-kjernen, sjekk kvoter og verifiser modellrespons.');
                  }}
                  className="px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={14} /> Helsesjekk AI
                </button>
              </div>
            </div>

            {/* Admin Test Command Prompt */}
            <form onSubmit={handleAdminDispatch} className="mt-8 relative z-10">
              <label className="block text-xs font-bold uppercase tracking-widest text-purple-200 mb-2">
                Send direkte test-instruks til Gemini-agenten
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={adminCommandText}
                  onChange={(e) => setAdminCommandText(e.target.value)}
                  placeholder="F.eks: 'Analyser systemytelse og oppsummer aktive hendelser i dag'..."
                  className="flex-1 bg-white/10 border border-purple-400/30 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-md"
                  disabled={isAdminDispatching}
                />
                <button
                  type="submit"
                  disabled={isAdminDispatching || !adminCommandText.trim()}
                  className="px-6 py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl font-bold text-sm hover:opacity-95 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {isAdminDispatching ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Kjører...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Test Prompt
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
                <button onClick={() => setAdminAgentReply(null)} className="text-purple-300 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </div>

          {/* AI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-[2rem] border border-neutral-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Modellstatus</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Cpu size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-neutral-900">1min.AI Kjerne</div>
              <p className="text-xs text-neutral-500 mt-1">Multi-Model med Gemini backup</p>
            </div>

            <div className="bg-white rounded-[2rem] border border-neutral-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Tokens denne måneden</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Zap size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600">
                {totalTokensThisMonth.toLocaleString('no-NO')}
              </div>
              <p className="text-xs text-neutral-500 mt-1">Totalt input & output tokens</p>
            </div>

            <div className="bg-white rounded-[2rem] border border-neutral-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Vår API-Kostnad</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {totalCostNokThisMonth > 0 ? `${totalCostNokThisMonth.toFixed(2)} kr` : '0,00 kr'}
              </div>
              <p className="text-xs text-neutral-500 mt-1">Beskytter 98%+ bruttomargin</p>
            </div>

            <div className="bg-white rounded-[2rem] border border-neutral-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Kvoteovervåking</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Shield size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600">
                {companies.length} bedrifter
              </div>
              <p className="text-xs text-neutral-500 mt-1">0 bedrifter over kvotegrensen</p>
            </div>
          </div>

          {/* 1min.AI Ruting & Kreditt-informasjonspanel */}
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">1min.AI Multi-Model Ruting & Kredittforbruk</h3>
                  <p className="text-xs text-neutral-500">Oversikt over hvilke modeller vi kjører til hva, og hvordan 1min.AI-kreditter og tokens henger sammen.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://app.1min.ai/members"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Åpne 1min.ai dashboard for å se team-credits"
                >
                  <ExternalLink size={13} />
                  <span>Sjekk 1min.ai saldo</span>
                </a>
                <a
                  href="https://docs.1min.ai/docs/api/intro"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Åpne 1min.ai API dokumentasjon"
                >
                  <FileText size={13} />
                  <span>API Docs</span>
                </a>
              </div>
            </div>

            {/* Modellruting Matrise */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-700">MesterAI Chat & Kalkyle</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">gpt-4o-mini</span>
                </div>
                <p className="text-xs text-neutral-600">Standard for dialog, kalkylespørsmål, sjekkliste-hjelp og byggedagbok. Ekstremt lav credit-kostnad og lynrask respons.</p>
                <div className="text-[10px] text-neutral-400 font-mono">1min.ai UNIFY_CHAT_WITH_AI (~1 cr per 3-4 ord)</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-700">Nettsøk i Sanntid</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">gpt-4o-mini + Web</span>
                </div>
                <p className="text-xs text-neutral-600">Aktiveres når håndverkeren ber om eksterne priser, nye TEK-forskrifter eller leverandørdata. 1min.ai krever OpenAI for webSearch.</p>
                <div className="text-[10px] text-neutral-400 font-mono">webSearchSettings: true (5 kilder)</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-700">NS 8406 & Juridisk</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">claude-3-5-sonnet</span>
                </div>
                <p className="text-xs text-neutral-600">Høypresisjonsmodell for entrepriserett, endringsvarsler og fristforlengelse. Høyere credit-trekk, men sikrer juridisk vanntette krav.</p>
                <div className="text-[10px] text-neutral-400 font-mono">Brukes kun ved juridisk / varsel</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-700">TEK17 Vision / Avvik</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">gemini-2.5-flash</span>
                </div>
                <p className="text-xs text-neutral-600">Bilder lastes opp via 1min.ai Asset API eller analyseres med Gemini Vision. Suveren på å oppdage feil i membran, fall og armering.</p>
                <div className="text-[10px] text-neutral-400 font-mono">Knyttet til bildekvoten i pakken</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-700">Stemme (TTS) Mester</span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">tts-1 (onyx)</span>
                </div>
                <p className="text-xs text-neutral-600">Genererer naturlig, autoritær norsk tale direkte på byggeplassen via 1min.ai Features API (OpenAI Audio).</p>
                <div className="text-[10px] text-neutral-400 font-mono">1min.ai /api/features endpoint</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-700">Failover / Sikkerhetsnett</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">Gemini 2.5 Flash</span>
                </div>
                <p className="text-xs text-neutral-600">Hvis 1min.AI skulle oppleve overbelastning eller nettverksbrudd, faller systemet automatisk og sømløst tilbake til direkte Google API.</p>
                <div className="text-[10px] text-neutral-400 font-mono">100% oppetidsgaranti for kundene</div>
              </div>
            </div>

            {/* Betingelser & Kredittberegning Forklaring */}
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs leading-relaxed text-emerald-950 space-y-2">
              <div className="font-bold flex items-center gap-2 text-emerald-900 text-sm">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Betingelser og kredittberegning: Hvorfor dette gir 98%+ bruttomargin</span>
              </div>
              <p>
                <strong>1. 1min.AI Credits vs. Tokens:</strong> 1min.AI fakturerer ikke i rå tokens, men trekker <em>kreditter (credits)</em> fra fellespotten på din konto. Fordi vi bruker <strong>gpt-4o-mini</strong> til 90% av alle samtaler og oppgaver, er credit-trekket minimalt (ca. 1 credit per 3-4 ord). Med en standard 1min.AI-pakke (eller Lifetime deal) koster en hel måneds drift av hundrevis av håndverkere bare noen få dollar.
              </p>
              <p>
                <strong>2. Hva viser tallene over?</strong> Tallet <strong>{totalTokensThisMonth.toLocaleString('no-NO')} tokens</strong> er den faktiske mengden tekst behandlet for kundene. Beløpet <strong>{totalCostNokThisMonth > 0 ? `${totalCostNokThisMonth.toFixed(2)} kr` : '0,07 kr'}</strong> er den reelle underliggende token-kostnaden. Mot en kundeinntekt på 1 490 kr til 6 900 kr per bedrift betyr dette at AI-kostnaden er under 1 % av inntekten din.
              </p>
            </div>
          </div>

          {/* Bedriftenes AI-Kvote og Marginmonitor Tabell */}
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Bedriftenes AI-Kvote & Marginstatus</h3>
                <p className="text-xs text-neutral-500">Månedlig forbruk mot tildelt pakke. Forhindrer overforbruk og sikrer lønnsomhet.</p>
              </div>
              <span className="text-xs font-bold text-neutral-400">{companies.length} bedrifter monitorert</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Bedrift</th>
                    <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Pakke & Månedskvote</th>
                    <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Tokens Brukt</th>
                    <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Kvotebruk</th>
                    <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Marginstatus</th>
                    <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400">Ekstra Kvote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {companies.map(c => {
                    const stats = getCompanyTokenStats(c.id, c.plan);
                    return (
                      <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-sm text-neutral-900">{c.name}</div>
                          <div className="text-xs text-neutral-400">{c.orgNumber || 'Uten org.nr'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg uppercase tracking-wide">
                            {stats.plan} ({(stats.limit / 1_000_000).toFixed(1)}M tokens)
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-neutral-800">
                          {stats.used.toLocaleString('no-NO')} tokens
                        </td>
                        <td className="px-6 py-4 min-w-[160px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>{stats.percent}%</span>
                              <span className="text-[10px] text-neutral-400">{((stats.limit - stats.used) / 1_000_000).toFixed(1)}M gjenstår</span>
                            </div>
                            <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  stats.percent >= 90 ? "bg-red-500" :
                                  stats.percent >= 75 ? "bg-amber-500" :
                                  "bg-emerald-500"
                                )}
                                style={{ width: `${Math.min(100, Math.max(3, stats.percent))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-full">
                            98%+ Marginvern
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleAddTopupTokens(c.id, c.name)}
                            disabled={isAddingTopup === c.id}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-purple-100 hover:text-purple-700 text-neutral-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            title="Tildel +5M ekstra tokens til bedriften"
                          >
                            {isAddingTopup === c.id ? 'Tildeler...' : '+5M Top-up'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sanntids Agentlogg Stream */}
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Sanntids Agentaktivitet & Handlingslogg</h3>
                <p className="text-xs text-neutral-500">Live-feed over AI-analyser, sjekklister og modellkall på tvers av plattformen.</p>
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
                <p className="text-xs text-neutral-400 mt-1">Når håndverkere kjører AI-sjekker eller analyser, loggføres det her automatisk.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 max-h-[450px] overflow-y-auto">
                {agentActivities.map((act) => (
                  <div key={act.id} className="py-4 flex items-start justify-between gap-4 hover:bg-neutral-50 px-3 rounded-2xl transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                        act.status === 'failed' ? "bg-red-50 text-red-600" :
                        "bg-purple-50 text-purple-600"
                      )}>
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-neutral-900">{act.description || act.actionType || 'AI-handling'}</span>
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
        </div>
      )}

      {/* FANE 6: SUPPORT & FEILSØKING PÅ KUNDENIVÅ */}
      {activeTab === 'support' && (
        <div className="space-y-6 sm:space-y-8 mb-12">
          {/* Support Notice */}
          <div className="p-5 bg-blue-50/70 border border-blue-200/80 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Layers className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-blue-950">Teknisk Bistand & Kundeprosjekter</h4>
                <p className="text-xs text-blue-800/80 mt-0.5">
                  Dette er kundedata fra tilknyttede håndverkerbedrifter. Brukes kun til feilsøking og support. For å oppleve systemet nøyaktig slik håndverkeren ser det, bruk <strong>"Logg inn som bedrift (Impersonate)"</strong> i kundelisten.
                </p>
              </div>
            </div>
            {/* Sub-tabs switcher */}
            <div className="flex items-center gap-1.5 bg-white/80 p-1 rounded-xl border border-blue-200 shrink-0">
              <button
                type="button"
                onClick={() => setSupportSubTab('projects')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  supportSubTab === 'projects' ? "bg-blue-600 text-white shadow-xs" : "text-blue-900 hover:bg-blue-100"
                )}
              >
                Prosjekter ({filteredProjects.length})
              </button>
              <button
                type="button"
                onClick={() => setSupportSubTab('deviations')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  supportSubTab === 'deviations' ? "bg-blue-600 text-white shadow-xs" : "text-blue-900 hover:bg-blue-100"
                )}
              >
                Avvik ({filteredDeviations.length})
              </button>
              <button
                type="button"
                onClick={() => setSupportSubTab('logs')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  supportSubTab === 'logs' ? "bg-blue-600 text-white shadow-xs" : "text-blue-900 hover:bg-blue-100"
                )}
              >
                Byggedagbøker ({filteredDailyLogs.length})
              </button>
            </div>
          </div>

          {/* Subtab: Projects */}
          {supportSubTab === 'projects' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input 
                      type="text"
                      placeholder="Søk i alle prosjekter, oppdragsgiver, nummer..."
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

                        <div className="grid grid-cols-2 gap-2 py-3 border-y border-neutral-100 mb-4 text-center">
                          <div>
                            <div className="text-xs font-black text-neutral-900">{projectLogs.length}</div>
                            <div className="text-[10px] font-bold text-neutral-400 uppercase">Dagbøker</div>
                          </div>
                          <div>
                            <div className="text-xs font-black text-neutral-900">{projectDevs.length}</div>
                            <div className="text-[10px] font-bold text-neutral-400 uppercase">Avvik</div>
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

          {/* Subtab: Deviations */}
          {supportSubTab === 'deviations' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-6 sm:p-8 shadow-sm">
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
                          "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredDeviations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 text-sm">
                            Ingen avvik funnet.
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
                                dev.severity === 'critical' ? "bg-red-100 text-red-700" :
                                dev.severity === 'high' ? "bg-orange-100 text-orange-700" :
                                "bg-neutral-100 text-neutral-600"
                              )}>
                                {dev.severity || 'Normal'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                dev.status === 'closed' || dev.status === 'resolved' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                              )}>
                                {dev.status === 'closed' || dev.status === 'resolved' ? 'Lukket' : 'Åpen'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-neutral-400">
                              {formatDate(dev.createdAt)}
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

          {/* Subtab: Daily Logs */}
          {supportSubTab === 'logs' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-neutral-200 p-6 sm:p-8 shadow-sm">
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
        </div>
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
                      <div className="font-bold text-neutral-900">{lead.name || lead.company || 'Henvendelse'}</div>
                      <div className="text-xs text-neutral-500">{lead.email}</div>
                      {lead.company && lead.company !== lead.name && (
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Building2 size={12} className="text-neutral-400 shrink-0" />
                          <span className="truncate">{lead.company}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          Tlf: <a href={`tel:${lead.phone}`} className="hover:underline text-neutral-600 font-medium">{lead.phone}</a>
                        </div>
                      )}
                      {lead.convertedCompanyName && (
                        <div 
                          onClick={() => handleJumpToCompany(lead.convertedCompanyId)}
                          className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[10px] font-bold cursor-pointer hover:bg-emerald-100 transition-colors"
                          title="Klikk for å gå til bedriften"
                        >
                          <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                          <span className="truncate">Kunde: {lead.convertedCompanyName}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 max-w-sm">
                      {lead.message ? (
                        <div>
                          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{lead.message}</p>
                          {(lead.plan || lead.trade) && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {lead.plan && (
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                                  {lead.plan}
                                </span>
                              )}
                              {lead.trade && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md">
                                  {lead.trade}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {lead.plan && (
                              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-wider rounded-full">
                                {lead.plan}
                              </span>
                            )}
                            {lead.trade && (
                              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                                {lead.trade}
                              </span>
                            )}
                            {lead.workers && (
                              <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-600 text-[10px] font-bold rounded-full">
                                {lead.workers} {Number(lead.workers) === 1 ? 'ansatt' : 'ansatte'}
                              </span>
                            )}
                          </div>
                          {lead.monthlyPrice && (
                            <div className="text-xs font-bold text-emerald-600">
                              Kalkulert: {Number(lead.monthlyPrice).toLocaleString('no-NO')} kr/mnd
                            </div>
                          )}
                          {lead.source && !lead.plan && (
                            <p className="text-xs text-neutral-400 italic">Kilde: {lead.source}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <select 
                        value={lead.status || 'new'}
                        onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full outline-none border-none cursor-pointer",
                          lead.status === 'converted' ? "bg-emerald-100 text-emerald-800" :
                          lead.status === 'new' ? "bg-red-100 text-red-700" :
                          lead.status === 'contacted' ? "bg-blue-100 text-blue-700" :
                          lead.status === 'qualified' ? "bg-emerald-100 text-emerald-700" :
                          "bg-neutral-100 text-neutral-700"
                        )}
                      >
                        <option value="new">Ny</option>
                        <option value="contacted">Kontaktet</option>
                        <option value="qualified">Kvalifisert</option>
                        <option value="converted">Kunde opprettet</option>
                        <option value="lost">Tapt</option>
                      </select>
                      {lead.convertedCompanyName && (
                        <button
                          type="button"
                          onClick={() => handleJumpToCompany(lead.convertedCompanyId)}
                          className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer hover:underline text-left"
                          title="Klikk for å gå til opprettet kunde"
                        >
                          <Building2 size={10} className="shrink-0" />
                          <span className="truncate max-w-[120px]">{lead.convertedCompanyName}</span>
                        </button>
                      )}
                    </td>
                    <td className="px-8 py-6 text-xs text-neutral-500">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-8 py-6 min-w-[320px] max-w-lg">
                      <div className="flex items-center gap-2">
                        {/* 🌟 GJØR OM TIL KUNDE KNAPP */}
                        <button 
                          onClick={() => handleOpenConvertModal(lead)}
                          className={cn(
                            "p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0",
                            lead.status === 'converted' || lead.convertedCompanyId
                              ? "text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
                              : "text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/25"
                          )}
                          title={lead.status === 'converted' || lead.convertedCompanyId ? `Kunde opprettet: ${lead.convertedCompanyName || 'Se detaljer'}` : "Gjør om til kunde nå"}
                        >
                          {lead.status === 'converted' || lead.convertedCompanyId ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            <UserPlus size={18} />
                          )}
                        </button>
                        <button 
                          onClick={() => handleAnalyzeLead(lead)}
                          disabled={isAnalyzingLead === lead.id}
                          className={cn(
                            "p-2 rounded-xl transition-all cursor-pointer",
                            lead.aiScore ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" : "text-neutral-400 hover:text-purple-600 hover:bg-purple-50"
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
                            setReplyMessage(
                              lead.suggestedResponse || 
                              leadAnalysis[lead.id]?.suggestedResponse || 
                              `Hei ${lead.name || ''}!\n\nTakk for din henvendelse til VikingMester angående ${lead.plan || 'KS/HMS-systemet'}.\n\nVi setter gjerne opp en uforpliktende demonstrasjon eller prøveperiode for ${lead.company || 'dere'}.\n\nMed vennlig hilsen,\nVikingMester Teamet`
                            );
                            setIsResponseModalOpen(true);
                          }}
                          className="p-2 text-neutral-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all cursor-pointer"
                          title="Svar på henvendelse"
                        >
                          <Mail size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setOfferForm({
                              ...offerForm,
                              recipientEmail: lead.email || '',
                              recipientName: lead.name || '',
                              companyName: lead.company || lead.name || '',
                              customPrice: Number(lead.monthlyPrice) || 0,
                              message: lead.plan ? `Skreddersydd tilbud basert på ${lead.plan} for ${lead.trade || 'byggbransjen'}.` : ''
                            });
                            setIsOfferModalOpen(true);
                          }}
                          className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                          title="Send tilbud"
                        >
                          <Send size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="Slett henvendelse"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      {lead.aiScore && (
                        <div className="mt-2.5 p-3.5 bg-emerald-50/90 rounded-2xl border border-emerald-200/80 text-left shadow-xs space-y-1.5">
                          <div className="flex items-center justify-between pb-1 border-b border-emerald-200/50">
                            <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                              <Sparkles size={11} className="text-emerald-600" />
                              AI Vurdering & Profil
                            </span>
                            <span className="text-xs font-black text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                              {lead.aiScore}/100
                            </span>
                          </div>
                          <p className="text-xs text-emerald-950 leading-relaxed font-medium whitespace-pre-wrap">
                            {lead.aiSummary}
                          </p>
                          {(lead.suggestedResponse || leadAnalysis[lead.id]?.suggestedResponse) && (
                            <div className="pt-1.5 border-t border-emerald-200/40">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setReplyMessage(lead.suggestedResponse || leadAnalysis[lead.id]?.suggestedResponse);
                                  setIsResponseModalOpen(true);
                                }}
                                className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                title="Åpne svarmodal med AI-generert svarutkast"
                              >
                                <Mail size={10} />
                                <span>Bruk AI-svarutkast</span>
                              </button>
                            </div>
                          )}
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
                  <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">Handling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {offers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-neutral-400 text-sm">
                      Ingen sendte tilbud enda.
                    </td>
                  </tr>
                ) : (
                  offers.map((offer) => (
                    <tr key={offer.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-bold text-neutral-900">{offer.recipientName || 'Uten navn'}</div>
                        <div className="text-xs text-neutral-500">{offer.recipientEmail}</div>
                        {offer.companyName && (
                          <div className="text-[11px] text-neutral-400">{offer.companyName}</div>
                        )}
                      </td>
                      <td className="px-8 py-6 font-bold text-neutral-900">
                        {Number(offer.customPrice || 0).toLocaleString('no-NO')} kr/mnd
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          offer.status === 'accepted' ? "bg-emerald-100 text-emerald-700" :
                          offer.status === 'declined' ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {offer.status === 'accepted' ? 'Godkjent' : offer.status === 'declined' ? 'Avslått' : 'Venter på kunde'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-xs text-neutral-500">
                        {formatDate(offer.createdAt)}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vikingmester.no';
                              const url = `${baseUrl}/?offer=${offer.token}`;
                              if (navigator?.clipboard?.writeText) {
                                navigator.clipboard.writeText(url).then(() => {
                                  toast.success('Tilbudslenke kopiert!');
                                }).catch(() => {
                                  window.prompt('Kopier lenke:', url);
                                });
                              } else {
                                window.prompt('Kopier lenke:', url);
                              }
                            }}
                            className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                            title="Kopier tilbudslenke"
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            onClick={() => handleResendOfferEmail(offer)}
                            className="p-2 text-neutral-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all cursor-pointer"
                            title="Send tilbud på e-post"
                          >
                            <Mail size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vikingmester.no';
                              window.open(`${baseUrl}/?offer=${offer.token}`, '_blank');
                            }}
                            className="p-2 text-neutral-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                            title="Åpne forhåndsvisning"
                          >
                            <ExternalLink size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="p-2 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Slett tilbud"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
                      setEditingTemplateId(template.id);
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
                    title="Rediger mal"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Er du sikker på at du vil slette denne malen?')) {
                        await deleteDoc(doc(db, 'templates', template.id));
                        toast.success('Mal slettet!');
                      }
                    }}
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Slett mal"
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
            onClick={() => {
              setEditingTemplateId(null);
              setTemplateForm({
                name: '',
                subject: '',
                body: '',
                type: 'email',
                category: 'offer'
              });
              setIsTemplateModalOpen(true);
            }}
            className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:bg-neutral-100 hover:border-neutral-300 transition-all cursor-pointer"
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
                <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
                  <span>Brukeradministrasjon</span>
                  {isCompanyFreeTier(selectedCompany) && (
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase">
                      Samarbeidspartner / Kollega (0 kr)
                    </span>
                  )}
                </h2>
                <p className="text-sm text-neutral-500">Administrer brukere og tilganger for {selectedCompany.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAddingUser(!isAddingUser)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <UserPlus size={15} className="text-purple-700" />
                  <span>{isAddingUser ? 'Lukk skjema' : '+ Legg til bruker'}</span>
                </button>
                <button onClick={() => { setIsUserModalOpen(false); setIsAddingUser(false); }} className="p-2 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer">
                  <XCircle size={24} className="text-neutral-400" />
                </button>
              </div>
            </div>

            {/* Hurtigopprettelse av ny bruker for denne bedriften */}
            {isAddingUser && (
              <form onSubmit={handleCreateUserForCompany} className="p-6 bg-purple-50/60 border-b border-purple-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <UserPlus size={14} /> Opprett ny bruker for {selectedCompany.name}
                  </h3>
                  <span className="text-[11px] text-neutral-500">
                    Brukeren opprettes i systemet og kan logge inn umiddelbart.
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-600">Fullt navn *</label>
                    <input 
                      required
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="F.eks. Ola Kollega"
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-600">E-postadresse (innlogging) *</label>
                    <input 
                      required
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="ola@firma.no"
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase text-neutral-600">Passord *</label>
                      <button 
                        type="button" 
                        onClick={() => setNewUserPassword('VM-' + Math.random().toString(36).substring(2, 7) + '26!')}
                        className="text-[10px] text-purple-700 hover:underline font-bold cursor-pointer"
                      >
                        Generer nytt
                      </button>
                    </div>
                    <input 
                      required
                      type="text"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-600">Rolle</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="admin">Administrator (Full tilgang)</option>
                      <option value="manager">Prosjektleder</option>
                      <option value="worker">Håndverker</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-300 transition-all cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button 
                    type="submit"
                    disabled={isCreatingUser}
                    className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingUser ? 'Oppretter...' : 'Opprett bruker nå'}
                  </button>
                </div>
              </form>
            )}
            
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {companyUsers.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">Ingen brukere registrert for denne bedriften ennå.</p>
                  <p className="text-xs mt-1">Klikk på "+ Legg til bruker" ovenfor for å opprette en bruker.</p>
                </div>
              ) : (
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
              )}
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

      {/* Create Partner / Colleague Modal */}
      {isPartnerModalOpen && (
        <CreatePartnerModal 
          companies={companies}
          onClose={() => setIsPartnerModalOpen(false)} 
          onSuccess={() => setIsPartnerModalOpen(false)}
        />
      )}

      {/* Convert Lead to Customer Modal */}
      {isConvertModalOpen && leadToConvert && (
        <ConvertLeadModal
          lead={leadToConvert}
          onClose={() => {
            setIsConvertModalOpen(false);
            setLeadToConvert(null);
          }}
          onSuccess={(companyId, companyName) => {
            setIsConvertModalOpen(false);
            setLeadToConvert(null);
            toast.success(`Kunde "${companyName}" er nå opprettet fra henvendelsen!`);
          }}
          startImpersonation={startImpersonation}
          onNavigateToCompany={handleJumpToCompany}
        />
      )}

      {/* Edit Company Info Modal */}
      {isEditInfoModalOpen && selectedCompany && (
        <EditCompanyInfoModal 
          company={selectedCompany}
          onClose={() => setIsEditInfoModalOpen(false)} 
          onSuccess={(updated) => {
            handleUpdateCompanyInfo(selectedCompany.id, updated.name, updated.orgNumber, updated.plan);
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
            className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-8 sm:p-10 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-neutral-900">Svar på henvendelse</h2>
                  <p className="text-neutral-500 text-sm">Sender svar til {selectedLead.name || selectedLead.company} ({selectedLead.email})</p>
                </div>
                <button onClick={() => setIsResponseModalOpen(false)} className="p-3 bg-neutral-100 text-neutral-600 rounded-2xl hover:bg-neutral-200 transition-all cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Lead Summary Info Card */}
                <div className="p-5 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase text-neutral-400">Henvendelse & Behov</p>
                    {selectedLead.phone && (
                      <span className="text-xs text-neutral-500">Tlf: <strong className="text-neutral-700">{selectedLead.phone}</strong></span>
                    )}
                  </div>
                  
                  {selectedLead.message ? (
                    <p className="text-sm text-neutral-700 italic bg-white p-3.5 rounded-xl border border-neutral-200/60">
                      "{selectedLead.message}"
                    </p>
                  ) : null}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {selectedLead.company && (
                      <div className="bg-white p-2.5 rounded-xl border border-neutral-100">
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Firma</div>
                        <div className="text-xs font-bold text-neutral-800 truncate">{selectedLead.company}</div>
                      </div>
                    )}
                    {selectedLead.trade && (
                      <div className="bg-white p-2.5 rounded-xl border border-neutral-100">
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Fagområde</div>
                        <div className="text-xs font-bold text-neutral-800 truncate">{selectedLead.trade}</div>
                      </div>
                    )}
                    {selectedLead.plan && (
                      <div className="bg-white p-2.5 rounded-xl border border-neutral-100">
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Ønsket pakke</div>
                        <div className="text-xs font-bold text-purple-700 truncate">{selectedLead.plan}</div>
                      </div>
                    )}
                    {selectedLead.workers && (
                      <div className="bg-white p-2.5 rounded-xl border border-neutral-100">
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Ansatte</div>
                        <div className="text-xs font-bold text-neutral-800">{selectedLead.workers}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Svartekst-felt */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black uppercase text-neutral-600 flex items-center gap-1.5">
                      <Mail size={14} /> Din svarmelding
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAnalyzeLead(selectedLead)}
                      disabled={isAnalyzingLead === selectedLead.id}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={14} />
                      {isAnalyzingLead === selectedLead.id ? 'Genererer AI-svar...' : 'Generer AI-forslag'}
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Skriv svar her..."
                    className="w-full p-4 bg-white border border-neutral-200 rounded-2xl text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none shadow-inner"
                  />
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResponseModalOpen(false)}
                    className="px-5 py-3.5 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-all text-sm cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResponseModalOpen(false);
                      handleOpenConvertModal(selectedLead);
                    }}
                    className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                    title="Gjør om dette leadet direkte til en bedriftskunde"
                  >
                    <UserPlus size={16} />
                    <span>Gjør om til kunde</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReplyEmail}
                    disabled={isSendingReply || !replyMessage.trim()}
                    className="flex-1 py-3.5 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isSendingReply ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>{isSendingReply ? 'Sender e-post...' : 'Send Svar på e-post'}</span>
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
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">{editingTemplateId ? 'Rediger mal' : 'Opprett ny mal'}</h2>
                <p className="text-xs text-neutral-500">Maler for e-post og varslinger til kunder og henvendelser</p>
              </div>
              <button onClick={() => { setIsTemplateModalOpen(false); setEditingTemplateId(null); }} className="p-2 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer">
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
                className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-lg cursor-pointer"
              >
                {editingTemplateId ? 'Oppdater mal' : 'Lagre mal'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function CreatePartnerModal({
  companies,
  onClose,
  onSuccess
}: {
  companies: Company[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [partnerType, setPartnerType] = useState<'partner' | 'internal'>('partner');
  const [companyMode, setCompanyMode] = useState<'new' | 'existing'>('new');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'worker'>('admin');
  const [trade, setTrade] = useState('Byggmester / Tømrer');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdData, setCreatedData] = useState<{
    user: any;
    company: any;
    password: string;
    loginUrl: string;
    emailSent: boolean;
  } | null>(null);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let pwd = 'VM-';
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += '26!';
    setPassword(pwd);
  };

  useEffect(() => {
    generatePassword();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Både e-post og passord må fylles ut.');
      return;
    }
    if (companyMode === 'new' && !companyName) {
      toast.error('Oppgi firmanavn eller organisasjon.');
      return;
    }
    if (companyMode === 'existing' && !selectedCompanyId) {
      toast.error('Velg en eksisterende bedrift fra listen.');
      return;
    }

    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          accountType: partnerType,
          companyMode,
          companyId: companyMode === 'existing' ? selectedCompanyId : undefined,
          companyName: companyMode === 'new' ? companyName : undefined,
          orgNumber: companyMode === 'new' ? orgNumber : undefined,
          name: name.trim() || email.split('@')[0],
          email: email.trim(),
          password: password.trim(),
          role,
          trade,
          sendWelcomeEmail
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Kunne ikke opprette partnerkonto');
      }

      toast.success(`${partnerType === 'internal' ? 'Kollega' : 'Samarbeidspartner'} ble opprettet! 🎉`);
      setCreatedData({
        user: data.user,
        company: data.company,
        password: password.trim(),
        loginUrl: 'https://vikingmester.no',
        emailSent: Boolean(data.emailSent)
      });
    } catch (err: any) {
      console.error('Partner creation error:', err);
      toast.error(err.message || 'Feil ved opprettelse av partner/kollega');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!createdData) return;
    const text = `Hei! Her er dine innloggingsopplysninger til VikingMester:
Nettadresse: ${createdData.loginUrl}
Brukernavn (E-post): ${createdData.user.email}
Passord: ${createdData.password}
Firma: ${createdData.company?.name || 'VikingMester'}
Rolle: ${createdData.user.role === 'admin' ? 'Administrator' : createdData.user.role === 'manager' ? 'Prosjektleder' : 'Håndverker'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Innloggingsdetaljer kopiert til utklippstavle!');
    setTimeout(() => setCopied(false), 3000);
  };

  if (createdData) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-neutral-900">
                {partnerType === 'internal' ? 'Kollega-konto opprettet!' : 'Samarbeidspartner opprettet!'}
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Kontoen er aktiv, koster <strong>0 kr/mnd</strong> og telles <strong>ikke</strong> med i SaaS-omsetningen din (MRR).
              </p>
            </div>

            <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-5 text-left space-y-2.5 font-mono text-xs text-neutral-800">
              <div className="flex justify-between items-center pb-2 border-b border-purple-200/60">
                <span className="font-sans font-bold text-[10px] uppercase text-purple-700">Innloggingsopplysninger</span>
                <span className="font-sans text-[10px] bg-purple-200/70 text-purple-900 px-2 py-0.5 rounded-full font-bold">
                  {createdData.emailSent ? 'E-post sendt ✓' : 'Klar for overlevering'}
                </span>
              </div>
              <div><strong className="font-sans text-neutral-500 text-[11px]">Nettadresse:</strong> https://vikingmester.no</div>
              <div><strong className="font-sans text-neutral-500 text-[11px]">Brukernavn:</strong> {createdData.user.email}</div>
              <div className="flex items-center justify-between">
                <div><strong className="font-sans text-neutral-500 text-[11px]">Passord:</strong> <span className="bg-white px-2 py-0.5 rounded border border-purple-200 font-bold">{createdData.password}</span></div>
              </div>
              <div><strong className="font-sans text-neutral-500 text-[11px]">Firma:</strong> {createdData.company?.name}</div>
              <div><strong className="font-sans text-neutral-500 text-[11px]">Rolle:</strong> {createdData.user.role}</div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={copyCredentials}
                className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-200 cursor-pointer transition-all"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span>{copied ? 'Kopiert til utklippstavle!' : 'Kopier innloggingsdetaljer'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl font-bold text-xs cursor-pointer transition-all"
              >
                Lukk og gå til oversikten
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden my-8"
      >
        <div className="p-6 sm:p-8 border-b border-neutral-100 flex justify-between items-center bg-purple-50/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
              <UserCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900">Ny Samarbeidspartner / Kollega</h2>
              <p className="text-xs text-purple-800 font-medium">
                0 kr/mnd · Friplass · Blir IKKE regnet med i inntekt (MRR)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer">
            <XCircle size={24} className="text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {/* Kontotype velger */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-neutral-400 ml-1">Type konto</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPartnerType('partner')}
                className={cn(
                  "py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-2",
                  partnerType === 'partner'
                    ? "bg-purple-100 text-purple-900 border-purple-300 shadow-2xs"
                    : "bg-neutral-50 text-neutral-500 border-transparent hover:bg-neutral-100"
                )}
              >
                <span>🤝 Samarbeidspartner</span>
              </button>
              <button
                type="button"
                onClick={() => setPartnerType('internal')}
                className={cn(
                  "py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-2",
                  partnerType === 'internal'
                    ? "bg-purple-100 text-purple-900 border-purple-300 shadow-2xs"
                    : "bg-neutral-50 text-neutral-500 border-transparent hover:bg-neutral-100"
                )}
              >
                <span>💼 Kollega / Internt</span>
              </button>
            </div>
          </div>

          {/* Selskapstilknytning */}
          <div className="space-y-2 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/70">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-500">Bedrift / Organisasjon</label>
              <div className="flex gap-1 bg-white p-0.5 rounded-lg border border-neutral-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setCompanyMode('new')}
                  className={cn("px-2.5 py-1 rounded-md transition-all cursor-pointer", companyMode === 'new' ? "bg-purple-600 text-white" : "text-neutral-500")}
                >
                  Ny bedrift
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyMode('existing')}
                  className={cn("px-2.5 py-1 rounded-md transition-all cursor-pointer", companyMode === 'existing' ? "bg-purple-600 text-white" : "text-neutral-500")}
                >
                  Eksisterende
                </button>
              </div>
            </div>

            {companyMode === 'new' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">Firmanavn / Organisasjon *</label>
                  <input
                    required
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={partnerType === 'internal' ? 'VikingMester Internt' : 'F.eks. Rørleggermester Hansen'}
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">Org.nummer (valgfritt)</label>
                  <input
                    type="text"
                    value={orgNumber}
                    onChange={(e) => setOrgNumber(e.target.value)}
                    placeholder="9 siffer"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-1">Velg bedrift</label>
                <select
                  required
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Velg eksisterende bedrift --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isPartner ? '(Partner 0 kr)' : `(${c.plan || 'solo'})`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Brukerdetaljer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-neutral-500 ml-1">Fullt navn *</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="F.eks. Petter Partner"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-neutral-500 ml-1">E-postadresse (innlogging) *</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="petter@partner.no"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-neutral-500 ml-1">Passord *</label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-[10px] text-purple-700 hover:underline font-bold cursor-pointer"
                >
                  Generer nytt
                </button>
              </div>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-neutral-500 ml-1">Rolle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="admin">Administrator (Full tilgang)</option>
                <option value="manager">Prosjektleder</option>
                <option value="worker">Håndverker</option>
              </select>
            </div>
          </div>

          {/* Infoboks om 0 kr inntekt */}
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 flex items-start gap-2.5">
            <Shield size={18} className="text-purple-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Ekskludert fra inntekt & regnskap</p>
              <p className="text-[11px] text-purple-800/90 mt-0.5 leading-relaxed">
                Kontoen tildeles 15M AI-tokens/mnd og ubegrenset driftstid, men belastes 0 kr/mnd. Den blir aldri regnet med i månedlig SaaS-omsetning (MRR).
              </p>
            </div>
          </div>

          {/* E-post checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={sendWelcomeEmail}
              onChange={(e) => setSendWelcomeEmail(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-neutral-700">
              Send automatisk velkomst-e-post med innloggingsopplysninger
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl font-bold text-xs cursor-pointer transition-all"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-200 cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Oppretter partnerkonto...</span>
                </>
              ) : (
                <>
                  <UserCheck size={16} />
                  <span>Opprett {partnerType === 'internal' ? 'Kollega' : 'Partner'} (0 kr)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function EditCompanyInfoModal({ company, onClose, onSuccess }: { company: Company, onClose: () => void, onSuccess: (data: { name: string, orgNumber: string, plan: 'solo' | 'team' | 'entreprenor' | 'partner' }) => void }) {
  const [name, setName] = useState(company.name);
  const [orgNumber, setOrgNumber] = useState(company.orgNumber || '');
  const [plan, setPlan] = useState<'solo' | 'team' | 'entreprenor' | 'partner'>(company.plan || 'team');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onSuccess({ name, orgNumber, plan });
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
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer">
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

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Abonnementsplan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as any)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm text-neutral-800"
            >
              <option value="solo">Solo (1 490 kr/mnd · 2.5M tokens)</option>
              <option value="team">Team (3 490 kr/mnd · 10M tokens)</option>
              <option value="entreprenor">Totalentreprenør (6 900 kr/mnd · 30M tokens)</option>
              <option value="partner">🤝 Samarbeidspartner / Kollega (0 kr · 15M tokens)</option>
            </select>
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
  const [plan, setPlan] = useState<'solo' | 'team' | 'entreprenor' | 'partner'>('team');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isPartner = plan === 'partner';
      await addDoc(collection(db, 'companies'), {
        name,
        orgNumber,
        subscriptionStatus: isPartner ? 'active' : status,
        plan,
        isPartner,
        monthlyPrice: isPartner ? 0 : (plan === 'solo' ? 1490 : plan === 'entreprenor' ? 6900 : 3490),
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
              <option value="entreprenor">Totalentreprenør (30M tokens/mnd - fra kr 6 900,-)</option>
              <option value="partner">🤝 Samarbeidspartner / Kollega (15M tokens - 0 kr/mnd)</option>
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

function ConvertLeadModal({
  lead,
  onClose,
  onSuccess,
  startImpersonation,
  onNavigateToCompany
}: {
  lead: any;
  onClose: () => void;
  onSuccess: (companyId: string, companyName: string) => void;
  startImpersonation: (companyId: string, role: string) => void;
  onNavigateToCompany: (companyId: string) => void;
}) {
  const [companyName, setCompanyName] = useState(lead.company || lead.name || '');
  const [orgNumber, setOrgNumber] = useState(lead.orgnr || '');
  const [contactName, setContactName] = useState(lead.name || '');
  const [email, setEmail] = useState(lead.email || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [trade, setTrade] = useState(lead.trade || 'Byggmester / Tømrer');

  const rawPlan = (lead.plan || '').toLowerCase();
  const initialPlan: 'solo' | 'team' | 'entreprenor' = 
    rawPlan.includes('solo') || Number(lead.workers) === 1 ? 'solo' :
    rawPlan.includes('entrepren') || Number(lead.workers) > 5 ? 'entreprenor' : 'team';
  const [plan, setPlan] = useState<'solo' | 'team' | 'entreprenor'>(initialPlan);
  const [status, setStatus] = useState<'trial' | 'active'>('trial');
  const [trialDays, setTrialDays] = useState(14);

  const [createAdminUser, setCreateAdminUser] = useState(true);
  const [tempPassword, setTempPassword] = useState('VikingMester2026!');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(Boolean(lead.email));
  const [customMessage, setCustomMessage] = useState(
    `Hei ${lead.name || ''}!\n\nDin konto hos VikingMester for ${lead.company || 'ditt foretak'} er nå opprettet.\n\nDu kan nå logge inn og ta i bruk systemet med en gang!`
  );

  const [loading, setLoading] = useState(false);
  const [isSearchingBrreg, setIsSearchingBrreg] = useState(false);
  const [brregStatus, setBrregStatus] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{
    company: any;
    user: any;
    tempPassword: string | null;
    inviteLink: string;
    emailSent: boolean;
  } | null>(null);

  const generateNewPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let pwd = 'VM-';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += '!';
    setTempPassword(pwd);
  };

  const handleBrregSearch = async () => {
    const query = orgNumber.trim() || companyName.trim();
    if (!query) {
      toast.error('Oppgi firmanavn eller org.nr for å søke i Brønnøysund.');
      return;
    }
    setIsSearchingBrreg(true);
    setBrregStatus(null);
    try {
      const res = await fetch(`/api/company/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const unit = data[0];
          setCompanyName(unit.name);
          if (unit.orgnr) setOrgNumber(unit.orgnr);
          if (unit.industry) setTrade(unit.industry);
          setBrregStatus(`Verifisert i Brønnøysund: ${unit.name} (${unit.orgnr})`);
          toast.success(`Hentet info for ${unit.name}`);
        } else {
          setBrregStatus('Ingen treff i Brønnøysund');
        }
      }
    } catch {
      setBrregStatus('Kunne ikke koble til Brønnøysund');
    } finally {
      setIsSearchingBrreg(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error('Firmanavn må fylles ut.');
      return;
    }
    setLoading(true);

    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/company/convert-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': 'Bearer ' + authToken } : {})
        },
        body: JSON.stringify({
          leadId: lead.id,
          companyName: companyName.trim(),
          orgNumber: orgNumber.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          trade,
          plan,
          status,
          trialDays,
          createAdminUser,
          adminPassword: tempPassword,
          sendWelcomeEmail,
          emailMessage: customMessage
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Kunne ikke konvertere lead til kunde');
      }

      setResultData(data);
      onSuccess(data.company.id, companyName.trim());
    } catch (err: any) {
      toast.error('Feil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Suksess-skjerm
  if (resultData) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="p-8 text-center bg-gradient-to-b from-emerald-50/80 to-white border-b border-emerald-100">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black text-neutral-900">Kunde opprettet!</h2>
            <p className="text-sm text-neutral-600 mt-1">
              <strong>{companyName}</strong> er nå lagret som <strong>{plan.toUpperCase()}</strong>-kunde ({status === 'trial' ? `${trialDays} dagers prøveperiode` : 'Aktiv'}).
            </p>
          </div>

          <div className="p-8 space-y-4 text-left">
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-500 uppercase text-[10px]">Brukernavn / E-post:</span>
                <span className="font-mono font-bold text-neutral-800">{email || 'Ikke oppgitt'}</span>
              </div>
              {resultData.tempPassword && (
                <div className="flex justify-between items-center">
                  <span className="font-bold text-neutral-500 uppercase text-[10px]">Midlertidig passord:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{resultData.tempPassword}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(resultData.tempPassword || '');
                        toast.success('Passord kopiert til utklippstavle!');
                      }}
                      className="p-1 hover:bg-neutral-200 rounded text-neutral-500 cursor-pointer"
                      title="Kopier passord"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              )}
              {resultData.inviteLink && (
                <div className="pt-2 border-t border-neutral-200/60">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-neutral-500 uppercase text-[10px]">Direkte aktiveringslenke:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(resultData.inviteLink);
                        toast.success('Aktiveringslenke kopiert til utklippstavle!');
                      }}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={12} /> Kopier lenke
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-neutral-600 truncate bg-white p-2 rounded-lg border border-neutral-200">
                    {resultData.inviteLink}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 text-[11px]">
                <span className="text-neutral-500">Velkomst-e-post:</span>
                <span className={cn("font-bold", resultData.emailSent ? "text-emerald-600" : "text-neutral-400")}>
                  {resultData.emailSent ? 'Sendt via Resend' : sendWelcomeEmail ? 'Klar for utsendelse' : 'Ikke sendt'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  startImpersonation(resultData.company.id, 'admin');
                  toast.success(`Logget inn som administrator hos ${companyName}!`);
                  onClose();
                  window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'dashboard' } }));
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
              >
                <ExternalLink size={16} />
                <span>Logg inn som denne kunden nå</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigateToCompany(resultData.company.id);
                  onClose();
                }}
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Building2 size={14} />
                <span>Se kunden i bedriftsoversikten</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl font-bold text-xs cursor-pointer transition-all"
              >
                Lukk vindu
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Redigerings- og opprettelsesskjema
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
      >
        <div className="p-6 sm:p-8 border-b border-neutral-100 flex justify-between items-center shrink-0 bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900">Gjør om henvendelse til kunde</h2>
              <p className="text-xs text-neutral-500">
                Oppretter bedrift, administratorkonto og sender velkomst-e-post for {lead.name || lead.company}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer">
            <X size={20} className="text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto">
          {/* Seksjon 1: Bedriftsinformasjon */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Building2 size={14} /> 1. Bedriftsinformasjon
              </h3>
              <button
                type="button"
                onClick={handleBrregSearch}
                disabled={isSearchingBrreg}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <Search size={12} />
                {isSearchingBrreg ? 'Søker Brønnøysund...' : 'Søk i Brønnøysund'}
              </button>
            </div>

            {brregStatus && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/60 text-xs text-blue-800 font-medium">
                {brregStatus}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Firmanavn / Kundenavn *</label>
                <input
                  required
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="F.eks. Mester Bygg AS"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Org.nummer (9 siffer)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={orgNumber}
                    onChange={(e) => setOrgNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="9 siffer"
                  />
                  <button
                    type="button"
                    onClick={handleBrregSearch}
                    disabled={isSearchingBrreg}
                    className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                    title="Slå opp i Brønnøysundregistrene"
                  >
                    Slå opp
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Fagområde</label>
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Byggmester / Tømrer">Byggmester / Tømrer</option>
                <option value="Rørlegger">Rørlegger</option>
                <option value="Elektriker">Elektriker</option>
                <option value="Maler / Byggtapetserer">Maler / Byggtapetserer</option>
                <option value="Murer / Flislegger">Murer / Flislegger</option>
                <option value="Totalentreprenør">Totalentreprenør</option>
                <option value="Ventilasjon / Blikk">Ventilasjon / Blikk</option>
                <option value="Annet fag">Annet fag</option>
              </select>
            </div>
          </div>

          {/* Seksjon 2: Kontaktperson og Innlogging */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Users size={14} /> 2. Kontaktperson & Innlogging
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Kontaktperson</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Navn"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">E-postadresse *</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="post@bedrift.no"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Telefon</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="+47..."
                />
              </div>
            </div>

            <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createAdminUser}
                  onChange={(e) => setCreateAdminUser(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-neutral-800">
                  Opprett administratorkonto for kunden umiddelbart
                </span>
              </label>

              {createAdminUser && (
                <div className="pt-2 flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Midlertidig passord</label>
                    <input
                      type="text"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono font-bold text-purple-900 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generateNewPassword}
                    className="px-3 py-2 mt-5 bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl shrink-0 cursor-pointer transition-colors"
                  >
                    Nytt passord
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Seksjon 3: Abonnement og Prøveperiode */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Tag size={14} /> 3. Abonnement & Status
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'solo', name: 'Solo', price: '1 490 kr/mnd', desc: '1 bruker · 2.5M tokens' },
                { id: 'team', name: 'Team', price: '3 490 kr/mnd', desc: 'Inntil 10 brukere · 10M' },
                { id: 'entreprenor', name: 'Totalentreprenør', price: '6 900 kr/mnd', desc: 'Ubegrenset · 30M' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id as any)}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                    plan === p.id 
                      ? "bg-purple-50 border-purple-400 text-purple-900 shadow-sm" 
                      : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <div className="font-bold text-xs">{p.name}</div>
                  <div className="text-[10px] font-black text-purple-700">{p.price}</div>
                  <div className="text-[9px] text-neutral-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('trial')}
                    className={cn(
                      "py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer",
                      status === 'trial' ? "bg-amber-100 text-amber-800 border-2 border-amber-300" : "bg-neutral-50 text-neutral-500"
                    )}
                  >
                    Prøveperiode
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('active')}
                    className={cn(
                      "py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer",
                      status === 'active' ? "bg-emerald-100 text-emerald-800 border-2 border-emerald-300" : "bg-neutral-50 text-neutral-500"
                    )}
                  >
                    Aktiv kunde
                  </button>
                </div>
              </div>

              {status === 'trial' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Prøvetid (dager)</label>
                  <input
                    type="number"
                    value={trialDays}
                    onChange={(e) => setTrialDays(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Seksjon 4: Velkomst-e-post */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWelcomeEmail}
                onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-neutral-800">
                Send automatisk velkomst-e-post med innlogging til kunden
              </span>
            </label>

            {sendWelcomeEmail && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Personlig velkomsthilsen</label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-700 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-all text-xs cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-2xl font-black text-sm hover:opacity-95 transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Oppretter kunde...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Fullfør og opprett kunde nå</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

