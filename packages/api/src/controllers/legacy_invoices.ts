import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as legacyInvoicesService from "../services/legacy_invoices.js";
import { upload } from "../utils/upload.js";
import { handle } from "../utils/handle.js";
import { BadRequestError } from "../errors.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get(
  "/gigs/:id/legacy-invoices",
  handle((req) => legacyInvoicesService.getLegacyInvoicesByGig(+req.params.id))
);

router.post(
  "/gigs/:id/legacy-invoices",
  upload.single("file"),
  handle(async (req) => {
    if (!req.file) throw new BadRequestError("No file provided");
    return legacyInvoicesService.createLegacyInvoice(
      +req.params.id,
      req.body.invoiceNumber,
      req.body.date,
      req.body.description,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );
  }, 201)
);

router.put(
  "/legacy-invoices/:id",
  handle((req) =>
    legacyInvoicesService.updateLegacyInvoice(
      +req.params.id,
      req.body.invoiceNumber,
      req.body.date,
      req.body.description
    )
  )
);

router.post(
  "/legacy-invoices/:id/document",
  upload.single("file"),
  handle(async (req) => {
    if (!req.file) throw new BadRequestError("No file provided");
    await legacyInvoicesService.replaceLegacyInvoiceDocument(
      +req.params.id,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );
  }, 204)
);

router.delete(
  "/legacy-invoices/:id",
  handle((req) => legacyInvoicesService.deleteLegacyInvoice(+req.params.id), 204)
);

export default router;
