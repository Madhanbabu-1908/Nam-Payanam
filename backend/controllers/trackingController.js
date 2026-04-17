const supabase = require('../db/supabase');
const crypto = require('crypto');

// Organiser pushes their GPS location
async function pushLocation(req, res) {
  try {
    const { tripId, lat, lng, accuracy, heading, speed, altitude, organizerId } = req.body;
    if (!tripId || !lat || !lng) return res.status(400).json({ error: 'tripId, lat, lng required' });

    // Verify organiser
    const { data: trip } = await supabase.from('trips').select('organizer_id').eq('id', tripId).single();
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // Upsert live location (single row per trip)
    const { data, error } = await supabase.from('live_locations').upsert({
      trip_id: tripId, lat, lng,
      accuracy: accuracy || null, heading: heading || null,
      speed: speed || null, altitude: altitude || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'trip_id' }).select().single();

    if (error) {
      // If upsert fails (no existing row), try insert
      const { data: inserted } = await supabase.from('live_locations').insert({
        trip_id: tripId, lat, lng, accuracy, heading, speed, altitude
      }).select().single();
    }

    // Store path point every ~30s (controlled by client)
    const { error: pathError } = await supabase.from('travel_path').insert({
      trip_id: tripId, lat, lng
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Push location error:', err);
    res.status(500).json({ error: 'Failed to push location' });
  }
}

// Get current live location for a trip
async function getLiveLocation(req, res) {
  try {
    const { tripId } = req.params;
    const { data: loc } = await supabase.from('live_locations').select('*').eq('trip_id', tripId).single();
    const { data: path } = await supabase.from('travel_path').select('lat,lng,recorded_at').eq('trip_id', tripId).order('recorded_at', { ascending: true });
    res.json({ location: loc || null, path: path || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get location' });
  }
}

// Get travel path
async function getTravelPath(req, res) {
  try {
    const { tripId } = req.params;
    const { data: path } = await supabase.from('travel_path').select('lat,lng,recorded_at').eq('trip_id', tripId).order('recorded_at', { ascending: true });
    res.json({ path: path || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get path' });
  }
}

// Create a public tracking token
async function createTrackingToken(req, res) {
  try {
    const { tripId, organizerId, label, expiresInHours } = req.body;
    if (!tripId || !organizerId) return res.status(400).json({ error: 'tripId and organizerId required' });

    // Verify organiser
    const { data: trip } = await supabase.from('trips').select('organizer_id, title, trip_code').eq('id', tripId).single();
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.organizer_id !== organizerId) return res.status(403).json({ error: 'Only organiser can create tracking links' });

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3600000).toISOString() : null;

    const { data, error } = await supabase.from('tracking_tokens').insert({
      trip_id: tripId, token, label: label || 'Public Tracker',
      created_by_nickname: req.body.nickname || 'Organiser',
      expires_at: expiresAt
    }).select().single();

    if (error) throw error;
    res.json({ token, trackingUrl: `/track/${token}` });
  } catch (err) {
    console.error('Create token error:', err);
    res.status(500).json({ error: 'Failed to create tracking token' });
  }
}

// Get trip info by tracking token (public, no auth)
async function getByToken(req, res) {
  try {
    const { token } = req.params;
    const { data: tokenRow } = await supabase.from('tracking_tokens').select('*').eq('token', token).single();
    if (!tokenRow) return res.status(404).json({ error: 'Invalid or expired tracking link' });
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This tracking link has expired' });
    }

    const tripId = tokenRow.trip_id;
    const { data: trip } = await supabase.from('trips').select('id,title,start_location,end_location,stops,status,group_size,start_date,end_date').eq('id', tripId).single();
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const [{ data: loc }, { data: path }, { data: members }, { data: days }, { data: breaks }] = await Promise.all([
      supabase.from('live_locations').select('*').eq('trip_id', tripId).single(),
      supabase.from('travel_path').select('lat,lng,recorded_at').eq('trip_id', tripId).order('recorded_at', { ascending: true }),
      supabase.from('trip_members').select('nickname,is_organizer').eq('trip_id', tripId),
      supabase.from('trip_days').select('*').eq('trip_id', tripId).order('day_number'),
      supabase.from('break_stops').select('*').eq('trip_id', tripId).order('created_at'),
    ]);

    res.json({
      trip, location: loc || null, path: path || [],
      members: members || [], days: days || [], breaks: breaks || [],
      tokenLabel: tokenRow.label, expiresAt: tokenRow.expires_at
    });
  } catch (err) {
    console.error('Get by token error:', err);
    res.status(500).json({ error: 'Failed to load tracking data' });
  }
}

// List tokens for a trip (organiser)
async function listTokens(req, res) {
  try {
    const { tripId } = req.params;
    const { data: tokens } = await supabase.from('tracking_tokens').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
    res.json({ tokens: tokens || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list tokens' });
  }
}

// Delete a token
async function deleteToken(req, res) {
  try {
    const { tokenId } = req.params;
    const { organizerId } = req.body;
    const { data: tok } = await supabase.from('tracking_tokens').select('trip_id').eq('id', tokenId).single();
    if (!tok) return res.status(404).json({ error: 'Token not found' });
    const { data: trip } = await supabase.from('trips').select('organizer_id').eq('id', tok.trip_id).single();
    if (trip?.organizer_id !== organizerId) return res.status(403).json({ error: 'Forbidden' });
    await supabase.from('tracking_tokens').delete().eq('id', tokenId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete token' });
  }
}

module.exports = { pushLocation, getLiveLocation, getTravelPath, createTrackingToken, getByToken, listTokens, deleteToken };
