import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { User } from "../Models/index.js";
import sendTokenResponse from "../utils/sendTokenResponse.js";
import { sendOTP, verifyOTP as verifyOTPCode } from "../services/otpService.js";
import { verifyGoogleToken } from "../services/googleAuthService.js";

// ==================== DEPRECATED: OLD EMAIL/PASSWORD AUTH ====================
// These endpoints are no longer used in the unified auth system

/*
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
*/

// ==================== ACTIVE AUTH ENDPOINTS ====================

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
      phone: user.phone,
      authProvider: user.authProvider,
      accountType: user.accountType || "free",
      contactViewsUsed: user.contactViewsUsed || 0,
      propertiesListedThisMonth: user.propertiesListedThisMonth || 0,
      createdAt: user.createdAt,
    },
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
export const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, profilePhoto } = req.body;

  // Find user
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  // Validate name if provided
  if (name !== undefined) {
    if (!name || name.trim().length < 2) {
      return next(new ErrorResponse("Name must be at least 2 characters", 400));
    }
    if (name.trim().length > 50) {
      return next(new ErrorResponse("Name cannot exceed 50 characters", 400));
    }
    user.name = name.trim();
  }

  // Update profile photo if provided
  if (profilePhoto !== undefined) {
    user.profilePhoto = profilePhoto;
  }

  // Save updated user (skip validation for existing users without required fields)
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
      phone: user.phone,
      authProvider: user.authProvider,
      accountType: user.accountType || "free",
      contactViewsUsed: user.contactViewsUsed || 0,
      propertiesListedThisMonth: user.propertiesListedThisMonth || 0,
      createdAt: user.createdAt,
    },
  });
});
// ==================== PHONE/OTP AUTHENTICATION ====================

// @desc    Send OTP to phone number
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOtp = asyncHandler(async (req, res, next) => {
  const { phoneNumber } = req.body;

  // Validate phone number
  if (!phoneNumber) {
    return next(new ErrorResponse("Please provide a phone number", 400));
  }

  // Normalize phone number (ensure +91 prefix)
  let normalizedPhone = phoneNumber.trim();
  if (!normalizedPhone.startsWith("+91")) {
    // If user entered without country code, add +91
    normalizedPhone = `+91${normalizedPhone.replace(/^0+/, "")}`;
  }

  // Send OTP via Twilio
  const result = await sendOTP(normalizedPhone);

  if (!result.success) {
    return next(new ErrorResponse(result.message, 400));
  }

  // Check if user exists with this phone number
  const existingUser = await User.findOne({ phone: normalizedPhone });
  const isNewUser = !existingUser;

  res.status(200).json({
    success: true,
    message: result.message,
    expiresIn: result.expiresIn,
    isNewUser, // Tell frontend if this is a new user
  });
});

// @desc    Verify OTP and login/register user
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = asyncHandler(async (req, res, next) => {
  const { phoneNumber, otp } = req.body;

  // Validate required fields
  if (!phoneNumber || !otp) {
    return next(new ErrorResponse("Please provide phone number and OTP", 400));
  }

  // Normalize phone number
  let normalizedPhone = phoneNumber.trim();
  if (!normalizedPhone.startsWith("+91")) {
    normalizedPhone = `+91${normalizedPhone.replace(/^0+/, "")}`;
  }

  // Verify OTP
  const otpResult = verifyOTPCode(normalizedPhone, otp.toString());

  if (!otpResult.verified) {
    return next(new ErrorResponse(otpResult.message, 400));
  }

  // Check if user exists with this phone number
  const user = await User.findOne({ phone: normalizedPhone });

  if (user) {
    // Existing user - login
    user.phoneVerified = true;
    // Use validateBeforeSave: false to avoid triggering validation for existing users
    // This is necessary because old users might not have the 'city' field
    await user.save({ validateBeforeSave: false });
    sendTokenResponse(user, 200, res);
  } else {
    // New user - return flag to complete signup
    res.status(200).json({
      success: true,
      needsSignup: true,
      phone: normalizedPhone,
      message: "Phone verified. Please complete your profile.",
    });
  }
});

// ==================== GOOGLE AUTHENTICATION ====================

// @desc    Login/Register with Google
// @route   POST /api/auth/google-login
// @access  Public
export const googleLogin = asyncHandler(async (req, res, next) => {
  const { credential } = req.body;

  // Validate credential
  if (!credential) {
    return next(new ErrorResponse("Please provide Google credential", 400));
  }

  // Verify Google token
  let googleUser;
  try {
    googleUser = await verifyGoogleToken(credential);
  } catch (error) {
    return next(new ErrorResponse("Invalid Google credential", 401));
  }

  // Check if user exists with this Google ID
  let user = await User.findOne({ googleId: googleUser.googleId });

  if (user) {
    // Existing user - check if they have phone
    if (!user.phone) {
      // User exists but needs phone verification (edge case)
      return res.status(200).json({
        success: true,
        needsPhoneVerification: true,
        googleData: {
          googleId: googleUser.googleId,
          email: googleUser.email,
          name: googleUser.name,
          profilePhoto: googleUser.profilePhoto,
        },
        message: "Please verify your phone number to complete signup.",
      });
    }

    // User has phone - login
    // Update profile photo if changed
    if (user.profilePhoto !== googleUser.profilePhoto) {
      user.profilePhoto = googleUser.profilePhoto;
      await user.save();
    }
    sendTokenResponse(user, 200, res);
  } else {
    // New user - requires phone verification before creating account
    res.status(200).json({
      success: true,
      needsPhoneVerification: true,
      googleData: {
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        profilePhoto: googleUser.profilePhoto,
      },
      message: "Please verify your phone number to complete signup.",
    });
  }
});

// @desc    Complete signup with name and city
// @route   POST /api/auth/complete-signup
// @access  Public
export const completeSignup = asyncHandler(async (req, res, next) => {
  const { phone, name, city, googleId, email, profilePhoto, role } = req.body;

  // Validate required fields
  if (!phone || !name || !city) {
    return next(new ErrorResponse("Please provide phone, name, and city", 400));
  }

  // Normalize phone number
  let normalizedPhone = phone.trim();
  if (!normalizedPhone.startsWith("+91")) {
    normalizedPhone = `+91${normalizedPhone.replace(/^0+/, "")}`;
  }

  // Check if user already exists with this phone
  const existingUser = await User.findOne({ phone: normalizedPhone });
  if (existingUser) {
    return next(
      new ErrorResponse("User already exists with this phone number", 400),
    );
  }

  // Check if email already exists (for Google users)
  if (email) {
    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
      return next(
        new ErrorResponse("User already exists with this email", 400),
      );
    }
  }

  // Determine auth provider
  const authProvider = googleId ? "google" : "phone";

  // Create new user
  const user = await User.create({
    name: name.trim(),
    city: city.trim(),
    phone: normalizedPhone,
    phoneVerified: true,
    email: email || undefined,
    googleId: googleId || undefined,
    profilePhoto: profilePhoto || "",
    authProvider,
    role: role || "guest",
  });

  sendTokenResponse(user, 201, res);
});
