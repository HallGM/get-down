import type { FeeAllocation, Expense } from "@get-down/shared";

interface LinkedExpensesSectionProps {
  allocation: FeeAllocation;
  allExpenses: Expense[];
  onAddExpense: () => void;
  onBrowse: () => void;
  onEdit: (expense: Expense) => void;
  onApportion: (expense: Expense, expenseLink: FeeAllocation['expenseLinks'][number]) => void;
  onRemove: (expense: Expense) => void;
}

export function LinkedExpensesSection({
  allocation,
  allExpenses,
  onAddExpense,
  onBrowse,
  onEdit,
  onApportion,
  onRemove,
}: LinkedExpensesSectionProps) {
  const linkedExpenses = allExpenses.filter((e) =>
    allocation.expenseLinks?.some((link) => link.expenseId === e.id)
  );

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
          {linkedExpenses.map((e) => {
            const link = allocation.expenseLinks?.find((l) => l.expenseId === e.id);
            return (
              <li key={e.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85em" }}>
                <button
                  type="button"
                  className="secondary outline"
                  style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                  onClick={() => onEdit(e)}
                >
                  Edit
                </button>
                <span>
                  {e.description}
                  {link?.apportionedAmount !== null && link?.apportionedAmount !== e.amount && (
                    <span style={{ fontSize: "0.9em", color: "var(--pico-muted-color)" }}>
                      {" "}
                      ({(link?.apportionedAmount ?? 0) / 100} of {e.amount / 100})
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className="secondary outline"
                  style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                  onClick={() => link && onApportion(e, link)}
                >
                  Apportion
                </button>
                <button
                  type="button"
                  className="contrast outline"
                  style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                  onClick={() => onRemove(e)}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p style={{ margin: "0.25rem 0", color: "var(--pico-muted-color)", fontSize: "0.85em" }}>No expenses linked.</p>
      )}
    </div>
  );
}
