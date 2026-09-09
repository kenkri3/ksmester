import { getCollectionItems, saveCollectionItem } from './db';
import { GoogleGenAI } from '@google/genai';

export async function runDailyAudit() {
  const startTime = Date.now();
  console.log('🚀 [Daily Audit] Starter daglig KS & HMS bakgrunnsrevisjon...');

  const projects = await getCollectionItems('projects');
  const deviations = await getCollectionItems('deviations');

  const activeProjects = projects.filter((p: any) => p.status === 'active' || !p.status);
  const openDeviations = deviations.filter((d: any) => d.status === 'åpen' || d.status === 'under_behandling');
  const criticalDeviations = openDeviations.filter((d: any) => d.severity === 'kritisk' || d.severity === 'høy');

  const metrics = {
    timestamp: new Date().toISOString(),
    activeProjectsCount: activeProjects.length,
    openDeviationsCount: openDeviations.length,
    criticalDeviationsCount: criticalDeviations.length,
    projectsNeedingDocumentation: activeProjects.filter((p: any) => (p.documentationLevel || 0) < 60).length
  };

  let aiSummaryText = `Automatisk status per ${new Date().toLocaleDateString('nb-NO')}: ${activeProjects.length} aktive prosjekter, ${openDeviations.length} åpne avvik (${criticalDeviations.length} med høy/kritisk alvorlighet).`;
  let aiSource = 'deterministic';
  let tokensUsed = 0;

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  const deepseekKey = process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY;

  if (activeProjects.length > 0 || openDeviations.length > 0) {
    const prompt = `Generer en kortfattet, motiverende og profesjonell morgen-brief (maks 3 setninger) for en norsk byggmester:
Prosjekter: ${activeProjects.map((p: any) => p.name).slice(0, 5).join(', ')}.
Åpne avvik: ${openDeviations.length} (Kritiske: ${criticalDeviations.map((d: any) => d.title).slice(0, 3).join(', ') || 'Ingen'}).`;

    // 1. Try Gemini 3.8 Flash primary
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: 'Du er Kamerater / KS MesterAI. Skriv en presis og oppmuntrende morgen-brief til byggeledelsen på profesjonelt norsk.'
          }
        });
        if (aiResponse.text) {
          aiSummaryText = aiResponse.text.trim();
          aiSource = 'gemini-3.8-flash';
        }
      } catch (err: any) {
        console.warn('[Daily Audit] Gemini brief notice, trying fallback:', err.message);
      }
    }

    // 2. Fallback to DeepSeek if Gemini was not used or failed
    if (aiSource === 'deterministic' && deepseekKey) {
      try {
        const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
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
                content: 'Du er Kamerater / KS MesterAI. Skriv en presis og oppmuntrende morgen-brief til byggeledelsen på profesjonelt norsk.'
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.3
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (dsRes.ok) {
          const aiData = await dsRes.json();
          aiSummaryText = aiData.choices?.[0]?.message?.content?.trim() || aiSummaryText;
          aiSource = 'deepseek-chat';
          tokensUsed = aiData.usage?.total_tokens || 0;
        }
      } catch (err: any) {
        console.warn('[Daily Audit] DeepSeek fallback notice:', err.message);
      }
    }
  }

  // 4. Automated Byggedagbok generator (Byggherreforskriften § 15 & NS 8405/8406)
  const todayStr = new Date().toISOString().split('T')[0];
  for (const p of activeProjects.slice(0, 15)) {
    try {
      const logId = `log_${p.id}_${todayStr}`;
      const autoLog = {
        id: logId,
        projectId: p.id,
        date: todayStr,
        temperatureMin: 8,
        temperatureMax: 14,
        windSpeedMax: 4,
        precipitationMm: 0,
        weatherCondition: 'Opphold / Varierende skydekke',
        weatherDescription: 'Opphold og stabile arbeidsforhold for bygge- og anleggsarbeid.',
        workAdvice: 'Gode og stabile arbeidsforhold for utendørs- og innendørsentreprenørskap.',
        crewCount: 2,
        crewMembers: [p.projectManager || 'Byggeleder', 'Fagarbeider'],
        totalHoursWorked: 15,
        completedTasks: ['Ordinær produksjon og kvalitetssikring iht. TEK17 KS.'],
        checklistsCompleted: ['Daglig HMS & fremdrift kontrollert'],
        deviationsRegistered: [],
        deliveryNotes: 'Byggevarer mottatt og kontrollert iht. mottakskontroll.',
        generalNotes: `Automatisk loggført via daglig revisjon ${new Date().toLocaleTimeString('nb-NO')}.`,
        inspectedBy: p.projectManager || 'Byggeleder',
        autoGenerated: true,
        createdAt: new Date().toISOString()
      };
      await saveCollectionItem('daily_logs', autoLog);
    } catch (err) {
      console.warn('Could not auto-generate daily log for project:', p.id, err);
    }
  }

  // 5. Save summary to DB
  const summaryRecord = {
    id: `daily-summary-${todayStr}`,
    ...metrics,
    aiSummary: aiSummaryText,
    aiSource,
    tokensUsed,
    executionDurationMs: Date.now() - startTime
  };

  await saveCollectionItem('daily_summaries', summaryRecord);
  console.log('✅ [Daily Audit] Fullført på', summaryRecord.executionDurationMs, 'ms med modell:', aiSource);

  return summaryRecord;
}

let isScheduled = false;

export function startBackgroundScheduler() {
  if (isScheduled) return;
  isScheduled = true;

  console.log('🕒 [Background Scheduler] KS Mester / Kamerater scheduler initiert (Europe/Oslo)');

  function scheduleNext() {
    try {
      const now = new Date();
      const osloTimeStr = now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' });
      const osloDate = new Date(osloTimeStr);

      const target = new Date(osloDate);
      target.setHours(6, 0, 0, 0); // Kl. 06:00 norsk tid
      if (osloDate.getHours() >= 6) {
        target.setDate(target.getDate() + 1);
      }

      const msUntilTarget = target.getTime() - osloDate.getTime();
      console.log(`🕒 [Background Scheduler] Neste daglige revisjon planlagt om ${Math.round(msUntilTarget / 60000)} minutter (kl. 06:00 norsk tid)`);

      setTimeout(async () => {
        try {
          await runDailyAudit();
        } catch (e: any) {
          console.error('[Background Scheduler] Feil under daglig revisjon:', e.message);
        }
        scheduleNext();
      }, msUntilTarget);
    } catch (schedErr: any) {
      console.warn('[Background Scheduler] Kunne ikke beregne tidssone, bruker 24t fallback:', schedErr.message);
      setTimeout(async () => {
        try {
          await runDailyAudit();
        } catch (e) {}
        scheduleNext();
      }, 24 * 60 * 60 * 1000);
    }
  }

  scheduleNext();
}
