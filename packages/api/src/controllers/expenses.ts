import express, { type Router } from "express";
import multer from "multer";
import { authenticateToken, requirePartner } from "../middleware/auth.js";
import * as expensesService from "../services/expenses.js";
import * as feeAllocationsService from "../services/fee_allocations.js";
import * as attributionFeesService from "../services/attribution_fees.js";
import { handle } from "../utils/handle.js";
import { BadRequestError } from "../errors.js";

const router: Router = express.Router();
router.use(authenticateToken);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.get("/expenses",     handle(() => expensesService.getAllExpenses()));
router.get("/expenses/:id", handle(req => expensesService.getExpenseById(+req.params.id)));
router.post("/expenses",    handle(req => expensesService.createExpense(req.body), 201));
router.put("/expenses/:id", handle(req => expensesService.updateExpense(+req.params.id, req.body)));
router.delete("/expenses/:id", handle(req => expensesService.deleteExpense(+req.params.id), 204));

router.post(
  "/expenses/:id/document",
  requirePartner,
  upload.single("file"),
  handle(async (req) => {
    if (!req.file) throw new BadRequestError("No file provided");
    await expensesService.uploadExpenseDocument(
      +req.params.id,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );
  }, 204)
);

router.delete(
  "/expenses/:id/document",
  requirePartner,
  handle(req => expensesService.removeExpenseDocument(+req.params.id), 204)
);

// Fee allocation links
router.get("/expenses/:id/fee-allocations",                        handle(req => feeAllocationsService.getAllocationsByExpense(+req.params.id)));
router.post("/expenses/:id/fee-allocations",                       handle(req => expensesService.linkAllocationToExpense(+req.params.id, req.body), 204));
router.delete("/expenses/:id/fee-allocations/:allocationId",       handle(req => expensesService.unlinkAllocationFromExpense(+req.params.id, +req.params.allocationId), 204));

// Attribution fee links
router.get("/expenses/:id/attribution-fees",                       handle(req => attributionFeesService.getFeesByExpense(+req.params.id)));
router.post("/expenses/:id/attribution-fees",                      handle(req => expensesService.linkAttributionFeeToExpense(+req.params.id, req.body), 204));
router.delete("/expenses/:id/attribution-fees/:feeId",             handle(req => expensesService.unlinkAttributionFeeFromExpense(+req.params.id, +req.params.feeId), 204));

export default router;
