import { api } from '../config/api';
import { Trip } from '../types';

export const tripService = {
  getAll: () => api.get<Trip[]>('/trips'),
  getById: (id: string) => api.get<Trip>(`/trips/${id}`),
  create: (data: Partial<Trip>) => api.post<Trip>('/trips', data),
  delete: (id: string) => api.delete(`/trips/${id}`),
};