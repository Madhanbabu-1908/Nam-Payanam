import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { aiService } from '../services/aiService';
import { supabaseAdmin } from '../config/db';

export const aiController = {
  // Regenerate itinerary for an existing trip
  regenerateItinerary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { interests } = req.body;

      const { data: trip, error } = await supabaseAdmin.from('trips').select('*').eq('id', tripId).single();
      if (error || !trip) return res.status(404).json({ success: false, error: 'Trip not found' });

      const days = Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000) + 1;
      const interestsArr = interests 
        ? (Array.isArray(interests) ? interests : interests.split(',').map((s: string) => s.trim()))
        : ['General Sightseeing', 'Local Culture', 'Food'];

      const aiItems = await aiService.generateItinerary({
        destination: trip.destination,
        days,
        budget: trip.budget,
        interests: interestsArr,
        startLocation: trip.start_location || 'Unknown',
      });

      await supabaseAdmin.from('itinerary_items').delete().eq('trip_id', tripId);

      const itemsToInsert = aiItems.map((item: any) => ({ ...item, trip_id: tripId }));
      if (itemsToInsert.length > 0) {
        const { data, error: insertErr } = await supabaseAdmin.from('itinerary_items').insert(itemsToInsert).select();
        if (insertErr) throw insertErr;
        return res.json({ success: true, message: `Generated ${data.length} itinerary items`, data });
      }
      return res.json({ success: true, message: 'No items generated', data: [] });
    } catch (err: any) {
      next(err);
    }
  },

  // Contextual chat — saves history per trip
  chat: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { message } = req.body;
      const userId = req.user!.id;

      if (!message?.trim()) return res.status(400).json({ success: false, error: 'Message required' });

      const { data: trip } = await supabaseAdmin.from('trips').select('destination, start_location, budget, start_date, end_date').eq('id', tripId).single();
      if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

      // Save user message
      await supabaseAdmin.from('ai_chat_history').insert({ trip_id: tripId, user_id: userId, role: 'user', content: message });

      const response = await aiService.chat(message, trip);

      // Save assistant response
      await supabaseAdmin.from('ai_chat_history').insert({ trip_id: tripId, user_id: userId, role: 'assistant', content: response });

      res.json({ success: true, data: { response } });
    } catch (err: any) {
      next(err);
    }
  },

  // Get chat history
  getChatHistory: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { data, error } = await supabaseAdmin.from('ai_chat_history')
        .select('*').eq('trip_id', tripId).order('created_at').limit(50);
      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (err: any) {
      next(err);
    }
  },

  // Budget analysis
  analyzeBudget: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { data: trip } = await supabaseAdmin.from('trips').select('*').eq('id', tripId).single();
      if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

      const { data: members } = await supabaseAdmin.from('trip_members').select('id').eq('trip_id', tripId);
      const days = Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000) + 1;

      const analysis = await aiService.analyzeBudget({
        destination: trip.destination,
        budget: trip.budget,
        days,
        travelMode: 'mixed',
        groupSize: members?.length || 1,
      });

      res.json({ success: true, data: analysis });
    } catch (err: any) {
      next(err);
    }
  },

  // Trip summary (post-trip)
  generateSummary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const [{ data: trip }, { data: expenses }, { data: members }] = await Promise.all([
        supabaseAdmin.from('trips').select('*').eq('id', tripId).single(),
        supabaseAdmin.from('expenses').select('amount, category').eq('trip_id', tripId),
        supabaseAdmin.from('trip_members').select('id').eq('trip_id', tripId),
      ]);

      if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

      const totalSpent = expenses?.reduce((s: number, e: any) => s + e.amount, 0) || 0;
      const catBreakdown: Record<string, number> = {};
      expenses?.forEach((e: any) => { catBreakdown[e.category] = (catBreakdown[e.category] || 0) + e.amount; });
      const days = Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000) + 1;

      const summary = await aiService.generateSummary({
        destination: trip.destination, days, totalSpent, budget: trip.budget,
        expenseCategories: catBreakdown, memberCount: members?.length || 1,
      });

      res.json({ success: true, data: { summary, totalSpent, budget: trip.budget, savings: trip.budget - totalSpent } });
    } catch (err: any) {
      next(err);
    }
  },
};
