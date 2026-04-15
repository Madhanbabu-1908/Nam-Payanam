const supabase = require('../db/supabase');
const { chatWithAI, generateExpenseInsights } = require('../services/groqService');

async function chat(req, res) {
  try {
    const { message, tripId } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    let tripContext = null;
    if (tripId) {
      const { data: trip } = await supabase.from('trips').select('title,start_location,end_location,group_size').eq('id', tripId).single();
      tripContext = trip;
    }

    const response = await chatWithAI(message, tripContext);
    res.json({ response });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'AI unavailable', details: err.message });
  }
}

async function getInsights(req, res) {
  try {
    const { tripId } = req.params;
    const { data: expenses } = await supabase.from('expenses').select('*').eq('trip_id', tripId);
    const { data: trip } = await supabase.from('trips').select('*').eq('id', tripId).single();
    
    if (!expenses?.length) return res.json({ insights: 'No expenses recorded yet. Add some expenses to get AI insights!' });
    
    const insights = await generateExpenseInsights(expenses, trip);
    res.json({ insights });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate insights' });
  }
}

module.exports = { chat, getInsights };
