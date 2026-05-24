import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useGig } from "../../api/hooks/useGigs.js";
import { useGigRoles, useCreateRole, useUpdateRole, useDeleteRole, useImportRolesFromServices } from "../../api/hooks/useAssignedRoles.js";
import { usePeople } from "../../api/hooks/usePeople.js";
import {
  useFeeAllocationsByGig,
  useFeeAllocations,
  useGenerateFeeAllocations,
  useResetFeeAllocation,
  useAddFeeLineItem,
  useUpdateFeeLineItem,
  useRemoveFeeLineItem,
  useCreateFeeAllocationForGig,
  useDeleteFeeAllocation,
  useLinkExpenseToAllocation,
  useUnlinkExpenseFromAllocation,
  useLinkTransactionToAllocation,
  useUnlinkTransactionFromAllocation,
} from "../../api/hooks/useFeeAllocations.js";
import { useExpenses, useDeleteExpense } from "../../api/hooks/useExpenses.js";
import { useAccounts, useAccountTransactions, useDeleteTransaction } from "../../api/hooks/useAccounts.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import MoneyField from "../../components/MoneyField.js";
import FormField from "../../components/FormField.js";
import Modal from "../../components/Modal.js";
import ExpenseModal from "../../components/ExpenseModal.js";
import ExpensePickerModal from "../../components/ExpensePickerModal.js";
import ExpenseCreateModal from "../../components/ExpenseCreateModal.js";
import TransactionPickerModal from "../../components/TransactionPickerModal.js";
import TransactionCreateModal from "../../components/TransactionCreateModal.js";
import TransactionModal from "../../components/TransactionModal.js";
import { useToast } from "../../components/Toast.js";
import { formatPersonName, formatGigName } from "../../utils/people.js";
import { FeeAllocationPanel } from "../../components/FeeAllocationPanel.js";
import type { FeeAllocation, FeeAllocationLineItem, Account, AccountTransaction, Expense } from "@get-down/shared";

