// Starts the API against a throwaway in-memory MongoDB with demo mode on, for the Playwright suite.
// Never connects to a real database. Usage: node scripts/e2eServer.js
import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri();
process.env.JWT_SECRET = "e2e-only-secret";
process.env.DEMO_MODE = "true";
process.env.PORT = process.env.PORT || "7000";
process.env.NODE_ENV = "development";

await import("../index.js");

const stop = async () => { await mongod.stop(); process.exit(0); };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
