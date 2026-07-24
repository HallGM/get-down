import { useState } from "react";
import type { ExpensePaymentSummary } from "@get-down/shared";
import { useDeleteExpensePayment } from "../../api/hooks/useExpensePayments.js";
import { formatPaymentAmount } from "../../utils/money.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import DateCell from "../../components/DateCell.js";

interface Props {
  payment: ExpensePaymentSummary;
}

export default function ExpensePaymentRow({ payment }: Props) {
  const deletePayment = useDeleteExpensePayment(payment.expenseId);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const itemName = formatPaymentAmount(payment.amount);

  return (
    <>
      <tr>
        <td style={{ whiteSpace: "nowrap" }}>
          <DateCell date={payment.date} />
        </td>
        <td>{payment.expenseDescription}</td>
        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <MoneyDisplay pennies={payment.amount} />
        </td>
        <td>{payment.paidForBy}</td>
        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <button
            type="button"
            className="contrast outline"
            style={{ padding: "0.15em 0.5em", fontSize: "0.8rem" }}
            onClick={() => setDeleteConfirming(true)}
          >
            Delete
          </button>
        </td>
      </tr>

      {deleteConfirming && (
        <ConfirmDelete
          open
          itemName={itemName}
          onConfirm={async () => {
            try {
              await deletePayment.mutateAsync(payment.id);
              setDeleteConfirming(false);
            } catch (err) {
              console.error("Failed to delete payment:", err);
              // Error toast already shown by useApiMutation; keep modal open for retry
            }
          }}
          onCancel={() => setDeleteConfirming(false)}
          loading={deletePayment.isPending}
        />
      )}
    </>
  );
}
