import express from "express";
import { getDashboardData } from "../controllers/dashboard.js";
import authenticate from "../middlewares/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getDashboardData);

export default router;
