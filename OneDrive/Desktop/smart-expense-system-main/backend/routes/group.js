import express from "express";
import auth from "../middlewares/auth.js";

import {
  createGroup,
  getGroups,
  getGroupDetails,
  inviteMember,
  addGroupExpense,
  getGroupExpenses,
  getGroupSplits,
  addSettlement,
  getGroupLedger
} from "../controllers/group.js";

const router = express.Router();

/* GROUP */
router.post("/", auth, createGroup);
router.get("/", auth, getGroups);
router.get("/:id", auth, getGroupDetails);

/* MEMBERS */
router.post("/:id/invite", auth, inviteMember);

/* EXPENSES */
router.post("/:id/expenses", auth, addGroupExpense);
router.get("/:id/expenses", auth, getGroupExpenses);

/* SPLITS */
router.get("/:id/splits", auth, getGroupSplits);

/* SETTLEMENT */
router.post("/:id/settle", auth, addSettlement);

/* LEDGER */
router.get("/:id/ledger", auth, getGroupLedger);

export default router;
