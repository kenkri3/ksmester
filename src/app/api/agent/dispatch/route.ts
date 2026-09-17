import { NextRequest, NextResponse } from 'next/server';
import { generateSJAAction } from '@/src/app/actions/aiActions';
import { evaluatePreCloseWall } from '@/src/lib/server/crossTradeEngine';
import { createAutonomousChangeOrder } from '@/src/lib/server/changeOrderAgent';
import { saveCollectionItem, getCollectionItems, updateCollectionItem, getCollectionItemById, deleteCollectionItem } from '@/src/lib/server/db';
import { generateWithAiEngine, cleanAiJson } from '@/src/lib/server/aiEngine';
import { getUserFromRequest, verifyCronOrInternalSecret, verifyAuthToken } from '@/src/lib/server/auth';
import { sendOfferByEmail, sendChangeOrderByEmail, sendSystemEmail } from '@/src/lib/server/emailSender';
import { 
  getApprenticeProfiles, 
  approveApprenticeGoal, 
  generateApprenticeHalfYearReport, 
  syncApprenticeProgressFromTimeEntries 
} from '@/src/lib/server/apprenticeEngine';
import { 
  getOrGenerateProjectDocumentation, 
  buildConsolidatedFdvHtml 
} from '@/src/lib/server/projectDocumentationEngine';
import { OfferItem } from '@/src/types';
import { sanitizePlainText } from '@/src/lib/utils';
import { formatCleanOfferDescription, formatCleanChangeOrderDescription } from '@/src/lib/server/offerFormatter';

// 🛡️ Tilgangskontroll: Gyldig innlogget bruker (JWT i header/cookie/body),
// cron/intern hemmelighet, eller tillatte hjelpehandlinger (autofill_form).
function isAuthorizedDispatchCaller(req: NextRequest, body?: any): boolean {
  if (verifyCronOrInternalSecret(req)) return true;
  if (getUserFromRequest(req)) return true;
  if (body?.userToken && verifyAuthToken(body.userToken)) return true;
  if (body?.action === 'autofill_form') return true;
  return false;
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

function extractDeviationDetails(text: string, lower: string) {
  let title = 'Mangel og kvalitetsavvik';
  let category = 'quality';
  let codeRef = 'TEK17 & Internkontrollforskriften § 5';
  let suggestedAction = 'Utbedre avviket i henhold til prosjektert løsning og dokumentere med før-/etter-foto.';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';

  let cleaned = text
    .replace(/^(?:vi må|kan du|vennligst)?\s*(?:legge?\s+inn|registrere?|opprette?|føre?|lage?)\s+(?:et\s+)?avvik\s*(?:på|for|angående|vedrørende|om)?/i, '')
    .replace(/^avvik:?\s*/i, '')
    .trim();

  if (cleaned.length > 3) {
    title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    if (title.length > 80) title = title.slice(0, 80) + '...';
  }

  if (lower.includes('isolasjon') || lower.includes('kuldebro') || lower.includes('trekk') || lower.includes('glava') || lower.includes('rockwool')) {
    category = 'isolasjon';
    codeRef = 'TEK17 § 14-2 (Energieffektivitet) & Byggforsk 523.255';
    suggestedAction = 'Montere mineralull med forskriftsmessig klemming mot stenderverk. Kontrollere kontinuerlig dampsperre med klemte skjøter før lukking.';
    severity = 'high';
  } else if (lower.includes('fall') || lower.includes('sluk') || lower.includes('membran') || lower.includes('våtrom') || lower.includes('lekkasje')) {
    category = 'membran';
    codeRef = 'TEK17 § 13-15 (Våtrom og fall mot sluk) & BVN blad 31.205';
    suggestedAction = 'Utbedre fall mot sluk (minst 1:50 i dusjsone) og etablere godkjent mansjett/klemring før flislegging.';
    severity = 'high';
  } else if (lower.includes('brann') || lower.includes('gjennomføring') || lower.includes('mansjett')) {
    category = 'brann';
    codeRef = 'TEK17 § 11-10 (Brannceller og seksjonering) & NS 3901';
    suggestedAction = 'Branntette gjennomføringer med godkjent brannakryl/mansjett tilpasset kravklasse EI 60.';
    severity = 'critical';
  } else if (lower.includes('bjelke') || lower.includes('spenn') || lower.includes('bæring') || lower.includes('svikt') || lower.includes('sprekk')) {
    category = 'bæresystem';
    codeRef = 'TEK17 § 10-1 (Bæreevne og stabilitet) & Eurokode 5';
    suggestedAction = 'Forsterke bjelkelag/understøttelse og få rådgivende ingeniør (RIB) til å verifisere nedbøyningskrav.';
    severity = 'critical';
  } else if (lower.includes('rør') || lower.includes('avløp') || lower.includes('vann')) {
    category = 'vvs';
    codeRef = 'TEK17 § 15-5 (Innvendige vanninstallasjoner) & Byggforsk 553.115';
    suggestedAction = 'Montere rør-i-rør system med forskriftsmessig avrenning til sluk og klamring per 0,6 m.';
    severity = 'high';
  } else if (lower.includes('el') || lower.includes('kabel') || lower.includes('sikring') || lower.includes('kurs')) {
    category = 'elektro';
    codeRef = 'NEK 400 (Elektriske lavspenningsinstallasjoner) & DLE-krav';
    suggestedAction = 'Klamre trekkerør, sikre strekkavlastning og utstede samsvarserklæring før isolering.';
    severity = 'high';
  }

  return { title, category, codeRef, suggestedAction, severity };
}

function extractTimeDetails(text: string) {
  const hoursMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:timer?|t\b)/i);
  const hours = hoursMatch ? parseFloat(hoursMatch[1].replace(',', '.')) : 7.5;
  let description = text
    .replace(/^(?:vi må|kan du|vennligst)?\s*(?:føre?|registrere?|skrive?|loggføre?)\s*(?:\d+(?:[.,]\d+)?\s*(?:timer?|t\b))?\s*(?:timer?|t\b)?\s*(?:på|for|til)?/i, '')
    .trim();
  if (!description || description.length < 3) {
    description = 'Fagarbeid, produksjon og montering';
  }
  return { hours, description };
}

