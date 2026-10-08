import { NextResponse } from 'next/server';
import { dbQuery, isDbConnected } from '@/src/lib/server/db';
import { get1MinAiKey, getOpperKey } from '@/src/lib/server/aiEngine';

export async function GET() {
  const oneMinAiKey = get1MinAiKey();
  const oneMinAiConfigured = !!oneMinAiKey;
  const geminiConfigured = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
  const deepseekConfigured = !!(process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY);
  // 🛡️ EU-nøkkelen (Opper) styrer all behandling som kan inneholde
  // personopplysninger. Den rapporteres eksplisitt, slik at en manglende nøkkel
  // i produksjon er synlig fra utsiden istedenfor å vise seg som stille
  // fallback til en motor utenfor EU.
  const deepseekEuConfigured = !!getOpperKey();
  const resendConfigured = !!(
    process.env.RESEND_API_KEY || 
    process.env.RESEND_API || 
    process.env.RESEND_KEY || 
    process.env.RESEND_TOKEN || 
    process.env.RESEND || 
    process.env.RESEND_APIKEY
  );

  let dbHealthy = false;
  let dbReason = 'ok';

  if (process.env.DATABASE_URL) {
    try {
      const result = await dbQuery('SELECT 1');
      dbHealthy = result && result.length > 0;
      if (!dbHealthy) dbReason = 'database svarte ikke på SELECT 1';
    } catch (e) {
      dbHealthy = false;
      dbReason = 'databasefeil';
    }
  } else if (process.env.NODE_ENV === 'production') {
    // SIKKERHETSFIKS (O-04): uten DATABASE_URL går all data til minnelager og
    // forsvinner ved neste redeploy. Tidligere svarte helsesjekken 200 her, så
    // deployen så vellykket ut mens kundedata var i ferd med å gå tapt.
    // Nå feiler den synlig i produksjon: Railway stopper deployen og lar den
    // forrige, fungerende versjonen stå.
    dbHealthy = false;
    dbReason = 'DATABASE_URL er ikke satt – data ville gått tapt ved redeploy';
  } else {
    // Utvikling: lokal fillagring er tilsiktet.
    dbHealthy = true;
    dbReason = 'lokalt minnelager (kun utvikling)';
  }

  const isHealthy = dbHealthy;

  const { getActualIntegrationsStatus } = await import('@/src/lib/server/integrationsService');
  // SIKKERHETSFIKS (E-17): 'all' ma na være eksplisitt. Helse-ruten er en
  // server-side plattformsjekk og skal fortsatt se alle integrasjoner for a
  // kunne rapportere status, sa den ber om det med vilje.
  const actualStatus = await getActualIntegrationsStatus('all');

  return NextResponse.json({
    status: isHealthy ? 'ok' : 'error',
    framework: 'next.js',
    database: isDbConnected() ? 'postgresql' : 'in-memory',
    databaseHealthy: dbHealthy,
    // SIKKERHETSFIKS (O-04): si hvorfor databasen ikke er frisk. Uten dette så en
    // manglende DATABASE_URL og en reell databasefeil identiske ut.
    databaseStatus: dbReason,
    renderReady: true,
    hosting: 'Railway',
    region: 'EU West (Amsterdam, Netherlands)',
    nobbConfigured: actualStatus.integrations.nobb.connected,
    discordConfigured: actualStatus.integrations.discord.connected,
    slackConfigured: actualStatus.integrations.slack.connected,
    teamsConfigured: actualStatus.integrations.teams.connected,
    resendConfigured,
    scraperActive: true,
    firecrawlConfigured: false,
    nativeScraper: true,
    oneMinAiConfigured,
    geminiConfigured,
    // 🛡️ Sier om personopplysninger faktisk kan rutes til en EU-modell.
    // Er denne false i produksjon, gar personopplysninger til reservekjeden i
    // stedet - det skal være synlig, ikke noe man oppdager i ettertid.
    deepseekEuConfigured,
    aiEngine: deepseekEuConfigured
      ? 'DeepSeek V4.1 Flash (EU via Opper)'
      : (deepseekConfigured ? 'DeepSeek V3 (Primary)' : (oneMinAiConfigured ? '1min.ai (Primary)' : (geminiConfigured ? 'Gemini 2.5 Flash (Backup)' : 'none'))),
    aiModel: deepseekEuConfigured
      ? 'Personopplysninger: DeepSeek V4.1 Flash i EU/EOS (Opper). Øvrig tekst: DeepSeek direkte'
      : (deepseekConfigured ? 'deepseek-chat / deepseek-reasoner (Tekst) + gemini-2.5-flash (Vision)' : (oneMinAiConfigured ? 'Multi-Model (gpt-4o-mini / gemini-2.5-flash / o3-mini)' : (geminiConfigured ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash') : 'none'))),
    timestamp: new Date().toISOString()
  }, { status: isHealthy ? 200 : 503 });
}
