import { Router } from 'express';
import { tripController } from '../controllers/tripController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrganizer } from '../middleware/roleMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/trips/:tripId - Get trip details
router.get('/:tripId', tripController.getTrip);

// POST /api/trips - Create a new trip (AI or Manual)
router.post('/', tripController.createTrip);

// DELETE /api/trips/:tripId - Delete trip (Organizer Only)
// ✅ The requireOrganizer middleware blocks non-organizers here
router.delete('/:tripId', requireOrganizer, tripController.deleteTrip);

// PUT /api/trips/:tripId - Update trip (Organizer Only)
router.put('/:tripId', requireOrganizer, tripController.updateTrip); // Note: updateTrip needs to be added to controller if not present

export default router;