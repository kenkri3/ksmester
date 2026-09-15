import { NextRequest, NextResponse } from 'next/server';

interface GeonorgeAddress {
  adressetekst?: string;
  postnummer?: string;
  poststed?: string;
  kommunenummer?: string;
  kommunenavn?: string;
  gardsnummer?: number | string;
  gaardsnummer?: number | string;
  bruksnummer?: number | string;
  festenummer?: number | string;
  undernummer?: number | string;
  matrikkelenhet?: {
    kommunenummer?: string;
    gaardsnummer?: number | string;
    bruksnummer?: number | string;
    festenummer?: number | string;
  };
  representasjonspunkt?: {
    lat?: number;
    lon?: number;
    epsg?: string;
  };
}

export interface NormalizedAddress {
  address: string;
  postcode: string;
  city: string;
  municipality: string;
  municipalityNumber: string;
  gnr: string;
  bnr: string;
  fnr: string;
  fullAddress: string;
  lat?: number;
  lon?: number;
}

// Server-side in-memory cache (15 min TTL)
const addressCache = new Map<string, { data: NormalizedAddress[]; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000;

function normalizeAddress(addr: GeonorgeAddress): NormalizedAddress {
  const gnrRaw = addr.gardsnummer ?? addr.gaardsnummer ?? addr.matrikkelenhet?.gaardsnummer;
  const bnrRaw = addr.bruksnummer ?? addr.matrikkelenhet?.bruksnummer;
  const fnrRaw = addr.festenummer ?? addr.matrikkelenhet?.festenummer;
  const knrRaw = addr.kommunenummer ?? addr.matrikkelenhet?.kommunenummer;

  const gnr = gnrRaw !== undefined && gnrRaw !== null ? String(gnrRaw) : '';
  const bnr = bnrRaw !== undefined && bnrRaw !== null ? String(bnrRaw) : '';
  const fnr = fnrRaw !== undefined && fnrRaw !== null && Number(fnrRaw) > 0 ? String(fnrRaw) : '';
  const municipalityNumber = knrRaw ? String(knrRaw) : '';

  const address = addr.adressetekst || '';
  const postcode = addr.postnummer || '';
  const city = addr.poststed || '';
  const municipality = addr.kommunenavn || '';

  return {
    address,
    postcode,
    city,
    municipality,
    municipalityNumber,
    gnr,
    bnr,
    fnr,
    fullAddress: `${address}${postcode ? `, ${postcode}` : ''}${city ? ` ${city}` : ''}`.trim(),
    lat: addr.representasjonspunkt?.lat,
    lon: addr.representasjonspunkt?.lon
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const gnr = url.searchParams.get('gnr')?.trim();
    const bnr = url.searchParams.get('bnr')?.trim();
    const knr = url.searchParams.get('knr')?.trim();
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');

    // 1. Reverse Geocoding (by coordinates)
    if (lat && lon) {
      const cacheKey = `coords_${Number(lat).toFixed(4)}_${Number(lon).toFixed(4)}`;
      const cached = addressCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }

      const geoUrl = `https://ws.geonorge.no/adresser/v1/punktsok?lat=${lat}&lon=${lon}&radius=150&treffPerSide=5`;
      const res = await fetch(geoUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      if (!res.ok) {
        return NextResponse.json([]);
      }

      const data = await res.json();
      const list = (data.adresser || []).map(normalizeAddress);
      addressCache.set(cacheKey, { data: list, timestamp: Date.now() });
      return NextResponse.json(list);
    }

    // 2. Direct GNR / BNR lookup
    if (gnr && bnr) {
      const cacheKey = `gnrbnr_${knr || 'all'}_${gnr}_${bnr}`;
      const cached = addressCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }

      let geoUrl = `https://ws.geonorge.no/adresser/v1/sok?gaardsnummer=${encodeURIComponent(gnr)}&bruksnummer=${encodeURIComponent(bnr)}&treffPerSide=10`;
      if (knr) geoUrl += `&kommunenummer=${encodeURIComponent(knr)}`;

      const res = await fetch(geoUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = await res.json();
        const list = (data.adresser || []).map(normalizeAddress);
        addressCache.set(cacheKey, { data: list, timestamp: Date.now() });
        return NextResponse.json(list);
      }
      return NextResponse.json([]);
    }

    // 3. Free text query
    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const cacheKey = `q_${q.toLowerCase()}`;
    const cached = addressCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Check if query looks like "gnr 123 bnr 45" or "123/45"
    const gnrBnrMatch = q.match(/(?:gnr\s*)?(\d+)\s*[\/\s]\s*(?:bnr\s*)?(\d+)/i);
    let list: NormalizedAddress[] = [];

    // Search via Geonorge Address API
    const geoUrl = `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(q)}&fuzzy=true&treffPerSide=15`;
    try {
      const res = await fetch(geoUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.adresser && data.adresser.length > 0) {
          list = data.adresser.map(normalizeAddress);
        }
      }
    } catch (e) {
      console.warn('Geonorge sok fetch error:', e);
    }

    // If query was GNR/BNR pattern and general sok returned nothing, try dedicated gnr/bnr
    if (list.length === 0 && gnrBnrMatch) {
      try {
        const gnrVal = gnrBnrMatch[1];
        const bnrVal = gnrBnrMatch[2];
        const altUrl = `https://ws.geonorge.no/adresser/v1/sok?gaardsnummer=${gnrVal}&bruksnummer=${bnrVal}&treffPerSide=10`;
        const altRes = await fetch(altUrl, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(6000)
        });
        if (altRes.ok) {
          const altData = await altRes.json();
          if (altData.adresser) {
            list = altData.adresser.map(normalizeAddress);
          }
        }
      } catch (e) {
        console.warn('Geonorge gnr/bnr fallback error:', e);
      }
    }

    addressCache.set(cacheKey, { data: list, timestamp: Date.now() });
    return NextResponse.json(list);
  } catch (err: any) {
    console.error('Address API route error:', err);
    return NextResponse.json({ error: 'Kunne ikke hente adressedata' }, { status: 500 });
  }
}
