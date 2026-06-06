import { formatPennies } from "../utils/money.js";

interface Props {
  pennies: number | undefined | null;
  colorNegative?: boolean;
  bold?: boolean;
}

export default function MoneyDisplay({ pennies, colorNegative, bold }: Props) {
  if (pennies == null) return <span>—</span>;
  const color = colorNegative && pennies < 0 ? "var(--pico-del-color)" : undefined;
  return (
    <span style={{ color, fontWeight: bold ? 600 : undefined }}>
      {formatPennies(pennies)}
    </span>
  );
}
