import { useState } from "react";
import type { Expense } from "@get-down/shared";
import { penniesToPounds, poundsToPennies } from "../utils/money.js";
import MoneyDisplay from "./MoneyDisplay.js";
import Modal from "./Modal.js";

export interface ApportionModalProps {
  expense: Expense;
  currentAmount: number | null;
  onClose: () => void;
  onSave: (apportionedAmount: number | null) => void;
  isPending: boolean;
}

export function ApportionModal({
  expense,
  currentAmount,
  onClose,
  onSave,
  isPending,
}: ApportionModalProps) {
  const [draft, setDraft] = useState<string>(
    currentAmount != null ? String(penniesToPounds(currentAmount)) : "",
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed !== "") {
      const parsed = parseFloat(trimmed);
      if (isNaN(parsed)) {
        setValidationError("Please enter a valid number.");
        return;
      }
      const newAmount = poundsToPennies(parsed);
      if (newAmount <= 0) {
        setValidationError("Amount must be greater than £0.00.");
        return;
      }
    }
    setValidationError(null);
    const newAmount = trimmed === "" ? null : poundsToPennies(parseFloat(trimmed));
    onSave(newAmount);
  }

  function handleClear() {
    onSave(null);
  }

  return (
    <Modal open onClose={onClose} title="Apportion expense">
      <p style={{ marginBottom: "0.5rem", fontSize: "0.9em", color: "var(--pico-muted-color)" }}>
        Expense total: <MoneyDisplay pennies={expense.amount} />
      </p>
      <label>
        Apportioned amount (£)
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="e.g. 50.00"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setValidationError(null);
          }}
          autoFocus
        />
        {validationError && (
          <small style={{ color: "var(--pico-del-color, #c62828)" }}>{validationError}</small>
        )}
      </label>
      <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        {currentAmount !== null && (
          <button
            type="button"
            className="secondary outline"
            aria-busy={isPending}
            disabled={isPending}
            onClick={handleClear}
          >
            Clear
          </button>
        )}
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          aria-busy={isPending}
          disabled={isPending || draft.trim() === ""}
          onClick={handleSave}
        >
          Save
        </button>
      </footer>
    </Modal>
  );
}
