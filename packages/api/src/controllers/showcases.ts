import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as showcasesService from "../services/showcases.js";
import * as feeAllocationsService from "../services/fee_allocations.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/showcases",     handle(() => showcasesService.getShowcases()));
router.get("/showcases/:id", handle(req => showcasesService.getShowcaseById(+req.params.id)));
router.post("/showcases",    handle(req => showcasesService.createShowcase(req.body), 201));
router.put("/showcases/:id", handle(req => showcasesService.updateShowcase(+req.params.id, req.body)));
router.delete("/showcases/:id", handle(req => showcasesService.deleteShowcase(+req.params.id), 204));

router.get("/showcases/:id/gigs",            handle(req => showcasesService.getGigsByShowcase(+req.params.id)));

router.get("/showcases/:id/fee-allocations",          handle(req => feeAllocationsService.getFeeAllocationsByShowcase(+req.params.id)));
router.post("/showcases/:id/fee-allocations/generate", handle(req => feeAllocationsService.generateFeeAllocationsForShowcase(+req.params.id, req.body)));

// Expense links
router.post("/showcases/:id/expenses",              handle(req => showcasesService.linkExpenseToShowcase(+req.params.id, req.body), 204));
router.patch("/showcases/:id/expenses/:expenseId",  handle(req => showcasesService.updateExpenseLink(+req.params.id, +req.params.expenseId, req.body), 204));
router.delete("/showcases/:id/expenses/:expenseId", handle(req => showcasesService.unlinkExpenseFromShowcase(+req.params.id, +req.params.expenseId), 204));

export default router;
