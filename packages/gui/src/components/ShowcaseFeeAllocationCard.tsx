import { useState } from "react";
import type { FeeAllocation, Expense } from "@get-down/shared";
import { useExpenseLinkModals } from "../hooks/useExpenseLinkModals.js";
import { useShowcaseRoles } from "../api/hooks/useAssignedRoles.js";
import { usePeople } from "../api/hooks/usePeople.js";
import {
  useFeeAllocationsByShowcase,
  useAddFeeLineItem,
  useUpdateFeeLineItem,
  useRemoveFeeLineItem,
  useDeleteFeeAllocation,
  useLinkExpenseToAllocation,
  useUnlinkExpenseFromAllocation,
} from "../api/hooks/useFeeAllocations.js";
import { useExpenses, useDeleteExpense } from "../api/hooks/useExpenses.js";
import { useUpdateRole } from "../api/hooks/useAssignedRoles.js";
import ExpensePickerModal from "./ExpensePickerModal.js";
import ExpenseCreateModal from "./ExpenseCreateModal.js";
import ExpenseModal from "./ExpenseModal.js";
import { FeeAllocationPanel } from "./FeeAllocationPanel.js";
import { FeeAllocationCard } from "./FeeAllocationCard.js";
import { LinkedExpensesSection } from "./LinkedExpensesSection.js";
import { LinkedRolesSection } from "./LinkedRolesSection.js";
import { UnlinkOrDeleteModal } from "./UnlinkOrDeleteModal.js";
import { formatPersonName, resolvePersonName } from "../utils/people.js";
import { getAllocationTitle } from "../utils/allocations.js";

interface ShowcaseFeeAllocationCardProps {
  showcaseId: number;
  allocationId: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function ShowcaseFeeAllocationCard({
  showcaseId,
  allocationId,
  isCollapsed,
  onToggle,
}: ShowcaseFeeAllocationCardProps) {
  const { data: roles = [] } = useShowcaseRoles(showcaseId);
  const { data: people = [] } = usePeople();
  const { data: feeAllocations = [] } = useFeeAllocationsByShowcase(showcaseId);
  const { data: allExpenses = [] } = useExpenses();

  const addLineItem = useAddFeeLineItem();
  const updateLineItem = useUpdateFeeLineItem();
  const removeLineItem = useRemoveFeeLineItem();
  const deleteFeeAllocation = useDeleteFeeAllocation();
  const linkExpense = useLinkExpenseToAllocation();
  const unlinkExpense = useUnlinkExpenseFromAllocation();
  const deleteExpense = useDeleteExpense();
  const updateRole = useUpdateRole();

  const modals = useExpenseLinkModals();

  // Find the allocation by ID
  const allocation = feeAllocations.find((a) => a.id === allocationId);
  if (!allocation) return null;

  const linkedRoles = roles.filter((r) => r.feeAllocationId === allocationId);
  const unlinkedRoles = roles.filter((r) => !r.feeAllocationId);
  const hasExpenses = allocation.expenseIds.length > 0;
  const editExpense = modals.editExpenseId != null ? (allExpenses.find((e) => e.id === modals.editExpenseId) ?? null) : null;

  return (
    <>
      <FeeAllocationCard
         title={getAllocationTitle(allocation, people, roles)}
         isCollapsed={isCollapsed}
         hasExpenses={hasExpenses}
         onToggle={onToggle}
         headerActions={
          <button
            type="button"
            className="contrast outline"
            style={{ padding: "0.15em 0.5em", fontSize: "0.85em" }}
            aria-busy={deleteFeeAllocation.isPending}
            disabled={deleteFeeAllocation.isPending}
            onClick={() => deleteFeeAllocation.mutate(allocationId)}
          >
            ✕
          </button>
        }
      >
        {/* Linked roles */}
        <LinkedRolesSection
          linkedRoles={linkedRoles}
          unlinkedRoles={unlinkedRoles}
          people={people}
          onUnlinkRole={(roleId) => updateRole.mutate({ id: roleId, showcaseId, input: { feeAllocationId: null } })}
          onLinkRole={(roleId) => updateRole.mutate({ id: roleId, showcaseId, input: { feeAllocationId: allocationId } })}
          isUnlinking={updateRole.isPending}
          isLinking={updateRole.isPending}
        />

        <FeeAllocationPanel
          allocation={allocation}
          onAddLineItem={(desc, amt) => addLineItem.mutate({ allocationId, input: { description: desc, amount: amt } })}
          onUpdateLineItem={(li, desc, amt) => updateLineItem.mutate({ allocationId, lineItemId: li.id, input: { description: desc, amount: amt } })}
          onRemoveLineItem={(li) => removeLineItem.mutate({ allocationId, lineItemId: li.id })}
        />

         <LinkedExpensesSection
           allocation={allocation}
           allExpenses={allExpenses}
           onAddExpense={() => modals.openCreate(allocationId)}
           onBrowse={() => modals.openPicker(allocationId)}
           onEdit={(expense) => modals.openEdit(expense.id)}
           onRemove={(expense) => modals.openUnlinkConfirm(allocationId, expense)}
         />
      </FeeAllocationCard>

      {/* Modals */}
       <ExpenseCreateModal
         open={modals.createAllocationId === allocationId}
         onClose={modals.closeCreate}
         allocationId={allocationId}
         onCreated={modals.closeCreate}
       />

       <ExpensePickerModal
         open={modals.pickerAllocationId === allocationId}
         onClose={modals.closePicker}
         expenses={allExpenses.filter((e) => !allocation.expenseIds.includes(e.id))}
         onSelect={(expense) => {
           linkExpense.mutateAsync({ allocationId, expenseId: expense.id })
             .then(() => {
               modals.closePicker();
             })
             .catch((err) => {
               console.error("Failed to link expense:", err);
               // Error is shown via mutation; picker stays open so user can retry
             });
         }}
       />

       <ExpenseModal
         expense={editExpense}
         onClose={modals.closeEdit}
         allAllocations={feeAllocations}
       />

       <UnlinkOrDeleteModal
         open={!!modals.unlinkConfirm && modals.unlinkConfirm.allocationId === allocationId}
         onClose={modals.closeUnlinkConfirm}
         itemLabel={modals.unlinkConfirm?.expense.description ?? ""}
         onRemoveLink={() => {
           if (modals.unlinkConfirm) {
             unlinkExpense.mutate({ allocationId: modals.unlinkConfirm.allocationId, expenseId: modals.unlinkConfirm.expense.id });
           }
           modals.closeUnlinkConfirm();
         }}
         onDelete={async () => {
           if (modals.unlinkConfirm) {
             await deleteExpense.mutateAsync(modals.unlinkConfirm.expense.id);
           }
           modals.closeUnlinkConfirm();
         }}
         unlinkPending={unlinkExpense.isPending}
         deletePending={deleteExpense.isPending}
       />
    </>
  );
}
