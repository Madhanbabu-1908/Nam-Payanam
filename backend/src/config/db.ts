import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Initialize Supabase Admin Client
// This uses the SERVICE_ROLE key to bypass RLS when necessary (e.g., complex deletes)
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Initialize Public Client (if needed for specific user-context operations)
// Usually, we pass the user's JWT from the frontend to middleware, then create a client there.