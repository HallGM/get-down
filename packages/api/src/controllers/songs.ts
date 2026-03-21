import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as songsService from "../services/songs.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/songs",     handle(() => songsService.getSongs()));
router.get("/songs/:id", handle(req => songsService.getSongById(+req.params.id)));
router.post("/songs",    handle(req => songsService.createSong(req.body), 201));
router.put("/songs/:id", handle(req => songsService.updateSong(+req.params.id, req.body)));
router.delete("/songs/:id", handle(req => songsService.deleteSong(+req.params.id), 204));

router.get("/gigs/:id/set-list",           handle(req => songsService.getSetList(+req.params.id)));
router.post("/gigs/:id/set-list",          handle(req => songsService.addSetListItem(+req.params.id, req.body), 201));
router.delete("/gigs/:id/set-list/:itemId", handle(req => songsService.removeSetListItem(+req.params.id, +req.params.itemId), 204));

export default router;
