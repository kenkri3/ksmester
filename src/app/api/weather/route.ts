import { NextRequest, NextResponse } from 'next/server';

export interface WeatherPayload {
  temp: number;
  condition: string;
  windSpeed: number;
  precipitation: number;
  humidity?: number;
  description: string;
  icon: 'sun' | 'cloud' | 'rain' | 'snow' | 'wind' | 'cloud-lightning';
  locationName: string;
  workAdvice: string;
}

const weatherCache = new Map<string, { data: WeatherPayload; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function generateCraftAdvice(temp: number, windSpeed: number, precipitation: number): string {
  if (windSpeed >= 12) {
    return 'Vindkuling (over 12 m/s): Fare ved krankjøring, takarbeid og stillas. Sikre alle løse byggematerialer og presenninger.';
  }
  if (temp < 0) {
    return 'Minusgrader: Fare for glatt stillas og frosne vannrør. Husk vintertilsetning i mørtel/betong og god tildekking av ferske konstruksjoner.';
  }
  if (precipitation > 2) {
    return 'Nedbør (> 2 mm): Utvendig tømrerarbeid og maling krever tildekking. Vurder å prioritere innvendige arbeider.';
  }
  if (temp >= 24) {
    return 'Varmt vær og rask tørk: Sørg for hyppig vanning av fersk betong/mørtel og rikelig drikkevann til mannskapet.';
  }
  return 'Gode og stabile arbeidsforhold for utendørs- og innendørsentreprenørskap.';
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const locationParam = (url.searchParams.get('location') || '').trim();
    const latParam = url.searchParams.get('lat');
    const lonParam = url.searchParams.get('lon');

    let lat = 59.91;
    let lon = 10.75;
    let locationName = locationParam || 'Oslo';

    if (latParam && lonParam && !isNaN(Number(latParam)) && !isNaN(Number(lonParam))) {
      lat = Number(latParam);
      lon = Number(lonParam);
    } else {
      const locLower = locationName.toLowerCase();
      if (locLower.includes('horten') || locLower.includes('kongeveien')) {
        lat = 59.42; lon = 10.48;
      } else if (locLower.includes('tønsberg') || locLower.includes('tonsberg')) {
        lat = 59.27; lon = 10.41;
      } else if (locLower.includes('sandefjord')) {
        lat = 59.13; lon = 10.22;
      } else if (locLower.includes('larvik')) {
        lat = 59.05; lon = 10.03;
      } else if (locLower.includes('bergen')) {
        lat = 60.39; lon = 5.32;
      } else if (locLower.includes('trondheim')) {
        lat = 63.43; lon = 10.39;
      } else if (locLower.includes('stavanger')) {
        lat = 58.97; lon = 5.73;
      } else if (locLower.includes('tromsø') || locLower.includes('tromso')) {
        lat = 69.65; lon = 18.96;
      } else if (locLower.includes('bodø') || locLower.includes('bodo')) {
        lat = 67.28; lon = 14.40;
      } else if (locLower.includes('kristiansand')) {
        lat = 58.15; lon = 8.00;
      } else if (locLower.includes('drammen')) {
        lat = 59.74; lon = 10.20;
      } else if (locLower.includes('fredrikstad') || locLower.includes('sarpsborg')) {
        lat = 59.22; lon = 10.93;
      }
    }

    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ ...cached.data, locationName });
    }

    try {
      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&wind_speed_unit=ms`;
      const res = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json();
        const current = data.current || {};
        const temp = Math.round(current.temperature_2m ?? 12);
        const windSpeed = Math.round((current.wind_speed_10m ?? 3.5) * 10) / 10;
        const precipitation = current.precipitation ?? 0;
        const humidity = current.relative_humidity_2m ?? 65;
        const code = current.weather_code ?? 1;

        let condition = 'Klart';
        let icon: WeatherPayload['icon'] = 'sun';

        if (code === 0) {
          condition = 'Sol / Klart';
          icon = 'sun';
        } else if (code >= 1 && code <= 2) {
          condition = 'Lettskyet / Sol';
          icon = 'sun';
        } else if (code === 3) {
          condition = 'Overskyet';
          icon = 'cloud';
        } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
          condition = 'Regn';
          icon = 'rain';
        } else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
          condition = 'Snø';
          icon = 'snow';
        } else if (code >= 95) {
          condition = 'Tordenvær';
          icon = 'cloud-lightning';
        }

        if (windSpeed > 11 && icon !== 'rain' && icon !== 'snow') {
          icon = 'wind';
        }

        const payload: WeatherPayload = {
          temp,
          condition,
          windSpeed,
          precipitation,
          humidity,
          description: `${condition}, ${temp}°C, vind ${windSpeed} m/s.`,
          icon,
          locationName,
          workAdvice: generateCraftAdvice(temp, windSpeed, precipitation)
        };

        weatherCache.set(cacheKey, { data: payload, timestamp: Date.now() });
        return NextResponse.json(payload);
      }
    } catch (fetchErr) {
      console.warn('Open-Meteo external fetch error, using safe fallback:', fetchErr);
    }

    // Safe, non-recursive fallback
    const fallback: WeatherPayload = {
      temp: 11,
      condition: 'Opphold',
      windSpeed: 3.2,
      precipitation: 0,
      humidity: 60,
      description: 'Opphold, 11°C, vind 3.2 m/s.',
      icon: 'cloud',
      locationName,
      workAdvice: 'Gode og stabile arbeidsforhold for utendørs- og innendørsentreprenørskap.'
    };
    weatherCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
    return NextResponse.json(fallback);
  } catch (err: any) {
    console.error('Weather API route fatal error:', err);
    return NextResponse.json({
      temp: 10,
      condition: 'Normalt',
      windSpeed: 3,
      precipitation: 0,
      description: 'Stabile forhold på byggeplassen.',
      icon: 'cloud',
      locationName: 'Byggeplass',
      workAdvice: 'Gode arbeidsforhold for entreprenørskap.'
    });
  }
}
