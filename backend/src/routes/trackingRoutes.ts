import { Router } from 'express';
import { trackingController } from '../controllers/trackingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * Protected Routes (Organizer Only)
 * Requires valid JWT in Authorization header
 */
// Generate a new tracking token for a specific trip
router.post('/tokens/:tripId', authMiddleware, trackingController.createToken);

// Get live location for a trip (used by Dashboard LiveMapPage)
router.get('/live/:tripId', authMiddleware, trackingController.getLiveLocation);

/**
 * Public Routes (Driver & Viewers)
 * No Authentication Required, secured by Token in URL/Params
 */
// Driver pushes GPS coordinates
router.post('/push/:token', trackingController.pushLocation);

// Public viewer fetches latest location
router.get('/public/:token', trackingController.getPublicLocation);

export default router;