import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
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

const PORT = process.env.PORT || 7000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:4174",
  "http://192.168.29.208:4173",
  "http://192.168.29.208:4174",
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()) : []),
].filter(Boolean);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use("/api/auth", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
  res.send({ activeStatus: true, error: false });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    httpServer.listen(PORT, () =>
      console.log(`Server at http://localhost:${PORT}`)
    );
  })
  .catch((err) => console.error("MongoDB error:", err));