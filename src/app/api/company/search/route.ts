import { NextRequest, NextResponse } from 'next/server';

export interface CompanyInfo {
  name: string;
  orgnr: string;
  orgType: string;
  orgTypeCode: string;
  address: string;
  postcode: string;
  city: string;
  municipality: string;
  industryCode?: string;
  industry?: string;
  employeeCount?: number;
  isBankrupt: boolean;
  isUnderLiquidation: boolean;
  isMvaRegistered: boolean;
}

const companyCache = new Map<string, { data: CompanyInfo[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache

function normalizeEnhet(e: any): CompanyInfo {
  const forretningsadresse = e.forretningsadresse || {};
  const postadresse = e.postadresse || {};

  const addrLines = forretningsadresse.adresse || postadresse.adresse || [];
  const address = Array.isArray(addrLines) ? addrLines.join(', ') : String(addrLines || '');
  const postcode = forretningsadresse.postnummer || postadresse.postnummer || '';
  const city = forretningsadresse.poststed || postadresse.poststed || '';
  const municipality = forretningsadresse.kommune || postadresse.kommune || '';

  return {
    name: e.navn || 'Ukjent firma',
    orgnr: e.organisasjonsnummer || '',
    orgType: e.organisasjonsform?.beskrivelse || 'Aksjeselskap',
    orgTypeCode: e.organisasjonsform?.kode || 'AS',
    address,
    postcode,
    city,
    municipality,
    industryCode: e.naeringskode1?.kode,
    industry: e.naeringskode1?.beskrivelse,
    employeeCount: e.antallAnsatte,
    isBankrupt: Boolean(e.konkurs),
    isUnderLiquidation: Boolean(e.underAvvikling || e.underTvangsavviklingEllerTvangsopplosning),
    isMvaRegistered: Boolean(e.registrertIMvaregisteret)
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rawQ = (url.searchParams.get('q') || '').trim();
    if (!rawQ || rawQ.length < 2) {
      return NextResponse.json([]);
    }

    const cleanOrgnr = rawQ.replace(/\s+/g, '');
    const isOrgnr = /^\d{9}$/.test(cleanOrgnr);
    const cacheKey = isOrgnr ? cleanOrgnr : rawQ.toLowerCase();

    const cached = companyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    let results: CompanyInfo[] = [];

    if (isOrgnr) {
      // Direct lookup by 9-digit orgnr
      const brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${cleanOrgnr}`;
      const res = await fetch(brregUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const enhet = await res.json();
        results = [normalizeEnhet(enhet)];
      }
    } else {
      // Search by company name
      const brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(rawQ)}&size=10`;
      const res = await fetch(brregUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        const enheter = data._embedded?.enheter || [];
        results = enheter.map(normalizeEnhet);
      }
    }

    companyCache.set(cacheKey, { data: results, timestamp: Date.now() });
    return NextResponse.json(results);
  } catch (err: any) {
    console.error('Brreg API route error:', err);
    return NextResponse.json({ error: 'Kunne ikke søke i Enhetsregisteret' }, { status: 500 });
  }
}