export default function GigRoles() {
  const { id } = useParams<{ id: string }>();
  const gigId = Number(id);
  const { data: gig, isLoading: gigLoading, error: gigError } = useGig(gigId);
  const { data: roles = [] } = useGigRoles(gigId);
  const { data: people = [] } = usePeople();
  const { data: feeAllocations = [] } = useFeeAllocationsByGig(gigId);
  const { data: allAllocations = [] } = useFeeAllocations();
  const { data: allExpenses = [] } = useExpenses();
  const { data: accounts = [] } = useAccounts();

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const importRoles = useImportRolesFromServices(gigId);
  const generateFeeAllocations = useGenerateFeeAllocations(gigId);
  const resetFeeAllocation = useResetFeeAllocation();
  const addLineItem = useAddFeeLineItem();
  const updateLineItem = useUpdateFeeLineItem();
  const removeLineItem = useRemoveFeeLineItem();
  const createFeeAllocation = useCreateFeeAllocationForGig(gigId);
  const deleteFeeAllocation = useDeleteFeeAllocation();
  const linkExpense = useLinkExpenseToAllocation();
  const unlinkExpense = useUnlinkExpenseFromAllocation();
  const linkTransaction = useLinkTransactionToAllocation();
  const unlinkTransaction = useUnlinkTransactionFromAllocation();
  const deleteExpense = useDeleteExpense();
  const { showToast } = useToast();

  const [showAddRole, setShowAddRole] = useState(false);
  const [roleForm, setRoleForm] = useState<{ roleName: string; personId: number | null }>({ roleName: "", personId: null });
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showAddAllocation, setShowAddAllocation] = useState(false);
  const [addAllocationPersonId, setAddAllocationPersonId] = useState<number | null>(null);

  // Expense picker state: which allocation's picker is open
  const [pickerAllocationId, setPickerAllocationId] = useState<number | null>(null);
  // Expense create modal state: which allocation to link the new expense to
  const [createAllocationId, setCreateAllocationId] = useState<number | null>(null);
  // Expense edit modal state: track by ID so the expense object stays fresh from query
  const [editExpenseId, setEditExpenseId] = useState<number | null>(null);
  // Delete/unlink confirm state
  const [unlinkConfirm, setUnlinkConfirm] = useState<{ allocationId: number; expense: Expense } | null>(null);

  const editExpense = editExpenseId != null
    ? (allExpenses.find((e) => e.id === editExpenseId) ?? null)
    : null;

  const pickerAllocation = pickerAllocationId != null
    ? feeAllocations.find((a) => a.id === pickerAllocationId) ?? null
    : null;

  const createAllocation = createAllocationId != null
    ? feeAllocations.find((a) => a.id === createAllocationId) ?? null
    : null;

  function buildCreateInitialValues(allocation: typeof createAllocation) {
    if (!allocation || !gig) return undefined;
    let description = `${gig.firstName} ${gig.lastName}`;
    if (allocation.personId) {
      const person = people.find((p) => p.id === allocation.personId);
      if (person) description += ` — ${formatPersonName(person)}`;
    }
    if (allocation.notes) description += ` (${allocation.notes})`;
    const amount = (allocation.lineItems ?? []).reduce((sum, li) => sum + (li.amount ?? 0), 0);
    return { description, amount };
  }

  if (gigLoading) return <main className="container"><LoadingState /></main>;
  if (gigError || !gig) return <main className="container"><ErrorBanner error={gigError ?? "Gig not found"} /></main>;

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    await createRole.mutateAsync({ gigId, roleName: roleForm.roleName, personId: roleForm.personId ?? undefined });
    setShowAddRole(false);
    setRoleForm({ roleName: "", personId: null });
  }

  async function handleImportRoles() {
    const imported = await importRoles.mutateAsync();
    if (imported.length === 0) {
      showToast("No roles found on attached services", "success");
    }
  }

  async function handleGenerateFeeAllocations(force: boolean) {
    const result = await generateFeeAllocations.mutateAsync(force);
    if (result && !Array.isArray(result) && "conflict" in result && result.conflict) {
      setShowGenerateConfirm(true);
    } else {
      setShowGenerateConfirm(false);
    }
  }

  async function handleReset(allocationId: number) {
    await resetFeeAllocation.mutateAsync(allocationId);
  }

  async function handleAddAllocation(e: React.FormEvent) {
    e.preventDefault();
    await createFeeAllocation.mutateAsync(addAllocationPersonId ? { personId: addAllocationPersonId } : {});
    setShowAddAllocation(false);
    setAddAllocationPersonId(null);
  }

  function allocationTitle(allocation: FeeAllocation): string {
    if (allocation.personId) {
      const person = people.find((p) => p.id === allocation.personId);
      if (person) return formatPersonName(person);
    }
    const role = roles.find((r) => r.feeAllocationId === allocation.id);
    if (role) return `Unassigned – ${role.roleName}`;
    return `Allocation #${allocation.id}`;
  }

  return (
    <main className="container">
      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to="/gigs">Gigs</Link></li>
          <li><Link to={`/gigs/${gigId}`}>{gig.firstName} {gig.lastName}</Link></li>
          <li>Roles &amp; Fees</li>
        </ul>
      </nav>

      <h1>Roles &amp; Fees</h1>
      <p style={{ color: "var(--pico-muted-color)" }}>{gig.firstName} {gig.lastName}</p>

      {/* Assigned Roles */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Assigned Roles</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="secondary outline"
              aria-busy={generateFeeAllocations.isPending}
              disabled={generateFeeAllocations.isPending}
              onClick={() => handleGenerateFeeAllocations(false)}
            >
              Generate fee allocations
            </button>
            <button
              className="secondary outline"
              aria-busy={importRoles.isPending}
              disabled={importRoles.isPending}
              onClick={handleImportRoles}
            >
              Import from services
            </button>
            <button className="secondary" onClick={() => setShowAddRole(true)}>+ Add</button>
          </div>
        </div>

        {roles.length > 0 ? (
          <table>
            <thead><tr><th>Role</th><th>Person</th><th></th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.roleName}</td>
                  <td>
                    <select
                      value={r.personId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateRole.mutate({
                          id: r.id,
                          gigId,
                          input: { personId: val === "" ? null : Number(val) },
                        });
                      }}
                      style={{ margin: 0 }}
                    >
                      <option value="">—</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {formatPersonName(p)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="contrast outline"
                      style={{ padding: "0.2em 0.5em" }}
                      onClick={() => deleteRole.mutate({ id: r.id, gigId })}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--pico-muted-color)" }}>No roles assigned.</p>
        )}
      </section>

      {/* Fee Allocations */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Fee Allocations</h2>
          <button className="secondary" onClick={() => setShowAddAllocation(true)}>+ Add allocation</button>
        </div>
        {feeAllocations.length === 0 ? (
          <p style={{ color: "var(--pico-muted-color)" }}>
            No fee allocations yet. Assign roles above, then click "Generate fee allocations".
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {feeAllocations.map((allocation) => {
              const linkedRoles = roles.filter((r) => r.feeAllocationId === allocation.id);
              const unlinkedRoles = roles.filter((r) => !r.feeAllocationId);
              return (
                <article key={allocation.id} style={{ margin: 0 }}>
                  <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{allocationTitle(allocation)}</strong>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        className="secondary outline"
                        style={{ padding: "0.15em 0.5em", fontSize: "0.85em" }}
                        aria-busy={resetFeeAllocation.isPending}
                        disabled={resetFeeAllocation.isPending}
                        onClick={() => handleReset(allocation.id)}
                      >
                        Reset to defaults
                      </button>
                      <button
                        type="button"
                        className="contrast outline"
                        style={{ padding: "0.15em 0.5em", fontSize: "0.85em" }}
                        aria-busy={deleteFeeAllocation.isPending}
                        disabled={deleteFeeAllocation.isPending}
                        onClick={() => deleteFeeAllocation.mutate(allocation.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </header>

                  {/* Linked roles */}
                  <div style={{ marginBottom: "0.75rem" }}>
                    <strong style={{ fontSize: "0.85em" }}>Linked roles</strong>
                    {linkedRoles.length > 0 ? (
                      <ul style={{ margin: "0.25rem 0", paddingLeft: "1rem" }}>
                        {linkedRoles.map((r) => (
                          <li key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>{r.roleName}{r.personId ? ` (${formatPersonName(people.find((p) => p.id === r.personId)!)})` : ""}</span>
                            <button
                              type="button"
                              className="contrast outline"
                              style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                              onClick={() => {
                                updateRole.mutate({ id: r.id, gigId, input: { feeAllocationId: null } });
                              }}
                            >✕</button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: "0.25rem 0", color: "var(--pico-muted-color)", fontSize: "0.85em" }}>No roles linked.</p>
                    )}
                    {unlinkedRoles.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const roleId = Number(e.target.value);
                          updateRole.mutate({ id: roleId, gigId, input: { feeAllocationId: allocation.id } });
                        }}
                        style={{ margin: "0.25rem 0", fontSize: "0.85em" }}
                      >
                        <option value="">+ Link role…</option>
                        {unlinkedRoles.map((r) => (
                          <option key={r.id} value={r.id}>{r.roleName}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <FeeAllocationPanel
                    allocation={allocation}
                    onAddLineItem={(desc, amt) => addLineItem.mutate({ allocationId: allocation.id, input: { description: desc, amount: amt } })}
                    onUpdateLineItem={(li, desc, amt) => updateLineItem.mutate({ allocationId: allocation.id, lineItemId: li.id, input: { description: desc, amount: amt } })}
                    onRemoveLineItem={(li) => removeLineItem.mutate({ allocationId: allocation.id, lineItemId: li.id })}
                  />

                  {/* Linked Expenses */}
                  <LinkedExpensesSection
                    allocation={allocation}
                    allExpenses={allExpenses}
                    onAddExpense={() => setCreateAllocationId(allocation.id)}
                    onBrowse={() => setPickerAllocationId(allocation.id)}
                    onEdit={(expense) => setEditExpenseId(expense.id)}
                    onRemove={(expense) => setUnlinkConfirm({ allocationId: allocation.id, expense })}
                  />

                  {/* Linked Transactions (only when personId is set) */}
                  {allocation.personId && (
                    <LinkedTransactionsSection
                      allocation={allocation}
                      accounts={accounts}
                      gigName={formatGigName(gig)}
                      personName={formatPersonName(people.find((p) => p.id === allocation.personId)!)}
                      onLink={(transactionId: number) => linkTransaction.mutate({ allocationId: allocation.id, transactionId })}
                      onUnlink={(transactionId: number) => unlinkTransaction.mutate({ allocationId: allocation.id, transactionId })}
                    />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Role modal */}
      <Modal open={showAddRole} onClose={() => { setShowAddRole(false); setRoleForm({ roleName: "", personId: null }); }} title="Add Role">
        <form onSubmit={handleAddRole}>
          <FormField label="Role Name" value={roleForm.roleName} onChange={(e) => setRoleForm((f) => ({ ...f, roleName: e.target.value }))} required placeholder="e.g. Lead Vocalist" />
          <label>
            <span style={{ display: "block", marginBottom: "0.25rem" }}>Person (optional)</span>
            <select
              value={roleForm.personId ?? ""}
              onChange={(e) => setRoleForm((f) => ({ ...f, personId: e.target.value === "" ? null : Number(e.target.value) }))}
              style={{ width: "100%" }}
            >
              <option value="">— None —</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPersonName(p)}
                </option>
              ))}
            </select>
          </label>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button type="button" className="secondary" onClick={() => { setShowAddRole(false); setRoleForm({ roleName: "", personId: null }); }}>Cancel</button>
            <button type="submit" aria-busy={createRole.isPending} disabled={createRole.isPending}>Add</button>
          </footer>
        </form>
      </Modal>

      {/* Generate confirm dialog */}
      <Modal open={showGenerateConfirm} onClose={() => setShowGenerateConfirm(false)} title="Overwrite existing fee allocations?">
        <p>Fee allocations already exist for this gig. Regenerating will delete all existing allocations and line items and recreate them from current role fees.</p>
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={() => setShowGenerateConfirm(false)}>Cancel</button>
          <button
            type="button"
            className="contrast"
            aria-busy={generateFeeAllocations.isPending}
            disabled={generateFeeAllocations.isPending}
            onClick={() => handleGenerateFeeAllocations(true)}
          >
            Regenerate
          </button>
        </footer>
      </Modal>

      {/* Add Allocation modal */}
      <Modal open={showAddAllocation} onClose={() => { setShowAddAllocation(false); setAddAllocationPersonId(null); }} title="Add Fee Allocation">
        <form onSubmit={handleAddAllocation}>
          <label>
            <span style={{ display: "block", marginBottom: "0.25rem" }}>Person (optional)</span>
            <select
              value={addAllocationPersonId ?? ""}
              onChange={(e) => setAddAllocationPersonId(e.target.value === "" ? null : Number(e.target.value))}
              style={{ width: "100%" }}
            >
              <option value="">— None —</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{formatPersonName(p)}</option>
              ))}
            </select>
          </label>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button type="button" className="secondary" onClick={() => { setShowAddAllocation(false); setAddAllocationPersonId(null); }}>Cancel</button>
            <button type="submit" aria-busy={createFeeAllocation.isPending} disabled={createFeeAllocation.isPending}>Add</button>
          </footer>
        </form>
      </Modal>

      {/* Add Expense modal (pre-filled, auto-links to allocation on create) */}
      <ExpenseCreateModal
        open={createAllocationId != null}
        onClose={() => setCreateAllocationId(null)}
        initialValues={buildCreateInitialValues(createAllocation)}
        onCreated={(expense) => {
          if (createAllocationId != null) {
            linkExpense.mutate({ allocationId: createAllocationId, expenseId: expense.id });
          }
          setCreateAllocationId(null);
        }}
      />

      {/* Expense Picker modal */}
      <ExpensePickerModal
        open={pickerAllocationId != null}
        onClose={() => setPickerAllocationId(null)}
        expenses={allExpenses.filter((e) => !(pickerAllocation?.expenseIds ?? []).includes(e.id))}
        onSelect={(expense) => {
          if (pickerAllocationId != null) {
            linkExpense.mutate({ allocationId: pickerAllocationId, expenseId: expense.id });
          }
          setPickerAllocationId(null);
        }}
      />

      {/* Edit Expense modal */}
      <ExpenseModal
        expense={editExpense}
        onClose={() => setEditExpenseId(null)}
        allAllocations={allAllocations}
      />

      {/* Delete / unlink confirm dialog */}
      <Modal
        open={!!unlinkConfirm}
        onClose={() => setUnlinkConfirm(null)}
        title="Remove linked expense"
      >
        <p>
          Do you want to delete the expense <strong>{unlinkConfirm?.expense.description}</strong> entirely,
          or just remove the link?
        </p>
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={() => setUnlinkConfirm(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="secondary outline"
            onClick={() => {
              if (unlinkConfirm) {
                unlinkExpense.mutate({ allocationId: unlinkConfirm.allocationId, expenseId: unlinkConfirm.expense.id });
              }
              setUnlinkConfirm(null);
            }}
          >
            Remove link only
          </button>
          <button
            type="button"
            className="contrast"
            aria-busy={deleteExpense.isPending}
            disabled={deleteExpense.isPending}
            onClick={async () => {
              if (unlinkConfirm) {
                await deleteExpense.mutateAsync(unlinkConfirm.expense.id);
              }
              setUnlinkConfirm(null);
            }}
          >
            Delete expense
          </button>
        </footer>
      </Modal>
    </main>
  );
}

// ─── Linked Expenses Section ──────────────────────────────────────────────────

interface LinkedExpensesSectionProps {
  allocation: FeeAllocation;
  allExpenses: Expense[];
  onAddExpense: () => void;
  onBrowse: () => void;
  onEdit: (expense: Expense) => void;
  onRemove: (expense: Expense) => void;
}

function LinkedExpensesSection({
  allocation,
  allExpenses,
  onAddExpense,
  onBrowse,
  onEdit,
  onRemove,
}: LinkedExpensesSectionProps) {
  const linkedExpenses = allExpenses.filter((e) => allocation.expenseIds.includes(e.id));

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: "0.85em" }}>Linked expenses</strong>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            className="secondary outline"
            style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
            onClick={onAddExpense}
          >
            Add expense
          </button>
          <button
            type="button"
            className="secondary outline"
            style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
            onClick={onBrowse}
          >
            Browse…
          </button>
        </div>
      </div>
      {linkedExpenses.length > 0 ? (
        <ul style={{ margin: "0.25rem 0", paddingLeft: "1rem" }}>
          {linkedExpenses.map((e) => (
            <li key={e.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85em" }}>
              <button
                type="button"
                className="secondary outline"
                style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                onClick={() => onEdit(e)}
              >
                Edit
              </button>
              <span>{e.description}</span>
              <button
                type="button"
                className="contrast outline"
                style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                onClick={() => onRemove(e)}
              >✕</button>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: "0.25rem 0", color: "var(--pico-muted-color)", fontSize: "0.85em" }}>No expenses linked.</p>
      )}
    </div>
  );
}

// ─── Linked Transactions Section ──────────────────────────────────────────────

interface LinkedTransactionsSectionProps {
  allocation: FeeAllocation;
  accounts: Account[];
  gigName: string;
  personName: string;
  onLink: (transactionId: number) => void;
  onUnlink: (transactionId: number) => void;
}

function LinkedTransactionsSection({
  allocation,
  accounts,
  gigName,
  personName,
  onLink,
  onUnlink,
}: LinkedTransactionsSectionProps) {
  const account = accounts.find((a) => a.personId === allocation.personId);

  const { data: allTransactions = [] } = useAccountTransactions(account?.id ?? 0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AccountTransaction | null>(null);
  const [unlinkConfirm, setUnlinkConfirm] = useState<AccountTransaction | null>(null);

  if (!account) {
    return null;
  }

  const linkedTransactions = allTransactions.filter((t) => allocation.transactionIds.includes(t.id));
  const unlinkableTransactions = allTransactions.filter((t) => !allocation.transactionIds.includes(t.id));

  const lineItemsTotal = (allocation.lineItems ?? []).reduce((sum, li) => sum + (li.amount ?? 0), 0);
  const createInitialValues = {
    amount: lineItemsTotal,
    description: `${gigName} — ${personName}`,
  };

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: "0.85em" }}>Linked transactions</strong>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            className="secondary outline"
            style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
            onClick={() => setCreateOpen(true)}
          >
            Add transaction
          </button>
          <button
            type="button"
            className="secondary outline"
            style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
            onClick={() => setPickerOpen(true)}
          >
            Browse…
          </button>
        </div>
      </div>
      {linkedTransactions.length > 0 ? (
        <ul style={{ margin: "0.25rem 0", paddingLeft: "1rem" }}>
          {linkedTransactions.map((t) => (
            <li key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85em" }}>
              <button
                type="button"
                className="secondary outline"
                style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                onClick={() => setEditTarget(t)}
              >
                Edit
              </button>
              <span>{t.description ?? `Transaction #${t.id}`} (<MoneyDisplay pennies={t.amount} />)</span>
              <button
                type="button"
                className="contrast outline"
                style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                onClick={() => setUnlinkConfirm(t)}
              >✕</button>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: "0.25rem 0", color: "var(--pico-muted-color)", fontSize: "0.85em" }}>No transactions linked.</p>
      )}

      {/* Create modal */}
      <TransactionCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        accountId={account.id}
        initialValues={createInitialValues}
        onCreated={(tx) => {
          onLink(tx.id);
        }}
      />

      {/* Picker modal */}
      <TransactionPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        transactions={unlinkableTransactions}
        onSelect={(tx) => {
          onLink(tx.id);
          setPickerOpen(false);
        }}
      />

      {/* Edit modal */}
      <TransactionModal
        transaction={editTarget}
        accountId={account.id}
        onClose={() => setEditTarget(null)}
      />

      {/* Unlink / delete confirm */}
      {unlinkConfirm && (
        <TxUnlinkConfirmModal
          transaction={unlinkConfirm}
          accountId={account.id}
          onUnlink={() => {
            onUnlink(unlinkConfirm.id);
            setUnlinkConfirm(null);
          }}
          onClose={() => setUnlinkConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── Tx Unlink Confirm Modal ───────────────────────────────────────────────────

interface TxUnlinkConfirmModalProps {
  transaction: AccountTransaction;
  accountId: number;
  onUnlink: () => void;
  onClose: () => void;
}

function TxUnlinkConfirmModal({ transaction, accountId, onUnlink, onClose }: TxUnlinkConfirmModalProps) {
  const deleteTransaction = useDeleteTransaction(accountId);

  const label = transaction.description ?? `Transaction #${transaction.id}`;

  return (
    <Modal open onClose={onClose} title="Remove linked transaction">
      <p>
        Do you want to delete the transaction <strong>{label}</strong> entirely,
        or just remove the link?
      </p>
      <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="secondary outline"
          onClick={onUnlink}
        >
          Remove link only
        </button>
        <button
          type="button"
          className="contrast"
          aria-busy={deleteTransaction.isPending}
          disabled={deleteTransaction.isPending}
          onClick={async () => {
            await deleteTransaction.mutateAsync(transaction.id);
            onClose();
          }}
        >
          Delete transaction
        </button>
      </footer>
    </Modal>
  );
}
