export type UserRole = 'ORGANIZER' | 'PARTICIPANT' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  full_name?: string;
}

export interface Trip {
  id: string;
  organizer_id: string;
  name: string;
  destination: string;
  
  // ✅ NEW: Add these fields for coordinates
  destination_lat?: number;
  destination_lng?: number;
  start_location?: string;
  start_lat?: number;
  start_lng?: number;
  
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
  estimated_cost?: number;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  paid_by_user_id: string;
  date: string;
}