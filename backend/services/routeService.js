// Real routing via Nominatim (geocoding) + OSRM (routing)
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NamPayanam/1.0 (trip planning app)' },
    ...opts
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

// Geocode a place name → { lat, lng, displayName }
async function geocodePlace(name, bias = 'India') {
  const q = encodeURIComponent(`${name}, ${bias}`);
  const data = await fetchJson(
    `${NOMINATIM}/search?q=${q}&format=json&limit=3&addressdetails=1`
  );
  if (!data?.length) throw new Error(`Could not find location: ${name}`);
  const best = data[0];
  return {
    lat: parseFloat(best.lat),
    lng: parseFloat(best.lon),
    displayName: best.display_name,
    shortName: best.address?.city || best.address?.town ||
               best.address?.state || name,
  };
}

// Autocomplete suggestions for a search query
async function searchSuggestions(query) {
  if (!query || query.length < 2) return [];
  const q = encodeURIComponent(query + ', India');
  try {
    const data = await fetchJson(
      `${NOMINATIM}/search?q=${q}&format=json&limit=6&addressdetails=1&countrycodes=in`
    );
    return (data || []).map(r => ({
      label: r.display_name,
      shortLabel: [
        r.address?.city || r.address?.town || r.address?.village || r.name,
        r.address?.state,
      ].filter(Boolean).join(', '),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      type: r.type,
    }));
  } catch { return []; }
}

// Calculate route between multiple waypoints using OSRM
async function calculateRoute(waypoints) {
  // waypoints: [{lat, lng, name}, ...]
  if (waypoints.length < 2) throw new Error('Need at least 2 waypoints');

  const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
  const url = `${OSRM}/${coords}?overview=full&geometries=geojson&steps=true`;

  const data = await fetchJson(url);
  if (data.code !== 'Ok') throw new Error('OSRM routing failed: ' + data.message);

  const route = data.routes[0];
  const totalDistanceKm = Math.round(route.distance / 100) / 10;
  const totalDurationMin = Math.round(route.duration / 60);

  // Per-leg breakdown
  const segments = route.legs.map((leg, i) => ({
    from: waypoints[i]?.name || `Stop ${i+1}`,
    to: waypoints[i+1]?.name || `Stop ${i+2}`,
    distanceKm: Math.round(leg.distance / 100) / 10,
    durationMin: Math.round(leg.duration / 60),
    durationText: formatDuration(leg.duration),
  }));

  return {
    totalDistanceKm,
    totalDurationMin,
    totalDurationText: formatDuration(route.duration),
    segments,
    geometry: route.geometry, // GeoJSON LineString for map drawing
    waypoints: data.waypoints.map((w, i) => ({
      name: waypoints[i]?.name,
      lat: w.location[1],
      lng: w.location[0],
    })),
  };
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// Calculate fuel estimate
function calculateFuel(distanceKm, mileageKmpl = 15, pricePerLitre = 100) {
  const litres = distanceKm / mileageKmpl;
  return {
    litres: Math.round(litres * 10) / 10,
    cost: Math.round(litres * pricePerLitre),
    perPerson: null, // calculated by caller based on group size
  };
}

module.exports = { geocodePlace, searchSuggestions, calculateRoute, calculateFuel };
