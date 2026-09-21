import { startDatabase, stopDatabase, resetDatabase, type IntegrationDb } from "./setup.js";
import * as fixtures from "./fixtures.js";

let db: IntegrationDb;

beforeAll(async () => {
  db = await startDatabase();
}, 120000);

afterAll(async () => {
  await stopDatabase();
});

beforeEach(async () => {
  await resetDatabase(db.pool);
});

describe("private gig notes", () => {
  test("persists private notes through gig creation and update", async () => {
    const { readGigById, updateGig } = await import("../../src/repository/gigs.js");
    const gig = await fixtures.makeGig({ privateNotes: "Staff-only context" });

    expect((await readGigById(gig.id))?.private_notes).toBe("Staff-only context");

    await updateGig(gig.id, {
      ...gig,
      privateNotes: "Updated staff-only context",
    });

    expect((await readGigById(gig.id))?.private_notes).toBe("Updated staff-only context");
  });
});
