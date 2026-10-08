/**
 * 🌤️ Dato-tolkning og tekstbygging for værsvar i MesterAI.
 *
 * BAKGRUNN
 * Chat-ruten svarte med én hardkodet tekst som bare gjaldt «nå»:
 * «Temperatur nå», «Dagens spenn», «Nedbør i dag». Spørsmål som
 * «hva blir været til helgen?» traff samme snarvei og fikk dermed dagens
 * observasjon som svar — selv om Open-Meteo faktisk leverte et dagsvarsel som
 * ble hentet og kastet.
 *
 * Denne modulen er ren: ingen nettverkskall og ingen database. Den tolker
 * hvilke dager brukeren faktisk spurte om, og bygger svaret. All værdata
 * kommer fra weatherService.
 *
 * 🛡️ ÆRLIGHET: Vi gjetter aldri på en dato. Er dagen utenfor varselet, sier vi
 * hvor langt varselet rekker. Er datoen uforståelig, spør vi i stedet for å
 * presentere dagens vær som om det var svaret.
 */
import type { ForecastDay, LiveWeatherReport } from './weatherService';
import { formatDayLabel, formatMonthDay, osloIsoDate } from './weatherService';

export type WeatherRequestKind = 'current' | 'days' | 'beyond-forecast' | 'unresolved-date';

export interface WeatherRequest {
  kind: WeatherRequestKind;
  /** Dagene svaret gjelder. Tom for rene «nå»-spørsmål. */
  days: ForecastDay[];
  /** Kort etikett til overskrift og hurtigvalg, f.eks. «helgen». */
  label: string;
}

const WEEKDAY_TO_DOW: Record<string, number> = {
  søndag: 0, sondag: 0,
  mandag: 1,
  tirsdag: 2,
  onsdag: 3,
  torsdag: 4,
  fredag: 5,
  lørdag: 6, lordag: 6
};

const MONTH_INDEX: Record<string, number> = {
  januar: 1, februar: 2, mars: 3, april: 4, mai: 5, juni: 6,
  juli: 7, august: 8, september: 9, oktober: 10, november: 11, desember: 12
};

const MONTH_PATTERN = Object.keys(MONTH_INDEX).join('|');

function dowFromIso(isoDate: string): number {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? new Date().getUTCDay() : d.getUTCDay();
}

/**
 * Tolker hvilke dager et værsvar skal gjelde.
 *
 * Rekkefølgen betyr noe: eksplisitte datoer før relative ord, «i overmorgen»
 * før «i morgen», og «helg» før ukedagsnavn (en helg inneholder to dager).
 */
