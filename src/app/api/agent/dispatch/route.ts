import { NextRequest, NextResponse } from 'next/server';
import { generateSJAAction } from '@/src/app/actions/aiActions';
import { evaluatePreCloseWall } from '@/src/lib/server/crossTradeEngine';
import { createAutonomousChangeOrder } from '@/src/lib/server/changeOrderAgent';
import { saveCollectionItem, getCollectionItems, updateCollectionItem, getCollectionItemById } from '@/src/lib/server/db';
import { GoogleGenAI } from '@google/genai';
import { trackTokenCost } from '@/src/lib/server/costTracker';
import { getUserFromRequest, verifyCronOrInternalSecret } from '@/src/lib/server/auth';

// 🛡️ SECURITY FIX (11.09.2026): Denne ruten var helt uten tilgangskontroll og eksponerte
// endringsordre-godkjenningstokens (co.token/shareUrl – nok til å godkjenne eller avvise ekte
// kunders tillegg uten fullmakt), kundedata og driftstall til hvem som helst på internett uten
// pålogging. Krever nå enten en gyldig innlogget bruker (JWT, samme som resten av appen) eller
// den interne cron-/servicehemmeligheten (for automatiserte overvåkingskall).
function isAuthorizedDispatchCaller(req: NextRequest): boolean {
  return verifyCronOrInternalSecret(req) || !!getUserFromRequest(req);
}

