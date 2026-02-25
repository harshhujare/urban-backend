import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [10, "Title must be at least 10 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [50, "Description must be at least 50 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    location: {
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
      },
      address: {
        type: String,
        trim: true,
        default: "",
      },
    },
    // Rent configuration
    rentType: {
      type: String,
      enum: {
        values: ["per_person", "entire_property"],
        message: "Rent type must be either 'per_person' or 'entire_property'",
      },
      required: [true, "Rent type is required"],
    },
    rentAmount: {
      type: Number,
      required: [true, "Rent amount is required"],
      min: [1, "Rent amount must be at least 1"],
    },
    // Legacy field - kept for backward compatibility
    price: {
      type: Number,
      min: [1, "Price must be at least 1"],
    },
    // Precise geolocation
    coordinates: {
      latitude: {
        type: Number,
        required: [true, "Latitude is required"],
        min: [-90, "Latitude must be between -90 and 90"],
        max: [90, "Latitude must be between -90 and 90"],
      },
      longitude: {
        type: Number,
        required: [true, "Longitude is required"],
        min: [-180, "Longitude must be between -180 and 180"],
        max: [180, "Longitude must be between -180 and 180"],
      },
    },
    maxGuests: {
      type: Number,
      required: [true, "Maximum guests is required"],
      min: [1, "Must accommodate at least 1 guest"],
      max: [20, "Cannot exceed 20 guests"],
    },
    images: [
      {
        type: String, // Cloudinary URLs
      },
    ],
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Host ID is required"],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    // Analytics fields
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    contactRequests: {
      type: Number,
      default: 0,
    },
    viewHistory: [
      {
        date: { type: Date },
        count: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// ==================== INDEXES ====================

// Text search index for keyword search across title and description
propertySchema.index({ title: "text", description: "text" });

// Compound index for common search patterns
propertySchema.index({ "location.city": 1, price: 1, maxGuests: 1 });
propertySchema.index({ hostId: 1 });

const Property = mongoose.model("Property", propertySchema);

export default Property;
