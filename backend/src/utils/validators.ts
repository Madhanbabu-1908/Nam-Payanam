import { z } from 'zod';

export const createTripSchema = z.object({
  name: z.string().min(1),
  destination: z.string().min(1),
  start_date: z.string(),
  end_date: z.string(),
  budget: z.number().positive(),
  mode: z.enum(['AI', 'MANUAL']),
  interests: z.array(z.string()).optional(),
  start_location: z.string().optional()
});

export const expenseSchema = z.object({
  amount: z.number().positive(),
  category: z.enum(['FOOD', 'TRAVEL', 'STAY', 'OTHER']),
  description: z.string(),
  split_details: z.array(z.object({
    user_id: z.string(),
    amount: z.number()
  }))
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>