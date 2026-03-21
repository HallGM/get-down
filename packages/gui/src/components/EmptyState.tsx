export default function EmptyState({ message = "Nothing here yet." }: { message?: string }) {
  return (
    <p style={{ textAlign: "center", color: "var(--pico-muted-color)", padding: "2rem 0" }}>
      {message}
    </p>
  );
}
