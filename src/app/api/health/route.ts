import { NextResponse } from 'next/server';
import { dbQuery, isDbConnected } from '@/src/lib/server/db';
import { get1MinAiKey } from '@/src/lib/server/aiEngine';

export async function GET() {
  const oneMinAiKey = get1MinAiKey();
  const oneMinAiConfigured = !!oneMinAiKey;
  const geminiConfigured = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
  const deepseekConfigured = !!(process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY);
  const resendConfigured = !!(
    process.env.RESEND_API_KEY || 
    process.env.RESEND_API || 
    process.env.RESEND_KEY || 
    process.env.RESEND_TOKEN || 
    process.env.RESEND || 
    process.env.RESEND_APIKEY
  );

  let dbHealthy = false;

  if (process.env.DATABASE_URL) {
    try {
      const result = await dbQuery('SELECT 1');
      dbHealthy = result && result.length > 0;
    } catch (e) {
      dbHealthy = false;
    }
  } else {
    // If no DATABASE_URL is configured, consider in-memory "healthy" for local dev
    dbHealthy = true;
  }

  const isHealthy = dbHealthy;

  return NextResponse.json({
    status: isHealthy ? 'ok' : 'error',
    framework: 'next.js',
    database: isDbConnected() ? 'postgresql' : 'in-memory',
    databaseHealthy: dbHealthy,
    renderReady: true,
    hosting: 'Railway',
    region: 'europe-west3 (Frankfurt)',
    nobbConfigured: !!process.env.NOBB_API_KEY,
    resendConfigured,
    scraperActive: true,
    firecrawlConfigured: false,
    nativeScraper: true,
    oneMinAiConfigured,
    geminiConfigured,
    deepseekConfigured,
    aiEngine: oneMinAiConfigured ? '1min.ai (Primary)' : (geminiConfigured ? 'Gemini (Backup)' : (deepseekConfigured ? 'DeepSeek (Backup)' : 'none')),
    aiModel: oneMinAiConfigured ? 'Multi-Model (gpt-4o-mini / claude-3-5-sonnet / gemini-2.5-flash)' : (geminiConfigured ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash') : (deepseekConfigured ? 'deepseek-chat' : 'none')),
    timestamp: new Date().toISOString()
  }, { status: isHealthy ? 200 : 503 });
}
