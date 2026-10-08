import { buildEnquiryEmail, isEnquiryEmailRuleKey, type EnquiryService } from "@get-down/shared";

const gig = {
  firstName: "  Alex  ",
  email: "alex+events@example.com",
  partnerName: "Jordan Smith",
  date: "2026-10-08",
  clientFormUrl: "https://example.com/c/client-token",
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

  test("personalizes the general price-list reference without repeating service details", () => {
    const { subject, body } = buildEnquiryEmail(gig, [
      service("Updated band name", "live_band"),
      service("Wedding Film", "video"),
      service("Singing Waiting", "singing_waiter"),
      service("Ceilidh", "ceilidh"),
    ]);

    expect(subject).toBe("Updated band name, Wedding Film, Singing Waiting, Ceilidh 08/10/2026");
    expect(body).toContain("Hi Alex and Jordan,");
    expect(body).toContain("I'm delighted to confirm that your date is currently available");
    expect(body).toContain("I've attached our general price list so you can explore the music, ceilidh, and video options you asked about.");
    expect(body).toContain("Travel costs depend on the venue and the size of the group needed to provide the services you've selected.");
    expect(body).toContain("You can browse our song selection here and let us know which songs you'd love to hear: https://example.com/c/client-token");
    expect(body).not.toContain("singing waiter menu");
    expect(body).not.toContain("optional 30-minute Ceilidh");
    expect(body).not.toContain("fiddle or violin player");
    expect(body).not.toContain("Drone free of charge");
    expect(body).not.toContain("PA system with wireless mics");
    expect(body).not.toContain("most popular options");
    expect(body).toContain("If you have any questions or would like to chat through the options, just let me know!");
    expect(body).toContain("Best wishes,\nScott");
    expect(body).not.toContain("10% off");
    expect(body).not.toContain("Many couples enjoy mixing in some ceilidh tunes");
  });

  test("applies music eligibility to the legacy music rule keys", () => {
    for (const key of ["bagpipes", "acoustic_duo", "karaoke_bandeoke", "saxophone_solo", "dj"] as const) {
      const { body } = buildEnquiryEmail(gig, [service(key, key)]);
      expect(body).toContain("the music options you asked about");
      expect(body).not.toContain("browse our song selection");
      expect(body).not.toContain(gig.clientFormUrl!);
    }
  });

  test("includes one song invitation and client link when band is selected", () => {
    const body = buildEnquiryEmail(gig, [
      service("Band", "live_band"),
      service("Wedding Film", "video"),
    ]).body;

    expect(body).toContain("browse our song selection");
    expect(body).toContain(gig.clientFormUrl!);
    expect(body.split("browse our song selection")).toHaveLength(2);
    expect(body.split(gig.clientFormUrl!).length - 1).toBe(1);
  });

  test("omits the song invitation and client link without band, including for other music services", () => {
    const bodies = ["ceilidh", "singing_waiter", "dj", "acoustic_duo"].map((key) =>
      buildEnquiryEmail(gig, [service(key, key as EnquiryService["emailRuleKey"])]).body,
    );

    for (const body of bodies) {
      expect(body).not.toContain("browse our song selection");
      expect(body).not.toContain(gig.clientFormUrl!);
    }
  });

  test("generates non-band emails when no client form URL is available", () => {
    const { body } = buildEnquiryEmail({ ...gig, clientFormUrl: undefined }, [service("Wedding Film", "video")]);

    expect(body).toContain("the video options you asked about");
    expect(body).not.toContain("browse our song selection");
    expect(body).not.toContain("https://example.com/c/client-token");
  });

  test("requires a client form URL for band enquiries", () => {
    expect(() => buildEnquiryEmail({ ...gig, clientFormUrl: undefined }, [service("Band", "live_band")])).toThrow(
      "Client form URL is required for band enquiries.",
    );
  });

  test("never mentions a discount when video or photography and music are selected", () => {
    const { body } = buildEnquiryEmail(gig, [
      service("Wedding Film", "video"),
      service("Band", "live_band"),
    ]);

    expect(body).not.toMatch(/10\s*%|discount|off your total price/i);
  });

  test("formats a date-only subject with no leading separator and omits an absent date", () => {
    expect(buildEnquiryEmail({ ...gig, date: "2025-01-02" }, []).subject).toBe("02/01/2025");
    expect(buildEnquiryEmail({ ...gig, date: undefined }, []).subject).toBe("");
    expect(buildEnquiryEmail({ ...gig, date: undefined }, [service("Custom", null)]).subject).toBe("Custom");
  });

  test("uses the general price list with no services and custom names do not trigger rules", () => {
    const { body } = buildEnquiryEmail(gig, []);
    expect(body).toContain("I've attached our general price list so you can explore our services and prices.");

    const customBody = buildEnquiryEmail(gig, [service("Music and Film", null)]).body;
    expect(customBody).toContain("I've attached our general price list so you can explore our services and prices.");
    expect(customBody).not.toContain("Each Video package includes");
    expect(customBody).not.toContain("These are our most popular options");
    expect(customBody).not.toContain(gig.clientFormUrl!);
  });

  test("uses broad service categories instead of custom names in the price-list reference", () => {
    const { body } = buildEnquiryEmail(gig, [
      service("The Acoustic Experience", "acoustic_duo"),
      service("Wedding Film", "video"),
    ]);

    expect(body).toContain("the music and video options you asked about");
    expect(body).not.toContain("The Acoustic Experience options");
  });

  test("does not repeat a music category when ceilidh is the only selected area", () => {
    const { body } = buildEnquiryEmail(gig, [service("Ceilidh", "ceilidh")]);

    expect(body).toContain("the ceilidh options you asked about");
    expect(body).not.toContain("music and ceilidh");
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
