import { supabaseAdmin } from '../config/db';
import { Trip } from '../types'; // Ensure you have this interface

export const tripService = {
  createTrip: async (data: Partial<Trip>) => {
    const { data: newTrip, error } = await supabaseAdmin
      .from('trips')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return newTrip;
  },

  getTripById: async (id: string) => {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteTrip: async (id: string) => {
    const { error } = await supabaseAdmin.from('trips').delete().eq('id', id);
    if (error) throw error;
  }
};