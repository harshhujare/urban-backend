import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { User } from "../Models/index.js";

/**
 * Protect routes - verify JWT token
 * Checks for token in cookie or Authorization header
 * Attaches user to req.user if valid
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in cookie (primary method for web)
  if (req.cookies.token) {
    token = req.cookies.token;
  }
  // Also check Authorization header (for mobile apps, testing tools)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Check if token exists
  if (!token) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (excluding password)
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(new ErrorResponse("User not found", 404));
    }

    next();
  } catch (error) {
    // Token is invalid or expired
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }
});

/**
 * Grant access to specific roles
 * Usage: router.get('/admin', protect, authorize('host'), handler)
 * @param  {...string} roles - Array of allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse("User not authenticated", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role '${req.user.role}' is not authorized to access this route`,
          403,
        ),
      );
    }
    next();
  };
};
