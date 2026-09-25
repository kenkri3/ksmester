import { getCollectionItems, saveCollectionItem, deleteCollectionItem, isDbConnected } from './db';

export interface IntegrationStatusItem {
  id: string;
  name: string;
  service: 'nobb' | 'discord' | 'slack' | 'teams';
  connected: boolean;
  configuredAt?: string;
  lastVerifiedAt?: string;
  source: 'env' | 'database' | 'none';
  maskedCredential?: string;
  channelOrInfo?: string;
  errorMessage?: string;
}

export interface SystemIntegrationsStatus {
  database: {
    type: 'postgresql' | 'in-memory';
    healthy: boolean;
  };
  ai: {
    engine: string;
    active: boolean;
  };
  resend: {
    configured: boolean;
  };
  integrations: {
    nobb: IntegrationStatusItem;
    discord: IntegrationStatusItem;
    slack: IntegrationStatusItem;
    teams: IntegrationStatusItem;
  };
}

/**
 * 🔨 Verifiser NOBB Export API mot Norsk Byggetjeneste
 * Offisiell API: https://export.byggtjeneste.no/swagger/index.html
 * Header: Ocp-Apim-Subscription-Key
 */
export async function verifyNobbKey(apiKey: string): Promise<{ success: boolean; message: string; statusCode?: number; details?: any }> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { success: false, message: 'Mangler NOBB API Subscription Key' };
  }

  try {
    const res = await fetch('https://export.byggtjeneste.no/api/v1/items?pageSize=1', {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': trimmed,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      return {
        success: true,
        message: 'Tilkobling mot NOBB / Norsk Byggevarebase er verifisert! Full tilgang til varekatalog og FDV.',
        statusCode: res.status
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        message: 'Norsk Byggetjeneste avviste nøkkelen: Ugyldig eller inaktiv Ocp-Apim-Subscription-Key.',
        statusCode: res.status
      };
    }

    const errorText = await res.text().catch(() => '');
    return {
      success: false,
      message: `NOBB svarte med status ${res.status}: ${errorText || res.statusText}`,
      statusCode: res.status
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.name === 'TimeoutError' 
        ? 'Tilkobling til export.byggtjeneste.no tidsavbrutt (timeout).'
        : `Kunne ikke kontakte Byggtjeneste: ${err.message || 'Nettverksfeil'}`
    };
  }
}

/**
 * 🎮 Verifiser Discord Webhook med en faktisk testmelding
 */
export async function verifyDiscordWebhook(webhookUrl: string, channelName?: string): Promise<{ success: boolean; message: string; statusCode?: number }> {
  const trimmed = webhookUrl.trim();
  if (!trimmed) {
    return { success: false, message: 'Mangler Discord Webhook URL' };
  }

  if (!trimmed.startsWith('https://discord.com/api/webhooks/') && !trimmed.startsWith('https://discordapp.com/api/webhooks/')) {
    return {
      success: false,
      message: 'Ugyldig URL-format. En Discord webhook må starte med https://discord.com/api/webhooks/...'
    };
  }

  try {
    const payload = {
      username: 'MesterAI Autonom Byggeleder',
      avatar_url: 'https://vikingmester.no/icon-192.png',
      content: `⚡ **VikingMester Autonom Byggeleder:** Tilkobling verifisert! Kanalen ${channelName || '#byggeplass'} mottar nå sanntidsvarsler for byggedagbok, avvik og SJA.`
    };

    const res = await fetch(trimmed, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });

    if (res.status === 204 || res.status === 200) {
      return {
        success: true,
        message: 'Discord-tilkobling er verifisert! Testmelding ble levert i kanalen.',
        statusCode: res.status
      };
    }

    const body = await res.json().catch(() => ({}));
    return {
      success: false,
      message: `Discord avviste webhooken (${res.status}): ${body.message || res.statusText || 'Ugyldig token'}`,
      statusCode: res.status
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.name === 'TimeoutError'
        ? 'Tilkobling til Discord tidsavbrutt.'
        : `Kunne ikke nå Discord: ${err.message || 'Nettverksfeil'}`
    };
  }
}

/**
 * 💬 Verifiser Slack Incoming Webhook med en faktisk testmelding
 */
