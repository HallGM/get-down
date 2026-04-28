export default function BooleanCell({ value }: { value: boolean }) {
  return value
    ? <span style={{ color: "var(--pico-color-green-550)" }}>&#10003;</span>
    : <span style={{ color: "var(--pico-muted-color)" }}>—</span>;
}
