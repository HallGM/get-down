import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as personInvoicesService from "../services/person_invoices.js";
import { handle } from "../utils/handle.js";
import { handleFlask, proxyToFlask } from "../utils/proxyToFlask.js";

const router: Router = express.Router();
router.use(authenticateToken);

// GET /people/:personId/invoices - list invoices for a person
router.get(
  "/people/:personId/invoices",
  handle((req) => personInvoicesService.getPersonInvoicesByPersonId(+req.params.personId))
);

// GET /person-invoices - list all person invoices
router.get(
  "/person-invoices",
  handle(() => personInvoicesService.getAllPersonInvoices())
);

// GET /person-invoices/:id - get a single person invoice
router.get(
  "/person-invoices/:id",
  handle((req) => personInvoicesService.getPersonInvoiceById(+req.params.id))
);

// POST /person-invoices - create a person invoice
router.post(
  "/person-invoices",
  handle((req) => personInvoicesService.createPersonInvoice(req.body), 201)
);

// PUT /person-invoices/:id - update a person invoice
router.put(
  "/person-invoices/:id",
  handle((req) => personInvoicesService.updatePersonInvoice(+req.params.id, req.body))
);

// DELETE /person-invoices/:id - delete a person invoice
router.delete(
  "/person-invoices/:id",
  handle((req) => personInvoicesService.deletePersonInvoice(+req.params.id), 204)
);

// POST /person-invoices/:id/generate-pdf - generate and download PDF
router.post(
  "/person-invoices/:id/generate-pdf",
  handleFlask(async (req, res) => {
    const id = +req.params.id;
    const payload = await personInvoicesService.buildFlaskPayloadForPersonInvoice(id);
    const filename = `person-invoice-${id}.pdf`;
    await proxyToFlask(payload, "/generate-generic", "attachment", res, filename);
  })
);

export default router;
