import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    default: "General"
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  // 🔥 NEW: Secure Invite Code
  joinCode: { 
    type: String, 
    unique: true, 
    // Auto-generate a 6-character code (e.g., "A1B-2C3")
    default: function() {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Group", groupSchema);