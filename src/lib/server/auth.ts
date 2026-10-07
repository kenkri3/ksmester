import jwtPkg from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { timingSafeEqual, randomBytes } from 'crypto';

const { sign, verify } = jwtPkg;

/**
 * 🛡️ SIKKERHETSFIKS (P0): Den hardkodede JWT-hemmeligheten er fjernet.
 *
 * Den gamle fallbacken ('vikingmester-ks-hms-supersecret-jwt-token-2026') lå i
 * klartekst i kildekoden. Siden repoet nå er offentlig, kunne hvem som helst
 * signert en gyldig SuperAdmin-token dersom JWT_SECRET ikke var satt i miljøet.
 *
 * Verifisert mot produksjon: JWT_SECRET ER satt i Railway, så fallbacken var
 * inaktiv der. For å hindre at en offentlig kjent nøkkel noen gang tas i bruk:
 *   - produksjon uten JWT_SECRET genererer en tilfeldig hemmelighet per prosess
 *     (tokens kan da ikke forfalskes; brukere logges ut ved omstart) og varsler.
 *   - utvikling beholder en stabil lokal fallback så `npm run dev` fungerer.
 */
function resolveJwtSecret(): string {
  const fromEnv = (process.env.JWT_SECRET || '').trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[SECURITY] JWT_SECRET er ikke konfigurert i produksjon! ' +
      'Genererer en tilfeldig hemmelighet for denne prosessen — alle sesjoner ' +
      'ugyldiggjøres ved omstart. Sett JWT_SECRET i miljøvariablene umiddelbart.'
    );
    return randomBytes(48).toString('hex');
  }

  console.warn('[SECURITY] JWT_SECRET mangler – bruker midlertidig utviklingshemmelighet.');
  return 'dev-only-insecure-jwt-secret';
}

export const JWT_SECRET = resolveJwtSecret();

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  companyId?: string;
  company?: string;
  displayName?: string;
  trade?: string;
}

export function signToken(payload: TokenPayload): string {
  return sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): TokenPayload | null {
  try {
    return verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  if (!token) {
    token = req.cookies.get('token')?.value || req.cookies.get('auth_token')?.value || null;
  }
  if (!token) return null;
  return verifyAuthToken(token);
}

/**
 * 🛡️ Sjekker om brukeren er plattform-eier / SuperAdmin (kun autoriserte superbrukere).
 * Ordinære kunde-administratorer (rolle: 'admin') har kun tilgang til egen bedrift.
 */
export function isUserSuperAdmin(user: TokenPayload | null): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  const email = (user.email || '').toLowerCase();
  const defaultAdmin = (process.env.ADMIN_EMAIL || 'kenkri3@gmail.com').toLowerCase();
  const adminList = [
    defaultAdmin,
    'kenkri3@gmail.com',
    'aichatnorge@gmail.com',
    'kenneth@aichatnorge.no',
    'admin@vikingmester.no',
    'post@vikingent.no',
    'lars@nonfoodgroup.no',
    'jm@nonfoodgroup.no',
    'fredrik.r.ellingsen@gmail.com',
    'fredrik@aichatnorge.no'
  ];
  return adminList.includes(email);
}

export function isUserAdmin(user: TokenPayload | null): boolean {
  return isUserSuperAdmin(user);
}

/**
 * 🛡️ Verifiserer at innlogget bruker har tilgang til forespurt bedrift (Multi-tenant IDOR-sikring).
 * Admin har global tilgang, mens ordinære brukere kun har tilgang til egen bedrift.
 *
 * SIKKERHETSFIKS (C-06): funksjonen returnerte tidligere `true` når
 * targetCompanyId manglet (`if (!targetCompanyId) return true`). Det er å feile
 * APENT: enhver rute som glemte å sende bedrifts-ID slapp gjennom tenant-sjekken.
 * Nå avvises manglende bedrifts-ID i stedet. Funksjonen hadde ingen kallsteder
 * da dette ble rettet, så endringen påvirker ingen eksisterende flyt — den
 * fjerner en felle for fremtidig kode.
 */
export function assertTenantAccess(user: TokenPayload, targetCompanyId?: string): boolean {
  if (isUserAdmin(user)) return true;
  if (!targetCompanyId) return false;
  return user.companyId === targetCompanyId;
}

export function verifyInternalSecret(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_SECRET;
  const provided = req.headers.get('x-internal-secret');
  if (!expected) return false; // fail CLOSED if unset
  if (!provided || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export function verifyCronOrInternalSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET;
  const host = req.headers.get('host') || '';
  const isDev = process.env.NODE_ENV !== 'production' && (host.includes('localhost') || host.includes('127.0.0.1'));

  if (!secret) {
    // Bevisst utviklerunntak for lokal kjøring. Merk at dette gjør at
    // cron-ruter ser autoriserte ut i dev uansett kode — sikkerhetssjekkene
    // i scripts/security-check-*.mjs kjøres derfor mot NODE_ENV=production.
    return isDev;
  }

  const authHeader = req.headers.get('authorization');
  const internalHeader = req.headers.get('x-internal-secret');

  // SIKKERHETSFIKS (C-04): her ble også `?secret=` i query godtatt. En
  // hemmelighet i URL-en havner i access-logger, proxy-logger, Referer-headere
  // og nettleserhistorikk. Det er ikke en akseptabel plass for en hemmelighet.
  // Varianten er fjernet; hemmeligheten må sendes i Authorization- eller
  // x-internal-secret-headeren.
  const provided = (authHeader?.replace(/^Bearer\s+/i, '') || internalHeader || '').trim();
  if (!provided || provided.length !== secret.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
  } catch {
    return false;
  }
}

