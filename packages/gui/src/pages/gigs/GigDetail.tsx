import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useGig,
  useUpdateGig,
  useDeleteGig,
  useSetGigServices,
} from "../../api/hooks/useGigs.js";
import { useServices } from "../../api/hooks/useServices.js";
import { useGigRoles, useCreateRole, useDeleteRole } from "../../api/hooks/useAssignedRoles.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import StatusBadge from "../../components/StatusBadge.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import Modal from "../../components/Modal.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import type { UpdateGigRequest } from "@get-down/shared";

const STATUS_OPTIONS = ["enquiry", "confirmed", "completed", "cancelled", "postponed"];

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const gigId = Number(id);
  const navigate = useNavigate();

  const { data: gig, isLoading, error } = useGig(gigId);
  const { data: roles } = useGigRoles(gigId);

  const updateGig = useUpdateGig();
  const deleteGig = useDeleteGig();
  const setGigServices = useSetGigServices();
  const { data: allServices = [] } = useServices();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateGigRequest>({});
  const [showDeleteGig, setShowDeleteGig] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [roleForm, setRoleForm] = useState({ roleName: "" });

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

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    await createRole.mutateAsync({ gigId, roleName: roleForm.roleName });
    setShowAddRole(false);
    setRoleForm({ roleName: "" });
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
          <p><StatusBadge status={gig.status} /> {gig.venueName && `· ${gig.venueName}`} {gig.location && `· ${gig.location}`}</p>
        </hgroup>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="secondary" onClick={startEdit}>Edit</button>
          <button className="contrast outline" onClick={() => setShowDeleteGig(true)}>Delete</button>
        </div>
      </div>

      {!editing ? (
        <article>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
            <dt>Date</dt><dd>{formatDate(gig.date)}</dd>
            <dt>Partner</dt><dd>{gig.partnerName ?? "—"}</dd>
            <dt>Email</dt><dd>{gig.email ?? "—"}</dd>
            <dt>Phone</dt><dd>{gig.phone ?? "—"}</dd>
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
              <FormField label="Quoted Price (p)" type="number" value={editForm.totalPrice ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, totalPrice: Number(e.target.value) }))} />
            </div>
            <FormField as="textarea" label="Description" value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" aria-busy={updateGig.isPending} disabled={updateGig.isPending}>Save</button>
              <button type="button" className="secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        </article>
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

      {/* Roles */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Assigned Roles</h2>
          <button className="secondary" onClick={() => setShowAddRole(true)}>+ Add</button>
        </div>
        {roles && roles.length > 0 ? (
          <table>
            <thead><tr><th>Role</th><th>Person</th><th></th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.roleName}</td>
                  <td>{r.personId ?? "—"}</td>
                  <td><button className="contrast outline" style={{ padding: "0.2em 0.5em" }} onClick={() => deleteRole.mutate({ id: r.id, gigId })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No roles assigned.</p>}
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
          <Link to={`/gigs/${gigId}/invoices`} className="secondary outline" style={{ padding: "0.3em 0.8em" }}>
            Manage Invoice &amp; Billing →
          </Link>
        </div>
      </section>

      {/* Modals */}
      <Modal open={showAddRole} onClose={() => setShowAddRole(false)} title="Add Role">
        <form onSubmit={handleAddRole}>
          <FormField label="Role Name" value={roleForm.roleName} onChange={(e) => setRoleForm({ roleName: e.target.value })} required placeholder="e.g. Lead Vocalist" />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowAddRole(false)}>Cancel</button>
            <button type="submit" aria-busy={createRole.isPending} disabled={createRole.isPending}>Add</button>
          </footer>
        </form>
      </Modal>

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
