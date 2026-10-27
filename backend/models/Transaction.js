import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0.01, "Amount must be greater than 0"],
    max: [1000000000, "Amount exceeds maximum allowable limit"]
  },
  date: { type: Date, default: Date.now },
  description: { type: String },
  recurringId: { type: mongoose.Schema.Types.ObjectId, ref: "RecurringTransaction" },
  isRecurring: { type: Boolean, default: false },
});

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index(
  { recurringId: 1, date: 1 },
  { unique: true, partialFilterExpression: { recurringId: { $type: "objectId" } } }
);

export default mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
