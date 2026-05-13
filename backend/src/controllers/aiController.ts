// ✅ 1. Regenerate Itinerary (Route-Aware Implementation)
  regenerateItinerary: async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;
      const { interests } = req.body;

      // 1. Fetch Trip Details INCLUDING Route Info
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('*') // Selects start_location, destination, waypoints, etc.
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
      if (trip.waypoints && Array.isArray(trip.waypoints) && trip.waypoints.length > 0) {
        const stops = trip.waypoints.map((w: any) => w.name).join(", ");
        routeContext = `
          Route Sequence:
          1. Start at: ${trip.start_location}
          2. Stopovers: ${stops}
          3. Final Destination: ${trip.destination}
          
          IMPORTANT: 
          - Day 1 activities MUST be near ${trip.start_location}.
          - Intermediate days should cover the stopovers (${stops}).
          - The final day MUST end at ${trip.destination}.
          - Ensure the travel flow is logical and follows this geographic order.
        `;
      } else {
        routeContext = `
          Route: From ${trip.start_location} to ${trip.destination}.
          Ensure Day 1 starts near ${trip.start_location} and the trip ends at ${trip.destination}.
        `;
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
              "day": 1,The issue is that the AI generates a generic list of activities without knowing your specific **Start Location**, **Waypoints**, and **Destination**. It just sees "Trip to Chennai" and gives you random places in Chennai.

To fix this, we need to:
1.  **Pass the Route Details** (Start, Stops, Destination) to the AI prompt.
2.  **Instruct the AI** to structure the itinerary logically: Day 1 starts at Start Location, intermediate days cover waypoints, and the last day ends at the Destination.

### ✅ Step 1: Update `backend/src/controllers/aiController.ts`

Replace the `regenerateItinerary` function with this improved version. It fetches the route details and forces the AI to follow the geographical sequence.

```typescript
  // ✅ 1. Regenerate Itinerary (Route-Aware Implementation)
  regenerateItinerary: async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;
      const { interests } = req.body;

      // 1. Fetch Trip Details INCLUDING Route Info
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('*') // Selects start_location, destination, waypoints, etc.
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
      if (trip.waypoints && Array.isArray(trip.waypoints) && trip.waypoints.length > 0) {
        const stops = trip.waypoints.map((w: any) => w.name).join(", ");        routeContext = `
          Route Sequence:
          1. Start at: ${trip.start_location}
          2. Stopovers: ${stops}
          3. Final Destination: ${trip.destination}
          
          IMPORTANT: 
          - Day 1 activities MUST be near ${trip.start_location}.
          - Intermediate days should cover the stopovers (${stops}).
          - The final day MUST end at ${trip.destination}.
          - Ensure the travel flow is logical and follows this geographic order.
        `;
      } else {
        routeContext = `
          Route: From ${trip.start_location} to ${trip.destination}.
          Ensure Day 1 starts near ${trip.start_location} and the trip ends at ${trip.destination}.
        `;
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

      console.log("🤖 Sending Prompt to AI:", prompt.substring(0, 200) + "...");
      // 5. Call AI Service
      const result = await aiService.generateItinerary(prompt);

      // 6. Save to Database
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
    }  },