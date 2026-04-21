import { Response, NextFunction, Request } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';
import crypto from 'crypto';
import axios from 'axios';

interface TrackingRequest extends Request {
  params: { token: string; tripId: string };
  body: { latitude: number; longitude: number; speed?: number };
}

const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
  if (!address) return null;
  try {
    const query = `${address}, India`;
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'Nam-Payanam-App/1.0' }
    });
    if (response.data && response.data.length > 0) {
      return [parseFloat(response.data[0].lat), parseFloat(response.data[0].lon)];
    }
    return null;
  } catch (e) {
    console.error("Geocoding error:", e);
    return null;
  }
};

const getDrivingRoute = async (start: [number, number], end: [number, number]): Promise<[number, number][]> => {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await axios.get(url);
    if (res.data.routes && res.data.routes.length > 0) {
      return res.data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
    }
    return [];
  } catch (e) {
    console.error("Routing error:", e);
    return [];
  }
};

const calculateAndSaveRoute = async (tripId: string, startLoc: string, endLoc: string) => {
  const { data: trip } = await supabaseAdmin.from('trips').select('route_data').eq('id', tripId).single();
  if (trip && trip.route_data) return trip.route_data;

  const startCoords = await geocodeAddress(startLoc);
  const endCoords = await geocodeAddress(endLoc);
  if (!startCoords || !endCoords) {
    console.warn("Could not geocode locations for route.");
    return [];
  }

  const route = await getDrivingRoute(startCoords, endCoords);

  if (route && route.length > 0) {
    await supabaseAdmin.from('trips').update({ route_data: route }).eq('id', tripId);
  }

  return route;
};

export const trackingController = {
  createToken: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('organizer_id, start_location, destination')
        .eq('id', tripId)
        .single();

      if (tripError || !trip || trip.organizer_id !== userId) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const token = crypto.randomBytes(8).toString('hex');

      const { error: tokenErr } = await supabaseAdmin.from('tracking_tokens').insert({
        trip_id: tripId,
        token,
        is_active: true
      });
      if (tokenErr) throw tokenErr;

      if (trip.start_location && trip.destination) {
        calculateAndSaveRoute(tripId, trip.start_location, trip.destination).catch(console.error);
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.json({ 
        success: true, 
        data: { token, url: `${frontendUrl}/track/${token}` } 
      });
    } catch (error: any) {
      next(error);    }
  },

  pushLocation: async (req: TrackingRequest, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const { latitude, longitude, speed } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, error: 'Coords required' });
      }

      const { data: tokenData } = await supabaseAdmin.from('tracking_tokens').select('trip_id').eq('token', token).eq('is_active', true).single();
      if (!tokenData) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }

      await supabaseAdmin.from('location_logs').insert({
        trip_id: tokenData.trip_id,
        latitude,
        longitude,
        speed: speed || 0
      });

      res.json({ success: true, message: 'Updated' });
    } catch (error: any) {
      next(error);
    }
  },

  getLiveLocation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      const { data: currentLoc } = await supabaseAdmin
        .from('location_logs')
        .select('*')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('route_data, start_location, destination')
        .eq('id', tripId)
        .single();

      let route = trip?.route_data || [];
      if ((!route || route.length === 0) && trip?.start_location && trip?.destination) {
         route = await calculateAndSaveRoute(tripId, trip.start_location, trip.destination);
      }

      res.json({
        success: true,
        data: {
          currentLocation: currentLoc || null,
          route: route,
          startLocation: trip?.start_location,
          destination: trip?.destination
        }
      });
    } catch (error: any) {
      next(error);
    }
  },

  getPublicLocation: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const { data: tokenData } = await supabaseAdmin.from('tracking_tokens').select('trip_id').eq('token', token).eq('is_active', true).single();
      
      if (!tokenData) {
        return res.status(404).json({ success: false, error: 'Link invalid' });
      }

      const { data: loc } = await supabaseAdmin.from('location_logs').select('*').eq('trip_id', tokenData.trip_id).order('timestamp', { ascending: false }).limit(1).single();

      res.json({ success: true, data: loc || null });
    } catch (error: any) {
      next(error);
    }
  }
};