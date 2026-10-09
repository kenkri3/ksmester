import { getCollectionItems, saveCollectionItem, updateCollectionItem } from './db';
import { sendChangeOrderByEmail, sendOfferByEmail } from './emailSender';
import { resolveLocationCoords } from './weatherService';

/**
 * ⚡ MesterAI Autonom Byggeleder — motoren bak «Autopilot».
 *
 * Designprinsipper (lest før du endrer noe her):
 *
 *  1. **Håndverkeren skal gjøre mindre, ikke mer.** Alt motoren lager skal kunne
 *     avgjøres med ÉTT trykk. Derfor er alle handlinger ferdig utfylte forslag i
 *     godkjenningskøen (`pending_actions`) — aldri halvferdige skjemaer.
 *  2. **Aldri finn opp dokumentasjon.** En byggedagbok er juridisk bevis
 *     (Byggherreforskriften § 15). Vi lager derfor kun utkast fra reelle
 *     timelister, og vi skriver aldri en dagbok for en dag det ikke finnes førte
 *     timer for. Mangler timene, lager vi en PÅMINNELSE — vi dikter ikke opp
 *     bemanning, timer eller vær.
 *  3. **Motoren skal si ifra selv.** Ingen skal måtte huske å trykke «Sjekk status
 *     nå». Syklusen kjører derfor både morgen (06:00) og ettermiddag (15:30)
 *     norsk tid, og varsler til de kanalene bedriften faktisk har koblet til.
 *  4. **Ett forslag per prosjekt per dag.** En agent som maser blir slått av.
 *     Alle påminnelser er dagsnøklet og forsvinner av seg selv når de er ordnet.
 *  5. **Fail closed på penger og juss.** Alt over `approvalThresholdAmount`
 *     merkes «må godkjennes manuelt» og kan ikke auto-godkjennes.
 *  6. **Varsle sant.** Vi rapporterer bare kanaler vi faktisk fikk levert til.
 */

export type PendingActionType =
  | 'daily_log_draft'
  | 'weather_risk_alert'
  | 'change_order_draft'
  | 'compliance_notice'
  | 'offer_draft'
  | 'missing_time_entry'
  | 'missing_daily_log'
  | 'open_deviation';

export interface PendingAction {
  id: string;
  type: PendingActionType;
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
  /** Multi-tenant skille. Eldre rader kan mangle dette feltet. */
  companyId?: string;
  /** Satt når forslaget er så stort at det aldri skal auto-godkjennes. */
  requiresManualReview?: boolean;
  /** Hvorfor forslaget ble laget — vises i UI så brukeren kan etterprøve det. */
  evidence?: string;
}

export interface AutonomySettings {
  mode: 'copilot' | 'autopilot';
  maxAutoApproveAmount: number;
  autoApproveRoutineDailyLogs: boolean;
  weatherAlertThresholdMm: number;
  notifyDiscord: boolean;
  notifySlack: boolean;
  notifyEmail: boolean;
  /** Send ett sammendrag til kanalene når syklusen har funnet noe. */
  notifyDigest: boolean;
  /** Minste beløp (eks. mva) som alltid må godkjennes av et menneske. */
  approvalThresholdAmount: number;
  /** Time (norsk tid) for ettermiddagssyklusen. */
  endOfDayHour: number;
  /** Minutt (norsk tid) for ettermiddagssyklusen. */
  endOfDayMinute: number;
  /** Hvor mange dager et åpent avvik får ligge før det purres. */
  deviationReminderAfterDays: number;
}

export interface ProjectWeatherStatus {
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
  weatherDescription?: string;
  /**
   * `false` betyr at vi ikke klarte å finne stedet eller hente vær. Da MÅ ikke
   * tallene presenteres som om de gjelder prosjektet.
   */
  isLive: boolean;
}

export interface AutonomyCycleResult {
  executedAt: string;
  isLiveWeather: boolean;
  weatherChecksCount: number;
  weatherAlertsCreated: number;
  dailyLogsDrafted: number;
  dailyLogsAutoApproved: number;
  changeOrdersDetected: number;
  missingTimeEntriesFlagged: number;
  missingDailyLogsFlagged: number;
  openDeviationsFlagged: number;
  staleProposalsDismissed: number;
  notificationsSent: string[];
  pendingActionsTotal: number;
  skippedReason?: string;
}

const DEFAULT_AUTONOMY_SETTINGS: AutonomySettings = {
  mode: 'copilot',
  maxAutoApproveAmount: 5000,
  autoApproveRoutineDailyLogs: false,
  weatherAlertThresholdMm: 8,
  notifyDiscord: true,
  notifySlack: true,
  notifyEmail: false,
  notifyDigest: true,
  approvalThresholdAmount: 25000,
  endOfDayHour: 15,
  endOfDayMinute: 30,
  deviationReminderAfterDays: 3
};

/** Hvor mange prosjekter vi henter vær for i én syklus (begrenser API-kall). */
const MAX_WEATHER_PROJECTS = 10;
/** Hvor mange dager tilbake vi leter etter glemt timeføring. */
const MISSING_TIME_LOOKBACK_DAYS = 4;
/** Minste antall stille dager før vi purrer på manglende timeføring. */
const SILENT_PROJECT_AFTER_DAYS = 2;
/** Én reell syklus per dette antall minutter, med mindre force=true. */
const CYCLE_MIN_INTERVAL_MINUTES = 45;

// ---------------------------------------------------------------------------
// Tid — alle datoer regnes i Europe/Oslo, ikke UTC, ellers blir døgnet feil.
// ---------------------------------------------------------------------------

/** ISO-dato (YYYY-MM-DD) i norsk tid. */
export function osloDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(at);
}

/** Time (0-23) i norsk tid. */
export function osloHour(at: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false }).format(at));
}

/** Minutt (0-59) i norsk tid. */
export function osloMinute(at: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', minute: '2-digit' }).format(at));
}

/** Ukedag i norsk tid: 1 = mandag … 7 = søndag. */
export function osloWeekday(at: Date = new Date()): number {
  const name = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', weekday: 'short' }).format(at);
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(name) + 1;
}

export function isoAddDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T12:00:00Z`).getTime();
  const b = new Date(`${toIso}T12:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/** Siste virkedag (man–fre) før `isoDate`. */
function previousWorkday(isoDate: string): string {
  let cursor = isoDate;
  for (let i = 0; i < 5; i++) {
    cursor = isoAddDays(cursor, -1);
    const dow = new Date(`${cursor}T12:00:00Z`).getUTCDay(); // 0 = søndag, 6 = lørdag
    if (dow !== 0 && dow !== 6) return cursor;
  }
  return isoAddDays(isoDate, -1);
}

function isWeekend(isoDate: string): boolean {
  const dow = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
}

/** Dato-delen av en vilkårlig verdi som YYYY-MM-DD. Tom streng hvis den ikke kan leses. */
function dateKey(value: any): string {
  if (!value) return '';
  const iso = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
}

/** Dato-delen av en vilkårlig verdi, med fallback via parsing. */
function dayOf(value: any): string {
  const key = dateKey(value);
  if (key) return key;
  const parsed = new Date(String(value || ''));
  return Number.isNaN(parsed.getTime()) ? '' : osloDate(parsed);
}

// ---------------------------------------------------------------------------
// Innstillinger
// ---------------------------------------------------------------------------

export async function getAutonomySettings(): Promise<AutonomySettings> {
  try {
    const settingsList = await getCollectionItems('app_settings');
    const existing = settingsList.find((s: any) => s.id === 'autonomy_config');
    if (existing) {
      return { ...DEFAULT_AUTONOMY_SETTINGS, ...existing };
    }
  } catch (e: any) {
    console.warn('[Autonomy] Kunne ikke lese innstillinger, bruker standard:', e.message);
  }
  return DEFAULT_AUTONOMY_SETTINGS;
}

