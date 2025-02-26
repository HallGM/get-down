import express from "express";
import { run_query } from "./db/init.mjs";
import enquiries from "./controllers/enquiries.mjs";
// import path from 'path';

const app = express();
app.use(express.json());
const port = 3000;

app.use("/", enquiries);

app.listen(port, () => {
  console.log(`listening on http://localhost:${port}`);
});
