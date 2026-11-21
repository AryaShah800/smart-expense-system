import { MongoMemoryServer } from "mongodb-memory-server";
const m = await MongoMemoryServer.create();
process.env.MONGO_URI = m.getUri(); process.env.JWT_SECRET="devsecret"; process.env.PORT="7000"; process.env.CLIENT_URL="http://localhost:5174";
console.log("MONGO", process.env.MONGO_URI);
await import("./index.js");
