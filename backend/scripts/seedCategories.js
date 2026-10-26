import mongoose from "mongoose";
import dotenv from "dotenv";
import { seedDefaultCategories } from "../utils/seedDefaultCategories.js";

dotenv.config();

try {
  await mongoose.connect(process.env.MONGO_URI);
  await seedDefaultCategories();
  console.log("Default categories are ready");
} catch (error) {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
