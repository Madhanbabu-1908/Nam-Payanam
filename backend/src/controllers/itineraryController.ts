import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';

export const itineraryController = {

  // ✅ CREATE ITEM (Manual or AI-Approved)
  createItem: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { day_number, time_slot, location_name, description, latitude, longitude } = req.body;

      if (!day_number || !location_name) {
        return res.status(400).json({ success: false, error: 'Day number and Location are required' });
      }

      const { data, error } = await supabaseAdmin
        .from('itinerary_items')
        .insert([{
          trip_id: tripId,
          day_number,
          time_slot,
          location_name,
          description,
          latitude,
          longitude
        }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      next(error);
    }
  },

  // ✅ GET ITINERARY
  getItineraryByTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { tripId } = req.params;
        const { data, error } = await supabaseAdmin
          .from('itinerary_items')
          .select('*')
          .eq('trip_id', tripId)
          .order('day_number', { ascending: true })
          .order('time_slot', { ascending: true });
          
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        next(error);
    }
  },
  
  // ✅ UPDATE STOP
  updateStop: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const { data, error } = await supabaseAdmin
        .from('itinerary_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      next(error);
    }
  },

  // ✅ DELETE STOP
  deleteStop: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { error } = await supabaseAdmin
        .from('itinerary_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true, message: 'Stop deleted successfully' });
    } catch (error: any) {
      next(error);
    }
  }
};