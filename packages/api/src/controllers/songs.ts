import express, { type Router } from "express";
import https from "https";
import http from "http";
import { authenticateToken } from "../middleware/auth.js";
import * as songsService from "../services/songs.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/songs",     handle(() => songsService.getSongs()));
router.get("/songs/:id", handle(req => songsService.getSongById(+req.params.id)));
router.post("/songs",    handle(req => songsService.createSong(req.body), 201));
router.put("/songs/:id", handle(req => songsService.updateSong(+req.params.id, req.body)));
router.delete("/songs/:id", handle(req => songsService.deleteSong(+req.params.id), 204));

router.get("/gigs/:id/set-list",            handle(req => songsService.getSetList(+req.params.id)));
router.post("/gigs/:id/set-list",            handle(req => songsService.addSetListItem(+req.params.id, req.body), 201));
router.post("/gigs/:id/set-list/section",    handle(req => songsService.addSetListItem(+req.params.id, req.body), 201));
router.delete("/gigs/:id/set-list",          handle(req => songsService.clearSetList(+req.params.id), 204));
router.delete("/gigs/:id/set-list/bulk",     handle(req => songsService.bulkDeleteSetListItems(+req.params.id, req.body), 204));
router.patch("/gigs/:id/set-list/:itemId",   handle(req => songsService.updateSetListItem(+req.params.id, +req.params.itemId, req.body)));
router.delete("/gigs/:id/set-list/:itemId",  handle(req => songsService.removeSetListItem(+req.params.id, +req.params.itemId), 204));
router.put("/gigs/:id/set-list/reorder",    handle(req => songsService.reorderSetList(+req.params.id, req.body), 204));
router.post("/gigs/:id/set-list/import",    handle(req => songsService.bulkImportFromPreferences(+req.params.id)));
router.post("/gigs/:id/set-list/auto-order", handle(req => songsService.autoOrderSetList(+req.params.id)));

router.get("/gigs/:id/set-list/pdf", async (req, res, next) => {
  try {
    const payload = await songsService.buildSetListPdfPayload(+req.params.id);
    await proxySetListToFlask(payload, res);
  } catch (err) {
    if (!res.headersSent) next(err);
  }
});

export default router;

async function proxySetListToFlask(
  payload: Record<string, unknown>,
  res: import("express").Response
): Promise<void> {
  const invoiceServiceUrl = process.env.INVOICE_SERVICE_URL || "http://localhost:5000";
  const url = new URL("/set-list", invoiceServiceUrl);
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
          proxyRes.on("end", () => {
            let message = "Set list PDF service error";
            try {
              const parsed = JSON.parse(errBody) as Record<string, unknown>;
              if (typeof parsed["error"] === "string") message = parsed["error"];
            } catch { /* ignore */ }
            res.status(502).json({ message });
            resolve();
          });
          return;
        }
        const clientName = (payload["client_name"] as string ?? "set-list").replace(/\s+/g, "-").toLowerCase();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="set-list-${clientName}.pdf"`);
        proxyRes.pipe(res);
        proxyRes.on("end", resolve);
      }
    );
    proxyReq.on("error", (err: NodeJS.ErrnoException) => {
      const message = err.code === "ECONNREFUSED"
        ? "Invoice service is not running"
        : `Invoice service connection error: ${err.message}`;
      reject(Object.assign(new Error(message), { statusCode: 502 }));
    });
    proxyReq.write(body);
    proxyReq.end();
  });
}
