import type { AccountTransaction } from "@get-down/shared";
import Modal from "./Modal.js";
import DataTable, { type Column } from "./DataTable.js";
import MoneyDisplay from "./MoneyDisplay.js";
import { formatDate } from "../utils/date.js";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Caller pre-filters this list to exclude already-linked transactions. */
  transactions: AccountTransaction[];
  /** Called with the selected transaction; modal closes automatically. */
  onSelect: (transaction: AccountTransaction) => void;
}

const COLUMNS: Column<AccountTransaction>[] = [
  { key: "date", header: "Date", sortable: true, render: (t) => formatDate(t.date) },
  { key: "type", header: "Type", sortable: true, render: (t) => t.type },
  { key: "description", header: "Description", sortable: true, render: (t) => t.description ?? "—" },
  { key: "amount", header: "Amount", render: (t) => <MoneyDisplay pennies={t.amount} /> },
];

export default function TransactionPickerModal({ open, onClose, transactions, onSelect }: Props) {
  // Pre-sort newest first; user can re-sort via column headers
  const sorted = [...transactions].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  function handleSelect(transaction: AccountTransaction) {
    onSelect(transaction);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Select transaction">
      <DataTable<AccountTransaction>
        columns={COLUMNS}
        data={sorted}
        onRowClick={handleSelect}
        emptyMessage="No transactions available to link."
        filterPlaceholder="Search by type or description…"
        filterFn={(t, q) => {
          const lq = q.toLowerCase();
          return (
            t.type.toLowerCase().includes(lq) ||
            (t.description ?? "").toLowerCase().includes(lq)
          );
        }}
      />
      <footer style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button type="button" className="secondary" onClick={onClose}>Cancel</button>
      </footer>
    </Modal>
  );
}
