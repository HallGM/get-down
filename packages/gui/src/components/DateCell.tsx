import { formatDate } from "../utils/date.js";

export default function DateCell({ date }: { date?: string | null }) {
  return date
    ? <>{formatDate(date)}</>
    : <span style={{ color: "var(--pico-muted-color)" }}>No date</span>;
}
