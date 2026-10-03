/**
 * 🛡️ SIKKERHETSFIKS (P0): Felles hjelper for autentiserte fetch-kall fra klienten.
 *
 * Appen lagrer JWT-en i localStorage under 'token' og sender den som
 * `Authorization: Bearer <token>`. Flere kallsteder (bl.a. /api/documentation)
 * sendte tidligere INGEN Authorization-header, noe som var grunnen til at
 * serveren ikke kunne kreve innlogging uten å bryte funksjonaliteten.
 *
 * Bruk:
 *   fetch('/api/...', { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body })
 */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}
