import mongoose from "mongoose";

const groupCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  color: { type: String, default: "#6366f1" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("GroupCategory", groupCategorySchema);
