const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin + process.env.PIN_SALT || 'np_salt_2024').digest('hex');
}

// POST /api/auth/register — organiser creates account
async function register(req, res) {
  try {
    const { userId, pin } = req.body;

    if (!userId || !pin) 
      return res.status(400).json({ error: 'User ID and PIN required' });

    if (!/^\d{4}$/.test(pin)) 
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

    // Normalize userId to lowercase for consistency
    const normalizedUserId = userId.trim().toLowerCase();

    // Check if user already exists
    const { data: existing } = await supabase
      .from('organiser_accounts')
      .select('id')
      .eq('user_id', normalizedUserId)
      .single();

    if (existing) 
      return res.status(400).json({ error: 'User ID already registered. Please login.' });

    // Insert new account
    const {  account, error } = await supabase
      .from('organiser_accounts')
      .insert({
        user_id: normalizedUserId,
        pin_hash: hashPin(pin),
        name: normalizedUserId.split('@')[0] || normalizedUserId // Optional: derive name from email/userId
      })
      .select('id, user_id, name, created_at')
      .single();

    if (error) throw error;

    res.json({ 
      account: { 
        id: account.id, 
        userId: account.user_id, 
        name: account.name       }, 
      token: `org_${account.id}` 
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { userId, pin } = req.body;

    if (!userId || !pin) 
      return res.status(400).json({ error: 'User ID and PIN required' });

    const normalizedUserId = userId.trim().toLowerCase();

    // Find account by user_id
    const { data: account, error } = await supabase
      .from('organiser_accounts')
      .select('*')
      .eq('user_id', normalizedUserId)
      .single();

    if (error || !account) 
      return res.status(401).json({ error: 'User ID not registered' });

    if (account.pin_hash !== hashPin(pin)) 
      return res.status(401).json({ error: 'Incorrect PIN' });

    // Update last login
    await supabase
      .from('organiser_accounts')
      .update({ last_login: new Date().toISOString() })
      .eq('id', account.id);

    // Get this organiser's trips
    const {  trips } = await supabase
      .from('trips')
      .select('id, trip_code, title, start_location, end_location, start_date, end_date, status, group_size')
      .eq('organiser_account_id', account.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    res.json({ 
      account: { 
        id: account.id,         userId: account.user_id, 
        name: account.name 
      }, 
      token: `org_${account.id}`, 
      trips: trips || [] 
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/auth/me/:accountId — restore session
async function getMe(req, res) {
  try {
    const { accountId } = req.params;

    const { data: account, error } = await supabase
      .from('organiser_accounts')
      .select('id, user_id, name, created_at, last_login')
      .eq('id', accountId)
      .single();

    if (error || !account) 
      return res.status(404).json({ error: 'Account not found' });

    const {  trips } = await supabase
      .from('trips')
      .select('id, trip_code, title, start_location, end_location, start_date, end_date, status, group_size')
      .eq('organiser_account_id', account.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    res.json({ 
      account: { 
        id: account.id, 
        userId: account.user_id, 
        name: account.name 
      }, 
      trips: trips || [] 
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/auth/change-pin
async function changePin(req, res) {  try {
    const { accountId, oldPin, newPin } = req.body;

    const {  account } = await supabase
      .from('organiser_accounts')
      .select('pin_hash')
      .eq('id', accountId)
      .single();

    if (!account) 
      return res.status(404).json({ error: 'Account not found' });

    if (account.pin_hash !== hashPin(oldPin)) 
      return res.status(401).json({ error: 'Incorrect current PIN' });

    if (!/^\d{4}$/.test(newPin)) 
      return res.status(400).json({ error: 'New PIN must be 4 digits' });

    await supabase
      .from('organiser_accounts')
      .update({ pin_hash: hashPin(newPin) })
      .eq('id', accountId);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login, getMe, changePin };
