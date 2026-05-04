import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer"; // Reset password ke purane logic ke liye
import User from "../models/user.model.js";
import { sendVerificationEmail, generateOTP } from "../helper/emailverification.js";

const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,49}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const OTP_REGEX = /^\d{6}$/;
const OTP_EXPIRY_MINUTES = 10;

const normalizeEmail = (email) => (
  typeof email === "string" ? email.trim().toLowerCase() : ""
);

// --- HELPER FUNCTIONS FOR RESET PASSWORD ---
const clearResetOtp = (user) => {
  user.resetOtp = undefined;
  user.resetOtpExpire = undefined;
};

const validateOtpForUser = async (user, otp) => {
  if (!user.resetOtp || !user.resetOtpExpire) {
    return { isValid: false, status: 400, message: "No OTP request found for this user" };
  }
  if (user.resetOtpExpire.getTime() < Date.now()) {
    clearResetOtp(user);
    await user.save();
    return { isValid: false, status: 400, message: "OTP has expired" };
  }
  const isMatch = await bcrypt.compare(otp, user.resetOtp);
  if (!isMatch) return { isValid: false, status: 400, message: "Invalid OTP" };
  return { isValid: true };
};

// --- AUTH FUNCTIONS ---

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const passwordValue = typeof password === "string" ? password : "";
    const normalizedName = typeof name === "string" ? name.trim() : "";

    if (!normalizedName || !normalizedEmail || !passwordValue.trim()) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (!NAME_REGEX.test(normalizedName) || !EMAIL_REGEX.test(normalizedEmail) || !PASSWORD_REGEX.test(passwordValue)) {
      return res.status(400).json({ message: "Invalid input formats" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (user) return res.status(409).json({ message: "User already exists" });

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const hash = await bcrypt.hash(passwordValue, 10);

    await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hash,
      otp,
      otpExpires
    });

    const emailResult = await sendVerificationEmail(normalizedEmail, normalizedName, otp);
    if (!emailResult.success) return res.status(500).json({ message: "Email failed to send." });

    return res.status(201).json({ message: "Signup success! Verify your email." });
  } catch (error) {
    return res.status(500).json({ message: "Signup failed", error: error.message });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Already verified" });
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    return res.json({ message: "Verified successfully", token });
  } catch (error) {
    return res.status(500).json({ message: "Verification failed", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(401).json({ message: "Invalid email" });
    if (!user.isVerified) return res.status(403).json({ message: "Verify email first" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    return res.json({ message: "Login success", token });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const logout = async (req, res) => res.json({ message: "Logout success" });

// --- PASSWORD RESET FUNCTIONS (MODIFIED TO FIX YOUR ERROR) ---

export const sendOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();
    user.resetOtp = await bcrypt.hash(otp, 10);
    user.resetOtpExpire = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      to: normalizedEmail,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}`
    });

    return res.json({ message: "OTP sent" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const user = await User.findOne({ email: normalizedEmail });
    const otpValidation = await validateOtpForUser(user, req.body.otp);
    if (!otpValidation.isValid) return res.status(otpValidation.status).json({ message: otpValidation.message });
    return res.json({ message: "OTP verified" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) });
    const otpValidation = await validateOtpForUser(user, otp);
    if (!otpValidation.isValid) return res.status(otpValidation.status).json({ message: otpValidation.message });

    user.password = await bcrypt.hash(newPassword, 10);
    clearResetOtp(user);
    await user.save();
    return res.json({ message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ message: "Reset failed" });
  }
};

// YEH RAHI MISSING EXPORT LINE!
export const forgotPassword = async (req, res) => sendOtp(req, res);