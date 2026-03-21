import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as paymentsService from "../services/payments.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/payments",           handle(() => paymentsService.getAllPayments()));
router.get("/gigs/:id/payments", handle(req => paymentsService.getPaymentsByGig(+req.params.id)));
router.post("/payments",         handle(req => paymentsService.createPayment(req.body), 201));
router.put("/payments/:id",      handle(req => paymentsService.updatePayment(+req.params.id, req.body)));
router.delete("/payments/:id",   handle(req => paymentsService.deletePayment(+req.params.id), 204));

export default router;
