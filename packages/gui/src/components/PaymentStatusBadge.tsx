import Badge from "./Badge.js";
import type { Expense } from "@get-down/shared";

type PaymentStatus = Expense["paymentStatus"];

const STYLES: Record<PaymentStatus, { background: string; color: string }> = {
  paid:    { background: "var(--pico-ins-color, #28a745)", color: "#fff" },
  partial: { background: "#e6a817",                        color: "#fff" },
  unpaid:  { background: "var(--pico-muted-color, #888)",  color: "#fff" },
};

const LABELS: Record<PaymentStatus, string> = {
  paid: "Paid", partial: "Partial", unpaid: "Unpaid",
};

export default function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { background, color } = STYLES[status];
  return <Badge label={LABELS[status]} background={background} color={color} />;
}