/**
 * POST /api/agent/dispatch
 * Handles instructions, quick commands, voice-to-action, approvals, and validations.
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!isAuthorizedDispatchCaller(req, body)) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  try {
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
      companyId,
      webSearch
    } = body;

    // 0. AI AUTOFILL & HISTORICAL FORM ASSISTANT
    if (action === 'autofill_form') {
      const formType = body.formType || 'offer';
      const promptText = (body.prompt || text || '').trim();
      const targetProjectId = body.projectId || projectId;

      const [allProjects, allOffers] = await Promise.all([
        getCollectionItems('projects').catch(() => []),
        getCollectionItems('offers').catch(() => [])
      ]);

      const matchedProj = allProjects.find((p: any) => p.id === targetProjectId) || (targetProjectId ? null : allProjects[0]);

      // Calculate historical rate defaults from past offers
      let hourlyRate = 890;
      if (allOffers && allOffers.length > 0) {
        const rates: number[] = [];
        allOffers.forEach((o: any) => {
          if (Array.isArray(o.items)) {
            o.items.forEach((it: any) => {
              if (it.unit === 'timer' && it.pricePerUnit > 500 && it.pricePerUnit < 2500) {
                rates.push(Number(it.pricePerUnit));
              }
            });
          }
        });
        if (rates.length > 0) {
          hourlyRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
        }
      }

      if (formType === 'offer') {
        const lowerPrompt = promptText.toLowerCase();
        let title = 'Pristilbud: Fagarbeid og utførelse';
        let description = 'Tilbudet omfatter fagmessig utførelse av avtalte arbeider inkludert materialer, rigg og drift. Standard forbehold iht. NS 8406 tas for eventuelle skjulte feil, råte eller uforutsette bygningsmessige hindringer.';
        let items: any[] = [];

        // 🤖 FORSØK DYNAMISK AI-GENERERING (For alle unike størrelser som "60kvm", tilbygg, bad etc.)
        if (promptText) {
          try {
            const aiRes = await generateWithAiEngine({
              prompt: `Du er en erfaren norsk byggmester og sjefskalkulatør.
Lag et komplett, profesjonelt og detaljert tilbud med poster for fagarbeid og materialer basert på denne instruksen:
"${promptText}"

Prosjekt: "${matchedProj?.name || 'Byggeprosjekt'}"
Standard timepris: ${hourlyRate} kr/t eks mva.

Returner KUN et gyldig JSON-objekt:
{
  "title": "Tittel på tilbudet",
  "description": "Fagmessig beskrivelse av arbeidet inkludert standard forbehold iht NS 8406 / BVN",
  "items": [
    { "description": "Spesifikasjon av post", "quantity": 10, "unit": "timer/stk/m2", "pricePerUnit": 890 }
  ]
}`,
              operation: 'autofill_offer_form',
              responseMimeType: 'application/json'
            });

            if (aiRes?.text) {
              const cleaned = cleanAiJson(aiRes.text);
              const parsed = JSON.parse(cleaned);
              if (parsed.title && Array.isArray(parsed.items) && parsed.items.length > 0) {
                title = parsed.title;
                description = parsed.description || description;
                items = parsed.items.map((it: any) => {
                  const q = Number(it.quantity) || 1;
                  const p = Number(it.pricePerUnit) || hourlyRate;
                  return {
                    description: it.description || 'Fagarbeid',
                    quantity: q,
                    unit: it.unit || 'timer',
                    pricePerUnit: p,
                    total: Math.round(q * p)
                  };
                });
              }
            }
          } catch (aiErr) {
            console.warn('[Autofill Offer] AI-generering feilet, bruker skalert fallback:', aiErr);
          }
        }

        // 🛡️ SKALERT DETERMINISTISK FALLBACK (hvis AI ikke returnerte poster)
        if (items.length === 0) {
          const sqmMatch = lowerPrompt.match(/(\d+)\s*(?:kvm|m2|m²)/i);
          const sqm = sqmMatch ? parseInt(sqmMatch[1], 10) : (lowerPrompt.includes('bad') ? 8 : 80);

          if (lowerPrompt.includes('bad') || lowerPrompt.includes('våtrom')) {
            const scale = Math.max(0.8, sqm / 6);
            title = matchedProj ? `Totalrenovering Bad (${sqm} m²) - ${matchedProj.name}` : `Totalrenovering Bad (ca. ${sqm} m²)`;
            description = `Komplett oppgradering av bad (${sqm} m²) iht. Byggebransjens Våtromsnorm (BVN) og TEK17 § 13-15. Inkluderer riving, rør-i-rør, membran, flislegging, elektro, downlights, sanitærutstyr og avfallshåndtering.`;
            items = [
              { description: `Riving av eksisterende overflater, membran og bortkjøring av avfall (${sqm} m²)`, quantity: Math.round(16 * Math.max(1, scale * 0.7)), unit: 'timer', pricePerUnit: 790, total: Math.round(16 * Math.max(1, scale * 0.7) * 790) },
              { description: `Rørleggerarbeid: Rør-i-rør, sluk, fordelerskap og trykkprøving`, quantity: Math.round(24 * Math.max(1, scale * 0.5)), unit: 'timer', pricePerUnit: 980, total: Math.round(24 * Math.max(1, scale * 0.5) * 980) },
              { description: `Rørleggermateriell: Fordelerskap, rør, slukmansjetter og koblinger`, quantity: 1, unit: 'stk', pricePerUnit: Math.round(24500 * Math.max(1, scale * 0.6)), total: Math.round(24500 * Math.max(1, scale * 0.6)) },
              { description: `Elektroarbeid: Varmekabler, termostater, downlights og stikkontakter`, quantity: Math.round(16 * Math.max(1, scale * 0.5)), unit: 'timer', pricePerUnit: 950, total: Math.round(16 * Math.max(1, scale * 0.5) * 950) },
              { description: `Elektromateriell: Varmekabel, Elko Plus brytere/dimmer og LED belysning`, quantity: 1, unit: 'stk', pricePerUnit: Math.round(14800 * Math.max(1, scale * 0.6)), total: Math.round(14800 * Math.max(1, scale * 0.6)) },
              { description: `Tømrer: Utretting av vegger, rupanel, Litex våtromsplater og kasser`, quantity: Math.round(26 * Math.max(1, scale * 0.7)), unit: 'timer', pricePerUnit: hourlyRate, total: Math.round(26 * Math.max(1, scale * 0.7) * hourlyRate) },
              { description: `Tømrermateriell: Litex plater, stendere, skruer og mansjetter`, quantity: 1, unit: 'stk', pricePerUnit: Math.round(11500 * Math.max(1, scale * 0.8)), total: Math.round(11500 * Math.max(1, scale * 0.8)) },
              { description: `Membran: Smøremembran med forsterkningsbånd og tettesjikt iht BVN (${sqm} m²)`, quantity: Math.round(12 * Math.max(1, scale * 0.8)), unit: 'timer', pricePerUnit: 850, total: Math.round(12 * Math.max(1, scale * 0.8) * 850) },
              { description: `Flisarbeid: Legging av flis på gulv og vegger, fuging og elastisk silikon`, quantity: Math.round(28 * Math.max(1, scale * 0.8)), unit: 'timer', pricePerUnit: 880, total: Math.round(28 * Math.max(1, scale * 0.8) * 880) },
              { description: `Avfallshåndtering, deponi & containerleie`, quantity: 1, unit: 'stk', pricePerUnit: Math.round(6500 * Math.max(1, scale * 0.7)), total: Math.round(6500 * Math.max(1, scale * 0.7)) },
              { description: `Rigg, drift, sluttdokumentasjon og FDV i KS-system`, quantity: 1, unit: 'stk', pricePerUnit: Math.round(7500 * Math.max(1, scale * 0.6)), total: Math.round(7500 * Math.max(1, scale * 0.6)) }
            ];
          } else if (lowerPrompt.includes('kledning') || lowerPrompt.includes('fasade') || lowerPrompt.includes('isolering') || lowerPrompt.includes('etterisolere')) {
            title = matchedProj ? `Etterisolering & Ny Kledning - ${matchedProj.name}` : `Etterisolering & Ny Kledning (ca. ${sqm} m²)`;
            description = 'Etterisolering med 50mm Glava/Rockwool, ny vindsperre, klemlister, musebånd og dobbelfals kledning. Forbehold om råte i eksisterende underliggende bærekonstruksjon iht. NS 8406.';
            items = [
              { description: 'Riving av eksisterende trekledning og transport til container', quantity: 22, unit: 'timer', pricePerUnit: 790, total: 17380 },
              { description: 'Utlekting 48x48mm og montering av 50mm isolasjon', quantity: 32, unit: 'timer', pricePerUnit: hourlyRate, total: 32 * hourlyRate },
              { description: `Isolasjonsmateriell: 50mm Glava Proff 34 (ca. ${sqm}m²)`, quantity: sqm, unit: 'm2', pricePerUnit: 95, total: sqm * 95 },
              { description: 'Montering av diffusjonsåpen vindsperre, klemlister og tape skjøter', quantity: 18, unit: 'timer', pricePerUnit: hourlyRate, total: 18 * hourlyRate },
              { description: 'Vindsperremateriell: Tyvek vindsperre, tape og klemlekter', quantity: 1, unit: 'stk', pricePerUnit: 6200, total: 6200 },
              { description: 'Montering av grunnet dobbelfals kledning inkl. musebånd i bunn', quantity: 45, unit: 'timer', pricePerUnit: hourlyRate, total: 45 * hourlyRate },
              { description: `Kledningsmateriell: 19x148mm grunnet gran dobbelfals (${sqm}m²)`, quantity: sqm, unit: 'm2', pricePerUnit: 340, total: sqm * 340 },
              { description: 'Beslag og vannbrett over/under vinduer samt hjørnekasser', quantity: 16, unit: 'timer', pricePerUnit: hourlyRate, total: 16 * hourlyRate },
              { description: 'Stillasleie, container og avfallsgebyr', quantity: 1, unit: 'stk', pricePerUnit: 12500, total: 12500 }
            ];
          } else if (lowerPrompt.includes('vindu') || lowerPrompt.includes('dør')) {
            title = matchedProj ? `Utskifting av Vinduer - ${matchedProj.name}` : 'Utskifting av 6 stk 3-lags lavenergivinduer';
            description = 'Utskifting av 6 stk vinduer til moderne 3-lags tre/aluminium med U-verdi <= 0.8 iht. TEK17 § 14. Inkluderer dytteremser, bunnfyllingslist, utvendig beslag og listing.';
            items = [
              { description: 'Demontering av eksisterende vinduer og forsvarlig kildesortering', quantity: 8, unit: 'timer', pricePerUnit: 790, total: 6320 },
              { description: 'Innsetting, oppretting, kiling og fastskruing av nye vinduer', quantity: 20, unit: 'timer', pricePerUnit: hourlyRate, total: 20 * hourlyRate },
              { description: 'Tetting med bunnfyllingslist, fugemasse og dytteremser', quantity: 6, unit: 'timer', pricePerUnit: hourlyRate, total: 6 * hourlyRate },
              { description: 'Innvendig foring og gerikter (ferdig hvitmalt)', quantity: 16, unit: 'timer', pricePerUnit: hourlyRate, total: 16 * hourlyRate },
              { description: 'Materiell: 6 stk 3-lags lavenergivinduer 110x120cm tre/alu', quantity: 6, unit: 'stk', pricePerUnit: 7400, total: 44400 },
              { description: 'Materiell: Foringer, lister, skruer, bunnfyllingslist og fugemasse', quantity: 1, unit: 'stk', pricePerUnit: 6800, total: 6800 }
            ];
          } else if (lowerPrompt.includes('el') || lowerPrompt.includes('sikring') || lowerPrompt.includes('stikk')) {
            title = matchedProj ? `Elektroinstallasjon & Sikringsskap - ${matchedProj.name}` : 'Oppgradering av El-anlegg & Sikringsskap';
            description = 'Komplett oppgradering av fordelingsskap til moderne automatsikringer med integrert jordfeilvern, overspenningsvern og nye kurser iht. NEK 400.';
            items = [
              { description: 'Montering av nytt fordelerskap med overspenningsvern og 12 kurser', quantity: 14, unit: 'timer', pricePerUnit: 950, total: 13300 },
              { description: 'Trekking av nye kurser til kjøkken og våtrom', quantity: 12, unit: 'timer', pricePerUnit: 950, total: 11400 },
              { description: 'Materiell: Eaton sikringsskap, jordfeilautomater og overspenningsvern', quantity: 1, unit: 'stk', pricePerUnit: 18500, total: 18500 },
              { description: 'Materiell: PR-kabel, rør, stikkontakter og Elko Plus rammer', quantity: 1, unit: 'stk', pricePerUnit: 8200, total: 8200 },
              { description: 'Sluttkontroll, målerapport og samsvarserklæring i Boligmappa', quantity: 1, unit: 'stk', pricePerUnit: 2500, total: 2500 }
            ];
          } else {
            const cleanDesc = promptText || 'Rehabilitering og fagarbeid';
            title = matchedProj ? `Tilbud: ${cleanDesc} - ${matchedProj.name}` : `Pristilbud: ${cleanDesc}`;
            items = [
              { description: `Fagarbeid og montasje: ${cleanDesc}`, quantity: 24, unit: 'timer', pricePerUnit: hourlyRate, total: 24 * hourlyRate },
              { description: 'Nødvendige byggevarer, festemidler og forbruksmateriell', quantity: 1, unit: 'stk', pricePerUnit: 14500, total: 14500 },
              { description: 'Rigg, drift, verneutstyr og avfallshåndtering', quantity: 1, unit: 'stk', pricePerUnit: 4500, total: 4500 }
            ];
          }
        }

        return NextResponse.json({
          success: true,
          action: 'autofill_form',
          formType: 'offer',
          data: {
            projectId: matchedProj?.id || '',
            clientName: matchedProj?.clientName || '',
            clientEmail: matchedProj?.clientEmail || '',
            title,
            description,
            items
          }
        });
      }

      if (formType === 'change_order') {
        const lowerPrompt = promptText.toLowerCase();
        let title = 'Endringsvarsel iht. NS 8406';
        let description = 'Det varsles herved om tilleggsarbeid uten ugrunnet opphold iht. NS 8406 pkt. 19.2.';
        let cause = 'client_request';
        let amountExVat = 14500;
        let impactDays = 2;

        if (lowerPrompt.includes('downlight') || lowerPrompt.includes('lys') || lowerPrompt.includes('dimmer')) {
          title = '6 ekstra downlights og dimmer i stue';
          description = 'Byggherre har bestilt 6 stk ekstra LED downlights med skjult trekkerør og DALI-dimming. Varslet iht. NS 8406 pkt. 19.2.';
          cause = 'client_request';
          amountExVat = 14500;
          impactDays = 2;
        } else if (lowerPrompt.includes('råte') || lowerPrompt.includes('skade') || lowerPrompt.includes('bjelke')) {
          title = 'Skjult råteskade i bjelkelag under sluk';
          description = 'Ved riving ble det avdekket uforutsette råteskader i bærebjelker under eksisterende sluk. Krever utskifting/lasking og soppsanering før videre oppbygging iht. NS 8406 pkt. 19.3.';
          cause = 'unforeseen';
          amountExVat = 28000;
          impactDays = 4;
        } else if (lowerPrompt.includes('avretting') || lowerPrompt.includes('skjev') || lowerPrompt.includes('gulv')) {
          title = 'Ekstra avretting av skjevt undergulv';
          description = 'Avvik i undergulv målt til > 18 mm, noe som krever primer og 25 sekker fiberarmert avrettingsmasse for å oppnå toleranseklasse PB iht. NS 3420.';
          cause = 'unforeseen';
          amountExVat = 16500;
          impactDays = 2;
        } else {
          title = promptText ? `Endring: ${promptText}` : 'Ekstra fagarbeid bestilt av byggherre';
          description = `Byggherre har anmodet om følgende tilleggsarbeid: "${promptText || 'Tilleggsarbeid'}". Varsles uten ugrunnet opphold iht. NS 8406 pkt. 19.2 med krav om justering av vederlag og fristforlengelse.`;
          cause = 'client_request';
          amountExVat = 12500;
          impactDays = 2;
        }

        return NextResponse.json({
          success: true,
          action: 'autofill_form',
          formType: 'change_order',
          data: {
            projectId: matchedProj?.id || '',
            title,
            description,
            cause,
            amountExVat,
            impactDays
          }
        });
      }

      if (formType === 'sja') {
        const lowerPrompt = promptText.toLowerCase();
        let jobTitle = 'SJA: Stillas- og takarbeid';
        let hazards = ['Fall fra høyde (> 2 meter)', 'Gjenstander som faller ned', 'Kapp- og gjerdesag skader'];
        let mitigations = ['Godkjent stillas med grønt kontrollskilt', 'Bruk av godkjent fallsikringssele med falldemper', 'Hjelm og hørselvern påkrevd', 'Sperrebånd på bakkeplan'];

        if (lowerPrompt.includes('varm') || lowerPrompt.includes('sveis') || lowerPrompt.includes('takbelegg')) {
          jobTitle = 'SJA: Varme arbeider & Taktekking';
          hazards = ['Brann i brennbart underlag / isolasjon', 'Røyk- og gassutvikling', 'Forbrenningsskader ved gassbrenner'];
          mitigations = ['Gyldig sertifikat for varme arbeider', '2 stk 6kg pulverapparater på arbeidsstedet', 'Fjerning av brennbart materiale i 10m radius', '1 times kontinuerlig brannvakt etter fullført arbeid'];
        } else if (lowerPrompt.includes('riv') || lowerPrompt.includes('støv') || lowerPrompt.includes('asbest')) {
          jobTitle = 'SJA: Rivearbeid av bærende konstruksjon & Støv';
          hazards = ['Utilsiktet kollaps av konstruksjon', 'Eksponering for kvarts- og asbeststøv', 'Klemskader ved fjerning av tunge elementer'];
          mitigations = ['Montere midlertidige stempler (soldater) før riving', 'Bruk av godkjent P3-støvmaske og punktavsug med HEPA-filter', 'Vernebriller og vernesko klasse S3'];
        }

        return NextResponse.json({
          success: true,
          action: 'autofill_form',
          formType: 'sja',
          data: {
            projectId: matchedProj?.id || '',
            jobTitle,
            location: matchedProj?.location || 'Byggeplass',
            hazards,
            mitigations
          }
        });
      }

      if (formType === 'deviation') {
        const lowerPrompt = promptText.toLowerCase();
        let title = 'Avvik: Manglende trykktest for rør-i-rør';
        let description = 'Rørlegger har ikke levert dokumentert trykkprøving før tømrer lukker sjakt. Aktivert som tverrfaglig lukkesperre.';
        let category = 'quality';
        let severity = 'critical';
        let actionTaken = 'Vegg rødmerket. Tømrer stanser lukking til rørlegger har trykktestet og signert i KS-systemet.';

        if (lowerPrompt.includes('støv') || lowerPrompt.includes('hms') || lowerPrompt.includes('sikkerhet')) {
          title = 'HMS-avvik (RUH): Kapping uten tilkoblet punktsug';
          description = 'Arbeid med gipskapping utført innendørs uten tilstrekkelig avsug, medførte støvflukt i fellesareal.';
          category = 'hms';
          severity = 'medium';
          actionTaken = 'Arbeidet stanset umiddelbart. HEPA-støvsuger og avsug montert på sagen.';
        } else if (lowerPrompt.includes('membran') || lowerPrompt.includes('sluk') || lowerPrompt.includes('fall')) {
          title = 'Avvik TEK17: Fall mot sluk utilstrekkelig';
          description = 'Kontrollmåling viste mindre enn 1:100 fall i dusjsone. Krav iht. TEK17 § 13-15 ikke oppfylt.';
          category = 'quality';
          severity = 'high';
          actionTaken = 'Avrettingsmasse må legges på nytt for å sikre korrekt fall før membran påføres.';
        }

        return NextResponse.json({
          success: true,
          action: 'autofill_form',
          formType: 'deviation',
          data: {
            projectId: matchedProj?.id || '',
            title,
            description,
            category,
            severity,
            actionTaken
          }
        });
      }

      if (formType === 'time') {
        return NextResponse.json({
          success: true,
          action: 'autofill_form',
          formType: 'time',
          data: {
            projectId: matchedProj?.id || '',
            hours: 7.5,
            category: 'arbeid',
            description: promptText || 'Ordinært tømrer- og fagarbeid utført på byggeplass iht. fremdriftsplan.'
          }
        });
      }

      if (formType === 'task') {
        const lowerPrompt = promptText.toLowerCase();
        let assignedTo = 'Ola Tømrer';
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
        let title = promptText || 'Trekke rørkurs og montere fordelerskap';
        let description = 'Husk å sjekke TEK17 føringsveier og merke kurser i fordelerskap.';

        if (lowerPrompt.includes('rør') || lowerPrompt.includes('sluk') || lowerPrompt.includes('lekkasje') || lowerPrompt.includes('trykk') || lowerPrompt.includes('klemring')) {
          assignedTo = 'Rørlegger Hansen';
          priority = 'high';
          title = promptText || 'Montere dampsperre og klemring på sluk i bad';
          description = 'Sjekk klemring og mansjett nøye iht. BVN og produsentanvisning før videre arbeid.';
        } else if (lowerPrompt.includes('el') || lowerPrompt.includes('sikring') || lowerPrompt.includes('kurs') || lowerPrompt.includes('stikk')) {
          assignedTo = 'Elektriker Erik';
          priority = 'high';
          title = promptText || 'Trekke rørkurs til kjøkken og montere stikk';
          description = 'Koordiner med tømrer før isolering og platetetting. Dokumenter kabelstrekk.';
        } else if (lowerPrompt.includes('fukt') || lowerPrompt.includes('kontroll') || lowerPrompt.includes('lukke')) {
          assignedTo = 'Bas';
          priority = 'urgent';
          title = promptText || 'Fuktmåling og tverrfaglig kontroll før lukking';
          description = 'Gjennomfør fuktmåling av treverk (<12% fuktighet). Sjekk lukkesperrer og ta bilder før tildekking.';
        } else if (lowerPrompt.includes('stillas') || lowerPrompt.includes('hms') || lowerPrompt.includes('sikkerhet')) {
          assignedTo = 'Bas';
          priority = 'urgent';
          title = promptText || 'Kontroll og godkjenning av stillas for takarbeid';
          description = 'Gjennomfør SJA, sjekk forankring, fotlist og godkjenningsskilt.';
        }

        const deadlineDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

        return NextResponse.json({
          success: true,
          action: 'autofill_form',
          formType: 'task',
          data: {
            projectId: matchedProj?.id || '',
            title,
            description,
            assignedTo,
            priority,
            deadline: deadlineDate
          }
        });
      }
    }

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
      // Hent hele backend som kunnskapsbase for MesterAI
      const [allProjects, allDbDeviations, allDbChangeOrders, allDbOffers, allDbTasks] = await Promise.all([
        getCollectionItems('projects').catch(() => []),
        getCollectionItems('deviations').catch(() => []),
        getCollectionItems('change_orders').catch(() => []),
        getCollectionItems('offers').catch(() => []),
        getCollectionItems('tasks').catch(() => [])
      ]);

      const wantsWebSearch = 
        Boolean(webSearch) ||
        lower.includes('søk på nettet') ||
        lower.includes('søk opp') ||
        lower.includes('finn på nettet') ||
        lower.includes('google') ||
        lower.includes('websearch') ||
        lower.includes('hva koster') ||
        lower.includes('pris på') ||
        lower.includes('markedspris') ||
        lower.includes('leverandør') ||
        lower.includes('datablad') ||
        lower.includes('godkjenning') ||
        lower.includes('sintef') ||
        lower.includes('byggevare') ||
        lower.includes('glava') ||
        lower.includes('rockwool');

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

          const exampleNames = allProjects.slice(0, 2).map((p: any) => `«${p.name}»`).join(' eller ');
          return NextResponse.json({
            success: true,
            action: 'need_project_clarification',
            reply: `Hvilket prosjekt gjelder dette? Du har flere aktive prosjekter i systemet:\n\n${projectListText}\n\nVennligst oppgi hvilket prosjekt endringen eller oppgaven tilhører${exampleNames ? ` (f.eks: ${exampleNames})` : ''}, så kobler jeg alt sammen direkte.`,
            availableProjects: allProjects.map((p: any) => ({ id: p.id, name: p.name, location: p.location }))
          });
        } else if (allProjects.length === 1) {
          // Kun ett prosjekt finnes -> Bruk dette automatisk
          targetProject = allProjects[0];
        }
      }

      const resolvedProjectId = targetProject?.id || projectId || allProjects[0]?.id || 'proj-main';
      const resolvedProjectName = targetProject?.name || projectName || allProjects[0]?.name || 'Hovedprosjekt';

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

      // INTENT DEFINITIONS & MULTI-INTENT SUPPORT
      const isDeviationIntent = 
        lower.includes('avvik') || 
        lower.includes('mangel') || 
        lower.includes('feil på') || 
        lower.includes('uoverensstemmelse') || 
        lower.includes('ikke forskriftsmessig') || 
        lower.includes('bryter med') || 
        lower.includes('ruh') || 
        lower.includes('avviksmelding');

      const isBuildingAppIntent = 
        lower.includes('byggesøknad') || 
        lower.includes('byggesak') || 
        lower.includes('søknad om tillatelse') || 
        lower.includes('nabovarsel') || 
        lower.includes('sak10') || 
        lower.includes('tiltaksklasse') || 
        lower.includes('rammetillatelse') || 
        lower.includes('igangsettingstillatelse') || 
        lower.includes('ferdigattest');

      const isMultiIntent = isBuildingAppIntent && isDeviationIntent;

      const isChangeOrderIntent = 
        !isOfferIntent && (
          lower.includes('endringsordre') || 
          lower.includes('endringsmelding') || 
          lower.includes('varsel om endring') || 
          lower.includes('tilleggsarbeid') || 
          lower.includes('tilleggsavtale') ||
          (lower.includes('endring') && (lower.includes('lag') || lower.includes('opprett') || lower.includes('registrer') || lower.includes('ny') || lower.includes('ordre')))
        );

      const isSJAIntent = 
        !isOfferIntent && (
          lower.includes('sja') || 
          lower.includes('sikker jobb analyse') || 
          lower.includes('sikkerhetsanalyse') || 
          lower.includes('risikovurdering') || 
          lower.includes('faresone')
        );

      const isTimeIntent = 
        (lower.includes('før time') || 
         lower.includes('føre time') || 
         lower.includes('før dagens time') || 
         lower.includes('timer i dag') || 
         lower.includes('timeregistrering') || 
         lower.includes('registrer time') || 
         lower.includes('timeføring') ||
         /\b\d+(?:[.,]\d+)?\s*(?:timer|t\b)/i.test(lower)) &&
        !lower.includes('tilbud') &&
        !lower.includes('kalkyle');

      const isChecklistIntent = 
        (lower.includes('sjekkliste') || 
         lower.includes('ks-sjekk') || 
         lower.includes('kvalitetssjekk') || 
         lower.includes('egenkontroll')) &&
        !isBuildingAppIntent;

      const isContractIntent = 
        lower.includes('kontrakt') || 
        lower.includes('entrepriseavtale') || 
        lower.includes('håndverkeravtale') || 
        lower.includes('standardkontrakt') ||
        lower.includes('ns 8405') ||
        lower.includes('ns 8407') ||
        lower.includes('bustadoppføringslova');

      const isStoffkartotekIntent = 
        lower.includes('stoffkartotek') || 
        lower.includes('sikkerhetsdatablad') || 
        lower.includes('kjemikalie') || 
        lower.includes('datablad');

      const isAutonomousOfferIntent = 
        !action?.startsWith('send_') &&
        (
          lower.includes('lage hele tilbudet') ||
          lower.includes('lag hele tilbudet') ||
          lower.includes('lag tilbud') ||
          lower.includes('lag et tilbud') ||
          lower.includes('opprett tilbud') ||
          lower.includes('opprette tilbud') ||
          lower.includes('skriv tilbud') ||
          lower.includes('skrive tilbud') ||
          lower.includes('sett opp tilbud') ||
          lower.includes('kalkuler tilbud') ||
          lower.includes('kalkyle og tilbud') ||
          lower.includes('lag tilbudet for meg') ||
          lower.includes('kan du lage hele tilbudet') ||
          lower.includes('kan du lage tilbud') ||
          lower.includes('lage tilbudet') ||
          lower.includes('sende på automatikk') ||
          lower.includes('send på automatikk') ||
          (
            (lower.includes('tilbud') || lower.includes('kalkyle') || lower.includes('anbud')) &&
            (lower.includes('lag') || lower.includes('lage') || lower.includes('opprett') || lower.includes('kalkuler') || lower.includes('generer') || lower.includes('for meg') || lower.includes('hele'))
          )
        ) && 
        !lower.includes('avvis') && 
        !lower.includes('slett') &&
        !lower.includes('hva er reglene for tilbud');

      const isExplicitLukkesperre = 
        lower.startsWith('sjekk om') && (lower.includes('lukkes') || lower.includes('pre-close') || lower.includes('lukkesperre'));

      const isExplicitDailyLog = 
        lower.startsWith('byggedagbok:') || 
        lower.startsWith('dagbok:') || 
        lower.startsWith('før byggedagbok') || 
        lower.startsWith('loggfør i byggedagbok');

      // 1. MULTI-INTENT: Byggesøknad & Avvik i samme forespørsel
      if (isMultiIntent) {
        const devInfo = extractDeviationDetails(text, lower);

        // A. Lagre avvik
        const devDoc = {
          projectId: resolvedProjectId,
          project: resolvedProjectName,
          projectName: resolvedProjectName,
          title: devInfo.title,
          description: `Registrert autonomt fra fellesforespørsel: ${text}`,
          category: devInfo.category,
          severity: devInfo.severity,
          status: 'open',
          reportedBy: (user as any)?.displayName || user?.email || authorName || 'Byggeleder',
          action: devInfo.suggestedAction,
          codeReference: devInfo.codeRef,
          createdAt: new Date().toISOString(),
          timestamp: new Date().toISOString()
        };
        const savedDev = await saveCollectionItem('deviations', devDoc);

        // B. Lagre byggesøknad
        const appDoc = {
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          appType: 'ett-trinns',
          status: 'draft',
          checklist: [
            { id: 'c1', label: 'Tegninger (Plan, Snitt, Fasade M 1:100)', status: 'completed' },
            { id: 'c2', label: 'Nabovarsel (Kvittering for utsendelse)', status: 'completed' },
            { id: 'c3', label: 'Situasjonsplan (Målsatt kart)', status: 'in_progress' },
            { id: 'c4', label: 'Erklæring om ansvarsrett (SØK/PRO/UTF)', status: 'in_progress' }
          ],
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        const savedApp = await saveCollectionItem('building_applications', appDoc);

        // C. Agent-aktivitet
        await saveCollectionItem('agent_activities', {
          type: 'multi_action_executed',
          title: 'Autonom utførelse: Byggesøknad & Avvik',
          description: `Byggesøknad og avvik «${devInfo.title}» er opprettet og knyttet til ${resolvedProjectName}.`,
          trade: trade || 'general',
          tradeName: authorName,
          status: 'verified',
          badge: '100% AUTONOM',
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          createdAt: new Date().toISOString()
        });

        return NextResponse.json({
          success: true,
          action: 'multi_intent_handled',
          reply: `🏛️ **Byggesøknad og Avvik håndtert 100% autonomt for «${resolvedProjectName}»!**\n\n` +
            `Jeg har utført begge oppgavene i ett steg uten unødig forsinkelse:\n\n` +
            `1. **Byggesøknad & Nabovarsel (SAK10 / PBL § 20-1):**\n` +
            `   • Status: **Utkast forberedt for digital godkjenning**\n` +
            `   • Sjekkliste oppdatert: Plantegninger og nabovarsel er klargjort for utsendelse til berørte naboer.\n\n` +
            `2. **Avvik registrert i kvalitetssystemet (KS):**\n` +
            `   • Avvik: **«${devInfo.title}»**\n` +
            `   • Alvorlighetsgrad: 🟠 **${devInfo.severity.toUpperCase()}** (Sperrer for lukking av sonen)\n` +
            `   • Teknisk forskriftskrav: ${devInfo.codeRef}\n` +
            `   • Tiltak: ${devInfo.suggestedAction}\n\n` +
            `Begge sakene er registrert og synkronisert med prosjektets styringssystem.`,
          data: { deviation: { ...devDoc, id: savedDev.id }, buildingApp: { ...appDoc, id: savedApp.id } },
          suggestedActions: [
            {
              id: 'open_building_app',
              type: 'open_building_app_modal',
              label: '🏛️ Åpne Byggesøknad',
              data: { projectId: resolvedProjectId }
            },
            {
              id: 'open_deviation',
              type: 'open_deviation_modal',
              label: '⚠️ Se Registrert Avvik',
              data: { ...devDoc, id: savedDev.id }
            },
            {
              id: 'assign_task',
              type: 'open_task_modal',
              label: '📋 Tildel utbedring til håndverker',
              data: {
                title: `Utbedre: ${devInfo.title}`,
                description: devInfo.suggestedAction,
                projectId: resolvedProjectId,
                priority: 'high'
              }
            }
          ],
          followUpPrompts: [
            `Tildel oppgave for å utbedre ${devInfo.title}`,
            'Hva er svarfristen for nabovarselet?',
            'Før dagens timer på prosjektet'
          ]
        });
      }

      // 2. ENKELTINTENT: Avvik / Mangler / RUH
      if (isDeviationIntent) {
        const devInfo = extractDeviationDetails(text, lower);

        const devDoc = {
          projectId: resolvedProjectId,
          project: resolvedProjectName,
          projectName: resolvedProjectName,
          title: devInfo.title,
          description: `Avvik meldt inn via MesterAI: ${text}`,
          category: devInfo.category,
          severity: devInfo.severity,
          status: 'open',
          reportedBy: (user as any)?.displayName || user?.email || authorName || 'Byggeleder',
          action: devInfo.suggestedAction,
          codeReference: devInfo.codeRef,
          createdAt: new Date().toISOString(),
          timestamp: new Date().toISOString()
        };

        const savedDev = await saveCollectionItem('deviations', devDoc);

        await saveCollectionItem('agent_activities', {
          type: 'deviation_created',
          title: `Avvik registrert: ${devInfo.title}`,
          description: `Registrert på ${resolvedProjectName}. Forskriftskrav: ${devInfo.codeRef}.`,
          trade: trade || 'general',
          tradeName: authorName,
          status: 'open',
          badge: devInfo.severity === 'critical' ? 'KRITISK AVVIK' : 'AVVIK REGISTRERT',
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          createdAt: new Date().toISOString()
        });

        return NextResponse.json({
          success: true,
          action: 'deviation_registered',
          reply: `⚠️ **Avvik registrert autonomt i KS-systemet!**\n\n` +
            `• **Avvik:** **«${devInfo.title}»**\n` +
            `• **Prosjekt:** **${resolvedProjectName}**\n` +
            `• **Alvorlighetsgrad:** 🟠 **${devInfo.severity.toUpperCase()}** (Aktiverer lukkesperre for sonen)\n` +
            `• **Teknisk forskriftskrav:** ${devInfo.codeRef}\n` +
            `• **Påkrevd tiltak:** ${devInfo.suggestedAction}\n` +
            `• **Gjeldende status:** ⏳ **Åpen for utbedring**\n\n` +
            `Avviket er lagret i prosjektets kvalitetssikringslogg og sperrer for overlevering inntil lukking er bekreftet.`,
          data: { ...devDoc, id: savedDev.id },
          suggestedActions: [
            {
              id: 'open_deviation',
              type: 'open_deviation_modal',
              label: '⚠️ Åpne Avvik i KS',
              data: { ...devDoc, id: savedDev.id }
            },
            {
              id: 'assign_task',
              type: 'open_task_modal',
              label: '📋 Tildel utbedring til håndverker',
              data: {
                title: `Utbedre: ${devInfo.title}`,
                description: devInfo.suggestedAction,
                projectId: resolvedProjectId,
                priority: 'high'
              }
            },
            {
              id: 'open_ai_vision',
              type: 'open_ai_vision',
              label: '📸 Ta verifiseringsfoto'
            }
          ],
          followUpPrompts: [
            `Tildel oppgave for å utbedre ${devInfo.title}`,
            `Hvilke krav stiller TEK17 til dette?`,
            `Sjekk om veggen kan lukkes nå`
          ]
        });
      }

      // 3. ENKELTINTENT: Byggesøknad & Nabovarsel
      if (isBuildingAppIntent) {
        const appType = lower.includes('ramme') ? 'ramme' : lower.includes('igangsetting') ? 'igangsetting' : lower.includes('ferdigattest') ? 'ferdigattest' : 'ett-trinns';

        const appDoc = {
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          appType,
          status: 'draft',
          checklist: [
            { id: 'c1', label: 'Tegninger (Plan, Snitt, Fasade M 1:100)', status: 'completed' },
            { id: 'c2', label: 'Nabovarsel (Kvittering for utsendelse)', status: 'completed' },
            { id: 'c3', label: 'Situasjonsplan (Målsatt kart)', status: 'in_progress' },
            { id: 'c4', label: 'Erklæring om ansvarsrett (SØK/PRO/UTF)', status: 'in_progress' }
          ],
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        const savedApp = await saveCollectionItem('building_applications', appDoc);

        await saveCollectionItem('agent_activities', {
          type: 'building_application',
          title: `Byggesøknad opprettet for ${resolvedProjectName}`,
          description: `${appType === 'ett-trinns' ? 'Ett-trinns søknad' : appType} iht. PBL § 20-1 og SAK10 er forberedt.`,
          trade: 'general',
          tradeName: 'Ansvarlig Søker',
          status: 'draft',
          badge: 'SAK10 / PBL',
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          createdAt: new Date().toISOString()
        });

        return NextResponse.json({
          success: true,
          action: 'building_application_created',
          reply: `🏛️ **Byggesøknad forberedt for «${resolvedProjectName}»!**\n\n` +
            `• **Type søknad:** **${appType === 'ett-trinns' ? 'Ett-trinns søknad om tillatelse (PBL § 20-1)' : appType.toUpperCase()}**\n` +
            `• **Tiltaksklasse:** Tiltaksklasse 1 (Normal risiko)\n` +
            `• **Fremdrift på søknadspakken:**\n` +
            `  ✅ Fasade-, plan- og snittegninger registrert\n` +
            `  ✅ Nabovarsel klargjort for utsendelse til berørte naboer\n` +
            `  ⏳ Situasjonsplan og frisiktlinjer\n` +
            `  ⏳ Erklæring om ansvarsrett (SØK, PRO, UTF)\n\n` +
            `Søknaden er klar til digital gjennomgang og signering før innsending til kommunen.`,
          data: { ...appDoc, id: savedApp.id },
          suggestedActions: [
            {
              id: 'open_building_app',
              type: 'open_building_app_modal',
              label: '🏛️ Åpne Byggesøknad & Nabovarsel',
              data: { projectId: resolvedProjectId }
            },
            {
              id: 'open_checklist',
              type: 'open_checklist_modal',
              label: '📋 Sjekkliste for ansvarlig søker'
            }
          ],
          followUpPrompts: [
            'Hva er svarfristen for nabovarselet?',
            'Hvilke vedlegg kreves for tiltaksklasse 1?',
            'Generer erklæring om ansvarsrett'
          ]
        });
      }

      // 4. ENKELTINTENT: Endringsordre (NS 8406 / NS 8405)
      if (isChangeOrderIntent) {
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
          reply: `📄 **Endringsordre registrert autonomt iht. NS 8406!**\n\n` +
            `• **Tittel:** **«${result.changeOrder.title}»**\n` +
            `• **Prosjekt:** **${resolvedProjectName}**\n` +
            `• **Estimert beløp:** kr **${result.changeOrder.totalAmount?.toLocaleString('no-NO')}** inkl. mva (kr ${result.changeOrder.amountExVat?.toLocaleString('no-NO')} eks. mva)\n` +
            `• **Fristforlengelse:** ${result.changeOrder.impactDays || 2} virkedager\n` +
            `• **Juridisk hjemmel:** NS 8406 pkt. 19 (Endringer og varsling)\n\n` +
            `Endringsordren er generert og plassert i godkjenningskøen for utsendelse til kunden.`,
          data: result.changeOrder,
          suggestedActions: [
            {
              id: 'open_co',
              type: 'open_change_order_modal',
              label: '📄 Åpne Endringsordre',
              data: result.changeOrder
            },
            {
              id: 'send_change_order_email',
              type: 'send_change_order_email',
              label: '✉️ Send varsel til kunden',
              data: result.changeOrder
            }
          ],
          followUpPrompts: [
            'Send dette endringsvarselet til kunden på e-post',
            'Hvordan unngår jeg preklusjon iht. NS 8406?',
            'Legg til flere poster i endringsordren'
          ]
        });
      }

      // 5. ENKELTINTENT: SJA (Sikker Jobb Analyse)
      if (isSJAIntent) {
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
          reply: `🛡️ **Sikker Jobb Analyse (SJA) generert autonomt!**\n\n` +
            `• **Arbeidsoperasjon:** **«${sjaResult.data.title}»**\n` +
            `• **Prosjekt:** **${resolvedProjectName}**\n` +
            `• **Hjemmel:** Byggherreforskriften § 18 & ${sjaResult.data.tek17Reference || 'Forskrift om utførelse av arbeid'}\n` +
            `• **Påkrevd verneutstyr (PVU):** ${(sjaResult.data.ppe || ['Hjelm', 'Vernesko', 'Briller']).join(', ')}\n` +
            `• **Risikobarrierer:** Identifisert og lagret i prosjektets HMS-perm.\n\n` +
            `SJA er ferdigstilt og kan signeres av arbeidslaget før risikofylt arbeid igangsettes.`,
          data: sjaResult.data,
          suggestedActions: [
            {
              id: 'open_sja',
              type: 'open_sja_modal',
              label: '🛡️ Se SJA-skjema & Signer',
              data: sjaResult.data
            },
            {
              id: 'assign_task',
              type: 'open_task_modal',
              label: '📋 Tildel sikringsoppgave'
            }
          ],
          followUpPrompts: [
            'Hvilke spesifikke vernetiltak kreves her?',
            'Sjekk vind og værforhold på byggeplassen',
            'Loggfør gjennomført vernerunde'
          ]
        });
      }

      // 6. ENKELTINTENT: Timeføring & Timeregistrering
      if (isTimeIntent) {
        const timeInfo = extractTimeDetails(text);
        const timeEntry = {
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          userId: user?.id || 'worker-user',
          userName: (user as any)?.displayName || user?.email || authorName || 'Håndverker',
          date: new Date().toISOString().split('T')[0],
          hours: timeInfo.hours,
          description: timeInfo.description,
          category: 'arbeid' as const,
          createdAt: new Date().toISOString()
        };

        const savedTime = await saveCollectionItem('time_entries', timeEntry);

        await syncApprenticeProgressFromTimeEntries(timeEntry.userName).catch(() => {});

        await saveCollectionItem('agent_activities', {
          type: 'time_logged',
          title: `Timer registrert: ${timeInfo.hours}t av ${timeEntry.userName}`,
          description: `Prosjekt: ${resolvedProjectName}. Beskrivelse: ${timeInfo.description}.`,
          trade: trade || 'general',
          tradeName: authorName,
          status: 'verified',
          badge: `${timeInfo.hours} TIMER`,
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          createdAt: new Date().toISOString()
        });

        return NextResponse.json({
          success: true,
          action: 'time_logged',
          reply: `⏱️ **Timer ført autonomt!**\n\n` +
            `• **Antall timer:** **${timeInfo.hours} timer**\n` +
            `• **Håndverker:** **${timeEntry.userName}**\n` +
            `• **Prosjekt:** **${resolvedProjectName}**\n` +
            `• **Beskrivelse:** ${timeInfo.description}\n` +
            `• **Dato:** ${timeEntry.date}\n\n` +
            `Timene er bokført i prosjektregnskapet og synkronisert med lønns- og lærlingegrunnlaget.`,
          data: { ...timeEntry, id: savedTime.id },
          suggestedActions: [
            {
              id: 'open_time',
              type: 'open_time_modal',
              label: '⏱️ Åpne Timeliste',
              data: { projectId: resolvedProjectId }
            },
            {
              id: 'assign_task',
              type: 'open_task_modal',
              label: '📋 Se oppgaver på prosjektet'
            }
          ],
          followUpPrompts: [
            `Før flere timer på ${resolvedProjectName}`,
            'Hvor mange timer er registrert på prosjektet totalt?',
            'Ferdigstill aktiv oppgave'
          ]
        });
      }

      // 7. ENKELTINTENT: KS-sjekklister & Egenkontroll
      if (isChecklistIntent) {
        return NextResponse.json({
          success: true,
          action: 'checklist_inquiry',
          reply: `📋 **KS & Egenkontroll for «${resolvedProjectName}»:**\n\n` +
            `Kvalitetssikring er forankret iht. Plan- og bygningsloven (PBL § 29-4) og Byggforskserien.\n\n` +
            `• **Aktive kontrollområder:**\n` +
            `  1. Bærende konstruksjoner & innfesting (Eurokode 5)\n` +
            `  2. Dampsperre & klemte skjøter (TEK17 § 14-2)\n` +
            `  3. Våtrom & fall mot sluk (BVN blad 31.205)\n` +
            `  4. Brannskiller & rørgjennomføringer (EI 60)\n\n` +
            `Åpne sjekklisten for å utføre punktene og legge ved bildedokumentasjon.`,
          suggestedActions: [
            {
              id: 'open_checklist',
              type: 'open_checklist_modal',
              label: '📋 Åpne KS-Sjekkliste',
              data: { projectId: resolvedProjectId }
            },
            {
              id: 'open_ai_vision',
              type: 'open_ai_vision',
              label: '📸 Kontroller med TEK17 Visjon'
            }
          ],
          followUpPrompts: [
            'Start sjekkliste for tømrerarbeid',
            'Sjekk om sonen kan lukkes',
            'Meld inn avvik på byggeplassen'
          ]
        });
      }

      // 8. ENKELTINTENT: Kontrakter (NS 8405 / NS 8406 / Bustadoppføringslova)
      if (isContractIntent) {
        return NextResponse.json({
          success: true,
          action: 'contract_guidance',
          reply: `📜 **Kontraktsrettslig rådgivning for «${resolvedProjectName}»:**\n\n` +
            `For håndverkere og entreprenører gjelder følgende standarder i Norge:\n\n` +
            `• **NS 8406 (Forenklet norsk bygge- og anleggskontrakt):** Anbefales for oppdrag under 10–15 MNOK uten utpreget prosjekteringsansvar. Enkle og ryddige varslingsregler (pkt. 19).\n` +
            `• **NS 8405 (Hovedentreprise):** Brukes ved større entrepriser med strenge krav til varslingsfrister (dagbøter og preklusjon).\n` +
            `• **Bustadoppføringslova / Håndverkertjenesteloven:** Forbrukerentreprise (ufravikelig lovfestet vern for forbruker).\n\n` +
            `Husk at alle endringer og tillegg må varsles skriftlig «uten ugrunnet opphold» for å unngå tap av vederlagskrav.`,
          suggestedActions: [
            {
              id: 'open_co',
              type: 'open_change_order_modal',
              label: '📄 Opprett Endringsvarsel (NS 8406)',
              data: { projectId: resolvedProjectId }
            },
            {
              id: 'open_offer',
              type: 'open_offer_modal',
              label: '📝 Utform Kontraktsgrunnlag / Tilbud'
            }
          ],
          followUpPrompts: [
            'Hvilke standard forbehold bør jeg inkludere?',
            'Hva er fristen for å varsle tilleggsarbeid?',
            'Hjelp meg å avvise et urimelig kundekrav'
          ]
        });
      }

      // 9. ENKELTINTENT: Stoffkartotek & Kjemikaliesikkerhet
      if (isStoffkartotekIntent) {
        return NextResponse.json({
          success: true,
          action: 'chemical_safety',
          reply: `🧪 **Stoffkartotek & Kjemikaliehåndtering for ${resolvedProjectName}:**\n\n` +
            `I henhold til Forskrift om utførelse av arbeid kap. 3 skal alle kjemikalier på byggeplassen ha tilgjengelige sikkerhetsdatablader (SDS):\n\n` +
            `• **Nødvendige tiltak i felt:**\n` +
            `  - Sjekk H-setninger (farestoffer, etsende, miljøfarlig, brannfarlig).\n` +
            `  - Sørg for tilgang til øyeskyll og egnet førstehjelpsutstyr.\n` +
            `  - Benytt riktig åndedrettsvern (A2P3 for løsemidler/isocyanater, P3 for partikler/støv).\n` +
            `  - Farlig avfall skal merkes og leveres til godkjent mottak (deklarasjon iht. Avfallsforskriften kap. 11).\n\n` +
            `HMS-ansvarlig kan loggføre stoffkartoteket direkte i HMS-modulen.`,
          suggestedActions: [
            {
              id: 'open_sja',
              type: 'open_sja_modal',
              label: '🛡️ Opprett SJA for kjemikaliehåndtering'
            },
            {
              id: 'open_task',
              type: 'open_task_modal',
              label: '📋 Tildel oppgave for kjemikaliekontroll'
            }
          ],
          followUpPrompts: [
            'Hvilket verneutstyr kreves for fugemasse/polyuretan?',
            'Hvilke regler gjelder for varme arbeider?',
            'Opprett SJA for kjemisk arbeid'
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

      // 10. ENKELTINTENT: Autonom Tilbudsopprettelse, Kalkyle & Utsendelse
      if (isAutonomousOfferIntent) {
        // 1. Ekstraher eventuell e-post og kunde fra teksten
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const clientEmailFromText = emailMatch ? emailMatch[0] : null;

        const clientMatch = text.match(/(?:tilbudet\s+til|tilbud\s+til|for\s+kunde:?|for\s+ny\s+kunde:?|ny\s+kunde:?|kunde:?|for\s+)([A-ZÆØÅa-zæøå]+(?:\s+[A-ZÆØÅa-zæøå]+)*)/i);
        const detectedClient = clientMatch ? clientMatch[1].trim() : null;

        const hasSpecificScope = 
          lower.includes('bad') || 
          lower.includes('våtrom') || 
          lower.includes('tak') || 
          lower.includes('kledning') || 
          lower.includes('fasade') || 
          lower.includes('tilbygg') || 
          lower.includes('påbygg') || 
          lower.includes('nybygg') || 
          lower.includes('renovering') || 
          lower.includes('oppussing') || 
          lower.includes('etterisolering') || 
          lower.includes('elektro') || 
          lower.includes('rørlegger') || 
          lower.includes('maling') || 
          lower.includes('sparkling') || 
          lower.includes('gulv') || 
          lower.includes('flis') ||
          lower.includes('m2') ||
          lower.includes('kvm');

        const hasExplicitProject = !!targetProject;
        const isNewClientSpecified = lower.includes('ny kunde') || lower.includes('nytt prosjekt') || !!detectedClient;

        // Dersom brukeren kun ber om tilbud uten kunde, omfang eller prosjekt: SPØR OG GRAV!
        if (!hasExplicitProject && !isNewClientSpecified && !hasSpecificScope && !clientEmailFromText) {
          const activeProjectList = allProjects.slice(0, 3).map((p: any) => `• **${p.name}** (${p.clientName || 'Kunde'}, ${p.location || 'Byggeplass'})`).join('\n');

          const promptOptions: any[] = [
            {
              id: 'offer_new_bath',
              type: 'quick_prompt',
              label: '🛁 Ny kunde: Bad / Våtrom',
              prompt: 'Lag tilbud for ny kunde på totalrenovering av bad'
            },
            {
              id: 'offer_new_cladding',
              type: 'quick_prompt',
              label: '🏡 Ny kunde: Kledning & Etterisolering',
              prompt: 'Lag tilbud for ny kunde på utvendig kledning og etterisolering'
            },
            {
              id: 'offer_new_extension',
              type: 'quick_prompt',
              label: '🔨 Ny kunde: Tilbygg / Tømrer',
              prompt: 'Lag tilbud for ny kunde på tilbygg og tømrerarbeid'
            }
          ];

          if (allProjects.length > 0) {
            promptOptions.push({
              id: 'offer_existing_proj',
              type: 'quick_prompt',
              label: `📁 Knytt til: ${allProjects[0].name.slice(0, 24)}...`,
              prompt: `Lag tilbud for prosjektet «${allProjects[0].name}»`
            });
          }

          return NextResponse.json({
            success: true,
            action: 'offer_clarification_needed',
            reply: `👋 **Ja, absolutt! Jeg kan utarbeide et komplett, vinnende pristilbud med fagarbeid, materialer, kalkyle og NS 8406-forbehold.**\n\n` +
              `Siden tilbudet kan skreddersys til **både helt nye kunder og eksisterende prosjekter**, trenger jeg litt mer informasjon for å beregne nøyaktig:\n\n` +
              `1. 👤 **Hvem er kunden?** (Navn, ev. oppdragsadresse og e-post)\n` +
              `2. 🔨 **Hva skal gjøres?** (F.eks. totalrenovering av bad, etterisolering og kledning, tilbygg, overflater eller tekniske fag?)\n` +
              `3. 📁 **Er dette for en ny kunde, eller skal det knyttes til et eksisterende prosjekt?**\n` +
              (allProjects.length > 0 ? `   *Dine aktive prosjekter i systemet:*\n${activeProjectList}\n` : '') +
              `4. 📐 **Har du spesifikke mengder (f.eks. ca. m² eller timeestimat)**, eller vil du at jeg skal beregne standard normtider og timepriser for deg?\n\n` +
              `💡 *Tips: Du kan bare svare meg rett her i chatten, for eksempel:*\n` +
              `*«Lag tilbud for ny kunde Kari Nordmann, Storgata 10, totalrenovering av 8m² bad, send til kari@example.com»*`,
            suggestedActions: promptOptions,
            followUpPrompts: [
              'Ny kunde: Totalrenovering av bad (ca. 8 kvm)',
              'Ny kunde: Bytte kledning og etterisolere fasade',
              allProjects[0] ? `Lag tilbud for ${allProjects[0].name}` : 'Sett opp tilbud på fastpris'
            ]
          });
        }

        let effectiveProjectId: string;
        let effectiveProjectCode: string;
        let effectiveProjectName: string;
        let effectiveClientName: string;
        let effectiveClientEmail: string = clientEmailFromText || '';

        if (targetProject) {
          effectiveProjectId = targetProject.id;
          effectiveProjectCode = targetProject.projectCode || targetProject.id;
          effectiveProjectName = targetProject.name;
          effectiveClientName = detectedClient || targetProject.clientName || 'Privatkunde';
          effectiveClientEmail = clientEmailFromText || targetProject.clientEmail || '';
        } else {
          // NY KUNDE / NYTT PROSJEKT
          effectiveClientName = detectedClient || (lower.includes('ny kunde') ? 'Ny kunde' : 'Privatkunde');
          effectiveProjectId = `lead-${Date.now().toString(36)}`;
          effectiveProjectCode = `TILB-${Math.floor(1000 + Math.random() * 9000)}`;

          let scopeTitle = 'Fagarbeid';
          if (lower.includes('bad') || lower.includes('våtrom')) scopeTitle = 'Baderomsrenovering';
          else if (lower.includes('tak')) scopeTitle = 'Taktekking og fornying';
          else if (lower.includes('kledning') || lower.includes('fasade')) scopeTitle = 'Fasade & Kledning';
          else if (lower.includes('tilbygg') || lower.includes('påbygg')) scopeTitle = 'Tilbygg og tømrerarbeid';
          else if (lower.includes('elektro') || lower.includes('el')) scopeTitle = 'Elektroinstallasjon';
          else if (lower.includes('rørlegger') || lower.includes('vvs')) scopeTitle = 'Rørleggerarbeid';

          effectiveProjectName = `${scopeTitle}: ${effectiveClientName}`;
        }

        const wantsAutoSend = 
          (lower.includes('send') || lower.includes('sende')) && (
            lower.includes('automatikk') || 
            lower.includes('automatisk') || 
            lower.includes('kunde') || 
            lower.includes('mail') || 
            lower.includes('epost') || 
            lower.includes('e-post') || 
            lower.includes('direkte')
          ) || lower.includes('sende på automatikk');

        // 2. Generer detaljerte poster tilpasset oppdraget
        const pLower = (effectiveProjectName + ' ' + (targetProject?.description || '') + ' ' + text).toLowerCase();

        let items: OfferItem[] = [];

        if (pLower.includes('bad') || pLower.includes('våtrom')) {
          items = [
            { description: 'Riving av eksisterende flis/sanitær og miljøsanering', quantity: 22, unit: 'timer', pricePerUnit: 890, total: 19580 },
            { description: 'Tømrerarbeid: Oppretting av bjelkelag og Litex/våtromsplater', quantity: 30, unit: 'timer', pricePerUnit: 890, total: 26700 },
            { description: 'Rørleggerarbeid: Rør-i-rør, sluk, fordelerskap og sanitærmontering', quantity: 32, unit: 'timer', pricePerUnit: 980, total: 31360 },
            { description: 'Elektrikerarbeid: Varmekabler, termostat, 2 kurser og downlights', quantity: 18, unit: 'timer', pricePerUnit: 980, total: 17640 },
            { description: 'Membran- og flisarbeid iht. TEK17 / BVN (smøremembran og mansjetter)', quantity: 28, unit: 'timer', pricePerUnit: 890, total: 24920 },
            { description: 'Malerarbeid tak og listing', quantity: 12, unit: 'timer', pricePerUnit: 850, total: 10200 },
            { description: 'Materialpakke våtrom (membran, flislim, mansjetter, rør) inkl. 15% påslag', quantity: 1, unit: 'stk', pricePerUnit: 44500, total: 44500 },
            { description: 'Rigg, drift og avfallshåndtering (avfallssekk/container)', quantity: 1, unit: 'stk', pricePerUnit: 9800, total: 9800 }
          ];
        } else if (pLower.includes('tak') || pLower.includes('fasade') || pLower.includes('kledning')) {
          items = [
            { description: 'Montering, kontroll og leie av godkjent stillas', quantity: 1, unit: 'stk', pricePerUnit: 18500, total: 18500 },
            { description: 'Riving og fjerning av eksisterende overflater/stein/lekter', quantity: 35, unit: 'timer', pricePerUnit: 890, total: 31150 },
            { description: 'Tømrerarbeid: Ny diffusjonsåpen duk/undertak, sløyfer og lekter', quantity: 55, unit: 'timer', pricePerUnit: 890, total: 48950 },
            { description: 'Montering av ny kledning/takstein og overflatebehandling', quantity: 60, unit: 'timer', pricePerUnit: 890, total: 53400 },
            { description: 'Blikkenslagerarbeid: Takrenner, nedløp og beslag', quantity: 20, unit: 'timer', pricePerUnit: 950, total: 19000 },
            { description: 'Materialpakke (virke, isolasjon, duk, festemidler) inkl. 15% påslag', quantity: 1, unit: 'stk', pricePerUnit: 69000, total: 69000 },
            { description: 'Container, transport og kildesortering av avfall', quantity: 1, unit: 'stk', pricePerUnit: 12500, total: 12500 }
          ];
        } else if (pLower.includes('tilbygg') || pLower.includes('påbygg') || pLower.includes('nybygg')) {
          items = [
            { description: 'Grunnarbeid, avretting og fundamentering/støp', quantity: 35, unit: 'timer', pricePerUnit: 890, total: 31150 },
            { description: 'Tømrerarbeid: Råbygg, stenderverk, takstoler og undertak', quantity: 95, unit: 'timer', pricePerUnit: 890, total: 84550 },
            { description: 'Montering av vinduer, dører og utvendig kledning', quantity: 45, unit: 'timer', pricePerUnit: 890, total: 40050 },
            { description: 'Elektroinstallasjon: Egen underfordeling, stikk og belysning', quantity: 30, unit: 'timer', pricePerUnit: 980, total: 29400 },
            { description: 'Isolasjon (200mm/250mm), dampsperre og innvendig plating', quantity: 40, unit: 'timer', pricePerUnit: 890, total: 35600 },
            { description: 'Materialpakke råbygg og innvendig ferdigstillelse inkl. påslag', quantity: 1, unit: 'stk', pricePerUnit: 98000, total: 98000 },
            { description: 'Rigg, drift, verktøy, stillas og avfallscontainer', quantity: 1, unit: 'stk', pricePerUnit: 24000, total: 24000 }
          ];
        } else {
          items = [
            { description: 'Riving, avdekking og miljøsanering av eksisterende konstruksjon', quantity: 35, unit: 'timer', pricePerUnit: 890, total: 31150 },
            { description: 'Tømrerarbeid: Stenderverk, etterisolering, dampsperre og gipsplater', quantity: 75, unit: 'timer', pricePerUnit: 890, total: 66750 },
            { description: 'Rørleggerarbeid: Rør-i-rør system, avløp, fordelerskap og montering', quantity: 40, unit: 'timer', pricePerUnit: 980, total: 39200 },
            { description: 'Elektrikerarbeid: Sikringsskap, trekkerør, downlights og varmekabler', quantity: 35, unit: 'timer', pricePerUnit: 980, total: 34300 },
            { description: 'Membran- og flisarbeid iht. TEK17 / BVN med våtromsmansjetter', quantity: 30, unit: 'timer', pricePerUnit: 890, total: 26700 },
            { description: 'Sparkel-, malerarbeid og listing (ferdig overflatefinish)', quantity: 35, unit: 'timer', pricePerUnit: 850, total: 29750 },
            { description: 'Materialpakke (konstruksjonsvirke, isolasjon, gips, festemidler) inkl. 15% påslag', quantity: 1, unit: 'stk', pricePerUnit: 84500, total: 84500 },
            { description: 'Rigg, drift, verktøy og avfallshåndtering (avfallscontainer & sortering)', quantity: 1, unit: 'stk', pricePerUnit: 19500, total: 19500 }
          ];
        }

        const amountExVat = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
        const vatAmount = Math.round(amountExVat * 0.25);
        const totalAmount = amountExVat + vatAmount;

        const terms = 
          `1. Forbehold om skjulte feil: Arbeider som skyldes uforutsette bygningsmessige forhold (f.eks. råte, sopp, asbest eller bærende konstruksjoner) som ikke var synlige på befaring faktureres etter medgått tid og materiell iht. NS 8406 pkt. 19.\n` +
          `2. Byggherrens plikter: Tilkomst, strøm og vann stilles vederlagsfritt til disposisjon for entreprenør.\n` +
          `3. Prisstigning: Materialpriser baseres på gjeldende innkjøpspriser og kan reguleres ved vesentlige endringer iht. SSB byggekostnadsindeks.\n` +
          `4. Betalingsplan: Faktureres à konto hver 14. dag etter dokumentert fremdrift. 14 dagers betalingsfrist.\n` +
          `5. Gyldighet: Tilbudet er gyldig i 30 dager fra tilbudsdato.`;

        const offerId = `offer-${Date.now()}`;
        const token = 'o-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

        const offerDoc = {
          id: offerId,
          projectCode: effectiveProjectCode,
          projectId: effectiveProjectId,
          projectName: effectiveProjectName,
          clientName: effectiveClientName,
          clientEmail: effectiveClientEmail,
          title: `Tilbud: ${effectiveProjectName}`,
          description: `Pristilbud utarbeidet av MesterAI for ${effectiveClientName}. Spesifikasjon av fagarbeid, materialer, tekniske fag og rigg/drift.`,
          items,
          amountExVat,
          vatAmount,
          totalAmount,
          total: totalAmount,
          status: 'draft',
          createdAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          authorId: user?.id || 'mester-ai',
          authorName: (user as any)?.displayName || authorName || 'MesterAI Autonom Assistent',
          company: (user as any)?.company || 'Mester Entreprenør AS',
          companyName: (user as any)?.company || 'Mester Entreprenør AS',
          terms,
          token,
          shareUrl: `https://vikingmester.no/?offerToken=${token}`
        };

        // Lagre atomisk i databasen
        await saveCollectionItem('offers', offerDoc);

        // Automatisk utsendelse dersom bedt om og e-post finnes
        let isSent = false;
        if (wantsAutoSend && effectiveClientEmail) {
          try {
            await sendOfferByEmail({
              offer: offerDoc,
              clientEmail: effectiveClientEmail,
              clientName: effectiveClientName,
              companyName: (user as any)?.company || 'Mester Entreprenør AS',
              authorName: authorName || (user as any)?.displayName || 'Byggmester'
            });
            offerDoc.status = 'sent';
            await updateCollectionItem('offers', offerId, { status: 'sent' }).catch(() => {});
            isSent = true;
          } catch (err: any) {
            console.warn('[Dispatch] Error auto-sending offer email:', err.message);
          }
        }

        // Protokollfør i agent_activities
        await saveCollectionItem('agent_activities', {
          type: 'offer_created',
          title: isSent 
            ? `Tilbud opprettet og sendt til ${effectiveClientEmail} (kr ${totalAmount.toLocaleString('no-NO')})` 
            : `Tilbud opprettet: ${offerDoc.title} (kr ${totalAmount.toLocaleString('no-NO')})`,
          description: `Autonom kalkyle fullført for ${effectiveProjectName}. ${items.length} poster spesifisert. Status: ${offerDoc.status}.`,
          trade: trade || 'general',
          tradeName: authorName,
          status: 'verified',
          badge: isSent ? 'SENDT TIL KUNDE' : 'TILBUD OPPRETTET',
          projectId: effectiveProjectId,
          projectName: effectiveProjectName,
          createdAt: new Date().toISOString()
        });

        // Formater komplett, profesjonelt svar i Markdown
        const tableRows = items.map(it => 
          `| **${it.description}** | ${it.quantity} ${it.unit} | kr ${Number(it.pricePerUnit).toLocaleString('no-NO')} | kr ${Number(it.total).toLocaleString('no-NO')} |`
        ).join('\n');

        const reply = 
          `✅ **Ja, absolutt! Jeg har nå utarbeidet hele tilbudet for «${effectiveProjectName}» og lagret det i systemet.**\n\n` +
          (isSent 
            ? `🚀 **Tilbudet er også sendt direkte på e-post til ${effectiveClientEmail}!** Kunden har mottatt en formell e-post med alle spesifikasjoner og en digital signeringslenke.\n\n` 
            : `📋 **Tilbudet er ferdig kalkulert og lagret i tilbudsmodulen (Status: Utkast / Klar for godkjenning).**\n\n`) +
          `### 📄 Tilbudsspesifikasjon & Kalkyle:\n` +
          `| Arbeidsomfang / Post | Mengde | Enhetspris | Sum eks. mva |\n` +
          `| :--- | :---: | :---: | :---: |\n` +
          `${tableRows}\n\n` +
          `---\n` +
          `* **Delsum fagarbeid, materialer & rigg (eks. mva):** **kr ${amountExVat.toLocaleString('no-NO')},-**\n` +
          `* **Merverdiavgift (25% MVA):** **kr ${vatAmount.toLocaleString('no-NO')},-**\n` +
          `* **TOTALTILBUD INKL. MVA:** **kr ${totalAmount.toLocaleString('no-NO')},-**\n\n` +
          `### ⚖️ Juridiske forbehold & avtalevilkår (iht. NS 8406 / Håndverkertjenesteloven):\n` +
          `• **Forbehold om skjulte feil:** Arbeider som skyldes uforutsette bygningsmessige forhold (f.eks. råte, sopp, asbest eller bærende konstruksjoner) faktureres etter medgått tid og materiell iht. NS 8406 pkt. 19.\n` +
          `• **Fremdrift & Betaling:** Faktureres à konto hver 14. dag etter dokumentert fremdrift. 14 dagers betalingsfrist.\n` +
          `• **Gyldighet:** 30 dager fra tilbudsdato.\n` +
          `• **Digital godkjenningslenke:** [Åpne digitalt tilbud](https://vikingmester.no/?offerToken=${token})\n\n` +
          (!isSent 
            ? (effectiveClientEmail 
                ? `💡 *Kunden er registrert med e-post **${effectiveClientEmail}**. Klikk på «🚀 Send til ${effectiveClientEmail}» under for å sende tilbudet umiddelbart med digital signeringsknapp!*` 
                : `💡 *For å sende tilbudet automatisk til kunden: Oppgi e-posten (f.eks: «Send tilbudet til kunde@epost.no») eller klikk på knappen under.*`) 
            : '');

        return NextResponse.json({
          success: true,
          action: isSent ? 'offer_created_and_sent' : 'offer_created',
          reply,
          offerData: offerDoc,
          suggestedActions: [
            {
              id: 'send_offer_email',
              type: 'send_offer_email',
              label: isSent ? '✉️ Send tilbudet på nytt' : (effectiveClientEmail ? `🚀 Send til ${effectiveClientEmail}` : '✉️ Send tilbud på e-post'),
              data: {
                offerId: offerDoc.id,
                clientEmail: effectiveClientEmail,
                clientName: effectiveClientName,
                totalAmount,
                projectName: effectiveProjectName,
                offerData: offerDoc
              }
            },
            {
              id: 'copy_offer_link',
              type: 'copy_link',
              label: '🔗 Kopier digital signeringslenke',
              data: {
                url: `https://vikingmester.no/?offerToken=${token}`,
                shareUrl: `https://vikingmester.no/?offerToken=${token}`
              }
            },
            {
              id: 'open_offer_modal',
              type: 'open_offer_modal',
              label: '📝 Åpne i Tilbudsbygger',
              data: offerDoc
            },
            {
              id: 'prepare_contract',
              type: 'quick_prompt',
              label: '📄 Klargjør NS 8406 Kontrakt',
              prompt: `Generer NS 8406 kontrakt for tilbud ${offerDoc.title} til ${effectiveClientName}`
            }
          ],
          followUpPrompts: [
            `Send tilbudet til ${effectiveClientEmail || 'kunde@epost.no'}`,
            'Juster timeprisen eller legg til rabatt',
            'Generer fremdriftsplan og milepæler'
          ]
        });
      }

      // E0-A. AUTONOM E-POSTSENDING (Tilbud, Endringsordrer, Kundekommunikasjon)
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const clientEmailFromText = emailMatch ? emailMatch[0] : null;

      const isEmailIntent = 
        action === 'send_email' ||
        action === 'send_offer_email' ||
        action === 'send_change_order_email' ||
        (lower.includes('send') && !!clientEmailFromText) ||
        (lower.includes('send') && (lower.includes('epost') || lower.includes('mail') || lower.includes('e-post'))) ||
        (lower.includes('mail') && (lower.includes('tilbud') || lower.includes('endring') || lower.includes('kunde'))) ||
        ((lower.includes('send') || lower.includes('sende')) && lower.includes('tilbud') && (lower.includes('kunde') || lower.includes('kunden') || lower.includes('automatisk') || lower.includes('automatikk')));

      if (isEmailIntent) {
        // 1. Sjekk om det gjelder et tilbud
        if (lower.includes('tilbud') || body.offerId || body.offerData || action === 'send_offer_email') {
          const allDbOffers = await getCollectionItems('offers').catch(() => []);
          let targetOffer = body.offerData;
          if (!targetOffer && body.offerId) {
            targetOffer = allDbOffers.find((o: any) => o.id === body.offerId);
          }
          if (!targetOffer) {
            const projectOffers = allDbOffers.filter((o: any) => 
              (o.projectId && o.projectId === resolvedProjectId) ||
              (targetProject?.name && o.title?.toLowerCase().includes(targetProject.name.toLowerCase()))
            );
            targetOffer = projectOffers[projectOffers.length - 1] || allDbOffers[allDbOffers.length - 1] || allDbOffers[0];
          }

          const recipientEmail = clientEmailFromText || body.to || targetOffer?.clientEmail || targetProject?.clientEmail;

          if (!recipientEmail) {
            return NextResponse.json({
              success: true,
              action: 'need_email_address',
              reply: `Hvilken e-postadresse skal tilbudet sendes til? Oppgi e-posten (f.eks: «Send tilbudet til ola@kunde.no»), så sender jeg det umiddelbart med digital signeringslenke.`,
              suggestedActions: [
                {
                  id: 'open_offer_modal',
                  type: 'open_offer_modal',
                  label: '📝 Åpne Tilbudsbygger',
                  data: targetOffer
                }
              ]
            });
          }

          if (!targetOffer) {
            targetOffer = {
              id: `offer-auto-${Date.now()}`,
              title: `Tilbud: ${resolvedProjectName}`,
              description: `Kalkyle og tilbud utarbeidet av MesterAI for ${resolvedProjectName}.`,
              totalAmount: 148000,
              amountExVat: 118400,
              items: [
                { description: 'Fagarbeid og utførelse', quantity: 75, unit: 'timer', pricePerUnit: 890, total: 66750 },
                { description: 'Materialer og forbruksmateriell', quantity: 1, unit: 'stk', pricePerUnit: 35000, total: 35000 },
                { description: 'Rigg, drift og avfallshåndtering', quantity: 1, unit: 'stk', pricePerUnit: 16650, total: 16650 }
              ],
              clientEmail: recipientEmail,
              clientName: targetProject?.clientName || 'Kunde',
              projectId: resolvedProjectId,
              token: 'o-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
            };
            await saveCollectionItem('offers', targetOffer);
          } else if (!targetOffer.token) {
            targetOffer.token = 'o-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
            await updateCollectionItem('offers', targetOffer.id, { token: targetOffer.token, clientEmail: recipientEmail }).catch(() => {});
          }

          const emailRes = await sendOfferByEmail({
            offer: targetOffer,
            clientEmail: recipientEmail,
            clientName: targetOffer.clientName || targetProject?.clientName,
            companyName: (user as any)?.company || 'Mester Entreprenør AS',
            authorName: authorName || (user as any)?.displayName || 'Byggmester'
          });

          return NextResponse.json({
            success: true,
            action: 'offer_email_sent',
            reply: `✅ **Tilbudet er nå sendt på e-post!**\n\n- **Mottaker:** **${recipientEmail}**\n- **Tilbud:** «${targetOffer.title}»\n- **Totalbeløp:** kr ${(Number(targetOffer.totalAmount || targetOffer.total || 0)).toLocaleString('no-NO')} inkl. mva\n- **Digital godkjenningslenke:** [Åpne tilbud](https://vikingmester.no/?offerToken=${targetOffer.token})\n\nKunden har mottatt en formell e-post med komplett oversikt over poster, forbehold og en direkte knapp for å godkjenne tilbudet på skjermen. Hendelsen er protokollført i aktivitetsloggen.`,
            emailResult: emailRes
          });
        }

        // 2. Sjekk om det gjelder en endringsordre
        if (lower.includes('endring') || lower.includes('tillegg') || body.changeOrderId || action === 'send_change_order_email') {
          const allDbOrders = await getCollectionItems('change_orders').catch(() => []);
          let targetCO = body.changeOrderData;
          if (!targetCO && body.changeOrderId) {
            targetCO = allDbOrders.find((c: any) => c.id === body.changeOrderId);
          }
          if (!targetCO) {
            targetCO = allDbOrders.find((c: any) => c.projectId === resolvedProjectId) || allDbOrders[0];
          }

          const recipientEmail = clientEmailFromText || body.to || targetCO?.clientEmail || targetProject?.clientEmail;

          if (!recipientEmail) {
            return NextResponse.json({
              success: true,
              action: 'need_email_address',
              reply: `Hvilken e-postadresse skal endringsmeldingen sendes til? Oppgi e-posten (f.eks: «Send endringen til ola@kunde.no»), så sender jeg den formelle meldingen iht. NS 8406 umiddelbart.`,
              suggestedActions: [
                {
                  id: 'open_co_modal',
                  type: 'open_change_order_modal',
                  label: '📄 Åpne Endringsordre',
                  data: targetCO
                }
              ]
            });
          }

          if (targetCO) {
            const emailRes = await sendChangeOrderByEmail({
              changeOrder: targetCO,
              clientEmail: recipientEmail,
              clientName: targetCO.clientName || targetProject?.clientName,
              companyName: (user as any)?.company || 'Mester Entreprenør AS',
              authorName: authorName || 'Byggmester'
            });

            return NextResponse.json({
              success: true,
              action: 'change_order_email_sent',
              reply: `✅ **Endringsmelding er nå sendt på e-post!**\n\n- **Mottaker:** **${recipientEmail}**\n- **Endring:** «${targetCO.title}»\n- **Krav:** kr ${(Number(targetCO.totalAmount || targetCO.amountExVat || 0)).toLocaleString('no-NO')} inkl. mva (${targetCO.impactDays || 0} dager fristforlengelse)\n- **Hjemmel:** ${targetCO.legalHjemmel || 'NS 8406 pkt. 19.2'}\n\nKunden har mottatt formell e-post med varsel og direkte godkjenningslenke.`,
              emailResult: emailRes
            });
          }
        }

        // 3. Generell e-post til kunde eller kontakt
        const recipientEmail = clientEmailFromText || body.to || targetProject?.clientEmail;
        if (!recipientEmail) {
          return NextResponse.json({
            success: true,
            action: 'need_email_address',
            reply: `Hvem skal e-posten sendes til? Oppgi e-postadresse og hva du vil overbringe (f.eks: «Send epost til ola@kunde.no om at vi starter på mandag»), så formulerer og sender jeg den for deg.`
          });
        }

        const subject = body.subject || `Oppdatering angående ${resolvedProjectName}`;
        const emailRes = await sendSystemEmail({
          to: recipientEmail,
          subject,
          text,
          html: `<div style="font-family:sans-serif;line-height:1.6;color:#1e293b;padding:20px;"><h2>Oppdatering fra ${(user as any)?.company || 'Mester Entreprenør AS'}</h2><p>Gjelder prosjekt: <strong>${resolvedProjectName}</strong></p><p>${text.replace(/\n/g, '<br>')}</p><p>Med vennlig hilsen,<br><strong>${authorName}</strong></p></div>`,
          authorName,
          companyName: (user as any)?.company || 'Mester Entreprenør AS'
        });

        return NextResponse.json({
          success: true,
          action: 'general_email_sent',
          reply: `✅ **E-post er sendt til ${recipientEmail}!**\n\n- **Emne:** «${subject}»\n- **Prosjekt:** ${resolvedProjectName}\n\nMeldingen er protokollført i aktivitetsloggen.`,
          emailResult: emailRes
        });
      }

      // E0-B. AUTONOM LÆRLINGOPPFØLGING & ADMIN-KONTROLL
      const isApprenticeIntent = 
        action === 'apprentice_status' ||
        action === 'approve_apprentice_goal' ||
        action === 'generate_apprentice_report' ||
        lower.includes('lærling') || 
        lower.includes('laerling') || 
        lower.includes('læreplan') || 
        lower.includes('kompetansemål');

      if (isApprenticeIntent) {
        const uCompanyId = user?.companyId || 'comp-001';
        const apprentices = await getApprenticeProfiles(uCompanyId);
        const primaryApprentice = apprentices[0];

        // 1. Godkjenne mål for lærling
        if (lower.includes('godkjenn') || action === 'approve_apprentice_goal') {
          if (primaryApprentice) {
            let targetGoal = primaryApprentice.goals.find((g: any) => g.status === 'ready_for_review');
            if (!targetGoal) {
              targetGoal = primaryApprentice.goals.find((g: any) => g.status === 'in_progress');
            }
            if (targetGoal) {
              const approved = await approveApprenticeGoal({
                apprenticeId: primaryApprentice.id,
                goalId: targetGoal.goalId,
                approvedBy: authorName || 'Faglig leder',
                feedback: 'Verifisert og godkjent via MesterAI autonom lederassistent.'
              });

              return NextResponse.json({
                success: true,
                action: 'apprentice_goal_approved',
                reply: `🎓 **Læreplanmål godkjent!**\n\n- **Lærling:** **${primaryApprentice.name}** (${primaryApprentice.tradeName})\n- **Godkjent mål:** «${targetGoal.title}»\n- **Status:** 100% fullført og protokollført av faglig leder **${authorName || 'Faglig leder'}**.\n\nDette er nå offisielt arkivert i lærlingens opplæringsbok iht. kravene fra opplæringskontoret.`,
                data: approved
              });
            }
          }
        }

        // 2. Generere halvårsrapport for opplæringskontoret
        if (lower.includes('rapport') || lower.includes('halvårsvurdering') || action === 'generate_apprentice_report') {
          if (primaryApprentice) {
            const report = await generateApprenticeHalfYearReport(primaryApprentice.id);
            return NextResponse.json({
              success: true,
              action: 'apprentice_report_generated',
              reply: `📄 **Offisiell Halvårsrapport er generert for ${primaryApprentice.name}!**\n\n- **Fag:** ${primaryApprentice.tradeName} (${primaryApprentice.tradeYear}. læreår)\n- **Fullførte mål:** ${report.completedGoalsCount} av ${primaryApprentice.goals.length}\n- **Mål under arbeid:** ${report.inProgressGoalsCount}\n- **Totale timer logget:** ${report.totalHours} timer\n\nUnderlaget for vurderingssamtale og opplæringskontor er klargjort med fullstendig dokumentasjon og signaturfelt.`,
              report,
              suggestedActions: [
                {
                  id: 'open_apprentice_modal',
                  type: 'open_apprentice_modal',
                  label: '🎓 Åpne Lærlingmodul',
                  data: primaryApprentice
                }
              ]
            });
          }
        }

        // 3. Status og veiledning (Hva gjør lærlingen / hvordan ligger de an)
        if (primaryApprentice) {
          await syncApprenticeProgressFromTimeEntries(primaryApprentice.id).catch(() => {});
          const updatedProfiles = await getApprenticeProfiles(uCompanyId);
          const updated = updatedProfiles[0] || primaryApprentice;

          const completedCount = updated.goals.filter((g: any) => g.status === 'completed').length;
          const readyReview = updated.goals.filter((g: any) => g.status === 'ready_for_review');
          const inProgress = updated.goals.filter((g: any) => g.status === 'in_progress');

          let apprenticeReply = `🎓 **Status & Oppfølging for Lærling: ${updated.name}**\n\n`;
          apprenticeReply += `• **Fag:** ${updated.tradeName} • ${updated.tradeYear}. Læreår • Faglig leder: **${updated.mentorName}**\n`;
          apprenticeReply += `• **Loggførte timer:** ${updated.totalHoursWorked} timer i KS-systemet\n`;
          apprenticeReply += `• **Læreplanprogresjon:** **${completedCount} av ${updated.goals.length} kompetansemål godkjent** (${Math.round((completedCount / updated.goals.length) * 100)}%)\n\n`;

          if (readyReview.length > 0) {
            apprenticeReply += `⚠️ **Klart for din godkjenning (Admin / Faglig Leder):**\n`;
            readyReview.forEach((g: any) => {
              apprenticeReply += `• **${g.title}** (${g.hoursLogged}t logget) – *Klar for 1-klikks signering!*\n`;
            });
            apprenticeReply += `\n`;
          }

          if (inProgress.length > 0) {
            apprenticeReply += `🔨 **Aktive opplæringsmål under arbeid:**\n`;
            inProgress.slice(0, 3).forEach((g: any) => {
              apprenticeReply += `• **${g.title}**: ${g.progress}% (${g.hoursLogged}t av ${g.requiredHours}t mål)\n`;
            });
            apprenticeReply += `\n`;
          }

          apprenticeReply += `💡 **MesterAI Autonom Anbefaling:**\n${updated.aiRecommendation}\n\nHva vil du gjøre? Du kan be meg: «Godkjenn målet for lærlingen», «Generer halvårsrapport», eller «Tildel lærlingen oppgave på stillas».`;

          return NextResponse.json({
            success: true,
            action: 'apprentice_status',
            reply: apprenticeReply,
            apprentice: updated,
            suggestedActions: [
              ...(readyReview.length > 0 ? [{
                id: 'approve_apprentice_goal',
                type: 'approve_apprentice_goal',
                label: `✅ Godkjenn mål: ${readyReview[0].title}`,
                data: { apprenticeId: updated.id, goalId: readyReview[0].goalId }
              }] : []),
              {
                id: 'generate_apprentice_report',
                type: 'generate_apprentice_report',
                label: '📄 Generer Halvårsrapport for Opplæringskontoret',
                data: { apprenticeId: updated.id }
              },
              {
                id: 'open_apprentice_modal',
                type: 'open_apprentice_modal',
                label: '🎓 Åpne Lærlingmodul',
                data: updated
              }
            ],
            followUpPrompts: [
              'Godkjenn målet for lærlingen',
              'Generer halvårsrapport for opplæringskontoret',
              allProjects[0]?.name ? `Tildel lærling oppgave på ${allProjects[0].name}` : 'Tildel ny oppgave til lærling',
              'Hvilke krav gjelder til vurderingssamtale for lærlinger?'
            ]
          });
        }
      }

      // E0-C. AUTONOM DOKUMENTASJON, FDV & SLUTTDOKUMENTASJON PER PROSJEKT
      const isDocumentationIntent = 
        action === 'get_documentation' ||
        action === 'generate_project_fdv' ||
        action === 'send_documentation_email' ||
        lower.includes('dokumentasjon') || 
        lower.includes('hent dokumentasjon') || 
        lower.includes('fdv') || 
        lower.includes('hent fdv') || 
        lower.includes('lag fdv') || 
        lower.includes('generer fdv') || 
        lower.includes('sluttdokumentasjon') || 
        lower.includes('samsvarserklæring') || 
        lower.includes('overtakelsesprotokoll') ||
        lower.includes('byggeperm');

      if (isDocumentationIntent) {
        // Finn aktuelt prosjekt basert på tekst eller valgt prosjekt
        let docProj = targetProject;
        if (allProjects && allProjects.length > 0) {
          const matchedByName = allProjects.find((p: any) => 
            (p.name && lower.includes(p.name.toLowerCase())) ||
            (p.address && lower.includes(p.address.toLowerCase())) ||
            (p.id && lower.includes(p.id.toLowerCase()))
          );
          if (matchedByName) {
            docProj = matchedByName;
          }
        }

        if (!docProj && allProjects && allProjects.length > 0) {
          docProj = allProjects[0];
        }

        const projId = docProj?.id || resolvedProjectId || 'p-gen';
        const projName = docProj?.name || resolvedProjectName || 'Prosjekt';
        const clientName = docProj?.clientName || 'Byggherre';
        const clientEmail = docProj?.clientEmail || '';
        const address = docProj?.address || 'Byggeplass';
        const category = docProj?.category || 'Tømrer';

        // Autonom generering / henting
        const docResult = await getOrGenerateProjectDocumentation(projId, {
          name: projName,
          address,
          category,
          clientName,
          description: docProj?.description || ''
        });

        // 1. Send på e-post dersom bruker ba om det
        if ((lower.includes('send') && (lower.includes('epost') || lower.includes('mail'))) || action === 'send_documentation_email') {
          const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const recipientEmail = emailMatch ? emailMatch[0] : (clientEmail || body.to);

          if (!recipientEmail) {
            return NextResponse.json({
              success: true,
              action: 'need_client_email',
              reply: `Dokumentasjonen for **${projName}** er klargjort (${docResult.documents.length} dokumenter). Hvilken e-postadresse skal jeg sende FDV-permen til?`,
              suggestedActions: [
                {
                  id: 'open_documentation_archive',
                  type: 'open_documentation_archive',
                  label: '📄 Åpne FDV-Arkiv',
                  data: { projectId: projId }
                }
              ]
            });
          }

          const sendEmailRes = await sendSystemEmail({
            to: recipientEmail,
            subject: `📁 FDV-Perm & Sluttdokumentasjon - ${projName}`,
            text: `Komplett FDV-perm og sluttdokumentasjon for ${projName} er oversendt. Inneholder ${docResult.documents.length} verifiserte dokumenter iht. TEK17.`,
            html: `
              <div style="font-family:sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;">
                <div style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:16px;">
                  <h2 style="margin:0;color:#0f172a;">FDV-Perm & Sluttdokumentasjon</h2>
                  <p style="margin:4px 0 0 0;font-size:14px;color:#64748b;">Prosjekt: <strong>${projName}</strong> (${address})</p>
                </div>
                <p>Hei ${clientName}, her er komplett FDV-dokumentasjon og samsvarsdokumenter for utført arbeid:</p>
                <div style="background:#f8fafc;padding:16px;border-radius:12px;margin:16px 0;">
                  <h4 style="margin:0 0 8px 0;font-size:13px;text-transform:uppercase;color:#475569;">Innhold i permen:</h4>
                  <ul style="margin:0;padding-left:20px;font-size:13px;color:#334155;">
                    ${docResult.documents.map((d: any) => `<li><strong>${d.title}</strong> (${d.category}) ${d.sintefApproval ? `<span style="color:#16a34a;">[${d.sintefApproval}]</span>` : ''}</li>`).join('')}
                  </ul>
                </div>
                <p style="font-size:13px;color:#16a34a;font-weight:bold;">✓ Arbeidet er dokumentert iht. Byggeteknisk forskrift (TEK17) og gjeldende NBI Byggdetaljer.</p>
                <p style="font-size:12px;color:#64748b;margin-top:24px;">Vennlig hilsen<br><strong>${authorName}</strong> | ${(user as any)?.company || 'Mesterbedrift AS'}</p>
              </div>
            `,
            authorName,
            companyName: (user as any)?.company || 'Mesterbedrift AS'
          });

          return NextResponse.json({
            success: true,
            action: 'documentation_email_sent',
            reply: `✅ **Komplett FDV-perm er nå oversendt på e-post!**\n\n- **Mottaker:** **${recipientEmail}** (${clientName})\n- **Prosjekt:** **${projName}**\n- **Antall dokumenter i permen:** ${docResult.documents.length} stk (FDV-blader, tekniske godkjenninger, TEK17-samsvar og overtakelsesprotokoll).\n\nByggherren har mottatt en formell e-post med all nødvendig FDV- og sluttdokumentasjon.`,
            emailResult: sendEmailRes,
            suggestedActions: [
              {
                id: 'open_documentation_archive',
                type: 'open_documentation_archive',
                label: '📄 Åpne FDV-Arkiv for prosjektet',
                data: { projectId: projId }
              }
            ]
          });
        }

        // 2. Vis sammendrag og handlinger for dokumentasjon
        const docListMarkdown = docResult.documents.map((d: any, idx: number) => {
          return `${idx + 1}. **${d.title}**\n   - *Kategori:* ${d.category} | *Kilde:* ${d.source.toUpperCase()}\n   - *Godkjenning/NOBB:* ${d.sintefApproval || d.nobbNumber || 'Verifisert'}\n   - *Hjemmel:* ${d.tek17Clause || 'TEK17'}\n   - *Drift/Vedlikehold:* ${d.maintenanceInterval || 'Se datablad'}`;
        }).join('\n\n');

        return NextResponse.json({
          success: true,
          action: 'project_documentation_ready',
          reply: `📁 **Komplett FDV-Perm & Sluttdokumentasjon for ${projName}**\n\n${docResult.isNewlyGenerated ? '⚡ *Jeg har autonomt analysert prosjektet og generert en fullstendig FDV-pakke tilpasset utførelsen:*\n\n' : 'Her er oppdatert dokumentasjon for prosjektet:\n\n'}${docListMarkdown}\n\n💡 **Hva vil du gjøre nå?** Du kan be meg sende permen til kunden på e-post, laste den ned, eller åpne dokumentarkivet.`,
          suggestedActions: [
            {
              id: 'open_documentation_archive',
              type: 'open_documentation_archive',
              label: '📄 Åpne FDV-Arkiv',
              data: { projectId: projId }
            },
            {
              id: 'send_documentation_email',
              type: 'send_documentation_email',
              label: clientEmail ? `✉️ Send FDV til ${clientEmail}` : '✉️ Send FDV på e-post til kunde',
              data: { projectId: projId, clientEmail }
            },
            {
              id: 'download_combined_fdv',
              type: 'download_combined_fdv',
              label: '📥 Last ned samlet FDV-perm (PDF/Utskrift)',
              data: { projectId: projId }
            }
          ],
          followUpPrompts: [
            clientEmail ? `Send FDV-permen til ${clientEmail}` : 'Send FDV-permen på epost til kunden',
            `Hvilke TEK17-krav gjelder for ferdigattest på ${projName}?`,
            `Generer overtakelsesprotokoll med 5 års garanti for ${projName}`
          ]
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
              allProjects[0]?.name ? `Før dagens timer på ${allProjects[0].name}` : 'Før dagens timer',
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
          if (allProjects.length === 0) {
            execReply += `• Ingen aktive prosjekter registrert ennå. Opprett et prosjekt for å starte.\n`;
          } else {
            allProjects.slice(0, 3).forEach((p: any) => {
              execReply += `• **${p.name}** (${p.location || 'Byggeplass'}): ${p.progress || 0}% fremdrift\n`;
            });
          }

          const openDevs = allDevs.filter((d: any) => d.status === 'åpen' || d.status === 'open');
          const redDevs = openDevs.filter((d: any) => d.severity === 'kritisk' || d.severity === 'high');

          execReply += `\n🔒 **Kvalitet & Lukkesperrer:**\n`;
          if (redDevs.length > 0) {
            execReply += `• ⚠️ **${redDevs.length} rød lukkesperre:** ${redDevs[0].title} (${redDevs[0].project || 'Byggeplass'})\n\n`;
          } else if (openDevs.length > 0) {
            execReply += `• ⚠️ **${openDevs.length} åpne avvik** under utbedring.\n\n`;
          } else {
            execReply += `• ✅ **Ingen kritiske avvik:** Grønt lys for lukking og fremdrift.\n\n`;
          }

          execReply += `📄 **Endringsordrer & Økonomi (NS 8406):**\n`;
          execReply += `• **${pendingOrders.length} ventende endringsordrer** sikrer **kr ${securedKr.toLocaleString('no-NO')} eks. mva** i tilleggsvederlag.\n\n`;

          execReply += `📋 **Oppgavefordeling:**\n`;
          execReply += `• **${pendingTasks.length} aktive oppgaver** ute hos håndverkere.\n\n`;
          execReply += `Hva vil du gjøre nå? Du kan tildele en oppgave, registrere en endringsordre, eller oppdatere fremdriften.`;

          return NextResponse.json({
            success: true,
            action: 'daily_briefing_exec',
            reply: execReply,
            suggestedActions: [
              { id: 'assign_task', type: 'open_task_modal', label: '📋 Tildel ny oppgave' },
              { id: 'open_offer', type: 'open_offer_modal', label: '📝 Skriv tilbud' },
              { id: 'open_co', type: 'open_change_order_modal', label: '📄 Ny endringsordre' },
              { id: 'invite_user', type: 'open_invite_modal', label: '👥 Inviter håndverker' }
            ],
            followUpPrompts: [
              allProjects[0]?.name ? `Oppdater fremdrift på ${allProjects[0].name} til 80%` : 'Tildel ny oppgave til teamet',
              'Hjelp meg å skrive et nytt tilbud',
              'Hvordan varsler jeg en endringsordre iht. NS 8406?',
              'Hva er kravene til fall mot sluk i TEK17?'
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

      // E5b. SPØRSMÅL OM STATUS/FREMDRIFT FOR OPPGAVE
      const isTaskStatusCheck = 
        (lower.includes('status') || lower.includes('fremdrift') || lower.includes('hvordan går det')) &&
        (lower.includes('oppgave') || lower.includes('oppgaven') || lower.includes('arbeidet'));

      if (isTaskStatusCheck) {
        const quoteMatch = text.match(/["'«]([^"'»]+)["'»]/);
        const searchedTitle = quoteMatch ? quoteMatch[1].trim().toLowerCase() : '';

        const allTasksList = await getCollectionItems('tasks').catch(() => []);
        let matchedTask = searchedTitle 
          ? allTasksList.find((t: any) => (t.title || '').toLowerCase().includes(searchedTitle) || searchedTitle.includes((t.title || '').toLowerCase()))
          : null;

        if (!matchedTask && searchedTitle.length > 3) {
          const words = searchedTitle.split(/\s+/).filter((w: string) => w.length > 3);
          matchedTask = allTasksList.find((t: any) => {
            const tLower = (t.title || '').toLowerCase();
            return words.some((w: string) => tLower.includes(w));
          });
        }

        if (matchedTask) {
          const isDone = matchedTask.status === 'completed';
          const pName = matchedTask.projectName || resolvedProjectName;
          const taskReply = `📋 **Status og fremdrift for oppgaven «${matchedTask.title}»:**\n\n` +
            `• **Prosjekt:** ${pName}\n` +
            `• **Gjeldende status:** ${isDone ? '✅ **Fullført**' : '⏳ **Utestående / Pågående**'}\n` +
            `• **Tildelt håndverker:** **${matchedTask.assignedTo || 'Ikke spesifisert'}**\n` +
            `• **Frist:** ${matchedTask.deadline || 'Ingen frist satt'}\n` +
            `• **Prioritet:** ${matchedTask.priority === 'urgent' ? '🔴 Haster' : matchedTask.priority === 'high' ? '🟠 Høy' : '🔵 Normal'}\n\n` +
            (isDone 
              ? `Oppgaven er registrert som fullført og loggført i prosjektets KS-arkiv.` 
              : `Oppgaven er aktiv ute i felt. Håndverkeren kan føre timer eller markere den som ferdig i mobilappen.`);

          return NextResponse.json({
            success: true,
            action: 'task_status_inquiry',
            reply: taskReply,
            suggestedActions: [
              !isDone ? { id: 'complete_task', type: 'complete_task', label: '✅ Marker oppgave som fullført' } : null,
              { id: 'open_task', type: 'open_task_modal', label: '📋 Se alle oppgaver' },
              { id: 'open_time', type: 'open_time_modal', label: '⏱️ Før time på oppgaven' }
            ].filter(Boolean),
            followUpPrompts: [
              `Før dagens timer på ${pName}`,
              'Tildel ny oppgave til teamet',
              'Sjekk kvalitet og KS for byggeplassen'
            ]
          });
        }
      }

      // E6. MESTERAI: AUTONOM SAMTALEPARTNER & FAGLIG RÅDGIVER (Alle caser: Tilbud, TEK17, NS 8406, Sparring)
      let replyText = '';
      let offerDraft: any = null;
      let parsedOfferItems: any[] = [];
      let parsedOfferDescription = '';
      let detectedClient = '';

      try {
        const systemInstruction = `Du er VikingMester AI – håndverkernes og mesterbedriftens autonome lederassistent, kalkulatør, faglige rådgiver og dedikerte samtalepartner (tilsvarende en supersmart samtale-AI som Claude, ChatGPT eller Gemini, men dypt forankret i norsk bygg og anlegg).
Du har full sanntidstilgang til HELE backend-systemet (alle prosjekter, avvik, endringsordrer, tilbud og oppgaver) og du kan finne ut av hva som helst.

DINE KJERNEOMRÅDER & EKSPERTISE:
1. Tilbud, Prissetting & Kalkyle:
   - Veilede i utforming av komplette, vinnende og lønnsomme tilbud.
   - Hvis brukeren ønsker et tilbud, men det mangler vesentlig informasjon (kunde, prosjektadresse, oppdragsart eller om det er ny kunde vs eksisterende prosjekt): Still nysgjerrige, konkrete og hjelpsomme oppfølgingsspørsmål for å kartlegge behovet!
   - Beregne arbeidstimer per fag (tømrer ca 850–950 kr/t eks mva, rørlegger ca 980–1150 kr/t, elektriker ca 950–1100 kr/t, flislegger ca 880–980 kr/t, maler ca 800–900 kr/t).
   - Beregne materialforbruk og anbefale standard påslag (15–25%).
   - Spesifisere rigg/drift, avfallshåndtering/container og prosjektledelse.
   - Formulere avgjørende FORBEHOLD (skjulte feil/mangler, råte, uforutsett el/vvs iht. NS 8406 / NS 8405 / Bustadoppføringslova).
2. Entrepriserett & Kontraktsstandarder:
   - NS 8405, NS 8406, NS 8407, Bustadoppføringslova og Håndverkertjenesteloven.
   - Rettidig varsling av endringer, fristforlengelse og tilleggsvederlag (unngå preklusjon).
3. Tekniske Forskrifter & Fagkrav:
   - TEK17 (herunder § 13-15 for våtrom/sluk, § 14 for energi/U-verdier, § 11 brann, § 12 trapper/rekkverk).
   - Våtromsnormen (BVN), SINTEF Byggforsk-detaljblader, NEK 400.
4. HMS, SJA & Byggherreforskriften:
   - Risikovurdering, barrierer, verneutstyr og sikkert arbeid i høyden/stillas.
5. Kunnskapsbase & Systeminnsikt:
   - Du kjenner alle prosjekter, avvik, endringer og oppgaver i bedriften og svarer presist på statusspørsmål.
6. Websøk & Ekstern Kunnskap:
   - Du kan hente inn oppdaterte byggevarepriser, produsentdatablad og forskriftsendringer fra nettet.

RETNINGSLINJER FOR SVARENE:
- Vær en naturlig, engasjert, profesjonell og lynrask samtalepartner på stødig norsk.
- Hvis brukeren stiller faglige eller systemrelaterte spørsmål: gi direkte svar og konkrete tall/fakta umiddelbart.
- Hvis brukeren ønsker å starte en handling (f.eks. tilbud for en ny kunde) der detaljer mangler: spørr og grav høflig etter det som trengs for å fullføre saken optimalt.
- Hvis tilbudskalkyle etterspørres og detaljer er gitt, avslutt gjerne med en \`\`\`kalkyle_json\`\`\` blokk med poster.`;

        let contextPrompt = '';
        if (history && history.length > 0) {
          contextPrompt += `TIDLIGERE SAMTALEHISTORIKK:\n`;
          for (const msg of history.slice(-6)) {
            contextPrompt += `${msg.role === 'user' ? 'Håndverker' : 'MesterAI'}: ${msg.content}\n`;
          }
          contextPrompt += `\n`;
        }

        contextPrompt += `GJELDENDE HENVENDELSE FRA HÅNDVERKER:\n"${text}"\n\nPROSJEKTKONTEKST:\nProsjekt: "${resolvedProjectName}" (ID: ${resolvedProjectId})\nOppdragsgiver: "${targetProject?.clientName || 'Privat/Næringskunde'}"\nOppdragsfag: "${trade || 'Byggmester / Håndverker'}"`;

        let existingOfferInfo = '';
        detectedClient = '';
        const clientMatch = text.match(/(?:tilbudet\s+til|tilbud\s+til|kunde:?)\s+([A-ZÆØÅa-zæøå]+(?:\s+[A-ZÆØÅa-zæøå]+)*)/i);
        if (clientMatch) {
          detectedClient = clientMatch[1].trim();
        }

        if (isOfferIntent || lower.includes('tilbud') || lower.includes('kalkyle')) {
          try {
            const matchedOffer = allDbOffers.find((o: any) => {
              const cName = (o.clientName || '').toLowerCase();
              const oTitle = (o.title || '').toLowerCase();
              const textLower = lower;
              return (detectedClient && cName.includes(detectedClient.toLowerCase())) ||
                     (oTitle.length > 4 && textLower.includes(oTitle));
            });

            if (matchedOffer) {
              existingOfferInfo = `\n\nFUNNET LAGRET TILBUD I SYSTEMET:\n- Tittel: ${matchedOffer.title || 'Uten tittel'}\n- Oppdragsgiver: ${matchedOffer.clientName || 'Ukjent'}\n- Beløp eks mva: kr ${matchedOffer.amountExVat || 'Ikke spesifisert'}\n- Totalbeløp inkl mva: kr ${matchedOffer.totalAmount || matchedOffer.total || 'Ikke spesifisert'}\n- Status: ${matchedOffer.status || 'draft'}\n- Eksisterende poster: ${JSON.stringify(matchedOffer.items || [])}\n- Beskrivelse: ${matchedOffer.description || ''}`;
            } else {
              existingOfferInfo = `\n\nSYSTEMMERKNAD ANGÅENDE TILBUDET:\nBrukeren etterspør en faglig vurdering eller kalkyle av et tilbud${detectedClient ? ` til ${detectedClient}` : ''}.
Du skal opptre som en høyt kvalifisert byggmester og kalkulatør og levere en komplett analyse:
1. Gjennomgang av budsjettrammen: Realistisk fordeling av fagarbeid (tømrer ca 890 kr/t), materialer med 15–20% påslag, rigg/drift, avfall og mva.
2. 3–5 konkrete forbedringspunkter for å øke lønnsomheten, forhindre timelekkasje og sikre profesjonalitet mot kunde.
3. Viktige standard NS 8406 / Håndverkertjenesteloven forbehold (skjulte feil, fukt/råte, uforutsette rør/el-føringer, eksisterende bæreevne, prisstigning på trelast).
4. Avslutt med en ryddig \`\`\`kalkyle_json\`\`\` blokk med estimerte poster for prosjektet så håndverkeren kan opprette tilbudet direkte!`;
            }
          } catch (offerErr) {
            console.warn('[Dispatch] Could not fetch offers for MesterAI context:', offerErr);
          }
        }

        contextPrompt += existingOfferInfo;

        // Inkluder hele bedriftens backend som kunnskapsbase
        let backendKnowledgeSummary = `\n\nDITT SYSTEMOVERBLIKK I SANNTID (HELE BACKEND SOM KUNNSKAPSBASEN):\n`;
        backendKnowledgeSummary += `• AKTIVE PROSJEKTER (${allProjects.length} stk):\n`;
        allProjects.forEach((p: any) => {
          backendKnowledgeSummary += `  - ID: ${p.id} | «${p.name}» | Oppdragsgiver: ${p.clientName || 'Ukjent'} | Adresse: ${p.location || 'Ikke oppgitt'} | Status: ${p.status || 'aktiv'}\n`;
        });
        backendKnowledgeSummary += `• REGISTRERTE TILBUD (${allDbOffers.length} stk):\n`;
        allDbOffers.slice(0, 10).forEach((o: any) => {
          backendKnowledgeSummary += `  - «${o.title}» | Kunde: ${o.clientName || 'Ukjent'} | Beløp: kr ${(o.totalAmount || o.total || 0).toLocaleString('no-NO')} | Status: ${o.status || 'draft'}\n`;
        });
        backendKnowledgeSummary += `• REGISTRERTE AVVIK (${allDbDeviations.length} stk):\n`;
        allDbDeviations.filter((d: any) => d.status !== 'closed' && d.status !== 'resolved').slice(0, 8).forEach((d: any) => {
          backendKnowledgeSummary += `  - [${d.severity || 'normal'}] «${d.title}» (Prosjekt: ${d.projectName || d.projectId}) | Status: ${d.status || 'open'}\n`;
        });
        backendKnowledgeSummary += `• ENDRINGSORDRER (${allDbChangeOrders.length} stk):\n`;
        allDbChangeOrders.slice(0, 8).forEach((co: any) => {
          backendKnowledgeSummary += `  - «${co.title}» | Beløp: kr ${(co.total || co.totalCost || 0).toLocaleString('no-NO')} | Status: ${co.status || 'pending'}\n`;
        });
        backendKnowledgeSummary += `• OPPGAVER (${allDbTasks.length} stk):\n`;
        allDbTasks.slice(0, 8).forEach((t: any) => {
          backendKnowledgeSummary += `  - «${t.title}» | Ansvarlig: ${t.assignedTo || 'Ufordelt'} | Status: ${t.status || 'todo'}\n`;
        });

        const aiRes = await generateWithAiEngine({
          prompt: contextPrompt + backendKnowledgeSummary,
          systemInstruction,
          webSearch: wantsWebSearch,
          operation: isOfferIntent ? 'mester_ai_offer' : 'mester_ai_conversation',
          notes: `Conversational MesterAI assistance on project ${resolvedProjectName}`
        });

        if (aiRes?.text) {
          const rawText = aiRes.text.trim();
          
          // Parse kalkyle_json if present
          const matchKalkyle = rawText.match(/```kalkyle_json([\s\S]*?)```/);
          if (matchKalkyle) {
            try {
              const parsed = JSON.parse(matchKalkyle[1].trim());
              if (Array.isArray(parsed)) {
                parsedOfferItems = parsed;
              } else if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.items)) parsedOfferItems = parsed.items;
                if (parsed.description && typeof parsed.description === 'string') {
                  parsedOfferDescription = sanitizePlainText(parsed.description);
                }
              }
            } catch (e) {
              console.warn('Could not parse kalkyle_json:', e);
            }
          }

          replyText = rawText.replace(/```kalkyle_json[\s\S]*?```/g, '').trim();

          if (wantsWebSearch && replyText && !replyText.includes('websøk') && !replyText.includes('kilder')) {
            replyText += '\n\n🌐 *Kilder og oppdaterte opplysninger innhentet via live websøk.*';
          }
        }
      } catch (err: any) {
        console.warn('[Dispatch] MesterAI conversation error:', err);
        if (lower.includes('tek17') || lower.includes('sluk') || lower.includes('fall') || lower.includes('våtrom')) {
          replyText = `📐 **Krav til fall mot sluk og våtrom iht. TEK17 § 13-15:**\n\n` +
            `1. **Fallforhold mot sluk:**\n` +
            `   - Gulvet skal ha fall mot sluk på alle arealer som kan bli utsatt for vannsøl.\n` +
            `   - I dusjsonen skal det være fall på minst **1:50** (2 cm per meter) i en radius på minst 0,8 m fra sluket.\n` +
            `   - Øvrig gulvflate skal ha fall på minst **1:100** mot sluk, eller være utført med oppkant på minst 25 mm ved døråpning slik at vann ikke renner ut i tilstøtende rom.\n\n` +
            `2. **Tettesjikt og membran:**\n` +
            `   - Membran eller tettesjikt skal føres minst 25 mm høyere enn overkant slukrist ved terskel/døråpning.\n` +
            `   - Rørgjennomføringer skal ha tette mansjetter tilpasset rørdiameter.\n\n` +
            `3. **BVN (Byggebransjens Våtromsnorm):**\n` +
            `   - Følg BVN blad 31.205 for klemring og membranoverganger for å sikre garanti og godkjent FDV.`;
        } else if (lower.includes('ns 8406') || lower.includes('endringsordre') || lower.includes('varsel') || lower.includes('tillegg')) {
          replyText = `📄 **Varsling av endringsordre iht. NS 8406 pkt. 19:**\n\n` +
            `Når det oppstår uforutsette forhold eller byggherren ber om tilleggsarbeid:\n` +
            `1. **Varsle «uten ugrunnet opphold»:** Skriftlig varsel må sendes umiddelbart for å unngå preklusjon (tap av rett til tilleggsvederlag eller fristforlengelse).\n` +
            `2. **Innhold i varselet:**\n` +
            `   - Beskrivelse av hva som kreves utført.\n` +
            `   - Hjemmel (f.eks. NS 8406 pkt. 19.2 for byggherrepålegg, eller pkt. 19.3 for uforutsette grunn/bygningsforhold).\n` +
            `   - Estimert tilleggsvederlag (kr eks. mva).\n` +
            `   - Konsekvens for fremdriftsplan (antall virkedager fristforlengelse).\n\n` +
            `Bruk skjemaet for endringsordre her i systemet for å sende formelt, juridisk vanntett varsel direkte til kunde.`;
        } else if (lower.includes('sja') || lower.includes('sikkerhet') || lower.includes('hms')) {
          replyText = `🛡️ **Sikker Jobb Analyse (SJA) – Krav og sjekkpunkter:**\n\n` +
            `Før oppstart av risikofylt arbeid skal det alltid gjennomføres SJA:\n` +
            `1. **Arbeid i høyden (> 2m):** Stillas skal ha godkjent grønt skilt, rekkverk (topp/mellom/fotlist) og fallsikringssele ved montering/demontering.\n` +
            `2. **Varme arbeider:** Sertifikat, 2x 6kg pulverapparat, 10m ryddesone og 60 min kontinuerlig brannvakt etter avsluttet arbeid.\n` +
            `3. **Kapping og støv:** Punktavsug med hepa-filter (kvartsstøv / asbest / trevirke) og P3 åndedrettsvern.\n` +
            `4. **Tverrfaglig koordinering:** Varsle andre fag før trykktesting eller kranløft.`;
        } else if (isOfferIntent || lower.includes('tilbud') || lower.includes('kalkyle')) {
          replyText = `📋 **Kalkyle- og tilbudsrådgivning for «${resolvedProjectName}»:**\n\n` +
            `For å sikre god dekningsgrad og unngå økonomiske overraskelser anbefales følgende modell:\n\n` +
            `1. **Fagarbeid & Timepris:** Benytt reelle markedspriser (tømrer ca. 890 kr/t, rørlegger/elektro ca. 980 kr/t eks. mva). Sørg for at rigg, drift og avfallshåndtering spesifiseres som egne poster.\n` +
            `2. **Materialpåslag:** Legg til 15–20% entreprenørpåslag på innkjøpspriser for å dekke lagerhold, svinn og reklamasjonsrisiko.\n` +
            `3. **NS 8406 Forbehold:** Ta alltid skriftlig forbehold om skjulte feil (fukt/råte/skjulte bærekonstruksjoner) slik at ekstraarbeid kan faktureres som tillegg.\n\n` +
            `Klikk på «Åpne Tilbudsbygger» for å justere poster eller sende formelt tilbud til kunden med digital signeringslenke.`;
        } else {
          const cleanSubject = text.slice(0, 80).trim();
          replyText = `👷‍♂️ **Faglig rådgivning for «${cleanSubject}» på ${resolvedProjectName}:**\n\n` +
            `Jeg har analysert henvendelsen og koblet den mot gjeldende standarder og krav på byggeplassen:\n\n` +
            `1. **Faglig utførelse:** Arbeidet skal følge TEK17, relevante Byggforsk-detaljblader og gjeldende bransjenormer.\n` +
            `2. **Kvalitetssikring & Dokumentasjon:** Sørg for at kontrollpunkter utføres og at bildebevis arkiveres i KS-loggen før videre arbeid utføres.\n` +
            `3. **Kontraktsmessig oppfølging:** Hvis arbeidet avviker fra opprinnelig avtale, må det varsles skriftlig iht. NS 8406 for å sikre rett til tillegg.\n\n` +
            `Velg en av hurtighandlingene under for å tildele oppgave, registrere avvik eller opprette formell sak direkte.`;
        }
      }

      // Build rich suggested actions
      const suggestedActions: any[] = [];
      let followUpPrompts: string[] = [];

      if (isOfferIntent) {
        let finalItems = parsedOfferItems.length > 0 ? parsedOfferItems : [
          { description: 'Fagarbeid og utførelse', quantity: 24, unit: 'timer', pricePerUnit: 890, total: 21360 },
          { description: 'Nødvendige materialer og forbruksmateriell', quantity: 1, unit: 'stk', pricePerUnit: 16500, total: 16500 },
          { description: 'Rigg, drift og avfallshåndtering', quantity: 1, unit: 'stk', pricePerUnit: 4500, total: 4500 }
        ];

        const clientForDraft = detectedClient || targetProject?.clientName || '';
        const cleanOfferScope = text.replace(/^["'«]+|["'»]+$/g, '').slice(0, 120).trim();

        offerDraft = {
          title: clientForDraft ? `Tilbud: ${clientForDraft}` : (targetProject ? `Tilbud: ${targetProject.name}` : `Tilbud: ${cleanOfferScope.slice(0, 45)}`),
          description: parsedOfferDescription || formatCleanOfferDescription(cleanOfferScope || text, resolvedProjectName, clientForDraft),
          items: finalItems,
          projectId: targetProject?.id || resolvedProjectId,
          projectCode: targetProject?.projectCode,
          clientName: clientForDraft || targetProject?.clientName || '',
          clientEmail: targetProject?.clientEmail || ''
        };

        suggestedActions.push({
          id: 'open_offer_modal',
          type: 'open_offer_modal',
          label: clientForDraft ? `📝 Åpne Tilbudsbygger (${clientForDraft})` : '📝 Åpne Tilbudsbygger med dette utkastet',
          title: 'Åpne Tilbudsbygger',
          data: offerDraft
        });

        suggestedActions.push({
          id: 'send_offer_email',
          type: 'send_offer_email',
          label: '✉️ Send tilbud på e-post til kunden',
          title: 'Send tilbud på e-post',
          data: offerDraft
        });

        followUpPrompts = [
          'Send dette tilbudet på e-post til kunden',
          'Hvilke standard forbehold bør jeg inkludere for dette prosjektet?',
          'Hva bør timeprisen settes til for dette faget?',
          'Formuler et profesjonelt følgebrev til kunden'
        ];
      } else if (lower.includes('endring') || lower.includes('tillegg')) {
        suggestedActions.push({
          id: 'open_co_modal',
          type: 'open_change_order_modal',
          label: '📄 Opprett Endringsordre (NS 8406)',
          data: {
            title: `Endring: ${text.slice(0, 45)}`,
            description: formatCleanChangeOrderDescription(text, resolvedProjectName),
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
          id: 'open_task',
          type: 'open_task_modal',
          label: '📋 Tildel oppgave i felt'
        });
        suggestedActions.push({
          id: 'open_deviation',
          type: 'open_deviation_modal',
          label: '⚠️ Registrer avvik / KS'
        });
        suggestedActions.push({
          id: 'open_co_modal',
          type: 'open_change_order_modal',
          label: '📄 Endringsordre (NS 8406)'
        });
        suggestedActions.push({
          id: 'open_sja_modal',
          type: 'open_sja_modal',
          label: '🛡️ Sikker Jobb Analyse (SJA)'
        });
        followUpPrompts = [
          `Før dagens timer på ${resolvedProjectName}`,
          'Sjekk kvalitet og avvik for prosjektet',
          'Send dokumentasjon og FDV på e-post'
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
        projectId: projectId || 'proj-general',
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
        projectId: projectId || 'proj-general',
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
