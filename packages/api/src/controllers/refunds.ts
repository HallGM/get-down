import express, { type Router } from "express";
import { authenticateToken, requirePartner } from "../middleware/auth.js";
import * as refundsService from "../services/refunds.js";
import * as gigsRepo from "../repository/gigs.js";
import { handle } from "../utils/handle.js";
import { proxyToFlask, handleFlask } from "../utils/proxyToFlask.js";
import { NotFoundError } from "../errors.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/gigs/:id/refunds",  handle(req => refundsService.getRefundsByGig(+req.params.id)));
router.post("/refunds",          requirePartner, handle(req => refundsService.createRefund(req.body), 201));
router.put("/refunds/:id",       requirePartner, handle(req => refundsService.updateRefund(+req.params.id, req.body)));
router.delete("/refunds/:id",    requirePartner, handle(req => refundsService.deleteRefund(+req.params.id), 204));

// Generate a credit note PDF for a refund
router.post("/refunds/:id/credit-note", requirePartner, handleFlask(async (req, res) => {
  const refund = await refundsService.getRefundById(+req.params.id);
  const gig = await gigsRepo.readGigById(refund.gigId);
  if (!gig) throw new NotFoundError("Gig not found");

  const payload: Record<string, unknown> = {
    customer_name: `${gig.first_name} ${gig.last_name}`,
    date: refund.date ?? new Date().toISOString().slice(0, 10),
    amount: refund.amount / 100,
    description: refund.description ?? "Refund",
    reference: `REF-${refund.id}`,
    event_date: gig.date ?? "",
    venue: gig.venue_name ?? "",
  };

  await proxyToFlask(payload, "/generate-credit-note", "attachment", res, `credit-note-REF-${refund.id}.pdf`);
}));

export default router;
