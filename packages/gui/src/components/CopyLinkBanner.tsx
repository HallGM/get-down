import { useToast } from "./Toast.js";

interface Props {
  url: string;
  label: string;
  status: React.ReactNode;
  successMessage: string;
}

export default function CopyLinkBanner({ url, label, status, successMessage }: Props) {
  const { showToast } = useToast();

  return (
    <article style={{ padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
      <span style={{ fontSize: "0.9rem" }}>
        <strong>{label}</strong>
        <span style={{ color: "var(--pico-muted-color)", marginLeft: "0.5rem" }}>{status}</span>
      </span>
      <button
        className="secondary outline"
        style={{ padding: "0.2em 0.8em", fontSize: "0.85rem" }}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            showToast(successMessage, "success");
          } catch {
            showToast("Could not copy link. Please copy it manually.", "error");
          }
        }}
      >
        Copy link
      </button>
    </article>
  );
}
