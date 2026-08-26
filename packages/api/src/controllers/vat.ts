import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as vatService from "../services/vat.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);
router.get("/vat/report", handle((req) => vatService.getReport({ mode: String(req.query.mode), date: String(req.query.date) })));
export default router;
