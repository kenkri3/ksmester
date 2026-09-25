import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  BookOpen, 
  MessageSquare, 
  User, 
  TrendingUp,
  RefreshCw,
  Award,
  FileText,
  Printer,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

interface ApprenticeGoal {
  goalId: string;
  title: string;
  category: string;
  description: string;
  requiredHours: number;
  hoursLogged: number;
  progress: number;
  status: 'not_started' | 'in_progress' | 'ready_for_review' | 'completed';
  evidenceNotes: string[];
  approvedBy?: string;
  approvedAt?: string;
}

interface ApprenticeProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  trade: string;
  tradeName: string;
  tradeYear: number;
  startDate: string;
  contractEndDate: string;
  mentorName: string;
  totalHoursWorked: number;
  goals: ApprenticeGoal[];
  aiRecommendation: string;
}

interface ApprenticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialApprenticeId?: string;
  inline?: boolean;
}

const ApprenticeModal: React.FC<ApprenticeModalProps> = ({ isOpen, onClose, initialApprenticeId, inline = false }) => {
  const [selectedApprenticeId, setSelectedApprenticeId] = useState<string | null>(initialApprenticeId || null);
  const [apprentices, setApprentices] = useState<ApprenticeProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'goals' | 'report'>('goals');
  const [generatedReport, setGeneratedReport] = useState<any | null>(null);
  const [feedbackInput, setFeedbackInput] = useState<{ [goalId: string]: string }>({});

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newApprenticeName, setNewApprenticeName] = useState('');
  const [newApprenticeEmail, setNewApprenticeEmail] = useState('');
  const [newApprenticePhone, setNewApprenticePhone] = useState('');
  const [newApprenticeTrade, setNewApprenticeTrade] = useState('carpenter');
  const [newApprenticeYear, setNewApprenticeYear] = useState<number>(1);
  const [newApprenticeMentor, setNewApprenticeMentor] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const tradeLabels: Record<string, string> = {
    carpenter: 'Tømrerfaget',
    plumber: 'Rørleggerfaget',
    electrician: 'Elektrikerfaget',
    mason: 'Murerfaget',
    painter: 'Malerfaget'
  };

  const loadApprentices = async () => {
    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null;
      const res = await fetch('/api/apprentice', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.apprentices && data.apprentices.length > 0) {
          setApprentices(data.apprentices);
          setSelectedApprenticeId(prev => {
            if (prev && data.apprentices.some((a: any) => a.id === prev)) return prev;
            return data.apprentices[0].id;
          });
        } else {
          setApprentices([]);
          setSelectedApprenticeId(null);
        }
      }
    } catch (err) {
      console.warn('Kunne ikke laste lærlinger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApprentice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApprenticeName.trim()) {
      toast.error('Vennligst oppgi lærlingens fulle navn');
      return;
    }

    setIsCreating(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null;
      const res = await fetch('/api/apprentice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_apprentice',
          name: newApprenticeName.trim(),
          email: newApprenticeEmail.trim() || `${newApprenticeName.toLowerCase().replace(/\s+/g, '.')}@mester.no`,
          phone: newApprenticePhone.trim(),
          trade: newApprenticeTrade,
          tradeName: tradeLabels[newApprenticeTrade] || 'Tømrerfaget',
          tradeYear: newApprenticeYear,
          mentorName: newApprenticeMentor.trim() || 'Faglig leder'
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Lærling ${newApprenticeName} er registrert med offisiell læreplan!`);
        setIsCreateModalOpen(false);
        setNewApprenticeName('');
        setNewApprenticeEmail('');
        setNewApprenticePhone('');
        setNewApprenticeTrade('carpenter');
        setNewApprenticeYear(1);
        setNewApprenticeMentor('');
        await loadApprentices();
        if (data.apprentice?.id) {
          setSelectedApprenticeId(data.apprentice.id);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Kunne ikke opprette lærling');
      }
    } catch (e) {
      toast.error('Nettverksfeil ved registrering av lærling.');
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadApprentices();
    }
  }, [isOpen]);

  const selectedApprentice = apprentices.find(a => a.id === selectedApprenticeId) || apprentices[0];

  const handleSyncTimeEntries = async () => {
    if (!selectedApprentice) return;
    setIsSyncing(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null;
      const res = await fetch('/api/apprentice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'sync_progress',
          apprenticeId: selectedApprentice.id
        })
      });

      if (res.ok) {
        toast.success('Timelister og oppgaver analysert! Læreplanen er synkronisert.');
        await loadApprentices();
      } else {
        toast.error('Kunne ikke synkronisere timer.');
      }
    } catch (e) {
      toast.error('Nettverksfeil under synkronisering.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApproveGoal = async (goalId: string) => {
    if (!selectedApprentice) return;
    const note = feedbackInput[goalId] || 'Godkjent i bedrift iht. læreplanmål.';
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null;
      const res = await fetch('/api/apprentice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'approve_goal',
          apprenticeId: selectedApprentice.id,
          goalId,
          feedback: note
        })
      });

      if (res.ok) {
        toast.success('Målet er formelt godkjent og signert!');
        await loadApprentices();
      } else {
        toast.error('Kunne ikke godkjenne målet.');
      }
    } catch (e) {
      toast.error('Feil ved godkjenning av mål.');
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedApprentice) {
      toast.error('Velg eller opprett en lærling først for å generere halvårsrapport.');
      return;
    }
    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null;
      const res = await fetch('/api/apprentice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'generate_report',
          apprenticeId: selectedApprentice.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedReport(data.report);
        setActiveTab('report');
        toast.success('Halvårsrapport klargjort for opplæringskontoret!');
      } else {
        toast.error('Kunne ikke generere rapport.');
      }
    } catch (e) {
      toast.error('Feil ved generering av rapport.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: ApprenticeGoal['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />;
      case 'ready_for_review': return <AlertCircle className="text-amber-500 animate-pulse shrink-0" size={20} />;
      case 'in_progress': return <Clock className="text-blue-500 shrink-0" size={20} />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-neutral-300 shrink-0" />;
    }
  };

  if (!isOpen) return null;

  const modalBody = (
    <div className={cn(
      "bg-[#0B0F17] text-white w-full overflow-hidden flex flex-col border border-slate-800",
      inline 
        ? "rounded-3xl shadow-xl h-full min-h-[82vh]" 
        : "max-w-5xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl max-h-[94vh] sm:max-h-[92vh] pb-[env(safe-area-inset-bottom,0px)]"
    )}>
      {/* Mobile Drag Handle */}
      {!inline && <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />}

        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-[#131722] text-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/50 shrink-0">
              <GraduationCap size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">
                  Lærlingmodul & Opplæringsbok
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                  100% Autonom
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm font-medium truncate">
                Læreplanmål, timekobling, vurderingssamtaler og faglig leders godkjenning
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSyncTimeEntries}
              disabled={isSyncing || !selectedApprentice}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border border-slate-700"
              title="Matcher automatisk timelister mot kompetansemål"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Synker timer...' : 'Autonom Time-Synk'}</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="Registrer ny lærling"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Ny Lærling</span>
              <span className="sm:hidden">Ny</span>
            </button>
            <button 
              onClick={onClose} 
              aria-label="Lukk" 
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors shrink-0 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-[#0D131F] border-b border-slate-800 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'goals' 
                ? 'bg-[#131722] text-indigo-400 border-t border-x border-slate-800' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen size={14} />
            <span>Kompetansemål & Godkjenning</span>
          </button>
          <button
            onClick={() => {
              if (!generatedReport) {
                handleGenerateReport();
              } else {
                setActiveTab('report');
              }
            }}
            className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'report' 
                ? 'bg-[#131722] text-indigo-400 border-t border-x border-slate-800' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText size={14} />
            <span>Offisiell Halvårsrapport (Opplæringskontor)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row custom-scrollbar">
          {/* Sidebar - Lærlinger */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800 bg-[#0D131F] p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Bedriftens Lærlinger
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 rounded-md">
                  {apprentices.length} aktiv
                </span>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="p-1 hover:bg-slate-800 text-indigo-400 rounded-md transition-colors cursor-pointer"
                  title="Registrer ny lærling"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {apprentices.map((apprentice) => {
                const completedGoals = apprentice.goals.filter(g => g.status === 'completed').length;
                const reviewNeeded = apprentice.goals.filter(g => g.status === 'ready_for_review').length;
                const isSelected = selectedApprentice?.id === apprentice.id;

                return (
                  <button
                    key={apprentice.id}
                    onClick={() => {
                      setSelectedApprenticeId(apprentice.id);
                      setActiveTab('goals');
                    }}
                    className={`w-full flex items-start gap-3 p-3 rounded-2xl transition-all text-left cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-950/50 text-indigo-200 border border-indigo-500/40 shadow-xs' 
                        : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-800/40 font-black flex items-center justify-center shrink-0">
                      {apprentice.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate flex items-center gap-1.5">
                        <span>{apprentice.name}</span>
                        {reviewNeeded > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Klart for godkjenning" />
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{apprentice.tradeName} • {apprentice.tradeYear}. år</div>
                      <div className="text-[11px] text-emerald-400 font-bold mt-1">
                        {completedGoals} / {apprentice.goals.length} mål godkjent
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Action for Admin */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border border-slate-700"
              >
                <Plus size={14} />
                <span>+ Registrer ny lærling</span>
              </button>
              <button
                onClick={handleGenerateReport}
                className="w-full py-2 px-3 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText size={14} />
                <span>Generer Halvårsrapport</span>
              </button>
            </div>
          </div>

          {/* Main Display */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {selectedApprentice ? (
              activeTab === 'report' && generatedReport ? (
                /* Report View */
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-[#131722] p-4 rounded-2xl border border-slate-800 shadow-xs">
                    <div>
                      <h3 className="font-bold text-white text-base">{generatedReport.title}</h3>
                      <p className="text-xs text-slate-400">Klar for signering og innsending til opplæringskontoret</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                      >
                        <Printer size={14} />
                        <span>Skriv ut / Lagre som PDF</span>
                      </button>
                    </div>
                  </div>

                  <div 
                    className="bg-slate-900 text-slate-100 p-8 rounded-3xl border border-slate-800 shadow-sm print:bg-white print:text-black"
                    dangerouslySetInnerHTML={{ __html: generatedReport.reportHtml }}
                  />
                </div>
              ) : (
                /* Goals & Tracking View */
                <div className="space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#131722] p-4 rounded-2xl border border-slate-800 shadow-xs text-white">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Fremdrift</span>
                      <div className="text-2xl font-black text-indigo-400 mt-1">
                        {Math.round((selectedApprentice.goals.filter(g => g.status === 'completed').length / selectedApprentice.goals.length) * 100)}%
                      </div>
                      <span className="text-xs text-slate-400">
                        {selectedApprentice.goals.filter(g => g.status === 'completed').length} av {selectedApprentice.goals.length} mål godkjent
                      </span>
                    </div>

                    <div className="bg-[#131722] p-4 rounded-2xl border border-slate-800 shadow-xs text-white">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Arbeidstimer i Felt</span>
                      <div className="text-2xl font-black text-emerald-400 mt-1">
                        {selectedApprentice.totalHoursWorked} t
                      </div>
                      <span className="text-xs text-slate-400">Logget i elektronisk KS-system</span>
                    </div>

                    <div className="bg-[#131722] p-4 rounded-2xl border border-slate-800 shadow-xs text-white">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Faglig Leder</span>
                      <div className="text-base font-bold text-white mt-1 truncate">
                        {selectedApprentice.mentorName}
                      </div>
                      <span className="text-xs text-amber-400 font-bold">
                        {selectedApprentice.goals.filter(g => g.status === 'ready_for_review').length} mål venter på godkjenning
                      </span>
                    </div>
                  </div>

                  {/* AI Advice Banner */}
                  <div className="bg-gradient-to-r from-indigo-950/80 to-slate-900 rounded-2xl p-5 text-white shadow-sm border border-indigo-500/30 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                        MesterAI Autonom Opplæringsveileder
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {selectedApprentice.aiRecommendation}
                      </p>
                    </div>
                  </div>

                  {/* Goals List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Læreplanmål iht. Utdanningsdirektoratet
                      </h3>
                      <button 
                        onClick={handleSyncTimeEntries}
                        disabled={isSyncing}
                        className="sm:hidden text-xs text-indigo-400 font-bold flex items-center gap-1"
                      >
                        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                        <span>Synk</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {selectedApprentice.goals.map((goal) => {
                        const isReview = goal.status === 'ready_for_review';
                        const isDone = goal.status === 'completed';

                        return (
                          <div 
                            key={goal.goalId}
                            className={`rounded-2xl p-4 border transition-all text-white ${
                              isReview 
                                ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30 shadow-sm' 
                                : isDone 
                                  ? 'bg-emerald-950/20 border-emerald-500/40' 
                                  : 'bg-[#131722] border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="mt-0.5">{getStatusIcon(goal.status)}</div>
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-white">{goal.title}</h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                      {goal.category}
                                    </span>
                                    {isReview && (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40">
                                        KLAR FOR GODKJENNING
                                      </span>
                                    )}
                                    {isDone && (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 flex items-center gap-1">
                                        <ShieldCheck size={11} />
                                        GODKJENT AV {goal.approvedBy || selectedApprentice.mentorName}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 leading-relaxed">
                                    {goal.description}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-sm font-black text-white">
                                  {goal.hoursLogged} / {goal.requiredHours} t
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold">{goal.progress}% fullført</div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isDone ? 'bg-emerald-500' : isReview ? 'bg-amber-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${Math.min(100, goal.progress)}%` }}
                              />
                            </div>

                            {/* Evidence notes if any */}
                            {goal.evidenceNotes && goal.evidenceNotes.length > 0 && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                                <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider block">
                                  Dokumentert arbeid fra KS-system:
                                </span>
                                {goal.evidenceNotes.slice(0, 2).map((note, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                                    <span className="text-emerald-400">✓</span>
                                    <span className="truncate">{note}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Admin 1-Click Approval Action */}
                            {!isDone && (
                              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                                <input
                                  type="text"
                                  placeholder="Tilbakemelding fra faglig leder (valgfri)..."
                                  value={feedbackInput[goal.goalId] || ''}
                                  onChange={(e) => setFeedbackInput(prev => ({ ...prev, [goal.goalId]: e.target.value }))}
                                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500"
                                />
                                <button
                                  onClick={() => handleApproveGoal(goal.goalId)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                    isReview 
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs' 
                                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                                  }`}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Godkjenn Mål</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-[#131722] rounded-3xl border border-slate-800">
                <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center mb-4">
                  <GraduationCap size={32} />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Ingen lærling valgt eller funnet</h3>
                <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                  Lærlingmodulen følger automatisk opp læreplanmål iht. Udir, kobler timer fra byggedagboken og genererer godkjente halvårsrapporter for opplæringskontoret.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-950/50 transition-all cursor-pointer"
                >
                  <Plus size={15} />
                  <span>+ Registrer bedriftens lærling</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Registrer ny lærling Modal */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[#0B0F17] text-white rounded-3xl p-6 shadow-2xl border border-slate-800"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/40 flex items-center justify-center">
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Registrer ny lærling</h3>
                      <p className="text-[11px] text-slate-400">Offisielle Udir-læreplanmål kobles automatisk</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateApprentice} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Fullt navn *</label>
                    <input
                      type="text"
                      required
                      placeholder="F.eks. Jonas Berg"
                      value={newApprenticeName}
                      onChange={(e) => setNewApprenticeName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Fagområde</label>
                      <select
                        value={newApprenticeTrade}
                        onChange={(e) => setNewApprenticeTrade(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                      >
                        <option value="carpenter">Tømrerfaget</option>
                        <option value="plumber">Rørleggerfaget</option>
                        <option value="electrician">Elektrikerfaget</option>
                        <option value="mason">Murerfaget</option>
                        <option value="painter">Malerfaget</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Læreår</label>
                      <select
                        value={newApprenticeYear}
                        onChange={(e) => setNewApprenticeYear(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                      >
                        <option value={1}>1. års lærling</option>
                        <option value={2}>2. års lærling</option>
                        <option value={3}>3. års lærling</option>
                        <option value={4}>4. års lærling</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">E-post</label>
                      <input
                        type="email"
                        placeholder="laerling@bedrift.no"
                        value={newApprenticeEmail}
                        onChange={(e) => setNewApprenticeEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Telefon</label>
                      <input
                        type="tel"
                        placeholder="987 65 432"
                        value={newApprenticePhone}
                        onChange={(e) => setNewApprenticePhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Faglig leder / Mentor</label>
                    <input
                      type="text"
                      placeholder="F.eks. Ken (Byggmester)"
                      value={newApprenticeMentor}
                      onChange={(e) => setNewApprenticeMentor(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Avbryt
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      {isCreating ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                      <span>{isCreating ? 'Oppretter...' : 'Registrer lærling'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
  );

  if (inline) {
    return modalBody;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-5xl flex justify-center"
      >
        {modalBody}
      </motion.div>
    </div>
  );
};

export default ApprenticeModal;
