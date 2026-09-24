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
  thoughtSteps?: Array<{
    title: string;
    status: 'completed' | 'active' | 'pending';
    detail?: string;
  }>;
  thinkingDuration?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectName?: string;
  messages: ChatMessageItem[];
  isPinned?: boolean;
}

export function getActiveTenantScope(): string {
  if (typeof window === 'undefined') return 'comp-001';
  try {
    const impersonated = localStorage.getItem('impersonatedCompanyId');
    if (impersonated && impersonated.trim()) {
      return impersonated.trim();
    }
    const userRaw = localStorage.getItem('ks_current_user');
    if (userRaw) {
      const u = JSON.parse(userRaw);
      if (u.companyId && u.companyId.trim()) {
        return u.companyId.trim();
      }
    }
  } catch {}
  return 'comp-001';
}

const getStorageKey = (scope: string = getActiveTenantScope()): string => {
  if (scope === 'comp-001' || scope === 'default') {
    return 'mester_chat_sessions_v1';
  }
  return `mester_chat_sessions_v1_${scope}`;
};

const getActiveSessionKey = (scope: string = getActiveTenantScope()): string => {
  if (scope === 'comp-001' || scope === 'default') {
    return 'mester_active_session_id';
  }
  return `mester_active_session_id_${scope}`;
};

export const DEMO_FJELLHEIM_SESSION: ChatSession = {
  id: 'session_demo_fjellheim_01',
  title: 'Oppstart: Hytte Sjusjøen - Nybygg',
  createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  updatedAt: new Date().toISOString(),
  projectId: 'proj-demo-sjusjoen',
  projectName: 'Hytte Sjusjøen - Nybygg',
  messages: [
    {
      id: 'msg-demo-1',
      role: 'user',
      content: 'Hei MesterAI! Vi rigger byggeplass på Birkebeinervegen 42 på Sjusjøen neste uke for hytte-nybygget. Hvilke spesielle snølast- og vindkrav gjelder for takstolene i dette området?',
      timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
      id: 'msg-demo-2',
      role: 'assistant',
      content: `### 🏔️ Prosjekt: Hytte Sjusjøen (Birkebeinervegen 42, 900 moh)

Hei Lars! For Sjusjøen i Ringsaker kommune gjelder skjerpede krav i henhold til **NS-EN 1991-1-3 (Eurokode 1) med nasjonalt anneks NA** og **TEK17 § 10-1**:

1. **Snølast på mark (\\(s_k\\)):**
   - Grunnverdi for Ringsaker kommune er **4,5 kN/m²**.
   - Fordi tomten ligger ca. **900 moh** (over referansehøyden på 500 moh), legges det til høydekorreksjon på ca. 2,0 kN/m².
   - **Dimensjonerende snølast på mark:** Minimum **6,5 kN/m²**. Takstolene må bestilles med dokumentert beregning for dette.

2. **Vind- og forankringskrav:**
   - Terrengformklasse for høyfjell/åpent landskap.
   - Alle gavlvegger og takstoler må forankres med godkjente vinkelbeslag og forankringsjern ned i ringmur/såle iht. Byggforsk 525.101.

3. **Anbefalt neste steg:**
   - Gjennomføre **SJA for heisekran og takstolmontasje** før kranbil ankommer på mandag.
   - Kontrollere at fuktsperre og vindsperre tilfredsstiller Sd-verdier for fjellklima.

Vil du at jeg skal klargjøre en digital **Sikker Jobb Analyse (SJA)** for takstolheisingen nå?`,
      timestamp: new Date(Date.now() - 3600000 * 2 + 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        {
          id: 'act-sja-takstol',
          type: 'sja',
          label: 'Opprett SJA: Takstolmontasje med kranbil',
          prompt: 'Opprett en fullverdig SJA for takstolmontasje med mobilkran på Birkebeinervegen 42'
        },
        {
          id: 'act-byggedagbok-sjusjoen',
          type: 'form',
          label: 'Før byggedagbok: Rigg og sikring',
          prompt: 'Før dagbok for rigg av byggeplass på Sjusjøen'
        }
      ]
    }
  ]
};

