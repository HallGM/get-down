import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as rolesService from "../services/roles.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

// Global roles CRUD
router.get("/roles",        handle(() => rolesService.getAllRoles()));
router.post("/roles",       handle(req => rolesService.createRole(req.body), 201));
router.put("/roles/:id",    handle(req => rolesService.updateRole(+req.params.id, req.body)));
router.delete("/roles/:id", handle(req => rolesService.deleteRole(+req.params.id), 204));

// Roles on a service
router.get("/services/:id/roles",              handle(req => rolesService.getRolesByServiceId(+req.params.id)));
router.post("/services/:id/roles",             handle(req => rolesService.addRoleToService(+req.params.id, req.body.roleId), 204));
router.delete("/services/:id/roles/:roleId",   handle(req => rolesService.removeRoleFromService(+req.params.id, +req.params.roleId), 204));

export default router;
