import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/Toast.js";
import {
  useGig,
  useUpdateGig,
  useDeleteGig,
  useSetGigServices,
} from "../../api/hooks/useGigs.js";
import { useServices } from "../../api/hooks/useServices.js";
import { useGigRoles } from "../../api/hooks/useAssignedRoles.js";
import { usePeople } from "../../api/hooks/usePeople.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import StatusBadge from "../../components/StatusBadge.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import MoneyField from "../../components/MoneyField.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import { formatPersonName } from "../../utils/people.js";
import type { UpdateGigRequest } from "@get-down/shared";

const STATUS_OPTIONS = ["enquiry", "confirmed", "completed", "cancelled", "postponed"];

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const gigId = Number(id);
  const navigate = useNavigate();

  const { data: gig, isLoading, error } = useGig(gigId);
  const updateGig = useUpdateGig();
  const deleteGig = useDeleteGig();
  const setGigServices = useSetGigServices();
  const { data: allServices = [] } = useServices();
  const { data: roles = [] } = useGigRoles(gigId);
  const { data: people = [] } = usePeople();
  const { showToast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateGigRequest>({});
  const [showDeleteGig, setShowDeleteGig] = useState(false);

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error || !gig) return <main className="container"><ErrorBanner error={error ?? "Gig not found"} /></main>;

  function startEdit() {
    setEditForm({
      firstName: gig!.firstName,
      lastName: gig!.lastName,
      partnerName: gig!.partnerName,
      email: gig!.email,
      phone: gig!.phone,
      date: gig!.date,
      venueName: gig!.venueName,
      location: gig!.location,
      description: gig!.description,
      status: gig!.status,
      totalPrice: gig!.totalPrice,
      timings: gig!.timings,
      contactNumber: gig!.contactNumber,
      parkingInfo: gig!.parkingInfo,
      clientNotes: gig!.clientNotes,
      performerNotes: gig!.performerNotes,
      playlistUrl: gig!.playlistUrl,
      endOfNightSong: gig!.endOfNightSong,
      firstDanceSong: gig!.firstDanceSong,
      firstDanceType: gig!.firstDanceType,
      ceilidh: gig!.ceilidh ?? false,
      ceilidhLength: gig!.ceilidhLength,
      ceilidhStyle: gig!.ceilidhStyle,
      mealDetails: gig!.mealDetails,
    });
    setEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    await updateGig.mutateAsync({ id: gigId, input: editForm });
    setEditing(false);
  }

  async function handleDeleteGig() {
    await deleteGig.mutateAsync(gigId);
    navigate("/gigs");
  }

  return (
    <main className="container">
      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to="/gigs">Gigs</Link></li>
          <li>{gig.firstName} {gig.lastName}</li>
        </ul>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        <hgroup>
          <h1>{gig.firstName} {gig.lastName}</h1>
          <p><StatusBadge status={gig.status} /> {gig.venueName && `· ${gig.venueName}`}</p>
        </hgroup>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="secondary" onClick={startEdit}>Edit</button>
          <button className="contrast outline" onClick={() => setShowDeleteGig(true)}>Delete</button>
        </div>
      </div>

      {/* Client form link */}
      {gig.clientToken && (
        <article style={{ padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem" }}>
            <strong>Client form</strong>
            {gig.formSavedAt
              ? <span style={{ color: "var(--pico-muted-color)", marginLeft: "0.5rem" }}>· saved {new Date(gig.formSavedAt).toLocaleString()}</span>
              : <span style={{ color: "var(--pico-muted-color)", marginLeft: "0.5rem" }}>· not yet filled in</span>}
          </span>
          <button
            className="secondary outline"
            style={{ padding: "0.2em 0.8em", fontSize: "0.85rem" }}
            onClick={async () => {
              const url = `${window.location.origin}/c/${gig.clientToken}`;
              try {
                await navigator.clipboard.writeText(url);
                showToast("Client form link copied!", "success");
              } catch {
                showToast("Could not copy link. Please copy it manually.", "error");
              }
            }}
          >
            Copy link
          </button>
        </article>
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
            <div>
              <label htmlFor="playlistUrl" style={{ display: "block", marginBottom: "0.25rem" }}>DJ playlist URL</label>
              <input
                id="playlistUrl"
                type="url"
                value={editForm.playlistUrl ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, playlistUrl: e.target.value }))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="submit" aria-busy={updateGig.isPending} disabled={updateGig.isPending}>Save</button>
              <button type="button" className="secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        </article>
      )}

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
              {gig.playlistUrl && <><dt>DJ playlist</dt><dd><a href={gig.playlistUrl} target="_blank" rel="noopener noreferrer">{gig.playlistUrl}</a></dd></>}
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

      {/* Services */}
      <section>
        <h2>Services</h2>
        {gig.services && gig.services.length > 0 ? (
          <table>
            <thead><tr><th>Service</th><th>Price to Client</th><th></th></tr></thead>
            <tbody>
              {gig.services.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td><MoneyDisplay pennies={s.priceToClient} /></td>
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
        {(() => {
          const attachedIds = new Set((gig.services ?? []).map(s => s.id));
          const available = allServices.filter(s => !attachedIds.has(s.id));
          if (!available.length) return null;
          return (
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
          );
        })()}
      </section>

      {/* Roles & Fees link */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Roles &amp; Fees</h2>
          <Link to={`/gigs/${gigId}/roles`} role="button" className="secondary outline" style={{ padding: "0.3em 0.8em" }}>
            Manage Roles &amp; Fees →
          </Link>
        </div>
        {roles.length > 0 ? (
          <table>
            <thead><tr><th>Role</th><th>Person</th></tr></thead>
            <tbody>
              {roles.map((r) => {
                const person = r.personId ? people.find((p) => p.id === r.personId) : undefined;
                return (
                  <tr key={r.id}>
                    <td>{r.roleName}</td>
                    <td>{person ? formatPersonName(person) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--pico-muted-color)" }}>No roles assigned yet.</p>
        )}
      </section>

      {/* Set List link */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Set List</h2>
          <Link to={`/gigs/${gigId}/set-list`} role="button" className="secondary outline" style={{ padding: "0.3em 0.8em" }}>
            Manage Set List →
          </Link>
        </div>
      </section>

      {/* Invoice & Billing link */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Invoice &amp; Billing</h2>
          <Link to={`/gigs/${gigId}/invoices`} role="button" className="secondary outline" style={{ padding: "0.3em 0.8em" }}>
            Manage Invoice &amp; Billing →
          </Link>
        </div>
      </section>

      <ConfirmDelete
        open={showDeleteGig}
        itemName={`${gig.firstName} ${gig.lastName ?? ""}`.trim()}
        onConfirm={handleDeleteGig}
        onCancel={() => setShowDeleteGig(false)}
        loading={deleteGig.isPending}
      />
    </main>
  );
}
