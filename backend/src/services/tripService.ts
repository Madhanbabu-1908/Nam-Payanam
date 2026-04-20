import { supabaseAdmin } from '../config/db';
import { Trip, UserRole } from '../../shared/types'; // Assuming you copied types or defined them locally

export const tripService = {
  // Create a new trip
  async createTrip(data: Omit<Trip, 'id' | 'created_at'>) {
    const { data: trip, error } = await supabaseAdmin
      .from('trips')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return trip;
  },

  // Get trip by ID
  async getTripById(tripId: string) {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .select('*, members:user_id') // Join members to check roles later if needed
      .eq('id', tripId)
      .single();

    if (error) throw error;
    return data;
  },

  // Verify if user is the organizer
  async verifyOrganizer(tripId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .select('organizer_id')
      .eq('id', tripId)
      .single();

    if (error || !data) return false;
    return data.organizer_id === userId;
  },

  // ✅ CRITICAL: Delete Trip with Cascade
  async deleteTrip(tripId: string) {
    // Note: If your DB has ON DELETE CASCADE set up, this single call removes:
    // - Itinerary Items
    // - Expenses
    // - Expense Splits
    // - Trip Members
    const { error } = await supabaseAdmin
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) throw error;
    return true;
  }
};