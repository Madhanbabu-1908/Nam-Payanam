import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/db';

// POST /api/checkins
export const checkIn = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { tripId, locationName, latitude, longitude, status } = req.body;
    if (!tripId || !locationName) return res.status(400).json({ success:false, error:'tripId and locationName required' });

    // Upsert: one active check-in per user per trip
    const { data, error } = await supabase.from('checkins').upsert({
      trip_id:       tripId,
      user_id:       userId,
      location_name: locationName,
      latitude:      latitude  || null,
      longitude:     longitude || null,
      status:        status || 'PRESENT',
      checked_in_at: new Date().toISOString(),
      is_active:     true,
    }, { onConflict: 'trip_id,user_id' }).select('*, user:profiles(full_name,email)').single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/checkins/trip/:tripId  — get all active check-ins for a trip
export const getTripCheckins = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { data, error } = await supabase
      .from('checkins')
      .select('*, user:profiles(full_name,email)')
      .eq('trip_id', tripId)
      .eq('is_active', true)
      .order('checked_in_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/checkins/:checkinId  — member cancels their check-in
export const cancelCheckin = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { checkinId } = req.params;
    const { error } = await supabase.from('checkins')
      .update({ is_active: false }).eq('id', checkinId).eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
