import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  DollarSign, 
  BarChart3, 
  Loader2, 
  X, 
  ArrowRight, 
  Brain,
  ChevronRight,
  Info,
  RefreshCw,
  Save
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Project, Deviation, SafetyInspection, CrewMember, ProjectMaterial } from '../types';
import { db, collection, query, where, onSnapshot, handleFirestoreError, OperationType } from '../services/firebase';
import { projectAiService, ProjectHealthReport as HealthReportType } from '../services/projectAiService';
import { api } from '../services/api';
import { toast } from 'sonner';

interface ProjectHealthReportProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

const ProjectHealthReport: React.FC<ProjectHealthReportProps> = ({ project, isOpen, onClose }) => {
  const [report, setReport] = useState<HealthReportType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [inspections, setInspections] = useState<SafetyInspection[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);

  useEffect(() => {
    if (!isOpen || !project.id) return;

    // Fetch related data for analysis
    const devQuery = query(collection(db, 'deviations'), where('projectId', '==', project.id));
    const insQuery = query(collection(db, 'safety_inspections'), where('projectId', '==', project.id));
    const crewQuery = query(collection(db, 'crew'), where('projectId', '==', project.id));
    const matQuery = query(collection(db, 'project_materials'), where('projectId', '==', project.id));

    const unsubDev = onSnapshot(devQuery, (snapshot) => {
      setDeviations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deviation)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'deviations'));

    const unsubIns = onSnapshot(insQuery, (snapshot) => {
      setInspections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SafetyInspection)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'safety_inspections'));

    const unsubCrew = onSnapshot(crewQuery, (snapshot) => {
      setCrew(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CrewMember)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'crew'));

    const unsubMat = onSnapshot(matQuery, (snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectMaterial)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'project_materials'));

    return () => {
      unsubDev();
      unsubIns();
      unsubCrew();
      unsubMat();
    };
  }, [isOpen, project.id]);

  const generateReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await projectAiService.analyzeProjectHealth(project, deviations, inspections, crew, materials);
      setReport(result);
    } catch (err) {
      setError("Kunne ikke generere helserapport. Vennligst prøv igjen senere.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const [isSavingReport, setIsSavingReport] = useState(false);
  const handleSaveReport = async () => {
    if (!report) return;
    setIsSavingReport(true);
    try {
      await api.saveDoc('project_health_reports', {
        projectId: project.id,
        projectName: project.name,
        status: report.status,
        overallHealth: report.status,
        score: report.score,
        summary: report.summary,
        risks: report.risks,
        recommendations: report.recommendations,
        createdAt: new Date().toISOString()
      });
      toast.success('Prosjekthelserapport er arkivert i prosjektet!');
    } catch (err) {
      toast.error('Kunne ikke arkivere rapport.');
    } finally {
      setIsSavingReport(false);
    }
  };

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-emerald-500 bg-emerald-50';
      case 'good': return 'text-blue-500 bg-blue-50';
      case 'fair': return 'text-amber-500 bg-amber-50';
      case 'poor': return 'text-orange-500 bg-orange-50';
      case 'critical': return 'text-rose-500 bg-rose-50';
      default: return 'text-neutral-500 bg-neutral-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-neutral-600 bg-neutral-50 border-neutral-100';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        className="bg-white text-navy-950 w-full max-w-4xl rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]"
      >
        {/* Mobile drag bar */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-2 shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-100 shrink-0">
              <Activity size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-navy-950 tracking-tight truncate">AI Prosjekthelse</h2>
              <p className="text-slate-500 text-xs sm:text-sm font-semibold truncate">{project.name} — {project.projectCode}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="Lukk"
          >
            <X size={22} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70 text-navy-950">
          {!report && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 sm:mb-6 shadow-xs">
                <Brain size={34} className="sm:w-10 sm:h-10" />
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-navy-950 mb-2">Klar for analyse</h3>
              <p className="text-slate-600 text-xs sm:text-sm max-w-md mb-6 sm:mb-8 leading-relaxed">
                Vår AI vil analysere fremdrift, budsjett, avvik og HMS-data for å gi deg en fullstendig helserapport med anbefalinger.
              </p>
              <button 
                onClick={generateReport}
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2.5 text-sm sm:text-base cursor-pointer"
              >
                <span>Start AI-analyse</span>
                <ArrowRight size={18} />
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-2">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <Brain size={28} className="animate-pulse sm:w-8 sm:h-8" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-navy-950 mt-6 sm:mt-8 mb-2">Analyserer prosjektdata...</h3>
              <p className="text-slate-600 text-xs sm:text-sm max-w-xs leading-relaxed">Dette tar bare noen sekunder. Vi ser på avvik, budsjett og HMS-status.</p>
            </div>
          ) : report ? (
            <div className="space-y-6 sm:space-y-8 pb-4">
              {/* Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="md:col-span-2 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
                    <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", getStatusColor(report.status || 'good'))}>
                      {report.status || 'good'}
                    </div>
                    <div className="text-xs sm:text-sm font-black text-slate-500">Total Helse: {report.score ?? 75}/100</div>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-navy-950 mb-2 sm:mb-3">Oppsummering</h3>
                  <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-medium">{typeof report.summary === 'string' ? report.summary : String(report.summary || 'Analyse fullført.')}</p>
                </div>
                
                <div className="bg-navy-950 p-5 sm:p-7 rounded-2xl sm:rounded-3xl text-white relative overflow-hidden shadow-md">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl -mr-16 -mt-16" />
                  <div className="relative z-10">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-300 mb-4 sm:mb-6 flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-400" />
                      Helse-score
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl sm:text-6xl font-black text-white">{report.score ?? 75}</span>
                      <span className="text-slate-400 font-bold text-base sm:text-lg">/100</span>
                    </div>
                    <div className="mt-4 sm:mt-6 w-full bg-white/15 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(0, Number(report.score) || 75))}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {[
                  { label: 'Fremdrift', icon: <TrendingUp size={18} />, data: report.metrics?.progress, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Budsjett', icon: <DollarSign size={18} />, data: report.metrics?.budget, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'HMS-status', icon: <ShieldCheck size={18} />, data: report.metrics?.hms, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Kvalitet', icon: <CheckCircle2 size={18} />, data: report.metrics?.quality, color: 'text-purple-600 bg-purple-50' }
                ].map((metric, i) => {
                  const status = typeof metric.data === 'string' ? metric.data : (metric.data?.status || 'Vurdert');
                  const detail = typeof metric.data === 'string' ? metric.data : (metric.data?.detail || '');
                  return (
                    <div key={i} className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2.5 sm:mb-3", metric.color)}>
                        {metric.icon}
                      </div>
                      <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 mb-0.5">{metric.label}</div>
                      <div className="text-xs sm:text-sm font-black text-navy-950 mb-1 truncate">{status}</div>
                      <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-none">{detail}</p>
                    </div>
                  );
                })}
              </div>

              {/* Risks & Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-black text-navy-950 flex items-center gap-2 px-1">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                    <span>Risikoanalyse</span>
                  </h3>
                  <div className="space-y-2.5">
                    {(report.risks || []).map((risk: any, i: number) => {
                      const title = typeof risk === 'string' ? risk : (risk?.title || 'Risiko');
                      const severity = typeof risk === 'string' ? 'medium' : (risk?.severity || 'medium');
                      const desc = typeof risk === 'string' ? '' : (risk?.description || '');
                      return (
                        <div key={i} className={cn("p-4 rounded-2xl border transition-all", getSeverityColor(severity))}>
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-xs sm:text-sm font-bold text-navy-950">{title}</span>
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider opacity-80 px-1.5 py-0.5 bg-white/60 rounded shrink-0">{severity}</span>
                          </div>
                          {desc && <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed">{desc}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-black text-navy-950 flex items-center gap-2 px-1">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span>Anbefalinger</span>
                  </h3>
                  <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3">
                    {(report.recommendations || []).map((rec: any, i: number) => {
                      const text = typeof rec === 'string' ? rec : (rec?.text || rec?.title || rec?.recommendation || String(rec));
                      return (
                        <div key={i} className="flex gap-3 sm:gap-4 items-start group">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-black mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium group-hover:text-navy-950 transition-colors">{text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-emerald-600 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-md">
                <h3 className="text-base sm:text-xl font-black text-white mb-4 sm:mb-6 flex items-center gap-2">
                  <ArrowRight size={20} className="sm:w-6 sm:h-6" />
                  <span>Neste steg for prosjektleder</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                  {(report.nextSteps || []).map((step: any, i: number) => {
                    const text = typeof step === 'string' ? step : (step?.step || step?.action || step?.text || String(step));
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 sm:p-4 bg-white/15 hover:bg-white/20 rounded-xl sm:rounded-2xl border border-white/15 transition-colors cursor-pointer group">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <ChevronRight size={16} className="text-white" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-white">{text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
              <button 
                onClick={generateReport}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shrink-0 cursor-pointer"
              >
                Prøv igjen
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {report && (
          <div className="p-3 sm:p-5 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 pb-[max(14px,env(safe-area-inset-bottom,14px))]">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={handleSaveReport}
                disabled={isSavingReport}
                className="flex-1 sm:flex-none px-3.5 sm:px-5 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save size={16} />
                <span>{isSavingReport ? 'Arkiverer...' : 'Arkiver rapport'}</span>
              </button>
              <button 
                onClick={generateReport}
                className="flex-1 sm:flex-none px-3.5 sm:px-5 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Oppdater</span>
              </button>
            </div>
            <button 
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black shadow-md shadow-emerald-100 transition-all flex items-center justify-center cursor-pointer"
            >
              Ferdig
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProjectHealthReport;
