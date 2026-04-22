import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { Response, NextFunction } from 'express';

const router = Router();
router.use(authMiddleware);

// Push location
router.post('/trips/:tripId/location', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tripId } = req.params;
    const { latitude, longitude, speed = 0, heading = 0 } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ success: false, error: 'lat/lng required' });
    const { error } = await supabaseAdmin.from('trip_tracking').insert({
      trip_id: tripId, user_id: req.user!.id, latitude, longitude, speed, heading
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) { next(err); }
});

// Get latest location
router.get('/trips/:tripId/location', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tripId } = req.params;
    const { data, error } = await supabaseAdmin.from('trip_tracking')
      .select('*').eq('trip_id', tripId)
      .order('recorded_at', { ascending: false }).limit(1).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ success: true, data: data || null });
  } catch (err: any) { next(err); }
});

// Get path (last 200 points)
router.get('/trips/:tripId/path', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tripId } = req.params;
    const { data, error } = await supabaseAdmin.from('trip_tracking')
      .select('latitude,longitude,speed,recorded_at')
      .eq('trip_id', tripId)
      .order('recorded_at').limit(200);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err: any) { next(err); }
});

export default router;
