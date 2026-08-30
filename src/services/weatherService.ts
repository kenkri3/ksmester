export interface WeatherData {
  temp: number;
  condition: string;
  windSpeed: number;
  precipitation: number;
  description: string;
  icon: 'sun' | 'cloud' | 'rain' | 'snow' | 'wind' | 'cloud-lightning';
  locationName?: string;
  workAdvice?: string;
  humidity?: number;
}

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const weatherCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<WeatherData>>();

export const weatherService = {
  /**
   * Fetches weather data by coordinates or location name.
   */
  async getWeatherByCoords(lat: number, lon: number, locationName?: string): Promise<WeatherData> {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey) as Promise<WeatherData>;
    }

    const fetchPromise = (async () => {

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&wind_speed_unit=ms`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const current = data.current;
        const temp = Math.round(current.temperature_2m);
        const windSpeed = Math.round(current.wind_speed_10m * 10) / 10;
        const precipitation = current.precipitation || 0;
        const code = current.weather_code;
        const humidity = current.relative_humidity_2m;

        let condition = 'Klart';
        let icon: WeatherData['icon'] = 'sun';

        if (code === 0) {
          condition = 'Sol / Klart';
          icon = 'sun';
        } else if (code >= 1 && code <= 3) {
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

        const advice = this.generateCraftAdvice(temp, windSpeed, precipitation, condition);

        const weatherData: WeatherData = {
          temp,
          condition,
          windSpeed,
          precipitation,
          humidity,
          description: `${condition}, ${temp}°C, vind ${windSpeed} m/s.`,
          icon,
          locationName: locationName || 'Din lokasjon',
          workAdvice: advice
        };

        weatherCache.set(cacheKey, {
          data: weatherData,
          timestamp: Date.now()
        });

        return weatherData;
      }
    } catch (e) {
      console.warn('Open-Meteo fetch failed, using location fallback:', e);
    } finally {
      inFlightRequests.delete(cacheKey);
    }

    // Avoid recursive loop if getWeather throws, but we assume getWeather isn't failing the same way.
    // If fallback is called, we don't cache it under the exact coords since we don't have good data.
    // To prevent infinite recursion, we check if the caller was getWeather
    if (lat === 59.91 && lon === 10.75 && locationName === 'Oslo') {
      return {
        temp: 6,
        condition: 'Overskyet',
        windSpeed: 4,
        precipitation: 0,
        description: 'Overskyet, men opphold. Gode arbeidsforhold.',
        icon: 'cloud',
        locationName: 'Oslo',
        workAdvice: 'Gode og stabile arbeidsforhold for utendørs- og innendørsentreprenørskap.'
      };
    }
    return this.getWeather(locationName || 'Oslo');
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
  },

  /**
   * Generates craft/construction advice based on weather parameters
   */
  generateCraftAdvice(temp: number, windSpeed: number, precipitation: number, condition: string): string {
    if (windSpeed >= 12) {
      return 'Vindkuling ( over 12 m/s): Fare ved krankjøring, takarbeid og stillas. Sikre alle løse byggematerialer.';
    }
    if (temp < 0) {
      return 'Minusgrader: Fare for glatt stillas og frosne vannrør. Husk vintertilsetning i mørtel/betong og god tildekking.';
    }
    if (precipitation > 2) {
      return 'Nedbør: Utvendig tømrer/maling krever tildekking. Vurder å prioritere innvendig arbeid.';
    }
    if (temp >= 22) {
      return 'Gode tørkeforhold. Sørg for tilstrekkelig væskeinntak og solskjerming ved tungt utearbeid.';
    }
    return 'Gode og stabile arbeidsforhold for utendørs- og innendørsentreprenørskap.';
  },

  /**
   * Fetches weather data for a specific location string.
   */
  async getWeather(location: string): Promise<WeatherData> {
    // Basic city coordinates lookup for quick weather
    const locLower = (location || 'oslo').toLowerCase();
    let lat = 59.91;
    let lon = 10.75;
    let name = 'Oslo';

    if (locLower.includes('bergen')) {
      lat = 60.39; lon = 5.32; name = 'Bergen';
    } else if (locLower.includes('trondheim')) {
      lat = 63.43; lon = 10.39; name = 'Trondheim';
    } else if (locLower.includes('stavanger')) {
      lat = 58.97; lon = 5.73; name = 'Stavanger';
    } else if (locLower.includes('tromsø') || locLower.includes('tromso')) {
      lat = 69.65; lon = 18.96; name = 'Tromsø';
    } else if (locLower.includes('bodø') || locLower.includes('bodo')) {
      lat = 67.28; lon = 14.40; name = 'Bodø';
    } else if (locLower.includes('kristiansand')) {
      lat = 58.15; lon = 8.00; name = 'Kristiansand';
    } else if (location && location.trim() !== '') {
      name = location;
    }

    try {
      return await this.getWeatherByCoords(lat, lon, name);
    } catch (e) {
      // Fallback object
      return {
        temp: 6,
        condition: 'Overskyet',
        windSpeed: 4,
        precipitation: 0,
        description: 'Overskyet, men opphold. Gode arbeidsforhold.',
        icon: 'cloud',
        locationName: name,
        workAdvice: 'Gode og stabile arbeidsforhold for utendørs- og innendørsentreprenørskap.'
      };
    }
  }
};

