// Clean REST API client with full Offline-First caching & Auto-Sync Engine
import { toast } from 'sonner';

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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

function getLocalCache<T = any>(collectionName: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + collectionName);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCache<T = any>(collectionName: string, data: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_PREFIX + collectionName, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save local cache', e);
  }
}

let isSyncing = false;

export const api = {
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

  async register(data: { email: string; password?: string; name?: string; company?: string; role?: string; trade?: string }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || 'Registrering feilet');
    if (result.token) localStorage.setItem('token', result.token);
    return result;
  },

  async getMe() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: getHeaders()
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
  async getCollection<T = any>(collectionName: string): Promise<T[]> {
    const cached = getLocalCache<T>(collectionName);
    
    // If browser is offline, instantly return cached items
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return cached;
    }

    try {
      const res = await fetch(`/api/data/${collectionName}`, { headers: getHeaders() });
      if (res.ok) {
        const fresh = await res.json();
        if (Array.isArray(fresh)) {
          setLocalCache(collectionName, fresh);
          return fresh;
        }
      }
      return cached;
    } catch (e) {
      console.warn(`[Offline Fallback] Returning cached data for ${collectionName}:`, e);
      return cached;
    }
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
      toast.info('Lagret lokalt på mobilen (synkroniseres når du får nett)');
      return itemWithId as T;
    }

    try {
      const res = await fetch(`/api/data/${collectionName}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(itemWithId)
      });
      if (!res.ok) throw new Error('Server error');
      const saved = await res.json();
      return saved;
    } catch (e) {
      // Network failed during send, add to offline queue
      const queue = getOfflineQueue();
      queue.push({
        queueId: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: 'ADD',
        collectionName,
        data: itemWithId,
        timestamp: Date.now()
      });
      saveOfflineQueue(queue);
      toast.info('Nettverksfeil: Lagret lokalt og synkroniseres automatisk');
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
      toast.info('Endring lagret lokalt (synkroniseres når du er på nett)');
      return { id, ...data } as T;
    }

    try {
      const res = await fetch(`/api/data/${collectionName}/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Server error');
      return await res.json();
    } catch (e) {
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
      toast.info('Endring lagret lokalt og synkroniseres automatisk');
      return { id, ...data } as T;
    }
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
      toast.info('Element slettet lokalt (synkroniseres mot server)');
      return { success: true };
    }

    try {
      const res = await fetch(`/api/data/${collectionName}/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Server error');
      return await res.json();
    } catch (e) {
      const queue = getOfflineQueue();
      queue.push({
        queueId: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: 'DELETE',
        collectionName,
        id,
        timestamp: Date.now()
      });
      saveOfflineQueue(queue);
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
        if (item.type === 'ADD') {
          await fetch(`/api/data/${item.collectionName}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(item.data)
          });
        } else if (item.type === 'UPDATE' && item.id) {
          await fetch(`/api/data/${item.collectionName}/${item.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(item.data)
          });
        } else if (item.type === 'DELETE' && item.id) {
          await fetch(`/api/data/${item.collectionName}/${item.id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
        }
        syncedCount++;
      } catch (err) {
        console.warn('Failed to sync item:', item, err);
        remainingQueue.push(item);
      }
    }

    saveOfflineQueue(remainingQueue);
    isSyncing = false;

    if (syncedCount > 0) {
      toast.success(`📶 Tilbake på nett: ${syncedCount} endringer ble automatisk synkronisert!`);
      window.dispatchEvent(new CustomEvent('ks_offline_synced', { detail: { count: syncedCount } }));
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
