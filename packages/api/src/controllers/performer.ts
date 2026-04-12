import express, { type Router } from "express";
import * as performerService from "../services/performer.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
// No authenticateToken — this is a public endpoint secured only by the UUID token

router.get("/performer/:token", handle((req) => performerService.getPerformerByToken(req.params.token)));
router.get("/performer/:token/gigs/:gigId", handle((req) => performerService.getPerformerGigDetail(req.params.token, +req.params.gigId)));

export default router;
