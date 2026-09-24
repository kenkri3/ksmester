import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const models = [
    { id: 'deepseek-flash', object: 'model', created: 1770000000, owned_by: 'deepseek' },
    { id: 'deepseek-v4-pro', object: 'model', created: 1770000000, owned_by: 'deepseek' },
    { id: 'deepseek-chat', object: 'model', created: 1770000000, owned_by: 'deepseek' },
    { id: 'deepseek-reasoner', object: 'model', created: 1770000000, owned_by: 'deepseek' },
    { id: 'gemini-3.8-flash', object: 'model', created: 1770000000, owned_by: 'google' },
    { id: 'gemini-3.5-flash', object: 'model', created: 1770000000, owned_by: 'google' },
    { id: 'gemini-3.1-pro-preview', object: 'model', created: 1770000000, owned_by: 'google' },
    { id: 'gemini-2.5-flash', object: 'model', created: 1770000000, owned_by: 'google' },
    { id: 'gemini-2.5-pro', object: 'model', created: 1770000000, owned_by: 'google' },
    { id: 'claude-3-7-sonnet', object: 'model', created: 1770000000, owned_by: 'anthropic' },
    { id: 'claude-3-5-sonnet', object: 'model', created: 1770000000, owned_by: 'anthropic' },
    { id: 'o3-mini', object: 'model', created: 1770000000, owned_by: 'openai' },
    { id: 'gpt-4o', object: 'model', created: 1770000000, owned_by: 'openai' },
    { id: 'gpt-4o-mini', object: 'model', created: 1770000000, owned_by: 'openai' }
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
