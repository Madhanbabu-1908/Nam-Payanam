import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { tripService } from '../services/tripService';
import { generateItinerary } from '../services/aiService'; // ✅ FIXED IMPORT
import { supabaseAdmin } from '../config/db';
import { getRealRoute } from '../utils/routeUtils';

export const tripController = {

  // ✅ CREATE TRIP (FIXED AI + ROUTE + DATA FLOW)
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

      // 🔥 ROUTE FIX
      let routeCoords: [number, number][] = [];

      if (start_lat && start_lng && destination_lat && destination_lng) {
        try {
          routeCoords = await getRealRoute(
            [Number(start_lat), Number(start_lng)],
            [Number(destination_lat), Number(destination_lng)]
          );
        } catch (err) {
          console.warn("⚠️ Route fetch failed");
        }
      }

      // 🔐 Trip code
      const tripCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // ✅ CREATE TRIP
      const newTrip = await tripService.createTrip({
        organizer_id: userId,
        name,
        destination,
        start_location,
        destination_lat: destination_lat ? Number(destination_lat) : null,
        destination_lng: destination_lng ? Number(destination_lng) : null,
        start_lat: start_lat ? Number(start_lat) : null,
        start_lng: start_lng ? Number(start_lng) : null,
        route: routeCoords.length
          ? { type: "LineString", coordinates: routeCoords }
          : null,
        start_date,
        end_date,
        budget: Number(budget),
        mode,
        status: 'PLANNING',
        trip_code: tripCode,
      });

      // ✅ ADD ORGANIZER
      await supabaseAdmin.from('trip_members').insert({
        trip_id: newTrip.id,
        user_id: userId,
        role: 'ORGANIZER'
      });

      // 🤖 AI ITINERARY FIX (CRITICAL)
      if (mode === 'AI' && interests && start_location) {
        try {
          const days =
            Math.ceil(
              (new Date(end_date).getTime() - new Date(start_date).getTime()) /
              (1000 * 60 * 60 * 24)
            ) + 1;

          const aiResponse = await generateItinerary(
            `${days} day trip from ${start_location} to ${destination} with budget ${budget}. Interests: ${interests}`
          );

          if (aiResponse?.days) {
            const items = aiResponse.days.flatMap((day: any) =>
              day.activities.map((act: any) => ({
                trip_id: newTrip.id,
                day: day.day,
                title: act.place,
                time: act.time,
                notes: act.notes
              }))
            );

            if (items.length) {
              await supabaseAdmin.from('itinerary_items').insert(items);
            }
          }

        } catch (err: any) {
          console.error("❌ AI failed:", err.message);
        }
      }

      res.status(201).json({ success: true, data: newTrip });

    } catch (error: any) {
      console.error("❌ createTrip error:", error.message);
      next(error);
    }
  },

  // ✅ GET MY TRIPS (unchanged but safe)
  getMyTrips: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const { data: members } = await supabaseAdmin
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', userId);

      const ids = members?.map((m: any) => m.trip_id) || [];

      if (!ids.length) return res.json({ success: true, data: [] });

      const { data: trips } = await supabaseAdmin
        .from('trips')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false });

      res.json({ success: true, data: trips || [] });

    } catch (err: any) {
      next(err);
    }
  },

  // ✅ GET SINGLE TRIP
  getTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (!trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      res.json({ success: true, data: trip });

    } catch (err: any) {
      next(err);
    }
  },

  // 🔥 JOIN TRIP FIX (CRITICAL)
  joinTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      if (!tripId) {
        return res.status(400).json({ success: false, error: 'Trip ID required' });
      }

      const { data: existing } = await supabaseAdmin
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle(); // ✅ FIX

      if (existing) {
        return res.json({ success: true, message: 'Already joined' });
      }

      const { error } = await supabaseAdmin
        .from('trip_members')
        .insert({
          trip_id: tripId,
          user_id: userId,
          role: 'PARTICIPANT'
        });

      if (error) throw error;

      res.json({ success: true, message: 'Joined successfully' });

    } catch (err: any) {
      console.error("❌ Join error:", err.message);
      next(err);
    }
  },

  // 🔥 MEMBERS FIX (nickname issue)
  getMembers: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      const { data, error } = await supabaseAdmin
        .from('trip_members')
        .select(`
          user_id,
          role,
          profiles (
            full_name,
            email
          )
        `)
        .eq('trip_id', tripId);

      if (error) throw error;

      res.json({ success: true, data });

    } catch (err: any) {
      next(err);
    }
  }
};