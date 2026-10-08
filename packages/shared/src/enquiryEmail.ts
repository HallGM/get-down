import type { EnquiryService } from "./models.js";

export interface EnquiryEmailGig {
  firstName: string;
  email: string;
  date?: string;
  partnerName?: string;
  clientFormUrl?: string;
}

export interface EnquiryEmail {
  subject: string;
  body: string;
  mailto: string;
}

/** Build the legacy enquiry response email for a gig and its selected services. */
export function buildEnquiryEmail(gig: EnquiryEmailGig, services: EnquiryService[]): EnquiryEmail {
  const subjectParts = [services.map(({ name }) => name).join(", "), formatShortDate(gig.date)]
    .filter(Boolean);
  const subject = subjectParts.join(" ");
  const body = buildBody(gig, services);
  const mailto = `mailto:${encodeURIComponent(gig.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { subject, body, mailto };
}

function buildBody(gig: EnquiryEmailGig, services: EnquiryService[]): string {
  const rules = new Set(services.map(({ emailRuleKey }) => emailRuleKey).filter(Boolean));
  const hasBand = rules.has("live_band");
  const partnerFirstName = firstName(gig.partnerName);
  const serviceAreas = getServiceAreas(rules);
  const paragraphs = [`Hi ${gig.firstName.trim()}${partnerFirstName ? ` and ${partnerFirstName}` : ""},`];

  paragraphs.push("Thanks for your recent enquiry with Every Angle!");
  paragraphs.push(gig.date?.trim()
    ? "I'm delighted to confirm that your date is currently available, and we'd be thrilled to be part of your celebration."
    : "We'd be thrilled to be part of your celebration.");

  paragraphs.push(serviceAreas.length
    ? `I've attached our general price list so you can explore the ${formatServiceAreas(serviceAreas)} options you asked about.`
    : "I've attached our general price list so you can explore our services and prices.");

  paragraphs.push("Travel costs depend on the venue and the size of the group needed to provide the services you've selected.");
  if (hasBand) {
    if (!gig.clientFormUrl) {
      throw new Error("Client form URL is required for band enquiries.");
    }
    paragraphs.push(`You can browse our song selection here and let us know which songs you'd love to hear: ${gig.clientFormUrl}`);
  }
  paragraphs.push("If you have any questions or would like to chat through the options, just let me know!");
  paragraphs.push("Best wishes,\nScott");
  return paragraphs.join("\n\n");
}

function getServiceAreas(rules: Set<string | null | undefined>): string[] {
  const areas: string[] = [];
  if ([...rules].some((key) => key && key !== "ceilidh" && MUSIC_RULES.has(key))) areas.push("music");
  if (rules.has("ceilidh")) areas.push("ceilidh");
  if (rules.has("video")) areas.push("video");
  if (rules.has("photo")) areas.push("photography");
  return areas;
}

function formatServiceAreas(areas: string[]): string {
  if (areas.length === 1) return areas[0];
  if (areas.length === 2) return `${areas[0]} and ${areas[1]}`;
  return `${areas.slice(0, -1).join(", ")}, and ${areas[areas.length - 1]}`;
}

function formatShortDate(date?: string): string {
  if (!date) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${String(parsed.getDate()).padStart(2, "0")}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`;
}

function firstName(name?: string): string {
  return name?.trim().split(/\s+/)[0] ?? "";
}

const MUSIC_RULES = new Set([
  "music",
  "live_band",
  "singing_waiter",
  "ceilidh",
  "bagpipes",
  "acoustic_duo",
  "karaoke_bandeoke",
  "saxophone_solo",
  "dj",
]);
