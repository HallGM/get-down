import express, { Router } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth.js";
import { UnauthorizedError } from "../errors.js";
import * as authService from "../services/auth.js";
import { handle } from "../utils/handle.js";

dotenv.config();

const router: Router = express.Router();
router.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));

// Only an already-authenticated user (i.e. an existing admin) can create new accounts.
router.post("/register", authenticateToken, handle(req => authService.registerPartner(req.body), 201));
router.post("/login",    handle(req => authService.login(req.body)));
router.get("/me", authenticateToken, handle(req => {
  const auth = (req as AuthenticatedRequest).auth;
  if (!auth?.id) throw new UnauthorizedError();
  return authService.getUserById(auth.id);
}));

export default router;
