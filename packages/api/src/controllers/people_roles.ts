import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as service from "../services/people_roles.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);
router.get("/people/:id/roles", handle((req) => service.getPersonRoles(+req.params.id)));
router.post("/people/:id/roles", handle((req) => service.addRoleToPerson(+req.params.id, req.body), 204));
router.delete("/people/:id/roles/:roleId", handle((req) => service.removeRoleFromPerson(+req.params.id, +req.params.roleId), 204));
router.get("/roles/:id/people", handle((req) => service.getRolePeople(+req.params.id)));
router.post("/roles/:id/people/:personId", handle((req) => service.addRoleToPerson(+req.params.personId, { roleId: +req.params.id }), 204));
router.delete("/roles/:id/people/:personId", handle((req) => service.removeRoleFromPerson(+req.params.personId, +req.params.id), 204));
export default router;
