import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Protect all auth routes
router.use(authMiddleware);

// GET /api/auth/profile - Get current user info
router.get('/profile', authController.getProfile);

// ✅ DELETE /api/auth/account - Delete current user account
router.delete('/account', authController.deleteAccount);

export default router;