import { supabaseAdmin } from '../config/db';
import { Trip } from '../types'; // ✅ Fixed import

export const tripService = {
  async createTrip(data: Omit<Trip, 'id' | 'created_at'>) {
    const { data: trip, error } = await supabaseAdmin
      .from('trips')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return trip;
  },

  async getTripById(tripId: string) {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (error) throw error;
    return data;
  },

  async verifyOrganizer(tripId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .select('organizer_id')
      .eq('id', tripId)
      .single();

    if (error || !data) return false;
    return data.organizer_id === userId;
  },

  async deleteTrip(tripId: string) {
    const { error } = await supabaseAdmin
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) throw error;
    return true;
  }
};