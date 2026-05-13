import { Request, Response } from "express";
import { aiService } from "../services/aiService";
import { supabaseAdmin } from "../config/db";

export const aiController = {

  // ✅ 1. Regenerate Itinerary (Real Implementation)
  regenerateItinerary: async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;
      const { interests } = req.body;

      // 1. Fetch Trip Details
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError || !trip) {
        return res.status(404).json({ success: false, message: "Trip not found" });
      }

      // 2. Calculate Duration
      const startDate = new Date(trip.start_date);
      const endDate = new Date(trip.end_date);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // 3. Construct Prompt
      const prompt = `
        You are an expert travel planner for Nam Payanam.
        Create a detailed ${days}-day itinerary for a trip to ${trip.destination}.
        
        Trip Details:
        - Start Location: ${trip.start_location}
        - Destination: ${trip.destination}
        - Dates: ${trip.start_date} to ${trip.end_date} (${days} days)
        - Budget: ₹${trip.budget}
        - Mode: ${trip.mode}
        - Interests: ${interests || trip.interests || 'General Sightseeing'}

        Return STRICT JSON only in this format:
        {
          "days": [
            {
              "day": 1,
              "title": "Day 1 Title",
              "activities": [
                {                  "time": "09:00 AM",
                  "place": "Place Name",
                  "notes": "Short description or tip"
                }
              ]
            }
          ]
        }
      `;

      // 4. Call AI Service
      const result = await aiService.generateItinerary(prompt);

      // 5. Save to Database
      if (result.days && Array.isArray(result.days)) {
        const itemsToInsert = result.days.flatMap((day: any) =>
          (day.activities || []).map((act: any) => ({
            trip_id: tripId,
            day_number: day.day,
            time_slot: act.time,
            location_name: act.place,
            description: act.notes,
            latitude: null, 
            longitude: null,
            estimated_cost: null,
            category: 'Sightseeing'
          }))
        );

        if (itemsToInsert.length > 0) {
          // Delete old items
          await supabaseAdmin.from('itinerary_items').delete().eq('trip_id', tripId);
          
          // Insert new items
          const { error: insertError } = await supabaseAdmin
            .from('itinerary_items')
            .insert(itemsToInsert);
            
          if (insertError) {
            console.error("Failed to save itinerary to DB:", insertError);
          } else {
            console.log(`✅ Saved ${itemsToInsert.length} itinerary items to DB`);
          }
        }
      }

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error("AI regenerate error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to regenerate itinerary",
        error: err.message
      });
    }
  },

  // ✅ 2. Chat
  chat: async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      const { tripId } = req.params;

      if (!message) {
        return res.status(400).json({ success: false, message: "Message is required" });
      }

      // Fetch trip context
      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('destination, budget, start_date, end_date')
        .eq('id', tripId)
        .single();

      const context = trip 
        ? `Context: Trip to ${trip.destination}, Budget ₹${trip.budget}, Dates: ${trip.start_date} to ${trip.end_date}. ` 
        : "";

      const reply = await aiService.chat(`${context} User Question: ${message}`);

      return res.json({ 
        success: true, 
        data: reply 
      });
    } catch (err: any) {
      console.error("AI chat error:", err.message);
      return res.status(500).json({ success: false, message: "Chat failed" });
    }
  },

  // ✅ 3. Chat history
  getChatHistory: async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;
      return res.json({ success: true, data: [] });
    } catch (err: any) {      console.error("Chat history error:", err.message);
      return res.status(500).json({ success: false, message: "Failed to fetch chat history" });
    }
  },

  // ✅ 4. Budget analysis
  analyzeBudget: async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;
      const input = `Analyze budget for trip ID: ${tripId}`;
      const result = await aiService.analyzeBudget(input);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      console.error("Budget error:", err.message);
      return res.status(500).json({ success: false, message: "Budget analysis failed" });
    }
  },

  // ✅ 5. Trip summary
  generateSummary: async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;
      const input = `Summarize trip ID: ${tripId}`;
      const result = await aiService.generateSummary(input);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      console.error("Summary error:", err.message);
      return res.status(500).json({ success: false, message: "Summary failed" });
    }
  },
};