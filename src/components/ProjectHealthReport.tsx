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
  RefreshCw
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Project, Deviation, SafetyInspection, CrewMember, ProjectMaterial } from '../types';
import { db, collection, query, where, onSnapshot, handleFirestoreError, OperationType } from '../services/firebase';
import { projectAiService, ProjectHealthReport as HealthReportType } from '../services/projectAiService';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-neutral-200 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <Activity size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">AI Prosjekthelse</h2>
              <p className="text-neutral-500 text-sm font-medium">{project.name} — {project.projectCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-neutral-50/50">
          {!report && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6">
                <Brain size={40} />
              </div>
              <h3 className="text-xl font-bold mb-2">Klar for analyse</h3>
              <p className="text-neutral-500 max-w-md mb-8">
                Vår AI vil analysere fremdrift, budsjett, avvik og HMS-data for å gi deg en fullstendig helserapport med anbefalinger.
              </p>
              <button 
                onClick={generateReport}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-3"
              >
                Start AI-analyse
                <ArrowRight size={20} />
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <Brain size={32} className="animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-bold mt-8 mb-2">Analyserer prosjektdata...</h3>
              <p className="text-neutral-500 max-w-xs">Dette tar bare noen sekunder. Vi ser på avvik, budsjett og HMS-status.</p>
            </div>
          ) : report ? (
            <div className="space-y-8 pb-8">
              {/* Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-8 rounded-[2rem] border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", getStatusColor(report.status))}>
                      {report.status}
                    </div>
                    <div className="text-sm font-bold text-neutral-400">Total Helse: {report.score}/100</div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Oppsummering</h3>
                  <p className="text-neutral-600 leading-relaxed">{report.summary}</p>
                </div>
                
                <div className="bg-neutral-900 p-8 rounded-[2rem] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <TrendingUp size={20} className="text-emerald-400" />
                      Helse-score
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black">{report.score}</span>
                      <span className="text-neutral-500 font-bold">/100</span>
                    </div>
                    <div className="mt-6 w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${report.score}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Fremdrift', icon: <TrendingUp size={18} />, data: report.metrics.progress, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Budsjett', icon: <DollarSign size={18} />, data: report.metrics.budget, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'HMS-status', icon: <ShieldCheck size={18} />, data: report.metrics.hms, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Kvalitet', icon: <CheckCircle2 size={18} />, data: report.metrics.quality, color: 'text-purple-600 bg-purple-50' }
                ].map((metric, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", metric.color)}>
                      {metric.icon}
                    </div>
                    <div className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-1">{metric.label}</div>
                    <div className="text-sm font-bold mb-2">{metric.data.status}</div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">{metric.data.detail}</p>
                  </div>
                ))}
              </div>

              {/* Risks & Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 px-2">
                    <AlertTriangle size={20} className="text-amber-500" />
                    Risikoanalyse
                  </h3>
                  <div className="space-y-3">
                    {report.risks.map((risk, i) => (
                      <div key={i} className={cn("p-5 rounded-3xl border transition-all", getSeverityColor(risk.severity))}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold">{risk.title}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{risk.severity}</span>
                        </div>
                        <p className="text-xs opacity-80 leading-relaxed">{risk.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 px-2">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    Anbefalinger
                  </h3>
                  <div className="bg-white rounded-[2rem] border border-neutral-200 p-6 shadow-sm space-y-4">
                    {report.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-xs font-bold">
                          {i + 1}
                        </div>
                        <p className="text-sm text-neutral-600 leading-relaxed group-hover:text-neutral-900 transition-colors">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <ArrowRight size={24} />
                  Neste steg for prosjektleder
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.nextSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/20 transition-colors cursor-pointer group">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <ChevronRight size={18} />
                      </div>
                      <span className="text-sm font-medium">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm flex items-center gap-3">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {report && (
          <div className="p-6 border-t border-neutral-200 bg-white flex justify-end gap-4">
            <button 
              onClick={generateReport}
              className="px-6 py-3 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Oppdater analyse
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-colors"
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
