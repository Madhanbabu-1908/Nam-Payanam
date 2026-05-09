// frontend/src/services/tripService.ts
import { api } from '../config/api';
import { Trip } from '../types';

// Define local types if not exported from shared/types
interface TripMember {
  user_id: string;
  role: string;
  profiles?: { full_name: string; email: string; avatar_url?: string };
}

interface Expense {
  id: string;
  trip_id: string;
  amount: number;
  description: string;
  paid_by_user_id: string;
  created_at: string;
}

interface CheckIn {
  id: string;
  trip_id: string;
  user_id: string;
  location?: string;
  timestamp: string;
}

export const tripService = {
  // --- TRIPS ---
  getAll: () => api.get<Trip[]>('/trips/my'), // Matches getMyTrips controller
  getById: (id: string) => api.get<Trip>(`/trips/${id}`),
  create: (data: Partial<Trip>) => api.post<Trip>('/trips', data),
  update: (id: string, data: Partial<Trip>) => api.put<Trip>(`/trips/${id}`, data),
  delete: (id: string) => api.delete(`/trips/${id}`),

  // --- MEMBERS (Fixes 404/500) ---
  // Ensure URL is /trips/:id/members (plural trips)
  getMembers: (tripId: string) => api.get<TripMember[]>(`/trips/${tripId}/members`),

  // --- EXPENSES (Fixes 500) ---
  // Ensure URL matches backend route /expenses/:tripId
  getExpenses: (tripId: string) => api.get<Expense[]>(`/expenses/${tripId}`),
  createExpense: (data: any) => api.post('/expenses', data),
  deleteExpense: (id: string) => api.delete(`/expenses/${id}`),

  // --- CHECK-INS (Fixes 500) ---
  // Ensure URL matches backend route /checkin/trip/:tripId
  getCheckIns: (tripId: string) => api.get<CheckIn[]>(`/checkin/trip/${tripId}`),
  createCheckIn: (data: any) => api.post('/checkin', data),
};
