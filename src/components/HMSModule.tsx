import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Users, ClipboardCheck, AlertTriangle, FileText, Plus, Search, 
  Filter, ChevronRight, Download, CreditCard, Calendar, CheckCircle2, Loader2, 
  X, Trash2, Phone, Mail, Check, ExternalLink, Printer 
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';
import { CrewMember, SafetyInspection, Project, Deviation } from '../types';
import { db, auth, collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, Timestamp, handleFirestoreError, OperationType, getDoc, doc, where } from '../services/firebase';
import { hmsAiService } from '../services/hmsAiService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import AiTextAssistant from './AiTextAssistant';
import HMSHandbook from './HMSHandbook';

interface HMSModuleProps {
  projects: Project[];
}

const HMSModule: React.FC<HMSModuleProps> = ({ projects }) => {
  const { t } = useTranslation();
  const { user, company, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'crew' | 'inspections' | 'manual'>('crew');
  const [searchQuery, setSearchQuery] = useState('');
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [inspections, setInspections] = useState<SafetyInspection[]>([]);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [checklists, setChecklists] = useState<{ id: string; title: string; category: string; url: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>(
    'Ingen HMS-data registrert ennå. Legg til mannskap og gjennomfør vernerunder for automatisk AI-sikkerhetsanalyse.'
  );
  
  // New Item Modals
  const [isNewPersonOpen, setIsNewPersonOpen] = useState(false);
  const [isNewInspectionOpen, setIsNewInspectionOpen] = useState(false);
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<CrewMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New Document Form
  const [newDoc, setNewDoc] = useState({
    title: '',
    category: 'general',
    version: '1.0',
    content: ''
  });

  // New Person Form
  const [newPerson, setNewPerson] = useState({
    name: '',
    role: '',
    phone: '',
    email: '',
    hmsCardNumber: '',
    hmsCardExpiry: '',
    employer: '',
    status: 'on_site' as 'on_site' | 'off_site',
    projectId: ''
  });

  // New Inspection Form
  const [newInspection, setNewInspection] = useState({
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    participants: '',
    findings: [] as { description: string; severity: 'low' | 'medium' | 'high'; action: string; status: 'open' | 'closed' }[],
    status: 'completed' as 'draft' | 'completed'
  });

  const [newFinding, setNewFinding] = useState({
    description: '',
    severity: 'low' as 'low' | 'medium' | 'high',
    action: '',
    status: 'open' as 'open' | 'closed'
  });

  const addFinding = () => {
    if (!newFinding.description) return;
    setNewInspection({
      ...newInspection,
      findings: [...newInspection.findings, newFinding]
    });
    setNewFinding({
      description: '',
      severity: 'low',
      action: '',
      status: 'open'
    });
  };

  const removeFinding = (index: number) => {
    setNewInspection({
      ...newInspection,
      findings: newInspection.findings.filter((_, i) => i !== index)
    });
  };

  useEffect(() => {
    if (!company) return;

    setIsLoading(true);
    
    const crewQuery = query(
      collection(db, 'crew'), 
      where('company', '==', company),
      orderBy('name')
    );
    const unsubscribeCrew = onSnapshot(crewQuery, (snapshot) => {
      const crewData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CrewMember[];
      setCrew(crewData);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'crew');
      setIsLoading(false);
    });

    const inspectionQuery = query(
      collection(db, 'safety_inspections'), 
      where('company', '==', company),
      orderBy('date', 'desc')
    );
    const unsubscribeInspections = onSnapshot(inspectionQuery, (snapshot) => {
      const inspectionData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SafetyInspection[];
      setInspections(inspectionData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'safety_inspections');
    });

    const checklistQuery = query(collection(db, 'checklists'), orderBy('title'));
    const unsubscribeChecklists = onSnapshot(checklistQuery, (snapshot) => {
      const checklistData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setChecklists(checklistData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'checklists');
    });

    const deviationQuery = query(
      collection(db, 'deviations'), 
      where('company', '==', company),
      orderBy('timestamp', 'desc')
    );
    const unsubscribeDeviations = onSnapshot(deviationQuery, (snapshot) => {
      const deviationData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Deviation[];
      setDeviations(deviationData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deviations');
    });

    return () => {
      unsubscribeCrew();
      unsubscribeInspections();
      unsubscribeChecklists();
      unsubscribeDeviations();
    };
  }, [company]);

  useEffect(() => {
    if (crew.length > 0 || inspections.length > 0 || deviations.length > 0) {
      generateAIInsight();
    }
    if (crew.length > 0) {
      checkHmsExpiries();
    }
  }, [crew, inspections, deviations]);

  const checkHmsExpiries = async () => {
    if (!auth.currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.data();
      if (userData?.notifications?.hmsCardExpiry === false) {
        return;
      }
    } catch (error) {
      console.error("Error fetching user notification settings:", error);
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    for (const person of crew) {
      if (!person.hmsCardExpiry) continue;

      const expiryDate = new Date(person.hmsCardExpiry);
      const isExpired = expiryDate < today;
      const isNearingExpiry = expiryDate < thirtyDaysFromNow && !isExpired;

      if (isExpired || isNearingExpiry) {
        await notificationService.notifyHMSCardExpiry(
          auth.currentUser.uid,
          person.name,
          person.hmsCardExpiry,
          isExpired
        );
      }
    }
  };

  const generateAIInsight = async () => {
    if (crew.length === 0 && inspections.length === 0 && deviations.length === 0) {
      setAiInsight('Ingen HMS-data registrert ennå. Registrer mannskap eller vernerunder for å starte automatisk AI-sikkerhetsanalyse.');
      return;
    }
    setIsAnalyzing(true);
    try {
      const insight = await hmsAiService.analyzeRisk(crew, inspections, deviations);
      setAiInsight(insight);
    } catch (error) {
      console.error("Error generating AI insight:", error);
      setAiInsight("Kunne ikke generere HMS-analyse for øyeblikket.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteCrew = async (personId: string, personName: string) => {
    if (!window.confirm(`Er du sikker på at du vil slette ${personName} fra mannskapslisten?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'crew', personId));
      toast.success(`${personName} er slettet`);
      if (selectedPerson?.id === personId) setSelectedPerson(null);
    } catch (error) {
      console.error("Error deleting crew member:", error);
      toast.error("Kunne ikke slette person");
    }
  };

  const handleToggleCrewStatus = async (person: CrewMember) => {
    const newStatus = person.status === 'on_site' ? 'off_site' : 'on_site';
    try {
      await updateDoc(doc(db, 'crew', person.id), { status: newStatus });
      toast.success(`${person.name} markert som ${newStatus === 'on_site' ? 'på plassen' : 'borte'}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Kunne ikke oppdatere status");
    }
  };

  const handleDeleteInspection = async (inspectionId: string) => {
    if (!window.confirm("Er du sikker på at du vil slette denne vernerunden?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'safety_inspections', inspectionId));
      toast.success("Vernerunde slettet");
    } catch (error) {
      console.error("Error deleting inspection:", error);
      toast.error("Kunne ikke slette vernerunde");
    }
  };

  const handleToggleFindingStatus = async (inspection: SafetyInspection, findingIndex: number) => {
    const updatedFindings = [...(inspection.findings || [])];
    const currentStatus = updatedFindings[findingIndex]?.status;
    const nextStatus = currentStatus === 'closed' ? 'open' : 'closed';
    updatedFindings[findingIndex] = {
      ...updatedFindings[findingIndex],
      status: nextStatus
    };
    try {
      await updateDoc(doc(db, 'safety_inspections', inspection.id), {
        findings: updatedFindings
      });
      toast.success(nextStatus === 'closed' ? "Avvik løst og lukket" : "Avvik gjenåpnet");
    } catch (error) {
      console.error("Error toggling finding status:", error);
      toast.error("Kunne ikke oppdatere avvik");
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title.trim() || !newDoc.content.trim()) {
      toast.error("Vennligst fyll ut tittel og innhold.");
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'hms_documents'), {
        ...newDoc,
        companyId: company,
        company,
        createdAt: Timestamp.now(),
        updatedAt: new Date().toISOString()
      });
      setIsNewDocOpen(false);
      setNewDoc({
        title: '',
        category: 'general',
        version: '1.0',
        content: ''
      });
      toast.success("Nytt HMS-dokument publisert!");
    } catch (error) {
      console.error("Error creating HMS document:", error);
      toast.error("Kunne ikke lagre dokumentet");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'crew'), {
        ...newPerson,
        company,
        createdAt: Timestamp.now()
      });
      setIsNewPersonOpen(false);
      setNewPerson({
        name: '',
        role: '',
        phone: '',
        email: '',
        hmsCardNumber: '',
        hmsCardExpiry: '',
        employer: '',
        status: 'on_site',
        projectId: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'crew');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'safety_inspections'), {
        ...newInspection,
        company,
        participants: newInspection.participants.split(',').map(p => p.trim()),
        authorId: auth.currentUser?.uid,
        createdAt: Timestamp.now()
      });
      setIsNewInspectionOpen(false);
      setNewInspection({
        projectId: '',
        date: new Date().toISOString().split('T')[0],
        participants: '',
        findings: [],
        status: 'completed'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'safety_inspections');
    } finally {
      setIsSaving(false);
    }
  };

  // ⚡ Bolt: Memoize filteredCrew to prevent expensive O(N) recalculations on every render
  const filteredCrew = useMemo(() => {
    return crew.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employer.toLowerCase().includes(searchQuery.toLowerCase());

      if (searchQuery.toLowerCase() === 'utløpt') {
        return p.hmsCardExpiry && new Date(p.hmsCardExpiry) < new Date();
      }

      return matchesSearch;
    });
  }, [crew, searchQuery]);

  // ⚡ Bolt: Memoize expiringCards to avoid duplicated inline filtering
  const expiringCards = useMemo(() => {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return crew.filter(p => p.hmsCardExpiry && new Date(p.hmsCardExpiry) < thirtyDaysFromNow);
  }, [crew]);

  return (
    <div className="space-y-8">
      {/* Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-neutral-200 shadow-sm">
        <div className="flex bg-neutral-100 p-1 rounded-xl sm:rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
          {[
            { id: 'crew', label: t('crew_tab', 'Mannskap') },
            { id: 'inspections', label: t('safety_inspections_tab', 'Vernerunder') },
            { id: 'manual', label: t('hms_handbook_tab', 'HMS-Håndbok') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button 
          onClick={() => activeTab === 'crew' ? setIsNewPersonOpen(true) : setIsNewInspectionOpen(true)}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 w-full sm:w-auto"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" /> {activeTab === 'crew' ? t('add_person', 'Legg til person') : t('new_inspection', 'Ny Vernerunde')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'crew' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input 
                    type="text" 
                    placeholder={t('search_crew', 'Søk i mannskap...')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-neutral-200 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setSearchQuery('')}
                    className={cn(
                      "flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all whitespace-nowrap",
                      searchQuery === '' ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
                    )}
                  >
                    Alle
                  </button>
                  <button 
                    onClick={() => setSearchQuery('utløpt')}
                    className={cn(
                      "flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all whitespace-nowrap",
                      searchQuery === 'utløpt' ? "bg-rose-100 text-rose-700" : "text-neutral-400 hover:text-neutral-600"
                    )}
                  >
                    Utløpt HMS-kort
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-neutral-400">
                  <Loader2 className="animate-spin mb-4 sm:w-8 sm:h-8" size={24} />
                  <p className="text-xs sm:text-sm font-medium">{t('loading_crew', 'Laster mannskapsliste...')}</p>
                </div>
              ) : filteredCrew.length > 0 ? (
                filteredCrew.map((person) => (
                  <div key={person.id} className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-200 hover:border-emerald-200 transition-all">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xs sm:text-sm flex items-center justify-center shrink-0 border border-emerald-200">
                          {person.name ? person.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'HM'}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-neutral-900 text-sm sm:text-base truncate">{person.name}</h3>
                          <div className="text-[10px] sm:text-xs text-neutral-500 truncate">{person.role} • {person.employer}</div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleToggleCrewStatus(person)}
                        title="Klikk for å endre tilstedeværelse på byggeplass"
                        className={`px-2.5 sm:px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest shrink-0 transition-all cursor-pointer ${
                          person.status === 'on_site' ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500 border border-neutral-200'
                        }`}
                      >
                        {person.status === 'on_site' ? `✓ ${t('on_site', 'På plassen')}` : `• ${t('off_site', 'Borte')}`}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-neutral-50">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400 shrink-0">
                          <CreditCard size={14} className="sm:w-4 sm:h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[8px] sm:text-[10px] text-neutral-400 font-bold uppercase tracking-widest truncate">HMS-Kort</div>
                          <div className={`text-[10px] sm:text-xs font-bold truncate ${
                            person.hmsCardExpiry && new Date(person.hmsCardExpiry) < new Date() ? 'text-rose-600' : 'text-neutral-700'
                          }`}>
                            {person.hmsCardNumber} ({person.hmsCardExpiry || 'N/A'})
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <button 
                          type="button"
                          onClick={() => setSelectedPerson(person)}
                          title="Se detaljer og kontaktinfo"
                          className="px-2.5 py-1.5 text-neutral-600 hover:text-emerald-700 bg-neutral-50 hover:bg-emerald-50 border border-neutral-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-bold"
                        >
                          <FileText size={15} />
                          <span>Detaljer</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteCrew(person.id, person.name)}
                          title="Slett fra mannskapslisten"
                          className="p-1.5 sm:p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 sm:py-20 bg-white rounded-2xl sm:rounded-3xl border border-dashed border-neutral-200">
                  <Users className="mx-auto text-neutral-300 mb-4 sm:w-12 sm:h-12" size={32} />
                  <p className="text-xs sm:text-sm text-neutral-500 font-medium">{t('no_people_found', 'Ingen personer funnet')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inspections' && (
            <div className="space-y-4">
              {inspections.length > 0 ? (
                inspections.map((inspection) => (
                  <div key={inspection.id} className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-200 hover:border-emerald-200 transition-all">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <ClipboardCheck size={20} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-neutral-900 text-sm sm:text-base truncate">{t('safety_inspections_tab', 'Vernerunde')}</h3>
                          <div className="text-[10px] sm:text-xs text-neutral-400 mt-0.5 sm:mt-1 truncate">{inspection.date} • {inspection.participants?.length || 0} {t('participants', 'deltakere')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest shrink-0 ${
                          inspection.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {inspection.status === 'completed' ? t('completed', 'Fullført') : t('draft', 'Utkast')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteInspection(inspection.id)}
                          title="Slett vernerunde"
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-neutral-50">
                      {inspection.findings && inspection.findings.length > 0 ? (
                        inspection.findings.map((finding, i) => (
                          <div key={i} className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-neutral-50 rounded-xl">
                            <div className={cn(
                              "mt-0.5 shrink-0",
                              finding.severity === 'high' ? "text-rose-500" : "text-amber-500"
                            )}>
                              <AlertTriangle size={12} className="sm:w-3.5 sm:h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] sm:text-xs font-bold text-neutral-900 line-clamp-2">{finding.description}</div>
                              <div className="text-[8px] sm:text-[10px] text-neutral-500 mt-0.5 sm:mt-1 line-clamp-1">{t('measure', 'Tiltak')}: {finding.action}</div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleToggleFindingStatus(inspection, i)}
                              title={finding.status === 'closed' ? "Klikk for å gjenåpne avvik" : "Klikk for å markere som løst"}
                              className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-all cursor-pointer shrink-0 ${
                                finding.status === 'closed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              }`}
                            >
                              {finding.status === 'closed' ? `✓ ${t('solved', 'Løst')}` : `• ${t('open', 'Åpen (klikk for å lukke)')}`}
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[9px] sm:text-[10px] text-neutral-400 italic">{t('no_deviations_round', 'Ingen avvik funnet på denne runden.')}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 sm:py-20 bg-white rounded-2xl sm:rounded-3xl border border-dashed border-neutral-200">
                  <ClipboardCheck className="mx-auto text-neutral-300 mb-4 sm:w-12 sm:h-12" size={32} />
                  <p className="text-xs sm:text-sm text-neutral-500 font-medium">{t('no_inspections_reg', 'Ingen vernerunder registrert')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-neutral-900">{t('hms_manual_title', 'HMS-håndbok')}</h2>
                  <p className="text-neutral-500 text-xs sm:text-sm">{t('hms_manual_sub', 'Selskapets HMS-dokumentasjon og rutiner')}</p>
                </div>
                {role === 'admin' && (
                  <button 
                    type="button"
                    onClick={() => setIsNewDocOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-neutral-800 transition-all w-full sm:w-auto cursor-pointer"
                  >
                    <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                    {t('new_document', 'Nytt dokument')}
                  </button>
                )}
              </div>

              <HMSHandbook />
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* AI Safety Insight */}
          <div className="bg-emerald-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 text-white shadow-xl shadow-emerald-100 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-800 flex items-center justify-center">
                {isAnalyzing ? (
                  <Loader2 className="animate-spin text-emerald-400 sm:w-4 sm:h-4" size={14} />
                ) : (
                  <ShieldCheck size={14} className="text-emerald-400 sm:w-4 sm:h-4" />
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{t('ai_hms_analyst', 'AI HMS-Analytiker')}</span>
            </div>
            <div className="relative z-10">
              {isAnalyzing ? (
                <div className="space-y-2">
                  <div className="h-1.5 sm:h-2 bg-emerald-800 rounded animate-pulse w-full" />
                  <div className="h-1.5 sm:h-2 bg-emerald-800 rounded animate-pulse w-3/4" />
                  <div className="h-1.5 sm:h-2 bg-emerald-800 rounded animate-pulse w-1/2" />
                </div>
              ) : (
                <p className="text-[10px] sm:text-xs text-emerald-100 leading-relaxed opacity-80">
                  {aiInsight}
                </p>
              )}
            </div>
            <button 
              onClick={generateAIInsight}
              className="mt-3 sm:mt-4 text-[9px] sm:text-[10px] font-bold text-emerald-400 hover:text-white transition-colors flex items-center gap-1"
            >
              {t('update_analysis', 'Oppdater analyse')}
            </button>
          </div>

          {/* HMS-Kort Alert */}
          <div className="bg-rose-50 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 border border-rose-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle size={16} className="sm:w-5 sm:h-5" />
              </div>
              <h3 className="font-bold text-rose-900 text-sm sm:text-base">{t('hms_card_alerts', 'HMS-Kort Varsler')}</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {expiringCards.map((person) => (
                <div key={person.id} className="p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-rose-100 shadow-sm">
                  <div className="text-[10px] font-bold text-rose-600 mb-0.5 sm:mb-1">{t('expiring_soon', 'Utløper snart')}</div>
                  <div className="text-xs sm:text-sm font-bold truncate">{person.name}</div>
                  <p className="text-[9px] sm:text-[10px] text-neutral-400 mt-1">Kortet utløper {person.hmsCardExpiry}. Bestill nytt nå.</p>
                </div>
              ))}
              {expiringCards.length === 0 && (
                <p className="text-[9px] sm:text-[10px] text-neutral-400 italic text-center">{t('no_expiring_cards', 'Ingen utløpende kort de neste 30 dagene.')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Person Modal */}
      <AnimatePresence>
        {isNewPersonOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold">{t('add_crew_title', 'Legg til i mannskapsliste')}</h3>
                <button onClick={() => setIsNewPersonOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddPerson} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Navn</label>
                  <input 
                    required
                    type="text" 
                    value={newPerson.name}
                    onChange={(e) => setNewPerson({...newPerson, name: e.target.value})}
                    className="w-full p-2.5 sm:p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Rolle</label>
                    <input 
                      required
                      type="text" 
                      value={newPerson.role}
                      onChange={(e) => setNewPerson({...newPerson, role: e.target.value})}
                      className="w-full p-2.5 sm:p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Arbeidsgiver</label>
                    <input 
                      required
                      type="text" 
                      value={newPerson.employer}
                      onChange={(e) => setNewPerson({...newPerson, employer: e.target.value})}
                      className="w-full p-2.5 sm:p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">HMS-Kortnr</label>
                    <input 
                      required
                      type="text" 
                      value={newPerson.hmsCardNumber}
                      onChange={(e) => setNewPerson({...newPerson, hmsCardNumber: e.target.value})}
                      className="w-full p-2.5 sm:p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Utløpsdato</label>
                    <input 
                      required
                      type="date" 
                      value={newPerson.hmsCardExpiry}
                      onChange={(e) => setNewPerson({...newPerson, hmsCardExpiry: e.target.value})}
                      className="w-full p-2.5 sm:p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Prosjekt</label>
                  <select 
                    value={newPerson.projectId}
                    onChange={(e) => setNewPerson({...newPerson, projectId: e.target.value})}
                    className="w-full p-2.5 sm:p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs sm:text-sm"
                  >
                    <option value="">Velg prosjekt (valgfritt)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 text-sm"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Plus size={18} />}
                  {t('save_person', 'Lagre person')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Inspection Modal */}
      <AnimatePresence>
        {isNewInspectionOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold">Ny Vernerunde</h3>
                <button onClick={() => setIsNewInspectionOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddInspection} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Prosjekt</label>
                  <select 
                    required
                    value={newInspection.projectId}
                    onChange={(e) => setNewInspection({...newInspection, projectId: e.target.value})}
                    className="w-full p-2.5 sm:p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs sm:text-sm"
                  >
                    <option value="">Velg prosjekt</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Dato</label>
                  <input 
                    required
                    type="date" 
                    value={newInspection.date}
                    onChange={(e) => setNewInspection({...newInspection, date: e.target.value})}
                    className="w-full p-2.5 sm:p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Deltakere</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ken Mester, Jan Rørlegger..."
                    value={newInspection.participants}
                    onChange={(e) => setNewInspection({...newInspection, participants: e.target.value})}
                    className="w-full p-2.5 sm:p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs sm:text-sm"
                  />
                </div>

                <div className="pt-3 sm:pt-4 border-t border-neutral-100">
                  <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 sm:mb-3">Avvik & Funn</label>
                  
                  {newInspection.findings.length > 0 && (
                    <div className="space-y-2 mb-3 sm:mb-4">
                      {newInspection.findings.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 sm:p-3 bg-neutral-50 rounded-xl">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              f.severity === 'high' ? "bg-rose-500" : f.severity === 'medium' ? "bg-amber-500" : "bg-blue-500"
                            )} />
                            <span className="text-[10px] sm:text-xs font-medium truncate">{f.description}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeFinding(i)}
                            className="text-neutral-400 hover:text-rose-500 shrink-0 ml-2"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-neutral-50 rounded-xl sm:rounded-2xl border border-neutral-100">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Beskrivelse</label>
                      <AiTextAssistant 
                        currentText={newFinding.description} 
                        onApply={(text) => setNewFinding({...newFinding, description: text})}
                        placeholder="Beskriv avviket..."
                      />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Beskrivelse av avvik..."
                      value={newFinding.description}
                      onChange={(e) => setNewFinding({...newFinding, description: e.target.value})}
                      className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-[10px] sm:text-xs"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select 
                        value={newFinding.severity}
                        onChange={(e) => setNewFinding({...newFinding, severity: e.target.value as any})}
                        className="p-2 bg-white border border-neutral-200 rounded-lg text-[10px] sm:text-xs"
                      >
                        <option value="low">{t('severity_low', 'Lav')}</option>
                        <option value="medium">{t('severity_medium', 'Middels')}</option>
                        <option value="high">{t('severity_high', 'Høy')}</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Tiltak..."
                        value={newFinding.action}
                        onChange={(e) => setNewFinding({...newFinding, action: e.target.value})}
                        className="p-2 bg-white border border-neutral-200 rounded-lg text-[10px] sm:text-xs"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={addFinding}
                      className="w-full py-2 bg-neutral-200 text-neutral-700 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-neutral-300 transition-all"
                    >
                      Legg til funn
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 text-sm"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <ClipboardCheck size={18} />}
                  {t('finish_inspection', 'Fullfør Vernerunde')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Person Details Modal */}
      <AnimatePresence>
        {selectedPerson && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-base flex items-center justify-center border border-emerald-200">
                    {selectedPerson.name ? selectedPerson.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'HM'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">{selectedPerson.name}</h3>
                    <p className="text-xs text-neutral-500">{selectedPerson.role} • {selectedPerson.employer}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedPerson(null)} className="p-2 hover:bg-neutral-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-neutral-50 rounded-2xl space-y-2 border border-neutral-100">
                  <div className="flex justify-between items-center py-1 border-b border-neutral-200/60">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">Tilstedeværelse</span>
                    <button
                      type="button"
                      onClick={() => handleToggleCrewStatus(selectedPerson)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                        selectedPerson.status === 'on_site' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {selectedPerson.status === 'on_site' ? '✓ På plassen' : '• Borte'} (Klikk for å endre)
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-neutral-200/60">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">HMS-Kortnummer</span>
                    <span className="font-mono font-bold text-neutral-800">{selectedPerson.hmsCardNumber || 'Ikke registrert'}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-neutral-200/60">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">Utløpsdato</span>
                    <span className={`font-bold ${
                      selectedPerson.hmsCardExpiry && new Date(selectedPerson.hmsCardExpiry) < new Date() ? 'text-rose-600' : 'text-neutral-800'
                    }`}>
                      {selectedPerson.hmsCardExpiry || 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">Tilknyttet prosjekt</span>
                    <span className="font-medium text-neutral-800">
                      {projects.find(p => p.id === selectedPerson.projectId)?.name || 'Felles / Ikke spesifisert'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {selectedPerson.phone && (
                    <a 
                      href={`tel:${selectedPerson.phone}`}
                      className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-center font-bold text-neutral-700 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Phone size={14} /> Ring ({selectedPerson.phone})
                    </a>
                  )}
                  {selectedPerson.email && (
                    <a 
                      href={`mailto:${selectedPerson.email}`}
                      className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-center font-bold text-neutral-700 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Mail size={14} /> Send e-post
                    </a>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteCrew(selectedPerson.id, selectedPerson.name)}
                    className="flex items-center gap-1.5 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-all cursor-pointer"
                  >
                    <Trash2 size={15} /> Slett person
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPerson(null)}
                    className="px-5 py-2 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-all cursor-pointer"
                  >
                    Lukk
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New HMS Document Modal */}
      <AnimatePresence>
        {isNewDocOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">Opprett HMS-dokument</h3>
                  <p className="text-xs text-neutral-500">Legg til selskapstilpasset HMS-prosedyre eller instruks</p>
                </div>
                <button onClick={() => setIsNewDocOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddDocument} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">Dokumenttittel</label>
                  <input
                    required
                    type="text"
                    placeholder="f.eks. Rutiner ved arbeid i sjakter"
                    value={newDoc.title}
                    onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">Kategori</label>
                    <select
                      value={newDoc.category}
                      onChange={(e) => setNewDoc({...newDoc, category: e.target.value})}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium"
                    >
                      <option value="general">Generelt</option>
                      <option value="safety">Sikkerhet</option>
                      <option value="first_aid">Førstehjelp</option>
                      <option value="fire">Brann</option>
                      <option value="equipment">Utstyr</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">Versjon</label>
                    <input
                      type="text"
                      value={newDoc.version}
                      onChange={(e) => setNewDoc({...newDoc, version: e.target.value})}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">Innhold (Markdown støttes)</label>
                    <AiTextAssistant
                      currentText={newDoc.content}
                      onApply={(text) => setNewDoc({...newDoc, content: text})}
                      placeholder="Beskriv HMS-rutinen..."
                    />
                  </div>
                  <textarea
                    required
                    rows={8}
                    placeholder="# Hensikt&#10;Beskriv hensikten med instruksen...&#10;&#10;### Krav og tiltak&#10;- Punkt 1...&#10;- Punkt 2..."
                    value={newDoc.content}
                    onChange={(e) => setNewDoc({...newDoc, content: e.target.value})}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewDocOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                    Publiser dokument
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HMSModule;
