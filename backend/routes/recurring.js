import express from "express";
import authenticate from "../middlewares/auth.js";
import {
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  triggerProcess,
} from "../controllers/recurring.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getRecurringTransactions);
router.post("/", createRecurringTransaction);
router.put("/:id", updateRecurringTransaction);
router.delete("/:id", deleteRecurringTransaction);
router.post("/process", triggerProcess);

export default router;
