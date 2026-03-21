import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { migrate } from "./scripts/migrate.js";
import enquiries from "./controllers/enquiries.js";
import auth from "./controllers/login.js";
import people from "./controllers/people.js";
import services from "./controllers/services.js";
import attributions from "./controllers/attributions.js";
import gigs from "./controllers/gigs.js";
import showcases from "./controllers/showcases.js";
import feeAllocations from "./controllers/fee_allocations.js";
import assignedRoles from "./controllers/assigned_roles.js";
import expenses from "./controllers/expenses.js";
import payments from "./controllers/payments.js";
import invoices from "./controllers/invoices.js";
import songs from "./controllers/songs.js";
import rehearsals from "./controllers/rehearsals.js";
import { AppError } from "./errors.js";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use("/auth", auth);
app.use("/", services);
app.use("/", people);
app.use("/", attributions);
app.use("/", gigs);
app.use("/", showcases);
app.use("/", feeAllocations);
app.use("/", assignedRoles);
app.use("/", expenses);
app.use("/", payments);
app.use("/", invoices);
app.use("/", songs);
app.use("/", rehearsals);
app.use("/", enquiries);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Global error handler — maps AppError subclasses to HTTP responses
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }
  if (err instanceof Error && "statusCode" in err && typeof (err as Record<string,unknown>)["statusCode"] === "number") {
    res.status((err as Record<string,unknown>)["statusCode"] as number).json({ message: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
});

async function start(): Promise<void> {
  if (process.env.SKIP_MIGRATION !== "true") {
    await migrate();
  }
  app.listen(port, () => {
    console.log(`listening on http://localhost:${port}`);
  });

  const keepAliveUrls = [process.env.API_URL, process.env.INVOICE_URL]
    .filter(Boolean)
    .map((url) => `${url}/health`);

  if (keepAliveUrls.length > 0) {
    const timer = setInterval(() => {
      keepAliveUrls.forEach((url) => fetch(url).catch(() => {}));
    }, 14 * 60 * 1000);
    timer.unref();
  }
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
