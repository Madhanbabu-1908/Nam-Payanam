// Open-Meteo API — completely free, no API key needed
const BASE = 'https://api.open-meteo.com/v1/forecast';
const WMO_CODES = {
  0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Foggy', 51:'Light drizzle', 61:'Light rain', 63:'Moderate rain',
  65:'Heavy rain', 71:'Light snow', 80:'Rain showers', 95:'Thunderstorm',
};
const WMO_ICONS = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',
  63:'🌧️',65:'⛈️',71:'❄️',80:'🌦️',95:'⛈️',
};

async function getWeatherForLocation(lat, lng, dates = []) {
  try {
    const url = `${BASE}?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=Asia%2FKolkata&forecast_days=16`;
    const res = await fetch(url);
    const data = await res.json();

    const { daily } = data;
    if (!daily) return null;

    return daily.time.map((date, i) => ({
      date,
      code: daily.weathercode[i],
      description: WMO_CODES[daily.weathercode[i]] || 'Unknown',
      icon: WMO_ICONS[daily.weathercode[i]] || '🌡️',
      maxTemp: Math.round(daily.temperature_2m_max[i]),
      minTemp: Math.round(daily.temperature_2m_min[i]),
      precipitation: daily.precipitation_sum[i],
      windSpeed: Math.round(daily.windspeed_10m_max[i]),
    }));
  } catch (err) {
    console.error('Weather fetch error:', err.message);
    return null;
  }
}

module.exports = { getWeatherForLocation };
