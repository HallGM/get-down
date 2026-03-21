import querystring from "querystring";
import { z } from "zod";
import { createEnquiry as createEnquiryModel, type Enquiry } from "@get-down/shared";
import { parse } from "date-fns";
import { formatDateSmall } from "../utils/date.js";
import { parseOrBadRequest } from "../utils/parse.js";
import * as repoEnquiries from "../repository/enquiries.js";
import * as repoEnquiriesServices from "../repository/enquiries_services.js";
import * as repoServices from "../repository/services.js";

export async function getEnquiries(): Promise<Enquiry[]> {
  const enquiriesWS = await repoEnquiries.readEnquiriesWithServices();
  const enquiryMap: Record<number, Enquiry & { services: any[] }> = {};

  enquiriesWS.forEach((e) => {
    if (!enquiryMap[e.id]) {
      enquiryMap[e.id] = {
        id: e.id,
        createdAt: e.created_at,
        firstName: e.first_name,
        lastName: e.last_name,
        partnersName: e.partner_name || undefined,
        email: e.email,
        phone: e.phone || undefined,
        eventDate: e.event_date || undefined,
        venueLocation: e.venue_location || undefined,
        services: [],
        otherServices: e.other_services || [],
        message: e.message || undefined,
        airtableId: e.airtable_id || undefined,
      };
    }
    const enquiry = enquiryMap[e.id];
    if (e.service_id && e.service_name) {
      enquiry.services.push({ id: e.service_id, name: e.service_name });
    }
  });

  return Object.values(enquiryMap);
}

export async function createEnquiry(reqBody: any): Promise<Enquiry> {
  const enquiry = createEnquiryModel(reqBody);
  const res = await repoEnquiries.createEnquiry(enquiry);
  enquiry.id = res[0].id;

  // Filter to only numeric service IDs for the database
  const serviceIds = (enquiry.services as any[])
    .filter((s) => typeof s === "number")
    .map((s) => s);

  if (serviceIds.length > 0) {
    await repoEnquiriesServices.createEnquiriesServices(enquiry.id as number, serviceIds);
  }

  return enquiry;
}

export async function deleteEnquiry(id: string | number): Promise<void> {
  await repoEnquiries.deleteEnquiry(id);
}

const EnquiryMessageSchema = z.object({
  firstName: z.string().min(1, "firstName is required"),
  partnersName: z.string().optional(),
  services: z.array(z.unknown(), { error: "services must be an array" }),
});

export function getEnquiryMessage(body: unknown): { message: string } {
  const { firstName, partnersName, services } = parseOrBadRequest(EnquiryMessageSchema, body);
  const enquiry: Enquiry = {
    firstName: firstName.trim(),
    partnersName: partnersName?.trim() || undefined,
    services: services as Enquiry["services"],
  } as Enquiry;
  return { message: getText(enquiry) };
}

export function csvToEnquiry(
  raw: Record<string, any>,
  allServices: Array<{ id: number; name: string }>
): Enquiry {
  const existingServices: string[] = [];
  const otherServices: string[] = [];
  const interested = raw["Which services are you interested in?"].split(", ");

  interested.forEach((i: string) => {
    const arr = allServices.find((s) => i === s.name) ? existingServices : otherServices;
    arr.push(i);
  });

  return createEnquiryModel({
    createdAt: parse(raw.Timestamp, "dd/MM/yyyy HH:mm:ss", new Date()),
    firstName: raw["First Name"],
    lastName: raw["Last Name"],
    partnersName: raw["Partner's Name (Full name)"],
    email: raw.Email,
    phone: raw.Phone,
    eventDate: raw["Event Date (optional)"]
      ? parse(raw["Event Date (optional)"], "dd/MM/yyyy", new Date())
      : undefined,
    venueLocation: raw["Venue Location (optional)"],
    services: existingServices,
    otherServices,
    message: raw["Message (optional)"],
  });
}

