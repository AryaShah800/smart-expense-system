import "./loadEnv.js"; // must be first so env vars exist before other modules read them
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import userRoutes from "./routes/user.js";
import categoryRoutes from "./routes/category.js";
import transactionRoutes from "./routes/transaction.js";
import budgetRoutes from "./routes/budget.js";
import groupRoutes from "./routes/group.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportRoutes from "./routes/report.js";
import recurringRoutes from "./routes/recurring.js";
import { processDueRecurring } from "./controllers/recurring.js";
import { seedDefaultCategories } from "./utils/seedDefaultCategories.js";
import { registerSocketHandlers } from "./middlewares/socketAuth.js";

const PORT = process.env.PORT || 7000;

const corsOptions = {
  origin: function (origin, callback) {
    if (
      !origin ||
      origin.endsWith(".vercel.app") ||
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://192.168.")
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: corsOptions,
});

app.set("io", io);

// Sockets must present a valid JWT; each one joins only its own user room.
registerSocketHandlers(io);

app.set("trust proxy", 1); // behind Render's proxy, so rate limits see the real client IP
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// CORS before body parsers so error responses still carry CORS headers
app.use(cors(corsOptions));
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());

// app.use("/api/auth", userRoutes); // Removed duplicate mounting
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

const mongoCredentials = process.env.MONGO_USER && process.env.MONGO_PASSWORD
  ? { user: process.env.MONGO_USER, pass: process.env.MONGO_PASSWORD, authSource: "admin" }
  : {};

mongoose
  .connect(process.env.MONGO_URI, mongoCredentials)
  .then(async () => {
    console.log("MongoDB connected");
    await seedDefaultCategories();
    processDueRecurring().catch((err) =>
      console.error("Recurring transaction processing failed:", err)
    );
    setInterval(() => {
      processDueRecurring().catch((err) =>
        console.error("Recurring transaction processing failed:", err)
      );
    }, 30 * 60 * 1000);
    httpServer.listen(PORT, () =>
      console.log(`Server at http://localhost:${PORT}`)
    );
  })
  .catch((err) => console.error("MongoDB error:", err));
