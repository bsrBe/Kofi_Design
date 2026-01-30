import mongoose from "mongoose";

/**
 * User Model - Section 1: Client Profile
 * Stores client information collected during the intake form
 */
const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  instagramHandle: {
    type: String,
    trim: true,
    default: ""
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for fast lookups
userSchema.index({ phoneNumber: 1 });

const User = mongoose.model("User", userSchema);

export default User;
