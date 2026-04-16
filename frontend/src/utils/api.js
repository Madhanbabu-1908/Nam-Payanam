import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const tripAPI = {
  generatePlans: (data) => api.post('/trips/ai-plans', data),
  create: (data) => api.post('/trips', data),
  getByCode: (code) => api.get(`/trips/${code}`),
  join: (code, nickname, sessionId) => api.post(`/trips/${code}/join`, { nickname, sessionId }),
  removeMember: (tripId, memberId, organizerId) => api.delete(`/trips/${tripId}/members/${memberId}`, { data: { organizerId } }),
  deleteTrip: (tripId, organizerId) => api.delete(`/trips/${tripId}`, { data: { organizerId } }),
  updateStatus: (tripId, status, organizerId) => api.patch(`/trips/${tripId}/status`, { status, organizerId }),
  updateProgress: (tripId, currentStopIndex, dayReached) => api.patch(`/trips/${tripId}/progress`, { currentStopIndex, dayReached }),
  addBreak: (data) => api.post(`/trips/${data.tripId}/breaks`, data),
  getBreaks: (tripId) => api.get(`/trips/${tripId}/breaks`),
};

export const sessionAPI = {
  getTrips: (sessionId) => api.get(`/sessions/${sessionId}/trips`),
  touch: (sessionId, tripCode) => api.post('/sessions/touch', { sessionId, tripCode }),
};

export const expenseAPI = {
  add: (data) => api.post('/expenses', data),
  getAll: (tripId) => api.get(`/expenses/${tripId}`),
  update: (expenseId, data) => api.patch(`/expenses/${expenseId}`, data),
  delete: (expenseId) => api.delete(`/expenses/${expenseId}`),
  settlements: (tripId) => api.get(`/expenses/${tripId}/settlements`),
  report: (tripId) => api.get(`/expenses/${tripId}/report`),
};

export const aiAPI = {
  chat: (message, tripId) => api.post('/ai/chat', { message, tripId }),
  insights: (tripId) => api.get(`/ai/insights/${tripId}`),
};

// ── OSRM / Nominatim helpers (client-side, free) ──────────────────────────────

export async function geocodeLocation(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'NamPayanam/1.0' } }
    );
    const data = await res.json();
    return data.map(d => ({
      display_name: d.display_name,
      short_name: d.display_name.split(',').slice(0, 2).join(', '),
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
    }));
  } catch { return []; }
}

export async function getRouteDistance(fromCoords, toCoords) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromCoords.lon},${fromCoords.lat};${toCoords.lon},${toCoords.lat}?overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      return {
        distance_km: Math.round(data.routes[0].distance / 100) / 10,
        duration_minutes: Math.round(data.routes[0].duration / 60),
      };
    }
    return null;
  } catch { return null; }
}

export async function calculateAllDistances(locations) {
  // locations: [{name, lat, lon}, ...]
  const results = [];
  for (let i = 0; i < locations.length - 1; i++) {
    const from = locations[i];
    const to = locations[i + 1];
    const dist = await getRouteDistance(from, to);
    if (dist) {
      results.push({ from: from.name, to: to.name, ...dist });
    }
  }
  return results;
}

export default api;
