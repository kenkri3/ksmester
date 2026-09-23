import { getCollectionItems, saveCollectionItem, updateCollectionItem } from './db';
import { sendChangeOrderByEmail, sendOfferByEmail } from './emailSender';

export interface PendingAction {
  id: string;
  type: 'daily_log_draft' | 'weather_risk_alert' | 'change_order_draft' | 'compliance_notice' | 'offer_draft';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectId: string;
  projectName: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_executed';
  data: any;
  suggestedAction: string;
  impactAmount?: number;
  category: 'hms' | 'finance' | 'quality' | 'progress';
}

export interface AutonomySettings {
  mode: 'copilot' | 'autopilot';
  maxAutoApproveAmount: number;
  autoApproveRoutineDailyLogs: boolean;
  weatherAlertThresholdMm: number;
  notifyDiscord: boolean;
  notifySlack: boolean;
  notifyEmail: boolean;
}

export interface ProjectWeatherStatus {
  projectId: string;
  projectName: string;
  location: string;
  temp: number;
  precipitationMm: number;
  windSpeedMs: number;
  condition: string;
  riskLevel: 'safe' | 'warning' | 'critical';
  riskReason?: string;
  workAdvice: string;
  forecastDate: string;
  weatherDescription?: string;
}

const DEFAULT_AUTONOMY_SETTINGS: AutonomySettings = {
  mode: 'copilot',
  maxAutoApproveAmount: 5000,
  autoApproveRoutineDailyLogs: false,
  weatherAlertThresholdMm: 8,
  notifyDiscord: true,
  notifySlack: true,
  notifyEmail: false
};

const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  oslo: { lat: 59.91, lon: 10.75 },
  horten: { lat: 59.42, lon: 10.48 },
  kongeveien: { lat: 59.42, lon: 10.48 },
  vestfold: { lat: 59.27, lon: 10.41 },
  tønsberg: { lat: 59.27, lon: 10.41 },
  tonsberg: { lat: 59.27, lon: 10.41 },
  sandefjord: { lat: 59.13, lon: 10.22 },
  larvik: { lat: 59.05, lon: 10.03 },
  holmestrand: { lat: 59.49, lon: 10.32 },
  åsgårdstrand: { lat: 59.35, lon: 10.47 },
  asgardstrand: { lat: 59.35, lon: 10.47 },
  drammen: { lat: 59.74, lon: 10.20 },
  kongsberg: { lat: 59.67, lon: 9.65 },
  bergen: { lat: 60.39, lon: 5.32 },
  trondheim: { lat: 63.43, lon: 10.39 },
  stavanger: { lat: 58.97, lon: 5.73 },
  kristiansand: { lat: 58.15, lon: 8.00 },
  tromsø: { lat: 69.65, lon: 18.96 },
  tromso: { lat: 69.65, lon: 18.96 },
  bodø: { lat: 67.28, lon: 14.40 },
  bodo: { lat: 67.28, lon: 14.40 },
  ålesund: { lat: 62.47, lon: 6.15 },
  alesund: { lat: 62.47, lon: 6.15 },
  fredrikstad: { lat: 59.22, lon: 10.93 },
  sarpsborg: { lat: 59.28, lon: 11.11 },
  sandnes: { lat: 58.85, lon: 5.74 },
  skien: { lat: 59.21, lon: 9.61 },
  porsgrunn: { lat: 59.14, lon: 9.65 },
  moss: { lat: 59.43, lon: 10.66 },
  haugesund: { lat: 59.41, lon: 5.27 },
  hamar: { lat: 60.79, lon: 11.07 },
  lillehammer: { lat: 61.11, lon: 10.46 }
};

export function resolveCoordinates(locationName?: string): { lat: number; lon: number } {
  if (!locationName) return CITY_COORDINATES.oslo;
  const lower = locationName.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (lower.includes(key)) return coords;
  }
  return CITY_COORDINATES.oslo;
}

/**
 * Henter bedriftens innstillinger for autonomi (Copilot vs Autopilot og terskelgrenser)
 */
export async function getAutonomySettings(): Promise<AutonomySettings> {
  try {
    const settingsList = await getCollectionItems('app_settings');
    const existing = settingsList.find((s: any) => s.id === 'autonomy_config');
    if (existing) {
      return { ...DEFAULT_AUTONOMY_SETTINGS, ...existing };
    }
  } catch (e: any) {
    console.warn('[Autonomy] Feil ved lesing av innstillinger, bruker standard:', e.message);
  }
  return DEFAULT_AUTONOMY_SETTINGS;
}

