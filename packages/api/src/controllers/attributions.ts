import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as attributionsService from "../services/attributions.js";
import * as attributionFeesService from "../services/attribution_fees.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/attributions",     handle(() => attributionsService.getAttributions()));
router.get("/attributions/:id", handle(req => attributionsService.getAttributionById(+req.params.id)));
router.post("/attributions",    handle(req => attributionsService.createAttribution(req.body), 201));
router.put("/attributions/:id", handle(req => attributionsService.updateAttribution(+req.params.id, req.body)));
router.delete("/attributions/:id", handle(req => attributionsService.deleteAttribution(+req.params.id), 204));

// Global attribution fees endpoint
router.get("/attribution-fees", handle(() => attributionFeesService.getAllAttributionFees()));

// ─── Attribution fee sub-resource ─────────────────────────────────────────────

router.get(
  "/attributions/:id/fees",
  handle(req => attributionFeesService.getFeesByAttribution(+req.params.id))
);
router.post(
  "/attributions/:id/fees",
  handle(req => attributionFeesService.createFee(+req.params.id, req.body), 201)
);
router.put(
  "/attributions/:id/fees/:feeId",
  handle(req => attributionFeesService.updateFee(+req.params.id, +req.params.feeId, req.body))
);
router.delete(
  "/attributions/:id/fees/:feeId",
  handle(req => attributionFeesService.deleteFee(+req.params.id, +req.params.feeId), 204)
);

// ─── Attribution fee expense links ────────────────────────────────────────────

router.post(
  "/attributions/:id/fees/:feeId/expenses",
  handle(req => attributionFeesService.linkExpenseToFee(+req.params.id, +req.params.feeId, req.body), 204)
);
router.delete(
  "/attributions/:id/fees/:feeId/expenses/:expenseId",
  handle(req => attributionFeesService.unlinkExpenseFromFee(+req.params.id, +req.params.feeId, +req.params.expenseId), 204)
);

export default router;
