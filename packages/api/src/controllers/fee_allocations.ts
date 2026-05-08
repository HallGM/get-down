import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as feeAllocationsService from "../services/fee_allocations.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/fee-allocations",        handle(() => feeAllocationsService.getAllFeeAllocations()));
router.get("/fee-allocations/:id",    handle(req => feeAllocationsService.getFeeAllocationById(+req.params.id)));
router.post("/fee-allocations",       handle(req => feeAllocationsService.createFeeAllocation(req.body), 201));
router.put("/fee-allocations/:id",    handle(req => feeAllocationsService.updateFeeAllocation(+req.params.id, req.body)));
router.delete("/fee-allocations/:id", handle(req => feeAllocationsService.deleteFeeAllocation(+req.params.id), 204));
router.post("/fee-allocations/:id/line-items",               handle(req => feeAllocationsService.addLineItem(+req.params.id, req.body), 201));
router.put("/fee-allocations/:id/line-items/:lineItemId",    handle(req => feeAllocationsService.updateLineItem(+req.params.id, +req.params.lineItemId, req.body)));
router.delete("/fee-allocations/:id/line-items/:lineItemId", handle(req => feeAllocationsService.removeLineItem(+req.params.id, +req.params.lineItemId), 204));

// Expense links — "generate" must come before "/:expenseId" to avoid mis-routing
router.post("/fee-allocations/:id/expenses/generate", handle(req => feeAllocationsService.generateExpenseForAllocation(+req.params.id), 201));
router.post("/fee-allocations/:id/expenses",          handle(req => feeAllocationsService.linkExpenseToAllocation(+req.params.id, req.body), 204));
router.delete("/fee-allocations/:id/expenses/:expenseId", handle(req => feeAllocationsService.unlinkExpenseFromAllocation(+req.params.id, +req.params.expenseId), 204));

// Transaction links
router.post("/fee-allocations/:id/transactions",                    handle(req => feeAllocationsService.linkTransactionToAllocation(+req.params.id, req.body), 204));
router.delete("/fee-allocations/:id/transactions/:transactionId",   handle(req => feeAllocationsService.unlinkTransactionFromAllocation(+req.params.id, +req.params.transactionId), 204));

// Gig-scoped fee allocation routes
router.get("/gigs/:id/fee-allocations",          handle(req => feeAllocationsService.getFeeAllocationsByGig(+req.params.id)));
router.post("/gigs/:id/fee-allocations/generate", handle(req => feeAllocationsService.generateFeeAllocationsForGig(+req.params.id, !!req.body.force)));
router.post("/fee-allocations/:id/reset",        handle(req => feeAllocationsService.resetFeeAllocation(+req.params.id)));

export default router;
