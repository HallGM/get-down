import { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useService, useUpdateService, useDeleteService } from "../../api/hooks/useServices.js";
import { useRoles, useServiceRoles, useAddRoleToService, useRemoveRoleFromService, useCreateAndAttachRole } from "../../api/hooks/useRoles.js";
import type { UpdateServiceRequest } from "@get-down/shared";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const serviceId = Number(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: service, isLoading, error } = useService(serviceId);
  const { data: serviceRoles = [] } = useServiceRoles(serviceId);
  const { data: allRoles = [] } = useRoles();

  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const addRole = useAddRoleToService(serviceId);
  const removeRole = useRemoveRoleFromService(serviceId);
  const createAndAttach = useCreateAndAttachRole(serviceId);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateServiceRequest>({});
  const [showDelete, setShowDelete] = useState(false);
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  // Auto-enter edit mode when ?edit=true is in the URL
  useEffect(() => {
    if (searchParams.get("edit") === "true" && service && !editing) {
      startEdit();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, service]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error || !service) return <main className="container"><ErrorBanner error={error ?? "Service not found"} /></main>;

  function startEdit() {
    setEditForm({
      name: service!.name,
      category: service!.category,
      description: service!.description,
      priceToClient: service!.priceToClient,
      extraFee: service!.extraFee,
      extraFeeDescription: service!.extraFeeDescription,
      isBand: service!.isBand,
      isDjOnly: service!.isDjOnly,
      requiresMeal: service!.requiresMeal ?? false,
      isActive: service!.isActive,
    });
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await updateService.mutateAsync({ id: serviceId, input: editForm });
    setEditing(false);
  }

  async function handleDelete() {
    await deleteService.mutateAsync(serviceId);
    navigate("/services");
  }

  async function handleCreateAndAttach(e: React.FormEvent) {
    e.preventDefault();
    await createAndAttach.mutateAsync(newRoleName.trim());
    setShowNewRole(false);
    setNewRoleName("");
  }

  // Allow duplicate roles — do NOT filter out already-attached roles
  const availableRoles = allRoles;

  return (
    <main className="container">
      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to="/services">Services</Link></li>
          <li>{service.name}</li>
        </ul>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        <hgroup>
          <h1>{service.name}</h1>
          <p>{service.category ?? "—"}{service.isActive === false ? " · Inactive" : ""}</p>
        </hgroup>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {!editing && <button className="secondary" onClick={startEdit}>Edit</button>}
          {!editing && <button className="contrast outline" onClick={() => setShowDelete(true)}>Delete</button>}
        </div>
      </div>

      {!editing ? (
        <article>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
            <dt>Category</dt><dd>{service.category ?? "—"}</dd>
            <dt>Client price</dt><dd><MoneyDisplay pennies={service.priceToClient} /></dd>
            <dt>No. of roles</dt><dd>{service.numberOfPeople ?? "—"}</dd>
            <dt>Extra fee</dt><dd><MoneyDisplay pennies={service.extraFee} /></dd>
            {service.extraFeeDescription && <><dt>Extra fee desc.</dt><dd>{service.extraFeeDescription}</dd></>}
            <dt>Band</dt><dd>{service.isBand ? "Yes" : "No"}</dd>
            <dt>DJ only</dt><dd>{service.isDjOnly ? "Yes" : "No"}</dd>
            <dt>Requires meal</dt><dd>{service.requiresMeal ? "Yes" : "No"}</dd>
            <dt>Active</dt><dd>{service.isActive !== false ? "Yes" : "No"}</dd>
            {service.description && <><dt>Description</dt><dd>{service.description}</dd></>}
          </dl>
        </article>
      ) : (
        <article>
          <form onSubmit={handleSave}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              <FormField label="Name" value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
              <FormField label="Category" value={editForm.category ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} />
              <FormField label="Price to Client (p)" type="number" value={editForm.priceToClient ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, priceToClient: Number(e.target.value) }))} min={0} />
              <FormField label="Extra Fee (p)" type="number" value={editForm.extraFee ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, extraFee: Number(e.target.value) }))} min={0} />
              <FormField label="Extra Fee Description" value={editForm.extraFeeDescription ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, extraFeeDescription: e.target.value }))} />
            </div>
            <FormField as="textarea" label="Description" value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={!!editForm.isBand} onChange={(e) => setEditForm((f) => ({ ...f, isBand: e.target.checked }))} /> Band
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={!!editForm.isDjOnly} onChange={(e) => setEditForm((f) => ({ ...f, isDjOnly: e.target.checked }))} /> DJ only
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={!!editForm.requiresMeal} onChange={(e) => setEditForm((f) => ({ ...f, requiresMeal: e.target.checked }))} /> Requires meal
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={editForm.isActive !== false} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} /> Active
              </label>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="submit" aria-busy={updateService.isPending} disabled={updateService.isPending}>Save</button>
              <button type="button" className="secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        </article>
      )}

      {/* Roles section */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Roles</h2>
          <Link to="/services/roles" className="secondary outline" style={{ padding: "0.3em 0.8em", fontSize: "0.9em" }}>
            Manage roles →
          </Link>
        </div>
        <p style={{ color: "var(--pico-muted-color)", marginBottom: "0.75rem", fontSize: "0.9em" }}>
          Roles attached here are used when importing roles onto a gig. Duplicates are allowed for services requiring multiple people in the same role.
        </p>

        {serviceRoles.length > 0 ? (
          <table>
            <thead>
              <tr><th>Role</th><th>Fee</th><th style={{ width: "1%" }}></th></tr>
            </thead>
            <tbody>
              {serviceRoles.map((role) => (
                <tr key={role.roleServicesId ?? role.id}>
                  <td>{role.name}</td>
                  <td><MoneyDisplay pennies={role.fee} /></td>
                  <td>
                    <button
                      className="contrast outline"
                      style={{ padding: "0.2em 0.5em" }}
                      aria-busy={removeRole.isPending}
                      onClick={() => removeRole.mutate(role.roleServicesId!)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--pico-muted-color)" }}>No roles attached to this service.</p>
        )}

        {availableRoles.length > 0 && (
          <select
            style={{ marginTop: "0.5rem" }}
            value=""
            onChange={(e) => {
              const roleId = Number(e.target.value);
              if (!roleId) return;
              addRole.mutate(roleId);
            }}
          >
            <option value="">+ Add existing role…</option>
            {availableRoles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}

        {showNewRole ? (
          <form onSubmit={handleCreateAndAttach} style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input
              type="text"
              placeholder="New role name e.g. Guitarist"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              aria-busy={createAndAttach.isPending}
              disabled={createAndAttach.isPending}
              style={{ width: "auto" }}
            >
              Create
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => { setShowNewRole(false); setNewRoleName(""); }}
              style={{ width: "auto" }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            className="secondary outline"
            style={{ marginTop: "0.5rem" }}
            onClick={() => setShowNewRole(true)}
          >
            + New role
          </button>
        )}

        {allRoles.length === 0 && !showNewRole && (
          <p style={{ color: "var(--pico-muted-color)", marginTop: "0.5rem", fontSize: "0.9em" }}>
            No roles exist yet. <Link to="/services/roles">Create some roles</Link> first.
          </p>
        )}
      </section>

      <ConfirmDelete
        open={showDelete}
        itemName={service.name}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleteService.isPending}
      />
    </main>
  );
}
