import express, { type Router, type Request, type Response, type NextFunction } from "express";
import * as deliveryService from "../services/delivery.js";
import * as deliveryVideosService from "../services/deliveryVideos.js";
import { handle } from "../utils/handle.js";
import { authenticateToken } from "../middleware/auth.js";

const router: Router = express.Router();

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

// ─── Public delivery page routes ──────────────────────────────────────────────

router.get(
  "/delivery/:token",
  handle((req) => deliveryService.getDeliveryPage(req.params.token))
);

router.get(
  "/delivery/:token/photos",
  handle((req) => deliveryService.listPhotos(req.params.token))
);

// Thumbnail and file routes redirect to presigned R2 URLs rather than
// streaming bytes, so they bypass handle() and manage their own response.
router.get(
  "/delivery/:token/photos/thumbnail",
  (req: Request, res: Response, next: NextFunction): void => {
    const name = validateNameParam(req, res);
    if (!name) return;
    deliveryService
      .getThumbnailUrl(req.params.token, name)
      .then((url) => res.redirect(302, url))
      .catch(next);
  }
);

router.get(
  "/delivery/:token/photos/file",
  (req: Request, res: Response, next: NextFunction): void => {
    const name = validateNameParam(req, res);
    if (!name) return;
    deliveryService
      .getDisplayUrl(req.params.token, name)
      .then((url) => res.redirect(302, url))
      .catch(next);
  }
);

router.get(
  "/delivery/:token/video-download",
  handle((req) => {
    const videoId = Number(req.query.videoId);
    // If videoId is missing or non-numeric, pass 0 to the service. The service
    // still validates the token first (throws 404 for unknown tokens), then
    // returns { url: null } because no video with id=0 will ever exist.
    if (!videoId || isNaN(videoId)) {
      return deliveryService.getVideoDownloadUrl(req.params.token, 0);
    }
    return deliveryService.getVideoDownloadUrl(req.params.token, videoId);
  })
);

// ─── Authenticated admin routes for delivery videos ───────────────────────────

router.get(
  "/gigs/:id/delivery-videos",
  authenticateToken,
  handle((req) => deliveryVideosService.getVideos(+req.params.id))
);

router.post(
  "/gigs/:id/delivery-videos",
  authenticateToken,
  handle((req) => deliveryVideosService.createVideo(+req.params.id, req.body), 201)
);

router.put(
  "/gigs/:id/delivery-videos/reorder",
  authenticateToken,
  handle((req) => deliveryVideosService.reorderVideos(+req.params.id, req.body.orderedIds))
);

router.put(
  "/gigs/:id/delivery-videos/:videoId",
  authenticateToken,
  handle((req) => deliveryVideosService.updateVideo(+req.params.id, +req.params.videoId, req.body))
);

router.delete(
  "/gigs/:id/delivery-videos/:videoId",
  authenticateToken,
  handle((req) => deliveryVideosService.deleteVideo(+req.params.id, +req.params.videoId), 204)
);

// ─── Authenticated admin route — refresh R2 photos ───────────────────────────

router.post(
  "/gigs/:id/delivery/refresh-thumbnails",
  authenticateToken,
  handle((req) => deliveryService.refreshThumbnails(+req.params.id), 204)
);

export default router;
