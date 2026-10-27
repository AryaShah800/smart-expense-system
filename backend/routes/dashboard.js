import express from "express";
import { getDashboardData, getInsights } from "../controllers/dashboard.js";
import authenticate from "../middlewares/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getDashboardData);
router.get("/insights", getInsights);

export default router;
