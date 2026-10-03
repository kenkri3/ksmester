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
 * ⚠️ Viktig: en første versjon krevde bare at en nøkkel VAR oppgitt ("BYOK").
 * Det ble verifisert i produksjon å være utrygt — AI-motoren faller tilbake på
 * serverens egen nøkkel når den oppgitte nøkkelen avvises av leverandøren.
 * En vilkårlig streng som "Bearer tull" ga derfor et ekte AI-svar på vår regning.
 *
 * Endelig modell: broen godtar KUN plattformnøkkelen (`AGENT_API`), og feiler
 * lukket dersom den ikke er konfigurert.
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
  const platformKey = (process.env.AGENT_API || '').trim();

  // Fail closed: uten konfigurert plattformnøkkel er broen helt avstengt.
  if (!platformKey) {
    console.error(
      '[OpenAI Bridge] AGENT_API er ikke konfigurert. Alle kall avvises (fail-closed).'
    );
    return {
      authorized: false,
      reason: 'Broen er ikke konfigurert. AGENT_API mangler på serveren.'
    };
  }

  const provided = extractProvidedKey(req);
  if (!provided) {
    return {
      authorized: false,
      reason: 'Mangler API-nøkkel. Oppgi "Authorization: Bearer <nøkkel>" eller "api-key".'
    };
  }

  if (!safeEqual(provided, platformKey)) {
    return { authorized: false, reason: 'Ugyldig API-nøkkel.' };
  }

  // Plataform-kall: bruk serverens egen AI-nøkkel.
  return { authorized: true, apiKey: undefined };
}
