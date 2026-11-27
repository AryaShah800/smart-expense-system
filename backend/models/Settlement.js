import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    amount: {
      type: Number,
      required: [true, "Settlement amount is required"],
      min: [0.01, "Settlement amount must be greater than 0"]
    }
  },
  { timestamps: true }
);

// The ledger and balances read a group's settlements, newest first.
settlementSchema.index({ groupId: 1, createdAt: -1 });

export default mongoose.models.Settlement ||
  mongoose.model("Settlement", settlementSchema);
