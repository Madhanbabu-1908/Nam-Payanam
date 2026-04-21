import { Router } from 'express';
import { checkinController } from '../controllers/checkinController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

router.post('/', checkinController.createCheckin);
router.get('/trip/:tripId', checkinController.getCheckins);

export default router;