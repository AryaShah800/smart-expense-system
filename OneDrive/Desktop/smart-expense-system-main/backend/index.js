import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/user.js";
import categoryRoutes from "./routes/category.js";
import transactionRoutes from "./routes/transaction.js";
import budgetRoutes from "./routes/budget.js";
import groupRoutes from "./routes/group.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportRoutes from "./routes/report.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

/* ===================== MIDDLEWARE ===================== */

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true,
  })
);

/* ===================== ROUTES ===================== */

app.use("/api/auth", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);

/* ===================== TEST ROUTES ===================== */

app.get("/", (req, res) => {
  res.send({
    activeStatus: true,
    error: false,
  });
});

app.get("/__test", (req, res) => {
  res.send("INDEX ROUTE WORKING");
});

/* ===================== DB + SERVER ===================== */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () =>
      console.log(`Server at http://localhost:${PORT}`)
    );
  })
  .catch((err) => console.error("MongoDB error:", err));
