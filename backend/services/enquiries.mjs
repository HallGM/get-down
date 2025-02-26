import querystring from "querystring";
import { newEnquiry, Enquiry } from "../models/enquiries.mjs";
import { parse } from "date-fns";
import { formatDateSmall } from "../utils/date.mjs";
import models from "../models/enquiries.mjs";
import repoEnquiriesServices from "../repository/enquiries_services.mjs";
import repo from "../repository/enquiries.mjs";

export async function getEnquiries() {
  let enquiriesWS = await repo.readEnquiriesWithServices();
  let enquiryMap = {};
  enquiriesWS.forEach((e) => {
    if (!enquiryMap[e.enquiry_id]) enquiryMap[e.enquiry_id] = e;
    let enquiry = enquiryMap[e.enquiry_id];
    if (!enquiry.services) enquiry.services = [];
    enquiry.services.push({ id: e.service_id, name: e.service_name });
  });
  return Object.values(enquiryMap).map(
    (e) =>
      new Enquiry({
        id: e.enquiry_id,
        createdAt: e.created_at,
        firstName: e.first_name,
        lastName: e.last_name,
        partnersName: e.partner_name,
        email: e.email,
        phone: e.phone,
        eventDate: e.event_date,
        venueLocation: e.venue_location,
        services: e.services,
        otherServices: e.other_services,
        message: e.message,
      })
  );
}

export async function createEnquiry(reqBody) {
  let enquiry = new models.Enquiry(reqBody);
  let res = await repo.createEnquiry(enquiry);
  enquiry.id = res[0].id;
  await repoEnquiriesServices.createEnquiriesServices(
    enquiry.id,
    enquiry.services
  );
  return enquiry;
}

export async function deleteEnquiry(id) {
  await repo.deleteEnquiry(id);
}

export function csvToEnquiry(raw, allServices) {
  let existingServices = [];
  let otherServices = [];
  let interested = raw["Which services are you interested in?"].split(", ");
  interested.forEach((i) => {
    let arr = allServices.find((s) => i === s.name)
      ? existingServices
      : otherServices;
    arr.push(i);
  });
  let ne = newEnquiry(
    parse(raw.Timestamp, "dd/MM/yyyy HH:mm:ss", new Date()),
    raw["First Name"],
    raw["Last Name"],
    raw["Partner's Name (Full name)"],
    raw.Email,
    raw.Phone,
    raw["Event Date (optional)"] &&
      parse(raw["Event Date (optional)"], "dd/MM/yyyy", new Date()),
    raw["Venue Location (optional)"],
    existingServices,
    otherServices,
    raw["Message (optional)"]
  );
  return ne;
}

export function enquiryToClickableLink(enquiry) {
  const params = {
    subject: `${enquiry.services.join(", ")} ${
      enquiry.eventDate ? formatDateSmall(enquiry.eventDate) : ""
    }`,
    body: getText(enquiry),
  };
  const link = `mailto:${enquiry.email}?${querystring.stringify(params)}`;
  return link;
}

function getText(enquiry) {
  const services = enquiry.services;
  let text = [
    `Hi ${enquiry.firstName} and ${enquiry.partnersName},`,
    `Hope you enjoyed the rest of the showcase! We have your date available at the moment${
      enquiry.venueLocation ? ` for ${enquiry.venueLocation}` : ""
    }.`,
    [
      `I've attached the prices for ${getAttachments(services)}.`,
      checkHasBand(services)
        ? "Pick your favourite songs from there to help us shape the soundtrack to your night. We will learn your first dance and open to suggestions for other new songs, if it's something we think we can add to our set going forward."
        : "",
      checkHasSingingWaiting(services)
        ? "Same goes for our singing waiter menu which is attached also."
        : "",
    ].join(" "),
    [
      checkHasCeilidh(services) || checkHasBand(services)
        ? "For live Ceilidh with mash ups, a minimum of 5 piece band is required as the keys player will take the main melody and all packages include a Ceilidh caller with a demonstration of each dance. All band packages include a Ceilidh caller with a demonstration of each dance. Check our socials for clips of Ceilidh."
        : "",

      checkHasMusic(services)
        ? `Travel will vary depending on the number of ${
            enquiry.venueLocation.trim()
              ? "musicians."
              : "musicians and distance."
          }`
        : "",
    ].join(" "),
  ];

  if (checkHasVideoOrPhoto(services)) {
    text.push(
      "Each Video package includes Drone free of charge (weather permitting), PA system with wireless mics for speeches & travel costs."
    );
  }
  text.push(`Also see the links below for some of our acoustic duets for during the Ceremony & Drinks Reception, an extended Highlight Reel and a clip from a Ceremony. 

Acoustic Duets - https://www.dropbox.com/scl/fi/mmcdfjzhdzioakwofbnyi/Acoustic-Duo-s.mp4?rlkey=ldg1fjergp2u84tk8atklnh22&st=u6f482m3&dl=0

Extended Highlight Reel - https://www.dropbox.com/scl/fi/vt77c0vdk4zkgl3mfad1v/Highlight-Reel-extended.mp4?rlkey=35et1m27klfrdf4ken5p715l5&st=mgwn8mqi&dl=0

Ceremony Clip - https://www.dropbox.com/scl/fi/4lalbnwfkbgppes1lprip/Ceremony.mp4?rlkey=1vg56ptlqz4b5s7epcdw9l4t4&st=0o26ayw7&dl=0

We offer a 10% discount on Video/Photo when booked alongside Music.

If you're curious about anything else let me know! 

Best wishes, 
Scott`);
  return text.join("\n\n");
}

function getAttachments(services) {
  const attachments = [];
  if (checkHasVideoOrPhoto(services)) attachments.push("Video/Photo");
  if (checkHasMusic(services))
    attachments.push("Music and our extended setlist");
  return attachments.join(", ");
}

const checkHasMusic = createCheckHas([
  "Live Band (3/5/7 piece)",
  "Singing Waiting",
  "Bagpipes",
  "Acoustic Duo",
  "Karaoke/Bandeoke",
  "Saxophone Solo",
  "DJ",
  "Ceilidh",
]);
const checkHasVideoOrPhoto = createCheckHas(["Wedding Film", "Photography"]);
const checkHasBand = createCheckHas(["Live Band (3/5/7 piece)"]);
const checkHasCeilidh = createCheckHas(["Ceilidh"]);
const checkHasSingingWaiting = createCheckHas(["Singing Waiting"]);

function createCheckHas(serviceToCheck) {
  return function (services) {
    return services.some((s) => serviceToCheck.includes(s));
  };
}
export default { createEnquiry, getEnquiries, deleteEnquiry };
