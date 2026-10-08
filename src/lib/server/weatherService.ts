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

/**
 * Én dag i dagsvarselet. `date` er ISO-dato (YYYY-MM-DD) i Europe/Oslo, slik
 * Open-Meteo leverer den når `timezone=Europe/Oslo` er satt.
 */
export interface ForecastDay {
  date: string;
  /** Norsk ukedagsnavn, f.eks. «lørdag». */
  weekday: string;
  minTemp: number;
  maxTemp: number;
  condition: string;
  precipitationMm: number;
  windMaxMs: number;
  windBeaufort: string;
  workAdvice: string;
}

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
  /**
   * Dagsvarsel framover, indeks 0 = i dag. Tom når vi ikke fikk ekte data — da
   * finnes det ikke noe varsel å vise, og kalleren må si det i stedet for å
   * presentere reserveverdiene.
   */
  forecast: ForecastDay[];
  /** true = ekte data fra Open-Meteo, false = reserveverdier (ikke ekte vær). */
  isLive: boolean;
}

const NB_WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const NB_MONTHS = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember'
];

/**
 * 🛡️ Én kilde til værtekst: værkode (WMO) og vindstyrke oversettes her, ikke
 * på hvert kallested. Uten dette kunne «nå» og «til helgen» beskrevet samme
 * forhold med ulike ord.
 */
export function conditionFromCode(code: number): string {
  const c = Number.isFinite(code) ? code : 1;
  if (c === 0) return 'Sol / Klart';
  if (c >= 1 && c <= 2) return 'Lettskyet / Sol';
  if (c === 3) return 'Overskyet';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'Regn';
  if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) return 'Snø';
  if (c >= 95) return 'Tordenvær';
  return 'Klart';
}

/** Vindstyrke i m/s til norsk beaufort-beskrivelse. */
export function beaufortFromMs(windSpeed: number): string {
  if (windSpeed >= 17) return 'Sterk kuling / Storm';
  if (windSpeed >= 13.9) return 'Stiv kuling';
  if (windSpeed >= 10.8) return 'Liten kuling';
  if (windSpeed >= 8.0) return 'Frisk bris';
  if (windSpeed >= 3.4) return 'Lett til laber bris';
  return 'Svak vind';
}

/** HMS-råd for gitte forhold. Brukes både for nå-situasjonen og per dag. */
export function workAdviceFor(temp: number, windSpeed: number, precipitation: number): string {
  if (windSpeed >= 13.9) {
    return '⚠️ Stiv kuling / sterk vind (over 13.9 m/s): Fare ved krankjøring, takarbeid og stillas. Sikre alle løse byggematerialer og presenninger umiddelbart.';
  }
  if (temp < 0) {
    return '❄️ Minusgrader: Fare for glatt stillas og frosne vannrør. Husk vintertilsetning i mørtel/betong og god tildekking av ferske konstruksjoner.';
  }
  if (precipitation > 2) {
    return '🌧️ Nedbør meldt (> 2 mm): Utvendig tømrerarbeid og maling krever tildekking. Vurder å prioritere innvendige arbeider.';
  }
  if (windSpeed >= 10.8) {
    return '💨 Liten kuling (over 10.8 m/s): Vær ekstra varsom ved håndtering av store bygningsplater, taktekking og stillasarbeid.';
  }
  return 'Stabile og gode arbeidsforhold for utendørs- og innendørsentreprenørskap.';
}

/** Norsk ukedagsnavn for en ISO-dato. Tom streng hvis datoen ikke kan leses. */
export function weekdayNb(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return NB_WEEKDAYS[d.getUTCDay()] || '';
}

/** «lørdag 11. oktober» for en ISO-dato. */
export function formatDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${NB_WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}. ${NB_MONTHS[d.getUTCMonth()]}`;
}

/** «1. januar» for en dag og måned uten år — brukes når datoen er utenfor varselet. */
export function formatMonthDay(day: number, month: number): string {
  const name = NB_MONTHS[month - 1];
  return name ? `${day}. ${name}` : `${day}.${month}.`;
}

/** ISO-dato (YYYY-MM-DD) for et tidspunkt, regnet i Europe/Oslo. */
export function osloIsoDate(at: Date = new Date()): string {
  // sv-SE gir YYYY-MM-DD direkte, og med Europe/Oslo blir døgngrensen riktig.
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(at);
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

/** Ord som ikke er stedsnavn, men som ofte står i prosjektnavn. */
const GENERIC_PROJECT_WORDS = new Set([
  'nybygg', 'tilbygg', 'påbygg', 'renovering', 'rehabilitering', 'ombygging', 'oppussing',
  'bad', 'badet', 'våtrom', 'kjøkken', 'stue', 'soverom', 'etasje', 'sone', 'garasje', 'terrasse',
  'prosjekt', 'prosjektet', 'bygg', 'bygget', 'byggherre', 'enebolig', 'leilighet', 'hytte',
  'arbeid', 'jobben', 'test', 'demo', 'service', 'vedlikehold', 'totalrenovering'
]);

async function geocodeCandidate(candidate: string): Promise<any | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(candidate)}&count=1&language=no&format=json`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.results?.[0];
    if (!hit || typeof hit.latitude !== 'number' || typeof hit.longitude !== 'number') return null;
    return hit;
  } catch {
    return null;
  }
}

