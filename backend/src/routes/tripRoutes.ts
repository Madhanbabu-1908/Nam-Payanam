import { Router } from 'express';
import { tripController } from '../controllers/tripController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrganizer } from '../middleware/roleMiddleware';

const router = Router();

// Protect all routes with Auth
router.use(authMiddleware);

// ✅ NEW: Get current user's trips
router.get('/my', tripController.getMyTrips);

// Get single trip details
router.get('/:tripId', tripController.getTrip);

// Create new trip
router.post('/', tripController.createTrip);

// Update/Delete (Organizer only)
router.put('/:tripId', requireOrganizer, tripController.updateTrip);
router.delete('/:tripId', requireOrganizer, tripController.deleteTrip);

export default router;