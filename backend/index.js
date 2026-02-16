import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import cookieParser from "cookie-parser";
import { createServer } from "http"; // 1. Import HTTP
import { Server } from "socket.io";  // 2. Import Socket.io
import dns from "dns";

// Force usage of Google DNS to bypass local SRV lookup failures
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import userRoutes from "./routes/user.js";
import categoryRoutes from "./routes/category.js";
import transactionRoutes from "./routes/transaction.js";
import budgetRoutes from "./routes/budget.js";
import groupRoutes from "./routes/group.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportRoutes from "./routes/report.js";

dotenv.config();

const PORT = process.env.PORT || 7000;
const app = express();
const httpServer = createServer(app); // 3. Wrap Express

// 4. Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// 5. Store 'io' so we can use it in controllers
app.set("io", io);

// 6. Socket Connection Logic
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // User joins their own personal room (room name = user ID)
  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

/* ===================== MIDDLEWARE ===================== */

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

/* ===================== ROUTES ===================== */

app.use("/api/auth", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);

/* ===================== TEST ROUTES ===================== */

app.get("/", (req, res) => {
  res.send({ activeStatus: true, error: false });
});

/* ===================== DB + SERVER ===================== */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    // 7. Use httpServer.listen instead of app.listen
    httpServer.listen(PORT, () =>
      console.log(`Server at http://localhost:${PORT}`)
    );
  })
  .catch((err) => console.error("MongoDB error:", err));