import express, { type Router } from "express";
import * as clientFormService from "../services/client_form.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
// No authenticateToken — this is a public endpoint secured only by the UUID token

router.get(
  "/client-form/:token",
  handle((req) => clientFormService.getClientForm(req.params.token))
);

router.put(
  "/client-form/:token",
  handle((req) => clientFormService.saveClientForm(req.params.token, req.body))
);

export default router;
