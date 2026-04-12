import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as peopleService from "../services/people.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/people",     handle(() => peopleService.getPeople()));
router.get("/people/:id", handle(req => peopleService.getPersonById(+req.params.id)));
router.post("/people",    handle(req => peopleService.createPerson(req.body), 201));
router.put("/people/:id", handle(req => peopleService.updatePerson(+req.params.id, req.body)));
router.delete("/people/:id", handle(req => peopleService.deletePerson(+req.params.id), 204));
router.post("/people/:id/generate-token", handle(req => peopleService.generatePerformerToken(+req.params.id)));

export default router;
