import multer from "multer";
import { MAX_DOCUMENT_SIZE_BYTES } from "@get-down/shared";

/**
 * Multer middleware configured for in-memory file uploads with size limit.
 * Used for expenses, legacy invoices, and other document uploads.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
});
