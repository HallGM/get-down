import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as genresService from "../services/genres.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/genres",           handle(() => genresService.getGenres()));
router.post("/genres",          handle(req => genresService.createGenre(req.body), 201));
router.post("/genres/bulk",     handle(req => genresService.bulkUpsertGenres(req.body)));
router.delete("/genres/:id",    handle(req => genresService.deleteGenre(+req.params.id), 204));

export default router;
