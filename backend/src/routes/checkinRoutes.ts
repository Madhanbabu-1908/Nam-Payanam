import { Router } from 'express';
import { checkinController } from '../controllers/checkinController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

router.post('/', checkinController.createCheckin);
router.get('/trip/:tripId', checkinController.getCheckins);
router.patch('/:checkinId/status', checkinController.updateStatus);

export default router;
