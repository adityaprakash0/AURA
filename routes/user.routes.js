import express from "express";
import {
  signup,
  login,
  logout,
  forgotPassword,
  sendOtp,
  verifyOtp,
  resetPassword,
  verifySignupOtp // Yeh naya function import karein
} from "../controllers/user.controller.js";

const router = express.Router();

// --- Authentication Routes ---
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// --- Email Verification (Signup ke baad wala) ---
router.post("/verify-signup", verifySignupOtp); 

// --- Password Reset Routes ---
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/forgot", forgotPassword);

export default router;