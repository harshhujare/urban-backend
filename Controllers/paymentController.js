import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import User from "../Models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";

// @desc    Create Razorpay order for premium upgrade
// @route   POST  /api/payment/create-order
// @access  Private
export const createOrder = asyncHandler(async (req, res, next) => {
  const user = req.user;

  // Check if already premium
  if (user.accountType === "premium") {
    return next(new ErrorResponse("You are already a Premium member", 400));
  }

  const options = {
    amount: 100, // ₹1 in paise (for testing)
    currency: "INR",
    receipt: `upgrade_${user._id}_${Date.now()}`,
    notes: {
      userId: user._id.toString(),
      purpose: "premium_upgrade",
    },
  };

  const order = await razorpay.orders.create(options);

  res.status(200).json({
    success: true,
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    },
  });
});

// @desc    Verify Razorpay payment and upgrade account
// @route   POST /api/payment/verify
// @access  Private
export const verifyPayment = asyncHandler(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  // Validate required fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new ErrorResponse("Missing payment verification fields", 400));
  }

  // Verify signature using HMAC SHA256
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return next(new ErrorResponse("Payment verification failed", 400));
  }

  // Upgrade user to premium
  const user = await User.findById(req.user._id);
  user.accountType = "premium";
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Payment verified! Account upgraded to Premium.",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
      phone: user.phone,
      authProvider: user.authProvider,
      accountType: user.accountType,
      contactViewsUsed: user.contactViewsUsed || 0,
      propertiesListedThisMonth: user.propertiesListedThisMonth || 0,
    },
  });
});
