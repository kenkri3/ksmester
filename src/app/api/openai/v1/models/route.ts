import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const models = [
    { id: 'gemini-3.8-flash', object: 'model', created: 1700000000, owned_by: '1min.ai' },
    { id: 'gemini-3.7-flash', object: 'model', created: 1700000000, owned_by: '1min.ai' },
    { id: 'gemini-3.6-flash', object: 'model', created: 1700000000, owned_by: '1min.ai' },
    { id: 'gemini-2.5-flash', object: 'model', created: 1700000000, owned_by: '1min.ai' },
    { id: 'gpt-4o-mini', object: 'model', created: 1700000000, owned_by: '1min.ai' },
    { id: 'gpt-4o', object: 'model', created: 1700000000, owned_by: '1min.ai' },
    { id: 'claude-3-5-sonnet', object: 'model', created: 1700000000, owned_by: '1min.ai' },
    { id: 'deepseek-chat', object: 'model', created: 1700000000, owned_by: '1min.ai' }
  ];

  return NextResponse.json(
    {
      object: 'list',
      data: models
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  });
}
