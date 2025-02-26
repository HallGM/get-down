import { enquiryToClickableLink } from "./services/enquiries.mjs";
import { getEnquiries } from "./csv/accessors.mjs";

let enquiries = await getEnquiries();
enquiries.forEach((e) => {
  e.link = enquiryToClickableLink(e);
});
saveEnquiries(enquiries);