class ChatSessionService {
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify() {
    this.listeners.forEach(fn => fn());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mester_chat_sessions_changed'));
    }
  }

  public getSessions(explicitScope?: string): ChatSession[] {
    if (typeof window === 'undefined') return [];
    try {
      const scope = explicitScope || getActiveTenantScope();
      const storageKey = getStorageKey(scope);
      const raw = localStorage.getItem(storageKey);
      
      if (!raw) {
        // Init demo session for demo customer if storage is clean
        if (scope === 'comp-demo-fjellheim') {
          const initList = [DEMO_FJELLHEIM_SESSION];
          localStorage.setItem(storageKey, JSON.stringify(initList));
          localStorage.setItem(getActiveSessionKey(scope), DEMO_FJELLHEIM_SESSION.id);
          return initList;
        }
        return [];
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }
    } catch (e) {
      console.warn('Could not parse chat sessions:', e);
    }
    return [];
  }

  public getActiveSessionId(explicitScope?: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const scope = explicitScope || getActiveTenantScope();
      const activeKey = getActiveSessionKey(scope);
      const existing = localStorage.getItem(activeKey);
      if (existing) return existing;

      if (scope === 'comp-demo-fjellheim') {
        return DEMO_FJELLHEIM_SESSION.id;
      }
      return null;
    } catch {
      return null;
    }
  }

  public setActiveSessionId(id: string, explicitScope?: string) {
    if (typeof window === 'undefined') return;
    try {
      const scope = explicitScope || getActiveTenantScope();
      localStorage.setItem(getActiveSessionKey(scope), id);
      this.notify();
    } catch (e) {
      console.warn('Could not set active session ID:', e);
    }
  }

  public getActiveSession(explicitScope?: string): ChatSession | null {
    const sessions = this.getSessions(explicitScope);
    if (sessions.length === 0) return null;
    const activeId = this.getActiveSessionId(explicitScope);
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
  }, explicitScope?: string): ChatSession {
    const scope = explicitScope || getActiveTenantScope();
    const storageKey = getStorageKey(scope);
    const activeKey = getActiveSessionKey(scope);
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

    const sessions = this.getSessions(scope);
    const updated = [newSession, ...sessions];

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
        localStorage.setItem(activeKey, newSession.id);
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
    options?: { autoTitle?: boolean; projectName?: string; projectId?: string },
    explicitScope?: string
  ) {
    if (typeof window === 'undefined' || !sessionId) return;
    const scope = explicitScope || getActiveTenantScope();
    const storageKey = getStorageKey(scope);
    const sessions = this.getSessions(scope);
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
      localStorage.setItem(storageKey, JSON.stringify(sessions));
      this.notify();
    } catch (e) {
      console.warn('Could not persist session messages:', e);
    }
  }

  public deleteSession(sessionId: string, explicitScope?: string): ChatSession | null {
    if (typeof window === 'undefined') return null;
    const scope = explicitScope || getActiveTenantScope();
    const storageKey = getStorageKey(scope);
    const activeKey = getActiveSessionKey(scope);
    const sessions = this.getSessions(scope);
    const filtered = sessions.filter(s => s.id !== sessionId);

    try {
      localStorage.setItem(storageKey, JSON.stringify(filtered));
      const activeId = this.getActiveSessionId(scope);
      if (activeId === sessionId) {
        const nextActive = filtered[0] || null;
        if (nextActive) {
          localStorage.setItem(activeKey, nextActive.id);
        } else {
          localStorage.removeItem(activeKey);
        }
      }
      this.notify();
      return filtered[0] || null;
    } catch (e) {
      console.warn('Could not delete session:', e);
      return null;
    }
  }

  public renameSession(sessionId: string, newTitle: string, explicitScope?: string) {
    if (typeof window === 'undefined' || !newTitle.trim()) return;
    const scope = explicitScope || getActiveTenantScope();
    const storageKey = getStorageKey(scope);
    const sessions = this.getSessions(scope);
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      sessions[index].title = newTitle.trim();
      sessions[index].updatedAt = new Date().toISOString();
      try {
        localStorage.setItem(storageKey, JSON.stringify(sessions));
        this.notify();
      } catch (e) {
        console.warn('Could not rename session:', e);
      }
    }
  }

  public togglePinSession(sessionId: string, explicitScope?: string): boolean {
    if (typeof window === 'undefined' || !sessionId) return false;
    const scope = explicitScope || getActiveTenantScope();
    const storageKey = getStorageKey(scope);
    const sessions = this.getSessions(scope);
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index === -1) return false;

    const nextPinned = !sessions[index].isPinned;
    sessions[index].isPinned = nextPinned;
    sessions[index].updatedAt = new Date().toISOString();

    try {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
      this.notify();
    } catch (e) {
      console.warn('Could not toggle pin on session:', e);
    }
    return nextPinned;
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
    pinned: ChatSession[];
    today: ChatSession[];
    last7Days: ChatSession[];
    older: ChatSession[];
  } {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

    const pinned: ChatSession[] = [];
    const today: ChatSession[] = [];
    const last7Days: ChatSession[] = [];
    const older: ChatSession[] = [];

    sessions.forEach(s => {
      if (s.isPinned) {
        pinned.push(s);
        return;
      }
      const time = new Date(s.updatedAt || s.createdAt).getTime();
      if (time >= startOfToday) {
        today.push(s);
      } else if (time >= sevenDaysAgo) {
        last7Days.push(s);
      } else {
        older.push(s);
      }
    });

    return { pinned, today, last7Days, older };
  }
}

export const chatSessionService = new ChatSessionService();
