import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  icon: { type: String, default: "default-icon" },
  color: { type: String, default: "#000000" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Category", categorySchema);
