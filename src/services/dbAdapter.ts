// REST & PostgreSQL client database adapter replacing legacy Firebase SDKs
import { api } from './api';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleDbError(error: unknown, operationType?: OperationType, path?: string | null, extra?: any) {
  console.warn(`[DB API Notice ${operationType || 'op'} on ${path || 'path'}]:`, error);
}

// Alias for backwards compatibility with existing UI components
export const handleFirestoreError = handleDbError;

export const CURRENT_USER_STORAGE_KEY = 'ks_current_user';

export function setCurrentAuthUser(user: any) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  }
}

export function getCurrentAuthUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      return {
        uid: u.uid || u.id,
        id: u.uid || u.id,
        email: u.email,
        displayName: u.displayName || u.name || u.email?.split('@')[0] || 'Bruker',
        photoURL: u.photoURL || null,
        role: u.role || 'worker',
        trade: u.trade || '',
        company: u.company || '',
        companyId: u.companyId || ''
      };
    }
    const token = localStorage.getItem('token');
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return {
          uid: payload.id,
          id: payload.id,
          email: payload.email,
          displayName: payload.displayName || payload.email?.split('@')[0] || 'Bruker',
          photoURL: null,
          role: payload.role || 'worker',
          trade: payload.trade || '',
          company: payload.company || '',
          companyId: payload.companyId || ''
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

export const db = { name: 'postgres' };
export const auth = {
  get currentUser() {
    return getCurrentAuthUser();
  },
  onAuthStateChanged: (cb: (user: any) => void) => {
    if (typeof window !== 'undefined') {
      cb(getCurrentAuthUser());
    }
    return () => {};
  }
};
export const googleProvider = {};

export async function getUserProfile(uid: string): Promise<any | null> {
  try {
    const users = await api.getCollection('users');
    return users.find((u: any) => u.id === uid || u.uid === uid) || null;
  } catch (err) {
    return null;
  }
}

export async function updateUserProfile(uid: string, data: Partial<any>): Promise<void> {
  try {
    await api.updateDoc('users', uid, data);
  } catch (err) {
    console.warn('Error updating user profile:', err);
  }
}

// Collection and Doc helpers
export function collection(dbRef: any, ...pathSegments: string[]) {
  const name = pathSegments.join('_');
  return { collectionName: name };
}

export function doc(dbRef: any, colOrPath: string, id?: string) {
  if (!id && colOrPath.includes('/')) {
    const parts = colOrPath.split('/');
    return { collectionName: parts[0], id: parts[1] };
  }
  return { collectionName: colOrPath, id };
}

export function query(colRef: any, ...constraints: any[]) {
  return { ...colRef, constraints };
}

export function where(field: string, op: string, value: any) {
  return { field, op, value };
}

export function orderBy(field: string, direction: string = 'asc') {
  return { field, direction };
}

export function limit(n: number) {
  return { limit: n };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export const Timestamp = {
  now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() }),
  fromDate: (date: Date) => ({ toDate: () => date, toMillis: () => date.getTime() })
};

// Data Operations
export async function getDoc(docRef: any) {
  const col = docRef.collectionName;
  const items = await api.getCollection(col);
  const found = items.find((i: any) => i.id === docRef.id);
  return {
    exists: () => !!found,
    data: () => found || {},
    id: docRef.id,
    ref: docRef
  };
}

export function applyQueryConstraints(items: any[], constraints?: any[]): any[] {
  if (!constraints || constraints.length === 0) return items;
  let result = [...items];

  for (const c of constraints) {
    if (c.field && c.op && c.value !== undefined) {
      result = result.filter((item: any) => {
        const val = item[c.field];

        // Flexible company / companyId matching
        if (c.field === 'company' || c.field === 'companyId') {
          const compVal = item.company;
          const compIdVal = item.companyId;
          if (c.op === '==') {
            return compVal === c.value || compIdVal === c.value;
          }
          if (c.op === '!=') {
            return compVal !== c.value && compIdVal !== c.value;
          }
          if (c.op === 'in' && Array.isArray(c.value)) {
            return c.value.includes(compVal) || c.value.includes(compIdVal);
          }
        }

        switch (c.op) {
          case '==':
            return val === c.value;
          case '!=':
            return val !== c.value;
          case 'in':
            return Array.isArray(c.value) && c.value.includes(val);
          case 'not-in':
            return Array.isArray(c.value) && !c.value.includes(val);
          case 'array-contains':
            return Array.isArray(val) && val.includes(c.value);
          case '<':
            return val < c.value;
          case '<=':
            return val <= c.value;
          case '>':
            return val > c.value;
          case '>=':
            return val >= c.value;
          default:
            return true;
        }
      });
    }

    // Apply orderBy sorting if present
    if (c.field && c.direction && !c.op) {
      result.sort((a: any, b: any) => {
        const aVal = a[c.field];
        const bVal = b[c.field];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const comp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return c.direction === 'desc' ? -comp : comp;
      });
    }

    // Apply limit if present
    if (c.limit && typeof c.limit === 'number') {
      result = result.slice(0, c.limit);
    }
  }

  return result;
}

export async function getDocs(queryRef: any) {
  const col = queryRef.collectionName;
  let items = await api.getCollection(col);

  if (queryRef.constraints) {
    items = applyQueryConstraints(items, queryRef.constraints);
  }

  const docs = items.map((i: any) => ({
    id: i.id,
    ref: { collectionName: col, id: i.id },
    data: () => i
  }));

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length
  };
}

export async function addDoc(colRef: any, data: any) {
  const res = await api.addDoc(colRef.collectionName, data);
  return { id: res.id || 'id-' + Math.random().toString(36).substring(2, 7), collectionName: colRef.collectionName };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const col = docRef.collectionName;
  const id = docRef.id;
  await api.updateDoc(col, id, data);
}

export async function updateDoc(docRef: any, data: any, extra?: any) {
  const col = docRef.collectionName;
  const id = docRef.id;
  await api.updateDoc(col, id, data);
}

export async function deleteDoc(docRef: any, extra?: any) {
  const col = docRef.collectionName;
  const id = docRef.id;
  await api.deleteDoc(col, id);
}

export function onSnapshot(queryOrColRef: any, callback: (snapshot: any) => void, onError?: any) {
  const col = queryOrColRef.collectionName;

  const fetchData = async () => {
    try {
      let items = await api.getCollection(col);
      if (queryOrColRef.constraints) {
        items = applyQueryConstraints(items, queryOrColRef.constraints);
      }
      const docs = items.map((i: any) => ({
        id: i.id,
        ref: { collectionName: col, id: i.id },
        data: () => i
      }));
      callback({
        docs,
        empty: docs.length === 0,
        size: docs.length
      });
    } catch (e) {
      if (onError) onError(e);
    }
  };

  fetchData();
  const interval = setInterval(fetchData, 4000);
  return () => clearInterval(interval);
}

export function writeBatch(dbRef: any) {
  return {
    set: (docRef: any, data: any) => setDoc(docRef, data),
    update: (docRef: any, data: any) => updateDoc(docRef, data),
    delete: (docRef: any) => deleteDoc(docRef),
    commit: async () => {}
  };
}

export const signInWithPopup = async () => {};
export const signOut = async () => { api.logout(); };
export const onAuthStateChanged = (authObj: any, cb: any, errCb?: any) => { cb(null); return () => {}; };
export const createUserWithEmailAndPassword = async () => {};
export const signInWithEmailAndPassword = async () => {};
export const sendPasswordResetEmail = async () => {};
export const updateProfile = async () => {};
