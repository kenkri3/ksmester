// Server-proxy AI client keeping GEMINI_API_KEY 100% server-side

export interface GenerateAiOptions {
  prompt?: string;
  contents?: any;
  model?: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  images?: any[];
  inlineData?: any;
  isPortal?: boolean;
  operation?: string;
  taskDescription?: string;
  weatherContext?: string;
}

export async function generateAiContent(options: GenerateAiOptions): Promise<{ text: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isPortal = options.isPortal || (typeof window !== 'undefined' && (
    window.location.search.includes('portal=') || 
    window.location.search.includes('offer=') || 
    window.location.search.includes('contract=')
  ));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (isPortal) {
    headers['x-portal-access'] = 'true';
  }

  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(options)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'AI-generering feilet på serveren');
  }

  return await res.json();
}
