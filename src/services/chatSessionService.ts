export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedActions?: Array<{
    id: string;
    type: string;
    label: string;
    title?: string;
    data?: any;
    prompt?: string;
  }>;
  followUpPrompts?: string[];
  quickReplies?: Array<{ title: string; payload: string }>;
  imageUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectName?: string;
  messages: ChatMessageItem[];
}

const STORAGE_KEY = 'mester_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'mester_active_session_id';

class ChatSessionService {
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mester_chat_sessions_changed'));
    }
  }

  public getSessions(): ChatSession[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }
    } catch (e) {
      console.warn('Could not parse chat sessions:', e);
    }
    return [];
  }

  public getActiveSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(ACTIVE_SESSION_KEY);
    } catch {
      return null;
    }
  }

  public setActiveSessionId(id: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, id);
      this.notify();
    } catch (e) {
      console.warn('Could not set active session ID:', e);
    }
  }

  public getActiveSession(): ChatSession | null {
    const sessions = this.getSessions();
    if (sessions.length === 0) return null;
    const activeId = this.getActiveSessionId();
    if (activeId) {
      const found = sessions.find(s => s.id === activeId);
      if (found) return found;
    }
    return sessions[0] || null;
  }

  public createSession(options?: {
    projectId?: string;
    projectName?: string;
    title?: string;
    initialMessages?: ChatMessageItem[];
  }): ChatSession {
    const now = new Date().toISOString();
    const newSession: ChatSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: options?.title || (options?.projectName ? `Oppgave: ${options.projectName}` : 'Ny samtale'),
      createdAt: now,
      updatedAt: now,
      projectId: options?.projectId,
      projectName: options?.projectName,
      messages: options?.initialMessages || []
    };

    const sessions = this.getSessions();
    const updated = [newSession, ...sessions];

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem(ACTIVE_SESSION_KEY, newSession.id);
      } catch (e) {
        console.warn('Could not save new chat session:', e);
      }
    }

    this.notify();
    return newSession;
  }

  public saveSessionMessages(
    sessionId: string,
    messages: ChatMessageItem[],
    options?: { autoTitle?: boolean; projectName?: string; projectId?: string }
  ) {
    if (typeof window === 'undefined' || !sessionId) return;
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    const now = new Date().toISOString();

    if (index === -1) {
      // Opprett hvis den ikke fantes
      const newSession: ChatSession = {
        id: sessionId,
        title: 'Ny samtale',
        createdAt: now,
        updatedAt: now,
        projectId: options?.projectId,
        projectName: options?.projectName,
        messages
      };
      if (options?.autoTitle) {
        newSession.title = this.deriveSmartTitle(messages, options.projectName);
      }
      sessions.unshift(newSession);
    } else {
      const target = { ...sessions[index] };
      target.messages = messages;
      target.updatedAt = now;
      if (options?.projectName) target.projectName = options.projectName;
      if (options?.projectId) target.projectId = options.projectId;

      if (
        options?.autoTitle &&
        (target.title === 'Ny samtale' || target.title.startsWith('Oppgave:'))
      ) {
        target.title = this.deriveSmartTitle(messages, target.projectName);
      }
      sessions[index] = target;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      this.notify();
    } catch (e) {
      console.warn('Could not persist session messages:', e);
    }
  }

  public deleteSession(sessionId: string): ChatSession | null {
    if (typeof window === 'undefined') return null;
    const sessions = this.getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      const activeId = this.getActiveSessionId();
      if (activeId === sessionId) {
        const nextActive = filtered[0] || null;
        if (nextActive) {
          localStorage.setItem(ACTIVE_SESSION_KEY, nextActive.id);
        } else {
          localStorage.removeItem(ACTIVE_SESSION_KEY);
        }
      }
      this.notify();
      return filtered[0] || null;
    } catch (e) {
      console.warn('Could not delete session:', e);
      return null;
    }
  }

  public renameSession(sessionId: string, newTitle: string) {
    if (typeof window === 'undefined' || !newTitle.trim()) return;
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      sessions[index].title = newTitle.trim();
      sessions[index].updatedAt = new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        this.notify();
      } catch (e) {
        console.warn('Could not rename session:', e);
      }
    }
  }

  public deriveSmartTitle(messages: ChatMessageItem[], projectName?: string): string {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (!firstUserMsg || !firstUserMsg.content) {
      return projectName ? `${projectName}` : 'Ny samtale';
    }

    const clean = firstUserMsg.content
      .replace(/^📸\s*Bilde lastet opp.*$/im, '')
      .replace(/[*_#`~>]/g, '')
      .trim();

    if (!clean) return projectName ? `Bildeanalyse - ${projectName}` : 'Bildeanalyse';

    const firstLine = clean.split('\n')[0].trim();
    let title = firstLine;
    if (title.length > 38) {
      title = title.substring(0, 36) + '...';
    }
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  public groupSessions(sessions: ChatSession[]): {
    today: ChatSession[];
    last7Days: ChatSession[];
    older: ChatSession[];
  } {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

    const today: ChatSession[] = [];
    const last7Days: ChatSession[] = [];
    const older: ChatSession[] = [];

    sessions.forEach(s => {
      const time = new Date(s.updatedAt || s.createdAt).getTime();
      if (time >= startOfToday) {
        today.push(s);
      } else if (time >= sevenDaysAgo) {
        last7Days.push(s);
      } else {
        older.push(s);
      }
    });

    return { today, last7Days, older };
  }
}

export const chatSessionService = new ChatSessionService();
