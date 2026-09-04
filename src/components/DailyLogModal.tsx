import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  CloudSun, 
  Users, 
  CheckSquare, 
  AlertTriangle, 
  Download, 
  Sparkles, 
  RefreshCw, 
  FileText,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Project, DailyLog } from '../types';
import { dailyLogService } from '../services/dailyLogService';
import { pdfService } from '../services/pdfService';
import { toast } from 'sonner';

interface DailyLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentUserName?: string;
}

export default function DailyLogModal({
  isOpen,
  onClose,
  project,
  currentUserName = 'Byggeleder'
}: DailyLogModalProps) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [activeLog, setActiveLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);

  useEffect(() => {
    if (!isOpen || !project?.id) return;
    loadLogs();
  }, [isOpen, project?.id]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await dailyLogService.getProjectDailyLogs(project.id);
      setLogs(data);
      if (data.length > 0) {
        setActiveLog(data[0]);
      } else {
        // Auto compile if no logs exist yet
        handleCompileToday();
      }
    } catch (e) {
      console.warn('Could not load daily logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCompileToday = async () => {
    setIsCompiling(true);
    try {
      const compiled = await dailyLogService.compileTodayLog(project, currentUserName);
      toast.success('Dagens byggedagbok ble automatisk generert fra vær og timeføring!');
      setActiveLog(compiled);
      const updatedList = await dailyLogService.getProjectDailyLogs(project.id);
      setLogs(updatedList);
    } catch (e) {
      toast.error('Kunne ikke hente vær og aktiviteter for dagboken.');
    } finally {
      setIsCompiling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          className="bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-neutral-200 overflow-hidden pb-[env(safe-area-inset-bottom,0px)]"
        >
          {/* Mobile Grab Handle */}
          <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

          {/* Header */}
          <div className="p-4 sm:p-8 pb-4 sm:pb-6 border-b border-neutral-100 flex justify-between items-start shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 sm:p-2 bg-sky-500/10 text-sky-600 rounded-xl shrink-0">
                  <CloudSun size={18} className="sm:w-5 sm:h-5" />
                </span>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-600 truncate">
                  Byggherreforskriften § 15 &amp; NS 8405/8406
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-neutral-900 truncate">Automatisk Byggedagbok</h2>
              <p className="text-xs text-neutral-500 truncate">
                Prosjekt: {project.name} | Dokumenterer værforhold, mannskap og produksjon
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                onClick={handleCompileToday}
                disabled={isCompiling}
                className="px-3 sm:px-3.5 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <RefreshCw size={13} className={isCompiling ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isCompiling ? 'Oppdaterer...' : 'Kompiler i dag'}</span>
                <span className="sm:hidden">{isCompiling ? '...' : 'Kompiler'}</span>
              </button>
              <button
                onClick={onClose}
                aria-label="Lukk"
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-8 flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4">
            {/* Left: Date selector */}
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                Tidligere dagsrapporter
              </div>
              {logs.length === 0 ? (
                <div className="text-xs text-neutral-400 p-4 bg-neutral-50 rounded-xl text-center">
                  Ingen dagslogger ennå. Klikk «Kompiler i dag».
                </div>
              ) : (
                logs.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setActiveLog(l)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      activeLog?.id === l.id
                        ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                        : 'bg-neutral-50 border-neutral-100 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{new Date(l.date).toLocaleDateString('no-NO', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                      <div className="text-[10px] text-neutral-400">{l.weatherCondition || 'Normalt'} | {l.crewCount} mann</div>
                    </div>
                    <span className="text-[11px] font-bold text-sky-600">{l.totalHoursWorked}t</span>
                  </button>
                ))
              )}
            </div>

            {/* Right: Active Log Details */}
            <div className="md:col-span-2 space-y-4">
              {activeLog ? (
                <div className="space-y-4">
                  {/* Weather banner */}
                  <div className="p-5 bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-transparent rounded-2xl border border-sky-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-sky-600">
                          <CloudSun size={24} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-neutral-900">
                            Værforhold {new Date(activeLog.date).toLocaleDateString('no-NO')}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {activeLog.weatherDescription || 'Normalt norsk byggvær'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-sky-700">
                          {activeLog.temperatureMin ?? '-'}°C til {activeLog.temperatureMax ?? '-'}°C
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          Vind: {activeLog.windSpeedMax ?? 0} m/s | Nedbør: {activeLog.precipitationMm ?? 0} mm
                        </div>
                      </div>
                    </div>
                    {activeLog.workAdvice && (
                      <div className="mt-3 pt-3 border-t border-sky-200/40 text-xs font-semibold text-sky-800">
                        Håndverksråd: {activeLog.workAdvice}
                      </div>
                    )}
                  </div>

                  {/* Crew & Hours */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <div className="flex items-center gap-2 text-neutral-700 font-bold text-xs mb-2">
                        <Users size={14} className="text-sky-600" />
                        Mannskapsliste (elektronisk logg)
                      </div>
                      <div className="space-y-1">
                        {(activeLog.crewMembers || []).map((name, i) => (
                          <div key={i} className="text-xs text-neutral-600 flex items-center justify-between">
                            <span>{name}</span>
                            <span className="text-[10px] text-emerald-600 font-bold">Til stede</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <div className="flex items-center gap-2 text-neutral-700 font-bold text-xs mb-2">
                        <Clock size={14} className="text-sky-600" />
                        Arbeidstimer i dag
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-neutral-900">
                        {activeLog.totalHoursWorked} timer
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1">
                        {activeLog.crewCount} personer registrert i timeføringen
                      </div>
                    </div>
                  </div>

                  {/* Production & Checklists */}
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-2">
                    <div className="flex items-center gap-2 text-neutral-700 font-bold text-xs">
                      <CheckSquare size={14} className="text-emerald-600" />
                      Dagens produksjon og sjekklister
                    </div>
                    <div className="space-y-1">
                      {(activeLog.completedTasks || []).map((task, i) => (
                        <div key={i} className="text-xs text-neutral-600 flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deviations if any */}
                  {activeLog.deviationsRegistered && activeLog.deviationsRegistered.length > 0 && (
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-2">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                        <AlertTriangle size={14} className="text-rose-600" />
                        Registrerte avvik på byggeplass i dag
                      </div>
                      <div className="space-y-1">
                        {activeLog.deviationsRegistered.map((dev, i) => (
                          <div key={i} className="text-xs text-rose-700">
                            • {dev}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => pdfService.generateDailyLogPDF(project, activeLog)}
                      className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <Download size={14} />
                      Last ned Byggedagbok (PDF)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-neutral-400 text-sm">
                  Velg en dato for å se byggedagboken.
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Footer */}
          <div className="pt-6 border-t border-neutral-100 flex justify-between items-center">
            <span className="text-xs text-neutral-400 flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-500" />
              Oppfyller Byggherreforskriften &amp; dokumenterer eventuell force majeure
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all"
            >
              Lukk
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
