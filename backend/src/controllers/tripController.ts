import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { tripService } from '../services/tripService';
import { aiService } from '../services/aiService';
import { supabaseAdmin } from '../config/db';

export const tripController = {
  // ✅ Fetch trips for the logged-in user (Member or Organizer)
  getMyTrips: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      // 1. Get all trip IDs where user is a member
      const { data: membersData, error: memberError } = await supabaseAdmin
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      const memberTripIds = membersData?.map(m => m.trip_id) || [];

      // 2. Get all trip IDs where user is the organizer
      const { data: ownedData, error: ownerError } = await supabaseAdmin
        .from('trips')
        .select('id')
        .eq('organizer_id', userId);

      if (ownerError) throw ownerError;

      const ownedTripIds = ownedData?.map(t => t.id) || [];

      // 3. Combine and remove duplicates
      const allTripIds = [...new Set([...memberTripIds, ...ownedTripIds])];

      if (allTripIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // 4. Fetch full trip details
      const { data: trips, error: tripsError } = await supabaseAdmin
        .from('trips')
        .select('*')
        .in('id', allTripIds)
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      res.json({ success: true, data: trips });
    } catch (error: any) {      next(error);
    }
  },

  // ✅ Create a new trip
  createTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, destination, start_date, end_date, budget, mode, interests, start_location } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }
      
      const userId = req.user.id;

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

      // Add user as ORGANIZER to trip_members
      await supabaseAdmin.from('trip_members').insert({
        trip_id: newTrip.id,
        user_id: userId,
        role: 'ORGANIZER'
      });

      // AI Generation Logic
      if (mode === 'AI' && interests && start_location) {
        const days = Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const aiItems = await aiService.generateItinerary({
          destination,
          days,
          budget,
          interests,
          startLocation: start_location
        });

        const itemsToInsert = aiItems.map((item: any) => ({ ...item, trip_id: newTrip.id }));
        
        if (itemsToInsert.length > 0) {
          await supabaseAdmin.from('itinerary_items').insert(itemsToInsert);
        }      }

      res.status(201).json({ success: true, data: newTrip });
    } catch (error: any) {
      next(error);
    }
  },

  // ✅ Get single trip details
  getTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const trip = await tripService.getTripById(tripId);
      
      if (!trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      res.json({ success: true, data: trip });
    } catch (error: any) {
      next(error);
    }
  },

  // ✅ Update trip (Placeholder)
  updateTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    res.json({ 
      success: true, 
      message: "Update functionality is under construction",
      data: null 
    });
  },

  // ✅ Delete trip (Fully Implemented with Organizer Check)
  deleteTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      if (!tripId) {
        return res.status(400).json({ success: false, error: 'Trip ID is required' });
      }

      // 1. Verify the user is the ORGANIZER of this trip
      const { data: trip, error: fetchError } = await supabaseAdmin
        .from('trips')
        .select('organizer_id')
        .eq('id', tripId)
        .single();
      if (fetchError || !trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      if (trip.organizer_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized: Only the trip organizer can delete this trip.' 
        });
      }

      // 2. Perform the deletion
      // Because we set ON DELETE CASCADE in migrations, 
      // deleting the trip will automatically delete itinerary_items, expenses, etc.
      const { error: deleteError } = await supabaseAdmin
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (deleteError) throw deleteError;

      res.json({ 
        success: true, 
        message: 'Trip and all associated data deleted successfully.' 
      });

    } catch (error: any) {
      next(error);
    }
  }
};