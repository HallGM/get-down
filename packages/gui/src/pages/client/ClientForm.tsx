import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useClientForm, useSaveClientForm } from "../../api/hooks/useClientForm.js";
import type { SaveClientFormRequest } from "@get-down/shared";
import { formatDate } from "../../utils/date.js";
import { deriveClientFormCapabilities } from "../../utils/clientFormCapabilities.js";
import "./client-form.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "details" | "songs";
type PrefType = "favourites" | "mustPlays" | "doNotPlays";

// ─── Labelled field wrapper ───────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label
        style={{
          display: "block",
          fontWeight: 600,
          marginBottom: hint ? "0.2rem" : "0.4rem",
        }}
      >
        {label}
      </label>
      {hint && (
        <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", color: "var(--pico-muted-color)" }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

// ─── Save feedback bar ────────────────────────────────────────────────────────

function SaveBar({
  isPending,
  saved,
  error,
  onSave,
  extra,
}: {
  isPending: boolean;
  saved: boolean;
  error: string;
  onSave: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="cf-save-bar">
      <button type="button" aria-busy={isPending} disabled={isPending} onClick={onSave}>
        Save
      </button>
      {extra}
      {saved && (
        <span style={{ color: "green", fontWeight: 600 }}>✓ Saved successfully!</span>
      )}
      {error && (
        <span style={{ color: "var(--pico-del-color)" }}>{error}</span>
      )}
    </div>
  );
}

// ─── Song preference row ──────────────────────────────────────────────────────

interface SongRowProps {
  id: number;
  title: string;
  artist?: string;
  favourites: number[];
  mustPlays: number[];
  doNotPlays: number[];
  mustPlaysAtMax: boolean;
  onToggle: (pref: PrefType, songId: number) => void;
}

function SongRow({
  id,
  title,
  artist,
  favourites,
  mustPlays,
  doNotPlays,
  mustPlaysAtMax,
  onToggle,
}: SongRowProps) {
  const isFav = favourites.includes(id);
  const isMust = mustPlays.includes(id);
  const isDnp = doNotPlays.includes(id);

  return (
    <div className="cf-song-row">
      <span className="cf-song-title">
        {title}
        {artist && (
          <span style={{ color: "var(--pico-muted-color)", marginLeft: "0.35rem" }}>
            — {artist}
          </span>
        )}
      </span>
      <div className="cf-song-buttons">
        <button
          type="button"
          title="Add to favourites"
          style={{
            padding: "0.2em 0.55em",
            background: isFav ? "var(--pico-primary)" : "transparent",
            color: isFav ? "#fff" : "var(--pico-primary)",
            border: "1px solid var(--pico-primary)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
          onClick={() => onToggle("favourites", id)}
        >
          ♥ Fav
        </button>
        <button
          type="button"
          title="Mark as must-play (max 3)"
          disabled={!isMust && mustPlaysAtMax}
          style={{
            padding: "0.2em 0.55em",
            background: isMust ? "#2e7d32" : "transparent",
            color: isMust ? "#fff" : "#2e7d32",
            border: "1px solid #2e7d32",
            borderRadius: "4px",
            cursor: !isMust && mustPlaysAtMax ? "not-allowed" : "pointer",
            opacity: !isMust && mustPlaysAtMax ? 0.35 : 1,
            fontSize: "0.8rem",
          }}
          onClick={() => onToggle("mustPlays", id)}
        >
          ★ Must
        </button>
        <button
          type="button"
          title="Do not play"
          style={{
            padding: "0.2em 0.55em",
            background: isDnp ? "#b71c1c" : "transparent",
            color: isDnp ? "#fff" : "#b71c1c",
            border: "1px solid #b71c1c",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
          onClick={() => onToggle("doNotPlays", id)}
        >
          ✕ DNP
        </button>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FIRST_DANCE_TYPES = ["", "Live", "DJ", "None"];
const CEILIDH_LENGTHS = ["", "30 mins", "1 hour"];
const CEILIDH_STYLES = ["", "Mash-up", "Traditional"];

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientForm() {
  const { token = "" } = useParams<{ token: string }>();
  const { data, isLoading, error } = useClientForm(token);
  const save = useSaveClientForm(token);

  // ── Shared form state ──────────────────────────────────────────────────────
  const [form, setForm] = useState<Omit<SaveClientFormRequest, "preferences">>({});
  const [favourites, setFavourites] = useState<number[]>([]);
  const [mustPlays, setMustPlays] = useState<number[]>([]);
  const [doNotPlays, setDoNotPlays] = useState<number[]>([]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("details");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [mustPlaysError, setMustPlaysError] = useState("");

  // Populate from server on first load only
  useEffect(() => {
    if (!data) return;
    setForm({
      venueName: data.venueName ?? "",
      location: data.location ?? "",
      timings: data.timings ?? "",
      contactNumber: data.contactNumber ?? "",
      parkingInfo: data.parkingInfo ?? "",
      mealDetails: data.mealDetails ?? "",
      clientNotes: data.clientNotes ?? "",
      playlistUrl: data.playlistUrl ?? "",
      endOfNightSong: data.endOfNightSong ?? "",
      firstDanceSong: data.firstDanceSong ?? "",
      firstDanceType: data.firstDanceType ?? "",
      ceilidh: data.ceilidh,
      ceilidhLength: data.ceilidhLength ?? "",
      ceilidhStyle: data.ceilidhStyle ?? "",
    });
    setFavourites(data.preferences.favourites ?? []);
    setMustPlays(data.preferences.mustPlays ?? []);
    setDoNotPlays(data.preferences.doNotPlays ?? []);
  }, [data]);

  // ── Preference toggle ──────────────────────────────────────────────────────
  function togglePref(pref: PrefType, songId: number) {
    const setters: Record<PrefType, React.Dispatch<React.SetStateAction<number[]>>> = {
      favourites: setFavourites,
      mustPlays: setMustPlays,
      doNotPlays: setDoNotPlays,
    };
    const current: Record<PrefType, number[]> = { favourites, mustPlays, doNotPlays };

    if (pref === "mustPlays" && !mustPlays.includes(songId) && mustPlays.length >= 3) {
      setMustPlaysError("You can only pick up to 3 must-play songs.");
      return;
    }
    setMustPlaysError("");

    setters[pref]((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]
    );

    // Selecting in one category removes from the others
    if (!current[pref].includes(songId)) {
      (["favourites", "mustPlays", "doNotPlays"] as PrefType[])
        .filter((p) => p !== pref)
        .forEach((other) => setters[other]((prev) => prev.filter((id) => id !== songId)));
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (mustPlays.length > 3) {
      setMustPlaysError("You can only pick up to 3 must-play songs.");
      return;
    }
    setSaved(false);
    setSaveError("");
    try {
      await save.mutateAsync({
        ...form,
        preferences: { favourites, mustPlays, doNotPlays },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed. Please try again.");
    }
  }

  async function handleSaveAndContinue() {
    await handleSave();
    setStep("songs");
    window.scrollTo({ top: 0 });
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  const header = (
    <header
      style={{
        borderBottom: "1px solid var(--pico-muted-border-color)",
        marginBottom: "2rem",
        paddingBottom: "1rem",
      }}
    >
      <strong>Every Angle</strong>
    </header>
  );

  if (isLoading) {
    return (
      <main className="container">
        {header}
        <p aria-busy="true">Loading your event form…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container">
        {header}
        <article>
          <p>This link wasn't found. Please check the URL or contact Every Angle.</p>
        </article>
      </main>
    );
  }

  const clientName = `${data.firstName}${data.partnerName ? ` & ${data.partnerName}` : ""}`;
  const mustPlaysAtMax = mustPlays.length >= 3;
  const caps = deriveClientFormCapabilities({
    hasBand: data.hasBand,
    hasDj: data.hasDj,
    requiresMeal: data.requiresMeal,
  });

  // ── Tab bar ────────────────────────────────────────────────────────────────
  const tabs: { key: Step; label: string }[] = [
    { key: "details", label: "Event details" },
    ...(caps.showSongStep ? [{ key: "songs" as Step, label: "Song selection" }] : []),
  ];

  const tabBar = (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: "0",
        borderBottom: "2px solid var(--pico-muted-border-color)",
        marginBottom: "2rem",
      }}
    >
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          type="button"
          aria-selected={step === key}
          onClick={() => setStep(key)}
          style={{
            background: "none",
            border: "none",
            borderBottom: step === key ? "2px solid var(--pico-primary)" : "2px solid transparent",
            marginBottom: "-2px",
            padding: "0.6rem 1.25rem",
            fontWeight: step === key ? 700 : 400,
            color: step === key ? "var(--pico-primary)" : "var(--pico-muted-color)",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="container">
      {header}

      <hgroup>
        <h1>Event Form</h1>
        <p>
          {clientName} · {formatDate(data.date)}
          {data.venueName ? ` · ${data.venueName}` : ""}
        </p>
      </hgroup>

      <p style={{ color: "var(--pico-muted-color)", fontSize: "0.9rem" }}>
        Please fill in the event details and song selection forms below. Fill in what you know and
        come back any time using this link. No need to do it all at once.
      </p>

      {tabBar}

      {/* ── Step 1: Event details ── */}
      {step === "details" && (
        <div>
          <Field label="Venue name">
            <input
              type="text"
              value={form.venueName ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, venueName: e.target.value }))}
            />
          </Field>

          <Field
            label="Venue address & postcode"
            hint="If there are multiple venues please add them all."
          >
            <textarea
              value={form.location ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              rows={3}
            />
          </Field>

          <Field
            label="Contact number(s) on the day"
            hint="This could be your own phone number, the venue, wedding coordinator, celebrant, groomsman/bridesmaid, as appropriate."
          >
            <textarea
              value={form.contactNumber ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
              rows={3}
            />
          </Field>

          <Field
            label="Timings"
            hint="e.g. ceremony 2pm, drinks reception 3pm, wedding breakfast 5pm, first dance 7:30pm…"
          >
            <textarea
              value={form.timings ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, timings: e.target.value }))}
              rows={4}
            />
          </Field>

          <Field
            label="Venue parking & load-in info"
            hint="Let us know where we can park and how to access the venue for load-in."
          >
            <textarea
              value={form.parkingInfo ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, parkingInfo: e.target.value }))}
              rows={3}
            />
          </Field>

          {caps.showMealDetails && (
          <Field
            label="Meal details"
            hint="We ask that you provide meals for any videographers and photographers that you have hired. Please include details below, including timings and who will be providing the meals. Note that one of the videographers is vegan, so please double check this with us."
          >
            <textarea
              value={form.mealDetails ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, mealDetails: e.target.value }))}
              rows={4}
            />
          </Field>
          )}

          {caps.showMusicSection && (
          <>
          <h3 style={{ marginTop: "2rem" }}>Music requests</h3>

          <Field
            label="First dance / special song request"
          >
            <input
              type="text"
              value={form.firstDanceSong ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, firstDanceSong: e.target.value }))}
              placeholder="Song title – Artist"
            />
          </Field>

          {caps.showFirstDanceType && (
          <Field label="First dance: live or DJ?">
            <select
              value={form.firstDanceType ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, firstDanceType: e.target.value }))}
            >
              {FIRST_DANCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t || "please select"}
                </option>
              ))}
            </select>
          </Field>
          )}

          <Field
            label="End of the night / last song (DJ)"
            hint="Let us know how you'd like the night to end."
          >
            <textarea
              value={form.endOfNightSong ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, endOfNightSong: e.target.value }))}
              rows={2}
              placeholder="Song title – Artist"
            />
          </Field>

          <Field
            label="DJ playlist"
            hint="If you have a Spotify playlist you can paste the link here, otherwise you can list out some songs you'd like us to add to the DJ playlist."
          >
            <textarea
              value={form.playlistUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, playlistUrl: e.target.value }))}
              rows={3}
              placeholder="https://open.spotify.com/playlist/… or list songs here"
            />
          </Field>
          </>
          )}

          {caps.showBandOptions && (
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <input
                type="checkbox"
                checked={!!form.ceilidh}
                onChange={(e) => setForm((f) => ({ ...f, ceilidh: e.target.checked }))}
              />
              <span style={{ fontWeight: 600 }}>Would you like ceilidh dances?</span>
            </label>
            {form.ceilidh && (
              <>
                <p style={{ fontSize: "0.85rem", color: "var(--pico-muted-color)", marginBottom: "1rem" }}>
                  All packages include a caller. For 3-piece bookings, ceilidh music will be played from a playlist rather than performed live.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
              <Field label="Ceilidh length">
                <select
                  value={form.ceilidhLength ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, ceilidhLength: e.target.value }))}
                >
                  {CEILIDH_LENGTHS.map((t) => (
                    <option key={t} value={t}>
                      {t || "Please select"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ceilidh style">
                <select
                  value={form.ceilidhStyle ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, ceilidhStyle: e.target.value }))}
                >
                  {CEILIDH_STYLES.map((t) => (
                    <option key={t} value={t}>
                      {t || "Please select"}
                    </option>
                  ))}
                </select>
              </Field>
                </div>
              </>
            )}
          </div>
          )}

          <Field label="Anything else we should know?">
            <textarea
              value={form.clientNotes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, clientNotes: e.target.value }))}
              rows={3}
            />
          </Field>

          <SaveBar
            isPending={save.isPending}
            saved={saved}
            error={saveError}
            onSave={handleSave}
            extra={
              caps.showSongStep ? (
                <button
                  type="button"
                  className="secondary"
                  aria-busy={save.isPending}
                  disabled={save.isPending}
                  onClick={handleSaveAndContinue}
                >
                  Save &amp; continue →
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      {/* ── Step 2: Song selection ── */}
      {caps.showSongStep && step === "songs" && (
        <div>
          <button
            type="button"
            className="secondary outline"
            style={{ marginBottom: "1rem" }}
            onClick={() => setStep("details")}
          >
            ← Back to event details
          </button>
          <p>
            It's time to customise the band's set list! Take a look through our song list and pick
            your favourites. We'll use these as a guide when putting your set together. You can
            also highlight up to three songs you'd especially like to hear, and flag anything you'd
            rather we didn't play.
          </p>
          <p style={{ color: "var(--pico-muted-color)", fontSize: "0.9rem" }}>
            There's no pressure to pick a lot. Even one or two favourites is really helpful. You
            can always come back and add more later.
          </p>

          <div className="cf-legend">
            <span>
              <span style={{ fontWeight: 600, color: "var(--pico-primary)" }}>♥ Fav</span> — I'd love to hear this if possible
            </span>
            <span>
              <span style={{ fontWeight: 600, color: "#2e7d32" }}>★ Must</span> — definitely play this (max 3)
            </span>
            <span>
              <span style={{ fontWeight: 600, color: "#b71c1c" }}>✕ DNP</span> — do not play
            </span>
          </div>

          {mustPlaysError && (
            <p role="alert" style={{ color: "var(--pico-del-color)", fontWeight: 600 }}>
              {mustPlaysError}
            </p>
          )}
          {mustPlays.length > 0 && (
            <p style={{ fontSize: "0.85rem", color: "#2e7d32" }}>
              Must-plays selected: {mustPlays.length} / 3
            </p>
          )}

          {data.songGroups.map((group) => (
            <div key={group.genre} style={{ marginTop: "1rem" }}>
              <p
                style={{
                  fontWeight: 700,
                  margin: "0 0 0.25rem",
                  color: "var(--pico-color)",
                  fontSize: "0.95rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {group.genre}
              </p>
              <div style={{ paddingLeft: "1rem" }}>
                {group.songs.map((song) => (
                  <SongRow
                    key={song.id}
                    id={song.id}
                    title={song.title}
                    artist={song.artist}
                    favourites={favourites}
                    mustPlays={mustPlays}
                    doNotPlays={doNotPlays}
                    mustPlaysAtMax={mustPlaysAtMax}
                    onToggle={togglePref}
                  />
                ))}
              </div>
            </div>
          ))}

          <SaveBar
            isPending={save.isPending}
            saved={saved}
            error={saveError}
            onSave={handleSave}
          />
        </div>
      )}
    </main>
  );
}
