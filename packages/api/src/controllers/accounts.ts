import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as accountsService from "../services/accounts.js";
import { handle } from "../utils/handle.js";

const router: Router = express.Router();
router.use(authenticateToken);

router.get("/accounts",
  handle(() => accountsService.getAllAccounts()));

router.post("/accounts",
  handle((req) => accountsService.createAccount(req.body), 201));

// Must be declared before /:id to avoid "people-without-accounts" matching as an id param
router.get("/accounts/people-without-accounts",
  handle(() => accountsService.getPeopleWithoutAccounts()));

router.get("/accounts/:id/transactions",
  handle((req) => accountsService.getTransactionsByAccount(
    +req.params.id,
    req.query.year ? +req.query.year : undefined
  )));

router.post("/accounts/:id/transactions",
  handle((req) => accountsService.createTransaction(+req.params.id, req.body), 201));

router.put("/accounts/:accountId/transactions/:id",
  handle((req) => accountsService.updateTransaction(+req.params.id, +req.params.accountId, req.body)));

router.delete("/accounts/:accountId/transactions/:id",
  handle((req) => accountsService.deleteTransaction(+req.params.id, +req.params.accountId), 204));

export default router;
