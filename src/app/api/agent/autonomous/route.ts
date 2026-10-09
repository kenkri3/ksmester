import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, verifyCronOrInternalSecret } from '@/src/lib/server/auth';
import {
  getPendingActions,
  approveAction,
  approveActions,
  rejectAction,
  getAutonomySettings,
  saveAutonomySettings,
  getProjectsWeatherStatus,
  runAutonomousAuditCycle
} from '@/src/lib/server/autonomousAgent';
import { generateFDVReport } from '@/src/lib/server/fdvGenerator';
import { getCollectionItems } from '@/src/lib/server/db';
import { apiError } from '@/src/lib/server/apiError';

/**
 * Kontrollposten for den autonome byggelederen.
 *
 * 🛡️ Multi-tenant: alle handlinger er scopet til innlogget brukers bedrift.
 * En håndverker skal aldri se — eller kunne godkjenne — en annen bedrifts
 * endringsordre, dagbok eller byggeplass.
 */

/**
 * Rutineforslag som kan godkjennes i bulk med ett trykk.
 * Penger og kundekontakt (endringsordre, tilbud) er bevisst utenfor: de er
 * juridiske dokumenter og skal alltid vurderes enkeltvis.
 */
const ROUTINE_TYPES = ['daily_log_draft', 'missing_daily_log', 'missing_time_entry', 'open_deviation'];

/** Bedriften handlingene skal scopet til. Cron/intern har ingen og ser alt. */
function resolveScope(req: NextRequest): { companyId?: string; isInternal: boolean; user: any } {
  const user = getUserFromRequest(req);
  const isInternal = verifyCronOrInternalSecret(req);
  if (isInternal) return { companyId: undefined, isInternal: true, user };
  return { companyId: user?.companyId, isInternal: false, user };
}

export async function GET(req: NextRequest) {
  const { companyId, isInternal, user } = resolveScope(req);

  if (!user && !isInternal) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  try {
    const [pendingActions, settings, weatherStatuses, activities] = await Promise.all([
      getPendingActions(companyId),
      getAutonomySettings(),
      getProjectsWeatherStatus(companyId),
      getCollectionItems('agent_activities').catch(() => [])
    ]);

    // Aktivitetsloggen må også isoleres per bedrift — den inneholder
    // prosjektnavn, kundeforhold og beløp.
    const scopedActivities = (activities || []).filter((a: any) =>
      isInternal ? true : (!a.companyId || a.companyId === companyId)
    );

    const recentActivities = scopedActivities
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 15);

    const liveWeather = weatherStatuses.filter(w => w.isLive);

    return NextResponse.json({
      success: true,
      pendingActions,
      settings,
      weatherStatuses,
      recentActivities,
      counts: {
        pending: pendingActions.length,
        weatherAlerts: weatherStatuses.filter(w => w.isLive && w.riskLevel !== 'safe').length,
        critical: pendingActions.filter(a => a.priority === 'urgent').length,
        needsManualReview: pendingActions.filter(a => a.requiresManualReview).length,
        // Prosjekter vi ikke kunne hente vær for — brukeren bør legge inn adresse.
        weatherUnavailable: weatherStatuses.length - liveWeather.length,
        // 1-klikks «godkjenn alt rutinearbeid» gjelder disse:
        routinedrafts: pendingActions.filter(a => ROUTINE_TYPES.includes(a.type)).length
      }
    });
  } catch (error: any) {
    return apiError(error, 'Kunne ikke hente autonomi-status.');
  }
}

export async function POST(req: NextRequest) {
  const { companyId, isInternal, user } = resolveScope(req);

  if (!user && !isInternal) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action;
    const authorName = user?.displayName || user?.email?.split('@')[0] || 'Byggmester';

    // 1. Godkjenn ett forslag
    if (action === 'approve_action') {
      if (!body.actionId) {
        return NextResponse.json({ error: 'Mangler actionId' }, { status: 400 });
      }
      const result = await approveAction(body.actionId, authorName, companyId);
      return NextResponse.json({ success: true, result });
    }

    // 2. Godkjenn flere rutineforslag i én operasjon («godkjenn alt rutinearbeid»)
    if (action === 'approve_batch') {
      const pending = await getPendingActions(companyId);
      const requested: string[] = Array.isArray(body.actionIds) ? body.actionIds : [];
      const candidates = body.allRoutine === true
        ? pending.filter(a => ROUTINE_TYPES.includes(a.type)).map(a => a.id)
        : requested.filter(id => pending.some(a => a.id === id && ROUTINE_TYPES.includes(a.type)));

      if (candidates.length === 0) {
        return NextResponse.json({ success: true, approved: [], failed: [], message: 'Ingen rutineforslag å godkjenne.' });
      }

      const result = await approveActions(candidates, authorName, companyId);
      return NextResponse.json({
        success: true,
        ...result,
        message: `${result.approved.length} forslag godkjent${result.failed.length ? `, ${result.failed.length} feilet` : ''}.`
      });
    }

    // 3. Avvis forslag
    if (action === 'reject_action') {
      if (!body.actionId) {
        return NextResponse.json({ error: 'Mangler actionId' }, { status: 400 });
      }
      const result = await rejectAction(body.actionId, authorName, body.reason);
      return NextResponse.json({ success: true, result });
    }

    // 4. Copilot vs. Autopilot + terskler
    if (action === 'update_settings') {
      if (!body.settings) {
        return NextResponse.json({ error: 'Mangler settings' }, { status: 400 });
      }
      const updated = await saveAutonomySettings(body.settings);
      return NextResponse.json({ success: true, settings: updated });
    }

    // 5. Kjør en full autonom revisjonssyklus nå (vær, dagbok, endringer, påminnelser)
    if (action === 'run_audit_cycle') {
      const cycleResult = await runAutonomousAuditCycle({
        companyId,
        // Brukeren trykket selv — da skal den ikke avvises av idempotenssperren.
        force: body.force !== false
      });
      const updatedPending = await getPendingActions(companyId);
      return NextResponse.json({
        success: true,
        cycleResult,
        pendingActions: updatedPending
      });
    }

    // 6. Generer ferdig FDV- og KS-sluttrapport
    if (action === 'generate_fdv') {
      if (!body.projectId) {
        return NextResponse.json({ error: 'Mangler projectId' }, { status: 400 });
      }
      const report = await generateFDVReport(body.projectId);
      return NextResponse.json({ success: true, report });
    }

    return NextResponse.json({ error: 'Ukjent handling' }, { status: 400 });
  } catch (error: any) {
    return apiError(error, 'Autonomi-handling feilet.');
  }
}
