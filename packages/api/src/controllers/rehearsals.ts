import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as rehearsalsService from "../services/rehearsals.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/rehearsals",     handle(() => rehearsalsService.getRehearsals()));
router.get("/rehearsals/:id", handle(req => rehearsalsService.getRehearsalById(+req.params.id)));
router.post("/rehearsals",    handle(req => rehearsalsService.createRehearsal(req.body), 201));
router.put("/rehearsals/:id", handle(req => rehearsalsService.updateRehearsal(+req.params.id, req.body)));
router.delete("/rehearsals/:id", handle(req => rehearsalsService.deleteRehearsal(+req.params.id), 204));

export default router;
