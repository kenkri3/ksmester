import { NextResponse } from 'next/server';
import { isDbConnected } from '@/src/lib/server/db';

export async function GET() {
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

  return NextResponse.json({
    status: 'ok',
    framework: 'next.js',
    database: isDbConnected() ? 'postgresql' : 'in-memory',
    renderReady: true,
    nobbConfigured: !!process.env.NOBB_API_KEY,
    resendConfigured,
    scraperActive: true,
    firecrawlConfigured: false,
    nativeScraper: true,
    geminiConfigured,
    deepseekConfigured,
    aiModel: geminiConfigured ? 'gemini-3.8-flash' : (deepseekConfigured ? 'deepseek-chat' : 'none'),
    timestamp: new Date().toISOString()
  });
}
