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

async function generatePlan(req, res) {
  try {
    const { startPoint, stops, tripTitle } = req.body;

    if (!startPoint || !tripTitle) {
      return res.status(400).json({ error: 'Missing required fields: startPoint, tripTitle' });
    }

    // Build a prompt for the AI
    const stopsText = stops && stops.length > 0 
      ? `Intermediate stops: ${stops.join(' → ')}` 
      : 'No intermediate stops';

    const prompt = `You are a travel planner. Create a detailed day-by-day travel plan for "${tripTitle}" starting from ${startPoint}. ${stopsText}. Include suggested activities, timings, local food, and travel tips. Keep it practical and informative.`;

    // Reuse your existing AI service (Groq)
    const response = await chatWithAI(prompt, { startPoint, stops, tripTitle });

    res.json({ success: true, plan: response });
  } catch (err) {
    console.error('AI plan generation error:', err);
    res.status(500).json({ error: 'Failed to generate AI plan', details: err.message });
  }
}

// Update module.exports
module.exports = { chat, getInsights, generatePlan };  // ← add generatePlan
