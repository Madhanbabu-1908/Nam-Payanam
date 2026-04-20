import { Router } from 'express';
import tripRoutes from './tripRoutes';
import expenseRoutes from './expenseRoutes';
import itineraryRoutes from './itineraryRoutes';
import aiRoutes from './aiRoutes';
import authRoutes from './authRoutes';

const router = Router();

// ✅ Health Check Route (Now accessible at /api/health)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Nam-Payanam Backend is running 🚀',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Welcome Message for root /api
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Nam-Payanam API! 🚌",
    version: "1.0.0",
    endpoints: [
      "/api/health",
      "/api/trips",
      "/api/expenses",
      "/api/itinerary",
      "/api/auth",
      "/api/ai"
    ]
  });
});

// Register Sub-routes
router.use('/trips', tripRoutes);
router.use('/expenses', expenseRoutes);
router.use('/itinerary', itineraryRoutes);
router.use('/ai', aiRoutes);
router.use('/auth', authRoutes);

export default router;