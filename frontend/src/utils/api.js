import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 90000,
});

api.interceptors.response.use(
  r => r.data,
  err => Promise.reject(new Error(err.response?.data?.error || err.message || 'Network error'))
);

export const tripAPI = {
  searchLocation:   (q) => api.get(`/trips/search-location?q=${encodeURIComponent(q)}`),
  calculateRoute:   (waypoints) => api.post('/trips/calculate-route', { waypoints }),
  getAIQuestions:   (data) => api.post('/trips/ai-questions', data),
  generatePlans:    (data) => api.post('/trips/ai-plans', data),
  create:           (data) => api.post('/trips', data),
  getMyTrips:       (sessionId) => api.get(`/trips/my/${sessionId}`),
  getByCode:        (code) => api.get(`/trips/${code}`),
  join:             (code, nickname, sessionId) => api.post(`/trips/${code}/join`, { nickname, sessionId }),
  delete:           (tripId, organizerId) => api.delete(`/trips/${tripId}`, { data: { organizerId } }),
  removeMember:     (tripId, memberId, organizerId) => api.delete(`/trips/${tripId}/members/${memberId}`, { data: { organizerId } }),
  updateStatus:     (tripId, status, organizerId) => api.patch(`/trips/${tripId}/status`, { status, organizerId }),
  updateProgress:   (tripId, data) => api.patch(`/trips/${tripId}/progress`, data),
  postAnnouncement: (tripId, data) => api.post(`/trips/${tripId}/announcements`, data),
  getAnnouncements: (tripId) => api.get(`/trips/${tripId}/announcements`),
};

export const expenseAPI = {
  add:         (data) => api.post('/expenses', data),
  getAll:      (tripId) => api.get(`/expenses/${tripId}`),
  update:      (id, data) => api.patch(`/expenses/${id}`, data),
  delete:      (id) => api.delete(`/expenses/${id}`),
  settlements: (tripId) => api.get(`/expenses/${tripId}/settlements`),
  report:      (tripId) => api.get(`/expenses/${tripId}/report`),
};

export const breakAPI = {
  getAll:   (tripId) => api.get(`/breaks/${tripId}`),
  add:      (data) => api.post('/breaks', data),
  update:   (id, data) => api.patch(`/breaks/${id}`, data),
  checkout: (id) => api.patch(`/breaks/${id}/checkout`, {}),
  delete:   (id) => api.delete(`/breaks/${id}`),
};

export const aiAPI = {
  chat:     (message, tripId) => api.post('/ai/chat', { message, tripId }),
  insights: (tripId) => api.get(`/ai/insights/${tripId}`),
};

export default api;

export const trackingAPI = {
  push:        (data) => api.post('/tracking/push', data),
  getLive:     (tripId) => api.get(`/tracking/${tripId}/live`),
  getPath:     (tripId) => api.get(`/tracking/${tripId}/path`),
  createToken: (data) => api.post('/tracking/tokens', data),
  listTokens:  (tripId) => api.get(`/tracking/tokens/${tripId}/list`),
  deleteToken: (tokenId, organizerId) => api.delete(`/tracking/tokens/${tokenId}`, { data: { organizerId } }),
  getByToken:  (token) => api.get(`/track/${token}`),
};

export const authAPI = {
  register:   (data) => api.post('/auth/register', data),
  login:      (data) => api.post('/auth/login', data),
  me:         (accountId) => api.get(`/auth/me/${accountId}`),
  changePin:  (data) => api.patch('/auth/change-pin', data),
};

export const checkinAPI = {
  create:      (data) => api.post('/checkins', data),
  getAll:      (tripId) => api.get(`/checkins/${tripId}`),
  acknowledge: (id) => api.patch(`/checkins/${id}/acknowledge`, {}),
  markPickup:  (id) => api.patch(`/checkins/${id}/pickup`, {}),
};

export const trackingAPI = {
  push:        (data) => api.post('/tracking/location', data),
  getPath:     (tripId) => api.get(`/tracking/${tripId}/path`),
  createToken: (data) => api.post('/tracking/tokens', data),
  getByToken:  (token) => api.get(`/track/${token}`),
};
