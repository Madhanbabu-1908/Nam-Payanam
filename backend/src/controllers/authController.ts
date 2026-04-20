import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';

// Since we use Supabase Auth on the frontend, this controller is mostly for profile management
export const authController = {
  getProfile: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // User info is already attached to req.user by middleware
      res.json({
        success: true,
        data: {
          id: req.user?.id,
          email: req.user?.email
        }
      });
    } catch (error: any) {
      next(error);
    }
  }
};