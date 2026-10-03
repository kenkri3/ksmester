/**
 * 🌊 Strømmende MesterAI-klient.
 *
 * Sender `stream: true` til /api/agent/chat og rapporterer tekstbitene mens
 * modellen skriver. Faller automatisk tilbake til vanlig JSON dersom serveren
 * svarer med JSON i stedet for Server-Sent Events (eldre deploy, proxy eller
 * feilrespons) – da får kalleren hele svaret i én bit, akkurat som før.
 */

export interface StreamChatQuickReply {
  title: string;
  payload: string;
}

export interface StreamChatResult {
  reply: string;
  quickReplies?: StreamChatQuickReply[];
  /**
   * Øvrige felt sendes uendret videre fra serveren. De tidlige returveiene i
   * /api/agent/chat (direkte timeføring og avviksregistrering) svarer med
   * vanlig JSON som inneholder bl.a. `timeEntry` og `deviation`, og de må
   * fortsatt nå klienten selv om chatten ellers strømmer.
   */
  [key: string]: any;
}

export interface StreamChatHandlers {
  /** Kalles med hver tekstbit etter hvert som den kommer fra serveren. */
  onDelta?: (chunk: string) => void;
}

export async function streamAgentChat(
  payload: Record<string, any>,
  token: string | null,
  handlers: StreamChatHandlers = {}
): Promise<StreamChatResult> {
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ ...payload, stream: true })
  });

  if (!res.ok) {
    throw new Error(`Agent-API svarte med status ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';

  // Fallback: serveren svarte med vanlig JSON.
  if (!contentType.includes('text/event-stream') || !res.body) {
    const data = await res.json().catch(() => ({}));
    const reply: string = data?.reply || '';
    if (reply) handlers.onDelta?.(reply);
    return { ...data, reply, quickReplies: data?.quickReplies };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let finalReply = '';
  let quickReplies: StreamChatQuickReply[] | undefined;
  let doneEvent: any = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const eventText = line.slice(5).trim();
      if (!eventText) continue;
      try {
        const event = JSON.parse(eventText);
        if (typeof event?.delta === 'string' && event.delta) {
          accumulated += event.delta;
          handlers.onDelta?.(event.delta);
        }
        if (event?.done) {
          doneEvent = event;
          finalReply = typeof event.reply === 'string' && event.reply ? event.reply : accumulated;
          quickReplies = event.quickReplies;
        }
      } catch {
        // Ufullstendig linje – hopp over og les videre.
      }
    }
  }

  return { ...(doneEvent || {}), reply: finalReply || accumulated, quickReplies };
}