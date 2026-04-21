import { Router } from 'express';
import { trackingController } from '../controllers/trackingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Protected Routes (Organizer only)
router.post('/tokens/:tripId', authMiddleware, trackingController.createToken);
router.get('/live/:tripId', authMiddleware, trackingController.getLiveLocation);

// Public Route (Driver & Viewers)
router.post('/push/:token', trackingController.pushLocation);

export default router;