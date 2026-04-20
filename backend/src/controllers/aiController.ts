import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { aiService } from '../services/aiService';
import { supabaseAdmin } from '../config/db';

export const aiController = {
  regenerateItinerary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      
      // Fetch trip details to get context
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError || !trip) throw new Error('Trip not found');

      // Call AI Service
      const days = Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const aiItems = await aiService.generateItinerary({
        destination: trip.destination,
        days,
        budget: trip.budget,
        interests: ['General Sightseeing'], // Could be passed in body
        startLocation: 'Unknown' // Could be stored in trip
      });

      // Delete old items and insert new ones
      await supabaseAdmin.from('itinerary_items').delete().eq('trip_id', tripId);

      const itemsToInsert = aiItems.map(item => ({ ...item, trip_id: tripId }));
      
      if (itemsToInsert.length > 0) {
        const { data, error } = await supabaseAdmin
          .from('itinerary_items')
          .insert(itemsToInsert)
          .select();
          
        if (error) throw error;
        res.json({ success: true, message: 'Itinerary regenerated', data });
      } else {
        res.json({ success: true, message: 'No items generated', data: [] });
      }

    } catch (error: any) {
      next(error);
    }
  }
};