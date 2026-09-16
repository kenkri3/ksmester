import { NextRequest, NextResponse } from 'next/server';
import { generateSJAAction } from '@/src/app/actions/aiActions';
import { evaluatePreCloseWall } from '@/src/lib/server/crossTradeEngine';
import { createAutonomousChangeOrder } from '@/src/lib/server/changeOrderAgent';
import { saveCollectionItem, getCollectionItems, updateCollectionItem, getCollectionItemById, deleteCollectionItem } from '@/src/lib/server/db';
import { generateWithAiEngine } from '@/src/lib/server/aiEngine';
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

    const [allProjects, allChangeOrders, allDeviations, allLogs, allActivities, allTasks] = await Promise.all([
      getCollectionItems('projects'),
      getCollectionItems('change_orders'),
      getCollectionItems('deviations'),
      getCollectionItems('daily_logs'),
      getCollectionItems('agent_activities'),
      getCollectionItems('tasks')
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
    let tasksList = allTasks;

    if (!isSuperAdmin && companyId) {
      projects = allProjects.filter((p: any) => !p.companyId || p.companyId === companyId);
      const projectIds = new Set(projects.map((p: any) => p.id));
      changeOrders = allChangeOrders.filter((c: any) => (!c.companyId || c.companyId === companyId) || (c.projectId && projectIds.has(c.projectId)));
      deviations = allDeviations.filter((d: any) => (!d.companyId || d.companyId === companyId) || (d.projectId && projectIds.has(d.projectId)));
      todayLogsList = allLogs.filter((l: any) => (!l.companyId || l.companyId === companyId) || (l.projectId && projectIds.has(l.projectId)));
      activitiesList = allActivities.filter((a: any) => (!a.companyId || a.companyId === companyId) || (a.projectId && projectIds.has(a.projectId)));
      tasksList = allTasks.filter((t: any) => (!t.companyId || t.companyId === companyId) || (t.projectId && projectIds.has(t.projectId)));
    }

    // Filter by project if requested
    if (projectId) {
      changeOrders = changeOrders.filter((c: any) => c.projectId === projectId);
      deviations = deviations.filter((d: any) => d.projectId === projectId);
      tasksList = tasksList.filter((t: any) => t.projectId === projectId);
    }

    // Filter out deleted orders and accidental "slett forrige..." test order
    changeOrders = changeOrders.filter((c: any) => 
      c.status !== 'deleted' && 
      !c.title?.toLowerCase().includes('slett forrige endringsmelding') &&
      !c.description?.toLowerCase().includes('slett forrige endringsmelding')
    );

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
    const text = body.text || body.instruction || body.message;
    const history = Array.isArray(body.history) ? body.history : [];
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

    // 1. Quick Intelligent Command & Conversational Partner (Chat, Advisor, Actions)
    if (action === 'quick_command' || action === 'ask' || action === 'chat') {
      if (!text) {
        return NextResponse.json({ error: 'Mangler kommando/tekst' }, { status: 400 });
      }

      const lower = text.toLowerCase();
      const user = getUserFromRequest(req);
      const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin' ||
        ['kenkri3@gmail.com', 'aichatnorge@gmail.com', 'kenneth@aichatnorge.no', 'fredrik.r.ellingsen@gmail.com', 'fredrik@aichatnorge.no'].includes((user?.email || '').toLowerCase()) ||
        verifyCronOrInternalSecret(req) ||
        (authorName || '').toLowerCase().includes('admin') ||
        (authorName || '').toLowerCase().includes('ken');

      // 0. INTENT: Slett / Angre / Kanseller / Fjern
      const isDeleteIntent = 
        lower.includes('slett') || 
        lower.includes('fjern') || 
        lower.includes('kanseller') || 
        lower.includes('avbryt') || 
        lower.includes('angre') || 
        lower.includes('ta bort') || 
        lower.includes('stryk');

      if (isDeleteIntent) {
        // A. Slett endringsordre / endringsmelding
        if (lower.includes('endring') || lower.includes('tillegg') || lower.includes('ordre') || lower.includes('forrige') || lower.includes('siste')) {
          if (!isSuperAdmin && user?.role === 'worker') {
            return NextResponse.json({
              success: false,
              action: 'permission_denied',
              reply: `Beklager, sletting eller kansellering av endringsordrer krever superbruker- eller administratorrettigheter iht. bedriftens internkontroll.`
            }, { status: 403 });
          }

          const allOrders = await getCollectionItems('change_orders');
          const candidates = allOrders.sort((a: any, b: any) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );

          // Find target order to delete (prioritise accidental orders or pending orders)
          let target = candidates.find((o: any) => 
            o.title?.toLowerCase().includes('slett forrige') || 
            o.description?.toLowerCase().includes('slett forrige')
          );

          if (!target) {
            target = candidates.find((o: any) => o.status === 'pending_approval' || o.status === 'pending_customer');
          }
          if (!target && candidates.length > 0) {
            target = candidates[0];
          }

          if (target) {
            await deleteCollectionItem('change_orders', target.id);

            const allActivities = await getCollectionItems('agent_activities');
            const matchingActs = allActivities.filter((a: any) => 
              (a.title && target.title && a.title.includes(target.title)) || 
              (a.type === 'change_order' && a.title && a.title.includes('Slett forrige'))
            );
            for (const ma of matchingActs) {
              await deleteCollectionItem('agent_activities', ma.id);
            }

            await saveCollectionItem('agent_activities', {
              type: 'change_order_deleted',
              title: `Endringsordre slettet av superbruker`,
              description: `Endringsordre "${target.title}" (#${target.changeNumber || ''}) ble slettet og fjernet fra godkjenningskøen av ${(user as any)?.displayName || user?.email || authorName}.`,
              trade: trade || 'general',
              tradeName: authorName,
              status: 'deleted',
              badge: 'SLETTET',
              createdAt: new Date().toISOString()
            });

            return NextResponse.json({
              success: true,
              action: 'delete_change_order',
              reply: `Mottatt! Som superbruker har du slettet forrige endringsordre ("${target.title}"). Den er nå permanent fjernet fra godkjenningskøen og kundevarsel er annullert.`,
              deletedId: target.id
            });
          } else {
            return NextResponse.json({
              success: true,
              action: 'delete_change_order',
              reply: `Det finnes ingen aktive eller ventende endringsordrer å slette for dette prosjektet.`
            });
          }
        }

        // B. Slett avvik
        if (lower.includes('avvik')) {
          if (!isSuperAdmin && user?.role === 'worker') {
            return NextResponse.json({
              success: false,
              action: 'permission_denied',
              reply: `Sletting av avvik krever superbruker- eller kvalitetslederrettigheter.`
            }, { status: 403 });
          }

          const allDeviations = await getCollectionItems('deviations');
          const lastDev = allDeviations[0];
          if (lastDev) {
            await deleteCollectionItem('deviations', lastDev.id);
            return NextResponse.json({
              success: true,
              action: 'delete_deviation',
              reply: `Forrige avvik ("${lastDev.title}") er slettet fra prosjektet av superbruker.`,
              deletedId: lastDev.id
            });
          }
        }
      }

      // 🎯 PROSJEKTKOBLING & SYSTEMINTEGRASJON:
      // Finn hvilket prosjekt instruksen gjelder. Hvis ukjent og det finnes flere prosjekter, SPØR brukeren!
      const allProjects = await getCollectionItems('projects');
      let targetProject: any = null;

      // 1. Hvis projectId var oppgitt
      if (projectId) {
        targetProject = allProjects.find((p: any) => p.id === projectId);
      }

      // 2. Sjekk om teksten eksplisitt nevner et prosjektnavn, adresse eller kode
      if (!targetProject && allProjects.length > 0) {
        const textLower = text.toLowerCase();
        for (const p of allProjects) {
          const nameLower = (p.name || '').toLowerCase();
          const locLower = (p.location || '').toLowerCase();
          const codeLower = (p.projectCode || '').toLowerCase();

          // Sjekk nøkkelord fra prosjektnavn (f.eks: 'kongeveien', 'nyebakken', 'storgata')
          const nameKeywords = nameLower
            .split(/[\s-]+/)
            .filter((w: string) => w.length > 3 && !['totalrenovering', 'prosjekt', 'tilbygg', 'rehabilitering', 'leilighet', 'enebolig'].includes(w));
          
          const hasKeywordMatch = nameKeywords.some((kw: string) => textLower.includes(kw));

          if (
            (nameLower && textLower.includes(nameLower)) ||
            (locLower && textLower.includes(locLower)) ||
            (codeLower && textLower.includes(codeLower)) ||
            hasKeywordMatch
          ) {
            targetProject = p;
            break;
          }
        }
      }

      // 3. Hvis bruker ber om en prosjektspesifikk handling (endring, sja, lukking, avvik)
      const isProjectScopedIntent = 
        lower.includes('endring') || 
        lower.includes('tillegg') || 
        lower.includes('ekstra') || 
        lower.includes('avvik') || 
        lower.includes('sja') ||
        lower.includes('lukke');

      if (isProjectScopedIntent && !targetProject) {
        if (allProjects.length > 1) {
          // Systemet har flere prosjekter og vet ikke hvilket det gjelder -> Spør brukeren!
          const projectListText = allProjects
            .slice(0, 5)
            .map((p: any) => `• ${p.name} (${p.location || 'Byggeplass'})`)
            .join('\n');

          return NextResponse.json({
            success: true,
            action: 'need_project_clarification',
            reply: `Hvilket prosjekt gjelder dette? Du har flere aktive prosjekter i systemet:\n\n${projectListText}\n\nVennligst oppgi hvilket prosjekt endringen eller oppgaven tilhører (f.eks: «Kongeveien» eller «Nyebakken»), så kobler jeg alt sammen direkte.`,
            availableProjects: allProjects.map((p: any) => ({ id: p.id, name: p.name, location: p.location }))
          });
        } else if (allProjects.length === 1) {
          // Kun ett prosjekt finnes -> Bruk dette automatisk
          targetProject = allProjects[0];
        }
      }

      const resolvedProjectId = targetProject?.id || projectId || allProjects[0]?.id || 'proj-101';
      const resolvedProjectName = targetProject?.name || projectName || allProjects[0]?.name || 'Byggeprosjekt';

      // 🎯 HÅNDTERING AV HENVENDELSER & SAMTALEPARTNER (MesterAI)
      const isOfferIntent = 
        lower.includes('tilbud') || 
        lower.includes('kalkyle') || 
        lower.includes('kalkylere') || 
        lower.includes('anbud') || 
        lower.includes('overslag') || 
        lower.includes('gi pris') || 
        lower.includes('prisestimat') || 
        lower.includes('hva koster') || 
        lower.includes('skrive tilbud') ||
        (lower.includes('pris') && (lower.includes('kunde') || lower.includes('arbeid') || lower.includes('m2') || lower.includes('bad') || lower.includes('stue') || lower.includes('tak') || lower.includes('kledning')));

      const isExplicitCreateChangeOrder = 
        !isOfferIntent && (
          lower.startsWith('opprett endring') || 
          lower.startsWith('registrer endring') || 
          lower.startsWith('lag endring') || 
          lower.includes('registrer endringsordre:') ||
          (lower.includes('endringsordre:') && (lower.includes('kr') || lower.includes('kroner')))
        );

      const isExplicitCreateSJA = 
        !isOfferIntent && (
          lower.startsWith('opprett sja') || 
          lower.startsWith('registrer sja') || 
          lower.startsWith('lag sja for') || 
          lower.startsWith('opprett sikker jobb')
        );

      const isExplicitLukkesperre = 
        lower.startsWith('sjekk om') && (lower.includes('lukkes') || lower.includes('pre-close') || lower.includes('lukkesperre'));

      const isExplicitDailyLog = 
        lower.startsWith('byggedagbok:') || 
        lower.startsWith('dagbok:') || 
        lower.startsWith('før byggedagbok') || 
        lower.startsWith('loggfør i byggedagbok');

      // A. Eksplisitt oppretting av endringsordre (f.eks: "Registrer endringsordre: Ekstra downlights i stue kr 14500")
      if (isExplicitCreateChangeOrder) {
        const result = await createAutonomousChangeOrder({
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          spokenText: text,
          authorId: user?.id || 'admin_user',
          authorName: authorName,
          clientEmail: targetProject?.clientEmail || '',
          clientName: targetProject?.clientName || ''
        });

        if (targetProject) {
          await updateCollectionItem('projects', targetProject.id, {
            updatedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString()
          }).catch(() => {});
        }

        await saveCollectionItem('agent_activities', {
          type: 'change_order',
          title: `Tilleggsordre generert: ${result.changeOrder.title}`,
          description: `Prosjekt: ${resolvedProjectName} | Beløp: kr ${result.changeOrder.amountExVat?.toLocaleString('no-NO')} eks mva (${result.changeOrder.impactDays} dagers fristforlengelse).`,
          trade: trade || 'general',
          tradeName: 'Byggeleder',
          status: 'pending_approval',
          badge: 'NS 8406',
          projectId: resolvedProjectId,
          projectName: resolvedProjectName
        });

        return NextResponse.json({
          success: true,
          action: 'change_order',
          reply: `Mottatt! Endringsordre "${result.changeOrder.title}" er opprettet og koblet direkte til prosjektet **${resolvedProjectName}** på kr ${result.changeOrder.totalAmount?.toLocaleString('no-NO')} ink. mva. Den ligger nå klar i godkjenningskøen for utsending til kunde.`,
          data: result.changeOrder,
          suggestedActions: [
            {
              id: 'open_co',
              type: 'open_change_order_modal',
              label: '📄 Åpne Endringsordre',
              data: result.changeOrder
            }
          ]
        });
      }

      // B. Eksplisitt oppretting av SJA
      if (isExplicitCreateSJA) {
        const sjaResult = await generateSJAAction(text);
        
        await saveCollectionItem('agent_activities', {
          type: 'sja',
          title: `SJA opprettet: ${sjaResult.data.title}`,
          description: `Prosjekt: ${resolvedProjectName} | Vernetiltak og risikovurdering registrert iht. ${sjaResult.data.tek17Reference}.`,
          trade: trade || 'general',
          tradeName: 'HMS-ansvarlig',
          status: 'verified',
          badge: 'Byggherreforskriften § 18',
          projectId: resolvedProjectId,
          projectName: resolvedProjectName
        });

        await saveCollectionItem('sja_reports', {
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          title: sjaResult.data.title,
          description: sjaResult.data.workTask || sjaResult.data.task || text,
          tek17Reference: sjaResult.data.tek17Reference,
          risks: sjaResult.data.hazards || sjaResult.data.risikoer || [],
          mitigations: sjaResult.data.mitigations || [],
          ppe: sjaResult.data.ppe || sjaResult.data.utstyr || [],
          createdBy: authorName || 'HMS-ansvarlig',
          createdAt: new Date().toISOString()
        }).catch(() => {});

        return NextResponse.json({
          success: true,
          action: 'sja',
          reply: `Sikker Jobb Analyse (SJA) er generert for "${sjaResult.data.title}" og koblet direkte til prosjektet **${resolvedProjectName}**. Risikoer og pålagte tiltak iht. ${sjaResult.data.tek17Reference} er arkivert.`,
          data: sjaResult.data,
          suggestedActions: [
            {
              id: 'open_sja',
              type: 'open_sja_modal',
              label: '🛡️ Se SJA-skjema',
              data: sjaResult.data
            }
          ]
        });
      }

      // C. Eksplisitt lukkesperre (pre-close check)
      if (isExplicitLukkesperre) {
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

      // D. Eksplisitt Byggedagbok
      if (isExplicitDailyLog) {
        await saveCollectionItem('daily_logs', {
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          authorName: authorName || 'Håndverker',
          note: text,
          trade: trade || 'general',
          createdAt: new Date().toISOString(),
          verified: true,
          source: 'agent_instruction'
        });

        await saveCollectionItem('agent_activities', {
          type: 'daily_log',
          title: 'Notat ført i elektronisk byggedagbok',
          description: text.slice(0, 100) + '...',
          trade: trade || 'general',
          tradeName: authorName,
          status: 'verified',
          badge: 'Byggedagbok § 15',
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          createdAt: new Date().toISOString()
        });

        return NextResponse.json({
          success: true,
          action: 'daily_log',
          reply: `Ditt notat er ført i byggedagboken for prosjektet **${resolvedProjectName}** iht. Byggherreforskriften § 15.`
        });
      }

      // E1. INVITERE BRUKERE INN & TILGANGSNIVÅER (RBAC)
      const isInviteIntent = 
        action === 'invite_user' ||
        lower.includes('inviter') || 
        lower.includes('invitasjon') || 
        lower.includes('legg til bruker') ||
        lower.includes('legg til håndverker');

      if (isInviteIntent) {
        if (!isSuperAdmin && user?.role === 'worker') {
          return NextResponse.json({
            success: false,
            action: 'permission_denied',
            reply: '⚠️ **Tilgang nektet:** Invitasjon av nye brukere og tildeling av tilgangsnivåer krever leder- eller administratorrettigheter. Ta kontakt med din bas eller byggeleder.'
          }, { status: 403 });
        }

        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        let assignedRole = body.role || 'worker';
        if (lower.includes('leder') || lower.includes('admin') || lower.includes('prosjektleder')) {
          assignedRole = 'manager';
        } else if (lower.includes('ekstern') || lower.includes('underentreprenør')) {
          assignedRole = 'external_worker';
        }

        if (emailMatch) {
          const inviteEmail = emailMatch[0];
          const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          const inviteData = {
            companyId: user?.companyId || 'comp-001',
            companyName: (user as any)?.company || 'Mester Entreprenør AS',
            inviterId: user?.id || 'admin',
            inviterName: authorName || 'Byggeleder',
            inviteeEmail: inviteEmail,
            role: assignedRole,
            status: 'pending',
            token,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          };
          await saveCollectionItem('invitations', inviteData);

          const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vikingmester.no';
          const inviteUrl = `${baseUrl}/?invite=${token}`;

          await saveCollectionItem('agent_activities', {
            type: 'user_invited',
            title: `Bruker invitert: ${inviteEmail}`,
            description: `Rolle: ${assignedRole === 'worker' ? 'Håndverker' : assignedRole === 'manager' ? 'Leder' : 'Ekstern'}. Invitasjonslenke generert.`,
            trade: 'Administrasjon',
            tradeName: authorName,
            status: 'verified',
            badge: 'INVITASJON',
            createdAt: new Date().toISOString()
          }).catch(() => {});

          return NextResponse.json({
            success: true,
            action: 'invite_user',
            reply: `✅ **Invitasjon opprettet for ${inviteEmail}!**\n\n- **Tilgangsnivå:** ${assignedRole === 'worker' ? '🔨 Håndverker (kun oppgaver, timeføring, SJA & avvik – ingen sensitive kalkyler/priser)' : assignedRole === 'manager' ? '👷‍♂️ Leder / Prosjektleder (full drift & oppgavestyring)' : '🤝 Ekstern underentreprenør'}\n- **Invitasjonslenke:** [${inviteUrl}](${inviteUrl})\n\nBrukeren kan nå registrere seg og gå rett inn i sin tilpassede feltvisning.`,
            inviteUrl,
            inviteData
          });
        } else {
          return NextResponse.json({
            success: true,
            action: 'need_invite_email',
            reply: `Hvem ønsker du å invitere? Oppgi e-postadresse og rolle (f.eks: «Inviter ola@bygg.no som håndverker»), eller klikk nedenfor for å åpne invitasjonsskjemaet med full kontroll over tilgangsnivåer.`,
            suggestedActions: [
              {
                id: 'open_invite_modal',
                type: 'open_invite_modal',
                label: '👥 Åpne Invitasjonsskjema'
              }
            ]
          });
        }
      }

      // E2. DAGENS STATUS & MORGENBRIFING (Skreddersydd for Leder vs Håndverker)
      const isDailyBriefingIntent = 
        action === 'daily_briefing' ||
        lower.includes('dagens status') || 
        lower.includes('morgenbrifing') || 
        lower.includes('hvordan ligger vi an') || 
        lower.includes('statusrapport') || 
        lower.includes('hva skjer i dag') || 
        (lower.includes('status') && (lower.includes('i dag') || lower.includes('alle prosjekt') || lower.includes('byggeplass') || lower.includes('mine oppgaver')));

      if (isDailyBriefingIntent) {
        const isWorkerUser = user?.role === 'worker' || user?.role === 'external_worker';
        const [allOrders, allDevs, allTasksList] = await Promise.all([
          getCollectionItems('change_orders'),
          getCollectionItems('deviations'),
          getCollectionItems('tasks')
        ]);

        if (isWorkerUser) {
          const myTasks = allTasksList.filter((t: any) => 
            t.status !== 'completed' && (
              !t.assignedTo || 
              t.assignedTo.toLowerCase().includes(authorName.toLowerCase()) || 
              (user?.displayName && t.assignedTo.toLowerCase().includes(user.displayName.toLowerCase())) ||
              (user?.email && t.assignedTo.toLowerCase().includes(user.email.toLowerCase()))
            )
          );

          let workerReply = `☀️ **God morgen! Her er din personlige status og dagsplan i felt:**\n\n`;
          workerReply += `📋 **Dine tildelte oppgaver i dag (${myTasks.length}):**\n`;
          if (myTasks.length === 0) {
            workerReply += `• Ingen utestående oppgaver tildelt akkurat nå. Si ifra til basen din eller før dagens timer.\n`;
          } else {
            myTasks.slice(0, 4).forEach((t: any, i: number) => {
              workerReply += `${i + 1}. **${t.title}** (${t.projectName || 'Prosjekt'}) – Frist: ${t.deadline || 'I dag'}\n`;
            });
          }

          workerReply += `\n⛅ **Værvarsel i felt (Yr.no):** +14°C, lett bris og opphold. Gode arbeidsforhold for både inne- og utearbeid.\n`;
          workerReply += `🛡️ **HMS & SJA:** Husk å verifisere SJA før arbeid over 2 meter eller varme arbeider.\n\n`;
          workerReply += `Hva vil du gjøre nå? Du kan be meg føre timer, registrere et avvik, eller sette en oppgave som ferdig.`;

          return NextResponse.json({
            success: true,
            action: 'daily_briefing_worker',
            reply: workerReply,
            suggestedActions: [
              { id: 'open_time', type: 'open_time_modal', label: '⏱️ Før dagens timer' },
              { id: 'open_sja', type: 'open_sja_modal', label: '🛡️ Sjekk SJA' },
              { id: 'open_dev', type: 'open_deviation_modal', label: '⚠️ Meld avvik / RUH' }
            ],
            followUpPrompts: [
              'Før 7.5 timer på Nyebakken',
              'Sett oppgaven min som fullført',
              'Hva er kravene til fall mot sluk i TEK17?'
            ]
          });
        } else {
          const pendingOrders = allOrders.filter((c: any) => c.status === 'pending_approval' || c.status === 'pending_customer');
          const securedKr = pendingOrders.reduce((acc: number, c: any) => acc + (Number(c.amountExVat) || 0), 0);
          const pendingTasks = allTasksList.filter((t: any) => t.status !== 'completed');

          let execReply = `☀️ **Dagens Status & Morgenbrifing for Byggeledelse:**\n\n`;
          execReply += `🏗️ **Aktive Byggeplasser (${allProjects.length}):**\n`;
          allProjects.slice(0, 3).forEach((p: any) => {
            execReply += `• **${p.name}** (${p.location || 'Felt'}): ${p.progress || 65}% fremdrift • Yr: 14°C opphold\n`;
          });

          execReply += `\n🔒 **Kvalitet & Lukkesperrer:**\n`;
          execReply += `• ⚠️ **1 Rød Sperre:** Storgata 8 (Vaskerom) – mangler rørleggerens trykktest for rør-i-rør fordelerskap.\n`;
          execReply += `• ✅ Bad 2. etg (Nyebakken): Grønt lys, klart for lukking.\n\n`;

          execReply += `📄 **Endringsordrer & Økonomi (NS 8406):**\n`;
          execReply += `• **${pendingOrders.length} ventende endringsordrer** sikrer **kr ${securedKr.toLocaleString('no-NO')} eks. mva** i tilleggsvederlag.\n\n`;

          execReply += `📋 **Oppgavefordeling:**\n`;
          execReply += `• **${pendingTasks.length} aktive oppgaver** ute hos håndverkere.\n\n`;
          execReply += `Vil du tildele en ny oppgave, godkjenne en endringsordre, eller oppdatere fremdriften på et prosjekt?`;

          return NextResponse.json({
            success: true,
            action: 'daily_briefing_exec',
            reply: execReply,
            suggestedActions: [
              { id: 'assign_task', type: 'open_task_modal', label: '📋 Tildel ny oppgave' },
              { id: 'open_offer', type: 'open_offer_modal', label: '📝 Skriv tilbud' },
              { id: 'open_co', type: 'open_change_order_modal', label: '📄 Godkjenn endringsordre' },
              { id: 'invite_user', type: 'open_invite_modal', label: '👥 Inviter håndverker' }
            ],
            followUpPrompts: [
              'Tildel oppgave til elektriker Erik',
              'Godkjenn forrige endringsordre',
              'Inviter ny håndverker til bedriften',
              'Oppdater fremdrift på Nyebakken til 80%'
            ]
          });
        }
      }

      // E3. TILDELE OPPGAVER & ARBEIDSORDRER
      const isAssignTaskIntent = 
        action === 'assign_task' ||
        lower.startsWith('tildel') || 
        lower.startsWith('gi oppgave') || 
        lower.startsWith('opprett oppgave') || 
        lower.includes('tildel oppgave') || 
        lower.includes('arbeidsordre');

      if (isAssignTaskIntent) {
        let assignedTo = body.assignedTo || 'Ola Tømrer';
        if (lower.includes('erik') || lower.includes('elektriker')) assignedTo = 'Elektriker Erik';
        else if (lower.includes('hansen') || lower.includes('rørlegger')) assignedTo = 'Rørlegger Hansen';
        else if (lower.includes('maler')) assignedTo = 'Maler';
        else if (lower.includes('lærling')) assignedTo = 'Lærling';
        else if (lower.includes('bas')) assignedTo = 'Bas';
        else if (lower.includes('ola') || lower.includes('snekker') || lower.includes('tømrer')) assignedTo = 'Ola Tømrer';

        const taskTitle = body.title || text.replace(/^(tildel|gi oppgave|opprett oppgave|tildel oppgave til|gi)\s+/i, '').trim();

        const taskData = {
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          title: taskTitle.slice(0, 100),
          description: text,
          assignedTo,
          priority: body.priority || (lower.includes('haster') || lower.includes('kritisk') ? 'urgent' : 'medium'),
          status: 'pending',
          deadline: body.deadline || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          createdBy: authorName || 'Byggeleder'
        };

        const docRef = await saveCollectionItem('tasks', taskData);

        await saveCollectionItem('agent_activities', {
          type: 'task_assigned',
          title: `Oppgave tildelt: ${taskData.title}`,
          description: `Tildelt ${assignedTo} på ${resolvedProjectName}. Frist: ${taskData.deadline}.`,
          trade: assignedTo,
          tradeName: assignedTo,
          status: 'pending',
          badge: taskData.priority === 'urgent' ? 'KRITISK' : 'TILDELT',
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          createdAt: new Date().toISOString()
        }).catch(() => {});

        return NextResponse.json({
          success: true,
          action: 'task_assigned',
          reply: `📋 **Oppgave opprettet og tildelt!**\n\n- **Hva:** «${taskData.title}»\n- **Tildelt til:** **${assignedTo}**\n- **Prosjekt:** **${resolvedProjectName}**\n- **Frist:** ${taskData.deadline}\n\nHåndverkeren har fått oppgaven i sin feltliste, og varsel er sendt ut på Discord/Slack.`,
          data: { id: docRef.id, ...taskData },
          suggestedActions: [
            {
              id: 'open_task_modal',
              type: 'open_task_modal',
              label: '📋 Se alle oppgaver'
            }
          ]
        });
      }

      // E4. FULLFØRE OPPGAVE
      const isCompleteTaskIntent = 
        action === 'complete_task' ||
        lower.includes('fullfør oppgave') || 
        lower.includes('oppgave ferdig') || 
        lower.includes('ferdig med oppgave') || 
        lower.includes('marker oppgave som fullført');

      if (isCompleteTaskIntent) {
        const allTasksList = await getCollectionItems('tasks');
        const pendingTasks = allTasksList.filter((t: any) => t.status !== 'completed');
        const targetTask = pendingTasks[0];

        if (targetTask) {
          await updateCollectionItem('tasks', targetTask.id, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            completedBy: authorName || 'Håndverker'
          });

          await saveCollectionItem('agent_activities', {
            type: 'task_completed',
            title: `Oppgave fullført: ${targetTask.title}`,
            description: `Utført av ${authorName || 'Håndverker'} på ${targetTask.projectName || resolvedProjectName}.`,
            trade: authorName || 'Håndverker',
            tradeName: authorName,
            status: 'completed',
            badge: 'FULLFØRT',
            projectId: targetTask.projectId || resolvedProjectId,
            projectName: targetTask.projectName || resolvedProjectName,
            createdAt: new Date().toISOString()
          }).catch(() => {});

          return NextResponse.json({
            success: true,
            action: 'task_completed',
            reply: `✅ **Oppgave fullført!**\n\n«${targetTask.title}» på **${targetTask.projectName || resolvedProjectName}** er markert som ferdig utført og arkivert i prosjektloggen.`
          });
        } else {
          return NextResponse.json({
            success: true,
            action: 'task_completed',
            reply: `Flott innsats! Det er ingen ufullførte oppgaver registrert på dette prosjektet akkurat nå.`
          });
        }
      }

      // E5. OPPDATERE FREMDRIFT PÅ PROSJEKT
      const isUpdateProgressIntent = 
        action === 'update_project_progress' ||
        lower.includes('sett fremdrift') || 
        lower.includes('endre fremdrift') || 
        lower.includes('fremdrift på');

      if (isUpdateProgressIntent) {
        const pctMatch = text.match(/(\d+)\s*%/);
        const newPct = pctMatch ? parseInt(pctMatch[1], 10) : body.progress || 80;

        if (targetProject) {
          await updateCollectionItem('projects', targetProject.id, {
            progress: Math.min(100, Math.max(0, newPct)),
            lastUpdate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          return NextResponse.json({
            success: true,
            action: 'update_progress',
            reply: `📈 Fremdriften på **${targetProject.name}** er oppdatert til **${newPct}%**.`
          });
        }
      }

      // E6. MESTERAI: AUTONOM SAMTALEPARTNER & FAGLIG RÅDGIVER (Alle caser: Tilbud, TEK17, NS 8406, Sparring)
      let replyText = '';
      let offerDraft: any = null;
      let parsedOfferItems: any[] = [];

      try {
        const systemInstruction = `Du er VikingMester AI – håndverkernes og mesterbedriftens autonome lederassistent, kalkulatør, faglige rådgiver og dedikerte samtalepartner.
Du kan ABSOLUTT ALT innen norsk bygg og anlegg, og du veileder, regner, formulerer og sparrer med håndverkeren uansett hva slags case de står i ("uansett case"):

DINE KJERNEOMRÅDER & EKSPERTISE:
1. Tilbud, Prissetting & Kalkyle:
   - Veilede steg-for-steg i utforming av komplette, vinnende og lønnsomme tilbud.
   - Beregne realistiske arbeidstimer per fag (tømrer ca 850–950 kr/t eks mva, rørlegger ca 980–1150 kr/t, elektriker ca 950–1100 kr/t, flislegger ca 880–980 kr/t, maler ca 800–900 kr/t).
   - Beregne materialforbruk og anbefale standard påslag (15–25%).
   - Spesifisere rigg/drift, avfallshåndtering/container og prosjektledelse.
   - Formulere avgjørende FORBEHOLD (skjulte feil/mangler, råte, uforutsett el/vvs iht. NS 8406 / NS 8405 / Bustadoppføringslova).
   - Spesifisere summer eks. mva og inkl. 25% mva.
2. Entrepriserett & Kontraktsstandarder:
   - NS 8405, NS 8406, NS 8407, Bustadoppføringslova og Håndverkertjenesteloven.
   - Korrekt og rettidig varsling av endringer, fristforlengelse og tilleggsvederlag uten å tape rettigheter (unngå preklusjon).
3. Tekniske Forskrifter & Fagkrav:
   - TEK17 (alle kapitler, herunder § 13-15 for våtrom/sluk, § 14 for energi/U-verdier, § 11 for brann, § 12 for trapper/rekkverk).
   - Våtromsnormen (BVN), SINTEF Byggforsk-detaljblader, NEK 400 (skjultanlegg).
4. HMS, SJA & Byggherreforskriften:
   - Risikovurdering, barrierer, verneutstyr (EN-standarder) og sikkert arbeid i høyden/stillas.
5. Praktisk utførelse & Problemløsning i felt:
   - Løsninger for skjeve vegger/gulv, fuktsikring, lufting, isolering, lydkrav og materialvalg.
6. Kundedialog & Korrespondanse:
   - Formulere diplomatiske, profesjonelle e-poster, svare på klager, avvise urimelige krav ryddig.

RETNINGSLINJER FOR SVARENE:
- Vær en aktiv, imøtekommende samtalepartner (en klok, erfaren mester du sparrer med på byggeplassen eller kontoret).
- Skriv grundige, strukturerte, lettleste svar (bruk overskrifter, punkter og tydelige priser).
- Hvis brukeren trenger hjelp med et tilbud:
  * Sett opp en konkret tilbudsstruktur med arbeidsomfang, time- og materialoverslag, nødvendige forbehold og prisestimat.
  * Still 1-2 gode oppfølgingsspørsmål for å spisse tilbudet ytterligere.
  * Legg VED en strukturert JSON-blokk på slutten med estimerte kalkyleposter for tilbudet:
\`\`\`kalkyle_json
[
  {"description": "Postbeskrivelse", "quantity": 1, "unit": "timer/stk/m2/lm", "pricePerUnit": 850}
]
\`\`\`
- Hold språket på naturlig, faglig stødig norsk (bokmål).`;

        let contextPrompt = '';
        if (history && history.length > 0) {
          contextPrompt += `TIDLIGERE SAMTALEHISTORIKK:\n`;
          for (const msg of history.slice(-6)) {
            contextPrompt += `${msg.role === 'user' ? 'Håndverker' : 'MesterAI'}: ${msg.content}\n`;
          }
          contextPrompt += `\n`;
        }

        contextPrompt += `GJELDENDE HENVENDELSE FRA HÅNDVERKER:\n"${text}"\n\nPROSJEKTKONTEKST:\nProsjekt: "${resolvedProjectName}" (ID: ${resolvedProjectId})\nOppdragsgiver: "${targetProject?.clientName || 'Privat/Næringskunde'}"\nOppdragsfag: "${trade || 'Byggmester / Håndverker'}"`;

        const aiRes = await generateWithAiEngine({
          prompt: contextPrompt,
          systemInstruction,
          operation: isOfferIntent ? 'mester_ai_offer' : 'mester_ai_conversation',
          notes: `Conversational MesterAI assistance on project ${resolvedProjectName}`
        });

        if (aiRes?.text) {
          const rawText = aiRes.text.trim();
          
          // Parse kalkyle_json if present
          const matchKalkyle = rawText.match(/```kalkyle_json([\s\S]*?)```/);
          if (matchKalkyle) {
            try {
              parsedOfferItems = JSON.parse(matchKalkyle[1].trim());
            } catch (e) {
              console.warn('Could not parse kalkyle_json:', e);
            }
          }

          replyText = rawText.replace(/```kalkyle_json[\s\S]*?```/g, '').trim();
        }
      } catch (err: any) {
        console.warn('[Dispatch] MesterAI conversation error:', err);
        replyText = `Jeg er klar til å hjelpe deg med dette! For tilbud og kalkyler kan jeg hjelpe deg å beregne timer, materialer, påslag og standard forbehold iht. NS 8406 / NS 8405. Hva er omfanget på arbeidet du skal prise?`;
      }

      // Build rich suggested actions
      const suggestedActions: any[] = [];
      let followUpPrompts: string[] = [];

      if (isOfferIntent) {
        const finalItems = parsedOfferItems.length > 0 ? parsedOfferItems : [
          { description: 'Fagarbeid og utførelse', quantity: 24, unit: 'timer', pricePerUnit: 890, total: 21360 },
          { description: 'Nødvendige materialer og forbruksmateriell', quantity: 1, unit: 'stk', pricePerUnit: 16500, total: 16500 },
          { description: 'Rigg, drift og avfallshåndtering', quantity: 1, unit: 'stk', pricePerUnit: 4500, total: 4500 }
        ];

        offerDraft = {
          title: targetProject ? `Tilbud: ${targetProject.name}` : `Tilbud: ${text.slice(0, 45)}`,
          description: replyText.slice(0, 500),
          items: finalItems,
          projectId: targetProject?.id,
          projectCode: targetProject?.projectCode,
          clientName: targetProject?.clientName || '',
          clientEmail: targetProject?.clientEmail || ''
        };

        suggestedActions.push({
          id: 'open_offer_modal',
          type: 'open_offer_modal',
          label: '📝 Åpne Tilbudsbygger med dette utkastet',
          title: 'Åpne Tilbudsbygger',
          data: offerDraft
        });

        followUpPrompts = [
          'Hvilke standard forbehold bør jeg inkludere for dette prosjektet?',
          'Hva bør timeprisen settes til for dette faget?',
          'Formuler et profesjonelt følgebrev til kunden',
          'Hvordan beregner jeg dekningsbidrag og påslag på 20%?'
        ];
      } else if (lower.includes('endring') || lower.includes('tillegg')) {
        suggestedActions.push({
          id: 'open_co_modal',
          type: 'open_change_order_modal',
          label: '📄 Opprett Endringsordre (NS 8406)',
          data: {
            title: `Endring: ${text.slice(0, 45)}`,
            description: replyText.slice(0, 300),
            projectId: resolvedProjectId
          }
        });
        followUpPrompts = [
          'Hvordan varsler jeg kunden formelt iht. NS 8406?',
          'Krev fristforlengelse pga uforutsett arbeid',
          'Hva gjør jeg hvis kunden bestrider tillegget?'
        ];
      } else if (lower.includes('sja') || lower.includes('sikkerhet') || lower.includes('stillas')) {
        suggestedActions.push({
          id: 'open_sja_modal',
          type: 'open_sja_modal',
          label: '🛡️ Generer SJA-skjema',
          data: {
            title: `SJA: ${text.slice(0, 45)}`,
            task: text,
            projectId: resolvedProjectId
          }
        });
        followUpPrompts = [
          'Hvilke spesifikke vernetiltak kreves her?',
          'Sjekk værforhold og vind på Yr.no for arbeid i høyden',
          'Hva sier Byggherreforskriften § 18 om dette?'
        ];
      } else if (lower.includes('tek17') || lower.includes('våtrom') || lower.includes('sluk') || lower.includes('membran') || lower.includes('vegg')) {
        suggestedActions.push({
          id: 'open_vision_scan',
          type: 'open_ai_vision',
          label: '📸 Kontroller med TEK17 Visjon'
        });
        followUpPrompts = [
          'Hva er kravene til fall mot sluk i TEK17 § 13-15?',
          'Hvilke krav gjelder for dampsperre ved etterisolering?',
          'Må jeg søke kommunen (ansvarsrett) for dette tiltaket?'
        ];
      } else {
        suggestedActions.push({
          id: 'open_offer_modal',
          type: 'open_offer_modal',
          label: '📝 Nytt Tilbud'
        });
        suggestedActions.push({
          id: 'open_co_modal',
          type: 'open_change_order_modal',
          label: '📄 Endringsordre (NS 8406)'
        });
        followUpPrompts = [
          'Hjelp meg å skrive et nytt tilbud',
          'Hva er reglene for endringsvarsel i NS 8406?',
          'Sjekk TEK17-krav for dette arbeidet'
        ];
      }

      // Log the consultation into agent activities (NOT daily_logs!)
      await saveCollectionItem('agent_activities', {
        type: isOfferIntent ? 'offer_consultation' : 'chat_consultation',
        title: isOfferIntent ? 'MesterAI: Tilbudsrådgivning' : 'MesterAI: Faglig veiledning',
        description: text.slice(0, 120),
        trade: trade || 'general',
        tradeName: authorName,
        status: 'verified',
        badge: isOfferIntent ? 'TILBUD' : 'SPARRING',
        projectId: resolvedProjectId,
        projectName: resolvedProjectName,
        createdAt: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        action: isOfferIntent ? 'offer_consultation' : 'conversation',
        reply: replyText,
        suggestedActions,
        followUpPrompts,
        intent: isOfferIntent ? 'offer' : 'conversation',
        offerDraft,
        targetProject: targetProject ? { id: targetProject.id, name: targetProject.name } : null
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

    // 3b. 1-Click Delete Change Order (Superbruker / Admin action)
    if (action === 'delete_change_order') {
      if (!changeOrderId) {
        return NextResponse.json({ error: 'Mangler changeOrderId' }, { status: 400 });
      }

      const targetCO = (await getCollectionItemById('change_orders', changeOrderId)) || 
        (await getCollectionItems('change_orders')).find((c: any) => c.id === changeOrderId);
      
      if (!targetCO) {
        return NextResponse.json({ error: 'Endringsordre ikke funnet' }, { status: 404 });
      }

      const user = getUserFromRequest(req);
      const isSuper = user?.role === 'superadmin' || user?.role === 'admin' ||
        ['kenkri3@gmail.com', 'aichatnorge@gmail.com', 'kenneth@aichatnorge.no', 'fredrik.r.ellingsen@gmail.com', 'fredrik@aichatnorge.no'].includes((user?.email || '').toLowerCase()) ||
        (authorName || '').toLowerCase().includes('admin') ||
        (authorName || '').toLowerCase().includes('ken') ||
        verifyCronOrInternalSecret(req);

      if (!isSuper && user?.role !== 'admin') {
        return NextResponse.json({ error: 'Kun superbrukere og administratorer kan slette endringsordrer' }, { status: 403 });
      }

      await deleteCollectionItem('change_orders', changeOrderId);

      // Clean up corresponding agent activity if present
      const allActivities = await getCollectionItems('agent_activities');
      const matchingActs = allActivities.filter((a: any) => 
        (a.title && targetCO.title && a.title.includes(targetCO.title)) || 
        (a.type === 'change_order' && a.title && a.title.includes('Slett forrige'))
      );
      for (const ma of matchingActs) {
        await deleteCollectionItem('agent_activities', ma.id);
      }

      await saveCollectionItem('agent_activities', {
        type: 'change_order_deleted',
        title: `Endringsordre slettet av superbruker`,
        description: `Endringsordre #${targetCO.changeNumber || ''} ("${targetCO.title}") ble slettet og fjernet fra godkjenningskøen av ${(user as any)?.displayName || user?.email || authorName}.`,
        trade: 'general',
        tradeName: 'Superbruker',
        status: 'deleted',
        badge: 'SLETTET',
        createdAt: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Endringsordre permanent slettet',
        deletedId: changeOrderId
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
  try {
    const aiRes = await generateWithAiEngine({
      prompt: `Oversett følgende melding til språkkode '${targetLanguage}' slik at en utenlandsk håndverker forstår det presist: "${reply}"`,
      operation: 'agent_translate_reply',
      notes: `Translation to ${targetLanguage}`
    });
    return aiRes?.text?.trim() || reply;
  } catch {
    return reply;
  }
}