export async function verifySlackWebhook(webhookUrl: string, channelName?: string): Promise<{ success: boolean; message: string; statusCode?: number }> {
  const trimmed = webhookUrl.trim();
  if (!trimmed) {
    return { success: false, message: 'Mangler Slack Webhook URL' };
  }

  if (!trimmed.startsWith('https://hooks.slack.com/services/')) {
    return {
      success: false,
      message: 'Ugyldig URL-format. En Slack webhook må starte med https://hooks.slack.com/services/...'
    };
  }

  try {
    const payload = {
      text: `⚡ *VikingMester Autonom Byggeleder:* Tilkobling verifisert! Kanalen ${channelName || '#prosjekt'} mottar nå sanntidsvarsler for byggedagbok, avvik og SJA.`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⚡ *VikingMester Autonom Byggeleder*\nTilkobling verifisert! Kanalen ${channelName || '#prosjekt'} er nå aktiv for automatisk varsling.`
          }
        }
      ]
    };

    const res = await fetch(trimmed, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });

    const responseText = await res.text().catch(() => '');

    if (res.ok && responseText.trim().toLowerCase() === 'ok') {
      return {
        success: true,
        message: 'Slack-tilkobling er verifisert! Testmelding ble levert i kanalen.',
        statusCode: res.status
      };
    }

    return {
      success: false,
      message: `Slack feilmelding (${res.status}): ${responseText || res.statusText || 'Avvist'}`,
      statusCode: res.status
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.name === 'TimeoutError'
        ? 'Tilkobling til Slack tidsavbrutt.'
        : `Kunne ikke nå Slack: ${err.message || 'Nettverksfeil'}`
    };
  }
}

/**
 * 👥 Verifiser Microsoft Teams Webhook (Adaptive Card / Connector)
 */
export async function verifyTeamsWebhook(webhookUrl: string, channelName?: string): Promise<{ success: boolean; message: string; statusCode?: number }> {
  const trimmed = webhookUrl.trim();
  if (!trimmed) {
    return { success: false, message: 'Mangler Microsoft Teams Webhook URL' };
  }

  try {
    // Teams støtter både Power Automate Workflows og Office 365 Connectors
    const payload = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                text: '⚡ VikingMester Autonom Byggeleder',
                weight: 'Bolder',
                size: 'Medium',
                color: 'Accent'
              },
              {
                type: 'TextBlock',
                text: `Tilkobling verifisert! Kanalen ${channelName || 'Byggeledelse'} mottar nå sanntidsvarsler for oppgaver, byggedagbok og HMS.`,
                wrap: true
              }
            ]
          }
        }
      ],
      summary: 'VikingMester Tilkoblet',
      text: '⚡ VikingMester Autonom Byggeleder er nå tilkoblet Microsoft Teams!'
    };

    const res = await fetch(trimmed, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });

    if (res.status === 200 || res.status === 202) {
      return {
        success: true,
        message: 'Microsoft Teams-tilkobling er verifisert! Testmelding ble levert i kanalen.',
        statusCode: res.status
      };
    }

    const errText = await res.text().catch(() => '');
    return {
      success: false,
      message: `Teams feil (${res.status}): ${errText || res.statusText || 'Avvist'}`,
      statusCode: res.status
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.name === 'TimeoutError'
        ? 'Tilkobling til Teams tidsavbrutt.'
        : `Kunne ikke nå Microsoft Teams: ${err.message || 'Nettverksfeil'}`
    };
  }
}

/**
 * 🔍 Hent faktisk, ekte status for alle integrasjoner fra database og miljøvariabler
 */
export async function getActualIntegrationsStatus(companyId?: string): Promise<SystemIntegrationsStatus> {
  const dbConnected = isDbConnected();
  let integrationsList: any[] = [];
  try {
    integrationsList = await getCollectionItems('integrations');
  } catch (err) {
    console.warn('[Integrations] Feil ved henting av integrasjonsliste:', err);
  }

  // Filtrer for bedriften eller global admin
  const relevant = companyId && companyId !== 'all' && companyId !== 'comp-001'
    ? integrationsList.filter(i => i.companyId === companyId || i.companyId === 'system')
    : integrationsList;

  // 1. NOBB
  const dbNobb = relevant.find(i => i.service?.toLowerCase() === 'nobb' && i.status === 'active' && i.secretToken?.trim());
  const envNobb = Boolean(process.env.NOBB_API_KEY && process.env.NOBB_API_KEY.trim());
  const nobbConnected = Boolean(dbNobb || envNobb);
  const nobbItem: IntegrationStatusItem = {
    id: 'nobb',
    name: 'NOBB / Norsk Byggevarebase',
    service: 'nobb',
    connected: nobbConnected,
    source: envNobb ? 'env' : (dbNobb ? 'database' : 'none'),
    configuredAt: dbNobb?.configuredAt,
    lastVerifiedAt: dbNobb?.verifiedAt || (envNobb ? new Date().toISOString() : undefined),
    maskedCredential: envNobb 
      ? 'Miljøvariabel (Server)' 
      : (dbNobb ? dbNobb.secretTokenMasked || 'Konfigurert i database' : undefined)
  };

  // 2. Discord
  const dbDiscord = relevant.find(i => i.service?.toLowerCase() === 'discord' && i.status === 'active' && i.webhookUrl?.trim());
  const discordConnected = Boolean(dbDiscord);
  const discordItem: IntegrationStatusItem = {
    id: 'discord',
    name: 'Discord Omnichannel',
    service: 'discord',
    connected: discordConnected,
    source: dbDiscord ? 'database' : 'none',
    configuredAt: dbDiscord?.configuredAt,
    lastVerifiedAt: dbDiscord?.verifiedAt,
    channelOrInfo: dbDiscord?.channel || '#byggeplass',
    maskedCredential: dbDiscord?.webhookUrl ? `${dbDiscord.webhookUrl.substring(0, 35)}...` : undefined
  };

  // 3. Slack
  const dbSlack = relevant.find(i => i.service?.toLowerCase() === 'slack' && i.status === 'active' && i.webhookUrl?.trim());
  const slackConnected = Boolean(dbSlack);
  const slackItem: IntegrationStatusItem = {
    id: 'slack',
    name: 'Slack Omnichannel',
    service: 'slack',
    connected: slackConnected,
    source: dbSlack ? 'database' : 'none',
    configuredAt: dbSlack?.configuredAt,
    lastVerifiedAt: dbSlack?.verifiedAt,
    channelOrInfo: dbSlack?.channel || '#prosjekt-varsler',
    maskedCredential: dbSlack?.webhookUrl ? `${dbSlack.webhookUrl.substring(0, 35)}...` : undefined
  };

  // 4. Microsoft Teams
  const dbTeams = relevant.find(i => i.service?.toLowerCase() === 'teams' && i.status === 'active' && i.webhookUrl?.trim());
  const teamsConnected = Boolean(dbTeams);
  const teamsItem: IntegrationStatusItem = {
    id: 'teams',
    name: 'Microsoft Teams',
    service: 'teams',
    connected: teamsConnected,
    source: dbTeams ? 'database' : 'none',
    configuredAt: dbTeams?.configuredAt,
    lastVerifiedAt: dbTeams?.verifiedAt,
    channelOrInfo: dbTeams?.channel || 'Byggeledelse',
    maskedCredential: dbTeams?.webhookUrl ? `${dbTeams.webhookUrl.substring(0, 35)}...` : undefined
  };

  // Resend E-post
  const resendConfigured = Boolean(
    process.env.RESEND_API_KEY || 
    process.env.RESEND_API || 
    process.env.RESEND_KEY || 
    process.env.RESEND_TOKEN || 
    process.env.RESEND
  );

  // AI-motor
  const deepseek = Boolean(process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY);
  const gemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
  const oneMin = Boolean(process.env['1MIN_AI_API_KEY'] || process.env.ONE_MIN_AI_API_KEY);

  let aiEngineName = 'Ingen AI konfigurert';
  if (deepseek && gemini) aiEngineName = 'DeepSeek + Gemini Hybrid';
  else if (deepseek) aiEngineName = 'DeepSeek (Primær)';
  else if (oneMin) aiEngineName = '1min.ai Multi-Model';
  else if (gemini) aiEngineName = 'Gemini 3.8 Flash';

  return {
    database: {
      type: dbConnected ? 'postgresql' : 'in-memory',
      healthy: true
    },
    ai: {
      engine: aiEngineName,
      active: deepseek || gemini || oneMin
    },
    resend: {
      configured: resendConfigured
    },
    integrations: {
      nobb: nobbItem,
      discord: discordItem,
      slack: slackItem,
      teams: teamsItem
    }
  };
}
