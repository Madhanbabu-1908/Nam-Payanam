import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

router.post('/trips/:tripId/regenerate', aiController.regenerateItinerary);
router.post('/trips/:tripId/chat',       aiController.chat);
router.get('/trips/:tripId/chat',        aiController.getChatHistory);
router.get('/trips/:tripId/budget',      aiController.analyzeBudget);
router.get('/trips/:tripId/summary',     aiController.generateSummary);

export default router;
