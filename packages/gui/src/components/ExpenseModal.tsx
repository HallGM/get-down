import { useState, useEffect } from "react";
import type { Expense, FeeAllocation, AttributionFee } from "@get-down/shared";
import { MAX_DOCUMENT_SIZE_BYTES } from "@get-down/shared";
import Modal from "./Modal.js";
import FormField from "./FormField.js";
import MoneyField from "./MoneyField.js";
import ExpensePaymentsSection from "./ExpensePaymentsSection.js";
import { toInputDate } from "../utils/date.js";
import {
  useUpdateExpense,
  useUploadExpenseDocument,
  useDeleteExpenseDocument,
  useLinkAllocationToExpense,
  useUnlinkAllocationFromExpense,
  useLinkAttributionFeeToExpense,
  useUnlinkAttributionFeeFromExpense,
} from "../api/hooks/useExpenses.js";

interface Props {
  /** The expense to edit. When null the modal is closed. */
  expense: Expense | null;
  onClose: () => void;
  /** Full list of allocations for the picker; linked ones are filtered out internally. */
  allAllocations: FeeAllocation[];
  /** Full list of attribution fees for the picker. */
  allAttributionFees?: AttributionFee[];
  /** When provided a Delete button appears in the footer; the caller handles the actual deletion. */
  onDelete?: () => void;
}

export default function ExpenseModal({ expense, onClose, allAllocations, allAttributionFees, onDelete }: Props) {
  const safeAttributionFees = allAttributionFees ?? [];
  const updateExpense = useUpdateExpense();
  const uploadDocument = useUploadExpenseDocument();
  const deleteDocument = useDeleteExpenseDocument();
  const linkAllocation = useLinkAllocationToExpense();
  const unlinkAllocation = useUnlinkAllocationFromExpense();
  const linkAttributionFee = useLinkAttributionFeeToExpense();
  const unlinkAttributionFee = useUnlinkAttributionFeeFromExpense();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [file, setFile] = useState<File | undefined>(undefined);
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [localDocUrl, setLocalDocUrl] = useState<string | undefined>(undefined);

  // Reset form when expense changes
  useEffect(() => {
    if (!expense) return;
    setDescription(expense.description ?? "");
    setAmount(expense.amount);
    setDate(toInputDate(expense.date));
    setCategory(expense.category ?? "");
    setRecipientName(expense.recipientName ?? "");
    setFile(undefined);
    setFileError(undefined);
    setLocalDocUrl(expense.documentUrl);
  }, [expense?.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!expense || fileError) return;
    await updateExpense.mutateAsync({
      id: expense.id,
      input: {
        description,
        amount: amount ?? 0,
        date: date || undefined,
        category: category || undefined,
        recipientName: recipientName || undefined,
      },
    });
    if (file) {
      await uploadDocument.mutateAsync({ id: expense.id, file });
    }
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) { setFile(undefined); setFileError(undefined); return; }
    if (f.size > MAX_DOCUMENT_SIZE_BYTES) {
      setFile(undefined);
      setFileError("File must be 20 MB or smaller.");
      e.target.value = "";
      return;
    }
    setFileError(undefined);
    setFile(f);
  }

  const isBusy = updateExpense.isPending || uploadDocument.isPending;

  return (
    <Modal open={!!expense} onClose={onClose} title="Edit Expense">
      <form onSubmit={handleSave}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <FormField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <MoneyField
            label="Amount"
            value={amount}
            onChange={(p) => setAmount(p ?? 0)}
            required
            min={0}
          />
          <FormField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <FormField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <FormField
            label="Recipient"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />

          {/* Document */}
          <div style={{ gridColumn: "1 / -1" }}>
            <small><strong>Document</strong></small>
            {localDocUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.25rem" }}>
                <a href={localDocUrl} target="_blank" rel="noopener noreferrer">View</a>
                <button
                  type="button"
                  className="secondary outline"
                  style={{ padding: "0.2em 0.5em" }}
                  aria-busy={deleteDocument.isPending}
                  disabled={deleteDocument.isPending}
                  onClick={async () => {
                    if (!expense) return;
                    await deleteDocument.mutateAsync(expense.id);
                    setLocalDocUrl(undefined);
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ marginTop: "0.25rem" }}>
                <label>
                  <small>Upload invoice (optional, max 20 MB)</small>
                  <input type="file" onChange={handleFileChange} style={{ marginTop: "0.25rem" }} />
                </label>
                {fileError && <small style={{ color: "var(--pico-color-red-500)" }}>{fileError}</small>}
              </div>
            )}
          </div>

          {/* Linked fee allocations */}
          {expense && (
            <div style={{ gridColumn: "1 / -1" }}>
              <small><strong>Linked fee allocations</strong></small>
              <LinkedItemsSection
                linkedIds={expense.feeAllocationIds}
                allItems={allAllocations}
                label={(a: FeeAllocation) => a.notes ? `#${a.id} — ${a.notes}` : `#${a.id}`}
                emptyText="No fee allocations linked."
                addPlaceholder="+ Link allocation…"
                onLink={(allocationId) => linkAllocation.mutate({ expenseId: expense.id, allocationId })}
                onUnlink={(allocationId) => unlinkAllocation.mutate({ expenseId: expense.id, allocationId })}
              />
            </div>
          )}

          {/* Linked attribution fees */}
          {expense && safeAttributionFees.length > 0 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <small><strong>Linked attribution fees</strong></small>
              <LinkedItemsSection
                linkedIds={expense.attributionFeeIds ?? []}
                allItems={safeAttributionFees}
                label={(f: AttributionFee) => f.description ? `#${f.id} — ${f.description}` : `#${f.id}`}
                emptyText="No attribution fees linked."
                addPlaceholder="+ Link attribution fee..."
                onLink={(feeId: number) => linkAttributionFee.mutate({ expenseId: expense.id, feeId })}
                onUnlink={(feeId: number) => unlinkAttributionFee.mutate({ expenseId: expense.id, feeId })}
              />
            </div>
          )}

          {/* Payments */}
          {expense && (
            <div style={{ gridColumn: "1 / -1" }}>
              <ExpensePaymentsSection
                expenseId={expense.id}
                amount={expense.amount}
                paymentStatus={expense.paymentStatus}
              />
            </div>
          )}
        </div>

        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          {onDelete && (
            <button type="button" className="contrast outline" onClick={onDelete}>
              Delete
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            aria-busy={isBusy}
            disabled={isBusy || !!fileError}
          >
            Save
          </button>
        </footer>
      </form>
    </Modal>
  );
}

