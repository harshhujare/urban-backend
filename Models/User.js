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
      required: function () {
        // Email required only for local auth
        return this.authProvider === "local";
      },
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: function () {
        // Password required only for local auth
        return this.authProvider === "local";
      },
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
    // Phone verification fields (for OTP auth)
    phone: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness
      default: null,
      validate: {
        validator: function (v) {
          // If phone is provided, validate India format: +91 followed by 10 digits
          if (!v) return true; // Allow null/undefined
          return /^\+91[0-9]{10}$/.test(v);
        },
        message: "Phone number must be in format: +91 followed by 10 digits",
      },
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    // Future: OAuth fields (for Google, Facebook, etc.)
    googleId: {
      type: String,
      sparse: true,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "phone"], // Can add more providers
      default: "local",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// ==================== MIDDLEWARE ====================

// Hash password before saving (only for local auth)
userSchema.pre("save", async function (next) {
  // Skip hashing if using OAuth or phone auth without password
  if (this.authProvider !== "local") return next();

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

const User = mongoose.model("User", userSchema);

export default User;
