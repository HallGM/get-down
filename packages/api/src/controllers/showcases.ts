import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as showcasesService from "../services/showcases.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/showcases",     handle(() => showcasesService.getShowcases()));
router.get("/showcases/:id", handle(req => showcasesService.getShowcaseById(+req.params.id)));
router.post("/showcases",    handle(req => showcasesService.createShowcase(req.body), 201));
router.put("/showcases/:id", handle(req => showcasesService.updateShowcase(+req.params.id, req.body)));
router.delete("/showcases/:id", handle(req => showcasesService.deleteShowcase(+req.params.id), 204));

export default router;