export function resolveWeatherRequest(
  message: string,
  forecast: ForecastDay[],
  now: Date = new Date()
): WeatherRequest {
  const lower = (message || '').toLowerCase();
  const todayIso = osloIsoDate(now);
  let todayIdx = forecast.findIndex(d => d.date === todayIso);
  if (todayIdx < 0) todayIdx = 0;
  const todayDow = dowFromIso(forecast[todayIdx]?.date || todayIso);

  /** Plukker dager relativt til i dag, og sier ærlig fra når noe faller utenfor. */
  const pickDays = (offsets: number[], label: string): WeatherRequest => {
    const wanted = offsets.filter(o => o >= 0);
    const inRange = wanted.filter(o => todayIdx + o < forecast.length);
    const days = inRange.map(o => forecast[todayIdx + o]);
    if (days.length === 0 || inRange.length !== wanted.length) {
      return { kind: 'beyond-forecast', days, label };
    }
    return { kind: 'days', days, label };
  };

  const dayByMonthDay = (day: number, month: number): WeatherRequest | null => {
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    const idx = forecast.findIndex(d => {
      const parts = d.date.split('-');
      return Number(parts[1]) === month && Number(parts[2]) === day;
    });
    if (idx >= 0) return { kind: 'days', days: [forecast[idx]], label: formatDayLabel(forecast[idx].date) };
    return { kind: 'beyond-forecast', days: [], label: formatMonthDay(day, month) };
  };

  // 1) ISO-dato: 2026-10-12
  const iso = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const req = dayByMonthDay(Number(iso[3]), Number(iso[2]));
    if (req) return req;
  }

  // 2) Norsk datoskrivemåte med månedsnavn: «12. oktober», «3 november»
  const named = lower.match(new RegExp(`\\b(\\d{1,2})\\.?\\s+(${MONTH_PATTERN})\\b`));
  if (named) {
    const req = dayByMonthDay(Number(named[1]), MONTH_INDEX[named[2]]);
    if (req) return req;
  }

  // 3) Kort datoskrivemåte: «12.10», «12/10», «12.10.2026»
  const dotted = lower.match(/\b(\d{1,2})[./](\d{1,2})(?:[./]\d{2,4})?\b/);
  if (dotted) {
    const req = dayByMonthDay(Number(dotted[1]), Number(dotted[2]));
    if (req) return req;
  }

  // 4) Relative dager — «i overmorgen» må testes før «i morgen».
  if (/\b(i overmorgen|overimorgen)\b/.test(lower)) return pickDays([2], 'i overmorgen');
  if (/\b(i morgen|imorgen|i mårra|imårra|morgendagen)\b/.test(lower)) return pickDays([1], 'i morgen');
  if (/\b(i dag|idag|i natt|i ettermiddag|i kveld|akkurat nå|for øyeblikket)\b/.test(lower)) {
    return { kind: 'current', days: [], label: 'i dag' };
  }

  // 5) Helg: kommende lørdag + søndag. Er det allerede lørdag, er helgen nå.
  if (/\b(helg|helga|helgen|weekend)\b/.test(lower)) {
    const toSaturday = (6 - todayDow + 7) % 7;
    return pickDays(
      [toSaturday, toSaturday + 1],
      toSaturday === 0 ? 'helgen (i dag og i morgen)' : 'helgen'
    );
  }

  // 6) Uker
  if (/\bneste uke\b/.test(lower)) {
    const toMonday = ((1 - todayDow + 7) % 7) || 7;
    return pickDays([toMonday, toMonday + 1, toMonday + 2, toMonday + 3, toMonday + 4], 'neste uke (mandag–fredag)');
  }
  if (/\b(denne uka|denne uken|denne uke)\b/.test(lower)) {
    const rest = 6 - todayDow;
    return pickDays(Array.from({ length: rest + 1 }, (_, i) => i), 'resten av denne uken');
  }

  // 7) «neste N dager»
  const nDays = lower.match(/\b(?:neste|kommende)\s+(\d{1,2})\s+dag/);
  if (nDays) {
    const n = Math.min(Math.max(Number(nDays[1]), 1), 16);
    return pickDays(Array.from({ length: n }, (_, i) => i), `de neste ${n} dagene`);
  }

  // 8) Ukedagsnavn — «på fredag», «neste tirsdag»
  for (const [name, dow] of Object.entries(WEEKDAY_TO_DOW)) {
    const rx = new RegExp(`(^|[\\s,.!?])(på |til |i )?${name}(en|s)?([\\s,.!?]|$)`);
    if (!rx.test(lower)) continue;
    const isNextWeek = new RegExp(`\\bneste\\s+${name}`).test(lower);
    const offset = ((dow - todayDow + 7) % 7) + (isNextWeek ? 7 : 0);
    return pickDays([offset], isNextWeek ? `${name} (neste uke)` : name);
  }

  // 9) Nevnes en dato vi ikke forstod, skal vi si det — ikke svare «nå».
  const mentionsDate = /\b(dag|dager|dagene|uke|uka|uken|dato|måned|måneden|helg)\b/.test(lower)
    || new RegExp(`\\b(${MONTH_PATTERN})\\b`).test(lower);
  if (mentionsDate) return { kind: 'unresolved-date', days: [], label: '' };

  // 10) Ingen dato nevnt: dagens forhold, som før.
  return { kind: 'current', days: [], label: 'i dag' };
}

/** Kort etikett for hurtigvalg: «lørdag 10. oktober» eller «i dag». */
export function requestLabel(request: WeatherRequest): string {
  if (request.kind === 'days' && request.days.length > 0) return formatDayLabel(request.days[0].date);
  return request.label || 'i dag';
}

function renderDay(day: ForecastDay): string {
  return `📅 **${formatDayLabel(day.date)}**\n`
    + `• **Temperatur:** ${day.minTemp}°C til ${day.maxTemp}°C\n`
    + `• **Værforhold:** ${day.condition}\n`
    + `• **Vind:** opptil ${day.windMaxMs} m/s (${day.windBeaufort})\n`
    + `• **Nedbør:** ${day.precipitationMm} mm\n`
    + `🛡️ **HMS-råd:** ${day.workAdvice}`;
}

