import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

export interface AuthTokenPayload {
  id: number;
  email: string;
  firstName: string;
  lastName?: string;
  displayName?: string;
  isPartner: boolean;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthTokenPayload;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    req.auth = jwt.verify(token, SECRET_KEY) as AuthTokenPayload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}