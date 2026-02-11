import express from "express";
import auth from "../middlewares/auth.js";
import { getMonthlyReport } from "../controllers/report.js";

const router = express.Router();

router.get("/monthly", auth, getMonthlyReport);

export default router;
