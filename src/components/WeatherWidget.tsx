import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  Wind, 
  CloudLightning, 
  MapPin, 
  RefreshCw, 
  Thermometer, 
  Droplets, 
  AlertTriangle, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Compass
} from 'lucide-react';
import { weatherService, WeatherData } from '../services/weatherService';
import { locationService } from '../services/locationService';

interface WeatherWidgetProps {
  projectLocation?: string;
  onWeatherLoaded?: (weather: WeatherData) => void;
  className?: string;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ 
  projectLocation = 'Oslo', 
  onWeatherLoaded,
  className = '' 
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [usingGps, setUsingGps] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setErrorMsg(null);

    // Try browser geolocation first
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 6000, 
            maximumAge: 60000 
          });
        });

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        let locName = 'Min posisjon';
        try {
          const addr = await locationService.getAddressFromCoords(lat, lon);
          if (addr && addr.city) {
            locName = addr.city;
          } else if (addr && addr.fullAddress) {
            locName = addr.fullAddress.split(',')[0];
          }
        } catch (e) {
          console.warn('Geocoding notice:', e);
        }

        const data = await weatherService.getWeatherByCoords(lat, lon, locName);
        setWeather(data);
        setUsingGps(true);
        if (onWeatherLoaded) onWeatherLoaded(data);
        setLoading(false);
        return;
      } catch (e) {
        console.log('Geolocation not available or denied, falling back to project location:', e);
      }
    }

    // Fallback to project location string
    setUsingGps(false);
    try {
      const data = await weatherService.getWeather(projectLocation || 'Oslo');
      setWeather(data);
      if (onWeatherLoaded) onWeatherLoaded(data);
    } catch (err) {
      setErrorMsg('Kunne ikke laste værdata.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [projectLocation]);

  const renderIcon = (iconName?: WeatherData['icon']) => {
    switch (iconName) {
      case 'sun':
        return <Sun className="w-8 h-8 text-amber-500 animate-spin-slow" />;
      case 'rain':
        return <CloudRain className="w-8 h-8 text-blue-500" />;
      case 'snow':
        return <CloudSnow className="w-8 h-8 text-sky-300" />;
      case 'wind':
        return <Wind className="w-8 h-8 text-teal-500" />;
      case 'cloud-lightning':
        return <CloudLightning className="w-8 h-8 text-purple-500" />;
      case 'cloud':
      default:
        return <Cloud className="w-8 h-8 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className={`p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl shadow-xl ${className}`}>
        <div className="flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full" />
            <div className="space-y-2">
              <div className="w-24 h-3 bg-white/20 rounded" />
              <div className="w-16 h-2 bg-white/10 rounded" />
            </div>
          </div>
          <RefreshCw className="w-4 h-4 text-white/50 animate-spin" />
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const isWarningWeather = weather.windSpeed > 10 || weather.precipitation > 5 || weather.temp < 0;

  return (
    <div className={`overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-900 to-slate-900 text-white rounded-3xl border border-white/10 shadow-xl transition-all ${className}`}>
      {/* Top Header Row */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
              <MapPin size={14} />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-200 tracking-wide block">
                {weather.locationName}
              </span>
              <span className="text-[10px] text-neutral-400 font-medium flex items-center gap-1">
                {usingGps ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Compass size={10} /> GPS-posisjon
                  </span>
                ) : (
                  <span>Prosjektområde</span>
                )}
              </span>
            </div>
          </div>

          <button 
            onClick={fetchWeather}
            disabled={loading}
            title="Oppdater vær"
            className="p-2 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Temperature & Main Conditions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
              {renderIcon(weather.icon)}
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tight">{weather.temp}°</span>
                <span className="text-xs font-bold text-neutral-400">C</span>
              </div>
              <span className="text-xs font-medium text-neutral-300">
                {weather.condition}
              </span>
            </div>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex flex-col gap-1.5 text-[11px] text-neutral-300 font-medium">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
              <Wind size={12} className="text-teal-400" />
              <span>{weather.windSpeed} m/s</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
              <Droplets size={12} className="text-blue-400" />
              <span>{weather.precipitation} mm</span>
            </div>
          </div>
        </div>

        {/* Work Advice Banner for Craftsmen */}
        {weather.workAdvice && (
          <div className={`mt-3.5 p-3 rounded-2xl border ${
            isWarningWeather 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}>
            <div className="flex items-start gap-2.5">
              {isWarningWeather ? (
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="text-[10px] font-black uppercase tracking-wider opacity-80 mb-0.5">
                  Arbeidsråd for byggeplassen
                </div>
                <p className="text-xs leading-relaxed font-medium">
                  {weather.workAdvice}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expand / Collapse Button */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 pt-2 border-t border-white/5 flex items-center justify-center gap-1 text-[11px] font-bold text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <span>{isExpanded ? 'Mindre detaljer' : 'Planlegg arbeidsdagen min'}</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Expanded Details Panel */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-black/30 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-white/5 rounded-xl">
            <span className="text-[10px] text-neutral-400 block font-medium">Fuktighet</span>
            <span className="text-xs font-bold text-white">{weather.humidity ?? 70}%</span>
          </div>
          <div className="p-2 bg-white/5 rounded-xl">
            <span className="text-[10px] text-neutral-400 block font-medium">Vindstyrke</span>
            <span className="text-xs font-bold text-white">{weather.windSpeed} m/s</span>
          </div>
          <div className="p-2 bg-white/5 rounded-xl">
            <span className="text-[10px] text-neutral-400 block font-medium">Nedbør</span>
            <span className="text-xs font-bold text-white">{weather.precipitation} mm</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;
