import { Router } from 'express';
import { expenseController } from '../controllers/expenseController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// ✅ Specific routes FIRST (to prevent shadowing by generic :tripId)
router.patch('/splits/:splitId/settle', expenseController.settleSplit);
router.get('/:tripId/settlements', expenseController.getSettlements);

// ✅ Generic routes LAST
router.post('/:tripId', expenseController.addExpense);
router.get('/:tripId', expenseController.getExpenses);
router.delete('/:tripId/:expenseId', expenseController.deleteExpense);

export default router;
