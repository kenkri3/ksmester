// Clean REST API client with full Offline-First caching & Auto-Sync Engine
import { toast } from 'sonner';

/**
 * SIKKERHETSFIKS (C-03): denne modulen brukes også fra server-kode
 * (projectDocumentationEngine m.fl.). I den konteksten er sonner-toasten en død
 * shim, og et kall kastet `TypeError: toast.info is not a function` — som så ble
 * fanget av en tom catch og skjulte det opprinnelige problemet. Alle varsler går
 * derfor gjennom denne hjelperen, som bare gjør noe i nettleseren og aldri kan
 * kaste.
 */
function notify(kind: 'info' | 'success' | 'error' | 'warning', message: string): void {
  if (typeof window === 'undefined') return;
  try {
    const fn = (toast as any)?.[kind];
    if (typeof fn === 'function') fn(message);
  } catch {
    /* et varsel skal aldri kunne velte en dataoperasjon */
  }
}

/**
 * SIKKERHETSFIKS (C-03): skiller en REELL nettverksfeil fra et avvist svar.
 *
 * Før behandlet klienten enhver ikke-ok respons (401, 403, 500) som en
 * nettverksfeil: den la skrivingen i offline-køen og viste en suksess-toast.
 * Dataene fantes da verken lokalt eller på serveren, og brukeren trodde det
 * var lagret. Feil skal feile ærlig.
 */
type FailureKind = 'offline' | 'auth' | 'server' | 'other';

function classifyFailure(err: unknown, res?: Response): FailureKind {
  if (res) {
    if (res.status === 401 || res.status === 403) return 'auth';
    if (res.status >= 500) return 'server';
    return 'other';
  }
  // Ingen respons: dette er en reell nettverksfeil (eller timeout), og den
  // eneste situasjonen der offline-køen faktisk er riktig å bruke.
  return 'offline';
}

export const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const impersonated = typeof window !== 'undefined' ? localStorage.getItem('impersonatedCompanyId') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(impersonated ? { 'x-impersonated-company-id': impersonated } : {})
  };
};

interface SyncQueueItem {
  queueId: string;
  type: 'ADD' | 'UPDATE' | 'DELETE';
  collectionName: string;
  id?: string;
  data?: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'ks_offline_sync_queue';
const CACHE_PREFIX = 'ks_cache_';

function getTenantCacheScope(): string {
  if (typeof window === 'undefined') return 'default';
  try {
    const impersonated = localStorage.getItem('impersonatedCompanyId');
    if (impersonated && impersonated.trim()) return `tenant_${impersonated.trim()}`;
    const userRaw = localStorage.getItem('ks_current_user');
    if (userRaw) {
      const u = JSON.parse(userRaw);
      if (u.companyId && u.companyId.trim()) return `tenant_${u.companyId.trim()}`;
    }
  } catch {}
  return 'default';
}

function getOfflineQueue(): SyncQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: SyncQueueItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('ks_queue_updated', { detail: { count: queue.length } }));
  } catch (e) {
    console.warn('Could not save sync queue to localStorage', e);
  }
}

export function getLocalCache<T = any>(collectionName: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const scope = getTenantCacheScope();
    const raw = localStorage.getItem(`${CACHE_PREFIX}${scope}_${collectionName}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setLocalCache<T = any>(collectionName: string, data: T[]) {
  if (typeof window === 'undefined') return;
  try {
    const scope = getTenantCacheScope();
    localStorage.setItem(`${CACHE_PREFIX}${scope}_${collectionName}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save local cache', e);
  }
}

let isSyncing = false;

