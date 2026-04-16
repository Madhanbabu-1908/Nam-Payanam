const express = require('express');
const router = express.Router();

const tripCtrl = require('../controllers/tripController');
const expCtrl = require('../controllers/expenseController');
const aiCtrl = require('../controllers/aiController');

// === TRIP ROUTES ===
// NOTE: specific routes must come before parameterized routes
router.post('/trips/ai-plans', tripCtrl.getAIPlans);       // POST /api/trips/ai-plans
router.post('/trips', tripCtrl.createTrip);                 // POST /api/trips
router.get('/trips/:code', tripCtrl.getTripByCode);         // GET  /api/trips/ABC123
router.post('/trips/:code/join', tripCtrl.joinTrip);        // POST /api/trips/ABC123/join
router.delete('/trips/:tripId/members/:memberId', tripCtrl.removeMember);
router.patch('/trips/:tripId/status', tripCtrl.updateTripStatus);
router.patch('/trips/:tripId/progress', tripCtrl.updateProgress);

// === EXPENSE ROUTES ===
// IMPORTANT: specific sub-paths must come before /:tripId to avoid conflict
router.get('/expenses/:tripId/settlements', expCtrl.calculateSettlements);
router.get('/expenses/:tripId/report', expCtrl.generateReport);
router.get('/expenses/:tripId', expCtrl.getTripExpenses);
router.post('/expenses', expCtrl.addExpense);
router.patch('/expenses/:expenseId', expCtrl.updateExpense);
router.delete('/expenses/:expenseId', expCtrl.deleteExpense);

// === AI ROUTES ===
router.post('/ai/chat', aiCtrl.chat);
router.get('/ai/insights/:tripId', aiCtrl.getInsights);

// === DEBUG: list all routes in dev ===
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/routes', (req, res) => {
    const routes = [];
    router.stack.forEach(r => {
      if (r.route) {
        Object.keys(r.route.methods).forEach(method => {
          routes.push(`${method.toUpperCase()} /api${r.route.path}`);
        });
      }
    });
    res.json({ routes });
  });
}

module.exports = router;
