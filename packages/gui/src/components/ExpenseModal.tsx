import { useState, useEffect } from "react";
import type { Expense, FeeAllocation, AttributionFee, CreateInvoiceCardChargeRequest, UpdateInvoiceCardChargeRequest } from "@get-down/shared";
import { MAX_DOCUMENT_SIZE_BYTES } from "@get-down/shared";
import Modal from "./Modal.js";
import FormField from "./FormField.js";
import MoneyField from "./MoneyField.js";
import ExpensePaymentsSection from "./ExpensePaymentsSection.js";
import { PaymentFormFields, EMPTY_PAYMENT_FORM, type PaymentFormState } from "./ExpensePaymentFormFields.js";
import { toInputDate } from "../utils/date.js";
import { apiFetch } from "../api/client.js";
import {
  useUpdateExpense,
  useUploadExpenseDocument,
  useDeleteExpenseDocument,
  useLinkAllocationToExpense,
  useUnlinkAllocationFromExpense,
  useLinkAttributionFeeToExpense,
  useUnlinkAttributionFeeFromExpense,
} from "../api/hooks/useExpenses.js";
import { useViewPersonInvoicePdf } from "../api/hooks/usePersonInvoices.js";
import { useAddCardCharge, useUpdateCardCharge, useGigInvoices } from "../api/hooks/useInvoices.js";
import { useAccounts } from "../api/hooks/useAccounts.js";
import { useRecordPaymentForm } from "../api/hooks/useRecordPaymentForm.js";

export interface CardChargeContext {
  invoiceId: number | null;
  gigId: number;
  chargeId?: number;
}

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
  /** When present, modal is in "card charge editing" mode: description/amount are always editable and save flows through card charge endpoints. */
  cardChargeContext?: CardChargeContext;
}

