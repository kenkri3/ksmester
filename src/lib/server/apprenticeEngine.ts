import { getCollectionItems, saveCollectionItem, updateCollectionItem, getCollectionItemById } from './db';
import { generateWithAiEngine } from './aiEngine';

export interface CurriculumGoal {
  id: string;
  trade: string;
  category: string;
  title: string;
  description: string;
  requiredHoursEstimate: number;
}

export interface ApprenticeGoalRecord {
  goalId: string;
  title: string;
  category: string;
  description: string;
  requiredHours: number;
  hoursLogged: number;
  progress: number; // 0 - 100
  status: 'not_started' | 'in_progress' | 'ready_for_review' | 'completed';
  evidenceNotes: string[];
  approvedBy?: string;
  approvedAt?: string;
  lastUpdated?: string;
}

export interface ApprenticeProfileRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  trade: string;
  tradeName: string;
  tradeYear: number; // 1, 2, 3
  startDate: string;
  contractEndDate: string;
  mentorName: string;
  mentorId: string;
  companyId: string;
  totalHoursWorked: number;
  goals: ApprenticeGoalRecord[];
  lastAssessmentDate?: string;
  nextAssessmentDate: string;
  aiRecommendation: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Standardiserte læreplanmål for norske håndverksfag (Udir / Bygghåndverkene)
 */
export const OFFICIAL_CURRICULUM_GOALS: Record<string, CurriculumGoal[]> = {
  carpenter: [
    {
      id: 'carp-01',
      trade: 'carpenter',
      category: 'HMS & Grunnleggende',
      title: 'HMS, SJA og personlig verneutstyr',
      description: 'Gjennomføre Sikker Jobb Analyse (SJA), vurdere risiko ved arbeid i høyden og benytte pålagt verneutstyr iht. Byggherreforskriften.',
      requiredHoursEstimate: 40
    },
    {
      id: 'carp-02',
      trade: 'carpenter',
      category: 'Grunnarbeid & Nivellering',
      title: 'Oppmåling, nivellering og utstikking',
      description: 'Bruke laser, vater og tommestokk for nøyaktig kontroll av vinkler (3-4-5 metoden) og høyder på fundament/sviller.',
      requiredHoursEstimate: 50
    },
    {
      id: 'carp-03',
      trade: 'carpenter',
      category: 'Bærekonstruksjon',
      title: 'Bærekonstruksjoner, stenderverk og bjelkelag',
      description: 'Dimensjonere og bygge bindingsverk, bærevegger, bjelkelag og taksperrer iht. Byggforskserien og TEK17.',
      requiredHoursEstimate: 120
    },
    {
      id: 'carp-04',
      trade: 'carpenter',
      category: 'Tetting & Isolering',
      title: 'Vindsperre, diffusjonssperre og etterisolering',
      description: 'Montere diffusjonsåpen vindsperre med klemte skjøter, dampsperre med klemring og isolasjon uten kuldebroer iht. TEK17 § 14.',
      requiredHoursEstimate: 90
    },
    {
      id: 'carp-05',
      trade: 'carpenter',
      category: 'Kledning & Tak',
      title: 'Utvendig kledning, vannbrett og lufting',
      description: 'Montere stående og liggende kledning, musebånd, luftelekter og beslag for forsvarlig to-trinns tetting mot slagregn.',
      requiredHoursEstimate: 100
    },
    {
      id: 'carp-06',
      trade: 'carpenter',
      category: 'Dører & Vinduer',
      title: 'Montering, tetting og listing av vinduer og dører',
      description: 'Montere lavenergivinduer, bunnfyllingslist, fuging, dytteremser, foringer og gerikter med presise gjæringer.',
      requiredHoursEstimate: 80
    },
    {
      id: 'carp-07',
      trade: 'carpenter',
      category: 'Våtrom & Platekledning',
      title: 'Underlag for våtrom og tverrfaglig lukkesperre',
      description: 'Montere rupanel, Litex/gipsplater, kasse for sisterne og samhandle med rørlegger/elektriker før vegger lukkes (BVN).',
      requiredHoursEstimate: 90
    },
    {
      id: 'carp-08',
      trade: 'carpenter',
      category: 'Kvalitetskontroll',
      title: 'Egenkontroll, avvik og KS-dokumentasjon',
      description: 'Bruke VikingMester til å fotodokumentere utført arbeid, melde avvik og føre elektronisk byggedagbok.',
      requiredHoursEstimate: 40
    }
  ],
  plumber: [
    {
      id: 'plumb-01',
      trade: 'plumber',
      category: 'HMS',
      title: 'HMS, varme arbeider og sikkert verktøybruk',
      description: 'Risikovurdering, brannvern ved varme arbeider og sikker håndtering av kjemikalier fra stoffkartoteket.',
      requiredHoursEstimate: 40
    },
    {
      id: 'plumb-02',
      trade: 'plumber',
      category: 'Sanitær',
      title: 'Rør-i-rør installasjon og fordelerskap',
      description: 'Montere fordelerskap med drensvann til sluk, trekkerør og trykkprøving med dokumentert måling.',
      requiredHoursEstimate: 110
    },
    {
      id: 'plumb-03',
      trade: 'plumber',
      category: 'Avløp',
      title: 'Avløpsledninger, stakeluker og slukmontering',
      description: 'Legge avløp med riktig fall, montere sluk i bjelkelag/betong og sikre forankring for slukmansjett.',
      requiredHoursEstimate: 100
    },
    {
      id: 'plumb-04',
      trade: 'plumber',
      category: 'Varme & Energi',
      title: 'Vannbåren varme og varmepumper',
      description: 'Legging av gulvvarmerør, shuntgrupper og innregulering av varmeanlegg.',
      requiredHoursEstimate: 80
    }
  ],
  electrician: [
    {
      id: 'elec-01',
      trade: 'electrician',
      category: 'HMS & Sikkerhet',
      title: 'FSE, SJA og spenningsløst arbeid',
      description: 'Gjennomføre sikkerhetsrutiner ved arbeid på elektriske anlegg og verifisere spenningsløs tilstand.',
      requiredHoursEstimate: 40
    },
    {
      id: 'elec-02',
      trade: 'electrician',
      category: 'Installasjon',
      title: 'Skjultanlegg, rørføring og kabelstrekk',
      description: 'Føringsveier i tre- og stålkonstruksjoner, montering av bokser og trekking av PN/PR-kabler.',
      requiredHoursEstimate: 120
    },
    {
      id: 'elec-03',
      trade: 'electrician',
      category: 'Fordeling',
      title: 'Sikringsskap, vern og overspenningsvern',
      description: 'Bygge fordelingsskap, montere jordfeilautomater, overspenningsvern og merke kurser iht. NEK 400.',
      requiredHoursEstimate: 90
    },
    {
      id: 'elec-04',
      trade: 'electrician',
      category: 'Sluttkontroll',
      title: 'Sluttkontroll, isolasjonstest og samsvarserklæring',
      description: 'Gjennomføre kontinuitetstest, isolasjonsmåling og utarbeide 5 sikre og samsvarserklæring i systemet.',
      requiredHoursEstimate: 60
    }
  ]
};

