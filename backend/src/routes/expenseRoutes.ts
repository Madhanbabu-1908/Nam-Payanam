import { Router } from 'express';
import { expenseController } from '../controllers/expenseController'; // We will create this simple controller next
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// POST /api/expenses - Add a new expense
router.post('/', expenseController.addExpense);

// GET /api/expenses/trip/:tripId - Get all expenses for a trip
router.get('/trip/:tripId', expenseController.getExpensesByTrip);

// GET /api/expenses/settlement/:tripId - Get who owes whom
router.get('/settlement/:tripId', expenseController.getSettlementSummary);

export default router;