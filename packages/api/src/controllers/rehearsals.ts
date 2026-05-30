import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as rehearsalsService from "../services/rehearsals.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

// Standalone CRUD (existing)
router.get("/rehearsals",        handle(() => rehearsalsService.getRehearsals()));
router.get("/rehearsals/:id",    handle((req) => rehearsalsService.getRehearsalById(+req.params.id)));
router.post("/rehearsals",       handle((req) => rehearsalsService.createRehearsal(req.body), 201));
router.put("/rehearsals/:id",    handle((req) => rehearsalsService.updateRehearsal(+req.params.id, req.body)));
router.delete("/rehearsals/:id", handle((req) => rehearsalsService.deleteRehearsal(+req.params.id), 204));

// Expense link
router.put("/rehearsals/:id/expense",    handle((req) => rehearsalsService.setRehearsalExpense(+req.params.id, req.body.expenseId)));
router.delete("/rehearsals/:id/expense", handle((req) => rehearsalsService.setRehearsalExpense(+req.params.id, null), 204));

// Per-gig cost share
router.put("/rehearsals/:id/gigs/:gigId/cost-share", handle((req) =>
  rehearsalsService.updateCostShare(+req.params.id, +req.params.gigId, req.body.costShare)
));

// Gig-scoped rehearsal routes
router.get("/gigs/:gigId/rehearsals",                      handle((req) => rehearsalsService.getRehearsalsByGigId(+req.params.gigId)));
router.post("/gigs/:gigId/rehearsals",                     handle((req) => rehearsalsService.createRehearsalForGig(+req.params.gigId, req.body), 201));
router.post("/gigs/:gigId/rehearsals/:rehearsalId",        handle((req) => rehearsalsService.linkRehearsalToGig(+req.params.rehearsalId, +req.params.gigId)));
router.delete("/gigs/:gigId/rehearsals/:rehearsalId",      handle((req) => rehearsalsService.unlinkRehearsalFromGig(+req.params.rehearsalId, +req.params.gigId), 204));

export default router;
