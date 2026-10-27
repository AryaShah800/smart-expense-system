import mongoose from "mongoose";

const recurringTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
      max: [1000000000, "Amount exceeds allowable limit"],
    },
    description: { type: String, required: [true, "Description is required"], trim: true },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      required: true,
      default: "monthly",
    },
    startDate: { type: Date, default: Date.now },
    nextDueDate: { type: Date, required: true },
    lastProcessedDate: { type: Date },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
    autoProcess: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recurringTransactionSchema.index({ userId: 1, status: 1 });
recurringTransactionSchema.index({ status: 1, nextDueDate: 1 });

export default mongoose.models.RecurringTransaction || mongoose.model("RecurringTransaction", recurringTransactionSchema);
