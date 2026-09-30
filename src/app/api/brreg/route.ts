import { NextRequest, NextResponse } from 'next/server';
import { sanitizeHeader } from '@/src/lib/sanitize';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgnr = sanitizeHeader((searchParams.get('orgnr') || '').replace(/\s+/g, '').trim());
    const query = (searchParams.get('query') || searchParams.get('q') || searchParams.get('navn') || '').trim();

    if (!orgnr && (!query || query.length < 2)) {
      return NextResponse.json({ error: 'Oppgi organisasjonsnummer (9 siffer) eller søkestreng (minst 2 tegn).' }, { status: 400 });
    }

    // 1. Direkte oppslag på 9-sifret organisasjonsnummer
    if (orgnr && /^\d{9}$/.test(orgnr)) {
      const res = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${orgnr}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });

      if (!res.ok) {
        if (res.status === 404) {
          return NextResponse.json({ found: false, message: 'Foretaket ble ikke funnet i Enhetsregisteret.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Feil ved oppslag mot Brønnøysund.' }, { status: res.status });
      }

      const unit = await res.json();
      return NextResponse.json({
        found: true,
        unit: formatBrregUnit(unit)
      });
    }

    // 2. Navnesøk (inntil 5 treff)
    const searchQuery = encodeURIComponent(query || orgnr);
    const res = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?navn=${searchQuery}&size=5`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Kunne ikke søke i Enhetsregisteret.' }, { status: res.status });
    }

    const data = await res.json();
    const rawUnits = data._embedded?.enheter || [];
    const units = rawUnits.map(formatBrregUnit);

    return NextResponse.json({
      found: units.length > 0,
      units,
      unit: units[0] || null
    });

  } catch (err: any) {
    console.warn('Brønnøysund API route error:', err);
    return NextResponse.json({ error: 'Tilkoblingsfeil mot Brønnøysundregistrene.', details: err.message }, { status: 500 });
  }
}

function formatBrregUnit(unit: any) {
  if (!unit) return null;

  const addrObj = unit.forretningsadresse || unit.beliggenhetsadresse || unit.postadresse || {};
  const gater = Array.isArray(addrObj.adresse) ? addrObj.adresse.join(', ') : (addrObj.adresse || '');
  const postnummer = addrObj.postnummer || '';
  const poststed = addrObj.poststed || '';
  const fullAddress = [gater, postnummer, poststed].filter(Boolean).join(', ');

  const naeringskode = unit.naeringskode1?.kode || null;
  const naeringsbeskrivelse = unit.naeringskode1?.beskrivelse || null;

  // Intelligent fag-deteksjon basert på næringskode / beskrivelse
  let tradeSuggestion = 'tomrer';
  const descLower = (naeringsbeskrivelse || '').toLowerCase() + ' ' + (unit.navn || '').toLowerCase();
  if (descLower.includes('rør') || descLower.includes('vvs') || descLower.includes('sanitær')) {
    tradeSuggestion = 'rorlegger';
  } else if (descLower.includes('elektro') || descLower.includes('el-') || descLower.includes('elektrisk')) {
    tradeSuggestion = 'elektriker';
  } else if (descLower.includes('grav') || descLower.includes('grunnarbeid') || descLower.includes('anlegg')) {
    tradeSuggestion = 'graver';
  } else if (descLower.includes('mal') || descLower.includes('flis') || descLower.includes('gulv')) {
    tradeSuggestion = 'maler';
  } else if (descLower.includes('totalentreprenør') || descLower.includes('entreprenør') || descLower.includes('byggmester')) {
    tradeSuggestion = 'entreprenor';
  }

  return {
    orgnr: unit.organisasjonsnummer,
    navn: unit.navn,
    organisasjonsform: unit.organisasjonsform?.kode || 'AS',
    organisasjonsformBeskrivelse: unit.organisasjonsform?.beskrivelse || 'Aksjeselskap',
    adresse: fullAddress,
    gate: gater,
    postnummer,
    poststed,
    antallAnsatte: unit.antallAnsatte || null,
    harRegistrertAntallAnsatte: Boolean(unit.harRegistrertAntallAnsatte),
    mvaRegistrert: Boolean(unit.registrertIMvaregisteret),
    konkurs: Boolean(unit.konkurs),
    underAvvikling: Boolean(unit.underAvvikling),
    naeringskode,
    naeringsbeskrivelse,
    tradeSuggestion
  };
}
