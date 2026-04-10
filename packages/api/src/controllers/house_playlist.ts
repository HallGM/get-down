import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as housePlaylistService from "../services/house_playlist.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/house-playlist",              handle(() => housePlaylistService.getHousePlaylist()));
router.post("/house-playlist",             handle(req => housePlaylistService.addToHousePlaylist(+req.body.songId), 201));
router.delete("/house-playlist/:songId",   handle(req => housePlaylistService.removeFromHousePlaylist(+req.params.songId), 204));

export default router;
