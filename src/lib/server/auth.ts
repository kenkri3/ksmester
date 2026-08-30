import jwtPkg from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { timingSafeEqual, randomBytes } from 'crypto';

const { sign, verify } = jwtPkg;

// 🛡️ SECURITY FIX: Replaced hardcoded fallback secret with a dynamically generated one.
// Hardcoded secrets in source code allow attackers to forge valid JWTs if the environment variable is missing.
export const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');

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
  if (!authHeader) return null;
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  return verifyAuthToken(token);
}

export function verifyInternalSecret(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_SECRET;
  const provided = req.headers.get('x-internal-secret');
  if (!expected) return false; // fail CLOSED if unset
  if (!provided || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
