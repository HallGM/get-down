import { useState } from "react";
import type { FeeAllocation, Expense, Account } from "@get-down/shared";
import { useExpenseLinkModals } from "../hooks/useExpenseLinkModals.js";
import { useGig } from "../api/hooks/useGigs.js";
import { useGigRoles } from "../api/hooks/useAssignedRoles.js";
import { usePeople } from "../api/hooks/usePeople.js";
import {
  useFeeAllocationsByGig,
  useResetFeeAllocation,
  useAddFeeLineItem,
  useUpdateFeeLineItem,
  useRemoveFeeLineItem,
  useDeleteFeeAllocation,
  useLinkExpenseToAllocation,
  useUnlinkExpenseFromAllocation,
  useUpdateFeeAllocationExpenseLink,
  useLinkTransactionToAllocation,
  useUnlinkTransactionFromAllocation,
} from "../api/hooks/useFeeAllocations.js";
import { useExpenses, useDeleteExpense } from "../api/hooks/useExpenses.js";
import { useAccounts } from "../api/hooks/useAccounts.js";
import { useUpdateRole } from "../api/hooks/useAssignedRoles.js";
import MoneyDisplay from "./MoneyDisplay.js";
import ExpensePickerModal from "./ExpensePickerModal.js";
import ExpenseCreateModal from "./ExpenseCreateModal.js";
import ExpenseModal from "./ExpenseModal.js";
import TransactionPickerModal from "./TransactionPickerModal.js";
import TransactionCreateModal from "./TransactionCreateModal.js";
import TransactionModal from "./TransactionModal.js";
import { FeeAllocationPanel } from "./FeeAllocationPanel.js";
import { FeeAllocationCard } from "./FeeAllocationCard.js";
import { LinkedExpensesSection } from "./LinkedExpensesSection.js";
import { LinkedRolesSection } from "./LinkedRolesSection.js";
import { LinkedTransactionsSection } from "./LinkedTransactionsSection.js";
import { UnlinkOrDeleteModal } from "./UnlinkOrDeleteModal.js";
import { ApportionModal } from "./ApportionModal.js";
import { formatPersonName, formatGigName, resolvePersonName } from "../utils/people.js";
import { getAllocationTitle, buildExpenseInitialValues } from "../utils/allocations.js";

