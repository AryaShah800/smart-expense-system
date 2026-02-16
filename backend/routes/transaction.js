import express from "express";
import { addTransaction, getTransactions, deleteTransaction } from "../controllers/transaction.js";
import authenticate from "../middlewares/auth.js";

const router = express.Router();

router.use(authenticate);

router.post("/", addTransaction); // Use 'type' in body to distinguish income/expense
router.get("/", getTransactions);
router.delete("/:id", deleteTransaction);

export default router;
