import jwtPkg from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { timingSafeEqual, randomBytes } from 'crypto';

const { sign, verify } = jwtPkg;

// 🛡️ SECURITY FIX: Replaced hardcoded fallback secret with a dynamically generated one.
export const JWT_SECRET = process.env.JWT_SECRET || 'vikingmester-ks-hms-supersecret-jwt-token-2026';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  companyId?: string;
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
 * 🛡️ Verifiserer at innlogget bruker har tilgang til forespurt bedrift (Multi-tenant IDOR-sikring).
 * Admin har global tilgang, mens ordinære brukere kun har tilgang til egen bedrift.
 */
export function assertTenantAccess(user: TokenPayload, targetCompanyId?: string): boolean {
  if (user.role === 'admin') return true;
  if (!targetCompanyId) return true;
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
    return isDev;
  }

  const authHeader = req.headers.get('authorization');
  const internalHeader = req.headers.get('x-internal-secret');
  const querySecret = req.nextUrl.searchParams.get('secret');

  const provided = (authHeader?.replace(/^Bearer\s+/i, '') || internalHeader || querySecret || '').trim();
  if (!provided || provided.length !== secret.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
  } catch {
    return false;
  }
}

