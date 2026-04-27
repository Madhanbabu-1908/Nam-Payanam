import { Router } from 'express';
import { expenseController } from '../controllers/expenseController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

router.post('/:tripId', expenseController.addExpense);
router.get('/:tripId', expenseController.getExpenses);
router.delete('/:tripId/:expenseId', expenseController.deleteExpense);
router.patch('/splits/:splitId/settle', expenseController.settleSplit);
router.get('/:tripId/settlements', expenseController.getSettlements);

export default router;