interface GigFeeAllocationCardProps {
  gigId: number;
  allocationId: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function GigFeeAllocationCard({
  gigId,
  allocationId,
  isCollapsed,
  onToggle,
}: GigFeeAllocationCardProps) {
  const { data: gig } = useGig(gigId);
  const { data: roles = [] } = useGigRoles(gigId);
  const { data: people = [] } = usePeople();
  const { data: feeAllocations = [] } = useFeeAllocationsByGig(gigId);
  const { data: allExpenses = [] } = useExpenses();
  const { data: accounts = [] } = useAccounts();

  const resetFeeAllocation = useResetFeeAllocation();
  const addLineItem = useAddFeeLineItem();
  const updateLineItem = useUpdateFeeLineItem();
  const removeLineItem = useRemoveFeeLineItem();
  const deleteFeeAllocation = useDeleteFeeAllocation();
  const linkExpense = useLinkExpenseToAllocation();
  const unlinkExpense = useUnlinkExpenseFromAllocation();
  const updateExpenseLink = useUpdateFeeAllocationExpenseLink();
  const linkTransaction = useLinkTransactionToAllocation();
  const unlinkTransaction = useUnlinkTransactionFromAllocation();
  const deleteExpense = useDeleteExpense();
  const updateRole = useUpdateRole();

   const modals = useExpenseLinkModals();
   const [apportionExpense, setApportionExpense] = useState<{
      expense: Expense;
    } | null>(null);

   // Find the allocation by ID
   const allocation = feeAllocations.find((a) => a.id === allocationId);
   if (!allocation) return null;

   const linkedRoles = roles.filter((r) => r.feeAllocationId === allocationId);
   const unlinkedRoles = roles.filter((r) => !r.feeAllocationId);
   const hasExpenses = (allocation.expenseLinks?.length ?? 0) > 0;
   const editExpense = modals.editExpenseId != null ? (allExpenses.find((e) => e.id === modals.editExpenseId) ?? null) : null;

   async function handleReset() {
     await resetFeeAllocation.mutateAsync(allocationId);
   }

  return (
    <>
      <FeeAllocationCard
         title={getAllocationTitle(allocation, people, roles)}
         isCollapsed={isCollapsed}
         hasExpenses={hasExpenses}
         onToggle={onToggle}
         headerActions={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="secondary outline"
              style={{ padding: "0.15em 0.5em", fontSize: "0.85em" }}
              aria-busy={resetFeeAllocation.isPending}
              disabled={resetFeeAllocation.isPending}
              onClick={handleReset}
            >
              Reset to defaults
            </button>
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
          </div>
        }
      >
        {/* Linked roles */}
        <LinkedRolesSection
          linkedRoles={linkedRoles}
          unlinkedRoles={unlinkedRoles}
          people={people}
          onUnlinkRole={(roleId) => updateRole.mutate({ id: roleId, gigId, input: { feeAllocationId: null } })}
          onLinkRole={(roleId) => updateRole.mutate({ id: roleId, gigId, input: { feeAllocationId: allocationId } })}
          isUnlinking={updateRole.isPending}
          isLinking={updateRole.isPending}
        />

        <FeeAllocationPanel
          allocation={allocation}
          onAddLineItem={(desc, amt) => addLineItem.mutate({ allocationId, input: { description: desc, amount: amt } })}
          onUpdateLineItem={(li, desc, amt) => updateLineItem.mutate({ allocationId, lineItemId: li.id, input: { description: desc, amount: amt } })}
          onRemoveLineItem={(li) => removeLineItem.mutate({ allocationId, lineItemId: li.id })}
        />

         {/* Linked Expenses */}
          <LinkedExpensesSection
            allocation={allocation}
            allExpenses={allExpenses}
            onAddExpense={() => modals.openCreate(allocationId)}
            onBrowse={() => modals.openPicker(allocationId)}
            onEdit={(expense) => modals.openEdit(expense.id)}
            onApportion={(expense, link) => setApportionExpense({ expense, link })}
            onRemove={(expense) => modals.openUnlinkConfirm(allocationId, expense)}
          />

        {/* Linked Transactions (only when personId is set) */}
        {allocation.personId && gig && (
          <LinkedTransactionsSection
            allocation={allocation}
            accounts={accounts}
            gigName={formatGigName(gig)}
            personName={resolvePersonName(people, allocation.personId)}
            onLink={(transactionId: number) => linkTransaction.mutate({ allocationId, transactionId })}
            onUnlink={(transactionId: number) => unlinkTransaction.mutate({ allocationId, transactionId })}
          />
        )}
      </FeeAllocationCard>

       {/* Modals */}
        <ExpenseCreateModal
          open={modals.createAllocationId === allocationId}
          onClose={modals.closeCreate}
          initialValues={buildExpenseInitialValues(gig, linkedRoles, allocation, people, formatGigName)}
          allocationId={allocationId}
          paymentDateIsToday={true}
          onCreated={modals.closeCreate}
        />

        <ExpensePickerModal
          open={modals.pickerAllocationId === allocationId}
          onClose={modals.closePicker}
          expenses={allExpenses.filter((e) => !allocation.expenseLinks?.some((link) => link.expenseId === e.id))}
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

        {apportionExpense && (
           <ApportionModal
             expense={apportionExpense.expense}
             currentAmount={apportionExpense.expense.amount}
             onClose={() => setApportionExpense(null)}
             onSave={(amount) => {
               updateExpenseLink.mutate(
                 { allocationId, expenseId: apportionExpense.expense.id, apportionedAmount: amount },
                 { onSuccess: () => setApportionExpense(null) }
               );
             }}
             isPending={updateExpenseLink.isPending}
           />
         )}
       </>
     );
   }
