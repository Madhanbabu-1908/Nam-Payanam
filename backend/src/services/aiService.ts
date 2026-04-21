import { Groq } from 'groq-sdk';
import { env } from '../config/env';

const groq = new Groq({ 
  apiKey: env.GROQ_API_KEY 
});

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
      You are an expert travel planner. Create a detailed ${days}-day travel itinerary for ${destination}.
      Start location: ${startLocation}.
      Total Budget: ₹${budget}.
      Interests: ${interests.join(', ')}.

      CRITICAL INSTRUCTION: Return ONLY a raw JSON array of objects. 
      - Do NOT wrap it in markdown code blocks (no \`\`\`json).
      - Do NOT include any introductory text or explanations.
      - The output must start with '[' and end with ']'.
      
      Each object must have:
      - "day_number": number
      - "time_slot": string (e.g., "Morning")
      - "location_name": string
      - "description": string
      - "estimated_cost": number

      Example: [{"day_number":1,"time_slot":"Morning","location_name":"Place","description":"Visit","estimated_cost":100}]
    `;

    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a JSON-only API. Output strictly a JSON array.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 1,
        stream: false,
        response_format: { type: 'json_object' } 
      });

      let content = chatCompletion.choices[0]?.message?.content;

      if (!content) {
        throw new Error('AI returned empty content');
      }

      // 1. Clean Markdown
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();

      // 2. Parse JSON
      let parsedData;
      try {
        parsedData = JSON.parse(content);
      } catch (parseError) {
        console.error('Raw AI Content:', content);
        throw new Error('Failed to parse AI response as JSON');
      }

      // 3. Ensure it is an Array
      if (Array.isArray(parsedData)) {
        return parsedData;
      } 
      
      // 4. Handle case where AI returns an object wrapper like { "items": [...] }
      if (typeof parsedData === 'object') {
        // Check common keys the AI might use
        const possibleKeys = ['itinerary', 'items', 'plan', 'data', 'result'];
        for (const key of possibleKeys) {
          if (Array.isArray((parsedData as any)[key])) {
            return (parsedData as any)[key];
          }
        }
        // If it's an object but no known key, try to see if any value is an array
        const values = Object.values(parsedData);
        const firstArray = values.find(v => Array.isArray(v));
        if (firstArray) {
          return firstArray;
        }
      }

      console.warn('AI did not return an array or recognizable object structure:', parsedData);
      return []; // Return empty array instead of crashing
    } catch (error: any) {
      console.error('AI Generation Error:', error);
      throw new Error(`Failed to generate itinerary: ${error.message}`);
    }
  }
};