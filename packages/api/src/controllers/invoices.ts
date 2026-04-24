import express, { type Request, type Response, type NextFunction, type Router } from "express";
import https from "https";
import http from "http";
import { authenticateToken } from "../middleware/auth.js";
import * as invoicesService from "../services/invoices.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/gigs/:id/invoices",  handle(req => invoicesService.getInvoicesByGig(+req.params.id)));
router.get("/invoices/:id",       handle(req => invoicesService.getInvoiceById(+req.params.id)));
router.post("/invoices",          handle(req => invoicesService.createInvoice(req.body), 201));
router.put("/invoices/:id",       handle(req => invoicesService.updateInvoice(+req.params.id, req.body)));
router.delete("/invoices/:id",    handle(req => invoicesService.deleteInvoice(+req.params.id), 204));

router.post("/invoices/:id/line-items",                  handle(req => invoicesService.addLineItem(+req.params.id, req.body), 201));
router.delete("/invoices/:id/line-items/:itemId",        handle(req => invoicesService.removeLineItem(+req.params.id, +req.params.itemId), 204));

router.post("/invoices/:id/additional-charges",             handle(req => invoicesService.addAdditionalCharge(+req.params.id, req.body), 201));
router.delete("/invoices/:id/additional-charges/:chargeId", handle(req => invoicesService.removeAdditionalCharge(+req.params.id, +req.params.chargeId), 204));

router.post("/invoices/:id/payments-made",                  handle(req => invoicesService.addPaymentMade(+req.params.id, req.body), 201));
router.delete("/invoices/:id/payments-made/:paymentMadeId", handle(req => invoicesService.removePaymentMade(+req.params.id, +req.params.paymentMadeId), 204));

// Link / unlink a gig payment to this invoice
router.post("/invoices/:id/link-payment",
  handle(req => invoicesService.linkPayment(+req.params.id, +req.body.paymentId), 204));
router.delete("/invoices/:id/link-payment/:paymentId",
  handle(req => invoicesService.unlinkPayment(+req.params.id, +req.params.paymentId), 204));

// These routes cannot use handle() because they stream a PDF response
// via proxyToFlask rather than returning a JSON-serialisable value.
router.get("/gigs/:id/invoice-preview", async (req, res, next) => {
  try {
    const invoiceType = req.query.invoiceType === 'deposit' ? 'deposit' : 'balance';
    const payload = await invoicesService.buildPreviewPayloadForGig(+req.params.id, invoiceType);
    await proxyToFlask(payload, "/generate", "inline", res);
  } catch (err) {
    if (!res.headersSent) next(err);
  }
});

router.post("/invoices/:id/generate-pdf", async (req, res, next) => {
  try {
    const payload = await invoicesService.buildInvoicePayload(Number(req.params.id));
    await proxyToFlask(payload, "/generate", "attachment", res);
  } catch (err) {
    if (!res.headersSent) next(err);
  }
});

router.post("/invoices/:id/generate-receipt", async (req, res, next) => {
  try {
    const invoiceId = Number(req.params.id);
    const payload = await invoicesService.buildReceiptPayload(invoiceId);
    // Use invoice number from payload for a descriptive filename
    const invoiceNumber = String(payload["invoice_number"] ?? invoiceId);
    await proxyToFlask(payload, "/generate-receipt", "attachment", res, `receipt-${invoiceNumber}.pdf`);
  } catch (err) {
    if (!res.headersSent) next(err);
  }
});

export default router;

async function proxyToFlask(
  payload: Record<string, unknown>,
  path: string,
  disposition: "inline" | "attachment",
  res: Response,
  filename = "invoice.pdf"
): Promise<void> {
  await warmUpFlask();
  return makeRequest(payload, path, disposition, res, filename, 0);
}

async function warmUpFlask(): Promise<void> {
  const invoiceServiceUrl = process.env.INVOICE_SERVICE_URL || "http://localhost:5000";
  const healthUrl = `${invoiceServiceUrl}/health`;
  const transport = healthUrl.startsWith("https") ? https : http;
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const ok = await new Promise<boolean>((resolve) => {
      const req = transport.get(healthUrl, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(5000, () => { req.destroy(); resolve(false); });
    });
    if (ok) return;
    await new Promise(r => setTimeout(r, 2000));
  }
}

function makeRequest(
  payload: Record<string, unknown>,
  path: string,
  disposition: "inline" | "attachment",
  res: Response,
  filename: string,
  attempt: number
): Promise<void> {
  const invoiceServiceUrl = process.env.INVOICE_SERVICE_URL || "http://localhost:5000";
  const url = new URL(path, invoiceServiceUrl);
  const transport = url.protocol === "https:" ? https : http;
  const body = JSON.stringify(payload);

  return new Promise<void>((resolve, reject) => {
    const proxyReq = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (proxyRes) => {
        if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
          let errBody = "";
          proxyRes.on("data", (chunk: Buffer) => { errBody += chunk.toString(); });
          proxyRes.on("end", async () => {
            const isRetryable = proxyRes.statusCode === 502 || proxyRes.statusCode === 503 || proxyRes.statusCode === 429;
            if (isRetryable && attempt < 3) {
              const baseDelayMs = proxyRes.statusCode === 429 ? 10000 : 1000;
              const delayMs = baseDelayMs * Math.pow(2, attempt);
              await new Promise(r => setTimeout(r, delayMs));
              return makeRequest(payload, path, disposition, res, filename, attempt + 1)
                .then(resolve)
                .catch(reject);
            }

            let message = "Invoice service error";
            try {
              const parsed = JSON.parse(errBody) as Record<string, unknown>;
              if (typeof parsed["error"] === "string") message = parsed["error"];
              else if (typeof parsed["message"] === "string") message = parsed["message"];
            } catch {
              if (errBody.trim()) message = errBody.trim();
            }
            const status = proxyRes.statusCode === 400 ? 400 : 502;
            res.status(status).json({ message });
            resolve();
          });
          return;
        }
        res.setHeader("Content-Type", proxyRes.headers["content-type"] ?? "application/pdf");
        res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
        proxyRes.pipe(res);
        proxyRes.on("end", resolve);
      }
    );
    proxyReq.on("error", async (err: NodeJS.ErrnoException) => {
      if (attempt < 3) {
        const delayMs = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delayMs));
        return makeRequest(payload, path, disposition, res, filename, attempt + 1)
          .then(resolve)
          .catch(reject);
      }
      const message = err.code === "ECONNREFUSED"
        ? "Invoice service is not running"
        : `Invoice service connection error: ${err.message}`;
      reject(Object.assign(new Error(message), { statusCode: 502 }));
    });
    proxyReq.write(body);
    proxyReq.end();
  });
}