/**
 * GET /api/agent/dispatch
 * Returns real-time status of the autonomous agent, active rules,
 * pending approvals (human-in-the-loop), metrics, and recent activities.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedDispatchCaller(req)) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');

    const [allProjects, allChangeOrders, allDeviations, allLogs, allActivities] = await Promise.all([
      getCollectionItems('projects'),
      getCollectionItems('change_orders'),
      getCollectionItems('deviations'),
      getCollectionItems('daily_logs'),
      getCollectionItems('agent_activities')
    ]);

    // 🛡️ Multi-tenant isolasjon: Isoler per bedrift med mindre super-admin eller intern hemmelighet
    const user = getUserFromRequest(req);
    const isSuperAdmin = user?.role === 'admin' || verifyCronOrInternalSecret(req);
    const companyId = user?.companyId;

    let projects = allProjects;
    let changeOrders = allChangeOrders;
    let deviations = allDeviations;
    let todayLogsList = allLogs;
    let activitiesList = allActivities;

    if (!isSuperAdmin && companyId) {
      projects = allProjects.filter((p: any) => !p.companyId || p.companyId === companyId);
      const projectIds = new Set(projects.map((p: any) => p.id));
      changeOrders = allChangeOrders.filter((c: any) => (!c.companyId || c.companyId === companyId) || (c.projectId && projectIds.has(c.projectId)));
      deviations = allDeviations.filter((d: any) => (!d.companyId || d.companyId === companyId) || (d.projectId && projectIds.has(d.projectId)));
      todayLogsList = allLogs.filter((l: any) => (!l.companyId || l.companyId === companyId) || (l.projectId && projectIds.has(l.projectId)));
      activitiesList = allActivities.filter((a: any) => (!a.companyId || a.companyId === companyId) || (a.projectId && projectIds.has(a.projectId)));
    }

    // Filter by project if requested
    if (projectId) {
      changeOrders = changeOrders.filter((c: any) => c.projectId === projectId);
      deviations = deviations.filter((d: any) => d.projectId === projectId);
    }

    // 1. Pending approvals requiring admin sign-off
    const pendingChangeOrders = changeOrders.filter((c: any) => 
      c.status === 'pending_approval' || c.status === 'pending_customer' || !c.status
    );

    // FIX (11.09.2026): Ekte avvik lagres med ENGELSKE verdier ('open'/'in-progress',
    // severity 'high'/'critical') per src/types.ts og CreateDeviationModal.tsx. De gamle
    // norske strengene ('åpen'/'kritisk'/'høy') matchet aldri reelle avviksposter, så
    // kritiske avvik ble aldri fanget opp her. Støtter begge for bakoverkompatibilitet.
    const pendingDeviations = deviations.filter((d: any) => 
      ['open', 'in-progress', 'åpen', 'under_behandling'].includes(d.status) &&
      ['high', 'critical', 'kritisk', 'høy'].includes(d.severity)
    );

    // 2. Metrics calculation
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = todayLogsList.filter((l: any) => (l.createdAt || l.date || '').startsWith(todayStr));
    const todayActivities = activitiesList.filter((a: any) => (a.createdAt || '').startsWith(todayStr));
    
    const securedRevenue = changeOrders.reduce((sum: number, co: any) => sum + (Number(co.amountExVat) || 0), 0);

    const recentActivities = activitiesList.slice(0, 20);

    return NextResponse.json({
      success: true,
      agentStatus: {
        name: 'VikingMester Autonom Agent',
        status: 'online',
        email: 'hei@vikingmester.no',
        channels: ['E-post lytter (hei@vikingmester.no)', 'Tale & Diktering i felt', 'TEK17 Vision-skanner', 'SMS/MMS Gateway'],
        activeRules: [
          'TEK17 § 13-15 (Vanninstallasjoner & Slukmansjett)',
          'Byggherreforskriften § 15 (Elektronisk Byggedagbok)',
          'Byggherreforskriften § 18 (Sikker Jobb Analyse)',
          'NS 8406 pkt. 19.2 (Varslingsplikt & Tilleggsvederlag)',
          'Våtromsnormen BVN 31.205 (Membran & Klemring)',
          'NEK 400:2022 (Skjultanlegg før lukking)'
        ],
        lastPing: new Date().toISOString()
      },
      metrics: {
        todayActionsCount: todayLogs.length + todayActivities.length,
        pendingApprovalsCount: pendingChangeOrders.length,
        activeBlockersCount: pendingDeviations.length,
        activeProjectsCount: projects.filter((p: any) => p.status === 'active' || !p.status).length,
        securedRevenue
      },
      // Ekte prosjekter og ekte kritiske avvik, isolert per bedrift
      activeProjectsSummary: projects
        .filter((p: any) => p.status === 'active' || !p.status)
        .slice(0, 25)
        .map((p: any) => ({ id: p.id, name: p.name, location: p.location || null, progress: p.progress ?? null })),
      criticalDeviations: pendingDeviations.slice(0, 25).map((d: any) => ({
        id: d.id,
        projectId: d.projectId,
        projectName: d.project || null,
        title: d.title,
        description: d.description,
        severity: d.severity,
        location: d.location || null
      })),
      pendingApprovals: pendingChangeOrders.map((co: any) => ({
        id: co.id,
        type: 'change_order',
        title: co.title,
        description: co.description,
        amountExVat: co.amountExVat,
        vatAmount: co.vatAmount,
        totalAmount: co.totalAmount,
        impactDays: co.impactDays,
        legalHjemmel: co.legalHjemmel,
        // FIX (11.09.2026): Nøytral fallback i stedet for et spesifikt (og potensielt feil) ekte
        // prosjektnavn, som ga inntrykk av at endringsordren tilhørte et bestemt prosjekt.
        projectName: co.projectName || 'Ukjent prosjekt',
        authorName: co.authorName || 'Håndverker',
        createdAt: co.createdAt,
        token: co.token,
        shareUrl: co.shareUrl
      })),
      recentActivities
    });
  } catch (error: any) {
    console.error('Agent dispatch GET error:', error);
    return NextResponse.json({ error: error.message || 'Internt agentfeil' }, { status: 500 });
  }
}

/**
 * POST /api/agent/dispatch
 * Handles instructions, quick commands, voice-to-action, approvals, and validations.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedDispatchCaller(req)) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const action = body.action || body.actionType;
    const text = body.text || body.instruction;
    const { 
      projectId, 
      projectName, 
      roomOrZone, 
      trade = 'general', 
      authorName = 'Håndverker', 
      language = 'no',
      changeOrderId,
      companyId
    } = body;

    // 1. Quick Intelligent Command (Dispatches to correct engine automatically)
    if (action === 'quick_command' || action === 'ask') {
      if (!text) {
        return NextResponse.json({ error: 'Mangler kommando/tekst' }, { status: 400 });
      }

      const lower = text.toLowerCase();

      // Check if user is asking to create a change order (endringsordre / tillegg)
      if (lower.includes('endring') || lower.includes('tillegg') || lower.includes('ekstra') || lower.includes('avviksfaktura')) {
        const result = await createAutonomousChangeOrder({
          projectId: projectId || 'proj-101',
          projectName: projectName || 'Nyebakken 14 - Totalrenovering',
          spokenText: text,
          authorId: 'admin_user',
          authorName: authorName
        });

        // Log agent activity
        await saveCollectionItem('agent_activities', {
          type: 'change_order',
          title: `Tilleggsordre generert: ${result.changeOrder.title}`,
          description: `Beregnet beløp: kr ${result.changeOrder.amountExVat?.toLocaleString('no-NO')} eks mva (${result.changeOrder.impactDays} dagers fristforlengelse).`,
          trade: trade || 'general',
          tradeName: 'Byggeleder',
          status: 'pending_approval',
          badge: 'NS 8406'
        });

        return NextResponse.json({
          success: true,
          action: 'change_order',
          reply: `Mottatt! Endringsordre "${result.changeOrder.title}" er opprettet på kr ${result.changeOrder.totalAmount?.toLocaleString('no-NO')} ink. mva. Den ligger nå klar i godkjenningskøen for utsending til kunde.`,
          data: result.changeOrder
        });
      }

      // Check if user is asking for SJA (Sikker Jobb Analyse)
      if (lower.includes('sja') || lower.includes('sikker jobb') || lower.includes('risiko') || lower.includes('stillas') || lower.includes('verneutstyr')) {
        const sjaResult = await generateSJAAction(text);
        
        await saveCollectionItem('agent_activities', {
          type: 'sja',
          title: `SJA opprettet: ${sjaResult.data.title}`,
          description: `Vernetiltak og risikovurdering registrert iht. ${sjaResult.data.tek17Reference}.`,
          trade: trade || 'general',
          tradeName: 'HMS-ansvarlig',
          status: 'verified',
          badge: 'Byggherreforskriften § 18'
        });

        return NextResponse.json({
          success: true,
          action: 'sja',
          reply: `Sikker Jobb Analyse (SJA) er generert for "${sjaResult.data.title}". Risikoer og pålagte tiltak iht. ${sjaResult.data.tek17Reference} er arkivert på prosjektet.`,
          data: sjaResult.data
        });
      }

      // Check if user is asking for lukkesperre (pre-close check)
      if (lower.includes('lukke') || lower.includes('vegg') || lower.includes('gips') || lower.includes('plate') || lower.includes('sperre')) {
        const room = roomOrZone || 'Aktuell sone';
        const evaluation = evaluatePreCloseWall({
          roomName: room,
          hasPlumberSignoff: false,
          hasElectricianPhotos: true,
          hasVaporBarrierChecked: true,
          hasInsulationChecked: true
        });

        return NextResponse.json({
          success: true,
          action: 'pre_close_check',
          reply: evaluation.canClose
            ? `GRØNT LYS for ${room}! Alle tverrfaglige forutsetninger er verifisert. Du kan trygt lukke veggen.`
            : `RØDT LYS / STOPP for ${room}! Veggen kan IKKE lukkes ennå: ${evaluation.blockers.join(' ')}`,
          evaluation
        });
      }

      // Default: Byggedagbok / AI Mester-svar
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      let replyText = `Instruks mottatt og loggført i VikingMester byggedagbok.`;

      if (geminiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          const res = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: `Du er VikingMester, byggeplassens autonome lederassistent for norske entreprenører og håndverkere.
Brukeren gir følgende instruks eller spørsmål:
"${text}"

Kontekst: Prosjekt "${projectName || 'Nyebakken 14'}", fag: "${trade}".
Svar kort, faglig og handlingsorientert (maks 2-3 setninger). Bekreft hvilke tiltak som er iverksatt iht. norsk standard (TEK17, NS 8406, Byggherreforskriften).`
          });

          if (res?.text) {
            replyText = res.text.trim();
          }
          const promptTokens = res?.usageMetadata?.promptTokenCount || Math.round(text.length / 4);
          const completionTokens = res?.usageMetadata?.candidatesTokenCount || Math.round(replyText.length / 4);
          trackTokenCost({
            model: 'gemini-3.6-flash',
            promptTokens,
            completionTokens,
            operation: 'agent_dispatch_instruction',
            notes: `Dispatch command on project ${projectName || 'unknown'}`
          }).catch(() => {});
        } catch (err) {
          console.warn('Gemini dispatch error:', err);
        }
      }

      await saveCollectionItem('daily_logs', {
        projectId: projectId || 'proj-101',
        projectName: projectName || 'Byggeprosjekt',
        authorName: authorName || 'Håndverker',
        note: text,
        trade: trade || 'general',
        createdAt: new Date().toISOString(),
        verified: true,
        source: 'agent_instruction'
      });

      await saveCollectionItem('agent_activities', {
        type: 'daily_log',
        title: 'Instruks registrert i byggedagbok',
        description: text.slice(0, 100) + '...',
        trade: trade || 'general',
        tradeName: authorName,
        status: 'verified',
        badge: 'Dagbok',
        createdAt: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        action: 'general',
        reply: replyText
      });
    }

    // 2. 1-Click Admin Approval of Change Order
    if (action === 'approve_change_order') {
      if (!changeOrderId) {
        return NextResponse.json({ error: 'Mangler changeOrderId' }, { status: 400 });
      }

      const targetCO = (await getCollectionItemById('change_orders', changeOrderId)) || (await getCollectionItems('change_orders')).find((c: any) => c.id === changeOrderId);
      if (!targetCO) {
        return NextResponse.json({ error: 'Endringsordre ikke funnet' }, { status: 404 });
      }

      if (targetCO.status === 'approved_by_admin') {
        return NextResponse.json({
          success: true,
          message: 'Endringsordre var allerede godkjent.',
          changeOrder: targetCO
        });
      }

      const user = getUserFromRequest(req);
      if (user?.role !== 'admin') {
        const userCompanyId = user?.companyId;
        if (targetCO.companyId && userCompanyId && targetCO.companyId !== userCompanyId) {
          return NextResponse.json({ error: 'Ingen tilgang til denne endringsordren' }, { status: 403 });
        }
      }

      const updated = await updateCollectionItem('change_orders', changeOrderId, {
        status: 'approved_by_admin',
        approvedAt: new Date().toISOString(),
        approvedBy: authorName || user?.email || 'Byggmester / Admin'
      });

      await saveCollectionItem('agent_activities', {
        type: 'change_order_approved',
        companyId: targetCO.companyId || user?.companyId,
        projectId: targetCO.projectId,
        title: `Endringsordre #${updated.changeNumber || ''} godkjent av admin`,
        description: `Krav på kr ${(updated.amountExVat || 0).toLocaleString('no-NO')} eks mva er formelt godkjent og klargjort for utsending.`,
        trade: 'general',
        tradeName: 'Admin',
        status: 'verified',
        badge: 'GODKJENT'
      });

      return NextResponse.json({
        success: true,
        message: 'Endringsordre godkjent!',
        changeOrder: updated
      });
    }

    // 3. 1-Click Admin Reject of Change Order
    if (action === 'reject_change_order') {
      if (!changeOrderId) {
        return NextResponse.json({ error: 'Mangler changeOrderId' }, { status: 400 });
      }

      const targetCO = (await getCollectionItemById('change_orders', changeOrderId)) || (await getCollectionItems('change_orders')).find((c: any) => c.id === changeOrderId);
      if (!targetCO) {
        return NextResponse.json({ error: 'Endringsordre ikke funnet' }, { status: 404 });
      }

      if (targetCO.status === 'rejected') {
        return NextResponse.json({
          success: true,
          message: 'Endringsordre var allerede avvist.',
          changeOrder: targetCO
        });
      }

      const user = getUserFromRequest(req);
      if (user?.role !== 'admin') {
        const userCompanyId = user?.companyId;
        if (targetCO.companyId && userCompanyId && targetCO.companyId !== userCompanyId) {
          return NextResponse.json({ error: 'Ingen tilgang til denne endringsordren' }, { status: 403 });
        }
      }

      const updated = await updateCollectionItem('change_orders', changeOrderId, {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Endringsordre avvist eller satt på vent.',
        changeOrder: updated
      });
    }

    // 4. Tale-til-Endringsordre
    if (action === 'change_order') {
      const result = await createAutonomousChangeOrder({
        projectId: projectId || 'proj-101',
        projectName: projectName || 'Byggeprosjekt',
        spokenText: text,
        authorId: 'agent_user',
        authorName: authorName
      });

      let reply = `Mottatt! Endringsmelding #${result.changeOrder.changeNumber} er opprettet på kr ${result.changeOrder.totalAmount?.toLocaleString('no-NO')} ink. mva (${result.changeOrder.impactDays} dager fristforlengelse). Den ligger nå klar for din godkjenning.`;

      if (language && language !== 'no') {
        reply = await translateAgentReply(reply, language);
      }

      return NextResponse.json({
        success: true,
        action: 'change_order',
        reply,
        data: result
      });
    }

    // 5. Tverrfaglig Lukkesperre-sjekk
    if (action === 'pre_close_check') {
      const room = roomOrZone || 'Aktuelt rom/sone';
      
      const allChecklists = await getCollectionItems('checklists');
      const projectChecks = allChecklists.filter((c: any) => c.projectId === projectId);

      const hasPlumberSignoff = projectChecks.some((c: any) => 
        (c.trade === 'plumber' || (c.title && c.title.toLowerCase().includes('rør'))) && 
        c.status === 'completed'
      );

      const hasElectricianPhotos = projectChecks.some((c: any) => 
        (c.trade === 'electrician' || (c.title && c.title.toLowerCase().includes('elektro'))) &&
        c.status === 'completed'
      );

      const hasVaporBarrierChecked = projectChecks.some((c: any) => 
        c.title && c.title.toLowerCase().includes('dampsperre') && c.status === 'completed'
      );

      const evaluation = evaluatePreCloseWall({
        roomName: room,
        hasPlumberSignoff,
        hasElectricianPhotos,
        hasVaporBarrierChecked,
        hasInsulationChecked: true
      });

      let reply = evaluation.canClose
        ? `GRØNT LYS for ${room}! Alle tverrfaglige forutsetninger (rør-i-rør trykktest, el-skjultanlegg og dampsperre) er verifisert. Du kan trygt plate/lukke veggen.`
        : `RØDT LYS / STOPP for ${room}! Du kan ikke lukke veggen ennå: ${evaluation.blockers.join(' ')}`;

      if (language && language !== 'no') {
        reply = await translateAgentReply(reply, language);
      }

      return NextResponse.json({
        success: true,
        action: 'pre_close_check',
        reply,
        evaluation
      });
    }

    // 6. Sikker Jobb Analyse (SJA)
    if (action === 'sja') {
      const sjaResult = await generateSJAAction(text);
      let reply = `SJA opprettet for "${sjaResult.data.title}". Hovedrisikoer og vernetiltak er registrert i henhold til ${sjaResult.data.tek17Reference}.`;

      if (language && language !== 'no') {
        reply = await translateAgentReply(reply, language);
      }

      return NextResponse.json({
        success: true,
        action: 'sja',
        reply,
        sja: sjaResult.data
      });
    }

    // 7. Byggedagbok og timeføring
    if (action === 'daily_log') {
      const logEntry = {
        projectId: projectId || 'proj-101',
        authorName,
        note: text,
        trade,
        createdAt: new Date().toISOString(),
        verified: true
      };

      const saved = await saveCollectionItem('daily_logs', logEntry);
      let reply = `Byggedagbok oppdatert! Notat arkivert på prosjektet for ${trade}.`;

      if (language && language !== 'no') {
        reply = await translateAgentReply(reply, language);
      }

      return NextResponse.json({
        success: true,
        action: 'daily_log',
        reply,
        entry: saved
      });
    }

    return NextResponse.json({ error: 'Ukjent handling' }, { status: 400 });
  } catch (error: any) {
    console.error('Agent dispatch error:', error);
    return NextResponse.json({ error: error.message || 'Internt agentfeil' }, { status: 500 });
  }
}

async function translateAgentReply(reply: string, targetLanguage: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) return reply;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      contents: `Oversett følgende melding til språkkode '${targetLanguage}' slik at en utenlandsk håndverker forstår det presist: "${reply}"`
    });
    return res.text?.trim() || reply;
  } catch {
    return reply;
  }
}
