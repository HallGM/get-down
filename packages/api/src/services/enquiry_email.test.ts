import { buildEnquiryEmail, isEnquiryEmailRuleKey, type EnquiryService } from "@get-down/shared";

const gig = {
  firstName: "  Alex  ",
  email: "alex+events@example.com",
  partnerName: "Jordan Smith",
  date: "2026-10-08",
};

function service(name: string, emailRuleKey: EnquiryService["emailRuleKey"]): EnquiryService {
  return { id: 1, name, emailRuleKey };
}

describe("buildEnquiryEmail", () => {
  test("recognizes only supported enquiry email rule keys", () => {
    expect(isEnquiryEmailRuleKey("live_band")).toBe(true);
    expect(isEnquiryEmailRuleKey("unknown_rule")).toBe(false);
    expect(isEnquiryEmailRuleKey(null)).toBe(false);
  });

  test("preserves legacy greeting and service-specific paragraphs from stable rule keys", () => {
    const { subject, body } = buildEnquiryEmail(gig, [
      service("Updated band name", "live_band"),
      service("Wedding Film", "video"),
      service("Singing Waiting", "singing_waiter"),
      service("Ceilidh", "ceilidh"),
    ]);

    expect(subject).toBe("Updated band name, Wedding Film, Singing Waiting, Ceilidh 08/10/2026");
    expect(body).toContain("Hi Alex and Jordan,");
    expect(body).toContain("Please find attached the pricing guide for Video, Photo, and Music.");
    expect(body).toContain("Same goes for our singing waiter menu which is attached also.");
    expect(body).toContain("You can add an optional 30-minute Ceilidh");
    expect(body).toContain("For an even more authentic Ceilidh sound, you can also add a fiddle or violin player to the lineup.");
    expect(body).toContain("Each Video package includes Drone free of charge");
    expect(body).toContain("As a small thank-you, we offer 10% off");
    expect(body).toContain("Best wishes,\nGarry ");
    expect(body).not.toContain("Many couples enjoy mixing in some ceilidh tunes");
  });

  test("applies music eligibility to the legacy music rule keys", () => {
    for (const key of ["bagpipes", "acoustic_duo", "karaoke_bandeoke", "saxophone_solo", "dj"] as const) {
      const { body } = buildEnquiryEmail(gig, [service(key, key)]);
      expect(body).toContain("pricing guide for Music");
      expect(body).toContain("These are our most popular options");
    }
  });

  test("formats a date-only subject with no leading separator and omits an absent date", () => {
    expect(buildEnquiryEmail({ ...gig, date: "2025-01-02" }, []).subject).toBe("02/01/2025");
    expect(buildEnquiryEmail({ ...gig, date: undefined }, []).subject).toBe("");
    expect(buildEnquiryEmail({ ...gig, date: undefined }, [service("Custom", null)]).subject).toBe("Custom");
  });

  test("uses the no-service guide fallback and custom names do not trigger rules", () => {
    const { body } = buildEnquiryEmail(gig, []);
    expect(body).toContain("pricing guide for Video, Photo and Music.");

    const customBody = buildEnquiryEmail(gig, [service("Music and Film", null)]).body;
    expect(customBody).toContain("pricing guide for .");
    expect(customBody).not.toContain("Each Video package includes");
    expect(customBody).not.toContain("These are our most popular options");
  });

  test("encodes recipient, subject and body for a mailto URL", () => {
    const email = buildEnquiryEmail({ ...gig, firstName: "A & B", email: "a+b@example.com", partnerName: undefined }, [
      service("Band & ceilidh", "live_band"),
    ]);

    expect(email.mailto).toBe(
      `mailto:${encodeURIComponent("a+b@example.com")}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`,
    );
    expect(email.mailto).toContain("%26");
    expect(email.mailto).toContain("%0A");
    expect(email.body).toContain("Hi A & B,");
  });

  test("uses only the partner's first whitespace-delimited name", () => {
    const { body } = buildEnquiryEmail({ ...gig, partnerName: "  Taylor   Morgan Lee " }, []);
    expect(body).toContain("Hi Alex and Taylor,");
  });
});
