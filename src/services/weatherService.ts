export interface WeatherData {
  temp: number;
  condition: string;
  windSpeed: number;
  precipitation: number;
  description: string;
  icon: 'sun' | 'cloud' | 'rain' | 'snow' | 'wind' | 'cloud-lightning';
}

export const weatherService = {
  /**
   * Fetches weather data for a specific location.
   * In a real app, this would call a weather API (e.g., OpenWeatherMap or Yr.no).
   * For this demo, we'll simulate it based on the location string.
   */
  async getWeather(location: string): Promise<WeatherData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simple simulation logic based on location
    const isNorth = location.toLowerCase().includes('tromsø') || location.toLowerCase().includes('bodø');
    const isWest = location.toLowerCase().includes('bergen') || location.toLowerCase().includes('stavanger');
    
    if (isNorth) {
      return {
        temp: -2,
        condition: 'Snø',
        windSpeed: 12,
        precipitation: 5,
        description: 'Lett snøfall og frisk bris. Fare for glatte partier.',
        icon: 'snow'
      };
    }

    if (isWest) {
      return {
        temp: 8,
        condition: 'Regn',
        windSpeed: 15,
        precipitation: 12,
        description: 'Mye regn og kraftig vind. Sjekk sikring av løse gjenstander.',
        icon: 'rain'
      };
    }

    // Default (Oslo/East)
    return {
      temp: 5,
      condition: 'Overskyet',
      windSpeed: 5,
      precipitation: 0,
      description: 'Overskyet, men opphold. Gode arbeidsforhold.',
      icon: 'cloud'
    };
  }
};
