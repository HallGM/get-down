import { getFromCSV, saveToCsv } from "./read.js";
import { resolve } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use source directory path, accounting for both src and dist locations
const csvDir = __dirname.includes("dist") 
  ? resolve(__dirname, "../../src/csv")
  : __dirname;

export async function getEnquiries(): Promise<Record<string, unknown>[]> {
  const enquiries = await getFromCSV(`${csvDir}/responses.csv`);
  return enquiries as Record<string, unknown>[];
}

export async function saveEnquiries(enquiries: Record<string, unknown>[]): Promise<void> {
  saveToCsv(enquiries, `${csvDir}/output.csv`);
}
