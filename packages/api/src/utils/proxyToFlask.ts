import https from "https";
import http from "http";
import type { NextFunction, Request, Response } from "express";

export async function proxyToFlask(
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
        const safeFilename = filename.replace(/[\r\n"\\]/g, "");
        res.setHeader("Content-Disposition", `${disposition}; filename="${safeFilename}"`);
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

/**
 * Wraps a Flask-proxying route handler so errors are forwarded to Express error
 * middleware rather than being swallowed or crashing the process.
 */
export function handleFlask(
  fn: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (!res.headersSent) next(err);
    }
  };
}
