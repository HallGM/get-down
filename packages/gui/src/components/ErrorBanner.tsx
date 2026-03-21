interface Props {
  error: unknown;
  fallback?: string;
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred.";
}

export default function ErrorBanner({ error, fallback }: Props) {
  return (
    <div role="alert" style={{ padding: "var(--pico-spacing)", background: "var(--pico-del-color)", color: "#fff", borderRadius: "var(--pico-border-radius)" }}>
      {fallback ?? extractMessage(error)}
    </div>
  );
}
