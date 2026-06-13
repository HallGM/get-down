import { formatPennies } from "../utils/money.js";

interface RunningTotalProps {
  pennies: number;
}

export default function RunningTotal({ pennies }: RunningTotalProps) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
      <span style={{ fontWeight: 600 }}>
        Total: {formatPennies(pennies)}
      </span>
    </div>
  );
}
