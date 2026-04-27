import { Router } from 'express';
import { tripController } from '../controllers/tripController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrganizer } from '../middleware/roleMiddleware';

const router = Router();

/**
 * 🔐 Apply authentication middleware to all routes
 */
router.use(authMiddleware);

/**
 * 🚀 CREATE TRIP
 * POST /trips
 */
router.post('/', tripController.createTrip);

/**
 * 📦 GET CURRENT USER TRIPS
 * GET /trips/my
 */
router.get('/my', tripController.getMyTrips);

/**
 * 🎟️ JOIN TRIP BY CODE
 * ⚠️ IMPORTANT: Must be BEFORE /:tripId routes
 * POST /trips/join-by-code
 */
router.post('/join-by-code', tripController.joinByCode);

/**
 * 🤝 JOIN TRIP BY ID
 * POST /trips/:tripId/join
 */
router.post('/:tripId/join', tripController.joinTrip);

/**
 * 👥 GET TRIP MEMBERS
 * GET /trips/:tripId/members
 */
router.get('/:tripId/members', tripController.getMembers);

/**
 * 📄 GET SINGLE TRIP DETAILS
 * GET /trips/:tripId
 */
router.get('/:tripId', tripController.getTrip);

/**
 * ✏️ UPDATE TRIP (Organizer only)
 * PUT /trips/:tripId
 */
router.put('/:tripId', requireOrganizer, tripController.updateTrip);

/**
 * ❌ DELETE TRIP (Organizer only)
 * DELETE /trips/:tripId
 */
router.delete('/:tripId', requireOrganizer, tripController.deleteTrip);

export default router;