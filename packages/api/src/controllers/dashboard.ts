import express, { type Router } from "express";
import { authenticateToken, requirePartner } from "../middleware/auth.js";
import * as dashboardService from "../services/dashboard.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);
router.use(requirePartner);

router.get("/dashboard", handle(() => dashboardService.getDashboardAlerts()));

export default router;
