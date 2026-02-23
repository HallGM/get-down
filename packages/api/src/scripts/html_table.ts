import { enquiryToClickableLink } from "../services/enquiries.js";
import { getEnquiries, saveEnquiries } from "../csv/accessors.js";
import fs from "fs";
import { generateHTMLTable } from "../utils/html.js";

const enquiries = await getEnquiries();
enquiries.forEach((e) => {
  (e as any).link = `<a href=${enquiryToClickableLink(e)}>email</a>`;
});

const formattedEnquiries = enquiries.map((e) => {
  return {
    date: (e.createdAt as Date).toLocaleDateString(),
    name: `${e.firstName} ${e.lastName}`,
    partnerName: e.partnersName || "",
    email: e.email,
    phone: e.phone || "",
    venue: e.venueLocation || "",
    services: Array.isArray(e.services)
      ? e.services.map((s) => (typeof s === "string" ? s : s.name)).join(", ")
      : "",
    other: e.otherServices?.join(", ") || "",
    message: e.message || "",
    link: (e as any).link,
  };
});

const htmlTable = generateHTMLTable(formattedEnquiries);
fs.writeFileSync("table.html", htmlTable, "utf8");
console.log("HTML table saved to table.html");
