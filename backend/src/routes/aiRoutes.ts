import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrganizer } from '../middleware/roleMiddleware';

const router = Router();
router.use(authMiddleware);

// POST /api/ai/regenerate/:tripId
router.post('/regenerate/:tripId', requireOrganizer, aiController.regenerateItinerary);

export default router;