export const api = {
  getLocalCache<T = any>(collectionName: string): T[] {
    return getLocalCache<T>(collectionName);
  },
  setLocalCache<T = any>(collectionName: string, data: T[]) {
    return setLocalCache<T>(collectionName, data);
  },
  // --- Auth ---
  async login(email: string, password?: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Innlogging feilet');
    if (data.token) localStorage.setItem('token', data.token);
    return data;
  },

  async register(data: { email: string; password?: string; name?: string; company?: string; orgnr?: string; role?: string; trade?: string; gdprConsent?: boolean; companyId?: string }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Registrering feilet');
    if (result.token) localStorage.setItem('token', result.token);
    return result;
  },

  async getMe() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return null;
    try {
      // FIX (11.09.2026): Uten timeout kunne dette kallet henge i det uendelige på dårlig
      // mobildekning på byggeplass, og hele appen ble stående bak innloggings-spinneren.
      const res = await fetch('/api/auth/me', {
        headers: getHeaders(),
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('localFallbackAuth');
  },

  // --- Collection Data with Offline First & Local Cache ---
  async getCollection<T = any>(collectionName: string, queryParams?: Record<string, string>): Promise<T[]> {
    const cached = getLocalCache<T>(collectionName);
    
    // If browser is offline and no specific queryParams, instantly return cached items
    if (typeof navigator !== 'undefined' && !navigator.onLine && !queryParams) {
      return cached;
    }

    try {
      const queryString = queryParams ? `?${new URLSearchParams(queryParams).toString()}` : '';
      const res = await fetch(`/api/data/${collectionName}${queryString}`, { 
        headers: getHeaders(),
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const fresh = await res.json();
        if (Array.isArray(fresh)) {
          if (!queryParams) {
            setLocalCache(collectionName, fresh);
          }
          return fresh;
        }
      }
      return cached;
    } catch (e) {
      console.warn(`[Offline Fallback] Returning cached data for ${collectionName}:`, e);
      return cached;
    }
  },

  async getDocs<T = any>(collectionName: string): Promise<T[]> {
    return (this as any).getCollection(collectionName) as Promise<T[]>;
  },

  async addDoc<T = any>(collectionName: string, data: any): Promise<T> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const generatedId = data.id || 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const itemWithId = { ...data, id: generatedId, createdAt: data.createdAt || new Date().toISOString() };

    // Update local cache optimistically
    const cached = getLocalCache(collectionName);
    const updated = [itemWithId, ...cached.filter((i: any) => i.id !== generatedId)];
    setLocalCache(collectionName, updated);

    if (!isOnline) {
      // Queue for background sync
      const queue = getOfflineQueue();
      queue.push({
        queueId: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: 'ADD',
        collectionName,
        data: itemWithId,
        timestamp: Date.now()
      });
      saveOfflineQueue(queue);
      notify('info', 'Du er offline. Endringen er lagret lokalt og synkroniseres når du får nett.');
      return itemWithId as T;
    }

    try {
      const res = await fetch(`/api/data/${collectionName}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(itemWithId)
      });

      // SIKKERHETSFIKS (C-03): ikke-ok respons er IKKE en nettverksfeil.
      if (!res.ok) {
        const kind = classifyFailure(null, res);
        if (kind === 'auth') {
          notify('error', 'Du er ikke innlogget, eller har ikke tilgang. Endringen er IKKE lagret.');
          throw new Error(`Lagring avvist av serveren (HTTP ${res.status}). Endringen er ikke lagret.`);
        }
        if (kind === 'server') {
          notify('error', `Serveren svarte med feil (HTTP ${res.status}). Endringen er IKKE lagret.`);
          throw new Error(`Serverfeil ved lagring (HTTP ${res.status}). Endringen er ikke lagret.`);
        }
        const body = await res.text().catch(() => '');
        notify('error', `Lagring feilet (HTTP ${res.status}). Endringen er IKKE lagret.`);
        throw new Error(`Lagring feilet (HTTP ${res.status})${body ? ': ' + body.slice(0, 200) : ''}`);
      }

      const saved = await res.json();
      return saved;
    } catch (e) {
      // Bare en reell nettverksfeil skal ende i offline-køen.
      if (classifyFailure(e) !== 'offline') {
        throw e;
      }
      const queue = getOfflineQueue();
      queue.push({
        queueId: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: 'ADD',
        collectionName,
        data: itemWithId,
        timestamp: Date.now()
      });
      saveOfflineQueue(queue);
      notify('info', 'Du er offline. Endringen er lagret lokalt og synkroniseres når du får nett.');
      return itemWithId as T;
    }
  },

  async updateDoc<T = any>(collectionName: string, id: string, data: any): Promise<T> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Update local cache optimistically
    const cached = getLocalCache(collectionName);
    const updated = cached.map((item: any) => item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item);
    setLocalCache(collectionName, updated);

    if (!isOnline) {
      const queue = getOfflineQueue();
      queue.push({
        queueId: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: 'UPDATE',
        collectionName,
        id,
        data,
        timestamp: Date.now()
      });
      saveOfflineQueue(queue);
      notify('info', 'Du er offline. Endringen er lagret lokalt og synkroniseres når du er på nett.');
      return { id, ...data } as T;
    }

    try {
      const res = await fetch(`/api/data/${collectionName}/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });

      // SIKKERHETSFIKS (C-03): samme skille som i addDoc.
      if (!res.ok) {
        const kind = classifyFailure(null, res);
        if (kind === 'auth') {
          notify('error', 'Du er ikke innlogget, eller har ikke tilgang. Endringen er IKKE lagret.');
          throw new Error(`Endring avvist av serveren (HTTP ${res.status}). Endringen er ikke lagret.`);
        }
        if (kind === 'server') {
          notify('error', `Serveren svarte med feil (HTTP ${res.status}). Endringen er IKKE lagret.`);
          throw new Error(`Serverfeil ved endring (HTTP ${res.status}). Endringen er ikke lagret.`);
        }
        notify('error', `Endring feilet (HTTP ${res.status}). Endringen er IKKE lagret.`);
        throw new Error(`Endring feilet (HTTP ${res.status})`);
      }

      return await res.json();
    } catch (e) {
      if (classifyFailure(e) !== 'offline') {
        throw e;
      }
      const queue = getOfflineQueue();
      queue.push({
        queueId: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: 'UPDATE',
        collectionName,
        id,
        data,
        timestamp: Date.now()
      });
      saveOfflineQueue(queue);
      notify('info', 'Du er offline. Endringen er lagret lokalt og synkroniseres når du får nett.');
      return { id, ...data } as T;
    }
  },

  async saveDoc<T = any>(collectionName: string, data: any): Promise<T> {
    if (data.id) {
      const cached = getLocalCache(collectionName);
      const existing = cached.find((i: any) => i.id === data.id);
      if (existing) {
        return this.updateDoc(collectionName, data.id, data) as any;
      }
    }
    return this.addDoc(collectionName, data) as any;
  },

  async deleteDoc(collectionName: string, id: string): Promise<{ success: boolean }> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Update local cache optimistically
    const cached = getLocalCache(collectionName);
    const updated = cached.filter((item: any) => item.id !== id);
    setLocalCache(collectionName, updated);

    if (!isOnline) {
      const queue = getOfflineQueue();
      queue.push({
        queueId: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: 'DELETE',
        collectionName,
        id,
        timestamp: Date.now()
      });
      saveOfflineQueue(queue);
      notify('info', 'Du er offline. Slettingen er lagret lokalt og synkroniseres mot serveren.');
      return { success: true };
    }

    try {
      const res = await fetch(`/api/data/${collectionName}/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      // SIKKERHETSFIKS (C-03): også her ble et avvist svar behandlet som om vi var
      // offline. Ved 401/403/500 havnet slettingen i køen og ble rapportert som
      // utført, mens raden fortsatt fantes på serveren. Feil skal feile ærlig.
      if (!res.ok) {
        const kind = classifyFailure(null, res);
        if (kind === 'auth') {
          notify('error', 'Du er ikke innlogget, eller har ikke tilgang. Elementet er IKKE slettet.');
          throw new Error(`Sletting avvist av serveren (HTTP ${res.status}). Elementet er ikke slettet.`);
        }
        notify('error', `Sletting feilet (HTTP ${res.status}). Elementet er IKKE slettet.`);
        throw new Error(`Sletting feilet (HTTP ${res.status})`);
      }

      return await res.json();
    } catch (e) {
      if (classifyFailure(e) !== 'offline') {
        throw e;
      }
      const queue = getOfflineQueue();
      queue.push({
        queueId: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: 'DELETE',
        collectionName,
        id,
        timestamp: Date.now()
      });
      saveOfflineQueue(queue);
      notify('info', 'Du er offline. Slettingen er lagret lokalt og synkroniseres når du får nett.');
      return { success: true };
    }
  },

  // --- Offline Auto-Sync Processor ---
  getPendingSyncCount(): number {
    return getOfflineQueue().length;
  },

  async syncOfflineQueue(): Promise<{ synced: number }> {
    if (isSyncing || typeof navigator === 'undefined' || !navigator.onLine) {
      return { synced: 0 };
    }

    const queue = getOfflineQueue();
    if (queue.length === 0) return { synced: 0 };

    isSyncing = true;
    let syncedCount = 0;
    const remainingQueue: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        let res: Response | null = null;
        if (item.type === 'ADD') {
          res = await fetch(`/api/data/${item.collectionName}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(item.data)
          });
        } else if (item.type === 'UPDATE' && item.id) {
          res = await fetch(`/api/data/${item.collectionName}/${item.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(item.data)
          });
        } else if (item.type === 'DELETE' && item.id) {
          res = await fetch(`/api/data/${item.collectionName}/${item.id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
        }

        // SIKKERHETSFIKS (C-03): her ble elementet talt som synkronisert og fjernet
        // fra køen UTEN at svaret ble sjekket. Ved 401, 403 eller 500 forsvant
        // skrivingen både fra køen og fra serveren, og brukeren fikk en
        // suksessmelding om at alt var synkronisert. Dataene fantes da ingen steder.
        // Et avvist svar skal bli liggende i køen, ikke stille forsvinne.
        if (!res || !res.ok) {
          const status = res ? res.status : 0;
          console.warn(`Synk av ${item.type} i ${item.collectionName} feilet med HTTP ${status}. Elementet blir liggende i køen.`);
          remainingQueue.push(item);
          continue;
        }

        syncedCount++;
      } catch (err) {
        // Nettverket er fortsatt nede: bevar elementet.
        console.warn('Failed to sync item:', item, err);
        remainingQueue.push(item);
      }
    }

    saveOfflineQueue(remainingQueue);
    isSyncing = false;

    if (syncedCount > 0) {
      notify('success', `Tilbake på nett: ${syncedCount} endring(er) ble synkronisert.`);
      window.dispatchEvent(new CustomEvent('ks_offline_synced', { detail: { count: syncedCount } }));
    }
    if (remainingQueue.length > 0) {
      // Si fra om at noe IKKE ble synkronisert, i stedet for bare å tie.
      notify('error', `${remainingQueue.length} endring(er) kunne ikke synkroniseres og ligger fortsatt lokalt.`);
    }

    return { synced: syncedCount };
  }
};

// Automatic listener for online events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    api.syncOfflineQueue();
  });
}
