import { Router } from 'express';
import tripRoutes from './tripRoutes';
import expenseRoutes from './expenseRoutes';
// import authRoutes from './authRoutes'; // Optional if you handle auth purely via Supabase SDK on frontend

const router = Router();

router.use('/trips', tripRoutes);
router.use('/expenses', expenseRoutes);
// router.use('/auth', authRoutes);

export default router;