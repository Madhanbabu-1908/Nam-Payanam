import { Groq } from 'groq-sdk';
import { env } from '../config/env';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

export const aiService = {
  generateItinerary: async (params: {
    destination: string;
    days: number;
    budget: number;
    interests: string[];
    startLocation: string;
  }) => {
    const { destination, days, budget, interests, startLocation } = params;

    const prompt = `
      Create a ${days}-day travel itinerary for ${destination}.
      Start location: ${startLocation}.
      Total Budget: ₹${budget}.
      Interests: ${interests.join(', ')}.
      
      Return ONLY a valid JSON array of objects. Do not include markdown formatting or explanations.
      Each object must have:
      - day_number (number)
      - time_slot (string, e.g., "Morning", "Afternoon")
      - location_name (string)
      - description (string, brief activity)
      - estimated_cost (number, approximate cost in INR)
      
      Example format:
      [
        {"day_number": 1, "time_slot": "Morning", "location_name": "Place A", "description": "Visit...", "estimated_cost": 500},
        ...
      ]
    `;

    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert travel planner. Output ONLY valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        // ✅ UPDATED MODEL ID HERE
        model: 'openai/gpt-oss-120b', 
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 1,
        stream: false,
        response_format: { type: 'json_object' } // Ensures JSON output
      });

      const content = chatCompletion.choices[0]?.message?.content || '[]';
      
      // Clean up markdown code blocks if Groq adds them
      const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(jsonString);
    } catch (error: any) {
      console.error('AI Generation Error:', error);
      throw new Error('Failed to generate itinerary using AI');
    }
  }
};