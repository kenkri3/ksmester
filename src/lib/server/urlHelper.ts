import { NextRequest } from 'next/server';

/**
 * Returnerer den offisielle, eksterne nettadressen for applikasjonen.
 * Sikrer at kundevendte delingslenker og e-poster ALDRI inneholder 'localhost' eller '127.0.0.1'.
 */
export function getPublicAppUrl(req?: Request | NextRequest | null): string {
  // 1. Sjekk om forespørselen kom via en reverse proxy (f.eks. Railway, Cloudflare, Vercel)
  if (req) {
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
    }

    const host = req.headers.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = req.headers.get('x-forwarded-proto') || 'https';
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }

  // 2. Sjekk miljøvariabler fra Railway / produksjon
  const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }

  // 3. Sikker standard: Norges ledende produksjonsdomene for VikingMester
  return 'https://vikingmester.no';
}
