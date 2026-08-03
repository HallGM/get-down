import { useState, useEffect } from "react";
import { EMPTY_PAYMENT_FORM, type PaymentFormState } from "../../components/ExpensePaymentFormFields.js";
import { toInputDate } from "../../utils/date.js";

// Extends the shared form state with dirty-tracking for auto-sync behaviour
export interface LocalPaymentState extends PaymentFormState {
  amountDirty: boolean;
  dateDirty: boolean;
}

export const EMPTY_LOCAL_PAYMENT: LocalPaymentState = {
  ...EMPTY_PAYMENT_FORM,
  amountDirty: false,
  dateDirty: false,
};

/**
 * Hook for managing "record payment now" flow.
 * Provides:
 * - recordPayment checkbox state
 * - paymentForm state with dirty-tracking
 * - Auto-sync of amount/date from expense (respecting user edits)
 * - Helper functions to update form
 */
export function useRecordPaymentForm(
  shouldAutoSync: boolean,
  defaultAmount?: number,
  defaultDate?: string,
  businessAccountId?: number | string,
  getToggleDate?: () => string
) {
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<LocalPaymentState>(EMPTY_LOCAL_PAYMENT);

  // Auto-sync amount/date from expense (unless user has edited them)
  useEffect(() => {
    if (shouldAutoSync && recordPayment) {
      setPaymentForm((f) => ({
        ...f,
        amount: f.amountDirty ? f.amount : (defaultAmount ?? 0),
        date: f.dateDirty ? f.date : (defaultDate || ""),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAmount, defaultDate, recordPayment]);

  function handleRecordPaymentToggle(checked: boolean) {
    if (checked) {
      const toggleDate = getToggleDate?.() || toInputDate(new Date());
      setPaymentForm({
        accountId: businessAccountId ?? "",
        amount: defaultAmount ?? 0,
        date: toggleDate,
        paymentMethod: "Transfer",
        description: "",
        amountDirty: false,
        dateDirty: true,
      });
    } else {
      setPaymentForm(EMPTY_LOCAL_PAYMENT);
    }
    setRecordPayment(checked);
  }

  function setPaymentFormFields(fn: (state: LocalPaymentState) => PaymentFormState) {
    setPaymentForm((f) => {
      const { amountDirty, dateDirty, ...base } = f;
      const next = fn(base);
      return {
        ...next,
        amountDirty: amountDirty || next.amount !== base.amount,
        dateDirty: dateDirty || next.date !== base.date,
      };
    });
  }

  return {
    recordPayment,
    setRecordPayment,
    handleRecordPaymentToggle,
    paymentForm,
    setPaymentFormFields,
  };
}


