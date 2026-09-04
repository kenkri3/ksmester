import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItems, saveCollectionItem } from '@/src/lib/server/db';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  // 1. Verify cron secret if configured
  const cronSecret = process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET;
  const authHeader = req.headers.get('authorization');
  const querySecret = req.nextUrl.searchParams.get('secret');

  if (cronSecret) {
    const provided = authHeader?.replace('Bearer ', '') || querySecret;
    if (provided !== cronSecret) {
      return NextResponse.json({ error: 'Uautorisert cron-tilgang' }, { status: 401 });
    }
  }

  try {
    const startTime = Date.now();
    const projects = await getCollectionItems('projects');
    const deviations = await getCollectionItems('deviations');

    const activeProjects = projects.filter((p: any) => p.status === 'active' || !p.status);
    const openDeviations = deviations.filter((d: any) => d.status === 'åpen' || d.status === 'under_behandling');
    const criticalDeviations = openDeviations.filter((d: any) => d.severity === 'kritisk' || d.severity === 'høy');

    // 2. Deterministic summary (0 tokens spent)
    const metrics = {
      timestamp: new Date().toISOString(),
      activeProjectsCount: activeProjects.length,
      openDeviationsCount: openDeviations.length,
      criticalDeviationsCount: criticalDeviations.length,
      projectsNeedingDocumentation: activeProjects.filter((p: any) => (p.documentationLevel || 0) < 60).length
    };

    let aiSummaryText = `Automatisk status per ${new Date().toLocaleDateString('nb-NO')}: ${activeProjects.length} aktive prosjekter, ${openDeviations.length} åpne avvik (${criticalDeviations.length} med høy/kritisk alvorlighet).`;

    // 3. Only call DeepSeek if there are open critical issues or active projects, saving tokens
    const deepseekKey = process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY;
    let tokensUsed = 0;

    if (deepseekKey && (criticalDeviations.length > 0 || activeProjects.length > 0)) {
      try {
        const prompt = `Generer en kortfattet, motiverende og profesjonell morgen-brief (maks 3 setninger) for en norsk byggmester:
Prosjekter: ${activeProjects.map((p: any) => p.name).slice(0, 5).join(', ')}.
Åpne avvik: ${openDeviations.length} (Kritiske: ${criticalDeviations.map((d: any) => d.title).slice(0, 3).join(', ') || 'Ingen'}).`;

        const deepSeekRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: 'Du er KS MesterAI. Skriv en presis og oppmuntrende morgen-brief til byggeledelsen på profesjonelt norsk.'
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.3
          })
        });

        if (deepSeekRes.ok) {
          const aiData = await deepSeekRes.json();
          aiSummaryText = aiData.choices?.[0]?.message?.content?.trim() || aiSummaryText;
          tokensUsed = aiData.usage?.total_tokens || 0;
        }
      } catch (aiErr) {
        console.warn('Cron DeepSeek summary notice:', aiErr);
      }
    }

    // 4. Save pre-computed summary to items_store
    const summaryRecord = {
      id: `daily-summary-${new Date().toISOString().split('T')[0]}`,
      ...metrics,
      aiSummary: aiSummaryText,
      tokensUsed,
      executionDurationMs: Date.now() - startTime
    };

    await saveCollectionItem('daily_summaries', summaryRecord);

    return NextResponse.json({
      success: true,
      message: 'Daglig cron-kjøring fullført',
      summary: summaryRecord
    });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: error.message || 'Cron feilet' }, { status: 500 });
  }
}
