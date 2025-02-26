import { getFromCSV, saveToCsv } from "./read.mjs";
import { csvToEnquiry } from "../services/enquiries.mjs";
import { readServices } from "../repository/services.mjs";
import { dirname } from "path";
import { fileURLToPath } from "url";

export async function getEnquiries() {
  let enquiries = await getFromCSV(`${getPath()}/responses.csv`);
  let services = await readServices();
  return enquiries.map((e) => csvToEnquiry(e, services));
}

export async function saveEnquiries(enquiries) {
  saveToCsv(enquiries, `${getPath()}/output.csv`);
}

function getPath() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return __dirname;
}
