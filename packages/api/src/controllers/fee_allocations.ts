import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as feeAllocationsService from "../services/fee_allocations.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/fee-allocations/:id",    handle(req => feeAllocationsService.getFeeAllocationById(+req.params.id)));
router.post("/fee-allocations",       handle(req => feeAllocationsService.createFeeAllocation(req.body), 201));
router.put("/fee-allocations/:id",    handle(req => feeAllocationsService.updateFeeAllocation(+req.params.id, req.body)));
router.delete("/fee-allocations/:id", handle(req => feeAllocationsService.deleteFeeAllocation(+req.params.id), 204));
router.post("/fee-allocations/:id/line-items",               handle(req => feeAllocationsService.addLineItem(+req.params.id, req.body), 201));
router.delete("/fee-allocations/:id/line-items/:lineItemId", handle(req => feeAllocationsService.removeLineItem(+req.params.id, +req.params.lineItemId), 204));

export default router;
