import express, { type Response, type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as invoicesService from "../services/invoices.js";
import { handle } from "../utils/handle.js";
import { proxyToFlask, handleFlask } from "../utils/proxyToFlask.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/invoices",           handle(() => invoicesService.getAllInvoices()));
router.get("/gigs/:id/invoices",  handle(req => invoicesService.getInvoicesByGig(+req.params.id)));
router.get("/invoices/:id",       handle(req => invoicesService.getInvoiceById(+req.params.id)));
router.post("/invoices",          handle(req => invoicesService.createInvoice(req.body), 201));
router.put("/invoices/:id",       handle(req => invoicesService.updateInvoice(+req.params.id, req.body)));
router.delete("/invoices/:id",    handle(req => invoicesService.deleteInvoice(+req.params.id), 204));

router.post("/invoices/:id/line-items",                  handle(req => invoicesService.addLineItem(+req.params.id, req.body), 201));
router.put("/invoices/:id/line-items/:itemId",           handle(req => invoicesService.updateLineItem(+req.params.id, +req.params.itemId, req.body)));
router.delete("/invoices/:id/line-items/:itemId",        handle(req => invoicesService.removeLineItem(+req.params.id, +req.params.itemId), 204));

router.post("/invoices/:id/additional-charges",             handle(req => invoicesService.addAdditionalCharge(+req.params.id, req.body), 201));
router.put("/invoices/:id/additional-charges/:chargeId",    handle(req => invoicesService.updateAdditionalCharge(+req.params.id, +req.params.chargeId, req.body)));
router.delete("/invoices/:id/additional-charges/:chargeId", handle(req => invoicesService.removeAdditionalCharge(+req.params.id, +req.params.chargeId), 204));

router.post("/invoices/:id/payments-made",                  handle(req => invoicesService.addPaymentMade(+req.params.id, req.body), 201));
router.put("/invoices/:id/payments-made/:paymentMadeId",    handle(req => invoicesService.updatePaymentMade(+req.params.id, +req.params.paymentMadeId, req.body)));
router.delete("/invoices/:id/payments-made/:paymentMadeId", handle(req => invoicesService.removePaymentMade(+req.params.id, +req.params.paymentMadeId), 204));

// Link / unlink a gig payment to this invoice
router.post("/invoices/:id/link-payment",
  handle(req => invoicesService.linkPayment(+req.params.id, +req.body.paymentId), 204));
router.delete("/invoices/:id/link-payment/:paymentId",
  handle(req => invoicesService.unlinkPayment(+req.params.id, +req.params.paymentId), 204));

// These routes cannot use handle() because they stream a PDF response
// via proxyToFlask rather than returning a JSON-serialisable value.
router.get("/gigs/:id/invoice-preview", handleFlask(async (req, res) => {
  const invoiceType = req.query.invoiceType === 'deposit' ? 'deposit' : 'balance';
  const payload = await invoicesService.buildPreviewPayloadForGig(+req.params.id, invoiceType);
  await proxyToFlask(payload, "/generate", "inline", res);
}));

router.post("/invoices/:id/generate-pdf", handleFlask(async (req, res) => {
  const payload = await invoicesService.buildInvoicePayload(Number(req.params.id));
  await proxyToFlask(payload, "/generate", "attachment", res);
}));

router.post("/invoices/:id/generate-receipt", handleFlask(async (req, res) => {
  const invoiceId = Number(req.params.id);
  const payload = await invoicesService.buildReceiptPayload(invoiceId);
  // Use invoice number from payload for a descriptive filename
  const invoiceNumber = String(payload["invoice_number"] ?? invoiceId);
  await proxyToFlask(payload, "/generate-receipt", "attachment", res, `receipt-${invoiceNumber}.pdf`);
}));

export default router;

