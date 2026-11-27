import crypto from "node:crypto";
import mongoose from "mongoose";

const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const generateJoinCode = () =>
  Array.from({ length: 8 }, () => JOIN_CODE_ALPHABET[crypto.randomInt(JOIN_CODE_ALPHABET.length)]).join("");

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
    // 8 characters from a 31-letter alphabet without look-alikes (0/O, 1/I/L): about 8.5e11 codes,
    // drawn with a cryptographic RNG. Math.random was predictable and sometimes gave fewer than 6 characters.
    default: function() {
      return generateJoinCode();
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Group", groupSchema);