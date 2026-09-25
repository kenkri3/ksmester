import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Zap, 
  Download,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { ExecutiveSummary } from '../services/reportService';
import { FDVDocument } from '../services/fdvService';
import { DeviationAnalysis } from '../services/deviationAiService';

interface AiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'weekly_report' | 'fdv' | 'deviation_analysis' | 'project_analysis';
  reportData?: ExecutiveSummary;
  fdvData?: FDVDocument[];
  deviationData?: DeviationAnalysis;
  analysisData?: {
    overallStatus: 'On Track' | 'At Risk' | 'Critical';
    summary: string;
    metrics: {
      budgetHealth: string;
      documentationHealth: number;
      safetyScore: number;
    };
    identifiedRisks: { risk: string; impact: string; mitigation: string }[];
    recommendations: string[];
  };
  projectName?: string;
  isLoading?: boolean;
}

export default function AiReportModal({ 
  isOpen, 
  onClose, 
  type, 
  reportData, 
  fdvData, 
  deviationData,
  analysisData,
  projectName,
  isLoading 
}: AiReportModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          className="bg-[#0B0F17] text-white border border-slate-800 rounded-t-[2rem] sm:rounded-[2.5rem] w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom,0px)]"
        >
          {/* Mobile Grab Handle */}
          <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

          {/* Header */}
          <div className="p-4 sm:p-8 border-b border-slate-800 flex items-center justify-between bg-[#131722] text-white shrink-0">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                type === 'weekly_report' ? "bg-emerald-600 shadow-emerald-950/50" : 
                type === 'project_analysis' ? "bg-indigo-600 shadow-indigo-950/50" :
                "bg-blue-600 shadow-blue-950/50"
              )}>
                {type === 'weekly_report' ? <TrendingUp size={20} className="sm:w-6 sm:h-6 text-white" /> : 
                 type === 'project_analysis' ? <Zap size={20} className="sm:w-6 sm:h-6 text-white" /> :
                 <FileText size={20} className="sm:w-6 sm:h-6 text-white" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold truncate text-white">
                  {type === 'weekly_report' ? 'Ukentlig Leder-rapport' : 
                   type === 'fdv' ? `FDV-Dokumentasjon: ${projectName}` :
                   type === 'project_analysis' ? `AI Prosjektanalyse: ${projectName}` :
                   'AI Avviksanalyse'}
                </h2>
                <p className="text-xs text-slate-400 truncate">Generert av VikingMester • {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors shrink-0 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p className="font-bold">AI analyserer data og genererer dokumentasjon...</p>
                <p className="text-xs mt-2 italic">Dette tar vanligvis 5-10 sekunder.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {type === 'project_analysis' && analysisData && (
                  <>
                    <div className={cn(
                      "p-6 rounded-3xl border",
                      analysisData.overallStatus === 'Critical' ? "bg-red-950/20 border-red-500/30 text-red-200" :
                      analysisData.overallStatus === 'At Risk' ? "bg-orange-950/20 border-orange-500/30 text-orange-200" :
                      "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                    )}>
                      <h3 className={cn(
                        "text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2",
                        analysisData.overallStatus === 'Critical' ? "text-red-400" :
                        analysisData.overallStatus === 'At Risk' ? "text-orange-400" :
                        "text-emerald-400"
                      )}>
                        <ShieldCheck size={16} />
                        Status: {analysisData.overallStatus.toUpperCase()}
                      </h3>
                      <p className="text-sm leading-relaxed font-medium text-slate-200">
                        {analysisData.summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="p-3 sm:p-4 bg-[#131722] border border-slate-800 rounded-2xl text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Budsjett</div>
                        <div className="text-sm font-bold text-white">{analysisData.metrics.budgetHealth}</div>
                      </div>
                      <div className="p-3 sm:p-4 bg-[#131722] border border-slate-800 rounded-2xl text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Dokumentasjon</div>
                        <div className="text-sm font-bold text-white">{analysisData.metrics.documentationHealth}%</div>
                      </div>
                      <div className="p-3 sm:p-4 bg-[#131722] border border-slate-800 rounded-2xl text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Sikkerhet</div>
                        <div className="text-sm font-bold text-white">{analysisData.metrics.safetyScore}%</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-orange-400" />
                        Identifiserte Risikoer
                      </h3>
                      <div className="space-y-3">
                        {analysisData.identifiedRisks.map((risk, i) => (
                          <div key={i} className="p-4 bg-[#131722] border border-slate-800 rounded-2xl space-y-2 text-white">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-white">{risk.risk}</span>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                risk.impact === 'Høy' ? "bg-red-950/60 text-red-300 border border-red-800/40" : "bg-orange-950/60 text-orange-300 border border-orange-800/40"
                              )}>{risk.impact}</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              <span className="font-bold text-slate-300">Tiltak:</span> {risk.mitigation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        Anbefalinger
                      </h3>
                      <div className="space-y-2">
                        {analysisData.recommendations.map((rec, i) => (
                          <div key={i} className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs font-medium text-emerald-300 flex items-start gap-2">
                            <ArrowRight size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {type === 'deviation_analysis' && deviationData && (
                  <>
                    <div className={cn(
                      "p-6 rounded-3xl border",
                      deviationData.riskLevel === 'high' ? "bg-red-950/20 border-red-500/30 text-red-200" :
                      deviationData.riskLevel === 'medium' ? "bg-orange-950/20 border-orange-500/30 text-orange-200" :
                      "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                    )}>
                      <h3 className={cn(
                        "text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2",
                        deviationData.riskLevel === 'high' ? "text-red-400" :
                        deviationData.riskLevel === 'medium' ? "text-orange-400" :
                        "text-emerald-400"
                      )}>
                        <AlertTriangle size={16} />
                        Risikovurdering: {deviationData.riskLevel.toUpperCase()}
                      </h3>
                      <p className={cn(
                        "text-sm leading-relaxed font-medium",
                        deviationData.riskLevel === 'high' ? "text-red-300" :
                        deviationData.riskLevel === 'medium' ? "text-orange-300" :
                        "text-emerald-300"
                      )}>
                        {deviationData.rootCause}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <TrendingUp size={14} className="text-blue-400" />
                          Identifiserte Trender
                        </h3>
                        <div className="space-y-2">
                          {deviationData.trends.map((trend, i) => (
                            <div key={i} className="p-3 bg-[#131722] border border-slate-800 rounded-xl text-xs text-slate-300 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                              {trend}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          Anbefalte Tiltak
                        </h3>
                        <div className="space-y-2">
                          {deviationData.recommendations.map((rec, i) => (
                            <div key={i} className="p-3 bg-[#131722] border border-slate-800 rounded-xl text-xs text-slate-300 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                              {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {type === 'fdv' && fdvData && (
                  <>
                    <div className="p-6 bg-blue-950/20 rounded-3xl border border-blue-500/30 flex items-center justify-between text-blue-200">
                      <div>
                        <h3 className="text-sm font-bold text-blue-300">FDV-Struktur Generert</h3>
                        <p className="text-xs text-blue-400/90 mt-1">Basert på prosjektbeskrivelse og faggrupper.</p>
                      </div>
                      <ShieldCheck className="text-blue-400" size={32} />
                    </div>

                    <div className="space-y-6">
                      {fdvData.map((doc: any, i) => (
                        <div key={i} className="p-6 bg-[#131722] border border-slate-800 rounded-3xl shadow-sm space-y-4 text-white">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-lg text-white">{doc.section}</h3>
                              {doc.source === 'nobb' && (
                                <span className="px-2 py-0.5 bg-blue-950/60 text-blue-300 border border-blue-800/40 text-[10px] font-black uppercase tracking-widest rounded">
                                  NOBB
                                </span>
                              )}
                              {doc.source === 'ai' && (
                                <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-[10px] font-black uppercase tracking-widest rounded">
                                  AI
                                </span>
                              )}
                            </div>
                            <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-300 border border-slate-700">
                              {doc.supplierCategory}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300">{doc.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vedlikeholdsintervall</div>
                              <div className="text-sm font-bold flex items-center gap-2 text-white">
                                <ClipboardList size={14} className="text-emerald-400" />
                                {doc.maintenanceInterval}
                              </div>
                            </div>
                            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Instrukser</div>
                              <ul className="space-y-1">
                                {doc.instructions.map((inst: string, j: number) => (
                                  <li key={j} className="text-[10px] font-medium flex items-center gap-2 text-slate-300">
                                    <ArrowRight size={10} className="text-slate-500" />
                                    {inst}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {doc.url && (
                            <div className="pt-4 border-t border-slate-800">
                              <a 
                                href={doc.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline"
                              >
                                <FileText size={14} />
                                Se fullstendig FDV-dokumentasjon
                                <ArrowRight size={14} />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 sm:p-8 border-t border-slate-800 flex items-center justify-between bg-[#131722]">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Lukk
            </button>
            <div className="flex items-center gap-3">
              <button className="px-6 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-700 transition-all cursor-pointer">
                <Download size={18} />
                Last ned PDF
              </button>
              <button className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer">
                Arkiver i Prosjekt
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
