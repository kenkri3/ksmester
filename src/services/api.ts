// Clean REST API client replacing Firebase

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

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
    if (!res.ok) throw new Error(result.error || 'Registrering feilet');
    if (result.token) localStorage.setItem('token', result.token);
    return result;
  },

  async getMe() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const res = await fetch('/api/auth/me', {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('localFallbackAuth');
  },

  // --- Collection Data (PostgreSQL via REST) ---
  async getCollection<T = any>(collectionName: string): Promise<T[]> {
    try {
      const res = await fetch(`/api/data/${collectionName}`, { headers: getHeaders() });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.warn(`Error fetching ${collectionName}:`, e);
      return [];
    }
  },

  async addDoc<T = any>(collectionName: string, data: any): Promise<T> {
    const res = await fetch(`/api/data/${collectionName}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateDoc<T = any>(collectionName: string, id: string, data: any): Promise<T> {
    const res = await fetch(`/api/data/${collectionName}/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async deleteDoc(collectionName: string, id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/data/${collectionName}/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return await res.json();
  }
};
