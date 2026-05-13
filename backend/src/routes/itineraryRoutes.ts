import { Router } from 'express';
import { itineraryController } from '../controllers/itineraryController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrganizer } from '../middleware/roleMiddleware';

const router = Router();
router.use(authMiddleware);

// GET /api/itinerary/:tripId
router.get('/:tripId', itineraryController.getItineraryByTrip);

// ✅ POST /api/itinerary/:tripId (Add Stop - Manual or AI)
// Uses createItem from controller
router.post('/:tripId', requireOrganizer, itineraryController.createItem);

// PUT /api/itinerary/:id (Update Stop)
router.put('/:id', requireOrganizer, itineraryController.updateStop);

// DELETE /api/itinerary/:id (Delete Stop)
router.delete('/:id', requireOrganizer, itineraryController.deleteStop);

export default router;