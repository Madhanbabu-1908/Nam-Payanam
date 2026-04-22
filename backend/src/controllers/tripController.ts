import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { tripService } from '../services/tripService';
import { aiService } from '../services/aiService';
import { supabaseAdmin } from '../config/db';
import { getRealRoute } from '../utils/routeUtils'; // ✅ Import the route helper

export const tripController = {
  createTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { 
        name, 
        destination, 
        start_location, 
        start_date, 
        end_date, 
        budget, 
        mode, 
        interests,
        destination_lat,
        destination_lng,
        start_lat,
        start_lng
      } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const userId = req.user.id;

      // ✅ 1. Calculate Real Driving Route if coordinates are provided
      let routeCoords: [number, number][] = [];
      
      if (start_lat && start_lng && destination_lat && destination_lng) {
        try {
          routeCoords = await getRealRoute(
            [parseFloat(start_lat), parseFloat(start_lng)], 
            [parseFloat(destination_lat), parseFloat(destination_lng)]
          );
          console.log(`✅ Route calculated with ${routeCoords.length} points.`);
        } catch (routeError) {
          console.error("❌ Failed to calculate route, proceeding without it:", routeError);
          // Continue without route if calculation fails
        }
      }

      // ✅ 2. Create Trip with Route Data
      const newTrip = await tripService.createTrip({
        organizer_id: userId,        name,
        destination,
        start_location,
        destination_lat: destination_lat ? Number(destination_lat) : undefined,
        destination_lng: destination_lng ? Number(destination_lng) : undefined,
        start_lat: start_lat ? Number(start_lat) : undefined,
        start_lng: start_lng ? Number(start_lng) : undefined,
        route?: {
  type: "LineString";
  coordinates: [number, number][];
}; // ✅ Save the route array to DB
        start_date,
        end_date,
        budget: Number(budget),
        mode,
        status: 'PLANNING',
      });

      // 3. Add organizer to trip_members
      const { error: memberError } = await supabaseAdmin
        .from('trip_members')
        .insert({
          trip_id: newTrip.id,
          user_id: userId,
          role: 'ORGANIZER'
        });

      if (memberError) {
        // Rollback trip creation if member insert fails
        await supabaseAdmin.from('trips').delete().eq('id', newTrip.id);
        throw memberError;
      }

      // 4. AI Itinerary Generation (if mode is AI)
      if (mode === 'AI' && interests && start_location) {
        try {
          const days =
            Math.ceil(
              (new Date(end_date).getTime() - new Date(start_date).getTime()) /
              (1000 * 60 * 60 * 24)
            ) + 1;

          const aiItems = await aiService.generateItinerary({
            destination,
            days,
            budget: Number(budget),
            interests: Array.isArray(interests)
              ? interests
              : interests.split(',').map((s: string) => s.trim()),
            startLocation: start_location
          });

          const itemsToInsert = aiItems.map((item: any) => ({            ...item,
            trip_id: newTrip.id
          }));

          if (itemsToInsert.length > 0) {
            await supabaseAdmin.from('itinerary_items').insert(itemsToInsert);
          }
        } catch (err: any) {
          console.error("AI generation failed:", err.message);
          // Don't fail the whole request if AI fails
        }
      }

      res.status(201).json({ success: true, data: newTrip });

    } catch (error: any) {
      console.error("❌ Error in createTrip:", error);
      next(error);
    }
  },

  getMyTrips: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const { data: membersData, error: memberError } = await supabaseAdmin
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      const memberTripIds = membersData?.map((m: any) => m.trip_id) || [];

      const { data: ownedData, error: ownerError } = await supabaseAdmin
        .from('trips')
        .select('id')
        .eq('organizer_id', userId);

      if (ownerError) throw ownerError;

      const ownedTripIds = ownedData?.map((t: any) => t.id) || [];

      const allTripIds = [...new Set([...memberTripIds, ...ownedTripIds])];

      if (allTripIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const { data: trips, error } = await supabaseAdmin        .from('trips')
        .select('*')
        .in('id', allTripIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ success: true, data: trips });

    } catch (error: any) {
      next(error);
    }
  },

  getTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      const { data: trip, error } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error || !trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      res.json({ success: true, data: trip });

    } catch (error: any) {
      next(error);
    }
  },

  joinTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('id, name')
        .eq('id', tripId)
        .single();

      if (!trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }
      const { data: existing } = await supabaseAdmin
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        return res.status(400).json({ success: false, error: 'Already joined' });
      }

      const { data: newMember, error } = await supabaseAdmin
        .from('trip_members')
        .insert({
          trip_id: tripId,
          user_id: userId,
          role: 'PARTICIPANT'
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: `Joined ${trip.name}`,
        data: newMember
      });

    } catch (error: any) {
      next(error);
    }
  },

  updateTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('organizer_id')
        .eq('id', tripId)
        .single();

      if (!trip || trip.organizer_id !== userId) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const { data: updatedTrip, error } = await supabaseAdmin        .from('trips')
        .update(req.body)
        .eq('id', tripId)
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, data: updatedTrip });

    } catch (error: any) {
      next(error);
    }
  },

  deleteTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('organizer_id')
        .eq('id', tripId)
        .single();

      if (!trip || trip.organizer_id !== userId) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const { error } = await supabaseAdmin
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Trip deleted successfully'
      });

    } catch (error: any) {
      next(error);
    }
  }
};