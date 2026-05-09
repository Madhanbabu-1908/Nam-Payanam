import { Router } from 'express';
import { checkinController } from '../controllers/checkinController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// POST /api/checkin/ -> Create Checkin
router.post('/', checkinController.createCheckin);

// GET /api/checkin/trip/:tripId -> Get Checkins for Trip
router.get('/trip/:tripId', checkinController.getCheckins);

// PATCH /api/checkin/:checkinId/status -> Update Status
router.patch('/:checkinId/status', checkinController.updateStatus);

export default router;