/**
 * Henter bedriftens lærlinger
 */
export async function getApprenticeProfiles(companyId?: string): Promise<ApprenticeProfileRecord[]> {
  try {
    const all = await getCollectionItems('apprentice_profiles');
    const list = companyId ? all.filter((a: any) => !a.companyId || a.companyId === companyId) : all;
    return list;
  } catch (e: any) {
    console.warn('[ApprenticeEngine] Feil ved lesing av profiler:', e.message);
    return [];
  }
}



/**
 * ⚡ AUTONOM MOTOR: Knytter førte timer og oppgaver mot lærlingens læreplanmål
 */
export async function syncApprenticeProgressFromTimeEntries(apprenticeId: string): Promise<{
  success: boolean;
  updatedGoalsCount: number;
  newRecommendation: string;
}> {
  const profile = await getCollectionItemById('apprentice_profiles', apprenticeId);
  if (!profile) {
    throw new Error(`Fant ikke lærlingprofil ${apprenticeId}`);
  }

  const allTimeEntries = await getCollectionItems('time_entries').catch(() => []);
  const allTasks = await getCollectionItems('tasks').catch(() => []);

  // Finn poster som tilhører lærlingen
  const lNameLower = profile.name.toLowerCase();
  const lEmailLower = (profile.email || '').toLowerCase();

  const apprenticeTimes = allTimeEntries.filter((te: any) => {
    const uName = (te.userName || '').toLowerCase();
    const uEmail = (te.userEmail || '').toLowerCase();
    return uName.includes(lNameLower) || (lEmailLower && uEmail === lEmailLower) || uName.includes('lærling');
  });

  const apprenticeTasks = allTasks.filter((t: any) => {
    const aTo = (t.assignedTo || '').toLowerCase();
    return aTo.includes(lNameLower) || aTo.includes('lærling');
  });

  let updatedCount = 0;

  // Gå gjennom hvert mål og sjekk om beskrivelser i timelister matcher
  for (const goal of profile.goals) {
    if (goal.status === 'completed') continue;

    const keywords = goal.title.toLowerCase().split(/[\s,–-]+/).filter((w: string) => w.length > 3 && !['montering', 'arbeid', 'bruke', 'iht.'].includes(w));
    
    let additionalHours = 0;
    const newNotes: string[] = [];

    for (const te of apprenticeTimes) {
      const desc = (te.description || '').toLowerCase();
      const isMatch = keywords.some((kw: string) => desc.includes(kw));

      if (isMatch && !goal.evidenceNotes.some((n: string) => n.includes(te.description))) {
        additionalHours += Number(te.hours) || 0;
        if (te.description && newNotes.length < 3) {
          newNotes.push(`${te.date || 'Nylig'}: ${te.description} (${te.hours}t på ${te.projectName || 'Prosjekt'})`);
        }
      }
    }

    if (additionalHours > 0 || newNotes.length > 0) {
      goal.hoursLogged += additionalHours;
      goal.evidenceNotes = [...goal.evidenceNotes, ...newNotes];
      goal.progress = Math.min(100, Math.round((goal.hoursLogged / goal.requiredHours) * 100));

      if (goal.progress >= 90 && goal.status !== 'ready_for_review') {
        goal.status = 'ready_for_review';
      } else if (goal.hoursLogged > 0 && goal.status === 'not_started') {
        goal.status = 'in_progress';
      }

      goal.lastUpdated = new Date().toISOString();
      updatedCount++;
    }
  }

  // Generer en oppdatert AI-anbefaling for faglig leder
  const completedGoals = profile.goals.filter((g: any) => g.status === 'completed');
  const reviewGoals = profile.goals.filter((g: any) => g.status === 'ready_for_review');
  const activeGoal = profile.goals.find((g: any) => g.status === 'in_progress');

  let recommendation = `Lærlingen har fullført ${completedGoals.length} av ${profile.goals.length} læreplanmål. `;
  if (reviewGoals.length > 0) {
    recommendation += `⚠️ ${reviewGoals.length} mål er klare for faglig leders godkjenning («${reviewGoals.map((g: any) => g.title).join('», «')}»). `;
  }
  if (activeGoal) {
    recommendation += `Aktivt opplæringsfokus: ${activeGoal.title} (${activeGoal.progress}% progresjon).`;
  }

  profile.aiRecommendation = recommendation;
  profile.updatedAt = new Date().toISOString();

  await updateCollectionItem('apprentice_profiles', profile.id, profile);

  return {
    success: true,
    updatedGoalsCount: updatedCount,
    newRecommendation: recommendation
  };
}

