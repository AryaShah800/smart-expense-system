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

// Prevent duplicate names within the same group (but allow same name in different groups).
// groupId is an ObjectId: the old filter ($type: "string") matched no document, so it never enforced anything.
// A new name, so it is built next to the old index instead of clashing with it.
groupCategorySchema.index(
  { groupId: 1, name: 1 },
  { unique: true, name: "group_category_name_unique", partialFilterExpression: { groupId: { $type: "objectId" } } }
);

export default mongoose.model("GroupCategory", groupCategorySchema);