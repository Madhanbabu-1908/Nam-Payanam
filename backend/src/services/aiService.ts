import { groqClient } from '../config/groq';
import { ItineraryItem } from '../types'; // ✅ Fixed import

interface AIPlanRequest {
  destination: string;
  days: number;
  budget: number;
  interests: string[];
  startLocation: string;
}

export const aiService = {
  async generateItinerary(params: AIPlanRequest): Promise<ItineraryItem[]> {
    const prompt = `
      Act as a professional travel planner. Create a ${params.days}-day itinerary for a trip from ${params.startLocation} to ${params.destination}.
      Total Budget: ₹${params.budget}.
      Interests: ${params.interests.join(', ')}.

      Return ONLY a valid JSON array of objects. Do not include markdown formatting.
      Each object must have:
      - day_number (integer)
      - time_slot (string)
      - location_name (string)
      - description (string)
      - estimated_cost (number)
    `;

    try {
      const completion = await groqClient.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-70b-8192',
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('No response from AI');

      const parsedResponse = JSON.parse(content);
      const items = Array.isArray(parsedResponse) ? parsedResponse : (parsedResponse.itinerary || []);

      return items.map((item: any) => ({
        id: '',
        trip_id: '',
        day_number: item.day_number,
        time_slot: item.time_slot,
        location_name: item.location_name,
        description: item.description,
        estimated_cost: item.estimated_cost,
        latitude: null,
        longitude: null,
      }));
    } catch (error) {
      console.error('AI Generation Error:', error);
      throw new Error('Failed to generate itinerary using AI');
    }
  }
};