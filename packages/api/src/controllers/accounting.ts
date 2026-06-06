import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as accountingService from "../services/accounting.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get(
  "/accounting/summary",
  handle((req) => {
    const year         = req.query.year         ? +req.query.year         : undefined;
    const taxYearStart = req.query.taxYearStart ? +req.query.taxYearStart : undefined;
    return accountingService.getSummary({ year, taxYearStart });
  })
);

export default router;
