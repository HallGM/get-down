import type { Pool } from "pg";
import type { ClientFormResponse } from "@get-down/shared";
import { makeGig } from "./fixtures.js";
import { startDatabase, stopDatabase, resetDatabase, type IntegrationDb } from "./setup.js";

let db: IntegrationDb;
let pool: Pool;

function songIds(response: ClientFormResponse): number[] {
  return response.songGroups.flatMap((group) => group.songs.map((song) => song.id));
}

beforeAll(async () => {
  db = await startDatabase();
  pool = db.pool;
}, 120000);

afterAll(async () => {
  await stopDatabase();
});

beforeEach(async () => {
  await resetDatabase(pool);
});

describe("client form", () => {
  test("returns enquiry mode, updates available songs with band service, and preserves preferences", async () => {
    const gig = await makeGig({
      status: "enquiry",
      firstName: "Alex",
      lastName: "Example",
      partnerName: "Sam Example",
      venueName: "The Hall",
    });
    await pool.query("UPDATE gigs SET date = NULL WHERE id = $1", [gig.id]);

    const servicesRepo = await import("../../src/repository/services.js");
    const gigsRepo = await import("../../src/repository/gigs.js");
    const songsRepo = await import("../../src/repository/songs.js");
    const exclusionsRepo = await import("../../src/repository/song_service_exclusions.js");
    const clientForm = await import("../../src/services/client_form.js");

    const groups = await servicesRepo.readServiceGroups();
    const bandGroupId = groups.find((group) => group.name === "Band")!.id;
    const fivePiece = await servicesRepo.createService({ name: "Five-piece", groupIds: [bandGroupId] });
    const alternateBand = await servicesRepo.createService({ name: "Alternate band", groupIds: [bandGroupId] });
    await gigsRepo.setGigServices(gig.id, [fivePiece.id]);

    const fivePieceSong = await songsRepo.createSong({ title: "Five-piece song" });
    const alternateOnlySong = await songsRepo.createSong({ title: "Alternate-only song" });
    const excludedAfterChangeSong = await songsRepo.createSong({ title: "Excluded after change" });
    await db.withTransaction(async () => {
      await exclusionsRepo.replaceExclusions(alternateOnlySong.id, [fivePiece.id]);
      await exclusionsRepo.replaceExclusions(excludedAfterChangeSong.id, [alternateBand.id]);
    });

    const initial = await clientForm.getClientForm(gig.client_token);
    expect(initial).toMatchObject({
      status: "enquiry",
      date: "",
      firstName: "Alex",
      lastName: "Example",
      partnerName: "Sam Example",
      venueName: "The Hall",
    });
    const availableFivePieceSongIds = songIds(initial);
    expect(availableFivePieceSongIds).toContain(fivePieceSong.id);
    expect(availableFivePieceSongIds).toContain(excludedAfterChangeSong.id);
    expect(availableFivePieceSongIds).not.toContain(alternateOnlySong.id);

    await clientForm.saveClientForm(gig.client_token, {
      venueName: "Venue supplied from existing event-form fields",
      preferences: {
        favourites: [fivePieceSong.id],
        mustPlays: [excludedAfterChangeSong.id],
        doNotPlays: [alternateOnlySong.id],
      },
    });

    const enquirySaveTimestamp = await pool.query<{ form_saved_at: string | null }>(
      "SELECT form_saved_at FROM gigs WHERE id = $1",
      [gig.id],
    );
    expect(enquirySaveTimestamp.rows[0].form_saved_at).toBeNull();

    const afterSave = await clientForm.getClientForm(gig.client_token);
    expect(afterSave.venueName).toBe("Venue supplied from existing event-form fields");
    expect(afterSave.preferences).toEqual({
      favourites: [fivePieceSong.id],
      mustPlays: [excludedAfterChangeSong.id],
      doNotPlays: [alternateOnlySong.id],
    });

    await gigsRepo.setGigServices(gig.id, [alternateBand.id]);
    const afterServiceChange = await clientForm.getClientForm(gig.client_token);
    const alternateSongIds = songIds(afterServiceChange);
    expect(alternateSongIds).toContain(alternateOnlySong.id);
    expect(alternateSongIds).not.toContain(excludedAfterChangeSong.id);
    expect(afterServiceChange.preferences).toEqual(afterSave.preferences);

    // Simulate a timestamp left by an enquiry save before this behavior was introduced.
    await pool.query("UPDATE gigs SET form_saved_at = NOW() WHERE id = $1", [gig.id]);
    const gigsService = await import("../../src/services/gigs.js");
    await gigsService.updateGig(gig.id, { status: "confirmed", date: "2025-06-02" });
    const confirmationTimestamp = await pool.query<{ form_saved_at: string | null }>(
      "SELECT form_saved_at FROM gigs WHERE id = $1",
      [gig.id],
    );
    expect(confirmationTimestamp.rows[0].form_saved_at).toBeNull();

    const afterConfirmation = await clientForm.getClientForm(gig.client_token);
    expect(afterConfirmation.status).toBe("confirmed");
    expect(afterConfirmation.preferences).toEqual(afterSave.preferences);

    await clientForm.saveClientForm(gig.client_token, {
      preferences: afterConfirmation.preferences,
    });
    const postConfirmationSave = await pool.query<{ form_saved_at: string | null }>(
      "SELECT form_saved_at FROM gigs WHERE id = $1",
      [gig.id],
    );
    expect(postConfirmationSave.rows[0].form_saved_at).not.toBeNull();
  });

  test("continues to enforce the maximum of three must-play songs", async () => {
    const gig = await makeGig({ status: "enquiry" });
    const songsRepo = await import("../../src/repository/songs.js");
    const clientForm = await import("../../src/services/client_form.js");
    const songs = await Promise.all(
      ["One", "Two", "Three", "Four"].map((title) => songsRepo.createSong({ title })),
    );

    await expect(
      clientForm.saveClientForm(gig.client_token, {
        preferences: { favourites: [], mustPlays: songs.map((song) => song.id), doNotPlays: [] },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
