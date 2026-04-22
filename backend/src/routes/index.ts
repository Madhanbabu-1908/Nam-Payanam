import { Router } from 'express';
import tripRoutes from './tripRoutes';
import expenseRoutes from './expenseRoutes';
import checkinRoutes from './checkinRoutes'; // ✅ Ensure this is imported
import itineraryRoutes from './itineraryRoutes';
import authRoutes from './authRoutes';
import trackingRoutes from './trackingRoutes';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok', message: 'Nam-Payanam API Live 🚀' }));
router.get('/', (req, res) => res.json({ message: 'Welcome to Nam-Payanam API' }));

router.use('/trips', tripRoutes);
router.use('/expenses', expenseRoutes);
router.use('/checkins', checkinRoutes); // ✅ Registered here
router.use('/itinerary', itineraryRoutes);
router.use('/auth', authRoutes);
router.use('/tracking', trackingRoutes);

export default router;