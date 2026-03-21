import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as servicesService from "../services/services.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();

router.get("/services",     handle(() => servicesService.getServices()));
router.get("/services/:id", handle(req => servicesService.getServiceById(+req.params.id)));
router.post("/services",    authenticateToken, handle(req => servicesService.createService(req.body), 201));
router.put("/services/:id", authenticateToken, handle(req => servicesService.updateService(+req.params.id, req.body)));
router.delete("/services/:id", authenticateToken, handle(req => servicesService.deleteService(+req.params.id), 204));

export default router;
