'use client';

import { useState, useEffect, useTransition } from 'react';
import { 
  ShieldCheck, 
  Zap, 
  CloudSun, 
  CloudRain, 
  Snowflake, 
  Wind, 
  FileText, 
  FileSignature, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Clock, 
  Building2, 
  Eye, 
  Layers
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

interface PendingAction {
  id: string;
  type: 'daily_log_draft' | 'weather_risk_alert' | 'change_order_draft' | 'compliance_notice' | 'offer_draft';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectId: string;
  projectName: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_executed';
  data: any;
  suggestedAction: string;
  impactAmount?: number;
  category: 'hms' | 'finance' | 'quality' | 'progress';
}

interface ProjectWeatherStatus {
  projectId: string;
  projectName: string;
  location: string;
  temp: number;
  precipitationMm: number;
  windSpeedMs: number;
  condition: string;
  riskLevel: 'safe' | 'warning' | 'critical';
  riskReason?: string;
  workAdvice: string;
  forecastDate: string;
}

interface AutonomousControlPostProps {
  onOpenProject?: (projectId: string) => void;
  onOpenChangeOrder?: (data?: any) => void;
}

export default function AutonomousControlPost({ onOpenProject, onOpenChangeOrder }: AutonomousControlPostProps) {
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [weatherStatuses, setWeatherStatuses] = useState<ProjectWeatherStatus[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [mode, setMode] = useState<'copilot' | 'autopilot'>('copilot');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showWeatherRadar, setShowWeatherRadar] = useState(false);
  const [generatingFdvForId, setGeneratingFdvForId] = useState<string | null>(null);

  const fetchState = async () => {
    try {
      setIsLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/agent/autonomous', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        setPendingActions(json.pendingActions || []);
        setWeatherStatuses(json.weatherStatuses || []);
        setRecentActivities(json.recentActivities || []);
        if (json.settings?.mode) {
          setMode(json.settings.mode);
        }
      }
    } catch (err) {
      console.warn('Could not load autonomous state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleToggleMode = async (newMode: 'copilot' | 'autopilot') => {
    const prev = mode;
    setMode(newMode);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/agent/autonomous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'update_settings',
          settings: { mode: newMode, autoApproveRoutineDailyLogs: newMode === 'autopilot' }
        })
      });

      if (res.ok) {
        toast.success(
          newMode === 'autopilot' 
            ? '⚡ Autopilot aktivert: Rutinedagbøker uten avvik arkiveres automatisk.' 
            : '🟢 Assistent-modus aktivert: Krever 1-klikks godkjenning på alle handlinger.'
        );
      } else {
        setMode(prev);
        toast.error('Kunne ikke oppdatere modus');
      }
    } catch (e: any) {
      setMode(prev);
      toast.error('Feil ved oppdatering av modus');
    }
  };

  const handleTriggerCycle = async () => {
    setIsScanning(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/agent/autonomous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'run_audit_cycle' })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `AI-skann fullført: Sjekket ${data.cycleResult.weatherChecksCount} værstasjoner, fant ${data.cycleResult.dailyLogsDrafted} dagbok-utkast.`
        );
        fetchState();
      } else {
        toast.error('Skanning feilet');
      }
    } catch (err) {
      toast.error('Kunne ikke kjøre AI-skann');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApprove = async (action: PendingAction) => {
    setProcessingId(action.id);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/agent/autonomous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'approve_action',
          actionId: action.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.result?.message || 'Handling godkjent!');
        setPendingActions(prev => prev.filter(a => a.id !== action.id));
        fetchState();
      } else {
        toast.error('Kunne ikke godkjenne');
      }
    } catch (e: any) {
      toast.error('Feil: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (actionId: string) => {
    setProcessingId(actionId);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/agent/autonomous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'reject_action',
          actionId
        })
      });

      if (res.ok) {
        toast.info('Handlingen er avvist og fjernet fra køen.');
        setPendingActions(prev => prev.filter(a => a.id !== actionId));
      } else {
        toast.error('Kunne ikke avvise handling');
      }
    } catch (e: any) {
      toast.error('Feil: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleGenerateFDV = async (projectId: string) => {
    setGeneratingFdvForId(projectId);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/agent/autonomous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'generate_fdv',
          projectId
        })
      });

      if (res.ok) {
        const json = await res.json();
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(json.report.htmlContent);
          win.document.close();
          toast.success('FDV & Sluttrapport åpnet i ny fane, klar for utskrift / PDF!');
        } else {
          toast.info('Popup blokkert. Vennligst tillat popups for å se rapporten.');
        }
      } else {
        toast.error('Kunne ikke generere FDV-rapport');
      }
    } catch (e: any) {
      toast.error('Feil ved FDV-generering: ' + e.message);
    } finally {
      setGeneratingFdvForId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* 1. KONTROLLPOST TOPPLINJE */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-navy-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-electric-500/20 text-electric-300 border border-electric-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Autonom Byggeleder & Kontrollpost
            </span>
            <span className="text-[11px] text-slate-300">
              100% Autonom drift • Full oversikt og kontroll
            </span>
          </div>
          <h4 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <span>Oppgaver til godkjenning & Autopilot</span>
            {pendingActions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold">
                {pendingActions.length} venter
              </span>
            )}
          </h4>
        </div>

        {/* Dual Mode Switch & AI Scan Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-1 bg-white/10 rounded-2xl flex items-center border border-white/15">
            <button
              type="button"
              onClick={() => handleToggleMode('copilot')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                mode === 'copilot'
                  ? "bg-electric-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              )}
              title="Krever din godkjenning på alle handlinger"
            >
              <span>🟢 Manuell</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('autopilot')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                mode === 'autopilot'
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              )}
              title="Godkjenner og arkiverer rutinedagbøker automatisk"
            >
              <Zap size={13} className="text-emerald-300" />
              <span>Autopilot</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isScanning}
            onClick={handleTriggerCycle}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Kjør en umiddelbar sjekk av vær, timer og endringsordrer"
          >
            <RefreshCw size={13} className={isScanning ? "animate-spin text-electric-400" : ""} />
            <span>{isScanning ? 'Sjekker...' : 'Sjekk status nå'}</span>
          </button>
        </div>
      </div>

      {/* 2. GODKJENNINGSKØ (ACTION FEED) */}
      <div className="p-4 sm:p-5 space-y-3">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={15} className="animate-spin text-electric-600" />
            <span>Sjekker oppgaver og værforhold...</span>
          </div>
        ) : pendingActions.length === 0 ? (
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  Ingen oppgaver venter på godkjenning
                </div>
                <div className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                  MesterAI følger opp byggeplassene dine i bakgrunnen. Byggedagbøker klargjøres automatisk ved arbeidsdagens slutt (kl. 16:30).
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTriggerCycle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              <RefreshCw size={12} className={isScanning ? "animate-spin" : ""} />
              <span>Kjør sjekk nå</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Klare til godkjenning ({pendingActions.length})</span>
              <span className="text-[11px] font-medium text-slate-500">
                1 tommel-klikk på «Godkjenn» for å låse handlingen
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {pendingActions.map((action) => {
                const isProcessing = processingId === action.id;

                return (
                  <div
                    key={action.id}
                    className="p-3.5 sm:p-4 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
                        action.type === 'weather_risk_alert' ? "bg-amber-500 text-white" :
                        action.type === 'daily_log_draft' ? "bg-blue-600 text-white" :
                        action.type === 'change_order_draft' ? "bg-emerald-600 text-white" :
                        "bg-indigo-600 text-white"
                      )}>
                        {action.type === 'weather_risk_alert' && <CloudRain size={18} />}
                        {action.type === 'daily_log_draft' && <FileText size={18} />}
                        {action.type === 'change_order_draft' && <FileSignature size={18} />}
                        {action.type !== 'weather_risk_alert' && action.type !== 'daily_log_draft' && action.type !== 'change_order_draft' && <ShieldCheck size={18} />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-black text-navy-950">
                            {action.title}
                          </span>
                          {action.priority === 'urgent' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                              Haster
                            </span>
                          )}
                          {action.impactAmount && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              +kr {action.impactAmount.toLocaleString('no-NO')}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                          {action.description}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 flex-wrap">
                          <span className="font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            🏗️ {action.projectName}
                          </span>
                          <span>💡 {action.suggestedAction}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReject(action.id)}
                        className="px-3 py-2 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-bold border border-slate-200 hover:border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                        title="Avvis eller fjern handlingen"
                      >
                        Avvis
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(action)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
                      >
                        <CheckCircle2 size={14} />
                        <span>{isProcessing ? 'Godkjenner...' : 'Godkjenn nå'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. COLLAPSIBLE VÆR-RADAR FOR AKTIVE BYGGEPLASSER */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowWeatherRadar(!showWeatherRadar)}
              className="text-xs font-bold text-navy-900 hover:text-electric-700 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
            >
              <CloudSun size={15} className="text-amber-500" />
              <span>Værvarsel for byggeplassene ({weatherStatuses.length} {weatherStatuses.length === 1 ? 'byggeplass' : 'byggeplasser'})</span>
              {showWeatherRadar ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <span className="text-[11px] text-slate-400">
              Yr.no / Open-Meteo sanntidsdata
            </span>
          </div>

          {showWeatherRadar && (
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {weatherStatuses.map((ws) => {
                const isRisk = ws.riskLevel !== 'safe';

                return (
                  <div
                    key={ws.projectId}
                    className={cn(
                      "p-3 rounded-xl border text-xs space-y-1.5",
                      isRisk 
                        ? "bg-amber-50/80 border-amber-200 text-amber-950" 
                        : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    <div className="flex items-center justify-between font-black">
                      <span className="truncate">{ws.projectName}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] uppercase",
                        isRisk ? "bg-amber-200 text-amber-900" : "bg-emerald-100 text-emerald-800"
                      )}>
                        {isRisk ? 'Risiko' : 'Trygt'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-bold">
                      <span>🌡️ {ws.temp}°C</span>
                      <span>🌧️ {ws.precipitationMm} mm</span>
                      <span>💨 {ws.windSpeedMs} m/s</span>
                    </div>

                    <p className="text-[10px] text-slate-600 leading-tight">
                      {ws.riskReason || ws.workAdvice}
                    </p>

                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleGenerateFDV(ws.projectId)}
                        disabled={generatingFdvForId === ws.projectId}
                        className="text-[10px] font-bold text-electric-700 hover:text-electric-800 flex items-center gap-1 cursor-pointer"
                        title="Generer ferdig FDV-sluttrapport for dette prosjektet"
                      >
                        <Printer size={11} />
                        <span>{generatingFdvForId === ws.projectId ? 'Genererer FDV...' : 'Generer FDV-perm'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. COLLAPSIBLE SANNTIDS HANDLINGSLOGG (AUDIT TRAIL) */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowLog(!showLog)}
            className="text-xs font-bold text-navy-900 hover:text-electric-700 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
          >
            <Clock size={14} className="text-slate-400" />
            <span>Aktivitetslogg ({recentActivities.length} {recentActivities.length === 1 ? 'hendelse' : 'hendelser'})</span>
            {showLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showLog && (
            <div className="mt-2.5 max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {recentActivities.length === 0 ? (
                <div className="text-[11px] text-slate-400 py-2">Ingen nylige hendelser logget.</div>
              ) : (
                recentActivities.map((act, i) => (
                  <div key={act.id || i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-navy-950 text-[11px] truncate">
                        {act.title}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">
                        {act.description}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">
                      {act.createdAt ? new Date(act.createdAt).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