export default function ExpenseModal({ expense, onClose, allAllocations, allAttributionFees, onDelete, cardChargeContext }: Props) {
  const safeAttributionFees = allAttributionFees ?? [];
  const updateExpense = useUpdateExpense();
  const uploadDocument = useUploadExpenseDocument();
  const deleteDocument = useDeleteExpenseDocument();
  const linkAllocation = useLinkAllocationToExpense();
  const unlinkAllocation = useUnlinkAllocationFromExpense();
  const linkAttributionFee = useLinkAttributionFeeToExpense();
  const unlinkAttributionFee = useUnlinkAttributionFeeFromExpense();
  const viewPersonInvoicePdf = useViewPersonInvoicePdf();
  const addCardCharge = useAddCardCharge();
  const updateCardCharge = useUpdateCardCharge();
  const { data: accounts = [] } = useAccounts();
  const { data: invoices = [] } = useGigInvoices(cardChargeContext?.gigId ?? 0);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isTaxOnly, setIsTaxOnly] = useState(false);
  const [file, setFile] = useState<File | undefined>(undefined);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [localDocUrl, setLocalDocUrl] = useState<string | undefined>(undefined);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  // Payment recording state for the add-card-charge flow
  const businessAccount = accounts.find((a) => a.isBusiness);
  const {
    recordPayment,
    handleRecordPaymentToggle,
    paymentForm,
    setPaymentFormFields,
  } = useRecordPaymentForm(
    cardChargeContext ? !cardChargeContext.chargeId && !expense : false,
    amount,
    date,
    businessAccount?.id
  );

  // Reset form when expense changes
  useEffect(() => {
    if (!expense) return;
    setDescription(expense.description ?? "");
    setAmount(expense.amount);
    setDate(toInputDate(expense.date));
    setCategory(expense.category ?? "");
    setRecipientName(expense.recipientName ?? "");
    setIsTaxOnly(expense.isTaxOnly ?? false);
    setFile(undefined);
    setSubmitError(undefined);
    setLocalDocUrl(expense.documentUrl);
  }, [expense?.id]);

  // Sync selectedInvoiceId with cardChargeContext when editing
  useEffect(() => {
    if (cardChargeContext?.chargeId) {
      setSelectedInvoiceId(cardChargeContext.invoiceId);
    }
  }, [cardChargeContext?.chargeId, cardChargeContext?.invoiceId]);

  // Determine if description/amount should be locked (read-only)
  // They are locked when:
  // - cardChargeContext is NOT present (normal expense editing from Expenses page)
  // - AND expense is linked to a card charge
  const isDescriptionAmountLocked = !cardChargeContext && !!expense?.linkedCardCharge;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (submitError) return;
    
    // Card charge creation flow (chargeId undefined, expense is null)
    if (cardChargeContext && !cardChargeContext.chargeId && !expense) {
       const chargeInput: CreateInvoiceCardChargeRequest = {
         description,
         amount: amount ?? 0,
         recipientName: recipientName || undefined,
       };
       const newCharge = await addCardCharge.mutateAsync({
         invoiceId: selectedInvoiceId,
         gigId: cardChargeContext.gigId,
         input: chargeInput,
       });
      
       // newCharge includes expenseId. Now update the expense with date/category if they differ from defaults
       // and upload document if present
       const expenseId = newCharge.expenseId;
       if (expenseId) {
         const updates = [];
         if (date || category) {
           updates.push(
             updateExpense.mutateAsync({
               id: expenseId,
               input: {
                 date: date || undefined,
                 category: category || undefined,
               },
             })
           );
         }
         if (file) {
           updates.push(uploadDocument.mutateAsync({ id: expenseId, file }));
         }
         if (updates.length > 0) {
           await Promise.all(updates);
         }
         
          // Record payment if checkbox was checked
          if (recordPayment && typeof paymentForm.accountId === "number" && paymentForm.accountId > 0) {
           await apiFetch("POST", `/expenses/${expenseId}/payments`, {
             accountId: paymentForm.accountId,
             amount: paymentForm.amount,
             date: paymentForm.date || undefined,
             paymentMethod: paymentForm.paymentMethod || undefined,
             description: paymentForm.description || undefined,
           });
         }
       }
       // Always close the modal after successful add
       onClose();
       return;
    }
    
    // Card charge update flow (chargeId is set)
    if (cardChargeContext && cardChargeContext.chargeId && expense) {
      const chargeInput: UpdateInvoiceCardChargeRequest = {
        invoiceId: selectedInvoiceId,
        description,
        amount: amount ?? 0,
        recipientName: recipientName || undefined,
      };
      await updateCardCharge.mutateAsync({
        invoiceId: cardChargeContext.invoiceId,
        chargeId: cardChargeContext.chargeId,
        gigId: cardChargeContext.gigId,
        input: chargeInput,
      });
      
      // Update expense fields that card charge doesn't sync (date, category)
      if (date || category) {
        await updateExpense.mutateAsync({
          id: expense.id,
          input: {
            date: date || undefined,
            category: category || undefined,
          },
        });
      }
      
      if (file) {
        await uploadDocument.mutateAsync({ id: expense.id, file });
      }
      onClose();
      return;
    }
    
     // Normal expense editing flow
     if (expense && !cardChargeContext) {
       // Cannot switch to tax-only if payments exist
       if (isTaxOnly && !canToggleTaxOnly) {
         setSubmitError('Cannot mark as tax-only while payments are recorded. Remove payments first.');
         return;
       }
      
      await updateExpense.mutateAsync({
        id: expense.id,
        input: {
          description: isDescriptionAmountLocked ? undefined : description,
          amount: isDescriptionAmountLocked ? undefined : (amount ?? 0),
          date: date || undefined,
          category: category || undefined,
          recipientName: recipientName || undefined,
          isTaxOnly,
        },
      });
      if (file) {
        await uploadDocument.mutateAsync({ id: expense.id, file });
      }
      onClose();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) { setFile(undefined); setSubmitError(undefined); return; }
    if (f.size > MAX_DOCUMENT_SIZE_BYTES) {
      setFile(undefined);
      setSubmitError("File must be 20 MB or smaller.");
      e.target.value = "";
      return;
    }
    setSubmitError(undefined);
    setFile(f);
  }

   const isBusy = updateExpense.isPending || uploadDocument.isPending || addCardCharge.isPending || updateCardCharge.isPending;

   // Can only toggle tax-only status if the expense has no payments (unpaid or already tax-only)
   const canToggleTaxOnly = expense && (expense.paymentStatus === 'unpaid' || expense.paymentStatus === 'taxOnly');

   // Determine modal title
   const modalTitle = cardChargeContext
     ? (cardChargeContext.chargeId ? "Edit Card Charge" : "Add Card Charge")
     : "Edit Expense";

  return (
    <Modal open={!!expense || (cardChargeContext && !cardChargeContext.chargeId)} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSave}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <FormField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={isDescriptionAmountLocked}
            />
            {isDescriptionAmountLocked && (
              <small style={{ color: "var(--pico-muted-color)" }}>Set by the linked card charge.</small>
            )}
          </div>
          <div>
            <MoneyField
              label="Amount"
              value={amount}
              onChange={(p) => setAmount(p ?? 0)}
              required
              min={0}
              disabled={isDescriptionAmountLocked}
            />
            {isDescriptionAmountLocked && (
              <small style={{ color: "var(--pico-muted-color)" }}>Set by the linked card charge.</small>
            )}
          </div>
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

           {/* Tax-only toggle - only for normal expense editing */}
           {!cardChargeContext && expense && (
             <div style={{ gridColumn: "1 / -1", marginTop: "0.25rem" }}>
               <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
                  <input
                    type="checkbox"
                    checked={isTaxOnly}
                    onChange={(e) => setIsTaxOnly(e.target.checked)}
                    disabled={!canToggleTaxOnly}
                    style={{ margin: 0 }}
                  />
                 <span>Personal cost, tax claim only</span>
               </label>
                {!canToggleTaxOnly && (
                  <small style={{ color: "var(--pico-color-red-500)", display: "block", marginTop: "0.25rem" }}>
                    ⚠️ Remove all payments before marking as tax-only.
                  </small>
                )}
             </div>
           )}
           <div style={{ gridColumn: "1 / -1" }}>
             <small><strong>Document</strong></small>
             {expense?.personInvoice ? (
               <div style={{ marginTop: "0.25rem" }}>
                 <button
                   type="button"
                   className="secondary"
                   style={{ padding: "0.4em 0.8em" }}
                   aria-busy={viewPersonInvoicePdf.isPending}
                   disabled={viewPersonInvoicePdf.isPending}
                   onClick={() => {
                     if (expense.personInvoice) {
                       viewPersonInvoicePdf.mutate({ id: expense.personInvoice.id });
                     }
                   }}
                 >
                   Invoice {expense.personInvoice.invoiceNumber} — {expense.personInvoice.personName}
                 </button>
               </div>
             ) : localDocUrl ? (
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
                  {submitError && <small style={{ color: "var(--pico-color-red-500)" }}>{submitError}</small>}
                </div>
             )}
             </div>

            {/* Invoice selector - for add or edit card charge flow */}
            {cardChargeContext && !expense && (
              <div style={{ gridColumn: "1 / -1", marginTop: "0.25rem" }}>
                <label>
                  <small>Invoice (optional)</small>
                  <select
                    value={selectedInvoiceId ?? ""}
                    onChange={(e) => setSelectedInvoiceId(e.target.value ? +e.target.value : null)}
                    style={{ marginTop: "0.25rem" }}
                  >
                    <option value="">No invoice</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} ({inv.invoiceType})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {/* Record payment now checkbox - only for add-card-charge flow */}
           {cardChargeContext && !cardChargeContext.chargeId && !expense && (
             <div style={{ gridColumn: "1 / -1", marginTop: "0.25rem" }}>
               <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
                 <input
                   type="checkbox"
                   checked={recordPayment}
                   onChange={(e) => handleRecordPaymentToggle(e.target.checked)}
                   style={{ margin: 0 }}
                 />
                 <span>Record payment now</span>
               </label>
             </div>
           )}

           {/* Inline payment fields - only shown when recording payment for new card charge */}
           {recordPayment && cardChargeContext && !cardChargeContext.chargeId && !expense && (
             <div style={{ gridColumn: "1 / -1" }}>
               <PaymentFormFields
                 form={paymentForm}
                 setForm={setPaymentFormFields}
                 accounts={accounts}
               />
             </div>
           )}

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
            disabled={isBusy || !!submitError}
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
