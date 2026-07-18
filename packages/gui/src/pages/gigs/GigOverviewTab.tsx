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

const STATUS_OPTIONS = ["enquiry", "confirmed", "completed", "cancelled", "postponed"];

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
            {gig.location && <><dt>Address</dt><dd>{gig.location}</dd></>}
            <dt>Quoted Price</dt><dd><MoneyDisplay pennies={gig.totalPrice} /></dd>
            {gig.showcaseId && <><dt>Source</dt><dd><Link to={`/showcases/${gig.showcaseId}`}>{gig.showcaseName ?? "Showcase"}</Link></dd></>}
            {gig.description && <><dt>Notes</dt><dd>{gig.description}</dd></>}
          </dl>
        </article>
      ) : (
        <article>
          <form onSubmit={saveEdit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              <FormField label="First Name" value={editForm.firstName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} required />
              <FormField label="Last Name" value={editForm.lastName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} />
              <FormField label="Partner" value={editForm.partnerName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, partnerName: e.target.value }))} />
              <FormField label="Email" type="email" value={editForm.email ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
              <FormField label="Phone" type="tel" value={editForm.phone ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              <FormField label="Date" type="date" value={toInputDate(editForm.date)} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} required />
              <FormField label="Venue" value={editForm.venueName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, venueName: e.target.value }))} />
              <FormField label="Location" value={editForm.location ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
              <FormField as="select" label="Status" value={editForm.status ?? "enquiry"} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </FormField>
              <MoneyField label="Quoted Price" value={editForm.totalPrice} onChange={(pennies) => setEditForm((f) => ({ ...f, totalPrice: pennies }))} />
            </div>
            <FormField as="textarea" label="Description" value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} />

            <h3 style={{ marginTop: "1.5rem" }}>Event details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              <FormField label="Contact number" value={editForm.contactNumber ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, contactNumber: e.target.value }))} />
              <FormField label="End of night song" value={editForm.endOfNightSong ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, endOfNightSong: e.target.value }))} />
              <FormField label="First dance / song request" value={editForm.firstDanceSong ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, firstDanceSong: e.target.value }))} />
              <FormField label="First dance type" value={editForm.firstDanceType ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, firstDanceType: e.target.value }))} />
              <FormField label="Ceilidh length" value={editForm.ceilidhLength ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, ceilidhLength: e.target.value }))} />
              <FormField label="Ceilidh style" value={editForm.ceilidhStyle ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, ceilidhStyle: e.target.value }))} />
            </div>
            <label style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={!!editForm.ceilidh} onChange={(e) => setEditForm((f) => ({ ...f, ceilidh: e.target.checked }))} /> Ceilidh
            </label>
            <FormField as="textarea" label="Timings" value={editForm.timings ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, timings: e.target.value }))} rows={3} />
            <FormField as="textarea" label="Parking info" value={editForm.parkingInfo ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, parkingInfo: e.target.value }))} rows={3} />
            <FormField as="textarea" label="Meal details" value={editForm.mealDetails ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, mealDetails: e.target.value }))} rows={2} />
            <FormField as="textarea" label="Client notes" value={editForm.clientNotes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, clientNotes: e.target.value }))} rows={3} />
            <FormField as="textarea" label="Performer notes" value={editForm.performerNotes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, performerNotes: e.target.value }))} rows={3} />
            <FormField as="textarea" label="DJ playlist" rows={4} value={editForm.playlistUrl ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, playlistUrl: e.target.value }))} />

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
            gig.ceilidh,
            gig.ceilidhLength,
            gig.ceilidhStyle,
          ].every((v) => !v) ? (
            <p style={{ color: "var(--pico-muted-color)" }}>No event details recorded yet.</p>
          ) : (
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
              {gig.timings && <><dt>Timings</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.timings}</dd></>}
              {gig.contactNumber && <><dt>Contact number</dt><dd>{gig.contactNumber}</dd></>}
              {gig.parkingInfo && <><dt>Parking info</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.parkingInfo}</dd></>}
              {gig.mealDetails && <><dt>Meal details</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.mealDetails}</dd></>}
              {gig.clientNotes && <><dt>Client notes</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.clientNotes}</dd></>}
              {gig.performerNotes && <><dt>Performer notes</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.performerNotes}</dd></>}
              {gig.playlistUrl && <><dt>DJ playlist</dt><dd style={{ whiteSpace: "pre-wrap" }}><PlaylistValue value={gig.playlistUrl} /></dd></>}
              {gig.endOfNightSong && <><dt>End of night</dt><dd>{gig.endOfNightSong}</dd></>}
              {gig.firstDanceSong && <><dt>First dance</dt><dd>{gig.firstDanceSong}</dd></>}
              {gig.firstDanceType && <><dt>First dance type</dt><dd>{gig.firstDanceType}</dd></>}
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
