import { useState, useEffect } from "react";
import type { LegacyInvoice } from "@get-down/shared";
import Modal from "./Modal.js";
import FormField from "./FormField.js";
import ErrorBanner from "./ErrorBanner.js";
import {
  useUpdateLegacyInvoice,
  useReplaceLegacyInvoiceDocument,
} from "../api/hooks/useLegacyInvoices.js";
import { useFileUpload } from "../hooks/useFileUpload.js";
import { toInputDate } from "../utils/date.js";

interface Props {
  /** The legacy invoice to edit. When null the modal is closed. */
  legacyInvoice: LegacyInvoice | null;
  onClose: () => void;
  gigId: number;
  /** When provided a Delete button appears in the footer; the caller handles the actual deletion. */
  onDelete?: () => void;
}

export default function LegacyInvoiceModal({ legacyInvoice, onClose, gigId, onDelete }: Props) {
  const updateLegacyInvoice = useUpdateLegacyInvoice();
  const replaceDocument = useReplaceLegacyInvoiceDocument();
  const fileUpload = useFileUpload();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [localDocUrl, setLocalDocUrl] = useState<string | undefined>(undefined);

  // Reset form when legacyInvoice changes
  useEffect(() => {
    if (!legacyInvoice) return;
    setInvoiceNumber(legacyInvoice.invoiceNumber ?? "");
    setDate(toInputDate(legacyInvoice.date));
    setDescription(legacyInvoice.description ?? "");
    fileUpload.reset();
    setLocalDocUrl(legacyInvoice.documentUrl);
  }, [legacyInvoice?.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!legacyInvoice || fileUpload.error) return;

    await updateLegacyInvoice.mutateAsync({
      id: legacyInvoice.id,
      gigId,
      input: {
        invoiceNumber: invoiceNumber || undefined,
        date: date || undefined,
        description: description || undefined,
      },
    });

    if (fileUpload.file) {
      await replaceDocument.mutateAsync({
        id: legacyInvoice.id,
        gigId,
        file: fileUpload.file,
      });
    }

    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    fileUpload.handleFileChange(e);
  }

  const isBusy = updateLegacyInvoice.isPending || replaceDocument.isPending;

  return (
    <Modal open={!!legacyInvoice} onClose={onClose} title="Edit Legacy Invoice">
      <form onSubmit={handleSave}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <FormField
            label="Invoice Number"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
          <FormField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <FormField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ gridColumn: "1 / -1" }}
          />

          {/* Document */}
          <div style={{ gridColumn: "1 / -1" }}>
            <small>
              <strong>Invoice file</strong>
            </small>
            {localDocUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.25rem" }}>
                <a href={localDocUrl} target="_blank" rel="noopener noreferrer">
                  View
                </a>
                <label style={{ marginBottom: 0 }}>
                  <small>Replace file:</small>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    style={{ marginTop: "0.25rem", marginBottom: 0 }}
                  />
                </label>
                {fileUpload.error && (
                  <small style={{ color: "var(--pico-color-red-500)" }}>{fileUpload.error}</small>
                )}
              </div>
            ) : (
              <div style={{ marginTop: "0.25rem" }}>
                <label>
                  <small>Upload invoice (max 20 MB)</small>
                  <input type="file" onChange={handleFileChange} style={{ marginTop: "0.25rem" }} />
                </label>
                {fileUpload.error && <small style={{ color: "var(--pico-color-red-500)" }}>{fileUpload.error}</small>}
              </div>
            )}
          </div>
         </div>

        {(updateLegacyInvoice.error || replaceDocument.error) && (
          <ErrorBanner
            error={
              (updateLegacyInvoice.error instanceof Error
                ? updateLegacyInvoice.error.message
                : updateLegacyInvoice.error
                ? "Failed to update legacy invoice"
                : "") ||
              (replaceDocument.error instanceof Error
                ? replaceDocument.error.message
                : replaceDocument.error
                ? "Failed to replace document"
                : "")
            }
          />
        )}

        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          {onDelete && (
            <button type="button" className="contrast outline" onClick={onDelete}>
              Delete
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" aria-busy={isBusy} disabled={isBusy || !!fileUpload.error}>
            Save
          </button>
        </footer>
      </form>
    </Modal>
  );
}
