import { useState } from "react";
import type { FeeAllocation, AccountTransaction, Account } from "@get-down/shared";
import { useAccountTransactions, useDeleteTransaction } from "../api/hooks/useAccounts.js";
import TransactionPickerModal from "./TransactionPickerModal.js";
import TransactionCreateModal from "./TransactionCreateModal.js";
import TransactionModal from "./TransactionModal.js";
import Modal from "./Modal.js";
import MoneyDisplay from "./MoneyDisplay.js";

interface LinkedTransactionsSectionProps {
  allocation: FeeAllocation;
  accounts: Account[];
  gigName: string;
  personName: string;
  onLink: (transactionId: number) => void;
  onUnlink: (transactionId: number) => void;
}

export function LinkedTransactionsSection({
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
    description: `${gigName} - ${personName}`,
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
