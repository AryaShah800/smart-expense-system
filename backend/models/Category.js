import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  icon: { type: String, default: "default-icon" },
  color: { type: String, default: "#000000" },
  createdAt: { type: Date, default: Date.now },
});

// Category lists are { user: null } (defaults) or { user: me }.
categorySchema.index({ user: 1, type: 1, name: 1 });

export default mongoose.models.Category || mongoose.model("Category", categorySchema);
