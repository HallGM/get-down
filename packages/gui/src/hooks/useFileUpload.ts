import { useState } from "react";
import { MAX_DOCUMENT_SIZE_BYTES } from "@get-down/shared";

/**
 * Hook for managing file upload state and validation.
 * Validates file size against MAX_DOCUMENT_SIZE_BYTES.
 */
export function useFileUpload() {
  const [file, setFile] = useState<File | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(undefined);
      setError(undefined);
      return;
    }
    if (f.size > MAX_DOCUMENT_SIZE_BYTES) {
      setFile(undefined);
      setError("File must be 20 MB or smaller.");
      e.target.value = "";
      return;
    }
    setError(undefined);
    setFile(f);
  }

  function reset() {
    setFile(undefined);
    setError(undefined);
  }

  return {
    file,
    setFile,
    error,
    setError,
    handleFileChange,
    reset,
  };
}
