import { getCollectionItems, saveCollectionItem } from './db';
import { processAutonomousNurtureSequence } from './nurtureEngine';
// FIX (11.09.2026): GoogleGenAI-import fjernet – ikke lenger brukt her, se begrunnelse i
// runDailyAudit() under (deterministisk morgen-brief, fjernet fabrikkert byggedagbok-generator).

export async function runDailyAudit(options?: { force?: boolean }) {
  const startTime = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];

  // FIX (11.09.2026) - Idempotens/token-sparing: Flere uavhengige triggere (innebygd
  // bakgrunnsscheduler, GitHub Actions daily-audit.yml, evt. egen Railway cron-worker, og
  // eksterne kall til /api/cron/daily-summary) kunne alle utløse en FULL ny kjøring samme
  // morgen - med duplisert Gemini/DeepSeek-tokenbruk hver gang. Denne sperren gjør at kun
  // den første reelle kjøringen per dag utfører AI-kallet og byggedagbok-generering; senere
  // kall samme dag returnerer bare det som allerede ble generert (med mindre force=true).
  // Kundeoppfølgingen i processAutonomousNurtureSequence() har uansett sin egen 18-timers
  // sperre og steg-gating, så den var allerede beskyttet mot dobbel utsendelse.
  if (!options?.force) {
    try {
      const existingSummaries = await getCollectionItems('daily_summaries');
      const todaysSummary = existingSummaries.find((s: any) => s.id === `daily-summary-${todayStr}`);
      if (todaysSummary) {
        console.log(`⏭️ [Daily Audit] Allerede kjørt i dag (${todaysSummary.timestamp}) - hopper over duplisert AI-kall og byggedagbok-generering.`);
        return todaysSummary;
      }
    } catch (e: any) {
      console.warn('[Daily Audit] Kunne ikke sjekke idempotens, fortsetter uansett:', e.message);
    }
  }

  console.log('🚀 [Daily Audit] Starter daglig KS & HMS bakgrunnsrevisjon...');

  const projects = await getCollectionItems('projects');
  const deviations = await getCollectionItems('deviations');

  const activeProjects = projects.filter((p: any) => p.status === 'active' || !p.status);
  // FIX (11.09.2026): Ekte avvik lagres med ENGELSKE verdier ('open'/'in-progress',
  // severity 'high'/'critical') per src/types.ts og CreateDeviationModal.tsx. De gamle
  // norske strengene ('åpen'/'kritisk'/'høy') matchet aldri reelle avviksposter, så kritiske
  // avvik ble aldri fanget opp i denne revisjonen. Støtter begge for bakoverkompatibilitet.
  const openDeviations = deviations.filter((d: any) => ['open', 'in-progress', 'åpen', 'under_behandling'].includes(d.status));
  const criticalDeviations = openDeviations.filter((d: any) => ['high', 'critical', 'kritisk', 'høy'].includes(d.severity));

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

  // FIX (11.09.2026) - Token-sparing uten kvalitetstap: Denne AI-genererte teksten er kun en
  // 2-3 setnings "motiverende morgen-brief" for ledelsen (ikke juridisk/HMS-kritisk innhold),
  // og koden hadde ALLEREDE en fullgod deterministisk setning klar over (aiSummaryText). Å kjøre
  // et Gemini-kall (med inntil 4 modell-forsøk i kjede) og deretter et DeepSeek-fallback-kall
  // for denne ene setningen ga unødvendig token-/kostnadsbruk hver dag uten merkbar kvalitetsheving.
  // AI brukes fortsatt fullt ut der presisjon faktisk er kritisk (SJA, endringsordrer/NS 8406,
  // TEK17-bildeanalyse) – kun denne lavverdi-oppsummeringen er gjort deterministisk.
  // Den forrige AI-koden er bevisst fjernet i sin helhet (ikke bare kommentert ut) for å unngå
  // forvirring om hvilken vei som faktisk kjører; se git-historikk for full gjenoppretting ved behov.

  // FIX (11.09.2026) - KRITISK DATAKVALITET: Denne seksjonen fabrikkerte tidligere en KOMPLETT
  // "automatisk byggedagbok" hver dag for hvert aktive prosjekt, med FASTE oppdiktede tall
  // (temperatur 8-14°C, vind 4 m/s, 0 mm nedbør, 2 personer på laget, 15 arbeidstimer, faste
  // oppgavetekster) uavhengig av hva som faktisk skjedde på byggeplassen. Disse postene ble
  // lagret i databasen som ordinære byggedagbok-oppføringer (Byggherreforskriften § 15 / NS
  // 8405/8406) – altså juridisk relevant dokumentasjon – og gjorde at ettermiddagssjekken for
  // "manglende byggedagbok" ALDRI slo ut, siden en (fiktiv) oppføring alltid fantes.
  // Automatisk byggedagbok-generering er derfor fjernet inntil den kan bygges riktig: med ekte
  // værdata for prosjektets faktiske adresse (krever geokoding, ikke implementert her) og uten
  // å dikte opp bemanning/timer/oppgaver som ingen håndverker faktisk har rapportert. Inntil
  // videre må/skal byggedagbok fylles inn av et menneske (tale, tekst eller app), slik at
  // ettermiddagssjekken korrekt fanger opp reelt manglende føring.

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

  // 6. Autonomous Customer Nurture & Upsell Sequence (Dag 3, 7, 14, 21)
  try {
    const nurtureResult = await processAutonomousNurtureSequence();
    console.log(`✉️ [Daily Nurture] Evaluert ${nurtureResult.processedCount} kunder, sendte ${nurtureResult.emailsSentCount} oppfølgingsmailer.`);
  } catch (nurtureErr: any) {
    console.warn('[Daily Nurture] Feil under nurture-kjøring:', nurtureErr.message);
  }

  return summaryRecord;
}

let isScheduled = false;

export function startBackgroundScheduler() {
  if (isScheduled) return;
  isScheduled = true;

  console.log('🕒 [Background Scheduler] VikingMester scheduler initiert (Europe/Oslo)');

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
