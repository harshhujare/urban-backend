import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  sendOtp,
  verifyOtp,
  googleLogin,
} from "../Controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public routes - Email/Password
router.post("/register", register);
router.post("/login", login);

// Public routes - Phone/OTP
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Public routes - Google Auth
router.post("/google-login", googleLogin);

// Protected routes - require authentication
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/me", protect, updateProfile);

export default router;
