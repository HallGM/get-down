import type { EnquiryService } from "./models.js";

export interface EnquiryEmailGig {
  firstName: string;
  email: string;
  date?: string;
  partnerName?: string;
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
  const hasMusic = [...rules].some((key) => MUSIC_RULES.has(key!));
  const hasVideoOrPhoto = rules.has("video") || rules.has("photo");
  const hasBand = rules.has("live_band");
  const hasCeilidh = rules.has("ceilidh");
  const hasSingingWaiter = rules.has("singing_waiter");
  const partnerFirstName = firstName(gig.partnerName);
  const attachments = getAttachments(services.length, hasVideoOrPhoto, hasMusic);
  const paragraphs = [`Hi ${gig.firstName.trim()}${partnerFirstName ? ` and ${partnerFirstName}` : ""},`];

  paragraphs.push("Thanks for your recent enquiry with Every Angle!");
  paragraphs.push("I'm delighted to confirm that your date is currently available, and we'd be thrilled to be part of your celebration.");

  let pricingParagraph = `Please find attached the pricing guide for ${attachments}. `;
  if (hasMusic) {
    pricingParagraph += "These are our most popular options, but we're always happy to tailor things to ensure your event is truly bespoke to you.";
  }
  if (hasBand && !hasCeilidh) {
    pricingParagraph += " Many couples enjoy mixing in some ceilidh tunes (traditional and rock fusion styles both available).";
  }
  if (hasSingingWaiter) {
    pricingParagraph += " Same goes for our singing waiter menu which is attached also.";
  }
  paragraphs.push(pricingParagraph);

  if (hasCeilidh) {
    paragraphs.push([
      "You can add an optional 30-minute Ceilidh to our standard band set, which can also be extended to up to 1 hour.",
      "Choose between a traditional Ceilidh or our signature Ceilidh Mash-Ups, a high-energy fusion of classic dances with rock anthems (think Strip the Willow meets Queen and Dropkick Murphys).",
      "For live Ceilidh Mash-Ups, a minimum five-piece band is required, with the keys player leading the main melody.",
      "Every Ceilidh package includes a dedicated caller who guides and demonstrates each dance to keep everyone on their feet and having fun.",
      "For an even more authentic Ceilidh sound, you can also add a fiddle or violin player to the lineup.",
    ].join(" "));
  }

  if (hasVideoOrPhoto) {
    paragraphs.push("Each Video package includes Drone free of charge (weather permitting), PA system with wireless mics for speeches & travel costs.");
  }

  paragraphs.push("As a small thank-you, we offer 10% off your total price when booking video/photography packages alongside any of our music services.");
  paragraphs.push("If you're curious about anything else let me know!");
  paragraphs.push("Best wishes,\nGarry ");
  return paragraphs.join("\n\n");
}

function getAttachments(serviceCount: number, hasVideoOrPhoto: boolean, hasMusic: boolean): string {
  if (serviceCount === 0) return "Video, Photo and Music";
  const attachments: string[] = [];
  if (hasVideoOrPhoto) attachments.push("Video", "Photo");
  if (hasMusic) attachments.push("Music");
  if (attachments.length === 0) return "";
  if (attachments.length === 1) return attachments[0];
  if (attachments.length === 2) return `${attachments[0]} and ${attachments[1]}`;
  return `${attachments.slice(0, -1).join(", ")}, and ${attachments[attachments.length - 1]}`;
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
