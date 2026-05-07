import express, { type Router } from "express";
import multer from "multer";
import { authenticateToken, requirePartner } from "../middleware/auth.js";
import * as expensesService from "../services/expenses.js";
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

export default router;
