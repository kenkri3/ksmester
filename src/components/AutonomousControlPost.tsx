'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Zap,
  CloudSun,
  CloudRain,
  FileText,
  FileSignature,
  CheckCircle2,
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { authHeaders } from '@/src/lib/clientAuth';
import { toast } from 'sonner';

interface PendingAction {
  id: string;
  type: 'daily_log_draft' | 'weather_risk_alert' | 'change_order_draft' | 'compliance_notice' | 'offer_draft' | 'missing_time_entry' | 'missing_daily_log' | 'open_deviation';
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
  requiresManualReview?: boolean;
  evidence?: string;
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
  isLive: boolean;
}

interface AutonomySettings {
  mode: 'copilot' | 'autopilot';
  autoApproveRoutineDailyLogs: boolean;
  notifyDiscord: boolean;
  notifySlack: boolean;
  notifyEmail: boolean;
  notifyDigest: boolean;
  approvalThresholdAmount: number;
  deviationReminderAfterDays: number;
}

/**
 * Rutineforslag som kan godkjennes i bulk. Penger og kundekontakt
 * (endringsordre, tilbud) står bevisst utenfor: de er juridiske dokumenter og
 * skal alltid vurderes enkeltvis.
 */
const ROUTINE_TYPES = ['daily_log_draft', 'missing_daily_log', 'missing_time_entry', 'open_deviation'];

const TYPE_META: Record<string, { tone: string; icon: any }> = {
  weather_risk_alert: { tone: 'bg-amber-500', icon: CloudRain },
  daily_log_draft: { tone: 'bg-blue-600', icon: FileText },
  missing_daily_log: { tone: 'bg-rose-600', icon: FileText },
  missing_time_entry: { tone: 'bg-orange-500', icon: Clock },
  change_order_draft: { tone: 'bg-emerald-600', icon: FileSignature },
  open_deviation: { tone: 'bg-purple-600', icon: AlertTriangle },
  offer_draft: { tone: 'bg-indigo-600', icon: FileSignature }
};

interface AutonomousControlPostProps {
  onOpenProject?: (projectId: string) => void;
  onOpenChangeOrder?: (data?: any) => void;
  /**
   * `dark` brukes inne i arbeidsstasjonen (mørk bakgrunn).
   * `light` er standard for dashboardet på lys bakgrunn.
   */
  variant?: 'light' | 'dark';
}

