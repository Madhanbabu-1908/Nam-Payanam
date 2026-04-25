import { Router } from 'express';
import { requireAuth } from '../middleware/auth';

// controllers
import { deleteAccount } from '../controllers/authController';
import { addExpense, getExpenses, getSettlements, recordSettlement } from '../controllers/expenseController';
import { checkIn, getTripCheckins, cancelCheckin } from '../controllers/checkinController';
import { getItinerary, addStop, updateStop, deleteStop, generateAI } from '../controllers/itineraryController';

// ── (import your existing trip / tracking / profile controllers here) ──
// import * as trip from '../controllers/tripController';
// import * as tracking from '../controllers/trackingController';

const router = Router();

// ── Auth ─────────────────────────────────────────────────────
router.delete('/auth/account', requireAuth, deleteAccount);

// ── Expenses ─────────────────────────────────────────────────
router.get( '/expenses/:tripId',              requireAuth, getExpenses);
router.post('/expenses/:tripId',              requireAuth, addExpense);
router.get( '/expenses/:tripId/settlements',  requireAuth, getSettlements);
router.post('/expenses/:tripId/settle',       requireAuth, recordSettlement);

// ── Check-ins ─────────────────────────────────────────────────
router.post(  '/checkins',                    requireAuth, checkIn);
router.get(   '/checkins/trip/:tripId',       requireAuth, getTripCheckins);
router.delete('/checkins/:checkinId',         requireAuth, cancelCheckin);

// ── Itinerary ─────────────────────────────────────────────────
router.get(   '/itinerary/trips/:tripId',              requireAuth, getItinerary);
router.post(  '/itinerary/trips/:tripId',              requireAuth, addStop);
router.post(  '/itinerary/trips/:tripId/generate-ai',  requireAuth, generateAI);
router.put(   '/itinerary/:stopId',                    requireAuth, updateStop);
router.delete('/itinerary/:stopId',                    requireAuth, deleteStop);

// ── Tracking ─── (these already existed, kept here for reference)
// router.post('/tracking/trips/:tripId/location', requireAuth, tracking.saveLocation);
// router.get( '/tracking/trips/:tripId/path',     requireAuth, tracking.getPath);

export default router;
