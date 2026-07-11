import { useState } from "react";
import type { Expense } from "@get-down/shared";

export interface ExpenseLinkModalsState {
  pickerAllocationId: number | null;
  createAllocationId: number | null;
  editExpenseId: number | null;
  unlinkConfirm: { allocationId: number; expense: Expense } | null;
}

export interface ExpenseLinkModalsActions {
  openPicker: (allocationId: number) => void;
  closePicker: () => void;
  openCreate: (allocationId: number) => void;
  closeCreate: () => void;
  openEdit: (expenseId: number) => void;
  closeEdit: () => void;
  openUnlinkConfirm: (allocationId: number, expense: Expense) => void;
  closeUnlinkConfirm: () => void;
}

export function useExpenseLinkModals(): ExpenseLinkModalsState & ExpenseLinkModalsActions {
  const [pickerAllocationId, setPickerAllocationId] = useState<number | null>(null);
  const [createAllocationId, setCreateAllocationId] = useState<number | null>(null);
  const [editExpenseId, setEditExpenseId] = useState<number | null>(null);
  const [unlinkConfirm, setUnlinkConfirm] = useState<{ allocationId: number; expense: Expense } | null>(null);

  return {
    pickerAllocationId,
    createAllocationId,
    editExpenseId,
    unlinkConfirm,
    openPicker: (allocationId: number) => setPickerAllocationId(allocationId),
    closePicker: () => setPickerAllocationId(null),
    openCreate: (allocationId: number) => setCreateAllocationId(allocationId),
    closeCreate: () => setCreateAllocationId(null),
    openEdit: (expenseId: number) => setEditExpenseId(expenseId),
    closeEdit: () => setEditExpenseId(null),
    openUnlinkConfirm: (allocationId: number, expense: Expense) => setUnlinkConfirm({ allocationId, expense }),
    closeUnlinkConfirm: () => setUnlinkConfirm(null),
  };
}
