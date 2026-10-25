export function calculateExpensePaymentMismatch(paymentAmount: number, assignedAmount: number): number {
  return paymentAmount - assignedAmount;
}
