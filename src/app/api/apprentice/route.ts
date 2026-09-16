import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, verifyCronOrInternalSecret } from '@/src/lib/server/auth';
import { 
  getApprenticeProfiles, 
  syncApprenticeProgressFromTimeEntries, 
  approveApprenticeGoal, 
  generateApprenticeHalfYearReport,
  OFFICIAL_CURRICULUM_GOALS
} from '@/src/lib/server/apprenticeEngine';
import { saveCollectionItem } from '@/src/lib/server/db';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  const isCronOrInternal = verifyCronOrInternalSecret(req);

  if (!user && !isCronOrInternal) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  try {
    const companyId = user?.companyId || 'comp-001';
    const apprentices = await getApprenticeProfiles(companyId);

    const pendingReviewsCount = apprentices.reduce((acc, curr) => 
      acc + curr.goals.filter(g => g.status === 'ready_for_review').length, 0
    );

    return NextResponse.json({
      success: true,
      apprentices,
      pendingReviewsCount
    });
  } catch (error: any) {
    console.error('Apprentice route GET error:', error);
    return NextResponse.json({ error: error.message || 'Internt feil' }, { status: 500 });
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
    const authorName = user?.displayName || user?.email?.split('@')[0] || 'Faglig leder';

    // 1. Synkroniser fremdrift fra timelister og oppgaver
    if (action === 'sync_progress') {
      const apprenticeId = body.apprenticeId;
      if (!apprenticeId) {
        return NextResponse.json({ error: 'Mangler apprenticeId' }, { status: 400 });
      }
      const result = await syncApprenticeProgressFromTimeEntries(apprenticeId);
      return NextResponse.json({ success: true, result });
    }

    // 2. 1-Klikks godkjenning av læreplanmål fra faglig leder / admin
    if (action === 'approve_goal') {
      const { apprenticeId, goalId, feedback } = body;
      if (!apprenticeId || !goalId) {
        return NextResponse.json({ error: 'Mangler apprenticeId eller goalId' }, { status: 400 });
      }

      const result = await approveApprenticeGoal({
        apprenticeId,
        goalId,
        approvedBy: authorName,
        feedback: feedback || body.note
      });

      return NextResponse.json({ success: true, ...result });
    }

    // 3. Generer offisiell halvårsrapport / vurderingssamtale-underlag
    if (action === 'generate_report') {
      const apprenticeId = body.apprenticeId;
      if (!apprenticeId) {
        return NextResponse.json({ error: 'Mangler apprenticeId' }, { status: 400 });
      }
      const report = await generateApprenticeHalfYearReport(apprenticeId);
      return NextResponse.json({ success: true, report });
    }

    // 4. Registrer ny lærling
    if (action === 'create_apprentice') {
      const trade = body.trade || 'carpenter';
      const goals = (body.goals && body.goals.length > 0) ? body.goals : (OFFICIAL_CURRICULUM_GOALS[trade] || OFFICIAL_CURRICULUM_GOALS.carpenter || []).map(g => ({
        goalId: g.id,
        title: g.title,
        category: g.category,
        description: g.description,
        requiredHours: g.requiredHoursEstimate,
        hoursLogged: 0,
        progress: 0,
        status: 'not_started' as const,
        evidenceNotes: []
      }));

      const newApprentice = {
        id: `apprentice-${Date.now()}`,
        name: body.name,
        email: body.email,
        phone: body.phone || '',
        trade: trade,
        tradeName: body.tradeName || 'Tømrerfaget',
        tradeYear: Number(body.tradeYear) || 1,
        startDate: body.startDate || new Date().toISOString().split('T')[0],
        contractEndDate: body.contractEndDate || new Date(Date.now() + 730 * 86400000).toISOString().split('T')[0],
        mentorName: authorName,
        mentorId: user?.id || 'admin-001',
        companyId: user?.companyId || 'comp-001',
        totalHoursWorked: 0,
        goals,
        nextAssessmentDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
        aiRecommendation: 'Lærling registrert. Sett opp første introduksjon til HMS og verktøyopplæring.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveCollectionItem('apprentice_profiles', newApprentice);
      return NextResponse.json({ success: true, apprentice: newApprentice });
    }

    return NextResponse.json({ error: 'Ukjent handling' }, { status: 400 });
  } catch (error: any) {
    console.error('Apprentice route POST error:', error);
    return NextResponse.json({ error: error.message || 'Internt feil' }, { status: 500 });
  }
}
