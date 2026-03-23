import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    razorpay_order_id: {
      type: String,
      required: [true, "Razorpay Order ID is required"],
    },
    razorpay_payment_id: {
      type: String,
      required: [true, "Razorpay Payment ID is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      default: "INR",
    },
    purpose: {
      type: String,
      required: [true, "Purpose is required"],
      default: "premium_upgrade",
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
transactionSchema.index({ userId: 1 });
transactionSchema.index({ createdAt: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