export function enquiryToClickableLink(enquiry: Enquiry): string {
  const services = Array.isArray(enquiry.services)
    ? enquiry.services.map((s) => (typeof s === "string" ? s : s.name)).join(", ")
    : "";

  const params = {
    subject: `${services} ${enquiry.eventDate ? formatDateSmall(enquiry.eventDate) : ""}`,
    body: getText(enquiry),
  };
  const link = `mailto:${enquiry.email}?${querystring.stringify(params)}`;
  return link;
}

export function getText(enquiry: Enquiry): string {
  const services = Array.isArray(enquiry.services)
    ? enquiry.services.map((s) => (typeof s === "string" ? s : s.name))
    : [];

  const partnerName = getFirstName(enquiry.partnersName);
  const text: string[] = [];

  let para = `Hi ${enquiry.firstName.trim()}`;
  if (partnerName) para += ` and ${partnerName}`;
  para += ",";
  text.push(para);

  text.push("Thanks for your recent enquiry with Every Angle!");
  text.push(
    "I'm delighted to confirm that your date is currently available, and we'd be thrilled to be part of your celebration."
  );

  para = `Please find attached the pricing guide for ${getAttachments(services)}. `;
  if (checkHasMusic(services))
    para +=
      "These are our most popular options, but we're always happy to tailor things to ensure your event is truly bespoke to you.";
  if (checkHasBand(services) && !checkHasCeilidh(services))
    para += " Many couples enjoy mixing in some ceilidh tunes (traditional and rock fusion styles both available).";
  if (checkHasSingingWaiter(services))
    para += " Same goes for our singing waiter menu which is attached also.";
  text.push(para);

  if (checkHasCeilidh(services)) {
    text.push(
      "You can add an optional 30-minute Ceilidh to our standard band set, which can also be extended to up to 1 hour. Choose between a traditional Ceilidh or our signature Ceilidh Mash-Ups — a high-energy fusion of classic dances with rock anthems (think Strip the Willow meets Queen and Dropkick Murphys). For live Ceilidh Mash-Ups, a minimum five-piece band is required, with the keys player leading the main melody. Every Ceilidh package includes a dedicated caller who guides and demonstrates each dance to keep everyone on their feet and having fun. For an even more authentic Ceilidh sound, you can also add a fiddle or violin player to the lineup."
    );
  }

  if (checkHasVideoOrPhoto(services)) {
    text.push(
      "Each Video package includes Drone free of charge (weather permitting), PA system with wireless mics for speeches & travel costs."
    );
  }

  text.push(
    "As a small thank-you, we offer 10% off your total price when booking video/photography packages alongside any of our music services."
  );
  text.push("If you're curious about anything else let me know!");
  text.push("Best wishes,\nGarry ");
  return text.join("\n\n");
}

function getAttachments(services: string[]): string {
  const attachments: string[] = [];
  if (services.length === 0) {
    return "Video, Photo and Music";
  }
  if (checkHasVideoOrPhoto(services)) {
    attachments.push("Video");
    attachments.push("Photo");
  }
  if (checkHasMusic(services)) attachments.push("Music");

  if (attachments.length === 0) return "";
  if (attachments.length === 1) return attachments[0];
  if (attachments.length === 2) return `${attachments[0]} and ${attachments[1]}`;
  return attachments.slice(0, -1).join(", ") + ", and " + attachments[attachments.length - 1];
}

export function getFirstName(name?: string): string {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed.split(" ")[0];
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
const checkHasSingingWaiter = createCheckHas(["Singing Waiting"]);

function createCheckHas(serviceToCheck: string[]) {
  return function (services: string[]): boolean {
    return services.some((s) => serviceToCheck.includes(s));
  };
}

export default {
  createEnquiry,
  getEnquiries,
  deleteEnquiry,
  csvToEnquiry,
  enquiryToClickableLink,
  getText,
};
