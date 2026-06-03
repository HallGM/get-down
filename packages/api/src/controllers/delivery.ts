import express, { type Router, type Request, type Response, type NextFunction } from "express";
import * as deliveryService from "../services/delivery.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
// No authenticateToken — public endpoint secured only by the UUID token

/**
 * Validates and decodes the `name` query parameter.
 * Rejects missing values and names containing path traversal sequences.
 * Returns the decoded name on success, or null after sending a 400 response.
 */
function validateNameParam(req: Request, res: Response): string | null {
  const name = req.query.name;
  if (typeof name !== "string" || !name) {
    res.status(400).json({ message: "name query param required" });
    return null;
  }
  const decoded = decodeURIComponent(name);
  if (decoded.includes("/") || decoded.includes("\\") || decoded.includes("..")) {
    res.status(400).json({ message: "Invalid file name" });
    return null;
  }
  return decoded;
}

router.get(
  "/delivery/:token",
  handle((req) => deliveryService.getDeliveryPage(req.params.token))
);

router.get(
  "/delivery/:token/photos",
  handle((req) => deliveryService.listPhotos(req.params.token))
);

// Thumbnail and file proxy bypass the standard handle() wrapper because they
// stream directly to the response rather than returning a JSON value.
router.get(
  "/delivery/:token/photos/thumbnail",
  (req: Request, res: Response, next: NextFunction): void => {
    const name = validateNameParam(req, res);
    if (!name) return;
    deliveryService.proxyThumbnail(req.params.token, name, res).catch(next);
  }
);

router.get(
  "/delivery/:token/photos/file",
  (req: Request, res: Response, next: NextFunction): void => {
    const name = validateNameParam(req, res);
    if (!name) return;
    deliveryService.proxyFile(req.params.token, name, res).catch(next);
  }
);

router.get(
  "/delivery/:token/video-download",
  handle((req) => deliveryService.getVideoDownloadUrl(req.params.token))
);

export default router;
