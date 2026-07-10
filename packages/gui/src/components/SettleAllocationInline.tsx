import { useState } from "react";
import type { FeeAllocationAlert } from "@get-down/shared";
import { useExpenses } from "../api/hooks/useExpenses.js";
import ExpensePickerModal from "./ExpensePickerModal.js";
import { useLinkExpenseToAllocation } from "../api/hooks/useFeeAllocations.js";
import ErrorBanner from "./ErrorBanner.js";
import ExpenseCreateModal from "./ExpenseCreateModal.js";

export interface SettleAllocationInlineProps {
  allocation: FeeAllocationAlert;
  onSettled: () => void;
}

type Mode = "create" | "pick";

export default function SettleAllocationInline({
  allocation,
  onSettled,
}: SettleAllocationInlineProps) {
  const [mode, setMode] = useState<Mode>("create");
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch all expenses for the picker
  const { data: allExpenses = [] } = useExpenses();

  const linkExpense = useLinkExpenseToAllocation();

  const isLoading = linkExpense.isPending;
  const error = linkExpense.error;

  async function handlePickExpense(expenseId: number) {
    try {
      await linkExpense.mutateAsync({
        allocationId: allocation.id,
        expenseId,
      });
      setShowPicker(false);
      onSettled();
    } catch {
      // Error is shown via the error banner
    }
  }

  function buildInitialValues() {
    return {
      description: allocation.personName && allocation.eventName
        ? `${allocation.personName}, ${allocation.eventName}`
        : allocation.eventName || "",
      amount: allocation.totalFee,
    };
  }

  return (
    <>
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", padding: "0.75rem 0" }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--pico-muted-border-color)", paddingBottom: "0.5rem" }}>
          <button
            type="button"
            className={mode === "create" ? "secondary" : "secondary outline"}
            style={{ padding: "0.3em 0.6em", fontSize: "0.85em" }}
            onClick={() => setMode("create")}
          >
            Create new
          </button>
          <button
            type="button"
            className={mode === "pick" ? "secondary" : "secondary outline"}
            style={{ padding: "0.3em 0.6em", fontSize: "0.85em" }}
            onClick={() => setMode("pick")}
          >
            Pick existing
          </button>
        </div>
      </div>

      {error && (
        <ErrorBanner
          error={
            error instanceof Error ? error.message : "Failed to settle allocation"
          }
        />
      )}

      {mode === "create" ? (
        <div style={{ paddingTop: "0.5rem" }}>
          <button
            type="button"
            className="secondary"
            onClick={() => setShowCreateModal(true)}
            disabled={isLoading}
            aria-busy={isLoading}
            style={{ padding: "0.5em 1em" }}
          >
            Create new expense
          </button>
          <ExpenseCreateModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            initialValues={buildInitialValues()}
            allocationId={allocation.id}
            onCreated={() => {
              setShowCreateModal(false);
              onSettled();
            }}
          />
        </div>
      ) : (
        <div style={{ paddingTop: "0.5rem" }}>
          <button
            type="button"
            className="secondary"
            onClick={() => setShowPicker(true)}
            disabled={isLoading}
            style={{ padding: "0.5em 1em" }}
          >
            Select an expense
          </button>
          <ExpensePickerModal
            open={showPicker}
            onClose={() => setShowPicker(false)}
            expenses={allExpenses}
            onSelect={(e) => handlePickExpense(e.id)}
          />
        </div>
      )}
    </>
  );
}
