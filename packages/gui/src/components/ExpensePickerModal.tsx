import type { Expense } from "@get-down/shared";
import Modal from "./Modal.js";
import DataTable, { type Column } from "./DataTable.js";
import MoneyDisplay from "./MoneyDisplay.js";
import { formatDate } from "../utils/date.js";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Caller pre-filters this list to exclude already-linked expenses. */
  expenses: Expense[];
  /** Called with the selected expense; modal closes automatically. */
  onSelect: (expense: Expense) => void;
}

const COLUMNS: Column<Expense>[] = [
  { key: "date", header: "Date", sortable: true, render: (e) => formatDate(e.date) },
  { key: "description", header: "Description", sortable: true },
  { key: "amount", header: "Amount", render: (e) => <MoneyDisplay pennies={e.amount} /> },
  { key: "recipientName", header: "Recipient", render: (e) => e.recipientName ?? "—" },
  { key: "category", header: "Category", render: (e) => e.category ?? "—" },
  {
    key: "documentUrl",
    header: "Doc",
    render: (e) =>
      e.documentUrl ? (
        <a
          href={e.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(ev) => ev.stopPropagation()}
        >
          View
        </a>
      ) : null,
  },
];

export default function ExpensePickerModal({ open, onClose, expenses, onSelect }: Props) {
  // Pre-sort newest first; user can re-sort via column headers
  const sorted = [...expenses].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  function handleSelect(expense: Expense) {
    onSelect(expense);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Select expense">
      <DataTable<Expense>
        columns={COLUMNS}
        data={sorted}
        onRowClick={handleSelect}
        emptyMessage="No expenses available to link."
        filterPlaceholder="Search by description, recipient or category…"
        filterFn={(e, q) => {
          const lq = q.toLowerCase();
          return (
            (e.description ?? "").toLowerCase().includes(lq) ||
            (e.recipientName ?? "").toLowerCase().includes(lq) ||
            (e.category ?? "").toLowerCase().includes(lq)
          );
        }}
      />
      <footer style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button type="button" className="secondary" onClick={onClose}>Cancel</button>
      </footer>
    </Modal>
  );
}
