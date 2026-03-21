import { formatPennies } from "../utils/money.js";

interface Props {
  pennies: number | undefined | null;
}

export default function MoneyDisplay({ pennies }: Props) {
  if (pennies == null) return <span>—</span>;
  return <span>{formatPennies(pennies)}</span>;
}
