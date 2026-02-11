import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Guest ID is required"],
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Host ID is required"],
    },
    checkIn: {
      type: Date,
      required: [true, "Check-in date is required"],
    },
    checkOut: {
      type: Date,
      required: [true, "Check-out date is required"],
    },
    guests: {
      type: Number,
      required: [true, "Number of guests is required"],
      min: [1, "At least 1 guest required"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Price cannot be negative"],
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

// ==================== VALIDATORS ====================

// Ensure check-out is after check-in
bookingSchema.pre("save", function (next) {
  if (this.checkOut <= this.checkIn) {
    next(new Error("Check-out date must be after check-in date"));
  }
  next();
});

// ==================== INDEXES ====================

// Index for queries
bookingSchema.index({ guestId: 1, status: 1 });
bookingSchema.index({ propertyId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ hostId: 1, status: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
