import { useState } from "react";
import {
  SERVICE_NAMES,
  type EmailMessageRequest,
  type EmailMessageResponse,
} from "@get-down/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const ALL_SERVICES = Object.values(SERVICE_NAMES);

export default function EmailGenerator() {
  const [firstName, setFirstName] = useState("");
  const [partnersName, setPartnersName] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function toggleService(service: string) {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const body: EmailMessageRequest = {
      firstName,
      partnersName: partnersName || undefined,
      services: selectedServices,
    };

    try {
      const res = await fetch(`${API_BASE}/enquiry/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message || "Request failed");
      }

      const data = await res.json() as EmailMessageResponse;
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="container">
      <h1>Email Generator</h1>
      <form onSubmit={handleSubmit}>
        <label>
          First Name
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            placeholder="e.g. Leanne"
          />
        </label>
        <label>
          Partner's Name <small>(optional)</small>
          <input
            type="text"
            value={partnersName}
            onChange={(e) => setPartnersName(e.target.value)}
            placeholder="e.g. John"
          />
        </label>
        <fieldset>
          <legend>Services</legend>
          {ALL_SERVICES.map((service) => (
            <label key={service}>
              <input
                type="checkbox"
                checked={selectedServices.includes(service)}
                onChange={() => toggleService(service)}
              />
              {service}
            </label>
          ))}
        </fieldset>
        <button type="submit" aria-busy={loading} disabled={loading || selectedServices.length === 0}>
          {loading ? "Generating…" : "Generate Email"}
        </button>
      </form>

      {error && <p style={{ color: "var(--pico-del-color)" }}>{error}</p>}

      {message && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Generated Email</h2>
            <button type="button" className="secondary" onClick={copyToClipboard}>
              {copied ? "✓ Copied!" : "Copy to Clipboard"}
            </button>
          </div>
          <textarea value={message} readOnly rows={20} />
        </section>
      )}
    </main>
  );
}
