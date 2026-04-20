import { Router } from 'express';
import tripRoutes from './tripRoutes';
import expenseRoutes from './expenseRoutes';
import itineraryRoutes from './itineraryRoutes';
import aiRoutes from './aiRoutes';
import authRoutes from './authRoutes';

const router = Router();

router.use('/trips', tripRoutes);
router.use('/expenses', expenseRoutes);
router.use('/itinerary', itineraryRoutes);
router.use('/ai', aiRoutes);
router.use('/auth', authRoutes);

export default router;