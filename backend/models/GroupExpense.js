import mongoose from "mongoose";

const groupExpenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  // 🔥 NEW: Link to GroupCategory
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroupCategory" 
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  splitType: {
    type: String,
    enum: ["equal", "exact", "percentage"],
    default: "equal"
  },
  splits: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      shareAmount: { type: Number }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("GroupExpense", groupExpenseSchema);