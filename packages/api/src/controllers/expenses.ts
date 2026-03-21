import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as expensesService from "../services/expenses.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/expenses",     handle(() => expensesService.getAllExpenses()));
router.get("/expenses/:id", handle(req => expensesService.getExpenseById(+req.params.id)));
router.post("/expenses",    handle(req => expensesService.createExpense(req.body), 201));
router.put("/expenses/:id", handle(req => expensesService.updateExpense(+req.params.id, req.body)));
router.delete("/expenses/:id", handle(req => expensesService.deleteExpense(+req.params.id), 204));

export default router;
