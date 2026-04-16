import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor
api.interceptors.request.use(config => {
  return config;
}, error => Promise.reject(error));

// Response interceptor
api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// Trip APIs
export const tripAPI = {
  generatePlans: (data) => api.post('/trips/ai-plans', data),
  create: (data) => api.post('/trips', data),
  getByCode: (code) => api.get(`/trips/${code}`),
  join: (code, nickname) => api.post(`/trips/${code}/join`, { nickname }),
  removeMember: (tripId, memberId, organizerId) =>
    api.delete(`/trips/${tripId}/members/${memberId}`, { data: { organizerId } }),
  updateStatus: (tripId, status, organizerId) =>
    api.patch(`/trips/${tripId}/status`, { status, organizerId }),
  updateProgress: (tripId, currentStopIndex, dayReached) =>
    api.patch(`/trips/${tripId}/progress`, { currentStopIndex, dayReached }),
};

// Expense APIs
export const expenseAPI = {
  add: (data) => api.post('/expenses', data),
  getAll: (tripId) => api.get(`/expenses/${tripId}`),
  update: (expenseId, data) => api.patch(`/expenses/${expenseId}`, data),
  delete: (expenseId) => api.delete(`/expenses/${expenseId}`),
  settlements: (tripId) => api.get(`/expenses/${tripId}/settlements`),
  report: (tripId) => api.get(`/expenses/${tripId}/report`),
};

// AI APIs
export const aiAPI = {
  chat: (message, tripId) => api.post('/ai/chat', { message, tripId }),
  insights: (tripId) => api.get(`/ai/insights/${tripId}`),
};

export default api;
