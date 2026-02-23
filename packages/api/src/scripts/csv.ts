import { enquiryToClickableLink } from "../services/enquiries.js";
import { getEnquiries, saveEnquiries } from "../csv/accessors.js";

const enquiries = await getEnquiries();
enquiries.forEach((e) => {
  (e as any).link = enquiryToClickableLink(e);
});
await saveEnquiries(enquiries);
