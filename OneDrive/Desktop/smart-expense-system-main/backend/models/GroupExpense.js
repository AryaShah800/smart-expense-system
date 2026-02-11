import mongoose from "mongoose";

const splitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  shareAmount: {
    type: Number,
    required: true
  }
});

const groupExpenseSchema = new mongoose.Schema(
  {
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

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    splitType: {
      type: String,
      enum: ["equal", "percentage", "exact"],
      default: "equal"
    },

    splits: [splitSchema]
  },
  { timestamps: true }
);

export default mongoose.models.GroupExpense ||
  mongoose.model("GroupExpense", groupExpenseSchema);
