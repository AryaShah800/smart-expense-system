import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import userRoutes from "./routes/user.js";
import categoryRoutes from "./routes/category.js";
import transactionRoutes from "./routes/transaction.js";
import budgetRoutes from "./routes/budget.js";
import groupRoutes from "./routes/group.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportRoutes from "./routes/report.js";
import recurringRoutes from "./routes/recurring.js";
import { corsOptions } from "./config/cors.js";

// The Express app, with no server, socket or database attached,
// so tests can import it and drive it with supertest.
const app = express();

app.set("trust proxy", 1); // behind Render's proxy, so rate limits see the real client IP
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// CORS before body parsers so error responses still carry CORS headers
app.use(cors(corsOptions));
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());

app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/recurring", recurringRoutes);

app.get("/", (req, res) => {
  res.send({ activeStatus: true, error: false });
});

export default app;
