/**
 * 🌤️ Delt vær- og arbeidsforholdstjeneste (Open-Meteo / Yr-data).
 *
 * Brukes av både MesterAI-chatten og agent-rutene, slik at vær oppgis fra én
 * kilde i stedet for å ligge som hardkodede tekster rundt om i koden.
 *
 * VIKTIG: `isLive` er false når vi ikke fikk hentet ekte data. Da skal
 * kalleren si at været er utilgjengelig, ikke presentere reserveverdiene som
 * om de var reelle målinger.
 */

export interface LiveWeatherReport {
  temp: number;
  minTemp: number;
  maxTemp: number;
  condition: string;
  windSpeed: number;
  beaufort: string;
  precipitation: number;
  humidity: number;
  workAdvice: string;
  locationName: string;
  /** true = ekte data fra Open-Meteo, false = reserveverdier (ikke ekte vær). */
  isLive: boolean;
}

/**
 * Slår opp koordinater for kjente norske steder basert på adresse-/prosjekttekst.
 * `matched` er false når vi ikke kjente igjen stedet – da MÅ ikke koordinatene
 * brukes som om de var stedets egne, for det ville gitt et annet steds vær
 * presentert under brukerens stedsnavn.
 */
export function resolveLocationCoords(loc: string): { lat: number; lon: number; name: string; matched: boolean } {
  const lower = (loc || '').toLowerCase();
  if (lower.includes('sjusjøen') || lower.includes('sjusjoen')) return { lat: 61.15, lon: 10.70, name: 'Sjusjøen', matched: true };
  if (lower.includes('horten') || lower.includes('kongeveien')) return { lat: 59.42, lon: 10.48, name: 'Horten', matched: true };
  if (lower.includes('tolvsrød') || lower.includes('tønsberg') || lower.includes('tonsberg') || lower.includes('vidjeveien')) return { lat: 59.27, lon: 10.41, name: 'Tønsberg / Tolvsrød', matched: true };
  if (lower.includes('sandefjord')) return { lat: 59.13, lon: 10.22, name: 'Sandefjord', matched: true };
  if (lower.includes('larvik')) return { lat: 59.05, lon: 10.03, name: 'Larvik', matched: true };
  if (lower.includes('holmestrand') || lower.includes('geitekleiva') || lower.includes('eidsfoss')) return { lat: 59.49, lon: 10.32, name: 'Holmestrand / Eidsfoss', matched: true };
  if (lower.includes('drammen')) return { lat: 59.74, lon: 10.20, name: 'Drammen', matched: true };
  if (lower.includes('bergen')) return { lat: 60.39, lon: 5.32, name: 'Bergen', matched: true };
  if (lower.includes('trondheim')) return { lat: 63.43, lon: 10.39, name: 'Trondheim', matched: true };
  if (lower.includes('stavanger')) return { lat: 58.97, lon: 5.73, name: 'Stavanger', matched: true };
  if (lower.includes('kristiansand')) return { lat: 58.15, lon: 8.00, name: 'Kristiansand', matched: true };
  if (lower.includes('tromsø') || lower.includes('tromso')) return { lat: 69.65, lon: 18.96, name: 'Tromsø', matched: true };
  if (lower.includes('bodø') || lower.includes('bodo')) return { lat: 67.28, lon: 14.40, name: 'Bodø', matched: true };
  if (lower.includes('fredrikstad') || lower.includes('sarpsborg')) return { lat: 59.22, lon: 10.93, name: 'Fredrikstad', matched: true };
  if (lower.includes('skien') || lower.includes('porsgrunn')) return { lat: 59.21, lon: 9.61, name: 'Grenland', matched: true };
  // Tomt sted: Oslo er et bevisst standardvalg, ikke en gjetning på et oppgitt sted.
  if (!lower.trim()) return { lat: 59.91, lon: 10.75, name: 'Oslo (standard)', matched: true };
  // Ukjent sted: koordinatene er IKKE stedets egne. Kalleren må geokode eller
  // la være å presentere været som reelt for dette stedet.
  return { lat: 59.91, lon: 10.75, name: loc, matched: false };
}

/**
 * Slår opp ukjente steder via Open-Meteos geokodingstjeneste.
 *
 * Norske prosjektadresser skrives ofte som «Storgata 5, 6413 Molde», der byen
 * står ETTER komma og postnummeret foran. Vi prøver derfor flere kandidater i
 * rekkefølge: byen etter komma først, så gatenavnet, så hele strengen.
 */
