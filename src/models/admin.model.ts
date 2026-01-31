import mongoose from "mongoose";
import type { IAdmin } from "./types.js";

/**
 * Admin Model - Administrator accounts for the dashboard
 * Manages admin authentication and authorization
 */
const adminSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  secretQuestion: {
    type: String,
    trim: true
  },
  secretAnswer: {
    type: String
  },
  role: {
    type: String,
    enum: ['admin', 'super_admin'],
    default: "admin"
  },
  isActive: {
    type: Boolean,
    default: true
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


const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
export default Admin;
