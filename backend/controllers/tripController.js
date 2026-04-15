const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { generateTripPlans } = require('../services/groqService');

// Generate short unique trip code
function generateTripCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Generate AI plans for a trip
async function getAIPlans(req, res) {
  try {
    const { startLocation, endLocation, stops, startDate, endDate, groupSize, budget, preferences } = req.body;
    
    if (!startLocation || !endLocation || !startDate || !endDate || !groupSize) {
      return res.status(400).json({ error: 'Missing required trip fields' });
    }

    const plans = await generateTripPlans({
      startLocation, endLocation, stops, startDate, endDate,
      groupSize, budget, preferences
    });

    res.json({ plans });
  } catch (err) {
    console.error('AI Plans error:', err);
    res.status(500).json({ error: 'Failed to generate AI plans', details: err.message });
  }
}

// Create trip after organizer selects a plan
async function createTrip(req, res) {
  try {
    const {
      title, organizerName, startLocation, endLocation, stops,
      startDate, endDate, groupSize, selectedPlan, planIndex
    } = req.body;

    if (!title || !organizerName || !startLocation || !endLocation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique trip code
    let tripCode;
    let exists = true;
    while (exists) {
      tripCode = generateTripCode();
      const { data } = await supabase.from('trips').select('id').eq('trip_code', tripCode).single();
      exists = !!data;
    }

    const organizerId = uuidv4();

    // Create the trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        trip_code: tripCode,
        title,
        organizer_id: organizerId,
        organizer_name: organizerName,
        start_location: startLocation,
        end_location: endLocation,
        stops: stops || [],
        start_date: startDate,
        end_date: endDate,
        group_size: groupSize,
        ai_plan: selectedPlan,
        selected_plan_index: planIndex || 0,
        status: 'planning'
      })
      .select()
      .single();

    if (tripError) throw tripError;

    // Add organizer as first member
    const { data: member, error: memberError } = await supabase
      .from('trip_members')
      .insert({
        trip_id: trip.id,
        member_id: organizerId,
        nickname: organizerName,
        is_organizer: true
      })
      .select()
      .single();

    if (memberError) throw memberError;

    // Create trip days from selected plan
    if (selectedPlan?.days?.length > 0) {
      const dayInserts = selectedPlan.days.map(day => ({
        trip_id: trip.id,
        day_number: day.dayNumber,
        date: day.date,
        title: day.title,
        stops: day.stops,
        notes: day.notes,
        is_reached: false
      }));

      const { error: daysError } = await supabase.from('trip_days').insert(dayInserts);
      if (daysError) console.error('Days insert error:', daysError);
    }

    // Initialize trip progress
    await supabase.from('trip_progress').insert({
      trip_id: trip.id,
      current_stop_index: 0
    });

    res.json({
      tripId: trip.id,
      tripCode,
      organizerId,
      memberId: member.id,
      trip
    });
  } catch (err) {
    console.error('Create trip error:', err);
    res.status(500).json({ error: 'Failed to create trip', details: err.message });
  }
}

// Get full trip details by code
async function getTripByCode(req, res) {
  try {
    const { code } = req.params;

    const { data: trip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('trip_code', code.toUpperCase())
      .single();

    if (error || !trip) return res.status(404).json({ error: 'Trip not found' });

    // Get members
    const { data: members } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', trip.id)
      .order('joined_at');

    // Get days
    const { data: days } = await supabase
      .from('trip_days')
      .select('*')
      .eq('trip_id', trip.id)
      .order('day_number');

    // Get progress
    const { data: progress } = await supabase
      .from('trip_progress')
      .select('*')
      .eq('trip_id', trip.id)
      .single();

    res.json({ trip, members: members || [], days: days || [], progress });
  } catch (err) {
    console.error('Get trip error:', err);
    res.status(500).json({ error: 'Failed to get trip' });
  }
}

// Join a trip group
async function joinTrip(req, res) {
  try {
    const { code } = req.params;
    const { nickname } = req.body;

    if (!nickname?.trim()) return res.status(400).json({ error: 'Nickname required' });

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, group_size, status')
      .eq('trip_code', code.toUpperCase())
      .single();

    if (tripError || !trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status === 'completed') return res.status(400).json({ error: 'This trip has ended' });

    // Check member count
    const { count } = await supabase
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', trip.id);

    if (count >= trip.group_size) {
      return res.status(400).json({ error: 'Group is full' });
    }

    // Check nickname uniqueness
    const { data: existing } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('nickname', nickname.trim())
      .single();

    if (existing) return res.status(400).json({ error: 'This nickname is already taken in this trip' });

    const { data: member, error: memberError } = await supabase
      .from('trip_members')
      .insert({
        trip_id: trip.id,
        nickname: nickname.trim(),
        is_organizer: false
      })
      .select()
      .single();

    if (memberError) throw memberError;

    res.json({ memberId: member.id, member, tripId: trip.id });
  } catch (err) {
    console.error('Join trip error:', err);
    res.status(500).json({ error: 'Failed to join trip' });
  }
}

// Remove a member (organizer only)
async function removeMember(req, res) {
  try {
    const { tripId, memberId } = req.params;
    const { organizerId } = req.body;

    // Verify organizer
    const { data: organizer } = await supabase
      .from('trip_members')
      .select('is_organizer')
      .eq('trip_id', tripId)
      .eq('member_id', organizerId)
      .single();

    if (!organizer?.is_organizer) {
      return res.status(403).json({ error: 'Only organizer can remove members' });
    }

    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('id', memberId)
      .eq('trip_id', tripId)
      .eq('is_organizer', false); // Cannot remove organizer

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
}

// Update trip status
async function updateTripStatus(req, res) {
  try {
    const { tripId } = req.params;
    const { status, organizerId } = req.body;

    const { data: organizer } = await supabase
      .from('trip_members')
      .select('is_organizer')
      .eq('trip_id', tripId)
      .eq('member_id', organizerId)
      .single();

    if (!organizer?.is_organizer) {
      return res.status(403).json({ error: 'Only organizer can update trip status' });
    }

    const updates = { status, updated_at: new Date().toISOString() };
    
    const { data: trip, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId)
      .select()
      .single();

    if (error) throw error;

    if (status === 'active') {
      await supabase.from('trip_progress').update({ started_at: new Date().toISOString() }).eq('trip_id', tripId);
    } else if (status === 'completed') {
      await supabase.from('trip_progress').update({ completed_at: new Date().toISOString() }).eq('trip_id', tripId);
    }

    res.json({ trip });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
}

// Update trip progress (current stop)
async function updateProgress(req, res) {
  try {
    const { tripId } = req.params;
    const { currentStopIndex, dayReached } = req.body;

    await supabase
      .from('trip_progress')
      .update({ current_stop_index: currentStopIndex, updated_at: new Date().toISOString() })
      .eq('trip_id', tripId);

    if (dayReached !== undefined) {
      await supabase
        .from('trip_days')
        .update({ is_reached: true })
        .eq('trip_id', tripId)
        .eq('day_number', dayReached);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
}

module.exports = { getAIPlans, createTrip, getTripByCode, joinTrip, removeMember, updateTripStatus, updateProgress };
