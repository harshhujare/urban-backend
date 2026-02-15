import express from "express";
import {
  createOrder,
  verifyPayment,
} from "../Controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Create Razorpay order
router.post("/create-order", protect, createOrder);

// Verify payment and upgrade account
router.post("/verify", protect, verifyPayment);

export default router;
