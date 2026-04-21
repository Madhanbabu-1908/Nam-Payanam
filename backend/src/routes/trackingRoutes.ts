import { Router } from 'express';
import { trackingController } from '../controllers/trackingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// ✅ Protected Routes (Organizer only)
// POST /api/tracking/tokens/:tripId
router.post('/tokens/:tripId', authMiddleware, trackingController.createToken);

// GET /api/tracking/live/:tripId
router.get('/live/:tripId', authMiddleware, trackingController.getLiveLocation);

// ✅ Public Route (Driver & Viewers)
// POST /api/tracking/push/:token
router.post('/push/:token', trackingController.pushLocation);

export default router;