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
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

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
}

const ApprenticeModal: React.FC<ApprenticeModalProps> = ({ isOpen, onClose, initialApprenticeId }) => {
  const [selectedApprenticeId, setSelectedApprenticeId] = useState<string | null>(initialApprenticeId || null);
  const [apprentices, setApprentices] = useState<ApprenticeProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'goals' | 'report'>('goals');
  const [generatedReport, setGeneratedReport] = useState<any | null>(null);
  const [feedbackInput, setFeedbackInput] = useState<{ [goalId: string]: string }>({});

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
          if (!selectedApprenticeId) {
            setSelectedApprenticeId(data.apprentices[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Kunne ikke laste lærlinger:', err);
    } finally {
      setIsLoading(false);
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
    if (!selectedApprentice) return;
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-neutral-50 w-full max-w-5xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh] pb-[env(safe-area-inset-bottom,0px)] border border-neutral-200"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
              <GraduationCap size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 truncate">
                  Lærlingmodul & Opplæringsbok
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  100% Autonom
                </span>
              </div>
              <p className="text-neutral-500 text-xs sm:text-sm font-medium truncate">
                Læreplanmål, timekobling, vurderingssamtaler og faglig leders godkjenning
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSyncTimeEntries}
              disabled={isSyncing}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              title="Matcher automatisk timelister mot kompetansemål"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Synker timer...' : 'Autonom Time-Synk'}</span>
            </button>
            <button 
              onClick={onClose} 
              aria-label="Lukk" 
              className="p-2 hover:bg-neutral-100 rounded-xl transition-colors shrink-0 text-neutral-400 hover:text-neutral-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-neutral-100 border-b border-neutral-200 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'goals' 
                ? 'bg-white text-indigo-700 shadow-xs border-t border-x border-neutral-200' 
                : 'text-neutral-600 hover:text-neutral-900'
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
                ? 'bg-white text-indigo-700 shadow-xs border-t border-x border-neutral-200' 
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileText size={14} />
            <span>Offisiell Halvårsrapport (Opplæringskontor)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row custom-scrollbar">
          {/* Sidebar - Lærlinger */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-neutral-200 bg-white p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">
                Bedriftens Lærlinger
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                {apprentices.length} aktiv
              </span>
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
                        ? 'bg-indigo-50/80 text-indigo-950 border border-indigo-200 shadow-xs' 
                        : 'hover:bg-neutral-50 text-neutral-700 border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center shrink-0">
                      {apprentice.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate flex items-center gap-1.5">
                        <span>{apprentice.name}</span>
                        {reviewNeeded > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Klart for godkjenning" />
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 truncate">{apprentice.tradeName} • {apprentice.tradeYear}. år</div>
                      <div className="text-[11px] text-emerald-600 font-bold mt-1">
                        {completedGoals} / {apprentice.goals.length} mål godkjent
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Action for Admin */}
            <div className="pt-3 border-t border-neutral-100">
              <button
                onClick={handleGenerateReport}
                className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
                    <div>
                      <h3 className="font-bold text-neutral-900 text-base">{generatedReport.title}</h3>
                      <p className="text-xs text-neutral-500">Klar for signering og innsending til opplæringskontoret</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Printer size={14} />
                        <span>Skriv ut / Lagre som PDF</span>
                      </button>
                    </div>
                  </div>

                  <div 
                    className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm"
                    dangerouslySetInnerHTML={{ __html: generatedReport.reportHtml }}
                  />
                </div>
              ) : (
                /* Goals & Tracking View */
                <div className="space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Total Fremdrift</span>
                      <div className="text-2xl font-black text-indigo-600 mt-1">
                        {Math.round((selectedApprentice.goals.filter(g => g.status === 'completed').length / selectedApprentice.goals.length) * 100)}%
                      </div>
                      <span className="text-xs text-neutral-500">
                        {selectedApprentice.goals.filter(g => g.status === 'completed').length} av {selectedApprentice.goals.length} mål godkjent
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Arbeidstimer i Felt</span>
                      <div className="text-2xl font-black text-emerald-600 mt-1">
                        {selectedApprentice.totalHoursWorked} t
                      </div>
                      <span className="text-xs text-neutral-500">Logget i elektronisk KS-system</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Faglig Leder</span>
                      <div className="text-base font-bold text-neutral-900 mt-1 truncate">
                        {selectedApprentice.mentorName}
                      </div>
                      <span className="text-xs text-amber-600 font-bold">
                        {selectedApprentice.goals.filter(g => g.status === 'ready_for_review').length} mål venter på godkjenning
                      </span>
                    </div>
                  </div>

                  {/* AI Advice Banner */}
                  <div className="bg-gradient-to-r from-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-sm border border-indigo-500/20 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                        MesterAI Autonom Opplæringsveileder
                      </h4>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {selectedApprentice.aiRecommendation}
                      </p>
                    </div>
                  </div>

                  {/* Goals List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">
                        Læreplanmål iht. Utdanningsdirektoratet
                      </h3>
                      <button 
                        onClick={handleSyncTimeEntries}
                        disabled={isSyncing}
                        className="sm:hidden text-xs text-indigo-600 font-bold flex items-center gap-1"
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
                            className={`bg-white rounded-2xl p-4 border transition-all ${
                              isReview 
                                ? 'border-amber-300 ring-2 ring-amber-100 shadow-sm' 
                                : isDone 
                                  ? 'border-emerald-200 bg-emerald-50/20' 
                                  : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="mt-0.5">{getStatusIcon(goal.status)}</div>
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-neutral-900">{goal.title}</h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                                      {goal.category}
                                    </span>
                                    {isReview && (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                        KLAR FOR GODKJENNING
                                      </span>
                                    )}
                                    {isDone && (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                        <ShieldCheck size={11} />
                                        GODKJENT AV {goal.approvedBy || selectedApprentice.mentorName}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-neutral-500 leading-relaxed">
                                    {goal.description}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-sm font-black text-neutral-900">
                                  {goal.hoursLogged} / {goal.requiredHours} t
                                </div>
                                <div className="text-[10px] text-neutral-400 font-bold">{goal.progress}% fullført</div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-3 w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isDone ? 'bg-emerald-500' : isReview ? 'bg-amber-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${Math.min(100, goal.progress)}%` }}
                              />
                            </div>

                            {/* Evidence notes if any */}
                            {goal.evidenceNotes && goal.evidenceNotes.length > 0 && (
                              <div className="mt-2.5 pt-2.5 border-t border-neutral-100 text-[11px] text-neutral-600 space-y-1">
                                <span className="font-bold text-neutral-400 uppercase text-[9px] tracking-wider block">
                                  Dokumentert arbeid fra KS-system:
                                </span>
                                {goal.evidenceNotes.slice(0, 2).map((note, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-neutral-600">
                                    <span className="text-emerald-500">✓</span>
                                    <span className="truncate">{note}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Admin 1-Click Approval Action */}
                            {!isDone && (
                              <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
                                <input
                                  type="text"
                                  placeholder="Tilbakemelding fra faglig leder (valgfri)..."
                                  value={feedbackInput[goal.goalId] || ''}
                                  onChange={(e) => setFeedbackInput(prev => ({ ...prev, [goal.goalId]: e.target.value }))}
                                  className="flex-1 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-indigo-500"
                                />
                                <button
                                  onClick={() => handleApproveGoal(goal.goalId)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                    isReview 
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs' 
                                      : 'bg-neutral-900 hover:bg-neutral-800 text-white'
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
              <div className="p-12 text-center text-neutral-400">
                <User size={36} className="mx-auto mb-2 opacity-50" />
                <p>Ingen lærling funnet.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ApprenticeModal;