/**
 * Lagrer bedriftens innstillinger for autonomi
 */
export async function saveAutonomySettings(newSettings: Partial<AutonomySettings>): Promise<AutonomySettings> {
  const current = await getAutonomySettings();
  const updated: AutonomySettings = { ...current, ...newSettings };
  await saveCollectionItem('app_settings', {
    id: 'autonomy_config',
    ...updated,
    updatedAt: new Date().toISOString()
  });
  return updated;
}

/**
 * Henter alle ventende handlinger i godkjenningskøen
 */
export async function getPendingActions(): Promise<PendingAction[]> {
  try {
    const allActions = await getCollectionItems('pending_actions');
    const today = new Date().toISOString().split('T')[0];
    const validActions: PendingAction[] = [];

    for (const a of allActions) {
      if (a.status !== 'pending') continue;

      // 1. Filtrer ut og auto-arkiver utgåtte eller feilaktige værvarsler
      if (a.type === 'weather_risk_alert') {
        const forecastDate = a.data?.forecastDate || a.id.split('-').pop();

        // Passert dato -> arkiver som utgått
        if (forecastDate && forecastDate < today) {
          updateCollectionItem('pending_actions', a.id, {
            status: 'auto_executed',
            autoDismissedReason: 'Værvarseldatoen er passert.'
          }).catch(() => {});
          continue;
        }

        // Gamle feilvarsler generert da vind var km/h (f.eks. "21.6 m/s" eller vind > 14 km/h)
        if (a.title?.includes('21.6') || (a.data?.windSpeedMs && a.data.windSpeedMs > 20 && !a.data?.isCorrected)) {
          updateCollectionItem('pending_actions', a.id, {
            status: 'auto_executed',
            autoDismissedReason: 'Rettet: Enhetsfeil fra værstasjon (km/h konvertert til m/s).'
          }).catch(() => {});
          continue;
        }
      }

      validActions.push(a);
    }

    return validActions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e: any) {
    console.warn('[Autonomy] Feil ved henting av godkjenningskø:', e.message);
    return [];
  }
}

/**
 * 1-Klikks godkjenning av en autonom handling
 */
