import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: false, // Email is optional (comes from Google)
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    password: {
      type: String,
      required: false, // Password no longer used
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password in queries by default
    },
    role: {
      type: String,
      enum: ["guest", "host"],
      required: [true, "Role is required"],
      default: "guest",
    },
    profilePhoto: {
      type: String,
      default: "", // Cloudinary URL (Week 3)
    },
    // Phone verification fields (required for all users)
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      validate: {
        validator: function (v) {
          // Validate India format: +91 followed by 10 digits
          return /^\+91[0-9]{10}$/.test(v);
        },
        message: "Phone number must be in format: +91 followed by 10 digits",
      },
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    // Account type (free or premium)
    accountType: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    // Monthly contact view tracking
    contactViewsUsed: {
      type: Number,
      default: 0,
    },
    contactViewsResetDate: {
      type: Date,
      default: Date.now,
    },
    // Monthly property listing tracking
    propertiesListedThisMonth: {
      type: Number,
      default: 0,
    },
    propertiesListedResetDate: {
      type: Date,
      default: Date.now,
    },
    // Future: OAuth fields (for Google, Facebook, etc.)
    googleId: {
      type: String,
      sparse: true,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["phone", "google"], // Removed "local" - no more email/password
      default: "phone",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// ==================== MIDDLEWARE ====================

// Hash password before saving (legacy - password no longer used for auth)
userSchema.pre("save", async function (next) {
  // Skip if no password provided
  if (!this.password) return next();

  // Only hash if password is modified
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ==================== METHODS ====================

// Compare password for login (local auth only)
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateJWT = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    },
  );
};

// Helper: Check if user can become/is a host
userSchema.methods.canBeHost = function () {
  return true; // All users can become hosts
};

// Helper: Upgrade user to host
userSchema.methods.upgradeToHost = async function () {
  if (this.role !== "host") {
    this.role = "host";
    await this.save();
  }
  return this;
};

// Helper: Get account limits based on accountType
userSchema.methods.getAccountLimits = function () {
  if (this.accountType === "premium") {
    return { contactViews: 10, propertyListings: 20 };
  }
  return { contactViews: 1, propertyListings: 2 };
};

// Helper: Reset monthly counters if a new month has started
userSchema.methods.resetMonthlyCountersIfNeeded = async function () {
  const now = new Date();

  // Reset contact views if month changed
  const contactReset = this.contactViewsResetDate || new Date(0);
  if (
    now.getMonth() !== contactReset.getMonth() ||
    now.getFullYear() !== contactReset.getFullYear()
  ) {
    this.contactViewsUsed = 0;
    this.contactViewsResetDate = now;
  }

  // Reset property listings if month changed
  const listingReset = this.propertiesListedResetDate || new Date(0);
  if (
    now.getMonth() !== listingReset.getMonth() ||
    now.getFullYear() !== listingReset.getFullYear()
  ) {
    this.propertiesListedThisMonth = 0;
    this.propertiesListedResetDate = now;
  }

  await this.save({ validateBeforeSave: false });
};

const User = mongoose.model("User", userSchema);

export default User;
