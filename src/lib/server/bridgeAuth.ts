import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * 🛡️ SIKKERHETSFIKS (P0): Autorisasjon for den OpenAI-kompatible broen.
 *
 * Bakgrunn: `/api/openai/v1/chat/completions` hadde INGEN avvisningsgren.
 * `customKey` var valgfri og ble sendt videre til AI-motoren; manglet den,
 * brukte serveren sin egen betalte nøkkel (1min.AI / Gemini / DeepSeek).
 * Med `Access-Control-Allow-Origin: *` kunne hvem som helst — også fra en
 * vilkårlig nettside i en ansatts nettleser — brenne AI-kvoten vår.
 *
 * Ny modell:
 *   - Kall uten nøkkel avvises (401).
 *   - Er `AGENT_API` satt og oppgitt nøkkel matcher den, regnes kallet som
 *     plattform-kall og serverens egen AI-nøkkel brukes.
 *   - Ellers behandles nøkkelen som "bring your own key" (BYOK) og brukes
 *     videre til AI-leverandøren i stedet for vår egen.
 */

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/** Henter oppgitt API-nøkkel fra Authorization, api-key eller x-api-key. */
export function extractProvidedKey(req: NextRequest): string {
  const raw =
    req.headers.get('authorization') ||
    req.headers.get('api-key') ||
    req.headers.get('x-api-key') ||
    '';
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}

export interface BridgeAuthResult {
  authorized: boolean;
  /** Nøkkelen som skal brukes mot AI-leverandøren. `undefined` = bruk serverens egen. */
  apiKey?: string;
  reason?: string;
}

export function authorizeBridgeRequest(req: NextRequest): BridgeAuthResult {
  const provided = extractProvidedKey(req);

  if (!provided) {
    return {
      authorized: false,
      reason: 'Mangler API-nøkkel. Oppgi "Authorization: Bearer <nøkkel>" eller "api-key".'
    };
  }

  const platformKey = (process.env.AGENT_API || '').trim();

  // Plattform-kall: bruk serverens egen AI-nøkkel.
  if (platformKey && safeEqual(provided, platformKey)) {
    return { authorized: true, apiKey: undefined };
  }

  // Bring your own key: kunden betaler sin egen AI-regning.
  return { authorized: true, apiKey: provided };
}
