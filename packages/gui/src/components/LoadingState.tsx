export default function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <p aria-busy="true" style={{ textAlign: "center", color: "var(--pico-muted-color)" }}>
      {message}
    </p>
  );
}
