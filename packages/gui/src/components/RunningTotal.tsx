import { formatPennies } from "../utils/money.js";

interface RunningTotalProps {
  pennies: number;
  /** Label shown before the formatted amount. Defaults to "Total". */
  label?: string;
}

export default function RunningTotal({ pennies, label = "Total" }: RunningTotalProps) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
      <span style={{ fontWeight: 600 }}>
        {label}: {formatPennies(pennies)}
      </span>
    </div>
  );
}