/**
 * Faglig leder / Admin 1-klikks godkjenning av et læreplanmål
 */
export async function approveApprenticeGoal(params: {
  apprenticeId: string;
  goalId: string;
  approvedBy: string;
  feedback?: string;
}): Promise<{ success: boolean; message: string; goal: ApprenticeGoalRecord }> {
  const { apprenticeId, goalId, approvedBy, feedback } = params;
  const profile = await getCollectionItemById('apprentice_profiles', apprenticeId);
  if (!profile) {
    throw new Error(`Lærling ${apprenticeId} ble ikke funnet.`);
  }

  const goal = profile.goals.find((g: any) => g.goalId === goalId || g.id === goalId);
  if (!goal) {
    throw new Error(`Kompetansemål ${goalId} ble ikke funnet på lærlingen.`);
  }

  const now = new Date().toISOString();
  goal.status = 'completed';
  goal.progress = 100;
  goal.approvedBy = approvedBy;
  goal.approvedAt = now;
  if (feedback) {
    goal.evidenceNotes.push(`Faglig leder vurdering (${approvedBy}): ${feedback}`);
  }

  profile.updatedAt = now;
  await updateCollectionItem('apprentice_profiles', profile.id, profile);

  // Registrer i aktivitetsloggen for bedriften
  await saveCollectionItem('agent_activities', {
    type: 'apprentice_goal_approved',
    title: `Læreplanmål godkjent for ${profile.name}`,
    description: `Mål «${goal.title}» er formelt verifisert og godkjent av faglig leder ${approvedBy}.`,
    trade: profile.tradeName,
    tradeName: approvedBy,
    badge: 'LÆREPLAN GODKJENT',
    status: 'approved',
    createdAt: now
  });

  return {
    success: true,
    message: `Målet «${goal.title}» er nå formelt godkjent og protokollført for ${profile.name}.`,
    goal
  };
}

/**
 * Genererer offisiell halvårsrapport / vurderingssamtale-underlag
 */
