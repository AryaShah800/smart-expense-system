import express from "express";
import auth from "../middlewares/auth.js";
import {
  createGroup,
  getGroups,
  getGroupDetails,
  inviteMember,
  joinGroup,
  addGroupExpense,
  getGroupExpenses,
  getGroupSplits,
  addSettlement,
  getGroupLedger,
  deleteGroupExpense, // Import this
  deleteGroup,
  addGroupCategory,
  getGroupCategories
} from "../controllers/group.js";

const router = express.Router();

/* GROUP MANAGEMENT */
router.post("/", auth, createGroup);
router.get("/", auth, getGroups);
router.post("/join", auth, joinGroup);
router.get("/:id", auth, getGroupDetails);
router.delete("/:id", auth, deleteGroup); // New: Delete Group

/* MEMBER MANAGEMENT */
router.post("/:id/invite", auth, inviteMember);

/* EXPENSE MANAGEMENT */
router.post("/:id/expenses", auth, addGroupExpense);
router.get("/:id/expenses", auth, getGroupExpenses);
router.delete("/expenses/:expenseId", auth, deleteGroupExpense); // New: Delete Expense

/* BALANCES & SETTLEMENTS */
router.get("/:id/splits", auth, getGroupSplits);
router.post("/:id/settle", auth, addSettlement);
router.get("/:id/ledger", auth, getGroupLedger);

/* CATEGORY ROUTES */
router.post("/:id/categories", auth, addGroupCategory);
router.get("/:id/categories", auth, getGroupCategories);

export default router;