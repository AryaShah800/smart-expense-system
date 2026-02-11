import express from "express";
import {
  getCategories,
  createGroupCategory,
  getGroupCategories,
} from "../controllers/category.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

/* ===================== DEFAULT GLOBAL CATEGORIES ===================== */

router.get("/", auth, getCategories);

/* ===================== GROUP CATEGORIES ===================== */

router.post("/group", auth, createGroupCategory);
router.get("/group/:groupId", auth, getGroupCategories);

export default router;
