// shared/types.ts

export type UserRole = 'ORGANIZER' | 'PARTICIPANT' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface Trip {
  id: string;
  organizer_id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  mode: 'AI' | 'MANUAL';
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  created_at: string;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  day_number: number;
  time_slot: string;
  location_name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  estimated_cost?: number;
}

export interface Expense {
  id: string;
  trip_id: string;
  amount: number;
  category: 'FOOD' | 'TRAVEL' | 'STAY' | 'OTHER';
  description: string;
  paid_by_user_id: string;
  date: string;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  is_settled: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}