export async function approveAction(actionId: string, approvedBy: string = 'Byggmester'): Promise<{ success: boolean; message: string; data?: any }> {
  const allActions = await getCollectionItems('pending_actions');
  const action = allActions.find((a: any) => a.id === actionId);

  if (!action) {
    throw new Error(`Handling ${actionId} ble ikke funnet.`);
  }

  const now = new Date().toISOString();

  // 1. Byggedagbok godkjenning: Lås inn i daily_logs
  if (action.type === 'daily_log_draft') {
    const dailyLogData = {
      ...action.data,
      id: `daily-log-${action.projectId}-${action.data.date || now.split('T')[0]}`,
      inspectedBy: approvedBy,
      signedAt: now,
      status: 'approved',
      autoGenerated: true,
      createdAt: now
    };
    await saveCollectionItem('daily_logs', dailyLogData);

    // Marker handling som godkjent
    await updateCollectionItem('pending_actions', actionId, {
      status: 'approved',
      approvedBy,
      approvedAt: now
    });

    await saveCollectionItem('agent_activities', {
      type: 'daily_log_approved',
      title: `Byggedagbok godkjent: ${action.projectName}`,
      description: `Godkjent av ${approvedBy}. ${dailyLogData.crewCount || 0} fagarbeidere, ${dailyLogData.totalHoursWorked || 0} timer logget.`,
      projectId: action.projectId,
      projectName: action.projectName,
      badge: 'JURIDISK GYLDIG',
      status: 'approved',
      createdAt: now
    });

    return {
      success: true,
      message: `Byggedagbok for ${action.projectName} er godkjent og arkivert iht. Byggherreforskriften § 15.`,
      data: dailyLogData
    };
  }

  // 2. Endringsordre godkjenning (NS 8406)
  if (action.type === 'change_order_draft') {
    let clientEmail = action.data?.clientEmail || action.data?.customerEmail || action.data?.email;
    let clientName = action.data?.clientName || action.data?.customerName;
    let companyName = action.data?.companyName;

    // Hvis e-post mangler i handlingen, slå opp prosjektet for å finne kunden
    if (!clientEmail && action.projectId) {
      try {
        const projects = await getCollectionItems('projects');
        const proj = projects.find((p: any) => p.id === action.projectId);
        if (proj) {
          clientEmail = proj.clientEmail || proj.customerEmail || proj.contactEmail;
          clientName = clientName || proj.clientName || proj.customerName;
          companyName = companyName || proj.companyName;
        }
      } catch (e) {
        console.warn('[autonomousAgent] Kunne ikke hente prosjekt for klient-epost:', e);
      }
    }

    const changeOrderData = {
      ...action.data,
      clientEmail,
      clientName,
      status: 'approved',
      approvedBy,
      approvedAt: now
    };
    await saveCollectionItem('change_orders', changeOrderData);

    await updateCollectionItem('pending_actions', actionId, {
      status: 'approved',
      approvedBy,
      approvedAt: now
    });

    let emailNotice = '';
    if (clientEmail) {
      try {
        const emailRes = await sendChangeOrderByEmail({
          changeOrder: changeOrderData,
          clientEmail,
          clientName,
          companyName,
          authorName: approvedBy
        });
        if (emailRes.success) {
          emailNotice = ` og automatisk sendt på e-post til ${clientEmail} (Resend ID: ${emailRes.resendId || emailRes.id}).`;
        } else {
          emailNotice = ` (Merk: E-post ble ikke levert: ${emailRes.message || emailRes.error || 'Ukjent feil'})`;
        }
      } catch (err: any) {
        console.error('[autonomousAgent] Kunne ikke sende endringsordre på e-post:', err);
        emailNotice = ` (Feil ved e-postsending: ${err.message})`;
      }
    }

    await saveCollectionItem('agent_activities', {
      type: 'change_order_approved',
      title: `Endringsordre godkjent: ${action.title}`,
      description: `Endringsordre på kr ${(changeOrderData.totalAmount || action.impactAmount || 0).toLocaleString('no-NO')} eks mva godkjent for utsendelse${emailNotice}.`,
      projectId: action.projectId,
      projectName: action.projectName,
      badge: emailNotice.includes('automatisk sendt') ? 'NS 8406 SENDT' : 'NS 8406 GODKJENT',
      status: 'approved',
      createdAt: now
    });

    return {
      success: true,
      message: `Endringsordre ${action.title} er godkjent og klargjort for utsendelse til kunde${emailNotice}.`,
      data: changeOrderData
    };
  }

  // 3. Pristilbud godkjenning
  if (action.type === 'offer_draft') {
    let clientEmail = action.data?.clientEmail || action.data?.customerEmail || action.data?.email;
    let clientName = action.data?.clientName || action.data?.customerName;
    let companyName = action.data?.companyName;

    if (!clientEmail && action.projectId) {
      try {
        const projects = await getCollectionItems('projects');
        const proj = projects.find((p: any) => p.id === action.projectId);
        if (proj) {
          clientEmail = proj.clientEmail || proj.customerEmail || proj.contactEmail;
          clientName = clientName || proj.clientName || proj.customerName;
          companyName = companyName || proj.companyName;
        }
      } catch (e) {
        console.warn('[autonomousAgent] Kunne ikke hente prosjekt for klient-epost:', e);
      }
    }

    const offerData = {
      ...action.data,
      clientEmail,
      clientName,
      status: 'approved',
      approvedBy,
      approvedAt: now
    };
    await saveCollectionItem('offers', offerData);

    await updateCollectionItem('pending_actions', actionId, {
      status: 'approved',
      approvedBy,
      approvedAt: now
    });

    let emailNotice = '';
    if (clientEmail) {
      try {
        const emailRes = await sendOfferByEmail({
          offer: offerData,
          clientEmail,
          clientName,
          companyName,
          authorName: approvedBy
        });
        if (emailRes.success) {
          emailNotice = ` og automatisk oversendt på e-post til ${clientEmail} (Resend ID: ${emailRes.resendId || emailRes.id}).`;
        } else {
          emailNotice = ` (Merk: E-post ble ikke levert: ${emailRes.message || emailRes.error || 'Ukjent feil'})`;
        }
      } catch (err: any) {
        console.error('[autonomousAgent] Kunne ikke sende tilbud på e-post:', err);
        emailNotice = ` (Feil ved e-postsending: ${err.message})`;
      }
    }

    await saveCollectionItem('agent_activities', {
      type: 'offer_approved',
      title: `Pristilbud godkjent: ${action.title}`,
      description: `Pristilbud på kr ${(offerData.totalAmount || action.impactAmount || 0).toLocaleString('no-NO')} godkjent${emailNotice}.`,
      projectId: action.projectId,
      projectName: action.projectName,
      badge: emailNotice.includes('automatisk oversendt') ? 'TILBUD SENDT' : 'TILBUD GODKJENT',
      status: 'approved',
      createdAt: now
    });

    return {
      success: true,
      message: `Pristilbud «${action.title}» er godkjent og aktivert${emailNotice}.`,
      data: offerData
    };
  }

  // 3. Værvarsel / Omdisponering erkjent
  if (action.type === 'weather_risk_alert') {
    await updateCollectionItem('pending_actions', actionId, {
      status: 'approved',
      acknowledgedBy: approvedBy,
      acknowledgedAt: now
    });

    await saveCollectionItem('agent_activities', {
      type: 'weather_warning_acknowledged',
      title: `Væromdisponering igangsatt: ${action.projectName}`,
      description: `${approvedBy} har bekreftet omdisponeringsråd for prosjektet pga. værforhold.`,
      projectId: action.projectId,
      projectName: action.projectName,
      badge: 'VÆRSIKRET',
      status: 'approved',
      createdAt: now
    });

    return {
      success: true,
      message: `Væromdisponering for ${action.projectName} er kvittert ut og logget.`
    };
  }

  // Generell godkjenning for øvrige typer
  await updateCollectionItem('pending_actions', actionId, {
    status: 'approved',
    approvedBy,
    approvedAt: now
  });

  return { success: true, message: `Handling «${action.title}» er godkjent.` };
}

