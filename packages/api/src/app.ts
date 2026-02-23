import express from "express";
import cors from "cors";
import { run_query } from "./db/init.js";
import enquiries from "./controllers/enquiries.js";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use("/", enquiries);

app.listen(port, () => {
  console.log(`listening on http://localhost:${port}`);
});
