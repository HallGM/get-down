import type { Pool } from "pg";
import { startDatabase, stopDatabase, type IntegrationDb } from "./setup.js";
import * as fixtures from "./fixtures.js";

let db: IntegrationDb;
let pool: Pool;

beforeAll(async () => {
  db = await startDatabase();
  pool = db.pool;
}, 120000);

afterAll(async () => {
  await stopDatabase();
});

test("default and custom enquiry email rule keys flow through service queries", async () => {
  const repository = await import("../../src/repository/enquiry_services.js");
  const enquiryServices = await import("../../src/services/enquiry_services.js");
  const defaults = await enquiryServices.getAll();
  const expectedKeys: Record<string, string> = {
    "Live Band (3/5/7 piece)": "live_band",
    "Wedding Film": "video",
    Photography: "photo",
    "Saxophone Solo": "music",
    "Singing Waiting": "singing_waiter",
    Ceilidh: "ceilidh",
    Bagpipes: "music",
    DJ: "music",
    "Karaoke/Bandeoke": "music",
  };
  for (const [name, key] of Object.entries(expectedKeys)) {
    expect(defaults.find((service) => service.name === name)?.emailRuleKey).toBe(key);
  }

  const gig = await fixtures.makeGig({ status: "enquiry" });
  const selectedId = defaults.find((service) => service.name === "Wedding Film")!.id;
  await pool.query("INSERT INTO gig_enquiry_services (gig_id, enquiry_service_id) VALUES ($1, $2)", [gig.id, selectedId]);
  const selected = await enquiryServices.getGigSelections(gig.id);
  expect(selected).toEqual([expect.objectContaining({ name: "Wedding Film", emailRuleKey: "video" })]);

  const custom = await repository.create("Custom enquiry service");
  expect((await enquiryServices.getAll()).find((service) => service.id === custom.id)?.emailRuleKey).toBeNull();
});
