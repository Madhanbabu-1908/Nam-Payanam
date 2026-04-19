const crypto = require('crypto');
const supabase = require('../db/supabase');

// POST /api/tracking/location — organiser pushes GPS position
async function pushLocation(req, res) {
  try {
    const { tripId, lat, lng, speed, heading, accuracy } = req.body;
    if (!tripId || lat === undefined || lng === undefined) return res.status(400).json({ error: 'tripId, lat, lng required' });

    // Update live position in trip_progress (realtime-enabled)
    await supabase.from('trip_progress').update({
      current_lat: lat, current_lng: lng,
      current_speed: speed || 0,
      updated_at: new Date().toISOString()
    }).eq('trip_id', tripId);

    // Insert path point every call (client throttles to every 15s)
    await supabase.from('trip_path_points').insert({ trip_id: tripId, lat, lng, speed: speed || 0 });

    res.json({ success: true });
  } catch (err) {
    console.error('Push location error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/tracking/:tripId/path  — all recorded path points
async function getPath(req, res) {
  try {
    const { tripId } = req.params;
    const { data } = await supabase.from('trip_path_points')
      .select('lat, lng, speed, recorded_at')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: true });
    res.json({ path: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/tracking/tokens  — create public share token
async function createToken(req, res) {
  try {
    const { tripId, label, expiresInHours } = req.body;
    const token = crypto.randomBytes(16).toString('hex');
    // Store in trips metadata (reuse existing tracking_tokens if exists, else use trips table)
    // Simple: store token in a separate table
    const { data, error } = await supabase.from('tracking_tokens').upsert({
      trip_id: tripId, token,
      label: label || 'Public Tracker',
      expires_at: expiresInHours ? new Date(Date.now() + expiresInHours * 3600000).toISOString() : null
    }).select().single();
    if (error) {
      // Table may not exist yet — return token anyway (stored client-side)
      return res.json({ token });
    }
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/track/:token  — public tracker data
async function getByToken(req, res) {
  try {
    const { token } = req.params;
    // Look up token
    let tripId = null;
    try {
      const { data: tok } = await supabase.from('tracking_tokens').select('*').eq('token', token).single();
      if (tok) {
        if (tok.expires_at && new Date(tok.expires_at) < new Date()) return res.status(410).json({ error: 'Tracking link expired' });
        tripId = tok.trip_id;
      }
    } catch { /* table may not exist */ }

    if (!tripId) return res.status(404).json({ error: 'Invalid tracking link' });

    const [{ data: trip }, { data: progress }, { data: path }, { data: members }] = await Promise.all([
      supabase.from('trips').select('id,title,start_location,end_location,stops,status,group_size,start_date,end_date,start_lat,start_lng,end_lat,end_lng').eq('id', tripId).single(),
      supabase.from('trip_progress').select('*').eq('trip_id', tripId).single(),
      supabase.from('trip_path_points').select('lat,lng,recorded_at').eq('trip_id', tripId).order('recorded_at', { ascending: true }),
      supabase.from('trip_members').select('nickname').eq('trip_id', tripId),
    ]);

    res.json({ trip, progress, path: path || [], members: members || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/checkins  — member sets pickup location
async function createCheckin(req, res) {
  try {
    const { tripId, memberId, nickname, lat, lng, name } = req.body;
    if (!tripId || !lat || !lng) return res.status(400).json({ error: 'tripId, lat, lng required' });

    const { data, error } = await supabase.from('member_checkins').upsert({
      trip_id: tripId, member_id: memberId, nickname,
      checkin_lat: lat, checkin_lng: lng, checkin_name: name || null,
      status: 'waiting', updated_at: new Date().toISOString()
    }, { onConflict: 'trip_id,member_id' }).select().single();

    if (error) throw error;

    // Announce to group
    await supabase.from('trip_announcements').insert({
      trip_id: tripId, posted_by: nickname,
      message: `📍 ${nickname} set a pickup point${name ? ` at ${name}` : ''}`,
      type: 'info'
    });

    res.json({ checkin: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/checkins/:tripId
async function getCheckins(req, res) {
  try {
    const { tripId } = req.params;
    const { data } = await supabase.from('member_checkins').select('*').eq('trip_id', tripId).order('created_at');
    res.json({ checkins: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/checkins/:id/acknowledge
async function acknowledgeCheckin(req, res) {
  try {
    const { id } = req.params;
    await supabase.from('member_checkins').update({ status: 'acknowledged', updated_at: new Date().toISOString() }).eq('id', id);
    const { data: c } = await supabase.from('member_checkins').select('trip_id,nickname').eq('id', id).single();
    if (c) await supabase.from('trip_announcements').insert({ trip_id: c.trip_id, posted_by: 'Organiser', message: `🚗 Organiser is heading to pick up ${c.nickname}`, type: 'milestone' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PATCH /api/checkins/:id/pickup
async function markPickedUp(req, res) {
  try {
    const { id } = req.params;
    await supabase.from('member_checkins').update({ status: 'picked_up', updated_at: new Date().toISOString() }).eq('id', id);
    const { data: c } = await supabase.from('member_checkins').select('trip_id,nickname').eq('id', id).single();
    if (c) await supabase.from('trip_announcements').insert({ trip_id: c.trip_id, posted_by: 'Organiser', message: `✅ ${c.nickname} has been picked up!`, type: 'milestone' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = { pushLocation, getPath, createToken, getByToken, createCheckin, getCheckins, acknowledgeCheckin, markPickedUp };
