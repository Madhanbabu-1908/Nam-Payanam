const express = require('express');
const router = express.Router();

const tripCtrl = require('../controllers/tripController');
const expCtrl = require('../controllers/expenseController');
const aiCtrl = require('../controllers/aiController');

// === TRIP ROUTES ===
router.post('/trips/ai-plans', tripCtrl.getAIPlans);
router.post('/trips', tripCtrl.createTrip);
router.get('/trips/:code', tripCtrl.getTripByCode);
router.post('/trips/:code/join', tripCtrl.joinTrip);
router.delete('/trips/:tripId/members/:memberId', tripCtrl.removeMember);
router.delete('/trips/:tripId', tripCtrl.deleteTrip);
router.patch('/trips/:tripId/status', tripCtrl.updateTripStatus);
router.patch('/trips/:tripId/progress', tripCtrl.updateProgress);
router.post('/trips/:tripId/breaks', tripCtrl.addBreakStop);
router.get('/trips/:tripId/breaks', tripCtrl.getBreakStops);

// === SESSION / HISTORY ROUTES ===
router.get('/sessions/:sessionId/trips', tripCtrl.getSessionTrips);
router.post('/sessions/touch', tripCtrl.touchSession);

// === EXPENSE ROUTES ===
router.get('/expenses/:tripId/settlements', expCtrl.calculateSettlements);
router.get('/expenses/:tripId/report', expCtrl.generateReport);
router.get('/expenses/:tripId', expCtrl.getTripExpenses);
router.post('/expenses', expCtrl.addExpense);
router.patch('/expenses/:expenseId', expCtrl.updateExpense);
router.delete('/expenses/:expenseId', expCtrl.deleteExpense);

// === AI ROUTES ===
router.post('/ai/chat', aiCtrl.chat);
router.get('/ai/insights/:tripId', aiCtrl.getInsights);

module.exports = router;
