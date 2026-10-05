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
  // SIKKERHETSFIKS (E-05): Serveren krever na et reelt prosjekttoken i stedet for
  // den usignerte literaren 'x-portal-access: true'. Tokenet hentes fra samme URL
  // som kundeportalen selv bruker: /?portal=<portalToken|prosjekt-id>,
  // /?portalToken=... eller /portal/<id>. Finnes det ingen token, sendes ingen
  // portal-header, og serveren krever vanlig innlogging.
  const portalToken = (() => {
    if (typeof window === 'undefined') return '';
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('portal') || params.get('portalToken') || '';
      if (fromQuery) return fromQuery.trim();
      const parts = window.location.pathname.split('/').filter(Boolean);
      return parts[0] === 'portal' && parts[1] ? parts[1].trim() : '';
    } catch {
      return '';
    }
  })();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
    headers['x-portal-token'] = portalToken;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(options),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'AI-generering feilet på serveren');
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('AI-analysen tok for lang tid (timeout etter 45 sekunder). Vennligst prøv igjen med et komprimert bilde.');
    }
    throw err;
  }
}
