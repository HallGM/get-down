import { useState, useMemo } from "react";
import type { Showcase, ShowcaseExpenseLink, Expense } from "@get-down/shared";
import { useExpenses } from "../../api/hooks/useExpenses.js";
import { useFeeAllocations } from "../../api/hooks/useFeeAllocations.js";
import {
  useShowcases,
  useLinkExpenseToShowcase,
  useUnlinkExpenseFromShowcase,
  useUpdateShowcaseExpenseLink,
} from "../../api/hooks/useShowcases.js";
import { ApportionModal } from "../../components/ApportionModal.js";
import ExpenseModal from "../../components/ExpenseModal.js";
import ExpenseCreateModal from "../../components/ExpenseCreateModal.js";
import ExpensePickerModal from "../../components/ExpensePickerModal.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import Modal from "../../components/Modal.js";
import { formatDate } from "../../utils/date.js";

interface Props {
  showcase: Showcase;
}

export default function ShowcaseExpensesTab({ showcase }: Props) {
  const { data: allExpenses = [] } = useExpenses();
  const { data: allShowcases = [] } = useShowcases();
  const { data: allAllocations = [] } = useFeeAllocations();

  const linkExpense = useLinkExpenseToShowcase();
  const unlinkExpense = useUnlinkExpenseFromShowcase();

  const [showCreate, setShowCreate] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<Expense | null>(null);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);

  // Resolve each link to its full expense object
  const linkedRows = useMemo(
    () =>
      showcase.expenseLinks
        .map((link) => {
          const expense = allExpenses.find((e) => e.id === link.expenseId);
          return expense ? { link, expense } : null;
        })
        .filter((r): r is { link: ShowcaseExpenseLink; expense: Expense } => r !== null),
    [showcase.expenseLinks, allExpenses],
  );

  // Calculated total: sum of apportionedAmount ?? expense.amount per link
  const calculatedCost = useMemo(
    () =>
      linkedRows.reduce(
        (sum, { link, expense }) => sum + (link.apportionedAmount ?? expense.amount),
        0,
      ),
    [linkedRows],
  );

  // Set of expense IDs that are also linked to OTHER showcases with no apportioned amount
  const doubleCountRisk = useMemo(() => {
    const risk = new Set<number>();
    for (const { link } of linkedRows) {
      if (link.apportionedAmount !== null) continue;
      for (const other of allShowcases) {
        if (other.id === showcase.id) continue;
        const otherLink = other.expenseLinks.find((l) => l.expenseId === link.expenseId);
        if (otherLink && otherLink.apportionedAmount === null) {
          risk.add(link.expenseId);
          break;
        }
      }
    }
    return risk;
  }, [linkedRows, allShowcases, showcase.id]);

  // Expenses not already linked (for picker)
  const linkedExpenseIds = new Set(showcase.expenseLinks.map((l) => l.expenseId));
  const pickableExpenses = useMemo(
    () => allExpenses.filter((e) => !linkedExpenseIds.has(e.id)),
    [allExpenses, linkedExpenseIds],
  );

  function handleCreated(expense: Expense) {
    linkExpense.mutate({ showcaseId: showcase.id, expenseId: expense.id });
    setShowCreate(false);
  }

  function handlePicked(expense: Expense) {
    linkExpense.mutate({ showcaseId: showcase.id, expenseId: expense.id });
    setShowPicker(false);
  }

  function handleUnlink() {
    if (!unlinkTarget) return;
    unlinkExpense.mutate({ showcaseId: showcase.id, expenseId: unlinkTarget.id });
    setUnlinkTarget(null);
  }

  return (
    <section>
      {/* Cost summary */}
      <div style={{ marginBottom: "1.25rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        <div>
          <small style={{ color: "var(--pico-muted-color)", display: "block" }}>Cost</small>
          <strong>
            <MoneyDisplay pennies={calculatedCost} />
          </strong>
        </div>
        {showcase.costAirtable != null && (
          <div>
            <small style={{ color: "var(--pico-muted-color)", display: "block" }}>
              Cost (Airtable)
            </small>
            <span style={{ color: "var(--pico-muted-color)" }}>
              <MoneyDisplay pennies={showcase.costAirtable} />
            </span>
          </div>
        )}
      </div>

      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Linked Expenses</h2>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            className="secondary outline"
            style={{ padding: "0.25em 0.6em" }}
            onClick={() => setShowCreate(true)}
          >
            + Add Expense
          </button>
          <button
            className="secondary outline"
            style={{ padding: "0.25em 0.6em" }}
            onClick={() => setShowPicker(true)}
          >
            Link Existing
          </button>
        </div>
      </div>

      {/* Expense rows */}
      {linkedRows.length === 0 ? (
        <p style={{ color: "var(--pico-muted-color)", fontSize: "0.9em" }}>
          No expenses linked to this showcase yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {linkedRows.map(({ link, expense }) => (
            <ExpenseRow
              key={expense.id}
              showcase={showcase}
              link={link}
              expense={expense}
              hasDoubleCountRisk={doubleCountRisk.has(expense.id)}
              onView={() => setViewExpense(expense)}
              onUnlink={() => setUnlinkTarget(expense)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ExpenseCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />

      <ExpensePickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        expenses={pickableExpenses}
        onSelect={handlePicked}
      />

      <Modal open={!!unlinkTarget} onClose={() => setUnlinkTarget(null)} title="Unlink expense">
        <p>
          Remove the link between <strong>{unlinkTarget?.description}</strong> and this showcase?
          The expense itself will not be deleted.
        </p>
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={() => setUnlinkTarget(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="contrast outline"
            aria-busy={unlinkExpense.isPending}
            disabled={unlinkExpense.isPending}
            onClick={handleUnlink}
          >
            Unlink
          </button>
        </footer>
      </Modal>

      <ExpenseModal
        expense={viewExpense}
        onClose={() => setViewExpense(null)}
        allAllocations={allAllocations}
      />
    </section>
  );
}

// ─── Individual expense row ────────────────────────────────────────────────────

interface ExpenseRowProps {
  showcase: Showcase;
  link: ShowcaseExpenseLink;
  expense: Expense;
  hasDoubleCountRisk: boolean;
  onView: () => void;
  onUnlink: () => void;
}

function ExpenseRow({
  showcase,
  link,
  expense,
  hasDoubleCountRisk,
  onView,
  onUnlink,
}: ExpenseRowProps) {
  const [showApportion, setShowApportion] = useState(false);
  const updateLink = useUpdateShowcaseExpenseLink();

  const isPartial = link.apportionedAmount !== null;

  return (
    <>
      <div
        style={{
          border: `1px solid ${hasDoubleCountRisk ? "var(--pico-del-color, #c62828)" : "var(--pico-muted-border-color)"}`,
          borderRadius: "var(--pico-border-radius)",
          padding: "0.65rem 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
        }}
      >
        {/* Clickable body */}
        <div
          tabIndex={0}
          onClick={onView}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onView()}
          style={{ cursor: "pointer", outline: "none" }}
        >
          {/* Top row: description + date + category */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
            <strong style={{ fontSize: "0.9em" }}>{expense.description}</strong>
            {expense.date && (
              <span style={{ color: "var(--pico-muted-color)", fontSize: "0.85em" }}>
                {formatDate(expense.date)}
              </span>
            )}
            {expense.category && (
              <span style={{ color: "var(--pico-muted-color)", fontSize: "0.85em" }}>
                {expense.category}
              </span>
            )}
          </div>

          {/* Amount row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              fontSize: "0.875em",
              marginTop: "0.25rem",
            }}
          >
            <span style={{ color: "var(--pico-muted-color)" }}>
              Total: <MoneyDisplay pennies={expense.amount} />
            </span>
            {isPartial && (
              <span>
                Apportioned:{" "}
                <strong>
                  <MoneyDisplay pennies={link.apportionedAmount!} />
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Action buttons — outside clickable body so they don't bubble */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginTop: "0.25rem",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {isPartial ? (
            <>
              <button
                type="button"
                className="secondary outline"
                style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                onClick={() => setShowApportion(true)}
              >
                Edit apportionment
              </button>
            </>
          ) : (
            <button
              type="button"
              className="secondary outline"
              style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
              onClick={() => setShowApportion(true)}
            >
              Apportion
            </button>
          )}
          <button
            type="button"
            className="contrast outline"
            style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
            onClick={onUnlink}
          >
            Unlink
          </button>
        </div>

        {/* Double-count warning */}
        {hasDoubleCountRisk && (
          <p style={{ margin: 0, fontSize: "0.8em", color: "var(--pico-del-color, #c62828)" }}>
            This expense is also linked to another showcase without an apportioned amount. The full
            amount may be counted more than once. Set an apportioned amount to avoid this.
          </p>
        )}
      </div>

      {showApportion && (
        <ApportionModal
          expense={expense}
          currentAmount={link.apportionedAmount}
          onClose={() => setShowApportion(false)}
          onSave={(apportionedAmount) => {
            updateLink.mutate(
              { showcaseId: showcase.id, expenseId: expense.id, apportionedAmount },
              { onSuccess: () => setShowApportion(false) }
            );
          }}
          isPending={updateLink.isPending}
        />
      )}
    </>
  );
}

