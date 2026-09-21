import type { Gig, UpdateGigRequest } from "@get-down/shared";
import { Link } from "react-router-dom";
import { useServices } from "../../api/hooks/useServices.js";
import { useSetGigServices } from "../../api/hooks/useGigs.js";
import CopyLinkBanner from "../../components/CopyLinkBanner.js";
import FormField from "../../components/FormField.js";
import MoneyField from "../../components/MoneyField.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import { isUrl } from "../../utils/url.js";
import {
  CEILIDH_LENGTHS,
  CEILIDH_STYLES,
  FIRST_DANCE_TYPES,
  STATUS_OPTIONS,
  isLegacyOption,
  optionLabel,
  optionsWithLegacyValue,
} from "./gigFormOptions.js";

interface Props {
  gig: Gig;
  gigId: number;
  editing: boolean;
  editForm: UpdateGigRequest;
  setEditForm: React.Dispatch<React.SetStateAction<UpdateGigRequest>>;
  saveEdit: (e: React.FormEvent) => Promise<void>;
  cancelEdit: () => void;
  isPending: boolean;
}

export default function GigOverviewTab({ gig, gigId, editing, editForm, setEditForm, saveEdit, cancelEdit, isPending }: Props) {
  const { data: allServices = [] } = useServices();
  const setGigServices = useSetGigServices();

  const attachedIds = new Set((gig.services ?? []).map(s => s.id));
  const available = allServices.filter(s => !attachedIds.has(s.id));

  return (
    <>
      {gig.clientToken && (
        <CopyLinkBanner
          url={`${window.location.origin}/c/${gig.clientToken}`}
          label="Client form"
          status={gig.formSavedAt ? `· saved ${new Date(gig.formSavedAt).toLocaleString()}` : "· not yet filled in"}
          successMessage="Client form link copied!"
        />
      )}

      {!editing ? (
        <article>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
            <dt>Date</dt><dd>{formatDate(gig.date)}</dd>
            <dt>Partner</dt><dd>{gig.partnerName ?? "—"}</dd>
            <dt>Email</dt><dd>{gig.email ?? "—"}</dd>
            <dt>Phone</dt><dd>{gig.phone ?? "—"}</dd>
            {gig.venueName && <><dt>Venue</dt><dd>{gig.venueName}</dd></>}
            {gig.location && <><dt>Address</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.location}</dd></>}
            <dt>Quoted Price</dt><dd><MoneyDisplay pennies={gig.totalPrice} /></dd>
            {gig.showcaseId && <><dt>Source</dt><dd><Link to={`/showcases/${gig.showcaseId}`}>{gig.showcaseName ?? "Showcase"}</Link></dd></>}
            {gig.description && <><dt>Notes</dt><dd>{gig.description}</dd></>}
          </dl>
        </article>
      ) : (
        <article>
          <form onSubmit={saveEdit}>
            <h3>Gig details</h3>
            <div style={gridStyle}>
              <FormField label="First name" value={editForm.firstName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} required />
              <FormField label="Last name" value={editForm.lastName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} />
              <FormField label="Partner" value={editForm.partnerName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, partnerName: e.target.value }))} />
              <FormField label="Email" type="email" value={editForm.email ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
              <FormField label="Phone" type="tel" value={editForm.phone ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              <FormField label="Date" type="date" value={toInputDate(editForm.date)} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} required />
              <FormField as="select" label="Status" value={editForm.status ?? "enquiry"} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </FormField>
              <MoneyField label="Quoted price" value={editForm.totalPrice} onChange={(totalPrice) => setEditForm((f) => ({ ...f, totalPrice }))} />
            </div>
            <FormField as="textarea" label="Description" value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} />

            <h3>Venue and logistics</h3>
            <FormField label="Venue name" value={editForm.venueName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, venueName: e.target.value }))} />
            <FormField as="textarea" label="Venue address and postcode" value={editForm.location ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} rows={3} />
            <FormField as="textarea" label="Contact number(s) on the day" value={editForm.contactNumber ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, contactNumber: e.target.value }))} rows={2} />
            <FormField as="textarea" label="Timings" value={editForm.timings ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, timings: e.target.value }))} rows={4} />
            <FormField as="textarea" label="Venue parking and load-in information" value={editForm.parkingInfo ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, parkingInfo: e.target.value }))} rows={3} />
            <FormField as="textarea" label="Meal details" value={editForm.mealDetails ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, mealDetails: e.target.value }))} rows={4} />

            <h3>Music requests</h3>
            <div style={gridStyle}>
              <FormField label="First dance / special song request" value={editForm.firstDanceSong ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, firstDanceSong: e.target.value }))} />
              <LegacySelect label="First dance: live or DJ?" value={editForm.firstDanceType} options={FIRST_DANCE_TYPES} onChange={(value) => setEditForm((f) => ({ ...f, firstDanceType: value }))} />
              <FormField label="Walk-on song" value={editForm.walkOnSong ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, walkOnSong: e.target.value }))} />
              <FormField label="Introduction wording" value={editForm.introductionWording ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, introductionWording: e.target.value }))} />
            </div>
            <FormField as="textarea" label="End of the night / last song" value={editForm.endOfNightSong ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, endOfNightSong: e.target.value }))} rows={2} />
            <FormField as="textarea" label="DJ playlist" value={editForm.playlistUrl ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, playlistUrl: e.target.value }))} rows={4} />

            <h3>Ceremony music</h3>
            <FormField as="textarea" label="Ceremony song choices" value={editForm.ceremonySongChoices ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, ceremonySongChoices: e.target.value }))} rows={3} />
            <FormField as="textarea" label="Reception music details" value={editForm.receptionMusicDetails ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, receptionMusicDetails: e.target.value }))} rows={3} />

            <h3>Bagpipes</h3>
            <div style={gridStyle}>
              <FormField label="Piper tune requests" value={editForm.piperTuneRequests ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, piperTuneRequests: e.target.value }))} />
            </div>
            <FormField as="textarea" label="Bagpipes details" value={editForm.bagpipesDetails ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, bagpipesDetails: e.target.value }))} rows={3} />

            <h3>Videography</h3>
            <FormField as="textarea" label="Speech microphone and PA requirements" value={editForm.speechesPaRequirements ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, speechesPaRequirements: e.target.value }))} rows={3} />
            <FormField as="textarea" label="Ceremony readings or unusual events" value={editForm.ceremonyReadingsNotes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, ceremonyReadingsNotes: e.target.value }))} rows={3} />

            <h3>Getting ready</h3>
            <FormField as="textarea" label="Preparation address and postcode" value={editForm.preparationLocations ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, preparationLocations: e.target.value }))} rows={3} />

            <h3>Ceilidh</h3>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input type="checkbox" checked={!!editForm.ceilidh} onChange={(e) => setEditForm((f) => ({ ...f, ceilidh: e.target.checked }))} /> Ceilidh dances requested
            </label>
            <div style={gridStyle}>
              <LegacySelect label="Ceilidh length" value={editForm.ceilidhLength} options={CEILIDH_LENGTHS} onChange={(value) => setEditForm((f) => ({ ...f, ceilidhLength: value }))} />
              <LegacySelect label="Ceilidh style" value={editForm.ceilidhStyle} options={CEILIDH_STYLES} onChange={(value) => setEditForm((f) => ({ ...f, ceilidhStyle: value }))} />
            </div>

            <h3>Notes and delivery</h3>
            <FormField as="textarea" label="Anything else (visible to client)" value={editForm.clientNotes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, clientNotes: e.target.value }))} rows={4} />
            <FormField as="textarea" label="Performer notes (visible to performers, hidden from client)" value={editForm.performerNotes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, performerNotes: e.target.value }))} rows={4} />
            <FormField as="textarea" label="Private notes (visible only to staff)" value={editForm.privateNotes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, privateNotes: e.target.value }))} rows={4} />

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="submit" aria-busy={isPending} disabled={isPending}>Save</button>
              <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>
            </div>
          </form>
        </article>
      )}

      {/* Services */}
      <section>
        <h2>Services</h2>
        {gig.services && gig.services.length > 0 ? (
          <table>
            <thead><tr><th>Service</th><th></th></tr></thead>
            <tbody>
              {gig.services.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <button
                      className="contrast outline"
                      style={{ padding: "0.2em 0.5em" }}
                      aria-busy={setGigServices.isPending}
                      onClick={() => {
                        const remaining = (gig.services ?? []).filter(sv => sv.id !== s.id).map(sv => sv.id);
                        setGigServices.mutate({ gigId, serviceIds: remaining });
                      }}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No services attached to this gig.</p>}
        {available.length > 0 && (
          <select
            style={{ marginTop: "0.5rem" }}
            value=""
            onChange={e => {
              const id = Number(e.target.value);
              if (!id) return;
              const updated = [...(gig.services ?? []).map(s => s.id), id];
              setGigServices.mutate({ gigId, serviceIds: updated });
            }}
          >
            <option value="">+ Add service…</option>
            {available.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </section>

      {/* Event details (view mode) */}
      {!editing && (
        <section>
          <h2>Event details</h2>
          {[
            gig.timings,
            gig.contactNumber,
            gig.parkingInfo,
            gig.mealDetails,
            gig.clientNotes,
            gig.performerNotes,
            gig.playlistUrl,
            gig.endOfNightSong,
            gig.firstDanceSong,
            gig.firstDanceType,
            gig.ceremonySongChoices, gig.receptionMusicDetails, gig.walkOnSong, gig.introductionWording, gig.piperTuneRequests, gig.bagpipesDetails, gig.speechesPaRequirements, gig.ceremonyReadingsNotes, gig.preparationLocations,
            gig.ceilidh,
            gig.ceilidhLength,
            gig.ceilidhStyle,
          ].every((v) => !v) ? (
            <p style={{ color: "var(--pico-muted-color)" }}>No event details recorded yet.</p>
          ) : (
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
              {gig.timings && <><dt>Timings</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.timings}</dd></>}
              {gig.contactNumber && <><dt>Contact number</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.contactNumber}</dd></>}
              {gig.parkingInfo && <><dt>Parking info</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.parkingInfo}</dd></>}
              {gig.mealDetails && <><dt>Meal details</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.mealDetails}</dd></>}
              {gig.clientNotes && <><dt>Anything else (visible to client)</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.clientNotes}</dd></>}
              {gig.performerNotes && <><dt>Performer notes (visible to performers, hidden from client)</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.performerNotes}</dd></>}
              {gig.privateNotes && <><dt>Private notes (visible only to staff)</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.privateNotes}</dd></>}
              {gig.playlistUrl && <><dt>DJ playlist</dt><dd style={{ whiteSpace: "pre-wrap" }}><PlaylistValue value={gig.playlistUrl} /></dd></>}
              {gig.endOfNightSong && <><dt>End of night</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.endOfNightSong}</dd></>}
              {gig.firstDanceSong && <><dt>First dance</dt><dd>{gig.firstDanceSong}</dd></>}
              {gig.firstDanceType && <><dt>First dance type</dt><dd>{gig.firstDanceType}</dd></>}
              {gig.ceremonySongChoices && <><dt>Ceremony song choices</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.ceremonySongChoices}</dd></>}
              {gig.receptionMusicDetails && <><dt>Reception music details</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.receptionMusicDetails}</dd></>}
              {gig.walkOnSong && <><dt>Walk-on song</dt><dd>{gig.walkOnSong}</dd></>}
               {gig.introductionWording && <><dt>Introduction wording</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.introductionWording}</dd></>}
               {gig.piperTuneRequests && <><dt>Piper tune requests</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.piperTuneRequests}</dd></>}
              {gig.bagpipesDetails && <><dt>Bagpipes details</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.bagpipesDetails}</dd></>}
               {gig.speechesPaRequirements && <><dt>Speech PA requirements</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.speechesPaRequirements}</dd></>}
              {gig.ceremonyReadingsNotes && <><dt>Ceremony readings or unusual events</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.ceremonyReadingsNotes}</dd></>}
               {gig.preparationLocations && <><dt>Preparation location(s)</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.preparationLocations}</dd></>}
              <dt>Ceilidh</dt><dd>{gig.ceilidh ? "Yes" : "No"}</dd>
              {gig.ceilidhLength && <><dt>Ceilidh length</dt><dd>{gig.ceilidhLength}</dd></>}
              {gig.ceilidhStyle && <><dt>Ceilidh style</dt><dd>{gig.ceilidhStyle}</dd></>}
            </dl>
          )}
        </section>
      )}
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PlaylistValue({ value }: { value: string }) {
  if (isUrl(value)) {
    return <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>;
  }
  return <>{value}</>;
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "0.75rem 1rem",
};

function LegacySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const values = optionsWithLegacyValue(options, value);
  const isLegacy = isLegacyOption(options, value);

  return (
    <FormField as="select" label={label} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      {values.map((option) => (
        <option key={option} value={option}>
          {isLegacy && option === value ? `${option} (existing value)` : optionLabel(option)}
        </option>
      ))}
    </FormField>
  );
}
