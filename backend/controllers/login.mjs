import express from "express";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

app.use(cors({ origin: "http://localhost:5173" })); // Adjust for your frontend URL

const users = []; // Replace with a database in production
const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (users.find((user) => user.username === username))
    return res.status(400).json({ error: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ id: users.length + 1, username, password: hashedPassword });
  res.json({ message: "User registered successfully" });
});
