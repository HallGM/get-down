import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as gigsService from "../services/gigs.js";
import * as invoicesService from "../services/invoices.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/gigs",     handle(() => gigsService.getGigs()));
router.get("/gigs/:id", handle(req => gigsService.getGigById(+req.params.id)));
router.post("/gigs",    handle(req => gigsService.createGig(req.body), 201));
router.put("/gigs/:id", handle(req => gigsService.updateGig(+req.params.id, req.body)));
router.delete("/gigs/:id", handle(req => gigsService.deleteGig(+req.params.id), 204));
router.get("/gigs/:id/additional-charges", handle(req => invoicesService.getAdditionalChargesByGig(+req.params.id)));
router.put("/gigs/:id/services",                       handle(req => gigsService.setGigServices(+req.params.id, req.body.serviceIds ?? []), 204));
router.post("/gigs/:id/generate-line-items",           handle(req => gigsService.generateLineItemsFromServices(+req.params.id), 201));
router.post("/gigs/:id/line-items",                    handle(req => gigsService.addGigLineItem(+req.params.id, req.body), 201));
router.put("/gigs/:id/line-items/:itemId",             handle(req => gigsService.updateGigLineItem(+req.params.id, +req.params.itemId, req.body)));
router.delete("/gigs/:id/line-items/:itemId",          handle(req => gigsService.removeGigLineItem(+req.params.id, +req.params.itemId), 204));
router.post("/enquiries/:id/convert-to-gig", handle(req => gigsService.convertEnquiryToGig(+req.params.id), 201));

export default router;
