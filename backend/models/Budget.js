import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  amount: {
    type: Number,
    required: [true, "Budget limit is required"],
    min: [0.01, "Budget limit must be greater than 0"],
    max: [1000000000, "Budget limit exceeds maximum allowable limit"]
  },
  // We can add month/year if we want history, but simple Requirement R4.1 implies "Set monthly budget limits"
  // For simplicity, we'll store one active budget per category.
});

budgetSchema.index({ userId: 1, categoryId: 1 }, { unique: true });

export default mongoose.model("Budget", budgetSchema);
