import express, { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const router: Router = express.Router();

const users: Array<{ id: number; username: string; password: string }> = [];
const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

router.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));

interface RegisterRequest extends Request {
  body: {
    username: string;
    password: string;
  };
}

interface LoginRequest extends Request {
  body: {
    username: string;
    password: string;
  };
}

router.post("/register", async (req: RegisterRequest, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (users.find((user) => user.username === username)) {
    res.status(400).json({ error: "User already exists" });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ id: users.length + 1, username, password: hashedPassword });
    res.json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req: LoginRequest, res: Response): Promise<void> => {
  const { username, password } = req.body;

  const user = users.find((u) => u.username === username);
  if (!user) {
    res.status(400).json({ error: "Invalid credentials" });
    return;
  }

  try {
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
