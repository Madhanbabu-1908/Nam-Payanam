import { Request, Response } from "express";
import { aiService } from "../services/aiService";
import { supabaseAdmin } from "../config/db";

export const aiController = {

  // ✅ 1. Regenerate Itinerary (Route-Aware & DB Saving)
  regenerateItinerary: async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;
      const { interests } = req.body;

      // 1. Fetch Trip Details INCLUDING Route Info
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

      // 3. Format Waypoints for Prompt
      let routeContext = "";
      // Check if waypoints exist and are an array
      if (trip.waypoints && Array.isArray(trip.waypoints) && trip.waypoints.length > 0) {
        const stops = trip.waypoints.map((w: any) => w.name).join(", ");
        routeContext = `
          CRITICAL ROUTE SEQUENCE:
          1. Start at: ${trip.start_location}
          2. Stopovers: ${stops}
          3. Final Destination: ${trip.destination}
          
          INSTRUCTIONS:
          - Day 1 activities MUST be near ${trip.start_location}.
          - Intermediate days should cover the stopovers (${stops}).
          - The final day MUST end at ${trip.destination}.
          - Ensure the travel flow is logical and follows this geographic order.
        `;
      } else {
        routeContext = `
          Route: From ${trip.start_location} to ${trip.destination}.
          Ensure Day 1 starts near ${trip.start_location} and the trip ends at ${trip.destination}.        `;
      }

      // 4. Construct Enhanced Prompt
      const prompt = `
        You are an expert travel planner for Nam Payanam.
        Create a detailed ${days}-day itinerary.

        ${routeContext}

        Trip Details:
        - Dates: ${trip.start_date} to ${trip.end_date} (${days} days)
        - Budget: ₹${trip.budget}
        - Interests: ${interests || trip.interests || 'General Sightseeing'}

        Return STRICT JSON only in this format:
        {
          "days": [
            {
              "day": 1,
              "title": "Day 1: Starting from ${trip.start_location}",
              "activities": [
                {
                  "time": "09:00 AM",
                  "place": "Specific Place Name",
                  "notes": "Why visit this place?"
                }
              ]
            }
          ]
        }
      `;

      console.log("🤖 Generating Itinerary for Trip:", tripId);

      // 5. Call AI Service
      const result = await aiService.generateItinerary(prompt);

      // 6. Save to Database (itinerary_items table)
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
            estimated_cost: null,            category: 'Sightseeing'
          }))
        );

        if (itemsToInsert.length > 0) {
          // Delete old items for this trip to avoid duplicates
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

  // ✅ 2. Chat (Context-Aware)
  chat: async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      const { tripId } = req.params;

      if (!message) {
        return res.status(400).json({ success: false, message: "Message is required" });
      }

      // Fetch trip context for better answers
      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('destination, budget, start_date, end_date')        .eq('id', tripId)
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
      // For now, return empty array. Implement chat_history table later if needed.
      return res.json({ success: true, data: [] });
    } catch (err: any) {
      console.error("Chat history error:", err.message);
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
      const result = await aiService.generateSummary(input);      return res.json({ success: true, data: result });
    } catch (err: any) {
      console.error("Summary error:", err.message);
      return res.status(500).json({ success: false, message: "Summary failed" });
    }
  },
};