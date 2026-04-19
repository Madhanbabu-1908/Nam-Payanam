const express = require('express');
const router  = express.Router();
const tripCtrl    = require('../controllers/tripController');
const expCtrl     = require('../controllers/expenseController');
const aiCtrl      = require('../controllers/aiController');
const breakCtrl   = require('../controllers/breakController');
const trackCtrl   = require('../controllers/trackingController');
const authCtrl    = require('../controllers/authController');

// ── AUTH (organiser) ──────────────────────────────────────────
router.post('/auth/register',             authCtrl.register);
router.post('/auth/login',                authCtrl.login);
router.get('/auth/me/:accountId',         authCtrl.getMe);
router.patch('/auth/change-pin',          authCtrl.changePin);

// ── TRIPS ─────────────────────────────────────────────────────
router.get('/trips/search-location',      tripCtrl.searchLocation);
router.post('/trips/calculate-route',     tripCtrl.calcRoute);
router.post('/trips/ai-questions',        tripCtrl.getAIQuestions);
router.post('/trips/ai-plans',            tripCtrl.getAIPlans);
router.post('/trips',                     tripCtrl.createTrip);
router.get('/trips/my/:sessionId',        tripCtrl.getMyTrips);
router.get('/trips/:code',                tripCtrl.getTripByCode);
router.post('/trips/:code/join',          tripCtrl.joinTrip);
router.delete('/trips/:tripId',           tripCtrl.deleteTrip);
router.delete('/trips/:tripId/members/:memberId', tripCtrl.removeMember);
router.patch('/trips/:tripId/status',     tripCtrl.updateTripStatus);
router.patch('/trips/:tripId/progress',   tripCtrl.updateProgress);
router.post('/trips/:tripId/announcements', tripCtrl.postAnnouncement);
router.get('/trips/:tripId/announcements',  tripCtrl.getAnnouncements);

// ── EXPENSES ──────────────────────────────────────────────────
router.get('/expenses/:tripId/settlements', expCtrl.calculateSettlements);
router.get('/expenses/:tripId/report',      expCtrl.generateReport);
router.get('/expenses/:tripId',             expCtrl.getTripExpenses);
router.post('/expenses',                    expCtrl.addExpense);
router.patch('/expenses/:expenseId',        expCtrl.updateExpense);
router.delete('/expenses/:expenseId',       expCtrl.deleteExpense);

// ── BREAKS ────────────────────────────────────────────────────
// FIX: Changed getBreaks to getTripBreaks to match controller export
router.get('/breaks/:tripId',    breakCtrl.getTripBreaks); 
router.post('/breaks',           breakCtrl.addBreak);
router.patch('/breaks/:breakId', breakCtrl.updateBreak);
router.delete('/breaks/:breakId',breakCtrl.deleteBreak);

// ── AI ────────────────────────────────────────────────────────
router.post('/ai/chat',           aiCtrl.chat);
router.get('/ai/insights/:tripId',aiCtrl.getInsights);

// ── TRACKING ──────────────────────────────────────────────────
router.post('/tracking/location',             trackCtrl.pushLocation);
router.get('/tracking/:tripId/path',          trackCtrl.getPath);
router.post('/tracking/tokens',               trackCtrl.createToken);
router.get('/track/:token',                   trackCtrl.getByToken);

// ── MEMBER CHECK-INS ──────────────────────────────────────────
router.post('/checkins',                      trackCtrl.createCheckin);
router.get('/checkins/:tripId',               trackCtrl.getCheckins);
router.patch('/checkins/:id/acknowledge',     trackCtrl.acknowledgeCheckin);
router.patch('/checkins/:id/pickup',          trackCtrl.markPickedUp);

module.exports = router;