export default function AutonomousControlPost({
  onOpenProject,
  onOpenChangeOrder,
  variant = 'light'
}: AutonomousControlPostProps) {
  const dark = variant === 'dark';

  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [weatherStatuses, setWeatherStatuses] = useState<ProjectWeatherStatus[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [settings, setSettings] = useState<AutonomySettings | null>(null);
  const [counts, setCounts] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showWeatherRadar, setShowWeatherRadar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generatingFdvForId, setGeneratingFdvForId] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/agent/autonomous', { headers: authHeaders() });
      if (res.ok) {
        const json = await res.json();
        setPendingActions(json.pendingActions || []);
        setWeatherStatuses(json.weatherStatuses || []);
        setRecentActivities(json.recentActivities || []);
        setCounts(json.counts || {});
        if (json.settings) setSettings(json.settings);
      }
    } catch (err) {
      console.warn('Kunne ikke hente autonomi-status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const post = async (payload: any) => {
    const res = await fetch('/api/agent/autonomous', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Forespørselen feilet');
    return json;
  };

  const handleToggleMode = async (newMode: 'copilot' | 'autopilot') => {
    const prev = settings?.mode;
    setSettings(s => (s ? { ...s, mode: newMode, autoApproveRoutineDailyLogs: newMode === 'autopilot' } : s));
    try {
      const json = await post({
        action: 'update_settings',
        settings: { mode: newMode, autoApproveRoutineDailyLogs: newMode === 'autopilot' }
      });
      if (json.settings) setSettings(json.settings);
      toast.success(
        newMode === 'autopilot'
          ? '⚡ Autopilot: rutinedagbøker uten avvik arkiveres automatisk.'
          : '🟢 Assistent: agenten foreslår, du godkjenner med ett trykk.'
      );
    } catch (e: any) {
      setSettings(s => (s && prev ? { ...s, mode: prev } : s));
      toast.error(`Kunne ikke endre modus: ${e.message}`);
    }
  };

  const handleUpdateSettings = async (patch: Partial<AutonomySettings>) => {
    setSettings(s => (s ? { ...s, ...patch } : s));
    try {
      const json = await post({ action: 'update_settings', settings: patch });
      if (json.settings) setSettings(json.settings);
    } catch (e: any) {
      toast.error(`Kunne ikke lagre innstilling: ${e.message}`);
      fetchState();
    }
  };

  const handleTriggerCycle = async () => {
    setIsScanning(true);
    try {
      const data = await post({ action: 'run_audit_cycle', force: true });
      const c = data.cycleResult || {};
      const found =
        (c.weatherAlertsCreated || 0) + (c.dailyLogsDrafted || 0) + (c.changeOrdersDetected || 0) +
        (c.missingDailyLogsFlagged || 0) + (c.missingTimeEntriesFlagged || 0) + (c.openDeviationsFlagged || 0);
      toast.success(
        found > 0
          ? `Sjekket ${c.weatherChecksCount ?? 0} byggeplasser og la inn ${found} nye forslag.`
          : `Alt er à jour: sjekket ${c.weatherChecksCount ?? 0} byggeplasser, ingenting mangler.`
      );
      if (Array.isArray(c.notificationsSent) && c.notificationsSent.length > 0) {
        toast.info(`Varsel sendt til: ${c.notificationsSent.join(', ')}`);
      }
      await fetchState();
    } catch (err: any) {
      toast.error(`Kunne ikke kjøre sjekken: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleApprove = async (action: PendingAction) => {
    setProcessingId(action.id);
    try {
      const data = await post({ action: 'approve_action', actionId: action.id });
      toast.success(data.result?.message || 'Forslaget er godkjent.');
      setPendingActions(prev => prev.filter(a => a.id !== action.id));
      await fetchState();
    } catch (e: any) {
      toast.error(`Kunne ikke godkjenne: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveAllRoutine = async () => {
    const routineCount = pendingActions.filter(a => ROUTINE_TYPES.includes(a.type)).length;
    if (routineCount === 0) {
      toast.info('Ingen rutineforslag å godkjenne.');
      return;
    }
    setIsBulkApproving(true);
    try {
      const data = await post({ action: 'approve_batch', allRoutine: true });
      toast.success(data.message || `${routineCount} forslag godkjent.`);
      const failed: any[] = data.failed || [];
      if (failed.length > 0) toast.error(`${failed.length} feilet: ${failed[0].error}`);
      await fetchState();
    } catch (e: any) {
      toast.error(`Kunne ikke godkjenne alle: ${e.message}`);
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleReject = async (actionId: string) => {
    setProcessingId(actionId);
    try {
      await post({ action: 'reject_action', actionId });
      toast.info('Forslaget er avvist og fjernet fra køen.');
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
    } catch (e: any) {
      toast.error(`Kunne ikke avvise: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleGenerateFDV = async (projectId: string) => {
    setGeneratingFdvForId(projectId);
    try {
      const json = await post({ action: 'generate_fdv', projectId });
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(json.report.htmlContent);
        win.document.close();
        toast.success('FDV- og sluttrapport åpnet i ny fane, klar for utskrift / PDF.');
      } else {
        toast.info('Popup blokkert. Tillat popups for å se rapporten.');
      }
    } catch (e: any) {
      toast.error(`Kunne ikke generere FDV: ${e.message}`);
    } finally {
      setGeneratingFdvForId(null);
    }
  };

  const mode = settings?.mode || 'copilot';
  const routineCount = pendingActions.filter(a => ROUTINE_TYPES.includes(a.type)).length;
  const manualReviewCount = pendingActions.filter(a => a.requiresManualReview).length;
  const liveWeather = weatherStatuses.filter(w => w.isLive);
  const weatherUnavailable = counts.weatherUnavailable ?? (weatherStatuses.length - liveWeather.length);

  const surface = dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs';
  const itemBase = dark
    ? 'bg-slate-950/60 border-slate-800 hover:bg-slate-950'
    : 'bg-slate-50/80 border-slate-200/90 hover:bg-slate-50';
  const itemWarn = dark
    ? 'bg-amber-950/30 border-amber-800/60 hover:bg-amber-950/40'
    : 'bg-amber-50/60 border-amber-200/90 hover:bg-amber-50';
  const titleText = dark ? 'text-white' : 'text-navy-950';
  const bodyText = dark ? 'text-slate-300' : 'text-slate-600';
  const faintText = dark ? 'text-slate-400' : 'text-slate-500';
  const divider = dark ? 'border-slate-800' : 'border-slate-100';
  const subPanel = dark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200';
  const subPanelText = dark ? 'text-slate-300' : 'text-slate-700';
  const chip = dark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-600 border-slate-200';
  const linkText = dark ? 'text-slate-300 hover:text-electric-300' : 'text-navy-900 hover:text-electric-700';

  return (
    <div className={cn('rounded-3xl border overflow-hidden', surface)}>
      {/* TOPPLINJE */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-navy-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-electric-500/20 text-electric-300 border border-electric-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Autonom byggeleder
            </span>
            <span className="text-[11px] text-slate-300">
              Følger opp byggeplassene selv — morgen og kl. 15:30
            </span>
          </div>
          <h4 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <span>Dine forslag, klare til ett trykk</span>
            {pendingActions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold">
                {pendingActions.length} venter
              </span>
            )}
          </h4>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-1 bg-white/10 rounded-2xl flex items-center border border-white/15">
            <button
              type="button"
              onClick={() => handleToggleMode('copilot')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                mode === 'copilot' ? 'bg-electric-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              )}
              title="Agenten foreslår – du godkjenner med ett trykk"
            >
              <span>🟢 Assistent</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('autopilot')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                mode === 'autopilot' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              )}
              title="Rutinedagbøker uten avvik arkiveres automatisk"
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
            title="Kjør en umiddelbar sjekk av vær, timer, dagbok, avvik og tilleggsarbeid"
          >
            <RefreshCw size={13} className={isScanning ? 'animate-spin text-electric-400' : ''} />
            <span>{isScanning ? 'Sjekker…' : 'Sjekk status nå'}</span>
          </button>
        </div>
      </div>

      {/* KØ */}
      <div className="p-4 sm:p-5 space-y-3">
        {isLoading ? (
          <div className={cn('py-8 text-center text-xs flex items-center justify-center gap-2', faintText)}>
            <RefreshCw size={15} className="animate-spin text-electric-600" />
            <span>Sjekker forslag, vær og timer…</span>
          </div>
        ) : pendingActions.length === 0 ? (
          <div className={cn('p-5 rounded-2xl flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row', dark ? 'bg-emerald-950/40 border border-emerald-800/60' : 'bg-emerald-50/70 border border-emerald-200/80')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className={cn('text-xs font-bold', dark ? 'text-emerald-100' : 'text-emerald-950')}>Alt er à jour</div>
                <div className={cn('text-[11px] mt-0.5 leading-relaxed', dark ? 'text-emerald-200/90' : 'text-emerald-800')}>
                  Ingen forslag venter. MesterAI sjekker selv hver morgen og kl. 15:30, og sier ifra her
                  og på Discord/Slack hvis noe mangler.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTriggerCycle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              <RefreshCw size={12} className={isScanning ? 'animate-spin' : ''} />
              <span>Kjør sjekk nå</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className={cn('text-xs font-black uppercase tracking-wider flex items-center justify-between gap-2 flex-wrap', dark ? 'text-slate-400' : 'text-slate-400')}>
              <span>Klare til godkjenning ({pendingActions.length})</span>
              {routineCount > 0 && (
                <button
                  type="button"
                  disabled={isBulkApproving}
                  onClick={handleApproveAllRoutine}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer disabled:opacity-50 normal-case tracking-normal"
                  title="Godkjenner dagbøker, timepåminnelser og avviksoppgaver. Endringsordrer og tilbud vurderes alltid enkeltvis."
                >
                  <Zap size={12} />
                  <span>{isBulkApproving ? 'Godkjenner…' : `Godkjenn alt rutinearbeid (${routineCount})`}</span>
                </button>
              )}
            </div>

            {manualReviewCount > 0 && (
              <div className={cn('p-2.5 rounded-xl text-[11px] flex items-start gap-2', dark ? 'bg-amber-950/40 border border-amber-800/60 text-amber-200' : 'bg-amber-50 border border-amber-200 text-amber-900')}>
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>
                  {manualReviewCount} forslag har et beløp over godkjenningsgrensen
                  {settings?.approvalThresholdAmount ? ` (kr ${settings.approvalThresholdAmount.toLocaleString('no-NO')})` : ''}
                  . De må vurderes enkeltvis før de sendes til kunden.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2.5">
              {pendingActions.map((action) => {
                const isProcessing = processingId === action.id;
                const meta = TYPE_META[action.type] || { tone: 'bg-slate-600', icon: ShieldCheck };
                const Icon = meta.icon;

                return (
                  <div
                    key={action.id}
                    className={cn(
                      'p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs',
                      action.requiresManualReview ? itemWarn : itemBase
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs text-white', meta.tone)}>
                        <Icon size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn('text-xs font-black', titleText)}>{action.title}</span>
                          {action.priority === 'urgent' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                              Haster
                            </span>
                          )}
                          {action.impactAmount ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              +kr {Math.round(action.impactAmount).toLocaleString('no-NO')}
                            </span>
                          ) : null}
                          {action.requiresManualReview && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200 text-amber-900 border border-amber-300">
                              Vurder manuelt
                            </span>
                          )}
                        </div>

                        <div className={cn('text-[11px] leading-relaxed', bodyText)}>{action.description}</div>

                        {action.evidence && (
                          <div className={cn('text-[10px] mt-1 italic', faintText)}>Grunnlag: {action.evidence}</div>
                        )}

                        <div className="flex items-center gap-2 text-[10px] mt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onOpenProject?.(action.projectId)}
                            className={cn('font-bold px-2 py-0.5 rounded-md border', chip, onOpenProject && 'hover:border-electric-400 cursor-pointer')}
                          >
                            🏗️ {action.projectName}
                          </button>
                          <span className={faintText}>💡 {action.suggestedAction}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReject(action.id)}
                        className={cn(
                          'px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50',
                          dark
                            ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border-slate-700 hover:border-rose-800'
                            : 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 hover:border-rose-200'
                        )}
                      >
                        Avvis
                      </button>

                      {action.type === 'change_order_draft' && onOpenChangeOrder && (
                        <button
                          type="button"
                          onClick={() => onOpenChangeOrder(action.data)}
                          className={cn(
                            'px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                            dark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                          )}
                        >
                          Se utkast
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(action)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        <span>{isProcessing ? 'Godkjenner…' : 'Godkjenn'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VÆR */}
        <div className={cn('pt-2 border-t', divider)}>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowWeatherRadar(!showWeatherRadar)}
              className={cn('text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer py-1', linkText)}
            >
              <CloudSun size={15} className="text-amber-500" />
              <span>Vær for byggeplassene ({liveWeather.length} av {weatherStatuses.length})</span>
              {showWeatherRadar ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <span className={cn('text-[11px]', faintText)}>Open-Meteo sanntidsdata</span>
          </div>

          {showWeatherRadar && (
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {weatherStatuses.map((ws) => (
                <div
                  key={ws.projectId}
                  className={cn(
                    'p-3 rounded-xl border text-xs space-y-1.5',
                    !ws.isLive
                      ? dark
                        ? 'bg-slate-950/60 border-dashed border-slate-700 text-slate-400'
                        : 'bg-slate-100 border-dashed border-slate-300 text-slate-600'
                      : ws.riskLevel !== 'safe'
                        ? dark
                          ? 'bg-amber-950/40 border-amber-800/60 text-amber-100'
                          : 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : subPanel
                  )}
                >
                  <div className="flex items-center justify-between font-black gap-2">
                    <span className={cn('truncate', ws.isLive && ws.riskLevel === 'safe' ? titleText : '')}>{ws.projectName}</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[9px] uppercase shrink-0',
                        !ws.isLive
                          ? dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-300 text-slate-700'
                          : ws.riskLevel !== 'safe'
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-emerald-100 text-emerald-800'
                      )}
                    >
                      {!ws.isLive ? 'Mangler adresse' : ws.riskLevel !== 'safe' ? 'Risiko' : 'Trygt'}
                    </span>
                  </div>

                  {ws.isLive ? (
                    <>
                      <div className="flex items-center gap-3 text-[11px] font-bold">
                        <span>🌡️ {ws.temp}°C</span>
                        <span>🌧️ {ws.precipitationMm} mm</span>
                        <span>💨 {ws.windSpeedMs} m/s</span>
                      </div>
                      <p className={cn('text-[10px] leading-tight', ws.riskLevel !== 'safe' ? '' : bodyText)}>
                        {ws.riskReason || ws.workAdvice}
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] leading-tight">{ws.workAdvice}</p>
                  )}

                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleGenerateFDV(ws.projectId)}
                      disabled={generatingFdvForId === ws.projectId}
                      className={cn('text-[10px] font-bold flex items-center gap-1 cursor-pointer', dark ? 'text-electric-300 hover:text-electric-200' : 'text-electric-700 hover:text-electric-800')}
                      title="Generer ferdig FDV-sluttrapport for dette prosjektet"
                    >
                      <Printer size={11} />
                      <span>{generatingFdvForId === ws.projectId ? 'Genererer FDV…' : 'Generer FDV-perm'}</span>
                    </button>
                  </div>
                </div>
              ))}

              {weatherUnavailable > 0 && (
                <div className={cn('sm:col-span-2 md:col-span-3 p-2.5 rounded-xl border text-[11px] flex items-start gap-2', subPanel, subPanelText)}>
                  <Info size={13} className="mt-0.5 shrink-0 opacity-60" />
                  <span>
                    {weatherUnavailable} prosjekt mangler gateadresse, så vi henter ikke vær for dem — vi viser
                    aldri et annet steds vær som om det gjaldt din byggeplass. Legg inn adresse på prosjektet.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* INNSTILLINGER */}
        <div className={cn('pt-2 border-t', divider)}>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={cn('text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer py-1', linkText)}
          >
            <ShieldCheck size={14} className="opacity-60" />
            <span>Innstillinger for agenten</span>
            {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showSettings && settings && (
            <div className="mt-2.5 space-y-2 text-[11px]">
              <label className={cn('flex items-center justify-between gap-3 p-2.5 rounded-xl border', subPanel, subPanelText)}>
                <span>
                  <strong className={cn('block', titleText)}>Varsle i Discord/Slack</strong>
                  <span className={faintText}>Ett sammendrag når agenten har funnet noe.</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings.notifyDigest}
                  onChange={(e) => handleUpdateSettings({ notifyDigest: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </label>

              <label className={cn('flex items-center justify-between gap-3 p-2.5 rounded-xl border', subPanel, subPanelText)}>
                <span>
                  <strong className={cn('block', titleText)}>Varsle på e-post</strong>
                  <span className={faintText}>Til ledelsen i bedriften.</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings.notifyEmail}
                  onChange={(e) => handleUpdateSettings({ notifyEmail: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </label>

              <label className={cn('flex items-center justify-between gap-3 p-2.5 rounded-xl border', subPanel, subPanelText)}>
                <span>
                  <strong className={cn('block', titleText)}>Godkjenningsgrense (kr eks. mva)</strong>
                  <span className={faintText}>Forslag over dette må alltid vurderes manuelt.</span>
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={settings.approvalThresholdAmount}
                  onChange={(e) => handleUpdateSettings({ approvalThresholdAmount: Number(e.target.value) })}
                  className={cn('w-28 px-2 py-1 border rounded-lg text-right font-bold', dark ? 'bg-slate-900 border-slate-700 text-white' : 'border-slate-300')}
                />
              </label>

              <label className={cn('flex items-center justify-between gap-3 p-2.5 rounded-xl border', subPanel, subPanelText)}>
                <span>
                  <strong className={cn('block', titleText)}>Purr på åpne avvik etter</strong>
                  <span className={faintText}>Antall dager før avviket blir en oppgave.</span>
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.deviationReminderAfterDays}
                  onChange={(e) => handleUpdateSettings({ deviationReminderAfterDays: Number(e.target.value) })}
                  className={cn('w-20 px-2 py-1 border rounded-lg text-right font-bold', dark ? 'bg-slate-900 border-slate-700 text-white' : 'border-slate-300')}
                />
              </label>
            </div>
          )}
        </div>

        {/* AKTIVITETSLOGG */}
        <div className={cn('pt-2 border-t', divider)}>
          <button
            type="button"
            onClick={() => setShowLog(!showLog)}
            className={cn('text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer py-1', linkText)}
          >
            <Clock size={14} className="opacity-60" />
            <span>Aktivitetslogg ({recentActivities.length} hendelser)</span>
            {showLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showLog && (
            <div className="mt-2.5 max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {recentActivities.length === 0 ? (
                <div className={cn('text-[11px] py-2', faintText)}>Ingen hendelser logget ennå.</div>
              ) : (
                recentActivities.map((act, i) => (
                  <div key={act.id || i} className={cn('p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2', subPanel)}>
                    <div className="min-w-0">
                      <div className={cn('font-bold text-[11px] truncate', titleText)}>{act.title}</div>
                      <div className={cn('text-[10px] line-clamp-2', faintText)}>{act.description}</div>
                    </div>
                    <span className={cn('text-[9px] font-mono shrink-0', faintText)}>
                      {act.createdAt
                        ? new Date(act.createdAt).toLocaleString('no-NO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : ''}
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
