const express = require('express');
const router = express.Router();
const tripCtrl = require('../controllers/tripController');
const expCtrl = require('../controllers/expenseController');
const aiCtrl = require('../controllers/aiController');
const breakCtrl = require('../controllers/breakController');

// ── TRIP ROUTES ────────────────────────────────────────────────
router.get('/trips/search-location', tripCtrl.searchLocation);
router.post('/trips/calculate-route', tripCtrl.calcRoute);
router.post('/trips/ai-questions', tripCtrl.getAIQuestions);
router.post('/trips/ai-plans', tripCtrl.getAIPlans);
router.post('/trips', tripCtrl.createTrip);
router.get('/trips/my/:sessionId', tripCtrl.getMyTrips);
router.get('/trips/:code', tripCtrl.getTripByCode);
router.post('/trips/:code/join', tripCtrl.joinTrip);
router.delete('/trips/:tripId', tripCtrl.deleteTrip);
router.delete('/trips/:tripId/members/:memberId', tripCtrl.removeMember);
router.patch('/trips/:tripId/status', tripCtrl.updateTripStatus);
router.patch('/trips/:tripId/progress', tripCtrl.updateProgress);
router.post('/trips/:tripId/announcements', tripCtrl.postAnnouncement);
router.get('/trips/:tripId/announcements', tripCtrl.getAnnouncements);

// ── EXPENSE ROUTES ─────────────────────────────────────────────
router.get('/expenses/:tripId/settlements', expCtrl.calculateSettlements);
router.get('/expenses/:tripId/report', expCtrl.generateReport);
router.get('/expenses/:tripId', expCtrl.getTripExpenses);
router.post('/expenses', expCtrl.addExpense);
router.patch('/expenses/:expenseId', expCtrl.updateExpense);
router.delete('/expenses/:expenseId', expCtrl.deleteExpense);

// ── BREAK ROUTES ───────────────────────────────────────────────
router.get('/breaks/:tripId', breakCtrl.getTripBreaks);
router.post('/breaks', breakCtrl.addBreak);
router.patch('/breaks/:breakId', breakCtrl.updateBreak);
router.patch('/breaks/:breakId/checkout', breakCtrl.checkoutBreak);
router.delete('/breaks/:breakId', breakCtrl.deleteBreak);

// ── AI ROUTES ──────────────────────────────────────────────────
router.post('/ai/chat', aiCtrl.chat);
router.get('/ai/insights/:tripId', aiCtrl.getInsights);

module.exports = router;
