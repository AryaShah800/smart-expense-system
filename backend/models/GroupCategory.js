import mongoose from "mongoose";

const groupCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String, // e.g., "🍔", "✈️"
    default: "🏷️"
  },
  // groupId is now OPTIONAL. If null, it's a "Default" category.
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    default: null 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Prevent duplicate names within the same group (but allow same name in different groups)
groupCategorySchema.index({ groupId: 1, name: 1 }, { unique: true, partialFilterExpression: { groupId: { $type: "string" } } });

export default mongoose.model("GroupCategory", groupCategorySchema);