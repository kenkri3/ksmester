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
