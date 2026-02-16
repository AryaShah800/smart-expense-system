import express from "express";
import { setBudget, getBudgets, getBudgetStatus } from "../controllers/budget.js";
import authenticate from "../middlewares/auth.js";

const router = express.Router();

router.use(authenticate);

router.post("/", setBudget);
router.get("/", getBudgets);
router.get("/status", getBudgetStatus);

export default router;