export async function generateApprenticeHalfYearReport(apprenticeId: string): Promise<{
  reportId: string;
  title: string;
  generatedAt: string;
  summary: string;
  completedGoalsCount: number;
  inProgressGoalsCount: number;
  totalHours: number;
  reportHtml: string;
}> {
  const profile = await getCollectionItemById('apprentice_profiles', apprenticeId);
  if (!profile) {
    throw new Error(`Lærling ${apprenticeId} ikke funnet`);
  }

  const completed = profile.goals.filter((g: any) => g.status === 'completed');
  const inProgress = profile.goals.filter((g: any) => g.status === 'in_progress' || g.status === 'ready_for_review');
  const notStarted = profile.goals.filter((g: any) => g.status === 'not_started');
  const now = new Date().toISOString();

  const reportId = `report-appr-${profile.id}-${now.split('T')[0]}`;

  const reportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.5; padding: 30px; }
        .header { border-bottom: 3px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .meta-table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; }
        .goal-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
        .badge-completed { background: #dcfce7; color: #15803d; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
        .badge-progress { background: #fef3c7; color: #b45309; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
        .sign-box { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
        .sign-line { flex: 1; border-top: 1px solid #000; padding-top: 8px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0; font-size: 24px;">Opplæringsrapport & Halvårsvurdering</h1>
        <p style="margin: 4px 0 0 0; color: #64748b;">Underlag for vurderingssamtale og opplæringskontor • ${profile.tradeName}</p>
      </div>

      <table class="meta-table">
        <tr>
          <td style="background: #f8fafc; font-weight: bold; width: 25%;">Lærling:</td>
          <td>${profile.name} (${profile.email})</td>
          <td style="background: #f8fafc; font-weight: bold; width: 25%;">Læreår / Periode:</td>
          <td>${profile.tradeYear}. Læreår (${profile.startDate} til ${profile.contractEndDate})</td>
        </tr>
        <tr>
          <td style="background: #f8fafc; font-weight: bold;">Faglig leder / Mentor:</td>
          <td>${profile.mentorName}</td>
          <td style="background: #f8fafc; font-weight: bold;">Generert dato:</td>
          <td>${now.split('T')[0]} (VikingMester Autonom Agent)</td>
        </tr>
        <tr>
          <td style="background: #f8fafc; font-weight: bold;">Totale arbeidstimer:</td>
          <td>${profile.totalHoursWorked} timer logget i KS-systemet</td>
          <td style="background: #f8fafc; font-weight: bold;">Måloppnåelse:</td>
          <td><strong>${completed.length} av ${profile.goals.length} mål godkjent</strong> (${Math.round((completed.length / profile.goals.length) * 100)}%)</td>
        </tr>
      </table>

      <h3>1. Formelt Godkjente Kompetansemål (${completed.length})</h3>
      ${completed.map((g: any) => `
        <div class="goal-box" style="border-left: 4px solid #10b981;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${g.title}</strong>
            <span class="badge-completed">GODKJENT AV FAGLIG LEDER</span>
          </div>
          <p style="font-size: 13px; color: #475569; margin: 4px 0 8px 0;">${g.description}</p>
          <div style="font-size: 12px; color: #64748b;">
            Logget timer: ${g.hoursLogged}t • Godkjent av: <strong>${g.approvedBy || profile.mentorName}</strong> (${g.approvedAt?.split('T')[0] || 'Tidligere'})
          </div>
        </div>
      `).join('')}

      <h3>2. Mål Under Arbeid (${inProgress.length})</h3>
      ${inProgress.map((g: any) => `
        <div class="goal-box" style="border-left: 4px solid #f59e0b;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${g.title}</strong>
            <span class="badge-progress">${g.status === 'ready_for_review' ? 'KLAR FOR GODKJENNING' : `${g.progress}% FULLFØRT`}</span>
          </div>
          <p style="font-size: 13px; color: #475569; margin: 4px 0 8px 0;">${g.description}</p>
          <div style="font-size: 12px; color: #64748b;">
            Timer: ${g.hoursLogged}t / ${g.requiredHours}t mål • Loggnotat: ${g.evidenceNotes?.[0] || 'Praktisk fagarbeid pågående'}
          </div>
        </div>
      `).join('')}

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <h4 style="margin: 0 0 6px 0; color: #166534;">MesterAI Faglig Vurdering for Neste Halvår</h4>
        <p style="margin: 0; font-size: 13px; color: #14532d;">${profile.aiRecommendation}</p>
      </div>

      <div class="sign-box">
        <div class="sign-line">
          Sted og dato:<br><br><br>
          ______________________________________<br>
          ${profile.name} (Lærling)
        </div>
        <div class="sign-line">
          Sted og dato:<br><br><br>
          ______________________________________<br>
          ${profile.mentorName} (Faglig Leder)
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    reportId,
    title: `Halvårsrapport: ${profile.name} (${profile.tradeName})`,
    generatedAt: now,
    summary: `Rapport for ${profile.name}: ${completed.length} mål fullført, ${inProgress.length} under arbeid, totalt ${profile.totalHoursWorked} timer logget.`,
    completedGoalsCount: completed.length,
    inProgressGoalsCount: inProgress.length,
    totalHours: profile.totalHoursWorked,
    reportHtml
  };
}