/**
 * Slår opp ukjente steder via Open-Meteos geokodingstjeneste.
 *
 * Norske prosjektadresser skrives ofte som «Storgata 5, 6413 Molde», der byen
 * står ETTER komma og postnummeret foran. Prosjektnavn er ofte «Nybygg Ålesund»,
 * der stedsnavnet er ett av flere ord. Vi prøver derfor inntil fire kandidater:
 * byen etter komma, hele strengen, strengen uten tall, og til slutt det lengste
 * ordet som ikke er et generisk bygg-ord.
 *
 * 🛡️ Vi godtar KUN treff i Norge. For enkeltord krever vi i tillegg at treffet
 * er et tettsted (feature_code «P*»), ellers kunne en gatestubb gitt feil by.
 */
async function geocodeLocation(query: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const raw = (query || '').trim();
  if (!raw) return null;

  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
  const candidates: { text: string; requireTown: boolean }[] = [];

  if (parts.length > 1) {
    // «6413 Molde» -> «Molde»
    candidates.push({ text: parts[parts.length - 1].replace(/^\d{4}\s*/, '').trim(), requireTown: false });
  }
  candidates.push({ text: raw, requireTown: false });
  candidates.push({ text: raw.replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim(), requireTown: false });

  const longestWord = raw
    .split(/[^A-Za-zÆØÅæøå]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 4 && !GENERIC_PROJECT_WORDS.has(t.toLowerCase()))
    .sort((x, y) => y.length - x.length)[0];
  if (longestWord) candidates.push({ text: longestWord, requireTown: true });

  for (const candidate of candidates) {
    if (!candidate.text || candidate.text.length < 3) continue;
    const hit = await geocodeCandidate(candidate.text);
    if (!hit) continue;
    if (hit.country_code !== 'NO') continue;
    if (candidate.requireTown && !String(hit.feature_code || '').startsWith('P')) continue;
    return { lat: hit.latitude, lon: hit.longitude, name: hit.name || candidate.text };
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
      forecast: [],
      isLive: false
    };
  }

  const { lat, lon, name } = coords;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&forecast_days=14&wind_speed_unit=ms&timezone=Europe%2FOslo`;
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

      const condition = conditionFromCode(code);
      const beaufort = beaufortFromMs(windSpeed);
      const workAdvice = workAdviceFor(temp, windSpeed, precipitation);

      // 📅 Dagsvarsel: HELE serien brukes, ikke bare indeks 0. Uten dette kunne
      // agenten bare svare på været akkurat nå — spørsmål som «værvarselet til
      // helgen» fikk dagens observasjon som svar, selv om dataene var hentet.
      const dates: string[] = Array.isArray(daily.time) ? daily.time : [];
      const codes: number[] = Array.isArray(daily.weather_code) ? daily.weather_code : [];
      const forecast: ForecastDay[] = dates.map((date: string, i: number) => {
        const dayMin = Math.round(daily.temperature_2m_min?.[i] ?? temp);
        const dayMax = Math.round(daily.temperature_2m_max?.[i] ?? temp);
        const dayPrecip = Math.round((daily.precipitation_sum?.[i] ?? 0) * 10) / 10;
        const dayWind = Math.round((daily.wind_speed_10m_max?.[i] ?? 0) * 10) / 10;
        return {
          date,
          weekday: weekdayNb(date),
          minTemp: dayMin,
          maxTemp: dayMax,
          condition: conditionFromCode(codes[i] ?? 1),
          precipitationMm: dayPrecip,
          windMaxMs: dayWind,
          windBeaufort: beaufortFromMs(dayWind),
          workAdvice: workAdviceFor(Math.round((dayMin + dayMax) / 2), dayWind, dayPrecip)
        };
      });

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
        forecast,
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
    forecast: [],
    isLive: false
  };
}