// ─── Linked Items Section (generic) ───────────────────────────────────────────

interface LinkedItemsSectionProps<T extends { id: number }> {
  linkedIds: number[];
  allItems: T[];
  label: (item: T) => string;
  emptyText: string;
  addPlaceholder: string;
  onLink: (id: number) => void;
  onUnlink: (id: number) => void;
}

function LinkedItemsSection<T extends { id: number }>({
  linkedIds,
  allItems,
  label,
  emptyText,
  addPlaceholder,
  onLink,
  onUnlink,
}: LinkedItemsSectionProps<T>) {
  const linked = allItems.filter((i) => linkedIds.includes(i.id));
  const unlinked = allItems.filter((i) => !linkedIds.includes(i.id));

  return (
    <div style={{ marginTop: "0.25rem" }}>
      {linked.length > 0 ? (
        <ul style={{ margin: "0.25rem 0", paddingLeft: "1rem" }}>
          {linked.map((item) => (
            <li key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85em" }}>
              <span>{label(item)}</span>
              <button
                type="button"
                className="contrast outline"
                style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                onClick={() => onUnlink(item.id)}
              >✕</button>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: "0.25rem 0", color: "var(--pico-muted-color)", fontSize: "0.85em" }}>
          {emptyText}
        </p>
      )}
      {unlinked.length > 0 && (
        <select
          value=""
          onChange={(e) => { if (e.target.value) onLink(Number(e.target.value)); }}
          style={{ margin: "0.25rem 0", fontSize: "0.85em" }}
        >
          <option value="">{addPlaceholder}</option>
          {unlinked.map((item) => (
            <option key={item.id} value={item.id}>{label(item)}</option>
          ))}
        </select>
      )}
    </div>
  );
}
