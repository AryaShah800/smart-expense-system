import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "../models/Category.js";

dotenv.config();

const categories = [
  { name: "Food", type: "expense", icon: "🍔", color: "#22c55e" },
  { name: "Travel", type: "expense", icon: "✈️", color: "#3b82f6" },
  { name: "Bills", type: "expense", icon: "💡", color: "#f59e0b" },
  { name: "Shopping", type: "expense", icon: "🛍️", color: "#ec4899" },
  { name: "Entertainment", type: "expense", icon: "🎬", color: "#8b5cf6" },
  { name: "Salary", type: "income", icon: "💰", color: "#16a34a" },
  { name: "Bonus", type: "income", icon: "🎁", color: "#4ade80" },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    await Category.deleteMany();
    await Category.insertMany(categories);

    console.log("✅ Default categories seeded");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seed();
