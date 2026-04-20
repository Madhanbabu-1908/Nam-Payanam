import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Create a client specifically for verifying tokens (uses Anon key)
const supabaseAuth = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    req.user = {
      id: user.id,
      email: user.email || '',
    };

    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};