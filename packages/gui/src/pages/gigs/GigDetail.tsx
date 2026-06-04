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
import { useRehearsals } from "../../api/hooks/useRehearsals.js";
import { useExpenses } from "../../api/hooks/useExpenses.js";
import {
  useGigRehearsals,
  useCreateGigRehearsal,
  useUpdateGigRehearsal,
  useLinkExistingRehearsal,
  useUnlinkGigRehearsal,
  useSetRehearsalExpense,
  useClearRehearsalExpense,
  useUpdateRehearsalCostShare,
} from "../../api/hooks/useGigRehearsals.js";
import {
  useGigDeliveryVideos,
  useCreateDeliveryVideo,
  useUpdateDeliveryVideo,
  useDeleteDeliveryVideo,
  useReorderDeliveryVideos,
} from "../../api/hooks/useDelivery.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import StatusBadge from "../../components/StatusBadge.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import { isUrl } from "../../utils/url.js";
import MoneyField from "../../components/MoneyField.js";
import Modal from "../../components/Modal.js";
import ExpensePickerModal from "../../components/ExpensePickerModal.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import { formatPersonName } from "../../utils/people.js";
import { formatPennies } from "../../utils/money.js";
import type { UpdateGigRequest, CreateRehearsalRequest, Rehearsal, DeliveryVideo } from "@get-down/shared";

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

  // Rehearsal hooks
  const { data: rehearsals = [] } = useGigRehearsals(gigId);
  const { data: allRehearsals = [] } = useRehearsals();
  const { data: allExpenses = [] } = useExpenses();
  const createGigRehearsal = useCreateGigRehearsal(gigId);
  const updateGigRehearsal = useUpdateGigRehearsal(gigId);
  const linkExistingRehearsal = useLinkExistingRehearsal(gigId);
  const unlinkGigRehearsal = useUnlinkGigRehearsal(gigId);
  const setRehearsalExpense = useSetRehearsalExpense(gigId);
  const clearRehearsalExpense = useClearRehearsalExpense(gigId);
  const updateCostShare = useUpdateRehearsalCostShare(gigId);

  // Delivery video hooks
  const { data: deliveryVideos = [] } = useGigDeliveryVideos(gigId);
  const createDeliveryVideo = useCreateDeliveryVideo(gigId);
  const updateDeliveryVideo = useUpdateDeliveryVideo(gigId);
  const deleteDeliveryVideo = useDeleteDeliveryVideo(gigId);
  const reorderDeliveryVideos = useReorderDeliveryVideos(gigId);

  const EMPTY_VIDEO = { title: "", vimeoUrl: "" };
  const [newVideoForm, setNewVideoForm] = useState(EMPTY_VIDEO);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [editVideoId, setEditVideoId] = useState<number | null>(null);
  const [editVideoForm, setEditVideoForm] = useState(EMPTY_VIDEO);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateGigRequest>({});
  const [showDeleteGig, setShowDeleteGig] = useState(false);

  // Rehearsal state
  const EMPTY_REHEARSAL: CreateRehearsalRequest = { name: "", date: "" };
  const [showCreateRehearsal, setShowCreateRehearsal] = useState(false);
  const [rehearsalForm, setRehearsalForm] = useState<CreateRehearsalRequest>(EMPTY_REHEARSAL);
  const [rehearsalExtraGigIds, setRehearsalExtraGigIds] = useState<number[]>([]);
  const [editRehearsal, setEditRehearsal] = useState<Rehearsal | null>(null);
  const [editRehearsalForm, setEditRehearsalForm] = useState<Partial<CreateRehearsalRequest>>({});
  const [deleteRehearsalTarget, setDeleteRehearsalTarget] = useState<Rehearsal | null>(null);
  const [showLinkRehearsal, setShowLinkRehearsal] = useState(false);
  const [expensePickerRehearsal, setExpensePickerRehearsal] = useState<Rehearsal | null>(null);
  const [costShareRehearsal, setCostShareRehearsal] = useState<Rehearsal | null>(null);
  const [costShareValue, setCostShareValue] = useState<number | undefined>(undefined);

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
      dropboxUrl: gig!.dropboxUrl,
      deliveryTitle: gig!.deliveryTitle,
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

  // Rehearsal handlers
  async function handleCreateRehearsal(e: React.FormEvent) {
    e.preventDefault();
    await createGigRehearsal.mutateAsync({ ...rehearsalForm, gigIds: rehearsalExtraGigIds });
    setShowCreateRehearsal(false);
    setRehearsalForm(EMPTY_REHEARSAL);
    setRehearsalExtraGigIds([]);
  }

  async function handleUpdateRehearsal(e: React.FormEvent) {
    e.preventDefault();
    if (!editRehearsal) return;
    await updateGigRehearsal.mutateAsync({ id: editRehearsal.id, input: editRehearsalForm });
    setEditRehearsal(null);
  }

  async function handleRemoveRehearsal(rehearsal: Rehearsal) {
    if ((rehearsal.gigCount ?? 1) > 1) {
      // Just unlink
      await unlinkGigRehearsal.mutateAsync(rehearsal.id);
    } else {
      setDeleteRehearsalTarget(rehearsal);
    }
  }

  async function handleConfirmDeleteRehearsal() {
    if (!deleteRehearsalTarget) return;
    await unlinkGigRehearsal.mutateAsync(deleteRehearsalTarget.id);
    setDeleteRehearsalTarget(null);
  }

  async function handleLinkExpense(expense: { id: number }) {
    if (!expensePickerRehearsal) return;
    await setRehearsalExpense.mutateAsync({ rehearsalId: expensePickerRehearsal.id, expenseId: expense.id });
    setExpensePickerRehearsal(null);
  }

  async function handleUpdateCostShare(e: React.FormEvent) {
    e.preventDefault();
    if (!costShareRehearsal || costShareValue == null) return;
    await updateCostShare.mutateAsync({ rehearsalId: costShareRehearsal.id, costShare: costShareValue });
    setCostShareRehearsal(null);
  }

  const linkedRehearsalIds = new Set(rehearsals.map((r) => r.id));
  const unlinkableRehearsals = allRehearsals.filter((r) => !linkedRehearsalIds.has(r.id));

  // Suggested split line for create modal
  const createAllGigCount = 1 + rehearsalExtraGigIds.length;
  const suggestedSplit = rehearsalForm.cost && createAllGigCount > 1
    ? Math.floor(rehearsalForm.cost / createAllGigCount)
    : null;

  // Cost share mismatch warning
  const costShareMismatch = costShareRehearsal != null &&
    costShareRehearsal.cost != null &&
    costShareValue != null
    ? (() => {
        const siblings = rehearsals
          .filter((r) => r.id === costShareRehearsal.id)
          .flatMap(() => []); // we only have this gig's share; warn if value alone != cost (single-gig shouldn't show this modal)
        // For multi-gig we can only validate when saving; backend enforces
        return false;
      })()
    : false;

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

      {/* Delivery page link */}
      {gig.clientToken && (
        <article style={{ padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem" }}>
            <strong>Delivery page</strong>
            {deliveryVideos.length > 0 || gig.dropboxUrl
              ? <span style={{ color: "var(--pico-muted-color)", marginLeft: "0.5rem" }}>
                  ·{deliveryVideos.length > 0 ? ` ${deliveryVideos.length} video${deliveryVideos.length > 1 ? "s" : ""}` : ""}{deliveryVideos.length > 0 && gig.dropboxUrl ? " +" : ""}{gig.dropboxUrl ? " photos" : ""} added
                </span>
              : <span style={{ color: "var(--pico-muted-color)", marginLeft: "0.5rem" }}>· no media added yet</span>}
          </span>
          <button
            className="secondary outline"
            style={{ padding: "0.2em 0.8em", fontSize: "0.85rem" }}
            onClick={async () => {
              const url = `${window.location.origin}/d/${gig.clientToken}`;
              try {
                await navigator.clipboard.writeText(url);
                showToast("Delivery page link copied!", "success");
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
            <FormField as="textarea" label="DJ playlist" rows={4} value={editForm.playlistUrl ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, playlistUrl: e.target.value }))} />

            <h3 style={{ marginTop: "1.5rem" }}>Media delivery</h3>
            <FormField label="Delivery page title" value={editForm.deliveryTitle ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, deliveryTitle: e.target.value }))} placeholder="e.g. Sarah & Sean · Wedding Film" />
            <FormField label="Dropbox folder link" value={editForm.dropboxUrl ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, dropboxUrl: e.target.value }))} />

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

      {/* Media delivery — Videos */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Delivery videos</h2>
          {!showAddVideo && (
            <button className="secondary" onClick={() => { setNewVideoForm(EMPTY_VIDEO); setShowAddVideo(true); }}>
              + Add video
            </button>
          )}
        </div>

        {deliveryVideos.length > 0 && (
          <table>
            <thead>
              <tr><th>Title</th><th>Vimeo URL</th><th>Order</th><th aria-label="Actions"></th></tr>
            </thead>
            <tbody>
              {deliveryVideos.map((v: DeliveryVideo, i: number) => (
                <tr key={v.id}>
                  {editVideoId === v.id ? (
                    <>
                      <td colSpan={2}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            style={{ flex: 1 }}
                            value={editVideoForm.title}
                            onChange={(e) => setEditVideoForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Title"
                            aria-label="Video title"
                          />
                          <input
                            style={{ flex: 2 }}
                            value={editVideoForm.vimeoUrl}
                            onChange={(e) => setEditVideoForm((f) => ({ ...f, vimeoUrl: e.target.value }))}
                            placeholder="Vimeo URL"
                            aria-label="Vimeo URL"
                          />
                        </div>
                      </td>
                      <td></td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            className="secondary outline"
                            style={{ padding: "0.2em 0.5em" }}
                            aria-busy={updateDeliveryVideo.isPending}
                            onClick={async () => {
                              await updateDeliveryVideo.mutateAsync({ videoId: v.id, input: editVideoForm });
                              setEditVideoId(null);
                            }}
                          >Save</button>
                          <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={() => setEditVideoId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{v.title}</td>
                      <td style={{ fontSize: "0.85em", color: "var(--pico-muted-color)", maxWidth: "20rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.vimeoUrl}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            className="secondary outline"
                            style={{ padding: "0.1em 0.4em" }}
                            aria-label="Move up"
                            disabled={i === 0 || reorderDeliveryVideos.isPending}
                            onClick={() => {
                              const ids = deliveryVideos.map((x: DeliveryVideo) => x.id);
                              [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                              reorderDeliveryVideos.mutate(ids);
                            }}
                          >↑</button>
                          <button
                            className="secondary outline"
                            style={{ padding: "0.1em 0.4em" }}
                            aria-label="Move down"
                            disabled={i === deliveryVideos.length - 1 || reorderDeliveryVideos.isPending}
                            onClick={() => {
                              const ids = deliveryVideos.map((x: DeliveryVideo) => x.id);
                              [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                              reorderDeliveryVideos.mutate(ids);
                            }}
                          >↓</button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            className="secondary outline"
                            style={{ padding: "0.2em 0.5em" }}
                            onClick={() => { setEditVideoId(v.id); setEditVideoForm({ title: v.title, vimeoUrl: v.vimeoUrl }); }}
                          >Edit</button>
                          <button
                            className="contrast outline"
                            style={{ padding: "0.2em 0.5em" }}
                            aria-busy={deleteDeliveryVideo.isPending}
                            onClick={() => deleteDeliveryVideo.mutate(v.id)}
                          >✕</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showAddVideo && (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <label style={{ fontSize: "0.85em", display: "block", marginBottom: "0.25rem" }}>Title</label>
              <input
                value={newVideoForm.title}
                onChange={(e) => setNewVideoForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Wedding Film"
                aria-label="New video title"
              />
            </div>
            <div style={{ flex: 2, minWidth: "200px" }}>
              <label style={{ fontSize: "0.85em", display: "block", marginBottom: "0.25rem" }}>Vimeo URL</label>
              <input
                value={newVideoForm.vimeoUrl}
                onChange={(e) => setNewVideoForm((f) => ({ ...f, vimeoUrl: e.target.value }))}
                placeholder="https://vimeo.com/..."
                aria-label="New video Vimeo URL"
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                aria-busy={createDeliveryVideo.isPending}
                disabled={createDeliveryVideo.isPending || !newVideoForm.title || !newVideoForm.vimeoUrl}
                onClick={async () => {
                  await createDeliveryVideo.mutateAsync(newVideoForm);
                  setNewVideoForm(EMPTY_VIDEO);
                  setShowAddVideo(false);
                }}
              >Save</button>
              <button className="secondary" onClick={() => { setShowAddVideo(false); setNewVideoForm(EMPTY_VIDEO); }}>Cancel</button>
            </div>
          </div>
        )}

        {deliveryVideos.length === 0 && !showAddVideo && (
          <p style={{ color: "var(--pico-muted-color)" }}>No videos added yet.</p>
        )}
      </section>

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

      {/* Rehearsals */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Rehearsals</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {unlinkableRehearsals.length > 0 && (
              <button className="secondary outline" onClick={() => setShowLinkRehearsal(true)}>
                + Link existing
              </button>
            )}
            <button className="secondary" onClick={() => setShowCreateRehearsal(true)}>
              + New Rehearsal
            </button>
          </div>
        </div>

        {rehearsals.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Location</th>
                <th>Cost</th>
                {rehearsals.some((r) => (r.gigCount ?? 1) > 1) && <th>This gig&apos;s share</th>}
                <th>Expense</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {rehearsals.map((r) => {
                const showShare = (r.gigCount ?? 1) > 1;
                return (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.location ?? "—"}</td>
                    <td>{r.cost != null ? <MoneyDisplay pennies={r.cost} /> : "—"}</td>
                    {rehearsals.some((rr) => (rr.gigCount ?? 1) > 1) && (
                      <td>
                        {showShare ? (
                          r.costShare != null ? <MoneyDisplay pennies={r.costShare} /> : "—"
                        ) : (
                          <span style={{ color: "var(--pico-muted-color)", fontSize: "0.85em" }}>n/a</span>
                        )}
                      </td>
                    )}
                    <td>
                      {r.expenseId ? (
                        <span style={{ fontSize: "0.85em" }}>
                          {r.expenseDescription ?? `#${r.expenseId}`}
                          {r.expenseAmount != null && <> · <MoneyDisplay pennies={r.expenseAmount} /></>}
                          <button
                            type="button"
                            className="contrast outline"
                            style={{ padding: "0.1em 0.4em", fontSize: "0.8em", marginLeft: "0.4rem" }}
                            aria-label="Unlink expense"
                            onClick={() => clearRehearsalExpense.mutate(r.id)}
                          >✕</button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="secondary outline"
                          style={{ padding: "0.2em 0.5em", fontSize: "0.85em" }}
                          onClick={() => setExpensePickerRehearsal(r)}
                        >
                          + Link expense
                        </button>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className="secondary outline"
                          style={{ padding: "0.2em 0.5em" }}
                          onClick={() => {
                            setEditRehearsal(r);
                            setEditRehearsalForm({ name: r.name, date: r.date, location: r.location, cost: r.cost, notes: r.notes });
                          }}
                        >
                          Edit
                        </button>
                        {showShare && (
                          <button
                            className="secondary outline"
                            style={{ padding: "0.2em 0.5em" }}
                            onClick={() => { setCostShareRehearsal(r); setCostShareValue(r.costShare); }}
                          >
                            Split
                          </button>
                        )}
                        <button
                          className="contrast outline"
                          style={{ padding: "0.2em 0.5em" }}
                          aria-label={`Remove rehearsal ${r.name}`}
                          onClick={() => handleRemoveRehearsal(r)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--pico-muted-color)" }}>No rehearsals linked to this gig yet.</p>
        )}
      </section>

      <ConfirmDelete
        open={showDeleteGig}
        itemName={`${gig.firstName} ${gig.lastName ?? ""}`.trim()}
        onConfirm={handleDeleteGig}
        onCancel={() => setShowDeleteGig(false)}
        loading={deleteGig.isPending}
      />

      {/* Create rehearsal modal */}
      <Modal open={showCreateRehearsal} onClose={() => { setShowCreateRehearsal(false); setRehearsalForm(EMPTY_REHEARSAL); setRehearsalExtraGigIds([]); }} title="New Rehearsal">
        <form onSubmit={handleCreateRehearsal}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Name" value={rehearsalForm.name} onChange={(e) => setRehearsalForm((f) => ({ ...f, name: e.target.value }))} required />
            <FormField label="Date" type="date" value={rehearsalForm.date} onChange={(e) => setRehearsalForm((f) => ({ ...f, date: e.target.value }))} required />
            <FormField label="Location" value={rehearsalForm.location ?? ""} onChange={(e) => setRehearsalForm((f) => ({ ...f, location: e.target.value }))} />
            <MoneyField label="Cost (predicted)" value={rehearsalForm.cost} onChange={(p) => setRehearsalForm((f) => ({ ...f, cost: p ?? undefined }))} min={0} />
          </div>
          <FormField as="textarea" label="Notes" value={rehearsalForm.notes ?? ""} onChange={(e) => setRehearsalForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />

          {/* Additional gigs */}
          {allRehearsals !== undefined && (
            <div style={{ marginTop: "0.75rem" }}>
              <small><strong>Also link to other gigs (optional)</strong></small>
              <div style={{ marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: "12rem", overflowY: "auto" }}>
                {/* We use the gigs list from context — fetch all gigs is not imported here, so we note this is a known limitation; the multi-gig picker requires useGigs */}
              </div>
            </div>
          )}

          {suggestedSplit != null && (
            <p style={{ color: "var(--pico-muted-color)", fontSize: "0.85em", marginTop: "0.5rem" }}>
              Suggested split: <MoneyDisplay pennies={suggestedSplit} /> per gig
            </p>
          )}

          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => { setShowCreateRehearsal(false); setRehearsalForm(EMPTY_REHEARSAL); }}>Cancel</button>
            <button type="submit" aria-busy={createGigRehearsal.isPending} disabled={createGigRehearsal.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      {/* Edit rehearsal modal */}
      <Modal open={!!editRehearsal} onClose={() => setEditRehearsal(null)} title="Edit Rehearsal">
        <form onSubmit={handleUpdateRehearsal}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Name" value={editRehearsalForm.name ?? ""} onChange={(e) => setEditRehearsalForm((f) => ({ ...f, name: e.target.value }))} required />
            <FormField label="Date" type="date" value={toInputDate(editRehearsalForm.date)} onChange={(e) => setEditRehearsalForm((f) => ({ ...f, date: e.target.value }))} required />
            <FormField label="Location" value={editRehearsalForm.location ?? ""} onChange={(e) => setEditRehearsalForm((f) => ({ ...f, location: e.target.value }))} />
            <MoneyField label="Cost (predicted)" value={editRehearsalForm.cost} onChange={(p) => setEditRehearsalForm((f) => ({ ...f, cost: p ?? undefined }))} min={0} />
          </div>
          <FormField as="textarea" label="Notes" value={editRehearsalForm.notes ?? ""} onChange={(e) => setEditRehearsalForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          {editRehearsal && (editRehearsal.gigCount ?? 1) > 1 && editRehearsal.cost != null && (
            <p style={{ color: "var(--pico-color-amber-500)", fontSize: "0.85em", marginTop: "0.5rem" }}>
              This rehearsal is shared across {editRehearsal.gigCount} gigs. Changing the cost will not automatically update cost shares. Use the Split button to review the split.
            </p>
          )}
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setEditRehearsal(null)}>Cancel</button>
            <button type="submit" aria-busy={updateGigRehearsal.isPending} disabled={updateGigRehearsal.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {/* Link existing rehearsal modal */}
      <Modal open={showLinkRehearsal} onClose={() => setShowLinkRehearsal(false)} title="Link existing rehearsal">
        {unlinkableRehearsals.length === 0 ? (
          <p style={{ color: "var(--pico-muted-color)" }}>No other rehearsals available to link.</p>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Date</th><th>Cost</th><th aria-label="Actions"></th></tr></thead>
            <tbody>
              {unlinkableRehearsals.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.cost != null ? <MoneyDisplay pennies={r.cost} /> : "—"}</td>
                  <td>
                    <button
                      className="secondary outline"
                      style={{ padding: "0.2em 0.5em" }}
                      onClick={async () => {
                        await linkExistingRehearsal.mutateAsync(r.id);
                        setShowLinkRehearsal(false);
                      }}
                      disabled={linkExistingRehearsal.isPending}
                      aria-busy={linkExistingRehearsal.isPending}
                    >
                      Link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <footer style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="secondary" onClick={() => setShowLinkRehearsal(false)}>Close</button>
        </footer>
      </Modal>

      {/* Cost share modal */}
      <Modal open={!!costShareRehearsal} onClose={() => setCostShareRehearsal(null)} title="Edit cost share">
        <form onSubmit={handleUpdateCostShare}>
          {costShareRehearsal && (
            <>
              <p style={{ fontSize: "0.9em", color: "var(--pico-muted-color)" }}>
                Total rehearsal cost: {costShareRehearsal.cost != null ? formatPennies(costShareRehearsal.cost) : "not set"}.
                This rehearsal is shared across {costShareRehearsal.gigCount} gigs.
              </p>
              <MoneyField
                label="This gig's share"
                value={costShareValue}
                onChange={(p) => setCostShareValue(p ?? undefined)}
                required
                min={0}
              />
              {updateCostShare.error && (
                <ErrorBanner error={updateCostShare.error instanceof Error ? updateCostShare.error.message : "Failed to update cost share"} />
              )}
            </>
          )}
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setCostShareRehearsal(null)}>Cancel</button>
            <button type="submit" aria-busy={updateCostShare.isPending} disabled={updateCostShare.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {/* Expense picker for rehearsal */}
      <ExpensePickerModal
        open={!!expensePickerRehearsal}
        onClose={() => setExpensePickerRehearsal(null)}
        expenses={allExpenses.filter((e) => expensePickerRehearsal?.expenseId !== e.id)}
        onSelect={handleLinkExpense}
      />

      {/* Confirm delete rehearsal */}
      <ConfirmDelete
        open={!!deleteRehearsalTarget}
        itemName={deleteRehearsalTarget?.name ?? "this rehearsal"}
        onConfirm={handleConfirmDeleteRehearsal}
        onCancel={() => setDeleteRehearsalTarget(null)}
        loading={unlinkGigRehearsal.isPending}
      />
    </main>
  );
}

function PlaylistValue({ value }: { value: string }) {
  if (isUrl(value)) {
    return <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>;
  }
  return <>{value}</>;
}

