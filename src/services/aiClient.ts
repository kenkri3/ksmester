// Server-proxy AI client keeping DEEP_SEEK_API 100% server-side with token caching
export interface GenerateAiOptions {
  prompt?: string;
  contents?: any;
  model?: 'deepseek-chat' | 'deepseek-reasoner' | string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  images?: any[];
  inlineData?: any;
  forceRefresh?: boolean;
}

export async function generateAiContent(options: GenerateAiOptions): Promise<{ text: string }> {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(options)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'AI-generering feilet på serveren');
  }

  return await res.json();
}
