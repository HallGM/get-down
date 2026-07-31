import { useState } from "react";
import { useGenerateInvoiceForAllocation } from "../api/hooks/useFeeAllocations.js";
import ConfirmAction from "./ConfirmAction.js";

interface GenerateInvoiceButtonProps {
  allocationId: number;
  personId: number | null | undefined;
}

/**
 * "Generate invoice" header action button for a fee allocation card, shown only
 * when the allocation has a person attached. Handles its own confirmation dialog
 * and mutation state; shared between GigFeeAllocationCard and ShowcaseFeeAllocationCard.
 */
export function GenerateInvoiceButton({ allocationId, personId }: GenerateInvoiceButtonProps) {
  const generateInvoice = useGenerateInvoiceForAllocation();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!personId) return null;

  return (
    <>
      <button
        type="button"
        className="secondary outline"
        style={{ padding: "0.15em 0.5em", fontSize: "0.85em" }}
        aria-busy={generateInvoice.isPending}
        disabled={generateInvoice.isPending}
        onClick={() => setShowConfirm(true)}
      >
        Generate invoice
      </button>

      <ConfirmAction
        open={showConfirm}
        title="Generate Invoice"
        message="Create a new person invoice for this allocation?"
        confirmLabel="Generate"
        onConfirm={() => {
          generateInvoice.mutate(allocationId, {
            // Close on both success and error: the confirm dialog is a native <dialog>
            // rendered in the browser's top layer, which sits above the fixed-position
            // error toast. If we leave the dialog open on error, the toast fires but is
            // invisible behind it, so close it either way to reveal the toast.
            onSettled: () => setShowConfirm(false),
          });
        }}
        onCancel={() => setShowConfirm(false)}
        loading={generateInvoice.isPending}
      />
    </>
  );
}
