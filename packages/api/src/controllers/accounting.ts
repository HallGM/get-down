import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as accountingService from "../services/accounting.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get(
  "/accounting/summary",
  handle((req) => {
    const start = req.query.start ? String(req.query.start) : undefined;
    const end = req.query.end ? String(req.query.end) : undefined;
    return accountingService.getSummary({ start, end });
  })
);

export default router;
