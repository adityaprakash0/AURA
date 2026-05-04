import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  // --- Email Verification Fields ---
  otp: { 
    type: String 
  },
  otpExpires: { 
    type: Date 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  // --- Password Reset Fields ---
  resetOtp: String,
  resetOtpExpire: Date
}, { timestamps: true }); // Timestamps se pata chalega user kab register hua

export default mongoose.model("User", userSchema);