/** Kompakt énlinjes oversikt, så brukeren ser hva som finnes uten å spørre. */
function compactForecast(forecast: ForecastDay[], from: number, count = 5): string {
  const days = forecast.slice(from, from + count);
  if (days.length === 0) return '';
  const parts = days.map(d => `${d.weekday.slice(0, 3)} ${d.minTemp}–${d.maxTemp}°C, ${d.condition.toLowerCase()}`);
  return `\n\n📅 **Varsel framover:** ${parts.join(' · ')}`;
}

/**
 * Bygger svaret brukeren ser.
 *
 * `projectTitle` er byggeplassen spørsmålet gjelder, når den er kjent.
 */
export function renderWeatherReport(
  report: LiveWeatherReport,
  request: WeatherRequest,
  projectTitle?: string
): string {
  // 🛡️ Uten ekte data finnes det ikke noe varsel. Da sier vi det, i stedet for
  // å presentere reserveverdiene som om de var målinger.
  if (!report.isLive) {
    return `⚠️ **Jeg fikk ikke hentet værdata for ${report.locationName}**\n\n${report.workAdvice}`;
  }

  const site = projectTitle && projectTitle !== 'Alle byggeplasser' ? projectTitle : report.locationName;
  const header = `🌤️ **Værvarsel og HMS-arbeidsforhold for ${report.locationName}**\n*Gjelder byggeplass: ${site}*\n\n`;
  const horizon = report.forecast.length > 0 ? report.forecast[report.forecast.length - 1] : null;
  const horizonNote = horizon ? `\n\n_Varselet rekker til og med ${formatDayLabel(horizon.date)}._` : '';
  const prompt = `\n\n💡 Spør gjerne om en bestemt dag — f.eks. «værvarselet til helgen» eller «vær på fredag».`;

  if (request.kind === 'days') {
    return header
      + request.days.map(renderDay).join('\n\n')
      + compactForecast(report.forecast, 0)
      + horizonNote;
  }

  if (request.kind === 'beyond-forecast') {
    return header
      + `📅 **${request.label}** ligger utenfor varselet jeg kan hente.\n`
      + (horizon ? `Jeg har pålitelige data til og med **${formatDayLabel(horizon.date)}** (${report.forecast.length} dager). ` : '')
      + `Jeg vil ikke gjette på været lenger fram enn det.\n\n`
      + (request.days.length > 0 ? request.days.map(renderDay).join('\n\n') + '\n\n' : '')
      + compactForecast(report.forecast, 0);
  }

  if (request.kind === 'unresolved-date') {
    const shown = report.forecast.slice(0, 7);
    const rest = report.forecast.length - shown.length;
    return header
      + `Jeg er ikke sikker på hvilken dag du mener. Her er varselet jeg har:\n\n`
      + shown
        .map(d => `• **${formatDayLabel(d.date)}:** ${d.minTemp}–${d.maxTemp}°C, ${d.condition.toLowerCase()}, ${d.precipitationMm} mm nedbør, vind opptil ${d.windMaxMs} m/s`)
        .join('\n')
      + (rest > 0 && horizon ? `\n• …og ${rest} dager til (til og med ${formatDayLabel(horizon.date)}).` : '')
      + `\n\nSi for eksempel «i morgen», «til helgen» eller «fredag», så svarer jeg for den dagen.`;
  }

  // kind === 'current'
  const today = report.forecast[0];
  return header
    + `• **Temperatur nå:** ${report.temp}°C (Dagens spenn: ${report.minTemp}°C til ${report.maxTemp}°C)\n`
    + `• **Værforhold:** ${report.condition}\n`
    + `• **Vindstyrke:** ${report.windSpeed} m/s (${report.beaufort})\n`
    + `• **Nedbør nå:** ${report.precipitation} mm\n`
    + (today ? `• **Nedbør i dag totalt:** ${today.precipitationMm} mm\n` : '')
    + `• **Relativ luftfuktighet:** ${report.humidity}%\n\n`
    + `🛡️ **HMS- og Arbeidsråd for byggeplassen:**\n${report.workAdvice}`
    + compactForecast(report.forecast, 1)
    + horizonNote
    + prompt;
}
