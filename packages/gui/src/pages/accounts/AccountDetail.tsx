import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useAccounts,
  useAccountTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "../../api/hooks/useAccounts.js";
import { useFeeAllocations } from "../../api/hooks/useFeeAllocations.js";
import type { AccountTransaction, CreateAccountTransactionRequest, FeeAllocation } from "@get-down/shared";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import MoneyField from "../../components/MoneyField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import EmptyState from "../../components/EmptyState.js";
import { formatPennies } from "../../utils/money.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import { caLabel } from "../../utils/accounts.js";

const TRANSACTION_TYPES = [
  "Drawing",
  "Profit Share",
  "Expense Reimbursement",
  "Direct Payment",
  "Other",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 4 + i);

interface TransactionForm {
  date: string;
  amount: number;
  type: string;
  description: string;
  feeAllocationIds: number[];
}

const EMPTY_FORM: TransactionForm = {
  date: "",
  amount: 0,
  type: "Drawing",
  description: "",
  feeAllocationIds: [],
};

function AllocationPicker({
  allocations,
  selected,
  onChange,
}: {
  allocations: FeeAllocation[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  if (allocations.length === 0) {
    return <small style={{ color: "var(--pico-muted-color)" }}>No fee allocations available.</small>;
  }

  return (
    <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid var(--pico-muted-border-color)", borderRadius: "var(--pico-border-radius)", padding: "0.5rem" }}>
      {allocations.map((a) => (
        <label key={a.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.2rem 0", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={selected.includes(a.id)}
            onChange={() => toggle(a.id)}
            style={{ margin: 0 }}
          />
          <span>
            #{a.id}{a.notes ? ` — ${a.notes}` : ""}
            {a.isPaid && <small style={{ color: "var(--pico-muted-color)", marginLeft: "0.5em" }}>(paid)</small>}
          </span>
        </label>
      ))}
    </div>
  );
}

function TransactionFormFields({
  form,
  setForm,
  allocations,
}: {
  form: TransactionForm;
  setForm: (fn: (f: TransactionForm) => TransactionForm) => void;
  allocations: FeeAllocation[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
      <FormField
        label="Date"
        type="date"
        value={form.date}
        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        required
      />
      <MoneyField
        label="Amount"
        hint="negative = credit to person"
        value={form.amount}
        onChange={(pennies) => setForm((f) => ({ ...f, amount: pennies ?? 0 }))}
        required
      />
      <FormField
        as="select"
        label="Type"
        value={form.type}
        onChange={(e) => setForm((f) => ({ ...f, type: (e.target as HTMLSelectElement).value }))}
        required
      >
        {TRANSACTION_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </FormField>
      <FormField
        label="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      />
      <div style={{ gridColumn: "1 / -1" }}>
        <label>
          Linked fee allocations
          <small style={{ marginLeft: "0.5em", color: "var(--pico-muted-color)" }}>optional, for reference only</small>
        </label>
        <AllocationPicker
          allocations={allocations}
          selected={form.feeAllocationIds}
          onChange={(ids) => setForm((f) => ({ ...f, feeAllocationIds: ids }))}
        />
      </div>
    </div>
  );
}

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const accountId = Number(id);

  const [year, setYear] = useState(CURRENT_YEAR);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<TransactionForm>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<AccountTransaction | null>(null);
  const [editForm, setEditForm] = useState<TransactionForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AccountTransaction | null>(null);

  const { data: accounts, isLoading: accountsLoading, error: accountsError } = useAccounts();
  const { data: transactions, isLoading: txLoading, error: txError } = useAccountTransactions(accountId, year);
  const { data: allocations } = useFeeAllocations();

  const createTx = useCreateTransaction(accountId);
  const updateTx = useUpdateTransaction(accountId);
  const deleteTx = useDeleteTransaction(accountId);

  const account = accounts?.find((a) => a.id === accountId);

  if (accountsLoading || txLoading) return <main className="container"><LoadingState /></main>;
  if (accountsError) return <main className="container"><ErrorBanner error={accountsError} /></main>;
  if (txError) return <main className="container"><ErrorBanner error={txError} /></main>;
  if (!account) return <main className="container"><ErrorBanner error={new Error("Account not found")} /></main>;

  const { text: balanceLabel, color: balanceColor } = caLabel(account.caBalance);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const input: CreateAccountTransactionRequest = {
      date: form.date,
      amount: form.amount,
      type: form.type,
      description: form.description || undefined,
      feeAllocationIds: form.feeAllocationIds,
    };
    await createTx.mutateAsync(input);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  function openEdit(tx: AccountTransaction) {
    setEditTarget(tx);
    setEditForm({
      date: toInputDate(tx.date),
      amount: tx.amount,
      type: tx.type,
      description: tx.description ?? "",
      feeAllocationIds: tx.feeAllocationIds,
    });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    await updateTx.mutateAsync({
      id: editTarget.id,
      input: {
        date: editForm.date || undefined,
        amount: editForm.amount,
        type: editForm.type,
        description: editForm.description || undefined,
        feeAllocationIds: editForm.feeAllocationIds,
      },
    });
    setEditTarget(null);
  }

  return (
    <main className="container">
      {/* Back link + header */}
      <div style={{ marginBottom: "0.5rem" }}>
        <Link to="/accounts" style={{ color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>
          ← Accounts
        </Link>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ marginBottom: "0.25rem" }}>{account.personName}</h1>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              {formatPennies(Math.abs(account.caBalance))}
            </span>
            <span style={{ color: balanceColor, fontWeight: 600 }}>{balanceLabel}</span>
          </div>
          <small style={{ color: "var(--pico-muted-color)" }}>All-time balance</small>
        </div>
        <button onClick={() => setShowCreate(true)}>+ Add Transaction</button>
      </div>

      {/* Year filter */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <label style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ whiteSpace: "nowrap" }}>Year:</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: "auto", marginBottom: 0 }}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <small style={{ color: "var(--pico-muted-color)" }}>
          {transactions?.length ?? 0} transaction{transactions?.length !== 1 ? "s" : ""}
        </small>
      </div>

      {/* Transaction list */}
      {transactions?.length === 0 ? (
        <EmptyState message={`No transactions in ${year}.`} />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Allocations</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(transactions ?? []).map((tx) => (
                <tr key={tx.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(tx.date)}</td>
                  <td>{tx.type}</td>
                  <td style={{ color: tx.description ? "inherit" : "var(--pico-muted-color)" }}>
                    {tx.description ?? "—"}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap", color: tx.amount < 0 ? "var(--pico-ins-color, green)" : "inherit" }}>
                    {tx.amount < 0 ? "−" : ""}{formatPennies(Math.abs(tx.amount))}
                  </td>
                  <td style={{ color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>
                    {tx.feeAllocationIds.length > 0
                      ? tx.feeAllocationIds.map((aid) => `#${aid}`).join(", ")
                      : "—"}
                  </td>
                  <td>
                    <button
                      className="secondary outline"
                      style={{ padding: "0.2em 0.5em" }}
                      onClick={() => openEdit(tx)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Transaction">
        <form onSubmit={handleCreate}>
          <TransactionFormFields form={form} setForm={setForm} allocations={allocations ?? []} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createTx.isPending} disabled={createTx.isPending}>Add</button>
          </footer>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Transaction">
        <form onSubmit={handleUpdate}>
          <TransactionFormFields form={editForm} setForm={setEditForm} allocations={allocations ?? []} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button
              type="button"
              className="contrast outline"
              onClick={() => { setDeleteTarget(editTarget); setEditTarget(null); }}
            >
              Delete
            </button>
            <button type="button" className="secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" aria-busy={updateTx.isPending} disabled={updateTx.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={`${deleteTarget.type} — ${formatPennies(Math.abs(deleteTarget.amount))}`}
          onConfirm={async () => {
            await deleteTx.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteTx.isPending}
        />
      )}
    </main>
  );
}
