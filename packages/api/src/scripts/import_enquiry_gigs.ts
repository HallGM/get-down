import fs from "node:fs";
import path from "node:path";
import csv from "csv-parser";
import dotenv from "dotenv";
import { withTransaction } from "../db/init.js";
import * as gigs from "../repository/gigs.js";
import * as enquiryServices from "../repository/enquiry_services.js";

dotenv.config();
const DEFAULT_CSV_PATH = path.resolve(process.cwd(), "../../Every Angle Enquiry Form (Responses) - Form responses 1.csv");
interface CsvRow { Timestamp: string; "First Name": string; "Last Name": string; Email: string; Phone: string; "Event Date (optional)": string; "Venue Location (optional)": string; "Which services are you interested in?": string; "Message (optional)": string; "Partner's Name (Full name)": string; }

export function parseDate(value: string): string | undefined {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!match) return undefined;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}
export function parseServices(value: string): string[] { return value.split(",").map((s) => s.trim()).filter(Boolean); }

export function resolveCsvPath(): string {
  const requestedPath = process.argv[2] ?? process.env.ENQUIRY_CSV_PATH ?? DEFAULT_CSV_PATH;
  return path.resolve(process.cwd(), requestedPath);
}

async function readRows(csvPath: string): Promise<CsvRow[]> {
  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `CSV file not found: ${csvPath}\n` +
      "Pass the downloaded CSV path as an argument, for example: pnpm import:enquiry-gigs /path/to/responses.csv",
    );
  }

  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    const stream = fs.createReadStream(csvPath);
    stream.on("error", reject);
    stream.pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function main(): Promise<void> {
  const csvPath = resolveCsvPath();
  const rows = await readRows(csvPath); const options = await enquiryServices.readAll(); const byName = new Map(options.map((o) => [o.name, o.id]));
  await withTransaction(async () => {
    for (const [index, row] of rows.entries()) {
      const ids = parseServices(row["Which services are you interested in?"]).map((name) => {
        const id = byName.get(name);
        if (!id) throw new Error(`CSV row ${index + 2}: unexpected service label: ${name}`);
        return id;
      });
      const gig = await gigs.createGig({
        status: "enquiry",
        firstName: row["First Name"].trim(),
        lastName: row["Last Name"].trim(),
        partnerName: row["Partner's Name (Full name)"].trim() || undefined,
        email: row.Email.trim() || undefined,
        phone: row.Phone.trim() || undefined,
        date: parseDate(row["Event Date (optional)"]),
        location: row["Venue Location (optional)"].trim() || undefined,
        enquiryNotes: row["Message (optional)"].trim() || undefined,
        travelCost: 0,
        discountPercent: 0,
      });
      await enquiryServices.replaceGigSelections(gig.id, ids);
    }
  });
  console.log(`Imported ${rows.length} enquiry gigs from ${csvPath} in one transaction. The importer is intentionally not idempotent.`);
}
main().catch((error) => { console.error("Import failed:", error); process.exitCode = 1; });
