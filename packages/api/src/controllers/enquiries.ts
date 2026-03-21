import express, { type Router } from "express";
import * as svcEnquiries from "../services/enquiries.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();

router.post("/enquiry",         handle(req => svcEnquiries.createEnquiry(req.body), 201));
router.post("/enquiry/message", handle(req => svcEnquiries.getEnquiryMessage(req.body)));
router.get("/enquiries",        handle(() => svcEnquiries.getEnquiries()));
router.delete("/enquiry/:id",   handle(req => svcEnquiries.deleteEnquiry(req.params.id), 204));

export default router;
