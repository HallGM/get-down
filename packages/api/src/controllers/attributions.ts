import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as attributionsService from "../services/attributions.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/attributions",     handle(() => attributionsService.getAttributions()));
router.get("/attributions/:id", handle(req => attributionsService.getAttributionById(+req.params.id)));
router.post("/attributions",    handle(req => attributionsService.createAttribution(req.body), 201));
router.put("/attributions/:id", handle(req => attributionsService.updateAttribution(+req.params.id, req.body)));
router.delete("/attributions/:id", handle(req => attributionsService.deleteAttribution(+req.params.id), 204));

export default router;
