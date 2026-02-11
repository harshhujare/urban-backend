import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { User } from "../Models/index.js";
import sendTokenResponse from "../utils/sendTokenResponse.js";

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public 
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return next(
      new ErrorResponse("Please provide name, email, and password", 400),
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse("User already exists with this email", 400));
  }

  // Create user (password will be hashed by pre-save middleware)
  const user = await User.create({
    name,
    email,
    password,
    role: role || "guest", // Default to guest, can be upgraded later
    authProvider: "local",
  });

  // Send token response
  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate fields
  if (!email || !password) {
    return next(new ErrorResponse("Please provide email and password", 400));
  }

  // Find user with password field (normally excluded)
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Check auth provider - only local auth uses password
  if (user.authProvider !== "local") {
    return next(
      new ErrorResponse(
        `This account uses ${user.authProvider} authentication. Please login with ${user.authProvider}.`,
        400,
      ),
    );
  }

  // Check password match
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Send token response
  sendTokenResponse(user, 200, res);
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res, next) => {
  // req.user is set by protect middleware
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
    },
  });
});
