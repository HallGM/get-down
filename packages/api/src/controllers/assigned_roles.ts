import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as assignedRolesService from "../services/assigned_roles.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/gigs/:id/roles",        handle(req => assignedRolesService.getAssignedRolesByGig(+req.params.id)));
router.get("/showcases/:id/roles",   handle(req => assignedRolesService.getAssignedRolesByShowcase(+req.params.id)));
router.post("/gigs/:id/roles/import", handle(req => assignedRolesService.importRolesFromServices(+req.params.id), 201));
router.post("/assigned-roles",       handle(req => assignedRolesService.createAssignedRole(req.body), 201));
router.put("/assigned-roles/:id",    handle(req => assignedRolesService.updateAssignedRole(+req.params.id, req.body)));
router.delete("/assigned-roles/:id", handle(req => assignedRolesService.deleteAssignedRole(+req.params.id), 204));

export default router;
