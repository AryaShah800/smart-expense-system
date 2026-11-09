import "./loadEnv.js"; // must be first so env vars exist before other modules read them
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import app from "./app.js";
import { processDueRecurring } from "./controllers/recurring.js";
import { seedDefaultCategories } from "./utils/seedDefaultCategories.js";
import { registerSocketHandlers } from "./middlewares/socketAuth.js";
import { corsOptions } from "./config/cors.js";

const PORT = process.env.PORT || 7000;

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });

app.set("io", io);

// Sockets must present a valid JWT; each one joins only its own user room.
registerSocketHandlers(io);

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
