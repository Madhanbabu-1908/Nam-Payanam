import { Router } from 'express';
import tripRoutes from './tripRoutes';
import expenseRoutes from './expenseRoutes';
import checkinRoutes from './checkinRoutes'; // ✅ New
import itineraryRoutes from './itineraryRoutes';
import authRoutes from './authRoutes';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok', message: 'Nam-Payanam API Live 🚀' }));
router.get('/', (req, res) => res.json({ message: 'Welcome to Nam-Payanam API' }));

router.use('/trips', tripRoutes);
router.use('/expenses', expenseRoutes);
router.use('/checkins', checkinRoutes); // ✅ Register
router.use('/itinerary', itineraryRoutes);
router.use('/auth', authRoutes);

export default router;