export async function saveAutonomySettings(newSettings: Partial<AutonomySettings>): Promise<AutonomySettings> {
  const current = await getAutonomySettings();
  const updated: AutonomySettings = { ...current, ...newSettings };
  await saveCollectionItem('app_settings', {
    id: 'autonomy_config',
    ...updated,
    updatedAt: new Date().toISOString()
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Godkjenningskø
// ---------------------------------------------------------------------------

/**
 * Henter ventende handlinger, isolert per bedrift.
 *
 * 🛡️ Uten `companyId` returneres kun rader som ikke er knyttet til en bedrift.
 * Vi faller ALDRI tilbake til «vis alt»: en håndverker skal ikke se en annen
 * bedrifts byggeplass, og skal slett ikke kunne godkjenne dens endringsordre.
 */
export async function getPendingActions(companyId?: string): Promise<PendingAction[]> {
  try {
    const allActions = await getCollectionItems('pending_actions');
    const today = osloDate();
    const validActions: PendingAction[] = [];

    for (const a of allActions) {
      if (a.status !== 'pending') continue;
      if (companyId && a.companyId && a.companyId !== companyId) continue;
      if (!companyId && a.companyId) continue;

      // Utgåtte værvarsler: datoen de gjelder er passert.
      if (a.type === 'weather_risk_alert') {
        const forecastDate = dateKey(a.data?.forecastDate) || dateKey(a.forecastDate);
        if (forecastDate && forecastDate < today) {
          await updateCollectionItem('pending_actions', a.id, {
            status: 'auto_executed',
            autoDismissedReason: 'Værvarseldatoen er passert.'
          }).catch((e: any) => console.warn('[Autonomy] Kunne ikke arkivere utgått værvarsel:', e.message));
          continue;
        }
      }

      validActions.push(a);
    }

    return validActions.sort(
      (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  } catch (e: any) {
    console.warn('[Autonomy] Kunne ikke hente godkjenningskø:', e.message);
    return [];
  }
}

/**
 * Har vi allerede laget dette forslaget? Da lager vi det ikke igjen.
 *
 * Sjekken er bevisst mindre streng enn en ren id-sammenligning: et
 * påminnelses-forslag huskes også på tvers av døgn, slik at agenten ikke legger
 * inn «før timene»-oppfordringen på nytt hver eneste dag for samme prosjekt.
 * Brukeren fjerner den ved å trykke Avvis eller Godkjenn.
 */
function actionExists(actions: any[], id: string): boolean {
  if (actions.some((a: any) => a.id === id)) return true;

  const reminderKey = reminderIdentity(id);
  if (!reminderKey) return false;

  return actions.some((a: any) => {
    if (typeof a?.id !== 'string') return false;
    const existingKey = reminderIdentity(a.id);
    if (!existingKey || existingKey !== reminderKey) return false;
    // Et avvist forslag skal ikke komme tilbake før det har gått en uke.
    if (a.status === 'rejected') {
      const rejectedAt = new Date(a.rejectedAt || a.createdAt || 0).getTime();
      return Date.now() - rejectedAt < 7 * 86400000;
    }
    return true;
  });
}

/**
 * Trekker ut «prosjekt + hva påminnelsen gjelder» fra en id, slik at
 * `reminder-missing_daily_log-<prosjekt>-<dato>` og samme id med en annen dato
 * regnes som samme påminnelse.
 */
function reminderIdentity(id: string): string | null {
  const match = /^reminder-(missing_time_entry|missing_daily_log|open_deviation)-(.+)$/.exec(id);
  if (!match) return null;
  const [, kind, rest] = match;
  if (kind === 'open_deviation') return `${kind}:${rest}`;
  // Fjern avsluttende dato (YYYY-MM-DD) fra resten.
  const withoutDate = rest.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  return `${kind}:${withoutDate}`;
}

/**
 * Rydder bort forslag som ikke lenger er sanne, slik at køen ikke fylles av ting
 * brukeren allerede har ordnet opp i.
 *
 * Dette er selvhelbredelsen: agenten skal ikke be om godkjenning på noe som er
 * løst, og skal ikke påstå noe den ikke kan bevise.
 */
async function dismissStaleProposals(actions: any[], companyId?: string): Promise<number> {
  const today = osloDate();
  let dismissed = 0;

  const [timeEntries, dailyLogs, deviations] = await Promise.all([
    getCollectionItems('time_entries').catch(() => []),
    getCollectionItems('daily_logs').catch(() => []),
    getCollectionItems('deviations').catch(() => [])
  ]);

  for (const action of actions) {
    if (action.status !== 'pending') continue;
    if (companyId && action.companyId && action.companyId !== companyId) continue;
    let reason: string | null = null;

    if (action.type === 'missing_time_entry') {
      const since = dateKey(action.data?.sinceDate) || isoAddDays(today, -MISSING_TIME_LOOKBACK_DAYS);
      const hasEntry = timeEntries.some((te: any) =>
        te.projectId === action.projectId &&
        dayOf(te.date || te.createdAt) >= since &&
        dayOf(te.date || te.createdAt) <= today
      );
      if (hasEntry) reason = 'Timer er ført etter at påminnelsen ble laget.';
    } else if (action.type === 'missing_daily_log') {
      const missingDate = dateKey(action.data?.date);
      if (missingDate) {
        const hasLog = dailyLogs.some((dl: any) =>
          dl.projectId === action.projectId && dayOf(dl.date || dl.createdAt) === missingDate
        );
        if (hasLog) reason = 'Byggedagboken er ført likevel.';
      }
    } else if (action.type === 'open_deviation') {
      const deviation = deviations.find((d: any) => d.id === action.data?.deviationId);
      if (deviation && ['closed', 'lukket'].includes(String(deviation.status || ''))) {
        reason = 'Avviket er lukket.';
      }
    }

    if (reason) {
      await updateCollectionItem('pending_actions', action.id, {
        status: 'auto_executed',
        autoDismissedReason: reason
      }).catch((e: any) => console.warn('[Autonomy] Kunne ikke arkivere utdatert forslag:', e.message));
      dismissed++;
    }
  }

  return dismissed;
}

// ---------------------------------------------------------------------------
// Godkjenning / avvisning
// ---------------------------------------------------------------------------

/**
 * 🛡️ Siste sjekk før noe får status «godkjent».
 *
 * Et forslag kan ha ligget i køen i flere døgn. Da er det ikke sikkert at det
 * fortsatt stemmer — prosjektet kan være avsluttet, eller avviket lukket. Vi
 * godkjenner uansett (brukeren har trykket), men vi sier tydelig ifra.
 */
async function buildApprovalCaveat(action: any): Promise<string> {
  const caveats: string[] = [];
  try {
    const projects = await getCollectionItems('projects').catch(() => []);
    const project = projects.find((p: any) => p.id === action.projectId);
    if (!project) {
      caveats.push('prosjektet finnes ikke lenger i systemet');
    } else if (project.status === 'completed' || project.status === 'archived') {
      caveats.push(`prosjektet er markert som «${project.status}»`);
    }

    if (action.type === 'open_deviation' && action.data?.deviationId) {
      const deviations = await getCollectionItems('deviations').catch(() => []);
      const deviation = deviations.find((d: any) => d.id === action.data.deviationId);
      if (!deviation) caveats.push('avviket finnes ikke lenger');
      else if (['closed', 'lukket'].includes(String(deviation.status || ''))) caveats.push('avviket var allerede lukket');
    }

    if (action.type === 'missing_time_entry') {
      const timeEntries = await getCollectionItems('time_entries').catch(() => []);
      const since = dateKey(action.data?.sinceDate);
      const hasEntry = since && timeEntries.some((te: any) =>
        te.projectId === action.projectId && dayOf(te.date || te.createdAt) >= since
      );
      if (hasEntry) caveats.push('det er ført timer på prosjektet etter at påminnelsen ble laget');
    }
  } catch (e: any) {
    console.warn('[Autonomy] Kunne ikke verifisere forslag før godkjenning:', e.message);
  }

  if (caveats.length === 0) return '';
  return ` ⚠️ Merk: ${caveats.join(', ')}.`;
}

/** Slår opp kundeopplysninger på prosjektet når forslaget ikke har dem. */
async function resolveClient(action: any): Promise<{
  clientEmail: string;
  clientName: string;
  companyName: string;
  projectId: string;
  projectName: string;
}> {
  let clientEmail = action.data?.clientEmail || action.data?.customerEmail || action.data?.email || '';
  let clientName = action.data?.clientName || action.data?.customerName || '';
  let companyName = action.data?.companyName || '';

  if (!clientEmail && action.projectId) {
    try {
      const projects = await getCollectionItems('projects');
      const project = projects.find((p: any) => p.id === action.projectId);
      if (project) {
        clientEmail = clientEmail || project.clientEmail || project.customerEmail || project.contactEmail || '';
        clientName = clientName || project.clientName || project.customerName || '';
        companyName = companyName || project.companyName || project.company || '';
      }
    } catch (e: any) {
      console.warn('[autonomousAgent] Kunne ikke hente prosjekt for kunde-e-post:', e.message);
    }
  }

  return { clientEmail, clientName, companyName, projectId: action.projectId, projectName: action.projectName };
}

function todayKey(): string {
  return osloDate().replace(/-/g, '');
}

/**
 * 1-klikks godkjenning av en autonom handling.
 */
export async function approveAction(
  actionId: string,
  approvedBy: string = 'Byggmester',
  companyId?: string
): Promise<{ success: boolean; message: string; data?: any }> {
  const allActions = await getCollectionItems('pending_actions');
  const action = allActions.find((a: any) => a.id === actionId);

  if (!action) {
    throw new Error(`Handling ${actionId} ble ikke funnet.`);
  }
  if (companyId && action.companyId && action.companyId !== companyId) {
    throw new Error('Handlingen tilhører en annen bedrift.');
  }
  if (action.status === 'approved') {
    return { success: true, message: 'Handlingen var allerede godkjent.', data: action.data };
  }

  const now = new Date().toISOString();
  const caveat = await buildApprovalCaveat(action);

  // 1. Byggedagbok: lås inn i daily_logs
  if (action.type === 'daily_log_draft' || action.type === 'missing_daily_log') {
    const logDate = dateKey(action.data?.date) || osloDate();
    const dailyLogData = {
      ...(action.data || {}),
      id: `daily-log-${action.projectId}-${logDate}`,
      projectId: action.projectId,
      projectName: action.projectName,
      companyId: action.companyId,
      date: logDate,
      inspectedBy: approvedBy,
      signedAt: now,
      status: 'approved',
      autoGenerated: true,
      createdAt: now
    };
    await saveCollectionItem('daily_logs', dailyLogData);

    await updateCollectionItem('pending_actions', actionId, {
      status: 'approved',
      approvedBy,
      approvedAt: now
    });

    await saveCollectionItem('agent_activities', {
      type: 'daily_log_approved',
      title: `Byggedagbok godkjent: ${action.projectName}`,
      description: `Godkjent av ${approvedBy}. ${dailyLogData.crewCount || 0} fagarbeidere, ${dailyLogData.totalHoursWorked || 0} timer logget.`,
      projectId: action.projectId,
      projectName: action.projectName,
      companyId: action.companyId,
      badge: 'JURIDISK GYLDIG',
      status: 'approved',
      createdAt: now
    });

    return {
      success: true,
      message: `Byggedagbok for ${action.projectName} er godkjent og arkivert iht. Byggherreforskriften § 15.${caveat}`,
      data: dailyLogData
    };
  }

  // 2. Endringsordre (NS 8406 pkt. 19.2)
  if (action.type === 'change_order_draft') {
    const resolved = await resolveClient(action);
    // Utkastet har status 'draft'. Den godkjente posten skal være en ekte
    // endringsordre med en brukbar id, slik at kundelenken og oppslaget virker.
    const { draftId: _draftId, ...draftRest } = (action.data || {}) as any;
    const changeOrderData = {
      ...draftRest,
      id: draftRest?.id || `co-auto-${action.id}`,
      ...resolved,
      companyId: action.companyId || draftRest?.companyId,
      status: 'approved',
      approvedBy,
      approvedAt: now
    };
    await saveCollectionItem('change_orders', changeOrderData);

    await updateCollectionItem('pending_actions', actionId, {
      status: 'approved',
      approvedBy,
      approvedAt: now
    });

    let emailNotice = '';
    if (resolved.clientEmail) {
      const replyTo = action.data?.replyTo || action.data?.senderEmail || action.data?.companyEmail || action.data?.userEmail;
      try {
        const emailRes = await sendChangeOrderByEmail({
          changeOrder: changeOrderData,
          clientEmail: resolved.clientEmail,
          clientName: resolved.clientName,
          companyName: resolved.companyName,
          authorName: approvedBy,
          replyTo: replyTo || undefined,
          senderEmail: replyTo || undefined
        });
        emailNotice = emailRes.success
          ? ` og automatisk sendt på e-post til ${resolved.clientEmail} (Resend ID: ${emailRes.resendId || emailRes.id}).`
          : ` (Merk: E-post ble ikke levert: ${emailRes.message || emailRes.error || 'Ukjent feil'})`;
      } catch (err: any) {
        console.error('[autonomousAgent] Kunne ikke sende endringsordre på e-post:', err);
        emailNotice = ` (Feil ved e-postsending: ${err.message})`;
      }
    } else {
      emailNotice = ' Ingen kunde-e-post funnet på prosjektet — endringsordren ligger klar for manuell utsending.';
    }

    await saveCollectionItem('agent_activities', {
      type: 'change_order_approved',
      title: `Endringsordre godkjent: ${action.title}`,
      description: `Endringsordre på kr ${(changeOrderData.amountExVat || action.impactAmount || 0).toLocaleString('no-NO')} eks mva godkjent for utsendelse.${emailNotice}`,
      projectId: action.projectId,
      projectName: action.projectName,
      companyId: action.companyId,
      badge: emailNotice.includes('automatisk sendt') ? 'NS 8406 SENDT' : 'NS 8406 GODKJENT',
      status: 'approved',
      createdAt: now
    });

    return {
      success: true,
      message: `Endringsordre «${action.title}» er godkjent.${emailNotice}${caveat}`,
      data: changeOrderData
    };
  }

  // 3. Pristilbud
  if (action.type === 'offer_draft') {
    const resolved = await resolveClient(action);
    const offerData = {
      ...action.data,
      ...resolved,
      companyId: action.companyId,
      status: 'approved',
      approvedBy,
      approvedAt: now
    };
    await saveCollectionItem('offers', offerData);

    await updateCollectionItem('pending_actions', actionId, {
      status: 'approved',
      approvedBy,
      approvedAt: now
    });

    let emailNotice = '';
    if (resolved.clientEmail) {
      const replyTo = action.data?.replyTo || action.data?.senderEmail || action.data?.companyEmail || action.data?.userEmail;
      try {
        const emailRes = await sendOfferByEmail({
          offer: offerData,
          clientEmail: resolved.clientEmail,
          clientName: resolved.clientName,
          companyName: resolved.companyName,
          authorName: approvedBy,
          replyTo: replyTo || undefined,
          senderEmail: replyTo || undefined
        });
        emailNotice = emailRes.success
          ? ` og automatisk oversendt på e-post til ${resolved.clientEmail} (Resend ID: ${emailRes.resendId || emailRes.id}).`
          : ` (Merk: E-post ble ikke levert: ${emailRes.message || emailRes.error || 'Ukjent feil'})`;
      } catch (err: any) {
        console.error('[autonomousAgent] Kunne ikke sende tilbud på e-post:', err);
        emailNotice = ` (Feil ved e-postsending: ${err.message})`;
      }
    }

    await saveCollectionItem('agent_activities', {
      type: 'offer_approved',
      title: `Pristilbud godkjent: ${action.title}`,
      description: `Pristilbud på kr ${(offerData.totalAmount || action.impactAmount || 0).toLocaleString('no-NO')} godkjent.${emailNotice}`,
      projectId: action.projectId,
      projectName: action.projectName,
      companyId: action.companyId,
      badge: emailNotice.includes('automatisk oversendt') ? 'TILBUD SENDT' : 'TILBUD GODKJENT',
      status: 'approved',
      createdAt: now
    });

    return {
      success: true,
      message: `Pristilbud «${action.title}» er godkjent og aktivert.${emailNotice}${caveat}`,
      data: offerData
    };
  }

  // 4. Værvarsel: kvittering for omdisponering
  if (action.type === 'weather_risk_alert') {
    await updateCollectionItem('pending_actions', actionId, {
      status: 'approved',
      acknowledgedBy: approvedBy,
      acknowledgedAt: now
    });

    await saveCollectionItem('agent_activities', {
      type: 'weather_warning_acknowledged',
      title: `Væromdisponering kvittert ut: ${action.projectName}`,
      description: `${approvedBy} har bekreftet omdisponeringsrådet for prosjektet pga. værforhold.`,
      projectId: action.projectId,
      projectName: action.projectName,
      companyId: action.companyId,
      badge: 'VÆRSIKRET',
      status: 'approved',
      createdAt: now
    });

    return { success: true, message: `Væromdisponering for ${action.projectName} er kvittert ut og logget.${caveat}` };
  }

  // 5. Manglende timeføring: vi kan ikke føre timer for noen. Vi lager i stedet
  //    en konkret oppgave, slik at det havner i håndverkerens egen oppgaveliste.
  if (action.type === 'missing_time_entry') {
    const task = {
      id: `task-timeforing-${action.projectId}-${todayKey()}`,
      projectId: action.projectId,
      projectName: action.projectName,
      companyId: action.companyId,
      title: `Før timer for ${action.projectName}`,
      description: `MesterAI oppdaget at det ikke er ført timer på prosjektet siden ${action.data?.sinceDate || 'flere dager tilbake'}. Før timene, slik at byggedagboken og fakturagrunnlaget blir riktig.`,
      assignedTo: action.data?.assignedTo || '',
      priority: 'high',
      status: 'pending',
      deadline: osloDate(),
      createdBy: 'MesterAI Autonom Byggeleder',
      createdAt: now
    };
    await saveCollectionItem('tasks', task);

    await updateCollectionItem('pending_actions', actionId, {
      status: 'approved',
      approvedBy,
      approvedAt: now
    });

    await saveCollectionItem('agent_activities', {
      type: 'missing_time_entry_escalated',
      title: `Oppgave opprettet: før timer for ${action.projectName}`,
      description: `Opprettet av ${approvedBy} fra MesterAI-påminnelsen.`,
      projectId: action.projectId,
      projectName: action.projectName,
      companyId: action.companyId,
      badge: 'OPPGAVE OPPRETTET',
      status: 'approved',
      createdAt: now
    });

    return { success: true, message: `Oppgave «Før timer for ${action.projectName}» er opprettet.${caveat}` };
  }

  // 6. Åpent avvik: kvittering + oppgave om utbedring
  if (action.type === 'open_deviation') {
    const task = {
      id: `task-avvik-${action.data?.deviationId || action.projectId}-${todayKey()}`,
      projectId: action.projectId,
      projectName: action.projectName,
      companyId: action.companyId,
      title: `Utbedre avvik: ${action.data?.deviationTitle || action.title}`,
      description: `${action.data?.correctiveAction || action.description}\n\nÅpent siden ${action.data?.deviationCreatedAt || 'ukjent'}. Dokumentert iht. Internkontrollforskriften § 5.`,
      assignedTo: action.data?.reportedBy || '',
      priority: action.priority === 'urgent' ? 'urgent' : 'high',
      status: 'pending',
      deadline: isoAddDays(osloDate(), 3),
      createdBy: 'MesterAI Autonom Byggeleder',
      createdAt: now
    };
    await saveCollectionItem('tasks', task);

    await updateCollectionItem('pending_actions', actionId, {
      status: 'approved',
      approvedBy,
      approvedAt: now
    });

    await saveCollectionItem('agent_activities', {
      type: 'open_deviation_escalated',
      title: `Utbedringsoppgave opprettet: ${action.projectName}`,
      description: `Åpent avvik fra ${action.data?.deviationCreatedAt || 'tidligere'} er nå en tildelt oppgave.`,
      projectId: action.projectId,
      projectName: action.projectName,
      companyId: action.companyId,
      badge: 'AVVIK TIL OPPFØLGING',
      status: 'approved',
      createdAt: now
    });

    return { success: true, message: `Utbedringsoppgave for «${action.data?.deviationTitle || action.title}» er opprettet.${caveat}` };
  }

  // Generell godkjenning for øvrige typer
  await updateCollectionItem('pending_actions', actionId, {
    status: 'approved',
    approvedBy,
    approvedAt: now
  });

  return { success: true, message: `Handling «${action.title}» er godkjent.${caveat}` };
}

export async function rejectAction(
  actionId: string,
  rejectedBy: string = 'Byggmester',
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const now = new Date().toISOString();
  await updateCollectionItem('pending_actions', actionId, {
    status: 'rejected',
    rejectedBy,
    rejectedAt: now,
    rejectionReason: reason || 'Avvist av leder'
  });

  return { success: true, message: 'Forslaget er avvist og fjernet fra køen.' };
}

/**
 * Godkjenner flere forslag i én operasjon. Håndverkeren har ikke tid til femten
 * enkelttrykk på en telefon med hansker på.
 */
export async function approveActions(
  actionIds: string[],
  approvedBy: string,
  companyId?: string
): Promise<{ approved: { id: string; message: string }[]; failed: { id: string; error: string }[] }> {
  const approved: { id: string; message: string }[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const id of actionIds.slice(0, 50)) {
    try {
      const res = await approveAction(id, approvedBy, companyId);
      approved.push({ id, message: res.message });
    } catch (e: any) {
      failed.push({ id, error: e.message || 'Ukjent feil' });
    }
  }

  return { approved, failed };
}

// ---------------------------------------------------------------------------
// Vær
// ---------------------------------------------------------------------------

/**
 * Sanntids vær og risikovurdering for aktive prosjekter.
 *
 * 🛡️ Viktig: ukjente steder får IKKE Oslo-vær presentert som sitt eget.
 * `isLive: false` betyr at tallene ikke kan brukes som dokumentasjon.
 */
export async function getProjectsWeatherStatus(companyId?: string): Promise<ProjectWeatherStatus[]> {
  try {
    const projects = await getCollectionItems('projects');
    const activeProjects = projects
      .filter((p: any) => p.status === 'active' || !p.status)
      .filter((p: any) => !companyId || !p.companyId || p.companyId === companyId);

    const statuses: ProjectWeatherStatus[] = [];

    for (const proj of activeProjects.slice(0, MAX_WEATHER_PROJECTS)) {
      const location = proj.address || proj.location || '';
      const coords = resolveLocationCoords(location);

      // Ukjent sted: vi har ikke prosjektets egne koordinater. Da henter vi ikke
      // et annet steds vær og later som det er prosjektets.
      if (!coords.matched) {
        statuses.push({
          projectId: proj.id,
          projectName: proj.name,
          location: location || 'Ukjent sted',
          temp: 0,
          precipitationMm: 0,
          windSpeedMs: 0,
          condition: 'Ukjent',
          riskLevel: 'safe',
          workAdvice: `Kunne ikke finne koordinater for «${location || 'prosjektet'}». Legg inn en gateadresse på prosjektet for automatisk vær- og frostsjekk.`,
          forecastDate: osloDate(),
          weatherDescription: 'Værdata utilgjengelig',
          isLive: false
        });
        continue;
      }

      try {
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,wind_speed_10m_max,weather_code&wind_speed_unit=ms&timezone=Europe%2FOslo`;
        const res = await fetch(apiUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4000)
        });
        if (!res.ok) continue;

        const json = await res.json();
        const daily = json.daily || {};
        if (!Array.isArray(daily.time) || daily.time.length === 0) continue;

        const todayMinTemp = daily.temperature_2m_min?.[0];
        const todayMaxTemp = daily.temperature_2m_max?.[0];
        const todayPrecip = daily.precipitation_sum?.[0];
        const todayWind = daily.wind_speed_10m_max?.[0];
        const todayCode = daily.weather_code?.[0] ?? 1;
        const todayDate = dateKey(daily.time?.[0]) || osloDate();

        const tmrwMinTemp = daily.temperature_2m_min?.[1] ?? todayMinTemp;
        const tmrwMaxTemp = daily.temperature_2m_max?.[1] ?? todayMaxTemp;
        const tmrwPrecip = daily.precipitation_sum?.[1] ?? todayPrecip;
        const tmrwWind = daily.wind_speed_10m_max?.[1] ?? todayWind;
        const tmrwDate = dateKey(daily.time?.[1]) || isoAddDays(todayDate, 1);

        // Ufullstendig svar fra Open-Meteo skal ikke presenteres som måling.
        if (typeof todayMinTemp !== 'number' || typeof todayWind !== 'number') continue;

        let riskLevel: 'safe' | 'warning' | 'critical' = 'safe';
        let riskReason: string | undefined;
        let workAdvice = 'Stabile og gode arbeidsforhold for både utendørs og innendørs arbeid.';
        let forecastDate = todayDate;

        // Reelle sikkerhetsgrenser for byggeplass (Arbeidstilsynet / NS):
        //   vind >= 17 m/s  → stans i høyden (sterk kuling/storm)
        //   vind >= 14 m/s  → varsel ved kraning og stillasarbeid (stiv kuling)
        //   nedbør >= 15 mm → fare for vanninntrenging
        //   temp < 0 °C     → frostfare i fersk mørtel/støp
        if (todayMinTemp < 0) {
          riskLevel = todayMinTemp < -5 ? 'critical' : 'warning';
          riskReason = `Minusgrader i dag (${todayMinTemp}°C): Fare for frost i fersk støp/mørtel og glatt stillas.`;
          workAdvice = 'Utsett utvendig betong- og fasadearbeid, eller benytt vintertilsetning og aktiv tildekking.';
        } else if (todayPrecip >= 15) {
          riskLevel = 'critical';
          riskReason = `Kraftig nedbør i dag (${todayPrecip} mm meldt): Fare for vanninntrenging og fuktskader.`;
          workAdvice = 'Takarbeid og åpne konstruksjoner må tildekkes umiddelbart. Prioriter innvendige tømrerarbeider.';
        } else if (todayWind >= 17) {
          riskLevel = 'critical';
          riskReason = `Sterk kuling / storm i dag (${Math.round(todayWind * 10) / 10} m/s): Fare ved stillasarbeid, taktekking og kraning.`;
          workAdvice = 'Stans arbeid i høyden. Sikre alle løse presenninger, plater og verktøy umiddelbart.';
        } else if (todayWind >= 14) {
          riskLevel = 'warning';
          riskReason = `Stiv kuling i dag (${Math.round(todayWind * 10) / 10} m/s): Fare ved stillasarbeid og kraning av plater.`;
          workAdvice = 'Sikre alle løse presenninger, plater og verktøy. Vurder stans i kraning og arbeid i høyden.';
        } else if (tmrwMinTemp < 0) {
          riskLevel = tmrwMinTemp < -5 ? 'critical' : 'warning';
          riskReason = `Meldt kulde i morgen (${tmrwDate}, ${tmrwMinTemp}°C): Frostfare i mørtel og støp.`;
          workAdvice = 'Planlegg tildekking eller innvendig arbeid for morgendagen.';
          forecastDate = tmrwDate;
        } else if (tmrwPrecip >= 15) {
          riskLevel = 'critical';
          riskReason = `Meldt kraftig nedbør i morgen (${tmrwDate}, ${tmrwPrecip} mm): Fare for fuktskader.`;
          workAdvice = 'Tildekk åpne konstruksjoner og klargjør innvendige oppgaver før i morgen.';
          forecastDate = tmrwDate;
        } else if (tmrwWind >= 17) {
          riskLevel = 'critical';
          riskReason = `Meldt sterk kuling/storm i morgen (${tmrwDate}, ${Math.round(tmrwWind * 10) / 10} m/s): Ekstrem vind i høyden.`;
          workAdvice = 'Sikre stillaser og byggeplass i ettermiddag for morgendagens vind.';
          forecastDate = tmrwDate;
        } else if (tmrwWind >= 14) {
          riskLevel = 'warning';
          riskReason = `Meldt stiv kuling i morgen (${tmrwDate}, ${Math.round(tmrwWind * 10) / 10} m/s): Vindkast ved stillasarbeid.`;
          workAdvice = 'Sikre presenninger og materiell før arbeidsdagens slutt.';
          forecastDate = tmrwDate;
        }

        let condition = 'Opphold';
        if (todayPrecip > 2) condition = 'Regn';
        else if (todayMinTemp < 0) condition = 'Kuldegrader';
        else if (todayCode === 0) condition = 'Sol / Klart';
        else if (todayCode >= 1 && todayCode <= 2) condition = 'Lettskyet / Sol';
        else if (todayCode === 3) condition = 'Overskyet';
        else if (todayCode >= 51 && todayCode <= 67) condition = 'Lett regn / Yr';

        const avgTemp = Math.round((todayMinTemp + todayMaxTemp) / 2);
        const windMs = Math.round(todayWind * 10) / 10;
        const precipMm = Math.round((todayPrecip || 0) * 10) / 10;

        statuses.push({
          projectId: proj.id,
          projectName: proj.name,
          location: location || coords.name,
          temp: avgTemp,
          precipitationMm: precipMm,
          windSpeedMs: windMs,
          condition,
          riskLevel,
          riskReason,
          workAdvice,
          forecastDate,
          weatherDescription: `${condition}, ${avgTemp}°C, ${windMs} m/s vind${precipMm > 0 ? `, ${precipMm} mm nedbør` : ''}`,
          isLive: true
        });
      } catch (err: any) {
        console.warn(`[Autonomy Weather] Kunne ikke hente vær for ${proj.name}:`, err.message);
      }
    }

    return statuses;
  } catch (e: any) {
    console.error('[Autonomy] Feil ved sjekk av prosjektvær:', e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Timepris fra bedriftens EGNE data
// ---------------------------------------------------------------------------

const FALLBACK_HOURLY_RATES: Record<string, number> = {
  tømrer: 890,
  tømrerarbeid: 890,
  snekker: 890,
  rørlegger: 980,
  elektriker: 950,
  flislegger: 900,
  maler: 850,
  murer: 900,
  blikkenslager: 950,
  maskinfører: 950
};

/**
 * Beregner timepris fra bedriftens egne tidligere tilbud i stedet for et
 * hardkodet tall. Faller tilbake på en fagpris kun når bedriften ikke har
 * historikk — og sier det i `source`, slik at tallet kan etterprøves.
 */
export async function estimateHourlyRate(
  companyId: string | undefined,
  trade: string
): Promise<{ rate: number; source: string; sampleSize: number }> {
  const hourlyUnitRe = /^(time|timer|t|timeverk|timepris)$/i;
  const hourlyTextRe = /timepris|pr\.?\s*time|per\s+time|timespris/i;

  try {
    const offers = await getCollectionItems('offers').catch(() => []);
    const rates: number[] = [];

    for (const offer of offers) {
      if (companyId && offer.companyId && offer.companyId !== companyId) continue;
      const items = Array.isArray(offer.items) ? offer.items : [];
      for (const item of items) {
        const price = Number(item?.pricePerUnit);
        if (!Number.isFinite(price) || price <= 300 || price >= 3000) continue;
        const unit = String(item?.unit || '').trim();
        const desc = String(item?.description || '');
        if (hourlyUnitRe.test(unit) || hourlyTextRe.test(desc)) rates.push(price);
      }
    }

    if (rates.length >= 3) {
      // Median er mer robust enn gjennomsnitt mot én feilskrevet pris.
      const sorted = [...rates].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : Math.round(sorted[mid]);
      return { rate: median, source: 'egne tidligere tilbud (median)', sampleSize: rates.length };
    }
  } catch (e: any) {
    console.warn('[Autonomy] Kunne ikke beregne timepris fra tilbudshistorikk:', e.message);
  }

  const key = String(trade || '').toLowerCase();
  const fallback = FALLBACK_HOURLY_RATES[key] || FALLBACK_HOURLY_RATES['tømrer'];
  return { rate: fallback, source: `fagpris for ${trade || 'tømrer'} (ingen egen historikk funnet)`, sampleSize: 0 };
}

// ---------------------------------------------------------------------------
// Varsling — Discord / Slack / e-post
// ---------------------------------------------------------------------------

async function getWebhook(companyId: string, service: 'discord' | 'slack'): Promise<string | null> {
  try {
    const integrations = await getCollectionItems('integrations').catch(() => []);
    const hit = integrations.find((i: any) =>
      String(i.service || '').toLowerCase() === service &&
      i.status === 'active' &&
      typeof i.webhookUrl === 'string' &&
      i.webhookUrl.trim() &&
      (i.companyId === companyId || i.companyId === 'system')
    );
    return hit?.webhookUrl?.trim() || null;
  } catch {
    return null;
  }
}

/** Finner e-postadressene til ledelsen i bedriften (admin/manager/superadmin). */
async function getCompanyNotifyEmails(companyId: string): Promise<string[]> {
  try {
    const users = await getCollectionItems('users').catch(() => []);
    return users
      .filter((u: any) => u.companyId === companyId)
      .filter((u: any) => ['admin', 'manager', 'superadmin', 'owner'].includes(String(u.role || '').toLowerCase()))
      .map((u: any) => String(u.email || '').trim())
      .filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  } catch {
    return [];
  }
}

function buildDigestText(companyName: string, actions: PendingAction[]): string {
  const lines = actions.slice(0, 8).map((a, i) => {
    const amount = a.impactAmount ? ` (kr ${Math.round(a.impactAmount).toLocaleString('no-NO')})` : '';
    return `${i + 1}. ${a.title}${amount}`;
  });
  const rest = actions.length > 8 ? `\n… og ${actions.length - 8} til.` : '';
  return `⚡ MesterAI har ${actions.length} forslag klare for ${companyName}:\n${lines.join('\n')}${rest}\n\nÅpne VikingMester for å godkjenne med ett trykk.`;
}

/**
 * Varsler til de kanalene bedriften faktisk har koblet til.
 *
 * Returnerer hvilke kanaler som faktisk fikk meldingen — vi later aldri som vi
 * sendte noe. Kanaler som ikke er konfigurert hoppes over uten støy.
 */
export async function notifyAutonomyDigest(
  companyId: string,
  actions: PendingAction[],
  settings: AutonomySettings,
  companyName = 'bedriften'
): Promise<string[]> {
  const sent: string[] = [];
  if (actions.length === 0) return sent;

  const text = buildDigestText(companyName, actions);

  if (settings.notifyDiscord) {
    const url = await getWebhook(companyId, 'discord');
    if (url) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'MesterAI Autonom Byggeleder', content: text.slice(0, 1900) }),
          signal: AbortSignal.timeout(8000)
        });
        if (res.ok || res.status === 204) sent.push('discord');
        else console.warn(`[Autonomy] Discord svarte ${res.status} — varsel ikke levert.`);
      } catch (e: any) {
        console.warn('[Autonomy] Discord-varsel feilet:', e.message);
      }
    }
  }

  if (settings.notifySlack) {
    const url = await getWebhook(companyId, 'slack');
    if (url) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: AbortSignal.timeout(8000)
        });
        if (res.ok) sent.push('slack');
        else console.warn(`[Autonomy] Slack svarte ${res.status} — varsel ikke levert.`);
      } catch (e: any) {
        console.warn('[Autonomy] Slack-varsel feilet:', e.message);
      }
    }
  }

  if (settings.notifyEmail) {
    const emails = await getCompanyNotifyEmails(companyId);
    if (emails.length > 0) {
      try {
        const { sendSystemEmail } = await import('./emailSender');
        const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">
          <h2 style="margin:0 0 8px">MesterAI har ${actions.length} forslag klare</h2>
          <ul>${actions.slice(0, 12).map(a => `<li><strong>${a.title}</strong>${a.impactAmount ? ` — kr ${Math.round(a.impactAmount).toLocaleString('no-NO')}` : ''}<br/><span style="color:#475569">${a.projectName}: ${a.suggestedAction}</span></li>`).join('')}</ul>
          <p>Åpne VikingMester for å godkjenne med ett trykk.</p>
        </div>`;
        const result = await sendSystemEmail({
          to: emails,
          subject: `MesterAI: ${actions.length} forslag venter på godkjenning`,
          html,
          text,
          type: 'notice',
          companyName
        });
        if (result?.success) sent.push('email');
      } catch (e: any) {
        console.warn('[Autonomy] E-postvarsel feilet:', e.message);
      }
    }
  }

  return sent;
}

// ---------------------------------------------------------------------------
// HOVEDMOTOR
// ---------------------------------------------------------------------------

async function getCycleState(): Promise<{ id: string; lastRunAt?: string; lastRunDay?: string } | null> {
  try {
    const rows = await getCollectionItems('agent_state').catch(() => []);
    return rows.find((r: any) => r.id === 'autonomy_cycle_state') || null;
  } catch {
    return null;
  }
}

async function saveCycleState(data: Record<string, any>): Promise<void> {
  await saveCollectionItem('agent_state', {
    id: 'autonomy_cycle_state',
    ...data,
    updatedAt: new Date().toISOString()
  }).catch((e: any) => console.warn('[Autonomy] Kunne ikke lagre syklusstatus:', e.message));
}

/**
 * ⚡ Den autonome revisjons- og handlingssyklusen.
 *
 * Kjører:
 *   - værsjekk for aktive prosjekter (frost, vind, nedbør)
 *   - byggedagbok-utkast fra dagens RELLE timelister
 *   - deteksjon av uavtalt tilleggsarbeid i timelister
 *   - påminnelse om glemt timeføring (ellers blir aldri dagboken laget)
 *   - påminnelse om manglende byggedagbok for forrige virkedag
 *   - purring på åpne avvik
 *   - varsel til Discord/Slack/e-post når noe venter
 *
 * Alt legges i godkjenningskøen. Ingenting sendes til kunde uten et menneske.
 */
export async function runAutonomousAuditCycle(options?: {
  companyId?: string;
  force?: boolean;
}): Promise<AutonomyCycleResult> {
  const startedAt = new Date();
  const nowIso = startedAt.toISOString();
  const todayStr = osloDate(startedAt);
  const companyId = options?.companyId;

  const emptyResult = (skippedReason: string): AutonomyCycleResult => ({
    executedAt: nowIso,
    isLiveWeather: false,
    weatherChecksCount: 0,
    weatherAlertsCreated: 0,
    dailyLogsDrafted: 0,
    dailyLogsAutoApproved: 0,
    changeOrdersDetected: 0,
    missingTimeEntriesFlagged: 0,
    missingDailyLogsFlagged: 0,
    openDeviationsFlagged: 0,
    staleProposalsDismissed: 0,
    notificationsSent: [],
    pendingActionsTotal: 0,
    skippedReason
  });

  // 🛡️ Idempotens: flere triggere (innebygd scheduler, GitHub Actions, Railway,
  // manuell knapp) kan treffe samme minutt. Én reell kjøring per intervall.
  if (!options?.force) {
    const state = await getCycleState();
    if (state?.lastRunAt) {
      const minutesSince = (startedAt.getTime() - new Date(state.lastRunAt).getTime()) / 60000;
      if (Number.isFinite(minutesSince) && minutesSince >= 0 && minutesSince < CYCLE_MIN_INTERVAL_MINUTES) {
        console.log(`⏭️ [Autonomy Cycle] Kjørte for ${Math.round(minutesSince)} min siden — hopper over.`);
        return emptyResult(`Kjørte for ${Math.round(minutesSince)} minutter siden.`);
      }
    }
  }

  console.log(`🚀 [Autonomy Cycle] Starter autonom revisjonssyklus ${nowIso}${companyId ? ` for ${companyId}` : ' (alle bedrifter)'}...`);

  const settings = await getAutonomySettings();
  const [allProjects, existingActions, allTimeEntries, allDeviations, allTasks, allDailyLogs] = await Promise.all([
    getCollectionItems('projects').catch(() => []),
    getCollectionItems('pending_actions').catch(() => []),
    getCollectionItems('time_entries').catch(() => []),
    getCollectionItems('deviations').catch(() => []),
    getCollectionItems('tasks').catch(() => []),
    getCollectionItems('daily_logs').catch(() => [])
  ]);

  const projects = companyId
    ? allProjects.filter((p: any) => !p.companyId || p.companyId === companyId)
    : allProjects;
  const activeProjects = projects.filter((p: any) => p.status === 'active' || !p.status);

  let weatherAlertsCreated = 0;
  let dailyLogsDrafted = 0;
  let dailyLogsAutoApproved = 0;
  let changeOrdersDetected = 0;
  let missingTimeEntriesFlagged = 0;
  let missingDailyLogsFlagged = 0;
  let openDeviationsFlagged = 0;

  const newActions: PendingAction[] = [];

  const record = async (action: PendingAction) => {
    await saveCollectionItem('pending_actions', action);
    newActions.push(action);
  };

  const alreadyHandled = (id: string) =>
    actionExists(existingActions, id) || newActions.some(a => a.id === id);

  // -------------------------------------------------------------------------
  // 1. VÆR-RADAR
  // -------------------------------------------------------------------------
  const weatherStatuses = await getProjectsWeatherStatus(companyId);

  for (const weather of weatherStatuses) {
    if (!weather.isLive) continue;

    if (weather.riskLevel === 'safe') {
      // Rekonsiliering: været er nå trygt — fjern gamle varsler for prosjektet.
      const stale = existingActions.filter((a: any) =>
        a.type === 'weather_risk_alert' && a.projectId === weather.projectId && a.status === 'pending'
      );
      for (const s of stale) {
        await updateCollectionItem('pending_actions', s.id, {
          status: 'auto_executed',
          autoDismissedReason: 'Værforholdene er nå sjekket og verifisert trygge (sanntidsdata).'
        }).catch((e: any) => console.warn('[Autonomy] Kunne ikke arkivere gammelt værvarsel:', e.message));
      }
      continue;
    }

    const actionId = `weather-alert-${weather.projectId}-${weather.forecastDate}`;
    if (alreadyHandled(actionId)) continue;

    const project = allProjects.find((p: any) => p.id === weather.projectId);
    await record({
      id: actionId,
      type: 'weather_risk_alert',
      title: `⚠️ Værfare for ${weather.projectName}: ${weather.riskReason}`,
      description: weather.workAdvice,
      priority: weather.riskLevel === 'critical' ? 'urgent' : 'high',
      projectId: weather.projectId,
      projectName: weather.projectName,
      companyId: companyId || project?.companyId,
      createdAt: nowIso,
      status: 'pending',
      data: weather,
      suggestedAction: 'Omdisponer til innvendige arbeider og sikre byggeplassen',
      category: 'hms',
      evidence: `Sanntidsvarsel fra Open-Meteo (${weather.forecastDate}, ${weather.location}): ${weather.weatherDescription}`
    });
    weatherAlertsCreated++;

    await saveCollectionItem('agent_activities', {
      type: 'weather_risk_detected',
      title: `Værfare detektert: ${weather.projectName}`,
      description: `${weather.riskReason}. Anbefaling klargjort i godkjenningskøen.`,
      projectId: weather.projectId,
      projectName: weather.projectName,
      companyId: companyId || project?.companyId,
      badge: weather.riskLevel === 'critical' ? 'KRITISK VÆR' : 'VÆRVARSEL',
      status: 'pending',
      createdAt: nowIso
    });
  }

  // -------------------------------------------------------------------------
  // 2. BYGGEDAGBOK — utkast fra RELLE timelister
  // -------------------------------------------------------------------------
  for (const proj of activeProjects) {
    const existingLog = allDailyLogs.find((dl: any) => dl.projectId === proj.id && dayOf(dl.date) === todayStr);
    if (existingLog) continue;

    const draftActionId = `daily-draft-${proj.id}-${todayStr}`;
    if (alreadyHandled(draftActionId)) continue;

    const todaysTimeEntries = allTimeEntries.filter((te: any) =>
      te.projectId === proj.id &&
      (dayOf(te.date) === todayStr || dayOf(te.createdAt) === todayStr)
    );

    // 🛡️ Ingen timer ført → ingen dagbok. Vi dikter ikke opp bemanning eller
    // timer i et juridisk dokument. Påminnelsen i steg 4 håndterer dette.
    if (todaysTimeEntries.length === 0) continue;

    const totalHours = todaysTimeEntries.reduce((sum: number, te: any) => sum + (Number(te.hours) || 0), 0);
    const uniqueWorkers = Array.from(new Set(todaysTimeEntries.map((te: any) => te.userName || te.workerName || 'Håndverker')));

    const todaysTasks = allTasks
      .filter((t: any) => t.projectId === proj.id && t.status === 'completed')
      .map((t: any) => t.title);

    const openDeviationsForProject = allDeviations.filter((d: any) =>
      (d.projectId === proj.id || d.project === proj.name) &&
      !['closed', 'lukket'].includes(String(d.status || ''))
    );

    const matchedWeather = weatherStatuses.find(w => w.projectId === proj.id && w.isLive);

    const draftLogPayload = {
      projectId: proj.id,
      projectName: proj.name,
      companyId: companyId || proj.companyId,
      date: todayStr,
      crewCount: uniqueWorkers.length,
      crewMembers: uniqueWorkers,
      totalHoursWorked: totalHours,
      completedTasks: todaysTasks.length > 0 ? todaysTasks : todaysTimeEntries.map((te: any) => te.description).filter(Boolean),
      checklistsCompleted: [],
      deviationsRegistered: openDeviationsForProject.map((d: any) => d.title),
      temperatureMin: matchedWeather ? matchedWeather.temp - 3 : undefined,
      temperatureMax: matchedWeather ? matchedWeather.temp + 3 : undefined,
      windSpeedMax: matchedWeather?.windSpeedMs,
      precipitationMm: matchedWeather?.precipitationMm,
      weatherDescription: matchedWeather ? matchedWeather.weatherDescription : 'Værdata ikke tilgjengelig',
      workAdvice: matchedWeather?.workAdvice,
      generalNotes: `Aggregert automatisk fra ${todaysTimeEntries.length} timeregistreringer. ${openDeviationsForProject.length} åpne avvik på prosjektet.`,
      autoGenerated: true,
      createdAt: nowIso
    };

    // Autopilot: kun rutinedagbøker uten avvik, og kun når brukeren har slått det på.
    const canAutoApprove =
      settings.mode === 'autopilot' &&
      settings.autoApproveRoutineDailyLogs &&
      openDeviationsForProject.length === 0;

    if (canAutoApprove) {
      await saveCollectionItem('daily_logs', {
        id: `daily-log-${proj.id}-${todayStr}`,
        ...draftLogPayload,
        inspectedBy: 'MesterAI Autopilot',
        signedAt: nowIso,
        status: 'approved'
      });

      await saveCollectionItem('agent_activities', {
        type: 'daily_log_auto_approved',
        title: `Autopilot: Byggedagbok arkivert for ${proj.name}`,
        description: `Automatisk arkivert fra ${todaysTimeEntries.length} timelister (${uniqueWorkers.length} mann, ${totalHours} timer), uten åpne avvik.`,
        projectId: proj.id,
        projectName: proj.name,
        companyId: draftLogPayload.companyId,
        badge: 'AUTOPILOT ARKIVERT',
        status: 'approved',
        createdAt: nowIso
      });

      dailyLogsAutoApproved++;
    } else {
      await record({
        id: draftActionId,
        type: 'daily_log_draft',
        title: `Byggedagbok klar for signering: ${proj.name} (${todayStr})`,
        description: `${uniqueWorkers.length} mann på plassen, ${totalHours} arbeidstimer ført. ${matchedWeather?.weatherDescription || 'Værdata ikke tilgjengelig'}.`,
        priority: openDeviationsForProject.length > 0 ? 'high' : 'medium',
        projectId: proj.id,
        projectName: proj.name,
        companyId: draftLogPayload.companyId,
        createdAt: nowIso,
        status: 'pending',
        data: draftLogPayload,
        suggestedAction: 'Godkjenn for å arkivere iht. Byggherreforskriften § 15',
        category: 'progress',
        evidence: `Bygget fra ${todaysTimeEntries.length} reelle timeregistreringer (${uniqueWorkers.join(', ')}).`
      });
      dailyLogsDrafted++;

      await saveCollectionItem('agent_activities', {
        type: 'daily_log_drafted',
        title: `Byggedagbok klargjort: ${proj.name}`,
        description: `Basert på ${todaysTimeEntries.length} timelister. Ligger klar for 1-klikks godkjenning.`,
        projectId: proj.id,
        projectName: proj.name,
        companyId: draftLogPayload.companyId,
        badge: 'KLAR FOR SIGNERING',
        status: 'pending',
        createdAt: nowIso
      });
    }
  }

  // -------------------------------------------------------------------------
  // 3. ENDRINGSORDRE — uavtalt tilleggsarbeid fanget i timelister
  // -------------------------------------------------------------------------
  const changeKeywords = [
    'ekstra', 'tillegg', 'endring', 'omlegging', 'feil fra arkitekt',
    'bestilt av kunde', 'flytting', 'ikke med i tilbudet', 'utenfor tilbud',
    'tilvalg', 'etter bestilling'
  ];

  // Kun de siste 14 dagene: gamle timer skal ikke dukke opp som «nytt» krav.
  const changeWindowStart = isoAddDays(todayStr, -14);
  const recentEntries = allTimeEntries.filter((te: any) => {
    const d = dayOf(te.date) || dayOf(te.createdAt);
    return d >= changeWindowStart && d <= todayStr;
  });

  for (const te of recentEntries) {
    const descLower = String(te.description || te.task || '').toLowerCase();
    if (!descLower) continue;
    if (!changeKeywords.some(kw => descLower.includes(kw))) continue;

    const actionId = `change-hint-${te.id}`;
    if (alreadyHandled(actionId)) continue;

    const proj = projects.find((p: any) => p.id === te.projectId);
    if (!proj) continue;

    const trade = proj.category || proj.trade || 'tømrer';
    const { rate, source: rateSource, sampleSize } = await estimateHourlyRate(
      companyId || proj.companyId,
      trade
    );
    const hours = Number(te.hours) || 2;
    // Fagarbeid + 15 % til rigg, småmateriell og opprydding. Satsen er hentet fra
    // bedriftens egne tilbud når vi har historikk, ellers oppgitt som fagpris.
    const amountExVat = Math.round(hours * rate * 1.15);
    const requiresManualReview = amountExVat >= settings.approvalThresholdAmount;
    const entryDate = dayOf(te.date) || dayOf(te.createdAt);

    const draftChangeOrder = {
      id: `co-auto-${te.id}`,
      draftId: actionId,
      projectId: te.projectId,
      projectName: proj.name,
      companyId: companyId || proj.companyId,
      clientEmail: proj.clientEmail || proj.customerEmail || proj.contactEmail || '',
      clientName: proj.clientName || proj.customerName || '',
      companyName: proj.companyName || proj.company || '',
      title: `Tilleggsarbeid: ${String(te.description || te.task || '').slice(0, 70)}`,
      description: `${te.userName || te.workerName || 'Fagperson'} har ført ${hours} timer ${entryDate} med merknaden «${te.description || te.task}». Dette er ikke en del av det opprinnelige tilbudet og varsles herved iht. NS 8406 pkt. 19.2.`,
      amountExVat,
      vatAmount: Math.round(amountExVat * 0.25),
      totalAmount: Math.round(amountExVat * 1.25),
      impactDays: 0,
      legalHjemmel: 'NS 8406 pkt. 19.2 (Varsel om krav på justering av vederlag)',
      rateBasis: `${hours} t × kr ${rate} (${rateSource})${sampleSize ? `, ${sampleSize} observasjoner` : ''} + 15 % rigg/materiell`,
      status: 'draft',
      createdAt: nowIso
    };

    await record({
      id: actionId,
      type: 'change_order_draft',
      title: `Mulig uavtalt tilleggsarbeid: ${proj.name} (kr ${amountExVat.toLocaleString('no-NO')})`,
      description: `Oppdaget fra timeliste ${entryDate}: «${te.description || te.task}». Ferdig utfylt NS 8406-varsel med hjemmel og beløp.`,
      priority: 'high',
      projectId: te.projectId,
      projectName: proj.name,
      companyId: companyId || proj.companyId,
      createdAt: nowIso,
      status: 'pending',
      data: draftChangeOrder,
      impactAmount: amountExVat,
      suggestedAction: 'Send endringsmelding til byggherre for å sikre kravet',
      category: 'finance',
      requiresManualReview,
      evidence: `Beløp beregnet som ${draftChangeOrder.rateBasis}.`
    });
    changeOrdersDetected++;

    await saveCollectionItem('agent_activities', {
      type: 'change_order_detected',
      title: `Endringsordre klargjort: ${proj.name}`,
      description: `Krav på kr ${amountExVat.toLocaleString('no-NO')} eks mva identifisert i timeliste. Ligger i godkjenningskøen.`,
      projectId: te.projectId,
      projectName: proj.name,
      companyId: companyId || proj.companyId,
      badge: 'PENGER SIKRET (NS 8406)',
      status: 'pending',
      createdAt: nowIso
    });
  }

  // -------------------------------------------------------------------------
  // 4. PÅMINNELSE: glemt timeføring
  //    («Hvis ingen fører timer, finnes ingen byggedagbok.»)
  // -------------------------------------------------------------------------
  const todayIsWeekend = isWeekend(todayStr);
  const sinceDate = isoAddDays(todayStr, -MISSING_TIME_LOOKBACK_DAYS);

  for (const proj of activeProjects) {
    const entriesSince = allTimeEntries.filter((te: any) => {
      const d = dayOf(te.date) || dayOf(te.createdAt);
      return te.projectId === proj.id && d >= sinceDate && d <= todayStr;
    });
    const distinctDays = new Set(entriesSince.map((te: any) => dayOf(te.date)).filter(Boolean));

    // Prosjektet har vært helt stille i hele vinduet → sannsynligvis glemt føring.
    if (distinctDays.size > 0) continue;
    if (todayIsWeekend) continue;

    const actionId = `reminder-missing_time_entry-${proj.id}-${todayStr}`;
    if (alreadyHandled(actionId)) continue;

    await record({
      id: actionId,
      type: 'missing_time_entry',
      title: `Ingen timer ført på ${proj.name} de siste ${MISSING_TIME_LOOKBACK_DAYS} dagene`,
      description: `Uten førte timer kan MesterAI ikke lage byggedagbok, og du mister dokumentasjon på utført arbeid. Før timene — så ordner resten seg selv.`,
      priority: 'high',
      projectId: proj.id,
      projectName: proj.name,
      companyId: companyId || proj.companyId,
      createdAt: nowIso,
      status: 'pending',
      data: { projectId: proj.id, projectName: proj.name, sinceDate, lastEntryDate: null },
      suggestedAction: 'Opprett oppgave «Før timer» og varsle laget',
      category: 'progress',
      evidence: `Ingen timeregistrering funnet for prosjektet mellom ${sinceDate} og ${todayStr}.`
    });
    missingTimeEntriesFlagged++;
  }

  // -------------------------------------------------------------------------
  // 5. PÅMINNELSE: manglende byggedagbok for forrige virkedag
  // -------------------------------------------------------------------------
  const targetDay = previousWorkday(todayStr);
  for (const proj of activeProjects) {
    const dayEntries = allTimeEntries.filter((te: any) =>
      te.projectId === proj.id && dayOf(te.date) === targetDay
    );
    if (dayEntries.length === 0) continue;

    const loggedThatDay = allDailyLogs.some((dl: any) =>
      dl.projectId === proj.id && dayOf(dl.date) === targetDay
    );
    if (loggedThatDay) continue;

    const actionId = `reminder-missing_daily_log-${proj.id}-${targetDay}`;
    if (alreadyHandled(actionId)) continue;

    const hours = dayEntries.reduce((sum: number, te: any) => sum + (Number(te.hours) || 0), 0);
    const workers = Array.from(new Set(dayEntries.map((te: any) => te.userName || te.workerName || 'Håndverker')));
    const matchedWeather = weatherStatuses.find(w => w.projectId === proj.id && w.isLive);

    await record({
      id: actionId,
      type: 'missing_daily_log',
      title: `Byggedagbok mangler for ${targetDay}: ${proj.name}`,
      description: `${hours} timer ble ført av ${workers.length} person(er) denne dagen, men byggedagboken er ikke ført. Byggherreforskriften § 15 krever daglig føring.`,
      priority: 'urgent',
      projectId: proj.id,
      projectName: proj.name,
      companyId: companyId || proj.companyId,
      createdAt: nowIso,
      status: 'pending',
      data: {
        projectId: proj.id,
        projectName: proj.name,
        companyId: companyId || proj.companyId,
        date: targetDay,
        crewCount: workers.length,
        crewMembers: workers,
        totalHoursWorked: hours,
        completedTasks: dayEntries.map((te: any) => te.description || te.task).filter(Boolean),
        checklistsCompleted: [],
        deviationsRegistered: [],
        temperatureMin: matchedWeather ? matchedWeather.temp - 3 : undefined,
        temperatureMax: matchedWeather ? matchedWeather.temp + 3 : undefined,
        windSpeedMax: matchedWeather?.windSpeedMs,
        precipitationMm: matchedWeather?.precipitationMm,
        weatherDescription: matchedWeather?.weatherDescription,
        generalNotes: `Etterskuddsført fra ${dayEntries.length} timeregistreringer. MesterAI oppdaget at dagboken manglet.`,
        autoGenerated: true
      },
      suggestedAction: `Godkjenn for å føre dagboken for ${targetDay} med de reelle timene`,
      category: 'quality',
      evidence: `${dayEntries.length} timeregistreringer funnet for ${targetDay}: ${hours} timer, ${workers.join(', ')}.`
    });
    missingDailyLogsFlagged++;
  }

  // -------------------------------------------------------------------------
  // 6. PURRING: åpne avvik som ingen har lukket
  // -------------------------------------------------------------------------
  const reminderAfterDays = Math.max(1, settings.deviationReminderAfterDays || 3);
  const openDeviations = allDeviations
    .filter((d: any) => !['closed', 'lukket'].includes(String(d.status || '')))
    .filter((d: any) => !companyId || !d.companyId || d.companyId === companyId)
    .filter((d: any) => {
      // Uten dato purrer vi ikke — vi påstår ikke at noe er gammelt uten belegg.
      const created = dayOf(d.createdAt || d.timestamp);
      return created && daysBetween(created, todayStr) >= reminderAfterDays;
    })
    .slice(0, 10);

  for (const deviation of openDeviations) {
    const actionId = `reminder-open_deviation-${deviation.id}-${todayStr}`;
    if (alreadyHandled(actionId)) continue;

    const proj = projects.find((p: any) => p.id === deviation.projectId);
    const deviationCreated = dayOf(deviation.createdAt || deviation.timestamp);
    const ageDays = daysBetween(deviationCreated, todayStr);
    const isCritical = ['high', 'critical', 'kritisk', 'høy'].includes(String(deviation.severity || '').toLowerCase());

    await record({
      id: actionId,
      type: 'open_deviation',
      title: `Åpent avvik i ${ageDays} dager: ${deviation.title}`,
      description: `${deviation.description || 'Avviket mangler beskrivelse.'} Åpne avvik blokkerer overlevering og kan gi merknad i KS-permen.`,
      priority: isCritical ? 'urgent' : 'medium',
      projectId: deviation.projectId,
      projectName: proj?.name || deviation.projectName || deviation.project || 'Ukjent prosjekt',
      companyId: companyId || deviation.companyId || proj?.companyId,
      createdAt: nowIso,
      status: 'pending',
      data: {
        deviationId: deviation.id,
        deviationTitle: deviation.title,
        deviationCreatedAt: deviationCreated,
        severity: deviation.severity,
        correctiveAction: deviation.correctiveAction || deviation.action || 'Utbedre og dokumenter med før-/etter-bilde.',
        reportedBy: deviation.reportedBy || ''
      },
      suggestedAction: 'Opprett utbedringsoppgave med frist om 3 dager',
      category: 'quality',
      evidence: `Avviket har status «${deviation.status}» og ble meldt ${deviationCreated || 'uten dato'}.`
    });
    openDeviationsFlagged++;
  }

  // -------------------------------------------------------------------------
  // 7. SELVHELBREDELSE: fjern forslag som ikke lenger stemmer
  // -------------------------------------------------------------------------
  const staleProposalsDismissed = await dismissStaleProposals(existingActions, companyId);

  // -------------------------------------------------------------------------
  // 8. VARSLING
  // -------------------------------------------------------------------------
  let notificationsSent: string[] = [];
  if (settings.notifyDigest && newActions.length > 0) {
    const digestCompanyId = companyId || newActions[0]?.companyId;
    if (digestCompanyId) {
      const company = allProjects.find((p: any) => p.companyId === digestCompanyId);
      const companyName = company?.companyName || company?.company || 'bedriften';
      notificationsSent = await notifyAutonomyDigest(digestCompanyId, newActions, settings, companyName);
    }
  }

  const updatedPending = await getPendingActions(companyId);

  await saveCycleState({
    lastRunAt: nowIso,
    lastRunDay: todayStr,
    lastRunCompanyId: companyId || 'all',
    lastSummary: {
      weatherAlertsCreated,
      dailyLogsDrafted,
      dailyLogsAutoApproved,
      changeOrdersDetected,
      missingTimeEntriesFlagged,
      missingDailyLogsFlagged,
      openDeviationsFlagged,
      notificationsSent
    }
  });

  const result: AutonomyCycleResult = {
    executedAt: nowIso,
    isLiveWeather: weatherStatuses.some(w => w.isLive),
    weatherChecksCount: weatherStatuses.filter(w => w.isLive).length,
    weatherAlertsCreated,
    dailyLogsDrafted,
    dailyLogsAutoApproved,
    changeOrdersDetected,
    missingTimeEntriesFlagged,
    missingDailyLogsFlagged,
    openDeviationsFlagged,
    staleProposalsDismissed,
    notificationsSent,
    pendingActionsTotal: updatedPending.length
  };

  console.log(
    `✅ [Autonomy Cycle] ${result.weatherAlertsCreated} værvarsler, ${result.dailyLogsDrafted} dagbokutkast, ` +
    `${result.dailyLogsAutoApproved} auto-arkivert, ${result.changeOrdersDetected} endringsordrer, ` +
    `${result.missingTimeEntriesFlagged} manglende timeføring, ${result.missingDailyLogsFlagged} manglende dagbok, ` +
    `${result.openDeviationsFlagged} åpne avvik, ${result.staleProposalsDismissed} utdaterte ryddet.`
  );

  return result;
}