/**
 * Avvis / slett en handling fra godkjenningskøen
 */
export async function rejectAction(actionId: string, rejectedBy: string = 'Byggmester', reason?: string): Promise<{ success: boolean; message: string }> {
  const now = new Date().toISOString();
  await updateCollectionItem('pending_actions', actionId, {
    status: 'rejected',
    rejectedBy,
    rejectedAt: now,
    rejectionReason: reason || 'Avvist av leder'
  });

  return { success: true, message: 'Handling er avvist og fjernet fra køen.' };
}

/**
 * 🌦️ Henter sanntids værstatus og risikovurdering for aktive prosjekter
 */
export async function getProjectsWeatherStatus(): Promise<ProjectWeatherStatus[]> {
  try {
    const projects = await getCollectionItems('projects');
    const activeProjects = projects.filter((p: any) => p.status === 'active' || !p.status);

    const statuses: ProjectWeatherStatus[] = [];

    for (const proj of activeProjects.slice(0, 10)) {
      const location = proj.location || 'Oslo';
      const coords = resolveCoordinates(location);

      try {
        // Legg til &wind_speed_unit=ms slik at Open-Meteo returnerer m/s (ikke km/h som standard)
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,wind_speed_10m_max,weather_code&wind_speed_unit=ms&timezone=Europe%2FOslo`;
        const res = await fetch(apiUrl, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(4000)
        });

        if (res.ok) {
          const json = await res.json();
          const daily = json.daily || {};

          // DAGENS VÆR (Indeks 0):
          const todayMinTemp = daily.temperature_2m_min?.[0] ?? 8;
          const todayMaxTemp = daily.temperature_2m_max?.[0] ?? 15;
          const todayPrecip = daily.precipitation_sum?.[0] ?? 0;
          const todayWind = daily.wind_speed_10m_max?.[0] ?? 3.5;
          const todayCode = daily.weather_code?.[0] ?? 1;
          const todayDate = daily.time?.[0] || new Date().toISOString().split('T')[0];

          // MORGENDAGENS VÆR (Indeks 1):
          const tmrwMinTemp = daily.temperature_2m_min?.[1] ?? todayMinTemp;
          const tmrwMaxTemp = daily.temperature_2m_max?.[1] ?? todayMaxTemp;
          const tmrwPrecip = daily.precipitation_sum?.[1] ?? todayPrecip;
          const tmrwWind = daily.wind_speed_10m_max?.[1] ?? todayWind;
          const tmrwDate = daily.time?.[1] || new Date(Date.now() + 86400000).toISOString().split('T')[0];

          let riskLevel: 'safe' | 'warning' | 'critical' = 'safe';
          let riskReason: string | undefined = undefined;
          let workAdvice = 'Stabile og gode arbeidsforhold for både utendørs og innendørs arbeid.';
          let forecastDate = todayDate;

          // ⚠️ REELLE SIKKERHETSGRENSER FOR BYGGEPLASS (iht. Arbeidstilsynet & NS):
          // Vind: >= 17 m/s (sterk kuling/storm) -> Kritisk stans i høyden.
          //       >= 14 m/s (stiv kuling) -> Varsel ved kraning og stillasarbeid.
          // Nedbør: >= 15 mm/døgn -> Fare for vanninntrenging.
          // Temperatur: < 0°C -> Frostfare i fersk mørtel/støp.
          if (todayMinTemp < 0) {
            riskLevel = todayMinTemp < -5 ? 'critical' : 'warning';
            riskReason = `Minusgrader i dag (${todayMinTemp}°C): Fare for frost i fersk støp/mørtel og glatt stillas.`;
            workAdvice = 'Utsett utvendig betong- og fasadearbeid, eller benytt vintertilsetning og aktiv tildekking.';
            forecastDate = todayDate;
          } else if (todayPrecip >= 15) {
            riskLevel = 'critical';
            riskReason = `Kraftig nedbør i dag (${todayPrecip} mm meldt): Fare for vanninntrenging og fuktskader.`;
            workAdvice = 'Takarbeid og åpne konstruksjoner må tildekkes umiddelbart. Prioriter innvendige tømrerarbeider.';
            forecastDate = todayDate;
          } else if (todayWind >= 17) {
            riskLevel = 'critical';
            riskReason = `Sterk kuling / storm i dag (${Math.round(todayWind * 10) / 10} m/s): Fare ved stillasarbeid, taktekking og kraning.`;
            workAdvice = 'Stans arbeid i høyden. Sikre alle løse presenninger, plater og verktøy umiddelbart.';
            forecastDate = todayDate;
          } else if (todayWind >= 14) {
            riskLevel = 'warning';
            riskReason = `Stiv kuling i dag (${Math.round(todayWind * 10) / 10} m/s): Fare ved stillasarbeid og kraning av plater.`;
            workAdvice = 'Sikre alle løse presenninger, plater og verktøy. Vurder stans i kraning og arbeid i høyden.';
            forecastDate = todayDate;
          } else if (tmrwMinTemp < 0) {
            riskLevel = tmrwMinTemp < -5 ? 'critical' : 'warning';
            riskReason = `Meldt kulde i morgen (${tmrwDate}, ${tmrwMinTemp}°C): Frostfare i mørtel og støp.`;
            workAdvice = 'Planlegg tildekking eller innvendig arbeid for morgendagen.';
            forecastDate = tmrwDate;
          } else if (tmrwPrecip >= 15) {
            riskLevel = 'critical';
            riskReason = `Meldt kraftig nedbør i morgen (${tmrwDate}, ${tmrwPrecip} mm): Fare for fuktskader.`;
            workAdvice = 'Tildekk åpne konstruksjoner og klargjør innvendige oppgaver før i morgen.';
            forecastDate = tmrwDate;
          } else if (tmrwWind >= 17) {
            riskLevel = 'critical';
            riskReason = `Meldt sterk kuling/storm i morgen (${tmrwDate}, ${Math.round(tmrwWind * 10) / 10} m/s): Ekstrem vind i høyden.`;
            workAdvice = 'Sikre stillaser og byggeplass i ettermiddag for morgendagens vind.';
            forecastDate = tmrwDate;
          } else if (tmrwWind >= 14) {
            riskLevel = 'warning';
            riskReason = `Meldt stiv kuling i morgen (${tmrwDate}, ${Math.round(tmrwWind * 10) / 10} m/s): Vindkast ved stillasarbeid.`;
            workAdvice = 'Sikre presenninger og materiell før arbeidsdagens slutt.';
            forecastDate = tmrwDate;
          }

          // Dagens værforhold for radaren:
          let condition = 'Opphold';
          if (todayPrecip > 2) {
            condition = 'Regn';
          } else if (todayMinTemp < 0) {
            condition = 'Kuldegrader';
          } else if (todayCode === 0) {
            condition = 'Sol / Klart';
          } else if (todayCode >= 1 && todayCode <= 2) {
            condition = 'Lettskyet / Sol';
          } else if (todayCode === 3) {
            condition = 'Overskyet';
          } else if (todayCode >= 51 && todayCode <= 67) {
            condition = 'Lett regn / Yr';
          }

          const avgTemp = Math.round((todayMinTemp + todayMaxTemp) / 2);
          const windMs = Math.round(todayWind * 10) / 10;
          const precipMm = Math.round(todayPrecip * 10) / 10;

          statuses.push({
            projectId: proj.id,
            projectName: proj.name,
            location,
            temp: avgTemp,
            precipitationMm: precipMm,
            windSpeedMs: windMs,
            condition,
            riskLevel,
            riskReason,
            workAdvice,
            forecastDate,
            weatherDescription: `${condition}, ${avgTemp}°C, ${windMs} m/s vind${precipMm > 0 ? `, ${precipMm} mm nedbør` : ''}`
          });
        }
      } catch (err: any) {
        console.warn(`[Autonomy Weather] Kunne ikke hente vær for ${proj.name}:`, err.message);
      }
    }

    return statuses;
  } catch (e: any) {
    console.error('[Autonomy] Feil ved sjekk av prosjektvær:', e);
    return [];
  }
}

/**
 * ⚡ HOVEDMOTOR: KJØRER EN KOMPLETT AUTONOM REVISJONS- OG HANDLINGSSYKLUS
 * Kan kalles av morgen-cron, ettermiddags-cron eller manuelt via dashbordet.
 */
export async function runAutonomousAuditCycle(): Promise<{
  executedAt: string;
  weatherChecksCount: number;
  weatherAlertsCreated: number;
  dailyLogsDrafted: number;
  dailyLogsAutoApproved: number;
  changeOrdersDetected: number;
  pendingActionsTotal: number;
}> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const executedAt = now.toISOString();

  console.log(`🚀 [Autonomy Cycle] Starter autonom revisjonssyklus ${executedAt}...`);

  const settings = await getAutonomySettings();
  const [projects, existingActions, allTimeEntries, allDeviations, allTasks, allDailyLogs] = await Promise.all([
    getCollectionItems('projects').catch(() => []),
    getCollectionItems('pending_actions').catch(() => []),
    getCollectionItems('time_entries').catch(() => []),
    getCollectionItems('deviations').catch(() => []),
    getCollectionItems('tasks').catch(() => []),
    getCollectionItems('daily_logs').catch(() => [])
  ]);

  const activeProjects = projects.filter((p: any) => p.status === 'active' || !p.status);

  let weatherAlertsCreated = 0;
  let dailyLogsDrafted = 0;
  let dailyLogsAutoApproved = 0;
  let changeOrdersDetected = 0;

  // --------------------------------------------------------------------------------------
  // 1. VÆR-RADAR: Sjekk sanntidsvær og morgendagens vær for hvert aktivt prosjekt
  // --------------------------------------------------------------------------------------
  const weatherStatuses = await getProjectsWeatherStatus();

  for (const weather of weatherStatuses) {
    // 🌟 REKONSILIERING: Dersom været er trygt, rydd automatisk bort eventuelle tidligere værvarsler!
    if (weather.riskLevel === 'safe') {
      const staleWeatherAlerts = existingActions.filter((a: any) => 
        a.type === 'weather_risk_alert' && 
        a.projectId === weather.projectId && 
        a.status === 'pending'
      );
      for (const stale of staleWeatherAlerts) {
        await updateCollectionItem('pending_actions', stale.id, {
          status: 'auto_executed',
          autoDismissedReason: 'Værforholdene er nå sjekket og verifisert trygge (sanntidsdata).'
        });
      }
      continue;
    }

    // Hvis det foreligger en reell værfare:
    if (weather.riskLevel === 'warning' || weather.riskLevel === 'critical') {
      const actionId = `weather-alert-${weather.projectId}-${weather.forecastDate}`;
      const alreadyExists = existingActions.some((a: any) => a.id === actionId && a.status === 'pending');

      if (!alreadyExists) {
        const newAction: PendingAction = {
          id: actionId,
          type: 'weather_risk_alert',
          title: `⚠️ Værfare for ${weather.projectName}: ${weather.riskReason}`,
          description: weather.workAdvice,
          priority: weather.riskLevel === 'critical' ? 'urgent' : 'high',
          projectId: weather.projectId,
          projectName: weather.projectName,
          createdAt: executedAt,
          status: 'pending',
          data: weather,
          suggestedAction: 'Omdisponer tømrerlag til innvendige arbeider og sikre byggeplass',
          category: 'hms'
        };

        await saveCollectionItem('pending_actions', newAction);
        weatherAlertsCreated++;

        await saveCollectionItem('agent_activities', {
          type: 'weather_risk_detected',
          title: `Værfare detektert: ${weather.projectName}`,
          description: `${weather.riskReason}. Anbefaling klargjort i godkjenningskøen.`,
          projectId: weather.projectId,
          projectName: weather.projectName,
          badge: weather.riskLevel === 'critical' ? 'KRITISK VÆR' : 'VÆRVARSEL',
          status: 'pending',
          createdAt: executedAt
        });
      }
    }
  }

  // --------------------------------------------------------------------------------------
  // 2. BYGGEDAGBOK AGGREGATOR («Draft & Approve»)
  // --------------------------------------------------------------------------------------
  for (const proj of activeProjects) {
    // Sjekk om det allerede er ført eller godkjent dagbok for i dag
    const existingLog = allDailyLogs.find((dl: any) => dl.projectId === proj.id && dl.date === todayStr);
    if (existingLog) continue;

    const draftActionId = `daily-draft-${proj.id}-${todayStr}`;
    const draftActionExists = existingActions.some((a: any) => a.id === draftActionId);
    if (draftActionExists) continue;

    // Hent dagens faktiske timelister for prosjektet
    const todaysTimeEntries = allTimeEntries.filter((te: any) => 
      te.projectId === proj.id && 
      (te.date === todayStr || (te.createdAt && te.createdAt.startsWith(todayStr)))
    );

    // Hvis ingen timer er ført ennå, hopper vi over (unngår å lage tomme, fiktive dagbøker)
    if (todaysTimeEntries.length === 0) continue;

    // Beregn faktiske summer
    const totalHours = todaysTimeEntries.reduce((sum: number, te: any) => sum + (Number(te.hours) || 0), 0);
    const uniqueWorkers = Array.from(new Set(todaysTimeEntries.map((te: any) => te.userName || 'Håndverker')));

    // Dagens fullførte oppgaver
    const todaysTasks = allTasks.filter((t: any) => 
      t.projectId === proj.id && 
      t.status === 'completed'
    ).map((t: any) => t.title);

    // Dagens avvik på prosjektet
    const todaysDeviations = allDeviations.filter((d: any) => 
      (d.projectId === proj.id || d.project === proj.name) &&
      d.status !== 'closed'
    ).map((d: any) => d.title);

    // Dagens reelle vær for prosjektet
    const matchedWeather = weatherStatuses.find(w => w.projectId === proj.id);

    const draftLogPayload = {
      projectId: proj.id,
      projectName: proj.name,
      date: todayStr,
      crewCount: uniqueWorkers.length,
      crewMembers: uniqueWorkers,
      totalHoursWorked: totalHours,
      completedTasks: todaysTasks.length > 0 ? todaysTasks : todaysTimeEntries.map((te: any) => te.description).filter(Boolean),
      checklistsCompleted: [],
      deviationsRegistered: todaysDeviations,
      temperatureMin: matchedWeather ? matchedWeather.temp - 3 : 8,
      temperatureMax: matchedWeather ? matchedWeather.temp + 3 : 14,
      windSpeedMax: matchedWeather?.windSpeedMs || 3.5,
      precipitationMm: matchedWeather?.precipitationMm || 0,
      weatherDescription: matchedWeather ? `${matchedWeather.condition}, ${matchedWeather.temp}°C, ${matchedWeather.windSpeedMs} m/s vind` : 'Opphold',
      workAdvice: matchedWeather?.workAdvice || 'Normale arbeidsforhold',
      generalNotes: `Aggregert automatisk fra ${todaysTimeEntries.length} timeregistreringer. Ingen avvik meldt.`,
      autoGenerated: true,
      createdAt: executedAt
    };

    // ⚡ Autopilot-logikk: Hvis aktivert og 0 avvik, godkjenn og arkiver automatisk
    if (settings.mode === 'autopilot' && settings.autoApproveRoutineDailyLogs && todaysDeviations.length === 0) {
      await saveCollectionItem('daily_logs', {
        id: `daily-log-${proj.id}-${todayStr}`,
        ...draftLogPayload,
        inspectedBy: 'MesterAI Autopilot',
        signedAt: executedAt,
        status: 'approved'
      });

      await saveCollectionItem('agent_activities', {
        type: 'daily_log_auto_approved',
        title: `Autopilot: Byggedagbok arkivert for ${proj.name}`,
        description: `Automatisk godkjent iht. Byggherreforskriften § 15 (${uniqueWorkers.length} mann, ${totalHours} timer).`,
        projectId: proj.id,
        projectName: proj.name,
        badge: 'AUTOPILOT ARKIVERT',
        status: 'approved',
        createdAt: executedAt
      });

      dailyLogsAutoApproved++;
    } else {
      // 🟢 Copilot-modus (eller avvik finnes): Legg i godkjenningskøen for 1-klikks tommeltast
      const newAction: PendingAction = {
        id: draftActionId,
        type: 'daily_log_draft',
        title: `Byggedagbok klar for signering: ${proj.name} (${todayStr})`,
        description: `${uniqueWorkers.length} mann på plassen, ${totalHours} arbeidstimer ført. ${matchedWeather?.weatherDescription || 'Opphold'}.`,
        priority: todaysDeviations.length > 0 ? 'high' : 'medium',
        projectId: proj.id,
        projectName: proj.name,
        createdAt: executedAt,
        status: 'pending',
        data: draftLogPayload,
        suggestedAction: 'Godkjenn for å arkivere i henhold til Byggherreforskriften § 15',
        category: 'progress'
      };

      await saveCollectionItem('pending_actions', newAction);
      dailyLogsDrafted++;

      await saveCollectionItem('agent_activities', {
        type: 'daily_log_drafted',
        title: `Byggedagbok klargjort: ${proj.name}`,
        description: `Basert på ${todaysTimeEntries.length} timelister. Ligger klar for 1-klikks godkjenning.`,
        projectId: proj.id,
        projectName: proj.name,
        badge: 'KLAR FOR SIGNERING',
        status: 'pending',
        createdAt: executedAt
      });
    }
  }

  // --------------------------------------------------------------------------------------
  // 3. ENDRINGSORDRE-DETEKTOR: Fanger opp uavtalt tilleggsarbeid fra timelister
  // --------------------------------------------------------------------------------------
  const changeKeywords = ['ekstra', 'tillegg', 'endring', 'omlegging', 'feil fra arkitekt', 'bestilt av kunde', 'flytting'];

  for (const te of allTimeEntries) {
    const descLower = (te.description || '').toLowerCase();
    const isChangeHint = changeKeywords.some(kw => descLower.includes(kw));

    if (isChangeHint) {
      const actionId = `change-hint-${te.id}`;
      const alreadyReported = existingActions.some((a: any) => a.id === actionId);

      if (!alreadyReported) {
        const proj = projects.find((p: any) => p.id === te.projectId) || { name: 'Byggeprosjekt' };
        const estimatedAmount = (Number(te.hours) || 2) * 890 * 1.15; // 890 kr/t + 15% rigg/materiell

        const draftChangeOrder = {
          id: `co-auto-${Date.now()}`,
          projectId: te.projectId,
          projectName: proj.name,
          clientEmail: proj.clientEmail || proj.customerEmail || proj.contactEmail || '',
          clientName: proj.clientName || proj.customerName || '',
          companyName: proj.companyName || '',
          title: `Tilleggsarbeid detektert: ${te.description}`,
          description: `Håndverker ${te.userName || 'Fagperson'} har registrert ${te.hours} timer med merknad: «${te.description}». Formelt krav om tilleggsvederlag klargjort iht. NS 8406 pkt. 19.2.`,
          amountExVat: Math.round(estimatedAmount),
          vatAmount: Math.round(estimatedAmount * 0.25),
          totalAmount: Math.round(estimatedAmount * 1.25),
          impactDays: 0,
          legalHjemmel: 'NS 8406 pkt. 19.2 (Varsel om krav på justering av vederlag)',
          status: 'draft',
          createdAt: executedAt
        };

        const newAction: PendingAction = {
          id: actionId,
          type: 'change_order_draft',
          title: `Mulig uavtalt tilleggsarbeid: ${proj.name} (kr ${Math.round(estimatedAmount).toLocaleString('no-NO')})`,
          description: `Oppdaget fra timeliste: «${te.description}». MesterAI har klargjort formell NS 8406 endringsmelding.`,
          priority: 'high',
          projectId: te.projectId,
          projectName: proj.name,
          createdAt: executedAt,
          status: 'pending',
          data: draftChangeOrder,
          impactAmount: Math.round(estimatedAmount),
          suggestedAction: 'Send endringsmelding til byggherre for å sikre kravet',
          category: 'finance'
        };

        await saveCollectionItem('pending_actions', newAction);
        changeOrdersDetected++;

        await saveCollectionItem('agent_activities', {
          type: 'change_order_detected',
          title: `Endringsordre klargjort: ${proj.name}`,
          description: `Krav på kr ${Math.round(estimatedAmount).toLocaleString('no-NO')} eks mva registrert fra timeliste. Ligger i godkjenningskøen.`,
          projectId: te.projectId,
          projectName: proj.name,
          badge: 'PENGER SIKRET (NS 8406)',
          status: 'pending',
          createdAt: executedAt
        });
      }
    }
  }

  const updatedPending = await getPendingActions();

  console.log(`✅ [Autonomy Cycle] Fullført: ${weatherAlertsCreated} værvarsler, ${dailyLogsDrafted} dagbok-utkast, ${dailyLogsAutoApproved} auto-arkivert, ${changeOrdersDetected} endringsordrer funnet.`);

  return {
    executedAt,
    weatherChecksCount: weatherStatuses.length,
    weatherAlertsCreated,
    dailyLogsDrafted,
    dailyLogsAutoApproved,
    changeOrdersDetected,
    pendingActionsTotal: updatedPending.length
  };
}
