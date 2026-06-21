import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import type { Account, Expense } from "@get-down/shared";

dotenv.config();

const API_BASE = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const CSV_PATH = path.resolve(process.cwd(), "../../expenses_to_add.csv");

let jwtToken = "";

interface CsvExpenseRow {
  name: string;
  amount: string;
  date: string;
  note: string;
}

async function main(): Promise<void> {
  await login();
  const scottAccountId = await getScottAccountId();
  const rows = await readCsvRows();

  console.log(`Importing ${rows.length} expenses from ${CSV_PATH}`);
  console.log(`Using Scott account ID ${scottAccountId} for all payments\n`);

  let created = 0;

  for (const [index, row] of rows.entries()) {
    const expense = buildExpensePayload(row, scottAccountId, index + 2);
    const createdExpense = await callApi<Expense>("POST", "/expenses", expense);
    created++;
    console.log(`Created expense #${createdExpense.id}: ${createdExpense.description} (${formatPounds(createdExpense.amount)})`);
  }

  console.log(`\nImported ${created} expenses.`);
}

async function login(): Promise<void> {
  const email = process.env.MIGRATION_EMAIL;
  const password = process.env.MIGRATION_PASSWORD;
  if (!email || !password) {
    throw new Error("MIGRATION_EMAIL and MIGRATION_PASSWORD env vars must be set");
  }

  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) throw new Error(`Login failed: HTTP ${resp.status} ${await resp.text()}`);
  const body = await resp.json() as { token: string };
  jwtToken = body.token;
}

async function getScottAccountId(): Promise<number> {
  const accounts = await callApi<Account[]>("GET", "/accounts");
  const scottAccount = accounts.find((account) => {
    if (account.isBusiness || !account.isPartner) return false;
    return account.personName.trim().toLowerCase().startsWith("scott");
  });

  if (!scottAccount) {
    throw new Error("Could not find Scott's partner account via /accounts");
  }

  return scottAccount.id;
}

async function readCsvRows(): Promise<CsvExpenseRow[]> {
  const text = await fs.readFile(CSV_PATH, "utf8");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  return lines.slice(1).map(parseCsvLine);
}

function parseCsvLine(line: string): CsvExpenseRow {
  const cols = splitCsvLine(line).map((value) => value.trim());
  return {
    name: cols[0] ?? "",
    amount: cols[1] ?? "",
    date: cols[2] ?? "",
    note: cols[4] ?? "",
  };
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

function buildExpensePayload(row: CsvExpenseRow, scottAccountId: number, csvLineNumber: number) {
  const recipientName = row.name.trim();
  const description = buildDescription(row);
  const amount = parsePoundsToPennies(row.amount, csvLineNumber);
  const date = parseDate(row.date, csvLineNumber);

  if (!recipientName) {
    throw new Error(`CSV line ${csvLineNumber}: NAME is required`);
  }

  return {
    recipientName,
    description,
    amount,
    date,
    payment: {
      accountId: scottAccountId,
      amount,
      date,
      description: `Imported payment for ${description}`,
    },
  };
}

function buildDescription(row: CsvExpenseRow): string {
  const note = row.note.trim();
  if (note && note.toLowerCase() !== "ea") return note;

  const name = row.name.trim();
  if (!name) throw new Error("Description fallback failed because NAME is blank");
  return name;
}

function parsePoundsToPennies(value: string, csvLineNumber: number): number {
  const normalized = value.trim();
  if (!normalized) throw new Error(`CSV line ${csvLineNumber}: AMOUNT is required`);

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    throw new Error(`CSV line ${csvLineNumber}: invalid AMOUNT \"${value}\"`);
  }

  return Math.round(amount * 100);
}

function parseDate(value: string, csvLineNumber: number): string {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) throw new Error(`CSV line ${csvLineNumber}: invalid DATE \"${value}\"`);

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    throw new Error(`CSV line ${csvLineNumber}: invalid DATE \"${value}\"`);
  }

  return `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatPounds(pennies: number): string {
  return `£${(pennies / 100).toFixed(2)}`;
}

async function callApi<T = unknown>(method: string, pathName: string, body?: unknown): Promise<T> {
  const resp = await fetch(`${API_BASE}${pathName}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) throw new Error(`API ${method} ${pathName} failed: HTTP ${resp.status} ${await resp.text()}`);
  if (resp.status === 204 || resp.headers.get("content-length") === "0") return undefined as T;

  const text = await resp.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
