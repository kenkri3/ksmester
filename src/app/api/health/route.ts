import { NextResponse } from 'next/server';
import { isDbConnected } from '@/src/lib/server/db';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    framework: 'next.js',
    database: isDbConnected() ? 'postgresql' : 'in-memory',
    renderReady: true,
    nobbConfigured: !!process.env.NOBB_API_KEY,
    firecrawlConfigured: !!process.env.FIRECRAWL_API_KEY
  });
}
