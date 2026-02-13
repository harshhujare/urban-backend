import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
} from "../Controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes - require authentication
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/me", protect, updateProfile);

export default router;
