import { Router } from 'express';
import tripRoutes from './tripRoutes';
import expenseRoutes from './expenseRoutes';
import itineraryRoutes from './itineraryRoutes';
import authRoutes from './authRoutes';
import aiRoutes from './aiRoutes';
import trackingRoutes from './trackingRoutes';
import checkinRoutes from './checkinRoutes';

const router = Router();

router.use('/auth',      authRoutes);
router.use('/trips',     tripRoutes);
router.use('/expenses',  expenseRoutes);
router.use('/itinerary', itineraryRoutes);
router.use('/ai',        aiRoutes);
router.use('/tracking',  trackingRoutes);
router.use('/checkin',   checkinRoutes);

router.get('/health', (_req, res) => res.json({ status: 'ok', app: 'Nam Payanam', time: new Date().toISOString() }));

export default router;
