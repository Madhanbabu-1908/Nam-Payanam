import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { tripService } from '../services/tripService';
import { aiService } from '../services/aiService';
import { supabaseAdmin } from '../config/db';

export const tripController = {
  createTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, destination, start_date, end_date, budget, mode, interests, start_location } = req.body;
      const userId = req.user!.id;

      // 1. Create the trip record first
      const newTrip = await tripService.createTrip({
        organizer_id: userId,
        name,
        destination,
        start_date,
        end_date,
        budget,
        mode,
        status: 'PLANNING',
      });

      // 2. Add the creator as a member
      await supabaseAdmin.from('trip_members').insert({
        trip_id: newTrip.id,
        user_id: userId,
        role: 'ORGANIZER'
      });

      // 3. If AI Mode, generate itinerary immediately
      if (mode === 'AI' && interests && start_location) {
        const days = Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const aiItems = await aiService.generateItinerary({
          destination,
          days,
          budget,
          interests,
          startLocation: start_location
        });

        // Insert AI items linked to this trip
        const itemsToInsert = aiItems.map(item => ({ ...item, trip_id: newTrip.id }));
        
        if (itemsToInsert.length > 0) {
          await supabaseAdmin.from('itinerary_items').insert(itemsToInsert);
        }
      }

      res.status(201).json({ success: true, data: newTrip });
    } catch (error: any) {
      next(error);
    }
  },

  deleteTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      
      // Role check is handled by middleware before this runs, 
      // but we double check inside service or rely on middleware passing through.
      
      await tripService.deleteTrip(tripId);

      res.json({ success: true, message: 'Trip and all related data deleted successfully.' });
    } catch (error: any) {
      next(error);
    }
  },
  
  getTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
      // Implementation for fetching trip details
      try {
          const { tripId } = req.params;
          const trip = await tripService.getTripById(tripId);
          res.json({ success: true, data: trip });
      } catch (error: any) {
          next(error);
      }
  }
};