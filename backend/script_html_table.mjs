import { enquiryToClickableLink } from "./services/enquiries.mjs";
import { getEnquiries, saveEnquiries } from "./csv/accessors.mjs";
import fs from "fs";
import { generateHTMLTable } from "./utils/html.mjs";

let enquiries = await getEnquiries();
enquiries.forEach((e) => {
  e.link = `<a href=${enquiryToClickableLink(e)}>email</a>`;
});
enquiries = enquiries.map((e) => {
  return {
    date: e.createdAt.toLocaleDateString(),
    name: e.firstName + " " + e.lastName,
    partnerName: e.partnersName,
    email: e.email,
    phone: e.phone,
    venue: e.venueLocation,
    services: e.services,
    other: e.otherServices,
    message: e.message,
    link: e.link,
  };
});

// Generate the HTML table
const htmlTable = generateHTMLTable(enquiries);

// Output the table (for testing or saving to a file)
console.log(htmlTable);

// Save the HTML to a file (optional)
fs.writeFileSync("table.html", htmlTable, "utf8");
console.log("HTML table saved to table.html");
