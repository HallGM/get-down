import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as prefsService from "../services/gig_song_preferences.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/gigs/:id/song-preferences",  handle(req => prefsService.getPreferences(+req.params.id)));
router.put("/gigs/:id/song-preferences",  handle(req => prefsService.updatePreferences(+req.params.id, req.body)));

export default router;