async function geocodeLocation(query: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const raw = (query || '').trim();
  if (!raw) return null;

  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
  const candidates: string[] = [];
  if (parts.length > 1) {
    // «6413 Molde» -> «Molde»
    candidates.push(parts[parts.length - 1].replace(/^\d{4}\s*/, '').trim());
    candidates.push(parts[0]);
  }
  candidates.push(raw);
  candidates.push(raw.replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim());

  for (const candidate of candidates) {
    if (candidate.length < 3) continue;
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(candidate)}&count=1&language=no&format=json`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(3500) });
      if (!res.ok) continue;
      const data = await res.json();
      const hit = data?.results?.[0];
      if (hit && typeof hit.latitude === 'number' && typeof hit.longitude === 'number') {
        return { lat: hit.latitude, lon: hit.longitude, name: hit.name || candidate };
      }
    } catch {
      // Nettverksfeil for denne kandidaten – prøv neste.
    }
  }

  return null;
}

export async function fetchRealtimeWeather(locationQuery: string): Promise<LiveWeatherReport> {
  let coords = resolveLocationCoords(locationQuery);

  // Ukjent sted: prøv ekte geokoding før vi i det hele tatt henter vær.
  if (!coords.matched) {
    const geo = await geocodeLocation(locationQuery);
    if (geo) coords = { ...geo, matched: true };
  }

  // Fant vi ikke stedet, skal vi ikke presentere et annet steds vær som reelt.
  if (!coords.matched) {
    return {
      temp: 0,
      minTemp: 0,
      maxTemp: 0,
      condition: 'Ukjent',
      windSpeed: 0,
      beaufort: 'Ukjent',
      precipitation: 0,
      humidity: 0,
      workAdvice: `Fant ikke stedet «${locationQuery}» for væroppslag. Legg inn gyldig stedsnavn eller adresse på prosjektet.`,
      locationName: locationQuery,
      isLive: false
    };
  }

  const { lat, lon, name } = coords;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&wind_speed_unit=ms&timezone=Europe%2FOslo`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      const current = data.current || {};
      const daily = data.daily || {};

      const temp = Math.round(current.temperature_2m ?? 11);
      const minTemp = Math.round(daily.temperature_2m_min?.[0] ?? temp - 3);
      const maxTemp = Math.round(daily.temperature_2m_max?.[0] ?? temp + 3);
      const windSpeed = Math.round((current.wind_speed_10m ?? 3.5) * 10) / 10;
      const precipitation = current.precipitation ?? daily.precipitation_sum?.[0] ?? 0;
      const humidity = current.relative_humidity_2m ?? 65;
      const code = current.weather_code ?? 1;

      let condition = 'Klart';
      if (code === 0) condition = 'Sol / Klart';
      else if (code >= 1 && code <= 2) condition = 'Lettskyet / Sol';
      else if (code === 3) condition = 'Overskyet';
      else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) condition = 'Regn';
      else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) condition = 'Snø';
      else if (code >= 95) condition = 'Tordenvær';

      let beaufort = 'Svak vind';
      if (windSpeed >= 17) beaufort = 'Sterk kuling / Storm';
      else if (windSpeed >= 13.9) beaufort = 'Stiv kuling';
      else if (windSpeed >= 10.8) beaufort = 'Liten kuling';
      else if (windSpeed >= 8.0) beaufort = 'Frisk bris';
      else if (windSpeed >= 3.4) beaufort = 'Lett til laber bris';

      let workAdvice = 'Stabile og gode arbeidsforhold for utendørs- og innendørsentreprenørskap.';
      if (windSpeed >= 13.9) {
        workAdvice = '⚠️ Stiv kuling / sterk vind (over 13.9 m/s): Fare ved krankjøring, takarbeid og stillas. Sikre alle løse byggematerialer og presenninger umiddelbart.';
      } else if (temp < 0) {
        workAdvice = '❄️ Minusgrader: Fare for glatt stillas og frosne vannrør. Husk vintertilsetning i mørtel/betong og god tildekking av ferske konstruksjoner.';
      } else if (precipitation > 2) {
        workAdvice = '🌧️ Nedbør meldt (> 2 mm): Utvendig tømrerarbeid og maling krever tildekking. Vurder å prioritere innvendige arbeider.';
      } else if (windSpeed >= 10.8) {
        workAdvice = '💨 Liten kuling (over 10.8 m/s): Vær ekstra varsom ved håndtering av store bygningsplater, taktekking og stillasarbeid.';
      }

      return {
        temp,
        minTemp,
        maxTemp,
        condition,
        windSpeed,
        beaufort,
        precipitation,
        humidity,
        workAdvice,
        locationName: name,
        isLive: true
      };
    }
  } catch (e) {
    console.warn('Weather fetch timeout/error, using safe fallback:', e);
  }

  return {
    temp: 11,
    minTemp: 7,
    maxTemp: 14,
    condition: 'Opphold / Lettskyet',
    windSpeed: 3.2,
    beaufort: 'Lett bris',
    precipitation: 0,
    humidity: 65,
    workAdvice: 'Gode og stabile arbeidsforhold for utendørs- og innendørsentreprenørskap.',
    locationName: name,
    isLive: false
  };
}