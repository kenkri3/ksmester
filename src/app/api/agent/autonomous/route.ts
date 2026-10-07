import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, verifyCronOrInternalSecret } from '@/src/lib/server/auth';
import { 
  getPendingActions, 
  approveAction, 
  rejectAction, 
  getAutonomySettings, 
  saveAutonomySettings, 
  getProjectsWeatherStatus, 
  runAutonomousAuditCycle 
} from '@/src/lib/server/autonomousAgent';
import { generateFDVReport } from '@/src/lib/server/fdvGenerator';
import { getCollectionItems } from '@/src/lib/server/db';
import { apiError } from '@/src/lib/server/apiError';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  const isCronOrInternal = verifyCronOrInternalSecret(req);

  if (!user && !isCronOrInternal) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  try {
    const [pendingActions, settings, weatherStatuses, activities] = await Promise.all([
      getPendingActions(),
      getAutonomySettings(),
      getProjectsWeatherStatus(),
      getCollectionItems('agent_activities').catch(() => [])
    ]);

    const recentActivities = activities
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 15);

    return NextResponse.json({
      success: true,
      pendingActions,
      settings,
      weatherStatuses,
      recentActivities,
      counts: {
        pending: pendingActions.length,
        weatherAlerts: weatherStatuses.filter(w => w.riskLevel !== 'safe').length,
        critical: pendingActions.filter(a => a.priority === 'urgent').length
      }
    });
  } catch (error: any) {
    return apiError(error, 'Kunne ikke hente agenthandlinger.');
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  const isCronOrInternal = verifyCronOrInternalSecret(req);

  if (!user && !isCronOrInternal) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action;
    const authorName = user?.displayName || user?.email?.split('@')[0] || 'Byggmester';

    // 1. Godkjenn handling i godkjenningskøen
    if (action === 'approve_action') {
      if (!body.actionId) {
        return NextResponse.json({ error: 'Mangler actionId' }, { status: 400 });
      }
      const result = await approveAction(body.actionId, authorName);
      return NextResponse.json({ success: true, result });
    }

    // 2. Avvis handling i godkjenningskøen
    if (action === 'reject_action') {
      if (!body.actionId) {
        return NextResponse.json({ error: 'Mangler actionId' }, { status: 400 });
      }
      const result = await rejectAction(body.actionId, authorName, body.reason);
      return NextResponse.json({ success: true, result });
    }

    // 3. Oppdater innstillinger for autonomi (Copilot vs Autopilot)
    if (action === 'update_settings') {
      if (!body.settings) {
        return NextResponse.json({ error: 'Mangler settings' }, { status: 400 });
      }
      const updated = await saveAutonomySettings(body.settings);
      return NextResponse.json({ success: true, settings: updated });
    }

    // 4. Utfør en komplett autonom revisjonssyklus (Vær, Dagbok, Endringer)
    if (action === 'run_audit_cycle') {
      const cycleResult = await runAutonomousAuditCycle();
      const updatedPending = await getPendingActions();
      return NextResponse.json({ 
        success: true, 
        cycleResult,
        pendingActions: updatedPending
      });
    }

    // 5. Generer ferdig FDV & KS-sluttrapport
    if (action === 'generate_fdv') {
      if (!body.projectId) {
        return NextResponse.json({ error: 'Mangler projectId' }, { status: 400 });
      }
      const report = await generateFDVReport(body.projectId);
      return NextResponse.json({ success: true, report });
    }

    return NextResponse.json({ error: 'Ukjent handling' }, { status: 400 });
  } catch (error: any) {
    return apiError(error, 'Kunne ikke behandle agenthandlingen.');
  }
}
