import { getFromCSV, saveToCsv } from "./read.js";
import { csvToEnquiry } from "../services/enquiries.js";
import * as repoServices from "../repository/services.js";
import { resolve } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import type { Enquiry } from "@get-down/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use source directory path, accounting for both src and dist locations
const csvDir = __dirname.includes("dist") 
  ? resolve(__dirname, "../../src/csv")
  : __dirname;

export async function getEnquiries(): Promise<Enquiry[]> {
  const enquiries = await getFromCSV(`${csvDir}/responses.csv`);
  const services = await repoServices.readServices();
  return enquiries.map((e) => csvToEnquiry(e, services));
}

export async function saveEnquiries(enquiries: Enquiry[]): Promise<void> {
  saveToCsv(enquiries as Record<string, any>[], `${csvDir}/output.csv`);
}
