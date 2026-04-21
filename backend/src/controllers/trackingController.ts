import { Response, NextFunction, Request } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';
import crypto from 'crypto';
import axios from 'axios';

// Ensure axios is installed: npm install axios

interface TrackingRequest extends Request {
  params: { token: string; tripId: string };
  body: { latitude: number; longitude: number; speed?: number };
}

/**
 * Helper: Geocode address using Nominatim
 */
const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
  ifThe errors are caused by **syntax issues** in the `trackingController.ts` file, specifically around object destructuring and property assignments. The previous code snippet had some formatting issues that TypeScript didn't like.

Here is the **corrected, syntactically valid, and complete** `backend/src/controllers/trackingController.ts` file.

### 📄 `backend/src/controllers/trackingController.ts` (Fixed & Complete)

```typescript
import { Response, NextFunction, Request } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';
import crypto from 'crypto';
import axios from 'axios';

// Ensure axios is installed: npm install axios

interface TrackingRequest extends Request {
  params: { token: string; tripId: string };
  body: { latitude: number; longitude: number; speed?: number };
}

/**
 * Helper: Geocode address using Nominatim
 */
const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
  if (!address) return null;
  try {
    const query = `${address}, India`; // Contextualize for India
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'Nam-Payanam-App/1.0' }
    });
    if (response.data && response.data.length > 0) {
      return [parseFloat(response.data[0].lat), parseFloat(response.data[0].lon)];    }
    return null;
  } catch (e) {
    console.error("Geocoding error:", e);
    return null;
  }
};

/**
 * Helper: Get Driving Route using OSRM
 */
const getDrivingRoute = async (start: [number, number], end: [number, number]): Promise<[number, number][]> => {
  try {
    // OSRM uses lng,lat
    const url = `http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await axios.get(url);
    if (res.data.routes && res.data.routes.length > 0) {
      // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
      return res.data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
    }
    return [];
  } catch (e) {
    console.error("Routing error:", e);
    return [];
  }
};

/**
 * Main Logic: Calculate and Save Route
 */
const calculateAndSaveRoute = async (tripId: string, startLoc: string, endLoc: string) => {
  // 1. Check if route already exists to avoid recalculation
  const { data: trip } = await supabaseAdmin.from('trips').select('route_data').eq('id', tripId).single();
  if (trip && trip.route_data) return trip.route_data; // Return cached route

  // 2. Geocode
  const startCoords = await geocodeAddress(startLoc);
  const endCoords = await geocodeAddress(endLoc);

  if (!startCoords || !endCoords) {
    console.warn("Could not geocode locations for route.");
    return [];
  }

  // 3. Get Route
  const route = await getDrivingRoute(startCoords, endCoords);

  // 4. Save to DB for future fast access
  if (route && route.length > 0) {
    await supabaseAdmin.from('trips').update({ route_data: route }).eq('id', tripId);  }

  return route;
};

export const trackingController = {
  
  /**
   * Create Token AND Calculate Route
   * POST /api/tracking/tokens/:tripId
   */
  createToken: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      // Verify Organizer & Get Trip Details
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('organizer_id, start_location, destination')
        .eq('id', tripId)
        .single();

      if (tripError || !trip || trip.organizer_id !== userId) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      // Generate Token
      const token = crypto.randomBytes(8).toString('hex');

      // Insert Token
      const { error: tokenErr } = await supabaseAdmin.from('tracking_tokens').insert({
        trip_id: tripId,
        token,
        is_active: true
      });
      if (tokenErr) throw tokenErr;

      // 🔥 CRITICAL: Calculate and Save Route asynchronously (don't wait for it to send response)
      // We fire-and-forget here so the user gets the token instantly.
      // The route will be ready by the time they open the map.
      if (trip.start_location && trip.destination) {
        calculateAndSaveRoute(tripId, trip.start_location, trip.destination).catch(console.error);
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.json({ 
        success: true, 
        data: { token, url: `${frontendUrl}/track/${token}` } 
      });    } catch (error: any) {
      next(error);
    }
  },

  /**
   * Push Location (Driver)
   * POST /api/tracking/push/:token
   */
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

  /**
   * Get Live Data (Map View)
   * GET /api/tracking/live/:tripId
   */
  getLiveLocation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      // 1. Get Current Location
      const { data: currentLoc } = await supabaseAdmin
        .from('location_logs')
        .select('*')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: false })        .limit(1)
        .single();

      // 2. Get Pre-Calculated Route from DB
      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('route_data, start_location, destination')
        .eq('id', tripId)
        .single();

      let route = trip?.route_data || [];

      // Fallback: If route is empty (maybe calc failed earlier), try calculating now
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

  /**
   * Public Track
   * GET /api/tracking/public/:token
   */
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
    }  }
};