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
router.patch('/trips/:tripId/status', tripCtrl.updateTripStatus);
router.patch('/trips/:tripId/progress', tripCtrl.updateProgress);

// === EXPENSE ROUTES ===
router.post('/expenses', expCtrl.addExpense);
router.get('/expenses/:tripId', expCtrl.getTripExpenses);
router.patch('/expenses/:expenseId', expCtrl.updateExpense);
router.delete('/expenses/:expenseId', expCtrl.deleteExpense);
router.get('/expenses/:tripId/settlements', expCtrl.calculateSettlements);
router.get('/expenses/:tripId/report', expCtrl.generateReport);

// === AI ROUTES ===
router.post('/ai/chat', aiCtrl.chat);
router.post('/ai/generate-plan', aiCtrl.generatePlan);
router.get('/ai/insights/:tripId', aiCtrl.getInsights);

module.exports = router;
