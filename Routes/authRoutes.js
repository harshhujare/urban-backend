import express from "express";
import {
  logout,
  getMe,
  updateProfile,
  sendOtp,
  verifyOtp,
  googleLogin,
  completeSignup,
} from "../Controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Phone/OTP Authentication
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Google Authentication
router.post("/google-login", googleLogin);

// Complete Signup (after phone verification)
router.post("/complete-signup", completeSignup);

// ==================== PROTECTED ROUTES ====================
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/me", protect, updateProfile);

export default router;
